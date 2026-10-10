/* ==========================================================================
   PLAY SCHOOL — Daily Care Log
   Reuses: store.js (records — care entries are type 'CareEntry'; children,
   classes, allergy alerts and the weekly menu template all come from the
   same shared store), shell.js (shell/toast/notifications).
   Published entries are immediately visible to S13 (record.html's "Daily
   Diary" card) because both read PlayStore.getByType('CareEntry') — there is
   no separate draft/publish queue in this app, so "publish" here means
   "save", matching the rest of the project's no-backend architecture.
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
  function formatTime12(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + pad2(m) + ' ' + period;
  }
  function formatDateHeading(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }); }
  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/);
    if (!parts.length || !parts[0]) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  const ICON = {
    meal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2"/><path d="M5 12v10"/><path d="M19 2c-1.5 1.5-2 3.5-2 6s.5 4.5 2 6"/><path d="M19 2v20"/></svg>',
    nap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>',
    toilet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69s-6 7.3-6 11.31a6 6 0 0 0 12 0c0-4-6-11.31-6-11.31Z"/></svg>',
    mood: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="9" x2="8.01" y2="9"/><line x1="16" y1="9" x2="16.01" y2="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>',
    activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polyline points="15 18 9 12 15 6"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polyline points="9 18 15 12 9 6"/></svg>',
  };
  const MOOD_ICON = {
    'very-happy': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M7 9s0-1 1-1 1 1 1 1M15 9s0-1 1-1 1 1 1 1"/><path d="M7.5 14.5c1 2 3 3 4.5 3s3.5-1 4.5-3"/></svg>',
    happy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="9" x2="8.01" y2="9"/><line x1="16" y1="9" x2="16.01" y2="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>',
    neutral: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="9" x2="8.01" y2="9"/><line x1="16" y1="9" x2="16.01" y2="9"/><line x1="8" y1="15" x2="16" y2="15"/></svg>',
    sad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="9" x2="8.01" y2="9"/><line x1="16" y1="9" x2="16.01" y2="9"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/></svg>',
    upset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M7 10l2-1M17 10l-2-1"/><path d="M16 16.5s-1.5-2.5-4-2.5-4 2.5-4 2.5"/></svg>',
  };
  const MOOD_LABEL = { 'very-happy': 'Very happy', happy: 'Happy', neutral: 'Neutral', sad: 'Sad', upset: 'Upset' };
  const MOOD_ORDER = ['very-happy', 'happy', 'neutral', 'sad', 'upset'];
  const ENTRY_LABEL = { meal: 'Meal', nap: 'Nap', toileting: 'Toileting', mood: 'Mood', activity: 'Activity', note: 'Note', photo: 'Photo' };
  const ENTRY_ORDER = ['meal', 'nap', 'toileting', 'mood', 'activity', 'note', 'photo'];
  const MEAL_TYPES = ['Breakfast', 'Snack', 'Lunch', 'Dinner'];
  const ALLERGEN_KEYWORDS = ['peanuts', 'peanut', 'tree nuts', 'nuts', 'dairy', 'milk', 'eggs', 'egg', 'gluten', 'wheat', 'fish', 'shellfish', 'soy'];

  /* ---------- page state ---------- */
  let selectedClassId = null;
  let selectedDate = todayISO();
  let view = 'grid';
  const selectedChildIds = new Set();
  let timelineChildId = null;
  let role = window.PlayShell.getDemoRole();

  /* modal contexts */
  let mealContext = null; let mealState = { mealType: 'Lunch', items: [], amount: null };
  let mealLastSafety = { warnings: [], unverifiable: [] };
  let napContext = null; let napMode = 'start'; let napEditingEntryId = null;
  let toiletContext = null; let toiletKind = null;
  let moodContext = null; let moodValue = null;
  let activityContext = null;
  let noteContext = null;
  let photoContext = null; let photoDataUrl = null; let photoFileMeta = null;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', (e) => { role = e.detail.role; render(); });

  function init() {
    window.PlayShell.login();
    window.PlayShell.mount('care-log', 'Daily Care Log');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    const classes = classOptions();
    selectedClassId = classes.length ? classes[0].id : null;

    populateClassSelect();
    $('careDateInput').value = selectedDate;
    wireToolbar();
    wireQuickAdd();
    wireMealModal();
    wireNapModal();
    wireToiletModal();
    wireMoodModal();
    wireActivityModal();
    wireNoteModal();
    wirePhotoModal();
    startNapTicker();

    window.setTimeout(() => {
      $('careSkeleton').hidden = true;
      $('careViews').hidden = false;
      render();
    }, 450);
  }

  /* ---------- data helpers ---------- */
  function classOptions() { return window.PlayStore.getByType('Class'); }
  function classNameById(id) { const c = window.PlayStore.getById(id); return c ? c.name : ''; }
  function childById(id) { return window.PlayStore.getById(id); }
  function childrenInSelectedClass() {
    const className = classNameById(selectedClassId);
    return window.PlayStore.getByType('Child').filter((c) => c.room === className && c.status === 'Active').sort((a, b) => a.name.localeCompare(b.name));
  }
  function guardianFor(child) { return child.guardianId ? window.PlayStore.getById(child.guardianId) : null; }
  function entriesFor(childId, date) {
    return window.PlayStore.getByType('CareEntry').filter((e) => e.childId === childId && e.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }
  function entriesOfType(childId, date, type) { return entriesFor(childId, date).filter((e) => e.entryType === type); }
  function latestOfType(childId, date, type) { const list = entriesOfType(childId, date, type); return list.length ? list[list.length - 1] : null; }
  function activeNap(childId, date) { return entriesOfType(childId, date, 'nap').find((e) => !e.endTime) || null; }
  function isComplete(childId, date) {
    return ['meal', 'nap', 'toileting', 'mood'].every((t) => entriesOfType(childId, date, t).length > 0);
  }
  function addCareEntry(fields) {
    const now = new Date().toISOString();
    return window.PlayStore.addRecord(Object.assign(
      { id: 'CARE-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6), type: 'CareEntry', createdAt: now, updatedAt: now, createdBy: role, published: true },
      fields
    ));
  }
  function updateCareEntry(id, patch) {
    return window.PlayStore.updateRecord(id, Object.assign({}, patch, { updatedAt: new Date().toISOString() }));
  }

  /* ---------- allergen matching ---------- */
  function normalizeAllergen(token) {
    const t = String(token || '').toLowerCase().trim();
    if (t === 'peanut') return 'peanuts';
    if (t === 'nuts') return 'tree nuts';
    if (t === 'milk') return 'dairy';
    if (t === 'egg') return 'eggs';
    if (t === 'wheat') return 'gluten';
    return t;
  }
  function allergensFromAlert(alert) {
    if (alert.allergen) return [normalizeAllergen(alert.allergen)];
    const detail = String(alert.detail || '').toLowerCase();
    const found = ALLERGEN_KEYWORDS.filter((k) => detail.indexOf(k) !== -1).map(normalizeAllergen);
    return Array.from(new Set(found));
  }
  function computeMealSafety(children, checkedItems) {
    const warnings = []; const unverifiable = [];
    children.forEach((child) => {
      const allergyAlerts = (child.alerts || []).filter((a) => a.type === 'allergy');
      if (!allergyAlerts.length) return;
      allergyAlerts.forEach((alert) => {
        const allergens = allergensFromAlert(alert);
        if (!allergens.length) { unverifiable.push({ child, alert }); return; }
        checkedItems.forEach((item) => {
          const itemAllergens = (item.allergens || []).map((a) => normalizeAllergen(a));
          allergens.forEach((a) => { if (itemAllergens.indexOf(a) !== -1) warnings.push({ child, item, allergen: a }); });
        });
      });
    });
    return { warnings, unverifiable };
  }

  /* ---------- render orchestration ---------- */
  function render() {
    populateClassSelect();
    renderSummary();
    const children = childrenInSelectedClass();
    document.querySelectorAll('.care-view-panel').forEach((el) => { el.hidden = el.dataset.panel !== view; });
    $('careEmptyState').hidden = children.length > 0;
    if (!children.length) { $('careGridPanel').innerHTML = ''; $('careTimelinePanel').innerHTML = ''; renderChildPicker([]); renderQuickActions(); renderMobileBar(); return; }

    if (!timelineChildId || !children.some((c) => c.id === timelineChildId)) timelineChildId = children[0].id;
    Array.from(selectedChildIds).forEach((id) => { if (!children.some((c) => c.id === id)) selectedChildIds.delete(id); });

    renderChildPicker(children);
    renderQuickActions();
    renderMobileBar();
    if (view === 'grid') renderGrid(children); else renderTimeline(children);
  }

  function renderSummary() {
    const children = childrenInSelectedClass();
    const entriesToday = children.reduce((sum, c) => sum + entriesFor(c.id, selectedDate).length, 0);
    const incomplete = children.filter((c) => !isComplete(c.id, selectedDate)).length;
    $('careSummary').innerHTML = `
      <span class="care-summary__item"><strong>${children.length}</strong>&nbsp;children</span>
      <span class="care-summary__item"><strong>${entriesToday}</strong>&nbsp;entries today</span>
      <span class="care-summary__item${incomplete ? ' care-summary__item--alert' : ''}"><strong>${incomplete}</strong>&nbsp;incomplete logs</span>
    `;
  }

  function populateClassSelect() {
    const sel = $('careClassSelect');
    const classes = classOptions();
    const html = classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    if (sel.innerHTML !== html) sel.innerHTML = html;
    if (selectedClassId) sel.value = selectedClassId;
  }

  /* ---------- toolbar ---------- */
  function wireToolbar() {
    $('careClassSelect').addEventListener('change', () => { selectedClassId = $('careClassSelect').value; selectedChildIds.clear(); timelineChildId = null; render(); });
    $('careDateInput').addEventListener('change', () => { selectedDate = $('careDateInput').value || todayISO(); render(); });
    $('carePrevDay').addEventListener('click', () => { selectedDate = addDaysISO(selectedDate, -1); $('careDateInput').value = selectedDate; render(); });
    $('careNextDay').addEventListener('click', () => { selectedDate = addDaysISO(selectedDate, 1); $('careDateInput').value = selectedDate; render(); });
    $('careTodayBtn').addEventListener('click', () => { selectedDate = todayISO(); $('careDateInput').value = selectedDate; render(); });
    document.querySelectorAll('#careViewToggle [data-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        view = btn.dataset.view;
        document.querySelectorAll('#careViewToggle [data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        render();
      });
    });
  }

  /* ---------- child picker (quick-add multi-select) ---------- */
  function renderChildPicker(children) {
    const wrap = $('careChildPicker');
    wrap.innerHTML = children.map((c) => {
      const nap = activeNap(c.id, selectedDate);
      const selected = selectedChildIds.has(c.id);
      return `
      <button class="care-child-pick${selected ? ' is-selected' : ''}" type="button" data-child="${c.id}" aria-pressed="${selected}" aria-label="Select ${escapeHtml(c.name)}">
        <span class="care-child-pick__avatar">
          ${escapeHtml(initials(c.name))}
          ${nap ? `<span class="care-child-pick__nap" title="Currently napping">${ICON.nap}</span>` : ''}
          <span class="care-child-pick__check">${ICON.check}</span>
        </span>
        <span class="care-child-pick__name">${escapeHtml(c.name.split(' ')[0])}</span>
      </button>`;
    }).join('');
    wrap.querySelectorAll('[data-child]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.child;
        if (selectedChildIds.has(id)) selectedChildIds.delete(id); else selectedChildIds.add(id);
        renderChildPicker(children);
        renderSelectionBar(children);
        renderMobileBar();
      });
    });
    renderSelectionBar(children);
  }
  function renderSelectionBar(children) {
    const count = selectedChildIds.size;
    $('careSelectionCount').textContent = count ? `${count} child${count === 1 ? '' : 'ren'} selected` : 'No children selected';
  }
  function wireQuickAdd() {
    $('careSelectAllBtn').addEventListener('click', () => { childrenInSelectedClass().forEach((c) => selectedChildIds.add(c.id)); render(); });
    $('careClearSelectionBtn').addEventListener('click', () => { selectedChildIds.clear(); render(); });
  }

  function quickActionsHtml() {
    return ENTRY_ORDER.map((type) => `
      <button class="care-qa-btn" type="button" data-qa="${type}">
        <span class="care-qa-btn__icon">${ICON[type === 'toileting' ? 'toilet' : type]}</span>
        <span class="care-qa-btn__label">${ENTRY_LABEL[type]}</span>
      </button>`).join('');
  }
  function renderQuickActions() {
    $('careQuickActions').innerHTML = quickActionsHtml();
    wireQuickActionButtons($('careQuickActions'));
  }
  function renderMobileBar() {
    $('careMobileBar').innerHTML = quickActionsHtml();
    wireQuickActionButtons($('careMobileBar'));
  }
  function wireQuickActionButtons(container) {
    container.querySelectorAll('[data-qa]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ids = Array.from(selectedChildIds);
        if (!ids.length) { window.PlayShell.toast('info', 'Select a child first', 'Tap one or more child avatars above, then choose an action.'); return; }
        openEntryModal(btn.dataset.qa, ids);
      });
    });
  }
  function openEntryModal(type, childIds) {
    if (type === 'meal') openMealModal(childIds);
    else if (type === 'nap') openNapModal(childIds);
    else if (type === 'toileting') openToiletModal(childIds);
    else if (type === 'mood') openMoodModal(childIds);
    else if (type === 'activity') openActivityModal(childIds);
    else if (type === 'note') openNoteModal(childIds);
    else if (type === 'photo') openPhotoModal(childIds);
  }
  function namesOf(childIds) { return childIds.map((id) => { const c = childById(id); return c ? c.name : id; }).join(', '); }

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
    const btn = $(btnId); if (btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading'); btn.disabled = true;
    window.setTimeout(() => { work(); btn.classList.remove('is-loading'); btn.disabled = false; }, 350);
  }

  /* ========================================================================
     GRID VIEW
     ======================================================================== */
  function gridCellHtml(child, type) {
    if (type === 'nap') {
      const active = activeNap(child.id, selectedDate);
      if (active) {
        const startDT = new Date(selectedDate + 'T' + active.time);
        return `<div class="care-cell care-cell--running" data-cell="nap" data-child="${child.id}">
          <span class="care-cell__main"><span class="care-cell__dot"></span>Napping <span class="care-live-timer" data-nap-start="${startDT.toISOString()}">0m</span></span>
          <span class="care-cell__time">Since ${formatTime12(active.time)}</span>
        </div>`;
      }
      const latest = latestOfType(child.id, selectedDate, 'nap');
      if (latest) return `<div class="care-cell" data-cell="nap" data-child="${child.id}"><span class="care-cell__main">${ICON.nap}Slept ${durationLabel(latest.durationMin)}</span><span class="care-cell__time">${formatTime12(latest.time)}–${formatTime12(latest.endTime)}</span></div>`;
      return emptyCellHtml('nap', child.id);
    }
    const latest = latestOfType(child.id, selectedDate, type);
    if (!latest) return emptyCellHtml(type, child.id);
    return `<div class="care-cell" data-cell="${type}" data-child="${child.id}"><span class="care-cell__main">${ICON[type === 'toileting' ? 'toilet' : type]}${escapeHtml(cellSummary(latest))}</span><span class="care-cell__time">${formatTime12(latest.time)}</span></div>`;
  }
  function emptyCellHtml(type, childId) {
    return `<div class="care-cell care-cell--empty" data-cell="${type}" data-child="${childId}"><span class="care-cell__main">+ Add</span></div>`;
  }
  function durationLabel(mins) {
    if (!mins && mins !== 0) return '';
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  function cellSummary(e) {
    if (e.entryType === 'meal') return `${e.mealType} · ${e.amount}`;
    if (e.entryType === 'toileting') return e.kind;
    if (e.entryType === 'mood') return MOOD_LABEL[e.mood] || e.mood;
    if (e.entryType === 'activity') return e.title;
    if (e.entryType === 'note') return e.text.length > 24 ? e.text.slice(0, 24) + '…' : e.text;
    if (e.entryType === 'photo') return e.caption || 'Photo';
    return '';
  }

  function renderGrid(children) {
    const panel = $('careGridPanel');
    const cols = ENTRY_ORDER;
    panel.innerHTML = `
      <div class="care-grid-wrap">
        <table class="care-table">
          <thead><tr>
            <th>Child</th>
            ${cols.map((t) => `<th class="care-th-icon">${ENTRY_LABEL[t]}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${children.map((c) => `
              <tr data-row-child="${c.id}" class="${selectedChildIds.has(c.id) ? 'is-selected' : ''}">
                <td>
                  <div class="care-row-child">
                    <span class="avatar" style="background: var(--color-accent-yellow); color: var(--color-text-on-accent);">${escapeHtml(initials(c.name))}</span>
                    <span class="care-row-child__text"><span class="cell-primary">${escapeHtml(c.name)}</span><span class="care-row-child__sub">${escapeHtml(c.room)}</span></span>
                  </div>
                </td>
                ${cols.map((t) => `<td>${gridCellHtml(c, t)}</td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="care-child-cards">${children.map((c) => mobileChildCardHtml(c)).join('')}</div>
    `;
    wireGridInteractions(panel, children);
  }

  function mobileChildCardHtml(child) {
    const selected = selectedChildIds.has(child.id);
    const active = activeNap(child.id, selectedDate);
    return `
      <div class="care-child-card${selected ? ' is-selected' : ''}" data-mobile-child="${child.id}">
        <div class="care-child-card__head">
          <span class="avatar avatar--sm" style="background: var(--color-accent-yellow); color: var(--color-text-on-accent);">${escapeHtml(initials(child.name))}</span>
          <div>
            <div class="care-child-card__name">${escapeHtml(child.name)}</div>
            <div class="care-child-card__sub">${escapeHtml(child.room)}${active ? ' · Napping' : ''}</div>
          </div>
        </div>
        <div class="care-child-card__rows">
          ${ENTRY_ORDER.filter((t) => t !== 'photo').map((t) => {
            const latest = t === 'nap' ? (active || latestOfType(child.id, selectedDate, 'nap')) : latestOfType(child.id, selectedDate, t);
            if (!latest) return `<div class="care-child-card__row">${ICON[t === 'toileting' ? 'toilet' : t]}<span>${ENTRY_LABEL[t]}: not logged</span></div>`;
            if (t === 'nap' && !latest.endTime) return `<div class="care-child-card__row">${ICON.nap}<span>Napping since ${formatTime12(latest.time)}</span></div>`;
            if (t === 'nap') return `<div class="care-child-card__row">${ICON.nap}<span>Slept ${durationLabel(latest.durationMin)} · ${formatTime12(latest.time)}</span></div>`;
            return `<div class="care-child-card__row">${ICON[t === 'toileting' ? 'toilet' : t]}<span>${escapeHtml(cellSummary(latest))} · ${formatTime12(latest.time)}</span></div>`;
          }).join('')}
        </div>
      </div>`;
  }

  function wireGridInteractions(panel, children) {
    panel.querySelectorAll('[data-cell]').forEach((cell) => {
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        openEntryModal(cell.dataset.cell, [cell.dataset.child]);
      });
    });
    panel.querySelectorAll('[data-row-child]').forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.dataset.rowChild;
        if (selectedChildIds.has(id)) selectedChildIds.delete(id); else selectedChildIds.add(id);
        render();
      });
    });
    panel.querySelectorAll('[data-mobile-child]').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.mobileChild;
        if (selectedChildIds.has(id)) selectedChildIds.delete(id); else selectedChildIds.add(id);
        render();
      });
    });
  }

  /* ========================================================================
     TIMELINE VIEW
     ======================================================================== */
  function renderTimeline(children) {
    const panel = $('careTimelinePanel');
    const idx = children.findIndex((c) => c.id === timelineChildId);
    const child = children[idx] || children[0];
    const entries = entriesFor(child.id, selectedDate);

    panel.innerHTML = `
      <div class="care-timeline-wrap">
        <div class="care-timeline-picker">
          ${children.map((c) => `
            <div class="care-timeline-picker__item${c.id === child.id ? ' is-active' : ''}" data-pick="${c.id}">
              <span class="avatar avatar--sm" style="background: var(--color-accent-yellow); color: var(--color-text-on-accent);">${escapeHtml(initials(c.name))}</span>
              <span class="care-timeline-picker__name">${escapeHtml(c.name)}</span>
            </div>`).join('')}
        </div>
        <div class="care-timeline-main">
          <div class="care-timeline-head">
            <span class="avatar avatar--lg" style="background: var(--color-accent-yellow); color: var(--color-text-on-accent);">${escapeHtml(initials(child.name))}</span>
            <div>
              <div class="care-timeline-head__name">${escapeHtml(child.name)}</div>
              <div class="care-timeline-head__sub">${escapeHtml(child.room)} · ${escapeHtml(formatDateHeading(selectedDate))}</div>
            </div>
            <div class="care-timeline-head__nav">
              <button class="btn btn--icon" type="button" id="timelinePrevChild" aria-label="Previous child">${ICON.chevronLeft}</button>
              <button class="btn btn--icon" type="button" id="timelineNextChild" aria-label="Next child">${ICON.chevronRight}</button>
            </div>
          </div>
          ${entries.length ? `<div class="care-timeline">${entries.map((e) => timelineItemHtml(e)).join('')}</div>` : timelineEmptyHtml()}
        </div>
      </div>`;

    panel.querySelectorAll('[data-pick]').forEach((item) => item.addEventListener('click', () => { timelineChildId = item.dataset.pick; render(); }));
    $('timelinePrevChild').addEventListener('click', () => { const i = (idx - 1 + children.length) % children.length; timelineChildId = children[i].id; render(); });
    $('timelineNextChild').addEventListener('click', () => { const i = (idx + 1) % children.length; timelineChildId = children[i].id; render(); });
    panel.querySelectorAll('[data-cell]').forEach((cell) => cell.addEventListener('click', () => openEntryModal(cell.dataset.cell, [cell.dataset.child])));
  }

  function timelineEmptyHtml() {
    return `<div class="state-panel" style="margin-top: var(--space-4);"><div class="state-panel__icon">${ICON.inbox}</div><div class="state-panel__title">No entries yet for this day</div><p class="state-panel__text">Use Quick Add to start logging this child's day.</p></div>`;
  }

  function timelineItemHtml(e) {
    let body = '';
    if (e.entryType === 'meal') {
      const itemNames = (e.items || []).map((i) => i.name).join(', ');
      body = `${escapeHtml(e.mealType)} · ${escapeHtml(e.amount)} eaten${itemNames ? ' — ' + escapeHtml(itemNames) : ''}${e.notes ? '<br>' + escapeHtml(e.notes) : ''}`;
    } else if (e.entryType === 'nap') {
      body = e.endTime
        ? `Slept from ${formatTime12(e.time)} to ${formatTime12(e.endTime)} (${durationLabel(e.durationMin)})`
        : `Started at ${formatTime12(e.time)} · <span class="care-live-timer" data-nap-start="${new Date(selectedDate + 'T' + e.time).toISOString()}">0m</span> so far`;
    } else if (e.entryType === 'toileting') {
      body = escapeHtml(e.kind) + (e.notes ? ' — ' + escapeHtml(e.notes) : '');
    } else if (e.entryType === 'mood') {
      body = escapeHtml(MOOD_LABEL[e.mood] || e.mood) + (e.notes ? ' — ' + escapeHtml(e.notes) : '');
    } else if (e.entryType === 'activity') {
      body = `<strong>${escapeHtml(e.title)}</strong>${e.description ? '<br>' + escapeHtml(e.description) : ''}`;
    } else if (e.entryType === 'note') {
      body = escapeHtml(e.text);
    } else if (e.entryType === 'photo') {
      body = (e.caption ? escapeHtml(e.caption) : 'Photo added') + (e.dataUrl ? `<div class="care-timeline-photo" style="background-image:url(${e.dataUrl}); background-size:cover; background-position:center;"></div>` : `<div class="care-timeline-photo">${ICON.photo}</div>`);
    }
    const icon = e.entryType === 'mood' ? (MOOD_ICON[e.mood] || ICON.mood) : ICON[e.entryType === 'toileting' ? 'toilet' : e.entryType];
    return `
      <div class="care-timeline-item">
        <span class="care-timeline-item__dot">${icon}</span>
        <div class="care-timeline-card" data-cell="${e.entryType}" data-child="${e.childId}">
          <div class="care-timeline-card__head">
            <span class="care-timeline-card__type">${ENTRY_LABEL[e.entryType]}</span>
            <span class="care-timeline-card__time">${formatTime12(e.time)}</span>
          </div>
          <div class="care-timeline-card__body">${body}</div>
        </div>
      </div>`;
  }

  /* ---------- live nap timer (updates text nodes only, no re-render) ---------- */
  function startNapTicker() {
    window.setInterval(() => {
      document.querySelectorAll('.care-live-timer').forEach((el) => {
        const start = new Date(el.dataset.napStart);
        const mins = Math.max(0, Math.round((Date.now() - start.getTime()) / 60000));
        el.textContent = durationLabel(mins) || '0m';
      });
    }, 1000);
  }

  /* ========================================================================
     MEAL MODAL
     ======================================================================== */
  function openMealModal(childIds) {
    mealContext = { childIds };
    $('mealModalFor').textContent = 'For: ' + namesOf(childIds);
    const menu = window.PlayStore.getMenuForDate(selectedDate);
    const availableTypes = menu ? Object.keys(menu.meals) : [];
    $('mealType').innerHTML = MEAL_TYPES.map((t) => `<option value="${t}"${availableTypes.indexOf(t) === -1 ? ' data-no-menu="1"' : ''}>${t}${availableTypes.indexOf(t) === -1 ? ' (no menu on file)' : ''}</option>`).join('');
    mealState.mealType = availableTypes.length ? availableTypes[0] : 'Lunch';
    $('mealType').value = mealState.mealType;
    renderMealItemsForType(menu);
    $('mealTime').value = nowTimeStr();
    $('mealNotes').value = '';
    mealState.amount = null;
    renderMealAmountChips();
    updateAllergyCheck();
    openModal('mealModalBackdrop');
  }
  function renderMealItemsForType(menu) {
    const items = (menu && menu.meals[mealState.mealType]) || [];
    mealState.items = items.map((it) => ({ name: it.name, allergens: it.allergens || [], checked: true }));
    renderMealItemsList();
    $('mealMenuHint').textContent = items.length ? "Prefilled from today's menu — adjust if the child ate something different." : 'No menu item on file for this meal — you can still log the amount eaten.';
  }
  function renderMealItemsList() {
    const list = $('mealItemsList');
    list.innerHTML = mealState.items.map((it, idx) => `
      <div class="check-row">
        <input type="checkbox" class="checkbox" id="mi-${idx}" data-idx="${idx}" ${it.checked ? 'checked' : ''} />
        <label for="mi-${idx}">${escapeHtml(it.name)}${it.allergens.length ? ` <span style="color:var(--color-text-muted); font-size:var(--fs-caption);">(${it.allergens.map(escapeHtml).join(', ')})</span>` : ''}</label>
      </div>`).join('') || '<p class="card__text" style="font-size:var(--fs-caption);">No menu items — add a note instead.</p>';
    list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => { mealState.items[Number(cb.dataset.idx)].checked = cb.checked; updateAllergyCheck(); });
    });
  }
  function renderMealAmountChips() {
    document.querySelectorAll('#mealAmountChips .care-chip').forEach((chip) => chip.classList.toggle('is-selected', chip.dataset.amount === mealState.amount));
  }
  function getCheckedMealItems() { return mealState.items.filter((it) => it.checked); }
  function updateAllergyCheck() {
    const children = (mealContext ? mealContext.childIds : []).map(childById).filter(Boolean);
    const safety = computeMealSafety(children, getCheckedMealItems());
    mealLastSafety = safety;
    const warnBox = $('mealAllergyWarning');
    const ackRow = $('mealAckRow');
    let html = '';
    if (safety.warnings.length) {
      html += `<div class="care-allergy-warning"><div class="care-allergy-warning__title">${ICON.alert} Allergy warning</div>` +
        safety.warnings.map((w) => `<div class="care-allergy-warning__item">Allergy warning: <strong>${escapeHtml(w.child.name)}</strong> is allergic to <strong>${escapeHtml(w.allergen)}</strong>. The selected menu contains ${escapeHtml(w.allergen)} (${escapeHtml(w.item.name)}).</div>`).join('') +
        `</div>`;
    }
    if (safety.unverifiable.length) {
      html += `<div class="inline-warning" style="margin-top: var(--space-3);">${safety.unverifiable.map((u) => `Allergy on file for ${escapeHtml(u.child.name)} — couldn't automatically match against today's menu. Please check manually.`).join('<br>')}</div>`;
    }
    warnBox.innerHTML = html;
    warnBox.hidden = !html;
    if (safety.warnings.length) {
      ackRow.hidden = false;
      $('mealAckCheckbox').checked = false;
    } else {
      ackRow.hidden = true;
    }
    updateMealSaveState();
  }
  function updateMealSaveState() {
    const needsAck = mealLastSafety.warnings.length > 0;
    $('mealSave').disabled = needsAck && !$('mealAckCheckbox').checked;
  }
  function wireMealModal() {
    const backdrop = $('mealModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('mealModalBackdrop'); });
    $('mealCancel').addEventListener('click', () => closeModal('mealModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('mealModalBackdrop'); });

    $('mealType').addEventListener('change', () => { mealState.mealType = $('mealType').value; renderMealItemsForType(window.PlayStore.getMenuForDate(selectedDate)); updateAllergyCheck(); });
    document.querySelectorAll('#mealAmountChips .care-chip').forEach((chip) => chip.addEventListener('click', () => { mealState.amount = chip.dataset.amount; renderMealAmountChips(); }));
    $('mealAckCheckbox').addEventListener('change', updateMealSaveState);

    $('mealSave').addEventListener('click', () => {
      if (!mealState.amount) { window.PlayShell.toast('error', 'Select an amount eaten', 'Choose None, Some, Most or All.'); return; }
      if (!$('mealTime').value) { window.PlayShell.toast('error', 'Set a time', 'Entry time is required.'); return; }
      if (mealLastSafety.warnings.length && !$('mealAckCheckbox').checked) return;
      submitWithLoading('mealSave', () => {
        const time = $('mealTime').value;
        const items = getCheckedMealItems().map((it) => ({ name: it.name, allergens: it.allergens }));
        const notes = $('mealNotes').value.trim();
        const acknowledged = mealLastSafety.warnings.length > 0;
        mealContext.childIds.forEach((childId) => {
          const childWarnings = mealLastSafety.warnings.filter((w) => w.child.id === childId).map((w) => ({ allergen: w.allergen, item: w.item.name }));
          addCareEntry({
            childId, classId: selectedClassId, entryType: 'meal', date: selectedDate, time,
            mealType: mealState.mealType, items, amount: mealState.amount, notes,
            allergyAcknowledged: acknowledged, allergyWarnings: childWarnings,
          });
        });
        closeModal('mealModalBackdrop');
        render();
        const n = mealContext.childIds.length;
        window.PlayShell.toast('success', 'Meal logged', `Saved for ${n} ${n === 1 ? 'child' : 'children'}.`);
      });
    });
  }

  /* ========================================================================
     NAP MODAL
     ======================================================================== */
  function openNapModal(childIds) {
    napContext = { childIds };
    $('napModalFor').textContent = 'For: ' + namesOf(childIds);
    if (childIds.length === 1) {
      const child = childIds[0];
      const active = activeNap(child, selectedDate);
      const latest = latestOfType(child, selectedDate, 'nap');
      if (active) { napMode = 'editActive'; napEditingEntryId = active.id; renderNapBody(active.time, ''); }
      else if (latest) { napMode = 'editCompleted'; napEditingEntryId = latest.id; renderNapBody(latest.time, latest.endTime); }
      else { napMode = 'start'; napEditingEntryId = null; renderNapBody(nowTimeStr(), null); }
    } else {
      napMode = 'bulkStart'; napEditingEntryId = null; renderNapBody(nowTimeStr(), null);
    }
    openModal('napModalBackdrop');
  }
  function renderNapBody(startTime, endTime) {
    const showEnd = napMode === 'editActive' || napMode === 'editCompleted';
    $('napBody').innerHTML = `
      <div class="input-grid" style="margin-top: var(--space-4);">
        <div class="field"><label class="field__label" for="napStartTime">Start time</label><input class="input" id="napStartTime" type="time" value="${startTime || ''}" /></div>
        <div class="field" id="napEndField" ${showEnd ? '' : 'hidden'}><label class="field__label" for="napEndTime">End time</label><input class="input" id="napEndTime" type="time" value="${endTime || ''}" /></div>
      </div>
      ${napMode === 'editActive' ? `<button class="btn btn--secondary btn--sm" type="button" id="napStopNowBtn" style="margin-top: var(--space-3);">Stop nap now</button>` : ''}
      <p class="field__error" id="err-napTimes" hidden style="margin-top: var(--space-3);"></p>
    `;
    const stopBtn = $('napStopNowBtn');
    if (stopBtn) stopBtn.addEventListener('click', () => { $('napEndTime').value = nowTimeStr(); });
    updateNapSaveLabel();
  }
  function updateNapSaveLabel() {
    const label = { start: 'Start nap', bulkStart: `Start nap for ${napContext.childIds.length} children`, editActive: 'Save', editCompleted: 'Save changes' }[napMode];
    $('napSaveLabel').textContent = label;
  }
  function wireNapModal() {
    const backdrop = $('napModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('napModalBackdrop'); });
    $('napCancel').addEventListener('click', () => closeModal('napModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('napModalBackdrop'); });

    $('napSave').addEventListener('click', () => {
      const start = $('napStartTime').value;
      const endEl = $('napEndTime');
      const end = endEl ? endEl.value : '';
      if (!start) { $('err-napTimes').hidden = false; $('err-napTimes').textContent = 'Start time is required.'; return; }
      if (end && end <= start) { $('err-napTimes').hidden = false; $('err-napTimes').textContent = 'End time must be after start time.'; return; }
      $('err-napTimes').hidden = true;

      submitWithLoading('napSave', () => {
        if (napMode === 'start' || napMode === 'bulkStart') {
          napContext.childIds.forEach((childId) => {
            if (activeNap(childId, selectedDate)) return; // never overwrite an existing running timer
            addCareEntry({ childId, classId: selectedClassId, entryType: 'nap', date: selectedDate, time: start, endTime: null, durationMin: null });
          });
          window.PlayShell.toast('success', 'Nap started', `${napContext.childIds.length} independent nap timer${napContext.childIds.length === 1 ? '' : 's'} running.`);
        } else {
          const entry = window.PlayStore.getById(napEditingEntryId);
          if (end) {
            const durationMin = Math.max(0, Math.round((new Date(selectedDate + 'T' + end) - new Date(selectedDate + 'T' + start)) / 60000));
            updateCareEntry(entry.id, { time: start, endTime: end, durationMin });
            window.PlayShell.toast('success', 'Nap ended', `Slept ${durationLabel(durationMin)}.`);
          } else {
            updateCareEntry(entry.id, { time: start });
            window.PlayShell.toast('success', 'Nap updated', 'Start time corrected.');
          }
        }
        closeModal('napModalBackdrop');
        render();
      });
    });
  }

  /* ========================================================================
     TOILETING MODAL
     ======================================================================== */
  function openToiletModal(childIds) {
    toiletContext = { childIds }; toiletKind = null;
    $('toiletModalFor').textContent = 'For: ' + namesOf(childIds);
    $('toiletTime').value = nowTimeStr();
    $('toiletNotes').value = '';
    document.querySelectorAll('#toiletChips .care-chip').forEach((c) => c.classList.remove('is-selected'));
    openModal('toiletModalBackdrop');
  }
  function wireToiletModal() {
    const backdrop = $('toiletModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('toiletModalBackdrop'); });
    $('toiletCancel').addEventListener('click', () => closeModal('toiletModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('toiletModalBackdrop'); });
    document.querySelectorAll('#toiletChips .care-chip').forEach((chip) => chip.addEventListener('click', () => {
      toiletKind = chip.dataset.kind;
      document.querySelectorAll('#toiletChips .care-chip').forEach((c) => c.classList.toggle('is-selected', c === chip));
    }));
    $('toiletSave').addEventListener('click', () => {
      if (!toiletKind) { window.PlayShell.toast('error', 'Choose a type', 'Select Wet, Dry, BM, Potty or Accident.'); return; }
      if (!$('toiletTime').value) { window.PlayShell.toast('error', 'Set a time', 'Entry time is required.'); return; }
      submitWithLoading('toiletSave', () => {
        const time = $('toiletTime').value; const notes = $('toiletNotes').value.trim();
        toiletContext.childIds.forEach((childId) => addCareEntry({ childId, classId: selectedClassId, entryType: 'toileting', date: selectedDate, time, kind: toiletKind, notes }));
        closeModal('toiletModalBackdrop'); render();
        window.PlayShell.toast('success', 'Toileting logged', `Saved for ${toiletContext.childIds.length} ${toiletContext.childIds.length === 1 ? 'child' : 'children'}.`);
      });
    });
  }

  /* ========================================================================
     MOOD MODAL
     ======================================================================== */
  function openMoodModal(childIds) {
    moodContext = { childIds }; moodValue = null;
    $('moodModalFor').textContent = 'For: ' + namesOf(childIds);
    $('moodTime').value = nowTimeStr();
    $('moodNotes').value = '';
    $('moodGrid').innerHTML = MOOD_ORDER.map((m) => `
      <button class="care-mood-btn" type="button" data-mood="${m}" aria-label="${MOOD_LABEL[m]}">
        ${MOOD_ICON[m]}<span class="care-mood-btn__label">${MOOD_LABEL[m]}</span>
      </button>`).join('');
    $('moodGrid').querySelectorAll('[data-mood]').forEach((btn) => btn.addEventListener('click', () => {
      moodValue = btn.dataset.mood;
      $('moodGrid').querySelectorAll('[data-mood]').forEach((b) => b.classList.toggle('is-selected', b === btn));
    }));
    openModal('moodModalBackdrop');
  }
  function wireMoodModal() {
    const backdrop = $('moodModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('moodModalBackdrop'); });
    $('moodCancel').addEventListener('click', () => closeModal('moodModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('moodModalBackdrop'); });
    $('moodSave').addEventListener('click', () => {
      if (!moodValue) { window.PlayShell.toast('error', 'Choose a mood', 'Select one of the five mood options.'); return; }
      if (!$('moodTime').value) { window.PlayShell.toast('error', 'Set a time', 'Entry time is required.'); return; }
      submitWithLoading('moodSave', () => {
        const time = $('moodTime').value; const notes = $('moodNotes').value.trim();
        moodContext.childIds.forEach((childId) => addCareEntry({ childId, classId: selectedClassId, entryType: 'mood', date: selectedDate, time, mood: moodValue, notes }));
        closeModal('moodModalBackdrop'); render();
        window.PlayShell.toast('success', 'Mood logged', `Saved for ${moodContext.childIds.length} ${moodContext.childIds.length === 1 ? 'child' : 'children'}.`);
      });
    });
  }

  /* ========================================================================
     ACTIVITY MODAL
     ======================================================================== */
  function openActivityModal(childIds) {
    activityContext = { childIds };
    $('activityModalFor').textContent = 'For: ' + namesOf(childIds);
    $('activityTitle').value = ''; $('activityDescription').value = ''; $('activityTime').value = nowTimeStr();
    setFieldError('activityTitle', null);
    openModal('activityModalBackdrop');
  }
  function wireActivityModal() {
    const backdrop = $('activityModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('activityModalBackdrop'); });
    $('activityCancel').addEventListener('click', () => closeModal('activityModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('activityModalBackdrop'); });
    $('activitySave').addEventListener('click', () => {
      const title = $('activityTitle').value.trim();
      if (!title) { setFieldError('activityTitle', 'Give this activity a title.'); return; }
      setFieldError('activityTitle', null);
      submitWithLoading('activitySave', () => {
        const description = $('activityDescription').value.trim(); const time = $('activityTime').value || nowTimeStr();
        activityContext.childIds.forEach((childId) => addCareEntry({ childId, classId: selectedClassId, entryType: 'activity', date: selectedDate, time, title, description }));
        closeModal('activityModalBackdrop'); render();
        window.PlayShell.toast('success', 'Activity logged', `Saved for ${activityContext.childIds.length} ${activityContext.childIds.length === 1 ? 'child' : 'children'}.`);
      });
    });
  }

  /* ========================================================================
     NOTE MODAL
     ======================================================================== */
  function openNoteModal(childIds) {
    noteContext = { childIds };
    $('noteModalFor').textContent = 'For: ' + namesOf(childIds);
    $('noteText').value = ''; $('noteTime').value = nowTimeStr();
    setFieldError('noteText', null);
    openModal('noteModalBackdrop');
  }
  function wireNoteModal() {
    const backdrop = $('noteModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('noteModalBackdrop'); });
    $('noteCancel').addEventListener('click', () => closeModal('noteModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('noteModalBackdrop'); });
    $('noteSave').addEventListener('click', () => {
      const text = $('noteText').value.trim();
      if (!text) { setFieldError('noteText', 'Write a note before saving.'); return; }
      setFieldError('noteText', null);
      submitWithLoading('noteSave', () => {
        const time = $('noteTime').value || nowTimeStr();
        noteContext.childIds.forEach((childId) => addCareEntry({ childId, classId: selectedClassId, entryType: 'note', date: selectedDate, time, text }));
        closeModal('noteModalBackdrop'); render();
        window.PlayShell.toast('success', 'Note saved', `Saved for ${noteContext.childIds.length} ${noteContext.childIds.length === 1 ? 'child' : 'children'}.`);
      });
    });
  }

  /* ========================================================================
     PHOTO MODAL
     ======================================================================== */
  const PHOTO_MAX_STORE_BYTES = 800 * 1024;
  function openPhotoModal(childIds) {
    photoContext = { childIds }; photoDataUrl = null; photoFileMeta = null;
    $('photoModalFor').textContent = 'For: ' + namesOf(childIds);
    $('photoFile').value = ''; $('photoCaption').value = ''; $('photoTime').value = nowTimeStr();
    $('photoPreviewWrap').hidden = true;
    setFieldError('photoFile', null);
    openModal('photoModalBackdrop');
  }
  function wirePhotoModal() {
    const backdrop = $('photoModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('photoModalBackdrop'); });
    $('photoCancel').addEventListener('click', () => closeModal('photoModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('photoModalBackdrop'); });

    $('photoFile').addEventListener('change', () => {
      const f = $('photoFile').files[0];
      photoDataUrl = null; photoFileMeta = null;
      if (!f) { $('photoPreviewWrap').hidden = true; return; }
      if (!/^image\//.test(f.type)) { setFieldError('photoFile', 'Please choose an image file.'); $('photoPreviewWrap').hidden = true; return; }
      setFieldError('photoFile', null);
      photoFileMeta = { name: f.name, size: f.size };
      const reader = new FileReader();
      reader.onload = () => {
        $('photoPreview').src = reader.result;
        $('photoPreviewWrap').hidden = false;
        if (f.size <= PHOTO_MAX_STORE_BYTES) photoDataUrl = reader.result;
      };
      reader.onerror = () => { window.PlayShell.toast('error', "Couldn't read photo", 'Please try a different file.'); };
      reader.readAsDataURL(f);
    });

    $('photoSave').addEventListener('click', () => {
      if (!photoFileMeta) { setFieldError('photoFile', 'Choose a photo to add.'); return; }
      setFieldError('photoFile', null);
      submitWithLoading('photoSave', () => {
        const caption = $('photoCaption').value.trim(); const time = $('photoTime').value || nowTimeStr();
        const storedLarge = photoFileMeta.size > PHOTO_MAX_STORE_BYTES;
        photoContext.childIds.forEach((childId) => addCareEntry({ childId, classId: selectedClassId, entryType: 'photo', date: selectedDate, time, caption, fileName: photoFileMeta.name, dataUrl: storedLarge ? null : photoDataUrl }));
        closeModal('photoModalBackdrop'); render();
        const n = photoContext.childIds.length;
        if (storedLarge) window.PlayShell.toast('success', 'Photo attached', `Saved as a reference for ${n} ${n === 1 ? 'child' : 'children'} — this file was too large to store in this demo, so only the filename and caption were kept.`);
        else window.PlayShell.toast('success', 'Photo added', `Saved for ${n} ${n === 1 ? 'child' : 'children'}.`);
      });
    });
  }
})();
