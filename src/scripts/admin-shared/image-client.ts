import {
  isAdminImageOrigin,
  type AdminImageOrigin
} from '../../lib/admin-console/image-contract';

export type AdminImageClientItem = {
  path: string;
  value: string;
  origin: AdminImageOrigin;
  fileName: string;
  width: number | null;
  height: number | null;
  size: number | null;
  mimeType: string | null;
  previewSrc: string | null;
};

export type AdminImageClientMeta = {
  kind: 'local' | 'remote';
  path: string | null;
  value: string;
  origin: AdminImageOrigin | null;
  width: number | null;
  height: number | null;
  size: number | null;
  mimeType: string | null;
  previewSrc: string | null;
};

export type AdminImageListPage<TItem> = {
  items: TItem[];
  page: number;
  totalPages: number;
  totalCount: number;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';
export const isNullableNumber = (value: unknown): value is number | null => value === null || typeof value === 'number';

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

export const formatAdminImageBytes = (size: number | null): string => {
  if (!size || size <= 0) return 'Unknown size';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const getAdminImageOriginLabel = (origin: AdminImageClientMeta['origin']): string => {
  if (origin === 'public') return 'Public asset';
  if (origin === 'src/assets') return 'Site asset';
  if (origin === 'src/content') return 'Article attachment';
  return 'Local asset';
};

export const formatAdminImageMetaSummary = (
  meta: Pick<AdminImageClientMeta, 'kind' | 'origin' | 'width' | 'height' | 'size'>
): string => {
  if (meta.kind === 'remote') {
    return 'Remote image; local dimensions not read automatically';
  }

  const originLabel = getAdminImageOriginLabel(meta.origin);
  const sizeLabel = formatAdminImageBytes(meta.size);
  if (meta.width && meta.height) {
    return `${originLabel} · ${meta.width}×${meta.height} · ${sizeLabel}`;
  }
  return `${originLabel} · Unknown dimensions · ${sizeLabel}`;
};

export const getAdminImageResponseErrors = (payload: unknown): string[] =>
  isRecord(payload) && Array.isArray(payload.errors)
    ? payload.errors.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

const isAdminImageClientItem = (item: unknown): item is AdminImageClientItem =>
  isRecord(item)
  && typeof item.path === 'string'
  && typeof item.value === 'string'
  && isAdminImageOrigin(item.origin)
  && typeof item.fileName === 'string'
  && isNullableNumber(item.width)
  && isNullableNumber(item.height)
  && isNullableNumber(item.size)
  && isNullableString(item.mimeType)
  && isNullableString(item.previewSrc);

const parseAdminImageClientItem = (item: unknown): AdminImageClientItem => {
  if (!isAdminImageClientItem(item)) {
    throw new Error('Invalid image list response format');
  }

  return item;
};

export const isAdminImageClientMeta = (meta: unknown): meta is AdminImageClientMeta =>
  isRecord(meta)
  && (meta.kind === 'local' || meta.kind === 'remote')
  && isNullableString(meta.path)
  && typeof meta.value === 'string'
  && (meta.origin === null || isAdminImageOrigin(meta.origin))
  && isNullableNumber(meta.width)
  && isNullableNumber(meta.height)
  && isNullableNumber(meta.size)
  && isNullableString(meta.mimeType)
  && isNullableString(meta.previewSrc);

export const parseAdminImageListResponse = (payload: unknown): AdminImageListPage<AdminImageClientItem> => {
  if (!isRecord(payload) || payload.ok !== true || !isRecord(payload.result) || !Array.isArray(payload.result.items)) {
    throw new Error('Invalid image list response format');
  }

  if (
    !isPositiveInteger(payload.result.page)
    || !isPositiveInteger(payload.result.totalPages)
    || !isNonNegativeInteger(payload.result.totalCount)
  ) {
    throw new Error('Invalid image list response format');
  }

  return {
    items: payload.result.items.map(parseAdminImageClientItem),
    page: payload.result.page,
    totalPages: payload.result.totalPages,
    totalCount: payload.result.totalCount
  };
};

export const parseAdminImageMetaResponse = (payload: unknown): AdminImageClientMeta => {
  if (!isRecord(payload) || payload.ok !== true || !isRecord(payload.result) || !isAdminImageClientMeta(payload.result)) {
    throw new Error('Invalid image metadata response format');
  }

  return payload.result;
};

export const fetchAdminImageJson = async (url: string, fallbackMessage = 'Image API request failed'): Promise<unknown> => {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (response.ok && isRecord(payload) && payload.ok === true) {
    return payload;
  }

  const errors = getAdminImageResponseErrors(payload);
  if (!response.ok) {
    throw new Error(errors[0] ?? `${fallbackMessage}（HTTP ${response.status}）`);
  }

  throw new Error(errors[0] ?? fallbackMessage);
};
