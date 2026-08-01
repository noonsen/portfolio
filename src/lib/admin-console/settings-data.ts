import type { EditableThemeSettings, ThemeSettingsEditablePayload } from '../theme-settings';

export const ADMIN_SETTINGS_EXPORT_SCHEMA_VERSION = 1;
export const ADMIN_SETTINGS_EXPORT_SCOPE = 'settings';
export const ADMIN_SETTINGS_EXPORT_EXCLUDES = [
  'content',
  'images',
  '.local',
  'private-files',
  'credentials'
] as const;

export type AdminSettingsExportManifest = {
  schemaVersion: typeof ADMIN_SETTINGS_EXPORT_SCHEMA_VERSION;
  createdAt: string;
  includedScopes: readonly [typeof ADMIN_SETTINGS_EXPORT_SCOPE];
  excludes: readonly string[];
  locale: string | null;
};

export type AdminSettingsExportBundle = {
  manifest: AdminSettingsExportManifest;
  settings: EditableThemeSettings;
};

type ParseAdminSettingsExportBundleResult =
  | {
      ok: true;
      bundle: AdminSettingsExportBundle;
    }
  | {
      ok: false;
      errors: string[];
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeLocale = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const createAdminSettingsExportBundle = (
  payload: ThemeSettingsEditablePayload,
  options: {
    createdAt?: string;
  } = {}
): AdminSettingsExportBundle => ({
  manifest: {
    schemaVersion: ADMIN_SETTINGS_EXPORT_SCHEMA_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    includedScopes: [ADMIN_SETTINGS_EXPORT_SCOPE],
    excludes: [...ADMIN_SETTINGS_EXPORT_EXCLUDES],
    locale: normalizeLocale(payload.settings.site.defaultLocale)
  },
  settings: payload.settings
});

export const parseAdminSettingsExportBundle = (
  input: unknown
): ParseAdminSettingsExportBundleResult => {
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: ['The import file must be a JSON object']
    };
  }

  const errors: string[] = [];
  const rawManifest = input.manifest;
  const rawSettings = input.settings;

  if (!isRecord(rawManifest)) {
    errors.push('The import file is missing the manifest object');
  }

  if (!isRecord(rawSettings)) {
    errors.push('The import file is missing the settings snapshot');
  }

  if (errors.length > 0 || !isRecord(rawManifest) || !isRecord(rawSettings)) {
    return {
      ok: false,
      errors
    };
  }

  const schemaVersion = rawManifest.schemaVersion;
  if (schemaVersion !== ADMIN_SETTINGS_EXPORT_SCHEMA_VERSION) {
    errors.push(
      `Only settings import bundles with schemaVersion=${ADMIN_SETTINGS_EXPORT_SCHEMA_VERSION} are supported`
    );
  }

  const createdAt = typeof rawManifest.createdAt === 'string' ? rawManifest.createdAt.trim() : '';
  if (!createdAt) {
    errors.push('manifest.createdAt is missing');
  }

  const includedScopes = Array.isArray(rawManifest.includedScopes)
    ? rawManifest.includedScopes.filter((value): value is string => typeof value === 'string')
    : [];
  if (!includedScopes.includes(ADMIN_SETTINGS_EXPORT_SCOPE)) {
    errors.push('manifest.includedScopes must include settings');
  }

  const excludes = Array.isArray(rawManifest.excludes)
    ? rawManifest.excludes.filter((value): value is string => typeof value === 'string')
    : [];
  if (!Array.isArray(rawManifest.excludes)) {
    errors.push('manifest.excludes is missing');
  }

  const rawLocale = Object.prototype.hasOwnProperty.call(rawManifest, 'locale')
    ? rawManifest.locale
    : null;
  if (
    rawLocale !== null
    && rawLocale !== undefined
    && typeof rawLocale !== 'string'
  ) {
    errors.push('manifest.locale must be a string, null, or omitted entirely in older export bundles');
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    bundle: {
      manifest: {
        schemaVersion: ADMIN_SETTINGS_EXPORT_SCHEMA_VERSION,
        createdAt,
        includedScopes: [ADMIN_SETTINGS_EXPORT_SCOPE],
        excludes,
        locale: normalizeLocale(rawLocale)
      },
      settings: rawSettings as unknown as EditableThemeSettings
    }
  };
};

export const getAdminSettingsExportFileName = (createdAt: string): string => {
  const normalized = createdAt
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[^0-9TZ]/g, '');
  return `astro-whono-settings-${normalized || 'snapshot'}.json`;
};
