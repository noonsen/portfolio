<script lang="ts">
import { onMount, tick } from 'svelte';
import type {
  AdminBitsEditorValues,
  AdminContentEditorPayload,
  AdminEssayEditorValues
} from '../../../../lib/admin-console/content-editor-payload';
import {
  isAdminContentDeletableCollectionKey,
  type AdminContentDeletableCollectionKey
} from '../../../../lib/admin-console/content-delete-contract';
import type { BitsCardAuthorInput } from '../../../../lib/bits-card-view-model';
import {
  getPayloadDeleteResult,
  getPayloadEditorPayload,
  getPayloadErrors,
  getPayloadIssues,
  isPayloadOk,
  parseResponseBody,
  type AdminContentIssue
} from '../../../../scripts/admin-content/entry-transport';
import {
  closeClosestAdminDetailsMenu,
  initAdminDetailsMenus
} from '../../../../scripts/admin-content/details-menu';
import { createWithBase } from '../../../../utils/format';
import {
  ESSAY_PUBLIC_SLUG_RE,
  contentSourceEntryIdToPublicEntryId,
  flattenEntryIdToSlug
} from '../../../../utils/slug-rules';
import ArticleInfoDialog from '../frontmatter/ArticleInfoDialog.svelte';
import {
  CONTENT_LIST_ACTION_FEEDBACK_DELETED,
  CONTENT_LIST_ACTION_FEEDBACK_SAVED,
  storeContentListActionFeedback,
  takeContentListActionFeedback,
  type ContentListActionFeedback
} from '../shared/content-list-feedback';
import type { AdminStatusFeedbackOptions, StatusState } from './content-action-feedback';
import { dispatchAdminContentStatus } from './content-action-status-events';
import { createContentEntry, saveContentEntry } from '../shared/content-editor-client';
import { isBitsEditorValues, isEssayEditorValues } from '../shared/content-editor-adapters';

type DialogMode = 'edit' | 'create';
type ContentInfoCollection = Extract<AdminContentDeletableCollectionKey, 'essay' | 'bits'>;
type ContentInfoFrontmatter = AdminEssayEditorValues | AdminBitsEditorValues;
type ContentInfoPayload = Extract<AdminContentEditorPayload, { collection: ContentInfoCollection }>;

type Props = {
  base?: string;
  endpoint: string;
  createEndpoint: string;
  deleteEndpoint: string;
  bitsDefaultAuthor?: BitsCardAuthorInput;
};

let { base = '/', endpoint, createEndpoint, deleteEndpoint, bitsDefaultAuthor = {} }: Props = $props();

let dialog = $state<ArticleInfoDialog | null>(null);
let open = $state(false);
let dialogMode = $state<DialogMode>('edit');
let busy = $state(false);
let loadingEntry = $state(false);
let loadRequestId = 0;
let selectedCollection = $state<ContentInfoCollection>('essay');
let selectedEntryId = $state('');
let selectedDefaultPublicSlug = $state('');
let createEntryId = $state('');
let createEntryIdEdited = $state(false);
let revision = $state('');
let baselineFrontmatter = $state<ContentInfoFrontmatter | null>(null);
let frontmatter = $state<ContentInfoFrontmatter | null>(null);
let issues = $state<AdminContentIssue[]>([]);
let errors = $state<string[]>([]);

const createEmptyFrontmatter = (): AdminEssayEditorValues => ({
  title: '',
  description: '',
  date: '',
  publishedAt: '',
  updatedAt: '',
  tagsText: '',
  draft: false,
  archive: true,
  slug: '',
  cover: '',
  badge: ''
});

const createNewEssayFrontmatter = (): AdminEssayEditorValues => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return {
    ...createEmptyFrontmatter(),
    date: `${now.getFullYear()}-${month}-${day}`,
    draft: true
  };
};

const createEmptyBitsFrontmatter = (): AdminBitsEditorValues => ({
  title: '',
  description: '',
  date: '',
  tagsText: '',
  draft: false,
  authorName: '',
  authorAvatar: '',
  imagesText: ''
});

