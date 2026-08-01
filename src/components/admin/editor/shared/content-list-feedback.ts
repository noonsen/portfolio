export type ContentListActionFeedback = 'saved' | 'deleted';

export const CONTENT_LIST_ACTION_FEEDBACK_STORAGE_KEY = 'astro-whono:admin-content:action-feedback';
export const CONTENT_LIST_ACTION_FEEDBACK_SAVED = 'saved';
export const CONTENT_LIST_ACTION_FEEDBACK_DELETED = 'deleted';

export const CONTENT_LIST_DELETE_FEEDBACK_STORAGE_KEY = 'astro-whono:admin-content:delete-feedback';
export const CONTENT_LIST_DELETE_FEEDBACK_VALUE = CONTENT_LIST_ACTION_FEEDBACK_DELETED;

const isContentListActionFeedback = (value: string | null): value is ContentListActionFeedback =>
  value === CONTENT_LIST_ACTION_FEEDBACK_SAVED || value === CONTENT_LIST_ACTION_FEEDBACK_DELETED;

export const storeContentListActionFeedback = (value: ContentListActionFeedback): void => {
  try {
    window.sessionStorage.setItem(CONTENT_LIST_ACTION_FEEDBACK_STORAGE_KEY, value);
  } catch {
    // Used only for the success message after a refresh; a write failure doesn't affect a save/delete that already completed.
  }
};

export const takeContentListActionFeedback = (): ContentListActionFeedback | null => {
  try {
    const value = window.sessionStorage.getItem(CONTENT_LIST_ACTION_FEEDBACK_STORAGE_KEY);
    const legacyDeleteValue = window.sessionStorage.getItem(CONTENT_LIST_DELETE_FEEDBACK_STORAGE_KEY);
    window.sessionStorage.removeItem(CONTENT_LIST_ACTION_FEEDBACK_STORAGE_KEY);
    window.sessionStorage.removeItem(CONTENT_LIST_DELETE_FEEDBACK_STORAGE_KEY);

    if (isContentListActionFeedback(value)) return value;
    return legacyDeleteValue === CONTENT_LIST_DELETE_FEEDBACK_VALUE ? CONTENT_LIST_ACTION_FEEDBACK_DELETED : null;
  } catch {
    return null;
  }
};
