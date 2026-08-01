import type { APIRoute } from 'astro';
import {
  ADMIN_JSON_HEADERS,
  isAdminDryRunRequest,
  persistAdminFileTransaction,
  readAdminJsonRequestBody,
  validateAdminJsonWriteRequest
} from '../../../../lib/admin-console/admin-api';
import {
  ADMIN_CONTENT_COLLECTION_KEYS,
  isAdminContentCollectionKey,
  isAdminContentEntryWriteCollectionKey,
  type AdminContentEntryWriteCollectionKey
} from '../../../../lib/admin-console/content-collections';
import type { AdminContentValidationIssue } from '../../../../lib/admin-console/content-entry-contract';
import {
  AdminContentEntryResolutionError,
  getAdminContentReadOnlyReason,
  loadAdminContentSourceState
} from '../../../../lib/admin-console/content-entry-source';
import {
  buildAdminContentEntryEditorPayloadFromState,
  readAdminContentEntryEditorPayload
} from '../../../../lib/admin-console/content-editor-payload';
import {
  applyAdminContentWritePlan,
  buildAdminContentWritePlanFromState
} from '../../../../lib/admin-console/content-write-plan';
import { withAdminContentWriteLock } from '../../../../lib/admin-console/content-write-lock';

type WriteInput = {
  collection?: AdminContentEntryWriteCollectionKey;
  entryId?: string;
  revision?: string;
  frontmatterInput?: unknown;
  bodyInput?: string;
  errors: string[];
  issues: AdminContentValidationIssue[];
};

const JSON_HEADERS = ADMIN_JSON_HEADERS;

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

const DEV_ONLY_NOT_FOUND_RESPONSE = new Response('Not Found', { status: 404 });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isFrontmatterWriteCollection = (collection: string): collection is 'essay' | 'bits' =>
  collection === 'essay' || collection === 'bits';

