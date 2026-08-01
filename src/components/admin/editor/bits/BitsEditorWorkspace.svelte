<script lang="ts">
import { onMount } from 'svelte';
import type { AdminBitsEditorValues } from '../../../../lib/admin-console/content-editor-payload';
import {
  buildBitsCardViewModel,
  type BitsCardAuthorInput
} from '../../../../lib/bits-card-view-model';
import {
  ADMIN_EDITOR_DEFAULTS_STORAGE_KEY,
  ADMIN_EDITOR_DISPLAY_PREFERENCE_STORAGE_KEY,
  ADMIN_EDITOR_LAYOUT_STORAGE_KEY,
  ADMIN_EDITOR_SIDE_PANEL_PREFERENCE_STORAGE_KEY,
  readStoredAdminEditorDefaults
} from '../../../../lib/admin-console/ui-prefs-keys';
import { closeClosestAdminDetailsMenu } from '../../../../scripts/admin-content/details-menu';
import { createAdminImagePicker, type AdminImagePickerController } from '../../../../scripts/admin-shared/image-picker';
import {
  CONTENT_LIST_DELETE_FEEDBACK_STORAGE_KEY,
  CONTENT_LIST_DELETE_FEEDBACK_VALUE
} from '../shared/content-list-feedback';
import {
  deleteContentEntry as requestContentDelete,
  renderContentPreview,
  saveContentEntry,
  type AdminContentIssue,
  type AdminContentWriteResult
} from '../shared/content-editor-client';
import {
  getContentEditorAdapter,
  isBitsEditorValues
} from '../shared/content-editor-adapters';
import {
  buildContentExportHref,
  EDITOR_OUTLINE_TARGET_SCROLL_OFFSET_RATIO,
  EDITOR_SCROLLBAR_VISIBILITY_TIMEOUT_MS,
  getEditorBodyCharCount,
  getEditorScrollSyncToggleLabel,
  getPreviewDebounceMs,
  normalizeEditorBodyValue,
  type EditorScrollSource,
  type StatusState
} from '../shared/editor-shell-helpers';
import {
  ADMIN_EDITOR_DETAILS_MENU_SELECTORS,
  syncArticleInfoTriggers
} from '../shared/editor-page-integration';
import { createEditorPageLifecycle } from '../shared/editor-page-lifecycle';
import {
  createEditorShellController,
  createFixedOutlineTabNormalizer
} from '../shared/editor-shell-controller.svelte';
import {
  buildEditorOutlineListItems,
  type EditorOutlineListSourceItem,
  type MarkdownOutlineJumpCommand,
  type MarkdownOutlineItem
} from '../markdown/editor-outline-helpers';
import type { MarkdownToolbarCommand } from '../markdown/markdown-tools';
import { createEditorScrollSyncController } from '../shared/editor-scroll-sync';
import { createMarkdownCommandDispatcher } from '../markdown/editor-markdown-command-dispatcher';
import { createEditorPreviewRequestGuard } from '../shared/editor-preview-request-guard';
import ArticleInfoDialog from '../frontmatter/ArticleInfoDialog.svelte';
import EditorFooterActions from '../shared/EditorFooterActions.svelte';
import EditorTopControls from '../shared/EditorTopControls.svelte';
import EditorWorkspace from '../shared/EditorWorkspace.svelte';
import BitsImageRowsEditor from './BitsImageRowsEditor.svelte';
import BitsPublishStrip from './BitsPublishStrip.svelte';
import BitsPreviewPane from './BitsPreviewPane.svelte';
import {
  getEditableBitsImageRows,
  serializeBitsImageRows,
  type BitsImageRowDraft
} from './bits-image-rows';
import {
  getBitsEditorAuthor,
  getBitsEditorImages,
  getBitsEditorTags
} from './bits-editor-values';

type Props = {
  endpoint: string;
  exportEndpoint: string;
  deleteEndpoint: string;
  previewEndpoint: string;
  imageUploadEndpoint: string;
  returnHref: string;
  entryId: string;
  relativePath: string;
  defaultPublicSlug: string;
  revision: string;
  initialFrontmatter: AdminBitsEditorValues;
  initialBody: string;
  defaultAuthor: BitsCardAuthorInput;
  bitsOutlineItems?: EditorOutlineListSourceItem[];
};

