/**
 * Initializes the public nav popover for Admin rail mode.
 * Public pages bail out quickly via a double check on the Admin body class
 * and the rail DOM.
 */
export function initPublicNavPopover() {
  if (!document.body.classList.contains('admin-page')) return;

  const details = document.querySelector<HTMLDetailsElement>('.sidebar .public-nav-group');
  if (!details) return;

  const summary = details.querySelector<HTMLElement>('summary');

  document.addEventListener('click', (event) => {
    if (!details.open) return;

    const target = event.target;
    if (!(target instanceof Node)) return;
    if (details.contains(target)) return;

    details.open = false;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !details.open) return;

    event.preventDefault();
    details.open = false;
    summary?.focus();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPublicNavPopover, { once: true });
} else {
  initPublicNavPopover();
}
