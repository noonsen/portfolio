import {
  parseEssayDateInput,
  parseEssayPublishedAtInput
} from '../../utils/date-only';
import {
  ESSAY_PUBLIC_SLUG_RE,
  RESERVED_ESSAY_SLUGS,
  contentSourceEntryIdToPublicEntryId,
  flattenEntryIdToSlug
} from '../../utils/slug-rules';
import type { AdminEssayEditorValues } from './content-editor-payload';
import type { AdminContentValidationIssue } from './content-entry-contract';
import {
  listAdminCollectionSourceFiles,
  readAdminSourceFrontmatterRecord,
  resolveAdminContentEntryIdFromSourcePath
} from './content-entry-source';
import {
  createAdminContentValidationIssue as createIssue,
  hasOwn,
  isRecord,
  normalizeOptionalText
} from './content-entry-utils';

export type AdminEssayFrontmatter = {
  title: string;
  description?: string;
  date: string;
  publishedAt?: string;
  updatedAt?: string;
  tags: string[];
  draft: boolean;
  archive: boolean;
  slug?: string;
  cover?: string;
  badge?: string;
};

export type AdminEssayPublicSlugUsage = ReadonlyMap<string, readonly string[]>;

export type AdminEssayOptionalInputMode = 'missing' | 'present';

const getRequiredStringField = (
  input: Record<string, unknown>,
  field: string,
  issues: AdminContentValidationIssue[]
): string => {
  const value = input[field];
  if (typeof value === 'string') return value;
  issues.push(createIssue(field, `frontmatter.${field} must be a string`));
  return '';
};

const getRequiredBooleanField = (
  input: Record<string, unknown>,
  field: string,
  issues: AdminContentValidationIssue[]
): boolean => {
  const value = input[field];
  if (typeof value === 'boolean') return value;
  issues.push(createIssue(field, `frontmatter.${field} must be a boolean`));
  return false;
};

export const parseAdminEssayEditorInput = (
  input: unknown
): {
  values?: AdminEssayEditorValues;
  publishedAtInputMode: AdminEssayOptionalInputMode;
  updatedAtInputMode: AdminEssayOptionalInputMode;
  issues: AdminContentValidationIssue[];
} => {
  if (!isRecord(input)) {
    return {
      publishedAtInputMode: 'missing',
      updatedAtInputMode: 'missing',
      issues: [createIssue('frontmatter', 'frontmatter must be an object')]
    };
  }

  const issues: AdminContentValidationIssue[] = [];
  const rawPublishedAtInput = input.publishedAt;
  const hasPublishedAtInput = hasOwn(input, 'publishedAt')
    && typeof rawPublishedAtInput === 'string';
  const rawUpdatedAtInput = input.updatedAt;
  const hasUpdatedAtInput = hasOwn(input, 'updatedAt')
    && typeof rawUpdatedAtInput === 'string';
  const values: AdminEssayEditorValues = {
    title: getRequiredStringField(input, 'title', issues),
    description: getRequiredStringField(input, 'description', issues),
    date: getRequiredStringField(input, 'date', issues),
    publishedAt: hasPublishedAtInput ? rawPublishedAtInput : '',
    updatedAt: hasUpdatedAtInput ? rawUpdatedAtInput : '',
    tagsText: getRequiredStringField(input, 'tagsText', issues),
    draft: getRequiredBooleanField(input, 'draft', issues),
    archive: getRequiredBooleanField(input, 'archive', issues),
    slug: getRequiredStringField(input, 'slug', issues),
    cover: getRequiredStringField(input, 'cover', issues),
    badge: getRequiredStringField(input, 'badge', issues)
  };

  return issues.length > 0
    ? {
        publishedAtInputMode: hasPublishedAtInput ? 'present' : 'missing',
        updatedAtInputMode: hasUpdatedAtInput ? 'present' : 'missing',
        issues
      }
    : {
        values,
        publishedAtInputMode: hasPublishedAtInput ? 'present' : 'missing',
        updatedAtInputMode: hasUpdatedAtInput ? 'present' : 'missing',
        issues
      };
};

export const parseTagsText = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const resolveDefaultPublicEntryId = (sourceEntryId: string): string => {
  const publicEntryId = contentSourceEntryIdToPublicEntryId(sourceEntryId);
  return publicEntryId || sourceEntryId;
};

export const resolveEssayPublicSlug = (publicEntryId: string, explicitSlug?: string): string =>
  explicitSlug && explicitSlug.trim().length > 0
    ? explicitSlug.trim()
    : flattenEntryIdToSlug(publicEntryId);

const addEssayPublicSlugUsage = (
  usage: Map<string, string[]>,
  publicSlug: string,
  entryId: string
): void => {
  const entryIds = usage.get(publicSlug);
  if (entryIds) {
    entryIds.push(entryId);
    return;
  }
  usage.set(publicSlug, [entryId]);
};

const findEssayPublicSlugCollisionEntryId = (
  slugUsage: AdminEssayPublicSlugUsage,
  publicSlug: string,
  currentEntryId?: string
): string | null =>
  slugUsage.get(publicSlug)?.find((entryId) => entryId !== currentEntryId) ?? null;

export const loadEssayPublicSlugUsage = async (): Promise<AdminEssayPublicSlugUsage> => {
  const usage = new Map<string, string[]>();
  const essayFiles = await listAdminCollectionSourceFiles('essay');
  for (const filePath of essayFiles) {
    const candidateEntryId = resolveAdminContentEntryIdFromSourcePath('essay', filePath);
    const frontmatterRecord = await readAdminSourceFrontmatterRecord(filePath);
    const candidatePublicEntryId = resolveDefaultPublicEntryId(candidateEntryId);
    const candidateSlug = resolveEssayPublicSlug(candidatePublicEntryId, normalizeOptionalText(frontmatterRecord.slug));
    addEssayPublicSlugUsage(usage, candidateSlug, candidateEntryId);
  }
  return usage;
};