const LEAVE_CONFIRM_MESSAGE = 'Current content is unsaved. Leave this page anyway?';
const BITS_INFO_TRIGGER_SELECTOR = '[data-admin-bits-info-trigger]';
const PAGE_ACTIONS_HOST_SELECTOR = '[data-admin-editor-page-actions-host]';
const BITS_INFO_PANEL_ID = 'admin-editor-frontmatter-panel';
const OUTLINE_PANEL_ID = 'admin-bits-editor-outline-panel';
const SYNTAX_PANEL_ID = 'admin-bits-editor-syntax-panel';
const BITS_EDITOR_SIDE_PANEL_PREFERENCE_STORAGE_KEY = `${ADMIN_EDITOR_SIDE_PANEL_PREFERENCE_STORAGE_KEY}:bits`;
const BITS_INFO_FIELD_PATHS = [
  'title',
  'description',
  'draft',
  'authorName',
  'authorAvatar'
] as const satisfies readonly (keyof AdminBitsEditorValues)[];
type BitsInfoFieldPath = (typeof BITS_INFO_FIELD_PATHS)[number];

const isBitsInfoFieldPath = (path: string): path is BitsInfoFieldPath =>
  BITS_INFO_FIELD_PATHS.includes(path as BitsInfoFieldPath);

const getBitsInfoValues = (values: AdminBitsEditorValues): Pick<AdminBitsEditorValues, BitsInfoFieldPath> => ({
  title: values.title,
  description: values.description,
  draft: values.draft,
  authorName: values.authorName,
  authorAvatar: values.authorAvatar
});
const editorAdapter = getContentEditorAdapter('bits');

let {
  endpoint,
  exportEndpoint,
  deleteEndpoint,
  previewEndpoint,
  imageUploadEndpoint,
  returnHref,
  entryId,
  relativePath,
  defaultPublicSlug,
  revision,
  initialFrontmatter,
  initialBody,
  defaultAuthor,
  bitsOutlineItems = []
}: Props = $props();

const normalizeBitsValues = (values: AdminBitsEditorValues): AdminBitsEditorValues => {
  const rows = getEditableBitsImageRows(values.imagesText);
  return {
    ...values,
    imagesText: serializeBitsImageRows(rows)
  };
};

const cloneBitsValues = (values: AdminBitsEditorValues): AdminBitsEditorValues => {
  const cloned = editorAdapter.cloneValues(values);
  return normalizeBitsValues(cloned);
};

const createInitialSnapshot = () => {
  const frontmatter = cloneBitsValues(initialFrontmatter);
  return {
    revision,
    frontmatter,
    body: normalizeEditorBodyValue(initialBody),
    imageRows: getEditableBitsImageRows(frontmatter.imagesText)
  };
};

const initialSnapshot = createInitialSnapshot();
const exportHref = $derived(buildContentExportHref(exportEndpoint, 'bits', entryId));

let topActionsEl = $state<HTMLDivElement | null>(null);
let imagePicker = $state<AdminImagePickerController | null>(null);
let currentRevision = $state(initialSnapshot.revision);
let baselineFrontmatter = $state(cloneBitsValues(initialSnapshot.frontmatter));
let baselineBody = $state(initialSnapshot.body);
let frontmatter = $state(cloneBitsValues(initialSnapshot.frontmatter));
let body = $state(initialSnapshot.body);
let imageRows = $state<BitsImageRowDraft[]>(initialSnapshot.imageRows);
let busy = $state(false);
let imageUploadPending = $state(false);
let statusState = $state<StatusState>('idle');
let statusText = $state('');
let errors = $state<string[]>([]);
let issues = $state<AdminContentIssue[]>([]);
let writeResult = $state<AdminContentWriteResult | null>(null);
let previewHtml = $state('');
let previewBusy = $state(false);
let previewError = $state('');
let previewWarnings = $state<string[]>([]);
let bitsInfoOpen = $state(false);
let bitsInfoDialog = $state<ArticleInfoDialog | null>(null);
const previewRequestGuard = createEditorPreviewRequestGuard();
const readDevAdminEditorDefaults = () =>
  import.meta.env.DEV ? readStoredAdminEditorDefaults(ADMIN_EDITOR_DEFAULTS_STORAGE_KEY) : null;
