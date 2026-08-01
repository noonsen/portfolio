<script lang="ts">
import type {
  AdminContentIssue,
  AdminContentWriteResult
} from '../../../../scripts/admin-content/entry-transport';
import AdminEditorIcon from './AdminEditorIcon.svelte';

type Props = {
  bodyLineCount: number;
  bodyCharCount: number;
  errors?: readonly string[];
  issues?: readonly AdminContentIssue[];
  previewError?: string;
  previewWarnings?: readonly string[];
  writeResult?: AdminContentWriteResult | null;
  syncScrollEnabled?: boolean;
  scrollSyncToggleLabel: string;
  scrollSyncControlDisabled?: boolean;
  scrollTopControlDisabled?: boolean;
  getWriteFieldLabel: (field: string) => string;
  onToggleScrollSync: () => void;
  onScrollToTop: () => void;
};

let {
  bodyLineCount,
  bodyCharCount,
  errors = [],
  issues = [],
  previewError = '',
  previewWarnings = [],
  writeResult = null,
  syncScrollEnabled = false,
  scrollSyncToggleLabel,
  scrollSyncControlDisabled = false,
  scrollTopControlDisabled = false,
  getWriteFieldLabel,
  onToggleScrollSync,
  onScrollToTop
}: Props = $props();
</script>

<div class="admin-editor-shell__preview-bar" aria-label="Body stats and preview status">
  <div class="admin-editor-shell__preview-bar-counts">
    <div class="admin-editor-shell__preview-stats" aria-label="Body stats">
      <span class="admin-editor-shell__preview-stat">Lines: {bodyLineCount}</span>
      <span class="admin-editor-shell__preview-separator" aria-hidden="true">|</span>
      <span class="admin-editor-shell__preview-stat">Chars: {bodyCharCount}</span>
    </div>

    {#if errors.length > 0}
      <details class="admin-editor-shell__preview-detail admin-editor-shell__preview-detail--error">
        <summary class="admin-editor-shell__preview-detail-trigger">
          <AdminEditorIcon name="triangle-alert" size={13} strokeWidth={2} class="admin-icon" />
          <span>Save failed {errors.length}</span>
        </summary>
        <div class="admin-editor-shell__preview-detail-panel" role="group" aria-label="Save error details">
          <p class="admin-editor-shell__preview-detail-label">Save failed</p>
          <ul class="admin-editor-shell__preview-detail-list">
            {#each errors as error}
              <li>{error}</li>
            {/each}
          </ul>
        </div>
      </details>
    {/if}

    {#if issues.length > 0}
      <details class="admin-editor-shell__preview-detail admin-editor-shell__preview-detail--warning">
        <summary class="admin-editor-shell__preview-detail-trigger">
          <AdminEditorIcon name="triangle-alert" size={13} strokeWidth={2} class="admin-icon" />
          <span>Fields {issues.length}</span>
        </summary>
        <div class="admin-editor-shell__preview-detail-panel" role="group" aria-label="Field issue details">
          <p class="admin-editor-shell__preview-detail-label">Field issues</p>
          <ul class="admin-editor-shell__preview-detail-list">
            {#each issues as issue}
              <li>
                <span class="admin-editor-shell__preview-detail-path">{issue.path}</span>
                {issue.message}
              </li>
            {/each}
          </ul>
        </div>
      </details>
    {/if}

    {#if previewError}
      <details class="admin-editor-shell__preview-detail admin-editor-shell__preview-detail--error">
        <summary class="admin-editor-shell__preview-detail-trigger">
          <AdminEditorIcon name="triangle-alert" size={13} strokeWidth={2} class="admin-icon" />
          <span>Preview failed</span>
        </summary>
        <div class="admin-editor-shell__preview-detail-panel" role="group" aria-label="Preview error details">
          <p class="admin-editor-shell__preview-detail-label">Preview failed</p>
          <p class="admin-editor-shell__preview-detail-copy">{previewError}</p>
        </div>
      </details>
    {/if}

    {#if previewWarnings.length > 0}
      <details class="admin-editor-shell__preview-detail admin-editor-shell__preview-detail--warning">
        <summary class="admin-editor-shell__preview-detail-trigger">
          <AdminEditorIcon name="triangle-alert" size={13} strokeWidth={2} class="admin-icon" />
          <span>Preview {previewWarnings.length}</span>
        </summary>
        <div class="admin-editor-shell__preview-detail-panel" role="group" aria-label="Preview warning details">
          <p class="admin-editor-shell__preview-detail-label">Preview warnings</p>
          <ul class="admin-editor-shell__preview-detail-list">
            {#each previewWarnings as warning}
              <li>{warning}</li>
            {/each}
          </ul>
        </div>
      </details>
    {/if}

    {#if writeResult}
      {@const result = writeResult}
      <details class="admin-editor-shell__preview-detail admin-editor-shell__preview-detail--ok">
        <summary class="admin-editor-shell__preview-detail-trigger">
          <AdminEditorIcon name="check" size={13} strokeWidth={2} class="admin-icon" />
          <span>{result.changed ? `Written ${result.changedFields.length}` : 'No changes'}</span>
        </summary>
        <div class="admin-editor-shell__preview-detail-panel" role="group" aria-label="Write result details">
          <p class="admin-editor-shell__preview-detail-label">Write result</p>
          <p class="admin-editor-shell__preview-detail-copy">
            {result.changed
              ? `${result.relativePath || 'Current entry'} was updated; ${result.changedFields.length} field(s) changed this time.`
              : 'No changes to the current content.'}
          </p>
          {#if result.changedFields.length > 0}
            <ul class="admin-editor-shell__preview-detail-list">
              {#each result.changedFields as field}
                <li>{getWriteFieldLabel(field)}</li>
              {/each}
            </ul>
          {/if}
        </div>
      </details>
    {/if}
  </div>
  <div class="admin-editor-shell__preview-bar-actions" aria-label="Preview scroll controls">
    <button
      class="admin-btn admin-btn--ghost admin-btn--compact admin-editor-shell__preview-action"
      type="button"
      data-active={syncScrollEnabled ? 'true' : 'false'}
      aria-label={scrollSyncToggleLabel}
      aria-pressed={syncScrollEnabled ? 'true' : 'false'}
      disabled={scrollSyncControlDisabled}
      onclick={onToggleScrollSync}
    >
      <AdminEditorIcon name={syncScrollEnabled ? 'lock' : 'lock-open'} size={14} strokeWidth={2} />
      <span>Sync scroll</span>
    </button>
    <span class="admin-editor-shell__preview-separator" aria-hidden="true">|</span>
    <button
      class="admin-btn admin-btn--ghost admin-btn--compact admin-editor-shell__preview-action"
      type="button"
      aria-label="Scroll to top"
      disabled={scrollTopControlDisabled}
      onclick={onScrollToTop}
    >
      <AdminEditorIcon name="arrow-up-to-line" size={14} strokeWidth={2} />
      <span>Scroll to top</span>
    </button>
  </div>
</div>