const createEmptyInfoFrontmatter = (collection: ContentInfoCollection): ContentInfoFrontmatter =>
  collection === 'bits' ? createEmptyBitsFrontmatter() : createEmptyFrontmatter();

const cloneInfoFrontmatter = <Values extends ContentInfoFrontmatter>(value: Values): Values => ({ ...value });

const isEqualInfoFrontmatter = (
  left: ContentInfoFrontmatter | null,
  right: ContentInfoFrontmatter | null
): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const isContentInfoCollection = (value: string): value is ContentInfoCollection =>
  value === 'essay' || value === 'bits';

const dirty = $derived(!isEqualInfoFrontmatter(frontmatter, baselineFrontmatter));
const canSave = $derived(
  Boolean(frontmatter)
  && !busy
  && (
    dialogMode === 'create'
      ? createEntryId.trim().length > 0 && (frontmatter?.title.trim().length ?? 0) > 0
      : dirty
  )
);
const withBase = $derived(createWithBase(base));

const getShortDateSlugPart = (date: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return 'yymmdd';

  const year = match[1] ?? '0000';
  const month = match[2] ?? '00';
  const day = match[3] ?? '00';
  return `${year.slice(-2)}${month}${day}`;
};

const getCreateSlugFallbackPlaceholder = (): string =>
  `essay-${getShortDateSlugPart(frontmatter?.date ?? '')}-xxxx`;

const getCreateSlugPlaceholderPreview = (): string => {
  const candidate = flattenEntryIdToSlug(contentSourceEntryIdToPublicEntryId(createEntryId) || createEntryId);
  return ESSAY_PUBLIC_SLUG_RE.test(candidate) ? candidate : getCreateSlugFallbackPlaceholder();
};

const getCreateSlugPlaceholder = (): string =>
  `Leave blank to auto-generate: ${getCreateSlugPlaceholderPreview()}`;

const getEditSlugPlaceholder = (): string => {
  const fallbackSlug = selectedEntryId ? flattenEntryIdToSlug(selectedEntryId) : '';
  const defaultSlug = selectedDefaultPublicSlug || fallbackSlug;
  return defaultSlug ? `Leave blank to use default: ${defaultSlug}` : '';
};

const slugPlaceholder = $derived(
  dialogMode === 'create'
    ? getCreateSlugPlaceholder()
    : getEditSlugPlaceholder()
);

const clearStatus = () => {
  dispatchAdminContentStatus('idle', '');
};
const setStatus = (
  state: StatusState,
  text: string,
  options: AdminStatusFeedbackOptions = {}
) => {
  dispatchAdminContentStatus(state, text, options);
};

const deriveEssayEntryIdFromTitle = (title: string): string => {
  const trimmed = title.trim();
  if (!trimmed) return '';
  return contentSourceEntryIdToPublicEntryId(trimmed) || 'untitled';
};

const syncCreateEntryIdFromTitle = () => {
  if (dialogMode !== 'create' || createEntryIdEdited || !frontmatter) return;
  createEntryId = deriveEssayEntryIdFromTitle(frontmatter.title);
};

const updateCreateEntryId = (value: string) => {
  createEntryId = value;
  createEntryIdEdited = true;
  setStatus('ready', 'Source filename modified', { autoClear: true });
};

const buildEntryEndpoint = (collection: AdminContentDeletableCollectionKey, entryId: string): string => {
  const url = new URL(endpoint, window.location.href);
  url.searchParams.set('collection', collection);
  url.searchParams.set('entryId', entryId);
  return url.toString();
};

const reloadContentList = (feedback: ContentListActionFeedback) => {
  storeContentListActionFeedback(feedback);
  window.location.reload();
};

const closeDialog = () => {
  if (loadingEntry) {
    loadRequestId += 1;
    loadingEntry = false;
    busy = false;
    clearStatus();
  }
  open = false;
};

