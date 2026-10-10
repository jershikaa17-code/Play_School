/* ==========================================================================
   PLAY SCHOOL — Record page (S13 Child Profile for Child records; the
   original minimal card view is preserved unchanged for Guardian/Staff).
   Reuses the shared store (store.js) for everything — Children, Guardians,
   Classes, CareEntry (Daily Care Log), Attendance, Event (Calendar/consents),
   Payment/Incident records — and redirects to children.html's own modals
   for Edit/Move class/Withdraw/Message so that logic is never duplicated.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  /** Guardian.relation is stored as "<relation> of <child name>" (e.g. "Mother
      of Ivy Thornbury") so it reads sensibly across multiple children sharing
      a guardian; strips the child-specific suffix back off for display. */
  function cleanRelation(relation, childName) {
    const escaped = String(childName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(relation || '').replace(new RegExp('\\s+of\\s+' + escaped + '$'), '');
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/);
    if (!parts.length || !parts[0]) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  function formatDateMed(iso) { if (!iso) return '—'; return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  function formatTime12(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + pad2(m) + ' ' + period;
  }
  function ageInfo(dob) {
    if (!dob) return { label: '—' };
    const d = new Date(dob + 'T00:00:00');
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    let months = now.getMonth() - d.getMonth();
    if (now.getDate() < d.getDate()) months -= 1;
    if (months < 0) { years -= 1; months += 12; }
    years = Math.max(years, 0);
    return { years, months, label: years + 'y ' + months + 'm' };
  }

  const ICON = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    shieldOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/><line x1="4.5" y1="4.5" x2="19.5" y2="19.5"/></svg>',
    allergy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    medical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
    dietary: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a9 9 0 0 0 9-9c0-4-2-8-9-11-7 3-9 7-9 11a9 9 0 0 0 9 9Z"/><path d="M12 21V11"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    printer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/></svg>',
  };
  const ALERT_META = {
    allergy: { label: 'Allergy', icon: ICON.allergy, cls: 'allergy' },
    medical: { label: 'Medical', icon: ICON.medical, cls: 'medical' },
    dietary: { label: 'Dietary', icon: ICON.dietary, cls: 'dietary' },
  };

  let record = null;
  let role = null;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', (e) => { role = e.detail.role; if (record && record.type === 'Child') renderTabPanel(); });

  function init() {
    window.PlayShell.login();
    role = window.PlayShell.getDemoRole();
    const params = new URLSearchParams(window.location.search);
    record = window.PlayStore.getById(params.get('id'));
    if (!record) { window.location.replace('404.html'); return; }

    window.PlayShell.mount('', displayTitle(record));
    document.getElementById('pageContent').hidden = false;
    document.getElementById('appContent').appendChild(document.getElementById('pageContent'));

    if (record.type === 'Child') { $('profileView').hidden = false; initChildProfile(); }
    else { $('genericView').hidden = false; initGenericRecord(); }
  }
  function displayTitle(r) { return r.preferredName ? r.name + ' (' + r.preferredName + ')' : r.name; }

  /* ========================================================================
     GENERIC RECORD VIEW (Guardian / Staff) — unchanged behaviour
     ======================================================================== */
  function initGenericRecord() {
    document.getElementById('recordType').textContent = record.type;
    document.getElementById('recordName').textContent = record.name;
    document.getElementById('recordSecondary').textContent = window.PlayStore.secondaryLine(record);
    document.getElementById('recordStatus').textContent = record.status;
    document.getElementById('recordId').textContent = record.id;
    document.getElementById('recordBreadcrumb').textContent = record.name;

    const NOTES_KEY = 'ps_notes_' + record.id;
    const textarea = $('recordNotes');
    const meta = $('recordNotesMeta');
    const saveBtn = $('recordNotesSaveBtn');
    let isSaving = false;
    function readSaved() { try { return JSON.parse(localStorage.getItem(NOTES_KEY) || 'null'); } catch (e) { return null; } }
    const saved = readSaved();
    if (saved) { textarea.value = saved.text || ''; meta.textContent = 'Saved ' + new Date(saved.time).toLocaleString(); }
    saveBtn.addEventListener('click', () => {
      if (isSaving) return;
      isSaving = true; saveBtn.classList.add('is-loading'); saveBtn.disabled = true;
      window.setTimeout(() => {
        try {
          const entry = { text: textarea.value, time: new Date().toISOString() };
          localStorage.setItem(NOTES_KEY, JSON.stringify(entry));
          meta.textContent = 'Saved ' + new Date(entry.time).toLocaleString();
          window.PlayShell.toast('info', 'Saved on this device', 'Your notes are stored locally on this device.');
        } catch (e) { window.PlayShell.toast('error', "Couldn't save your notes", 'Your text is still here — please try again.'); }
        isSaving = false; saveBtn.classList.remove('is-loading'); saveBtn.disabled = false;
      }, 350);
    });
  }

  /* ========================================================================
     CHILD PROFILE
     ======================================================================== */
  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'family', label: 'Family & Guardians' },
    { key: 'pickup', label: 'Emergency & Pickup' },
    { key: 'medical', label: 'Medical & Dietary' },
    { key: 'attendance', label: 'Attendance', gate: { type: 'plan', moduleId: 'attendance' } },
    { key: 'diary', label: 'Daily Diary' },
    { key: 'learning', label: 'Learning & Portfolio', gate: { type: 'plan', moduleId: 'curriculum' } },
    { key: 'incidents', label: 'Incidents', gate: { type: 'plan', moduleId: 'health-safety' } },
    { key: 'documents', label: 'Documents' },
    { key: 'consents', label: 'Consents' },
    { key: 'billing', label: 'Billing', gate: { type: 'role', roles: ['Director', 'Admin'] } },
  ];
  let activeTab = 'overview';

  function classRecordFor(child) { return window.PlayStore.records.find((r) => r.type === 'Class' && r.name === child.room); }
  function guardianFor(child) { return child.guardianId ? window.PlayStore.getById(child.guardianId) : null; }
  function isModuleUnlocked(moduleId) {
    if (!window.PlayModules) return true;
    const mod = window.PlayModules.getById(moduleId);
    if (!mod) return true;
    return window.PlayModules.isUnlocked(mod, window.PlayModules.getCurrentPlan());
  }
  function hasRole(roles) { return roles.indexOf(role) !== -1; }

  function initChildProfile() {
    $('profileBreadcrumb').textContent = record.name;
    renderHeader();
    renderAlertBanner();
    renderTabsNav();
    renderTabPanel();
    wireHeaderActions();
    wireFamilyModal();
    wirePickupModal();
    wireAlertModal();
    wireDocumentModal();
    wireConfirmModal();
  }

  /* ---------- header ---------- */
  function renderHeader() {
    const child = record;
    const cls = classRecordFor(child);
    const age = ageInfo(child.dob);
    $('profileHeader').innerHTML = `
      <div class="profile-header">
        <div class="profile-header__photo">${escapeHtml(initials(child.name))}</div>
        <div class="profile-header__body">
          <div class="profile-header__name-row">
            <span class="profile-header__name">${escapeHtml(child.name)}</span>
            ${child.preferredName ? `<span class="profile-header__preferred">"${escapeHtml(child.preferredName)}"</span>` : ''}
            <span class="badge ${child.status === 'Active' ? 'badge--success' : child.status === 'Withdrawn' ? 'badge--error' : 'badge--neutral'}">${escapeHtml(child.status)}</span>
          </div>
          <div class="profile-header__meta">
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Age</span><span class="profile-header__meta-value">${age.label}</span></div>
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Date of birth</span><span class="profile-header__meta-value">${formatDateMed(child.dob)}</span></div>
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Class</span><span class="profile-header__meta-value">${escapeHtml(child.room || '—')}</span></div>
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Key teacher</span><span class="profile-header__meta-value">${escapeHtml((cls && cls.teacherName) || '—')}</span></div>
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Start date</span><span class="profile-header__meta-value">${formatDateMed(child.startDate)}</span></div>
          </div>
        </div>
        <div class="profile-header__actions">
          <button class="btn btn--secondary btn--sm" type="button" id="hdrEditBtn">${ICON.pencil}<span>&nbsp;Edit</span></button>
          <button class="btn btn--secondary btn--sm" type="button" id="hdrMessageBtn">${ICON.message}<span>&nbsp;Message family</span></button>
          <button class="btn btn--secondary btn--sm" type="button" id="hdrPrintBtn">${ICON.printer}<span>&nbsp;Print summary</span></button>
          <span class="popover" id="hdrMoreMenu">
            <button class="btn btn--icon" type="button" id="hdrMoreBtn" aria-haspopup="true" aria-expanded="false" aria-label="More actions">${ICON.dots}</button>
            <span class="popover__panel" role="menu" style="right:0; left:auto;">
              <button class="popover__item" type="button" id="hdrMoveBtn" role="menuitem">Move class</button>
              <button class="popover__item popover__item--danger" type="button" id="hdrWithdrawBtn" role="menuitem">Withdraw</button>
            </span>
          </span>
        </div>
      </div>`;
  }
  function wireHeaderActions() {
    $('hdrEditBtn').addEventListener('click', () => { window.location.href = 'enroll.html?id=' + encodeURIComponent(record.id); });
    $('hdrMessageBtn').addEventListener('click', () => { window.location.href = 'children.html?action=message&id=' + encodeURIComponent(record.id); });
    $('hdrMoveBtn').addEventListener('click', () => { window.location.href = 'children.html?action=move&id=' + encodeURIComponent(record.id); });
    $('hdrWithdrawBtn').addEventListener('click', () => { window.location.href = 'children.html?action=withdraw&id=' + encodeURIComponent(record.id); });
    $('hdrPrintBtn').addEventListener('click', () => { buildPrintSummary(); window.print(); });
    const menu = $('hdrMoreMenu');
    $('hdrMoreBtn').addEventListener('click', (e) => { e.stopPropagation(); const willOpen = !menu.classList.contains('is-open'); menu.classList.toggle('is-open', willOpen); });
    document.addEventListener('click', () => menu.classList.remove('is-open'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.classList.remove('is-open'); });
  }

  /* ---------- safeguarding alert banner (persists across every tab) ---------- */
  function renderAlertBanner() {
    const child = record;
    const alerts = child.alerts || [];
    const medical = alerts.filter((a) => a.type === 'allergy' || a.type === 'medical');
    const custody = alerts.filter((a) => a.type === 'custody');
    const restrictedPeople = (child.authorizedPickups || []).filter((p) => p.restricted);
    const banner = $('profileAlertBanner');
    let html = '';
    medical.forEach((a) => {
      html += `<div class="profile-alert profile-alert--medical">${ICON.allergy}<span><span class="profile-alert__label">${a.type === 'allergy' ? 'Allergy warning' : 'Medical alert'}</span>${escapeHtml(a.detail)}</span></div>`;
    });
    custody.forEach((a) => {
      html += `<div class="profile-alert profile-alert--custody">${ICON.shieldOff}<span><span class="profile-alert__label">Custody / release restriction</span>${escapeHtml(a.detail)}</span></div>`;
    });
    restrictedPeople.forEach((p) => {
      html += `<div class="profile-alert profile-alert--custody">${ICON.shieldOff}<span><span class="profile-alert__label">Do not release</span>Do not release to: ${escapeHtml(p.name)}${p.restrictionReason ? ' (' + escapeHtml(p.restrictionReason) + ')' : ''}</span></div>`;
    });
    banner.innerHTML = html;
    banner.hidden = !html;
  }

  /* ---------- tabs ---------- */
  function renderTabsNav() {
    const list = $('profileTabs');
    list.innerHTML = '<span class="tabs__indicator" id="profileTabIndicator"></span>' + TABS.map((t) => `<button class="tabs__tab" type="button" data-tab="${t.key}" role="tab" aria-selected="${t.key === activeTab}">${escapeHtml(t.label)}</button>`).join('');
    list.querySelectorAll('[data-tab]').forEach((btn) => btn.addEventListener('click', () => selectTab(btn.dataset.tab)));
    const select = $('profileTabsSelect');
    select.innerHTML = TABS.map((t) => `<option value="${t.key}">${escapeHtml(t.label)}</option>`).join('');
    select.value = activeTab;
    select.onchange = () => selectTab(select.value);
    positionTabIndicator();
  }
  function positionTabIndicator() {
    const activeBtn = document.querySelector(`#profileTabs [data-tab="${activeTab}"]`);
    const indicator = $('profileTabIndicator');
    if (activeBtn && indicator) { indicator.style.left = activeBtn.offsetLeft + 'px'; indicator.style.width = activeBtn.offsetWidth + 'px'; }
  }
  function selectTab(key) {
    activeTab = key;
    document.querySelectorAll('#profileTabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === key)));
    $('profileTabsSelect').value = key;
    positionTabIndicator();
    renderTabPanel();
  }

  function lockedPlanHtml(moduleId, label) {
    const mod = window.PlayModules && window.PlayModules.getById(moduleId);
    const isAdminish = role === 'Director' || role === 'Admin';
    const action = isAdminish
      ? `<a class="btn btn--accent" href="plans.html?module=${moduleId}&role=${encodeURIComponent(role)}">See plans &amp; upgrade</a>`
      : `<a class="btn btn--secondary" href="module.html?id=${moduleId}&role=${encodeURIComponent(role)}">Ask my admin to upgrade</a>`;
    return `<div class="profile-locked profile-locked--plan">
      <div class="profile-locked__icon">${ICON.lock}</div>
      <div class="profile-locked__title">Included in the ${escapeHtml(mod ? mod.requiredPlan : 'higher')} plan</div>
      <p class="profile-locked__text">${escapeHtml(label)} is part of ${escapeHtml(mod ? mod.name : label)}, which isn't included in the school's current plan yet.</p>
      <div class="profile-locked__action">${action}</div>
    </div>`;
  }
  function lockedRoleHtml(label) {
    return `<div class="profile-locked profile-locked--role">
      <div class="profile-locked__icon">${ICON.shieldOff}</div>
      <div class="profile-locked__title">Restricted</div>
      <p class="profile-locked__text">Your current role (${escapeHtml(role)}) doesn't have permission to view ${escapeHtml(label)} for this child.</p>
    </div>`;
  }

  function renderTabPanel() {
    const panel = $('profileTabPanel');
    const tab = TABS.find((t) => t.key === activeTab);
    if (tab.gate) {
      if (tab.gate.type === 'plan' && !isModuleUnlocked(tab.gate.moduleId)) { panel.innerHTML = lockedPlanHtml(tab.gate.moduleId, tab.label); return; }
      if (tab.gate.type === 'role' && !hasRole(tab.gate.roles)) { panel.innerHTML = lockedRoleHtml(tab.label); return; }
    }
    const renderers = {
      overview: renderOverviewTab, family: renderFamilyTab, pickup: renderPickupTab, medical: renderMedicalTab,
      attendance: renderAttendanceTab, diary: renderDiaryTab, learning: renderLearningTab, incidents: renderIncidentsTab,
      documents: renderDocumentsTab, consents: renderConsentsTab, billing: renderBillingTab,
    };
    panel.innerHTML = '';
    renderers[activeTab]();
  }

  function emptyStateHtml(text) { return `<div class="profile-empty">${ICON.inbox}<div>${escapeHtml(text)}</div></div>`; }
  function cardEditBtn(id, label) { return `<button class="profile-card__edit" type="button" id="${id}" aria-label="${escapeHtml(label)}">${ICON.pencil}</button>`; }

  /* ---------- Overview ---------- */
  function renderOverviewTab() {
    const child = record;
    const guardian = guardianFor(child);
    const diaryEntries = window.PlayStore.getByType('CareEntry').filter((e) => e.childId === child.id).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))).slice(0, 3);
    const attendanceUnlocked = isModuleUnlocked('attendance');
    const attRecords = window.PlayStore.getByType('Attendance').filter((a) => a.childId === child.id);
    const present = attRecords.filter((a) => a.status !== 'Absent').length;
    const consentEvents = relevantConsentEvents(child);
    const pendingConsents = consentEvents.filter((ev) => !ev.consents || !ev.consents[child.id]).length;

    $('profileTabPanel').innerHTML = `
      <div class="profile-cards">
        <div class="profile-card">
          <div class="profile-card__head"><span class="profile-card__title">Personal information</span>${cardEditBtn('ovEditPersonal', 'Edit personal information')}</div>
          <div class="profile-row"><span class="profile-row__label">Full name</span><span class="profile-row__value">${escapeHtml(child.name)}</span></div>
          ${child.preferredName ? `<div class="profile-row"><span class="profile-row__label">Preferred name</span><span class="profile-row__value">${escapeHtml(child.preferredName)}</span></div>` : ''}
          <div class="profile-row"><span class="profile-row__label">Date of birth</span><span class="profile-row__value">${formatDateMed(child.dob)} (${ageInfo(child.dob).label})</span></div>
          <div class="profile-row"><span class="profile-row__label">Class</span><span class="profile-row__value">${escapeHtml(child.room || '—')}</span></div>
          <div class="profile-row"><span class="profile-row__label">Status</span><span class="profile-row__value">${escapeHtml(child.status)}</span></div>
          <div class="profile-row"><span class="profile-row__label">Start date</span><span class="profile-row__value">${formatDateMed(child.startDate)}</span></div>
        </div>

        <div class="profile-card">
          <div class="profile-card__head"><span class="profile-card__title">Family contact</span>${cardEditBtn('ovEditFamily', 'Edit family contact')}</div>
          ${guardian ? `
            <div class="profile-row"><span class="profile-row__label">Name</span><span class="profile-row__value">${escapeHtml(guardian.name)}</span></div>
            <div class="profile-row"><span class="profile-row__label">Relationship</span><span class="profile-row__value">${escapeHtml(cleanRelation(guardian.relation, child.name))}</span></div>
            <div class="profile-row"><span class="profile-row__label">Contact</span><span class="profile-row__value">${escapeHtml(guardian.contact || '—')}</span></div>
          ` : emptyStateHtml('No guardian on file.')}
        </div>

        <div class="profile-card">
          <span class="profile-card__title">Medical &amp; dietary alerts</span>
          <div class="profile-people" style="margin-top: var(--space-3);">
            ${(child.alerts || []).filter((a) => a.type !== 'custody').length
              ? (child.alerts || []).filter((a) => a.type !== 'custody').map((a) => `<span class="badge ${a.type === 'dietary' ? 'badge--success' : 'badge--error'}">${escapeHtml(ALERT_META[a.type] ? ALERT_META[a.type].label : a.type)}</span>`).join(' ')
              : emptyStateHtml('No medical or dietary alerts on file.')}
          </div>
        </div>

        <div class="profile-card">
          <span class="profile-card__title">Attendance</span>
          ${attendanceUnlocked
            ? `<div class="profile-row"><span class="profile-row__label">Recorded days</span><span class="profile-row__value">${attRecords.length}</span></div><div class="profile-row"><span class="profile-row__label">Present / late</span><span class="profile-row__value">${present}</span></div>`
            : `<p class="profile-empty" style="padding:0;">${ICON.lock} Included in a higher plan — see the Attendance tab.</p>`}
        </div>

        <div class="profile-card profile-card--wide">
          <div class="profile-card__head"><span class="profile-card__title">Recent Daily Diary entries</span></div>
          ${diaryEntries.length ? `<div class="profile-list">${diaryEntries.map((e) => `<div class="profile-list-row"><div><div class="profile-list-row__title">${escapeHtml(e.entryType.charAt(0).toUpperCase() + e.entryType.slice(1))}</div><div class="profile-list-row__meta">${formatDateMed(e.date)}${e.time ? ' · ' + formatTime12(e.time) : ''}</div></div></div>`).join('')}</div>` : emptyStateHtml('No Daily Care Log entries yet.')}
        </div>

        <div class="profile-card">
          <span class="profile-card__title">Consents</span>
          ${consentEvents.length ? `<div class="profile-row"><span class="profile-row__label">Outstanding</span><span class="profile-row__value">${pendingConsents} of ${consentEvents.length}</span></div>` : emptyStateHtml('No consent-requiring events on file.')}
        </div>
      </div>`;

    $('ovEditPersonal').addEventListener('click', () => { window.location.href = 'enroll.html?id=' + encodeURIComponent(child.id); });
    $('ovEditFamily').addEventListener('click', openFamilyModal);
  }

  /* ---------- Family & Guardians ---------- */
  function renderFamilyTab() {
    const child = record;
    const guardian = guardianFor(child);
    const others = (child.authorizedPickups || []).filter((p) => !p.restricted && (!guardian || p.name !== guardian.name));
    $('profileTabPanel').innerHTML = `
      <div class="profile-cards">
        <div class="profile-card">
          <div class="profile-card__head"><span class="profile-card__title">Primary guardian</span>${cardEditBtn('famEdit', 'Edit guardian')}</div>
          ${guardian ? `
            <div class="profile-people"><div class="profile-person">
              <span class="profile-person__avatar">${escapeHtml(initials(guardian.name))}</span>
              <span class="profile-person__body"><span class="profile-person__name">${escapeHtml(guardian.name)}</span><span class="profile-person__sub">${escapeHtml(cleanRelation(guardian.relation, child.name))} · ${escapeHtml(guardian.contact || 'No contact on file')}</span></span>
            </div></div>` : emptyStateHtml('No guardian on file.')}
        </div>
        <div class="profile-card">
          <span class="profile-card__title">Other family contacts</span>
          <p class="field__hint" style="margin-top:2px;">Managed from the Emergency &amp; Pickup tab.</p>
          <div class="profile-people" style="margin-top: var(--space-3);">
            ${others.length ? others.map((p) => `<div class="profile-person"><span class="profile-person__avatar">${escapeHtml(initials(p.name))}</span><span class="profile-person__body"><span class="profile-person__name">${escapeHtml(p.name)}</span><span class="profile-person__sub">${escapeHtml(p.relation || 'Family contact')}</span></span></div>`).join('') : emptyStateHtml('No other family contacts on file.')}
          </div>
        </div>
      </div>`;
    $('famEdit').addEventListener('click', openFamilyModal);
  }

  /* ---------- Emergency & Pickup ---------- */
  function renderPickupTab() {
    const child = record;
    const pickups = child.authorizedPickups || [];
    $('profileTabPanel').innerHTML = `
      <div class="profile-card">
        <div class="profile-card__head">
          <span class="profile-card__title">Authorised pickup &amp; emergency contacts</span>
          <button class="btn btn--secondary btn--sm" type="button" id="pickupAddBtn">${ICON.plus}<span>&nbsp;Add person</span></button>
        </div>
        <div class="profile-people">
          ${pickups.length ? pickups.map((p) => pickupCardHtml(p)).join('') : emptyStateHtml('No authorised pickup people on file yet.')}
        </div>
      </div>`;
    $('pickupAddBtn').addEventListener('click', () => openPickupModal(null));
    wirePickupCardButtons();
  }
  function pickupCardHtml(p) {
    const canReveal = hasRole(['Director', 'Admin']);
    let passcodeHtml = '';
    if (!p.restricted && p.passcode) {
      passcodeHtml = canReveal
        ? `<span class="profile-passcode"><span id="pc-${p.id}">Passcode •••• </span><button class="btn btn--text btn--sm" type="button" data-reveal="${p.id}">${ICON.eye} Reveal</button></span>`
        : `<span class="profile-passcode">Passcode set — ask an admin to reveal</span>`;
    }
    return `
      <div class="profile-person${p.restricted ? ' profile-person--restricted' : ''}">
        <span class="profile-person__avatar">${escapeHtml(initials(p.name))}</span>
        <span class="profile-person__body">
          <span class="profile-person__name">${escapeHtml(p.name)}</span>
          <span class="profile-person__sub">${p.restricted ? 'Do not release' + (p.restrictionReason ? ' — ' + escapeHtml(p.restrictionReason) : '') : escapeHtml(p.relation || 'Authorised pickup')}</span>
          ${passcodeHtml}
        </span>
        <span class="profile-person__actions">
          <button class="profile-card__edit" type="button" data-edit-pickup="${p.id}" aria-label="Edit ${escapeHtml(p.name)}">${ICON.pencil}</button>
          <button class="profile-card__edit" type="button" data-remove-pickup="${p.id}" aria-label="Remove ${escapeHtml(p.name)}">${ICON.trash}</button>
        </span>
      </div>`;
  }
  function wirePickupCardButtons() {
    document.querySelectorAll('[data-edit-pickup]').forEach((btn) => btn.addEventListener('click', () => {
      const p = (record.authorizedPickups || []).find((x) => x.id === btn.dataset.editPickup);
      openPickupModal(p);
    }));
    document.querySelectorAll('[data-remove-pickup]').forEach((btn) => btn.addEventListener('click', () => {
      const p = (record.authorizedPickups || []).find((x) => x.id === btn.dataset.removePickup);
      if (!p) return;
      openConfirmModal('Remove ' + p.name + '?', 'They will no longer be an authorised pickup option for this child.', () => {
        record.authorizedPickups = (record.authorizedPickups || []).filter((x) => x.id !== p.id);
        window.PlayStore.updateRecord(record.id, { authorizedPickups: record.authorizedPickups });
        renderAlertBanner(); renderTabPanel();
        window.PlayShell.toast('success', 'Removed', p.name + ' is no longer an authorised pickup person.');
      });
    }));
    document.querySelectorAll('[data-reveal]').forEach((btn) => btn.addEventListener('click', () => revealPasscode(btn.dataset.reveal)));
  }
  /** Reveals a passcode inline for a few seconds and logs an audit record
      (staff, child, pickup person, timestamp — never the passcode itself).
      This is a frontend-only audit trail with no tamper-resistant backend —
      see the project report for the limitation. */
  function revealPasscode(pickupId) {
    const p = (record.authorizedPickups || []).find((x) => x.id === pickupId);
    if (!p || !p.passcode || !hasRole(['Director', 'Admin'])) return;
    const staff = { id: 'S-3001', name: 'Nithya' }; // see attendance.js — this demo's one fixed signed-in identity
    window.PlayStore.addRecord({
      id: 'AUD-' + Date.now().toString(36).toUpperCase(), type: 'PasscodeRevealAudit',
      childId: record.id, pickupPersonId: p.id, staffId: staff.id, staffName: staff.name,
      timestamp: new Date().toISOString(),
    });
    const el = $('pc-' + p.id);
    if (el) el.textContent = 'Passcode ' + p.passcode;
    window.PlayShell.toast('info', 'Passcode revealed', 'This reveal was logged for audit.');
    window.setTimeout(() => { const el2 = $('pc-' + p.id); if (el2) el2.textContent = 'Passcode •••• '; }, 4000);
  }

  /* ---------- Medical & Dietary ---------- */
  function renderMedicalTab() {
    const child = record;
    const alerts = (child.alerts || []).filter((a) => a.type !== 'custody');
    $('profileTabPanel').innerHTML = `
      <div class="profile-card">
        <div class="profile-card__head">
          <span class="profile-card__title">Medical, allergy &amp; dietary information</span>
          <button class="btn btn--secondary btn--sm" type="button" id="alertAddBtn">${ICON.plus}<span>&nbsp;Add alert</span></button>
        </div>
        <div class="profile-people">
          ${alerts.length ? alerts.map((a) => alertCardHtml(a)).join('') : emptyStateHtml('No medical, allergy or dietary alerts on file.')}
        </div>
      </div>`;
    $('alertAddBtn').addEventListener('click', () => openAlertModal(null));
    wireAlertCardButtons();
  }
  function alertCardHtml(a) {
    const meta = ALERT_META[a.type] || { label: a.type, icon: ICON.medical, cls: 'medical' };
    return `
      <div class="profile-alert-card profile-alert-card--${meta.cls}">
        <span class="profile-alert-card__icon">${meta.icon}</span>
        <span class="profile-alert-card__body"><span class="profile-alert-card__type">${escapeHtml(meta.label)}${a.allergen ? ' · ' + escapeHtml(a.allergen) : ''}</span><div class="profile-alert-card__detail">${escapeHtml(a.detail)}</div></span>
        <span class="profile-alert-card__actions">
          <button class="profile-card__edit" type="button" data-edit-alert="${a.id}" aria-label="Edit alert">${ICON.pencil}</button>
          <button class="profile-card__edit" type="button" data-remove-alert="${a.id}" aria-label="Remove alert">${ICON.trash}</button>
        </span>
      </div>`;
  }
  function wireAlertCardButtons() {
    document.querySelectorAll('[data-edit-alert]').forEach((btn) => btn.addEventListener('click', () => {
      const a = (record.alerts || []).find((x) => x.id === btn.dataset.editAlert);
      openAlertModal(a);
    }));
    document.querySelectorAll('[data-remove-alert]').forEach((btn) => btn.addEventListener('click', () => {
      const a = (record.alerts || []).find((x) => x.id === btn.dataset.removeAlert);
      if (!a) return;
      openConfirmModal('Remove this alert?', 'This cannot be undone.', () => {
        record.alerts = (record.alerts || []).filter((x) => x.id !== a.id);
        window.PlayStore.updateRecord(record.id, { alerts: record.alerts });
        renderAlertBanner(); renderTabPanel();
        window.PlayShell.toast('success', 'Removed', 'The alert has been removed.');
      });
    }));
  }

  /* ---------- Attendance ---------- */
  function renderAttendanceTab() {
    const records_ = window.PlayStore.getByType('Attendance').filter((a) => a.childId === record.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
    $('profileTabPanel').innerHTML = `
      <div class="profile-card profile-card--wide">
        <div class="profile-card__head"><span class="profile-card__title">Recent attendance</span><a class="btn btn--text btn--sm" href="attendance.html">Open Live Attendance</a></div>
        ${records_.length ? `<div class="profile-list">${records_.map((a) => `
          <div class="profile-list-row">
            <div><div class="profile-list-row__title">${formatDateMed(a.date)}</div><div class="profile-list-row__meta">${a.checkInTime ? 'In ' + formatTime12(a.checkInTime) : ''}${a.checkOutTime ? ' · Out ' + formatTime12(a.checkOutTime) : ''}${a.absenceReason ? a.absenceReason : ''}</div></div>
            <span class="badge ${a.status === 'Absent' ? 'badge--error' : a.status === 'Late' ? 'badge--warning' : 'badge--success'}">${escapeHtml(a.status)}</span>
          </div>`).join('')}</div>` : emptyStateHtml('No attendance recorded yet.')}
      </div>`;
  }

  /* ---------- Daily Diary ---------- */
  const DIARY_TYPE_LABEL = { meal: 'Meal', nap: 'Nap', toileting: 'Toileting', mood: 'Mood', activity: 'Activity', note: 'Note', photo: 'Photo' };
  const MOOD_LABEL = { 'very-happy': 'Very happy', happy: 'Happy', neutral: 'Neutral', sad: 'Sad', upset: 'Upset' };
  function diarySummary(e) {
    if (e.entryType === 'meal') return (e.mealType || 'Meal') + ' · ' + (e.amount || 'Logged') + ' eaten';
    if (e.entryType === 'nap') { if (!e.endTime) return 'In progress'; const m = e.durationMin || 0; return 'Slept ' + Math.floor(m / 60) + 'h ' + (m % 60) + 'm'; }
    if (e.entryType === 'toileting') return e.kind + (e.notes ? ' · ' + e.notes : '');
    if (e.entryType === 'mood') return (MOOD_LABEL[e.mood] || e.mood) + (e.notes ? ' · ' + e.notes : '');
    if (e.entryType === 'activity') return e.title + (e.description ? ' · ' + e.description : '');
    if (e.entryType === 'note') return e.text;
    if (e.entryType === 'photo') return e.caption || 'Photo added';
    return '';
  }
  function renderDiaryTab() {
    const entries = window.PlayStore.getByType('CareEntry').filter((e) => e.childId === record.id).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))).slice(0, 30);
    $('profileTabPanel').innerHTML = `
      <div class="profile-card profile-card--wide">
        <div class="profile-card__head"><span class="profile-card__title">Daily Diary</span><a class="btn btn--text btn--sm" href="care-log.html">Open Daily Care Log</a></div>
        ${entries.length ? `<div class="profile-list">${entries.map((e) => `<div class="profile-list-row"><div><div class="profile-list-row__title">${DIARY_TYPE_LABEL[e.entryType] || e.entryType}</div><div class="profile-list-row__meta">${formatDateMed(e.date)}${e.time ? ' · ' + formatTime12(e.time) : ''} · ${escapeHtml(diarySummary(e))}</div></div></div>`).join('')}</div>` : emptyStateHtml('No Daily Care Log entries yet.')}
      </div>`;
  }

  /* ---------- Learning & Portfolio ---------- */
  function renderLearningTab() {
    $('profileTabPanel').innerHTML = `<div class="profile-card profile-card--wide">${emptyStateHtml("No learning observations or portfolio entries recorded yet — this demo doesn't have a Curriculum module built out beyond its plan listing.")}</div>`;
  }

  /* ---------- Incidents ---------- */
  function renderIncidentsTab() {
    const incidents = window.PlayStore.getByType('Incident').filter((i) => i.childId === record.id).sort((a, b) => b.date.localeCompare(a.date));
    $('profileTabPanel').innerHTML = `
      <div class="profile-card profile-card--wide">
        <div class="profile-card__head"><span class="profile-card__title">Incidents</span><button class="btn btn--secondary btn--sm" type="button" id="incidentAddBtn">${ICON.plus}<span>&nbsp;Log incident</span></button></div>
        ${incidents.length ? `<div class="profile-list">${incidents.map((i) => `
          <div class="profile-list-row">
            <div><div class="profile-list-row__title">${escapeHtml(i.description)}</div><div class="profile-list-row__meta">${formatDateMed(i.date)}</div></div>
            <span class="badge ${i.severity === 'High' ? 'badge--error' : i.severity === 'Medium' ? 'badge--warning' : 'badge--neutral'}">${escapeHtml(i.severity)}</span>
          </div>`).join('')}</div>` : emptyStateHtml('No incidents recorded for this child.')}
      </div>`;
    $('incidentAddBtn').addEventListener('click', openIncidentModal);
  }
  function openIncidentModal() {
    const description = window.prompt("Describe what happened:");
    if (description === null) return;
    if (!description.trim()) { window.PlayShell.toast('error', 'Description required', 'Please describe what happened.'); return; }
    const severity = (window.prompt('Severity — type Low, Medium or High:', 'Low') || 'Low').trim();
    const normalizedSeverity = ['Low', 'Medium', 'High'].indexOf(severity) !== -1 ? severity : 'Low';
    window.PlayStore.addRecord({ id: 'INC-' + Date.now().toString(36).toUpperCase(), type: 'Incident', childId: record.id, description: description.trim(), severity: normalizedSeverity, status: 'Open', date: todayISO() });
    renderTabPanel();
    window.PlayShell.toast('success', 'Incident logged', 'The incident has been recorded.');
  }

  /* ---------- Documents ---------- */
  const DOCUMENT_MAX_STORE_BYTES = 800 * 1024;
  function renderDocumentsTab() {
    const docs = window.PlayStore.getByType('ChildDocument').filter((d) => d.childId === record.id);
    const photos = window.PlayStore.getByType('CareEntry').filter((e) => e.childId === record.id && e.entryType === 'photo');
    const items = docs.map((d) => ({ name: d.name, date: d.uploadedAt, dataUrl: d.dataUrl }))
      .concat(photos.map((p) => ({ name: p.caption || p.fileName || 'Daily Care Log photo', date: p.date, dataUrl: p.dataUrl })))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    $('profileTabPanel').innerHTML = `
      <div class="profile-card profile-card--wide">
        <div class="profile-card__head"><span class="profile-card__title">Documents</span><button class="btn btn--secondary btn--sm" type="button" id="documentAddBtn">${ICON.plus}<span>&nbsp;Add document</span></button></div>
        ${items.length ? `<div class="profile-list">${items.map((it) => `<div class="profile-list-row"><div style="display:flex; align-items:center; gap: var(--space-3);">${it.dataUrl ? `<img src="${it.dataUrl}" alt="" style="width:36px; height:36px; border-radius:var(--radius-sm); object-fit:cover;"/>` : `<span style="color:var(--color-text-muted);">${ICON.file}</span>`}<div><div class="profile-list-row__title">${escapeHtml(it.name)}</div><div class="profile-list-row__meta">${escapeHtml(String(it.date || ''))}</div></div></div></div>`).join('')}</div>` : emptyStateHtml('No documents on file.')}
      </div>`;
    $('documentAddBtn').addEventListener('click', openDocumentModal);
  }

  /* ---------- Consents ---------- */
  function relevantConsentEvents(child) {
    const cls = classRecordFor(child);
    return window.PlayStore.getByType('Event').filter((ev) => ev.requiresConsent && (!ev.classIds || !ev.classIds.length || (cls && ev.classIds.indexOf(cls.id) !== -1)));
  }
  function renderConsentsTab() {
    const events = relevantConsentEvents(record);
    $('profileTabPanel').innerHTML = `
      <div class="profile-card profile-card--wide">
        <span class="profile-card__title">Consents</span>
        ${events.length ? `<div class="profile-list" style="margin-top: var(--space-3);">${events.map((ev) => {
          const given = ev.consents && ev.consents[record.id];
          return `<div class="profile-list-row"><a href="calendar.html?event=${encodeURIComponent(ev.id)}&date=${ev.startDate}" style="color:inherit; text-decoration:none;"><div class="profile-list-row__title">${escapeHtml(ev.title)}</div><div class="profile-list-row__meta">${formatDateMed(ev.startDate)}</div></a><span class="badge ${given ? 'badge--success' : 'badge--warning'}">${given ? 'Given' : 'Pending'}</span></div>`;
        }).join('')}</div>` : emptyStateHtml('No consent-requiring events on file.')}
      </div>`;
  }

  /* ---------- Billing ---------- */
  function renderBillingTab() {
    const payments = window.PlayStore.getByType('Payment').filter((p) => p.childName === record.name).sort((a, b) => b.date.localeCompare(a.date));
    const pending = payments.filter((p) => p.status === 'Pending').reduce((s, p) => s + Number(p.amount || 0), 0);
    $('profileTabPanel').innerHTML = `
      <div class="profile-card profile-card--wide">
        <div class="profile-card__head"><span class="profile-card__title">Billing</span><a class="btn btn--text btn--sm" href="payroll.html">Open Billing</a></div>
        ${payments.length ? `
          <div class="profile-row"><span class="profile-row__label">Outstanding</span><span class="profile-row__value">$${pending.toFixed(2)}</span></div>
          <div class="profile-list" style="margin-top: var(--space-3);">${payments.map((p) => `<div class="profile-list-row"><div><div class="profile-list-row__title">$${Number(p.amount).toFixed(2)}</div><div class="profile-list-row__meta">${formatDateMed(p.date)}</div></div><span class="badge ${p.status === 'Paid' ? 'badge--success' : 'badge--warning'}">${escapeHtml(p.status)}</span></div>`).join('')}</div>
        ` : emptyStateHtml('No billing records for this child.')}
      </div>`;
  }

  /* ========================================================================
     MODALS — generic plumbing
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

  /* ---------- confirm modal ---------- */
  let pendingConfirmAction = null;
  function openConfirmModal(title, text, onConfirm) {
    $('confirmModalTitle').textContent = title;
    $('confirmModalText').textContent = text;
    pendingConfirmAction = onConfirm;
    openModal('confirmModalBackdrop');
  }
  function wireConfirmModal() {
    const backdrop = $('confirmModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal('confirmModalBackdrop'); });
    $('confirmModalCancel').addEventListener('click', () => closeModal('confirmModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('confirmModalBackdrop'); });
    $('confirmModalOk').addEventListener('click', () => {
      const action = pendingConfirmAction; pendingConfirmAction = null;
      closeModal('confirmModalBackdrop');
      if (action) action();
    });
  }

  /* ---------- Family / guardian edit modal ---------- */
  function openFamilyModal() {
    const guardian = guardianFor(record);
    $('familyName').value = guardian ? guardian.name : '';
    $('familyRelation').value = guardian ? cleanRelation(guardian.relation, record.name) : '';
    $('familyContact').value = guardian ? (guardian.contact || '') : '';
    setFieldError('familyName', null); setFieldError('familyContact', null);
    openModal('familyModalBackdrop');
  }
  function wireFamilyModal() {
    const backdrop = $('familyModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('familyModalBackdrop'); });
    $('familyCancel').addEventListener('click', () => closeModal('familyModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('familyModalBackdrop'); });
    $('familySave').addEventListener('click', () => {
      const name = $('familyName').value.trim();
      const contact = $('familyContact').value.trim();
      let ok = true;
      if (!name) { setFieldError('familyName', 'Name is required.'); ok = false; } else setFieldError('familyName', null);
      if (!contact) { setFieldError('familyContact', 'Email or phone is required.'); ok = false; } else setFieldError('familyContact', null);
      if (!ok) return;
      submitWithLoading('familySave', () => {
        const relation = $('familyRelation').value.trim() || 'Guardian';
        let guardian = guardianFor(record);
        if (guardian) {
          window.PlayStore.updateRecord(guardian.id, { name, relation: 'Parent of ' + record.name + (relation !== 'Parent' ? ' (' + relation + ')' : ''), contact });
        } else {
          guardian = window.PlayStore.addRecord({ id: 'G-' + Date.now().toString(36), type: 'Guardian', name, relation: 'Parent of ' + record.name, status: 'Active', contact });
          window.PlayStore.updateRecord(record.id, { guardianId: guardian.id });
        }
        closeModal('familyModalBackdrop');
        renderTabPanel();
        window.PlayShell.toast('success', 'Saved', "The family contact's details have been updated.");
      });
    });
  }

  /* ---------- Pickup person add/edit modal ---------- */
  let pickupEditingId = null;
  function openPickupModal(person) {
    pickupEditingId = person ? person.id : null;
    $('pickupModalTitle').textContent = person ? 'Edit pickup person' : 'Add pickup person';
    $('pickupName').value = person ? person.name : '';
    $('pickupRelation').value = person ? (person.relation || '') : '';
    $('pickupPasscode').value = person ? (person.passcode || '') : '';
    $('pickupRestricted').checked = person ? !!person.restricted : false;
    $('pickupRestrictionReason').value = person ? (person.restrictionReason || '') : '';
    $('pickupRestrictionReasonField').hidden = !$('pickupRestricted').checked;
    setFieldError('pickupName', null);
    openModal('pickupModalBackdrop');
  }
  function wirePickupModal() {
    const backdrop = $('pickupModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('pickupModalBackdrop'); });
    $('pickupCancel').addEventListener('click', () => closeModal('pickupModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('pickupModalBackdrop'); });
    $('pickupRestricted').addEventListener('change', () => { $('pickupRestrictionReasonField').hidden = !$('pickupRestricted').checked; });
    $('pickupSave').addEventListener('click', () => {
      const name = $('pickupName').value.trim();
      if (!name) { setFieldError('pickupName', 'Name is required.'); return; }
      setFieldError('pickupName', null);
      submitWithLoading('pickupSave', () => {
        const list = (record.authorizedPickups || []).slice();
        const fields = {
          name, relation: $('pickupRelation').value.trim(),
          passcode: $('pickupPasscode').value.trim() || null,
          restricted: $('pickupRestricted').checked,
          restrictionReason: $('pickupRestricted').checked ? $('pickupRestrictionReason').value.trim() : '',
        };
        if (pickupEditingId) {
          const idx = list.findIndex((p) => p.id === pickupEditingId);
          if (idx !== -1) list[idx] = Object.assign({}, list[idx], fields);
        } else {
          list.push(Object.assign({ id: 'PU-' + Date.now().toString(36).toUpperCase() }, fields));
        }
        record.authorizedPickups = list;
        window.PlayStore.updateRecord(record.id, { authorizedPickups: list });
        closeModal('pickupModalBackdrop');
        renderAlertBanner();
        renderTabPanel();
        window.PlayShell.toast('success', 'Saved', name + "'s pickup details have been updated.");
      });
    });
  }

  /* ---------- Alert (allergy/medical/dietary) add/edit modal ---------- */
  let alertEditingId = null;
  function openAlertModal(alert) {
    alertEditingId = alert ? alert.id : null;
    $('alertModalTitle').textContent = alert ? 'Edit alert' : 'Add alert';
    $('alertType').value = alert ? alert.type : 'allergy';
    $('alertAllergen').value = alert ? (alert.allergen || '') : '';
    $('alertDetail').value = alert ? alert.detail : '';
    toggleAllergenField();
    setFieldError('alertDetail', null);
    openModal('alertModalBackdrop');
  }
  function toggleAllergenField() { $('alertAllergenField').hidden = $('alertType').value !== 'allergy'; }
  function wireAlertModal() {
    const backdrop = $('alertModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('alertModalBackdrop'); });
    $('alertCancel').addEventListener('click', () => closeModal('alertModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('alertModalBackdrop'); });
    $('alertType').addEventListener('change', toggleAllergenField);
    $('alertSave').addEventListener('click', () => {
      const detail = $('alertDetail').value.trim();
      if (!detail) { setFieldError('alertDetail', 'Please describe the alert.'); return; }
      setFieldError('alertDetail', null);
      submitWithLoading('alertSave', () => {
        const list = (record.alerts || []).slice();
        const fields = { type: $('alertType').value, detail, allergen: $('alertType').value === 'allergy' ? $('alertAllergen').value.trim() : undefined };
        if (alertEditingId) {
          const idx = list.findIndex((a) => a.id === alertEditingId);
          if (idx !== -1) list[idx] = Object.assign({}, list[idx], fields);
        } else {
          list.push(Object.assign({ id: 'AL-' + Date.now().toString(36).toUpperCase() }, fields));
        }
        record.alerts = list;
        window.PlayStore.updateRecord(record.id, { alerts: list });
        closeModal('alertModalBackdrop');
        renderAlertBanner();
        renderTabPanel();
        window.PlayShell.toast('success', 'Saved', 'The alert has been updated.');
      });
    });
  }

  /* ---------- Document upload modal ---------- */
  let documentFileMeta = null; let documentDataUrl = null;
  function openDocumentModal() {
    documentFileMeta = null; documentDataUrl = null;
    $('documentFile').value = ''; $('documentName').value = '';
    setFieldError('documentFile', null);
    openModal('documentModalBackdrop');
  }
  function wireDocumentModal() {
    const backdrop = $('documentModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('documentModalBackdrop'); });
    $('documentCancel').addEventListener('click', () => closeModal('documentModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('documentModalBackdrop'); });
    $('documentFile').addEventListener('change', () => {
      const f = $('documentFile').files[0];
      documentDataUrl = null; documentFileMeta = null;
      if (!f) return;
      documentFileMeta = { name: f.name, size: f.size };
      if (/^image\//.test(f.type) && f.size <= DOCUMENT_MAX_STORE_BYTES) {
        const reader = new FileReader();
        reader.onload = () => { documentDataUrl = reader.result; };
        reader.readAsDataURL(f);
      }
    });
    $('documentSave').addEventListener('click', () => {
      if (!documentFileMeta) { setFieldError('documentFile', 'Choose a file to add.'); return; }
      setFieldError('documentFile', null);
      submitWithLoading('documentSave', () => {
        const name = $('documentName').value.trim() || documentFileMeta.name;
        window.PlayStore.addRecord({ id: 'DOC-' + Date.now().toString(36).toUpperCase(), type: 'ChildDocument', childId: record.id, name, fileName: documentFileMeta.name, dataUrl: documentDataUrl, uploadedAt: todayISO(), uploadedBy: role });
        closeModal('documentModalBackdrop');
        renderTabPanel();
        window.PlayShell.toast('success', 'Document added', name + ' has been added to this child’s documents.');
      });
    });
  }

  /* ========================================================================
     PRINT SUMMARY (A4) — only what the current role may print
     ======================================================================== */
  function buildPrintSummary() {
    const child = record;
    const guardian = guardianFor(child);
    const cls = classRecordFor(child);
    const alerts = child.alerts || [];
    const pickups = child.authorizedPickups || [];
    let html = `
      <div class="print-summary__head">
        <div class="print-summary__photo">${escapeHtml(initials(child.name))}</div>
        <div>
          <h1>${escapeHtml(child.name)}${child.preferredName ? ' "' + escapeHtml(child.preferredName) + '"' : ''}</h1>
          <p>Date of birth: ${formatDateMed(child.dob)} (${ageInfo(child.dob).label}) &nbsp;·&nbsp; Class: ${escapeHtml(child.room || '—')}</p>
        </div>
      </div>`;
    if (guardian) html += `<h2>Family contact</h2><p>${escapeHtml(guardian.name)} — ${escapeHtml(cleanRelation(guardian.relation, child.name))}<br>${escapeHtml(guardian.contact || '')}</p>`;
    const medicalAlerts = alerts.filter((a) => a.type === 'allergy' || a.type === 'medical');
    const custodyAlerts = alerts.filter((a) => a.type === 'custody');
    const dietaryAlerts = alerts.filter((a) => a.type === 'dietary');
    if (medicalAlerts.length) { html += '<h2>Medical &amp; allergy</h2>'; medicalAlerts.forEach((a) => { html += `<div class="print-alert">${escapeHtml(a.detail)}</div>`; }); }
    if (dietaryAlerts.length) { html += '<h2>Dietary</h2>'; dietaryAlerts.forEach((a) => { html += `<p>${escapeHtml(a.detail)}</p>`; }); }
    if (custodyAlerts.length) { html += '<h2>Custody / release restrictions</h2>'; custodyAlerts.forEach((a) => { html += `<div class="print-alert">${escapeHtml(a.detail)}</div>`; }); }
    if (pickups.length) {
      html += '<h2>Authorised pickup people</h2>';
      pickups.forEach((p) => { html += `<div class="print-row"><span>${escapeHtml(p.name)} (${escapeHtml(p.relation || '')})</span><span>${p.restricted ? 'DO NOT RELEASE' : 'Authorised'}</span></div>`; });
    }
    $('printSummary').innerHTML = html;
  }
})();
