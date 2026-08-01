import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { APIRoute } from 'astro';
import {
  ADMIN_JSON_HEADERS,
  createAdminWriteQueue,
  isAdminDryRunRequest,
  persistAdminFileTransaction,
  readAdminJsonRequestBody,
  validateAdminJsonWriteRequest,
  type AdminFileTransactionEntry
} from '../../../lib/admin-console/admin-api';
import {
  getEditableThemeSettingsState,
  getThemeSettings,
  getThemeSettingsDir,
  getThemeSettingsFilePath,
  resetThemeSettingsCache,
  type EditableThemeSettings,
  type ThemeSettingsFileGroup
} from '../../../lib/theme-settings';
import {
  canonicalizeAdminThemeSettings,
  getAdminThemeSettingsChangePreviews,
  createAdminThemeSettingsCanonicalMismatchIssues,
  createAdminWritableThemeSettingsGroups,
  fillAdminThemeSettingsCompatibilityDefaults,
  getAdminFooterStartYearMax,
  getAdminThemeSettingsMismatchPaths,
  validateAdminThemeSettings,
  type AdminThemeSettingsChangePreview
} from '../../../lib/admin-console/theme-shared';

const WRITABLE_GROUPS = ['site', 'shell', 'home', 'page', 'ui'] as const satisfies readonly ThemeSettingsFileGroup[];
type WritableGroup = (typeof WRITABLE_GROUPS)[number];

type WriteResult = {
  changed: boolean;
  written: boolean;
  changedCount: number;
  changedPaths: string[];
  changes: AdminThemeSettingsChangePreview[];
};

type WriteInput = {
  revision?: string;
  settingsInput?: unknown;
  errors: string[];
};

const FOOTER_START_YEAR_MAX = getAdminFooterStartYearMax();

const JSON_HEADERS = ADMIN_JSON_HEADERS;

const DEV_ONLY_NOT_FOUND_RESPONSE = new Response('Not Found', { status: 404 });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const createJsonBody = (data: unknown): string => `${JSON.stringify(data, null, 2)}\n`;

const hasProjectFile = (relativePath: string): boolean => existsSync(join(process.cwd(), relativePath));

type WriteResultDetail = {
  changedCount: number;
  changedPaths: string[];
  changes: AdminThemeSettingsChangePreview[];
};

type WriteResultDetails = Record<WritableGroup, WriteResultDetail>;

const createEmptyWriteResultDetails = (): WriteResultDetails => ({
  site: { changedCount: 0, changedPaths: [], changes: [] },
  shell: { changedCount: 0, changedPaths: [], changes: [] },
  home: { changedCount: 0, changedPaths: [], changes: [] },
  page: { changedCount: 0, changedPaths: [], changes: [] },
  ui: { changedCount: 0, changedPaths: [], changes: [] }
});

const createResults = (details: WriteResultDetails = createEmptyWriteResultDetails()): Record<WritableGroup, WriteResult> => {
  return {
    site: { changed: details.site.changedCount > 0, written: false, ...details.site },
    shell: { changed: details.shell.changedCount > 0, written: false, ...details.shell },
    home: { changed: details.home.changedCount > 0, written: false, ...details.home },
    page: { changed: details.page.changedCount > 0, written: false, ...details.page },
    ui: { changed: details.ui.changedCount > 0, written: false, ...details.ui }
  };
};

const extractWriteInput = (body: unknown): WriteInput => {
  if (!isRecord(body)) {
    return {
      errors: ['Request body must be a JSON object']
    };
  }

  const errors: string[] = [];
  const revision = typeof body.revision === 'string' ? body.revision.trim() : '';
  if (!revision) {
    errors.push('Request body is missing revision');
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'settings')) {
    errors.push('Request body is missing the settings field');
  }

  return {
    ...(revision ? { revision } : {}),
    ...(Object.prototype.hasOwnProperty.call(body, 'settings') ? { settingsInput: body.settings } : {}),
    errors
  };
};

