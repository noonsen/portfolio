import {
  persistAdminFileTransaction
} from './admin-api';
import {
  createAdminContentBulkResult as createResult,
  type AdminContentBulkEntryInput,
  type AdminContentBulkResult
} from './content-bulk';
import {
  isAdminContentCollectionKey,
  isAdminContentDraftStatusCollectionKey
} from './content-collections';
import {
  AdminContentEntryResolutionError,
  loadAdminContentSourceState
} from './content-entry-source';
import { patchMarkdownFrontmatter } from './frontmatter';
import { withAdminContentWriteLock } from './content-write-lock';

class AdminContentBulkStatusConflictError extends Error {
  constructor() {
    super('Admin content draft status changed before write');
  }
}

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const patchOneAdminContentDraftStatus = async (
  entry: AdminContentBulkEntryInput,
  targetDraft: boolean
): Promise<AdminContentBulkResult> => {
  if (!isAdminContentCollectionKey(entry.collection)) {
    return createResult(entry, {
      status: 'skipped',
      errors: [`Unsupported content collection: ${entry.collection}`],
      errorCodes: ['unsupported_collection']
    });
  }

  if (!isAdminContentDraftStatusCollectionKey(entry.collection)) {
    return createResult(entry, {
      status: 'skipped',
      errors: [`This collection does not yet support bulk publish or draft status changes: ${entry.collection}`],
      errorCodes: ['unsupported_collection']
    });
  }

  const collection = entry.collection;
  try {
    const state = await loadAdminContentSourceState(collection, entry.entryId);
    if (state.relativePath !== entry.expectedRelativePath) {
      return createResult(entry, {
        status: 'failed',
        relativePath: state.relativePath,
        errors: ['Detected that the content file path does not match the list; please refresh and try again'],
        errorCodes: ['relative_path_mismatch']
      });
    }

    const currentDraft = state.rawFrontmatter.draft === true;
    if (currentDraft === targetDraft) {
      return createResult(entry, {
        status: 'unchanged',
        relativePath: state.relativePath
      });
    }

    const nextSourceText = patchMarkdownFrontmatter(state.sourceText, [
      { path: ['draft'], action: 'set', value: targetDraft }
    ]);

    await persistAdminFileTransaction([
      {
        id: 'entry',
        filePath: state.sourcePath,
        content: nextSourceText
      }
    ], {
      beforeWrite: async () => {
        const latestState = await loadAdminContentSourceState(collection, entry.entryId);
        if (latestState.revision !== state.revision || latestState.relativePath !== state.relativePath) {
          throw new AdminContentBulkStatusConflictError();
        }
      }
    });

    return createResult(entry, {
      status: 'succeeded',
      relativePath: state.relativePath,
      changedFields: ['draft']
    });
  } catch (error) {
    if (error instanceof AdminContentEntryResolutionError) {
      return createResult(entry, {
        status: 'failed',
        errors: [error.message],
        errorCodes: [error.code === 'source-not-found' ? 'source_not_found' : 'invalid_entry_id']
      });
    }

    return createResult(entry, {
      status: 'failed',
      errors: [
        error instanceof AdminContentBulkStatusConflictError
          ? 'Detected that the content file was updated externally; this entry was skipped, please refresh and try again'
          : getErrorMessage(error, 'Failed to update content status; please check local file permissions or logs')
      ],
      errorCodes: [
        error instanceof AdminContentBulkStatusConflictError
          ? 'revision_conflict'
          : 'update_failed'
      ]
    });
  }
};

export const patchAdminContentDraftStatusBulk = async (
  entries: readonly AdminContentBulkEntryInput[],
  targetDraft: boolean
): Promise<AdminContentBulkResult[]> =>
  withAdminContentWriteLock(async () => {
    const results: AdminContentBulkResult[] = [];
    for (const entry of entries) {
      results.push(await patchOneAdminContentDraftStatus(entry, targetDraft));
    }
    return results;
  });