const openCreateDialog = async (trigger: HTMLElement) => {
  if (busy) {
    errors = [];
    setStatus('warn', 'Operation in progress');
    return;
  }

  const nextFrontmatter = createNewEssayFrontmatter();
  dialogMode = 'create';
  busy = false;
  loadingEntry = false;
  open = false;
  selectedCollection = 'essay';
  selectedEntryId = '';
  selectedDefaultPublicSlug = '';
  createEntryId = '';
  createEntryIdEdited = false;
  revision = '';
  baselineFrontmatter = cloneInfoFrontmatter(nextFrontmatter);
  frontmatter = cloneInfoFrontmatter(nextFrontmatter);
  issues = [];
  errors = [];
  clearStatus();

  await tick();
  dialog?.captureReturnFocus(trigger);
  open = true;
};

const resetToBaseline = () => {
  if (!baselineFrontmatter) return;
  frontmatter = cloneInfoFrontmatter(baselineFrontmatter);
  if (dialogMode === 'create') {
    createEntryId = '';
    createEntryIdEdited = false;
  }
  issues = [];
  errors = [];
  setStatus('ready', 'Reset', { autoClear: true });
};

const closeActionMenu = (trigger: HTMLElement) => {
  closeClosestAdminDetailsMenu(trigger, '.admin-content-item__more');
};

const getRowTitle = (trigger: HTMLElement, entryId: string): string => {
  const row = trigger.closest<HTMLElement>('[data-admin-content-item]');
  return row?.querySelector<HTMLElement>('[data-admin-content-row-title]')?.textContent?.trim() || entryId;
};

const getRowCollectionLabel = (trigger: HTMLElement): string =>
  trigger
    .closest<HTMLElement>('.admin-content-module')
    ?.querySelector<HTMLElement>('.admin-content-module__head h3 span')
    ?.textContent
    ?.trim()
  || 'this category';

const getDeletePayload = (
  payload: unknown,
  collection: AdminContentDeletableCollectionKey,
  entryId: string
): AdminContentEditorPayload | null => {
  const entryPayload = getPayloadEditorPayload(payload);
  if (!entryPayload || entryPayload.collection !== collection || entryPayload.entryId !== entryId) return null;
  if (typeof entryPayload.revision !== 'string' || typeof entryPayload.relativePath !== 'string') return null;
  return entryPayload;
};

const getInfoPayload = (
  payload: unknown,
  collection: ContentInfoCollection,
  entryId: string
): ContentInfoPayload | null => {
  const entryPayload = getPayloadEditorPayload(payload);
  if (!entryPayload || entryPayload.collection !== collection || entryPayload.entryId !== entryId) return null;
  if (!isEssayEditorValues(entryPayload.values) && !isBitsEditorValues(entryPayload.values)) return null;
  return entryPayload;
};

