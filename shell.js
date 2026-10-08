/* ==========================================================================
   PLAY SCHOOL — shared application shell (sidebar + header)
   Single source of truth so every page mounts the SAME shell instead of
   hand-rolling its own copy. Auth is a localStorage flag — there is no
   backend in this static project.
   ========================================================================== */
(function () {
  'use strict';

  const AUTH_KEY = 'ps_auth';
  const NOTIFS_KEY = 'ps_notifications';

  function isLoggedIn() {
    try { return localStorage.getItem(AUTH_KEY) === '1'; } catch (e) { return false; }
  }
  function login() {
    try { localStorage.setItem(AUTH_KEY, '1'); } catch (e) { /* storage unavailable */ }
  }
  function logout() {
    try { localStorage.removeItem(AUTH_KEY); } catch (e) { /* storage unavailable */ }
    window.location.href = 'index.html';
  }

  /* ---------- shared notification store (localStorage) ---------- */
  function getNotifications() {
    try { return JSON.parse(localStorage.getItem(NOTIFS_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveNotifications(list) {
    try { localStorage.setItem(NOTIFS_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
  }
  /** Adds a notification. `forRole` is informational only in this demo (no real multi-user auth). */
  function addNotification({ title, text, forRole }) {
    const list = getNotifications();
    list.unshift({
      id: 'N-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title,
      text,
      forRole: forRole || 'Director',
      time: new Date().toISOString(),
      read: false,
    });
    saveNotifications(list);
    renderBell();
    return list[0];
  }
  function markAllNotificationsRead() {
    saveNotifications(getNotifications().map((n) => ({ ...n, read: true })));
    renderBell();
  }
  function dismissNotification(id) {
    saveNotifications(getNotifications().filter((n) => n.id !== id));
    renderBell();
  }
  function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.round(hrs / 24) + 'd ago';
  }

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
    { id: 'classrooms', label: 'Classrooms', href: 'dashboard.html#classrooms' },
    { id: 'children', label: 'Children', href: 'dashboard.html#children' },
    { id: 'staff', label: 'Staff', href: 'dashboard.html#staff' },
    { id: 'billing', label: 'Billing', href: 'payroll.html' },
  ];

  function shellMarkup(activeId, title) {
    const links = NAV_ITEMS.map(
      (item) => `<a class="app-sidebar__link${item.id === activeId ? ' is-active' : ''}" href="${item.href}">${item.label}</a>`
    ).join('');
    return `
      <div class="app-shell">
        <div class="drawer-backdrop" id="appSidebarBackdrop"></div>
        <aside class="app-sidebar" id="appSidebar">
          <a class="app-sidebar__brand" href="dashboard.html">
            <span class="brand__mark"><img src="logo.png" alt="" class="brand__mark-img" /></span>
            <span class="brand__name">Play <span>School</span></span>
          </a>
          <nav class="app-sidebar__nav" aria-label="Primary">${links}</nav>
          <div class="app-sidebar__footer">
            <span class="avatar avatar--sm">N<span class="avatar__status avatar__status--online"></span></span>
            <div>
              <div class="avatar-meta__name">Nithya</div>
              <div class="avatar-meta__role">Admin</div>
            </div>
          </div>
        </aside>
        <div class="app-main">
          <header class="app-header">
            <button class="app-header__toggle" id="appSidebarToggle" aria-label="Open navigation" aria-expanded="false" type="button">
              <span class="nav-toggle__bars"><span></span><span></span><span></span></span>
            </button>
            <div class="app-header__title">${title}</div>
            <div class="app-header__actions">
              <div class="popover app-bell" id="appBell">
                <button class="btn btn--icon" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Notifications">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="17" height="17"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span class="app-bell__badge" id="appBellBadge" hidden>0</span>
                </button>
                <div class="popover__panel app-bell__panel" role="menu" aria-label="Notifications">
                  <div class="notif-panel__head" style="padding: var(--space-3) var(--space-4);">
                    <span class="sample--body-sm" style="font-weight:700;">Notifications</span>
                    <button class="btn btn--text" type="button" id="appBellMarkAll" style="font-size: var(--fs-caption);">Mark all read</button>
                  </div>
                  <div id="appBellList"></div>
                </div>
              </div>
              <button class="btn btn--ghost btn--sm" id="appLogoutBtn" type="button">Log out</button>
            </div>
          </header>
          <main class="app-content" id="appContent"></main>
        </div>
      </div>
    `;
  }

  function renderBell() {
    const list = getNotifications();
    const badge = document.getElementById('appBellBadge');
    const listEl = document.getElementById('appBellList');
    if (!badge || !listEl) return;
    const unread = list.filter((n) => !n.read).length;
    if (unread > 0) { badge.hidden = false; badge.textContent = String(unread); }
    else { badge.hidden = true; }

    if (!list.length) {
      listEl.innerHTML = '<div class="search-dropdown__empty">No notifications yet.</div>';
      return;
    }
    listEl.innerHTML = list
      .slice(0, 8)
      .map(
        (n) => `
        <div class="notif-item${n.read ? '' : ' is-unread'}" data-id="${n.id}" style="padding: var(--space-3) var(--space-4);">
          <span class="notif-item__icon notif-item__icon--info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="15" height="15"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </span>
          <span class="notif-item__body">
            <span class="notif-item__title">${n.title}</span>
            <span class="notif-item__text">${n.text}</span>
            <span class="notif-item__time">${timeAgo(n.time)}</span>
          </span>
          <span class="notif-item__dismiss" role="button" tabindex="0" aria-label="Dismiss">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </span>
        </div>`
      )
      .join('');
    listEl.querySelectorAll('.notif-item__dismiss').forEach((btn) => {
      const dismiss = () => dismissNotification(btn.closest('.notif-item').dataset.id);
      btn.addEventListener('click', dismiss);
      btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dismiss(); } });
    });
  }

  function wireBell() {
    const bell = document.getElementById('appBell');
    if (!bell) return;
    const trigger = bell.querySelector('button.btn--icon');
    renderBell();
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !bell.classList.contains('is-open');
      bell.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    });
    document.addEventListener('click', () => { bell.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { bell.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); } });
    const markAll = document.getElementById('appBellMarkAll');
    if (markAll) markAll.addEventListener('click', (e) => { e.stopPropagation(); markAllNotificationsRead(); });
  }

  /** Mounts the shared shell at the start of <body> and returns the #appContent node to populate. */
  function mount(activeId, title) {
    document.body.insertAdjacentHTML('afterbegin', shellMarkup(activeId, title || ''));
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('appSidebarBackdrop');
    const toggle = document.getElementById('appSidebarToggle');

    const openSidebar = () => {
      sidebar.classList.add('is-open');
      backdrop.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    };
    const closeSidebar = () => {
      sidebar.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.addEventListener('click', () => (sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar()));
    backdrop.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });

    const logoutBtn = document.getElementById('appLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    wireBell();

    return document.getElementById('appContent');
  }

  window.PlayShell = { isLoggedIn, login, logout, mount, addNotification, getNotifications, markAllNotificationsRead };
})();