const shell = createEditorShellController({
  layoutStorageKey: ADMIN_EDITOR_LAYOUT_STORAGE_KEY,
  displayPreferenceStorageKey: ADMIN_EDITOR_DISPLAY_PREFERENCE_STORAGE_KEY,
  sidePanelPreferenceStorageKey: BITS_EDITOR_SIDE_PANEL_PREFERENCE_STORAGE_KEY,
  readAdminDefaults: readDevAdminEditorDefaults,
  initialOutlineTab: 'essays',
  normalizeOutlineTab: createFixedOutlineTabNormalizer('essays')
});
let toolbarCommand = $state<MarkdownToolbarCommand | null>(null);
let outlineJumpCommand = $state<MarkdownOutlineJumpCommand | null>(null);
let editorShellEl = $state<HTMLElement | null>(null);
let bodyScrollElement = $state<HTMLElement | null>(null);
let previewScrollElement = $state<HTMLElement | null>(null);
let syncScrollEnabled = $state(true);
let outlineJumpCommandId = 0;

const markdownCommandDispatcher = createMarkdownCommandDispatcher({
  isBusy: () => editorBusy,
  onCommand: (command) => {
    toolbarCommand = command;
  }
});

const imageRowsText = $derived(serializeBitsImageRows(imageRows));
const currentFrontmatter = $derived({
  ...frontmatter,
  imagesText: imageRowsText
});
const frontmatterDirty = $derived(!editorAdapter.isEqualValues(currentFrontmatter, baselineFrontmatter));
const bitsInfoDirty = $derived(
  BITS_INFO_FIELD_PATHS.some((field) => frontmatter[field] !== baselineFrontmatter[field])
);
const bitsInfoIssueCount = $derived(
  issues.filter((issue) => isBitsInfoFieldPath(issue.path)).length
);
const bodyDirty = $derived(body !== baselineBody);
const dirty = $derived(frontmatterDirty || bodyDirty);
const editorBusy = $derived(busy || imageUploadPending);
const canWriteContent = $derived(!editorBusy && dirty);
const previewViewModel = $derived(buildBitsCardViewModel({
  id: entryId,
  slug: defaultPublicSlug,
  bodyText: body,
  tags: getBitsEditorTags(frontmatter.tagsText),
  date: frontmatter.date,
  images: getBitsEditorImages(imageRows),
  author: getBitsEditorAuthor(frontmatter),
  defaultAuthor,
  base: import.meta.env.BASE_URL ?? '/',
  draft: frontmatter.draft
}));
const bodyLineCount = $derived(body.length === 0 ? 1 : body.split(/\r\n|\r|\n/).length);
const bodyCharCount = $derived(getEditorBodyCharCount(body));
const visibleWriteResult = $derived(!dirty ? writeResult : null);
const markdownOutlineItems: readonly MarkdownOutlineItem[] = $derived([]);
const outlineListItems = $derived(
  buildEditorOutlineListItems(bitsOutlineItems, entryId)
);
const scrollSyncAvailable = $derived(
  shell.effectiveViewMode === 'both' && Boolean(bodyScrollElement && previewScrollElement)
);
const scrollSyncToggleLabel = $derived(getEditorScrollSyncToggleLabel({
  available: scrollSyncAvailable,
  enabled: syncScrollEnabled
}));
const scrollSyncControlDisabled = $derived(!scrollSyncAvailable);
const scrollTopControlDisabled = $derived(!bodyScrollElement && !previewScrollElement);

const setStatus = (state: StatusState, text: string) => {
  statusState = state;
  statusText = text;
};

const clearWriteFeedback = () => {
  errors = [];
  issues = [];
  writeResult = null;
};

const markDirty = () => {
  clearWriteFeedback();
  if (statusState === 'error' || statusState === 'warn') return;
  if (dirty) setStatus('idle', '');
};

const handleImageToolRequest = () => {
  setStatus('warn', 'Manage body images in the card image section');
};

const openGalleryInsert = () => {
  setStatus('warn', 'Image gallery is not available in the body');
};