const extractWriteInput = (body: unknown): WriteInput => {
  if (!isRecord(body)) {
    return {
      errors: ['Request body must be a JSON object'],
      issues: [{ path: 'body', message: 'Request body must be a JSON object' }]
    };
  }

  const errors: string[] = [];
  const issues: AdminContentValidationIssue[] = [];
  let collection: AdminContentEntryWriteCollectionKey | undefined;
  const rawCollection = typeof body.collection === 'string' ? body.collection.trim() : '';
  const entryId = typeof body.entryId === 'string' ? body.entryId.trim() : undefined;
  const revision = typeof body.revision === 'string' ? body.revision.trim() : undefined;
  const hasFrontmatter = hasOwn(body, 'frontmatter');
  const hasBody = hasOwn(body, 'body');

  if (!rawCollection) {
    const message = 'Request body is missing collection';
    errors.push(message);
    issues.push({ path: 'collection', message });
  } else if (!isAdminContentCollectionKey(rawCollection)) {
    const message = `Unsupported content collection: ${rawCollection}; only ${ADMIN_CONTENT_COLLECTION_KEYS.join(' / ')} are supported`;
    errors.push(message);
    issues.push({ path: 'collection', message });
  } else if (!isAdminContentEntryWriteCollectionKey(rawCollection)) {
    const message = getAdminContentReadOnlyReason(rawCollection) ?? `This collection does not currently support writing: ${rawCollection}`;
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

  if (rawCollection === 'about' && !hasBody) {
    const message = 'about save request is missing the body field';
    errors.push(message);
    issues.push({ path: 'body', message });
  }

  if (rawCollection === 'memo' && !hasBody) {
    const message = 'memo save request is missing the body field';
    errors.push(message);
    issues.push({ path: 'body', message });
  }

  if (isFrontmatterWriteCollection(rawCollection) && !hasFrontmatter) {
    const message = 'Request body is missing the frontmatter field';
    errors.push(message);
    issues.push({ path: 'frontmatter', message });
  } else if (isFrontmatterWriteCollection(rawCollection) && !isRecord(body.frontmatter)) {
    const message = 'frontmatter must be an object';
    errors.push(message);
    issues.push({ path: 'frontmatter', message });
  }

  if (hasBody && typeof body.body !== 'string') {
    const message = 'body must be a Markdown string';
    errors.push(message);
    issues.push({ path: 'body', message });
  }

  return {
    ...(collection ? { collection } : {}),
    ...(entryId ? { entryId } : {}),
    ...(revision ? { revision } : {}),
    ...(hasFrontmatter ? { frontmatterInput: body.frontmatter } : {}),
    ...(hasBody && typeof body.body === 'string' ? { bodyInput: body.body } : {}),
    errors,
    issues
  };
};

const createEntryResolutionErrorResponse = (error: unknown): Response | null => {
  if (!(error instanceof AdminContentEntryResolutionError)) return null;

  return createJsonErrorResponse(
    error.code === 'source-not-found' ? 404 : 400,
    [error.message],
    [{ path: 'entryId', message: error.message }]
  );
};

class AdminContentRevisionConflictError extends Error {
  latestPayload: Awaited<ReturnType<typeof readAdminContentEntryEditorPayload>>;

  constructor(latestPayload: Awaited<ReturnType<typeof readAdminContentEntryEditorPayload>>) {
    super('Admin content entry revision conflict');
    this.latestPayload = latestPayload;
  }
}

const createRevisionConflictResponse = (
  payload: Awaited<ReturnType<typeof readAdminContentEntryEditorPayload>>
): Response =>
  new Response(
    JSON.stringify(
      {
        ok: false,
        errors: ['Detected the content file was updated externally — overwrite refused; refresh the current entry before saving again'],
        payload
      },
      null,
      2
    ),
    { status: 409, headers: JSON_HEADERS }
  );

export const GET: APIRoute = async ({ url }) => {
  if (!import.meta.env.DEV && !process.env.VITEST) {
    return DEV_ONLY_NOT_FOUND_RESPONSE.clone();
  }

  const collection = url.searchParams.get('collection')?.trim() ?? '';
  const entryId = url.searchParams.get('entryId')?.trim() ?? '';

  if (!collection) {
    return createJsonErrorResponse(400, ['Query parameter is missing collection'], [{ path: 'collection', message: 'Query parameter is missing collection' }]);
  }

  if (!isAdminContentCollectionKey(collection)) {
    return createJsonErrorResponse(
      400,
      [`Unsupported content collection: ${collection}; only ${ADMIN_CONTENT_COLLECTION_KEYS.join(' / ')} are supported`],
      [{ path: 'collection', message: `Unsupported content collection: ${collection}` }]
    );
  }

  if (!isAdminContentEntryWriteCollectionKey(collection)) {
    const message = getAdminContentReadOnlyReason(collection) ?? `This collection does not currently support writing: ${collection}`;
    return createJsonErrorResponse(
      400,
      [message],
      [{ path: 'collection', message }]
    );
  }

  if (!entryId) {
    return createJsonErrorResponse(400, ['Query parameter is missing entryId'], [{ path: 'entryId', message: 'Query parameter is missing entryId' }]);
  }

  try {
    const payload = await readAdminContentEntryEditorPayload(collection, entryId);
    return new Response(JSON.stringify({ ok: true, payload }, null, 2), {
      headers: JSON_HEADERS
    });
  } catch (error) {
    const errorResponse = createEntryResolutionErrorResponse(error);
    if (errorResponse) return errorResponse;
    throw error;
  }
};

export const POST: APIRoute = async ({ request, url }) => {
  if (!import.meta.env.DEV && !process.env.VITEST) {
    return DEV_ONLY_NOT_FOUND_RESPONSE.clone();
  }

  const requestError = validateAdminJsonWriteRequest(request, url, 'Content Console entry');
  if (requestError) {
    return createJsonErrorResponse(requestError.status, [requestError.error]);
  }

  const bodyResult = await readAdminJsonRequestBody(request, {
    emptyBodyError: 'Request body is empty — make sure a JSON string was sent'
  });
  if (!bodyResult.ok) {
    return createJsonErrorResponse(bodyResult.status, [bodyResult.error]);
  }

  const { collection, entryId, revision, frontmatterInput, bodyInput, errors, issues } = extractWriteInput(bodyResult.body);
  if (errors.length > 0 || !collection || !entryId || !revision) {
    return createJsonErrorResponse(400, errors, issues);
  }

  const isDryRun = isAdminDryRunRequest(url);

  return withAdminContentWriteLock(async () => {
    let currentPayload: Awaited<ReturnType<typeof readAdminContentEntryEditorPayload>>;
    let currentState: Awaited<ReturnType<typeof loadAdminContentSourceState>>;
    try {
      currentState = await loadAdminContentSourceState(collection, entryId);
      currentPayload = buildAdminContentEntryEditorPayloadFromState(currentState);
    } catch (error) {
      const errorResponse = createEntryResolutionErrorResponse(error);
      if (errorResponse) return errorResponse;
      throw error;
    }

    if (currentPayload.revision !== revision) {
      return createRevisionConflictResponse(currentPayload);
    }

    let plan: Awaited<ReturnType<typeof buildAdminContentWritePlanFromState>>;
    try {
      plan = await buildAdminContentWritePlanFromState(currentState, frontmatterInput, bodyInput);
    } catch (error) {
      const errorResponse = createEntryResolutionErrorResponse(error);
      if (errorResponse) return errorResponse;
      throw error;
    }

    if (plan.issues.length > 0) {
      return createJsonErrorResponse(400, Array.from(new Set(plan.issues.map((issue) => issue.message))), plan.issues);
    }

    const result = {
      changed: plan.changedFields.length > 0,
      written: false,
      changedFields: plan.changedFields,
      relativePath: currentPayload.relativePath
    };

    if (isDryRun) {
      return new Response(JSON.stringify({ ok: true, dryRun: true, result }, null, 2), {
        headers: JSON_HEADERS
      });
    }

    if (plan.changedFields.length === 0) {
      return new Response(JSON.stringify({ ok: true, result, payload: currentPayload }, null, 2), {
        headers: JSON_HEADERS
      });
    }

    try {
      const nextSourceText = applyAdminContentWritePlan(plan.state, plan.patches, plan.bodyText);
      await persistAdminFileTransaction([
        {
          id: 'entry',
          filePath: plan.state.sourcePath,
          content: nextSourceText
        }
      ], {
        beforeWrite: async () => {
          const latestPayloadBeforeWrite = await readAdminContentEntryEditorPayload(collection, entryId);
          if (latestPayloadBeforeWrite.revision !== revision) {
            throw new AdminContentRevisionConflictError(latestPayloadBeforeWrite);
          }
        }
      });
      const latestPayload = await readAdminContentEntryEditorPayload(collection, entryId);

      return new Response(
        JSON.stringify(
          {
            ok: true,
            result: {
              ...result,
              written: true
            },
            payload: latestPayload
          },
          null,
          2
        ),
        { headers: JSON_HEADERS }
      );
    } catch (error) {
      if (error instanceof AdminContentRevisionConflictError) {
        return createRevisionConflictResponse(error.latestPayload);
      }

      console.error('[astro-whono] Failed to persist admin content entry:', error);
      return new Response(
        JSON.stringify(
          {
            ok: false,
            errors: ['Failed to write the content file — check local file permissions or logs'],
            result
          },
          null,
          2
        ),
        { status: 500, headers: JSON_HEADERS }
      );
    }
  });
};
