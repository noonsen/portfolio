import type { APIRoute } from 'astro';
import {
  ADMIN_JSON_HEADERS,
  createAdminJsonErrorResponse,
  readAdminJsonRequestBody,
  validateAdminJsonWriteRequest
} from '../../../../lib/admin-console/admin-api';
import {
  createAdminContentBulkResult as createResult,
  createAdminContentBulkSummary,
  readAdminContentBulkEntriesInput,
  type AdminContentBulkEntryInput,
  type AdminContentBulkResult
} from '../../../../lib/admin-console/content-bulk';
import {
  isAdminContentCollectionKey,
  isAdminContentExportableCollectionKey
} from '../../../../lib/admin-console/content-collections';
import {
  AdminContentEntryResolutionError
} from '../../../../lib/admin-console/content-entry-source';
import {
  readAdminContentSourceDownload
} from '../../../../lib/admin-console/content-export';

const JSON_HEADERS = ADMIN_JSON_HEADERS;
const DEV_ONLY_NOT_FOUND_RESPONSE = new Response('Not Found', { status: 404 });
const METHOD_NOT_ALLOWED_RESPONSE = new Response('Method Not Allowed', {
  status: 405,
  headers: {
    allow: 'POST',
    'cache-control': 'no-store'
  }
});
const EXPORT_REPORT_PATH = '_admin-content-export-report.md';

type BulkExportFile = {
  zipPath: string;
  sourceText: string;
};

const normalizeZipSegment = (value: string, fallback: string): string => {
  const normalized = value.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const segments = normalized
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== '.' && segment !== '..');
  return segments.length > 0 ? segments.join('/') : fallback;
};

const createZipEntryPath = (entry: AdminContentBulkEntryInput, fileName: string): string =>
  [
    normalizeZipSegment(entry.collection, 'content'),
    normalizeZipSegment(entry.entryId, 'entry'),
    normalizeZipSegment(fileName, 'content.md')
  ].join('/');

const exportOneEntry = async (
  entry: AdminContentBulkEntryInput
): Promise<{ result: AdminContentBulkResult; file: BulkExportFile | null }> => {
  if (!isAdminContentCollectionKey(entry.collection)) {
    return {
      result: createResult(entry, {
        status: 'skipped',
        errors: [`Unsupported content collection: ${entry.collection}`],
        errorCodes: ['unsupported_collection']
      }),
      file: null
    };
  }

  if (!isAdminContentExportableCollectionKey(entry.collection)) {
    return {
      result: createResult(entry, {
        status: 'skipped',
        errors: [`Export is not supported for this collection: ${entry.collection}`],
        errorCodes: ['unsupported_collection']
      }),
      file: null
    };
  }

  try {
    const download = await readAdminContentSourceDownload(entry.collection, entry.entryId);
    if (download.relativePath !== entry.expectedRelativePath) {
      return {
        result: createResult(entry, {
          status: 'failed',
          relativePath: download.relativePath,
          errors: ['Detected a mismatch between the content file path and the list; please refresh and try again'],
          errorCodes: ['relative_path_mismatch']
        }),
        file: null
      };
    }

    return {
      result: createResult(entry, {
        status: 'succeeded',
        relativePath: download.relativePath
      }),
      file: {
        zipPath: createZipEntryPath(entry, download.fileName),
        sourceText: download.sourceText
      }
    };
  } catch (error) {
    if (error instanceof AdminContentEntryResolutionError) {
      return {
        result: createResult(entry, {
          status: 'failed',
          errors: [error.message],
          errorCodes: [error.code === 'source-not-found' ? 'source_not_found' : 'invalid_entry_id']
        }),
        file: null
      };
    }

    console.error('[astro-whono] Failed to bulk export admin content entry:', error);
    return {
      result: createResult(entry, {
        status: 'failed',
        errors: ['Failed to export content source file. Check local file permissions or logs.'],
        errorCodes: ['export_failed']
      }),
      file: null
    };
  }
};

const createExportFileName = (): string => {
  const stamp = new Date().toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  return `admin-content-export-${stamp}.zip`;
};

const createHeaderSummary = (
  summary: ReturnType<typeof createAdminContentBulkSummary>,
  results: readonly AdminContentBulkResult[]
) => {
  const problemResults = results.filter((result) => result.status === 'failed' || result.status === 'skipped');
  return {
    succeeded: summary.succeeded,
    failed: summary.failed,
    skipped: summary.skipped,
    items: problemResults.slice(0, 5).map((result) => ({
      collection: result.collection,
      entryId: result.entryId,
      status: result.status,
      errorCodes: result.errorCodes ?? []
    })),
    truncated: problemResults.length > 5
  };
};