const openEditor = async (collection: ContentInfoCollection, entryId: string, trigger: HTMLElement) => {
  const requestId = loadRequestId + 1;
  loadRequestId = requestId;
  dialogMode = 'edit';
  busy = true;
  loadingEntry = true;
  open = false;
  selectedCollection = collection;
  selectedEntryId = entryId;
  selectedDefaultPublicSlug = '';
  createEntryId = '';
  createEntryIdEdited = false;
  revision = '';
  baselineFrontmatter = null;
  frontmatter = createEmptyInfoFrontmatter(collection);
  issues = [];
  errors = [];
  setStatus('loading', 'Loading');

  await tick();
  if (requestId !== loadRequestId) return;
  dialog?.captureReturnFocus(trigger);
  open = true;

  try {
    const response = await fetch(buildEntryEndpoint(collection, entryId), {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

    const payload = await parseResponseBody(response);
    const entryPayload = getInfoPayload(payload, collection, entryId);
    if (requestId !== loadRequestId) return;

    if (!response.ok || !isPayloadOk(payload) || !entryPayload) {
      const payloadErrors = getPayloadErrors(payload);
      errors = payloadErrors;
      issues = getPayloadIssues(payload);
      loadingEntry = false;
      open = false;
      frontmatter = null;
      setStatus('error', payloadErrors.length > 0 ? 'Load failed' : 'Load failed, you can go to the edit page to resolve it');
      return;
    }

    revision = entryPayload.revision;
    selectedDefaultPublicSlug = entryPayload.defaultPublicSlug;
    baselineFrontmatter = cloneInfoFrontmatter(entryPayload.values);
    frontmatter = cloneInfoFrontmatter(entryPayload.values);
    loadingEntry = false;
    await tick();
    if (requestId !== loadRequestId) return;
    clearStatus();
  } catch {
    if (requestId !== loadRequestId) return;
    errors = [];
    loadingEntry = false;
    open = false;
    frontmatter = null;
    setStatus('error', 'Load failed, please try again later');
  } finally {
    if (requestId === loadRequestId) {
      loadingEntry = false;
      busy = false;
    }
  }
};

const saveEditor = async () => {
  if (!frontmatter || !selectedEntryId || busy) return;
  const collection = selectedCollection;

  busy = true;
  issues = [];
  errors = [];
  setStatus('loading', 'Saving');

  try {
    let saveOutcome: Awaited<ReturnType<typeof saveContentEntry>> | null = null;
    if (collection === 'essay' && isEssayEditorValues(frontmatter)) {
      saveOutcome = await saveContentEntry({
        endpoint,
        collection: 'essay',
        entryId: selectedEntryId,
        revision,
        frontmatter
      });
    } else if (collection === 'bits' && isBitsEditorValues(frontmatter)) {
      saveOutcome = await saveContentEntry({
        endpoint,
        collection: 'bits',
        entryId: selectedEntryId,
        revision,
        frontmatter
      });
    }

    if (!saveOutcome) {
      errors = [];
      setStatus('error', 'Unexpected save response, please check dev logs');
      return;
    }

    if (saveOutcome.revision && saveOutcome.responseOk) revision = saveOutcome.revision;

    if (!saveOutcome.responseOk || !saveOutcome.payloadOk) {
      issues = saveOutcome.issues;
      const payloadErrors = saveOutcome.errors;
      errors = payloadErrors;
      const state = saveOutcome.status === 409 ? 'warn' : 'error';
      const fallbackText = saveOutcome.status === 409 ? 'External update detected' : 'Save failed, please check the current form and disk state';
      setStatus(state, payloadErrors.length > 0 ? (saveOutcome.status === 409 ? 'External update detected' : 'Save failed') : fallbackText);
      return;
    }

    const result = saveOutcome.result;
    const latestValues = saveOutcome.latestValues;
    let nextFrontmatter: ContentInfoFrontmatter | null = null;
    if (collection === 'essay' && isEssayEditorValues(latestValues)) {
      nextFrontmatter = latestValues;
    } else if (collection === 'bits' && isBitsEditorValues(latestValues)) {
      nextFrontmatter = latestValues;
    }

    if (!result || !nextFrontmatter) {
      errors = [];
      setStatus('error', 'Unexpected save response, please check dev logs');
      return;
    }

    baselineFrontmatter = cloneInfoFrontmatter(nextFrontmatter);
    frontmatter = cloneInfoFrontmatter(nextFrontmatter);
    if (saveOutcome.revision) revision = saveOutcome.revision;
    if (result.changed) {
      reloadContentList(CONTENT_LIST_ACTION_FEEDBACK_SAVED);
      return;
    }
    setStatus('ready', 'No changes', { autoClear: true });
  } catch {
    errors = [];
    setStatus('error', 'Save request failed, please try again later');
  } finally {
    busy = false;
  }
};

const saveCreate = async () => {
  if (!frontmatter || busy || !isEssayEditorValues(frontmatter)) return;
  const createFrontmatter = frontmatter;

  busy = true;
  issues = [];
  errors = [];
  createFrontmatter.draft = true;
  setStatus('loading', 'Creating');

  try {
    const outcome = await createContentEntry({
      endpoint: createEndpoint,
      collection: 'essay',
      entryId: createEntryId,
      frontmatter: createFrontmatter
    });

    if (!outcome.responseOk || !outcome.payloadOk || !outcome.editHref) {
      issues = outcome.issues;
      errors = outcome.errors;
      setStatus('error', outcome.errors.length > 0 ? 'Creation failed' : 'Unexpected creation response, please check dev logs');
      return;
    }

    setStatus('ok', 'Created, opening editor');
    window.location.assign(withBase(outcome.editHref));
  } catch {
    errors = [];
    setStatus('error', 'Creation request failed, please try again later');
  } finally {
    busy = false;
  }
};

const saveDialog = () => {
  if (dialogMode === 'create') {
    void saveCreate();
    return;
  }
  void saveEditor();
};

const deleteEntry = async (trigger: HTMLElement) => {
  if (busy) {
    errors = [];
    setStatus('warn', 'Operation in progress');
    return;
  }

  const rawCollection = trigger.dataset.collection?.trim() ?? '';
  const entryId = trigger.dataset.entryId?.trim() ?? '';
  const expectedRelativePath = trigger.dataset.relativePath?.trim() ?? '';

  if (!isAdminContentDeletableCollectionKey(rawCollection) || !entryId || !expectedRelativePath) {
    errors = [];
    setStatus('error', 'Delete info incomplete, please refresh and try again');
    return;
  }

  busy = true;
  errors = [];
  issues = [];
  setStatus('loading', 'Confirming deletion');

  try {
    // The revision in the list may be stale; fetch the latest file state before confirming.
    const loadResponse = await fetch(buildEntryEndpoint(rawCollection, entryId), {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });
    const loadPayload = await parseResponseBody(loadResponse);
    const entryPayload = getDeletePayload(loadPayload, rawCollection, entryId);

    if (!loadResponse.ok || !isPayloadOk(loadPayload) || !entryPayload) {
      const payloadErrors = getPayloadErrors(loadPayload);
      errors = payloadErrors;
      issues = getPayloadIssues(loadPayload);
      setStatus('error', payloadErrors.length > 0 ? 'Delete confirmation failed' : 'Delete confirmation failed, please refresh and try again');
      return;
    }

    if (entryPayload.relativePath !== expectedRelativePath) {
      errors = [];
      setStatus('warn', 'The list is stale, please refresh before deleting');
      return;
    }

    const title = getRowTitle(trigger, entryId);
    const confirmed = window.confirm([
      `Confirm deletion of "${title}"?`,
      '',
      `Type: ${getRowCollectionLabel(trigger)}`,
      `Source file: ${entryPayload.relativePath}`,
      '',
      'Files will be moved to .trash/content/, and can be manually restored from the trash afterward.'
    ].join('\n'));

    if (!confirmed) {
      setStatus('ready', 'Deletion cancelled', { autoClear: true });
      return;
    }

    setStatus('loading', 'Deleting');
    const deleteResponse = await fetch(deleteEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8'
      },
      cache: 'no-store',
      body: JSON.stringify({
        collection: rawCollection,
        entryId,
        revision: entryPayload.revision,
        expectedRelativePath: entryPayload.relativePath
      })
    });
    const deletePayload = await parseResponseBody(deleteResponse);

    if (!deleteResponse.ok || !isPayloadOk(deletePayload)) {
      const payloadErrors = getPayloadErrors(deletePayload);
      errors = payloadErrors;
      issues = getPayloadIssues(deletePayload);
      const state = deleteResponse.status === 409 ? 'warn' : 'error';
      const fallbackText = deleteResponse.status === 409 ? 'External update detected' : 'Delete failed, please check the console logs';
      setStatus(state, payloadErrors.length > 0 ? (deleteResponse.status === 409 ? 'External update detected' : 'Delete failed') : fallbackText);
      return;
    }

    const result = getPayloadDeleteResult(deletePayload);
    if (!result || !result.deleted || !result.trashedPath) {
      errors = [];
      setStatus('error', 'Unexpected delete response, please check dev logs');
      return;
    }

    reloadContentList(CONTENT_LIST_ACTION_FEEDBACK_DELETED);
  } catch {
    errors = [];
    setStatus('error', 'Delete request failed, please try again later');
  } finally {
    busy = false;
  }
};

