/* ==========================================================================
   PLAY SCHOOL — shared application shell (sidebar + header)
   Single source of truth so every page mounts the SAME shell instead of
   hand-rolling its own copy. Auth is a localStorage flag — there is no
   backend in this static project.
   ========================================================================== */
(function () {
  'use strict';

  const AUTH_KEY = 'ps_auth';

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

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
    { id: 'classrooms', label: 'Classrooms', href: 'dashboard.html#classrooms' },
    { id: 'children', label: 'Children', href: 'dashboard.html#children' },
    { id: 'staff', label: 'Staff', href: 'dashboard.html#staff' },
    { id: 'billing', label: 'Billing', href: 'dashboard.html#billing' },
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
              <button class="btn btn--ghost btn--sm" id="appLogoutBtn" type="button">Log out</button>
            </div>
          </header>
          <main class="app-content" id="appContent"></main>
        </div>
      </div>
    `;
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

    return document.getElementById('appContent');
  }

  window.PlayShell = { isLoggedIn, login, logout, mount };
})();
