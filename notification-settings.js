/* ==========================================================================
   PLAY SCHOOL — Notification settings (S63)
   Reuses PlayStore.getSettings()/saveSettings() — no separate preferences
   store. Controls which module activity creates a notification.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const PREF_ITEMS = [
    { key: 'general', label: 'General activity', hint: 'Access requests, plan changes, and other account activity.' },
    { key: 'billing', label: 'Billing', hint: 'Payments and outstanding fees.' },
    { key: 'attendance', label: 'Attendance & Check-in', hint: 'Daily attendance changes.' },
    { key: 'health-safety', label: 'Health, Safety & Safeguarding', hint: 'Logged incidents.' },
    { key: 'communication', label: 'Parent Communication Hub', hint: 'New announcements.' },
  ];

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    window.PlayShell.login();
    const appContent = window.PlayShell.mount('', 'Notification settings');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    appContent.appendChild(pageContent);

    const prefs = Object.assign({}, defaultPrefs(), window.PlayStore.getSettings().notificationPrefs || {});
    $('prefsList').innerHTML = PREF_ITEMS.map((item) => `
      <div style="display:flex; align-items:center; justify-content:space-between; gap: var(--space-4); padding-bottom: var(--space-4); border-bottom: 1px solid var(--color-border-subtle);">
        <div>
          <div style="font-weight:600; font-size: var(--fs-body-sm);">${escapeHtml(item.label)}</div>
          <div style="font-size: var(--fs-caption); color: var(--color-text-muted); margin-top:2px;">${escapeHtml(item.hint)}</div>
        </div>
        <span class="toggle">
          <input type="checkbox" id="pref-${item.key}" ${prefs[item.key] !== false ? 'checked' : ''} />
          <span class="toggle__track"><span class="toggle__thumb"></span></span>
        </span>
      </div>`).join('');

    $('prefsSaveBtn').addEventListener('click', () => {
      const next = {};
      PREF_ITEMS.forEach((item) => { next[item.key] = $('pref-' + item.key).checked; });
      window.PlayStore.saveSettings({ notificationPrefs: next });
      window.PlayShell.toast('success', 'Preferences saved', 'Your notification settings have been updated.');
    });
  }

  function defaultPrefs() {
    const d = {};
    PREF_ITEMS.forEach((item) => { d[item.key] = true; });
    return d;
  }
})();
