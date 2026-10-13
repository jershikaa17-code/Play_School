/* ==========================================================================
   PLAY SCHOOL — Parent–Teacher Conferences (S32)
   Reuses: store.js (new ConferenceSlot/ConferenceBooking/ConferenceRecord
   record types — one slot per bookable window, one booking per confirmed
   meeting, one record per debrief, keyed the same way other pages key
   recipients: by real Family/Child/Staff ids, never a parallel roster),
   modules.js/shell.js (Premium nav, gated by the same 'communication' tier
   as Messages/Announcements/Forms), announcements.css (header/summary/tabs/
   drawer/audience-chip components reused outright), record.js (S13 child
   profile — linked directly by id; the "S29 plan" link in this build's
   module catalogue has no dedicated per-child plan page, so it points at
   the closest existing equivalent, the child profile's own "Learning &
   Portfolio" tab, via a small `tab` query-param read added to record.js).

   HONESTY NOTES (no real backend in this project):
   - Cancelling a booking shows a second, clearly-labelled toast that a
     family WOULD be notified — no real message is sent, matching the same
     honest pattern used by Announcements/Forms reminders.
   - "Share with family" only sets a flag on the record and is confirmed
     before enabling; no real parent-facing delivery exists in this project.
   - Conflict checking is centralised in hasConflict() and re-run at every
     decision point (slot generation, slot selection, booking confirmation,
     cancellation) against the live in-memory store — this guarantees
     consistency within one browser tab's demo session, not true
     cross-device concurrency safety, since there is no real backend.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function isoFromDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function todayISO() { return isoFromDate(new Date()); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function initials(name) { const p = String(name || '').trim().split(/\s+/); return p[0] ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '?'; }
  function formatDate(iso) { if (!iso) return '—'; return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  function formatDateShort(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); }
  function formatTime12(hhmm) { const [h, m] = hhmm.split(':').map(Number); const period = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 === 0 ? 12 : h % 12; return h12 + ':' + pad2(m) + ' ' + period; }
  function timeToMin(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
  function minToTime(mins) { return pad2(Math.floor(mins / 60) % 24) + ':' + pad2(mins % 60); }
  function addMinutes(hhmm, mins) { return minToTime(timeToMin(hhmm) + mins); }
  function overlaps(aStart, aEnd, bStart, bEnd) { return timeToMin(aStart) < timeToMin(bEnd) && timeToMin(bStart) < timeToMin(aEnd); }
  function mondayOf(iso) { const d = new Date(iso + 'T00:00:00'); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); return isoFromDate(d); }
  function weekDates(monday) { const dates = []; const d = new Date(monday + 'T00:00:00'); for (let i = 0; i < 7; i++) { dates.push(isoFromDate(d)); d.setDate(d.getDate() + 1); } return dates; }

  const ICON = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
    mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  };

  let role = null;
  let activeTab = 'availability';
  let weekStart = mondayOf(todayISO());
  let teacherFilter = new Set();
  let mobileSelectedDate = todayISO();
  let bookingsFilter = { dateFrom: '', dateTo: '', teacherId: '', mode: '', status: '', search: '' };
  let generateState = null;
  let bookState = null;
  let recordEditState = null;
  let pendingConfirmResolve = null;
  let pendingConfirmCancel = null;
  let activeDrawerBookingId = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    window.PlayShell.login();
    role = window.PlayShell.getDemoRole();
    window.PlayShell.mount('conferences', 'Parent–Teacher Conferences');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    if (!isModuleUnlocked()) { renderLocked(); return; }
    $('confMain').hidden = false;

    wireTabs();
    $('confGenerateBtn').addEventListener('click', () => openGenerateModal());
    $('confBookBtn').addEventListener('click', () => openBookModal({}));
    wireGenerateModal();
    wireBookModal();
    wireRecordModal();
    wireConfirmModal();
    wireBookingDrawer();

    window.setTimeout(() => { $('confSkeleton').hidden = true; $('confBody').hidden = false; goToTab('availability'); }, 380);
  }
  function isModuleUnlocked() {
    if (!window.PlayModules) return true;
    const mod = window.PlayModules.getById('communication');
    if (!mod) return true;
    return window.PlayModules.isUnlocked(mod, window.PlayModules.getCurrentPlan());
  }
  function renderLocked() {
    $('confLocked').hidden = false;
    $('confMain').hidden = true;
    $('confLockedIcon').innerHTML = ICON.lock;
    const isAdminish = role === 'Director' || role === 'Admin';
    $('confLockedAction').innerHTML = isAdminish
      ? `<a class="btn btn--accent" href="plans.html?module=communication&role=${encodeURIComponent(role)}">See plans &amp; upgrade</a>`
      : `<a class="btn btn--secondary" href="module.html?id=communication&role=${encodeURIComponent(role)}">Ask my admin to upgrade</a>`;
  }

  /* ---------- data helpers ---------- */
  function getById(id) { return window.PlayStore.getById(id); }
  function allTeachers() { return window.PlayStore.getByType('Staff').filter((s) => s.status === 'Active' && /^Teacher/.test(s.relation || '')); }
  function teacherName(id) { const t = getById(id); return t ? t.name : 'Staff'; }
  function allSlots() { return window.PlayStore.getByType('ConferenceSlot'); }
  function slotsFor(teacherId, date) { return allSlots().filter((s) => s.teacherId === teacherId && s.date === date); }
  function allBookings() { return window.PlayStore.getByType('ConferenceBooking'); }
  function activeBookingsFor(teacherId, date, excludeId) {
    return allBookings().filter((b) => b.teacherId === teacherId && b.date === date && b.status !== 'Cancelled' && b.id !== excludeId);
  }
  function hasConflict(teacherId, date, start, end, excludeId) {
    return activeBookingsFor(teacherId, date, excludeId).some((b) => overlaps(b.startTime, b.endTime, start, end));
  }
  function filteredTeachers() { const list = allTeachers(); return teacherFilter.size ? list.filter((t) => teacherFilter.has(t.id)) : list; }
  function familyName(id) { const f = getById(id); return f ? f.name : 'Family'; }
  function childName(id) { const c = getById(id); return c ? c.name : 'Child'; }

  /* ========================================================================
     SUMMARY + TABS
     ======================================================================== */
  function renderSummary() {
    const slots = allSlots();
    const bookings = allBookings();
    const records = window.PlayStore.getByType('ConferenceRecord');
    const openSlots = slots.filter((s) => s.status === 'Open' && s.date >= todayISO()).length;
    const upcoming = bookings.filter((b) => b.status === 'Upcoming').length;
    const completed = bookings.filter((b) => b.status === 'Completed').length;
    const followUpsDue = records.filter((r) => r.followUpDate && r.followUpDate <= todayISO()).length;
    $('confSummary').innerHTML = [
      { icon: ICON.calendar, value: openSlots, label: 'Open slots' },
      { icon: ICON.clock, value: upcoming, label: 'Upcoming meetings' },
      { icon: ICON.check, value: completed, label: 'Meetings completed' },
      { icon: ICON.users, value: followUpsDue, label: 'Follow-ups due' },
    ].map((s) => `<div class="ann-summary-card"><span class="ann-summary-card__icon">${s.icon}</span><div><div class="ann-summary-card__value">${s.value}</div><div class="ann-summary-card__label">${escapeHtml(s.label)}</div></div></div>`).join('');
  }
  const TABS = [['availability', 'Availability'], ['bookings', 'Bookings'], ['records', 'Conference records']];
  function wireTabs() {
    $('confTabs').innerHTML = TABS.map(([k, l]) => `<button class="ann-tab" type="button" data-tab="${k}" role="tab" aria-selected="${k === activeTab}">${l}</button>`).join('');
    $('confTabs').addEventListener('click', (e) => { const btn = e.target.closest('[data-tab]'); if (!btn) return; goToTab(btn.dataset.tab); });
  }
  function goToTab(tab) {
    activeTab = tab;
    $('confTabs').querySelectorAll('[data-tab]').forEach((btn) => btn.setAttribute('aria-selected', String(btn.dataset.tab === tab)));
    renderSummary();
    const panel = $('confTabPanel');
    panel.classList.remove('ann-tab-panel--in');
    if (tab === 'availability') renderAvailability();
    else if (tab === 'bookings') renderBookings();
    else renderRecords();
    requestAnimationFrame(() => panel.classList.add('ann-tab-panel--in'));
  }
  function refreshAll() { renderSummary(); if (activeTab === 'availability') renderAvailability(); else if (activeTab === 'bookings') renderBookings(); else renderRecords(); }

  /* ========================================================================
     AVAILABILITY
     ======================================================================== */
  function renderAvailability() {
    const panel = $('confTabPanel');
    panel.innerHTML = `
      <div class="conf-teacher-filters" id="availTeacherFilters" style="margin-bottom: var(--space-4);"></div>
      <div class="conf-controls" id="availDesktopControls">
        <div class="conf-date-nav">
          <button class="ws-icon-btn" type="button" id="availPrevWeek" aria-label="Previous week">${ICON.chevronLeft}</button>
          <span class="conf-date-nav__label" id="availWeekLabel"></span>
          <button class="ws-icon-btn" type="button" id="availNextWeek" aria-label="Next week">${ICON.chevronRight}</button>
        </div>
        <button class="btn btn--ghost btn--sm" type="button" id="availTodayBtn">Today</button>
      </div>
      <div class="conf-grid-wrap"><div class="conf-grid" id="availGrid"></div></div>
      <div class="conf-day-list" id="availDayList">
        <div class="conf-controls" style="margin-bottom:0;">
          <div class="conf-date-nav">
            <button class="ws-icon-btn" type="button" id="availPrevDay" aria-label="Previous day">${ICON.chevronLeft}</button>
            <span class="conf-date-nav__label" id="availDayLabel"></span>
            <button class="ws-icon-btn" type="button" id="availNextDay" aria-label="Next day">${ICON.chevronRight}</button>
          </div>
          <button class="btn btn--ghost btn--sm" type="button" id="availTodayBtnMobile">Today</button>
        </div>
        <div id="availDayTeachers" style="margin-top: var(--space-4);"></div>
      </div>
    `;
    renderTeacherFilterChips();
    $('availPrevWeek').addEventListener('click', () => { weekStart = isoFromDate(new Date(new Date(weekStart + 'T00:00:00').setDate(new Date(weekStart + 'T00:00:00').getDate() - 7))); renderAvailGrid(); });
    $('availNextWeek').addEventListener('click', () => { weekStart = isoFromDate(new Date(new Date(weekStart + 'T00:00:00').setDate(new Date(weekStart + 'T00:00:00').getDate() + 7))); renderAvailGrid(); });
    $('availTodayBtn').addEventListener('click', () => { weekStart = mondayOf(todayISO()); renderAvailGrid(); });
    $('availPrevDay').addEventListener('click', () => { mobileSelectedDate = isoFromDate(new Date(new Date(mobileSelectedDate + 'T00:00:00').setDate(new Date(mobileSelectedDate + 'T00:00:00').getDate() - 1))); renderAvailDayList(); });
    $('availNextDay').addEventListener('click', () => { mobileSelectedDate = isoFromDate(new Date(new Date(mobileSelectedDate + 'T00:00:00').setDate(new Date(mobileSelectedDate + 'T00:00:00').getDate() + 1))); renderAvailDayList(); });
    $('availTodayBtnMobile').addEventListener('click', () => { mobileSelectedDate = todayISO(); renderAvailDayList(); });
    renderAvailGrid();
    renderAvailDayList();
  }
  function renderTeacherFilterChips() {
    const teachers = allTeachers();
    $('availTeacherFilters').innerHTML = teachers.map((t) => `<button type="button" class="pl-area-chip${teacherFilter.has(t.id) ? ' is-active' : ''}" data-teacher-chip="${t.id}" style="--area-color: var(--color-brand-blue);">${escapeHtml(t.name)}</button>`).join('');
    $('availTeacherFilters').querySelectorAll('[data-teacher-chip]').forEach((btn) => btn.addEventListener('click', () => {
      const id = btn.dataset.teacherChip;
      if (teacherFilter.has(id)) teacherFilter.delete(id); else teacherFilter.add(id);
      renderTeacherFilterChips(); renderAvailGrid(); renderAvailDayList();
    }));
  }
  function slotPillHtml(slot) {
    const cls = slot.status === 'Open' ? 'is-open' : 'is-booked';
    const title = slot.status === 'Open' ? 'Open — select to book' : 'Booked — select to view';
    return `<button type="button" class="conf-slot-pill ${cls}" data-slot-id="${slot.id}" title="${title}" aria-label="${formatTime12(slot.startTime)} ${slot.status}">${formatTime12(slot.startTime)}</button>`;
  }
  function wireSlotPills(container) {
    container.querySelectorAll('[data-slot-id]').forEach((btn) => btn.addEventListener('click', () => onSlotClick(btn.dataset.slotId)));
  }
  function onSlotClick(slotId) {
    const slot = getById(slotId);
    if (!slot) return;
    if (slot.status === 'Open') { openBookModal({ teacherId: slot.teacherId, date: slot.date, slotId: slot.id }); return; }
    const booking = allBookings().find((b) => b.slotId === slotId && b.status !== 'Cancelled');
    if (booking) openBookingDrawer(booking.id);
  }
  function renderAvailGrid() {
    const dates = weekDates(weekStart);
    $('availWeekLabel').textContent = formatDateShort(dates[0]) + ' – ' + formatDate(dates[6]);
    const teachers = filteredTeachers();
    const grid = $('availGrid');
    let html = `<div class="conf-grid__corner">Teacher</div>`;
    dates.forEach((d) => {
      const dow = new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' });
      html += `<div class="conf-grid__daycol${d === todayISO() ? ' is-today' : ''}"><div class="conf-grid__daycol-day">${dow}</div><div class="conf-grid__daycol-date">${formatDateShort(d)}</div></div>`;
    });
    if (!teachers.length) {
      html += `<div class="conf-grid__corner" style="grid-column: 1 / -1;">No teachers match the current filter.</div>`;
    } else {
      teachers.forEach((t) => {
        html += `<div class="conf-grid__teacher"><span class="conf-grid__teacher-avatar">${escapeHtml(initials(t.name))}</span>${escapeHtml(t.name)}</div>`;
        dates.forEach((d) => {
          const slots = slotsFor(t.id, d).sort((a, b) => a.startTime.localeCompare(b.startTime));
          html += `<div class="conf-grid__cell${d === todayISO() ? ' is-today' : ''}">`;
          html += slots.length ? slots.map(slotPillHtml).join('') : `<div class="conf-grid__empty">—</div>`;
          html += `</div>`;
        });
      });
    }
    grid.innerHTML = html;
    wireSlotPills(grid);
  }
  function renderAvailDayList() {
    $('availDayLabel').textContent = formatDate(mobileSelectedDate);
    const teachers = filteredTeachers();
    const wrap = $('availDayTeachers');
    if (!teachers.length) { wrap.innerHTML = `<p class="ws-section-empty">No teachers match the current filter.</p>`; return; }
    wrap.innerHTML = teachers.map((t) => {
      const slots = slotsFor(t.id, mobileSelectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime));
      return `<div class="conf-day-teacher"><div class="conf-day-teacher__head"><span class="conf-grid__teacher-avatar">${escapeHtml(initials(t.name))}</span>${escapeHtml(t.name)}</div><div class="conf-day-teacher__slots">${slots.length ? slots.map(slotPillHtml).join('') : '<span class="conf-grid__empty">No slots this day.</span>'}</div></div>`;
    }).join('');
    wireSlotPills(wrap);
  }

  /* ---------- generic modal plumbing ---------- */
  function openModal(id) { const b = $(id); b.classList.add('is-open'); b.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const b = $(id); b.classList.remove('is-open'); b.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  function fieldError(id, msg) {
    const el = $('err-' + id); if (!el) return;
    if (msg) { el.textContent = msg; el.hidden = false; } else { el.hidden = true; }
  }

  /* ========================================================================
     GENERATE SLOTS MODAL
     ======================================================================== */
  function openGenerateModal() {
    generateState = { teacherIds: new Set(), startDate: todayISO(), endDate: todayISO(), dailyStart: '15:00', dailyEnd: '17:00', duration: 15, breakMin: 5 };
    renderGenerateBody();
    openModal('generateModalBackdrop');
  }
  function buildCandidates() {
    const s = generateState;
    const candidates = [];
    if (!s.teacherIds.size || !s.startDate || !s.endDate || s.startDate > s.endDate || timeToMin(s.dailyStart) >= timeToMin(s.dailyEnd) || s.breakMin < 0) return { candidates, days: 0 };
    let d = new Date(s.startDate + 'T00:00:00');
    const end = new Date(s.endDate + 'T00:00:00');
    let days = 0;
    while (d <= end) {
      days++;
      const dateStr = isoFromDate(d);
      s.teacherIds.forEach((teacherId) => {
        let cursor = s.dailyStart;
        while (timeToMin(addMinutes(cursor, s.duration)) <= timeToMin(s.dailyEnd)) {
          candidates.push({ teacherId, date: dateStr, startTime: cursor, endTime: addMinutes(cursor, s.duration) });
          cursor = addMinutes(cursor, s.duration + s.breakMin);
        }
      });
      d.setDate(d.getDate() + 1);
    }
    return { candidates, days };
  }
  function partitionCandidates(candidates) {
    const existing = allSlots();
    const kept = []; let skipped = 0;
    candidates.forEach((c) => {
      const conflict = existing.some((s) => s.teacherId === c.teacherId && s.date === c.date && overlaps(s.startTime, s.endTime, c.startTime, c.endTime));
      if (conflict) skipped++; else kept.push(c);
    });
    return { kept, skipped };
  }
  function renderGenerateBody() {
    const teachers = allTeachers();
    const s = generateState;
    $('generateBody').innerHTML = `
      <div class="field">
        <label class="field__label">Teachers</label>
        <div class="ann-audience-options" id="genTeacherChips">
          <button type="button" class="ann-audience-opt" data-select-all>${ICON.users} Select all</button>
          ${teachers.map((t) => `<button type="button" class="ann-audience-opt${s.teacherIds.has(t.id) ? ' is-active' : ''}" data-teacher="${t.id}">${escapeHtml(t.name)}</button>`).join('')}
        </div>
        <p class="field__error" id="err-genTeachers" hidden></p>
      </div>
      <div class="cls-form-grid">
        <div class="field"><label class="field__label" for="genStartDate">Start date</label><input class="input" id="genStartDate" type="date" value="${s.startDate}" /></div>
        <div class="field"><label class="field__label" for="genEndDate">End date</label><input class="input" id="genEndDate" type="date" value="${s.endDate}" /></div>
      </div>
      <p class="field__error" id="err-genDates" hidden></p>
      <div class="cls-form-grid" style="margin-top: var(--space-3);">
        <div class="field"><label class="field__label" for="genDailyStart">Daily start time</label><input class="input" id="genDailyStart" type="time" value="${s.dailyStart}" /></div>
        <div class="field"><label class="field__label" for="genDailyEnd">Daily end time</label><input class="input" id="genDailyEnd" type="time" value="${s.dailyEnd}" /></div>
      </div>
      <p class="field__error" id="err-genTimes" hidden></p>
      <div class="cls-form-grid" style="margin-top: var(--space-3);">
        <div class="field"><label class="field__label" for="genDuration">Slot duration</label><select class="select" id="genDuration"><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="20">20 minutes</option></select></div>
        <div class="field"><label class="field__label" for="genBreak">Break between slots (minutes)</label><input class="input" id="genBreak" type="number" min="0" value="${s.breakMin}" /></div>
      </div>
      <p class="field__error" id="err-genBreak" hidden></p>
      <div class="conf-preview-card" id="genPreview"></div>
    `;
    $('genDuration').value = String(s.duration);
    $('genTeacherChips').querySelectorAll('[data-teacher]').forEach((btn) => btn.addEventListener('click', () => { const id = btn.dataset.teacher; if (s.teacherIds.has(id)) s.teacherIds.delete(id); else s.teacherIds.add(id); renderGenerateBody(); }));
    $('genTeacherChips').querySelector('[data-select-all]').addEventListener('click', () => { if (s.teacherIds.size === teachers.length) s.teacherIds.clear(); else teachers.forEach((t) => s.teacherIds.add(t.id)); renderGenerateBody(); });
    $('genStartDate').addEventListener('input', () => { s.startDate = $('genStartDate').value; renderGeneratePreview(); });
    $('genEndDate').addEventListener('input', () => { s.endDate = $('genEndDate').value; renderGeneratePreview(); });
    $('genDailyStart').addEventListener('input', () => { s.dailyStart = $('genDailyStart').value; renderGeneratePreview(); });
    $('genDailyEnd').addEventListener('input', () => { s.dailyEnd = $('genDailyEnd').value; renderGeneratePreview(); });
    $('genDuration').addEventListener('change', () => { s.duration = Number($('genDuration').value); renderGeneratePreview(); });
    $('genBreak').addEventListener('input', () => { s.breakMin = Number($('genBreak').value) || 0; renderGeneratePreview(); });
    renderGeneratePreview();
  }
  function renderGeneratePreview() {
    const s = generateState;
    const { candidates, days } = buildCandidates();
    const { kept, skipped } = partitionCandidates(candidates);
    $('genPreview').innerHTML = `
      <div class="conf-preview-grid">
        <div><span>Teachers selected</span><b>${s.teacherIds.size}</b></div>
        <div><span>Days</span><b>${days}</b></div>
        <div><span>Slot duration</span><b>${s.duration} min</b></div>
        <div><span>Break</span><b>${s.breakMin} min</b></div>
      </div>
      <div class="conf-preview-grid" style="grid-template-columns: 1fr;">
        <div><span>Total slots to create</span><b>${kept.length}</b></div>
      </div>
      ${skipped ? `<p class="conf-preview-skip">${ICON.clock} ${skipped} proposed slot${skipped === 1 ? '' : 's'} will be skipped — ${skipped === 1 ? 'it overlaps' : 'they overlap'} availability that already exists for that teacher and day.</p>` : ''}
    `;
  }
  function wireGenerateModal() {
    const backdrop = $('generateModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('generateModalBackdrop'); });
    $('generateCancelBtn').addEventListener('click', () => closeModal('generateModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('generateModalBackdrop'); });
    $('generateConfirmBtn').addEventListener('click', () => {
      const s = generateState;
      let ok = true;
      if (!s.teacherIds.size) { fieldError('genTeachers', 'Select at least one teacher.'); ok = false; } else fieldError('genTeachers', null);
      if (!s.startDate || !s.endDate || s.startDate > s.endDate) { fieldError('genDates', 'Choose a valid date range.'); ok = false; } else fieldError('genDates', null);
      if (timeToMin(s.dailyStart) >= timeToMin(s.dailyEnd)) { fieldError('genTimes', 'End time must be later than start time.'); ok = false; } else fieldError('genTimes', null);
      if (s.breakMin < 0) { fieldError('genBreak', 'Break cannot be negative.'); ok = false; } else fieldError('genBreak', null);
      if (!ok) return;
      const { candidates } = buildCandidates();
      const { kept, skipped } = partitionCandidates(candidates);
      kept.forEach((c) => {
        window.PlayStore.addRecord({ id: uid('CSLOT'), type: 'ConferenceSlot', teacherId: c.teacherId, date: c.date, startTime: c.startTime, endTime: c.endTime, status: 'Open', bookingId: null });
      });
      closeModal('generateModalBackdrop');
      window.PlayShell.toast('success', 'Availability created', `${kept.length} slot${kept.length === 1 ? '' : 's'} created.${skipped ? ' ' + skipped + ' skipped (already covered).' : ''}`);
      refreshAll();
    });
  }

  /* ========================================================================
     BOOK FOR A FAMILY MODAL
     ======================================================================== */
  function openBookModal(prefill) {
    bookState = { familyId: '', childId: '', teacherId: prefill.teacherId || '', date: prefill.date || '', slotId: prefill.slotId || '', mode: 'In person', note: '' };
    renderBookBody();
    openModal('bookModalBackdrop');
  }
  function openSlotsFor(teacherId, date) {
    if (!teacherId || !date) return [];
    return allSlots().filter((s) => s.teacherId === teacherId && s.date === date && s.status === 'Open').sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  function renderBookBody() {
    const s = bookState;
    const families = window.PlayStore.getByType('Family').slice().sort((a, b) => a.name.localeCompare(b.name));
    const teachers = allTeachers();
    const family = s.familyId ? getById(s.familyId) : null;
    const children = family ? (family.childIds || []).map(getById).filter(Boolean) : [];
    if (family && children.length === 1 && !s.childId) s.childId = children[0].id;
    const slots = openSlotsFor(s.teacherId, s.date);
    if (s.slotId && !slots.some((sl) => sl.id === s.slotId)) s.slotId = '';

    $('bookBody').innerHTML = `
      <div class="field">
        <label class="field__label" for="bkFamilySel">Family</label>
        <select class="select" id="bkFamilySel"><option value="">Choose a family…</option>${families.map((f) => `<option value="${f.id}" ${s.familyId === f.id ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label class="field__label" for="bkChildSel">Child</label>
        <select class="select" id="bkChildSel" ${!family ? 'disabled' : ''}>
          <option value="">${family ? 'Choose a child…' : 'Choose a family first'}</option>
          ${children.map((c) => `<option value="${c.id}" ${s.childId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="cls-form-grid">
        <div class="field">
          <label class="field__label" for="bkTeacherSel">Teacher</label>
          <select class="select" id="bkTeacherSel"><option value="">Choose a teacher…</option>${teachers.map((t) => `<option value="${t.id}" ${s.teacherId === t.id ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label class="field__label" for="bkDateInput">Date</label>
          <input class="input" id="bkDateInput" type="date" value="${s.date}" min="${todayISO()}" />
        </div>
      </div>
      <div class="field">
        <label class="field__label">Available time slots</label>
        <div class="conf-slot-grid" id="bkSlotGrid">${slots.length ? slots.map((sl) => `<button type="button" class="conf-slot-choice${s.slotId === sl.id ? ' is-selected' : ''}" data-slot="${sl.id}">${formatTime12(sl.startTime)}</button>`).join('') : '<p class="ws-section-empty" style="padding:0;">Choose a teacher and date to see available slots.</p>'}</div>
        <p class="field__error" id="err-bkSlot" hidden></p>
      </div>
      <div class="field">
        <label class="field__label">Meeting mode</label>
        <div class="ann-audience-options">
          <button type="button" class="ann-audience-opt${s.mode === 'In person' ? ' is-active' : ''}" data-mode="In person">${ICON.mapPin} In person</button>
          <button type="button" class="ann-audience-opt${s.mode === 'Video' ? ' is-active' : ''}" data-mode="Video">${ICON.video} Video</button>
        </div>
      </div>
      <div class="field">
        <label class="field__label" for="bkNoteInput">Note (optional)</label>
        <textarea class="textarea" id="bkNoteInput" rows="2">${escapeHtml(s.note)}</textarea>
      </div>
      <p class="field__error" id="err-bkGeneral" hidden></p>
      <div class="conf-preview-card" id="bkSummary"></div>
    `;
    $('bkFamilySel').addEventListener('change', () => { s.familyId = $('bkFamilySel').value; s.childId = ''; renderBookBody(); });
    $('bkChildSel').addEventListener('change', () => { s.childId = $('bkChildSel').value; renderBookSummary(); });
    $('bkTeacherSel').addEventListener('change', () => { s.teacherId = $('bkTeacherSel').value; s.slotId = ''; renderBookBody(); });
    $('bkDateInput').addEventListener('input', () => { s.date = $('bkDateInput').value; s.slotId = ''; renderBookBody(); });
    $('bkSlotGrid').querySelectorAll('[data-slot]').forEach((btn) => btn.addEventListener('click', () => { s.slotId = btn.dataset.slot; fieldError('bkSlot', null); renderBookBody(); }));
    $('bookBody').querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => { s.mode = btn.dataset.mode; renderBookBody(); }));
    $('bkNoteInput').addEventListener('input', () => { s.note = $('bkNoteInput').value; });
    renderBookSummary();
  }
  function renderBookSummary() {
    const s = bookState;
    const el = $('bkSummary'); if (!el) return;
    const slot = s.slotId ? getById(s.slotId) : null;
    el.innerHTML = `
      <div class="conf-preview-grid" style="grid-template-columns: 1fr 1fr;">
        <div><span>Family</span><b style="font-size:var(--fs-body-sm);">${s.familyId ? escapeHtml(familyName(s.familyId)) : '—'}</b></div>
        <div><span>Child</span><b style="font-size:var(--fs-body-sm);">${s.childId ? escapeHtml(childName(s.childId)) : '—'}</b></div>
        <div><span>Teacher</span><b style="font-size:var(--fs-body-sm);">${s.teacherId ? escapeHtml(teacherName(s.teacherId)) : '—'}</b></div>
        <div><span>Date &amp; time</span><b style="font-size:var(--fs-body-sm);">${slot ? formatDate(s.date) + ' · ' + formatTime12(slot.startTime) : '—'}</b></div>
      </div>`;
  }
  function wireBookModal() {
    const backdrop = $('bookModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('bookModalBackdrop'); });
    $('bookCancelBtn').addEventListener('click', () => closeModal('bookModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('bookModalBackdrop'); });
    $('bookConfirmBtn').addEventListener('click', () => {
      const s = bookState;
      if (!s.familyId || !s.childId || !s.teacherId || !s.date || !s.slotId || !s.mode) {
        fieldError('bkGeneral', 'Please complete every field before confirming.');
        return;
      }
      fieldError('bkGeneral', null);
      const slot = getById(s.slotId);
      if (!slot || slot.status !== 'Open') {
        fieldError('bkSlot', 'This slot was just booked by someone else. Pick another time.');
        s.slotId = ''; renderBookBody();
        return;
      }
      if (hasConflict(s.teacherId, s.date, slot.startTime, slot.endTime)) {
        fieldError('bkSlot', 'This teacher already has a meeting at that time. Pick another slot.');
        s.slotId = ''; renderBookBody();
        return;
      }
      const booking = window.PlayStore.addRecord({
        id: uid('CBK'), type: 'ConferenceBooking', slotId: slot.id, teacherId: s.teacherId, date: s.date, startTime: slot.startTime, endTime: slot.endTime,
        familyId: s.familyId, childId: s.childId, mode: s.mode, note: s.note, status: 'Upcoming', createdAt: new Date().toISOString(), cancelledAt: null, cancelReason: null,
      });
      window.PlayStore.updateRecord(slot.id, { status: 'Booked', bookingId: booking.id });
      closeModal('bookModalBackdrop');
      window.PlayShell.toast('success', 'Booking confirmed', `${familyName(s.familyId)} · ${formatDate(s.date)} at ${formatTime12(slot.startTime)}`);
      window.PlayShell.addNotification({ title: 'Conference booked', text: `${childName(s.childId)} with ${teacherName(s.teacherId)} on ${formatDate(s.date)}`, module: 'communication', recordRoute: 'conferences.html' });
      refreshAll();
    });
  }

  /* ========================================================================
     GENERIC CONFIRM MODAL (callback-based: cancel booking / share record)
     ======================================================================== */
  function openConfirm(title, text, actionLabel, actionClass, onConfirm, onCancel) {
    pendingConfirmResolve = onConfirm || null;
    pendingConfirmCancel = onCancel || null;
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text;
    $('confirmActionBtn').textContent = actionLabel;
    $('confirmActionBtn').className = 'btn ' + actionClass;
    openModal('confirmModalBackdrop');
  }
  function wireConfirmModal() {
    const backdrop = $('confirmModalBackdrop');
    const runCancel = () => { closeModal('confirmModalBackdrop'); const fn = pendingConfirmCancel; pendingConfirmResolve = null; pendingConfirmCancel = null; if (fn) fn(); };
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) runCancel(); });
    $('confirmCancelBtn').addEventListener('click', runCancel);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) runCancel(); });
    $('confirmActionBtn').addEventListener('click', () => {
      closeModal('confirmModalBackdrop');
      const fn = pendingConfirmResolve; pendingConfirmResolve = null; pendingConfirmCancel = null;
      if (fn) fn();
    });
  }

  function doCancelBooking(bookingId) {
    const booking = getById(bookingId);
    if (!booking) return;
    window.PlayStore.updateRecord(bookingId, { status: 'Cancelled', cancelledAt: new Date().toISOString() });
    const slot = booking.slotId ? getById(booking.slotId) : null;
    if (slot) {
      const conflict = hasConflict(slot.teacherId, slot.date, slot.startTime, slot.endTime, bookingId);
      window.PlayStore.updateRecord(slot.id, conflict ? { status: 'Booked' } : { status: 'Open', bookingId: null });
    }
    closeModal('bookingDrawerBackdrop');
    window.PlayShell.toast('success', 'Booking cancelled', 'The slot is open again.');
    window.PlayShell.toast('info', 'Family notification (demo)', `${familyName(booking.familyId)} would be informed of this cancellation — no real message is sent in this project.`);
    refreshAll();
  }

  /* ========================================================================
     BOOKINGS TAB
     ======================================================================== */
  function renderBookings() {
    const panel = $('confTabPanel');
    const teachers = allTeachers();
    panel.innerHTML = `
      <div class="conf-filter-bar">
        <div class="conf-filter-field"><label>From</label><input class="input" type="date" id="bkfFrom" value="${bookingsFilter.dateFrom}" /></div>
        <div class="conf-filter-field"><label>To</label><input class="input" type="date" id="bkfTo" value="${bookingsFilter.dateTo}" /></div>
        <div class="conf-filter-field"><label>Teacher</label><select class="select" id="bkfTeacher"><option value="">All teachers</option>${teachers.map((t) => `<option value="${t.id}" ${bookingsFilter.teacherId === t.id ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}</select></div>
        <div class="conf-filter-field"><label>Mode</label><select class="select" id="bkfMode"><option value="">All modes</option><option ${bookingsFilter.mode === 'In person' ? 'selected' : ''}>In person</option><option ${bookingsFilter.mode === 'Video' ? 'selected' : ''}>Video</option></select></div>
        <div class="conf-filter-field"><label>Status</label><select class="select" id="bkfStatus"><option value="">All statuses</option>${['Upcoming', 'Completed', 'Cancelled'].map((st) => `<option ${bookingsFilter.status === st ? 'selected' : ''}>${st}</option>`).join('')}</select></div>
        <div class="conf-filter-field conf-filter-field--search">
          <label>Search</label>
          <div class="input-wrap"><span class="input-wrap__icon">${ICON.search}</span><input class="input" id="bkfSearch" placeholder="Family, child or teacher…" value="${escapeHtml(bookingsFilter.search)}" /></div>
        </div>
      </div>
      <div id="bookingsResults"></div>
    `;
    $('bkfFrom').addEventListener('input', () => { bookingsFilter.dateFrom = $('bkfFrom').value; renderBookingsResults(); });
    $('bkfTo').addEventListener('input', () => { bookingsFilter.dateTo = $('bkfTo').value; renderBookingsResults(); });
    $('bkfTeacher').addEventListener('change', () => { bookingsFilter.teacherId = $('bkfTeacher').value; renderBookingsResults(); });
    $('bkfMode').addEventListener('change', () => { bookingsFilter.mode = $('bkfMode').value; renderBookingsResults(); });
    $('bkfStatus').addEventListener('change', () => { bookingsFilter.status = $('bkfStatus').value; renderBookingsResults(); });
    $('bkfSearch').addEventListener('input', () => { bookingsFilter.search = $('bkfSearch').value; renderBookingsResults(); });
    renderBookingsResults();
  }
  function filteredBookings() {
    let list = allBookings();
    const f = bookingsFilter;
    if (f.dateFrom) list = list.filter((b) => b.date >= f.dateFrom);
    if (f.dateTo) list = list.filter((b) => b.date <= f.dateTo);
    if (f.teacherId) list = list.filter((b) => b.teacherId === f.teacherId);
    if (f.mode) list = list.filter((b) => b.mode === f.mode);
    if (f.status) list = list.filter((b) => b.status === f.status);
    if (f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      list = list.filter((b) => [familyName(b.familyId), childName(b.childId), teacherName(b.teacherId)].some((n) => n.toLowerCase().includes(q)));
    }
    return list.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  }
  function statusBadgeHtml(status) {
    if (status === 'Upcoming') return `<span class="badge badge--primary">Upcoming</span>`;
    if (status === 'Completed') return `<span class="badge badge--success">Completed</span>`;
    return `<span class="badge badge--neutral">Cancelled</span>`;
  }
  function modeBadgeHtml(mode) { return `<span class="conf-mode-badge">${mode === 'Video' ? ICON.video : ICON.mapPin}${escapeHtml(mode)}</span>`; }
  function renderBookingsResults() {
    const list = filteredBookings();
    const el = $('bookingsResults');
    if (!list.length) { el.innerHTML = `<div class="state-panel"><div class="state-panel__icon">${ICON.calendar}</div><div class="state-panel__title">No bookings match</div><p class="state-panel__text">Try a different filter, or book a meeting for a family.</p></div>`; return; }
    const byDate = new Map();
    list.forEach((b) => { if (!byDate.has(b.date)) byDate.set(b.date, []); byDate.get(b.date).push(b); });
    el.innerHTML = [...byDate.keys()].sort().map((date) => {
      const rows = byDate.get(date);
      return `
        <div class="conf-date-group">
          <div class="conf-date-group__label">${formatDate(date)}</div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Time</th><th>Family</th><th>Child</th><th>Teacher</th><th>Mode</th><th>Status</th></tr></thead>
              <tbody>${rows.map((b) => `
                <tr class="frm-row" data-booking="${b.id}">
                  <td class="cell-primary">${formatTime12(b.startTime)}</td>
                  <td>${escapeHtml(familyName(b.familyId))}</td>
                  <td class="cell-muted">${escapeHtml(childName(b.childId))}</td>
                  <td class="cell-muted">${escapeHtml(teacherName(b.teacherId))}</td>
                  <td>${modeBadgeHtml(b.mode)}</td>
                  <td>${statusBadgeHtml(b.status)}</td>
                </tr>`).join('')}</tbody>
            </table>
            <div class="table-card">${rows.map((b) => `
              <div class="table-card__item frm-card" data-booking="${b.id}">
                <div class="table-card__head"><span class="cell-primary">${formatTime12(b.startTime)} · ${escapeHtml(familyName(b.familyId))}</span>${statusBadgeHtml(b.status)}</div>
                <div class="table-card__row"><span class="table-card__label">Child</span><span class="table-card__value">${escapeHtml(childName(b.childId))}</span></div>
                <div class="table-card__row"><span class="table-card__label">Teacher</span><span class="table-card__value">${escapeHtml(teacherName(b.teacherId))}</span></div>
                <div class="table-card__row"><span class="table-card__label">Mode</span><span class="table-card__value">${modeBadgeHtml(b.mode)}</span></div>
              </div>`).join('')}</div>
          </div>
        </div>`;
    }).join('');
    el.querySelectorAll('[data-booking]').forEach((row) => row.addEventListener('click', () => openBookingDrawer(row.dataset.booking)));
  }

  /* ========================================================================
     BOOKING DETAIL DRAWER
     ======================================================================== */
  function wireBookingDrawer() {
    const backdrop = $('bookingDrawerBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('bookingDrawerBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('bookingDrawerBackdrop'); });
  }
  function openBookingDrawer(bookingId) {
    activeDrawerBookingId = bookingId;
    renderBookingDrawer();
    openModal('bookingDrawerBackdrop');
  }
  function renderBookingDrawer() {
    const b = getById(activeDrawerBookingId);
    if (!b) return;
    const record = window.PlayStore.getByType('ConferenceRecord').find((r) => r.bookingId === b.id);
    $('bookingDrawerTitle').textContent = familyName(b.familyId) + ' · ' + childName(b.childId);
    $('bookingDrawerBody').innerHTML = `
      <div style="margin-bottom: var(--space-4);">${statusBadgeHtml(b.status)}</div>
      <div class="ann-drawer-meta">
        <div><span>Date &amp; time</span><b>${formatDate(b.date)} · ${formatTime12(b.startTime)}–${formatTime12(b.endTime)}</b></div>
        <div><span>Teacher</span><b>${escapeHtml(teacherName(b.teacherId))}</b></div>
        <div><span>Mode</span><b>${modeBadgeHtml(b.mode)}</b></div>
        <div><span>Note</span><b>${escapeHtml(b.note || '—')}</b></div>
      </div>
      ${b.status === 'Cancelled' ? `<p class="ws-section-empty">Cancelled ${b.cancelledAt ? new Date(b.cancelledAt).toLocaleString() : ''}${b.cancelReason ? ' — ' + escapeHtml(b.cancelReason) : ''}.</p>` : ''}
      <div class="conf-record-links" style="margin-top: var(--space-5);">
        <a href="record.html?id=${encodeURIComponent(b.childId)}">View child profile (S13)</a>
        <a href="record.html?id=${encodeURIComponent(b.childId)}&tab=learning">View learning plan (S29)</a>
      </div>
      ${record ? `<p class="ws-section-empty">${record.sharedWithFamily ? 'A conference record exists and is shared with the family.' : 'A conference record exists and is private to staff.'}</p>` : ''}
    `;
    const actions = [];
    if (b.status !== 'Cancelled') {
      actions.push(`<button class="btn btn--accent" type="button" id="drawerRecordBtn">${record ? 'View / edit record' : 'Add conference record'}</button>`);
    }
    if (b.status === 'Upcoming') actions.push(`<button class="btn btn--destructive" type="button" id="drawerCancelBtn">Cancel booking</button>`);
    $('bookingDrawerActions').innerHTML = actions.join('');
    const recordBtn = $('drawerRecordBtn'); if (recordBtn) recordBtn.addEventListener('click', () => openRecordModal(b.id));
    const cancelBtn = $('drawerCancelBtn'); if (cancelBtn) cancelBtn.addEventListener('click', () => {
      openConfirm('Cancel booking?', `This cancels the meeting with ${familyName(b.familyId)} for ${childName(b.childId)} with ${teacherName(b.teacherId)} on ${formatDate(b.date)} at ${formatTime12(b.startTime)}, and releases the slot for other families. Please inform the family separately.`, 'Cancel booking', 'btn--destructive', () => doCancelBooking(b.id));
    });
  }

  /* ========================================================================
     CONFERENCE RECORD EDITOR
     ======================================================================== */
  function openRecordModal(bookingId) {
    const booking = getById(bookingId);
    const existing = window.PlayStore.getByType('ConferenceRecord').find((r) => r.bookingId === bookingId);
    recordEditState = existing
      ? JSON.parse(JSON.stringify(existing))
      : { id: null, bookingId, familyId: booking.familyId, childId: booking.childId, teacherId: booking.teacherId, date: booking.date, startTime: booking.startTime, mode: booking.mode, notes: '', actions: [], followUpDate: '', sharedWithFamily: false };
    $('recordModalTitle').textContent = existing ? 'Edit conference record' : 'Add conference record';
    renderRecordBody();
    openModal('recordModalBackdrop');
  }
  function renderRecordBody() {
    const r = recordEditState;
    $('recordBody').innerHTML = `
      <p class="ws-section-empty" style="padding:0 0 var(--space-4);">${escapeHtml(familyName(r.familyId))} · ${escapeHtml(childName(r.childId))} · ${escapeHtml(teacherName(r.teacherId))} · ${formatDate(r.date)} · ${escapeHtml(r.mode)}</p>
      <div class="field"><label class="field__label" for="recNotes">Discussion notes</label><textarea class="textarea" id="recNotes" rows="5" placeholder="What did you discuss?">${escapeHtml(r.notes)}</textarea></div>
      <div class="field" style="margin-top: var(--space-4);">
        <label class="field__label">Agreed actions</label>
        <div class="conf-actions-list" id="recActionsList">${r.actions.map((a) => actionRowHtml(a)).join('')}</div>
        <button class="conf-action-add" type="button" id="recAddAction" style="margin-top: var(--space-2);">${ICON.plus}<span>Add action</span></button>
      </div>
      <div class="field" style="margin-top: var(--space-4);"><label class="field__label" for="recFollowUp">Follow-up date</label><input class="input" id="recFollowUp" type="date" value="${r.followUpDate || ''}" /></div>
      <label class="cls-toggle-row" style="margin-top: var(--space-4);">
        <span class="toggle"><input type="checkbox" id="recShare" ${r.sharedWithFamily ? 'checked' : ''} /><span class="toggle__track"><span class="toggle__thumb"></span></span></span>
        <span><span class="cls-toggle-row__label">Share with family</span><span class="cls-toggle-row__hint">${r.sharedWithFamily ? 'This record is shared — the family can see these notes and actions (demo).' : 'This record is private to staff.'}</span></span>
      </label>
    `;
    $('recNotes').addEventListener('input', () => { r.notes = $('recNotes').value; });
    $('recFollowUp').addEventListener('input', () => { r.followUpDate = $('recFollowUp').value; });
    $('recAddAction').addEventListener('click', () => { r.actions.push({ id: uid('ACT'), description: '', owner: '', dueDate: '', done: false }); renderRecordBody(); });
    wireActionRows();
    $('recShare').addEventListener('change', () => {
      const checked = $('recShare').checked;
      if (checked) {
        openConfirm('Share this record with the family?', `${familyName(r.familyId)} will be able to see these notes and agreed actions. This is a demo confirmation — no real parent-facing delivery exists in this project.`, 'Share record', 'btn--accent',
          () => { r.sharedWithFamily = true; renderRecordBody(); },
          () => { r.sharedWithFamily = false; renderRecordBody(); });
      } else { r.sharedWithFamily = false; renderRecordBody(); }
    });
  }
  function actionRowHtml(a) {
    return `
      <div class="conf-action-row" data-action="${a.id}">
        <div class="conf-action-row__check"><span class="toggle"><input type="checkbox" data-field="done" ${a.done ? 'checked' : ''} /><span class="toggle__track"><span class="toggle__thumb"></span></span></span></div>
        <div class="conf-action-row__fields">
          <input class="input" data-field="description" placeholder="Agreed action…" value="${escapeHtml(a.description)}" />
          <div class="conf-action-row__fields-row">
            <input class="input" data-field="owner" placeholder="Owner" value="${escapeHtml(a.owner)}" />
            <input class="input" data-field="dueDate" type="date" value="${a.dueDate || ''}" />
          </div>
          <button class="conf-action-add conf-action-row__remove" type="button" data-remove-action>${ICON.trash}<span>Remove</span></button>
        </div>
      </div>`;
  }
  function wireActionRows() {
    $('recActionsList').querySelectorAll('.conf-action-row').forEach((row) => {
      const id = row.dataset.action;
      const action = recordEditState.actions.find((a) => a.id === id);
      row.querySelector('[data-field="done"]').addEventListener('change', (e) => { action.done = e.target.checked; });
      row.querySelector('[data-field="description"]').addEventListener('input', (e) => { action.description = e.target.value; });
      row.querySelector('[data-field="owner"]').addEventListener('input', (e) => { action.owner = e.target.value; });
      row.querySelector('[data-field="dueDate"]').addEventListener('input', (e) => { action.dueDate = e.target.value; });
      row.querySelector('[data-remove-action]').addEventListener('click', () => { recordEditState.actions = recordEditState.actions.filter((a) => a.id !== id); renderRecordBody(); });
    });
  }
  function wireRecordModal() {
    const backdrop = $('recordModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('recordModalBackdrop'); });
    $('recordCancelBtn').addEventListener('click', () => closeModal('recordModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('recordModalBackdrop'); });
    $('recordSaveBtn').addEventListener('click', () => {
      const r = recordEditState;
      const now = new Date().toISOString();
      if (r.id) {
        window.PlayStore.updateRecord(r.id, { notes: r.notes, actions: r.actions, followUpDate: r.followUpDate || null, sharedWithFamily: r.sharedWithFamily, updatedAt: now });
      } else {
        const saved = window.PlayStore.addRecord({
          id: uid('CREC'), type: 'ConferenceRecord', bookingId: r.bookingId, familyId: r.familyId, childId: r.childId, teacherId: r.teacherId,
          date: r.date, startTime: r.startTime, mode: r.mode, notes: r.notes, actions: r.actions, followUpDate: r.followUpDate || null,
          sharedWithFamily: r.sharedWithFamily, createdAt: now, updatedAt: now,
        });
        r.id = saved.id;
        const booking = getById(r.bookingId);
        if (booking && booking.status === 'Upcoming') window.PlayStore.updateRecord(booking.id, { status: 'Completed' });
      }
      closeModal('recordModalBackdrop');
      window.PlayShell.toast('success', 'Conference record saved', `${familyName(r.familyId)} · ${childName(r.childId)}`);
      if (activeDrawerBookingId === r.bookingId && $('bookingDrawerBackdrop').classList.contains('is-open')) renderBookingDrawer();
      refreshAll();
    });
  }

  /* ========================================================================
     CONFERENCE RECORDS TAB
     ======================================================================== */
  function followUpChipHtml(date) {
    if (!date) return `<span class="conf-followup-chip is-none">No follow-up</span>`;
    if (date < todayISO()) return `<span class="conf-followup-chip is-overdue">${ICON.clock} Overdue ${formatDate(date)}</span>`;
    return `<span class="conf-followup-chip is-upcoming">${ICON.calendar} Due ${formatDate(date)}</span>`;
  }
  function renderRecords() {
    const panel = $('confTabPanel');
    const records = window.PlayStore.getByType('ConferenceRecord').slice().sort((a, b) => b.date.localeCompare(a.date));
    if (!records.length) {
      panel.innerHTML = `<div class="state-panel"><div class="state-panel__icon">${ICON.inbox}</div><div class="state-panel__title">No conference records yet</div><p class="state-panel__text">Add a record from a booking in the Bookings tab once a meeting has taken place.</p></div>`;
      return;
    }
    panel.innerHTML = `<div class="conf-record-grid">${records.map((r, idx) => {
      const done = r.actions.filter((a) => a.done).length;
      return `
        <div class="conf-record-card" data-record-booking="${r.bookingId}" style="animation-delay:${Math.min(idx, 8) * 40}ms;">
          <div class="conf-record-card__head">
            <div><div class="conf-record-card__title">${escapeHtml(childName(r.childId))}</div><div class="conf-record-card__meta">${escapeHtml(familyName(r.familyId))} · ${formatDate(r.date)}</div></div>
            <span class="badge ${r.sharedWithFamily ? 'badge--success' : 'badge--neutral'}">${r.sharedWithFamily ? 'Shared' : 'Private'}</span>
          </div>
          <p class="conf-record-card__notes">${escapeHtml(r.notes || 'No notes recorded.')}</p>
          <div class="conf-record-card__foot">
            <span class="conf-mode-badge">${teacherName(r.teacherId)} · ${r.actions.length ? done + '/' + r.actions.length + ' actions done' : 'No actions'}</span>
            ${followUpChipHtml(r.followUpDate)}
          </div>
          <div class="conf-record-links">
            <a href="record.html?id=${encodeURIComponent(r.childId)}" data-stop>View child profile (S13)</a>
            <a href="record.html?id=${encodeURIComponent(r.childId)}&tab=learning" data-stop>View learning plan (S29)</a>
          </div>
        </div>`;
    }).join('')}</div>`;
    panel.querySelectorAll('[data-record-booking]').forEach((card) => card.addEventListener('click', (e) => { if (e.target.closest('[data-stop]')) return; openRecordModal(card.dataset.recordBooking); }));
  }
})();
