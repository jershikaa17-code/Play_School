/* ==========================================================================
   PLAY SCHOOL — Online Application & Consent Form Builder (S06 integration)
   Reuses: store.js ('ApplicationForm' records via the same PlayStore
   addRecord/updateRecord/getByType API as every other page; a submission
   creates a real 'Enquiry' record — the same type admissions.js and
   applicant-profile.js already read/write, not a second system), shell.js
   (shell/toasts/notifications), forms.css (the three-panel builder
   scaffold and phone-preview frame, built for S31 Family Forms and reused
   here verbatim), announcements.css (.ann-header), class-workspace.css
   (.ws-icon-btn).

   Honest limitation: this is a static, frontend-only project with one
   shared localStorage per browser. The "published" link (apply.html?form=
   <slug>) is a real, working page — submitting it really does create an
   Enquiry — but only within the SAME browser the admin is using. There is
   no backend, so a form opened on a different device/browser cannot write
   back to this admin's data. This is stated in the publish dialog's
   summary, not hidden.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function slug(str) { return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'application'; }
  function formatDateTime(iso) { if (!iso) return '—'; return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  const ICON = {
    section: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>',
    short: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="14" y2="15"/></svg>',
    long: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>',
    date: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    dropdown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/><polyline points="17 15 20 18 17 21" transform="translate(0,-18)"/></svg>',
    multiselect: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="4" height="4" rx="1"/><rect x="3" y="14" width="4" height="4" rx="1"/><line x1="11" y1="6" x2="21" y2="6"/><line x1="11" y1="16" x2="21" y2="16"/></svg>',
    checkbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="8 12 11 15 16 9"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    signature: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17s3-1 5-4 3-7 5-7 1 5 3 7 5 4 5 4"/><line x1="3" y1="21" x2="21" y2="21"/></svg>',
    consent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/><polyline points="9 12 11 14 15 10"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    grip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    phoneScreen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>',
  };

  const FIELD_TYPES = [
    { type: 'section', label: 'Section Header', icon: ICON.section },
    { type: 'short', label: 'Short Text', icon: ICON.short },
    { type: 'long', label: 'Long Text', icon: ICON.long },
    { type: 'email', label: 'Email', icon: ICON.email },
    { type: 'phone', label: 'Phone', icon: ICON.phone },
    { type: 'date', label: 'Date', icon: ICON.date },
    { type: 'dropdown', label: 'Dropdown', icon: ICON.dropdown },
    { type: 'multiselect', label: 'Multi-select', icon: ICON.multiselect },
    { type: 'checkbox', label: 'Checkbox', icon: ICON.checkbox },
    { type: 'file', label: 'File Upload', icon: ICON.file },
    { type: 'signature', label: 'Signature', icon: ICON.signature },
    { type: 'consent', label: 'Consent Statement', icon: ICON.consent },
  ];
  function typeMeta(t) { return FIELD_TYPES.find((f) => f.type === t) || FIELD_TYPES[1]; }
  const PROFILE_MAPPINGS = [
    { key: 'none', label: 'Not mapped' },
    { key: 'childName', label: "Child's name" },
    { key: 'childDob', label: 'Child date of birth' },
    { key: 'program', label: 'Preferred program' },
    { key: 'parentName', label: 'Parent / guardian name' },
    { key: 'parentEmail', label: 'Parent email' },
    { key: 'parentPhone', label: 'Parent phone' },
    { key: 'consent', label: 'Consent' },
    { key: 'notes', label: 'Notes' },
  ];

  function defaultField(type) {
    const base = { id: uid('FLD'), type, label: '', helpText: '', required: type === 'consent' || type === 'signature', placeholder: '', profileMapping: 'none' };
    if (type === 'section') { base.label = 'New section'; base.required = false; }
    if (type === 'short') base.label = 'Short answer question';
    if (type === 'long') base.label = 'Long answer question';
    if (type === 'email') { base.label = 'Email address'; base.profileMapping = 'parentEmail'; }
    if (type === 'phone') { base.label = 'Phone number'; base.profileMapping = 'parentPhone'; }
    if (type === 'date') base.label = 'Date';
    if (type === 'dropdown' || type === 'multiselect') { base.label = type === 'dropdown' ? 'Choose an option' : 'Select all that apply'; base.options = [{ id: uid('OPT'), label: 'Option 1' }, { id: uid('OPT'), label: 'Option 2' }]; }
    if (type === 'checkbox') base.label = 'I agree';
    if (type === 'file') { base.label = 'Upload a document'; base.fileTypes = '.pdf,.jpg,.png'; base.maxSizeMB = 5; }
    if (type === 'signature') base.label = 'Parent or guardian signature';
    if (type === 'consent') { base.label = 'I consent to Play School contacting me about this application and storing the information provided.'; base.profileMapping = 'consent'; }
    return base;
  }

  /* ---------- state ---------- */
  let currentView = 'list';
  let activeFormId = null;
  let selectedFieldId = null;
  let draggingFieldId = null;
  let paletteSearch = '';
  let undoStack = [];
  let redoStack = [];
  let isDirty = false;
  let pendingConfirm = null;
  let publishSubmitting = false;
  let previewMode = 'desktop';
  let previewAnswers = {};
  let previewSubmitted = false;
  let previewSubmitting = false;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    window.PlayShell.login();
    window.PlayShell.mount('application-builder', 'Online Application');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    wireList();
    wireBuilderTopbar();
    wirePalette();
    wireSettingsClose();
    wireConfirmModal();
    wirePublishModal();
    wirePreviewModal();
    window.addEventListener('resize', debounce(syncBuilderWidth, 150));

    goToList();
  }

  /* ---------- data access ---------- */
  function allForms() { return window.PlayStore.getByType('ApplicationForm'); }
  function getForm(id) { return window.PlayStore.getById(id); }
  function activeForm() { return getForm(activeFormId); }

  /* ---------- scene switching ---------- */
  function hideAllScenes() { $('abListScene').hidden = true; $('abBuilderScene').hidden = true; }
  function goToList() {
    currentView = 'list'; activeFormId = null; selectedFieldId = null; undoStack = []; redoStack = [];
    hideAllScenes();
    $('abListScene').hidden = false;
    renderList();
  }
  function openBuilder(formId) {
    currentView = 'builder'; activeFormId = formId; selectedFieldId = null; isDirty = false; undoStack = []; redoStack = [];
    hideAllScenes();
    $('abBuilderScene').hidden = false;
    syncBuilderWidth();
    renderBuilder();
  }
  function syncBuilderWidth() {
    if (currentView !== 'builder') return;
    const blocked = window.innerWidth < 768;
    $('abBuilderBlocked').hidden = !blocked;
    $('abBuilderDesktop').hidden = blocked;
    if (blocked) renderBlockedActions();
  }
  function renderBlockedActions() {
    const form = activeForm();
    $('abBlockedIcon').innerHTML = ICON.inbox;
    const linkRow = form && form.status === 'Live' ? `
      <div class="ab-link-row"><input class="input" readonly value="${escapeHtml(publicUrlFor(form))}" onclick="this.select()" /><button class="btn btn--secondary" type="button" id="abBlockedCopyBtn">Copy link</button></div>
      <button class="btn btn--secondary" type="button" id="abBlockedPreviewBtn">Preview form</button>` : '<p class="card__text" style="font-size:var(--fs-caption); color:var(--color-text-muted);">This form has not been published yet.</p>';
    $('abBlockedActions').innerHTML = `<button class="btn btn--accent" type="button" id="abBlockedBackBtn">Back to forms list</button>${linkRow}`;
    $('abBlockedBackBtn').addEventListener('click', goToList);
    const copyBtn = $('abBlockedCopyBtn'); if (copyBtn) copyBtn.addEventListener('click', () => copyLink(publicUrlFor(form)));
    const prevBtn = $('abBlockedPreviewBtn'); if (prevBtn) prevBtn.addEventListener('click', openPreviewModal);
  }

  /* ========================================================================
     LIST SCENE
     ======================================================================== */
  function wireList() {
    $('abCreateBtn').addEventListener('click', () => {
      const form = { id: uid('APPF'), type: 'ApplicationForm', title: 'Online Application Form', status: 'Draft', publicSlug: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), publishedAt: null, sections: [] };
      window.PlayStore.addRecord(form);
      openBuilder(form.id);
    });
  }
  function renderList() {
    const forms = allForms();
    const host = $('abListHost');
    if (!forms.length) {
      host.innerHTML = `<div class="state-panel"><div class="state-panel__icon">${ICON.inbox}</div><div class="state-panel__title">No application forms yet</div><p class="state-panel__text">Create your first online application form to start collecting enquiries from your website.</p><div class="state-panel__action"><button class="btn btn--accent" type="button" id="abEmptyCreateBtn">New form</button></div></div>`;
      $('abEmptyCreateBtn').addEventListener('click', () => $('abCreateBtn').click());
      return;
    }
    host.innerHTML = `<div class="ab-list">${forms.map((f, i) => listCardHtml(f, i)).join('')}</div>`;
    host.querySelectorAll('[data-open-form]').forEach((card) => card.addEventListener('click', () => openBuilder(card.dataset.openForm)));
  }
  function listCardHtml(f, i) {
    const fieldCount = (f.sections || []).reduce((s, sec) => s + sec.fields.length, 0);
    return `
      <div class="ab-list-card" data-open-form="${f.id}" style="animation-delay:${i * 40}ms">
        <div class="ab-list-card__head">
          <span class="ab-list-card__title">${escapeHtml(f.title)}</span>
          <span class="badge ${f.status === 'Live' ? 'is-live' : 'is-draft'}" id="" style="background:${f.status === 'Live' ? 'color-mix(in srgb, var(--color-success) 16%, transparent)' : 'var(--color-surface-glass-light)'}; color:${f.status === 'Live' ? 'var(--color-success)' : 'var(--color-text-secondary)'};">${f.status}</span>
        </div>
        <div class="ab-list-card__meta">${fieldCount} field${fieldCount === 1 ? '' : 's'} · Updated ${formatDateTime(f.updatedAt)}</div>
      </div>`;
  }

  /* ========================================================================
     HISTORY (undo/redo)
     ======================================================================== */
  function snapshot() {
    const form = activeForm();
    undoStack.push(JSON.stringify({ title: form.title, sections: form.sections }));
    if (undoStack.length > 30) undoStack.shift();
    redoStack = [];
    updateUndoRedoButtons();
  }
  function updateForm(patch, { skipSnapshot } = {}) {
    if (!skipSnapshot) snapshot();
    patch.updatedAt = new Date().toISOString();
    window.PlayStore.updateRecord(activeFormId, patch);
    isDirty = true;
    renderBuilder();
  }
  function undo() {
    if (!undoStack.length) return;
    const form = activeForm();
    redoStack.push(JSON.stringify({ title: form.title, sections: form.sections }));
    const prev = JSON.parse(undoStack.pop());
    window.PlayStore.updateRecord(activeFormId, { title: prev.title, sections: prev.sections, updatedAt: new Date().toISOString() });
    isDirty = true;
    updateUndoRedoButtons();
    renderBuilder();
  }
  function redo() {
    if (!redoStack.length) return;
    const form = activeForm();
    undoStack.push(JSON.stringify({ title: form.title, sections: form.sections }));
    const next = JSON.parse(redoStack.pop());
    window.PlayStore.updateRecord(activeFormId, { title: next.title, sections: next.sections, updatedAt: new Date().toISOString() });
    isDirty = true;
    updateUndoRedoButtons();
    renderBuilder();
  }
  function updateUndoRedoButtons() {
    $('abUndoBtn').disabled = !undoStack.length;
    $('abRedoBtn').disabled = !redoStack.length;
  }

  /* ========================================================================
     BUILDER TOPBAR
     ======================================================================== */
  function wireBuilderTopbar() {
    $('abBackBtn').addEventListener('click', goToList);
    $('abTitleInput').addEventListener('input', () => updateForm({ title: $('abTitleInput').value }));
    $('abUndoBtn').addEventListener('click', undo);
    $('abRedoBtn').addEventListener('click', redo);
    $('abPreviewBtn').addEventListener('click', openPreviewModal);
    $('abCopyLinkBtn').addEventListener('click', () => copyLink(publicUrlFor(activeForm())));
    $('abPublishBtn').addEventListener('click', openPublishModal);
  }
  function publicUrlFor(form) {
    const base = window.location.href.replace(/[^/]*$/, '');
    return base + 'apply.html?form=' + encodeURIComponent(form.publicSlug || form.id);
  }
  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      window.PlayShell.toast('success', 'Link copied', '');
    } catch (e) {
      window.PlayShell.toast('error', 'Could not copy automatically', 'Select and copy the link shown below.');
    }
  }

  function renderBuilder() {
    const form = activeForm();
    if (!form) { goToList(); return; }
    $('abTitleInput').value = form.title;
    const badge = $('abStatusBadge');
    badge.textContent = form.status;
    badge.className = 'badge ' + (form.status === 'Live' ? 'is-live' : 'is-draft');
    const fieldCount = (form.sections || []).reduce((s, sec) => s + sec.fields.length, 0);
    $('abFieldCount').textContent = `${fieldCount} field${fieldCount === 1 ? '' : 's'}`;
    $('abUnsavedIndicator').hidden = !isDirty;
    $('abCopyLinkBtn').hidden = form.status !== 'Live';
    $('abPublishBtnLabel').textContent = form.status === 'Live' ? 'Publish changes' : 'Publish';
    updateUndoRedoButtons();
    renderPaletteList();
    renderCanvas();
    renderSettings();
  }

  /* ========================================================================
     PALETTE (left panel)
     ======================================================================== */
  function wirePalette() {
    $('abPaletteSearch').addEventListener('input', () => { paletteSearch = $('abPaletteSearch').value.trim().toLowerCase(); renderPaletteList(); });
  }
  function renderPaletteList() {
    const list = FIELD_TYPES.filter((f) => !paletteSearch || f.label.toLowerCase().includes(paletteSearch));
    $('abPaletteList').innerHTML = list.map((f) => `<button type="button" class="frm-palette-item" data-add-type="${f.type}">${f.icon}<span>${f.label}</span></button>`).join('') || '<p class="card__text" style="font-size:var(--fs-caption); color:var(--color-text-muted); padding: var(--space-3);">No matching field types.</p>';
    $('abPaletteList').querySelectorAll('[data-add-type]').forEach((btn) => btn.addEventListener('click', () => addField(btn.dataset.addType)));
  }
  function addField(type) {
    const form = activeForm();
    snapshot();
    const field = defaultField(type);
    const sections = (form.sections || []).slice();
    if (type === 'section') {
      sections.push({ id: uid('SEC'), title: field.label, fields: [] });
    } else {
      if (!sections.length) sections.push({ id: uid('SEC'), title: 'Section 1', fields: [] });
      sections[sections.length - 1] = Object.assign({}, sections[sections.length - 1], { fields: sections[sections.length - 1].fields.concat([field]) });
    }
    updateForm({ sections }, { skipSnapshot: true });
    if (type !== 'section') selectedFieldId = field.id;
    renderBuilder();
  }

  /* ========================================================================
     CANVAS (centre panel)
     ======================================================================== */
  function findFieldLocation(fieldId) {
    const form = activeForm();
    for (let si = 0; si < (form.sections || []).length; si++) {
      const fi = form.sections[si].fields.findIndex((f) => f.id === fieldId);
      if (fi !== -1) return { si, fi };
    }
    return null;
  }
  function renderCanvas() {
    const form = activeForm();
    const canvas = $('abCanvas');
    if (!(form.sections || []).length) {
      canvas.innerHTML = `<div class="frm-canvas-welcome"><div class="frm-canvas-welcome__icon">${ICON.section}</div><h3>Start building your application</h3><p>Add a Section Header, then drag fields from the palette onto the canvas.</p></div>`;
      return;
    }
    canvas.innerHTML = form.sections.map((sec, si) => sectionHtml(sec, si)).join('');
    wireCanvasInteractions();
  }
  function sectionHtml(sec, si) {
    return `
      <div class="frm-qcard ab-field--section${selectedFieldId === sec.id ? ' is-selected' : ''}" data-section-id="${sec.id}" data-select-section="${sec.id}">
        <div class="frm-qcard__head">
          <span class="frm-qcard__badge">Section</span>
        </div>
        <input class="frm-qcard__title-input" data-section-title="${sec.id}" value="${escapeHtml(sec.title)}" placeholder="Section title" />
        <span class="frm-qcard__actions">
          <button class="btn btn--icon" type="button" data-delete-section="${sec.id}" aria-label="Delete section">${ICON.trash}</button>
        </span>
      </div>
      <div class="ab-section-fields" data-section-drop="${sec.id}">
        ${sec.fields.map((f, fi) => fieldCardHtml(f, si, fi)).join('')}
      </div>
      <button class="btn btn--secondary btn--sm" type="button" data-add-section-after="${si}" style="align-self:flex-start;">+ Add field to this section</button>`;
  }
  function fieldCardHtml(field, si, fi) {
    const t = typeMeta(field.type);
    return `
      <div class="frm-qcard${selectedFieldId === field.id ? ' is-selected' : ''}" data-field-id="${field.id}" draggable="true">
        <div class="frm-qcard__head">
          <span class="frm-qcard__handle" aria-hidden="true">${ICON.grip}</span>
          <div class="frm-qcard__body" data-select-field="${field.id}">
            <span class="frm-qcard__badge">${t.icon}${t.label}</span>
            <input class="frm-qcard__title-input" data-field-label="${field.id}" value="${escapeHtml(field.label)}" placeholder="Field label" />
            ${field.required ? '<span class="frm-qcard__required">Required</span>' : ''}
            ${field.profileMapping && field.profileMapping !== 'none' ? `<div class="ab-mapping-tag">Mapped: ${escapeHtml(PROFILE_MAPPINGS.find((m) => m.key === field.profileMapping).label)}</div>` : ''}
            <div class="frm-qcard__preview">${fieldPreviewHtml(field)}</div>
          </div>
          <span class="frm-qcard__actions">
            <button class="btn btn--icon" type="button" data-duplicate-field="${field.id}" aria-label="Duplicate field" title="Duplicate">${ICON.copy}</button>
            <button class="btn btn--icon" type="button" data-delete-field="${field.id}" aria-label="Delete field" title="Delete">${ICON.trash}</button>
          </span>
        </div>
      </div>`;
  }
  function fieldPreviewHtml(field) {
    switch (field.type) {
      case 'long': return `<div class="ab-preview-placeholder" style="min-height:52px;">${escapeHtml(field.placeholder || 'Long answer text')}</div>`;
      case 'dropdown': return `<div class="ab-preview-placeholder">${(field.options || []).map((o) => escapeHtml(o.label)).join(' · ') || 'No options yet'}</div>`;
      case 'multiselect': return `<div class="ab-preview-placeholder">${(field.options || []).map((o) => `<span class="badge badge--neutral" style="margin-right:4px;">${escapeHtml(o.label)}</span>`).join('') || 'No options yet'}</div>`;
      case 'checkbox': return `<div class="ab-consent-row"><input type="checkbox" class="checkbox" disabled /><span style="font-size:var(--fs-caption); color:var(--color-text-muted);">Checkbox</span></div>`;
      case 'consent': return `<div class="pf-consent" style="padding:var(--space-3);"><input type="checkbox" class="checkbox" disabled /><span class="pf-consent__text" style="font-size:var(--fs-caption);">${escapeHtml(field.label)}</span></div>`;
      case 'file': return `<div class="pf-file-drop">${ICON.file}<div>Click to upload (${escapeHtml(field.fileTypes || '')})</div></div>`;
      case 'signature': return `<div class="pf-signature-pad">Sign here</div>`;
      case 'email': return `<div class="ab-preview-placeholder">${escapeHtml(field.placeholder || 'name@example.com')}</div>`;
      case 'phone': return `<div class="ab-preview-placeholder">${escapeHtml(field.placeholder || '+1 555 0100')}</div>`;
      case 'date': return `<div class="ab-preview-placeholder">dd / mm / yyyy</div>`;
      default: return `<div class="ab-preview-placeholder">${escapeHtml(field.placeholder || 'Short answer text')}</div>`;
    }
  }
  function wireCanvasInteractions() {
    const canvas = $('abCanvas');
    canvas.querySelectorAll('[data-select-field]').forEach((el) => el.addEventListener('click', (e) => { if (e.target.closest('input')) return; selectField(el.dataset.selectField); }));
    canvas.querySelectorAll('[data-select-section]').forEach((el) => el.addEventListener('click', (e) => { if (e.target.closest('input,button')) return; selectField(el.dataset.selectSection); }));
    canvas.querySelectorAll('[data-field-label]').forEach((input) => {
      input.addEventListener('click', (e) => e.stopPropagation());
      input.addEventListener('input', () => { setFieldPatch(input.dataset.fieldLabel, { label: input.value }, { skipSnapshot: true, skipRender: true }); });
      input.addEventListener('blur', () => renderBuilder());
    });
    canvas.querySelectorAll('[data-section-title]').forEach((input) => {
      input.addEventListener('click', (e) => e.stopPropagation());
      input.addEventListener('input', () => { setSectionPatch(input.dataset.sectionTitle, { title: input.value }, { skipSnapshot: true, skipRender: true }); });
      input.addEventListener('blur', () => renderBuilder());
    });
    canvas.querySelectorAll('[data-duplicate-field]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); duplicateField(btn.dataset.duplicateField); }));
    canvas.querySelectorAll('[data-delete-field]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); confirmDeleteField(btn.dataset.deleteField); }));
    canvas.querySelectorAll('[data-delete-section]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); confirmDeleteSection(btn.dataset.deleteSection); }));
    canvas.querySelectorAll('[data-add-section-after]').forEach((btn) => btn.addEventListener('click', () => openFieldTypePromptFor(Number(btn.dataset.addSectionAfter))));

    canvas.querySelectorAll('.frm-qcard[data-field-id]').forEach((card) => {
      card.addEventListener('dragstart', (e) => { draggingFieldId = card.dataset.fieldId; card.classList.add('is-dragging'); e.dataTransfer.setData('text/plain', card.dataset.fieldId); });
      card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
      card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('is-drop-target'); });
      card.addEventListener('dragleave', () => card.classList.remove('is-drop-target'));
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('is-drop-target');
        const draggedId = e.dataTransfer.getData('text/plain') || draggingFieldId;
        if (draggedId && draggedId !== card.dataset.fieldId) moveFieldBeside(draggedId, card.dataset.fieldId);
      });
    });
    canvas.querySelectorAll('[data-section-drop]').forEach((zone) => {
      zone.addEventListener('dragover', (e) => e.preventDefault());
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain') || draggingFieldId;
        if (draggedId && !zone.querySelector(`[data-field-id="${draggedId}"]`)) moveFieldToSectionEnd(draggedId, zone.dataset.sectionDrop);
      });
    });
  }
  function openFieldTypePromptFor(sectionIndex) {
    // Simplest accessible alternative to drag-and-drop for "add field to this section":
    // add a Short Text field to that section immediately, then let the user change its type via settings is not supported (type is fixed on creation) —
    // instead, scroll the palette into view so the keyboard/click alternative (clicking a palette item) is obvious.
    $('abPaletteList').scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.PlayShell.toast('info', 'Choose a field type', 'Click a field in the palette on the left to add it here.');
  }

  function setFieldPatch(fieldId, patch, opts) {
    const form = activeForm();
    const loc = findFieldLocation(fieldId);
    if (!loc) return;
    const sections = form.sections.map((sec, si) => si !== loc.si ? sec : Object.assign({}, sec, {
      fields: sec.fields.map((f, fi) => fi !== loc.fi ? f : Object.assign({}, f, patch)),
    }));
    if (opts && opts.skipRender) {
      window.PlayStore.updateRecord(activeFormId, { sections, updatedAt: new Date().toISOString() });
      isDirty = true;
      $('abUnsavedIndicator').hidden = false;
      return;
    }
    updateForm({ sections }, opts);
  }
  function setSectionPatch(sectionId, patch, opts) {
    const form = activeForm();
    const sections = form.sections.map((sec) => sec.id !== sectionId ? sec : Object.assign({}, sec, patch));
    if (opts && opts.skipRender) {
      window.PlayStore.updateRecord(activeFormId, { sections, updatedAt: new Date().toISOString() });
      isDirty = true;
      $('abUnsavedIndicator').hidden = false;
      return;
    }
    updateForm({ sections }, opts);
  }
  function duplicateField(fieldId) {
    const form = activeForm();
    const loc = findFieldLocation(fieldId);
    if (!loc) return;
    snapshot();
    const original = form.sections[loc.si].fields[loc.fi];
    const copy = Object.assign({}, JSON.parse(JSON.stringify(original)), { id: uid('FLD') });
    if (copy.options) copy.options = copy.options.map((o) => Object.assign({}, o, { id: uid('OPT') }));
    const sections = form.sections.map((sec, si) => si !== loc.si ? sec : Object.assign({}, sec, {
      fields: sec.fields.slice(0, loc.fi + 1).concat([copy], sec.fields.slice(loc.fi + 1)),
    }));
    updateForm({ sections }, { skipSnapshot: true });
    selectedFieldId = copy.id;
    renderBuilder();
    window.PlayShell.toast('success', 'Field duplicated', '');
  }
  function moveFieldBeside(draggedId, targetId) {
    const form = activeForm();
    const fromLoc = findFieldLocation(draggedId);
    const toLoc = findFieldLocation(targetId);
    if (!fromLoc || !toLoc) return;
    snapshot();
    const sections = form.sections.map((sec) => Object.assign({}, sec, { fields: sec.fields.slice() }));
    const [moved] = sections[fromLoc.si].fields.splice(fromLoc.fi, 1);
    const newToLoc = findFieldLocationIn(sections, targetId);
    sections[newToLoc.si].fields.splice(newToLoc.fi, 0, moved);
    updateForm({ sections }, { skipSnapshot: true });
  }
  function moveFieldToSectionEnd(draggedId, sectionId) {
    const form = activeForm();
    const fromLoc = findFieldLocation(draggedId);
    if (!fromLoc) return;
    snapshot();
    const sections = form.sections.map((sec) => Object.assign({}, sec, { fields: sec.fields.slice() }));
    const [moved] = sections[fromLoc.si].fields.splice(fromLoc.fi, 1);
    const targetSi = sections.findIndex((s) => s.id === sectionId);
    if (targetSi === -1) return;
    sections[targetSi].fields.push(moved);
    updateForm({ sections }, { skipSnapshot: true });
  }
  function findFieldLocationIn(sections, fieldId) {
    for (let si = 0; si < sections.length; si++) {
      const fi = sections[si].fields.findIndex((f) => f.id === fieldId);
      if (fi !== -1) return { si, fi };
    }
    return null;
  }
  function moveFieldStep(fieldId, delta) {
    const form = activeForm();
    const loc = findFieldLocation(fieldId);
    if (!loc) return;
    const target = loc.fi + delta;
    if (target < 0 || target >= form.sections[loc.si].fields.length) return;
    snapshot();
    const sections = form.sections.map((sec) => Object.assign({}, sec, { fields: sec.fields.slice() }));
    const [moved] = sections[loc.si].fields.splice(loc.fi, 1);
    sections[loc.si].fields.splice(target, 0, moved);
    updateForm({ sections }, { skipSnapshot: true });
  }

  function selectField(id) { selectedFieldId = id; renderBuilder(); if (window.innerWidth <= 1023) $('abSettings').classList.add('is-open'); }

  /* ---------- delete confirmations ---------- */
  function confirmDeleteField(fieldId) {
    const form = activeForm();
    const loc = findFieldLocation(fieldId);
    const field = loc ? form.sections[loc.si].fields[loc.fi] : null;
    openConfirm('Delete this field?', `"${field ? field.label : 'This field'}" will be permanently removed from the form.`, () => {
      const sections = form.sections.map((sec) => Object.assign({}, sec, { fields: sec.fields.filter((f) => f.id !== fieldId) }));
      if (selectedFieldId === fieldId) selectedFieldId = null;
      updateForm({ sections });
      window.PlayShell.toast('success', 'Field deleted', '');
    });
  }
  function confirmDeleteSection(sectionId) {
    const form = activeForm();
    const sec = form.sections.find((s) => s.id === sectionId);
    const count = sec ? sec.fields.length : 0;
    openConfirm('Delete this section?', count ? `This section contains ${count} field${count === 1 ? '' : 's'}, which will also be deleted.` : 'This section will be removed.', () => {
      const sections = form.sections.filter((s) => s.id !== sectionId);
      if (sec && sec.fields.some((f) => f.id === selectedFieldId)) selectedFieldId = null;
      if (selectedFieldId === sectionId) selectedFieldId = null;
      updateForm({ sections });
      window.PlayShell.toast('success', 'Section deleted', '');
    });
  }
  function openConfirm(title, text, onConfirm) {
    $('abConfirmTitle').textContent = title;
    $('abConfirmText').textContent = text;
    pendingConfirm = onConfirm;
    openModal('abConfirmBackdrop');
  }
  function wireConfirmModal() {
    $('abConfirmActionBtn').addEventListener('click', () => {
      const fn = pendingConfirm; pendingConfirm = null;
      closeModal('abConfirmBackdrop');
      if (fn) fn();
    });
  }

  /* ========================================================================
     SETTINGS (right panel)
     ======================================================================== */
  function wireSettingsClose() {
    $('abSettingsCloseBtn').addEventListener('click', () => $('abSettings').classList.remove('is-open'));
  }
  function renderSettings() {
    const form = activeForm();
    if (!selectedFieldId) {
      $('abSettingsEmpty').hidden = false; $('abSettingsBody').hidden = true;
      $('abSettingsEmptyIcon').innerHTML = ICON.section;
      return;
    }
    const section = (form.sections || []).find((s) => s.id === selectedFieldId);
    if (section) { renderSectionSettings(section); return; }
    const loc = findFieldLocation(selectedFieldId);
    if (!loc) { selectedFieldId = null; renderSettings(); return; }
    const field = form.sections[loc.si].fields[loc.fi];
    renderFieldSettings(field);
  }
  function renderSectionSettings(section) {
    $('abSettingsEmpty').hidden = true;
    $('abSettingsBody').hidden = false;
    $('abSettingsBody').innerHTML = `
      <div class="frm-settings-section">
        <h3 class="frm-panel-title">Section settings</h3>
        <div class="field"><label class="field__label">Section title</label><input class="input" id="absSectionTitle" value="${escapeHtml(section.title)}" /></div>
      </div>`;
    $('absSectionTitle').addEventListener('input', () => setSectionPatch(section.id, { title: $('absSectionTitle').value }));
  }
  function renderFieldSettings(field) {
    $('abSettingsEmpty').hidden = true;
    $('abSettingsBody').hidden = false;
    const t = typeMeta(field.type);
    const showPlaceholder = ['short', 'long', 'email', 'phone'].indexOf(field.type) !== -1;
    const showOptions = field.type === 'dropdown' || field.type === 'multiselect';
    const showMapping = field.type !== 'section';
    $('abSettingsBody').innerHTML = `
      <div class="frm-settings-section">
        <h3 class="frm-panel-title">${t.icon}<span style="margin-left:6px;">${t.label}</span></h3>
        <div class="field"><label class="field__label" for="absLabel">Label</label><input class="input" id="absLabel" value="${escapeHtml(field.label)}" /></div>
        ${showPlaceholder ? `<div class="field"><label class="field__label" for="absPlaceholder">Placeholder</label><input class="input" id="absPlaceholder" value="${escapeHtml(field.placeholder || '')}" /></div>` : ''}
        <div class="field"><label class="field__label" for="absHelp">Help text</label><input class="input" id="absHelp" value="${escapeHtml(field.helpText || '')}" /></div>
        <div class="check-row" style="margin-top: var(--space-2);"><input type="checkbox" class="checkbox" id="absRequired" ${field.required ? 'checked' : ''} /><label for="absRequired">Required</label></div>
      </div>
      ${showOptions ? `
      <div class="frm-settings-section">
        <h3 class="frm-panel-title">Options</h3>
        <div class="ab-options-list" id="absOptionsList">${(field.options || []).map((o) => optionRowHtml(o)).join('')}</div>
        <p class="field__error" id="absOptionsError" hidden>Add at least two options.</p>
        <button class="btn btn--secondary btn--sm" type="button" id="absAddOption" style="margin-top: var(--space-2);">${ICON.plus} Add option</button>
      </div>` : ''}
      ${showMapping ? `
      <div class="frm-settings-section">
        <h3 class="frm-panel-title">Profile field mapping</h3>
        <div class="field"><select class="select" id="absMapping">${PROFILE_MAPPINGS.map((m) => `<option value="${m.key}" ${field.profileMapping === m.key ? 'selected' : ''}>${escapeHtml(m.label)}</option>`).join('')}</select></div>
        <p class="field__text" style="font-size: var(--fs-caption); color: var(--color-text-muted);">Maps this answer to the applicant record created in Admissions when the form is submitted.</p>
      </div>` : ''}`;

    $('absLabel').addEventListener('input', () => setFieldPatch(field.id, { label: $('absLabel').value }, { skipRender: true }));
    $('absLabel').addEventListener('blur', () => renderBuilder());
    const ph = $('absPlaceholder'); if (ph) ph.addEventListener('input', () => setFieldPatch(field.id, { placeholder: ph.value }, { skipRender: true }));
    if (ph) ph.addEventListener('blur', () => renderBuilder());
    $('absHelp').addEventListener('input', () => setFieldPatch(field.id, { helpText: $('absHelp').value }, { skipRender: true }));
    $('absHelp').addEventListener('blur', () => renderBuilder());
    $('absRequired').addEventListener('change', () => setFieldPatch(field.id, { required: $('absRequired').checked }));
    const mapping = $('absMapping'); if (mapping) mapping.addEventListener('change', () => setFieldPatch(field.id, { profileMapping: mapping.value }));
    if (showOptions) wireOptionsEditor(field);
  }
  function optionRowHtml(o) {
    return `<div class="ab-option-row" data-option-id="${o.id}"><input class="input" value="${escapeHtml(o.label)}" data-option-input="${o.id}" /><button class="btn btn--icon" type="button" data-remove-option="${o.id}" aria-label="Remove option">${ICON.trash}</button></div>`;
  }
  function wireOptionsEditor(field) {
    $('absAddOption').addEventListener('click', () => {
      const options = (field.options || []).concat([{ id: uid('OPT'), label: `Option ${(field.options || []).length + 1}` }]);
      setFieldPatch(field.id, { options });
    });
    document.querySelectorAll('[data-option-input]').forEach((input) => {
      input.addEventListener('input', () => {
        const options = field.options.map((o) => o.id === input.dataset.optionInput ? Object.assign({}, o, { label: input.value }) : o);
        setFieldPatch(field.id, { options }, { skipRender: true });
      });
      input.addEventListener('blur', () => renderBuilder());
    });
    document.querySelectorAll('[data-remove-option]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (field.options.length <= 2) { $('absOptionsError').hidden = false; return; }
        const options = field.options.filter((o) => o.id !== btn.dataset.removeOption);
        setFieldPatch(field.id, { options });
      });
    });
  }

  /* ========================================================================
     PUBLISH
     ======================================================================== */
  function wirePublishModal() {
    $('abPublishConfirmBtn').addEventListener('click', confirmPublish);
    $('abSuccessCopyBtn').addEventListener('click', () => copyLink($('abSuccessLinkInput').value));
  }
  function openPublishModal() {
    const form = activeForm();
    const fieldCount = (form.sections || []).reduce((s, sec) => s + sec.fields.length, 0);
    const errors = [];
    if (!form.title || !form.title.trim()) errors.push('Give the form a name before publishing.');
    if (!fieldCount) errors.push('Add at least one field before publishing.');
    const hasConsent = form.sections.some((sec) => sec.fields.some((f) => f.type === 'consent'));
    $('abPublishBody').innerHTML = errors.length
      ? `<p class="modal__text" style="color:var(--color-error);">${errors.map(escapeHtml).join('<br/>')}</p>`
      : `<p class="modal__text">This makes "${escapeHtml(form.title)}" available at a public link families can fill out. ${form.status === 'Live' ? 'Your changes will update the live form — the link stays the same.' : ''}</p>
         <div class="ab-publish-summary">
           <div class="ab-publish-summary__row"><span>Sections</span><strong>${form.sections.length}</strong></div>
           <div class="ab-publish-summary__row"><span>Fields</span><strong>${fieldCount}</strong></div>
           <div class="ab-publish-summary__row"><span>Consent statement</span><strong>${hasConsent ? 'Included' : 'Not included'}</strong></div>
         </div>
         <p class="field__text" style="font-size: var(--fs-caption); color: var(--color-text-muted); margin-top: var(--space-3);">Submissions are stored in this browser's data and appear in the Admissions Pipeline — they won't sync to a different device without a shared backend.</p>`;
    $('abPublishConfirmBtn').hidden = !!errors.length;
    openModal('abPublishBackdrop');
  }
  function confirmPublish() {
    if (publishSubmitting) return;
    publishSubmitting = true;
    const btn = $('abPublishConfirmBtn'); btn.classList.add('is-loading'); btn.disabled = true;
    window.setTimeout(() => {
      const form = activeForm();
      const nowIso = new Date().toISOString();
      const wasLive = form.status === 'Live';
      const patch = { status: 'Live', updatedAt: nowIso };
      if (!wasLive) { patch.publishedAt = nowIso; patch.publicSlug = form.publicSlug || slug(form.title) + '-' + form.id.slice(-5).toLowerCase(); }
      window.PlayStore.updateRecord(form.id, patch);
      isDirty = false;
      publishSubmitting = false;
      btn.classList.remove('is-loading'); btn.disabled = false;
      closeModal('abPublishBackdrop');
      renderBuilder();
      const url = publicUrlFor(activeForm());
      $('abSuccessLinkInput').value = url;
      $('abSuccessOpenBtn').href = url;
      openModal('abSuccessBackdrop');
      window.PlayShell.toast('success', wasLive ? 'Changes published' : 'Form published', '');
    }, 500);
  }

  /* ========================================================================
     PREVIEW (desktop/mobile toggle, real validation, real submission)
     ======================================================================== */
  function wirePreviewModal() {
    document.querySelectorAll('[data-preview-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        previewMode = btn.dataset.previewMode;
        document.querySelectorAll('[data-preview-mode]').forEach((b) => b.classList.toggle('is-active', b.dataset.previewMode === previewMode));
        applyPreviewMode();
      });
    });
  }
  function applyPreviewMode() {
    $('abPreviewPhone').hidden = previewMode !== 'mobile';
    $('abPreviewDesktop').hidden = previewMode !== 'desktop';
  }
  function openPreviewModal() {
    previewAnswers = {}; previewSubmitted = false; previewSubmitting = false;
    previewMode = 'desktop';
    document.querySelectorAll('[data-preview-mode]').forEach((b) => b.classList.toggle('is-active', b.dataset.previewMode === 'desktop'));
    applyPreviewMode();
    renderPreviewScreens();
    openModal('abPreviewBackdrop');
  }
  function renderPreviewScreens() {
    const form = activeForm();
    const html = previewSubmitted ? publicSuccessHtml(form) : publicFormHtml(form, previewAnswers, {});
    $('abPreviewScreenDesktop').innerHTML = html;
    $('abPreviewScreenMobile').innerHTML = html;
    [$('abPreviewScreenDesktop'), $('abPreviewScreenMobile')].forEach((host) => wirePublicForm(host, form, previewAnswers, () => { previewAnswers = Object.assign({}, previewAnswers); }, submitPreview));
  }
  function submitPreview(form, answers, errors) {
    if (previewSubmitting) return;
    if (Object.keys(errors).length) { renderPreviewScreensWithErrors(errors); return; }
    previewSubmitting = true;
    window.setTimeout(() => {
      previewSubmitted = true;
      previewSubmitting = false;
      renderPreviewScreens();
      window.PlayShell.toast('info', 'Preview submission', 'This was a preview — no enquiry was created. Publish and open the real link to test a live submission.');
    }, 350);
  }
  function renderPreviewScreensWithErrors(errors) {
    const form = activeForm();
    const html = publicFormHtml(form, previewAnswers, errors);
    $('abPreviewScreenDesktop').innerHTML = html;
    $('abPreviewScreenMobile').innerHTML = html;
    [$('abPreviewScreenDesktop'), $('abPreviewScreenMobile')].forEach((host) => wirePublicForm(host, form, previewAnswers, () => {}, submitPreview));
  }

  /* ========================================================================
     SHARED PUBLIC FORM RENDERER (also mirrored in apply.js for the real
     public page — kept small and dependency-free so both copies stay easy
     to keep in sync).
     ======================================================================== */
  window.AppFormRenderer = { publicFormHtml, publicSuccessHtml, wirePublicForm, validateForm };
  function publicFormHtml(form, answers, errors) {
    return `
      <form id="pfForm" novalidate>
        <h2 style="font-family:var(--font-display); font-weight:600; font-size:var(--fs-h2); margin-bottom:var(--space-2);">${escapeHtml(form.title)}</h2>
        ${(form.sections || []).map((sec) => `
          <div class="pf-section-title">${escapeHtml(sec.title)}</div>
          ${sec.fields.map((f) => publicFieldHtml(f, answers[f.id], errors[f.id])).join('')}
        `).join('')}
        <button type="submit" class="btn btn--accent" style="width:100%; margin-top: var(--space-4);"><span class="btn__spinner" aria-hidden="true"></span><span>Submit application</span></button>
      </form>`;
  }
  function publicFieldHtml(f, value, error) {
    const req = f.required ? ' <span class="req">*</span>' : '';
    let control = '';
    if (f.type === 'short' || f.type === 'email' || f.type === 'phone') {
      control = `<input class="input" type="${f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}" data-pf-field="${f.id}" placeholder="${escapeHtml(f.placeholder || '')}" value="${escapeHtml(value || '')}" />`;
    } else if (f.type === 'long') {
      control = `<textarea class="textarea" data-pf-field="${f.id}" placeholder="${escapeHtml(f.placeholder || '')}">${escapeHtml(value || '')}</textarea>`;
    } else if (f.type === 'date') {
      control = `<input class="input" type="date" data-pf-field="${f.id}" value="${escapeHtml(value || '')}" />`;
    } else if (f.type === 'dropdown') {
      control = `<select class="select" data-pf-field="${f.id}"><option value="">Choose…</option>${(f.options || []).map((o) => `<option value="${escapeHtml(o.label)}" ${value === o.label ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}</select>`;
    } else if (f.type === 'multiselect') {
      const sel = Array.isArray(value) ? value : [];
      control = (f.options || []).map((o) => `<div class="pf-checkbox-option"><input type="checkbox" class="checkbox" data-pf-multi="${f.id}" value="${escapeHtml(o.label)}" ${sel.indexOf(o.label) !== -1 ? 'checked' : ''} /><label>${escapeHtml(o.label)}</label></div>`).join('');
    } else if (f.type === 'checkbox') {
      control = `<div class="pf-checkbox-option"><input type="checkbox" class="checkbox" data-pf-field="${f.id}" data-pf-bool="1" ${value ? 'checked' : ''} /><label>${escapeHtml(f.label)}</label></div>`;
      return `<div class="pf-field">${control}${f.helpText ? `<div class="pf-help">${escapeHtml(f.helpText)}</div>` : ''}${error ? `<div class="pf-error">${escapeHtml(error)}</div>` : ''}</div>`;
    } else if (f.type === 'consent') {
      control = `<div class="pf-consent"><input type="checkbox" class="checkbox" data-pf-field="${f.id}" data-pf-bool="1" ${value ? 'checked' : ''} /><span class="pf-consent__text">${escapeHtml(f.label)}${req}</span></div>`;
      return `<div class="pf-field">${control}${error ? `<div class="pf-error">${escapeHtml(error)}</div>` : ''}</div>`;
    } else if (f.type === 'file') {
      control = `<div class="pf-file-drop${value ? ' has-file' : ''}" data-pf-file="${f.id}">${ICON.file}<div>${value ? escapeHtml(value) : 'Click to choose a file'}</div><span class="pf-file-drop__hint">${escapeHtml(f.fileTypes || '')} · up to ${f.maxSizeMB || 5}MB</span></div>`;
    } else if (f.type === 'signature') {
      control = `<div class="pf-signature-pad${value ? ' is-signed' : ''}" data-pf-signature="${f.id}">${value ? escapeHtml(value) : 'Click to sign'}</div>`;
    }
    return `
      <div class="pf-field">
        <label class="pf-label">${escapeHtml(f.label)}${req}</label>
        ${control}
        ${f.helpText ? `<div class="pf-help">${escapeHtml(f.helpText)}</div>` : ''}
        ${error ? `<div class="pf-error">${escapeHtml(error)}</div>` : ''}
      </div>`;
  }
  function publicSuccessHtml() {
    return `<div class="pf-success"><div class="pf-success__icon">${ICON.consent}</div><h3 style="font-family:var(--font-display); font-weight:600; font-size:var(--fs-h3);">Application received</h3><p class="card__text" style="margin-top:var(--space-2);">Thank you — our admissions team will be in touch soon.</p></div>`;
  }
  function validateForm(form, answers) {
    const errors = {};
    form.sections.forEach((sec) => sec.fields.forEach((f) => {
      const v = answers[f.id];
      if (f.required) {
        const empty = f.type === 'multiselect' ? !(Array.isArray(v) && v.length) : (f.type === 'checkbox' || f.type === 'consent' || f.type === 'signature' || f.type === 'file') ? !v : !v || !String(v).trim();
        if (empty) { errors[f.id] = 'This field is required.'; return; }
      }
      if (v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[f.id] = 'Enter a valid email address.';
      if (v && f.type === 'phone' && v.replace(/\D+/g, '').length < 7) errors[f.id] = 'Enter a valid phone number.';
      if (v && f.type === 'date' && isNaN(new Date(v).getTime())) errors[f.id] = 'Enter a valid date.';
    }));
    return errors;
  }
  function wirePublicForm(host, form, answers, onChange, onSubmit) {
    host.querySelectorAll('[data-pf-field]').forEach((el) => {
      const evt = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        answers[el.dataset.pfField] = el.dataset.pfBool ? el.checked : el.value;
        onChange();
      });
    });
    host.querySelectorAll('[data-pf-multi]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const key = cb.dataset.pfMulti;
        const list = Array.isArray(answers[key]) ? answers[key].slice() : [];
        const idx = list.indexOf(cb.value);
        if (cb.checked && idx === -1) list.push(cb.value);
        if (!cb.checked && idx !== -1) list.splice(idx, 1);
        answers[key] = list;
        onChange();
      });
    });
    host.querySelectorAll('[data-pf-file]').forEach((box) => {
      box.addEventListener('click', () => {
        // No real file picker/upload backend in this static demo — simulate a chosen file name,
        // which is honest within the constraint but still exercises the "required" validation path.
        answers[box.dataset.pfFile] = 'document.pdf';
        onChange();
        box.classList.add('has-file');
        box.querySelector('div').textContent = 'document.pdf';
      });
    });
    host.querySelectorAll('[data-pf-signature]').forEach((pad) => {
      pad.addEventListener('click', () => {
        answers[pad.dataset.pfSignature] = answers.__signerName || 'Signed';
        onChange();
        pad.classList.add('is-signed');
        pad.textContent = 'Signed ✓';
      });
    });
    const formEl = host.querySelector('#pfForm');
    if (formEl) formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      const errors = validateForm(form, answers);
      onSubmit(form, answers, errors);
    });
  }

  /* ---------- shared modal helpers ---------- */
  function openModal(id) { const el = $(id); el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const el = $(id); if (!el.classList.contains('is-open')) return; el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  document.querySelectorAll && document.addEventListener('click', (e) => {
    const backdrop = e.target.closest ? e.target.closest('.modal-backdrop') : null;
    if (backdrop && (e.target === backdrop || e.target.closest('[data-close]'))) closeModal(backdrop.id);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop.is-open').forEach((b) => closeModal(b.id)); });
})();