const handleGalleryEditRequest = () => {
  setStatus('warn', 'Image gallery is not available in the body');
};

const setBodyScrollElement = (element: HTMLElement | null) => {
  bodyScrollElement = element;
};

const setPreviewScrollElement = (element: HTMLElement | null) => {
  previewScrollElement = element;
};

const getScrollElement = (source: EditorScrollSource): HTMLElement | null =>
  source === 'body' ? bodyScrollElement : previewScrollElement;

const scrollSyncController = createEditorScrollSyncController({
  getScrollElement,
  isEnabled: () => syncScrollEnabled,
  setEnabled: (enabled) => {
    syncScrollEnabled = enabled;
  },
  isAvailable: () => scrollSyncAvailable,
  scrollbarVisibilityTimeoutMs: EDITOR_SCROLLBAR_VISIBILITY_TIMEOUT_MS
});

const handleEditorPaneScroll = (source: EditorScrollSource) => {
  scrollSyncController.handlePaneScroll(source);
};

const toggleScrollSync = () => {
  scrollSyncController.toggleEnabled();
};

const scrollEditorPanesToTop = () => {
  scrollSyncController.scrollToTop(shell.effectiveViewMode);
};

const scrollBodyToOutlineTarget = (item: MarkdownOutlineItem): boolean => {
  if (!bodyScrollElement) return false;

  outlineJumpCommandId += 1;
  outlineJumpCommand = {
    id: outlineJumpCommandId,
    item,
    targetOffsetRatio: EDITOR_OUTLINE_TARGET_SCROLL_OFFSET_RATIO
  };
  return true;
};

const handleBodyOutlineJump = (element: HTMLElement) => {
  scrollSyncController.markElementScrolling(element);
};

const handleOutlineHeadingSelect = (item: MarkdownOutlineItem) => {
  if (shell.effectiveViewMode === 'preview') return;

  scrollSyncController.cancelQueued();
  const bodyScrolled = scrollBodyToOutlineTarget(item);
  if (bodyScrolled) {
    scrollSyncController.setLastSource('body');
  }
};

const abortActivePreviewRequest = (invalidate = false) => {
  previewRequestGuard.abortActiveRequest({ invalidate });
  if (invalidate) previewBusy = false;
};

const resetToBaseline = () => {
  frontmatter = cloneBitsValues(baselineFrontmatter);
  body = baselineBody;
  imageRows = getEditableBitsImageRows(frontmatter.imagesText);
  clearWriteFeedback();
  setStatus('idle', '');
};

const resetBitsInfoToBaseline = () => {
  frontmatter = {
    ...frontmatter,
    ...getBitsInfoValues(baselineFrontmatter)
  };
  clearWriteFeedback();
  setStatus('idle', '');
};


const closeBitsInfoPanel = () => {
  bitsInfoOpen = false;
};

const openBitsInfoPanel = (trigger?: HTMLElement | null) => {
  if (!bitsInfoOpen) {
    bitsInfoDialog?.captureReturnFocus(trigger);
  }
  bitsInfoOpen = true;
};

const toggleBitsInfoPanel = (trigger?: HTMLElement | null) => {
  if (bitsInfoOpen) {
    closeBitsInfoPanel();
    return;
  }

  openBitsInfoPanel(trigger);
};

const closeActionMenu = (target: EventTarget | null) => {
  if (target instanceof HTMLElement) {
    closeClosestAdminDetailsMenu(target, '.admin-editor-shell__action-more');
  }
};

const handleActionMenuReset = (event: MouseEvent) => {
  closeActionMenu(event.currentTarget);
  resetToBaseline();
};

const handleActionMenuDownload = (event: MouseEvent) => {
  closeActionMenu(event.currentTarget);
};

const commitLatestValues = (latestValues: AdminBitsEditorValues | null, latestBody: string | null) => {
  const nextValues = cloneBitsValues(latestValues ?? currentFrontmatter);
  const nextBody = latestBody === null ? body : normalizeEditorBodyValue(latestBody);
  frontmatter = cloneBitsValues(nextValues);
  baselineFrontmatter = cloneBitsValues(nextValues);
  body = nextBody;
  baselineBody = nextBody;
  imageRows = getEditableBitsImageRows(nextValues.imagesText);
};