const createPersistEntries = (
  groups: ReturnType<typeof createAdminWritableThemeSettingsGroups>,
  writtenGroups: readonly WritableGroup[]
): AdminFileTransactionEntry<WritableGroup>[] =>
  writtenGroups.map((group) => ({
    id: group,
    filePath: getThemeSettingsFilePath(group),
    content: createJsonBody(groups[group])
  }));

// Saves in the DEV admin console are infrequent; serializing writes keeps
// revision validation and the actual commit within the same critical section.
const withAdminSettingsWriteLock = createAdminWriteQueue();

const validateIncomingSettingsSnapshot = (
  settingsInput: unknown
): { canonicalSettings?: EditableThemeSettings; errors: string[] } => {
  if (!isRecord(settingsInput)) {
    return {
      errors: ['settings must be a JSON object']
    };
  }

  const canonicalSettings = canonicalizeAdminThemeSettings(settingsInput, {
    footerStartYearMax: FOOTER_START_YEAR_MAX
  });
  const compatibleSettingsInput = fillAdminThemeSettingsCompatibilityDefaults(settingsInput, canonicalSettings);
  const issues = [
    ...validateAdminThemeSettings(canonicalSettings, {
      footerStartYearMax: FOOTER_START_YEAR_MAX,
      localFileExists: hasProjectFile
    }),
    ...createAdminThemeSettingsCanonicalMismatchIssues(compatibleSettingsInput, canonicalSettings, {
      mode: 'exact',
      messagePrefix: 'Config must be submitted as a full canonical snapshot'
    })
  ];

  return {
    canonicalSettings,
    errors: Array.from(new Set(issues.map((issue) => issue.message)))
  };
};

const getChangedGroups = (
  currentSettings: EditableThemeSettings,
  nextSettings: EditableThemeSettings
): {
  nextGroups: ReturnType<typeof createAdminWritableThemeSettingsGroups>;
  details: WriteResultDetails;
  changedGroups: WritableGroup[];
} => {
  const currentGroups = createAdminWritableThemeSettingsGroups(currentSettings);
  const nextGroups = createAdminWritableThemeSettingsGroups(nextSettings);
  const details = WRITABLE_GROUPS.reduce<WriteResultDetails>((acc, group) => {
    const changes = getAdminThemeSettingsChangePreviews(currentGroups[group], nextGroups[group], 'exact');
    const changedPaths = changes.length > 0
      ? changes.map((change) => change.path)
      : getAdminThemeSettingsMismatchPaths(currentGroups[group], nextGroups[group], 'exact');
    acc[group] = {
      changedCount: changedPaths.length,
      changedPaths,
      changes
    };
    return acc;
  }, createEmptyWriteResultDetails());
  const changedGroups = WRITABLE_GROUPS.filter((group) => details[group].changedCount > 0);

  return {
    nextGroups,
    details,
    changedGroups
  };
};

export const GET: APIRoute = async () => {
  if (!import.meta.env.DEV) {
    return DEV_ONLY_NOT_FOUND_RESPONSE.clone();
  }

  const payload = getEditableThemeSettingsState();
  return new Response(JSON.stringify(payload, null, 2), {
    status: payload.ok === false ? 500 : 200,
    headers: JSON_HEADERS
  });
};