const getReportStatusLabel = (status: AdminContentBulkResult['status']): string => {
  if (status === 'succeeded') return 'Succeeded';
  if (status === 'unchanged') return 'No changes needed';
  if (status === 'skipped') return 'Skipped';
  return 'Failed';
};

const formatReportList = (title: string, results: readonly AdminContentBulkResult[]): string[] => {
  const lines = [`## ${title}`, ''];
  if (results.length === 0) {
    lines.push('None.', '');
    return lines;
  }

  for (const result of results) {
    lines.push(`- ${result.collection}/${result.entryId}`);
    lines.push(`  - Status: ${getReportStatusLabel(result.status)}`);
    if (result.relativePath) lines.push(`  - Path: ${result.relativePath}`);
    if (result.trashedPath) lines.push(`  - Trash path: ${result.trashedPath}`);
    if (result.changedFields && result.changedFields.length > 0) {
      lines.push(`  - Changed fields: ${result.changedFields.join(', ')}`);
    }
    if (result.errorCodes && result.errorCodes.length > 0) {
      lines.push(`  - Error codes: ${result.errorCodes.join(', ')}`);
    }
    if (result.errors && result.errors.length > 0) {
      lines.push(`  - Errors: ${result.errors.join('; ')}`);
    }
  }

  lines.push('');
  return lines;
};

const createExportReportMarkdown = (
  summary: ReturnType<typeof createAdminContentBulkSummary>,
  results: readonly AdminContentBulkResult[]
): string => {
  const succeeded = results.filter((result) => result.status === 'succeeded');
  const skipped = results.filter((result) => result.status === 'skipped');
  const failed = results.filter((result) => result.status === 'failed');
  const lines = [
    '# Admin Content Bulk Export Report',
    '',
    '## Summary',
    '',
    `- Requested: ${summary.requested}`,
    `- Processed: ${summary.processed}`,
    `- Succeeded: ${summary.succeeded}`,
    `- No changes needed: ${summary.unchanged}`,
    `- Skipped: ${summary.skipped}`,
    `- Failed: ${summary.failed}`,
    '',
    ...formatReportList('Succeeded', succeeded),
    ...formatReportList('Skipped', skipped),
    ...formatReportList('Failed', failed)
  ];

  return `${lines.join('\n')}\n`;
};

export const GET: APIRoute = async () => {
  if (!import.meta.env.DEV && !process.env.VITEST) {
    return DEV_ONLY_NOT_FOUND_RESPONSE.clone();
  }

  return METHOD_NOT_ALLOWED_RESPONSE.clone();
};

export const POST: APIRoute = async ({ request, url }) => {
  if (!import.meta.env.DEV && !process.env.VITEST) {
    return DEV_ONLY_NOT_FOUND_RESPONSE.clone();
  }

  const requestError = validateAdminJsonWriteRequest(request, url, 'Content Console bulk export', 'bulk export');
  if (requestError) {
    return createAdminJsonErrorResponse(requestError.status, [requestError.error]);
  }

  const bodyResult = await readAdminJsonRequestBody(request, {
    emptyBodyError: 'Request body is empty. Please confirm a JSON string was sent.'
  });
  if (!bodyResult.ok) {
    return createAdminJsonErrorResponse(bodyResult.status, [bodyResult.error]);
  }

  const entriesResult = readAdminContentBulkEntriesInput(bodyResult.body);
  if (!entriesResult.ok) {
    return createAdminJsonErrorResponse(400, entriesResult.errors, entriesResult.issues);
  }

  const results: AdminContentBulkResult[] = [];
  const files: BulkExportFile[] = [];
  for (const entry of entriesResult.entries) {
    const exported = await exportOneEntry(entry);
    results.push(exported.result);
    if (exported.file) files.push(exported.file);
  }

  const summary = createAdminContentBulkSummary(entriesResult.requested, results);
  if (files.length === 0) {
    return new Response(
      JSON.stringify(
        {
          ok: false,
          errors: ['No content entries available to export'],
          summary,
          results
        },
        null,
        2
      ),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const { strToU8, zipSync } = await import('fflate');
  const zipEntries: Record<string, Uint8Array> = {};
  for (const file of files) {
    zipEntries[file.zipPath] = strToU8(file.sourceText);
  }
  zipEntries[EXPORT_REPORT_PATH] = strToU8(createExportReportMarkdown(summary, results));

  const zipBytes = zipSync(zipEntries, {
    level: 6,
    mtime: new Date('1980-01-01T00:00:00Z')
  });
  const fileName = createExportFileName();

  return new Response(zipBytes, {
    headers: {
      'content-type': 'application/zip',
      'cache-control': 'no-store',
      'content-disposition': `attachment; filename="${fileName}"`,
      'x-admin-content-bulk-export-summary': encodeURIComponent(JSON.stringify(createHeaderSummary(summary, results)))
    }
  });
};
