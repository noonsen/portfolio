import {
  ADMIN_CONTENT_COLLECTION_KEYS,
  getAdminContentCollectionCapability,
  isAdminContentCollectionKey,
  type AdminContentCollectionKey
} from './content-collections';

export type AdminContentScopeKey = 'all' | AdminContentCollectionKey;

export const ADMIN_CONTENT_COLLECTIONS = ADMIN_CONTENT_COLLECTION_KEYS.filter((collection) =>
  getAdminContentCollectionCapability(collection).visible
) as readonly AdminContentCollectionKey[];

export const ADMIN_CONTENT_SCOPE_OPTIONS = [
  { value: 'all', label: 'All content' },
  ...ADMIN_CONTENT_COLLECTIONS.map((collection) => ({
    value: collection,
    label: getAdminContentCollectionCapability(collection).label
  }))
] as const satisfies readonly { value: AdminContentScopeKey; label: string }[];

export const ADMIN_CONTENT_OVERVIEW_SECTION_LIMIT = 8;
export const ADMIN_CONTENT_COLLECTION_PAGE_SIZE = 20;

export const isAdminContentScopeKey = (value: string): value is AdminContentScopeKey =>
  value === 'all' || isAdminContentCollectionKey(value);

export {
  isAdminContentCollectionKey
};
export type {
  AdminContentCollectionKey
};

const encodeEntryIdPath = (entryId: string): string =>
  entryId
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

export const getAdminContentEntryEditHref = (
  collection: AdminContentCollectionKey,
  entryId: string
): string =>
  `/admin/content/${collection}/_edit/${encodeEntryIdPath(entryId)}/`;

export const getAdminContentEntryListHref = (
  collection: AdminContentCollectionKey,
  options: { entryId?: string | null } = {}
): string => {
  // List navigation carries the source file identity via a query parameter, avoiding re-binding to the removed collection list route.
  const params = new URLSearchParams({ collection });
  const entryId = options.entryId?.trim() ?? '';
  if (entryId) params.set('entryId', entryId);
  return `/admin/content/?${params.toString()}`;
};