const applyLatestBaseline = (latestValues: AdminBitsEditorValues | null, latestBody: string | null) => {
  if (!isBitsEditorValues(latestValues) || latestBody === null) return false;

  baselineFrontmatter = cloneBitsValues(latestValues);
  baselineBody = normalizeEditorBodyValue(latestBody);
  return true;
};

const requestContentWrite = async () => {
  busy = true;
  clearWriteFeedback();
  setStatus('loading', 'Saving content');

  try {
    const saveOutcome = await saveContentEntry({
      endpoint,
      collection: 'bits',
      entryId,
      revision: currentRevision,
      frontmatter: currentFrontmatter,
      ...(bodyDirty ? { body } : {})
    });

    if (saveOutcome.revision && saveOutcome.responseOk) currentRevision = saveOutcome.revision;

    if (!saveOutcome.responseOk || !saveOutcome.payloadOk) {
      issues = saveOutcome.issues;
      const nextErrors = saveOutcome.errors.length > 0
        ? saveOutcome.errors
        : ['Save failed. Check the current content and disk state'];
      if (saveOutcome.status === 409 && applyLatestBaseline(
        isBitsEditorValues(saveOutcome.latestValues) ? saveOutcome.latestValues : null,
        saveOutcome.latestBody
      )) {
        if (saveOutcome.revision) currentRevision = saveOutcome.revision;
        errors = [
          ...nextErrors,
          'The latest version on disk has been loaded as the conflict baseline; your current edits are preserved. Review and save again, or load the disk version via "Reset changes".'
        ];
        setStatus('warn', 'External update detected, draft preserved');
        return;
      }

      errors = nextErrors;
      setStatus(saveOutcome.status === 409 ? 'warn' : 'error', saveOutcome.status === 409 ? 'External update detected' : 'Write failed');
      return;
    }

    const result = saveOutcome.result;
    if (!result) {
      errors = ['Response body is missing the result field. Check dev logs'];
      setStatus('error', 'Unexpected write response');
      return;
    }

    writeResult = result;
    commitLatestValues(isBitsEditorValues(saveOutcome.latestValues) ? saveOutcome.latestValues : null, saveOutcome.latestBody);
    setStatus(result.changed ? 'ok' : 'ready', result.changed ? 'Content saved' : 'No changes');
  } catch {
    errors = ['Save request failed. Please try again later'];
    setStatus('error', 'Save request failed');
  } finally {
    busy = false;
  }
};

const requestPreview = async (sourceSnapshot: string) => {
  const previewRequest = previewRequestGuard.beginRequest(sourceSnapshot);

  previewBusy = true;
  previewError = '';
  previewWarnings = [];

  try {
    const previewOutcome = await renderContentPreview({
      endpoint: previewEndpoint,
      collection: 'bits',
      entryId,
      source: sourceSnapshot,
      signal: previewRequest.signal
    });

    if (!previewRequest.isCurrentForSource(body)) return;

    const previewResult = previewOutcome.result;
    if (!previewOutcome.responseOk || !previewOutcome.payloadOk || !previewResult) {
      previewError = previewOutcome.errors[0] ?? 'Preview generation failed. Check the response and console logs';
      return;
    }

    previewHtml = previewResult.html;
    previewWarnings = previewResult.warnings;
  } catch {
    if (previewRequest.signal.aborted || !previewRequest.isCurrent()) return;
    previewError = 'Preview request failed. Please try again later';
  } finally {
    if (previewRequest.isCurrent()) {
      previewBusy = false;
      previewRequestGuard.finishRequest(previewRequest);
    }
  }
};

const storeContentListDeleteFeedback = () => {
  try {
    window.sessionStorage.setItem(CONTENT_LIST_DELETE_FEEDBACK_STORAGE_KEY, CONTENT_LIST_DELETE_FEEDBACK_VALUE);
  } catch {
    // The post-delete list feedback only improves the return experience; it does not affect the main delete flow.
  }
};

