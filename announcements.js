/* ==========================================================================
   PLAY SCHOOL — Announcements & Emergency Broadcast (S30)
   Reuses: store.js (Announcement — the SAME record type dashboard.js's quick
   composer already creates; audienceType/classIds/channels/requireAck/
   status/reads/acks are added fields, not a parallel model — a legacy
   dashboard-created announcement just shows an honest "no recipient data"
   state), modules.js (Premium-gated via the 'communication' module, same
   tier as Messages/Planner), shell.js (notifications/toasts), the existing
   `ps_emergency_broadcast` localStorage banner dashboard.js already reads.

   INTEGRATION NOTES:
   - Recipients are computed live as Family records (S15) matching the
     announcement's audience — never a stored, driftable recipient list.
   - reads/acks are keyed by Family id, the same map-on-the-record pattern
     Event already uses for rsvps/consents — no separate recipient table.
   - "Remind unread" has no real family-facing delivery channel in this
     project (families have no login/notification centre here — only staff
     roles receive addNotification), so it honestly logs a local
     lastReminder{At,Count} on the record and tells the admin that, rather
     than claiming a message was actually delivered.
   - Emergency broadcast both persists a real Announcement record (this
     page's own data) AND writes the existing `ps_emergency_broadcast`
     banner flag dashboard.js already displays — genuine reuse of the
     feature that was already there, not a parallel one.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function initials(name) { const p = String(name || '').trim().split(/\s+/); return p[0] ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '?'; }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function formatDateTime(iso) { if (!iso) return '—'; return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function currentStaff() { return { id: 'S-3001', name: 'Nithya' }; }

  const ICON = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    siren: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21h14"/><path d="M12 2v2"/><path d="M4.2 9 6 9.8"/><path d="M19.8 9 18 9.8"/><line x1="7" y1="18" x2="17" y2="18"/></svg>',
    megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 13v-2Z"/><path d="M11.6 16.8A3 3 0 1 1 7 13"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    smartphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    checkDouble: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 7 9 18 4 13"/><polyline points="22 7 13 18 11 15.8"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>',
  };
  const CHANNELS = [
    { key: 'in-app', label: 'In-app', icon: ICON.bell },
    { key: 'email', label: 'Email', icon: ICON.mail },
    { key: 'push', label: 'Push', icon: ICON.smartphone },
  ];
  function channelMeta(key) { return CHANNELS.find((c) => c.key === key) || { key, label: key, icon: ICON.bell }; }

  let role = null;
  let activeTab = 'sent';
  let drawerId = null;
  let drawerFilter = 'all';
  let drawerSearch = '';
  let editingId = null;
  let composerStep = 1;
  let composerState = null;
  let pendingAction = null;
  let emergencyState = null;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', (e) => { role = e.detail.role; render(); });

  function init() {
    window.PlayShell.login();
    role = window.PlayShell.getDemoRole();
    window.PlayShell.mount('announcements', 'Announcements');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    if (!isModuleUnlocked()) { renderLocked(); return; }
    $('annMain').hidden = false;

    wireHeader();
    wireTabs();
    wireComposerModal();
    wireEmergencyModal();
    wireDrawer();
    wireConfirmModal();

    window.setTimeout(() => { $('annSkeleton').hidden = true; $('annBody').hidden = false; render(); }, 380);
  }
  function isModuleUnlocked() {
    if (!window.PlayModules) return true;
    const mod = window.PlayModules.getById('communication');
    if (!mod) return true;
    return window.PlayModules.isUnlocked(mod, window.PlayModules.getCurrentPlan());
  }
  function renderLocked() {
    $('annLocked').hidden = false;
    $('annMain').hidden = true;
    $('annLockedIcon').innerHTML = ICON.lock;
    const isAdminish = role === 'Director' || role === 'Admin';
    $('annLockedAction').innerHTML = isAdminish
      ? `<a class="btn btn--accent" href="plans.html?module=communication&role=${encodeURIComponent(role)}">See plans &amp; upgrade</a>`
      : `<a class="btn btn--secondary" href="module.html?id=communication&role=${encodeURIComponent(role)}">Ask my admin to upgrade</a>`;
  }

  /* ---------- data helpers ---------- */
  function allAnnouncements() { return window.PlayStore.getByType('Announcement'); }
  function byStatus(status) { return allAnnouncements().filter((a) => (a.status || 'Sent') === status).sort((a, b) => (b.sentAt || b.scheduledFor || b.createdAt || '').localeCompare(a.sentAt || a.scheduledFor || a.createdAt || '')); }
  function allActiveClasses() { return window.PlayStore.getByType('Class').filter((c) => c.status !== 'Archived'); }
  function hasAudienceData(ann) { return ann.audienceType === 'all' || (ann.audienceType === 'classes' && Array.isArray(ann.classIds)); }
  function recipientsFor(ann) {
    if (!hasAudienceData(ann)) return null;
    const families = window.PlayStore.getByType('Family');
    if (ann.audienceType === 'all') return families;
    const classNames = new Set((ann.classIds || []).map((id) => { const c = window.PlayStore.getById(id); return c ? c.name : null; }).filter(Boolean));
    const childIds = new Set(window.PlayStore.getByType('Child').filter((c) => c.status === 'Active' && classNames.has(c.room)).map((c) => c.id));
    return families.filter((f) => (f.childIds || []).some((id) => childIds.has(id)));
  }
  function readCount(ann) { return Object.keys(ann.reads || {}).length; }
  function ackCount(ann) { return Object.keys(ann.acks || {}).length; }
  function readPct(ann) {
    const recipients = recipientsFor(ann);
    if (!recipients || !recipients.length) return 0;
    return Math.round((readCount(ann) / recipients.length) * 100);
  }
  function audienceSummary(ann) {
    const recipients = recipientsFor(ann);
    const countLabel = recipients ? `${recipients.length} ${recipients.length === 1 ? 'family' : 'families'}` : (ann.audience || 'Unknown audience');
    if (ann.audienceType === 'all') return `All families · ${countLabel}`;
    if (ann.audienceType === 'classes') {
      const names = (ann.classIds || []).map((id) => { const c = window.PlayStore.getById(id); return c ? c.name : null; }).filter(Boolean);
      return `${names.join(' + ') || 'Classes'} · ${countLabel}`;
    }
    return ann.audience || 'Unknown audience';
  }

  /* ---------- summary metrics ---------- */
  function renderSummary() {
    const sent = byStatus('Sent');
    const scheduled = byStatus('Scheduled');
    let totalRecipients = 0; let totalReads = 0; let pendingAck = 0;
    sent.forEach((a) => {
      const recipients = recipientsFor(a);
      if (recipients) { totalRecipients += recipients.length; totalReads += readCount(a); }
      if (a.requireAck && recipients) pendingAck += Math.max(recipients.length - ackCount(a), 0);
    });
    const overallRate = totalRecipients ? Math.round((totalReads / totalRecipients) * 100) : 0;
    $('annSummary').innerHTML = [
      { icon: ICON.megaphone, value: sent.length, label: 'Announcements sent' },
      { icon: ICON.clock, value: scheduled.length, label: 'Scheduled' },
      { icon: ICON.checkDouble, value: overallRate + '%', label: 'Overall read rate' },
      { icon: ICON.alert, value: pendingAck, label: 'Pending acknowledgements' },
    ].map((s) => `<div class="ann-summary-card"><span class="ann-summary-card__icon">${s.icon}</span><div><div class="ann-summary-card__value">${s.value}</div><div class="ann-summary-card__label">${escapeHtml(s.label)}</div></div></div>`).join('');
  }

  /* ---------- render orchestration ---------- */
  function render() {
    renderSummary();
    renderTabPanel();
  }
  const TABS = [['sent', 'Sent'], ['scheduled', 'Scheduled'], ['drafts', 'Drafts']];
  function wireTabs() {
    $('annTabs').innerHTML = TABS.map(([k, l]) => `<button class="ann-tab" type="button" data-tab="${k}" role="tab" aria-selected="${k === activeTab}">${l}</button>`).join('');
    $('annTabs').addEventListener('click', (e) => { const btn = e.target.closest('[data-tab]'); if (!btn) return; activeTab = btn.dataset.tab; render(); });
  }
  function statusForTab() { return activeTab === 'sent' ? 'Sent' : activeTab === 'scheduled' ? 'Scheduled' : 'Draft'; }

  function channelIconsHtml(ann) { return (ann.channels || []).map((k) => `<span class="ann-channel-icon" title="${escapeHtml(channelMeta(k).label)}" aria-label="${escapeHtml(channelMeta(k).label)}">${channelMeta(k).icon}</span>`).join(''); }
  function statusChipHtml(ann) {
    if (ann.status === 'Scheduled') return `<span class="badge badge--primary badge--icon">${ICON.clock} Scheduled</span>`;
    if (ann.status === 'Draft') return `<span class="badge badge--neutral">Draft</span>`;
    return ann.isEmergency ? `<span class="badge badge--error badge--icon">${ICON.siren} Emergency</span>` : `<span class="badge badge--success">Sent</span>`;
  }
  function rowHtml(ann, idx) {
    const recipients = recipientsFor(ann);
    const pct = readPct(ann);
    const timeLabel = ann.status === 'Scheduled' ? 'Scheduled for ' + formatDateTime(ann.scheduledFor) : ann.status === 'Draft' ? 'Last edited ' + formatDateTime(ann.createdAt) : 'Sent ' + formatDateTime(ann.sentAt);
    return `
      <tr class="ann-row" data-open="${ann.id}" style="animation-delay:${Math.min(idx, 8) * 40}ms;">
        <td class="cell-primary">${escapeHtml(ann.title)}</td>
        <td class="cell-muted">${escapeHtml(audienceSummary(ann))}</td>
        <td>${channelIconsHtml(ann)}</td>
        <td class="cell-muted">${escapeHtml(timeLabel)}</td>
        <td>${ann.status === 'Sent' ? readBarHtml(pct, recipients) : '—'}</td>
        <td class="cell-muted">${ann.requireAck && ann.status === 'Sent' ? ackCount(ann) + ' / ' + (recipients ? recipients.length : '—') : '—'}</td>
        <td>${statusChipHtml(ann)}</td>
      </tr>`;
  }
  function readBarHtml(pct, recipients) {
    if (!recipients) return `<span class="ws-section-empty" style="padding:0;">No data</span>`;
    return `<div class="ann-read-bar"><div class="progress-linear"><div class="progress-linear__bar" data-anim-width="${pct}" style="width:0%;"></div></div><span>${pct}%</span></div>`;
  }
  function cardHtml(ann, idx) {
    const recipients = recipientsFor(ann);
    const pct = readPct(ann);
    const timeLabel = ann.status === 'Scheduled' ? formatDateTime(ann.scheduledFor) : ann.status === 'Draft' ? formatDateTime(ann.createdAt) : formatDateTime(ann.sentAt);
    return `
      <div class="table-card__item ann-card" data-open="${ann.id}" style="animation-delay:${Math.min(idx, 8) * 40}ms;">
        <div class="table-card__head"><span class="cell-primary">${escapeHtml(ann.title)}</span>${statusChipHtml(ann)}</div>
        <div class="table-card__row"><span class="table-card__label">Audience</span><span class="table-card__value">${escapeHtml(audienceSummary(ann))}</span></div>
        <div class="table-card__row"><span class="table-card__label">Channels</span><span class="table-card__value">${channelIconsHtml(ann)}</span></div>
        <div class="table-card__row"><span class="table-card__label">${ann.status === 'Sent' ? 'Sent' : ann.status === 'Scheduled' ? 'Scheduled' : 'Updated'}</span><span class="table-card__value">${escapeHtml(timeLabel)}</span></div>
        ${ann.status === 'Sent' ? `<div class="table-card__row"><span class="table-card__label">Read</span><span class="table-card__value">${readBarHtml(pct, recipients)}</span></div>` : ''}
        ${ann.requireAck && ann.status === 'Sent' ? `<div class="table-card__row"><span class="table-card__label">Acknowledged</span><span class="table-card__value">${ackCount(ann)} / ${recipients ? recipients.length : '—'}</span></div>` : ''}
      </div>`;
  }
  function emptyStateFor(tab) {
    if (tab === 'sent') return [ICON.inbox, 'No announcements sent yet', 'Once you send an announcement, it will appear here.'];
    if (tab === 'scheduled') return [ICON.clock, 'Nothing scheduled', 'Schedule an announcement to send it automatically later.'];
    return [ICON.pencil, 'No drafts', 'Start a new announcement and save it as a draft to continue later.'];
  }
  function renderTabPanel() {
    $('annTabs').querySelectorAll('[data-tab]').forEach((btn) => btn.setAttribute('aria-selected', String(btn.dataset.tab === activeTab)));
    const list = byStatus(statusForTab());
    const panel = $('annTabPanel');
    panel.classList.remove('ann-tab-panel--in');
    if (!list.length) {
      const [icon, title, text] = emptyStateFor(activeTab);
      panel.innerHTML = `<div class="state-panel"><div class="state-panel__icon">${icon}</div><div class="state-panel__title">${title}</div><p class="state-panel__text">${text}</p><div class="state-panel__action"><button class="btn btn--accent" type="button" id="annEmptyNewBtn">${ICON.plus}<span>&nbsp;New announcement</span></button></div></div>`;
      $('annEmptyNewBtn').addEventListener('click', () => openComposer(null));
    } else {
      panel.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Title</th><th>Audience</th><th>Channels</th><th>Time</th><th>Read</th><th>Ack'd</th><th>Status</th></tr></thead>
            <tbody>${list.map(rowHtml).join('')}</tbody>
          </table>
          <div class="table-card">${list.map(cardHtml).join('')}</div>
        </div>`;
      panel.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', () => openDrawer(el.dataset.open)));
      const bars = panel.querySelectorAll('[data-anim-width]');
      requestAnimationFrame(() => requestAnimationFrame(() => bars.forEach((b) => { b.style.width = b.dataset.animWidth + '%'; })));
    }
    requestAnimationFrame(() => panel.classList.add('ann-tab-panel--in'));
  }

  function wireHeader() {
    $('annNewBtn').addEventListener('click', () => openComposer(null));
    $('annEmergencyBtn').addEventListener('click', openEmergencyModal);
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
    window.setTimeout(() => { work(); if (btn) { btn.classList.remove('is-loading'); btn.disabled = false; } }, 300);
  }

  /* ========================================================================
     COMPOSER (4-step: Audience, Message, Options, Preview)
     ======================================================================== */
  function openComposer(ann) {
    editingId = ann ? ann.id : null;
    composerStep = 1;
    $('composerTitle').textContent = ann ? 'Edit announcement' : 'New announcement';
    composerState = ann ? {
      audienceType: ann.audienceType || 'all', classIds: new Set(ann.classIds || []),
      title: ann.title, body: ann.message, channels: new Set(ann.channels || ['in-app']),
      requireAck: !!ann.requireAck, delivery: ann.status === 'Scheduled' ? 'schedule' : 'now',
      schedDate: ann.scheduledFor ? ann.scheduledFor.slice(0, 10) : todayISO(), schedTime: ann.scheduledFor ? ann.scheduledFor.slice(11, 16) : '',
    } : { audienceType: 'all', classIds: new Set(), title: '', body: '', channels: new Set(['in-app']), requireAck: false, delivery: 'now', schedDate: todayISO(), schedTime: '' };
    renderComposerStep();
    openModal('composerModalBackdrop');
  }
  function composerRecipientCount() {
    const classes = allActiveClasses();
    if (composerState.audienceType === 'all') return window.PlayStore.getByType('Family').length;
    const classNames = new Set([...composerState.classIds].map((id) => { const c = classes.find((x) => x.id === id); return c ? c.name : null; }).filter(Boolean));
    const childIds = new Set(window.PlayStore.getByType('Child').filter((c) => c.status === 'Active' && classNames.has(c.room)).map((c) => c.id));
    return window.PlayStore.getByType('Family').filter((f) => (f.childIds || []).some((id) => childIds.has(id))).length;
  }
  function renderComposerStep() {
    $('composerStepIndicator').innerHTML = ['Audience', 'Message', 'Options', 'Preview'].map((s, i) => `<span class="ann-step-dot${i + 1 === composerStep ? ' is-active' : i + 1 < composerStep ? ' is-done' : ''}">${i + 1}. ${s}</span>`).join('');
    const body = $('composerBody');
    if (composerStep === 1) {
      const classes = allActiveClasses();
      body.innerHTML = `
        <div class="field">
          <label class="field__label">Audience</label>
          <div class="ann-audience-options">
            <button type="button" class="ann-audience-opt${composerState.audienceType === 'all' ? ' is-active' : ''}" data-audience="all">${ICON.users} All families</button>
            <button type="button" class="ann-audience-opt${composerState.audienceType === 'classes' ? ' is-active' : ''}" data-audience="classes">${ICON.users} Specific classes</button>
          </div>
        </div>
        ${composerState.audienceType === 'classes' ? `
        <div class="field">
          <label class="field__label">Classes</label>
          <div class="pl-area-chip-row">${classes.map((c) => `<button type="button" class="pl-area-chip${composerState.classIds.has(c.id) ? ' is-active' : ''}" data-class-chip="${c.id}" style="--area-color: var(--color-brand-blue);">${escapeHtml(c.name)}</button>`).join('')}</div>
        </div>` : ''}
        <p class="ann-recipient-count">${composerRecipientCount()} ${composerRecipientCount() === 1 ? 'family' : 'families'} will receive this announcement.</p>`;
      body.querySelectorAll('[data-audience]').forEach((btn) => btn.addEventListener('click', () => { composerState.audienceType = btn.dataset.audience; renderComposerStep(); }));
      body.querySelectorAll('[data-class-chip]').forEach((btn) => btn.addEventListener('click', () => {
        const id = btn.dataset.classChip;
        if (composerState.classIds.has(id)) composerState.classIds.delete(id); else composerState.classIds.add(id);
        renderComposerStep();
      }));
    } else if (composerStep === 2) {
      body.innerHTML = `
        <div class="field"><label class="field__label" for="cmpTitle">Announcement title</label><input class="input" id="cmpTitle" type="text" value="${escapeHtml(composerState.title)}" /><p class="field__error" id="err-cmpTitle" hidden></p></div>
        <div class="field"><label class="field__label" for="cmpBody">Message</label><textarea class="textarea" id="cmpBody" rows="6">${escapeHtml(composerState.body)}</textarea><p class="field__hint" id="cmpCharCount" style="font-size:var(--fs-caption); color:var(--color-text-muted); margin-top:4px;"></p><p class="field__error" id="err-cmpBody" hidden></p></div>`;
      $('cmpTitle').addEventListener('input', () => { composerState.title = $('cmpTitle').value; });
      const updateCount = () => { composerState.body = $('cmpBody').value; $('cmpCharCount').textContent = composerState.body.length + ' characters'; };
      $('cmpBody').addEventListener('input', updateCount); updateCount();
    } else if (composerStep === 3) {
      body.innerHTML = `
        <div class="field">
          <label class="field__label">Delivery channels</label>
          <div class="ann-audience-options">${CHANNELS.map((c) => `<button type="button" class="ann-audience-opt${composerState.channels.has(c.key) ? ' is-active' : ''}" data-channel="${c.key}">${c.icon}${c.label}</button>`).join('')}</div>
        </div>
        <label class="cls-toggle-row" style="margin-top: var(--space-4);">
          <span class="toggle"><input type="checkbox" id="cmpRequireAck" ${composerState.requireAck ? 'checked' : ''} /><span class="toggle__track"><span class="toggle__thumb"></span></span></span>
          <span><span class="cls-toggle-row__label">Require acknowledgement</span><span class="cls-toggle-row__hint">Families must confirm they've seen this message.</span></span>
        </label>
        <div class="field" style="margin-top: var(--space-4);">
          <label class="field__label">When</label>
          <div class="ann-audience-options">
            <button type="button" class="ann-audience-opt${composerState.delivery === 'now' ? ' is-active' : ''}" data-delivery="now">${ICON.send} Send now</button>
            <button type="button" class="ann-audience-opt${composerState.delivery === 'schedule' ? ' is-active' : ''}" data-delivery="schedule">${ICON.clock} Schedule</button>
          </div>
        </div>
        ${composerState.delivery === 'schedule' ? `
        <div class="cls-form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4); margin-top:var(--space-3);">
          <div class="field"><label class="field__label" for="cmpSchedDate">Date</label><input class="input" id="cmpSchedDate" type="date" value="${composerState.schedDate}" /></div>
          <div class="field"><label class="field__label" for="cmpSchedTime">Time</label><input class="input" id="cmpSchedTime" type="time" value="${composerState.schedTime}" /></div>
        </div>
        <p class="field__error" id="err-cmpSchedTime" hidden></p>` : ''}`;
      body.querySelectorAll('[data-channel]').forEach((btn) => btn.addEventListener('click', () => {
        const k = btn.dataset.channel;
        if (composerState.channels.has(k)) composerState.channels.delete(k); else composerState.channels.add(k);
        renderComposerStep();
      }));
      body.querySelectorAll('[data-delivery]').forEach((btn) => btn.addEventListener('click', () => { composerState.delivery = btn.dataset.delivery; renderComposerStep(); }));
      const ackToggle = $('cmpRequireAck'); if (ackToggle) ackToggle.addEventListener('change', () => { composerState.requireAck = ackToggle.checked; });
      const sd = $('cmpSchedDate'); if (sd) sd.addEventListener('input', () => { composerState.schedDate = sd.value; });
      const st = $('cmpSchedTime'); if (st) st.addEventListener('input', () => { composerState.schedTime = st.value; });
    } else {
      const classes = allActiveClasses();
      const audienceLabel = composerState.audienceType === 'all' ? 'All families' : [...composerState.classIds].map((id) => (classes.find((c) => c.id === id) || {}).name).filter(Boolean).join(' + ') || 'No classes selected';
      body.innerHTML = `
        <div class="ann-preview-card">
          <div class="ann-preview-card__title">${escapeHtml(composerState.title || 'Untitled announcement')}</div>
          <p class="ann-preview-card__body">${escapeHtml(composerState.body || 'No message yet.')}</p>
          <div class="ann-preview-card__meta">
            <div><span>Audience</span><b>${escapeHtml(audienceLabel)} · ${composerRecipientCount()} families</b></div>
            <div><span>Channels</span><b>${[...composerState.channels].map((k) => channelMeta(k).label).join(', ') || 'None selected'}</b></div>
            <div><span>Delivery</span><b>${composerState.delivery === 'now' ? 'Immediately' : 'Scheduled for ' + (composerState.schedDate && composerState.schedTime ? formatDateTime(new Date(composerState.schedDate + 'T' + composerState.schedTime).toISOString()) : 'a future time')}</b></div>
            <div><span>Acknowledgement</span><b>${composerState.requireAck ? 'Required' : 'Not required'}</b></div>
          </div>
        </div>`;
    }
    $('composerBack').hidden = composerStep === 1;
    $('composerSaveDraft').hidden = false;
    $('composerNext').textContent = composerStep === 4 ? (composerState.delivery === 'schedule' ? 'Schedule announcement' : 'Send announcement') : 'Continue';
  }
  function validateComposerStep() {
    if (composerStep === 2) {
      let ok = true;
      if (!composerState.title.trim()) { setFieldError('cmpTitle', 'Title is required.'); ok = false; } else setFieldError('cmpTitle', null);
      if (!composerState.body.trim()) { setFieldError('cmpBody', 'Message is required.'); ok = false; } else setFieldError('cmpBody', null);
      return ok;
    }
    if (composerStep === 3 && composerState.delivery === 'schedule') {
      if (!composerState.schedDate || !composerState.schedTime) { setFieldError('cmpSchedTime', 'Choose a date and time.'); return false; }
      const when = new Date(composerState.schedDate + 'T' + composerState.schedTime);
      if (when.getTime() <= Date.now()) { setFieldError('cmpSchedTime', 'Choose a time in the future.'); return false; }
      setFieldError('cmpSchedTime', null);
    }
    return true;
  }
  function buildAnnouncementPayload(status) {
    const classes = allActiveClasses();
    const audience = composerState.audienceType === 'all' ? 'All families' : [...composerState.classIds].map((id) => (classes.find((c) => c.id === id) || {}).name).filter(Boolean).join(' + ') || 'Classes';
    const payload = {
      title: composerState.title.trim(), message: composerState.body.trim(),
      audienceType: composerState.audienceType, classIds: [...composerState.classIds], audience,
      channels: [...composerState.channels], requireAck: composerState.requireAck, status,
    };
    if (status === 'Scheduled') { payload.scheduledFor = new Date(composerState.schedDate + 'T' + composerState.schedTime).toISOString(); payload.date = null; payload.sentAt = null; }
    else if (status === 'Sent') { const now = new Date().toISOString(); payload.sentAt = now; payload.date = now.slice(0, 10); payload.scheduledFor = null; }
    else { payload.scheduledFor = null; payload.sentAt = null; payload.date = null; }
    return payload;
  }
  function saveComposer(status) {
    const payload = buildAnnouncementPayload(status);
    if (editingId) {
      const existing = window.PlayStore.getById(editingId);
      window.PlayStore.updateRecord(editingId, Object.assign({}, payload, { reads: existing.reads || {}, acks: existing.acks || {} }));
    } else {
      window.PlayStore.addRecord(Object.assign({ id: uid('ANN'), type: 'Announcement', createdAt: new Date().toISOString(), reads: {}, acks: {} }, payload));
    }
    closeModal('composerModalBackdrop');
    activeTab = status === 'Sent' ? 'sent' : status === 'Scheduled' ? 'scheduled' : 'drafts';
    render();
    window.PlayShell.toast('success', status === 'Sent' ? 'Announcement sent' : status === 'Scheduled' ? 'Announcement scheduled' : 'Draft saved', payload.title);
    if (status === 'Sent') window.PlayShell.addNotification({ title: 'New announcement', text: payload.title, module: 'communication', recordRoute: 'announcements.html' });
  }
  function wireComposerModal() {
    const backdrop = $('composerModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('composerModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('composerModalBackdrop'); });
    $('composerBack').addEventListener('click', () => { composerStep = Math.max(1, composerStep - 1); renderComposerStep(); });
    $('composerSaveDraft').addEventListener('click', () => saveComposer('Draft'));
    $('composerNext').addEventListener('click', () => {
      if (!validateComposerStep()) return;
      if (composerStep < 4) { composerStep += 1; renderComposerStep(); return; }
      saveComposer(composerState.delivery === 'schedule' ? 'Scheduled' : 'Sent');
    });
  }

  /* ========================================================================
     DETAIL DRAWER
     ======================================================================== */
  function openDrawer(id) { drawerId = id; drawerFilter = 'all'; drawerSearch = ''; renderDrawer(); openModal('drawerModalBackdrop'); }
  function recipientStatus(ann, family) {
    if (ann.requireAck && ann.acks && ann.acks[family.id]) return 'acked';
    if (ann.reads && ann.reads[family.id]) return 'read';
    return 'unread';
  }
  function renderDrawer() {
    const ann = window.PlayStore.getById(drawerId);
    if (!ann) return;
    const recipients = recipientsFor(ann);
    const pct = readPct(ann);
    $('drawerTitle').textContent = ann.title;
    const canEdit = ann.status !== 'Sent';
    $('drawerEditBtn').hidden = !canEdit;
    $('drawerSendNowBtn').hidden = ann.status !== 'Scheduled';
    $('drawerCancelBtn').hidden = ann.status !== 'Scheduled';
    $('drawerDeleteBtn').hidden = ann.status !== 'Draft';
    $('drawerRemindBtn').hidden = !(ann.status === 'Sent' && recipients && recipients.length);

    const unreadCount = recipients ? recipients.filter((f) => recipientStatus(ann, f) === 'unread').length : 0;
    $('drawerRemindBtn').textContent = `Remind unread (${unreadCount})`;
    $('drawerRemindBtn').disabled = unreadCount === 0;

    $('drawerBody').innerHTML = `
      <div class="ann-drawer-head">${statusChipHtml(ann)}</div>
      <p class="ann-drawer-message">${escapeHtml(ann.message)}</p>
      <div class="ann-drawer-meta">
        <div><span>Audience</span><b>${escapeHtml(audienceSummary(ann))}</b></div>
        <div><span>Channels</span><b>${channelIconsHtml(ann)}</b></div>
        <div><span>${ann.status === 'Scheduled' ? 'Scheduled for' : ann.status === 'Draft' ? 'Last edited' : 'Sent'}</span><b>${formatDateTime(ann.scheduledFor || ann.sentAt || ann.createdAt)}</b></div>
        <div><span>Acknowledgement</span><b>${ann.requireAck ? 'Required' : 'Not required'}</b></div>
      </div>
      ${ann.status === 'Sent' && recipients ? `
      <div class="ann-drawer-progress">
        <div class="ann-drawer-progress__row"><span>Read</span><span>${readCount(ann)} / ${recipients.length} (${pct}%)</span></div>
        <div class="progress-linear"><div class="progress-linear__bar" id="drawerReadBar" style="width:0%;"></div></div>
        ${ann.requireAck ? `<div class="ann-drawer-progress__row" style="margin-top:var(--space-3);"><span>Acknowledged</span><span>${ackCount(ann)} / ${recipients.length}</span></div>` : ''}
      </div>
      ${ann.lastReminderAt ? `<p class="ws-section-empty">Reminder logged for ${ann.lastReminderCount} ${ann.lastReminderCount === 1 ? 'family' : 'families'} on ${formatDateTime(ann.lastReminderAt)} (demo — no real family messaging channel is wired to bulk reminders in this project).</p>` : ''}
      <div class="ann-recipient-toolbar">
        <div class="input-wrap"><span class="input-wrap__icon">${ICON.search}</span><input class="input" id="drawerSearch" type="text" placeholder="Search families…" value="${escapeHtml(drawerSearch)}" /></div>
        <div class="rs-filter-row" style="margin:0;">
          ${['all', 'read', 'unread'].concat(ann.requireAck ? ['acked'] : []).map((f) => `<button class="rs-cond-filter${drawerFilter === f ? ' is-active' : ''}" type="button" data-drawer-filter="${f}">${f === 'acked' ? 'Acknowledged' : f.charAt(0).toUpperCase() + f.slice(1)}</button>`).join('')}
        </div>
      </div>
      <div class="ann-recipient-list">${recipientListHtml(ann, recipients)}</div>` : !recipients ? `<p class="ws-section-empty">No recipient data is available for this announcement (it was created before audience tracking existed).</p>` : `<p class="ws-section-empty">This announcement hasn't been sent yet — recipient status will appear once it is.</p>`}
    `;
    if (ann.status === 'Sent' && recipients) requestAnimationFrame(() => requestAnimationFrame(() => { const bar = $('drawerReadBar'); if (bar) bar.style.width = pct + '%'; }));
    wireDrawerBodyEvents(ann, recipients);
  }
  function recipientListHtml(ann, recipients) {
    const q = drawerSearch.trim().toLowerCase();
    const filtered = recipients.filter((f) => {
      const status = recipientStatus(ann, f);
      if (drawerFilter !== 'all' && status !== drawerFilter) return false;
      if (q && f.name.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    if (!filtered.length) return `<p class="ws-section-empty">No families match.</p>`;
    return filtered.map((f) => {
      const status = recipientStatus(ann, f);
      return `
        <div class="ann-recipient-row">
          <span class="avatar avatar--sm">${escapeHtml(initials(f.name))}</span>
          <span class="ann-recipient-row__name">${escapeHtml(f.name)}</span>
          <span class="ann-recipient-chip ann-recipient-chip--${status}">${status === 'acked' ? ICON.checkDouble : status === 'read' ? ICON.check : ''}${status.charAt(0).toUpperCase() + status.slice(1)}</span>
          ${status !== 'acked' ? `<button class="ws-icon-btn" type="button" data-sim-read="${f.id}" title="${status === 'unread' ? 'Mark as read (demo)' : ann.requireAck ? 'Mark as acknowledged (demo)' : ''}">${status === 'unread' ? ICON.check : (ann.requireAck ? ICON.checkDouble : '')}</button>` : ''}
        </div>`;
    }).join('');
  }
  function wireDrawerBodyEvents(ann, recipients) {
    const search = $('drawerSearch'); if (search) search.addEventListener('input', () => { drawerSearch = search.value; $('.ann-recipient-list'); renderRecipientListOnly(ann, recipients); });
    $('drawerBody').querySelectorAll('[data-drawer-filter]').forEach((btn) => btn.addEventListener('click', () => { drawerFilter = btn.dataset.drawerFilter; renderRecipientListOnly(ann, recipients); }));
    $('drawerBody').querySelectorAll('[data-sim-read]').forEach((btn) => btn.addEventListener('click', () => simulateRecipientProgress(ann, btn.dataset.simRead)));
  }
  function renderRecipientListOnly(ann, recipients) {
    const el = $('drawerBody').querySelector('.ann-recipient-list');
    if (el) el.innerHTML = recipientListHtml(ann, recipients);
    $('drawerBody').querySelectorAll('[data-sim-read]').forEach((btn) => btn.addEventListener('click', () => simulateRecipientProgress(ann, btn.dataset.simRead)));
    $('drawerBody').querySelectorAll('[data-drawer-filter]').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.drawerFilter === drawerFilter));
  }
  function simulateRecipientProgress(ann, familyId) {
    const status = recipientStatus(ann, familyId ? { id: familyId } : {});
    const reads = Object.assign({}, ann.reads || {});
    const acks = Object.assign({}, ann.acks || {});
    if (!reads[familyId]) { reads[familyId] = new Date().toISOString(); window.PlayStore.updateRecord(ann.id, { reads }); }
    else if (ann.requireAck && !acks[familyId]) { acks[familyId] = new Date().toISOString(); window.PlayStore.updateRecord(ann.id, { acks }); }
    renderDrawer();
    render();
  }
  function wireDrawer() {
    const backdrop = $('drawerModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('drawerModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('drawerModalBackdrop'); });
    $('drawerEditBtn').addEventListener('click', () => { const ann = window.PlayStore.getById(drawerId); closeModal('drawerModalBackdrop'); openComposer(ann); });
    $('drawerSendNowBtn').addEventListener('click', () => confirmAction('sendNow', drawerId));
    $('drawerCancelBtn').addEventListener('click', () => confirmAction('cancelScheduled', drawerId));
    $('drawerDeleteBtn').addEventListener('click', () => confirmAction('deleteDraft', drawerId));
    $('drawerRemindBtn').addEventListener('click', () => confirmAction('remindUnread', drawerId));
  }

  /* ---------- confirmation modal (reused for several destructive/important actions) ---------- */
  function confirmAction(kind, id) {
    const ann = window.PlayStore.getById(id);
    pendingAction = { kind, id };
    const copy = {
      sendNow: { title: 'Send now?', text: `Send "${ann.title}" immediately instead of waiting for its scheduled time?`, action: 'Send now', cls: 'btn--accent' },
      cancelScheduled: { title: 'Cancel scheduled announcement?', text: `"${ann.title}" will be cancelled and will not be sent. This can't be undone.`, action: 'Cancel announcement', cls: 'btn--destructive' },
      deleteDraft: { title: 'Delete draft?', text: `"${ann.title}" will be permanently deleted.`, action: 'Delete draft', cls: 'btn--destructive' },
      remindUnread: { title: 'Remind unread families?', text: `This logs a reminder for the ${recipientsFor(ann).filter((f) => recipientStatus(ann, f) === 'unread').length} families who haven't read "${ann.title}" yet.`, action: 'Remind unread', cls: 'btn--accent' },
    }[kind];
    $('confirmTitle').textContent = copy.title;
    $('confirmText').textContent = copy.text;
    $('confirmActionBtn').textContent = copy.action;
    $('confirmActionBtn').className = 'btn ' + copy.cls;
    openModal('confirmModalBackdrop');
  }
  function wireConfirmModal() {
    const backdrop = $('confirmModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('confirmModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('confirmModalBackdrop'); });
    $('confirmCancelBtn').addEventListener('click', () => closeModal('confirmModalBackdrop'));
    $('confirmActionBtn').addEventListener('click', () => {
      if (!pendingAction) return;
      const { kind, id } = pendingAction;
      const ann = window.PlayStore.getById(id);
      if (kind === 'sendNow') {
        const now = new Date().toISOString();
        window.PlayStore.updateRecord(id, { status: 'Sent', sentAt: now, date: now.slice(0, 10), scheduledFor: null });
        window.PlayShell.toast('success', 'Announcement sent', ann.title);
        window.PlayShell.addNotification({ title: 'New announcement', text: ann.title, module: 'communication', recordRoute: 'announcements.html' });
        activeTab = 'sent';
        renderDrawer();
      } else if (kind === 'cancelScheduled') {
        window.PlayStore.removeRecord(id);
        window.PlayShell.toast('success', 'Scheduled announcement cancelled', ann.title);
        closeModal('drawerModalBackdrop');
      } else if (kind === 'deleteDraft') {
        window.PlayStore.removeRecord(id);
        window.PlayShell.toast('success', 'Draft deleted', ann.title);
        closeModal('drawerModalBackdrop');
      } else if (kind === 'remindUnread') {
        const recipients = recipientsFor(ann);
        const unread = recipients.filter((f) => recipientStatus(ann, f) === 'unread');
        window.PlayStore.updateRecord(id, { lastReminderAt: new Date().toISOString(), lastReminderCount: unread.length });
        window.PlayShell.toast('success', 'Reminder logged', `Logged a reminder for ${unread.length} ${unread.length === 1 ? 'family' : 'families'}.`);
        renderDrawer();
      }
      closeModal('confirmModalBackdrop');
      pendingAction = null;
      render();
    });
  }

  /* ========================================================================
     EMERGENCY BROADCAST
     ======================================================================== */
  const CONFIRM_PHRASE = 'SEND EMERGENCY BROADCAST';
  function openEmergencyModal() {
    emergencyState = { step: 1, audienceType: 'all', classIds: new Set(), title: '', body: '', channels: new Set(['in-app', 'email', 'push']) };
    renderEmergencyStep();
    openModal('emergencyModalBackdrop');
  }
  function emergencyRecipientCount() {
    const classes = allActiveClasses();
    if (emergencyState.audienceType === 'all') return window.PlayStore.getByType('Family').length;
    const classNames = new Set([...emergencyState.classIds].map((id) => { const c = classes.find((x) => x.id === id); return c ? c.name : null; }).filter(Boolean));
    const childIds = new Set(window.PlayStore.getByType('Child').filter((c) => c.status === 'Active' && classNames.has(c.room)).map((c) => c.id));
    return window.PlayStore.getByType('Family').filter((f) => (f.childIds || []).some((id) => childIds.has(id))).length;
  }
  function renderEmergencyStep() {
    const classes = allActiveClasses();
    const body = $('emergencyBody');
    if (emergencyState.step === 1) {
      body.innerHTML = `
        <div class="ann-emergency-warning">${ICON.alert}<div>This dedicated flow is for urgent, time-critical situations only (e.g. safety incidents, closures). It is clearly separate from regular announcements.</div></div>
        <div class="field"><label class="field__label" for="emTitle">Title</label><input class="input" id="emTitle" type="text" value="${escapeHtml(emergencyState.title)}" placeholder="e.g. School closure — severe weather" /><p class="field__error" id="err-emTitle" hidden></p></div>
        <div class="field"><label class="field__label" for="emBody">Message</label><textarea class="textarea" id="emBody" rows="4">${escapeHtml(emergencyState.body)}</textarea><p class="field__error" id="err-emBody" hidden></p></div>
        <div class="field">
          <label class="field__label">Audience</label>
          <div class="ann-audience-options">
            <button type="button" class="ann-audience-opt${emergencyState.audienceType === 'all' ? ' is-active' : ''}" data-em-audience="all">${ICON.users} All families</button>
            <button type="button" class="ann-audience-opt${emergencyState.audienceType === 'classes' ? ' is-active' : ''}" data-em-audience="classes">${ICON.users} Specific classes</button>
          </div>
        </div>
        ${emergencyState.audienceType === 'classes' ? `<div class="pl-area-chip-row">${classes.map((c) => `<button type="button" class="pl-area-chip${emergencyState.classIds.has(c.id) ? ' is-active' : ''}" data-em-class="${c.id}" style="--area-color: var(--color-error);">${escapeHtml(c.name)}</button>`).join('')}</div>` : ''}
        <div class="field" style="margin-top:var(--space-3);">
          <label class="field__label">Channels</label>
          <div class="ann-audience-options">${CHANNELS.map((c) => `<button type="button" class="ann-audience-opt${emergencyState.channels.has(c.key) ? ' is-active' : ''}" data-em-channel="${c.key}">${c.icon}${c.label}</button>`).join('')}</div>
        </div>
        <p class="ann-recipient-count">${emergencyRecipientCount()} ${emergencyRecipientCount() === 1 ? 'family' : 'families'} will receive this emergency broadcast.</p>`;
      $('emTitle').addEventListener('input', () => { emergencyState.title = $('emTitle').value; });
      $('emBody').addEventListener('input', () => { emergencyState.body = $('emBody').value; });
      body.querySelectorAll('[data-em-audience]').forEach((btn) => btn.addEventListener('click', () => { emergencyState.audienceType = btn.dataset.emAudience; renderEmergencyStep(); }));
      body.querySelectorAll('[data-em-class]').forEach((btn) => btn.addEventListener('click', () => { const id = btn.dataset.emClass; if (emergencyState.classIds.has(id)) emergencyState.classIds.delete(id); else emergencyState.classIds.add(id); renderEmergencyStep(); }));
      body.querySelectorAll('[data-em-channel]').forEach((btn) => btn.addEventListener('click', () => { const k = btn.dataset.emChannel; if (emergencyState.channels.has(k)) emergencyState.channels.delete(k); else emergencyState.channels.add(k); renderEmergencyStep(); }));
      $('emergencyNext').textContent = 'Review broadcast';
      $('emergencyNext').hidden = false; $('emergencyConfirmBtn').hidden = true;
    } else {
      const classes2 = allActiveClasses();
      const audienceLabel = emergencyState.audienceType === 'all' ? 'All families' : [...emergencyState.classIds].map((id) => (classes2.find((c) => c.id === id) || {}).name).filter(Boolean).join(' + ') || 'No classes selected';
      body.innerHTML = `
        <div class="ann-preview-card ann-preview-card--emergency">
          <div class="ann-preview-card__title">${ICON.siren} ${escapeHtml(emergencyState.title || 'Untitled')}</div>
          <p class="ann-preview-card__body">${escapeHtml(emergencyState.body || 'No message yet.')}</p>
          <div class="ann-preview-card__meta">
            <div><span>Audience</span><b>${escapeHtml(audienceLabel)} · ${emergencyRecipientCount()} families</b></div>
            <div><span>Channels</span><b>${[...emergencyState.channels].map((k) => channelMeta(k).label).join(', ') || 'None selected'}</b></div>
          </div>
        </div>
        <div class="field" style="margin-top: var(--space-4);">
          <label class="field__label" for="emConfirmPhrase">Type <b>${CONFIRM_PHRASE}</b> to enable sending</label>
          <input class="input" id="emConfirmPhrase" type="text" autocomplete="off" />
        </div>
        <p class="ann-emergency-note">This is a demo/simulated broadcast — no real emergency delivery infrastructure exists in this project. No family will actually receive a push/SMS/call from this action.</p>`;
      $('emConfirmPhrase').addEventListener('input', () => { $('emergencyConfirmBtn').disabled = $('emConfirmPhrase').value !== CONFIRM_PHRASE; });
      document.addEventListener('keydown', emergencyPreventEnter, true);
      $('emergencyNext').hidden = true; $('emergencyConfirmBtn').hidden = false;
      $('emergencyConfirmBtn').disabled = true;
    }
  }
  function emergencyPreventEnter(e) { if (e.key === 'Enter' && $('emergencyModalBackdrop').classList.contains('is-open')) e.preventDefault(); }
  function wireEmergencyModal() {
    const backdrop = $('emergencyModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeEmergencyModal(); });
    $('emergencyCancelBtn').addEventListener('click', closeEmergencyModal);
    $('emergencyNext').addEventListener('click', () => {
      if (!emergencyState.title.trim()) { setFieldError('emTitle', 'Title is required.'); return; } setFieldError('emTitle', null);
      if (!emergencyState.body.trim()) { setFieldError('emBody', 'Message is required.'); return; } setFieldError('emBody', null);
      emergencyState.step = 2;
      renderEmergencyStep();
    });
    $('emergencyConfirmBtn').addEventListener('click', () => {
      if ($('emConfirmPhrase').value !== CONFIRM_PHRASE) return;
      submitWithLoading('emergencyConfirmBtn', () => {
        const staff = currentStaff();
        const classes = allActiveClasses();
        const audience = emergencyState.audienceType === 'all' ? 'All families' : [...emergencyState.classIds].map((id) => (classes.find((c) => c.id === id) || {}).name).filter(Boolean).join(' + ') || 'Classes';
        const now = new Date().toISOString();
        const record = window.PlayStore.addRecord({
          id: uid('ANN'), type: 'Announcement', title: emergencyState.title.trim(), message: emergencyState.body.trim(),
          audienceType: emergencyState.audienceType, classIds: [...emergencyState.classIds], audience, channels: [...emergencyState.channels],
          requireAck: false, status: 'Sent', isEmergency: true, sentAt: now, date: now.slice(0, 10), createdAt: now, reads: {}, acks: {},
        });
        try { localStorage.setItem('ps_emergency_broadcast', JSON.stringify({ id: record.id, message: emergencyState.title.trim() + ' — ' + emergencyState.body.trim(), active: true })); } catch (e) { /* storage unavailable */ }
        window.PlayShell.addNotification({ title: 'Emergency broadcast sent', text: record.title, forRole: 'Director', module: null, mention: true, recordRoute: 'announcements.html' });
        closeEmergencyModal();
        activeTab = 'sent';
        render();
        window.PlayShell.toast('success', 'Emergency broadcast sent (demo)', 'This is a simulated broadcast — no real delivery infrastructure exists in this project.');
      });
    });
  }
  function closeEmergencyModal() { closeModal('emergencyModalBackdrop'); document.removeEventListener('keydown', emergencyPreventEnter, true); }
})();
