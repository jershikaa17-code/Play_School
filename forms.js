/* ==========================================================================
   PLAY SCHOOL — Family Forms (S31)
   Reuses: store.js (new FormDef/FormResponse record types — FormDef holds
   questions + conditional logic + audience/due date; FormResponse is one
   submission per respondent, same reads/acks-style convention as
   Announcement, keyed by Family id), modules.js/shell.js (Premium nav,
   gated by the same 'communication' tier as Messages/Announcements),
   announcements.css (header/summary/tabs/step-indicator/drawer/audience
   chips/preview-card components reused outright, not re-styled).

   HONESTY NOTES (no real backend in this project):
   - "Remind non-responders" logs a local audit field on the form
     (lastReminderAt/lastReminderCount) and tells the admin that — exactly
     the same honest pattern as Announcements' "Remind unread".
   - The "Preview as parent" phone frame is a fully interactive demo, but
     submitting it does NOT create a real FormResponse — there is no family
     login in this project, so an admin "previewing" isn't a real
     respondent. Submitting shows a clearly-labelled demo confirmation
     instead of silently corrupting real response-rate numbers.
   - File-upload answers only ever store {name,size,type} metadata. The
     actual file bytes are never persisted, so Results never shows a fake
     download link.
   - Signatures are real: captured live on a canvas, stored as a data URL
     with a real captured timestamp. Seed/demo historical responses use one
     shared placeholder signature image, clearly documented in store.js.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function formatDateTime(iso) { if (!iso) return '—'; return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function formatDate(iso) { if (!iso) return '—'; const d = iso.length <= 10 ? new Date(iso + 'T00:00:00') : new Date(iso); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
  function slug(str) { return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'form'; }

  const ICON = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    chevronUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="m9 14 2 2 4-4"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
    text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>',
    alignLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>',
    radio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/></svg>',
    checkSquare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    toggle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="22" height="12" rx="6"/><circle cx="8" cy="12" r="4"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    signature: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17s2-1 4-1 3 2 5 2 3-2 5-2 4 1 4 1"/><path d="M4 12c2-6 4-8 6-8s2 4 2 7 1 5 3 5 2-3 2-6 1-5 3-5"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    gitBranch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    laptop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1"/><line x1="2" y1="20" x2="22" y2="20"/></svg>',
    school: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 1 9l11 6 9-4.9V17h2V9Z"/><path d="M5 13.2V18c0 1.5 3 3 7 3s7-1.5 7-3v-4.8"/></svg>',
  };

  const QUESTION_TYPES = [
    { type: 'short', label: 'Short text', icon: ICON.text },
    { type: 'long', label: 'Long text', icon: ICON.alignLeft },
    { type: 'single', label: 'Single choice', icon: ICON.radio },
    { type: 'multi', label: 'Multiple choice', icon: ICON.checkSquare },
    { type: 'rating', label: 'Rating 1–5', icon: ICON.star },
    { type: 'date', label: 'Date', icon: ICON.calendar },
    { type: 'yesno', label: 'Yes / No', icon: ICON.toggle },
    { type: 'file', label: 'File upload', icon: ICON.upload },
    { type: 'signature', label: 'Signature', icon: ICON.signature },
  ];
  function typeMeta(t) { return QUESTION_TYPES.find((q) => q.type === t) || QUESTION_TYPES[0]; }
  function isConditionSource(t) { return t === 'single' || t === 'yesno'; }

  function defaultQuestion(type) {
    const base = { id: uid('Q'), type, title: '', description: '', required: false, options: [], showIf: null };
    if (type === 'single' || type === 'multi') base.options = [{ id: uid('OPT'), label: 'Option 1' }, { id: uid('OPT'), label: 'Option 2' }];
    if (type === 'file') { base.fileTypes = '.pdf,.jpg,.png'; base.maxSizeMB = 5; }
    if (type === 'date') base.restrictFuture = false;
    if (type === 'signature') { base.title = 'Parent or guardian signature'; base.required = true; }
    return base;
  }

  let role = null;
  let currentView = 'list'; // 'list' | 'builder' | 'results'
  let activeFormId = null;
  let selectedQuestionId = null;
  let listFilter = 'all';
  let listSearch = '';
  let responsesSearch = '';
  let draggingQId = null;
  let pendingAction = null;
  let publishDraft = null;
  let publishStep = 1;
  let previewState = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    window.PlayShell.login();
    role = window.PlayShell.getDemoRole();
    window.PlayShell.mount('forms', 'Family Forms');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    if (!isModuleUnlocked()) { renderLocked(); return; }
    $('frmMain').hidden = false;

    wireList();
    wireBuilder();
    wirePublishModal();
    wirePreviewModal();
    wireConfirmModal();
    wireResponseDrawer();
    window.addEventListener('resize', () => { if (currentView === 'builder') syncBuilderWidth(); });

    window.setTimeout(() => { $('frmSkeleton').hidden = true; $('frmBody').hidden = false; goToList(); }, 380);
  }
  function isModuleUnlocked() {
    if (!window.PlayModules) return true;
    const mod = window.PlayModules.getById('communication');
    if (!mod) return true;
    return window.PlayModules.isUnlocked(mod, window.PlayModules.getCurrentPlan());
  }
  function renderLocked() {
    $('frmLocked').hidden = false;
    $('frmMain').hidden = true;
    $('frmLockedIcon').innerHTML = ICON.lock;
    const isAdminish = role === 'Director' || role === 'Admin';
    $('frmLockedAction').innerHTML = isAdminish
      ? `<a class="btn btn--accent" href="plans.html?module=communication&role=${encodeURIComponent(role)}">See plans &amp; upgrade</a>`
      : `<a class="btn btn--secondary" href="module.html?id=communication&role=${encodeURIComponent(role)}">Ask my admin to upgrade</a>`;
  }

  /* ---------- data helpers ---------- */
  function allForms() { return window.PlayStore.getByType('FormDef'); }
  function getForm(id) { return window.PlayStore.getById(id); }
  function responsesFor(formId) { return window.PlayStore.getByType('FormResponse').filter((r) => r.formId === formId); }
  function allActiveClasses() { return window.PlayStore.getByType('Class').filter((c) => c.status !== 'Archived'); }
  function recipientsFor(form) {
    if (!form.audienceType) return [];
    const families = window.PlayStore.getByType('Family');
    if (form.audienceType === 'all') return families;
    const classNames = new Set((form.classIds || []).map((id) => { const c = window.PlayStore.getById(id); return c ? c.name : null; }).filter(Boolean));
    const childIds = new Set(window.PlayStore.getByType('Child').filter((c) => c.status === 'Active' && classNames.has(c.room)).map((c) => c.id));
    return families.filter((f) => (f.childIds || []).some((id) => childIds.has(id)));
  }
  function respondedFamilyIds(formId) { return new Set(responsesFor(formId).map((r) => r.familyId)); }
  function nonResponders(form) { const set = respondedFamilyIds(form.id); return recipientsFor(form).filter((f) => !set.has(f.id)); }
  function responseRatePct(form) { const recipients = recipientsFor(form); return recipients.length ? pct(responsesFor(form.id).length, recipients.length) : 0; }
  function audienceSummary(form) {
    if (!form.audienceType) return 'Not published yet';
    const recipients = recipientsFor(form);
    const countLabel = `${recipients.length} ${recipients.length === 1 ? 'family' : 'families'}`;
    if (form.audienceType === 'all') return `All families · ${countLabel}`;
    const names = (form.classIds || []).map((id) => { const c = getForm(id); return c ? c.name : null; }).filter(Boolean);
    return `${names.join(' + ') || 'Classes'} · ${countLabel}`;
  }
  function hasSignatureQuestion(form) { return (form.questions || []).some((q) => q.type === 'signature'); }
  function evaluateVisibility(questions, answers) {
    const visible = new Set();
    questions.forEach((q) => {
      if (!q.showIf) { visible.add(q.id); return; }
      if (!visible.has(q.showIf.questionId)) return;
      if (answers[q.showIf.questionId] === q.showIf.equals) visible.add(q.id);
    });
    return visible;
  }
  function isAnswerEmpty(q, value) {
    if (value == null) return true;
    if (q.type === 'multi') return !Array.isArray(value) || value.length === 0;
    if (q.type === 'signature') return !value.dataUrl;
    if (q.type === 'file') return !value.name;
    if (typeof value === 'string') return value.trim() === '';
    return false;
  }
  function validateRequired(questions, answers) {
    const visible = evaluateVisibility(questions, answers);
    return questions.filter((q) => q.required && visible.has(q.id) && isAnswerEmpty(q, answers[q.id])).map((q) => q.id);
  }

  /* ========================================================================
     SCENE SWITCHING
     ======================================================================== */
  function hideAllScenes() { $('formsListScene').hidden = true; $('formsBuilderScene').hidden = true; $('formsResultsScene').hidden = true; }
  function goToList() {
    currentView = 'list'; activeFormId = null; hideAllScenes();
    $('formsListScene').hidden = false;
    renderList();
  }
  function openBuilder(formId) {
    currentView = 'builder'; activeFormId = formId; selectedQuestionId = null; hideAllScenes();
    $('formsBuilderScene').hidden = false;
    syncBuilderWidth();
    renderBuilder();
  }
  function openResults(formId) {
    currentView = 'results'; activeFormId = formId; hideAllScenes();
    $('formsResultsScene').hidden = false;
    responsesSearch = '';
    renderResults();
  }
  function syncBuilderWidth() {
    const blocked = window.innerWidth < 768;
    $('formsBuilderBlocked').hidden = !blocked;
    $('formsBuilderDesktop').hidden = blocked;
    if (blocked) $('blockedIcon').innerHTML = ICON.laptop;
  }

  function openForm(form) {
    if (form.status === 'Draft') openBuilder(form.id); else openResults(form.id);
  }

  /* ========================================================================
     LIST SCENE
     ======================================================================== */
  function renderSummary() {
    const forms = allForms();
    const open = forms.filter((f) => f.status === 'Open');
    const published = forms.filter((f) => f.status !== 'Draft');
    const avgRate = published.length ? Math.round(published.reduce((sum, f) => sum + responseRatePct(f), 0) / published.length) : 0;
    const pending = open.reduce((sum, f) => sum + nonResponders(f).length, 0);
    $('frmSummary').innerHTML = [
      { icon: ICON.clipboard, value: forms.length, label: 'Total forms' },
      { icon: ICON.send, value: open.length, label: 'Open forms' },
      { icon: ICON.check, value: avgRate + '%', label: 'Average response rate' },
      { icon: ICON.clock, value: pending, label: 'Responses awaiting completion' },
    ].map((s) => `<div class="ann-summary-card"><span class="ann-summary-card__icon">${s.icon}</span><div><div class="ann-summary-card__value">${s.value}</div><div class="ann-summary-card__label">${escapeHtml(s.label)}</div></div></div>`).join('');
  }
  const LIST_TABS = [['all', 'All forms'], ['open', 'Open'], ['closed', 'Closed'], ['draft', 'Drafts']];
  function wireList() {
    $('frmTabs').innerHTML = LIST_TABS.map(([k, l]) => `<button class="ann-tab" type="button" data-tab="${k}" role="tab" aria-selected="${k === listFilter}">${l}</button>`).join('');
    $('frmTabs').addEventListener('click', (e) => { const btn = e.target.closest('[data-tab]'); if (!btn) return; listFilter = btn.dataset.tab; renderList(); });
    $('frmSearch').addEventListener('input', () => { listSearch = $('frmSearch').value; renderListPanelOnly(); });
    $('frmCreateBtn').addEventListener('click', () => {
      const form = window.PlayStore.addRecord({
        id: uid('FORM'), type: 'FormDef', title: 'Untitled form', formType: 'Survey', description: '',
        status: 'Draft', audienceType: null, classIds: [], dueDate: null,
        createdAt: new Date().toISOString(), publishedAt: null, closedAt: null,
        lastReminderAt: null, lastReminderCount: 0, questions: [],
      });
      openBuilder(form.id);
    });
  }
  function filteredForms() {
    let list = allForms();
    if (listFilter === 'open') list = list.filter((f) => f.status === 'Open');
    else if (listFilter === 'closed') list = list.filter((f) => f.status === 'Closed');
    else if (listFilter === 'draft') list = list.filter((f) => f.status === 'Draft');
    const q = listSearch.trim().toLowerCase();
    if (q) list = list.filter((f) => f.title.toLowerCase().includes(q));
    return list.sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt));
  }
  function statusBadge(status) {
    if (status === 'Open') return `<span class="badge badge--success">Open</span>`;
    if (status === 'Closed') return `<span class="badge badge--neutral">Closed</span>`;
    return `<span class="badge badge--warning">Draft</span>`;
  }
  function typeBadge(t) { return `<span class="badge badge--primary">${escapeHtml(t)}</span>`; }
  function renderList() {
    $('frmTabs').querySelectorAll('[data-tab]').forEach((btn) => btn.setAttribute('aria-selected', String(btn.dataset.tab === listFilter)));
    renderSummary();
    renderListPanelOnly();
  }
  function renderListPanelOnly() {
    const list = filteredForms();
    const panel = $('frmTabPanel');
    panel.classList.remove('ann-tab-panel--in');
    if (!list.length) {
      panel.innerHTML = `<div class="state-panel"><div class="state-panel__icon">${ICON.clipboard}</div><div class="state-panel__title">No forms here yet</div><p class="state-panel__text">Create a form to gather feedback, permissions or signed acknowledgements from families.</p><div class="state-panel__action"><button class="btn btn--accent" type="button" id="frmEmptyCreateBtn">${ICON.plus}<span>&nbsp;Create form</span></button></div></div>`;
      const btn = $('frmEmptyCreateBtn'); if (btn) btn.addEventListener('click', () => $('frmCreateBtn').click());
    } else {
      panel.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Title</th><th>Type</th><th>Audience</th><th>Response rate</th><th>Status</th><th>Due</th><th>Responses</th></tr></thead>
            <tbody>${list.map(formRowHtml).join('')}</tbody>
          </table>
          <div class="table-card">${list.map(formCardHtml).join('')}</div>
        </div>`;
      panel.querySelectorAll('[data-open-form]').forEach((el) => el.addEventListener('click', () => openForm(getForm(el.dataset.openForm))));
      const bars = panel.querySelectorAll('[data-anim-width]');
      requestAnimationFrame(() => requestAnimationFrame(() => bars.forEach((b) => { b.style.width = b.dataset.animWidth + '%'; })));
    }
    requestAnimationFrame(() => panel.classList.add('ann-tab-panel--in'));
  }
  function rateBarHtml(form) {
    if (form.status === 'Draft') return `<span class="ws-section-empty" style="padding:0;">—</span>`;
    const p = responseRatePct(form);
    return `<div class="ann-read-bar"><div class="progress-linear"><div class="progress-linear__bar" data-anim-width="${p}" style="width:0%;"></div></div><span>${p}%</span></div>`;
  }
  function dueHtml(form) {
    if (!form.dueDate) return '—';
    const overdue = form.status === 'Open' && form.dueDate < todayISO();
    return `<span class="frm-due${overdue ? ' is-overdue' : ''}">${formatDate(form.dueDate)}</span>`;
  }
  function responseCountLabel(form) {
    if (form.status === 'Draft') return '—';
    const recipients = recipientsFor(form);
    return `${responsesFor(form.id).length} / ${recipients.length}`;
  }
  function formRowHtml(form) {
    return `
      <tr class="frm-row" data-open-form="${form.id}">
        <td class="cell-primary">${escapeHtml(form.title)}</td>
        <td>${typeBadge(form.formType)}</td>
        <td class="cell-muted">${escapeHtml(audienceSummary(form))}</td>
        <td>${rateBarHtml(form)}</td>
        <td>${statusBadge(form.status)}</td>
        <td class="cell-muted">${dueHtml(form)}</td>
        <td class="cell-muted">${responseCountLabel(form)}</td>
      </tr>`;
  }
  function formCardHtml(form) {
    return `
      <div class="table-card__item frm-card" data-open-form="${form.id}">
        <div class="table-card__head"><span class="cell-primary">${escapeHtml(form.title)}</span>${statusBadge(form.status)}</div>
        <div class="table-card__row"><span class="table-card__label">Type</span><span class="table-card__value">${escapeHtml(form.formType)}</span></div>
        <div class="table-card__row"><span class="table-card__label">Audience</span><span class="table-card__value">${escapeHtml(audienceSummary(form))}</span></div>
        <div class="table-card__row"><span class="table-card__label">Response rate</span><span class="table-card__value">${rateBarHtml(form)}</span></div>
        <div class="table-card__row"><span class="table-card__label">Due</span><span class="table-card__value">${dueHtml(form)}</span></div>
        <div class="table-card__row"><span class="table-card__label">Responses</span><span class="table-card__value">${responseCountLabel(form)}</span></div>
      </div>`;
  }

  /* ========================================================================
     BUILDER
     ======================================================================== */
  function updateForm(patch) { window.PlayStore.updateRecord(activeFormId, patch); }
  function cleanupConditions(form) {
    const ids = new Set(form.questions.map((q) => q.id));
    form.questions.forEach((q, idx) => {
      if (!q.showIf) return;
      const sourceIdx = form.questions.findIndex((x) => x.id === q.showIf.questionId);
      if (!ids.has(q.showIf.questionId) || sourceIdx === -1 || sourceIdx >= idx || !isConditionSource(form.questions[sourceIdx].type)) q.showIf = null;
    });
  }
  function wireBuilder() {
    $('builderBackBtn').addEventListener('click', goToList);
    $('blockedBackBtn').addEventListener('click', goToList);
    $('builderTitleInput').addEventListener('input', () => updateForm({ title: $('builderTitleInput').value }));
    $('builderTypeSelect').addEventListener('change', () => updateForm({ formType: $('builderTypeSelect').value }));
    $('builderDescInput').addEventListener('input', () => updateForm({ description: $('builderDescInput').value }));
    $('builderPreviewBtn').addEventListener('click', () => openPreview(getForm(activeFormId)));
    $('builderPublishBtn').addEventListener('click', openPublishModal);
    $('builderCloseFormBtn').addEventListener('click', () => confirmAction('closeForm', activeFormId));
    $('builderRemindBtn').addEventListener('click', () => confirmAction('remind', activeFormId));
    $('frmPaletteList').innerHTML = QUESTION_TYPES.map((qt) => `<button type="button" class="frm-palette-item" data-add-type="${qt.type}">${qt.icon}<span>${qt.label}</span></button>`).join('');
    $('frmPaletteList').addEventListener('click', (e) => { const btn = e.target.closest('[data-add-type]'); if (btn) addQuestion(btn.dataset.addType); });
  }
  function addQuestion(type) {
    const form = getForm(activeFormId);
    const q = defaultQuestion(type);
    form.questions.push(q);
    updateForm({ questions: form.questions });
    selectedQuestionId = q.id;
    renderBuilder();
  }
  function renderBuilder() {
    const form = getForm(activeFormId);
    if (!form) { goToList(); return; }
    $('builderTitleInput').value = form.title;
    $('builderTypeSelect').value = form.formType;
    $('builderDescInput').value = form.description || '';
    $('builderQCount').textContent = form.questions.length + (form.questions.length === 1 ? ' question' : ' questions');
    $('builderCloseFormBtn').hidden = form.status !== 'Open';
    $('builderRemindBtn').hidden = form.status !== 'Open';
    $('builderPublishBtn').innerHTML = form.status === 'Draft' ? `${ICON.send}<span>Publish</span>` : `${ICON.eye}<span>View results</span>`;
    renderCanvas(form);
    renderSettings(form);
  }
  function renderCanvas(form) {
    const canvas = $('frmCanvas');
    if (!form.questions.length) {
      canvas.innerHTML = `
        <div class="frm-canvas-welcome">
          <div class="frm-canvas-welcome__icon">${ICON.clipboard}</div>
          <h3>Start building ${form.title ? '"' + escapeHtml(form.title) + '"' : 'your form'}</h3>
          <p>Add a question from the palette on the left to get started. There's no required structure — build whatever this family form needs.</p>
        </div>`;
      return;
    }
    canvas.innerHTML = form.questions.map((q, idx) => questionCardHtml(form, q, idx)).join('');
    wireCanvasCards(form);
  }
  function conditionLabel(form, q) {
    if (!q.showIf) return '';
    const source = form.questions.find((x) => x.id === q.showIf.questionId);
    if (!source) return '';
    const answerLabel = source.type === 'yesno' ? q.showIf.equals : ((source.options.find((o) => o.id === q.showIf.equals) || {}).label || q.showIf.equals);
    return `Shows if "${escapeHtml(source.title || 'Untitled question')}" = ${escapeHtml(answerLabel)}`;
  }
  function questionPreviewHtml(q) {
    if (q.type === 'single' || q.type === 'multi') {
      return q.options.map((o) => `<div class="frm-opt-preview"><span class="frm-opt-preview__box ${q.type === 'single' ? 'is-radio' : 'is-check'}"></span>${escapeHtml(o.label)}</div>`).join('');
    }
    if (q.type === 'rating') return `<div class="frm-rating-preview">${[1, 2, 3, 4, 5].map((n) => `<span>${n}</span>`).join('')}</div>`;
    if (q.type === 'date') return `<div class="frm-input-preview">${ICON.calendar} Date picker${q.restrictFuture ? ' (future dates only)' : ''}</div>`;
    if (q.type === 'yesno') return `<div class="frm-opt-preview"><span class="frm-opt-preview__box is-radio"></span>Yes</div><div class="frm-opt-preview"><span class="frm-opt-preview__box is-radio"></span>No</div>`;
    if (q.type === 'file') return `<div class="frm-file-preview">${ICON.upload} Accepts ${escapeHtml(q.fileTypes || 'any file')} · up to ${q.maxSizeMB || 5}MB</div>`;
    if (q.type === 'signature') return `<div class="frm-sig-preview">${ICON.signature} Signature pad</div>`;
    return `<div class="frm-input-preview">${q.type === 'long' ? 'Long answer' : 'Short answer'}</div>`;
  }
  function questionCardHtml(form, q, idx) {
    const meta = typeMeta(q.type);
    return `
      <div class="frm-qcard${selectedQuestionId === q.id ? ' is-selected' : ''}" data-qid="${q.id}" style="animation-delay:${Math.min(idx, 8) * 30}ms;">
        <div class="frm-qcard__head">
          <span class="frm-qcard__handle" draggable="true" title="Drag to reorder">${ICON.grip}</span>
          <div class="frm-qcard__body">
            <span class="frm-qcard__badge">${meta.icon}${meta.label}</span>
            <div><span class="frm-qcard__num">${idx + 1}.</span><input class="frm-qcard__title-input" data-field="title" value="${escapeHtml(q.title)}" placeholder="Untitled question" />${q.required ? '<span class="frm-qcard__required">*</span>' : ''}</div>
            ${q.showIf ? `<span class="frm-qcard__condition">${ICON.gitBranch}${conditionLabel(form, q)}</span>` : ''}
            <div class="frm-qcard__preview">${questionPreviewHtml(q)}</div>
          </div>
          <div class="frm-qcard__actions">
            <button class="ws-icon-btn" type="button" data-move="up" title="Move up" ${idx === 0 ? 'disabled' : ''}>${ICON.chevronUp}</button>
            <button class="ws-icon-btn" type="button" data-move="down" title="Move down" ${idx === form.questions.length - 1 ? 'disabled' : ''}>${ICON.chevronDown}</button>
            <button class="ws-icon-btn" type="button" data-dup title="Duplicate">${ICON.copy}</button>
            <button class="ws-icon-btn" type="button" data-del title="Delete">${ICON.trash}</button>
          </div>
        </div>
      </div>`;
  }
  function wireCanvasCards(form) {
    const canvas = $('frmCanvas');
    canvas.querySelectorAll('.frm-qcard').forEach((card) => {
      const qid = card.dataset.qid;
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-move],[data-dup],[data-del]')) return;
        if (e.target.closest('[data-field]')) { selectQuestion(qid); return; }
        selectQuestion(qid);
      });
      const titleInput = card.querySelector('[data-field="title"]');
      titleInput.addEventListener('input', () => { const q = form.questions.find((x) => x.id === qid); q.title = titleInput.value; updateForm({ questions: form.questions }); syncConditionLabels(form); syncSettingsIfSelected(qid); });
      card.querySelector('[data-move="up"]').addEventListener('click', () => moveQuestion(qid, -1));
      card.querySelector('[data-move="down"]').addEventListener('click', () => moveQuestion(qid, 1));
      card.querySelector('[data-dup]').addEventListener('click', () => duplicateQuestion(qid));
      card.querySelector('[data-del]').addEventListener('click', () => confirmAction('deleteQuestion', qid));

      const handle = card.querySelector('.frm-qcard__handle');
      handle.addEventListener('dragstart', (e) => { e.stopPropagation(); draggingQId = qid; card.classList.add('is-dragging'); });
      handle.addEventListener('dragend', () => { draggingQId = null; canvas.querySelectorAll('.frm-qcard').forEach((c) => c.classList.remove('is-dragging', 'is-drop-target')); });
      card.addEventListener('dragover', (e) => { e.preventDefault(); if (qid !== draggingQId) card.classList.add('is-drop-target'); });
      card.addEventListener('dragleave', () => card.classList.remove('is-drop-target'));
      card.addEventListener('drop', (e) => { e.preventDefault(); card.classList.remove('is-drop-target'); if (draggingQId && draggingQId !== qid) reorderQuestions(draggingQId, qid); });
    });
  }
  function syncConditionLabels(form) {
    $('frmCanvas').querySelectorAll('.frm-qcard').forEach((card) => {
      const q = form.questions.find((x) => x.id === card.dataset.qid);
      const condEl = card.querySelector('.frm-qcard__condition');
      if (q.showIf && !condEl) { /* re-render fully to add the pill */ renderCanvas(form); }
      else if (q.showIf && condEl) condEl.innerHTML = `${ICON.gitBranch}${conditionLabel(form, q)}`;
    });
  }
  function moveQuestion(qid, dir) {
    const form = getForm(activeFormId);
    const idx = form.questions.findIndex((q) => q.id === qid);
    const target = idx + dir;
    if (target < 0 || target >= form.questions.length) return;
    const [q] = form.questions.splice(idx, 1);
    form.questions.splice(target, 0, q);
    cleanupConditions(form);
    updateForm({ questions: form.questions });
    renderBuilder();
  }
  function reorderQuestions(sourceId, targetId) {
    const form = getForm(activeFormId);
    const sourceIdx = form.questions.findIndex((q) => q.id === sourceId);
    const targetIdx = form.questions.findIndex((q) => q.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;
    const [q] = form.questions.splice(sourceIdx, 1);
    form.questions.splice(targetIdx, 0, q);
    cleanupConditions(form);
    updateForm({ questions: form.questions });
    renderBuilder();
  }
  function duplicateQuestion(qid) {
    const form = getForm(activeFormId);
    const idx = form.questions.findIndex((q) => q.id === qid);
    const clone = JSON.parse(JSON.stringify(form.questions[idx]));
    clone.id = uid('Q');
    clone.title = (clone.title || 'Untitled question') + ' (copy)';
    if (clone.options) clone.options = clone.options.map((o) => ({ id: uid('OPT'), label: o.label }));
    form.questions.splice(idx + 1, 0, clone);
    updateForm({ questions: form.questions });
    renderBuilder();
  }
  function deleteQuestion(qid) {
    const form = getForm(activeFormId);
    form.questions = form.questions.filter((q) => q.id !== qid);
    cleanupConditions(form);
    updateForm({ questions: form.questions });
    if (selectedQuestionId === qid) selectedQuestionId = null;
    renderBuilder();
  }
  function selectQuestion(qid) {
    selectedQuestionId = qid;
    $('frmCanvas').querySelectorAll('.frm-qcard').forEach((c) => c.classList.toggle('is-selected', c.dataset.qid === qid));
    renderSettings(getForm(activeFormId));
    if (window.innerWidth < 1024) { $('frmSettings').classList.add('is-open'); ensureSettingsBackdrop(); }
  }
  function ensureSettingsBackdrop() {
    let bd = document.querySelector('.frm-settings-backdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.className = 'frm-settings-backdrop';
      bd.addEventListener('click', closeSettingsOverlay);
      document.body.appendChild(bd);
    }
    bd.classList.add('is-open');
  }
  function closeSettingsOverlay() {
    $('frmSettings').classList.remove('is-open');
    const bd = document.querySelector('.frm-settings-backdrop');
    if (bd) bd.classList.remove('is-open');
  }
  function syncSettingsIfSelected(qid) { if (selectedQuestionId === qid) { /* title already live-bound below */ } }

  function renderSettings(form) {
    const q = form.questions.find((x) => x.id === selectedQuestionId);
    if (!q) { $('frmSettingsEmpty').hidden = false; $('frmSettingsBody').hidden = true; $('settingsEmptyIcon').innerHTML = ICON.clipboard; return; }
    $('frmSettingsEmpty').hidden = true;
    const body = $('frmSettingsBody');
    body.hidden = false;
    const idx = form.questions.findIndex((x) => x.id === q.id);
    const earlierSources = form.questions.slice(0, idx).filter((x) => isConditionSource(x.type));

    body.innerHTML = `
      <button class="frm-settings-close" type="button" id="settingsCloseBtn">${ICON.chevronLeft}<span>Back to questions</span></button>
      <div class="frm-settings-section">
        <div class="field"><label class="field__label" for="setDesc">Description / help text</label><textarea class="textarea" id="setDesc" rows="2" placeholder="Optional guidance shown under the question">${escapeHtml(q.description)}</textarea></div>
        <label class="cls-toggle-row" style="margin-top: var(--space-3);">
          <span class="toggle"><input type="checkbox" id="setRequired" ${q.required ? 'checked' : ''} /><span class="toggle__track"><span class="toggle__thumb"></span></span></span>
          <span><span class="cls-toggle-row__label">Required</span><span class="cls-toggle-row__hint">Families must answer before submitting.</span></span>
        </label>
      </div>
      ${(q.type === 'single' || q.type === 'multi') ? `
      <div class="frm-settings-section">
        <label class="field__label">Options</label>
        <div id="setOptions">${q.options.map((o) => `<div class="frm-opt-row" data-opt="${o.id}"><input class="input" value="${escapeHtml(o.label)}" /><button class="ws-icon-btn" type="button" data-remove-opt title="Remove">${ICON.x}</button></div>`).join('')}</div>
        <button class="frm-opt-add" type="button" id="setAddOption">${ICON.plus}<span>Add option</span></button>
      </div>` : ''}
      ${q.type === 'date' ? `
      <div class="frm-settings-section">
        <label class="cls-toggle-row">
          <span class="toggle"><input type="checkbox" id="setRestrictFuture" ${q.restrictFuture ? 'checked' : ''} /><span class="toggle__track"><span class="toggle__thumb"></span></span></span>
          <span><span class="cls-toggle-row__label">Future dates only</span><span class="cls-toggle-row__hint">Families can't pick a date in the past.</span></span>
        </label>
      </div>` : ''}
      ${q.type === 'file' ? `
      <div class="frm-settings-section">
        <div class="field"><label class="field__label" for="setFileTypes">Accepted file types</label><input class="input" id="setFileTypes" value="${escapeHtml(q.fileTypes || '')}" placeholder=".pdf,.jpg,.png" /></div>
        <div class="field" style="margin-top:var(--space-3);"><label class="field__label" for="setMaxSize">Max size (MB)</label><input class="input" id="setMaxSize" type="number" min="1" value="${q.maxSizeMB || 5}" /></div>
      </div>` : ''}
      ${q.type === 'signature' ? `<div class="frm-settings-section"><p class="ws-section-empty" style="padding:0;">Parents sign using their finger or mouse directly in the preview. Nothing needs configuring here.</p></div>` : ''}
      ${q.type === 'rating' ? `<div class="frm-settings-section"><p class="ws-section-empty" style="padding:0;">Families choose a rating from 1 (lowest) to 5 (highest).</p></div>` : ''}
      <div class="frm-settings-section">
        <label class="field__label" for="setShowIfSource">Show if</label>
        <select class="select" id="setShowIfSource" style="margin-bottom:var(--space-2);">
          <option value="">Always show this question</option>
          ${earlierSources.map((s) => `<option value="${s.id}" ${q.showIf && q.showIf.questionId === s.id ? 'selected' : ''}>${escapeHtml(s.title || 'Untitled question')}</option>`).join('')}
        </select>
        <div id="setShowIfAnswerWrap"></div>
        ${!earlierSources.length ? `<p class="ws-section-empty" style="padding:0;">Add a Single choice or Yes/No question earlier in the form to make this one conditional.</p>` : ''}
      </div>
    `;
    renderShowIfAnswerSelect(form, q);
    wireSettingsEvents(form, q);
  }
  function renderShowIfAnswerSelect(form, q) {
    const wrap = $('setShowIfAnswerWrap');
    if (!wrap) return;
    const sourceId = $('setShowIfSource').value;
    if (!sourceId) { wrap.innerHTML = ''; return; }
    const source = form.questions.find((x) => x.id === sourceId);
    const opts = source.type === 'yesno' ? [{ id: 'Yes', label: 'Yes' }, { id: 'No', label: 'No' }] : source.options;
    wrap.innerHTML = `<select class="select" id="setShowIfEquals"><option value="">Choose an answer…</option>${opts.map((o) => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.label)}</option>`).join('')}</select>`;
    const sel = $('setShowIfEquals');
    const currentEquals = q.showIf && q.showIf.questionId === sourceId ? q.showIf.equals : '';
    Array.from(sel.options).forEach((opt) => { if (opt.value === currentEquals) opt.selected = true; });
    sel.addEventListener('change', () => {
      const val = sel.value;
      q.showIf = val ? { questionId: sourceId, equals: val } : null;
      updateForm({ questions: form.questions });
      renderCanvas(form);
    });
  }
  function wireSettingsEvents(form, q) {
    $('settingsCloseBtn').addEventListener('click', closeSettingsOverlay);
    $('setDesc').addEventListener('input', () => { q.description = $('setDesc').value; updateForm({ questions: form.questions }); });
    $('setRequired').addEventListener('change', () => { q.required = $('setRequired').checked; updateForm({ questions: form.questions }); renderCanvas(form); });
    const optWrap = $('setOptions');
    if (optWrap) {
      optWrap.querySelectorAll('[data-opt]').forEach((row) => {
        const optId = row.dataset.opt;
        const input = row.querySelector('input');
        input.addEventListener('input', () => { const o = q.options.find((x) => x.id === optId); o.label = input.value; updateForm({ questions: form.questions }); renderCanvas(form); });
        row.querySelector('[data-remove-opt]').addEventListener('click', () => {
          if (q.options.length <= 2) { window.PlayShell.toast('error', "Can't remove option", 'A choice question needs at least two options.'); return; }
          q.options = q.options.filter((x) => x.id !== optId);
          updateForm({ questions: form.questions });
          renderSettings(form); renderCanvas(form);
        });
      });
      $('setAddOption').addEventListener('click', () => {
        q.options.push({ id: uid('OPT'), label: 'Option ' + (q.options.length + 1) });
        updateForm({ questions: form.questions });
        renderSettings(form); renderCanvas(form);
      });
    }
    const restrictFuture = $('setRestrictFuture');
    if (restrictFuture) restrictFuture.addEventListener('change', () => { q.restrictFuture = restrictFuture.checked; updateForm({ questions: form.questions }); renderCanvas(form); });
    const fileTypes = $('setFileTypes');
    if (fileTypes) fileTypes.addEventListener('input', () => { q.fileTypes = fileTypes.value; updateForm({ questions: form.questions }); renderCanvas(form); });
    const maxSize = $('setMaxSize');
    if (maxSize) maxSize.addEventListener('input', () => { q.maxSizeMB = Number(maxSize.value) || 5; updateForm({ questions: form.questions }); renderCanvas(form); });
    const srcSel = $('setShowIfSource');
    srcSel.addEventListener('change', () => { if (!srcSel.value) { q.showIf = null; updateForm({ questions: form.questions }); renderCanvas(form); } renderShowIfAnswerSelect(form, q); });
  }

  /* ---------- generic modal plumbing (shared with publish/preview/confirm) ---------- */
  function openModal(id) { const b = $(id); b.classList.add('is-open'); b.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const b = $(id); b.classList.remove('is-open'); b.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

  /* ========================================================================
     PUBLISH MODAL
     ======================================================================== */
  function openPublishModal() {
    const form = getForm(activeFormId);
    if (form.status !== 'Draft') { openResults(form.id); return; }
    publishDraft = { audienceType: form.audienceType || 'all', classIds: new Set(form.classIds || []), dueDate: form.dueDate || '' };
    publishStep = 1;
    renderPublishStep();
    openModal('publishModalBackdrop');
  }
  function publishRecipientCount() {
    const classes = allActiveClasses();
    if (publishDraft.audienceType === 'all') return window.PlayStore.getByType('Family').length;
    const classNames = new Set([...publishDraft.classIds].map((id) => { const c = classes.find((x) => x.id === id); return c ? c.name : null; }).filter(Boolean));
    const childIds = new Set(window.PlayStore.getByType('Child').filter((c) => c.status === 'Active' && classNames.has(c.room)).map((c) => c.id));
    return window.PlayStore.getByType('Family').filter((f) => (f.childIds || []).some((id) => childIds.has(id))).length;
  }
  function renderPublishStep() {
    $('publishStepIndicator').innerHTML = ['Audience', 'Due date', 'Confirm'].map((s, i) => `<span class="ann-step-dot${i + 1 === publishStep ? ' is-active' : i + 1 < publishStep ? ' is-done' : ''}">${i + 1}. ${s}</span>`).join('');
    const body = $('publishBody');
    const form = getForm(activeFormId);
    if (publishStep === 1) {
      const classes = allActiveClasses();
      body.innerHTML = `
        <div class="field">
          <label class="field__label">Audience</label>
          <div class="ann-audience-options">
            <button type="button" class="ann-audience-opt${publishDraft.audienceType === 'all' ? ' is-active' : ''}" data-audience="all">${ICON.users} All families</button>
            <button type="button" class="ann-audience-opt${publishDraft.audienceType === 'classes' ? ' is-active' : ''}" data-audience="classes">${ICON.users} Specific classes</button>
          </div>
        </div>
        ${publishDraft.audienceType === 'classes' ? `
        <div class="field"><label class="field__label">Classes</label><div class="pl-area-chip-row">${classes.map((c) => `<button type="button" class="pl-area-chip${publishDraft.classIds.has(c.id) ? ' is-active' : ''}" data-class-chip="${c.id}" style="--area-color: var(--color-brand-blue);">${escapeHtml(c.name)}</button>`).join('')}</div></div>` : ''}
        <p class="ann-recipient-count">${publishRecipientCount()} ${publishRecipientCount() === 1 ? 'family' : 'families'} will receive this form.</p>`;
      body.querySelectorAll('[data-audience]').forEach((btn) => btn.addEventListener('click', () => { publishDraft.audienceType = btn.dataset.audience; renderPublishStep(); }));
      body.querySelectorAll('[data-class-chip]').forEach((btn) => btn.addEventListener('click', () => { const id = btn.dataset.classChip; if (publishDraft.classIds.has(id)) publishDraft.classIds.delete(id); else publishDraft.classIds.add(id); renderPublishStep(); }));
    } else if (publishStep === 2) {
      body.innerHTML = `
        <p class="ann-recipient-count" style="margin-bottom: var(--space-4);">Sending to ${escapeHtml(audienceLabelFor(publishDraft))} · ${publishRecipientCount()} families.</p>
        <div class="field"><label class="field__label" for="pubDueDate">Due date</label><input class="input" id="pubDueDate" type="date" value="${publishDraft.dueDate}" min="${todayISO()}" /><p class="field__error" id="err-pubDueDate" hidden></p></div>`;
      $('pubDueDate').addEventListener('input', () => { publishDraft.dueDate = $('pubDueDate').value; });
    } else {
      const sigNote = hasSignatureQuestion(form) || form.formType === 'Acknowledgement';
      body.innerHTML = `
        <div class="ann-preview-card">
          <div class="ann-preview-card__title">${escapeHtml(form.title)}</div>
          <p class="ann-preview-card__body">${escapeHtml(form.description || 'No description provided.')}</p>
          <div class="ann-preview-card__meta">
            <div><span>Type</span><b>${escapeHtml(form.formType)}</b></div>
            <div><span>Audience</span><b>${escapeHtml(audienceLabelFor(publishDraft))} · ${publishRecipientCount()} families</b></div>
            <div><span>Due date</span><b>${formatDate(publishDraft.dueDate)}</b></div>
            <div><span>Questions</span><b>${form.questions.length}</b></div>
          </div>
        </div>
        ${sigNote ? `<p class="ws-section-empty">${ICON.signature} This form includes a required signature or acknowledgement.</p>` : ''}`;
    }
    $('publishBack').hidden = publishStep === 1;
    $('publishNext').textContent = publishStep === 3 ? 'Publish form' : 'Continue';
  }
  function audienceLabelFor(draft) {
    if (draft.audienceType === 'all') return 'All families';
    const classes = allActiveClasses();
    return [...draft.classIds].map((id) => (classes.find((c) => c.id === id) || {}).name).filter(Boolean).join(' + ') || 'No classes selected';
  }
  function wirePublishModal() {
    const backdrop = $('publishModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('publishModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('publishModalBackdrop'); });
    $('publishBack').addEventListener('click', () => { publishStep = Math.max(1, publishStep - 1); renderPublishStep(); });
    $('publishNext').addEventListener('click', () => {
      if (publishStep === 1) {
        if (publishDraft.audienceType === 'classes' && !publishDraft.classIds.size) { window.PlayShell.toast('error', 'Choose at least one class', ''); return; }
        publishStep = 2; renderPublishStep(); return;
      }
      if (publishStep === 2) {
        if (!publishDraft.dueDate) { document.getElementById('err-pubDueDate').textContent = 'Choose a due date.'; document.getElementById('err-pubDueDate').hidden = false; return; }
        if (publishDraft.dueDate < todayISO()) { document.getElementById('err-pubDueDate').textContent = 'Choose a date in the future.'; document.getElementById('err-pubDueDate').hidden = false; return; }
        publishStep = 3; renderPublishStep(); return;
      }
      const form = getForm(activeFormId);
      window.PlayStore.updateRecord(form.id, {
        status: 'Open', audienceType: publishDraft.audienceType, classIds: [...publishDraft.classIds],
        dueDate: publishDraft.dueDate, publishedAt: new Date().toISOString(),
      });
      closeModal('publishModalBackdrop');
      window.PlayShell.toast('success', 'Form published', form.title);
      window.PlayShell.addNotification({ title: 'Form published', text: form.title, module: 'communication', recordRoute: 'forms.html' });
      openResults(form.id);
    });
  }

  /* ========================================================================
     CONFIRM MODAL (close form / remind / delete question)
     ======================================================================== */
  function confirmAction(kind, payload) {
    pendingAction = { kind, payload };
    let copy;
    if (kind === 'deleteQuestion') {
      const form = getForm(activeFormId);
      const q = form.questions.find((x) => x.id === payload);
      const dependents = form.questions.filter((x) => x.showIf && x.showIf.questionId === payload);
      copy = { title: 'Delete question?', text: `"${q.title || 'Untitled question'}" will be removed.${dependents.length ? ' ' + dependents.length + ' question(s) that depend on it will no longer be conditional.' : ''}`, action: 'Delete question', cls: 'btn--destructive' };
    } else if (kind === 'closeForm') {
      copy = { title: 'Close form?', text: 'Closing stops families from submitting further responses. Previous responses stay available in Results.', action: 'Close form', cls: 'btn--destructive' };
    } else if (kind === 'remind') {
      const form = getForm(activeFormId);
      const count = nonResponders(form).length;
      copy = { title: 'Remind non-responders?', text: `This logs a reminder for the ${count} ${count === 1 ? 'family' : 'families'} who haven't responded to "${form.title}" yet.`, action: 'Remind non-responders', cls: 'btn--accent' };
    }
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
      const { kind, payload } = pendingAction;
      if (kind === 'deleteQuestion') { deleteQuestion(payload); }
      else if (kind === 'closeForm') {
        const form = getForm(payload);
        window.PlayStore.updateRecord(payload, { status: 'Closed', closedAt: new Date().toISOString() });
        window.PlayShell.toast('success', 'Form closed', form.title);
        if (currentView === 'builder') renderBuilder(); else renderResults();
      } else if (kind === 'remind') {
        const form = getForm(payload);
        const count = nonResponders(form).length;
        window.PlayStore.updateRecord(payload, { lastReminderAt: new Date().toISOString(), lastReminderCount: count });
        window.PlayShell.toast('success', 'Reminder logged', `Logged a reminder for ${count} ${count === 1 ? 'family' : 'families'}.`);
        if (currentView === 'results') renderResults();
      }
      closeModal('confirmModalBackdrop');
      pendingAction = null;
    });
  }

  /* ========================================================================
     PARENT PREVIEW — PHONE FRAME
     ======================================================================== */
  function openPreview(form) {
    previewState = { formId: form.id, answers: {}, files: {}, errors: {}, submitted: false };
    renderPreview();
    openModal('previewModalBackdrop');
  }
  function wirePreviewModal() {
    const backdrop = $('previewModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('previewModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('previewModalBackdrop'); });
  }
  function renderPreview() {
    const form = getForm(previewState.formId);
    const screen = $('previewScreen');
    if (previewState.submitted) {
      screen.innerHTML = `
        <div class="frm-parent-success">
          <div class="frm-parent-success__icon">${ICON.check}</div>
          <h3 style="font-family:var(--font-display); font-weight:600;">Thanks!</h3>
          <p style="margin-top:var(--space-2); font-size:var(--fs-body-sm); color:var(--color-text-secondary);">Your response would be submitted here. This is a demo preview — no response was actually recorded for a real family.</p>
        </div>`;
      return;
    }
    const visible = evaluateVisibility(form.questions, previewState.answers);
    const visibleQuestions = form.questions.filter((q) => visible.has(q.id));
    screen.innerHTML = `
      <div class="frm-parent-header">
        <div class="frm-parent-header__brand">${ICON.school}<span>Play School</span></div>
        <h2>${escapeHtml(form.title || 'Untitled form')}</h2>
        ${form.description ? `<p>${escapeHtml(form.description)}</p>` : ''}
        <div class="frm-parent-progress"><div class="progress-linear"><div class="progress-linear__bar" style="width:${pct(Object.keys(previewState.answers).length, visibleQuestions.length || 1)}%;"></div></div></div>
      </div>
      <div id="previewQuestions">${visibleQuestions.map((q) => previewQuestionHtml(q)).join('')}</div>
      <button class="btn btn--accent frm-parent-submit" type="button" id="previewSubmitBtn">Submit</button>
    `;
    wirePreviewInputs(form, visibleQuestions);
    $('previewSubmitBtn').addEventListener('click', () => submitPreview(form));
  }
  function previewQuestionHtml(q) {
    const err = previewState.errors[q.id];
    let control = '';
    const val = previewState.answers[q.id];
    if (q.type === 'short') control = `<input class="input" data-pq="${q.id}" type="text" value="${escapeHtml(val || '')}" />`;
    else if (q.type === 'long') control = `<textarea class="textarea" data-pq="${q.id}" rows="3">${escapeHtml(val || '')}</textarea>`;
    else if (q.type === 'single') control = q.options.map((o) => `<label class="frm-pq-option${val === o.id ? ' is-selected' : ''}"><input type="radio" name="pq-${q.id}" data-pq="${q.id}" value="${o.id}" ${val === o.id ? 'checked' : ''} />${escapeHtml(o.label)}</label>`).join('');
    else if (q.type === 'multi') control = q.options.map((o) => `<label class="frm-pq-option${Array.isArray(val) && val.includes(o.id) ? ' is-selected' : ''}"><input type="checkbox" data-pq="${q.id}" value="${o.id}" ${Array.isArray(val) && val.includes(o.id) ? 'checked' : ''} />${escapeHtml(o.label)}</label>`).join('');
    else if (q.type === 'rating') control = `<div class="frm-pq-rating">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-pq="${q.id}" data-rating="${n}" class="${val === n ? 'is-selected' : ''}">${n}</button>`).join('')}</div>`;
    else if (q.type === 'date') control = `<input class="input" data-pq="${q.id}" type="date" value="${val || ''}" ${q.restrictFuture ? `min="${todayISO()}"` : ''} />`;
    else if (q.type === 'yesno') control = `<div class="frm-pq-yesno">${['Yes', 'No'].map((o) => `<button type="button" data-pq="${q.id}" data-val="${o}" class="${val === o ? 'is-selected' : ''}">${o}</button>`).join('')}</div>`;
    else if (q.type === 'file') control = `<label class="frm-pq-file${val ? ' has-file' : ''}">${ICON.upload}<span>${val ? escapeHtml(val.name) : 'Tap to choose a file'}</span><span class="frm-pq-file__hint">Accepts ${escapeHtml(q.fileTypes || 'any file')} · up to ${q.maxSizeMB || 5}MB</span><input type="file" data-pq="${q.id}" accept="${escapeHtml(q.fileTypes || '')}" style="display:none;" /></label>`;
    else if (q.type === 'signature') control = `<div class="frm-sig-pad-wrap"><canvas class="frm-sig-pad" data-pq="${q.id}" width="320" height="140"></canvas></div><div class="frm-sig-actions"><span class="frm-sig-hint">Sign with your finger or mouse</span><button type="button" class="frm-sig-clear" data-clear-sig="${q.id}">Clear</button></div>`;
    return `
      <div class="frm-pq" data-qwrap="${q.id}">
        <div class="frm-pq__title">${escapeHtml(q.title || 'Untitled question')}${q.required ? '<span class="frm-pq__req">*</span>' : ''}</div>
        ${q.description ? `<div class="frm-pq__desc">${escapeHtml(q.description)}</div>` : ''}
        <div class="frm-pq__body">${control}</div>
        ${err ? `<div class="frm-pq__error">${escapeHtml(err)}</div>` : ''}
      </div>`;
  }
  function wirePreviewInputs(form, visibleQuestions) {
    const root = $('previewQuestions');
    visibleQuestions.forEach((q) => {
      if (q.type === 'short' || q.type === 'long') {
        const el = root.querySelector(`[data-pq="${q.id}"]`);
        el.addEventListener('input', () => { previewState.answers[q.id] = el.value; delete previewState.errors[q.id]; renderPreview(); });
      } else if (q.type === 'single') {
        root.querySelectorAll(`input[data-pq="${q.id}"]`).forEach((r) => r.addEventListener('change', () => { previewState.answers[q.id] = r.value; delete previewState.errors[q.id]; renderPreview(); }));
      } else if (q.type === 'multi') {
        root.querySelectorAll(`input[data-pq="${q.id}"]`).forEach((c) => c.addEventListener('change', () => {
          const current = new Set(previewState.answers[q.id] || []);
          if (c.checked) current.add(c.value); else current.delete(c.value);
          previewState.answers[q.id] = [...current];
          delete previewState.errors[q.id]; renderPreview();
        }));
      } else if (q.type === 'rating') {
        root.querySelectorAll(`[data-pq="${q.id}"]`).forEach((b) => b.addEventListener('click', () => { previewState.answers[q.id] = Number(b.dataset.rating); delete previewState.errors[q.id]; renderPreview(); }));
      } else if (q.type === 'date') {
        const el = root.querySelector(`[data-pq="${q.id}"]`);
        el.addEventListener('input', () => { previewState.answers[q.id] = el.value; delete previewState.errors[q.id]; renderPreview(); });
      } else if (q.type === 'yesno') {
        root.querySelectorAll(`[data-pq="${q.id}"]`).forEach((b) => b.addEventListener('click', () => { previewState.answers[q.id] = b.dataset.val; delete previewState.errors[q.id]; renderPreview(); }));
      } else if (q.type === 'file') {
        const input = root.querySelector(`input[data-pq="${q.id}"]`);
        input.addEventListener('change', () => {
          const file = input.files[0];
          if (!file) return;
          const maxBytes = (q.maxSizeMB || 5) * 1024 * 1024;
          if (file.size > maxBytes) { previewState.errors[q.id] = `File is too large (max ${q.maxSizeMB || 5}MB).`; renderPreview(); return; }
          previewState.answers[q.id] = { name: file.name, size: file.size, type: file.type };
          delete previewState.errors[q.id];
          renderPreview();
        });
      } else if (q.type === 'signature') {
        wireSignaturePad(root.querySelector(`canvas[data-pq="${q.id}"]`), q.id);
        const clearBtn = root.querySelector(`[data-clear-sig="${q.id}"]`);
        clearBtn.addEventListener('click', () => { delete previewState.answers[q.id]; renderPreview(); });
      }
    });
  }
  function wireSignaturePad(canvas, qid) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1d2340'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let drawing = false;
    const existing = previewState.answers[qid];
    let hasStroke = !!(existing && existing.dataUrl);
    function pos(e) { const r = canvas.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return { x: (p.clientX - r.left) * (canvas.width / r.width), y: (p.clientY - r.top) * (canvas.height / r.height) }; }
    function start(e) { e.preventDefault(); drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
    function move(e) { if (!drawing) return; e.preventDefault(); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hasStroke = true; }
    function end() { if (!drawing) return; drawing = false; if (hasStroke) previewState.answers[qid] = { dataUrl: canvas.toDataURL('image/png'), signedAt: new Date().toISOString() }; }
    canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false }); canvas.addEventListener('touchmove', move, { passive: false }); canvas.addEventListener('touchend', end);
  }
  function submitPreview(form) {
    const visible = evaluateVisibility(form.questions, previewState.answers);
    const missing = form.questions.filter((q) => q.required && visible.has(q.id) && isAnswerEmpty(q, previewState.answers[q.id]));
    if (missing.length) {
      missing.forEach((q) => { previewState.errors[q.id] = 'This question is required.'; });
      renderPreview();
      const firstEl = document.querySelector(`[data-qwrap="${missing[0].id}"]`);
      if (firstEl) firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    previewState.submitted = true;
    renderPreview();
  }

  /* ========================================================================
     RESULTS
     ======================================================================== */
  function renderResults() {
    const form = getForm(activeFormId);
    if (!form) { goToList(); return; }
    const recipients = recipientsFor(form);
    const responses = responsesFor(form.id);
    const pending = nonResponders(form).length;

    $('resultsHeaderMain').innerHTML = `
      <h1>${escapeHtml(form.title)}</h1>
      <div class="frm-results-header__badges">${statusBadge(form.status)}${typeBadge(form.formType)}</div>`;
    const actions = [];
    actions.push(`<button class="btn btn--secondary" type="button" id="resPreviewBtn">${ICON.eye}<span>Preview</span></button>`);
    if (form.status === 'Draft') actions.push(`<button class="btn btn--accent" type="button" id="resEditBtn">Edit in builder</button>`);
    if (form.status === 'Open') {
      actions.push(`<button class="btn btn--ghost" type="button" id="resRemindBtn">Remind non-responders</button>`);
      actions.push(`<button class="btn btn--destructive" type="button" id="resCloseBtn">Close form</button>`);
    }
    actions.push(`<button class="btn btn--secondary" type="button" id="resExportBtn">${ICON.download}<span>Export CSV</span></button>`);
    $('resultsHeaderActions').innerHTML = actions.join('');

    $('resultsMeta').innerHTML = [
      { label: 'Audience', value: audienceSummary(form) },
      { label: 'Due date', value: formatDate(form.dueDate) },
      { label: 'Response rate', value: responseRatePct(form) + '%' },
      { label: 'Submitted / Pending', value: `${responses.length} / ${Math.max(pending, 0)}` },
    ].map((m) => `<div class="frm-results-meta__card"><div class="frm-results-meta__value">${escapeHtml(String(m.value))}</div><div class="frm-results-meta__label">${escapeHtml(m.label)}</div></div>`).join('');

    $('resultsBackBtn').onclick = goToList;
    $('resPreviewBtn').onclick = () => openPreview(form);
    const editBtn = $('resEditBtn'); if (editBtn) editBtn.onclick = () => openBuilder(form.id);
    const remindBtn = $('resRemindBtn'); if (remindBtn) remindBtn.onclick = () => confirmAction('remind', form.id);
    const closeBtn = $('resCloseBtn'); if (closeBtn) closeBtn.onclick = () => confirmAction('closeForm', form.id);
    $('resExportBtn').onclick = () => exportCsv(form, responses);

    renderResultsQuestions(form, responses);
    $('responsesSearch').value = responsesSearch;
    $('responsesSearch').oninput = () => { responsesSearch = $('responsesSearch').value; renderResponsesTable(form, responses); };
    renderResponsesTable(form, responses);
  }
  function renderResultsQuestions(form, responses) {
    const wrap = $('resultsQuestions');
    if (!form.questions.length) { wrap.innerHTML = `<div class="state-panel"><div class="state-panel__icon">${ICON.clipboard}</div><div class="state-panel__title">No questions in this form</div></div>`; return; }
    wrap.innerHTML = form.questions.map((q, idx) => resultQuestionCardHtml(q, responses, idx)).join('');
    wrap.querySelectorAll('.frm-text-answers').forEach((el) => {});
    const bars = wrap.querySelectorAll('[data-anim-width]');
    requestAnimationFrame(() => requestAnimationFrame(() => bars.forEach((b) => { b.style.width = b.dataset.animWidth + '%'; })));
  }
  function answeredResponses(q, responses) { return responses.filter((r) => Object.prototype.hasOwnProperty.call(r.answers, q.id) && !isAnswerEmpty(q, r.answers[q.id])); }
  function resultQuestionCardHtml(q, responses, idx) {
    const answered = answeredResponses(q, responses);
    let body = '';
    if (q.type === 'single' || q.type === 'multi' || q.type === 'yesno') {
      const counts = new Map();
      const options = q.type === 'yesno' ? [{ id: 'Yes', label: 'Yes' }, { id: 'No', label: 'No' }] : q.options;
      options.forEach((o) => counts.set(o.id, 0));
      answered.forEach((r) => {
        const val = r.answers[q.id];
        if (q.type === 'multi') (val || []).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
        else counts.set(val, (counts.get(val) || 0) + 1);
      });
      const denom = q.type === 'multi' ? answered.length : answered.length;
      body = options.map((o) => {
        const c = counts.get(o.id) || 0;
        const p = pct(c, denom);
        return `<div class="frm-dist-row"><span class="frm-dist-row__label">${escapeHtml(o.label)}</span><div class="progress-linear"><div class="progress-linear__bar" data-anim-width="${p}" style="width:0%;"></div></div><span class="frm-dist-row__count">${c} · ${p}%</span></div>`;
      }).join('') || `<p class="ws-section-empty">No responses yet.</p>`;
    } else if (q.type === 'rating') {
      const sum = answered.reduce((s, r) => s + (r.answers[q.id] || 0), 0);
      const avg = answered.length ? (sum / answered.length).toFixed(1) : '—';
      const dist = [1, 2, 3, 4, 5].map((n) => answered.filter((r) => r.answers[q.id] === n).length);
      body = `
        <div class="frm-rating-summary">
          <div class="frm-rating-summary__avg"><div class="frm-rating-summary__avg-value">${avg}</div><div class="frm-rating-summary__avg-label">avg out of 5</div></div>
          <div class="frm-rating-summary__dist">${[1, 2, 3, 4, 5].map((n, i) => `<div class="frm-dist-row"><span class="frm-dist-row__label">${n} star${n > 1 ? 's' : ''}</span><div class="progress-linear"><div class="progress-linear__bar" data-anim-width="${pct(dist[i], answered.length)}" style="width:0%;"></div></div><span class="frm-dist-row__count">${dist[i]}</span></div>`).join('')}</div>
        </div>`;
    } else if (q.type === 'short' || q.type === 'long') {
      body = answered.length ? `<div class="frm-text-answers">${answered.map((r) => `<div class="frm-text-answer"><div class="frm-text-answer__meta">${escapeHtml(r.respondentName)} · ${formatDateTime(r.submittedAt)}</div><div class="frm-text-answer__text">${escapeHtml(r.answers[q.id])}</div></div>`).join('')}</div>` : `<p class="ws-section-empty">No answers yet.</p>`;
    } else if (q.type === 'date') {
      body = answered.length ? `<div class="frm-text-answers">${answered.map((r) => `<div class="frm-text-answer"><div class="frm-text-answer__meta">${escapeHtml(r.respondentName)}</div><div class="frm-text-answer__text">${formatDate(r.answers[q.id])}</div></div>`).join('')}</div>` : `<p class="ws-section-empty">No dates submitted yet.</p>`;
    } else if (q.type === 'file') {
      body = answered.length ? `<div class="frm-file-list">${answered.map((r) => { const f = r.answers[q.id]; return `<div class="frm-file-row">${ICON.file}<span class="frm-file-row__name">${escapeHtml(f.name)}</span><span class="frm-file-row__meta">${Math.round(f.size / 1024)} KB · ${escapeHtml(r.respondentName)}</span></div>`; }).join('')}</div>` : `<p class="ws-section-empty">No files uploaded yet.</p>`;
    } else if (q.type === 'signature') {
      body = responses.length ? `<div class="frm-sig-gallery">${responses.map((r) => { const s = r.answers[q.id]; return s && s.dataUrl ? `<div class="frm-sig-item"><img src="${s.dataUrl}" alt="Signature" /><div class="frm-sig-item__name">${escapeHtml(r.respondentName)}</div><div class="frm-sig-item__time">${formatDateTime(s.signedAt)}</div></div>` : `<div class="frm-sig-item not-signed"><div class="frm-sig-item__name">${escapeHtml(r.respondentName)}</div><div class="frm-sig-item__time">Not signed</div></div>`; }).join('')}</div>` : `<p class="ws-section-empty">No responses yet.</p>`;
    }
    return `
      <div class="frm-rq-card" style="animation-delay:${Math.min(idx, 6) * 40}ms;">
        <div class="frm-rq-card__head"><span class="frm-rq-card__title">${idx + 1}. ${escapeHtml(q.title || 'Untitled question')}</span><span class="frm-rq-card__count">${answered.length} answered</span></div>
        ${body}
      </div>`;
  }
  function renderResponsesTable(form, responses) {
    const q = responsesSearch.trim().toLowerCase();
    const filtered = q ? responses.filter((r) => r.respondentName.toLowerCase().includes(q)) : responses;
    const panel = $('resultsResponses');
    const needsSig = hasSignatureQuestion(form);
    if (!filtered.length) {
      panel.innerHTML = `<div class="state-panel"><div class="state-panel__icon">${ICON.users}</div><div class="state-panel__title">No responses yet</div><p class="state-panel__text">Responses will appear here as families submit this form.</p></div>`;
      return;
    }
    const sorted = filtered.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    panel.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Respondent</th><th>Submitted</th>${needsSig ? '<th>Signature</th>' : ''}<th></th></tr></thead>
          <tbody>${sorted.map((r) => responseRowHtml(r, needsSig)).join('')}</tbody>
        </table>
        <div class="table-card">${sorted.map((r) => responseCardHtml(r, needsSig)).join('')}</div>
      </div>`;
    panel.querySelectorAll('[data-view-response]').forEach((el) => el.addEventListener('click', () => openResponseDrawer(form, window.PlayStore.getById(el.dataset.viewResponse))));
  }
  function signatureStatusHtml(form, r) {
    const sigQ = form.questions.find((q) => q.type === 'signature');
    if (!sigQ) return '—';
    const s = r.answers[sigQ.id];
    return s && s.dataUrl ? `<span class="frm-sig-status is-signed">${ICON.check} Signed</span>` : `<span class="frm-sig-status is-missing">Not signed</span>`;
  }
  function responseRowHtml(r, needsSig) {
    const form = getForm(r.formId);
    return `
      <tr class="frm-row" data-view-response="${r.id}">
        <td class="cell-primary">${escapeHtml(r.respondentName)}</td>
        <td class="cell-muted">${formatDateTime(r.submittedAt)}</td>
        ${needsSig ? `<td>${signatureStatusHtml(form, r)}</td>` : ''}
        <td><button class="btn btn--ghost" type="button" style="pointer-events:none;">View</button></td>
      </tr>`;
  }
  function responseCardHtml(r, needsSig) {
    const form = getForm(r.formId);
    return `
      <div class="table-card__item frm-card" data-view-response="${r.id}">
        <div class="table-card__head"><span class="cell-primary">${escapeHtml(r.respondentName)}</span></div>
        <div class="table-card__row"><span class="table-card__label">Submitted</span><span class="table-card__value">${formatDateTime(r.submittedAt)}</span></div>
        ${needsSig ? `<div class="table-card__row"><span class="table-card__label">Signature</span><span class="table-card__value">${signatureStatusHtml(form, r)}</span></div>` : ''}
      </div>`;
  }
  function wireResponseDrawer() {
    const backdrop = $('responseDrawerBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('responseDrawerBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('responseDrawerBackdrop'); });
  }
  function openResponseDrawer(form, response) {
    $('responseDrawerTitle').textContent = response.respondentName;
    $('responseDrawerBody').innerHTML = `
      <p class="ws-section-empty" style="padding:0 0 var(--space-4);">Submitted ${formatDateTime(response.submittedAt)}</p>
      ${form.questions.filter((q) => Object.prototype.hasOwnProperty.call(response.answers, q.id)).map((q) => `
        <div class="frm-response-detail__row">
          <div class="frm-response-detail__q">${escapeHtml(q.title || 'Untitled question')}</div>
          <div class="frm-response-detail__a">${renderAnswerValue(q, response.answers[q.id])}</div>
        </div>`).join('')}
    `;
    openModal('responseDrawerBackdrop');
  }
  function renderAnswerValue(q, value) {
    if (q.type === 'multi') return escapeHtml((value || []).map((id) => (q.options.find((o) => o.id === id) || {}).label || id).join(', '));
    if (q.type === 'single') return escapeHtml((q.options.find((o) => o.id === value) || {}).label || value);
    if (q.type === 'rating') return escapeHtml(value + ' / 5');
    if (q.type === 'date') return escapeHtml(formatDate(value));
    if (q.type === 'file') return escapeHtml(value.name + ' (' + Math.round(value.size / 1024) + ' KB)');
    if (q.type === 'signature') return value && value.dataUrl ? `<img src="${value.dataUrl}" alt="Signature" /><div style="margin-top:4px; font-size:var(--fs-caption); color:var(--color-text-muted);">Signed ${formatDateTime(value.signedAt)}</div>` : 'Not signed';
    return escapeHtml(value);
  }

  /* ========================================================================
     CSV EXPORT
     ======================================================================== */
  function csvCell(value) {
    const s = String(value == null ? '' : value);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function answerToCsv(q, value) {
    if (value == null) return '';
    if (q.type === 'multi') return (value || []).map((id) => (q.options.find((o) => o.id === id) || {}).label || id).join('; ');
    if (q.type === 'single') return (q.options.find((o) => o.id === value) || {}).label || value;
    if (q.type === 'rating') return String(value);
    if (q.type === 'date') return formatDate(value);
    if (q.type === 'file') return value.name ? value.name + ' (' + Math.round(value.size / 1024) + ' KB)' : '';
    if (q.type === 'signature') return value.dataUrl ? 'Signed ' + formatDateTime(value.signedAt) : 'Not signed';
    return String(value);
  }
  function exportCsv(form, responses) {
    const needsSig = hasSignatureQuestion(form);
    const headers = ['Respondent', 'Submitted At', ...form.questions.map((q) => q.title || 'Untitled question')];
    if (needsSig) headers.push('Signature status', 'Signed at');
    const rows = [headers];
    responses.forEach((r) => {
      const row = [r.respondentName, formatDateTime(r.submittedAt)];
      form.questions.forEach((q) => row.push(Object.prototype.hasOwnProperty.call(r.answers, q.id) ? answerToCsv(q, r.answers[q.id]) : ''));
      if (needsSig) {
        const sigQ = form.questions.find((q) => q.type === 'signature');
        const s = sigQ ? r.answers[sigQ.id] : null;
        row.push(s && s.dataUrl ? 'Signed' : 'Not signed', s && s.dataUrl ? formatDateTime(s.signedAt) : '');
      }
      rows.push(row);
    });
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = slug(form.title) + '-responses-' + todayISO() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    window.PlayShell.toast('success', 'CSV exported', responses.length ? `${responses.length} responses exported.` : 'No responses yet — exported headers only.');
  }
})();