const deleteContentEntry = async (event: MouseEvent) => {
  closeActionMenu(event.currentTarget);

  if (busy) {
    setStatus('warn', 'Operation in progress');
    return;
  }

  const confirmed = window.confirm([
    `Delete "${editorAdapter.getDeleteTitle(frontmatter, entryId)}"?`,
    '',
    `Source file: ${relativePath}`,
    ...(dirty ? ['', 'Unsaved changes will not be written to the file; deleting will move the current source file.'] : []),
    '',
    'The file will be moved to .trash/content/, and can be restored manually from the trash afterward.'
  ].join('\n'));
  if (!confirmed) return;

  busy = true;
  clearWriteFeedback();
  setStatus('loading', 'Moving to trash');

  try {
    const deleteOutcome = await requestContentDelete({
      endpoint: deleteEndpoint,
      collection: 'bits',
      entryId,
      revision: currentRevision,
      expectedRelativePath: relativePath
    });
    if (deleteOutcome.revision) currentRevision = deleteOutcome.revision;

    if (!deleteOutcome.responseOk || !deleteOutcome.payloadOk) {
      errors = deleteOutcome.errors;
      issues = deleteOutcome.issues;
      setStatus(deleteOutcome.status === 409 ? 'warn' : 'error', deleteOutcome.errors[0] ?? 'Delete failed');
      return;
    }

    const result = deleteOutcome.result;
    if (!result || !result.deleted || !result.trashedPath) {
      errors = ['Unexpected delete response. Check dev logs'];
      issues = [];
      setStatus('error', 'Unexpected delete response');
      return;
    }

    baselineFrontmatter = cloneBitsValues(currentFrontmatter);
    baselineBody = body;
    storeContentListDeleteFeedback();
    window.location.assign(returnHref || '/admin/content/');
  } catch {
    errors = ['Delete request failed. Please try again later'];
    issues = [];
    setStatus('error', 'Delete request failed');
  } finally {
    busy = false;
  }
};

$effect(() => {
  shell.restorePreferences();
});

$effect(() => {
  return createEditorPageLifecycle({
    shellElement: editorShellEl,
    actionsElement: topActionsEl,
    pageActionsHostSelector: PAGE_ACTIONS_HOST_SELECTOR,
    onInlineSize: shell.setInlineSize,
    detailsMenuSelectors: ADMIN_EDITOR_DETAILS_MENU_SELECTORS,
    navigationGuard: {
      isDirty: () => dirty || imageUploadPending,
      message: LEAVE_CONFIRM_MESSAGE,
      onBlocked: () => {
        setStatus('warn', imageUploadPending ? 'Please wait for the image upload to finish' : 'Please save or reset first');
      }
    },
    articleInfoTrigger: {
      selector: BITS_INFO_TRIGGER_SELECTOR,
      onToggle: toggleBitsInfoPanel
    }
  });
});

$effect(() => {
  syncArticleInfoTriggers({
    selector: BITS_INFO_TRIGGER_SELECTOR,
    panelId: BITS_INFO_PANEL_ID,
    open: bitsInfoOpen,
    dirty: bitsInfoDirty,
    invalid: bitsInfoIssueCount > 0
  });
});

$effect(() => {
  if (bitsInfoIssueCount > 0 && !bitsInfoOpen) {
    openBitsInfoPanel();
  }
});

$effect(() => {
  const bodyElement = bodyScrollElement;
  const previewElement = previewScrollElement;
  if (!bodyElement || !previewElement || shell.effectiveViewMode !== 'both') return;

  const handleBodyScroll = () => {
    handleEditorPaneScroll('body');
  };

  const handlePreviewScroll = () => {
    handleEditorPaneScroll('preview');
  };

  const handlePreviewContentLoad = () => {
    if (syncScrollEnabled && scrollSyncAvailable) {
      scrollSyncController.queueLastSource();
    }
  };

  bodyElement.addEventListener('scroll', handleBodyScroll, { passive: true });
  previewElement.addEventListener('scroll', handlePreviewScroll, { passive: true });
  previewElement.addEventListener('load', handlePreviewContentLoad, true);

  if (syncScrollEnabled) {
    scrollSyncController.queueLastSource();
  }

  return () => {
    bodyElement.removeEventListener('scroll', handleBodyScroll);
    previewElement.removeEventListener('scroll', handlePreviewScroll);
    previewElement.removeEventListener('load', handlePreviewContentLoad, true);
    scrollSyncController.clearElement(bodyElement);
    scrollSyncController.clearElement(previewElement);
  };
});

