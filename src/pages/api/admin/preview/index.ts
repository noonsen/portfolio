import type { APIRoute } from 'astro';
import {
  ADMIN_JSON_HEADERS,
  readAdminJsonRequestBody,
  validateAdminJsonWriteRequest
} from '../../../../lib/admin-console/admin-api';
import {
  ADMIN_CONTENT_COLLECTION_KEYS,
  isAdminContentCollectionKey,
  isAdminContentWriteCollectionKey,
  type AdminContentWriteCollectionKey
} from '../../../../lib/admin-console/content-collections';
import type { AdminContentValidationIssue } from '../../../../lib/admin-console/content-entry-contract';
import {
  AdminContentEntryResolutionError,
  getAdminContentReadOnlyReason
} from '../../../../lib/admin-console/content-entry-source';
import { renderAdminMarkdownPreview } from '../../../../lib/admin-console/preview';

type PreviewInput = {
  collection?: AdminContentWriteCollectionKey;
  entryId?: string;
  source?: string;
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

const extractPreviewInput = (body: unknown): PreviewInput => {
  if (!isRecord(body)) {
    return {
      errors: ['Request body must be a JSON object'],
      issues: [{ path: 'body', message: 'Request body must be a JSON object' }]
    };
  }

  const errors: string[] = [];
  const issues: AdminContentValidationIssue[] = [];
  const rawCollection = typeof body.collection === 'string' ? body.collection.trim() : '';
  let collection: AdminContentWriteCollectionKey | undefined;
  let entryId: string | undefined;
  let source: string | undefined;

  if (!rawCollection) {
    const message = 'Request body is missing collection';
    errors.push(message);
    issues.push({ path: 'collection', message });
  } else if (!isAdminContentCollectionKey(rawCollection)) {
    const message = `Unsupported content collection: ${rawCollection}; only ${ADMIN_CONTENT_COLLECTION_KEYS.join(' / ')} are supported`;
    errors.push(message);
    issues.push({ path: 'collection', message });
  } else if (!isAdminContentWriteCollectionKey(rawCollection)) {
    const message = getAdminContentReadOnlyReason(rawCollection) ?? `This collection does not currently support preview: ${rawCollection}`;
    errors.push(message);
    issues.push({ path: 'collection', message });
  } else {
    collection = rawCollection;
  }

  if (typeof body.source !== 'string') {
    const message = 'source must be a Markdown string';
    errors.push(message);
    issues.push({ path: 'source', message });
  } else {
    source = body.source;
  }

  if ('entryId' in body && typeof body.entryId !== 'undefined') {
    if (typeof body.entryId !== 'string' || !body.entryId.trim()) {
      const message = 'entryId must be a non-empty string';
      errors.push(message);
      issues.push({ path: 'entryId', message });
    } else {
      entryId = body.entryId.trim();
    }
  }

  if (rawCollection === 'about') {
    if (!entryId) {
      const message = 'about preview requires a fixed entryId: index';
      errors.push(message);
      issues.push({ path: 'entryId', message });
    } else if (entryId !== 'index') {
      const message = 'about preview only supports a fixed entryId: index';
      errors.push(message);
      issues.push({ path: 'entryId', message });
    }
  }

  return {
    ...(collection ? { collection } : {}),
    ...(entryId ? { entryId } : {}),
    ...(source !== undefined ? { source } : {}),
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

  const requestError = validateAdminJsonWriteRequest(request, url, 'Content Console', 'preview');
  if (requestError) {
    return createJsonErrorResponse(requestError.status, [requestError.error]);
  }

  const bodyResult = await readAdminJsonRequestBody(request, {
    emptyBodyError: 'Request body is empty — make sure a JSON string was sent'
  });
  if (!bodyResult.ok) {
    return createJsonErrorResponse(bodyResult.status, [bodyResult.error]);
  }

  const { collection, entryId, source, errors, issues } = extractPreviewInput(bodyResult.body);
  if (errors.length > 0 || !collection || source === undefined) {
    return createJsonErrorResponse(400, errors, issues);
  }

  try {
    const result = await renderAdminMarkdownPreview({
      collection,
      ...(entryId ? { entryId } : {}),
      source
    });
    return new Response(JSON.stringify({ ok: true, result }, null, 2), {
      headers: JSON_HEADERS
    });
  } catch (error) {
    if (error instanceof AdminContentEntryResolutionError) {
      return createJsonErrorResponse(
        error.code === 'source-not-found' ? 404 : 400,
        [error.message],
        [{ path: 'entryId', message: error.message }]
      );
    }

    console.error('[astro-whono] Failed to render admin content preview:', error);
    return createJsonErrorResponse(500, ['Failed to render the preview — check the Markdown content or local logs']);
  }
};
