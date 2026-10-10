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
  const DEMO_ROLE_KEY = 'ps_demo_role';
  const DEMO_ROLES = ['Director', 'Admin', 'Teacher'];

  /** Demo role-switching — stands in for real multi-user auth. Pages that
      already role-gate via ?role= in the URL are untouched; this is the
      shared, persisted role source new pages (like the dashboard) read. */
  function getDemoRole() {
    try {
      const r = localStorage.getItem(DEMO_ROLE_KEY);
      return DEMO_ROLES.indexOf(r) !== -1 ? r : 'Admin';
    } catch (e) { return 'Admin'; }
  }
  function setDemoRole(role) {
    if (DEMO_ROLES.indexOf(role) === -1) return;
    try { localStorage.setItem(DEMO_ROLE_KEY, role); } catch (e) { /* storage unavailable */ }
    const roleEl = document.getElementById('appProfileRole');
    if (roleEl) roleEl.textContent = role;
    window.dispatchEvent(new CustomEvent('ps:rolechange', { detail: { role } }));
  }

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
  /** Adds a notification. `forRole` is informational only in this demo (no
      real multi-user auth). `module` is a modules.js catalogue id or null
      for general/system notifications. `mention` marks notifications
      addressed directly at the viewing role (vs. general activity).
      `recordRoute` is the real destination to open on click, or null if
      there isn't one yet. */
  function addNotification({ title, text, forRole, module, mention, recordRoute }) {
    const list = getNotifications();
    list.unshift({
      id: 'N-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title,
      text,
      forRole: forRole || 'Director',
      time: new Date().toISOString(),
      read: false,
      module: module || null,
      mention: !!mention,
      recordRoute: recordRoute || null,
    });
    saveNotifications(list);
    renderBell();
    return list[0];
  }
  function markAllNotificationsRead() {
    saveNotifications(getNotifications().map((n) => ({ ...n, read: true })));
    renderBell();
  }
  function markNotificationRead(id, read) {
    saveNotifications(getNotifications().map((n) => (n.id === id ? { ...n, read: read !== false } : n)));
    renderBell();
  }
  function markNotificationsRead(ids, read) {
    const idSet = new Set(ids);
    saveNotifications(getNotifications().map((n) => (idSet.has(n.id) ? { ...n, read: read !== false } : n)));
    renderBell();
  }
  function dismissNotification(id) {
    saveNotifications(getNotifications().filter((n) => n.id !== id));
    renderBell();
  }
  function deleteNotifications(ids) {
    const idSet = new Set(ids);
    saveNotifications(getNotifications().filter((n) => !idSet.has(n.id)));
    renderBell();
  }
  function getUnreadCount() {
    return getNotifications().filter((n) => !n.read).length;
  }
  /* ---------- shared toast utility ---------- */
  const TOAST_ICONS = { success: '&#10003;', error: '&#9888;', warning: '&#9888;', info: '&#9432;' };
  function toast(type, title, text) {
    const region = document.getElementById('appToastRegion');
    if (!region) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <span class="toast__icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
      <span><div class="toast__title"></div>${text ? '<div class="toast__text"></div>' : ''}</span>
      <span class="toast__close" role="button" tabindex="0" aria-label="Dismiss notification">&times;</span>
    `;
    el.querySelector('.toast__title').textContent = title;
    if (text) el.querySelector('.toast__text').textContent = text;
    region.appendChild(el);
    const remove = () => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 220); };
    const timer = setTimeout(remove, 5000);
    const closeBtn = el.querySelector('.toast__close');
    closeBtn.addEventListener('click', () => { clearTimeout(timer); remove(); });
    closeBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clearTimeout(timer); remove(); } });
  }

  /* ---------- connectivity banner (offline / back-online) ---------- */
  const WIFI_OFF_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>';
  const WIFI_ON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  let connectivityWired = false;
  let connectivityState = null; // 'offline' | 'online' | null
  let backOnlineTimer = null;
  let wasOffline = false;

  function offlineMessage() {
    return window.innerWidth < 768
      ? 'Offline — changes saved on device'
      : "You're offline. Changes will be saved on this device.";
  }

  function setConnectivityBanner(state, text) {
    const banner = document.getElementById('connectivityBanner');
    if (!banner) return;
    connectivityState = state;
    banner.classList.remove('connectivity-banner--offline', 'connectivity-banner--online');
    if (!state) {
      banner.classList.remove('is-visible');
      return;
    }
    banner.classList.add('connectivity-banner--' + state, 'is-visible');
    document.getElementById('connectivityBannerIcon').innerHTML = state === 'offline' ? WIFI_OFF_ICON : WIFI_ON_ICON;
    document.getElementById('connectivityBannerText').textContent = text;
  }

  function wireConnectivity() {
    if (connectivityWired) return;
    connectivityWired = true;

    if (!navigator.onLine) {
      wasOffline = true;
      setConnectivityBanner('offline', offlineMessage());
    }

    window.addEventListener('offline', () => {
      if (backOnlineTimer) { clearTimeout(backOnlineTimer); backOnlineTimer = null; }
      wasOffline = true;
      setConnectivityBanner('offline', offlineMessage());
    });

    window.addEventListener('online', () => {
      if (!wasOffline) return;
      wasOffline = false;
      setConnectivityBanner('online', 'Back online');
      backOnlineTimer = setTimeout(() => {
        setConnectivityBanner(null);
        backOnlineTimer = null;
      }, 3200);
    });

    window.addEventListener('resize', () => {
      if (connectivityState === 'offline') setConnectivityBanner('offline', offlineMessage());
    });
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

  /* Fallback used only if modules.js wasn't loaded on a page — keeps the
     sidebar working, just without module lock state. */
  const FALLBACK_NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
    { id: 'classrooms', label: 'Classrooms', href: 'dashboard.html#classrooms' },
    { id: 'children', label: 'Children', href: 'children.html' },
    { id: 'families', label: 'Families', href: 'families.html' },
    { id: 'staff', label: 'Staff', href: 'dashboard.html#staff' },
    { id: 'billing', label: 'Billing', href: 'payroll.html' },
    { id: 'calendar', label: 'Calendar', href: 'calendar.html' },
    { id: 'care-log', label: 'Daily Care Log', href: 'care-log.html' },
  ];

  function resolveNavItems() {
    if (!window.PlayModules) return FALLBACK_NAV_ITEMS;
    const plan = window.PlayModules.getCurrentPlan();
    return window.PlayModules.MODULES.map((m) => ({
      id: m.id,
      label: m.navLabel,
      href: m.href,
      locked: !window.PlayModules.isUnlocked(m, plan),
    }));
  }

  function shellMarkup(activeId, title) {
    const links = resolveNavItems().map((item) => `
      <a class="app-sidebar__link${item.id === activeId ? ' is-active' : ''}${item.locked ? ' is-locked' : ''}" href="${item.href}">
        <span class="app-sidebar__link-label">${item.label}</span>
        ${item.locked ? `<span class="app-sidebar__link-lock" aria-label="Locked — requires a plan upgrade" title="Locked — requires a plan upgrade">${window.PlayModules.LOCK_ICON}</span>` : ''}
      </a>`).join('');
    return `
      <div class="app-shell">
        <div class="drawer-backdrop" id="appSidebarBackdrop"></div>
        <aside class="app-sidebar" id="appSidebar">
          <a class="app-sidebar__brand" href="dashboard.html">
            <span class="brand__mark"><img src="logo.png" alt="" class="brand__mark-img" /></span>
            <span class="brand__name">Play <span>School</span></span>
          </a>
          <nav class="app-sidebar__nav" aria-label="Primary">${links}</nav>
          <div class="popover app-sidebar__footer-popover" id="appProfileMenu">
            <button class="app-sidebar__footer" id="appProfileTrigger" type="button" aria-haspopup="true" aria-expanded="false">
              <span class="avatar avatar--sm">N<span class="avatar__status avatar__status--online"></span></span>
              <div>
                <div class="avatar-meta__name">Nithya</div>
                <div class="avatar-meta__role" id="appProfileRole">${getDemoRole()}</div>
              </div>
            </button>
            <div class="popover__panel app-sidebar__footer-panel" role="menu" aria-label="Switch demo role">
              <div class="app-sidebar__footer-panel-label">Demo role</div>
              ${DEMO_ROLES.map((r) => `<button class="popover__item" type="button" data-role="${r}" role="menuitem">${r}</button>`).join('')}
            </div>
          </div>
        </aside>
        <div class="app-main">
          <div class="connectivity-banner" id="connectivityBanner" role="status" aria-live="polite">
            <span class="connectivity-banner__icon" id="connectivityBannerIcon" aria-hidden="true"></span>
            <span class="connectivity-banner__text" id="connectivityBannerText"></span>
          </div>
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
      <div class="toast-region" id="appToastRegion" aria-live="polite"></div>
    `;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    } else {
      listEl.innerHTML = list
        .slice(0, 10)
        .map(
          (n) => `
          <div class="notif-item${n.read ? '' : ' is-unread'}" data-id="${n.id}" style="padding: var(--space-3) var(--space-4); cursor: pointer;" tabindex="0" role="button">
            <span class="notif-item__icon notif-item__icon--info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="15" height="15"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </span>
            <span class="notif-item__body">
              <span class="notif-item__title">${escapeHtml(n.title)}</span>
              <span class="notif-item__text">${escapeHtml(n.text)}</span>
              <span class="notif-item__time">${timeAgo(n.time)}</span>
            </span>
            <span class="notif-item__dismiss" role="button" tabindex="0" aria-label="Dismiss">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </span>
          </div>`
        )
        .join('');
    }
    listEl.innerHTML += `<a href="notifications.html" class="popover__item" style="justify-content:center; border-top:1px solid var(--color-border-subtle); border-radius:0; font-weight:700;">View all</a>`;

    listEl.querySelectorAll('.notif-item').forEach((row) => {
      const id = row.dataset.id;
      const openRow = (e) => {
        if (e.target.closest('.notif-item__dismiss')) return;
        const n = getNotifications().find((x) => x.id === id);
        if (!n) return;
        markNotificationRead(id, true);
        if (n.recordRoute) window.location.href = n.recordRoute;
      };
      row.addEventListener('click', openRow);
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRow(e); } });
    });
    listEl.querySelectorAll('.notif-item__dismiss').forEach((btn) => {
      const dismiss = (e) => { e.stopPropagation(); dismissNotification(btn.closest('.notif-item').dataset.id); };
      btn.addEventListener('click', dismiss);
      btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dismiss(e); } });
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
    wireConnectivity();
    wireProfileMenu();

    return document.getElementById('appContent');
  }

  function wireProfileMenu() {
    const wrap = document.getElementById('appProfileMenu');
    if (!wrap) return;
    const trigger = document.getElementById('appProfileTrigger');
    const close = () => { wrap.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); };
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !wrap.classList.contains('is-open');
      wrap.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    });
    wrap.querySelectorAll('[data-role]').forEach((btn) => {
      btn.addEventListener('click', () => { setDemoRole(btn.dataset.role); close(); });
    });
    document.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  window.PlayShell = {
    isLoggedIn, login, logout, mount, toast, getDemoRole, setDemoRole,
    addNotification, getNotifications, markAllNotificationsRead,
    markNotificationRead, markNotificationsRead, dismissNotification,
    deleteNotifications, getUnreadCount,
  };
})();
