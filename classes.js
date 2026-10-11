/* ==========================================================================
   PLAY SCHOOL — Classes Management (S20)
   Reuses: store.js (Class/Child/Staff/Attendance records + persistence —
   child-to-class linkage is the existing child.room === class.name
   convention already relied on by children.js, enroll.js (S14), attendance.js
   (S19), families.js and dashboard.js), modules.js, shell.js (shell chrome,
   toasts).

   INTEGRATION NOTES (read before trusting the numbers on this page):
   - "Enrolled" and capacity are computed live from PlayStore Child records
     (room === class.name, status === 'Active') — the same query enroll.js
     uses, so adding/editing/reassigning a child in S14 updates this page
     immediately on next render.
   - "Present today" and the live staffing ratio read today's Attendance
     records exactly like attendance.js (S19): a child only counts as
     currently present if they have a check-in today with no check-out yet.
   - Staff assigned to a class are resolved from Staff.classNames (new field
     this page owns) OR a legacy relation-substring match
     (`relation.indexOf(className) !== -1`), which is what attendance.js and
     dashboard.js already use for their own ratio math. Saving staff
     assignments here keeps `relation` in sync so those pages stay correct.
   - LIMITATION: this project has no staff attendance/leave model, so there is
     no way to know which assigned staff are actually on-site today — the
     ratio below uses "staff assigned to the class" as the honest available
     proxy (same assumption attendance.js and dashboard.js already make for
     their own ratio displays), not a verified check-in. This is surfaced via
     the "Based on assigned staff" caption rather than presented as confirmed.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function initials(name) { const p = String(name || '').trim().split(/\s+/); return p[0] ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '?'; }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }

  const ICON = {
    dots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/><line x1="10" y1="13" x2="14" y2="13"/></svg>',
    restore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 9 8 9"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    door: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><circle cx="14" cy="12" r="1"/></svg>',
    seats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 19 6v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6Z"/><path d="m9 12 2 2 4-4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
  };

  const COLOR_OPTIONS = [
    { key: 'blue', label: 'Royal blue', var: '--color-brand-blue' },
    { key: 'navy', label: 'Deep navy', var: '--color-brand-navy-strong' },
    { key: 'violet', label: 'Violet', var: '--color-primary' },
    { key: 'teal', label: 'Teal', var: '--color-secondary' },
    { key: 'amber', label: 'Amber', var: '--color-accent-yellow' },
    { key: 'green', label: 'Green', var: '--color-success' },
    { key: 'red', label: 'Red', var: '--color-error' },
  ];
  function colorVar(key) { return (COLOR_OPTIONS.find((c) => c.key === key) || COLOR_OPTIONS[0]).var; }

  let role = null;
  let showArchived = false;
  let editingClassId = null;
  let cmChosenStaffIds = [];
  let pendingDuplicateId = null;
  let pendingArchiveId = null;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', (e) => { role = e.detail.role; render(); });

  function init() {
    window.PlayShell.login();
    role = window.PlayShell.getDemoRole();
    window.PlayShell.mount('classrooms', 'Classes');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    wireHeader();
    wireClassModal();
    wireDuplicateModal();
    wireArchiveModal();
    wireArchiveBlockedModal();
    wireGrid();

    window.setTimeout(() => { $('clsSkeleton').hidden = true; render(); }, 400);
  }

  /* ---------- data helpers ---------- */
  function allClasses() { return window.PlayStore.getByType('Class'); }
  function activeClasses() { return allClasses().filter((c) => c.status !== 'Archived'); }
  function archivedClasses() { return allClasses().filter((c) => c.status === 'Archived'); }
  function visibleClasses() { return showArchived ? archivedClasses() : activeClasses(); }
  function allStaff() { return window.PlayStore.getByType('Staff'); }
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
  function attendanceStatus(childId, date) {
    const rec = window.PlayStore.getByType('Attendance').find((a) => a.childId === childId && a.date === date);
    if (!rec) return 'not-arrived';
    if (rec.status === 'Absent') return 'absent';
    if (rec.checkOutTime) return 'out';
    return 'in';
  }
  function presentTodayFor(cls) {
    const date = todayISO();
    const children = childrenFor(cls);
    let inCount = 0; let outCount = 0; let anyRecord = false;
    children.forEach((c) => {
      const st = attendanceStatus(c.id, date);
      if (st !== 'not-arrived') anyRecord = true;
      if (st === 'in') inCount += 1;
      if (st === 'out') outCount += 1;
    });
    return { expected: children.length, in: inCount, out: outCount, anyRecord };
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

  /* ---------- summary ---------- */
  function renderSummary() {
    const classes = activeClasses();
    const totalClasses = classes.length;
    let enrolled = 0; let available = 0; let meetingRatio = 0;
    classes.forEach((c) => {
      const count = childrenFor(c).length;
      enrolled += count;
      available += Math.max((c.capacity || 0) - count, 0);
      const r = ratioFor(c);
      if (r.state === 'ok' || r.state === 'empty') meetingRatio += 1;
    });
    const cards = [
      { icon: ICON.door, value: totalClasses, label: 'Classes' },
      { icon: ICON.users, value: enrolled, label: 'Children enrolled' },
      { icon: ICON.seats, value: available, label: 'Available places' },
      { icon: ICON.shield, value: totalClasses ? `${meetingRatio}/${totalClasses}` : '—', label: "Meeting today's ratio" },
    ];
    $('clsSummary').innerHTML = cards.map((k) => `
      <div class="kpi-card">
        <div class="kpi-card__top"><span class="kpi-card__icon">${k.icon}</span></div>
        <div class="kpi-card__value">${escapeHtml(String(k.value))}</div>
        <div class="kpi-card__label">${escapeHtml(k.label)}</div>
      </div>`).join('');
  }

  /* ---------- card rendering ---------- */
  function capacityState(enrolled, capacity) {
    if (!capacity) return 'normal';
    const pct = enrolled / capacity;
    if (pct >= 1) return 'over';
    if (pct >= 0.9) return 'amber';
    return 'normal';
  }
  function staffAvatarsHtml(cls) {
    const lead = leadTeacherFor(cls);
    const extra = additionalStaffFor(cls);
    const visible = extra.slice(0, 2);
    const overflow = extra.length - visible.length;
    const leadHtml = lead
      ? `<div class="avatar-row cls-card__lead"><span class="avatar avatar--sm" title="Lead teacher — ${escapeHtml(lead.name)}">${escapeHtml(initials(lead.name))}</span><div><div class="cls-card__teacher-name">${escapeHtml(lead.name)}</div><div class="cls-card__teacher-role">Lead teacher</div></div></div>`
      : `<div class="cls-card__no-staff">${ICON.alert}<span>No lead teacher assigned</span></div>`;
    const extraHtml = extra.length
      ? `<div class="avatar-group cls-card__additional">${visible.map((s) => `<span class="avatar avatar--sm" title="${escapeHtml(s.name)}">${escapeHtml(initials(s.name))}</span>`).join('')}${overflow > 0 ? `<span class="avatar avatar--sm cls-card__more" title="${overflow} more">+${overflow}</span>` : ''}</div>`
      : '';
    return `<div class="cls-card__staff">${leadHtml}${extraHtml}</div>`;
  }
  function ratioBadgeHtml(r) {
    if (r.state === 'empty') return `<span class="cls-card__ratio cls-card__ratio--neutral">No children enrolled</span>`;
    if (r.state === 'no-staff') return `<span class="cls-card__ratio cls-card__ratio--warn">${ICON.alert} No staff assigned</span>`;
    if (r.state === 'unconfirmed') return `<span class="cls-card__ratio cls-card__ratio--neutral" title="No attendance has been recorded for today yet">Not confirmed yet</span>`;
    const ok = r.state === 'ok';
    return `<span class="cls-card__ratio cls-card__ratio--${ok ? 'ok' : 'warn'}" title="Based on assigned staff — this project has no staff check-in data">
      ${r.inCount}:${r.staffCount} ${ok ? ICON.check : ICON.alert}
      <span class="cls-card__ratio-limit">limit 1:${r.limit}</span>
    </span>`;
  }
  function cardHtml(cls, index) {
    const archived = cls.status === 'Archived';
    const children = childrenFor(cls);
    const enrolled = children.length;
    const capacity = cls.capacity || 0;
    const capState = capacityState(enrolled, capacity);
    const pct = capacity ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;
    const spacesLeft = capacity - enrolled;
    const presence = presentTodayFor(cls);
    const r = ratioFor(cls);
    const menuItems = archived
      ? [['restore', ICON.restore, 'Restore class', false]]
      : [['edit', ICON.edit, 'Edit', false], ['duplicate', ICON.copy, 'Duplicate', false], ['archive', ICON.archive, 'Archive', true]];
    return `
      <article class="cls-card${archived ? ' cls-card--archived' : ''}" data-class-id="${cls.id}" style="--cls-color: var(${colorVar(cls.color)}); animation-delay: ${Math.min(index, 8) * 50}ms;">
        <div class="cls-card__bar"></div>
        <div class="cls-card__head">
          <div>
            <h3 class="cls-card__name">${escapeHtml(cls.name)}</h3>
            <div class="cls-card__meta">
              <span class="cls-card__age">${escapeHtml(ageRangeLabel(cls))}</span>
              ${cls.mixedAge ? '<span class="badge badge--neutral">Mixed ages</span>' : ''}
              ${archived ? '<span class="badge badge--neutral">Archived</span>' : ''}
            </div>
          </div>
          <span class="popover cls-card__menu" data-menu="${cls.id}">
            <button class="cls-card__menu-trigger" type="button" data-menu-trigger aria-haspopup="true" aria-expanded="false" aria-label="More actions for ${escapeHtml(cls.name)}">${ICON.dots}</button>
            <span class="popover__panel" role="menu" style="right:0; left:auto;">
              ${menuItems.map(([action, icon, label, danger]) => `<button class="popover__item${danger ? ' popover__item--danger' : ''}" type="button" data-action="${action}" role="menuitem">${icon}<span>${label}</span></button>`).join('')}
            </span>
          </span>
        </div>
        <div class="cls-card__room">${ICON.door}<span>${escapeHtml(cls.room || 'Room not set')}</span></div>
        ${staffAvatarsHtml(cls)}
        <div class="cls-card__capacity">
          <div class="cls-card__capacity-row">
            <span>${enrolled} / ${capacity || '—'} children</span>
            <span>${capacity ? (spacesLeft <= 0 ? 'Full' : spacesLeft + ' place' + (spacesLeft === 1 ? '' : 's') + ' left') : ''}</span>
          </div>
          <div class="progress-linear"><div class="progress-linear__bar cls-capacity-fill is-${capState}" data-target="${pct}" style="width:0%;"></div></div>
        </div>
        <div class="cls-card__footer">
          <div class="cls-card__present">
            <span class="cls-card__present-value">${presence.anyRecord ? presence.in + presence.out : '—'}</span>
            <span>${presence.expected ? 'present today of ' + presence.expected : 'no children enrolled'}</span>
          </div>
          ${ratioBadgeHtml(r)}
        </div>
      </article>`;
  }

  function animateBars(container) {
    const bars = container.querySelectorAll('.cls-capacity-fill');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { bars.forEach((bar) => { bar.style.width = bar.dataset.target + '%'; }); });
    });
  }

  /* ---------- render orchestration ---------- */
  function render() {
    try {
      renderSummary();
      const classes = visibleClasses();
      $('clsArchivedToggleBtn').textContent = showArchived ? `← Back to active classes` : `Archived (${archivedClasses().length})`;
      $('clsArchivedToggleBtn').hidden = !showArchived && !archivedClasses().length;
      const grid = $('clsGrid');
      if (!classes.length) {
        grid.hidden = true;
        showEmpty(showArchived
          ? ['inbox', 'No archived classes', 'Classes you archive will appear here.', '']
          : ['inbox', 'No classes yet', 'Create your first class to start enrolling children.', '<button class="btn btn--accent" type="button" id="clsEmptyAddBtn">+ Add class</button>']);
        if (!showArchived) $('clsEmptyAddBtn').addEventListener('click', () => openClassModal(null));
        return;
      }
      $('clsEmptyState').hidden = true;
      grid.hidden = false;
      grid.innerHTML = classes.map((c, i) => cardHtml(c, i)).join('');
      animateBars(grid);
    } catch (err) {
      $('clsGrid').hidden = true;
      $('clsEmptyState').hidden = false;
      $('clsEmptyIcon').innerHTML = ICON.alert;
      $('clsEmptyTitle').textContent = 'Something went wrong';
      $('clsEmptyText').textContent = 'This page hit an unexpected error while loading classes.';
      $('clsEmptyAction').innerHTML = '<button class="btn btn--secondary" type="button" id="clsRetryBtn">Try again</button>';
      $('clsRetryBtn').addEventListener('click', render);
      /* eslint-disable no-console */
      if (window.console) console.error(err);
    }
  }
  function showEmpty([iconKey, title, text, actionHtml]) {
    $('clsEmptyState').hidden = false;
    $('clsEmptyIcon').innerHTML = ICON[iconKey] || ICON.inbox;
    $('clsEmptyTitle').textContent = title;
    $('clsEmptyText').textContent = text;
    $('clsEmptyAction').innerHTML = actionHtml || '';
  }

  function wireHeader() {
    $('addClassBtn').addEventListener('click', () => openClassModal(null));
    $('clsFab').addEventListener('click', () => openClassModal(null));
    $('clsArchivedToggleBtn').addEventListener('click', () => { showArchived = !showArchived; render(); });
  }

  /* ---------- grid interactions (menus) ---------- */
  function wireGrid() {
    const grid = $('clsGrid');
    grid.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-menu-trigger]');
      if (trigger) {
        const menu = trigger.closest('[data-menu]');
        const willOpen = !menu.classList.contains('is-open');
        document.querySelectorAll('.cls-card__menu.is-open').forEach((m) => m.classList.remove('is-open'));
        menu.classList.toggle('is-open', willOpen);
        return;
      }
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const menu = actionBtn.closest('[data-menu]');
        menu.classList.remove('is-open');
        const cls = window.PlayStore.getById(menu.dataset.menu);
        if (!cls) return;
        handleMenuAction(actionBtn.dataset.action, cls);
      }
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-menu]')) document.querySelectorAll('.cls-card__menu.is-open').forEach((m) => m.classList.remove('is-open'));
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.cls-card__menu.is-open').forEach((m) => m.classList.remove('is-open')); });
  }
  function handleMenuAction(action, cls) {
    if (action === 'edit') openClassModal(cls);
    else if (action === 'duplicate') openDuplicateModal(cls);
    else if (action === 'archive') openArchiveFlow(cls);
    else if (action === 'restore') restoreClass(cls);
  }
  function restoreClass(cls) {
    window.PlayStore.updateRecord(cls.id, { status: 'Active' });
    render();
    window.PlayShell.toast('success', 'Class restored', `${cls.name} is active again.`);
  }

  /* ========================================================================
     ADD / EDIT MODAL
     ======================================================================== */
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

  function renderColorSwatches(selected) {
    $('cmColorSwatches').innerHTML = COLOR_OPTIONS.map((c) => `
      <button type="button" class="cls-color-swatch${c.key === selected ? ' is-selected' : ''}" data-color="${c.key}" style="--swatch-color: var(${c.var});" aria-pressed="${c.key === selected}" aria-label="${c.label}" title="${c.label}"></button>`).join('');
    $('cmColorSwatches').querySelectorAll('[data-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        $('cmColorSwatches').dataset.value = btn.dataset.color;
        $('cmColorSwatches').querySelectorAll('[data-color]').forEach((b) => { b.classList.toggle('is-selected', b === btn); b.setAttribute('aria-pressed', b === btn); });
      });
    });
  }

  function renderLeadTeacherOptions(selectedId) {
    const staff = allStaff();
    $('cmLeadTeacher').innerHTML = '<option value="">— Select lead teacher —</option>' + staff.map((s) => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('');
  }
  function renderStaffChips() {
    const wrap = $('cmStaffChips');
    if (!cmChosenStaffIds.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = cmChosenStaffIds.map((id) => {
      const s = window.PlayStore.getById(id);
      if (!s) return '';
      return `<span class="chip" data-chip="${id}"><span class="avatar avatar--sm">${escapeHtml(initials(s.name))}</span>${escapeHtml(s.name)}<span class="chip__remove" data-remove-chip="${id}">&times;</span></span>`;
    }).join('');
    wrap.querySelectorAll('[data-remove-chip]').forEach((btn) => btn.addEventListener('click', () => {
      cmChosenStaffIds = cmChosenStaffIds.filter((id) => id !== btn.dataset.removeChip);
      renderStaffChips(); renderStaffResults();
    }));
  }
  function renderStaffResults() {
    const q = $('cmStaffSearch').value.trim().toLowerCase();
    const leadId = $('cmLeadTeacher').value;
    const results = allStaff().filter((s) => s.id !== leadId && cmChosenStaffIds.indexOf(s.id) === -1 && (!q || s.name.toLowerCase().indexOf(q) !== -1));
    const wrap = $('cmStaffResults');
    if (!q) { wrap.innerHTML = ''; wrap.hidden = true; return; }
    wrap.hidden = false;
    wrap.innerHTML = results.length
      ? results.slice(0, 6).map((s) => `<div class="cls-picker-row" data-pick-staff="${s.id}"><span class="avatar avatar--sm">${escapeHtml(initials(s.name))}</span><span>${escapeHtml(s.name)}</span><span class="cls-picker-row__sub">${escapeHtml(s.relation || '')}</span></div>`).join('')
      : '<div class="cls-picker-row cls-picker-row--empty">No matching staff</div>';
    wrap.querySelectorAll('[data-pick-staff]').forEach((row) => row.addEventListener('click', () => {
      cmChosenStaffIds.push(row.dataset.pickStaff);
      $('cmStaffSearch').value = '';
      wrap.hidden = true; wrap.innerHTML = '';
      renderStaffChips();
    }));
  }

  function openClassModal(cls) {
    editingClassId = cls ? cls.id : null;
    $('classModalTitle').textContent = cls ? 'Edit class' : 'Add class';
    $('cmSaveLabel').textContent = cls ? 'Save changes' : 'Save class';
    ['cmName', 'cmMinAge', 'cmMaxAge', 'cmRoom', 'cmCapacity', 'cmRatio'].forEach((id) => setFieldError(id, null));
    setFieldError('cmLeadTeacher', null);

    $('cmName').value = cls ? cls.name : '';
    $('cmMinAge').value = cls && cls.minAgeMonths != null ? cls.minAgeMonths : '';
    $('cmMaxAge').value = cls && cls.maxAgeMonths != null ? cls.maxAgeMonths : '';
    $('cmMixedAge').checked = !!(cls && cls.mixedAge);
    $('cmRoom').value = cls ? (cls.room || '') : '';
    $('cmCapacity').value = cls ? (cls.capacity || '') : '';
    $('cmRatio').value = cls ? (cls.ratioLimit || '') : '';
    renderColorSwatches(cls ? cls.color : COLOR_OPTIONS[0].key);
    $('cmColorSwatches').dataset.value = cls ? (cls.color || COLOR_OPTIONS[0].key) : COLOR_OPTIONS[0].key;

    renderLeadTeacherOptions(cls ? cls.teacherId : null);
    cmChosenStaffIds = cls ? additionalStaffFor(cls).map((s) => s.id) : [];
    renderStaffChips();
    $('cmStaffSearch').value = '';
    $('cmStaffResults').hidden = true; $('cmStaffResults').innerHTML = '';

    openModal('classModalBackdrop');
    $('cmName').focus();
  }

  function validateClassForm() {
    let ok = true;
    const name = $('cmName').value.trim();
    if (!name) { setFieldError('cmName', 'Class name is required.'); ok = false; } else setFieldError('cmName', null);
    const duplicateName = allClasses().some((c) => c.id !== editingClassId && c.name.toLowerCase() === name.toLowerCase());
    if (name && duplicateName) { setFieldError('cmName', 'A class with this name already exists.'); ok = false; }

    const minAge = Number($('cmMinAge').value);
    const maxAge = Number($('cmMaxAge').value);
    if ($('cmMinAge').value === '' || $('cmMaxAge').value === '' || isNaN(minAge) || isNaN(maxAge) || minAge < 0 || maxAge <= minAge || maxAge > 216) {
      setFieldError('cmMinAge', 'Enter a valid age range (months), max greater than min.'); ok = false;
    } else setFieldError('cmMinAge', null);

    const room = $('cmRoom').value.trim();
    if (!room) { setFieldError('cmRoom', 'Room is required.'); ok = false; } else setFieldError('cmRoom', null);

    const capacity = Number($('cmCapacity').value);
    const existing = editingClassId ? window.PlayStore.getById(editingClassId) : null;
    const currentEnrolled = existing ? childrenFor(existing).length : 0;
    if (!$('cmCapacity').value || isNaN(capacity) || capacity < 1) { setFieldError('cmCapacity', 'Enter a capacity of at least 1.'); ok = false; }
    else if (capacity < currentEnrolled) { setFieldError('cmCapacity', `Capacity can't be less than the ${currentEnrolled} children already enrolled.`); ok = false; }
    else setFieldError('cmCapacity', null);

    const ratio = Number($('cmRatio').value);
    if (!$('cmRatio').value || isNaN(ratio) || ratio < 1) { setFieldError('cmRatio', 'Enter a ratio of at least 1 child per adult.'); ok = false; } else setFieldError('cmRatio', null);

    if (allStaff().length && !$('cmLeadTeacher').value) { setFieldError('cmLeadTeacher', 'Choose a lead teacher.'); ok = false; } else setFieldError('cmLeadTeacher', null);

    return ok;
  }

  function applyStaffAssignment(cls, leadTeacherId, additionalIds) {
    const desired = new Set([leadTeacherId].concat(additionalIds).filter(Boolean));
    allStaff().forEach((s) => {
      const names = new Set(s.classNames || []);
      const wasAssigned = names.has(cls.name);
      const isDesired = desired.has(s.id);
      if (isDesired === wasAssigned) return;
      if (isDesired) names.add(cls.name); else names.delete(cls.name);
      const classNames = Array.from(names);
      const isLead = window.PlayStore.getByType('Class').some((c) => (c.id === cls.id ? s.id === leadTeacherId : c.teacherId === s.id));
      const role = classNames.length ? (isLead ? 'Teacher' : 'Staff') : 'Unassigned';
      const relation = classNames.length ? role + ' · ' + classNames.join(', ') : role;
      window.PlayStore.updateRecord(s.id, { classNames, relation });
    });
  }
  function migrateChildrenRoom(oldName, newName) {
    if (oldName === newName) return;
    window.PlayStore.getByType('Child').filter((c) => c.room === oldName).forEach((c) => window.PlayStore.updateRecord(c.id, { room: newName }));
    allStaff().filter((s) => s.classNames && s.classNames.indexOf(oldName) !== -1).forEach((s) => {
      const classNames = s.classNames.map((n) => (n === oldName ? newName : n));
      const relation = (s.relation || '').split(oldName).join(newName);
      window.PlayStore.updateRecord(s.id, { classNames, relation });
    });
  }

  function wireClassModal() {
    const backdrop = $('classModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('classModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('classModalBackdrop'); });
    $('cmCancel').addEventListener('click', () => closeModal('classModalBackdrop'));
    $('cmLeadTeacher').addEventListener('change', () => { setFieldError('cmLeadTeacher', null); renderStaffResults(); });
    $('cmStaffSearch').addEventListener('input', renderStaffResults);
    $('cmCapacity').addEventListener('input', () => setFieldError('cmCapacity', null));
    $('cmRatio').addEventListener('input', () => setFieldError('cmRatio', null));
    $('cmName').addEventListener('input', () => setFieldError('cmName', null));
    $('cmRoom').addEventListener('input', () => setFieldError('cmRoom', null));

    $('cmSave').addEventListener('click', () => {
      if (!validateClassForm()) { window.PlayShell.toast('error', 'Check the form', 'Some fields need your attention.'); return; }
      submitWithLoading('cmSave', () => {
        const name = $('cmName').value.trim();
        const payload = {
          name,
          color: $('cmColorSwatches').dataset.value || COLOR_OPTIONS[0].key,
          minAgeMonths: Number($('cmMinAge').value),
          maxAgeMonths: Number($('cmMaxAge').value),
          mixedAge: $('cmMixedAge').checked,
          room: $('cmRoom').value.trim(),
          capacity: Number($('cmCapacity').value),
          ratioLimit: Number($('cmRatio').value),
          teacherId: $('cmLeadTeacher').value || null,
          teacherName: $('cmLeadTeacher').value ? (window.PlayStore.getById($('cmLeadTeacher').value) || {}).name : null,
          status: 'Active',
        };
        let cls;
        if (editingClassId) {
          const existing = window.PlayStore.getById(editingClassId);
          const oldName = existing.name;
          cls = window.PlayStore.updateRecord(editingClassId, payload);
          migrateChildrenRoom(oldName, name);
        } else {
          cls = window.PlayStore.addRecord(Object.assign({ id: uid('CLS'), type: 'Class' }, payload));
        }
        applyStaffAssignment(cls, payload.teacherId, cmChosenStaffIds);
        closeModal('classModalBackdrop');
        render();
        window.PlayShell.toast('success', editingClassId ? 'Class updated' : 'Class added', `${name} has been saved.`);
      });
    });
  }

  /* ========================================================================
     DUPLICATE
     ======================================================================== */
  function uniqueCopyName(baseName) {
    const names = new Set(allClasses().map((c) => c.name));
    let candidate = baseName + ' (Copy)'; let n = 2;
    while (names.has(candidate)) { candidate = baseName + ' (Copy ' + n + ')'; n += 1; }
    return candidate;
  }
  function nextColor(excludeColor) {
    const used = new Set(allClasses().map((c) => c.color));
    const unused = COLOR_OPTIONS.find((o) => !used.has(o.key));
    if (unused) return unused.key;
    const other = COLOR_OPTIONS.find((o) => o.key !== excludeColor);
    return other ? other.key : COLOR_OPTIONS[0].key;
  }
  function openDuplicateModal(cls) {
    pendingDuplicateId = cls.id;
    $('duplicateModalText').textContent = `This creates a copy of ${cls.name} with the same age range, capacity and staff — without any enrolled children. You can edit it afterwards.`;
    openModal('duplicateModalBackdrop');
  }
  function wireDuplicateModal() {
    const backdrop = $('duplicateModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('duplicateModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('duplicateModalBackdrop'); });
    $('duplicateCancel').addEventListener('click', () => closeModal('duplicateModalBackdrop'));
    $('duplicateConfirm').addEventListener('click', () => {
      submitWithLoading('duplicateConfirm', () => {
        const source = window.PlayStore.getById(pendingDuplicateId);
        if (!source) { closeModal('duplicateModalBackdrop'); return; }
        const copy = Object.assign({}, source, {
          id: uid('CLS'), type: 'Class', name: uniqueCopyName(source.name), color: nextColor(source.color), status: 'Active',
        });
        window.PlayStore.addRecord(copy);
        closeModal('duplicateModalBackdrop');
        render();
        window.PlayShell.toast('success', 'Class duplicated', `${copy.name} was created with no enrolled children.`);
      });
    });
  }

  /* ========================================================================
     ARCHIVE (blocked when active children remain)
     ======================================================================== */
  function openArchiveFlow(cls) {
    const activeCount = childrenFor(cls).length;
    if (activeCount > 0) { openArchiveBlocked(cls, activeCount); return; }
    pendingArchiveId = cls.id;
    $('archiveModalText').textContent = `${cls.name} has no enrolled children and can be archived. It will no longer appear in the active classes list.`;
    openModal('archiveModalBackdrop');
  }
  function wireArchiveModal() {
    const backdrop = $('archiveModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('archiveModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('archiveModalBackdrop'); });
    $('archiveCancel').addEventListener('click', () => closeModal('archiveModalBackdrop'));
    $('archiveConfirm').addEventListener('click', () => {
      submitWithLoading('archiveConfirm', () => {
        const cls = window.PlayStore.getById(pendingArchiveId);
        if (!cls) { closeModal('archiveModalBackdrop'); return; }
        if (childrenFor(cls).length > 0) {
          closeModal('archiveModalBackdrop');
          window.PlayShell.toast('error', "Couldn't archive", 'Children were enrolled in this class just now — refresh and try again.');
          render();
          return;
        }
        window.PlayStore.updateRecord(cls.id, { status: 'Archived' });
        closeModal('archiveModalBackdrop');
        render();
        window.PlayShell.toast('success', 'Class archived', `${cls.name} has been archived.`);
      });
    });
  }
  function openArchiveBlocked(cls, activeCount) {
    $('archiveBlockedText').textContent = `${activeCount} ${activeCount === 1 ? 'child is' : 'children are'} still enrolled in ${cls.name}. Reassign or remove ${activeCount === 1 ? 'this child' : 'these children'} before archiving.`;
    openModal('archiveBlockedBackdrop');
  }
  function wireArchiveBlockedModal() {
    const backdrop = $('archiveBlockedBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('archiveBlockedBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('archiveBlockedBackdrop'); });
    $('archiveBlockedClose').addEventListener('click', () => closeModal('archiveBlockedBackdrop'));
    $('archiveBlockedGoToChildren').addEventListener('click', () => { window.location.href = 'children.html'; });
  }
})();