const handleClick = (event: MouseEvent) => {
  if (!(event.target instanceof Element)) return;

  const createTrigger = event.target.closest<HTMLElement>('[data-admin-content-create-action]');
  if (createTrigger) {
    event.preventDefault();
    void openCreateDialog(createTrigger);
    return;
  }

  const deleteTrigger = event.target.closest<HTMLElement>('[data-admin-content-delete-action]');
  if (deleteTrigger) {
    event.preventDefault();
    closeActionMenu(deleteTrigger);
    void deleteEntry(deleteTrigger);
    return;
  }

  const trigger = event.target.closest<HTMLElement>('[data-admin-content-info-action]');
  if (!trigger) return;

  const collection = trigger.dataset.collection?.trim() ?? '';
  const entryId = trigger.dataset.entryId?.trim() ?? '';
  if (!isContentInfoCollection(collection) || !entryId) return;

  event.preventDefault();
  closeActionMenu(trigger);
  void openEditor(collection, entryId, trigger);
};

onMount(() => {
  const feedback = takeContentListActionFeedback();
  if (feedback === CONTENT_LIST_ACTION_FEEDBACK_SAVED) {
    setStatus('ok', 'Saved', { autoClear: true });
  } else if (feedback === CONTENT_LIST_ACTION_FEEDBACK_DELETED) {
    setStatus('ok', 'Moved to trash', { autoClear: true });
  }
});

