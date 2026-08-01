import type {
  ThemeSettingsEditableErrorState,
  ThemeSettingsEditablePayload
} from '@/lib/theme-settings';
import { ADMIN_SETTINGS_API_PATH } from '@/lib/admin-console/admin-api-paths';
import type { AdminThemeControls } from './controls';
import type { createFormCodec, EditableSettings } from './form-codec';
import { createInvalidSettingsBannerItems } from './invalid-settings-banner';
import type { createAdminConsoleUiState } from './ui-state';
import type { createValidation, ValidationIssue } from './validation';
import {
  extractInvalidSettingsState,
  extractSettingsPayload,
  getPayloadErrors,
  getPayloadMessage,
  isRecord,
  requestSettingsWrite
} from './settings-transport';

type LoadSource = 'bootstrap' | 'remote';
type AdminThemeFormCodec = ReturnType<typeof createFormCodec>;
type AdminThemeUiState = ReturnType<typeof createAdminConsoleUiState>;
type AdminThemeValidation = ReturnType<typeof createValidation>;

type AdminThemeControllerContext = {
  controls: AdminThemeControls;
  endpoint: string;
  formCodec: AdminThemeFormCodec;
  uiState: AdminThemeUiState;
  validation: AdminThemeValidation;
  finalizeAppliedSettings: () => void;
  syncEditableDerivedControls: () => void;
};

