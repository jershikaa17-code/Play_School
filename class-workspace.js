/* ==========================================================================
   PLAY SCHOOL — Class Workspace (S24)
   A teacher's daily home base for one class. Reuses: store.js (Class/Child/
   Staff/Attendance/CareEntry/Event/RoutineBlock/Resource/Substitution/
   ClassMove records — the only new record types are RoutineBlock, Resource,
   Substitution and ClassMove, none of which existed anywhere in the project
   before this page), modules.js, shell.js.

   INTEGRATION NOTES:
   - Roster/capacity/ratio reuse the exact same child.room === class.name
     link and ratio math as classes.js (S20) and attendance.js (S19).
   - "Present today" reads today's real Attendance records (S19) — a missing
     record is shown as "Not recorded", never silently treated as absent.
   - Diary completion (Today tab) reads real CareEntry records (S17 Daily
     Care Log) — percentage per entry type is children-with-an-entry ÷
     active children, never invented.
   - "Today's shift" per staff member is the class's own configured hours
     (RoutineBlock span / Class.startTime) — this project has no per-staff
     shift schedule, so this is labelled "Class hours", not a personal shift.
   - Substitute availability is a real, computable rule: Active staff who are
     not permanently assigned to any class right now and don't already have
     a Substitution record for the chosen date — not hardcoded.
   - "Move child" respects a scheduled effective date: a future-dated move is
     stored as a ClassMove record with status 'Scheduled' and is only applied
     (via store.js's applyDueClassMoves, run on every page load) once that
     date arrives — today's roster is never changed early.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function initials(name) { const p = String(name || '').trim().split(/\s+/); return p[0] ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '?'; }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function nowTimeStr() { const d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function formatTime12(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + pad2(m) + ' ' + period;
  }
  function firstName(name) { return String(name || '').trim().split(/\s+/)[0] || name; }

  const ICON = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    door: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><circle cx="14" cy="12" r="1"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    sunrise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/></svg>',
    puzzle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"/></svg>',
    apple: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a9 9 0 0 0 9-9c0-4-2-8-9-11-7 3-9 7-9 11a9 9 0 0 0 9 9Z"/><path d="M12 21V11"/></svg>',
    tree: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-7"/><path d="M9 9a3 3 0 1 1 6 0c0 2-3 3-3 3s-3-1-3-3Z"/><path d="M7 15a4 4 0 1 1 10 0c0 2.5-3.5 4-5 4s-5-1.5-5-4Z"/></svg>',
    utensils: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2"/><path d="M5 12v10"/><path d="M19 2c-1.5 1.5-2 3.5-2 6s.5 4.5 2 6"/><path d="M19 2v20"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>',
    palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2a10 10 0 1 0 0 20c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C22 6.012 17.461 2 12 2Z"/></svg>',
    exit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>',
    flask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v6L4 18a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-10V2"/><line x1="9" y1="2" x2="15" y2="2"/><line x1="7" y1="14" x2="17" y2="14"/></svg>',
    hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6.14-2.6l-4-5a2 2 0 1 1 3.14-2.5L8 14"/></svg>',
    cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 16-9 5-9-5V8l9-5 9 5Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
  };

  const ROUTINE_ICON = {
    arrival: ICON.sunrise, 'work-cycle': ICON.puzzle, snack: ICON.apple, outdoor: ICON.tree,
    lunch: ICON.utensils, nap: ICON.moon, afternoon: ICON.palette, departure: ICON.exit,
  };
  const ROUTINE_LABEL = {
    arrival: 'Arrival', 'work-cycle': 'Work cycle', snack: 'Snack', outdoor: 'Outdoor play',
    lunch: 'Lunch', nap: 'Nap / rest', afternoon: 'Afternoon activities', departure: 'Departure',
  };
  const RESOURCE_ICON = { sensory: ICON.hand, books: ICON.book, stem: ICON.flask, creative: ICON.palette, outdoor: ICON.tree };
  const ALERT_META = {
    allergy: { label: 'Allergy', urgency: 'urgent' },
    medical: { label: 'Medical', urgency: 'urgent' },
    custody: { label: 'Custody', urgency: 'urgent' },
    dietary: { label: 'Dietary', urgency: 'info' },
  };
  const ENTRY_LABEL = { meal: 'Meal', nap: 'Nap', toileting: 'Toileting', mood: 'Mood', activity: 'Activity', note: 'Note', photo: 'Photo' };
  const ENTRY_ORDER = ['meal', 'nap', 'toileting', 'mood', 'activity', 'note', 'photo'];

  let classId = null;
  let role = null;
  let activeTab = 'roster';
  let selectedChildId = null;
  let moveChildPreset = null;
  let subReplaceId = null;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', (e) => { role = e.detail.role; render(); });

  function init() {
    window.PlayShell.login();
    role = window.PlayShell.getDemoRole();
    classId = new URLSearchParams(window.location.search).get('id');
    const cls = classId && window.PlayStore.getById(classId);
    if (!cls || cls.type !== 'Class') { window.location.replace('404.html'); return; }

    window.PlayShell.mount('classrooms', cls.name);
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    wireTabs();
    wireDrawer();
    wireMoveModal();
    wireSubModal();
    wireRoutineModal();

    window.setTimeout(() => { $('wsSkeleton').hidden = true; $('wsBody').hidden = false; render(); }, 380);
  }

  /* ---------- shared data helpers (same conventions as classes.js / attendance.js) ---------- */
  function currentClass() { return window.PlayStore.getById(classId); }
  function allStaff() { return window.PlayStore.getByType('Staff'); }
  function allActiveClasses() { return window.PlayStore.getByType('Class').filter((c) => c.status !== 'Archived'); }
  function classRatioLimitDefault() { return window.PlayStore.getSettings().classRatioLimit || 10; }
  function childrenFor(cls) { return window.PlayStore.getByType('Child').filter((c) => c.room === cls.name && c.status === 'Active'); }
  function leadTeacherFor(cls) { return cls.teacherId ? window.PlayStore.getById(cls.teacherId) : null; }
  function assignedStaffFor(cls) {
    const seen = new Set(); const result = [];
    allStaff().forEach((s) => {
      const matches = (s.classNames && s.classNames.indexOf(cls.name) !== -1) || (s.relation && s.relation.indexOf(cls.name) !== -1);
      if (matches && !seen.has(s.id)) { seen.add(s.id); result.push(s); }
    });
    return result;
  }
  function additionalStaffFor(cls) {
    const lead = leadTeacherFor(cls);
    return assignedStaffFor(cls).filter((s) => !lead || s.id !== lead.id);
  }
  function attendanceRecord(childId2, date) { return window.PlayStore.getByType('Attendance').find((a) => a.childId === childId2 && a.date === date) || null; }
  function attendanceStatus(childId2, date) {
    const rec = attendanceRecord(childId2, date);
    if (!rec) return 'not-arrived';
    if (rec.status === 'Absent') return 'absent';
    if (rec.checkOutTime) return 'out';
    return 'in';
  }
  function presentTodayFor(cls) {
    const date = todayISO();
    const children = childrenFor(cls);
    let inCount = 0; let outCount = 0; let absentCount = 0; let anyRecord = false;
    children.forEach((c) => {
      const st = attendanceStatus(c.id, date);
      if (st !== 'not-arrived') anyRecord = true;
      if (st === 'in') inCount += 1;
      if (st === 'out') outCount += 1;
      if (st === 'absent') absentCount += 1;
    });
    return { expected: children.length, in: inCount, out: outCount, absent: absentCount, anyRecord };
  }
  function ratioFor(cls) {
    const staffCount = assignedStaffFor(cls).length;
    const limit = cls.ratioLimit || classRatioLimitDefault();
    const presence = presentTodayFor(cls);
    if (!presence.expected) return { state: 'empty', limit };
    if (!staffCount) return { state: 'no-staff', limit };
    if (!presence.anyRecord) return { state: 'unconfirmed', limit };
    const ratio = presence.in / staffCount;
    return { state: ratio <= limit ? 'ok' : 'warn', inCount: presence.in, staffCount, limit, ratio };
  }
  function formatAgeMonths(months) {
    months = Number(months) || 0;
    if (months % 12 === 0) return (months / 12) + (months === 12 ? ' yr' : ' yrs');
    const y = Math.floor(months / 12); const m = months % 12;
    return y > 0 ? y + 'y ' + m + 'mo' : m + ' mo';
  }
  function ageRangeLabel(cls) {
    if (cls.minAgeMonths == null && cls.maxAgeMonths == null) return cls.ageGroup || 'Age range not set';
    return formatAgeMonths(cls.minAgeMonths) + ' – ' + formatAgeMonths(cls.maxAgeMonths);
  }
  function childAgeLabel(dob) {
    if (!dob) return '—';
    const d = new Date(dob + 'T00:00:00'); const now = new Date();
    let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (now.getDate() < d.getDate()) months -= 1;
    return formatAgeMonths(Math.max(months, 0));
  }

  /* ========================================================================
     RENDER ORCHESTRATION
     ======================================================================== */
  function render() {
    const cls = currentClass();
    if (!cls) { window.location.replace('404.html'); return; }
    renderHeader(cls);
    renderTabPanel(cls);
  }

  /* ---------- header ---------- */
  function renderHeader(cls) {
    const children = childrenFor(cls);
    const enrolled = children.length;
    const capacity = cls.capacity || 0;
    const pct = capacity ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;
    const capState = !capacity ? 'normal' : (enrolled / capacity >= 1 ? 'over' : (enrolled / capacity >= 0.9 ? 'amber' : 'normal'));
    const r = ratioFor(cls);

    $('wsClassName').textContent = cls.name;
    $('wsAgeRange').textContent = ageRangeLabel(cls);
    $('wsRoom').innerHTML = `${ICON.door}<span>${escapeHtml(cls.room || 'Room not set')}</span>`;
    $('wsCapacityLabel').textContent = `${enrolled} / ${capacity || '—'} children`;
    $('wsCapacityFill').className = 'progress-linear__bar ws-capacity-fill is-' + capState;
    requestAnimationFrame(() => requestAnimationFrame(() => { $('wsCapacityFill').style.width = pct + '%'; }));
    $('wsRatioBadge').innerHTML = ratioBadgeHtml(r);
    $('wsTakeAttendanceBtn').href = 'attendance.html?classId=' + encodeURIComponent(cls.id);

    const lead = leadTeacherFor(cls);
    const extra = additionalStaffFor(cls);
    const visible = extra.slice(0, 3);
    const overflow = extra.length - visible.length;
    let staffHtml = '';
    if (lead) staffHtml += `<span class="avatar ws-header-avatar" title="Lead teacher — ${escapeHtml(lead.name)}">${escapeHtml(initials(lead.name))}</span>`;
    visible.forEach((s) => { staffHtml += `<span class="avatar avatar--sm ws-header-avatar" title="${escapeHtml(s.name)}">${escapeHtml(initials(s.name))}</span>`; });
    if (overflow > 0) staffHtml += `<span class="avatar avatar--sm ws-header-avatar ws-header-avatar--more">+${overflow}</span>`;
    if (!lead && !extra.length) staffHtml = `<span class="ws-header-no-staff">${ICON.alert} No staff assigned</span>`;
    $('wsHeaderStaff').innerHTML = staffHtml;
  }
  function ratioBadgeHtml(r) {
    if (r.state === 'empty') return `<span class="ws-ratio-chip ws-ratio-chip--neutral">No children enrolled</span>`;
    if (r.state === 'no-staff') return `<span class="ws-ratio-chip ws-ratio-chip--warn">${ICON.alert} No staff assigned</span>`;
    if (r.state === 'unconfirmed') return `<span class="ws-ratio-chip ws-ratio-chip--neutral" title="No attendance recorded yet today">Not confirmed yet</span>`;
    const ok = r.state === 'ok';
    return `<span class="ws-ratio-chip ws-ratio-chip--${ok ? 'ok' : 'warn'}" title="Based on staff assigned to this class — this project has no staff check-in data">${r.inCount}:${r.staffCount} ${ok ? ICON.check : ICON.alert} <span class="ws-ratio-chip__limit">limit 1:${r.limit}</span></span>`;
  }

  /* ---------- tabs ---------- */
  const TABS = [
    { key: 'roster', label: 'Roster' },
    { key: 'staff', label: 'Staff' },
    { key: 'today', label: 'Today' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'resources', label: 'Room & resources' },
  ];
  function wireTabs() {
    $('wsTabs').innerHTML = TABS.map((t) => `<button class="ws-tab" type="button" data-tab="${t.key}" role="tab" aria-selected="${t.key === activeTab}">${escapeHtml(t.label)}</button>`).join('');
    $('wsTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (!btn) return;
      activeTab = btn.dataset.tab;
      render();
    });
  }
  function renderTabPanel(cls) {
    $('wsTabs').querySelectorAll('[data-tab]').forEach((btn) => btn.setAttribute('aria-selected', String(btn.dataset.tab === activeTab)));
    const panel = $('wsTabPanel');
    panel.classList.remove('ws-tab-panel--in');
    if (activeTab === 'roster') panel.innerHTML = rosterTabHtml(cls);
    else if (activeTab === 'staff') panel.innerHTML = staffTabHtml(cls);
    else if (activeTab === 'today') panel.innerHTML = todayTabHtml(cls);
    else if (activeTab === 'schedule') panel.innerHTML = scheduleTabHtml(cls);
    else panel.innerHTML = resourcesTabHtml(cls);
    requestAnimationFrame(() => panel.classList.add('ws-tab-panel--in'));
    wireTabPanelEvents(cls);
    const bars = panel.querySelectorAll('[data-anim-width]');
    requestAnimationFrame(() => requestAnimationFrame(() => bars.forEach((b) => { b.style.width = b.dataset.animWidth + '%'; })));
  }

  /* ========================================================================
     TAB 1 — ROSTER
     ======================================================================== */
  function rosterTabHtml(cls) {
    const children = childrenFor(cls).sort((a, b) => a.name.localeCompare(b.name));
    const date = todayISO();
    const head = `
      <div class="ws-panel-head">
        <div>
          <h2 class="ws-panel-title">Roster</h2>
          <p class="ws-panel-sub">${children.length} ${children.length === 1 ? 'child' : 'children'} enrolled</p>
        </div>
        <button class="btn btn--secondary btn--sm" type="button" id="wsMoveChildBtn">${ICON.swap}<span>&nbsp;Move child</span></button>
      </div>`;
    if (!children.length) {
      return head + `<div class="state-panel"><div class="state-panel__icon">${ICON.inbox}</div><div class="state-panel__title">No children enrolled yet</div><p class="state-panel__text">Enrol a child into ${escapeHtml(cls.name)} to see them here.</p><div class="state-panel__action"><a class="btn btn--accent" href="enroll.html">Enrol a child</a></div></div>`;
    }
    const tiles = children.map((c, i) => {
      const status = attendanceStatus(c.id, date);
      const hasAlert = (c.alerts || []).length > 0;
      return `
        <button class="ws-roster-tile" type="button" data-child="${c.id}" style="animation-delay:${Math.min(i, 16) * 35}ms;" aria-label="${escapeHtml(c.name)} — ${rosterStatusLabel(status)}">
          <span class="ws-roster-tile__avatar ws-ring--${status}">
            ${escapeHtml(initials(c.name))}
            ${hasAlert ? `<span class="ws-roster-tile__alert" title="Has an alert on file">${ICON.alert}</span>` : ''}
          </span>
          <span class="ws-roster-tile__name">${escapeHtml(firstName(c.name))}</span>
          <span class="ws-roster-tile__status ws-roster-tile__status--${status}">${rosterStatusLabel(status)}</span>
        </button>`;
    }).join('');
    return head + `<div class="ws-roster-grid">${tiles}</div>`;
  }
  function rosterStatusLabel(status) {
    if (status === 'in' || status === 'out') return 'Present';
    if (status === 'absent') return 'Absent';
    return 'Not recorded';
  }

  /* ========================================================================
     TAB 2 — STAFF
     ======================================================================== */
  function classHoursLabel(cls) {
    const blocks = routineBlocksFor(cls);
    if (blocks.length) return formatTime12(blocks[0].startTime) + ' – ' + formatTime12(blocks[blocks.length - 1].endTime);
    if (cls.startTime) return formatTime12(cls.startTime) + ' start';
    return 'Not recorded';
  }
  function substitutionsToday(cls) { return window.PlayStore.getByType('Substitution').filter((s) => s.classId === cls.id && s.date === todayISO()); }
  function staffTabHtml(cls) {
    const lead = leadTeacherFor(cls);
    const extra = additionalStaffFor(cls);
    const subs = substitutionsToday(cls);
    const staffRows = [];
    if (lead) staffRows.push({ staff: lead, role: 'Lead teacher' });
    extra.forEach((s) => staffRows.push({ staff: s, role: 'Support staff' }));
    const head = `
      <div class="ws-panel-head">
        <div>
          <h2 class="ws-panel-title">Staff</h2>
          <p class="ws-panel-sub">${staffRows.length} assigned to ${escapeHtml(cls.name)}</p>
        </div>
        <button class="btn btn--accent btn--sm" type="button" id="wsAssignSubBtn" ${staffRows.length ? '' : 'disabled'}>${ICON.swap}<span>&nbsp;Assign substitute</span></button>
      </div>`;
    if (!staffRows.length) {
      return head + `<div class="state-panel"><div class="state-panel__icon">${ICON.inbox}</div><div class="state-panel__title">No staff assigned</div><p class="state-panel__text">Assign a lead teacher to ${escapeHtml(cls.name)} from the Classes page.</p><div class="state-panel__action"><a class="btn btn--secondary" href="classes.html">Go to Classes</a></div></div>`;
    }
    const rows = staffRows.map(({ staff, role }) => {
      const coveredBy = subs.find((s) => s.originalStaffId === staff.id);
      const sub = coveredBy ? window.PlayStore.getById(coveredBy.substituteStaffId) : null;
      return `
        <div class="ws-staff-row">
          <span class="avatar">${escapeHtml(initials(staff.name))}</span>
          <span class="ws-staff-row__body">
            <span class="ws-staff-row__name">${escapeHtml(staff.name)}</span>
            <span class="ws-staff-row__role">${role}</span>
          </span>
          <span class="ws-staff-row__shift"><span class="ws-staff-row__shift-label">Class hours</span><span>${escapeHtml(classHoursLabel(cls))}</span></span>
          <span class="badge ${staff.status === 'Active' ? 'badge--success' : 'badge--neutral'}">${escapeHtml(staff.status || 'Unknown')}</span>
          ${sub ? `<span class="badge badge--warning">Covered today by ${escapeHtml(sub.name)}</span>` : ''}
        </div>`;
    }).join('');
    const subsIncoming = subs.filter((s) => !staffRows.some((r) => r.staff.id === s.originalStaffId));
    const subRows = subsIncoming.map((s) => {
      const sub = window.PlayStore.getById(s.substituteStaffId);
      const original = window.PlayStore.getById(s.originalStaffId);
      if (!sub) return '';
      return `
        <div class="ws-staff-row ws-staff-row--sub">
          <span class="avatar">${escapeHtml(initials(sub.name))}</span>
          <span class="ws-staff-row__body">
            <span class="ws-staff-row__name">${escapeHtml(sub.name)}</span>
            <span class="ws-staff-row__role">Substitute${original ? ' — covering for ' + escapeHtml(original.name) : ''}</span>
          </span>
          <span class="ws-staff-row__shift"><span class="ws-staff-row__shift-label">Class hours</span><span>${escapeHtml(classHoursLabel(cls))}</span></span>
          <span class="badge badge--primary">Today only</span>
        </div>`;
    }).join('');
    return head + `<div class="ws-staff-list">${rows}${subRows}</div>`;
  }

  /* ========================================================================
     TAB 3 — TODAY
     ======================================================================== */
  function diaryCompletionFor(cls) {
    const children = childrenFor(cls);
    const date = todayISO();
    if (!children.length) return null;
    const entries = window.PlayStore.getByType('CareEntry').filter((e) => e.date === date && children.some((c) => c.id === e.childId));
    return ENTRY_ORDER.map((type) => {
      const withEntry = new Set(entries.filter((e) => e.entryType === type).map((e) => e.childId)).size;
      return { type, label: ENTRY_LABEL[type], pct: Math.round((withEntry / children.length) * 100), count: withEntry, total: children.length };
    });
  }
  function eventOccursOn(ev, dateISO) {
    if (ev.exceptions && ev.exceptions[dateISO] && ev.exceptions[dateISO].cancelled) return false;
    const freq = ev.recurrence && ev.recurrence.freq;
    const until = ev.recurrence && ev.recurrence.until;
    if (until && dateISO > until) return false;
    if (!freq || freq === 'none') { const end = ev.endDate || ev.startDate; return dateISO >= ev.startDate && dateISO <= end; }
    if (dateISO < ev.startDate) return false;
    const d = new Date(dateISO + 'T00:00:00'); const s = new Date(ev.startDate + 'T00:00:00');
    if (freq === 'weekly') return d.getDay() === s.getDay();
    if (freq === 'monthly') return d.getDate() === s.getDate();
    return false;
  }
  function eventsToday(cls) {
    const date = todayISO();
    return window.PlayStore.getByType('Event')
      .filter((ev) => (!ev.classIds || !ev.classIds.length || ev.classIds.indexOf(cls.id) !== -1) && eventOccursOn(ev, date))
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }
  function todayTabHtml(cls) {
    const presence = presentTodayFor(cls);
    const notRecorded = presence.expected - presence.in - presence.out - presence.absent;
    const diary = diaryCompletionFor(cls);
    const events = eventsToday(cls);
    const summaryHtml = `
      <div class="ws-today-stats">
        <div class="ws-stat"><span class="ws-stat__value">${presence.expected}</span><span class="ws-stat__label">Enrolled</span></div>
        <div class="ws-stat ws-stat--ok"><span class="ws-stat__value">${presence.in + presence.out}</span><span class="ws-stat__label">Present today</span></div>
        <div class="ws-stat ws-stat--warn"><span class="ws-stat__value">${presence.absent}</span><span class="ws-stat__label">Absent</span></div>
        <div class="ws-stat ws-stat--neutral"><span class="ws-stat__value">${Math.max(notRecorded, 0)}</span><span class="ws-stat__label">Not yet recorded</span></div>
      </div>`;
    const diaryHtml = !diary
      ? `<p class="ws-section-empty">No children enrolled, so there is nothing to track yet.</p>`
      : diary.map((d) => `
        <div class="ws-diary-row">
          <div class="ws-diary-row__head"><span>${escapeHtml(d.label)}</span><span>${d.count}/${d.total} · ${d.pct}%</span></div>
          <div class="progress-linear"><div class="progress-linear__bar" data-anim-width="${d.pct}" style="width:0%;"></div></div>
        </div>`).join('');
    const eventsHtml = events.length
      ? events.map((ev) => `
        <div class="ws-event-row">
          <span class="ws-event-row__time">${ev.allDay ? 'All day' : (formatTime12(ev.startTime) + (ev.endTime ? ' – ' + formatTime12(ev.endTime) : ''))}</span>
          <span class="ws-event-row__body"><span class="ws-event-row__title">${escapeHtml(ev.title)}</span>${ev.location ? `<span class="ws-event-row__loc">${escapeHtml(ev.location)}</span>` : ''}</span>
        </div>`).join('')
      : `<p class="ws-section-empty">Nothing scheduled for today.</p>`;
    return `
      <div class="ws-today-grid">
        <section class="ws-today-card">
          <h3 class="ws-today-card__title">Attendance summary</h3>
          ${summaryHtml}
        </section>
        <section class="ws-today-card">
          <h3 class="ws-today-card__title">Diary completion</h3>
          <div class="ws-diary-list">${diaryHtml}</div>
        </section>
        <section class="ws-today-card ws-today-card--wide">
          <h3 class="ws-today-card__title">Events today</h3>
          <div class="ws-event-list">${eventsHtml}</div>
        </section>
      </div>`;
  }

  /* ========================================================================
     TAB 4 — SCHEDULE
     ======================================================================== */
  function routineBlocksFor(cls) {
    return window.PlayStore.getByType('RoutineBlock').filter((b) => b.classId === cls.id).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  function blockState(block) {
    const now = nowTimeStr();
    if (now < block.startTime) return 'upcoming';
    if (now >= block.endTime) return 'done';
    return 'current';
  }
  function scheduleTabHtml(cls) {
    const blocks = routineBlocksFor(cls);
    const head = `
      <div class="ws-panel-head">
        <div>
          <h2 class="ws-panel-title">Daily routine</h2>
          <p class="ws-panel-sub">${escapeHtml(cls.name)}'s configured schedule</p>
        </div>
        <button class="btn btn--secondary btn--sm" type="button" id="wsAddRoutineBtn">${ICON.plus}<span>&nbsp;Add block</span></button>
      </div>`;
    if (!blocks.length) {
      return head + `<div class="state-panel"><div class="state-panel__icon">${ICON.clock}</div><div class="state-panel__title">No routine configured yet</div><p class="state-panel__text">Add the first block of ${escapeHtml(cls.name)}'s daily routine.</p><div class="state-panel__action"><button class="btn btn--accent" type="button" id="wsAddRoutineBtnEmpty">${ICON.plus}<span>&nbsp;Add block</span></button></div></div>`;
    }
    const items = blocks.map((b) => {
      const state = blockState(b);
      return `
        <div class="ws-timeline-item ws-timeline-item--${state}">
          <div class="ws-timeline-item__rail"><span class="ws-timeline-item__dot">${ROUTINE_ICON[b.kind] || ICON.clock}</span></div>
          <div class="ws-timeline-item__card">
            <div class="ws-timeline-item__top">
              <span class="ws-timeline-item__name">${escapeHtml(b.activity)}</span>
              <span class="ws-timeline-item__badge ws-timeline-item__badge--${state}">${state === 'current' ? 'Now' : state === 'upcoming' ? 'Upcoming' : 'Done'}</span>
            </div>
            <div class="ws-timeline-item__time">${formatTime12(b.startTime)} – ${formatTime12(b.endTime)}</div>
          </div>
          <div class="ws-timeline-item__actions">
            <button class="ws-icon-btn" type="button" data-edit-routine="${b.id}" aria-label="Edit ${escapeHtml(b.activity)}">${ICON.pencil}</button>
            <button class="ws-icon-btn" type="button" data-delete-routine="${b.id}" aria-label="Delete ${escapeHtml(b.activity)}">${ICON.trash}</button>
          </div>
        </div>`;
    }).join('');
    return head + `<div class="ws-timeline">${items}</div>`;
  }

  /* ========================================================================
     TAB 5 — ROOM & RESOURCES
     ======================================================================== */
  function resourcesTabHtml(cls) {
    const resources = window.PlayStore.getByType('Resource').filter((r) => r.classId === cls.id);
    const roomCard = `
      <section class="ws-room-card">
        <div class="ws-room-card__item"><span class="ws-room-card__label">Room</span><span class="ws-room-card__value">${escapeHtml(cls.room || 'Not set')}</span></div>
        <div class="ws-room-card__item"><span class="ws-room-card__label">Age range</span><span class="ws-room-card__value">${escapeHtml(ageRangeLabel(cls))}</span></div>
        <div class="ws-room-card__item"><span class="ws-room-card__label">Capacity</span><span class="ws-room-card__value">${cls.capacity || '—'} children</span></div>
        <div class="ws-room-card__item"><span class="ws-room-card__label">Ratio</span><span class="ws-room-card__value">1 adult : ${cls.ratioLimit || classRatioLimitDefault()} children</span></div>
      </section>`;
    const resourceHtml = resources.length
      ? `<div class="ws-resource-grid">${resources.map((r) => `
        <div class="ws-resource-card">
          <span class="ws-resource-card__icon">${RESOURCE_ICON[r.category] || ICON.cube}</span>
          <span class="ws-resource-card__name">${escapeHtml(r.name)}</span>
          <span class="badge ${r.status === 'Available' ? 'badge--success' : r.status === 'In use' ? 'badge--primary' : 'badge--warning'}">${escapeHtml(r.status)}</span>
        </div>`).join('')}</div>`
      : `<p class="ws-section-empty">No learning materials have been assigned to this room yet.</p>`;
    return `
      <div class="ws-panel-head"><div><h2 class="ws-panel-title">Room &amp; resources</h2><p class="ws-panel-sub">${escapeHtml(cls.room || 'Room not set')}</p></div></div>
      ${roomCard}
      <h3 class="ws-today-card__title" style="margin-top: var(--space-6);">Assigned materials</h3>
      ${resourceHtml}`;
  }

  /* ---------- tab panel event wiring (re-runs after every render) ---------- */
  function wireTabPanelEvents(cls) {
    const moveBtn = $('wsMoveChildBtn');
    if (moveBtn) moveBtn.addEventListener('click', () => openMoveModal(null));
    const subBtn = $('wsAssignSubBtn');
    if (subBtn) subBtn.addEventListener('click', () => openSubModal());
    const panel = $('wsTabPanel');
    panel.querySelectorAll('[data-child]').forEach((tile) => tile.addEventListener('click', () => openDrawer(tile.dataset.child)));
    const addRoutine = $('wsAddRoutineBtn') || $('wsAddRoutineBtnEmpty');
    if (addRoutine) addRoutine.addEventListener('click', () => openRoutineModal(null));
    panel.querySelectorAll('[data-edit-routine]').forEach((btn) => btn.addEventListener('click', () => openRoutineModal(window.PlayStore.getById(btn.dataset.editRoutine))));
    panel.querySelectorAll('[data-delete-routine]').forEach((btn) => btn.addEventListener('click', () => {
      const block = window.PlayStore.getById(btn.dataset.deleteRoutine);
      if (!block) return;
      window.PlayStore.removeRecord(block.id);
      render();
      window.PlayShell.toast('success', 'Removed', `${block.activity} removed from the routine.`);
    }));
  }

  /* ========================================================================
     CHILD QUICK-VIEW DRAWER
     ======================================================================== */
  function openDrawer(childId2) {
    const child = window.PlayStore.getById(childId2);
    if (!child) return;
    selectedChildId = childId2;
    renderDrawer(child);
    $('wsDrawerBackdrop').classList.add('is-open');
    $('wsDrawer').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    $('wsDrawerBackdrop').classList.remove('is-open');
    $('wsDrawer').classList.remove('is-open');
    document.body.style.overflow = '';
  }
  function wireDrawer() {
    $('wsDrawerBackdrop').addEventListener('click', closeDrawer);
    document.querySelectorAll('[data-close-drawer]').forEach((btn) => btn.addEventListener('click', closeDrawer));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('wsDrawer').classList.contains('is-open')) closeDrawer(); });
  }
  function alertCardHtml(a) {
    const meta = ALERT_META[a.type] || { label: a.type, urgency: 'info' };
    return `<div class="ws-alert-card ws-alert-card--${meta.urgency}">${ICON.alert}<div><div class="ws-alert-card__label">${escapeHtml(meta.label)}${meta.urgency === 'urgent' ? ' · Urgent' : ''}</div><div class="ws-alert-card__text">${escapeHtml(a.detail || a.restrictionReason || '')}</div></div></div>`;
  }
  function renderDrawer(child) {
    const alerts = child.alerts || [];
    const alertsHtml = alerts.length
      ? alerts.map(alertCardHtml).join('')
      : `<div class="ws-alert-empty">${ICON.check} No active alerts on file.</div>`;

    const pickups = child.authorizedPickups || [];
    const pickupHtml = pickups.length
      ? pickups.map((p) => `
        <div class="ws-pickup-row${p.restricted ? ' ws-pickup-row--restricted' : ''}">
          <span class="avatar avatar--sm">${escapeHtml(initials(p.name))}</span>
          <span class="ws-pickup-row__body">
            <span class="ws-pickup-row__name">${escapeHtml(p.name)}</span>
            <span class="ws-pickup-row__sub">${p.restricted ? 'Do not release' + (p.restrictionReason ? ' — ' + escapeHtml(p.restrictionReason) : '') : escapeHtml(p.relation || 'Authorised pickup')}</span>
          </span>
          ${(!p.restricted && p.passcode) ? '<span class="ws-pickup-row__lock" title="Passcode protected">🔒</span>' : ''}
        </div>`).join('')
      : `<p class="ws-section-empty">No authorised pickup people on file.</p>`;

    const date = todayISO();
    const entries = window.PlayStore.getByType('CareEntry').filter((e) => e.childId === child.id && e.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const diaryHtml = entries.length
      ? entries.map((e) => `<div class="ws-diary-entry"><span class="ws-diary-entry__time">${formatTime12(e.time)}</span><span>${escapeHtml(ENTRY_LABEL[e.entryType] || e.entryType)}</span></div>`).join('')
      : `<p class="ws-section-empty">No diary entries logged for today yet.</p>`;

    const status = attendanceStatus(child.id, date);
    $('wsDrawerBody').innerHTML = `
      <div class="ws-drawer-alerts">${alertsHtml}</div>
      <div class="ws-drawer-child">
        <span class="avatar avatar--lg ws-ring--${status}">${escapeHtml(initials(child.name))}</span>
        <div>
          <div class="ws-drawer-child__name">${escapeHtml(child.name)}${child.preferredName ? ' "' + escapeHtml(child.preferredName) + '"' : ''}</div>
          <div class="ws-drawer-child__sub">${escapeHtml(childAgeLabel(child.dob))} · ${rosterStatusLabel(status)}</div>
        </div>
      </div>
      <div class="ws-drawer-section">
        <h4 class="ws-drawer-section__title">Today's pickup list</h4>
        ${pickupHtml}
      </div>
      <div class="ws-drawer-section">
        <h4 class="ws-drawer-section__title">Today's diary</h4>
        ${diaryHtml}
        <a class="ws-drawer-link" href="care-log.html?classId=${encodeURIComponent(classId)}">Open Daily Care Log →</a>
      </div>`;
    $('wsDrawerTitle').textContent = child.name;
    $('wsDrawerOpenProfile').href = 'record.html?id=' + encodeURIComponent(child.id);
    $('wsDrawerMoveBtn').onclick = () => { closeDrawer(); openMoveModal(child); };
  }

  /* ========================================================================
     MOVE CHILD MODAL
     ======================================================================== */
  let moveSelectedClassId = null;
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
  function openMoveModal(preselectChild) {
    moveChildPreset = preselectChild;
    moveSelectedClassId = null;
    const cls = currentClass();
    const roster = childrenFor(cls);
    $('moveChildSelect').innerHTML = roster.map((c) => `<option value="${c.id}" ${preselectChild && preselectChild.id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
    $('moveChildSelect').disabled = !!preselectChild;
    $('moveEffectiveDate').value = todayISO();
    renderMoveClassOptions();
    setFieldError('moveChildSelect', null);
    setFieldError('moveClassOptions', null);
    updateMoveReview();
    openModal('moveModalBackdrop');
  }
  function renderMoveClassOptions() {
    const cls = currentClass();
    const targets = allActiveClasses().filter((c) => c.id !== cls.id);
    $('moveClassOptions').innerHTML = targets.length ? targets.map((c) => {
      const enrolled = childrenFor(c).length;
      const capacity = c.capacity || 0;
      const full = capacity > 0 && enrolled >= capacity;
      const pct = capacity ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;
      return `
        <button type="button" class="ws-move-card${full ? ' is-full' : ''}${moveSelectedClassId === c.id ? ' is-selected' : ''}" data-target-class="${c.id}" ${full ? 'disabled aria-disabled="true"' : ''}>
          <span class="ws-move-card__name">${escapeHtml(c.name)}</span>
          <span class="ws-move-card__cap">${enrolled} / ${capacity || '—'}${full ? ' · Full' : ''}</span>
          <span class="progress-linear"><span class="progress-linear__bar" style="width:${pct}%; background: ${full ? 'var(--color-error)' : 'var(--color-brand-blue-strong)'};"></span></span>
        </button>`;
    }).join('') : `<p class="ws-section-empty">No other active classes are available to move into.</p>`;
    $('moveClassOptions').querySelectorAll('[data-target-class]').forEach((btn) => btn.addEventListener('click', () => {
      moveSelectedClassId = btn.dataset.targetClass;
      renderMoveClassOptions();
      setFieldError('moveClassOptions', null);
      updateMoveReview();
    }));
  }
  function updateMoveReview() {
    const cls = currentClass();
    const childId2 = moveChildPreset ? moveChildPreset.id : $('moveChildSelect').value;
    const child = childId2 && window.PlayStore.getById(childId2);
    const target = moveSelectedClassId && window.PlayStore.getById(moveSelectedClassId);
    const date = $('moveEffectiveDate').value || todayISO();
    const isFuture = date > todayISO();
    $('moveReviewBox').innerHTML = (child && target)
      ? `<div class="ws-review-row"><span>${escapeHtml(child.name)}</span><span>${ICON.swap}</span><span>${escapeHtml(cls.name)} → ${escapeHtml(target.name)}</span></div>
         <div class="ws-review-note">${isFuture ? `Scheduled — takes effect on ${escapeHtml(date)}. Today's roster stays unchanged until then.` : 'Takes effect immediately.'}</div>`
      : `<p class="ws-section-empty">Select a child and destination class to review the move.</p>`;
  }
  function wireMoveModal() {
    const backdrop = $('moveModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('moveModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('moveModalBackdrop'); });
    $('moveCancel').addEventListener('click', () => closeModal('moveModalBackdrop'));
    $('moveChildSelect').addEventListener('change', updateMoveReview);
    $('moveEffectiveDate').addEventListener('change', updateMoveReview);
    $('moveConfirm').addEventListener('click', () => {
      const cls = currentClass();
      const childId2 = moveChildPreset ? moveChildPreset.id : $('moveChildSelect').value;
      const child = childId2 && window.PlayStore.getById(childId2);
      if (!child) { setFieldError('moveChildSelect', 'Choose a child to move.'); return; }
      if (!moveSelectedClassId) { setFieldError('moveClassOptions', 'Choose a destination class.'); return; }
      const target = window.PlayStore.getById(moveSelectedClassId);
      const enrolled = childrenFor(target).length;
      if (target.capacity && enrolled >= target.capacity) { setFieldError('moveClassOptions', `${target.name} is full.`); return; }
      const effectiveDate = $('moveEffectiveDate').value || todayISO();
      submitWithLoading('moveConfirm', () => {
        const isFuture = effectiveDate > todayISO();
        if (isFuture) {
          window.PlayStore.addRecord({ id: uid('MOVE'), type: 'ClassMove', childId: child.id, fromClassName: cls.name, toClassName: target.name, effectiveDate, status: 'Scheduled', createdAt: new Date().toISOString() });
          window.PlayShell.toast('success', 'Move scheduled', `${child.name} will move to ${target.name} on ${effectiveDate}.`);
        } else {
          window.PlayStore.updateRecord(child.id, { room: target.name });
          window.PlayStore.addRecord({ id: uid('MOVE'), type: 'ClassMove', childId: child.id, fromClassName: cls.name, toClassName: target.name, effectiveDate, status: 'Applied', createdAt: new Date().toISOString() });
          window.PlayShell.toast('success', 'Child moved', `${child.name} moved to ${target.name}.`);
        }
        closeModal('moveModalBackdrop');
        moveChildPreset = null;
        render();
      });
    });
  }

  /* ========================================================================
     ASSIGN SUBSTITUTE MODAL
     ======================================================================== */
  let subSelectedStaffId = null;
  function eligibleSubstitutes(date, excludeId) {
    const assignedElsewhere = new Set();
    allActiveClasses().forEach((c) => assignedStaffFor(c).forEach((s) => assignedElsewhere.add(s.id)));
    const busy = new Set(window.PlayStore.getByType('Substitution').filter((s) => s.date === date).map((s) => s.substituteStaffId));
    return allStaff().filter((s) => s.status === 'Active' && s.id !== excludeId && !assignedElsewhere.has(s.id) && !busy.has(s.id));
  }
  function openSubModal() {
    const cls = currentClass();
    const staffRows = [leadTeacherFor(cls)].concat(additionalStaffFor(cls)).filter(Boolean);
    subReplaceId = staffRows.length ? staffRows[0].id : null;
    subSelectedStaffId = null;
    $('subDate').value = todayISO();
    $('subOriginalSelect').innerHTML = staffRows.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    renderSubCandidates();
    setFieldError('subCandidates', null);
    openModal('subModalBackdrop');
  }
  function renderSubCandidates() {
    const date = $('subDate').value || todayISO();
    const candidates = eligibleSubstitutes(date, subReplaceId);
    $('subCandidates').innerHTML = candidates.length
      ? candidates.map((s) => `
        <button type="button" class="ws-sub-card${subSelectedStaffId === s.id ? ' is-selected' : ''}" data-sub-staff="${s.id}">
          <span class="avatar avatar--sm">${escapeHtml(initials(s.name))}</span>
          <span>${escapeHtml(s.name)}</span>
          <span class="ws-sub-card__tag">Available</span>
        </button>`).join('')
      : `<p class="ws-section-empty">No eligible substitutes are available for this date — every active staff member is already assigned or covering elsewhere.</p>`;
    $('subCandidates').querySelectorAll('[data-sub-staff]').forEach((btn) => btn.addEventListener('click', () => {
      subSelectedStaffId = btn.dataset.subStaff;
      renderSubCandidates();
      setFieldError('subCandidates', null);
    }));
  }
  function wireSubModal() {
    const backdrop = $('subModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('subModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('subModalBackdrop'); });
    $('subCancel').addEventListener('click', () => closeModal('subModalBackdrop'));
    $('subOriginalSelect').addEventListener('change', () => { subReplaceId = $('subOriginalSelect').value; subSelectedStaffId = null; renderSubCandidates(); });
    $('subDate').addEventListener('change', () => { subSelectedStaffId = null; renderSubCandidates(); });
    $('subConfirm').addEventListener('click', () => {
      if (!subSelectedStaffId) { setFieldError('subCandidates', 'Choose an available substitute.'); return; }
      const date = $('subDate').value || todayISO();
      const conflict = window.PlayStore.getByType('Substitution').some((s) => s.date === date && s.substituteStaffId === subSelectedStaffId);
      if (conflict) { setFieldError('subCandidates', 'This staff member is already covering another class on that date.'); return; }
      submitWithLoading('subConfirm', () => {
        const cls = currentClass();
        const original = window.PlayStore.getById(subReplaceId);
        const sub = window.PlayStore.getById(subSelectedStaffId);
        window.PlayStore.addRecord({ id: uid('SUB'), type: 'Substitution', classId: cls.id, date, originalStaffId: subReplaceId, substituteStaffId: subSelectedStaffId, createdAt: new Date().toISOString() });
        closeModal('subModalBackdrop');
        render();
        window.PlayShell.toast('success', 'Substitute assigned', `${sub.name} will cover for ${original.name} on ${date}.`);
      });
    });
  }

  /* ========================================================================
     ADD / EDIT ROUTINE BLOCK MODAL
     ======================================================================== */
  let editingRoutineId = null;
  const ROUTINE_KINDS = Object.keys(ROUTINE_LABEL);
  function openRoutineModal(block) {
    editingRoutineId = block ? block.id : null;
    $('routineModalTitle').textContent = block ? 'Edit routine block' : 'Add routine block';
    $('rbActivity').value = block ? block.activity : '';
    $('rbStart').value = block ? block.startTime : '';
    $('rbEnd').value = block ? block.endTime : '';
    $('rbKind').innerHTML = ROUTINE_KINDS.map((k) => `<option value="${k}" ${block && block.kind === k ? 'selected' : ''}>${ROUTINE_LABEL[k]}</option>`).join('');
    setFieldError('rbActivity', null); setFieldError('rbStart', null);
    openModal('routineModalBackdrop');
  }
  function wireRoutineModal() {
    const backdrop = $('routineModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('routineModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('routineModalBackdrop'); });
    $('rbCancel').addEventListener('click', () => closeModal('routineModalBackdrop'));
    $('rbSave').addEventListener('click', () => {
      const activity = $('rbActivity').value.trim();
      const start = $('rbStart').value;
      const end = $('rbEnd').value;
      if (!activity) { setFieldError('rbActivity', 'Enter an activity name.'); return; }
      if (!start || !end || end <= start) { setFieldError('rbStart', 'End time must be after start time.'); return; }
      setFieldError('rbActivity', null); setFieldError('rbStart', null);
      submitWithLoading('rbSave', () => {
        const payload = { activity, startTime: start, endTime: end, kind: $('rbKind').value };
        if (editingRoutineId) window.PlayStore.updateRecord(editingRoutineId, payload);
        else window.PlayStore.addRecord(Object.assign({ id: uid('RTN'), type: 'RoutineBlock', classId }, payload));
        closeModal('routineModalBackdrop');
        render();
        window.PlayShell.toast('success', editingRoutineId ? 'Block updated' : 'Block added', `${activity} saved to the daily routine.`);
      });
    });
  }
})();