export const POST: APIRoute = async ({ request, url }) => {
  if (!import.meta.env.DEV) {
    return DEV_ONLY_NOT_FOUND_RESPONSE.clone();
  }

  const isDryRun = isAdminDryRunRequest(url);
  const requestError = validateAdminJsonWriteRequest(request, url, 'Theme Console config');
  if (requestError) {
    return new Response(
      JSON.stringify(
        {
          ok: false,
          errors: [requestError.error],
          results: createResults()
        },
        null,
        2
      ),
      { status: requestError.status, headers: JSON_HEADERS }
    );
  }

  const bodyResult = await readAdminJsonRequestBody(request, {
    emptyBodyError: 'Request body is empty — make sure the frontend request URL was not redirected and a JSON string was sent',
    parseTrimmedBody: true
  });
  if (!bodyResult.ok) {
    return new Response(
      JSON.stringify(
        {
          ok: false,
          errors: [bodyResult.error]
        },
        null,
        2
      ),
      { status: bodyResult.status, headers: JSON_HEADERS }
    );
  }

  const { revision, settingsInput, errors: writeInputErrors } = extractWriteInput(bodyResult.body);
  if (writeInputErrors.length > 0 || !revision) {
    return new Response(
      JSON.stringify(
        {
            ok: false,
            errors: writeInputErrors,
            results: createResults()
          },
          null,
          2
      ),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  return withAdminSettingsWriteLock(async () => {
    const currentResolved = getThemeSettings();
    const editableState = getEditableThemeSettingsState(currentResolved);
    if (!editableState.ok) {
      return new Response(JSON.stringify(editableState, null, 2), {
        status: 409,
        headers: JSON_HEADERS
      });
    }

    if (revision !== editableState.payload.revision) {
      resetThemeSettingsCache();
      const latestResolved = getThemeSettings();
      const latestEditableState = getEditableThemeSettingsState(latestResolved);
      if (!latestEditableState.ok) {
        return new Response(JSON.stringify(latestEditableState, null, 2), {
          status: 409,
          headers: JSON_HEADERS
        });
      }

      return new Response(
        JSON.stringify(
          {
            ok: false,
            errors: ['Detected the config was updated externally — overwrite refused and synced to the latest config; confirm before saving again'],
            results: createResults(),
            payload: latestEditableState.payload
          },
          null,
          2
        ),
        { status: 409, headers: JSON_HEADERS }
      );
    }

    const { canonicalSettings, errors } = validateIncomingSettingsSnapshot(settingsInput);
    if (!canonicalSettings || errors.length > 0) {
      return new Response(
        JSON.stringify(
          {
            ok: false,
            errors,
            results: createResults()
          },
          null,
          2
        ),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const { nextGroups, details, changedGroups } = getChangedGroups(editableState.payload.settings, canonicalSettings);
    const results = createResults(details);

    if (isDryRun) {
      return new Response(
        JSON.stringify(
          {
            ok: true,
            dryRun: true,
            results
          },
          null,
          2
        ),
        { headers: JSON_HEADERS }
      );
    }

    if (changedGroups.length === 0) {
      return new Response(
        JSON.stringify(
          {
            ok: true,
            results,
            payload: editableState.payload
          },
          null,
          2
        ),
        { headers: JSON_HEADERS }
      );
    }

    const entries = createPersistEntries(nextGroups, changedGroups);

    try {
      const committedGroups = await persistAdminFileTransaction(entries, {
        beforeWrite: async () => {
          await mkdir(getThemeSettingsDir(), { recursive: true });
        }
      });
      for (const group of committedGroups) {
        results[group].written = true;
      }

      resetThemeSettingsCache();
      const latestResolved = getThemeSettings();
      const latestEditableState = getEditableThemeSettingsState(latestResolved);
      if (!latestEditableState.ok) {
        console.error('[astro-whono] Settings persisted but failed to reload editable payload:', latestEditableState);
        return new Response(
          JSON.stringify(
            {
              ok: false,
              errors: ['The config file was written, but re-reading settings JSON failed — fix the corrupted file before refreshing the admin console'],
              results
            },
            null,
            2
          ),
          { status: 500, headers: JSON_HEADERS }
        );
      }

      return new Response(
        JSON.stringify(
          {
            ok: true,
            results,
            payload: latestEditableState.payload
          },
          null,
          2
        ),
        { headers: JSON_HEADERS }
      );
    } catch (error) {
      console.error('[astro-whono] Failed to persist admin settings:', error);
      return new Response(
        JSON.stringify(
          {
            ok: false,
            errors: ['Failed to write the config file — check local file permissions or logs'],
            results
          },
          null,
          2
        ),
        { status: 500, headers: JSON_HEADERS }
      );
    }
  });
};
