export {};

const refreshForm = document.querySelector<HTMLFormElement>('[data-admin-checks-refresh-form]');
const refreshButton = document.querySelector<HTMLButtonElement>('[data-admin-checks-refresh-button]');
const statusLiveEl = document.querySelector<HTMLElement>('[data-admin-checks-status-live]');

const FEEDBACK_KEY = 'admin-checks:refresh-feedback';
const LOADING_LABEL = 'Checking...';
const SUCCESS_LABEL = '✅ Rechecked';
const SUCCESS_TIMEOUT_MS = 2000;

const getDefaultLabel = (): string => refreshButton?.dataset.defaultLabel?.trim() || 'Recheck';

const getCurrentFeedbackPath = (): string => {
  const query = new URLSearchParams(window.location.search).toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}`;
};

const setLiveStatus = (state: 'idle' | 'loading' | 'done', message: string, announce = true) => {
  if (!statusLiveEl || announce === false) return;

  const liveState = statusLiveEl.dataset.state ?? '';
  const liveMessage = statusLiveEl.textContent?.trim() || '';
  if (liveState === state && liveMessage === message) return;

  statusLiveEl.dataset.state = state;
  statusLiveEl.textContent = message;
};

const clearLiveStatus = () => {
  if (!statusLiveEl) return;
  statusLiveEl.dataset.state = 'idle';
  statusLiveEl.textContent = '';
};

const setButtonState = (state: 'idle' | 'loading' | 'done', announce = false) => {
  if (!refreshButton) return;

  refreshButton.dataset.state = state;
  refreshButton.disabled = state === 'loading';
  refreshButton.textContent = state === 'loading'
    ? LOADING_LABEL
    : state === 'done'
      ? SUCCESS_LABEL
      : getDefaultLabel();

  if (state === 'idle') {
    clearLiveStatus();
    return;
  }

  setLiveStatus(state, state === 'loading' ? 'Rechecking' : 'Rechecked', announce);
};

const markRefreshPending = () => {
  try {
    window.sessionStorage.setItem(FEEDBACK_KEY, getCurrentFeedbackPath());
  } catch {
    // When sessionStorage is unavailable, silently degrade to no completion feedback.
  }
};

const consumeRefreshPending = (): boolean => {
  try {
    const pendingPath = window.sessionStorage.getItem(FEEDBACK_KEY);
    if (pendingPath !== getCurrentFeedbackPath()) return false;
    window.sessionStorage.removeItem(FEEDBACK_KEY);
    return true;
  } catch {
    return false;
  }
};

if (refreshButton) {
  refreshButton.dataset.defaultLabel = refreshButton.textContent?.trim() || 'Recheck';
  setButtonState('idle', false);
}

if (consumeRefreshPending()) {
  setButtonState('done', true);
  window.setTimeout(() => {
    setButtonState('idle', false);
  }, SUCCESS_TIMEOUT_MS);
}

if (refreshForm instanceof HTMLFormElement && refreshButton instanceof HTMLButtonElement) {
  refreshForm.addEventListener('submit', (event) => {
    if (refreshButton.disabled) return;

    event.preventDefault();
    markRefreshPending();
    setButtonState('loading', true);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        HTMLFormElement.prototype.submit.call(refreshForm);
      });
    });
  });
}