$effect(() => {
  document.querySelectorAll<HTMLButtonElement>('[data-admin-content-create-action]').forEach((button) => {
    button.disabled = busy;
  });
  document.querySelectorAll<HTMLButtonElement>('[data-admin-content-delete-action]').forEach((button) => {
    button.disabled = busy;
  });
});

$effect(() => {
  if (frontmatter?.title) {
    syncCreateEntryIdFromTitle();
  }
});

$effect(() => {
  const cleanupDetailsMenus = initAdminDetailsMenus({
    selector: '.admin-content-item__more'
  });
  document.addEventListener('click', handleClick);
  return () => {
    cleanupDetailsMenus();
    document.removeEventListener('click', handleClick);
  };
});
</script>

{#if frontmatter}
  <ArticleInfoDialog
    bind:this={dialog}
    bind:value={frontmatter}
    collection={selectedCollection}
    {open}
    {issues}
    disabled={busy}
    loading={loadingEntry}
    {dirty}
    {canSave}
    entryId={dialogMode === 'create' ? createEntryId : selectedEntryId}
    showEntryId={dialogMode === 'create'}
    {slugPlaceholder}
    dialogTitle={dialogMode === 'create' ? 'New Article' : selectedCollection === 'bits' ? 'Edit Info' : 'Article Info'}
    fieldsAriaLabel={selectedCollection === 'bits' ? 'Title, summary and author' : 'Essay fields'}
    {bitsDefaultAuthor}
    fieldScope={selectedCollection === 'bits' ? 'bits-summary' : 'all'}
    draftLocked={dialogMode === 'create'}
    draftLockHelp={dialogMode === 'create' ? 'Draft by default; publish after completing the content.' : ''}
    saveLabel={dialogMode === 'create' ? 'Create' : 'Save'}
    onEntryIdInput={updateCreateEntryId}
    onClose={closeDialog}
    onReset={resetToBaseline}
    onSave={saveDialog}
  />
{/if}

{#if errors.length > 0}
  <div class="admin-content-action-errors" role="alert">
    {#each errors as error}
      <p>{error}</p>
    {/each}
  </div>
{/if}