const STATUS_INVALID_SETTINGS = 'Configuration corrupted';

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const createAdminThemeController = ({
  controls,
  endpoint,
  formCodec,
  uiState,
  validation,
  finalizeAppliedSettings,
  syncEditableDerivedControls
}: AdminThemeControllerContext) => {
  const {
    bootstrapEl,
    errorBanner
  } = controls;
  const {
    canonicalize,
    collectSettings,
    applySettings
  } = formCodec;
  const {
    validateSettings,
    clearInvalidFields,
    markInvalidFields,
    resolveIssueField
  } = validation;

  let baseline: EditableSettings | null = null;
  let currentRevision: string | null = null;
  let pendingExternalUpdate: { revision: string; settings: EditableSettings } | null = null;

  const scrollIntoViewWithOffset = (element: HTMLElement): void => {
    const top = element.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  const revealErrorState = (issues: readonly ValidationIssue[] = []): void => {
    const firstField = issues
      .map((issue) => resolveIssueField(issue))
      .find((field): field is HTMLElement => field !== null);

    scrollIntoViewWithOffset(errorBanner);
    window.requestAnimationFrame(() => {
      if (!firstField) {
        errorBanner.focus({ preventScroll: true });
        return;
      }
      firstField.focus({ preventScroll: true });
      const { top, bottom } = firstField.getBoundingClientRect();
      if (top < 96 || bottom > window.innerHeight - 24) {
        scrollIntoViewWithOffset(firstField);
      }
    });
  };

  const setValidationIssues = (issues: readonly ValidationIssue[]): void => {
    markInvalidFields(issues);
    uiState.setErrors(issues.map((issue) => issue.message));
  };

  const clearExternalUpdate = (): void => {
    pendingExternalUpdate = null;
  };

  const refreshDirty = (): void => {
    if (!baseline) return;
    const current = canonicalize(collectSettings());
    uiState.setDirty(pendingExternalUpdate !== null || JSON.stringify(current) !== JSON.stringify(baseline));
  };

  const validateCurrentSettings = (): { draft: EditableSettings; issues: ValidationIssue[] } => {
    const draft = collectSettings();
    const issues = validateSettings(draft);
    setValidationIssues(issues);
    return { draft, issues };
  };

  const stageExternalUpdate = (payload: ThemeSettingsEditablePayload): void => {
    pendingExternalUpdate = {
      revision: payload.revision,
      settings: canonicalize(payload.settings)
    };
  };

  const showExternalUpdateConflict = (payload: unknown, title: string, status: string): boolean => {
    const latestPayload = extractSettingsPayload(payload);
    if (!latestPayload) return false;

    stageExternalUpdate(latestPayload);
    uiState.setErrorBanner({
      title,
      items: ['Your changes are still kept on the page. Click "Reset changes" to sync the latest configuration.']
    });
    uiState.setDirty(true);
    uiState.setStatus('warn', status, { announce: false });
    revealErrorState();
    return true;
  };

  const setInvalidSettingsErrorBanner = (invalidState: ThemeSettingsEditableErrorState): void => {
    uiState.setErrorBanner({
      title: 'Switched to read-only protection',
      message: 'The settings configuration file is detected as corrupted. Please fix the file first, then click "Recheck" or refresh the current page.',
      items: createInvalidSettingsBannerItems(invalidState),
      retryable: true
    });
  };

  const applyInvalidSettingsState = (
    payload: unknown,
    options: { announceStatus?: boolean; revealError?: boolean } = {}
  ): boolean => {
    const invalidState = extractInvalidSettingsState(payload);
    if (!invalidState) return false;

    currentRevision = null;
    baseline = null;
    clearExternalUpdate();
    clearInvalidFields();
    uiState.setDirty(false);
    uiState.setConsoleLocked(true);
    setInvalidSettingsErrorBanner(invalidState);
    uiState.setStatus(
      'error',
      STATUS_INVALID_SETTINGS,
      options.announceStatus === undefined ? {} : { announce: options.announceStatus }
    );
    if (options.revealError) {
      revealErrorState();
    }

    return true;
  };

  const loadPayload = (
    payload: unknown,
    source: LoadSource,
    options: { announceStatus?: boolean } = {}
  ): void => {
    if (
      applyInvalidSettingsState(
        payload,
        options.announceStatus === undefined ? {} : { announceStatus: options.announceStatus }
      )
    ) {
      return;
    }

    const resolvedPayload = extractSettingsPayload(payload);
    if (!resolvedPayload) {
      clearInvalidFields();
      uiState.setStatus('error', 'Invalid response data format');
      uiState.setErrors([getPayloadMessage(payload) || 'The settings API returned an invalid payload'], { title: 'Failed to load configuration' });
      revealErrorState();
      return;
    }

    uiState.setConsoleLocked(false);
    clearExternalUpdate();
    currentRevision = resolvedPayload.revision;
    const normalized = canonicalize(resolvedPayload.settings);
    applySettings(normalized);
    finalizeAppliedSettings();
    baseline = canonicalize(collectSettings());
    clearInvalidFields();
    uiState.clearErrorBanner();
    uiState.setDirty(false);
    uiState.setStatus(
      'ready',
      source === 'remote' ? 'Latest configuration synced' : 'Initial configuration loaded',
      { announce: options.announceStatus ?? source === 'remote' }
    );
  };

  const setInitialLoadError = (message: string): void => {
    currentRevision = null;
    baseline = null;
    clearExternalUpdate();
    clearInvalidFields();
    uiState.setDirty(false);
    uiState.setConsoleLocked(true);
    uiState.setStatus('error', 'Initialization failed');
    uiState.setErrors([message], {
      title: 'Failed to load configuration',
      message: 'Could not read the current Theme Console configuration. Click "Recheck" to retry.',
      retryable: true
    });
    revealErrorState();
  };

  const hasInitialSettings = (): boolean => baseline !== null && currentRevision !== null;

  const loadBootstrap = (): 'ready' | 'locked' | 'fallback' => {
    try {
      const payload = JSON.parse(bootstrapEl.textContent || '{}') as unknown;
      if (applyInvalidSettingsState(payload, { announceStatus: false })) {
        return 'locked';
      }
      if (!extractSettingsPayload(payload)) {
        console.warn(`Theme Console bootstrap payload is invalid; falling back to ${ADMIN_SETTINGS_API_PATH}.`);
        return 'fallback';
      }
      loadPayload(payload, 'bootstrap', { announceStatus: false });
      return 'ready';
    } catch (error) {
      console.warn(error);
      return 'fallback';
    }
  };

  const loadFromApi = async (): Promise<void> => {
    uiState.setStatus('loading', 'Loading', { announce: false });
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (applyInvalidSettingsState(payload, { announceStatus: false })) {
        return;
      }
      if (!response.ok) {
        throw new Error(getPayloadMessage(payload) || `HTTP ${response.status}`);
      }
      if (!extractSettingsPayload(payload)) {
        throw new Error(getPayloadMessage(payload) || 'Invalid response data format');
      }
      loadPayload(payload, 'remote');
    } catch (error) {
      if (hasInitialSettings()) {
        uiState.setStatus('warn', 'Failed to read from API');
      } else if (!uiState.isConsoleLocked()) {
        setInitialLoadError(error instanceof Error ? error.message : 'Initialization request failed, please try again later');
      }
      console.warn(error);
    }
  };

  const runValidation = async (): Promise<void> => {
    if (uiState.isSaving() || uiState.isValidating()) return;

    const { draft, issues } = validateCurrentSettings();
    if (issues.length) {
      uiState.setStatus('error', 'Validation failed', { announce: false });
      revealErrorState(issues);
      return;
    }

    const current = canonicalize(draft);
    uiState.setValidating(true);
    uiState.setStatus('loading', 'Pre-checking');

    try {
      if (!currentRevision) {
        clearInvalidFields();
        uiState.setErrors(['The current configuration is missing a revision — please sync the latest configuration before checking'], {
          title: 'Configuration needs to be re-synced before checking'
        });
        uiState.setStatus('error', 'Failed to check configuration', { announce: false });
        revealErrorState();
        return;
      }

      const { response, payload } = await requestSettingsWrite({
        endpoint,
        currentUrl: window.location.href,
        revision: currentRevision,
        settings: current,
        dryRun: true
      });
      if (applyInvalidSettingsState(payload, { announceStatus: false, revealError: true })) {
        return;
      }

      if (!response.ok || !isRecord(payload) || payload.ok !== true) {
        clearInvalidFields();
        const serverErrors = getPayloadErrors(payload);

        if (
          response.status === 409
          && showExternalUpdateConflict(payload, 'External update found while checking', 'External update found while checking — the current draft has been kept')
        ) {
          return;
        }

        uiState.setErrors(serverErrors.length ? serverErrors : ['Failed to check configuration, please try again later'], {
          title: 'Failed to check configuration'
        });
        uiState.setStatus('error', 'Failed to check configuration', { announce: false });
        revealErrorState();
        return;
      }

      clearInvalidFields();
      clearExternalUpdate();
      uiState.clearErrorBanner();
      uiState.setStatus('ok', 'Check passed');
    } catch (error) {
      console.error(error);
      clearInvalidFields();
      uiState.setErrors(['Configuration check request failed, please check the local server logs'], { title: 'Failed to check configuration' });
      uiState.setStatus('error', 'Failed to check configuration', { announce: false });
      revealErrorState();
    } finally {
      uiState.setValidating(false);
      syncEditableDerivedControls();
    }
  };

  const resetSettings = (): void => {
    const externalUpdate = pendingExternalUpdate;
    if (externalUpdate) {
      const latestSettings = deepClone(externalUpdate.settings);
      currentRevision = externalUpdate.revision;
      baseline = latestSettings;
      clearExternalUpdate();
      applySettings(deepClone(latestSettings));
      finalizeAppliedSettings();
      clearInvalidFields();
      uiState.clearErrorBanner();
      uiState.setDirty(false);
      uiState.setStatus('ready', 'Latest external configuration synced');
      return;
    }

    if (!baseline) return;
    applySettings(deepClone(baseline));
    finalizeAppliedSettings();
    clearInvalidFields();
    uiState.clearErrorBanner();
    uiState.setDirty(false);
    uiState.setStatus('ready', 'Reset');
  };

  const saveSettings = async (): Promise<void> => {
    if (uiState.isSaving() || uiState.isValidating()) return;
    const { draft, issues } = validateCurrentSettings();
    if (issues.length) {
      uiState.setStatus('error', 'Validation failed before saving', { announce: false });
      revealErrorState(issues);
      return;
    }

    const current = canonicalize(draft);

    uiState.setSaving(true);
    uiState.setStatus('loading', 'Saving');

    try {
      if (!currentRevision) {
        clearInvalidFields();
        uiState.setErrors(['The current configuration is missing a revision — please sync the latest configuration before saving'], { title: 'Configuration needs to be re-synced before saving' });
        uiState.setStatus('error', 'Save failed', { announce: false });
        revealErrorState();
        return;
      }

      const { response, payload } = await requestSettingsWrite({
        endpoint,
        currentUrl: window.location.href,
        revision: currentRevision,
        settings: current
      });
      if (!response.ok || !isRecord(payload) || payload.ok !== true) {
        clearInvalidFields();
        if (applyInvalidSettingsState(payload, { announceStatus: false, revealError: true })) {
          return;
        }

        const serverErrors = getPayloadErrors(payload);
        if (
          response.status === 409
          && showExternalUpdateConflict(payload, 'External update detected, save paused', 'External update detected — the current draft has been kept')
        ) {
          return;
        }

        uiState.setErrors(serverErrors.length ? serverErrors : ['Save failed, please try again later'], { title: 'Save failed' });
        if (response.status === 404) {
          uiState.setStatus('error', 'Unable to write', { announce: false });
        } else {
          uiState.setStatus('error', 'Save failed', { announce: false });
        }
        revealErrorState();
        return;
      }

      if (extractSettingsPayload(payload)) {
        loadPayload(payload, 'remote', { announceStatus: false });
        uiState.setStatus('ok', 'Saved successfully');
      } else {
        baseline = current;
        clearExternalUpdate();
        uiState.setDirty(false);
        uiState.setStatus('ok', 'Saved successfully');
      }
      clearInvalidFields();
      uiState.clearErrorBanner();
    } catch (error) {
      console.error(error);
      clearInvalidFields();
      uiState.setErrors(['Save request failed, please check the local server logs'], { title: 'Save request failed' });
      uiState.setStatus('error', 'Save failed', { announce: false });
      revealErrorState();
    } finally {
      uiState.setSaving(false);
      syncEditableDerivedControls();
    }
  };

  const start = (): void => {
    if (loadBootstrap() === 'fallback') {
      void loadFromApi();
    }
  };

  return {
    loadFromApi,
    refreshDirty,
    resetSettings,
    runValidation,
    saveSettings,
    start
  };
};

export type AdminThemeController = ReturnType<typeof createAdminThemeController>;
