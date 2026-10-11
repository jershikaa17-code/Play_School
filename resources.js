/* ==========================================================================
   PLAY SCHOOL — Rooms, Materials, Library & Inventory (S28)
   Reuses: store.js (Resource — the SAME records Class Workspace's Room &
   Resources tab (S24) reads/writes, just with curriculumArea/condition/
   lastChecked added; Room/RoomBooking/Book/BookLoan/InventoryItem are new
   types this page owns), modules.js, shell.js (notifications/toasts).

   INTEGRATION NOTES:
   - Room booking clash checks run against the real RoomBooking records for
     that room+date — two bookings clash when startA < endB && startB < endA
     (back-to-back bookings that only touch at the boundary are allowed).
   - A material's `condition` transition to 'Needs repair' only notifies the
     admin (forRole: 'Director') when the PREVIOUS condition wasn't already
     'Needs repair' — editing other fields or re-saving the same condition
     never re-fires it. The "repair list" is a live filter over Resource
     records, not a separate duplicated list.
   - Book availability is always computed as totalCopies minus active
     (unreturned) BookLoan records — never stored — so it can't drift from
     the loan records themselves. No cover-image pipeline exists in this
     project, so every book uses an honest placeholder icon.
   - Inventory status (OK/LOW/OUT) is always computed from quantity vs
     reorderLevel, never stored. A low-stock notification only fires on the
     OK → LOW/OUT transition (same duplicate-guard pattern as materials);
     adjustments are logged as InventoryAdjustment records — a frontend-only
     audit trail, the same honest limitation as record.js's passcode-reveal
     audit (no tamper-resistant backend exists in this static project).
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function initials(name) { const p = String(name || '').trim().split(/\s+/); return p[0] ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '?'; }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function addDaysISO(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function formatTime12(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + pad2(m) + ' ' + period;
  }
  function formatDateLong(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }); }
  function formatDateShort(iso) { if (!iso) return '—'; return new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); }
  function toMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
  function currentStaff() { return { id: 'S-3001', name: 'Nithya' }; }

  const ICON = {
    door: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><circle cx="14" cy="12" r="1"/></svg>',
    wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 16-9 5-9-5V8l9-5 9 5Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polyline points="15 18 9 12 15 6"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polyline points="9 18 15 12 9 6"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  };

  const CURRICULUM_AREAS = [
    { key: 'practical-life', label: 'Practical Life', color: '--color-primary' },
    { key: 'sensorial', label: 'Sensorial', color: '--color-secondary' },
    { key: 'language', label: 'Language', color: '--color-brand-blue' },
    { key: 'mathematics', label: 'Maths', color: '--color-success' },
    { key: 'culture', label: 'Culture', color: '--color-primary-soft' },
  ];
  function areaMeta(key) { return CURRICULUM_AREAS.find((a) => a.key === key) || { key, label: key, color: '--color-text-muted' }; }
  const CONDITIONS = ['Good', 'Needs repair', 'Missing pieces'];

  let role = null;
  let activeTab = 'rooms';
  let bookingDate = todayISO();
  let materialsSearch = '';
  let materialsAreaFilter = new Set();
  let materialsConditionFilter = new Set();
  let librarySearch = '';
  let libraryFilter = 'all';
  let inventorySearch = '';
  let inventoryStatusFilter = new Set();
  let pendingBookingRoomId = null;
  let editingResourceId = null;
  let pendingLendBookId = null;
  let pendingReturnLoanId = null;
  let editingInventoryId = null;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', (e) => { role = e.detail.role; render(); });

  function init() {
    window.PlayShell.login();
    role = window.PlayShell.getDemoRole();
    window.PlayShell.mount('resources', 'Rooms & Resources');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    wireHeader();
    wireTabs();
    wireBookingModal();
    wireConditionModal();
    wireLendModal();
    wireAdjustModal();

    window.setTimeout(() => { $('rsSkeleton').hidden = true; $('rsBody').hidden = false; render(); }, 380);
  }

  function hasRole(roles) { return roles.indexOf(role) !== -1; }

  /* ---------- shared data helpers ---------- */
  function allResources() { return window.PlayStore.getByType('Resource'); }
  function allRooms() { return window.PlayStore.getByType('Room'); }
  function allBookings() { return window.PlayStore.getByType('RoomBooking'); }
  function allBooks() { return window.PlayStore.getByType('Book'); }
  function allLoans() { return window.PlayStore.getByType('BookLoan'); }
  function activeLoansFor(bookId) { return allLoans().filter((l) => l.bookId === bookId && !l.returnedAt); }
  function availableCopies(book) { return book.totalCopies - activeLoansFor(book.id).length; }
  function allInventory() { return window.PlayStore.getByType('InventoryItem'); }
  function inventoryStatus(item) { if (item.quantity <= 0) return 'OUT'; if (item.quantity <= item.reorderLevel) return 'LOW'; return 'OK'; }
  function classById(id) { return id ? window.PlayStore.getById(id) : null; }

  /* ---------- render orchestration ---------- */
  function render() {
    renderSummary();
    renderTabPanel();
  }
  function renderSummary() {
    const rooms = allRooms();
    const needsAttention = allResources().filter((r) => r.condition && r.condition !== 'Good').length;
    const onLoan = allLoans().filter((l) => !l.returnedAt).length;
    const lowStock = allInventory().filter((i) => inventoryStatus(i) !== 'OK').length;
    $('rsSummary').innerHTML = [
      { icon: ICON.door, value: rooms.length, label: 'Total rooms' },
      { icon: ICON.wrench, value: needsAttention, label: 'Materials needing attention' },
      { icon: ICON.book, value: onLoan, label: 'Books on loan' },
      { icon: ICON.box, value: lowStock, label: 'Items needing replenishment' },
    ].map((s) => `
      <div class="rs-summary-card">
        <span class="rs-summary-card__icon">${s.icon}</span>
        <div><div class="rs-summary-card__value">${s.value}</div><div class="rs-summary-card__label">${escapeHtml(s.label)}</div></div>
      </div>`).join('');
  }

  const TABS = [
    { key: 'rooms', label: 'Rooms' },
    { key: 'materials', label: 'Materials' },
    { key: 'library', label: 'Library' },
    { key: 'inventory', label: 'Inventory' },
  ];
  function wireTabs() {
    $('rsTabs').innerHTML = TABS.map((t) => `<button class="rs-tab" type="button" data-tab="${t.key}" role="tab" aria-selected="${t.key === activeTab}">${escapeHtml(t.label)}</button>`).join('');
    $('rsTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (!btn) return;
      activeTab = btn.dataset.tab;
      render();
    });
  }
  function wireHeader() {
    $('rsHeaderActionBtn').addEventListener('click', () => {
      if (activeTab === 'rooms') openBookingModal(null);
      else if (activeTab === 'library') openLendModal(null);
      else if (activeTab === 'inventory') openAdjustModal(null);
    });
    $('rsSearch').addEventListener('input', () => {
      const v = $('rsSearch').value;
      if (activeTab === 'materials') materialsSearch = v;
      else if (activeTab === 'library') librarySearch = v;
      else if (activeTab === 'inventory') inventorySearch = v;
      renderTabPanel();
    });
  }

  function renderTabPanel() {
    $('rsTabs').querySelectorAll('[data-tab]').forEach((btn) => btn.setAttribute('aria-selected', String(btn.dataset.tab === activeTab)));
    const headerBtn = $('rsHeaderActionBtn');
    const searchWrap = $('rsSearchWrap');
    if (activeTab === 'rooms') { headerBtn.hidden = false; headerBtn.innerHTML = `${ICON.plus}<span>&nbsp;Book room</span>`; searchWrap.hidden = true; }
    else if (activeTab === 'materials') { headerBtn.hidden = true; searchWrap.hidden = false; $('rsSearch').placeholder = 'Search materials…'; $('rsSearch').value = materialsSearch; }
    else if (activeTab === 'library') { headerBtn.hidden = false; headerBtn.innerHTML = `${ICON.plus}<span>&nbsp;Lend book</span>`; searchWrap.hidden = false; $('rsSearch').placeholder = 'Search books or authors…'; $('rsSearch').value = librarySearch; }
    else { headerBtn.hidden = false; headerBtn.innerHTML = `${ICON.plus}<span>&nbsp;Adjust stock</span>`; searchWrap.hidden = false; $('rsSearch').placeholder = 'Search inventory…'; $('rsSearch').value = inventorySearch; }

    const panel = $('rsTabPanel');
    panel.classList.remove('rs-tab-panel--in');
    if (activeTab === 'rooms') panel.innerHTML = roomsTabHtml();
    else if (activeTab === 'materials') panel.innerHTML = materialsTabHtml();
    else if (activeTab === 'library') panel.innerHTML = libraryTabHtml();
    else panel.innerHTML = inventoryTabHtml();
    requestAnimationFrame(() => panel.classList.add('rs-tab-panel--in'));
    wirePanelEvents();
  }

  /* ========================================================================
     TAB 1 — ROOMS
     ======================================================================== */
  function bookingsFor(roomId, date) { return allBookings().filter((b) => b.roomId === roomId && b.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime)); }
  function roomCardHtml(room) {
    const cls = classById(room.classId);
    const todaysBookings = bookingsFor(room.id, todayISO());
    const nowMin = (() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); })();
    const occupiedNow = todaysBookings.some((b) => toMinutes(b.startTime) <= nowMin && nowMin < toMinutes(b.endTime));
    return `
      <article class="rs-room-card">
        <div class="rs-room-card__head">
          <div>
            <h3 class="rs-room-card__name">${escapeHtml(room.name)}</h3>
            <div class="rs-room-card__type">${escapeHtml(room.roomType)}</div>
          </div>
          <span class="rs-availability-chip rs-availability-chip--${occupiedNow ? 'busy' : 'free'}">${occupiedNow ? 'Occupied now' : 'Available now'}</span>
        </div>
        <div class="rs-room-card__row">${ICON.door}<span>${escapeHtml(room.location)}</span></div>
        <div class="rs-room-card__row">${ICON.users}<span>Capacity ${room.capacity}</span></div>
        ${cls ? `<div class="rs-room-card__row">${ICON.check}<span>Home room of ${escapeHtml(cls.name)}</span></div>` : ''}
        <div class="rs-room-card__footer">
          <span>${todaysBookings.length} booking${todaysBookings.length === 1 ? '' : 's'} today</span>
          <button class="btn btn--secondary btn--sm" type="button" data-book-room="${room.id}">Book room</button>
        </div>
      </article>`;
  }
  const TRACK_START = 7 * 60, TRACK_END = 18 * 60, TRACK_SPAN = TRACK_END - TRACK_START;
  function timelineRowHtml(room) {
    const bookings = bookingsFor(room.id, bookingDate);
    const blocks = bookings.map((b) => {
      const start = Math.max(toMinutes(b.startTime), TRACK_START);
      const end = Math.min(toMinutes(b.endTime), TRACK_END);
      const left = ((start - TRACK_START) / TRACK_SPAN) * 100;
      const width = Math.max(((end - start) / TRACK_SPAN) * 100, 1.5);
      const who = b.classId ? (classById(b.classId) || {}).name : (b.staffId ? 'Staff' : '');
      return `<div class="rs-timeline-block" style="left:${left}%; width:${width}%;" title="${escapeHtml(b.title)} · ${formatTime12(b.startTime)}–${formatTime12(b.endTime)}${who ? ' · ' + escapeHtml(who) : ''}">
        <span class="rs-timeline-block__title">${escapeHtml(b.title)}</span>
        <span class="rs-timeline-block__time">${formatTime12(b.startTime)}–${formatTime12(b.endTime)}</span>
      </div>`;
    }).join('');
    return `
      <div class="rs-timeline-row">
        <div class="rs-timeline-row__label">${escapeHtml(room.name)}</div>
        <div class="rs-timeline-row__track">${blocks || '<span class="rs-timeline-row__empty">No bookings</span>'}</div>
      </div>`;
  }
  function roomsTabHtml() {
    const rooms = allRooms();
    if (!rooms.length) {
      return `<div class="state-panel"><div class="state-panel__icon">${ICON.door}</div><div class="state-panel__title">No rooms configured</div><p class="state-panel__text">Rooms will appear here once they're added.</p></div>`;
    }
    const cards = `<div class="rs-room-grid">${rooms.map(roomCardHtml).join('')}</div>`;
    const hourLabels = [8, 10, 12, 14, 16, 18].map((h) => `<span style="left:${((h * 60 - TRACK_START) / TRACK_SPAN) * 100}%;">${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? 'PM' : 'AM'}</span>`).join('');
    const timeline = `
      <div class="rs-timeline-card">
        <div class="rs-timeline-card__head">
          <h3 class="ws-panel-title">Day booking timeline</h3>
          <div class="rs-date-nav">
            <button class="btn btn--icon" type="button" id="rsPrevDate" aria-label="Previous day">${ICON.chevronLeft}</button>
            <span class="rs-date-nav__label">${formatDateLong(bookingDate)}</span>
            <button class="btn btn--icon" type="button" id="rsNextDate" aria-label="Next day">${ICON.chevronRight}</button>
            <button class="btn btn--secondary btn--sm" type="button" id="rsTodayDate">Today</button>
          </div>
        </div>
        <div class="rs-timeline-hours">${hourLabels}</div>
        ${rooms.map(timelineRowHtml).join('')}
      </div>`;
    return `<h2 class="ws-panel-title" style="margin-bottom: var(--space-4);">Rooms</h2>${cards}${timeline}`;
  }

  /* ========================================================================
     TAB 2 — MATERIALS
     ======================================================================== */
  function conditionChipHtml(condition) {
    const cls = condition === 'Good' ? 'ok' : (condition === 'Needs repair' ? 'warn' : 'danger');
    const icon = condition === 'Good' ? ICON.check : ICON.alert;
    return `<span class="rs-condition-chip rs-condition-chip--${cls}">${icon}${escapeHtml(condition)}</span>`;
  }
  function filteredMaterials() {
    const q = materialsSearch.trim().toLowerCase();
    return allResources().filter((r) => {
      if (!r.curriculumArea) return false;
      if (materialsAreaFilter.size && !materialsAreaFilter.has(r.curriculumArea)) return false;
      if (materialsConditionFilter.size && !materialsConditionFilter.has(r.condition)) return false;
      if (!q) return true;
      return r.name.toLowerCase().indexOf(q) !== -1;
    });
  }
  function materialRowHtml(r) {
    const cls = classById(r.classId);
    return `
      <tr data-material-row="${r.id}">
        <td class="cell-primary">${escapeHtml(r.name)}</td>
        <td><span class="pl-area-chip is-active" style="--area-color: var(${areaMeta(r.curriculumArea).color});">${escapeHtml(areaMeta(r.curriculumArea).label)}</span></td>
        <td class="cell-muted">${cls ? escapeHtml(cls.name) : '—'}</td>
        <td>${conditionChipHtml(r.condition)}</td>
        <td class="cell-muted">${formatDateShort(r.lastChecked)}</td>
        <td><button class="btn btn--secondary btn--sm" type="button" data-update-condition="${r.id}">Update condition</button></td>
      </tr>`;
  }
  function materialCardHtml(r) {
    const cls = classById(r.classId);
    return `
      <div class="table-card__item" data-material-row="${r.id}">
        <div class="table-card__head"><span class="cell-primary">${escapeHtml(r.name)}</span>${conditionChipHtml(r.condition)}</div>
        <div class="table-card__row"><span class="table-card__label">Area</span><span class="table-card__value"><span class="pl-area-chip is-active" style="--area-color: var(${areaMeta(r.curriculumArea).color});">${escapeHtml(areaMeta(r.curriculumArea).label)}</span></span></div>
        <div class="table-card__row"><span class="table-card__label">Class</span><span class="table-card__value">${cls ? escapeHtml(cls.name) : '—'}</span></div>
        <div class="table-card__row"><span class="table-card__label">Last checked</span><span class="table-card__value">${formatDateShort(r.lastChecked)}</span></div>
        <button class="btn btn--secondary btn--sm" type="button" style="margin-top: var(--space-3); width:100%; justify-content:center;" data-update-condition="${r.id}">Update condition</button>
      </div>`;
  }
  function materialsTabHtml() {
    const materials = filteredMaterials();
    const repairList = allResources().filter((r) => r.curriculumArea && r.condition && r.condition !== 'Good');
    const filters = `
      <div class="rs-filter-row">
        <span class="rs-filter-row__label">Area:</span>
        ${CURRICULUM_AREAS.map((a) => `<button class="pl-area-chip${materialsAreaFilter.has(a.key) ? ' is-active' : ''}" type="button" data-area-filter="${a.key}" style="--area-color: var(${a.color});">${escapeHtml(a.label)}</button>`).join('')}
        <span class="rs-filter-row__label" style="margin-left: var(--space-3);">Condition:</span>
        ${CONDITIONS.map((c) => `<button class="rs-cond-filter${materialsConditionFilter.has(c) ? ' is-active' : ''}" type="button" data-condition-filter="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}
      </div>`;
    const repairPanel = `
      <div class="rs-repair-panel${repairList.length ? '' : ' is-empty'}">
        <span class="rs-repair-panel__icon">${repairList.length ? ICON.wrench : ICON.check}</span>
        <div>
          <div class="rs-repair-panel__title">${repairList.length ? repairList.length + ' ' + (repairList.length === 1 ? 'item needs' : 'items need') + ' attention' : 'No repair requests'}</div>
          ${repairList.length ? `<div class="rs-repair-panel__list">${repairList.map((r) => escapeHtml(r.name) + ' (' + escapeHtml(r.condition) + ')').join(' · ')}</div>` : `<div class="rs-repair-panel__list">All materials are in good condition.</div>`}
        </div>
      </div>`;
    if (!allResources().some((r) => r.curriculumArea)) {
      return filters + repairPanel + `<div class="state-panel"><div class="state-panel__icon">${ICON.inbox}</div><div class="state-panel__title">No materials found</div><p class="state-panel__text">No curriculum materials have been catalogued yet.</p></div>`;
    }
    if (!materials.length) {
      return filters + repairPanel + `<div class="state-panel"><div class="state-panel__icon">${ICON.search}</div><div class="state-panel__title">No materials match</div><p class="state-panel__text">Try a different search or filter.</p></div>`;
    }
    const groups = CURRICULUM_AREAS.map((area) => {
      const items = materials.filter((r) => r.curriculumArea === area.key);
      if (!items.length) return '';
      return `
        <section class="rs-material-group">
          <h3 class="rs-material-group__title" style="--area-color: var(${area.color});">${escapeHtml(area.label)}</h3>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Material</th><th>Area</th><th>Class</th><th>Condition</th><th>Last checked</th><th></th></tr></thead>
              <tbody>${items.map(materialRowHtml).join('')}</tbody>
            </table>
            <div class="table-card">${items.map(materialCardHtml).join('')}</div>
          </div>
        </section>`;
    }).join('');
    return filters + repairPanel + groups;
  }

  /* ========================================================================
     TAB 3 — LIBRARY
     ======================================================================== */
  function loanStatusOf(book) {
    const loans = activeLoansFor(book.id);
    if (!loans.length) return availableCopies(book) <= 0 ? 'fully-borrowed' : 'available';
    return loans.some((l) => l.dueDate < todayISO()) ? 'overdue' : 'on-loan';
  }
  function filteredBooks() {
    const q = librarySearch.trim().toLowerCase();
    return allBooks().filter((b) => {
      if (!q) return true;
      return (b.title + ' ' + (b.author || '')).toLowerCase().indexOf(q) !== -1;
    }).filter((b) => {
      if (libraryFilter === 'all') return true;
      if (libraryFilter === 'available') return availableCopies(b) > 0;
      if (libraryFilter === 'on-loan') return activeLoansFor(b.id).length > 0;
      if (libraryFilter === 'overdue') return activeLoansFor(b.id).some((l) => l.dueDate < todayISO());
      return true;
    });
  }
  function bookCardHtml(b) {
    const avail = availableCopies(b);
    const loans = activeLoansFor(b.id);
    const loansHtml = loans.length ? loans.map((l) => {
      const overdue = l.dueDate < todayISO();
      return `
        <div class="rs-loan-row${overdue ? ' is-overdue' : ''}">
          <span class="avatar avatar--sm">${escapeHtml(initials(l.borrowerName))}</span>
          <span class="rs-loan-row__body"><span class="rs-loan-row__name">${escapeHtml(l.borrowerName)}</span><span class="rs-loan-row__due">${overdue ? 'Overdue · ' : 'Due '}${formatDateShort(l.dueDate)}</span></span>
          <button class="btn btn--secondary btn--sm" type="button" data-return-loan="${l.id}">Return</button>
        </div>`;
    }).join('') : '';
    return `
      <article class="rs-book-card">
        <div class="rs-book-card__cover">${ICON.book}</div>
        <div class="rs-book-card__body">
          <div class="rs-book-card__title">${escapeHtml(b.title)}</div>
          <div class="rs-book-card__author">${escapeHtml(b.author || 'Unknown author')}</div>
          <div class="rs-book-card__copies">${avail} of ${b.totalCopies} available</div>
          ${loansHtml}
          <button class="btn btn--accent btn--sm" type="button" style="margin-top: var(--space-3); width:100%; justify-content:center;" data-lend-book="${b.id}" ${avail <= 0 ? 'disabled' : ''}>${avail <= 0 ? 'No copies available' : 'Lend a copy'}</button>
        </div>
      </article>`;
  }
  function libraryTabHtml() {
    const books = filteredBooks();
    const FILTERS = [['all', 'All'], ['available', 'Available'], ['on-loan', 'On loan'], ['overdue', 'Overdue']];
    const filterRow = `<div class="rs-filter-row">${FILTERS.map(([k, l]) => `<button class="rs-cond-filter${libraryFilter === k ? ' is-active' : ''}" type="button" data-library-filter="${k}">${l}</button>`).join('')}</div>`;
    if (!allBooks().length) return filterRow + `<div class="state-panel"><div class="state-panel__icon">${ICON.book}</div><div class="state-panel__title">No books available</div><p class="state-panel__text">The library catalogue is empty.</p></div>`;
    if (!books.length) return filterRow + `<div class="state-panel"><div class="state-panel__icon">${ICON.search}</div><div class="state-panel__title">No books match</div><p class="state-panel__text">Try a different search or filter.</p></div>`;
    return filterRow + `<div class="rs-book-grid">${books.map(bookCardHtml).join('')}</div>`;
  }

  /* ========================================================================
     TAB 4 — INVENTORY
     ======================================================================== */
  function filteredInventory() {
    const q = inventorySearch.trim().toLowerCase();
    return allInventory().filter((i) => {
      if (inventoryStatusFilter.size && !inventoryStatusFilter.has(inventoryStatus(i))) return false;
      if (!q) return true;
      return (i.name + ' ' + (i.category || '')).toLowerCase().indexOf(q) !== -1;
    });
  }
  function inventoryCardHtml(i) {
    const status = inventoryStatus(i);
    return `
      <article class="rs-inv-card">
        <div class="rs-inv-card__head">
          <div><div class="rs-inv-card__name">${escapeHtml(i.name)}</div>${i.category ? `<div class="rs-inv-card__category">${escapeHtml(i.category)}</div>` : ''}</div>
          <span class="rs-stock-chip rs-stock-chip--${status.toLowerCase()}">${status}</span>
        </div>
        <div class="rs-inv-card__qty">${i.quantity} <span>${escapeHtml(i.unit)}</span></div>
        <div class="rs-inv-card__meta">Reorder at ${i.reorderLevel} ${escapeHtml(i.unit)} · Updated ${formatDateShort(i.lastUpdated)}</div>
        <button class="btn btn--secondary btn--sm" type="button" style="margin-top: var(--space-3); width:100%; justify-content:center;" data-adjust-item="${i.id}">Adjust stock</button>
      </article>`;
  }
  function inventoryTabHtml() {
    const items = filteredInventory();
    const STATUSES = ['OK', 'LOW', 'OUT'];
    const filterRow = `<div class="rs-filter-row">${STATUSES.map((s) => `<button class="rs-cond-filter${inventoryStatusFilter.has(s) ? ' is-active' : ''}" type="button" data-inv-filter="${s}">${s}</button>`).join('')}</div>`;
    if (!allInventory().length) return filterRow + `<div class="state-panel"><div class="state-panel__icon">${ICON.box}</div><div class="state-panel__title">No inventory items</div><p class="state-panel__text">Add consumable stock to start tracking it here.</p></div>`;
    if (!items.length) return filterRow + `<div class="state-panel"><div class="state-panel__icon">${ICON.search}</div><div class="state-panel__title">No items match</div><p class="state-panel__text">Try a different search or filter.</p></div>`;
    return filterRow + `<div class="rs-inv-grid">${items.map(inventoryCardHtml).join('')}</div>`;
  }

  /* ---------- panel-level event wiring ---------- */
  function wirePanelEvents() {
    const panel = $('rsTabPanel');
    panel.querySelectorAll('[data-book-room]').forEach((btn) => btn.addEventListener('click', () => openBookingModal(btn.dataset.bookRoom)));
    const prevDate = $('rsPrevDate'); const nextDate = $('rsNextDate'); const todayDate = $('rsTodayDate');
    if (prevDate) prevDate.addEventListener('click', () => { bookingDate = addDaysISO(bookingDate, -1); renderTabPanel(); });
    if (nextDate) nextDate.addEventListener('click', () => { bookingDate = addDaysISO(bookingDate, 1); renderTabPanel(); });
    if (todayDate) todayDate.addEventListener('click', () => { bookingDate = todayISO(); renderTabPanel(); });

    panel.querySelectorAll('[data-area-filter]').forEach((chip) => chip.addEventListener('click', () => {
      const k = chip.dataset.areaFilter;
      if (materialsAreaFilter.has(k)) materialsAreaFilter.delete(k); else materialsAreaFilter.add(k);
      renderTabPanel();
    }));
    panel.querySelectorAll('[data-condition-filter]').forEach((chip) => chip.addEventListener('click', () => {
      const k = chip.dataset.conditionFilter;
      if (materialsConditionFilter.has(k)) materialsConditionFilter.delete(k); else materialsConditionFilter.add(k);
      renderTabPanel();
    }));
    panel.querySelectorAll('[data-update-condition]').forEach((btn) => btn.addEventListener('click', () => openConditionModal(btn.dataset.updateCondition)));

    panel.querySelectorAll('[data-library-filter]').forEach((btn) => btn.addEventListener('click', () => { libraryFilter = btn.dataset.libraryFilter; renderTabPanel(); }));
    panel.querySelectorAll('[data-lend-book]').forEach((btn) => btn.addEventListener('click', () => { if (!btn.disabled) openLendModal(btn.dataset.lendBook); }));
    panel.querySelectorAll('[data-return-loan]').forEach((btn) => btn.addEventListener('click', () => returnLoan(btn.dataset.returnLoan)));

    panel.querySelectorAll('[data-inv-filter]').forEach((btn) => btn.addEventListener('click', () => {
      const s = btn.dataset.invFilter;
      if (inventoryStatusFilter.has(s)) inventoryStatusFilter.delete(s); else inventoryStatusFilter.add(s);
      renderTabPanel();
    }));
    panel.querySelectorAll('[data-adjust-item]').forEach((btn) => btn.addEventListener('click', () => openAdjustModal(btn.dataset.adjustItem)));
  }

  /* ---------- generic modal plumbing ---------- */
  function openModal(id) { const b = $(id); b.classList.add('is-open'); b.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const b = $(id); b.classList.remove('is-open'); b.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  function setFieldError(inputId, message) {
    const errorEl = $('err-' + inputId); if (!errorEl) return;
    const input = $(inputId);
    if (message) { errorEl.textContent = message; errorEl.hidden = false; if (input) input.closest('.field').classList.add('is-error'); }
    else { errorEl.hidden = true; if (input) input.closest('.field').classList.remove('is-error'); }
  }
  function submitWithLoading(btnId, work) {
    const btn = $(btnId); if (btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading'); btn.disabled = true;
    window.setTimeout(() => { work(); btn.classList.remove('is-loading'); btn.disabled = false; }, 300);
  }

  /* ========================================================================
     ROOM BOOKING MODAL — clash detection
     ======================================================================== */
  function findClash(roomId, date, start, end, excludeId) {
    return bookingsFor(roomId, date).find((b) => b.id !== excludeId && toMinutes(start) < toMinutes(b.endTime) && toMinutes(b.startTime) < toMinutes(end));
  }
  function openBookingModal(roomId) {
    pendingBookingRoomId = roomId;
    const rooms = allRooms();
    $('bkRoomSelect').innerHTML = rooms.map((r) => `<option value="${r.id}" ${r.id === roomId ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('');
    $('bkTitle').value = '';
    $('bkDate').value = bookingDate || todayISO();
    $('bkStart').value = ''; $('bkEnd').value = ''; $('bkNotes').value = '';
    const classes = window.PlayStore.getByType('Class').filter((c) => c.status !== 'Archived');
    $('bkClassSelect').innerHTML = '<option value="">Not applicable</option>' + classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    ['bkTitle', 'bkDate', 'bkStart'].forEach((id) => setFieldError(id, null));
    $('bkClashNotice').hidden = true;
    openModal('bookingModalBackdrop');
  }
  function wireBookingModal() {
    const backdrop = $('bookingModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('bookingModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('bookingModalBackdrop'); });
    $('bkCancel').addEventListener('click', () => closeModal('bookingModalBackdrop'));
    ['bkRoomSelect', 'bkDate', 'bkStart', 'bkEnd'].forEach((id) => $(id).addEventListener('input', () => { $('bkClashNotice').hidden = true; }));
    $('bkConfirm').addEventListener('click', () => {
      const title = $('bkTitle').value.trim();
      const roomId = $('bkRoomSelect').value;
      const date = $('bkDate').value;
      const start = $('bkStart').value;
      const end = $('bkEnd').value;
      let ok = true;
      if (!title) { setFieldError('bkTitle', 'Enter a booking title.'); ok = false; } else setFieldError('bkTitle', null);
      if (!date) { setFieldError('bkDate', 'Choose a date.'); ok = false; } else setFieldError('bkDate', null);
      if (!start || !end || end <= start) { setFieldError('bkStart', 'End time must be after start time.'); ok = false; } else setFieldError('bkStart', null);
      if (!ok) return;
      const clash = findClash(roomId, date, start, end, null);
      if (clash) {
        const room = window.PlayStore.getById(roomId);
        $('bkClashNotice').hidden = false;
        $('bkClashNotice').innerHTML = `${ICON.alert}<div><div class="rs-clash-notice__title">Room unavailable</div><div class="rs-clash-notice__text">${escapeHtml(room.name)} is booked ${formatTime12(clash.startTime)}–${formatTime12(clash.endTime)} for "${escapeHtml(clash.title)}".</div></div>`;
        return;
      }
      submitWithLoading('bkConfirm', () => {
        window.PlayStore.addRecord({
          id: uid('BK'), type: 'RoomBooking', roomId, title, date, startTime: start, endTime: end,
          classId: $('bkClassSelect').value || null, staffId: $('bkClassSelect').value ? null : currentStaff().id,
          notes: $('bkNotes').value.trim(), createdAt: new Date().toISOString(),
        });
        bookingDate = date;
        closeModal('bookingModalBackdrop');
        render();
        window.PlayShell.toast('success', 'Room booked', `${title} confirmed for ${formatDateLong(date)}.`);
      });
    });
  }

  /* ========================================================================
     MATERIAL CONDITION MODAL — repair notification
     ======================================================================== */
  function openConditionModal(resourceId) {
    editingResourceId = resourceId;
    const r = window.PlayStore.getById(resourceId);
    $('condModalTitle').textContent = 'Update condition — ' + r.name;
    $('condSelect').innerHTML = CONDITIONS.map((c) => `<option value="${c}" ${r.condition === c ? 'selected' : ''}>${c}</option>`).join('');
    $('condNotes').value = '';
    openModal('conditionModalBackdrop');
  }
  function wireConditionModal() {
    const backdrop = $('conditionModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('conditionModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('conditionModalBackdrop'); });
    $('condCancel').addEventListener('click', () => closeModal('conditionModalBackdrop'));
    $('condConfirm').addEventListener('click', () => {
      submitWithLoading('condConfirm', () => {
        const r = window.PlayStore.getById(editingResourceId);
        const previousCondition = r.condition;
        const newCondition = $('condSelect').value;
        window.PlayStore.updateRecord(r.id, { condition: newCondition, lastChecked: todayISO() });
        if (newCondition === 'Needs repair' && previousCondition !== 'Needs repair') {
          window.PlayShell.addNotification({
            title: 'Material needs repair', text: `${r.name} (${classById(r.classId) ? classById(r.classId).name : 'unassigned'}) was marked as needing repair.${$('condNotes').value.trim() ? ' Note: ' + $('condNotes').value.trim() : ''}`,
            forRole: 'Director', module: null, recordRoute: 'resources.html',
          });
        }
        closeModal('conditionModalBackdrop');
        render();
        window.PlayShell.toast('success', 'Condition updated', `${r.name} is now marked "${newCondition}".`);
      });
    });
  }

  /* ========================================================================
     LIBRARY — LEND / RETURN
     ======================================================================== */
  function openLendModal(bookId) {
    pendingLendBookId = bookId;
    const books = allBooks().filter((b) => availableCopies(b) > 0);
    $('lendBookSelect').innerHTML = books.map((b) => `<option value="${b.id}" ${b.id === bookId ? 'selected' : ''}>${escapeHtml(b.title)} (${availableCopies(b)} available)</option>`).join('');
    if (!books.length) $('lendBookSelect').innerHTML = '<option value="">No copies available</option>';
    renderBorrowerOptions();
    $('lendDueDate').value = addDaysISO(todayISO(), 14);
    setFieldError('lendBorrowerSelect', null);
    openModal('lendModalBackdrop');
  }
  function renderBorrowerOptions() {
    const type = $('lendBorrowerType').value;
    const list = type === 'Staff' ? window.PlayStore.getByType('Staff') : window.PlayStore.getByType('Child').filter((c) => c.status === 'Active');
    $('lendBorrowerSelect').innerHTML = list.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  }
  function wireLendModal() {
    const backdrop = $('lendModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('lendModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('lendModalBackdrop'); });
    $('lendCancel').addEventListener('click', () => closeModal('lendModalBackdrop'));
    $('lendBorrowerType').addEventListener('change', renderBorrowerOptions);
    $('lendConfirm').addEventListener('click', () => {
      const bookId = $('lendBookSelect').value;
      const book = bookId && window.PlayStore.getById(bookId);
      if (!book || availableCopies(book) <= 0) { setFieldError('lendBorrowerSelect', 'No copies of this book are available.'); return; }
      const borrowerId = $('lendBorrowerSelect').value;
      if (!borrowerId) { setFieldError('lendBorrowerSelect', 'Choose a borrower.'); return; }
      if (!$('lendDueDate').value) { setFieldError('lendBorrowerSelect', null); window.PlayShell.toast('error', 'Pick a due date', 'A due date is required.'); return; }
      setFieldError('lendBorrowerSelect', null);
      submitWithLoading('lendConfirm', () => {
        const borrower = window.PlayStore.getById(borrowerId);
        window.PlayStore.addRecord({
          id: uid('LOAN'), type: 'BookLoan', bookId, borrowerType: $('lendBorrowerType').value, borrowerId, borrowerName: borrower.name,
          loanDate: todayISO(), dueDate: $('lendDueDate').value, returnedAt: null,
        });
        closeModal('lendModalBackdrop');
        render();
        window.PlayShell.toast('success', 'Book lent', `${book.title} lent to ${borrower.name}.`);
      });
    });
  }
  function returnLoan(loanId) {
    const loan = window.PlayStore.getById(loanId);
    if (!loan || loan.returnedAt) { window.PlayShell.toast('error', "Couldn't return", 'This loan was already returned.'); return; }
    window.PlayStore.updateRecord(loanId, { returnedAt: new Date().toISOString() });
    render();
    const book = window.PlayStore.getById(loan.bookId);
    window.PlayShell.toast('success', 'Book returned', `${book ? book.title : 'Book'} returned by ${loan.borrowerName}.`);
  }

  /* ========================================================================
     INVENTORY — ADJUST STOCK
     ======================================================================== */
  function openAdjustModal(itemId) {
    editingInventoryId = itemId;
    const items = allInventory();
    $('adjItemSelect').innerHTML = items.map((i) => `<option value="${i.id}" ${i.id === itemId ? 'selected' : ''}>${escapeHtml(i.name)} (${i.quantity} ${escapeHtml(i.unit)})</option>`).join('');
    $('adjType').value = 'Add';
    $('adjQty').value = '';
    $('adjReason').value = '';
    ['adjQty', 'adjReason'].forEach((id) => setFieldError(id, null));
    openModal('adjustModalBackdrop');
  }
  function wireAdjustModal() {
    const backdrop = $('adjustModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('adjustModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('adjustModalBackdrop'); });
    $('adjCancel').addEventListener('click', () => closeModal('adjustModalBackdrop'));
    $('adjConfirm').addEventListener('click', () => {
      const item = window.PlayStore.getById($('adjItemSelect').value);
      const qty = Number($('adjQty').value);
      const reason = $('adjReason').value.trim();
      let ok = true;
      if (!qty || qty <= 0 || !Number.isFinite(qty)) { setFieldError('adjQty', 'Enter a positive quantity.'); ok = false; } else setFieldError('adjQty', null);
      if (!reason) { setFieldError('adjReason', 'A reason is required.'); ok = false; } else setFieldError('adjReason', null);
      if (!ok) return;
      const delta = $('adjType').value === 'Add' ? qty : -qty;
      if (item.quantity + delta < 0) { setFieldError('adjQty', `Only ${item.quantity} ${item.unit} in stock — can't remove ${qty}.`); return; }
      submitWithLoading('adjConfirm', () => {
        const previousStatus = inventoryStatus(item);
        const newQuantity = item.quantity + delta;
        window.PlayStore.updateRecord(item.id, { quantity: newQuantity, lastUpdated: new Date().toISOString() });
        window.PlayStore.addRecord({ id: uid('ADJ'), type: 'InventoryAdjustment', itemId: item.id, delta, reason, adjustedBy: currentStaff().name, adjustedAt: new Date().toISOString() });
        const newStatus = inventoryStatus({ quantity: newQuantity, reorderLevel: item.reorderLevel });
        if (previousStatus === 'OK' && newStatus !== 'OK') {
          window.PlayShell.addNotification({ title: newStatus === 'OUT' ? 'Item out of stock' : 'Item running low', text: `${item.name} is now at ${newQuantity} ${item.unit} (reorder level ${item.reorderLevel}).`, forRole: 'Director', module: null, recordRoute: 'resources.html' });
        }
        closeModal('adjustModalBackdrop');
        render();
        window.PlayShell.toast('success', 'Stock updated', `${item.name} is now ${newQuantity} ${item.unit}.`);
      });
    });
  }
})();
