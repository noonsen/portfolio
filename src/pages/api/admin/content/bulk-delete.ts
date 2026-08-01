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
  isAdminContentCollectionKey
} from '../../../../lib/admin-console/content-collections';
import {
  AdminContentEntryResolutionError
} from '../../../../lib/admin-console/content-entry-source';
import {
  AdminContentDeleteConfirmationError,
  deleteAdminContentEntryWithConfirmation,
  getAdminContentDeleteUnsupportedReason
} from '../../../../lib/admin-console/content-delete';
import {
  isAdminContentDeletableCollectionKey
} from '../../../../lib/admin-console/content-delete-contract';
import { withAdminContentWriteLock } from '../../../../lib/admin-console/content-write-lock';

const JSON_HEADERS = ADMIN_JSON_HEADERS;
const DEV_ONLY_NOT_FOUND_RESPONSE = new Response('Not Found', { status: 404 });
const METHOD_NOT_ALLOWED_RESPONSE = new Response('Method Not Allowed', {
  status: 405,
  headers: {
    allow: 'POST',
    'cache-control': 'no-store'
  }
});

const deleteOneEntry = async (entry: AdminContentBulkEntryInput): Promise<AdminContentBulkResult> => {
  if (!isAdminContentCollectionKey(entry.collection)) {
    return createResult(entry, {
      status: 'skipped',
      errors: [`Unsupported content collection: ${entry.collection}`],
      errorCodes: ['unsupported_collection']
    });
  }

  if (!isAdminContentDeletableCollectionKey(entry.collection)) {
    return createResult(entry, {
      status: 'skipped',
      errors: [getAdminContentDeleteUnsupportedReason(entry.collection) ?? `Delete is not supported for this collection: ${entry.collection}`],
      errorCodes: ['unsupported_collection']
    });
  }

  try {
    const result = await deleteAdminContentEntryWithConfirmation(
      entry.collection,
      entry.entryId,
      entry.revision ?? '',
      entry.expectedRelativePath
    );

    return createResult(entry, {
      status: 'succeeded',
      relativePath: result.relativePath,
      trashedPath: result.trashedPath
    });
  } catch (error) {
    if (error instanceof AdminContentDeleteConfirmationError) {
      return createResult(entry, {
        status: 'failed',
        relativePath: error.payload.relativePath,
        errors: [error.message],
        errorCodes: [error.code === 'revision-conflict' ? 'revision_conflict' : 'relative_path_mismatch']
      });
    }

    if (error instanceof AdminContentEntryResolutionError) {
      return createResult(entry, {
        status: 'failed',
        errors: [error.message],
        errorCodes: [error.code === 'source-not-found' ? 'source_not_found' : 'invalid_entry_id']
      });
    }

    console.error('[astro-whono] Failed to bulk delete admin content entry:', error);
    return createResult(entry, {
      status: 'failed',
      errors: ['Failed to delete content file. Check local file permissions or logs.'],
      errorCodes: ['delete_failed']
    });
  }
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

  const requestError = validateAdminJsonWriteRequest(request, url, 'Content Console bulk delete', 'bulk delete');
  if (requestError) {
    return createAdminJsonErrorResponse(requestError.status, [requestError.error]);
  }

  const bodyResult = await readAdminJsonRequestBody(request, {
    emptyBodyError: 'Request body is empty. Please confirm a JSON string was sent.'
  });
  if (!bodyResult.ok) {
    return createAdminJsonErrorResponse(bodyResult.status, [bodyResult.error]);
  }

  const entriesResult = readAdminContentBulkEntriesInput(bodyResult.body, { requireRevision: true });
  if (!entriesResult.ok) {
    return createAdminJsonErrorResponse(400, entriesResult.errors, entriesResult.issues);
  }

  const results = await withAdminContentWriteLock(async () => {
    const nextResults: AdminContentBulkResult[] = [];
    for (const entry of entriesResult.entries) {
      nextResults.push(await deleteOneEntry(entry));
    }
    return nextResults;
  });

  return new Response(
    JSON.stringify(
      {
        ok: true,
        summary: createAdminContentBulkSummary(entriesResult.requested, results),
        results
      },
      null,
      2
    ),
    { headers: JSON_HEADERS }
  );
};
