import {
  parseAdminSettingsExportBundle,
  type AdminSettingsExportBundle
} from '../../lib/admin-console/settings-data';
import {
  queryAdminDataControls,
  reportAdminDataSetupError
} from './controls';
import {
  getBundleKey,
  getDownloadFileName,
  getPayloadErrors,
  getPayloadResults,
  getPayloadRevision,
  GROUP_ORDER,
  hasWriteResultChanges,
  isRecord,
  parseBootstrap,
  parseResponseBody,
  type WriteResultsMap
} from './shared';
import { createAdminDataUi } from './ui';

const root = document.querySelector<HTMLElement>('[data-admin-data-root]');
type ImportAction = 'dry-run' | 'apply';
type ImportFailureOptions = {
  status: 'error' | 'warn';
  statusText: string;
  errors: readonly string[];
  errorTitle?: string;
  previewState?: 'error' | 'warn';
  previewTitle: string;
  previewBody: string;
};

if (!root) {
  // Current page does not use admin data console.
} else {
  const controlState = queryAdminDataControls();
  if (!controlState.ok) {
    reportAdminDataSetupError(controlState.controls, {
      message: 'The page is missing required controls, so the client script has stopped initializing. Please refresh the page, or check whether the template and control ids are still consistent.',
      details: controlState.missing
    });
  } else {
    const controls = controlState.controls;
    const ui = createAdminDataUi(controls);
    const bootstrap = parseBootstrap(controls.bootstrapEl.textContent ?? '');

    if (!bootstrap) {
      console.error('[admin-data] Invalid bootstrap data');
      ui.showBootstrapError('The current page failed to complete bootstrap initialization. Please refresh the page or restart the dev server and try again.');
    } else {
      let currentRevision = bootstrap.revision;
      let currentBundle: AdminSettingsExportBundle | null = null;
      let busy = false;
      let dragDepth = 0;
      let lastDryRunKey = '';
      let lastDryRunHasChanges = false;
      let hasCompletedApply = false;
      let activeAction: ImportAction | null = null;

      const syncActionState = () => {
        const hasBundle = currentBundle !== null;
        const canApply = hasBundle
          && lastDryRunKey === getBundleKey(currentBundle)
          && lastDryRunHasChanges;
        const dryRunStepState = !hasBundle
          ? 'blocked'
          : activeAction === 'dry-run'
            ? 'running'
            : lastDryRunKey !== '' || hasCompletedApply
              ? 'done'
              : 'ready';
        const applyStepState = !hasBundle
          ? 'blocked'
          : activeAction === 'apply'
            ? 'running'
            : hasCompletedApply
              ? 'done'
              : canApply
                ? 'ready'
                : 'blocked';

        ui.syncActionState({
          busy,
          hasBundle,
          canApply,
          dryRunStepState,
          applyStepState
        });
      };

      const resetDropzoneDragState = () => {
        dragDepth = 0;
        ui.setDropzoneDragActive(false);
      };

      const resetImportConfirmation = () => {
        lastDryRunKey = '';
        lastDryRunHasChanges = false;
        hasCompletedApply = false;
      };

      const resetImportSession = () => {
        resetImportConfirmation();
        activeAction = null;
        currentBundle = null;
        ui.renderFileMeta(null, null);
      };

      const showImportFailure = ({
        status,
        statusText,
        errors,
        errorTitle,
        previewState = 'error',
        previewTitle,
        previewBody
      }: ImportFailureOptions) => {
        resetImportConfirmation();
        ui.setStatus(status, statusText);
        ui.setErrors(errors, errorTitle ? { title: errorTitle } : {});
        ui.showPreviewEmpty({
          state: previewState,
          title: previewTitle,
          body: previewBody
        });
      };

      const showImportActionLoading = (action: ImportAction) => {
        const isDryRun = action === 'dry-run';
        ui.setStatus('loading', isDryRun ? 'Running dry-run' : 'Writing');
        ui.showPreviewEmpty({
          state: 'loading',
          title: isDryRun ? 'Running dry-run validation' : 'Writing settings',
          body: isDryRun
            ? 'Comparing the current settings with the imported snapshot — a diff summary will appear here when done.'
            : 'Writing settings using the existing transaction pipeline — the write result will be filled in here when done.'
        });
      };

      const completeDryRun = (results: WriteResultsMap | null) => {
        if (!currentBundle) return;

        const hasChanges = GROUP_ORDER.some((group) => hasWriteResultChanges(results?.[group]));
        lastDryRunKey = getBundleKey(currentBundle);
        lastDryRunHasChanges = hasChanges;
        hasCompletedApply = false;
        ui.renderPreview(
          results,
          hasChanges
            ? {
                state: 'diff',
                note: 'The revision will be re-validated before confirming the write, to avoid overwriting external changes.'
              }
            : {
                state: 'clean',
                body: 'The imported snapshot matches the local settings — no write to disk is needed.'
              }
        );
        ui.setStatus(hasChanges ? 'ok' : 'ready', 'dry-run complete');
      };

      const completeApply = (results: WriteResultsMap | null) => {
        lastDryRunKey = '';
        lastDryRunHasChanges = false;
        hasCompletedApply = true;
        ui.renderPreview(results, {
          state: 'applied',
          body: '✅ Write succeeded',
          note: 'Please run a dry-run again before importing another snapshot.'
        });
        ui.setStatus('ok', 'Write complete');
      };

      const handleSelectedFile = async (file: File | null) => {
        ui.clearErrors();
        resetImportSession();
        syncActionState();

        if (!file) {
          ui.setSelectedFileLabel(null);
          ui.resetPreview();
          ui.setStatus('idle', 'Waiting for action', { announce: false });
          return;
        }

        ui.setSelectedFileLabel(file.name);
        ui.showPreviewEmpty({
          state: 'loading',
          title: 'Parsing imported snapshot',
          body: `Reading ${file.name} and validating the manifest structure.`
        });
        ui.setStatus('loading', 'Parsing', { announce: false });

        try {
          const text = await file.text();
          const json = JSON.parse(text) as unknown;
          const parsed = parseAdminSettingsExportBundle(json);

          if (!parsed.ok) {
            showImportFailure({
              status: 'error',
              statusText: 'Parse failed',
              errors: parsed.errors,
              errorTitle: 'Imported file does not match the settings export protocol',
              previewTitle: 'Failed to parse imported file',
              previewBody: 'The current file does not match the settings export protocol. Please check the schemaVersion, includedScopes, and JSON structure, then try again.'
            });
            return;
          }

          currentBundle = parsed.bundle;
          ui.renderFileMeta(parsed.bundle, file.name);
          ui.showPreviewEmpty({
            state: 'ready',
            title: 'Snapshot ready',
            body: `${file.name}\nManifest parsing complete — you can run dry-run now`
          });
          ui.setStatus('ready', 'Snapshot parsed');
        } catch {
          showImportFailure({
            status: 'error',
            statusText: 'Invalid JSON',
            errors: ['The selected file is not valid JSON, or the encoded content is corrupted'],
            previewTitle: 'Imported file is not valid JSON',
            previewBody: 'The selected file is not valid JSON, or the encoded content is corrupted. Please reselect an exported snapshot.'
          });
        } finally {
          syncActionState();
        }
      };

      const runImportAction = async (action: ImportAction) => {
        if (!currentBundle) return;

        const isDryRun = action === 'dry-run';
        activeAction = action;
        if (isDryRun) {
          hasCompletedApply = false;
        }
        busy = true;
        syncActionState();
        ui.clearErrors();
        showImportActionLoading(action);

        try {
          const response = await fetch(
            isDryRun ? `${bootstrap.importEndpoint}?dryRun=1` : bootstrap.importEndpoint,
            {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json; charset=utf-8'
              },
              cache: 'no-store',
              body: JSON.stringify({
                revision: currentRevision,
                settings: currentBundle.settings
              })
            }
          );

          const payload = await parseResponseBody(response);
          const latestRevision = getPayloadRevision(payload);
          if (latestRevision) {
            currentRevision = latestRevision;
          }

          if (!response.ok || !isRecord(payload) || payload.ok !== true) {
            const isRevisionConflict = response.status === 409;
            const payloadErrors = getPayloadErrors(payload);
            showImportFailure({
              status: isRevisionConflict ? 'warn' : 'error',
              statusText: isDryRun ? 'dry-run failed' : 'Write failed',
              errors: payloadErrors.length > 0
                ? payloadErrors
                : [isDryRun ? 'dry-run validation failed — please check the imported file and current configuration state' : 'Failed to write settings — please check the response and console logs'],
              errorTitle: isRevisionConflict ? 'External update detected' : 'Import not completed',
              previewState: isRevisionConflict ? 'warn' : 'error',
              previewTitle: isRevisionConflict ? 'External update detected' : isDryRun ? 'dry-run failed' : 'Write failed',
              previewBody: isRevisionConflict
                ? 'This import has been stopped to avoid silently overwriting external changes. Please rerun dry-run and confirm the result against the latest revision.'
                : isDryRun
                  ? 'No committable change preview was generated. Please fix the error list and run dry-run again.'
                  : 'This write did not complete. Please resolve the error list, then resubmit the configuration snapshot.'
            });
            return;
          }

          const results = getPayloadResults(payload);
          if (isDryRun) {
            completeDryRun(results);
          } else {
            completeApply(results);
          }
        } catch {
          showImportFailure({
            status: 'error',
            statusText: isDryRun ? 'dry-run request failed' : 'Write request failed',
            errors: [isDryRun ? 'dry-run request failed, please try again later' : 'Write request failed, please try again later'],
            previewTitle: isDryRun ? 'dry-run request failed' : 'Write request failed',
            previewBody: isDryRun
              ? 'No server response was received. Please check the dev server status and rerun dry-run.'
              : 'The write result has not been confirmed. Please check the dev server status and resubmit.'
          });
        } finally {
          activeAction = null;
          busy = false;
          syncActionState();
        }
      };

      controls.exportBtn.addEventListener('click', async () => {
        busy = true;
        syncActionState();
        ui.clearErrors();
        ui.setStatus('loading', 'Exporting snapshot');

        try {
          const response = await fetch(bootstrap.exportEndpoint, {
            method: 'GET',
            headers: {
              Accept: 'application/json'
            },
            cache: 'no-store'
          });

          if (!response.ok) {
            const payload = await parseResponseBody(response);
            ui.setStatus(response.status === 409 ? 'warn' : 'error', 'Export failed');
            ui.setErrors(
              getPayloadErrors(payload).length > 0
                ? getPayloadErrors(payload)
                : ['The current settings state cannot be exported — please fix the local configuration and try again'],
              {
                title: response.status === 409 ? 'settings cannot currently be exported' : 'Export failed'
              }
            );
            return;
          }

          const blob = await response.blob();
          const downloadUrl = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = downloadUrl;
          anchor.download = getDownloadFileName(response);
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(downloadUrl);
          ui.setStatus('ok', 'Snapshot exported');
        } catch {
          ui.setStatus('error', 'Export request failed');
          ui.setErrors(['Export request failed, please check the dev server status and try again']);
        } finally {
          busy = false;
          syncActionState();
        }
      });

      controls.fileInput.addEventListener('change', () => {
        const file = controls.fileInput.files?.[0] ?? null;
        controls.fileInput.value = '';
        void handleSelectedFile(file);
      });

      const requestFileSelection = () => {
        if (!busy) {
          controls.fileInput.click();
        }
      };

      controls.dropzoneTriggerBtn.addEventListener('click', requestFileSelection);
      controls.dropzoneReselectBtn.addEventListener('click', requestFileSelection);

      controls.dropzoneEl.addEventListener('dragenter', (event) => {
        event.preventDefault();
        if (busy) return;

        dragDepth += 1;
        ui.setDropzoneDragActive(true);
      });

      controls.dropzoneEl.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (busy) return;

        ui.setDropzoneDragActive(true);
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'copy';
        }
      });

      controls.dropzoneEl.addEventListener('dragleave', (event) => {
        event.preventDefault();
        if (busy) {
          resetDropzoneDragState();
          return;
        }

        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) {
          ui.setDropzoneDragActive(false);
        }
      });

      controls.dropzoneEl.addEventListener('drop', (event) => {
        event.preventDefault();
        resetDropzoneDragState();
        if (busy) return;

        const file = event.dataTransfer?.files?.[0] ?? null;
        if (file) {
          void handleSelectedFile(file);
        }
      });

      controls.dryRunBtn.addEventListener('click', () => {
        void runImportAction('dry-run');
      });

      controls.applyBtn.addEventListener('click', () => {
        void runImportAction('apply');
      });

      syncActionState();
      resetDropzoneDragState();
      ui.setSelectedFileLabel(null);
      ui.resetPreview();
      ui.setStatus('idle', 'Ready', { announce: false });
    }
  }
}
