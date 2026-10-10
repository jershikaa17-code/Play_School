/* ==========================================================================
   PLAY SCHOOL — Live Attendance & Collection
   Reuses: store.js (records — attendance entries are type 'Attendance', the
   same type dashboard.js already writes from its "Mark attendance" quick
   action; children/classes/authorised-pickup data come from the same shared
   store), shell.js (shell/toast/notifications), modules.js (plan gating —
   this page is the real implementation behind the existing "Attendance &
   Check-in" module, which stays Standard-plan gated like before).

   SECURITY NOTE (read before relying on this for real safeguarding):
   This is a static, backend-less demo. Pickup passcodes and restriction
   flags are plain fields in the same client-visible store as everything
   else — verification happens in the browser, which means a determined
   user with devtools access could inspect or bypass it. The UI enforces
   every rule in this file (no selectable restricted person, no bypass for
   "Someone else", no checkout without a verified passcode), but production
   use of this feature would require the same rules enforced server-side.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function nowTimeStr() { const d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function addDaysISO(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function parseISODate(iso) { return new Date(iso + 'T00:00:00'); }
  function formatTime12(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + pad2(m) + ' ' + period;
  }
  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/);
    if (!parts.length || !parts[0]) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  function firstName(name) { return String(name || '').trim().split(/\s+/)[0] || name; }

  const ICON = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  };

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'not-arrived', label: 'Not arrived' },
    { key: 'in', label: 'In' },
    { key: 'out', label: 'Out' },
    { key: 'absent', label: 'Absent' },
  ];
  const STATUS_LABEL = { 'not-arrived': 'Not arrived', in: 'In', out: 'Out', absent: 'Absent' };
  const REASON_OPTIONS = ['Sick', 'Holiday', 'Unknown', 'Other'];

  /* ---------- page state ---------- */
  let selectedClassId = null;
  let selectedDate = todayISO();
  let activeFilter = 'all';
  const selectedChildIds = new Set();
  let role = window.PlayShell.getDemoRole();

  let checkinContext = null;
  let checkoutContext = null; let checkoutSelectedPickup = null; let checkoutPasscodeVerified = false;
  let absenceContext = null; let absenceReason = null;
  let bulkAbsenceReason = null;
  let pendingUndo = null; // { ids: [{id, updatedAt}], timeoutId }
  let reminderTicker = null;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', (e) => { role = e.detail.role; render(); });

  function init() {
    window.PlayShell.login();
    window.PlayShell.mount('attendance', 'Live Attendance');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    if (!isModuleUnlocked()) { renderLocked(); return; }
    $('attMain').hidden = false;

    const classes = classOptions();
    selectedClassId = classes.length ? classes[0].id : null;
    populateClassSelect();
    $('attDateInput').value = selectedDate;

    wireToolbar();
    wireFilters();
    wireCheckinModal();
    wireCheckoutModal();
    wireDetailsModal();
    wireAbsenceModal();
    wireBulkAbsenceModal();
    wireGlobalMenuClose();

    seedTodayDemoIfNeeded();

    window.setTimeout(() => {
      $('attSkeleton').hidden = true;
      $('attGrid').hidden = false;
      render();
      startReminderTicker();
    }, 400);
  }

  /* ---------- one-time demo seed for "today" ----------
     Hand-authored seed data only ever covers a handful of attendance
     records from earlier testing, so a fresh visitor on a new real-world
     date would see every class sitting at all-not-arrived. This generates
     one realistic, varied attendance picture per class for today only —
     through the exact same performCheckIn/performCheckOut/performAbsence
     functions a teacher's click would call, so the resulting records are
     identical in shape to real ones. Gated by a per-date localStorage flag
     so it only ever runs once and never overwrites real interactions. */
  function seedTodayDemoIfNeeded() {
    const date = todayISO();
    const flagKey = 'ps_att_demo_seeded_' + date;
    try { if (localStorage.getItem(flagKey)) return; } catch (e) { return; }
    if (window.PlayStore.getByType('Attendance').some((a) => a.date === date)) {
      try { localStorage.setItem(flagKey, '1'); } catch (e) { /* ignore */ }
      return;
    }
    const realClassId = selectedClassId;
    const realDate = selectedDate;
    selectedDate = date;
    classOptions().forEach((cls) => {
      selectedClassId = cls.id;
      const children = window.PlayStore.getByType('Child').filter((c) => c.room === cls.name && c.status === 'Active');
      children.forEach((child, idx) => {
        const bucket = idx % 10;
        if (bucket < 7) {
          performCheckIn(child, pad2(7 + (idx % 2)) + ':' + pad2((idx * 11) % 60), null);
        } else if (bucket === 7) {
          performCheckIn(child, '08:0' + (idx % 5), null);
          performCheckOut(child, (child.authorizedPickups && child.authorizedPickups[0]) || { id: null, name: 'Guardian', relation: '' });
        } else if (bucket === 8) {
          performAbsence(child, ['Sick', 'Holiday', 'Other'][idx % 3], '');
        }
        // the remaining ~10% are left with no record — a realistic "not arrived yet"
      });
    });
    selectedClassId = realClassId;
    selectedDate = realDate;
    try { localStorage.setItem(flagKey, '1'); } catch (e) { /* ignore */ }
  }

  /* ---------- plan gating (this page is the real "Attendance & Check-in" module) ---------- */
  function isModuleUnlocked() {
    if (!window.PlayModules) return true;
    const mod = window.PlayModules.getById('attendance');
    if (!mod) return true;
    return window.PlayModules.isUnlocked(mod, window.PlayModules.getCurrentPlan());
  }
  function renderLocked() {
    $('attLocked').hidden = false;
    $('attLockedIcon').innerHTML = ICON.lock;
    const isAdminish = role === 'Director' || role === 'Admin';
    $('attLockedAction').innerHTML = isAdminish
      ? `<a class="btn btn--accent" href="plans.html?module=attendance&role=${encodeURIComponent(role)}">See plans &amp; upgrade</a>`
      : `<a class="btn btn--secondary" href="module.html?id=attendance&role=${encodeURIComponent(role)}">Ask my admin to upgrade</a>`;
  }

  /* ---------- current staff identity ----------
     This demo has a single hardcoded signed-in identity ("Nithya", shown in
     the sidebar footer regardless of which demo role is selected) — there is
     no real per-user auth to pull a distinct staff id from, so that is what
     "the actual authenticated staff identity" resolves to here. */
  function currentStaff() { return { id: 'S-3001', name: 'Nithya' }; }

  /* ---------- data helpers ---------- */
  function classOptions() { return window.PlayStore.getByType('Class'); }
  function classById(id) { return window.PlayStore.getById(id); }
  function classNameById(id) { const c = classById(id); return c ? c.name : ''; }
  function childrenInSelectedClass() {
    const className = classNameById(selectedClassId);
    return window.PlayStore.getByType('Child').filter((c) => c.room === className && c.status === 'Active').sort((a, b) => a.name.localeCompare(b.name));
  }
  function attendanceRecord(childId, date) {
    return window.PlayStore.getByType('Attendance').find((a) => a.childId === childId && a.date === date) || null;
  }
  function deriveStatus(record) {
    if (!record) return 'not-arrived';
    if (record.status === 'Absent') return 'absent';
    if (record.checkOutTime) return 'out';
    return 'in';
  }
  function staffCountForClass(className) {
    return window.PlayStore.getByType('Staff').filter((s) => s.relation && s.relation.indexOf(className) !== -1).length;
  }
  function classRatioLimit() { return window.PlayStore.getSettings().classRatioLimit || 10; }

  /* ---------- holiday / closure detection (reuses Calendar's Event records) ----------
     A lightweight same-day-range check — calendar.js owns the full recurrence
     engine; this only needs to answer "is this one date covered", matching
     the same lightweight-preview precedent already used on the dashboard and
     child record page. */
  function holidayFor(classId, dateISO) {
    const d = parseISODate(dateISO);
    const events = window.PlayStore.getByType('Event').filter((e) => e.eventType === 'holiday' || e.eventType === 'closure');
    for (let i = 0; i < events.length; i += 1) {
      const ev = events[i];
      if (ev.classIds && ev.classIds.length && classId && ev.classIds.indexOf(classId) === -1) continue;
      if (ev.recurrence && ev.recurrence.freq && ev.recurrence.freq !== 'none') continue; // seed data holidays are one-off; keep this check simple and honest
      const start = parseISODate(ev.startDate);
      const end = parseISODate(ev.endDate || ev.startDate);
      if (d >= start && d <= end) return ev;
    }
    return null;
  }

  function isLate(classId, timeStr) {
    const cls = classById(classId);
    if (!cls || !cls.startTime) return false;
    return timeStr > cls.startTime;
  }

  /* ---------- mutations ---------- */
  function upsertAttendance(child, patch) {
    const existing = attendanceRecord(child.id, selectedDate);
    const now = new Date().toISOString();
    if (existing) { window.PlayStore.updateRecord(existing.id, Object.assign({}, patch, { updatedAt: now })); return window.PlayStore.getById(existing.id); }
    return window.PlayStore.addRecord(Object.assign(
      { id: 'ATT-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5), type: 'Attendance', childId: child.id, childName: child.name, classId: selectedClassId, date: selectedDate, createdAt: now, updatedAt: now },
      patch
    ));
  }

  function performCheckIn(child, time, droppedBy) {
    const staff = currentStaff();
    const late = isLate(selectedClassId, time);
    return upsertAttendance(child, {
      status: late ? 'Late' : 'Present',
      checkInTime: time, checkInStaffId: staff.id, checkInStaffName: staff.name, lateArrival: late,
      checkOutTime: null, checkOutStaffId: null, checkOutStaffName: null,
      pickupPersonId: null, pickupPersonName: null, pickupRelation: null,
      droppedById: (droppedBy && droppedBy.id) || null, droppedByName: (droppedBy && droppedBy.name) || null,
      absenceReason: null, absenceNote: null,
    });
  }
  function performCheckOut(child, pickup) {
    const record = attendanceRecord(child.id, selectedDate);
    if (!record || deriveStatus(record) !== 'in') return null; // fail safe: must currently be checked in
    const staff = currentStaff();
    window.PlayStore.updateRecord(record.id, {
      checkOutTime: nowTimeStr(), checkOutStaffId: staff.id, checkOutStaffName: staff.name,
      pickupPersonId: pickup.id, pickupPersonName: pickup.name, pickupRelation: pickup.relation,
      updatedAt: new Date().toISOString(),
    });
    return window.PlayStore.getById(record.id);
  }
  function performAbsence(child, reason, note) {
    const staff = currentStaff();
    const existing = attendanceRecord(child.id, selectedDate);
    return upsertAttendance(child, {
      status: 'Absent', absenceReason: reason, absenceNote: note,
      absenceStaffId: staff.id, absenceStaffName: staff.name,
      checkInTime: null, checkOutTime: null, lateArrival: false,
      unknownReminderSent: reason === 'Unknown' ? !!(existing && existing.unknownReminderSent) : false,
    });
  }

  /* ---------- "contact family after 10:00" reminder for Unknown absences ----------
     No scheduling/cron infrastructure exists in this static project, so this
     checks on load and every 60s while the page stays open — a real, honest
     best effort, not a true server-side scheduled job. A dedupe flag on the
     record stops it firing twice for the same entry. */
  function startReminderTicker() {
    checkUnknownReminders();
    reminderTicker = window.setInterval(checkUnknownReminders, 60000);
  }
  function checkUnknownReminders() {
    const now = new Date();
    if (now.getHours() < 10) return;
    const today = todayISO();
    window.PlayStore.getByType('Attendance')
      .filter((a) => a.date === today && a.absenceReason === 'Unknown' && !a.unknownReminderSent)
      .forEach((a) => {
        window.PlayShell.addNotification({
          title: 'Unexplained absence — contact family',
          text: `${a.childName} is marked absent for an unknown reason and it's now past 10:00. Please contact the family.`,
          module: null, mention: true, recordRoute: 'attendance.html',
        });
        window.PlayStore.updateRecord(a.id, { unknownReminderSent: true });
      });
  }

  /* ---------- render orchestration ---------- */
  function render() {
    populateClassSelect();
    const className = classNameById(selectedClassId);
    const holiday = holidayFor(selectedClassId, selectedDate);
    const allChildren = childrenInSelectedClass();
    const expected = holiday ? [] : allChildren;

    const showControls = !holiday && allChildren.length > 0;
    $('attCounters').hidden = !showControls;
    $('attFilters').hidden = !showControls;
    $('attBulkBar').hidden = !showControls;
    if (showControls) { renderCounters(expected); renderFilters(expected); } else { $('attCounters').innerHTML = ''; }

    Array.from(selectedChildIds).forEach((id) => { if (!expected.some((c) => c.id === id)) selectedChildIds.delete(id); });
    if (showControls) renderBulkBar(expected);

    const filtered = expected.filter((c) => activeFilter === 'all' || deriveStatus(attendanceRecord(c.id, selectedDate)) === activeFilter);

    if (!allChildren.length) {
      showEmpty('inbox', 'No children in this class', `There are no active children enrolled in ${escapeHtml(className)}.`, '');
    } else if (holiday) {
      showEmpty('sun', holiday.title, `No attendance is expected for ${formatDateLong(selectedDate)} — ${escapeHtml(holiday.eventType === 'holiday' ? 'school holiday' : 'school closure')}.`, '');
    } else if (!filtered.length) {
      showEmpty('inbox', 'No children match this filter', 'Try a different filter.', '<button class="btn btn--secondary" type="button" id="attClearFilterBtn">Clear filter</button>');
      const btn = $('attClearFilterBtn');
      if (btn) btn.addEventListener('click', () => { activeFilter = 'all'; render(); });
    } else {
      $('attEmptyState').hidden = true;
    }

    if (holiday || !allChildren.length || !filtered.length) { $('attGrid').innerHTML = ''; $('attGrid').hidden = true; }
    else { $('attGrid').hidden = false; renderGrid(filtered); }
  }

  function formatDateLong(iso) { return parseISODate(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }

  function showEmpty(iconKey, title, text, actionHtml) {
    $('attEmptyState').hidden = false;
    $('attEmptyIcon').innerHTML = ICON[iconKey] || ICON.inbox;
    $('attEmptyTitle').textContent = title;
    $('attEmptyText').textContent = text;
    $('attEmptyAction').innerHTML = actionHtml || '';
  }

  function populateClassSelect() {
    const sel = $('attClassSelect');
    const classes = classOptions();
    const html = classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    if (sel.innerHTML !== html) sel.innerHTML = html;
    if (selectedClassId) sel.value = selectedClassId;
  }

  function wireToolbar() {
    $('attClassSelect').addEventListener('change', () => { selectedClassId = $('attClassSelect').value; selectedChildIds.clear(); render(); });
    $('attDateInput').addEventListener('change', () => { selectedDate = $('attDateInput').value || todayISO(); render(); });
    $('attPrevDay').addEventListener('click', () => { selectedDate = addDaysISO(selectedDate, -1); $('attDateInput').value = selectedDate; render(); });
    $('attNextDay').addEventListener('click', () => { selectedDate = addDaysISO(selectedDate, 1); $('attDateInput').value = selectedDate; render(); });
    $('attTodayBtn').addEventListener('click', () => { selectedDate = todayISO(); $('attDateInput').value = selectedDate; render(); });
  }

  /* ---------- counters + ratio ---------- */
  function renderCounters(expected) {
    const counts = { 'not-arrived': 0, in: 0, out: 0, absent: 0 };
    expected.forEach((c) => { counts[deriveStatus(attendanceRecord(c.id, selectedDate))] += 1; });
    const className = classNameById(selectedClassId);
    const staffCount = Math.max(staffCountForClass(className), 1);
    const limit = classRatioLimit();
    const ratio = counts.in / staffCount;
    const over = counts.in > 0 && ratio > limit;
    const pct = expected.length ? Math.round(((counts.in + counts.out) / expected.length) * 100) : null;

    $('attCounters').innerHTML = `
      <div class="att-counter att-counter--expected"><span class="att-counter__value">${expected.length}</span><span class="att-counter__label">Expected</span></div>
      <div class="att-counter att-counter--in"><span class="att-counter__value">${counts.in}</span><span class="att-counter__label">In</span></div>
      <div class="att-counter att-counter--out"><span class="att-counter__value">${counts.out}</span><span class="att-counter__label">Out</span></div>
      <div class="att-counter att-counter--absent"><span class="att-counter__value">${counts.absent}</span><span class="att-counter__label">Absent</span></div>
      <div class="att-counter att-counter--ratio${over ? ' is-over' : ''}" title="Children currently in the building, per staff member assigned to ${escapeHtml(className)}">
        <span class="att-counter__value">${counts.in}:${staffCount}</span><span class="att-counter__label">Live ratio${over ? ' (over 1:' + limit + ')' : ''}</span>
      </div>
      ${expected.length ? `<div class="att-counter"><span class="att-counter__value">${pct}%</span><span class="att-counter__label">Arrived or departed</span></div>` : ''}
    `;
  }

  /* ---------- filter chips ---------- */
  function renderFilters(expected) {
    const counts = { all: expected.length, 'not-arrived': 0, in: 0, out: 0, absent: 0 };
    expected.forEach((c) => { counts[deriveStatus(attendanceRecord(c.id, selectedDate))] += 1; });
    $('attFilters').innerHTML = FILTERS.map((f) => `
      <button class="att-filter-chip" type="button" data-filter="${f.key}" role="tab" aria-selected="${activeFilter === f.key}">${f.label} <span class="att-filter-chip__count">${counts[f.key]}</span></button>
    `).join('');
  }
  function wireFilters() {
    $('attFilters').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      activeFilter = btn.dataset.filter;
      render();
    });
  }

  /* ---------- bulk bar ---------- */
  function renderBulkBar(expected) {
    const notArrivedCount = expected.filter((c) => deriveStatus(attendanceRecord(c.id, selectedDate)) === 'not-arrived').length;
    const selCount = selectedChildIds.size;
    $('attBulkBar').innerHTML = `
      ${selCount ? `<span class="att-bulkbar__count">${selCount} selected</span>` : '<span class="att-bulkbar__count">Select tiles to mark them absent together</span>'}
      <button class="btn btn--secondary btn--sm" type="button" id="attMarkAllPresentBtn" ${notArrivedCount ? '' : 'disabled'}>Mark all present (${notArrivedCount})</button>
      <button class="btn btn--destructive btn--sm" type="button" id="attMarkSelectedAbsentBtn" ${selCount ? '' : 'disabled'}>Mark selected absent</button>
    `;
    $('attMarkAllPresentBtn').addEventListener('click', markAllPresent);
    $('attMarkSelectedAbsentBtn').addEventListener('click', openBulkAbsenceModal);
  }

  function markAllPresent() {
    const expected = childrenInSelectedClass();
    const eligible = expected.filter((c) => deriveStatus(attendanceRecord(c.id, selectedDate)) === 'not-arrived');
    if (!eligible.length) return;
    const time = nowTimeStr();
    const created = eligible.map((c) => {
      const rec = performCheckIn(c, time, null);
      return { id: rec.id, updatedAt: rec.updatedAt };
    });
    render();
    window.PlayShell.toast('success', 'Marked all present', `${created.length} ${created.length === 1 ? 'child' : 'children'} checked in at ${formatTime12(time)}.`);
    showUndoBar(`${created.length} checked in just now.`, created);
  }
  function showUndoBar(text, created) {
    if (pendingUndo && pendingUndo.timeoutId) window.clearTimeout(pendingUndo.timeoutId);
    pendingUndo = { ids: created };
    $('attUndoText').textContent = text;
    $('attUndoBar').hidden = false;
    pendingUndo.timeoutId = window.setTimeout(() => { $('attUndoBar').hidden = true; pendingUndo = null; }, 5000);
  }
  function wireGlobalMenuClose() {
    $('attUndoBtn').addEventListener('click', () => {
      if (!pendingUndo) return;
      window.clearTimeout(pendingUndo.timeoutId);
      let undone = 0; let skipped = 0;
      pendingUndo.ids.forEach((snap) => {
        const current = window.PlayStore.getById(snap.id);
        if (!current) return;
        if (current.updatedAt !== snap.updatedAt) { skipped += 1; return; } // changed since — unsafe to blindly undo
        window.PlayStore.removeRecord(snap.id);
        undone += 1;
      });
      pendingUndo = null;
      $('attUndoBar').hidden = true;
      render();
      if (skipped) window.PlayShell.toast('info', 'Partially undone', `${undone} reverted. ${skipped} ${skipped === 1 ? 'was' : 'were'} already updated since and left as-is.`);
      else window.PlayShell.toast('success', 'Undone', `${undone} check-in${undone === 1 ? '' : 's'} reverted.`);
    });
    document.addEventListener('click', () => { document.querySelectorAll('.att-tile__menu.is-open').forEach((m) => m.classList.remove('is-open')); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.att-tile__menu.is-open').forEach((m) => m.classList.remove('is-open')); });
  }

  /* ---------- tile grid ---------- */
  function avatarHtml(child, sizeClass) {
    return `<span class="${sizeClass}">${escapeHtml(initials(child.name))}</span>`;
  }
  function tileHtml(child) {
    const record = attendanceRecord(child.id, selectedDate);
    const status = deriveStatus(record);
    const late = record && record.lateArrival;
    const hasAlert = (child.alerts || []).some((a) => a.type === 'allergy' || a.type === 'medical' || a.type === 'custody');
    const selected = selectedChildIds.has(child.id);
    let timeLine = '';
    if (status === 'in') timeLine = `In ${formatTime12(record.checkInTime)}`;
    else if (status === 'out') timeLine = `Out ${formatTime12(record.checkOutTime)}`;
    else if (status === 'absent') timeLine = record.absenceReason || '';

    return `
      <div class="att-tile att-tile--${status}" data-tile="${child.id}" tabindex="0" role="button" aria-label="${escapeHtml(child.name)} — ${STATUS_LABEL[status]}">
        <input type="checkbox" class="checkbox att-tile__select" data-select="${child.id}" ${selected ? 'checked' : ''} aria-label="Select ${escapeHtml(child.name)}" />
        <span class="popover att-tile__menu" data-menu="${child.id}">
          <button class="att-tile__menu-trigger" type="button" data-menu-trigger aria-haspopup="true" aria-expanded="false" aria-label="More actions for ${escapeHtml(child.name)}">${ICON.dots}</button>
          ${menuPanelHtml(status)}
        </span>
        <div class="att-tile__avatar">
          ${escapeHtml(initials(child.name))}
          ${late ? `<span class="att-tile__late" title="Late arrival">${ICON.clock}</span>` : ''}
          ${hasAlert ? `<span class="att-tile__alert" title="Has a safety alert on file">${ICON.alert}</span>` : ''}
        </div>
        <div class="att-tile__name">${escapeHtml(firstName(child.name))}</div>
        <div class="att-tile__status">${STATUS_LABEL[status]}</div>
        ${timeLine ? `<div class="att-tile__time">${escapeHtml(timeLine)}</div>` : ''}
      </div>`;
  }
  function menuPanelHtml(status) {
    const items = [];
    if (status === 'not-arrived') { items.push(['checkin', 'Check in']); items.push(['absent', 'Mark absent']); }
    else if (status === 'in') { items.push(['checkout', 'Check out']); items.push(['details', 'View details']); }
    else if (status === 'out') { items.push(['details', 'View details']); }
    else if (status === 'absent') { items.push(['editabsence', 'Edit absence']); }
    return `<span class="popover__panel" role="menu" style="right:0; left:auto;">${items.map(([action, label]) => `<button class="popover__item" type="button" data-action="${action}" role="menuitem">${label}</button>`).join('')}</span>`;
  }

  function renderGrid(children) {
    const grid = $('attGrid');
    grid.innerHTML = children.map((c) => tileHtml(c)).join('');
    grid.querySelectorAll('[data-select]').forEach((cb) => {
      cb.addEventListener('click', (e) => e.stopPropagation());
      cb.addEventListener('change', () => { if (cb.checked) selectedChildIds.add(cb.dataset.select); else selectedChildIds.delete(cb.dataset.select); render(); });
    });
    grid.querySelectorAll('[data-menu]').forEach((menu) => {
      const trigger = menu.querySelector('[data-menu-trigger]');
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = !menu.classList.contains('is-open');
        document.querySelectorAll('.att-tile__menu.is-open').forEach((m) => m.classList.remove('is-open'));
        menu.classList.toggle('is-open', willOpen);
      });
      menu.querySelectorAll('[data-action]').forEach((item) => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          menu.classList.remove('is-open');
          handleMenuAction(item.dataset.action, menu.dataset.menu);
        });
      });
    });
    grid.querySelectorAll('[data-tile]').forEach((tile) => {
      const open = (e) => {
        if (e.target.closest('[data-select]') || e.target.closest('[data-menu]')) return;
        onTileClick(tile.dataset.tile);
      };
      tile.addEventListener('click', open);
      tile.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('input') && !e.target.closest('button')) { e.preventDefault(); open(e); } });
    });
  }

  function onTileClick(childId) {
    const child = window.PlayStore.getById(childId);
    if (!child) return;
    const status = deriveStatus(attendanceRecord(childId, selectedDate));
    if (status === 'not-arrived') openCheckinModal(child);
    else if (status === 'in') openCheckoutModal(child);
    else if (status === 'out') openDetailsModal(child);
    else if (status === 'absent') openAbsenceModal(child);
  }
  function handleMenuAction(action, childId) {
    const child = window.PlayStore.getById(childId);
    if (!child) return;
    if (action === 'checkin') openCheckinModal(child);
    else if (action === 'checkout') openCheckoutModal(child);
    else if (action === 'details') openDetailsModal(child);
    else if (action === 'absent' || action === 'editabsence') openAbsenceModal(child);
  }

  function pulseTileSuccess(childId) {
    const tile = document.querySelector(`[data-tile="${childId}"]`);
    if (!tile) return;
    tile.classList.add('att-success-pulse');
    window.setTimeout(() => tile.classList.remove('att-success-pulse'), 700);
  }

  /* ---------- generic modal plumbing ---------- */
  function openModal(id) { const b = $(id); b.classList.add('is-open'); b.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const b = $(id); b.classList.remove('is-open'); b.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  function submitWithLoading(btnId, work) {
    const btn = $(btnId); if (btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading'); btn.disabled = true;
    window.setTimeout(() => { work(); btn.classList.remove('is-loading'); btn.disabled = false; }, 300);
  }
  function childHeadHtml(child, sub) {
    return `<div class="att-modal-child__avatar">${escapeHtml(initials(child.name))}</div><div><div class="att-modal-child__name">${escapeHtml(child.name)}</div><div class="att-modal-child__sub">${escapeHtml(sub || child.room)}</div></div>`;
  }

  /* ========================================================================
     CHECK-IN MODAL
     ======================================================================== */
  function openCheckinModal(child) {
    checkinContext = { child };
    $('checkinChildHead').innerHTML = childHeadHtml(child);
    $('checkinTime').value = nowTimeStr();
    updateLateHint();
    const guardian = child.guardianId ? window.PlayStore.getById(child.guardianId) : null;
    const pickups = child.authorizedPickups || [];
    const options = ['<option value="">Not specified</option>'];
    pickups.forEach((p) => { if (!p.restricted) options.push(`<option value="${p.id}">${escapeHtml(p.name)}${p.relation ? ' — ' + escapeHtml(p.relation) : ''}</option>`); });
    if (guardian && !pickups.some((p) => p.name === guardian.name)) options.push(`<option value="${guardian.id}">${escapeHtml(guardian.name)} — Guardian</option>`);
    $('checkinDroppedBy').innerHTML = options.join('');
    openModal('checkinModalBackdrop');
  }
  function updateLateHint() {
    const time = $('checkinTime').value;
    const cls = classById(selectedClassId);
    if (!time || !cls) { $('checkinLateHint').textContent = ''; return; }
    if (!cls.startTime) { $('checkinLateHint').textContent = 'No class start time is on file, so this cannot be flagged as late.'; return; }
    $('checkinLateHint').textContent = time > cls.startTime
      ? `${escapeHtml(cls.name)} starts at ${formatTime12(cls.startTime)} — this will be flagged as a late arrival.`
      : `${escapeHtml(cls.name)} starts at ${formatTime12(cls.startTime)}.`;
  }
  function wireCheckinModal() {
    const backdrop = $('checkinModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('checkinModalBackdrop'); });
    $('checkinCancel').addEventListener('click', () => closeModal('checkinModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('checkinModalBackdrop'); });
    $('checkinTime').addEventListener('input', updateLateHint);
    $('checkinConfirm').addEventListener('click', () => {
      const time = $('checkinTime').value;
      if (!time) { window.PlayShell.toast('error', 'Set a time', 'Check-in time is required.'); return; }
      submitWithLoading('checkinConfirm', () => {
        const child = checkinContext.child;
        const droppedId = $('checkinDroppedBy').value;
        let droppedBy = null;
        if (droppedId) {
          const fromList = (child.authorizedPickups || []).find((p) => p.id === droppedId);
          droppedBy = fromList || window.PlayStore.getById(droppedId);
        }
        const rec = performCheckIn(child, time, droppedBy);
        closeModal('checkinModalBackdrop');
        render();
        pulseTileSuccess(child.id);
        window.PlayShell.toast('success', rec.lateArrival ? 'Checked in (late)' : 'Checked in', `${child.name} checked in at ${formatTime12(time)}${droppedBy ? ' by ' + droppedBy.name : ''}.`);
      });
    });
  }

  /* ========================================================================
     CHECK-OUT MODAL (safety-critical)
     ======================================================================== */
  function openCheckoutModal(child) {
    checkoutContext = { child };
    checkoutSelectedPickup = null;
    checkoutPasscodeVerified = false;
    $('checkoutChildHead').innerHTML = childHeadHtml(child, child.room + ' · Checked in');
    renderPickupList(child);
    $('checkoutSomeoneElseWarning').hidden = true;
    $('checkoutPasscodeField').hidden = true;
    $('checkoutPasscode').value = '';
    setFieldError('checkoutPasscode', null);
    updateCheckoutConfirmState();
    openModal('checkoutModalBackdrop');
  }
  function renderPickupList(child) {
    const pickups = child.authorizedPickups || [];
    const html = pickups.map((p) => {
      const restricted = !!p.restricted;
      return `
        <button class="att-pickup-card${restricted ? ' att-pickup-card--restricted' : ''}" type="button" data-pickup="${p.id}" ${restricted ? 'disabled aria-disabled="true"' : ''}>
          <span class="att-pickup-card__avatar">${escapeHtml(initials(p.name))}</span>
          <span class="att-pickup-card__body">
            <span class="att-pickup-card__name">${escapeHtml(p.name)}</span>
            <span class="att-pickup-card__sub">${restricted ? 'Do not release' : escapeHtml(p.relation || 'Authorised pickup') + (p.passcode ? ' · Passcode required' : '')}</span>
          </span>
          <span class="att-pickup-card__check">${ICON.check}</span>
        </button>`;
    }).join('') + `
      <button class="att-pickup-card att-pickup-card--other" type="button" data-pickup="__other__">
        <span class="att-pickup-card__avatar">?</span>
        <span class="att-pickup-card__body"><span class="att-pickup-card__name">Someone else</span><span class="att-pickup-card__sub">Not on the authorised list</span></span>
        <span class="att-pickup-card__check">${ICON.check}</span>
      </button>`;
    $('checkoutPickupList').innerHTML = pickups.length ? html : `<p class="card__text" style="font-size:var(--fs-caption);">No authorised pickup people are on file for this child.</p>` + html.split('</button>').slice(-2).join('</button>');
    $('checkoutPickupList').querySelectorAll('[data-pickup]').forEach((btn) => {
      btn.addEventListener('click', () => selectPickup(btn.dataset.pickup, child));
    });
  }
  function selectPickup(pickupId, child) {
    $('checkoutPickupList').querySelectorAll('.att-pickup-card').forEach((c) => c.classList.toggle('is-selected', c.dataset.pickup === pickupId));
    checkoutPasscodeVerified = false;
    if (pickupId === '__other__') {
      checkoutSelectedPickup = { id: null, name: null, unauthorized: true };
      $('checkoutSomeoneElseWarning').hidden = false;
      $('checkoutSomeoneElseWarning').innerHTML = `${ICON.alert} Not on authorised list — contact a guardian first`;
      $('checkoutPasscodeField').hidden = true;
    } else {
      const person = (child.authorizedPickups || []).find((p) => p.id === pickupId);
      checkoutSelectedPickup = person;
      $('checkoutSomeoneElseWarning').hidden = true;
      if (person && person.passcode) {
        $('checkoutPasscodeField').hidden = false;
        $('checkoutPasscode').value = '';
        setFieldError('checkoutPasscode', null);
      } else {
        $('checkoutPasscodeField').hidden = true;
        checkoutPasscodeVerified = true; // no passcode configured for this person — nothing to verify
      }
    }
    updateCheckoutConfirmState();
  }
  function updateCheckoutConfirmState() {
    const valid = !!(checkoutSelectedPickup && !checkoutSelectedPickup.unauthorized && !checkoutSelectedPickup.restricted && checkoutPasscodeVerified);
    $('checkoutConfirm').disabled = !valid;
  }
  function setFieldError(inputId, message) {
    const errorEl = $('err-' + inputId); if (!errorEl) return;
    const input = $(inputId);
    if (message) { errorEl.textContent = message; errorEl.hidden = false; if (input) input.closest('.field').classList.add('is-error'); }
    else { errorEl.hidden = true; if (input) input.closest('.field').classList.remove('is-error'); }
  }
  function wireCheckoutModal() {
    const backdrop = $('checkoutModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('checkoutModalBackdrop'); });
    $('checkoutCancel').addEventListener('click', () => closeModal('checkoutModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('checkoutModalBackdrop'); });
    $('checkoutPasscode').addEventListener('input', () => {
      const person = checkoutSelectedPickup;
      if (!person || !person.passcode) return;
      checkoutPasscodeVerified = $('checkoutPasscode').value === person.passcode;
      setFieldError('checkoutPasscode', null);
      updateCheckoutConfirmState();
    });
    $('checkoutConfirm').addEventListener('click', () => {
      const person = checkoutSelectedPickup;
      if (!person || person.unauthorized || person.restricted) return; // defensive: button should already be disabled
      if (person.passcode && !checkoutPasscodeVerified) {
        if ($('checkoutPasscode').value) setFieldError('checkoutPasscode', 'Incorrect passcode.');
        return;
      }
      submitWithLoading('checkoutConfirm', () => {
        const child = checkoutContext.child;
        const result = performCheckOut(child, person);
        if (!result) {
          window.PlayShell.toast('error', "Couldn't check out", `${child.name} is no longer checked in — refresh and try again.`);
          closeModal('checkoutModalBackdrop');
          render();
          return;
        }
        closeModal('checkoutModalBackdrop');
        render();
        pulseTileSuccess(child.id);
        window.PlayShell.toast('success', 'Checked out', `${child.name} collected by ${person.name} at ${formatTime12(result.checkOutTime)}.`);
      });
    });
  }

  /* ========================================================================
     DETAILS MODAL (Out / audit view)
     ======================================================================== */
  function openDetailsModal(child) {
    const record = attendanceRecord(child.id, selectedDate);
    $('detailsChildHead').innerHTML = childHeadHtml(child);
    const rows = [];
    if (record && record.checkInTime) rows.push(`<div class="att-detail-row">${ICON.clock}<span>Checked in at <b>${formatTime12(record.checkInTime)}</b> by ${escapeHtml(record.checkInStaffName || 'staff')}${record.lateArrival ? ' <span style="color:var(--color-warning); font-weight:700;">(Late)</span>' : ''}</span></div>`);
    if (record && record.droppedByName) rows.push(`<div class="att-detail-row">${ICON.check}<span>Dropped off by ${escapeHtml(record.droppedByName)}</span></div>`);
    if (record && record.checkOutTime) rows.push(`<div class="att-detail-row">${ICON.clock}<span>Checked out at <b>${formatTime12(record.checkOutTime)}</b> by ${escapeHtml(record.checkOutStaffName || 'staff')}</span></div>`);
    if (record && record.pickupPersonName) rows.push(`<div class="att-detail-row">${ICON.check}<span>Collected by <b>${escapeHtml(record.pickupPersonName)}</b>${record.pickupRelation ? ' (' + escapeHtml(record.pickupRelation) + ')' : ''}</span></div>`);
    $('detailsBody').innerHTML = rows.join('') || '<p class="card__text">No attendance recorded yet.</p>';
    openModal('detailsModalBackdrop');
  }
  function wireDetailsModal() {
    const backdrop = $('detailsModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('detailsModalBackdrop'); });
    $('detailsClose').addEventListener('click', () => closeModal('detailsModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('detailsModalBackdrop'); });
  }

  /* ========================================================================
     ABSENCE MODAL (single child + edit/correction)
     ======================================================================== */
  function openAbsenceModal(child) {
    absenceContext = { child };
    const record = attendanceRecord(child.id, selectedDate);
    const isEdit = record && record.status === 'Absent';
    absenceReason = isEdit ? record.absenceReason : null;
    $('absenceChildHead').innerHTML = childHeadHtml(child);
    $('absenceConfirmLabel').textContent = isEdit ? 'Save changes' : 'Mark absent';
    $('absenceNote').value = isEdit ? (record.absenceNote || '') : '';
    renderAbsenceChips();
    openModal('absenceModalBackdrop');
  }
  function renderAbsenceChips() {
    document.querySelectorAll('#absenceReasonChips .att-chip').forEach((chip) => chip.classList.toggle('is-selected', chip.dataset.reason === absenceReason));
    $('absenceUnknownHint').hidden = absenceReason !== 'Unknown';
  }
  function wireAbsenceModal() {
    const backdrop = $('absenceModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('absenceModalBackdrop'); });
    $('absenceCancel').addEventListener('click', () => closeModal('absenceModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('absenceModalBackdrop'); });
    document.querySelectorAll('#absenceReasonChips .att-chip').forEach((chip) => chip.addEventListener('click', () => { absenceReason = chip.dataset.reason; renderAbsenceChips(); }));
    $('absenceConfirm').addEventListener('click', () => {
      if (!absenceReason) { window.PlayShell.toast('error', 'Choose a reason', 'Select Sick, Holiday, Unknown or Other.'); return; }
      submitWithLoading('absenceConfirm', () => {
        const child = absenceContext.child;
        performAbsence(child, absenceReason, $('absenceNote').value.trim());
        closeModal('absenceModalBackdrop');
        render();
        window.PlayShell.toast('success', 'Marked absent', `${child.name} marked absent — ${absenceReason}.`);
        checkUnknownReminders();
      });
    });
  }

  /* ========================================================================
     BULK ABSENCE MODAL
     ======================================================================== */
  function openBulkAbsenceModal() {
    if (!selectedChildIds.size) return;
    bulkAbsenceReason = null;
    $('bulkAbsenceFor').textContent = `For ${selectedChildIds.size} selected ${selectedChildIds.size === 1 ? 'child' : 'children'}.`;
    $('bulkAbsenceNote').value = '';
    renderBulkAbsenceChips();
    openModal('bulkAbsenceModalBackdrop');
  }
  function renderBulkAbsenceChips() {
    document.querySelectorAll('#bulkAbsenceReasonChips .att-chip').forEach((chip) => chip.classList.toggle('is-selected', chip.dataset.reason === bulkAbsenceReason));
  }
  function wireBulkAbsenceModal() {
    const backdrop = $('bulkAbsenceModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('bulkAbsenceModalBackdrop'); });
    $('bulkAbsenceCancel').addEventListener('click', () => closeModal('bulkAbsenceModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('bulkAbsenceModalBackdrop'); });
    document.querySelectorAll('#bulkAbsenceReasonChips .att-chip').forEach((chip) => chip.addEventListener('click', () => { bulkAbsenceReason = chip.dataset.reason; renderBulkAbsenceChips(); }));
    $('bulkAbsenceConfirm').addEventListener('click', () => {
      if (!bulkAbsenceReason) { window.PlayShell.toast('error', 'Choose a reason', 'Select Sick, Holiday, Unknown or Other.'); return; }
      submitWithLoading('bulkAbsenceConfirm', () => {
        const note = $('bulkAbsenceNote').value.trim();
        let marked = 0; let skipped = 0;
        Array.from(selectedChildIds).forEach((id) => {
          const child = window.PlayStore.getById(id);
          if (!child) return;
          const status = deriveStatus(attendanceRecord(id, selectedDate));
          if (status !== 'not-arrived') { skipped += 1; return; } // never silently override an existing check-in/out/absence
          performAbsence(child, bulkAbsenceReason, note);
          marked += 1;
        });
        selectedChildIds.clear();
        closeModal('bulkAbsenceModalBackdrop');
        render();
        checkUnknownReminders();
        window.PlayShell.toast('success', 'Marked absent', `${marked} marked absent.${skipped ? ' ' + skipped + ' already had attendance recorded and were left unchanged.' : ''}`);
      });
    });
  }
})();