$effect(() => {
  shell.syncSyntaxMaximized();
});

$effect(() => {
  return () => {
    scrollSyncController.destroy();
    previewRequestGuard.destroy();
  };
});

$effect(() => {
  const bodySnapshot = body;
  const shouldRenderFull = previewViewModel.body.shouldRenderFull;

  if (!shouldRenderFull) {
    abortActivePreviewRequest(true);
    previewRequestGuard.setLatestSource(bodySnapshot);
    previewHtml = '';
    previewError = '';
    previewWarnings = [];
    return;
  }

  if (previewRequestGuard.consumeInitialRequest()) {
    void requestPreview(bodySnapshot);
    return;
  }

  if (bodySnapshot === previewRequestGuard.getLatestSource()) {
    previewRequestGuard.clearScheduledRequest();
    return;
  }

  abortActivePreviewRequest(true);
  return previewRequestGuard.scheduleRequest(
    bodySnapshot,
    Math.max(320, getPreviewDebounceMs(bodySnapshot)),
    requestPreview
  );
});

onMount(() => {
  imagePicker = createAdminImagePicker();
});
</script>

<section
  class="admin-bits-editor admin-editor-shell"
  bind:this={editorShellEl}
  data-admin-bits-editor-workspace
  data-layout={shell.layout}
  data-view={shell.viewMode}
  data-effective-view={shell.effectiveViewMode}
  data-side-panel={shell.sidePanelLayout}
