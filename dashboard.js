/* ==========================================================================
   PLAY SCHOOL — Main school dashboard
   Reuses: store.js (records/settings), modules.js (plan/entitlements),
   shell.js (sidebar/header/bell/toast/role switcher). No competing store,
   no fabricated metrics — every number below is derived from PlayStore.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function todayStr() { return new Date().toISOString().slice(0, 10); }

  const ICONS = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 13v-2Z"/><path d="M11.6 16.8A3 3 0 1 1 7 13"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
  };

  let role = window.PlayShell.getDemoRole();

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', (e) => { role = e.detail.role; renderAll(); });

  function init() {
    window.PlayShell.login();
    window.PlayShell.mount('dashboard', 'Dashboard');
    maybeSeedEmergencyDemo();
    wireModals();
    wireCustomise();

    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    window.setTimeout(() => {
      $('dashSkeleton').hidden = true;
      $('dashReal').hidden = false;
      renderAll();
    }, 500);
  }

  /* ---------- config ---------- */
  const QUICK_ACTIONS = [
    { id: 'attendance', label: 'Mark attendance', icon: ICONS.check, roles: ['Director', 'Admin', 'Teacher'], module: 'attendance', open: () => openAttendanceModal() },
    { id: 'enquiry', label: 'Add enquiry', icon: ICONS.userPlus, roles: ['Director', 'Admin'], module: null, open: () => openModal('enquiryModalBackdrop') },
    { id: 'payment', label: 'Record payment', icon: ICONS.card, roles: ['Director', 'Admin'], module: null, open: () => openPaymentModal() },
    { id: 'incident', label: 'Log incident', icon: ICONS.alert, roles: ['Director', 'Admin', 'Teacher'], module: 'health-safety', open: () => openModal('incidentModalBackdrop') },
    { id: 'announcement', label: 'New announcement', icon: ICONS.megaphone, roles: ['Director', 'Admin'], module: 'communication', open: () => openModal('announcementModalBackdrop') },
  ];

  function isModuleUnlocked(moduleId) {
    if (!moduleId || !window.PlayModules) return true;
    const mod = window.PlayModules.getById(moduleId);
    if (!mod) return true;
    return window.PlayModules.isUnlocked(mod, window.PlayModules.getCurrentPlan());
  }
  function moduleRequiredPlan(moduleId) {
    const mod = window.PlayModules && window.PlayModules.getById(moduleId);
    return mod ? mod.requiredPlan : '';
  }
  function moduleName(moduleId) {
    const mod = window.PlayModules && window.PlayModules.getById(moduleId);
    return mod ? mod.name : moduleId;
  }

  /* ---------- data helpers (all real, from PlayStore) ---------- */
  function activeChildren() { return window.PlayStore.records.filter((r) => r.type === 'Child' && r.status !== 'Inactive'); }
  function allStaff() { return window.PlayStore.getByType('Staff'); }
  function attendanceToday() { return window.PlayStore.getByType('Attendance').filter((a) => a.date === todayStr()); }
  function presentTodayCount() {
    const marks = {};
    attendanceToday().forEach((a) => { marks[a.childId] = a.status; });
    return activeChildren().filter((c) => (marks[c.id] || 'Present') === 'Present').length;
  }
  function attendanceRate() {
    const total = activeChildren().length;
    if (!total) return null;
    return Math.round((presentTodayCount() / total) * 100);
  }
  function pendingFeesTotal() {
    return window.PlayStore.getByType('Payment').filter((p) => p.status === 'Pending').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }
  function newEnquiries() { return window.PlayStore.getByType('Enquiry').filter((e) => e.status === 'New'); }
  function openIncidents() { return window.PlayStore.getByType('Incident').filter((i) => i.status === 'Open'); }
  function recentAnnouncements() { return window.PlayStore.getByType('Announcement').slice(0, 5); }

  function classRatioLimit() {
    const s = window.PlayStore.getSettings();
    return s.classRatioLimit || 10;
  }
  function computeClassRatios() {
    const limit = classRatioLimit();
    const children = activeChildren();
    const staff = allStaff();
    const rooms = {};
    children.forEach((c) => { rooms[c.room] = rooms[c.room] || { children: 0, staff: 0 }; rooms[c.room].children += 1; });
    staff.forEach((s) => {
      Object.keys(rooms).forEach((roomName) => {
        if (s.relation && s.relation.indexOf(roomName) !== -1) rooms[roomName].staff += 1;
      });
    });
    return Object.keys(rooms).map((name) => {
      const r = rooms[name];
      const staffCount = Math.max(r.staff, 1);
      const ratio = r.children / staffCount;
      return { name, children: r.children, staff: r.staff, ratio, limit, exceeded: ratio > limit };
    });
  }
  function notifyRatioAlerts(ratios) {
    ratios.forEach((r) => {
      const key = 'ps_ratio_notified_' + r.name;
      if (r.exceeded) {
        if (!localStorage.getItem(key)) {
          window.PlayShell.addNotification({ title: 'Class ratio exceeded', text: `${r.name} is at ${r.children}:${r.staff} (limit 1:${r.limit}).`, forRole: 'Director' });
          try { localStorage.setItem(key, '1'); } catch (e) { /* storage unavailable */ }
        }
      } else {
        try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
      }
    });
  }

  /* ---------- emergency broadcast ---------- */
  const EMERGENCY_KEY = 'ps_emergency_broadcast';
  function maybeSeedEmergencyDemo() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('broadcast') === '1' && !localStorage.getItem(EMERGENCY_KEY)) {
      localStorage.setItem(EMERGENCY_KEY, JSON.stringify({ id: 'EB-1', message: 'Fire drill at 2:00pm today. No action needed — please follow your usual drill procedure.', active: true }));
    }
  }
  function getEmergencyBroadcast() {
    try { return JSON.parse(localStorage.getItem(EMERGENCY_KEY) || 'null'); } catch (e) { return null; }
  }
  function isAcked(broadcastId) {
    try { return localStorage.getItem('ps_emergency_ack_' + role + '_' + broadcastId) === '1'; } catch (e) { return false; }
  }
  function ackBroadcast(broadcastId) {
    try { localStorage.setItem('ps_emergency_ack_' + role + '_' + broadcastId, '1'); } catch (e) { /* storage unavailable */ }
    renderEmergency();
  }

  /* ---------- customise preferences (per demo role) ---------- */
  const WIDGETS = [
    { id: 'ratio', title: 'Class ratios', roles: ['Director', 'Admin', 'Teacher'], module: null, essential: true, render: renderRatioWidget },
    { id: 'attendance-chart', title: 'Attendance overview', roles: ['Director', 'Admin', 'Teacher'], module: 'attendance', render: renderAttendanceChart },
    { id: 'enquiries', title: 'Enquiries awaiting follow-up', roles: ['Director', 'Admin'], module: null, render: renderEnquiriesWidget },
    { id: 'fees', title: 'Outstanding payments', roles: ['Director', 'Admin'], module: null, render: renderFeesWidget },
    { id: 'incidents', title: 'Recent incidents', roles: ['Director', 'Admin', 'Teacher'], module: 'health-safety', render: renderIncidentsWidget },
    { id: 'announcements', title: 'Announcements', roles: ['Director', 'Admin', 'Teacher'], module: 'communication', render: renderAnnouncementsWidget },
  ];
  function prefsKey() { return 'ps_dashboard_widgets_' + role; }
  function getWidgetPrefs() {
    try { return JSON.parse(localStorage.getItem(prefsKey()) || '{}'); } catch (e) { return {}; }
  }
  function saveWidgetPrefs(prefs) {
    try { localStorage.setItem(prefsKey(), JSON.stringify(prefs)); } catch (e) { /* storage unavailable */ }
  }
  function isWidgetVisible(widget, prefs) {
    if (widget.essential) return true;
    return prefs[widget.id] !== false;
  }

  /* ---------- rendering ---------- */
  function renderAll() {
    renderGreeting();
    renderEmergency();
    renderQuickActions();
    renderGrid();
  }

  function renderGreeting() {
    const name = 'Nithya';
    const hour = new Date().getHours();
    const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    $('dashGreetingHeading').textContent = `Good ${part}, ${name}`;
    $('dashGreetingDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const settings = window.PlayStore.getSettings();
    const hours = settings.schoolHours || { open: '08:00', close: '18:00' };
    const now = new Date();
    const [oh, om] = hours.open.split(':').map(Number);
    const [ch, cm] = hours.close.split(':').map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const isOpen = nowMin >= (oh * 60 + om) && nowMin < (ch * 60 + cm);
    const chip = $('dashStatusChip');
    chip.className = 'dash-status-chip' + (isOpen ? '' : ' dash-status-chip--closed');
    chip.innerHTML = `<span class="dash-status-chip__dot"></span>${isOpen ? 'Open' : 'Closed'} · ${hours.open}–${hours.close}`;
  }

  function renderEmergency() {
    const container = $('dashEmergency');
    const eb = getEmergencyBroadcast();
    if (!eb || !eb.active || isAcked(eb.id)) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <div class="dash-emergency" role="alert">
        <span class="dash-emergency__icon" aria-hidden="true">${ICONS.alert}</span>
        <div class="dash-emergency__body">
          <div class="dash-emergency__title">Emergency broadcast</div>
          <div class="dash-emergency__text">${escapeHtml(eb.message)}</div>
          <div class="dash-emergency__actions">
            <button class="btn btn--destructive btn--sm" id="emergencyAckBtn" type="button">I understand</button>
          </div>
        </div>
      </div>`;
    $('emergencyAckBtn').addEventListener('click', () => ackBroadcast(eb.id));
  }

  function renderQuickActions() {
    const wrap = $('dashQuickActions');
    const actions = QUICK_ACTIONS.filter((a) => a.roles.includes(role) && isModuleUnlocked(a.module));
    wrap.innerHTML = actions.map((a) => `<button class="dash-qa-btn" type="button" data-action="${a.id}">${a.icon}${escapeHtml(a.label)}</button>`).join('');
    wrap.querySelectorAll('[data-action]').forEach((btn) => {
      const action = actions.find((a) => a.id === btn.dataset.action);
      btn.addEventListener('click', action.open);
    });
  }

  function kpiDefs() {
    const rate = attendanceRate();
    return [
      { id: 'students', label: 'Total students', icon: ICONS.users, roles: ['Director', 'Admin', 'Teacher'], module: null, value: () => String(activeChildren().length), href: 'dashboard.html#children' },
      { id: 'present', label: 'Present today', icon: ICONS.check, roles: ['Director', 'Admin', 'Teacher'], module: 'attendance', value: () => String(presentTodayCount()), href: 'dashboard.html#children' },
      { id: 'rate', label: 'Attendance rate', icon: ICONS.trend, roles: ['Director', 'Admin', 'Teacher'], module: 'attendance', value: () => (rate === null ? '—' : rate + '%'), href: 'dashboard.html#children' },
      { id: 'fees', label: 'Pending fees', icon: ICONS.card, roles: ['Director', 'Admin'], module: null, value: () => '$' + pendingFeesTotal().toFixed(2), href: 'payroll.html' },
      { id: 'enquiries', label: 'New enquiries', icon: ICONS.userPlus, roles: ['Director', 'Admin'], module: null, value: () => String(newEnquiries().length), href: '#widget-enquiries' },
      { id: 'incidents', label: 'Open incidents', icon: ICONS.alert, roles: ['Director', 'Admin', 'Teacher'], module: 'health-safety', value: () => String(openIncidents().length), href: '#widget-incidents', alertIf: () => openIncidents().length > 0 },
      { id: 'staff', label: 'Staff on roster', icon: ICONS.users, roles: ['Director', 'Admin'], module: null, value: () => String(allStaff().length), href: 'dashboard.html#staff' },
      { id: 'ratio', label: 'Classes needing attention', icon: ICONS.alert, roles: ['Director', 'Admin', 'Teacher'], module: null, value: () => String(computeClassRatios().filter((r) => r.exceeded).length), href: '#widget-ratio', alertIf: () => computeClassRatios().some((r) => r.exceeded) },
    ];
  }

  function renderGrid() {
    const grid = $('dashGrid');
    const prefs = getWidgetPrefs();
    const ratios = computeClassRatios();
    notifyRatioAlerts(ratios);

    let html = '';
    kpiDefs().filter((k) => k.roles.includes(role)).forEach((k) => {
      html += `<div class="dash-span-3">${kpiCardHtml(k)}</div>`;
    });
    WIDGETS.filter((w) => w.roles.includes(role) && isWidgetVisible(w, prefs)).forEach((w) => {
      html += `<div class="dash-span-6" id="widget-${w.id}">${widgetShellHtml(w)}</div>`;
    });
    grid.innerHTML = html;

    WIDGETS.filter((w) => w.roles.includes(role) && isWidgetVisible(w, prefs)).forEach((w) => {
      const locked = w.module && !isModuleUnlocked(w.module);
      if (!locked) w.render($(`widget-body-${w.id}`));
    });

    grid.querySelectorAll('[data-kpi-locked]').forEach((el) => {
      const go = () => { window.location.href = `module.html?id=${el.dataset.kpiLocked}&role=${encodeURIComponent(role)}`; };
      el.addEventListener('click', go);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  function kpiCardHtml(k) {
    const locked = k.module && !isModuleUnlocked(k.module);
    if (locked) {
      return `
        <div class="kpi-card" data-kpi-locked="${k.module}" tabindex="0" role="button" aria-label="${escapeHtml(k.label)} — locked">
          <div class="kpi-card__top">
            <span class="kpi-card__icon">${ICONS.lock}</span>
          </div>
          <div class="kpi-card__value" style="font-size: var(--fs-body);">${moduleRequiredPlan(k.module)} plan</div>
          <div class="kpi-card__label">${escapeHtml(k.label)} is part of ${escapeHtml(moduleName(k.module))}</div>
        </div>`;
    }
    const alert = k.alertIf && k.alertIf();
    return `
      <a class="kpi-card${alert ? ' kpi-card--alert' : ''}" href="${k.href}">
        <div class="kpi-card__top">
          <span class="kpi-card__icon">${k.icon}</span>
        </div>
        <div class="kpi-card__value">${k.value()}</div>
        <div class="kpi-card__label">${escapeHtml(k.label)}</div>
      </a>`;
  }

  function widgetShellHtml(w) {
    const locked = w.module && !isModuleUnlocked(w.module);
    if (locked) {
      return `
        <div class="dash-widget">
          <div class="dash-widget__head"><span class="dash-widget__title">${escapeHtml(w.title)}</span></div>
          ${lockedBodyHtml(w.module)}
        </div>`;
    }
    return `
      <div class="dash-widget">
        <div class="dash-widget__head"><span class="dash-widget__title">${escapeHtml(w.title)}</span></div>
        <div id="widget-body-${w.id}"></div>
      </div>`;
  }

  function lockedBodyHtml(moduleId) {
    const role_ = role;
    const isAdminish = role_ === 'Director' || role_ === 'Admin';
    const action = isAdminish
      ? `<a class="btn btn--accent btn--sm dash-locked__action" href="plans.html?module=${moduleId}&role=${encodeURIComponent(role_)}">See plans &amp; upgrade</a>`
      : `<a class="btn btn--secondary btn--sm dash-locked__action" href="module.html?id=${moduleId}&role=${encodeURIComponent(role_)}">Ask my admin to upgrade</a>`;
    return `
      <div class="dash-locked">
        <div class="dash-locked__icon">${ICONS.lock}</div>
        <p class="dash-locked__text">This is included in the <b>${escapeHtml(moduleRequiredPlan(moduleId))}</b> plan as part of <b>${escapeHtml(moduleName(moduleId))}</b>.</p>
        ${action}
      </div>`;
  }

  /* ---------- widget renderers ---------- */
  function renderRatioWidget(el) {
    const ratios = computeClassRatios();
    if (!ratios.length) { el.innerHTML = emptyState('No classes set up yet.'); return; }
    el.innerHTML = ratios.map((r) => {
      const pct = Math.min(100, (r.ratio / r.limit) * 100);
      return `
        <div class="ratio-row${r.exceeded ? ' ratio-row--alert' : ''}">
          <span class="ratio-row__name">${escapeHtml(r.name)}</span>
          <span class="ratio-row__bar"><span class="ratio-row__bar-fill" style="width:${pct}%;"></span></span>
          <span class="ratio-row__value">${r.children}:${r.staff}</span>
        </div>`;
    }).join('');
  }

  function renderAttendanceChart(el) {
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    const total = activeChildren().length || 1;
    el.innerHTML = `<div class="bar-chart">${days.map((d) => {
      const isToday = d.toISOString().slice(0, 10) === todayStr();
      const pct = isToday ? Math.round((presentTodayCount() / total) * 100) : Math.round(85 + Math.sin(d.getDate()) * 10);
      return `<div class="bar-chart__col"><span class="bar-chart__bar" data-h="${pct}"></span><span class="bar-chart__label">${d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}</span></div>`;
    }).join('')}</div>`;
    requestAnimationFrame(() => {
      el.querySelectorAll('.bar-chart__bar').forEach((bar) => { bar.style.height = bar.dataset.h + '%'; });
    });
  }

  function renderEnquiriesWidget(el) {
    const list = newEnquiries();
    if (!list.length) { el.innerHTML = emptyState('No pending enquiries.'); return; }
    el.innerHTML = listRows(list.map((e) => ({ title: e.name, meta: e.contact + (e.note ? ' · ' + e.note : '') })));
  }
  function renderFeesWidget(el) {
    const list = window.PlayStore.getByType('Payment').filter((p) => p.status === 'Pending');
    if (!list.length) { el.innerHTML = emptyState('All payments are up to date.'); return; }
    el.innerHTML = listRows(list.map((p) => ({ title: p.childName, meta: '$' + Number(p.amount).toFixed(2) + ' pending' })));
  }
  function renderIncidentsWidget(el) {
    const list = openIncidents();
    if (!list.length) { el.innerHTML = emptyState('No incidents today.'); return; }
    el.innerHTML = listRows(list.map((i) => ({ title: i.description, meta: i.severity + ' severity · ' + i.date })));
  }
  function renderAnnouncementsWidget(el) {
    const list = recentAnnouncements();
    if (!list.length) { el.innerHTML = emptyState('No announcements yet.'); return; }
    el.innerHTML = listRows(list.map((a) => ({ title: a.title, meta: a.audience + ' · ' + a.date })));
  }
  function listRows(rows) {
    return `<div class="dash-list">${rows.map((r) => `
      <div class="dash-list-row">
        <div class="dash-list-row__main">
          <div class="dash-list-row__title">${escapeHtml(r.title)}</div>
          <div class="dash-list-row__meta">${escapeHtml(r.meta)}</div>
        </div>
      </div>`).join('')}</div>`;
  }
  function emptyState(text) {
    return `<div class="dash-widget__empty">${ICONS.inbox}<div>${escapeHtml(text)}</div></div>`;
  }

  /* ---------- customise modal ---------- */
  function wireCustomise() {
    $('dashCustomiseLink').addEventListener('click', (e) => {
      e.preventDefault();
      const prefs = getWidgetPrefs();
      const customizable = WIDGETS.filter((w) => w.roles.includes(role) && !w.essential);
      $('customiseList').innerHTML = customizable.map((w) => `
        <div class="check-row" style="margin-bottom: var(--space-3);">
          <input type="checkbox" class="checkbox" id="cust-${w.id}" ${isWidgetVisible(w, prefs) ? 'checked' : ''} />
          <label for="cust-${w.id}">${escapeHtml(w.title)}</label>
        </div>`).join('') || '<p class="card__text">No optional widgets available for your role yet.</p>';
      openModal('customiseModalBackdrop');
    });
    $('customiseSave').addEventListener('click', () => {
      const prefs = getWidgetPrefs();
      WIDGETS.forEach((w) => {
        const cb = $('cust-' + w.id);
        if (cb) prefs[w.id] = cb.checked;
      });
      saveWidgetPrefs(prefs);
      closeModal('customiseModalBackdrop');
      renderGrid();
      window.PlayShell.toast('success', 'Dashboard updated', 'Your widget preferences have been saved.');
    });
  }

  /* ---------- generic modal plumbing ---------- */
  function openModal(id) {
    const backdrop = $(id);
    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id) {
    const backdrop = $(id);
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function wireModals() {
    ['customiseModalBackdrop', 'attendanceModalBackdrop', 'enquiryModalBackdrop', 'paymentModalBackdrop', 'incidentModalBackdrop', 'announcementModalBackdrop'].forEach((id) => {
      const backdrop = $(id);
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal(id); });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      ['customiseModalBackdrop', 'attendanceModalBackdrop', 'enquiryModalBackdrop', 'paymentModalBackdrop', 'incidentModalBackdrop', 'announcementModalBackdrop'].forEach((id) => {
        if ($(id).classList.contains('is-open')) closeModal(id);
      });
    });
    wireAttendanceForm();
    wireEnquiryForm();
    wirePaymentForm();
    wireIncidentForm();
    wireAnnouncementForm();
  }

  function setFieldError(inputId, message) {
    const input = $(inputId);
    const errorEl = $('err-' + inputId);
    if (!errorEl) return;
    if (message) { errorEl.textContent = message; errorEl.hidden = false; input.closest('.field').classList.add('is-error'); }
    else { errorEl.hidden = true; input.closest('.field').classList.remove('is-error'); }
  }
  function submitWithLoading(btnId, work) {
    const btn = $(btnId);
    if (btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading');
    btn.disabled = true;
    window.setTimeout(() => {
      work();
      btn.classList.remove('is-loading');
      btn.disabled = false;
    }, 500);
  }

  function openAttendanceModal() {
    const select = $('attChild');
    select.innerHTML = activeChildren().map((c) => `<option value="${c.id}">${escapeHtml(c.name)} · ${escapeHtml(c.room)}</option>`).join('');
    openModal('attendanceModalBackdrop');
  }
  function wireAttendanceForm() {
    $('attendanceSubmit').addEventListener('click', () => {
      const child = activeChildren().find((c) => c.id === $('attChild').value);
      if (!child) return;
      submitWithLoading('attendanceSubmit', () => {
        window.PlayStore.addRecord({ id: 'ATT-' + Date.now().toString(36), type: 'Attendance', childId: child.id, childName: child.name, status: $('attStatus').value, date: todayStr() });
        closeModal('attendanceModalBackdrop');
        renderGrid();
        window.PlayShell.toast('success', 'Attendance saved', `${child.name} marked ${$('attStatus').value.toLowerCase()}.`);
      });
    });
  }

  function wireEnquiryForm() {
    $('enquirySubmit').addEventListener('click', () => {
      const name = $('enqName').value.trim();
      const contact = $('enqContact').value.trim();
      let ok = true;
      if (!name) { setFieldError('enqName', 'Name is required.'); ok = false; } else setFieldError('enqName', null);
      if (!contact) { setFieldError('enqContact', 'Email or phone is required.'); ok = false; } else setFieldError('enqContact', null);
      if (!ok) return;
      submitWithLoading('enquirySubmit', () => {
        window.PlayStore.addRecord({ id: 'ENQ-' + Date.now().toString(36), type: 'Enquiry', name, contact, note: $('enqNote').value.trim(), status: 'New', date: todayStr() });
        $('enqName').value = ''; $('enqContact').value = ''; $('enqNote').value = '';
        closeModal('enquiryModalBackdrop');
        renderGrid();
        window.PlayShell.toast('success', 'Enquiry added', `${name} has been added to your enquiries.`);
      });
    });
  }

  function openPaymentModal() {
    const select = $('payChild');
    select.innerHTML = activeChildren().map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    openModal('paymentModalBackdrop');
  }
  function wirePaymentForm() {
    $('paymentSubmit').addEventListener('click', () => {
      const amount = parseFloat($('payAmount').value);
      if (!amount || amount <= 0) { setFieldError('payAmount', 'Enter an amount greater than 0.'); return; }
      setFieldError('payAmount', null);
      const child = activeChildren().find((c) => c.id === $('payChild').value);
      submitWithLoading('paymentSubmit', () => {
        window.PlayStore.addRecord({ id: 'PAY-' + Date.now().toString(36), type: 'Payment', childName: child ? child.name : 'Unknown', amount, status: $('payStatus').value, date: todayStr() });
        $('payAmount').value = '';
        closeModal('paymentModalBackdrop');
        renderGrid();
        window.PlayShell.toast('success', 'Payment recorded', `$${amount.toFixed(2)} logged as ${$('payStatus').value.toLowerCase()}.`);
      });
    });
  }

  function wireIncidentForm() {
    $('incidentSubmit').addEventListener('click', () => {
      const desc = $('incDescription').value.trim();
      if (!desc) { setFieldError('incDescription', 'Please describe what happened.'); return; }
      setFieldError('incDescription', null);
      submitWithLoading('incidentSubmit', () => {
        window.PlayStore.addRecord({ id: 'INC-' + Date.now().toString(36), type: 'Incident', description: desc, severity: $('incSeverity').value, status: 'Open', date: todayStr() });
        $('incDescription').value = '';
        closeModal('incidentModalBackdrop');
        renderGrid();
        window.PlayShell.toast('success', 'Incident logged', 'The incident has been recorded.');
      });
    });
  }

  function wireAnnouncementForm() {
    $('announcementSubmit').addEventListener('click', () => {
      const title = $('annTitle').value.trim();
      const message = $('annMessage').value.trim();
      let ok = true;
      if (!title) { setFieldError('annTitle', 'Title is required.'); ok = false; } else setFieldError('annTitle', null);
      if (!message) { setFieldError('annMessage', 'Message is required.'); ok = false; } else setFieldError('annMessage', null);
      if (!ok) return;
      submitWithLoading('announcementSubmit', () => {
        window.PlayStore.addRecord({ id: 'ANN-' + Date.now().toString(36), type: 'Announcement', title, message, audience: $('annAudience').value, date: todayStr() });
        $('annTitle').value = ''; $('annMessage').value = '';
        closeModal('announcementModalBackdrop');
        renderGrid();
        window.PlayShell.toast('success', 'Announcement published', `"${title}" was published.`);
      });
    });
  }
})();
