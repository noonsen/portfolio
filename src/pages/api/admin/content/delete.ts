import type { APIRoute } from 'astro';
import {
  ADMIN_JSON_HEADERS,
  readAdminJsonRequestBody,
  validateAdminJsonWriteRequest
} from '../../../../lib/admin-console/admin-api';
import {
  ADMIN_CONTENT_COLLECTION_KEYS,
  isAdminContentCollectionKey
} from '../../../../lib/admin-console/content-collections';
import type { AdminContentValidationIssue } from '../../../../lib/admin-console/content-entry-contract';
import {
  AdminContentEntryResolutionError
} from '../../../../lib/admin-console/content-entry-source';
import {
  AdminContentDeleteConfirmationError,
  deleteAdminContentEntryWithConfirmation,
  getAdminContentDeleteUnsupportedReason
} from '../../../../lib/admin-console/content-delete';
import {
  isAdminContentDeletableCollectionKey,
  type AdminContentDeletableCollectionKey
} from '../../../../lib/admin-console/content-delete-contract';
import { withAdminContentWriteLock } from '../../../../lib/admin-console/content-write-lock';

type DeleteInput = {
  collection?: AdminContentDeletableCollectionKey;
  entryId?: string;
  revision?: string;
  expectedRelativePath?: string;
  errors: string[];
  issues: AdminContentValidationIssue[];
};

const JSON_HEADERS = ADMIN_JSON_HEADERS;
const DEV_ONLY_NOT_FOUND_RESPONSE = new Response('Not Found', { status: 404 });
const METHOD_NOT_ALLOWED_RESPONSE = new Response('Method Not Allowed', {
  status: 405,
  headers: {
    allow: 'POST',
    'cache-control': 'no-store'
  }
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const createJsonErrorResponse = (
  status: number,
  errors: readonly string[],
  issues: readonly AdminContentValidationIssue[] = []
): Response =>
  new Response(
    JSON.stringify(
      {
        ok: false,
        errors,
        ...(issues.length > 0 ? { issues } : {})
      },
      null,
      2
    ),
    {
      status,
      headers: JSON_HEADERS
    }
  );

const createEntryResolutionErrorResponse = (error: unknown): Response | null => {
  if (!(error instanceof AdminContentEntryResolutionError)) return null;

  return createJsonErrorResponse(
    error.code === 'source-not-found' ? 404 : 400,
    [error.message],
    [{ path: 'entryId', message: error.message }]
  );
};

const extractDeleteInput = (body: unknown): DeleteInput => {
  if (!isRecord(body)) {
    return {
      errors: ['Request body must be a JSON object'],
      issues: [{ path: 'body', message: 'Request body must be a JSON object' }]
    };
  }

  const errors: string[] = [];
  const issues: AdminContentValidationIssue[] = [];
  const rawCollection = typeof body.collection === 'string' ? body.collection.trim() : '';
  const entryId = typeof body.entryId === 'string' ? body.entryId.trim() : undefined;
  const revision = typeof body.revision === 'string' ? body.revision.trim() : undefined;
  const expectedRelativePath = typeof body.expectedRelativePath === 'string'
    ? body.expectedRelativePath.trim()
    : undefined;
  let collection: AdminContentDeletableCollectionKey | undefined;

  if (!rawCollection) {
    const message = 'Request body is missing collection';
    errors.push(message);
    issues.push({ path: 'collection', message });
  } else if (!isAdminContentCollectionKey(rawCollection)) {
    const message = `Unsupported content collection: ${rawCollection}; only ${ADMIN_CONTENT_COLLECTION_KEYS.join(' / ')} are supported`;
    errors.push(message);
    issues.push({ path: 'collection', message });
  } else if (!isAdminContentDeletableCollectionKey(rawCollection)) {
    const message = getAdminContentDeleteUnsupportedReason(rawCollection) ?? `This collection does not currently support deletion: ${rawCollection}`;
    errors.push(message);
    issues.push({ path: 'collection', message });
  } else {
    collection = rawCollection;
  }

  if (!entryId) {
    const message = 'Request body is missing entryId';
    errors.push(message);
    issues.push({ path: 'entryId', message });
  }

  if (!revision) {
    const message = 'Request body is missing revision';
    errors.push(message);
    issues.push({ path: 'revision', message });
  }

  if (!expectedRelativePath) {
    const message = 'Request body is missing expectedRelativePath';
    errors.push(message);
    issues.push({ path: 'expectedRelativePath', message });
  }

  return {
    ...(collection ? { collection } : {}),
    ...(entryId ? { entryId } : {}),
    ...(revision ? { revision } : {}),
    ...(expectedRelativePath ? { expectedRelativePath } : {}),
    errors,
    issues
  };
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

  const requestError = validateAdminJsonWriteRequest(request, url, 'Content Console entry', 'delete');
  if (requestError) {
    return createJsonErrorResponse(requestError.status, [requestError.error]);
  }

  const bodyResult = await readAdminJsonRequestBody(request, {
    emptyBodyError: 'Request body is empty — make sure a JSON string was sent'
  });
  if (!bodyResult.ok) {
    return createJsonErrorResponse(bodyResult.status, [bodyResult.error]);
  }

  const { collection, entryId, revision, expectedRelativePath, errors, issues } = extractDeleteInput(bodyResult.body);
  if (errors.length > 0 || !collection || !entryId || !revision || !expectedRelativePath) {
    return createJsonErrorResponse(400, errors, issues);
  }

  return withAdminContentWriteLock(async () => {
    try {
      const result = await deleteAdminContentEntryWithConfirmation(collection, entryId, revision, expectedRelativePath);
      return new Response(
        JSON.stringify(
          {
            ok: true,
            result
          },
          null,
          2
        ),
        { headers: JSON_HEADERS }
      );
    } catch (error) {
      if (error instanceof AdminContentDeleteConfirmationError) {
        return new Response(
          JSON.stringify(
            {
              ok: false,
              errors: [error.message],
              payload: error.payload
            },
            null,
            2
          ),
          { status: 409, headers: JSON_HEADERS }
        );
      }

      const errorResponse = createEntryResolutionErrorResponse(error);
      if (errorResponse) return errorResponse;

      console.error('[astro-whono] Failed to delete admin content entry:', error);
      return createJsonErrorResponse(500, ['Failed to delete the content file — check local file permissions or logs']);
    }
  });
};
