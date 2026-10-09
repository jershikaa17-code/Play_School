/* ==========================================================================
   PLAY SCHOOL — Planned maintenance page logic
   Standalone: this page is reached when the deployment architecture decides
   the app is in planned maintenance (e.g. a hosting-level redirect or a
   maintenance-status check elsewhere) — never inferred from navigator.onLine.
   ========================================================================== */
(function () {
  'use strict';

  const DEFAULT_MESSAGE =
    "We're making some improvements behind the scenes. Your data is safe, and everything will be back to normal shortly.";

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Integration point: a real deployment can pass maintenance details via
    // query params today (or swap this for a fetched maintenance-status
    // response) — missing/empty values fall back to calm, generic copy.
    const params = new URLSearchParams(window.location.search);
    const message = (params.get('message') || '').trim() || DEFAULT_MESSAGE;
    const eta = (params.get('eta') || '').trim();

    document.getElementById('maintenanceMessage').textContent = message;

    const meta = document.getElementById('maintenanceMeta');
    if (eta) {
      meta.textContent = `Expected back: ${eta}`;
      meta.hidden = false;
    }

    wireRetry();
  }

  function wireRetry() {
    const btn = document.getElementById('retryBtn');
    const label = document.getElementById('retryLabel');
    let isRetrying = false;

    btn.addEventListener('click', () => {
      if (isRetrying) return;
      isRetrying = true;
      btn.classList.add('is-loading');
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      label.textContent = 'Checking connection…';

      const restore = () => {
        isRetrying = false;
        btn.classList.remove('is-loading');
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        label.textContent = 'Retry connection';
      };

      // A deliberate short delay so the loading state reads as a real check
      // rather than an instant no-op, then re-request the current route.
      // Being online here only means the browser has a network path — it
      // does not mean the application server is back, so this never fakes
      // success; it simply re-asks the real endpoint via reload.
      window.setTimeout(() => {
        try {
          window.location.reload();
        } catch (e) {
          restore();
        }
      }, 700);
    });
  }
})();
