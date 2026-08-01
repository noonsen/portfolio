import { access, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import {
  resolveAdminContentEntrySourcePath
} from './content-entry-source';
import {
  readAdminContentEntryEditorPayload,
  type AdminContentEditorPayload
} from './content-editor-payload';
import {
  getAdminContentCollectionCapability,
  type AdminContentCollectionKey
} from './content-collections';
import type { AdminContentDeletableCollectionKey } from './content-delete-contract';
import { invalidateAdminImageCaches } from './image-shared';

export {
  ADMIN_CONTENT_DELETABLE_COLLECTION_KEYS,
  isAdminContentDeletableCollectionKey,
  type AdminContentDeletableCollectionKey
} from './content-delete-contract';

export type AdminContentDeleteResult = {
  collection: AdminContentDeletableCollectionKey;
  entryId: string;
  deleted: true;
  relativePath: string;
  trashedPath: string;
};

export class AdminContentDeleteConfirmationError extends Error {
  readonly code: 'revision-conflict' | 'relative-path-mismatch';
  readonly payload: AdminContentEditorPayload;

  constructor(
    code: 'revision-conflict' | 'relative-path-mismatch',
    payload: AdminContentEditorPayload
  ) {
    super(code === 'revision-conflict'
      ? 'The content file has been updated externally, so the delete was rejected. Please refresh the list and try again.'
      : 'The content file path no longer matches what was confirmed, so the delete was rejected. Please refresh the list and try again.');
    this.name = 'AdminContentDeleteConfirmationError';
    this.code = code;
    this.payload = payload;
  }
}

export const getAdminContentDeleteUnsupportedReason = (collection: AdminContentCollectionKey): string | null =>
  getAdminContentCollectionCapability(collection).deleteUnsupportedReason;

const getProjectRoot = (): string => process.env.ASTRO_WHONO_INTERNAL_TEST_PROJECT_ROOT?.trim() || process.cwd();

const toRelativeProjectPath = (filePath: string): string =>
  path.relative(getProjectRoot(), filePath).replace(/\\/g, '/');

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const pad = (value: number, size = 2): string =>
  String(value).padStart(size, '0');

const formatTrashTimestamp = (date = new Date()): string =>
  [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('')
  + '-'
  + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    pad(date.getMilliseconds(), 3)
  ].join('');

const getTrashDestinationPath = async (
  sourceRelativePath: string,
  date = new Date()
): Promise<string> => {
  const projectRoot = getProjectRoot();
  const pathSegments = sourceRelativePath.split('/').filter(Boolean);
  const timestamp = formatTrashTimestamp(date);

  // Preserve the original relative path so the file can be moved straight back under src/content when restoring.
  for (let index = 1; index <= 999; index += 1) {
    const bucket = index === 1 ? timestamp : `${timestamp}-${index}`;
    const bucketPath = path.join(projectRoot, '.trash', 'content', bucket);
    const destination = path.join(bucketPath, ...pathSegments);
    if (!(await fileExists(bucketPath))) return destination;
  }

  throw new Error('Unable to generate an available content trash path');
};

export const moveAdminContentEntryToTrash = async (
  collection: AdminContentDeletableCollectionKey,
  entryId: string
): Promise<AdminContentDeleteResult> => {
  const sourcePath = resolveAdminContentEntrySourcePath(collection, entryId);
  const relativePath = toRelativeProjectPath(sourcePath);
  const expectedPrefix = `src/content/${collection}/`;
  if (!relativePath.startsWith(expectedPrefix)) {
    throw new Error(`Refused to move a file outside the content root directory: ${relativePath}`);
  }

  const destinationPath = await getTrashDestinationPath(relativePath);
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await rename(sourcePath, destinationPath);
  invalidateAdminImageCaches();

  return {
    collection,
    entryId,
    deleted: true,
    relativePath,
    trashedPath: toRelativeProjectPath(destinationPath)
  };
};

export const deleteAdminContentEntryWithConfirmation = async (
  collection: AdminContentDeletableCollectionKey,
  entryId: string,
  revision: string,
  expectedRelativePath: string
): Promise<AdminContentDeleteResult> => {
  const currentPayload = await readAdminContentEntryEditorPayload(collection, entryId);

  if (currentPayload.revision !== revision) {
    throw new AdminContentDeleteConfirmationError('revision-conflict', currentPayload);
  }

  if (currentPayload.relativePath !== expectedRelativePath) {
    throw new AdminContentDeleteConfirmationError('relative-path-mismatch', currentPayload);
  }

  return moveAdminContentEntryToTrash(collection, entryId);
};
