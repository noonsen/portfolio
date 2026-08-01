import { slug as githubSlug } from 'github-slugger';

/**
 * Shared slug rules for essay public URLs.
 *
 * Both `content.config.ts` (schema validation) and `content.ts` (build-time
 * assertions) depend on this module so the "what is a valid public slug"
 * contract is defined in exactly one place.
 */

/** A valid public slug must be lowercase kebab-case. */
export const ESSAY_PUBLIC_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Slug values that collide with sibling static routes under `/archive/` or
 * `/essay/`.  Since essay slugs are always single-segment (enforced by schema
 * + `[slug]` route), only exact matches need to be checked.
 */
export const RESERVED_ESSAY_SLUGS: ReadonlySet<string> = new Set([
  'page',
  'tag',
  'rss.xml'
]);

/**
 * Convert a potentially multi-segment `entry.id` (e.g. `2024/my-post`) into a
 * single-segment slug suitable for the `[slug]` route.
 */
export const flattenEntryIdToSlug = (entryId: string): string =>
  entryId.replaceAll('/', '-');

/**
 * Astro's glob loader derives the default public entry id by GitHub-style
 * slugifying each path segment. Admin Content's source-file entryId keeps the
 * real filename, so write validation must explicitly derive the public id.
 */
export const contentSourceEntryIdToPublicEntryId = (entryId: string): string => {
  const normalized = entryId.trim().replace(/\\/g, '/').replace(/\/+$/g, '');
  if (!normalized) return '';

  return normalized
    .split('/')
    .map((segment) => githubSlug(segment))
    .join('/')
    .replace(/\/index$/i, '');
};
