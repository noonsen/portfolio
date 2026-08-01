import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  resolveAdminContentEntryLegacySourcePath
} from './content-entry-source';
import {
  getAdminContentFixedPageCapability,
  type AdminContentCollectionKey
} from './content-collections';

export type AdminContentSourceDownload = {
  collection: AdminContentCollectionKey;
  entryId: string;
  sourcePath: string;
  relativePath: string;
  fileName: string;
  contentType: string;
  sourceText: string;
};

const getProjectRoot = (): string => process.env.ASTRO_WHONO_INTERNAL_TEST_PROJECT_ROOT?.trim() || process.cwd();

const toRelativeProjectPath = (filePath: string): string =>
  path.relative(getProjectRoot(), filePath).replace(/\\/g, '/');

const getContentSourceContentType = (fileName: string): string =>
  fileName.toLowerCase().endsWith('.mdx')
    ? 'text/plain; charset=utf-8'
    : 'text/markdown; charset=utf-8';

const toAsciiHeaderFileName = (value: string): string => {
  const normalized = value
    .replace(/["\\]/g, '_')
    .replace(/[^\x20-\x7E]/g, '_')
    .trim();
  return normalized || 'content.md';
};

const encodeContentDispositionFileName = (value: string): string =>
  encodeURIComponent(value).replace(/['()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );

const getEntryDownloadStem = (collection: AdminContentCollectionKey, entryId: string): string => {
  const normalizedEntryId = entryId.trim().replace(/\\/g, '/').replace(/\/+$/, '');
  const segments = normalizedEntryId.split('/').filter(Boolean);
  const lastSegment = segments.at(-1) ?? '';
  return getAdminContentFixedPageCapability(collection) && lastSegment.toLowerCase() === 'index'
    ? collection
    : lastSegment || collection;
};

export const getAdminContentSourceDownloadName = (
  collection: AdminContentCollectionKey,
  entryId: string,
  sourcePath: string
): string => {
  const sourceFileName = path.basename(sourcePath);
  const parsed = path.parse(sourceFileName);
  // Directory-style entries use index.md on disk; downloads are named after the entry's last path segment, and the memo single page stays memo.md.
  return parsed.name.toLowerCase() === 'index'
    ? `${getEntryDownloadStem(collection, entryId)}${parsed.ext.toLowerCase()}`
    : sourceFileName;
};

export const createAdminContentSourceDownloadHeaders = (
  fileName: string,
  contentType: string
): HeadersInit => ({
  'content-type': contentType,
  'cache-control': 'no-store',
  // filename is an ASCII fallback; the real file name is kept in filename*.
  'content-disposition': `attachment; filename="${toAsciiHeaderFileName(fileName)}"; filename*=UTF-8''${encodeContentDispositionFileName(fileName)}`
});

export const readAdminContentSourceDownload = async (
  collection: AdminContentCollectionKey,
  entryId: string
): Promise<AdminContentSourceDownload> => {
  const sourcePath = resolveAdminContentEntryLegacySourcePath(collection, entryId);
  const fileName = getAdminContentSourceDownloadName(collection, entryId, sourcePath);
  const sourceText = await readFile(sourcePath, 'utf8');

  return {
    collection,
    entryId,
    sourcePath,
    relativePath: toRelativeProjectPath(sourcePath),
    fileName,
    contentType: getContentSourceContentType(fileName),
    sourceText
  };
};