export const validateEssayPublicSlug = async (
  state: {
    entryId?: string;
    publicEntryId: string;
  },
  frontmatter: Pick<AdminEssayFrontmatter, 'slug'>,
  options: {
    slugUsage?: AdminEssayPublicSlugUsage;
  } = {}
): Promise<AdminContentValidationIssue[]> => {
  const issues: AdminContentValidationIssue[] = [];
  const publicSlug = resolveEssayPublicSlug(state.publicEntryId, frontmatter.slug);

  if (!ESSAY_PUBLIC_SLUG_RE.test(publicSlug)) {
    issues.push(
      createIssue(
        'slug',
        frontmatter.slug
          ? 'essay.slug must be lowercase kebab-case'
          : 'The public slug flattened from the current entry path is invalid. Please set a valid slug or adjust the file path.'
      )
    );
  }

  if (RESERVED_ESSAY_SLUGS.has(publicSlug)) {
    issues.push(
      createIssue(
        'slug',
        `Public slug "${publicSlug}" conflicts with a reserved route under /archive or /essay. Please change the slug.`
      )
    );
  }

  if (issues.length > 0) {
    return issues;
  }

  try {
    const slugUsage = options.slugUsage ?? await loadEssayPublicSlugUsage();
    const collisionEntryId = findEssayPublicSlugCollisionEntryId(slugUsage, publicSlug, state.entryId);
    if (collisionEntryId) {
      issues.push(
        createIssue(
          'slug',
          `Public slug "${publicSlug}" is already taken by another essay: ${collisionEntryId}`
        )
      );
      return issues;
    }
  } catch (error) {
    issues.push(
      createIssue(
        'slug',
        `Unable to complete essay.slug uniqueness validation: ${error instanceof Error ? error.message : 'unknown error'}`
      )
    );
  }

  return issues;
};

export const buildEssayFrontmatterFromValues = (
  values: AdminEssayEditorValues,
  options: {
    preservedPublishedAt?: string;
    preservedUpdatedAt?: string;
  } = {}
): { frontmatter?: AdminEssayFrontmatter; issues: AdminContentValidationIssue[] } => {
  const issues: AdminContentValidationIssue[] = [];
  const title = values.title.trim();
  if (!title) {
    issues.push(createIssue('title', 'title cannot be empty'));
  }

  const dateResult = parseEssayDateInput(values.date);
  if (!dateResult) {
    issues.push(createIssue('date', 'essay.date must be YYYY-MM-DD or an ISO 8601 date-time with a timezone'));
  }

  const explicitPublishedAt = values.publishedAt.trim();
  const hasExplicitPublishedAt = explicitPublishedAt.length > 0;
  const publishedAt = hasExplicitPublishedAt
    ? parseEssayPublishedAtInput(explicitPublishedAt)
    : dateResult?.publishedAt;

  if (hasExplicitPublishedAt && !publishedAt) {
    issues.push(createIssue('publishedAt', 'essay.publishedAt must be an ISO 8601 date-time with a timezone'));
  }

  const explicitUpdatedAt = values.updatedAt.trim();
  const hasExplicitUpdatedAt = explicitUpdatedAt.length > 0;
  const updatedAtResult = hasExplicitUpdatedAt
    ? parseEssayDateInput(explicitUpdatedAt)
    : null;

  if (hasExplicitUpdatedAt && !updatedAtResult) {
    issues.push(createIssue('updatedAt', 'essay.updatedAt must be YYYY-MM-DD or an ISO 8601 date-time with a timezone'));
  }

  if (!dateResult || issues.length > 0) {
    return { issues };
  }

  const slug = values.slug.trim();
  const preservedPublishedAt = normalizeOptionalText(options.preservedPublishedAt);
  const preservedUpdatedAt = normalizeOptionalText(options.preservedUpdatedAt);
  const publishedAtText = hasExplicitPublishedAt
    ? explicitPublishedAt
    : dateResult.publishedAtText || preservedPublishedAt;
  const updatedAtText = hasExplicitUpdatedAt
    ? updatedAtResult?.dateText
    : preservedUpdatedAt;
  const publishedAtDateResult = publishedAtText ? parseEssayDateInput(publishedAtText) : null;
  const date = publishedAtDateResult?.dateText ?? dateResult.dateText;
  const effectiveDateResult = publishedAtDateResult ?? dateResult;
  const finalUpdatedAtResult = hasExplicitUpdatedAt
    ? updatedAtResult
    : updatedAtText
      ? parseEssayDateInput(updatedAtText)
      : null;

  if (finalUpdatedAtResult && finalUpdatedAtResult.date.valueOf() < effectiveDateResult.date.valueOf()) {
    issues.push(createIssue('updatedAt', 'essay.updatedAt cannot be earlier than essay.date'));
    return { issues };
  }

  return {
    issues,
    frontmatter: {
      title,
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
      date,
      ...(publishedAtText ? { publishedAt: publishedAtText } : {}),
      ...(updatedAtText ? { updatedAt: updatedAtText } : {}),
      tags: parseTagsText(values.tagsText),
      draft: values.draft === true,
      archive: values.archive !== false,
      ...(slug ? { slug } : {}),
      ...(values.cover.trim() ? { cover: values.cover.trim() } : {}),
      ...(values.badge.trim() ? { badge: values.badge.trim() } : {})
    }
  };
};
