/* ==========================================================================
   PLAY SCHOOL — Weekly & Monthly Learning Planner (S27)
   Reuses: store.js (Class/Activity/FrameworkOutcome/WeeklyPlan/MonthlyTheme/
   RoutineBlock records — WeeklyPlan/MonthlyTheme/FrameworkOutcome/Activity
   are new types this page owns; RoutineBlock is the SAME timetable Class
   Workspace's (S24) Schedule tab reads/writes, so editing it here updates
   Class Workspace too, and vice versa), modules.js (this page is the real
   implementation behind the "Curriculum & Lesson Planning" module —
   Premium-gated, same lock pattern as attendance.js), shell.js.

   INTEGRATION NOTES:
   - A WeeklyPlan record is only created the first time a teacher actually
     places an activity or submits — viewing an empty week never writes a
     Draft record, so opening the page repeatedly can't create duplicates.
   - Status workflow (Draft → Submitted → Approved / Changes requested) is
     enforced both by hiding controls AND by checking `canEdit()`/role before
     any mutation — not UI-only, same approach as record.js's hasRole() gate.
   - Notifications reuse window.PlayShell.addNotification exactly as every
     other page does (forRole: 'Director' for submissions, 'Teacher' for
     review outcomes) — no separate notification channel invented.
   - "Copy last week" only ever writes the `assignments` field onto the
     destination plan — status, submittedBy, reviewedBy, reviewComment are
     never copied, so copying an approved week can't silently approve the
     new one.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function isoDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function todayISO() { return isoDate(new Date()); }
  function addDaysISO(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDate(d); }
  function mondayOf(iso) { const d = new Date(iso + 'T00:00:00'); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day; d.setDate(d.getDate() + diff); return isoDate(d); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function formatTime12(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + pad2(m) + ' ' + period;
  }
  function formatDateShort(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); }
  function formatDateLong(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }); }
  function currentStaff() { return { id: 'S-3001', name: 'Nithya' }; }

  const ICON = {
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polyline points="15 18 9 12 15 6"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polyline points="9 18 15 12 9 6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    materials: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    sunrise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/></svg>',
    puzzle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>',
    apple: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a9 9 0 0 0 9-9c0-4-2-8-9-11-7 3-9 7-9 11a9 9 0 0 0 9 9Z"/><path d="M12 21V11"/></svg>',
    tree: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-7"/><path d="M9 9a3 3 0 1 1 6 0c0 2-3 3-3 3s-3-1-3-3Z"/><path d="M7 15a4 4 0 1 1 10 0c0 2.5-3.5 4-5 4s-5-1.5-5-4Z"/></svg>',
    utensils: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2"/><path d="M5 12v10"/><path d="M19 2c-1.5 1.5-2 3.5-2 6s.5 4.5 2 6"/><path d="M19 2v20"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>',
    palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2a10 10 0 1 0 0 20c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C22 6.012 17.461 2 12 2Z"/></svg>',
    exit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
  };
  const ROUTINE_ICON = { arrival: ICON.sunrise, 'work-cycle': ICON.puzzle, snack: ICON.apple, outdoor: ICON.tree, lunch: ICON.utensils, nap: ICON.moon, afternoon: ICON.palette, departure: ICON.exit };
  const ROUTINE_LABEL = { arrival: 'Arrival', 'work-cycle': 'Work cycle', snack: 'Snack', outdoor: 'Outdoor play', lunch: 'Lunch', nap: 'Nap / rest', afternoon: 'Afternoon activities', departure: 'Departure' };

  const LEARNING_AREAS = [
    { key: 'practical-life', label: 'Practical Life', color: '--color-primary' },
    { key: 'sensorial', label: 'Sensorial', color: '--color-secondary' },
    { key: 'language', label: 'Language & Literacy', color: '--color-brand-blue' },
    { key: 'mathematics', label: 'Mathematics', color: '--color-success' },
    { key: 'creative', label: 'Creative & Outdoor', color: '--color-primary-soft' },
  ];
  function areaMeta(key) { return LEARNING_AREAS.find((a) => a.key === key) || { key, label: key, color: '--color-text-muted' }; }

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const STATUS_META = {
    Draft: { label: 'Draft', cls: 'neutral' },
    Submitted: { label: 'Submitted', cls: 'info' },
    Approved: { label: 'Approved', cls: 'ok' },
    ChangesRequested: { label: 'Changes requested', cls: 'warn' },
  };

  let role = null;
  let classId = null;
  let weekStart = mondayOf(todayISO());
  let activeTab = 'weekly';
  let activeDayIndex = 0;
  let librarySearch = '';
  let libraryAreaFilters = new Set();
  let dragPayload = null;
  let editingThemeId = null;
  let editingRoutineId = null;
  let editingActivityId = null;
  let creatingActivity = false;
  let pendingAddContext = null;
  let touchStartX = null;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', (e) => { role = e.detail.role; render(); });

  function init() {
    window.PlayShell.login();
    role = window.PlayShell.getDemoRole();
    window.PlayShell.mount('curriculum', 'Weekly & Monthly Planner');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    if (!isModuleUnlocked()) { renderLocked(); return; }
    $('plMain').hidden = false;

    const params = new URLSearchParams(window.location.search);
    const classes = allActiveClasses();
    const requested = params.get('classId');
    classId = (requested && classes.some((c) => c.id === requested)) ? requested : (classes[0] ? classes[0].id : null);
    const weekParam = params.get('weekStart');
    if (weekParam) weekStart = mondayOf(weekParam);
    const idx = DAYS.indexOf(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]);
    activeDayIndex = idx === -1 ? 0 : idx;

    wireHeader();
    wireTabs();
    wireCopyModal();
    wireSubmitModal();
    wireReviewModal();
    wireThemeModal();
    wireRoutineModal();
    wireAddActivityModal();
    wireActivityDetailModal();
    wireLibrarySheet();

    window.setTimeout(() => { $('plSkeleton').hidden = true; $('plBody').hidden = false; render(); }, 380);
  }

  /* ---------- module gate (Premium — same pattern as attendance.js) ---------- */
  function isModuleUnlocked() {
    if (!window.PlayModules) return true;
    const mod = window.PlayModules.getById('curriculum');
    if (!mod) return true;
    return window.PlayModules.isUnlocked(mod, window.PlayModules.getCurrentPlan());
  }
  function renderLocked() {
    $('plLocked').hidden = false;
    $('plMain').hidden = true;
    $('plLockedIcon').innerHTML = ICON.lock;
    const isAdminish = role === 'Director' || role === 'Admin';
    $('plLockedAction').innerHTML = isAdminish
      ? `<a class="btn btn--accent" href="plans.html?module=curriculum&role=${encodeURIComponent(role)}">See plans &amp; upgrade</a>`
      : `<a class="btn btn--secondary" href="module.html?id=curriculum&role=${encodeURIComponent(role)}">Ask my admin to upgrade</a>`;
  }

  /* ---------- data helpers ---------- */
  function allActiveClasses() { return window.PlayStore.getByType('Class').filter((c) => c.status !== 'Archived'); }
  function currentClass() { return classId ? window.PlayStore.getById(classId) : null; }
  function allActivities() { return window.PlayStore.getByType('Activity'); }
  function activityById(id) { return window.PlayStore.getById(id); }
  function allOutcomes() { return window.PlayStore.getByType('FrameworkOutcome'); }
  function routineBlocksFor(cls) { return window.PlayStore.getByType('RoutineBlock').filter((b) => b.classId === cls.id).sort((a, b) => a.startTime.localeCompare(b.startTime)); }
  function findPlan(cls, ws) { return window.PlayStore.getByType('WeeklyPlan').find((p) => p.classId === cls.id && p.weekStart === ws) || null; }
  function virtualPlan(cls, ws) { return { id: null, classId: cls.id, weekStart: ws, assignments: {}, status: 'Draft' }; }
  function currentPlan() { const cls = currentClass(); return cls ? (findPlan(cls, weekStart) || virtualPlan(cls, weekStart)) : null; }
  function ensurePlanRecord() {
    const cls = currentClass();
    const existing = findPlan(cls, weekStart);
    if (existing) return existing;
    return window.PlayStore.addRecord({ id: uid('WP'), type: 'WeeklyPlan', classId: cls.id, weekStart, assignments: {}, status: 'Draft', submittedBy: null, submittedAt: null, reviewedBy: null, reviewedAt: null, reviewComment: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  function hasRole(roles) { return roles.indexOf(role) !== -1; }
  function canEdit() { const p = currentPlan(); return !!p && (p.status === 'Draft' || p.status === 'ChangesRequested'); }
  function canReview() { const p = currentPlan(); return !!p && p.status === 'Submitted' && hasRole(['Director', 'Admin']); }

  function weekDates(ws) { return DAYS.map((d, i) => ({ abbr: d, iso: addDaysISO(ws, i) })); }
  function weekRangeLabel(ws) { return formatDateShort(ws) + ' – ' + formatDateShort(addDaysISO(ws, 4)) + ', ' + new Date(ws + 'T00:00:00').getFullYear(); }

  /* ---------- render orchestration ---------- */
  function render() {
    const cls = currentClass();
    if (!cls) { renderNoClasses(); return; }
    renderHeader(cls);
    renderTabPanel(cls);
  }
  function renderNoClasses() {
    $('plBody').innerHTML = `<div class="state-panel"><div class="state-panel__icon">${ICON.inbox}</div><div class="state-panel__title">No classes yet</div><p class="state-panel__text">Create a class first to start planning.</p><div class="state-panel__action"><a class="btn btn--accent" href="classes.html">Go to Classes</a></div></div>`;
  }

  function renderHeader(cls) {
    $('plClassSelect').innerHTML = allActiveClasses().map((c) => `<option value="${c.id}" ${c.id === cls.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
    $('plWeekLabel').textContent = weekRangeLabel(weekStart);
    const plan = currentPlan();
    const meta = STATUS_META[plan.status] || STATUS_META.Draft;
    $('plStatusChip').className = 'pl-status-chip pl-status-chip--' + meta.cls;
    $('plStatusChip').innerHTML = `<span class="pl-status-chip__dot"></span>${meta.label}`;

    const editable = canEdit();
    const reviewer = canReview();
    $('plSubmitBtn').hidden = !editable;
    $('plCopyBtn').hidden = !editable;
    $('plApproveBtn').hidden = !reviewer;
    $('plRequestChangesBtn').hidden = !reviewer;

    if (plan.status === 'ChangesRequested' && plan.reviewComment) {
      $('plReviewBanner').hidden = false;
      $('plReviewBanner').innerHTML = `${ICON.comment}<div><div class="pl-review-banner__title">Changes requested by ${escapeHtml(plan.reviewedBy || 'a reviewer')}</div><div class="pl-review-banner__text">${escapeHtml(plan.reviewComment)}</div></div>`;
    } else { $('plReviewBanner').hidden = true; }

    // summary
    const assignments = plan.assignments || {};
    let activityCount = 0; const dayset = new Set(); const areaset = new Set();
    Object.keys(assignments).forEach((key) => {
      const ids = assignments[key] || [];
      if (!ids.length) return;
      activityCount += ids.length;
      dayset.add(key.split('::')[0]);
      ids.forEach((id) => { const a = activityById(id); if (a) areaset.add(a.area); });
    });
    $('plSummary').innerHTML = [
      { value: activityCount, label: 'Activities planned' },
      { value: dayset.size, label: 'Days planned' },
      { value: areaset.size, label: 'Learning areas covered' },
      { value: meta.label, label: 'Review status' },
    ].map((s) => `<div class="pl-summary-card"><div class="pl-summary-card__value">${escapeHtml(String(s.value))}</div><div class="pl-summary-card__label">${escapeHtml(s.label)}</div></div>`).join('');
  }

  /* ---------- tabs ---------- */
  const TABS = [
    { key: 'weekly', label: 'Weekly plan' },
    { key: 'themes', label: 'Monthly themes' },
    { key: 'timetable', label: 'Timetable' },
    { key: 'library', label: 'Activity library' },
  ];
  function wireTabs() {
    $('plTabs').innerHTML = TABS.map((t) => `<button class="pl-tab" type="button" data-tab="${t.key}" role="tab" aria-selected="${t.key === activeTab}">${escapeHtml(t.label)}</button>`).join('');
    $('plTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (!btn) return;
      activeTab = btn.dataset.tab;
      render();
    });
  }
  function renderTabPanel(cls) {
    $('plTabs').querySelectorAll('[data-tab]').forEach((btn) => btn.setAttribute('aria-selected', String(btn.dataset.tab === activeTab)));
    const panel = $('plTabPanel');
    panel.classList.remove('pl-tab-panel--in');
    if (activeTab === 'weekly') panel.innerHTML = weeklyTabHtml(cls);
    else if (activeTab === 'themes') panel.innerHTML = themesTabHtml(cls);
    else if (activeTab === 'timetable') panel.innerHTML = timetableTabHtml(cls);
    else panel.innerHTML = `<div class="pl-library-tab">${libraryPanelHtml(true)}</div>`;
    requestAnimationFrame(() => panel.classList.add('pl-tab-panel--in'));
    wirePanelEvents(cls);
  }

  /* ========================================================================
     TAB 1 — WEEKLY PLAN
     ======================================================================== */
  function activityCardHtml(a, day, blockId, editable) {
    const meta = areaMeta(a.area);
    return `
      <div class="pl-activity-card" ${editable ? 'draggable="true"' : ''} data-activity="${a.id}" data-from-day="${day}" data-from-block="${blockId}" style="--area-color: var(${meta.color});" tabindex="0" role="button" aria-label="${escapeHtml(a.name)}">
        <span class="pl-activity-card__title">${escapeHtml(a.name)}</span>
        ${a.materials && a.materials.length ? `<span class="pl-activity-card__materials" title="${escapeHtml(a.materials.join(', '))}">${ICON.materials}</span>` : ''}
        ${editable ? `<button class="pl-activity-card__remove" type="button" data-remove-activity="${a.id}" data-remove-day="${day}" data-remove-block="${blockId}" aria-label="Remove ${escapeHtml(a.name)}">&times;</button>` : ''}
      </div>`;
  }
  function cellHtml(day, block, plan, editable, isActiveDay) {
    const key = day + '::' + block.id;
    const ids = (plan.assignments && plan.assignments[key]) || [];
    const cards = ids.map((id) => { const a = activityById(id); return a ? activityCardHtml(a, day, block.id, editable) : ''; }).join('');
    const addBtn = editable ? `<button class="pl-cell__add" type="button" data-add-day="${day}" data-add-block="${block.id}" aria-label="Add activity to ${ROUTINE_LABEL[block.kind] || block.activity} on ${day}">${ICON.plus}</button>` : '';
    return `<div class="pl-cell${editable ? '' : ' pl-cell--locked'}${isActiveDay ? ' pl-cell--active-day' : ''}" data-day="${day}" data-block="${block.id}">${cards}${!ids.length && !editable ? '<span class="pl-cell__empty">—</span>' : ''}${addBtn}</div>`;
  }
  function dayDailySummary(day, iso, blocks, plan) {
    let count = 0;
    blocks.forEach((b) => { count += ((plan.assignments && plan.assignments[day + '::' + b.id]) || []).length; });
    return count ? `${count} ${count === 1 ? 'activity' : 'activities'}` : 'Unplanned';
  }
  function weeklyTabHtml(cls) {
    const blocks = routineBlocksFor(cls);
    const plan = currentPlan();
    const editable = canEdit();
    const dates = weekDates(weekStart);
    const today = todayISO();

    if (!blocks.length) {
      return `<div class="state-panel"><div class="state-panel__icon">${ICON.clock}</div><div class="state-panel__title">No timetable configured</div><p class="state-panel__text">Add routine blocks in the Timetable tab before planning activities.</p><div class="state-panel__action"><button class="btn btn--accent" type="button" data-goto-timetable>Go to Timetable</button></div></div>`;
    }

    const dayHeaders = dates.map((d, i) => `
      <div class="pl-day-col__head${d.iso === today ? ' is-today' : ''}${i === activeDayIndex ? ' pl-day-col__head--active-day' : ''}" data-day-head="${d.abbr}">
        <span class="pl-day-col__name">${d.abbr}</span>
        <span class="pl-day-col__date">${formatDateShort(d.iso)}</span>
        <span class="pl-day-col__summary">${dayDailySummary(d.abbr, d.iso, blocks, plan)}</span>
      </div>`).join('');

    const rows = blocks.map((b) => `
      <div class="pl-grid-row">
        <div class="pl-grid-row__label">${ROUTINE_ICON[b.kind] || ICON.clock}<span>${escapeHtml(b.activity)}</span><span class="pl-grid-row__time">${formatTime12(b.startTime)}</span></div>
        ${dates.map((d, i) => cellHtml(d.abbr, b, plan, editable, i === activeDayIndex)).join('')}
      </div>`).join('');

    const dayNav = `
      <div class="pl-day-nav">
        <button class="btn btn--icon" type="button" id="plPrevDay" aria-label="Previous day">${ICON.chevronLeft}</button>
        <span class="pl-day-nav__label">${dates[activeDayIndex].abbr} · ${formatDateLong(dates[activeDayIndex].iso)}</span>
        <button class="btn btn--icon" type="button" id="plNextDay" aria-label="Next day">${ICON.chevronRight}</button>
      </div>`;

    return `
      <div class="pl-weekly-layout">
        <div class="pl-weekly-main">
          ${!editable ? `<div class="pl-locked-banner">${ICON.lock} This plan is ${STATUS_META[plan.status].label.toLowerCase()} and can't be edited right now.</div>` : ''}
          ${dayNav}
          <div class="pl-week-grid" data-active-day="${dates[activeDayIndex].abbr}" style="--pl-days: ${dates.length};">
            <div class="pl-grid-row pl-grid-row--head"><div class="pl-grid-row__label"></div>${dayHeaders}</div>
            ${rows}
          </div>
        </div>
        <aside class="pl-weekly-library">${libraryPanelHtml(false)}</aside>
      </div>
      <button class="btn btn--accent pl-browse-fab" type="button" id="plBrowseLibraryBtn">${ICON.book}<span>&nbsp;Browse activities</span></button>`;
  }

  /* ---------- activity library panel (shared: weekly sidebar / library tab / mobile sheet) ---------- */
  function filteredActivities() {
    const q = librarySearch.trim().toLowerCase();
    return allActivities().filter((a) => {
      if (libraryAreaFilters.size && !libraryAreaFilters.has(a.area)) return false;
      if (!q) return true;
      const haystack = (a.name + ' ' + (a.materials || []).join(' ') + ' ' + areaMeta(a.area).label).toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
  }
  function libraryCardHtml(a, editable) {
    const meta = areaMeta(a.area);
    const ageLabel = a.ageRangeMonths ? Math.round(a.ageRangeMonths[0] / 12 * 10) / 10 + '–' + Math.round(a.ageRangeMonths[1] / 12 * 10) / 10 + ' yrs' : '';
    return `
      <div class="pl-lib-card" ${editable ? 'draggable="true"' : ''} data-activity="${a.id}" style="--area-color: var(${meta.color});" tabindex="0" role="button" aria-label="${escapeHtml(a.name)}">
        <div class="pl-lib-card__bar"></div>
        <div class="pl-lib-card__body">
          <div class="pl-lib-card__title">${escapeHtml(a.name)}</div>
          <div class="pl-lib-card__meta"><span class="pl-lib-card__area">${escapeHtml(meta.label)}</span>${ageLabel ? `<span>· ${ageLabel}</span>` : ''}</div>
        </div>
        ${a.materials && a.materials.length ? `<span class="pl-lib-card__materials" title="${escapeHtml(a.materials.join(', '))}">${ICON.materials}</span>` : ''}
        ${editable ? `<button class="pl-lib-card__add" type="button" data-quick-add="${a.id}" aria-label="Add ${escapeHtml(a.name)} to a day">${ICON.plus}</button>` : ''}
      </div>`;
  }
  function libraryPanelHtml(isTab) {
    const activities = filteredActivities();
    const editable = canEdit();
    return `
      <div class="pl-library">
        <div class="pl-library__head">
          <div class="input-wrap pl-library__search">
            <span class="input-wrap__icon">${ICON.search}</span>
            <input class="input" id="plLibSearch${isTab ? 'Tab' : ''}" type="text" placeholder="Search activities…" value="${escapeHtml(librarySearch)}" />
          </div>
          ${editable ? `<button class="btn btn--secondary btn--sm" type="button" id="plNewActivityBtn${isTab ? 'Tab' : ''}">${ICON.plus}<span>&nbsp;New</span></button>` : ''}
        </div>
        <div class="pl-library__filters">
          ${LEARNING_AREAS.map((a) => `<button class="pl-area-chip${libraryAreaFilters.has(a.key) ? ' is-active' : ''}" type="button" data-area-filter="${a.key}" style="--area-color: var(${a.color});">${escapeHtml(a.label)}</button>`).join('')}
        </div>
        <p class="pl-library__count">${activities.length} ${activities.length === 1 ? 'activity' : 'activities'}</p>
        <div class="pl-library__list">
          ${activities.length ? activities.map((a) => libraryCardHtml(a, editable)).join('') : `<p class="ws-section-empty">No activities match your search.</p>`}
        </div>
      </div>`;
  }

  /* ---------- mobile library bottom sheet ---------- */
  function wireLibrarySheet() {
    $('plLibrarySheetBackdrop').addEventListener('click', (e) => { if (e.target === $('plLibrarySheetBackdrop')) closeLibrarySheet(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('plLibrarySheetBackdrop').classList.contains('is-open')) closeLibrarySheet(); });
  }
  function openLibrarySheet() {
    $('plLibrarySheetBody').innerHTML = libraryPanelHtml(false);
    wirePanelEvents(currentClass());
    $('plLibrarySheetBackdrop').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeLibrarySheet() { $('plLibrarySheetBackdrop').classList.remove('is-open'); document.body.style.overflow = ''; }

  /* ========================================================================
     TAB 2 — MONTHLY THEMES
     ======================================================================== */
  function themesTabHtml(cls) {
    const themes = window.PlayStore.getByType('MonthlyTheme').filter((t) => t.classId === cls.id).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    const head = `<div class="ws-panel-head"><div><h2 class="ws-panel-title">Monthly themes</h2><p class="ws-panel-sub">${escapeHtml(cls.name)}</p></div><button class="btn btn--accent btn--sm" type="button" id="plNewThemeBtn">${ICON.plus}<span>&nbsp;Create theme</span></button></div>`;
    if (!themes.length) {
      return head + `<div class="state-panel"><div class="state-panel__icon">${ICON.inbox}</div><div class="state-panel__title">No themes yet</div><p class="state-panel__text">Create a weekly theme to guide this month's planning.</p><div class="state-panel__action"><button class="btn btn--accent" type="button" id="plNewThemeBtnEmpty">${ICON.plus}<span>&nbsp;Create theme</span></button></div></div>`;
    }
    const cards = themes.map((t) => `
      <article class="pl-theme-card">
        <div class="pl-theme-card__head">
          <div>
            <div class="pl-theme-card__range">${escapeHtml(weekRangeLabel(t.weekStart))}</div>
            <h3 class="pl-theme-card__name">${escapeHtml(t.name)}</h3>
          </div>
          <button class="ws-icon-btn" type="button" data-edit-theme="${t.id}" aria-label="Edit ${escapeHtml(t.name)}">${ICON.pencil}</button>
        </div>
        <div class="pl-theme-card__areas">${(t.focusAreas || []).map((k) => { const m = areaMeta(k); return `<span class="pl-area-chip is-active" style="--area-color: var(${m.color});">${escapeHtml(m.label)}</span>`; }).join('')}</div>
        ${t.description ? `<p class="pl-theme-card__desc">${escapeHtml(t.description)}</p>` : ''}
        ${(t.vocabulary || []).length ? `<div class="pl-theme-card__vocab">${t.vocabulary.map((w) => `<span class="badge badge--neutral">${escapeHtml(w)}</span>`).join('')}</div>` : ''}
        <div class="pl-theme-card__footer">${(t.linkedActivityIds || []).length} linked ${(t.linkedActivityIds || []).length === 1 ? 'activity' : 'activities'}</div>
      </article>`).join('');
    return head + `<div class="pl-theme-grid">${cards}</div>`;
  }

  /* ========================================================================
     TAB 3 — TIMETABLE (reuses RoutineBlock — same records as Class Workspace)
     ======================================================================== */
  function blockState(block) {
    const now = pad2(new Date().getHours()) + ':' + pad2(new Date().getMinutes());
    if (now < block.startTime) return 'upcoming';
    if (now >= block.endTime) return 'done';
    return 'current';
  }
  function timetableTabHtml(cls) {
    const blocks = routineBlocksFor(cls);
    const head = `<div class="ws-panel-head"><div><h2 class="ws-panel-title">Timetable</h2><p class="ws-panel-sub">${escapeHtml(cls.name)}'s daily routine — shared with Class Workspace</p></div><button class="btn btn--secondary btn--sm" type="button" id="plAddRoutineBtn">${ICON.plus}<span>&nbsp;Add block</span></button></div>`;
    if (!blocks.length) {
      return head + `<div class="state-panel"><div class="state-panel__icon">${ICON.clock}</div><div class="state-panel__title">No timetable configured yet</div><p class="state-panel__text">Add the first routine block for ${escapeHtml(cls.name)}.</p><div class="state-panel__action"><button class="btn btn--accent" type="button" id="plAddRoutineBtnEmpty">${ICON.plus}<span>&nbsp;Add block</span></button></div></div>`;
    }
    const items = blocks.map((b) => {
      const state = blockState(b);
      return `
      <div class="ws-timeline-item ws-timeline-item--${state}">
        <div class="ws-timeline-item__rail"><span class="ws-timeline-item__dot">${ROUTINE_ICON[b.kind] || ICON.clock}</span></div>
        <div class="ws-timeline-item__card">
          <div class="ws-timeline-item__top"><span class="ws-timeline-item__name">${escapeHtml(b.activity)}</span><span class="ws-timeline-item__badge ws-timeline-item__badge--${state}">${state === 'current' ? 'Now' : state === 'upcoming' ? 'Upcoming' : 'Done'}</span></div>
          <div class="ws-timeline-item__time">${formatTime12(b.startTime)} – ${formatTime12(b.endTime)} · ${Math.round((toMinutes(b.endTime) - toMinutes(b.startTime)))} min</div>
        </div>
        <div class="ws-timeline-item__actions">
          <button class="ws-icon-btn" type="button" data-edit-routine="${b.id}" aria-label="Edit ${escapeHtml(b.activity)}">${ICON.pencil}</button>
          <button class="ws-icon-btn" type="button" data-delete-routine="${b.id}" aria-label="Delete ${escapeHtml(b.activity)}">${ICON.trash}</button>
        </div>
      </div>`;
    }).join('');
    return head + `<div class="ws-timeline">${items}</div>`;
  }
  function toMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
  function rangesOverlap(aStart, aEnd, bStart, bEnd) { return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd); }

  /* ---------- panel-level event wiring (re-run after every render) ---------- */
  function wirePanelEvents(cls) {
    const panel = $('plTabPanel');
    const gotoTimetable = panel.querySelector('[data-goto-timetable]');
    if (gotoTimetable) gotoTimetable.addEventListener('click', () => { activeTab = 'timetable'; render(); });

    // weekly grid
    panel.querySelectorAll('.pl-cell').forEach((cell) => {
      cell.addEventListener('dragover', (e) => { if (!canEdit()) return; e.preventDefault(); cell.classList.add('is-dragover'); });
      cell.addEventListener('dragleave', () => cell.classList.remove('is-dragover'));
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('is-dragover');
        if (!dragPayload || !canEdit()) return;
        placeActivity(dragPayload.activityId, cell.dataset.day, cell.dataset.block, dragPayload.fromDay, dragPayload.fromBlock);
      });
    });
    panel.querySelectorAll('.pl-activity-card[draggable]').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        dragPayload = { activityId: card.dataset.activity, fromDay: card.dataset.fromDay || null, fromBlock: card.dataset.fromBlock || null };
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', card.dataset.activity); } catch (err) { /* ignore */ }
      });
      card.addEventListener('dragend', () => { dragPayload = null; });
    });
    panel.querySelectorAll('.pl-lib-card[draggable]').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        dragPayload = { activityId: card.dataset.activity, fromDay: null, fromBlock: null };
        e.dataTransfer.effectAllowed = 'copy';
        try { e.dataTransfer.setData('text/plain', card.dataset.activity); } catch (err) { /* ignore */ }
      });
      card.addEventListener('dragend', () => { dragPayload = null; });
    });
    panel.querySelectorAll('[data-add-day]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); openAddActivityModal({ day: btn.dataset.addDay, blockId: btn.dataset.addBlock }); }));
    panel.querySelectorAll('[data-quick-add]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); openAddActivityModal({ activityId: btn.dataset.quickAdd }); }));
    panel.querySelectorAll('[data-remove-activity]').forEach((btn) => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!canEdit()) return;
      removeActivity(btn.dataset.removeActivity, btn.dataset.removeDay, btn.dataset.removeBlock);
    }));
    panel.querySelectorAll('.pl-activity-card, .pl-lib-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-remove-activity]') || e.target.closest('[data-quick-add]')) return;
        openActivityDetailModal(card.dataset.activity);
      });
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') openActivityDetailModal(card.dataset.activity); });
    });
    const prevDay = $('plPrevDay'); const nextDay = $('plNextDay');
    if (prevDay) prevDay.addEventListener('click', () => { activeDayIndex = Math.max(0, activeDayIndex - 1); render(); });
    if (nextDay) nextDay.addEventListener('click', () => { activeDayIndex = Math.min(DAYS.length - 1, activeDayIndex + 1); render(); });
    const grid = panel.querySelector('.pl-week-grid');
    if (grid) {
      grid.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
      grid.addEventListener('touchend', (e) => {
        if (touchStartX == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 50) { activeDayIndex = Math.max(0, Math.min(DAYS.length - 1, activeDayIndex + (dx < 0 ? 1 : -1))); render(); }
        touchStartX = null;
      }, { passive: true });
    }
    const browseBtn = $('plBrowseLibraryBtn');
    if (browseBtn) browseBtn.addEventListener('click', openLibrarySheet);

    // library search/filters (desktop sidebar + tab + mobile sheet instances)
    ['plLibSearch', 'plLibSearchTab'].forEach((id) => { const el = $(id); if (el) el.addEventListener('input', () => { librarySearch = el.value; render(); }); });
    document.querySelectorAll('#plLibrarySheetBody [id^="plLibSearch"]').forEach((el) => el.addEventListener('input', () => { librarySearch = el.value; openLibrarySheet(); }));
    document.querySelectorAll('[data-area-filter]').forEach((chip) => chip.addEventListener('click', () => {
      const key = chip.dataset.areaFilter;
      if (libraryAreaFilters.has(key)) libraryAreaFilters.delete(key); else libraryAreaFilters.add(key);
      if ($('plLibrarySheetBackdrop').classList.contains('is-open')) openLibrarySheet(); else render();
    }));
    ['plNewActivityBtn', 'plNewActivityBtnTab'].forEach((id) => { const el = $(id); if (el) el.addEventListener('click', () => openActivityDetailModal(null, true)); });

    // themes
    const newThemeBtn = $('plNewThemeBtn') || $('plNewThemeBtnEmpty');
    if (newThemeBtn) newThemeBtn.addEventListener('click', () => openThemeModal(null));
    panel.querySelectorAll('[data-edit-theme]').forEach((btn) => btn.addEventListener('click', () => openThemeModal(window.PlayStore.getById(btn.dataset.editTheme))));

    // timetable
    const addRoutine = $('plAddRoutineBtn') || $('plAddRoutineBtnEmpty');
    if (addRoutine) addRoutine.addEventListener('click', () => openRoutineModal(null));
    panel.querySelectorAll('[data-edit-routine]').forEach((btn) => btn.addEventListener('click', () => openRoutineModal(window.PlayStore.getById(btn.dataset.editRoutine))));
    panel.querySelectorAll('[data-delete-routine]').forEach((btn) => btn.addEventListener('click', () => {
      const block = window.PlayStore.getById(btn.dataset.deleteRoutine);
      if (!block) return;
      window.PlayStore.removeRecord(block.id);
      render();
      window.PlayShell.toast('success', 'Removed', `${block.activity} removed from the timetable.`);
    }));
  }

  /* ---------- weekly plan mutations ---------- */
  function placeActivity(activityId, day, blockId, fromDay, fromBlock) {
    const plan = ensurePlanRecord();
    const assignments = Object.assign({}, plan.assignments);
    const targetKey = day + '::' + blockId;
    const target = (assignments[targetKey] || []).slice();
    if (target.indexOf(activityId) !== -1) { window.PlayShell.toast('info', 'Already planned', 'This activity is already in that slot.'); return; }
    if (fromDay && fromBlock) {
      const sourceKey = fromDay + '::' + fromBlock;
      assignments[sourceKey] = (assignments[sourceKey] || []).filter((id) => id !== activityId);
    }
    target.push(activityId);
    assignments[targetKey] = target;
    window.PlayStore.updateRecord(plan.id, { assignments, updatedAt: new Date().toISOString() });
    render();
  }
  function removeActivity(activityId, day, blockId) {
    const plan = findPlan(currentClass(), weekStart);
    if (!plan) return;
    const key = day + '::' + blockId;
    const assignments = Object.assign({}, plan.assignments);
    assignments[key] = (assignments[key] || []).filter((id) => id !== activityId);
    window.PlayStore.updateRecord(plan.id, { assignments, updatedAt: new Date().toISOString() });
    render();
  }

  function wireHeader() {
    $('plClassSelect').addEventListener('change', () => { classId = $('plClassSelect').value; activeTab = 'weekly'; render(); });
    $('plWeekPrev').addEventListener('click', () => { weekStart = addDaysISO(weekStart, -7); render(); });
    $('plWeekNext').addEventListener('click', () => { weekStart = addDaysISO(weekStart, 7); render(); });
    $('plCopyBtn').addEventListener('click', openCopyModal);
    $('plSubmitBtn').addEventListener('click', openSubmitModal);
    $('plApproveBtn').addEventListener('click', approvePlan);
    $('plRequestChangesBtn').addEventListener('click', openReviewModal);
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
    const btn = $(btnId); if (!btn || btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading'); btn.disabled = true;
    window.setTimeout(() => { work(); btn.classList.remove('is-loading'); btn.disabled = false; }, 300);
  }

  /* ========================================================================
     SUBMIT FOR REVIEW
     ======================================================================== */
  function openSubmitModal() {
    if (!canEdit()) return;
    $('submitModalText').textContent = `Submit ${currentClass().name}'s plan for the week of ${weekRangeLabel(weekStart)} for review? You won't be able to make further changes until it's reviewed.`;
    openModal('submitModalBackdrop');
  }
  function wireSubmitModal() {
    const backdrop = $('submitModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('submitModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('submitModalBackdrop'); });
    $('submitCancel').addEventListener('click', () => closeModal('submitModalBackdrop'));
    $('submitConfirm').addEventListener('click', () => {
      if (!canEdit()) { closeModal('submitModalBackdrop'); return; }
      submitWithLoading('submitConfirm', () => {
        const plan = ensurePlanRecord();
        if (plan.status !== 'Draft' && plan.status !== 'ChangesRequested') { closeModal('submitModalBackdrop'); window.PlayShell.toast('error', "Couldn't submit", 'This plan was already submitted.'); render(); return; }
        const staff = currentStaff();
        window.PlayStore.updateRecord(plan.id, { status: 'Submitted', submittedBy: staff.name, submittedAt: new Date().toISOString(), reviewComment: null });
        window.PlayShell.addNotification({ title: 'Weekly plan submitted for review', text: `${currentClass().name}'s plan for the week of ${weekRangeLabel(weekStart)} is ready for review.`, forRole: 'Director', module: 'curriculum', recordRoute: `planner.html?classId=${encodeURIComponent(classId)}&weekStart=${weekStart}` });
        closeModal('submitModalBackdrop');
        render();
        window.PlayShell.toast('success', 'Submitted for review', 'The plan has been sent for review.');
      });
    });
  }

  /* ---------- Approve / Request changes ---------- */
  function approvePlan() {
    if (!canReview()) return;
    submitWithLoading('plApproveBtn', () => {
      const plan = findPlan(currentClass(), weekStart);
      if (!plan || plan.status !== 'Submitted') { window.PlayShell.toast('error', "Couldn't approve", 'This plan is no longer awaiting review.'); render(); return; }
      const staff = currentStaff();
      window.PlayStore.updateRecord(plan.id, { status: 'Approved', reviewedBy: staff.name, reviewedAt: new Date().toISOString(), reviewComment: null });
      window.PlayShell.addNotification({ title: 'Weekly plan approved', text: `${currentClass().name}'s plan for the week of ${weekRangeLabel(weekStart)} was approved.`, forRole: 'Teacher', module: 'curriculum', recordRoute: `planner.html?classId=${encodeURIComponent(classId)}&weekStart=${weekStart}` });
      render();
      window.PlayShell.toast('success', 'Plan approved', 'The teacher has been notified.');
    });
  }
  function openReviewModal() {
    if (!canReview()) return;
    $('reviewComment').value = '';
    setFieldError('reviewComment', null);
    openModal('reviewModalBackdrop');
  }
  function wireReviewModal() {
    const backdrop = $('reviewModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('reviewModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('reviewModalBackdrop'); });
    $('reviewCancel').addEventListener('click', () => closeModal('reviewModalBackdrop'));
    $('reviewConfirm').addEventListener('click', () => {
      const comment = $('reviewComment').value.trim();
      if (!comment) { setFieldError('reviewComment', 'Enter a comment explaining what needs to change.'); return; }
      if (!canReview()) { closeModal('reviewModalBackdrop'); return; }
      submitWithLoading('reviewConfirm', () => {
        const plan = findPlan(currentClass(), weekStart);
        if (!plan || plan.status !== 'Submitted') { window.PlayShell.toast('error', "Couldn't send", 'This plan is no longer awaiting review.'); closeModal('reviewModalBackdrop'); render(); return; }
        const staff = currentStaff();
        window.PlayStore.updateRecord(plan.id, { status: 'ChangesRequested', reviewedBy: staff.name, reviewedAt: new Date().toISOString(), reviewComment: comment });
        window.PlayShell.addNotification({ title: 'Changes requested on weekly plan', text: `${staff.name} requested changes to ${currentClass().name}'s plan for the week of ${weekRangeLabel(weekStart)}: "${comment}"`, forRole: 'Teacher', module: 'curriculum', recordRoute: `planner.html?classId=${encodeURIComponent(classId)}&weekStart=${weekStart}` });
        closeModal('reviewModalBackdrop');
        render();
        window.PlayShell.toast('success', 'Changes requested', 'The teacher has been notified.');
      });
    });
  }

  /* ========================================================================
     COPY LAST WEEK
     ======================================================================== */
  function openCopyModal() {
    if (!canEdit()) return;
    const prevWeekStart = addDaysISO(weekStart, -7);
    const prevPlan = findPlan(currentClass(), prevWeekStart);
    if (!prevPlan || !Object.keys(prevPlan.assignments || {}).some((k) => (prevPlan.assignments[k] || []).length)) {
      $('copyModalText').textContent = `There's no planned activity for the week of ${weekRangeLabel(prevWeekStart)} to copy from.`;
      $('copyConfirm').hidden = true;
    } else {
      const count = Object.values(prevPlan.assignments).reduce((sum, ids) => sum + ids.length, 0);
      $('copyModalText').textContent = `This copies ${count} activity ${count === 1 ? 'placement' : 'placements'} from the week of ${weekRangeLabel(prevWeekStart)} into ${weekRangeLabel(weekStart)}. Any activities already planned for this week will be replaced. This can't be undone.`;
      $('copyConfirm').hidden = false;
    }
    openModal('copyModalBackdrop');
  }
  function wireCopyModal() {
    const backdrop = $('copyModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('copyModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('copyModalBackdrop'); });
    $('copyCancel').addEventListener('click', () => closeModal('copyModalBackdrop'));
    $('copyConfirm').addEventListener('click', () => {
      if (!canEdit()) { closeModal('copyModalBackdrop'); return; }
      submitWithLoading('copyConfirm', () => {
        const prevWeekStart = addDaysISO(weekStart, -7);
        const prevPlan = findPlan(currentClass(), prevWeekStart);
        if (!prevPlan) { window.PlayShell.toast('error', "Couldn't copy", 'The previous week is no longer available.'); closeModal('copyModalBackdrop'); return; }
        const assignments = {};
        Object.keys(prevPlan.assignments || {}).forEach((k) => { assignments[k] = (prevPlan.assignments[k] || []).slice(); });
        const plan = ensurePlanRecord();
        window.PlayStore.updateRecord(plan.id, { assignments, updatedAt: new Date().toISOString() });
        closeModal('copyModalBackdrop');
        render();
        window.PlayShell.toast('success', 'Copied last week', "Last week's activities have been copied into this week.");
      });
    });
  }

  /* ========================================================================
     MONTHLY THEME MODAL
     ======================================================================== */
  function openThemeModal(theme) {
    editingThemeId = theme ? theme.id : null;
    $('themeModalTitle').textContent = theme ? 'Edit theme' : 'Create theme';
    $('thmName').value = theme ? theme.name : '';
    $('thmWeekStart').value = theme ? theme.weekStart : weekStart;
    $('thmVocabulary').value = theme ? (theme.vocabulary || []).join(', ') : '';
    $('thmDescription').value = theme ? (theme.description || '') : '';
    $('thmAreas').innerHTML = LEARNING_AREAS.map((a) => `<button type="button" class="pl-area-chip${theme && (theme.focusAreas || []).includes(a.key) ? ' is-active' : ''}" data-theme-area="${a.key}" style="--area-color: var(${a.color});">${escapeHtml(a.label)}</button>`).join('');
    $('thmAreas').querySelectorAll('[data-theme-area]').forEach((chip) => chip.addEventListener('click', () => chip.classList.toggle('is-active')));
    setFieldError('thmName', null);
    openModal('themeModalBackdrop');
  }
  function wireThemeModal() {
    const backdrop = $('themeModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('themeModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('themeModalBackdrop'); });
    $('thmCancel').addEventListener('click', () => closeModal('themeModalBackdrop'));
    $('thmSave').addEventListener('click', () => {
      const name = $('thmName').value.trim();
      if (!name) { setFieldError('thmName', 'Theme name is required.'); return; }
      if (!$('thmWeekStart').value) { setFieldError('thmName', null); window.PlayShell.toast('error', 'Pick a week', 'Choose the week this theme applies to.'); return; }
      setFieldError('thmName', null);
      submitWithLoading('thmSave', () => {
        const ws = mondayOf($('thmWeekStart').value);
        const payload = {
          classId: classId, name, weekStart: ws, month: ws.slice(0, 7),
          focusAreas: [...$('thmAreas').querySelectorAll('.is-active')].map((c) => c.dataset.themeArea),
          vocabulary: $('thmVocabulary').value.split(',').map((s) => s.trim()).filter(Boolean),
          description: $('thmDescription').value.trim(),
        };
        if (editingThemeId) window.PlayStore.updateRecord(editingThemeId, payload);
        else window.PlayStore.addRecord(Object.assign({ id: uid('THM'), type: 'MonthlyTheme', linkedActivityIds: [] }, payload));
        closeModal('themeModalBackdrop');
        render();
        window.PlayShell.toast('success', editingThemeId ? 'Theme updated' : 'Theme created', `${name} saved.`);
      });
    });
  }

  /* ========================================================================
     ROUTINE BLOCK MODAL (Timetable — shared with Class Workspace)
     ======================================================================== */
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
      const cls = currentClass();
      const overlap = routineBlocksFor(cls).some((b) => b.id !== editingRoutineId && rangesOverlap(start, end, b.startTime, b.endTime));
      if (overlap) { setFieldError('rbStart', 'This overlaps with another routine block.'); return; }
      setFieldError('rbActivity', null); setFieldError('rbStart', null);
      submitWithLoading('rbSave', () => {
        const payload = { activity, startTime: start, endTime: end, kind: $('rbKind').value };
        if (editingRoutineId) window.PlayStore.updateRecord(editingRoutineId, payload);
        else window.PlayStore.addRecord(Object.assign({ id: uid('RTN'), type: 'RoutineBlock', classId: cls.id }, payload));
        closeModal('routineModalBackdrop');
        render();
        window.PlayShell.toast('success', editingRoutineId ? 'Block updated' : 'Block added', `${activity} saved to the timetable.`);
      });
    });
  }

  /* ========================================================================
     ADD-TO-DAY MODAL (accessible alternative to drag-and-drop)
     ======================================================================== */
  function openAddActivityModal(ctx) {
    if (!canEdit()) { window.PlayShell.toast('error', "Can't edit", 'This plan is locked while it is being reviewed.'); return; }
    pendingAddContext = ctx || {};
    const cls = currentClass();
    const blocks = routineBlocksFor(cls);
    $('addActDaySelect').innerHTML = DAYS.map((d) => `<option value="${d}" ${pendingAddContext.day === d ? 'selected' : ''}>${d}</option>`).join('');
    $('addActBlockSelect').innerHTML = blocks.map((b) => `<option value="${b.id}" ${pendingAddContext.blockId === b.id ? 'selected' : ''}>${escapeHtml(b.activity)} (${formatTime12(b.startTime)})</option>`).join('');
    const activities = allActivities();
    $('addActActivitySelect').innerHTML = activities.map((a) => `<option value="${a.id}" ${pendingAddContext.activityId === a.id ? 'selected' : ''}>${escapeHtml(a.name)} — ${escapeHtml(areaMeta(a.area).label)}</option>`).join('');
    setFieldError('addActBlockSelect', null);
    openModal('addActivityModalBackdrop');
  }
  function wireAddActivityModal() {
    const backdrop = $('addActivityModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('addActivityModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('addActivityModalBackdrop'); });
    $('addActCancel').addEventListener('click', () => closeModal('addActivityModalBackdrop'));
    $('addActConfirm').addEventListener('click', () => {
      if (!$('addActBlockSelect').value) { setFieldError('addActBlockSelect', 'Choose a routine block.'); return; }
      submitWithLoading('addActConfirm', () => {
        placeActivity($('addActActivitySelect').value, $('addActDaySelect').value, $('addActBlockSelect').value, null, null);
        closeModal('addActivityModalBackdrop');
        if ($('plLibrarySheetBackdrop').classList.contains('is-open')) closeLibrarySheet();
      });
    });
  }

  /* ========================================================================
     ACTIVITY DETAIL MODAL (S24-style framework outcome links)
     ======================================================================== */
  function openActivityDetailModal(activityId, createMode) {
    creatingActivity = !!createMode;
    editingActivityId = createMode ? null : activityId;
    const a = createMode ? null : activityById(activityId);
    const canAuthor = hasRole(['Director', 'Admin']) || role === 'Teacher';
    $('actDetailTitle').textContent = createMode ? 'New activity' : (a ? a.name : 'Activity');
    const outcomes = allOutcomes();

    if (createMode || (a && window.plEditingActivityForm)) {
      renderActivityForm(a);
    } else if (a) {
      const ageLabel = a.ageRangeMonths ? Math.round(a.ageRangeMonths[0]) + '–' + Math.round(a.ageRangeMonths[1]) + ' months' : 'Not specified';
      const linkedOutcomes = (a.outcomeIds || []).map((id) => outcomes.find((o) => o.id === id)).filter(Boolean);
      $('actDetailBody').innerHTML = `
        <div class="pl-detail-area" style="--area-color: var(${areaMeta(a.area).color});">${escapeHtml(areaMeta(a.area).label)}</div>
        <section class="pl-detail-section"><h4>Description</h4><p>${escapeHtml(a.description || 'No description yet.')}</p></section>
        <section class="pl-detail-section"><h4>Objectives</h4><p>${escapeHtml(a.objectives || 'No objectives recorded yet.')}</p></section>
        <section class="pl-detail-section"><h4>Linked framework outcomes</h4>${linkedOutcomes.length ? `<ul class="pl-outcome-list">${linkedOutcomes.map((o) => `<li><span class="pl-outcome-code">${escapeHtml(o.code)}</span>${escapeHtml(o.label)}</li>`).join('')}</ul>` : `<p class="ws-section-empty">No framework outcomes linked to this activity yet.</p>`}</section>
        <section class="pl-detail-section"><h4>Required materials</h4>${(a.materials || []).length ? `<div class="pl-material-chips">${a.materials.map((m) => `<span class="badge badge--neutral">${escapeHtml(m)}</span>`).join('')}</div>` : `<p class="ws-section-empty">No materials listed.</p>`}</section>
        <section class="pl-detail-section"><h4>Age suitability</h4><p>${escapeHtml(ageLabel)}</p></section>
        ${a.notes ? `<section class="pl-detail-section"><h4>Teacher notes</h4><p>${escapeHtml(a.notes)}</p></section>` : ''}`;
      $('actDetailFooter').innerHTML = canAuthor ? `<button class="btn btn--secondary" type="button" id="actEditBtn">${ICON.pencil}<span>&nbsp;Edit activity</span></button>` : '';
      const editBtn = $('actEditBtn');
      if (editBtn) editBtn.addEventListener('click', () => { window.plEditingActivityForm = true; openActivityDetailModal(a.id); });
    }
    openModal('actDetailModalBackdrop');
  }
  function renderActivityForm(a) {
    const outcomes = allOutcomes();
    $('actDetailBody').innerHTML = `
      <div class="field"><label class="field__label" for="actName">Activity name</label><input class="input" id="actName" type="text" value="${a ? escapeHtml(a.name) : ''}" /><p class="field__error" id="err-actName" hidden></p></div>
      <div class="field"><label class="field__label" for="actArea">Learning area</label><select class="select" id="actArea">${LEARNING_AREAS.map((ar) => `<option value="${ar.key}" ${a && a.area === ar.key ? 'selected' : ''}>${ar.label}</option>`).join('')}</select></div>
      <div class="field"><label class="field__label" for="actDescription">Description</label><textarea class="textarea" id="actDescription" rows="2">${a ? escapeHtml(a.description || '') : ''}</textarea></div>
      <div class="field"><label class="field__label" for="actObjectives">Objectives</label><textarea class="textarea" id="actObjectives" rows="2">${a ? escapeHtml(a.objectives || '') : ''}</textarea></div>
      <div class="field"><label class="field__label" for="actMaterials">Materials (comma separated)</label><input class="input" id="actMaterials" type="text" value="${a ? escapeHtml((a.materials || []).join(', ')) : ''}" /></div>
      <div class="cls-form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
        <div class="field"><label class="field__label" for="actAgeMin">Min age (months)</label><input class="input" id="actAgeMin" type="number" min="0" value="${a && a.ageRangeMonths ? a.ageRangeMonths[0] : ''}" /></div>
        <div class="field"><label class="field__label" for="actAgeMax">Max age (months)</label><input class="input" id="actAgeMax" type="number" min="0" value="${a && a.ageRangeMonths ? a.ageRangeMonths[1] : ''}" /></div>
      </div>
      <div class="field"><label class="field__label">Framework outcomes</label><div class="pl-outcome-picker">${outcomes.map((o) => `<label class="pl-outcome-pick"><input type="checkbox" value="${o.id}" ${a && (a.outcomeIds || []).includes(o.id) ? 'checked' : ''} /><span><b>${escapeHtml(o.code)}</b> ${escapeHtml(o.label)}</span></label>`).join('')}</div></div>
      <div class="field"><label class="field__label" for="actNotes">Teacher notes</label><textarea class="textarea" id="actNotes" rows="2">${a ? escapeHtml(a.notes || '') : ''}</textarea></div>`;
    $('actDetailFooter').innerHTML = `<button class="btn btn--accent" type="button" id="actSaveBtn">Save activity</button>`;
    $('actSaveBtn').addEventListener('click', () => {
      const name = $('actName').value.trim();
      if (!name) { setFieldError('actName', 'Activity name is required.'); return; }
      setFieldError('actName', null);
      const minAge = Number($('actAgeMin').value) || 0;
      const maxAge = Number($('actAgeMax').value) || minAge + 12;
      const payload = {
        name, area: $('actArea').value, description: $('actDescription').value.trim(), objectives: $('actObjectives').value.trim(),
        materials: $('actMaterials').value.split(',').map((s) => s.trim()).filter(Boolean),
        ageRangeMonths: [minAge, maxAge], notes: $('actNotes').value.trim(),
        outcomeIds: [...document.querySelectorAll('.pl-outcome-picker input:checked')].map((cb) => cb.value),
      };
      if (editingActivityId) window.PlayStore.updateRecord(editingActivityId, payload);
      else window.PlayStore.addRecord(Object.assign({ id: uid('ACT'), type: 'Activity' }, payload));
      window.plEditingActivityForm = false;
      closeModal('actDetailModalBackdrop');
      render();
      window.PlayShell.toast('success', editingActivityId ? 'Activity updated' : 'Activity created', `${name} saved to the library.`);
    });
  }
  function wireActivityDetailModal() {
    const backdrop = $('actDetailModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) { window.plEditingActivityForm = false; closeModal('actDetailModalBackdrop'); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) { window.plEditingActivityForm = false; closeModal('actDetailModalBackdrop'); } });
  }
})();