>
  <EditorTopControls
    bind:actionMenuElement={topActionsEl}
    busy={editorBusy}
    toolbarPreset="bits"
    outlineOpen={shell.outlineOpen}
    outlineVisible={shell.outlineVisible}
    outlineToggleLabel={shell.outlineToggleLabel}
    outlineControlDisabled={shell.outlineControlDisabled}
    outlinePanelId={OUTLINE_PANEL_ID}
    syntaxOpen={shell.syntaxOpen}
    syntaxVisible={shell.syntaxVisible}
    syntaxToggleLabel={shell.syntaxToggleLabel}
    syntaxControlDisabled={shell.syntaxControlDisabled}
    syntaxPanelId={SYNTAX_PANEL_ID}
    lineNumbersEnabled={shell.lineNumbers}
    lineNumbersToggleLabel={shell.lineNumbersToggleLabel}
    markdownHighlightTheme={shell.markdownHighlightTheme}
    editorLayoutIsSplit={shell.layout === 'split'}
    editorLayoutToggleLabel={shell.layoutToggleLabel}
    editorLayoutToggleIcon={shell.layoutToggleIcon}
    singleViewActive={shell.singleViewActive}
    singleViewReturnLabel={shell.singleViewReturnLabel}
    splitBothIsCompact={shell.splitBothIsCompact}
    compactPaneToggleLabel={shell.compactPaneToggleLabel}
    compactPaneToggleText={shell.compactPaneToggleText}
    editViewToggleLabel={shell.editViewToggleLabel}
    previewViewToggleLabel={shell.previewViewToggleLabel}
    effectiveViewMode={shell.effectiveViewMode}
    onApplyTool={markdownCommandDispatcher.applyTool}
    onApplyHeading={markdownCommandDispatcher.applyHeading}
    onApplyCallout={markdownCommandDispatcher.applyCallout}
    onInsertText={markdownCommandDispatcher.insertText}
    onOpenGallery={openGalleryInsert}
    onToggleOutline={shell.toggleOutline}
    onToggleSyntax={shell.toggleSyntax}
    onToggleLineNumbers={shell.toggleLineNumbers}
    onSelectMarkdownHighlightTheme={shell.selectMarkdownHighlightTheme}
    onToggleLayout={shell.toggleLayout}
    onToggleView={shell.toggleViewMode}
    onReturnToBothView={shell.returnToBothView}
    onToggleCompactPane={shell.toggleCompactPaneMode}
    {statusText}
    {statusState}
    {canWriteContent}
    {dirty}
    {returnHref}
    {exportHref}
    actionLabel="Content actions"
    moreLabel="More content actions"
    saveLabel="Save content"
    downloadLabel="Download source file"
    deleteLabel="Delete content"
    onSave={requestContentWrite}
    onReset={handleActionMenuReset}
    onDownload={handleActionMenuDownload}
    onDelete={deleteContentEntry}
  />

  <EditorWorkspace
    bind:value={body}
    disabled={editorBusy}
    {toolbarCommand}
    {outlineJumpCommand}
    lineNumbersEnabled={shell.lineNumbers}
    markdownHighlightTheme={shell.markdownHighlightTheme}
    effectiveViewMode={shell.effectiveViewMode}
    {bodyLineCount}
    {bodyCharCount}
    {errors}
    {issues}
    {previewError}
    {previewWarnings}
    writeResult={visibleWriteResult}
    {syncScrollEnabled}
    {scrollSyncToggleLabel}
    {scrollSyncControlDisabled}
    {scrollTopControlDisabled}
    getWriteFieldLabel={editorAdapter.getWriteFieldLabel}
    mediaEditEnabled={editorAdapter.capabilities.bodyImageInsert}
    galleryEditEnabled={editorAdapter.capabilities.bodyGalleryInsert}
    {previewHtml}
    {previewBusy}
    sidePanelsVisible={shell.sidePanelsVisible}
    sidePanelLayout={shell.sidePanelLayout}
    outlinePanelId={OUTLINE_PANEL_ID}
    syntaxPanelId={SYNTAX_PANEL_ID}
    outlineActiveTab={shell.outlineActiveTab}
    {markdownOutlineItems}
    {outlineListItems}
    outlineHeadingsEnabled={false}
    outlineListTabLabel="Feed list"
    outlineListEmptyText="No bits yet"
    outlinePanelLabel="Feed outline panel"
    onBodyScrollElementChange={setBodyScrollElement}
    onBodyOutlineJump={handleBodyOutlineJump}
    onImageToolRequest={handleImageToolRequest}
    onGalleryEditRequest={handleGalleryEditRequest}
    onBodyChange={markDirty}
    onPreviewScrollElementChange={setPreviewScrollElement}
    onShortcutTool={markdownCommandDispatcher.applyTool}
    onToggleScrollSync={toggleScrollSync}
    onScrollToTop={scrollEditorPanesToTop}
    onOutlineTabChange={shell.setOutlineTab}
    onOutlineHeadingSelect={handleOutlineHeadingSelect}
    onSyntaxMaximizeToggle={shell.toggleSyntaxMaximize}
  >
    {#snippet bodyFooterContent()}
      <BitsPublishStrip
        bind:value={frontmatter}
        {issues}
        disabled={editorBusy}
        onDirty={markDirty}
      />

      <section class="admin-bits-assets">
        <BitsImageRowsEditor
          bind:rows={imageRows}
          {issues}
          disabled={editorBusy}
          uploadEndpoint={imageUploadEndpoint}
          {entryId}
          picker={imagePicker}
          onStatus={setStatus}
          onDirty={markDirty}
          onUploadPendingChange={(pending) => {
            imageUploadPending = pending;
          }}
        />
      </section>
    {/snippet}

    {#snippet previewContent()}
      <BitsPreviewPane
        viewModel={previewViewModel}
        {previewHtml}
        {previewBusy}
        {previewError}
        onScrollElementChange={setPreviewScrollElement}
      />
    {/snippet}
  </EditorWorkspace>

  <ArticleInfoDialog
    bind:this={bitsInfoDialog}
    bind:value={frontmatter}
    collection="bits"
    open={bitsInfoOpen}
    {issues}
    disabled={editorBusy}
    dirty={bitsInfoDirty}
    canSave={!editorBusy && bitsInfoDirty}
    dialogTitle="Edit info"
    fieldsAriaLabel="Title, summary, and author"
    bitsDefaultAuthor={defaultAuthor}
    fieldScope="bits-summary"
    onDirty={markDirty}
    onClose={closeBitsInfoPanel}
    onReset={resetBitsInfoToBaseline}
    onSave={() => void requestContentWrite()}
  />

  <EditorFooterActions
    {statusText}
    {statusState}
    busy={editorBusy}
    {dirty}
    {canWriteContent}
    onReset={resetToBaseline}
    onSave={requestContentWrite}
  />
</section>
