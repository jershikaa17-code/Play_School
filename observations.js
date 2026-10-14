/* ==========================================================================
   PLAY SCHOOL — Learning Observations & Documentation
   Single real data model: window.PlayStore 'Observation' records (see
   store.js's ensureObservationSeed). A published Observation that tags a
   child under a linked outcome IS that child's S28 portfolio entry AND S27
   outcome evidence — both are derived live by filtering published
   Observations, not stored as separate join records, which is why
   publishing/retrying can never create duplicate evidence and deleting can
   never leave a dangling reference. record.js's "Learning & Portfolio" tab
   reads the exact same records.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function initials(name) { return (name || '').trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase(); }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function formatDateTime(iso) { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d.getTime())) return '—'; return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function formatDateMed(iso) { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d.getTime())) return '—'; return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }

  const ICON = {
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg>',
    photoOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  };
  Object.assign(ICON, {
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
  });

  const CURRENT_AUTHOR = { id: 'S-3001', name: 'Nithya' };
  const MAX_PHOTOS = 6;
  const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

  let view = 'grid';
  let filters = { child: '', classId: '', area: '', author: '', dateFrom: '', dateTo: '', status: 'All', search: '' };
  let expandedNotes = new Set();
  let editingId = null;
  let composerPhotos = []; // [{id, dataUrl, name}]
  let composerChildIds = [];
  let composerOutcomeIds = [];
  let composerChildSearch = '';
  let composerNote = '';
  let composerSharedWithFamily = false;
  let pendingDeleteId = null;
  let pendingShareId = null;
  let lightboxPhotos = [];
  let lightboxIndex = 0;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', renderFeed);

  function init() {
    window.PlayShell.login();
    window.PlayShell.mount('observations', 'Learning Observations');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    wireHeader();
    wireToolbar();
    wireDetail();
    wireDelete();
    wireShare();
    wireLightbox();
    wireMobile();

    const params = new URLSearchParams(window.location.search);
    if (params.get('child')) filters.child = params.get('child');

    renderFilterOptions();
    render();
  }

  /* ---------- data access ---------- */
  function allObservations() { return window.PlayStore.getByType('Observation').filter((o) => o.status !== 'Deleted'); }
  function taggableChildren() { return window.PlayStore.getByType('Child').filter((c) => c.status === 'Active' || c.status === 'Starting soon'); }
  function activeFramework() { return window.PlayStore.getByType('Framework').find((f) => f.isActive); }
  function frameworkAreas() { const fw = activeFramework(); return fw ? window.PlayStore.getByType('FrameworkArea').filter((a) => a.frameworkId === fw.id) : []; }
  function frameworkOutcomes() { const fw = activeFramework(); return fw ? window.PlayStore.getByType('FrameworkOutcome').filter((o) => o.frameworkId === fw.id) : []; }
  function childById(id) { return window.PlayStore.getById(id); }
  function outcomeById(id) { return window.PlayStore.getById(id); }
  function childName(c) { return c ? (c.preferredName || c.name) : 'Unknown child'; }
  function role() { return window.PlayShell.getDemoRole(); }
  function canEdit(obs) { return role() === 'Director' || obs.authorId === CURRENT_AUTHOR.id; }
  function rootAreaOf(outcome) {
    if (!outcome) return null;
    let node = window.PlayStore.getById(outcome.parentId);
    while (node && node.parentId) node = window.PlayStore.getById(node.parentId);
    return node;
  }

  /* ========================================================================
     HEADER
     ======================================================================== */
  function wireHeader() {
    $('obsViewToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-view]');
      if (!btn) return;
      view = btn.dataset.view;
      $('obsViewToggle').querySelectorAll('.obs-view-toggle__btn').forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      renderFeed();
    });
    $('obsNewBtn').addEventListener('click', () => openComposer(null, []));
  }
  function renderStats() {
    const all = allObservations();
    const draft = all.filter((o) => o.status === 'Draft').length;
    const published = all.filter((o) => o.status === 'Published').length;
    $('obsStats').innerHTML = `
      <div><div class="obs-stat__value">${all.length}</div><div class="obs-stat__label">Total</div></div>
      <div><div class="obs-stat__value">${draft}</div><div class="obs-stat__label">Draft</div></div>
      <div><div class="obs-stat__value">${published}</div><div class="obs-stat__label">Published</div></div>`;
  }

  /* ========================================================================
     FILTERS
     ======================================================================== */
  function renderFilterOptions() {
    const children = taggableChildren().sort((a, b) => childName(a).localeCompare(childName(b)));
    const classes = window.PlayStore.getByType('Class');
    const areas = frameworkAreas().filter((a) => !a.parentId);
    const authors = [...new Map(allObservations().map((o) => [o.authorId, o.authorName])).entries()];
    const controlsHtml = `
      <select class="select select--sm" id="obsFilterChild"><option value="">All children</option>${children.map((c) => `<option value="${c.id}">${escapeHtml(childName(c))}</option>`).join('')}</select>
      <select class="select select--sm" id="obsFilterClass"><option value="">All classes</option>${classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select>
      <select class="select select--sm" id="obsFilterArea"><option value="">All areas</option>${areas.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('')}</select>
      <select class="select select--sm" id="obsFilterAuthor"><option value="">All authors</option>${authors.map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`).join('')}</select>
      <input class="input input--sm" id="obsFilterFrom" type="date" aria-label="From date" />
      <input class="input input--sm" id="obsFilterTo" type="date" aria-label="To date" />
      <select class="select select--sm" id="obsFilterStatus"><option value="All">All status</option><option value="Draft">Draft</option><option value="Published">Published</option></select>
      <button class="btn btn--text btn--sm" type="button" id="obsClearFilters">Clear filters</button>`;
    $('obsFiltersDesktop').innerHTML = controlsHtml;
    bindFilterControls($('obsFiltersDesktop'));
  }
  function bindFilterControls(scope) {
    const map = { obsFilterChild: 'child', obsFilterClass: 'classId', obsFilterArea: 'area', obsFilterAuthor: 'author', obsFilterFrom: 'dateFrom', obsFilterTo: 'dateTo', obsFilterStatus: 'status' };
    Object.keys(map).forEach((id) => {
      const el = scope.querySelector('#' + id);
      if (!el) return;
      el.value = filters[map[id]] || (map[id] === 'status' ? 'All' : '');
      el.addEventListener('change', () => { filters[map[id]] = el.value; render(); if (scope !== $('obsFiltersDesktop')) syncFilterUi(); });
    });
    const clearBtn = scope.querySelector('#obsClearFilters');
    if (clearBtn) clearBtn.addEventListener('click', clearFilters);
  }
  function clearFilters() {
    filters = { child: '', classId: '', area: '', author: '', dateFrom: '', dateTo: '', status: 'All', search: '' };
    $('obsSearch').value = '';
    syncFilterUi();
    render();
  }
  function syncFilterUi() {
    renderFilterOptions();
    if ($('obsFilterSheetBackdrop').classList.contains('is-open')) renderMobileFilterSheet();
  }
  function wireToolbar() {
    $('obsSearch').addEventListener('input', debounce(() => { filters.search = $('obsSearch').value.trim().toLowerCase(); renderResultsAndFeed(); }, 200));
    $('obsFilterMobileBtn').addEventListener('click', () => { renderMobileFilterSheet(); openSheet('obsFilterSheetBackdrop'); });
  }
  function renderMobileFilterSheet() {
    $('obsFilterSheetBody').innerHTML = `
      <div class="sheet__title">Filters</div>
      <div style="display:flex; flex-direction:column; gap:var(--space-3); margin-top: var(--space-3);" id="obsFilterSheetControls"></div>
      <button class="btn btn--accent" type="button" id="obsApplyFiltersBtn" style="width:100%; margin-top:var(--space-4);">Show results</button>`;
    const controls = $('obsFilterSheetControls');
    controls.innerHTML = $('obsFiltersDesktop').innerHTML.replace('obsClearFilters', 'obsClearFiltersSheet').replace(/id="obsFilter(\w+)"/g, 'id="obsFilterSheet$1"');
    const map = { obsFilterSheetChild: 'child', obsFilterSheetClass: 'classId', obsFilterSheetArea: 'area', obsFilterSheetAuthor: 'author', obsFilterSheetFrom: 'dateFrom', obsFilterSheetTo: 'dateTo', obsFilterSheetStatus: 'status' };
    Object.keys(map).forEach((id) => {
      const el = controls.querySelector('#' + id);
      if (!el) return;
      el.value = filters[map[id]] || (map[id] === 'status' ? 'All' : '');
      el.addEventListener('change', () => { filters[map[id]] = el.value; });
    });
    const clearBtn = controls.querySelector('#obsClearFiltersSheet');
    if (clearBtn) clearBtn.addEventListener('click', () => { clearFilters(); closeSheet('obsFilterSheetBackdrop'); });
    $('obsApplyFiltersBtn').addEventListener('click', () => { renderFilterOptions(); render(); closeSheet('obsFilterSheetBackdrop'); });
  }
  function activeFilterCount() {
    return Object.keys(filters).filter((k) => filters[k] && !(k === 'status' && filters[k] === 'All')).length;
  }
  function matchesFilters(o) {
    if (filters.child && !o.childIds.includes(filters.child)) return false;
    if (filters.classId) {
      const cls = window.PlayStore.getById(filters.classId);
      const inClass = cls && o.childIds.some((cid) => { const c = childById(cid); return c && c.room === cls.name; });
      if (!inClass) return false;
    }
    if (filters.area) {
      const inArea = o.outcomeIds.some((oid) => { const outcome = outcomeById(oid); const root = rootAreaOf(outcome); return root && root.id === filters.area; });
      if (!inArea) return false;
    }
    if (filters.author && o.authorId !== filters.author) return false;
    if (filters.status && filters.status !== 'All' && o.status !== filters.status) return false;
    if (filters.dateFrom && o.createdAt.slice(0, 10) < filters.dateFrom) return false;
    if (filters.dateTo && o.createdAt.slice(0, 10) > filters.dateTo) return false;
    if (filters.search) {
      const hay = (o.note + ' ' + o.childIds.map((id) => childName(childById(id))).join(' ')).toLowerCase();
      if (!hay.includes(filters.search)) return false;
    }
    return true;
  }
  function filteredObservations() {
    return allObservations().filter(matchesFilters).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  function renderActiveChips() {
    const chips = [];
    if (filters.child) chips.push({ key: 'child', label: 'Child: ' + childName(childById(filters.child)) });
    if (filters.classId) { const c = window.PlayStore.getById(filters.classId); chips.push({ key: 'classId', label: 'Class: ' + (c ? c.name : '') }); }
    if (filters.area) { const a = window.PlayStore.getById(filters.area); chips.push({ key: 'area', label: 'Area: ' + (a ? a.name : '') }); }
    if (filters.author) { const obs = allObservations().find((o) => o.authorId === filters.author); chips.push({ key: 'author', label: 'Author: ' + (obs ? obs.authorName : '') }); }
    if (filters.dateFrom) chips.push({ key: 'dateFrom', label: 'From ' + filters.dateFrom });
    if (filters.dateTo) chips.push({ key: 'dateTo', label: 'To ' + filters.dateTo });
    if (filters.status && filters.status !== 'All') chips.push({ key: 'status', label: filters.status });
    if (filters.search) chips.push({ key: 'search', label: 'Search: "' + filters.search + '"' });
    $('obsActiveChips').innerHTML = chips.map((c) => `<span class="chip" data-chip-key="${c.key}">${escapeHtml(c.label)}<span class="chip__remove" data-chip-remove="${c.key}">&times;</span></span>`).join('');
    $('obsActiveChips').querySelectorAll('[data-chip-remove]').forEach((el) => el.addEventListener('click', () => {
      const key = el.dataset.chipRemove;
      filters[key] = key === 'status' ? 'All' : '';
      if (key === 'search') $('obsSearch').value = '';
      syncFilterUi();
      render();
    }));
  }

  /* ========================================================================
     FEED
     ======================================================================== */
  function render() { renderStats(); renderActiveChips(); renderResultsAndFeed(); }
  function renderResultsAndFeed() {
    const list = filteredObservations();
    $('obsResultsCount').textContent = list.length + ' observation' + (list.length === 1 ? '' : 's');
    renderActiveChips();
    renderFeed();
  }
  function noteExpanded(id) { return expandedNotes.has(id); }
  function photosGridHtml(obs) {
    const photos = obs.photos || [];
    if (!photos.length) {
      return `<div class="obs-card__photo-placeholder">${ICON.photoOff}<span>No photo attached</span></div>`;
    }
    const shown = photos.slice(0, 3);
    const cls = shown.length === 1 ? '' : shown.length === 2 ? ' obs-card__photos--grid2' : ' obs-card__photos--grid3';
    const extra = photos.length - shown.length;
    return `<div class="${cls.trim()}" style="width:100%; height:100%;">${shown.map((p) => `<img src="${p.dataUrl}" alt="" loading="lazy" />`).join('')}</div>${extra > 0 ? `<div class="obs-card__photo-more">+${extra}</div>` : ''}`;
  }
  function childrenRowHtml(obs) {
    const kids = obs.childIds.map(childById).filter(Boolean);
    const shown = kids.slice(0, 3);
    const extra = kids.length - shown.length;
    return `
      <div class="avatar-group">${shown.map((c) => `<span class="avatar avatar--sm" title="${escapeHtml(childName(c))}">${initials(childName(c))}</span>`).join('')}${extra > 0 ? `<span class="obs-card__more-badge" title="${kids.slice(3).map((c) => escapeHtml(childName(c))).join(', ')}">+${extra}</span>` : ''}</div>
      <span class="obs-card__children-names">${escapeHtml(kids.map(childName).join(', ') || 'No children tagged')}</span>`;
  }
  function outcomeChipsHtml(obs) {
    if (!obs.outcomeIds.length) return '';
    return `<div class="obs-card__outcomes">${obs.outcomeIds.map((id) => {
      const o = outcomeById(id);
      if (!o) return `<span class="obs-outcome-chip obs-outcome-chip--stale" title="This outcome no longer exists in the framework">Removed outcome</span>`;
      return `<span class="obs-outcome-chip" title="${escapeHtml(o.label)}">${escapeHtml(o.code)}</span>`;
    }).join('')}</div>`;
  }
  function cardHtml(obs) {
    const expanded = noteExpanded(obs.id);
    const noteOverflows = (obs.note || '').length > 160 || (obs.note || '').split('\n').length > 3;
    const editable = canEdit(obs);
    return `
    <article class="obs-card" data-obs-card="${obs.id}">
      <div class="obs-card__photos" data-open-photos="${obs.id}">
        ${photosGridHtml(obs)}
        <span class="badge ${obs.status === 'Published' ? 'badge--success' : 'badge--warning'} obs-card__status">${obs.status}</span>
        <span class="obs-card__share-indicator ${obs.sharedWithFamily ? 'obs-card__share-indicator--shared' : 'obs-card__share-indicator--private'}">${obs.sharedWithFamily ? ICON.share + ' Shared' : ICON.lock + ' Not shared'}</span>
      </div>
      <div class="obs-card__body">
        <div class="obs-card__children">${childrenRowHtml(obs)}</div>
        <p class="obs-card__note${expanded ? '' : ' is-clamped'}">${escapeHtml(obs.note)}</p>
        ${noteOverflows ? `<button class="obs-card__note-toggle" type="button" data-toggle-note="${obs.id}">${expanded ? 'Show less' : 'Read more'}</button>` : ''}
        ${outcomeChipsHtml(obs)}
        <div class="obs-card__footer">
          <span class="obs-card__author"><b>${escapeHtml(obs.authorName)}</b> · ${formatDateMed(obs.createdAt)}</span>
          <div class="obs-card__actions">
            <button class="obs-card__action-btn" type="button" data-view-obs="${obs.id}" title="View details" aria-label="View details">${ICON.eye}</button>
            ${editable ? `<button class="obs-card__action-btn" type="button" data-edit-obs="${obs.id}" title="Edit" aria-label="Edit">${ICON.pencil}</button>` : ''}
            ${editable && obs.status === 'Draft' ? `<button class="obs-card__action-btn" type="button" data-publish-obs="${obs.id}" title="Publish" aria-label="Publish">${ICON.send}</button>` : ''}
            ${editable ? `<button class="obs-card__action-btn" type="button" data-delete-obs="${obs.id}" title="Delete" aria-label="Delete">${ICON.trash}</button>` : ''}
          </div>
          <div class="obs-card__menu-wrap filter-dropdown" data-menu-wrap="${obs.id}">
            <button class="obs-card__action-btn" type="button" data-menu-toggle="${obs.id}" aria-label="More actions">${ICON.more}</button>
            <div class="filter-dropdown__panel">
              <div class="filter-dropdown__option" data-view-obs="${obs.id}">${ICON.eye} View details</div>
              ${editable ? `<div class="filter-dropdown__option" data-edit-obs="${obs.id}">${ICON.pencil} Edit</div>` : ''}
              ${editable && obs.status === 'Draft' ? `<div class="filter-dropdown__option" data-publish-obs="${obs.id}">${ICON.send} Publish</div>` : ''}
              ${editable ? `<div class="filter-dropdown__option filter-dropdown__option--danger" data-delete-obs="${obs.id}">${ICON.trash} Delete</div>` : ''}
            </div>
          </div>
        </div>
      </div>
    </article>`;
  }
  function renderFeed() {
    const list = filteredObservations();
    const feed = $('obsFeed');
    feed.classList.toggle('is-list', view === 'list');
    if (!list.length) {
      feed.innerHTML = '';
      $('obsFeedEmpty').hidden = false;
      $('obsFeedEmpty').innerHTML = `<div class="state-panel">
        <div class="state-panel__icon">${ICON.inbox}</div>
        <div class="state-panel__title">No observations match these filters</div>
        <p class="state-panel__text">Try widening your search, or capture a new learning moment.</p>
        <div class="state-panel__action"><button class="btn btn--accent" type="button" id="obsEmptyNewBtn">+ New Observation</button></div>
      </div>`;
      const btn = $('obsEmptyNewBtn'); if (btn) btn.addEventListener('click', () => openComposer(null, []));
      return;
    }
    $('obsFeedEmpty').hidden = true;
    feed.innerHTML = list.map(cardHtml).join('');
    feed.querySelectorAll('[data-toggle-note]').forEach((el) => el.addEventListener('click', () => { const id = el.dataset.toggleNote; if (expandedNotes.has(id)) expandedNotes.delete(id); else expandedNotes.add(id); renderFeed(); }));
    feed.querySelectorAll('[data-open-photos]').forEach((el) => el.addEventListener('click', () => { const obs = window.PlayStore.getById(el.dataset.openPhotos); if (obs.photos && obs.photos.length) openLightbox(obs.photos, 0); else openDetail(obs.id); }));
    feed.querySelectorAll('[data-view-obs]').forEach((el) => el.addEventListener('click', () => openDetail(el.dataset.viewObs)));
    feed.querySelectorAll('[data-edit-obs]').forEach((el) => el.addEventListener('click', () => openComposer(el.dataset.editObs)));
    feed.querySelectorAll('[data-publish-obs]').forEach((el) => el.addEventListener('click', () => publishObservation(el.dataset.publishObs)));
    feed.querySelectorAll('[data-delete-obs]').forEach((el) => el.addEventListener('click', () => requestDelete(el.dataset.deleteObs)));
    feed.querySelectorAll('[data-menu-toggle]').forEach((btn) => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wrap = btn.closest('[data-menu-wrap]');
      const wasOpen = wrap.classList.contains('is-open');
      feed.querySelectorAll('.obs-card__menu-wrap.is-open').forEach((w) => w.classList.remove('is-open'));
      if (!wasOpen) wrap.classList.add('is-open');
    }));
  }
  document.addEventListener('click', () => { document.querySelectorAll('.obs-card__menu-wrap.is-open').forEach((w) => w.classList.remove('is-open')); });

  /* ========================================================================
     COMPOSER (new / edit)
     ======================================================================== */
  function resetComposerState() {
    editingId = null; composerPhotos = []; composerChildIds = []; composerOutcomeIds = []; composerChildSearch = ''; composerNote = ''; composerSharedWithFamily = false;
  }
  function openComposer(obsId, presetPhotos) {
    const obs = obsId ? window.PlayStore.getById(obsId) : null;
    if (obs && !canEdit(obs)) { window.PlayShell.toast('error', "Can't edit", 'Only the author or a Director can edit this observation.'); return; }
    resetComposerState();
    if (obs) {
      editingId = obs.id;
      composerPhotos = (obs.photos || []).slice();
      composerChildIds = (obs.childIds || []).slice();
      composerOutcomeIds = (obs.outcomeIds || []).slice();
      composerNote = obs.note || '';
      composerSharedWithFamily = !!obs.sharedWithFamily;
    } else if (presetPhotos && presetPhotos.length) {
      composerPhotos = presetPhotos;
    }
    $('obsComposerTitle').textContent = obs ? 'Edit observation' : 'New observation';
    renderComposerBody(obs);
    openModal('obsComposerBackdrop');
  }
  function composerPhotosHtml() {
    return `
      <div class="obs-dropzone" id="obsDropzone" tabindex="0" role="button" aria-label="Add photos">
        ${ICON.upload}
        <div class="obs-dropzone__text">Drag photos here, or click to choose</div>
        <div class="obs-dropzone__hint">JPG or PNG, up to 5MB each, ${MAX_PHOTOS} max</div>
      </div>
      <input type="file" id="obsPhotoInput" accept="image/*" multiple hidden />
      <div class="obs-photo-error" id="obsPhotoError" hidden></div>
      <div class="obs-photo-previews" id="obsPhotoPreviews">${composerPhotos.map((p) => `<div class="obs-photo-preview"><img src="${p.dataUrl}" alt="" /><button type="button" class="obs-photo-preview__remove" data-remove-photo="${p.id}" aria-label="Remove photo">${ICON.close}</button></div>`).join('')}</div>`;
  }
  function outcomeTreeHtml() {
    const areas = frameworkAreas().filter((a) => !a.parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
    const visibleOutcome = (o) => o.visible !== false || composerOutcomeIds.includes(o.id);
    function renderNode(node) {
      const subs = frameworkAreas().filter((a) => a.parentId === node.id);
      const outcomes = frameworkOutcomes().filter((o) => o.parentId === node.id).filter(visibleOutcome).sort((a, b) => (a.order || 0) - (b.order || 0));
      return `
        <div class="obs-outcome-area">${escapeHtml(node.name)}</div>
        ${outcomes.map((o) => outcomeRowHtml(o)).join('')}
        ${subs.map((s) => `<div style="margin-left:14px;">${renderNode(s)}</div>`).join('')}`;
    }
    function outcomeRowHtml(o) {
      const checked = composerOutcomeIds.includes(o.id);
      return `<label class="obs-outcome-row"><input type="checkbox" data-outcome-check="${o.id}" ${checked ? 'checked' : ''} /><span><b>${escapeHtml(o.code)}</b> ${escapeHtml(o.label)}${o.visible === false ? ' <i style="color:var(--color-text-muted);">(hidden in framework)</i>' : ''}</span></label>`;
    }
    if (!areas.length) return `<p style="padding:var(--space-3); font-size:var(--fs-caption); color:var(--color-text-muted);">No active learning framework configured yet.</p>`;
    return areas.map(renderNode).join('');
  }
  function selectedOutcomeChipsHtml() {
    return composerOutcomeIds.map((id) => { const o = outcomeById(id); if (!o) return ''; return `<span class="obs-child-chip">${escapeHtml(o.code)}<button type="button" data-remove-outcome="${id}" aria-label="Remove">${ICON.close}</button></span>`; }).join('');
  }
  function selectedChildChipsHtml() {
    return composerChildIds.map((id) => { const c = childById(id); if (!c) return ''; return `<span class="obs-child-chip"><span class="avatar avatar--sm">${initials(childName(c))}</span>${escapeHtml(childName(c))}<button type="button" data-remove-child="${id}" aria-label="Remove">${ICON.close}</button></span>`; }).join('');
  }
  function renderComposerBody(obs) {
    $('obsComposerBody').innerHTML = `
      <div class="obs-composer-grid">
        <div>
          <div class="obs-section-label">Photos</div>
          ${composerPhotosHtml()}
          <div class="obs-section-label" style="margin-top:var(--space-5);">Observation note</div>
          <textarea class="textarea" id="obsNoteInput" rows="6" placeholder="Describe what you observed — what the child did, said, or tried…">${escapeHtml(composerNote)}</textarea>
          <div class="obs-ai-panel" style="margin-top:var(--space-4);">
            <div class="obs-ai-panel__label">${ICON.sparkle} AI suggestions</div>
            <div class="obs-ai-panel__text">This demo doesn't have an AI writing/outcome-suggestion service connected yet. This panel is the integration point — once connected, suggestions would appear here for you to accept, edit, or dismiss. They would never auto-save or auto-publish.</div>
          </div>
          <div class="obs-section-label" style="margin-top:var(--space-5);">Family sharing</div>
          <label class="obs-sharing-toggle">
            <input type="checkbox" class="checkbox" id="obsShareCheck" ${composerSharedWithFamily ? 'checked' : ''} />
            <span><strong>Share with tagged families</strong><div class="obs-sharing-toggle__text">When shared, this observation becomes visible to the families of every tagged child once published. Leave unchecked to keep it internal for now.</div></span>
          </label>
        </div>
        <div>
          <div class="obs-section-label">Tagged children</div>
          <div class="obs-child-picker">
            <input class="input" id="obsChildSearch" type="text" placeholder="Search enrolled children…" autocomplete="off" />
            <div class="obs-child-results" id="obsChildResults" hidden></div>
          </div>
          <div class="obs-chip-row" id="obsChildChips">${selectedChildChipsHtml()}</div>
          <div class="obs-section-label" style="margin-top:var(--space-5);">Link learning outcomes</div>
          <div class="obs-outcome-tree" id="obsOutcomeTree">${outcomeTreeHtml()}</div>
          <div class="obs-chip-row" id="obsOutcomeChips">${selectedOutcomeChipsHtml()}</div>
          <div class="obs-section-label" style="margin-top:var(--space-5);">Author &amp; date</div>
          <p style="font-size:var(--fs-body-sm); color:var(--color-text-secondary);">${escapeHtml(obs ? obs.authorName : CURRENT_AUTHOR.name)} · ${formatDateTime(obs ? obs.createdAt : new Date().toISOString())}</p>
        </div>
      </div>
      <div class="obs-composer-footer">
        <span class="obs-composer-footer__spacer"></span>
        <button class="btn btn--secondary" type="button" id="obsSaveDraftBtn">Save Draft</button>
        <button class="btn btn--accent" type="button" id="obsPublishBtn">Publish</button>
      </div>`;
    bindComposerEvents(obs);
  }
  function bindComposerEvents(obs) {
    const dropzone = $('obsDropzone');
    const fileInput = $('obsPhotoInput');
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('is-dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
    dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('is-dragover'); handleFiles(e.dataTransfer.files, obs); });
    fileInput.addEventListener('change', () => handleFiles(fileInput.files, obs));
    $('obsPhotoPreviews').querySelectorAll('[data-remove-photo]').forEach((btn) => btn.addEventListener('click', () => { composerPhotos = composerPhotos.filter((p) => p.id !== btn.dataset.removePhoto); renderComposerBody(obs); }));

    $('obsNoteInput').addEventListener('input', () => { composerNote = $('obsNoteInput').value; });
    $('obsShareCheck').addEventListener('change', () => { composerSharedWithFamily = $('obsShareCheck').checked; });

    const childSearch = $('obsChildSearch');
    childSearch.value = composerChildSearch;
    childSearch.addEventListener('input', () => { composerChildSearch = childSearch.value; renderChildResults(); });
    childSearch.addEventListener('focus', renderChildResults);
    document.addEventListener('click', closeChildResultsOnOutsideClick);
    $('obsChildChips').querySelectorAll('[data-remove-child]').forEach((btn) => btn.addEventListener('click', () => { composerChildIds = composerChildIds.filter((id) => id !== btn.dataset.removeChild); renderComposerBody(obs); }));

    $('obsOutcomeTree').querySelectorAll('[data-outcome-check]').forEach((cb) => cb.addEventListener('change', () => {
      const id = cb.dataset.outcomeCheck;
      if (cb.checked) { if (!composerOutcomeIds.includes(id)) composerOutcomeIds.push(id); }
      else composerOutcomeIds = composerOutcomeIds.filter((x) => x !== id);
      renderComposerBody(obs);
    }));
    $('obsOutcomeChips').querySelectorAll('[data-remove-outcome]').forEach((btn) => btn.addEventListener('click', () => { composerOutcomeIds = composerOutcomeIds.filter((id) => id !== btn.dataset.removeOutcome); renderComposerBody(obs); }));

    $('obsSaveDraftBtn').addEventListener('click', () => saveObservation('Draft'));
    $('obsPublishBtn').addEventListener('click', () => saveObservation('Published'));
  }
  function closeChildResultsOnOutsideClick(e) {
    const results = $('obsChildResults');
    if (!results || results.hidden) return;
    if (!e.target.closest('.obs-child-picker')) { results.hidden = true; }
  }
  function renderChildResults() {
    const results = $('obsChildResults');
    if (!results) return;
    const term = composerChildSearch.trim().toLowerCase();
    const pool = taggableChildren().filter((c) => !term || childName(c).toLowerCase().includes(term)).slice(0, 12);
    if (!pool.length) { results.innerHTML = `<div class="obs-child-result-row" aria-disabled="true">No matching children</div>`; results.hidden = false; return; }
    results.innerHTML = pool.map((c) => {
      const already = composerChildIds.includes(c.id);
      return `<div class="obs-child-result-row" data-pick-child="${c.id}" aria-disabled="${already}">
        <span class="avatar avatar--sm">${initials(childName(c))}</span>
        <span>${escapeHtml(childName(c))}<div style="font-size:var(--fs-caption); color:var(--color-text-muted);">${escapeHtml(c.room || '')}</div></span>
        ${already ? '<span class="badge badge--neutral" style="margin-left:auto;">Added</span>' : ''}
      </div>`;
    }).join('');
    results.hidden = false;
    results.querySelectorAll('[data-pick-child]').forEach((row) => row.addEventListener('click', () => {
      const id = row.dataset.pickChild;
      if (!composerChildIds.includes(id)) composerChildIds.push(id);
      composerChildSearch = '';
      const obs = editingId ? window.PlayStore.getById(editingId) : null;
      renderComposerBody(obs);
    }));
  }
  function handleFiles(fileList, obs) {
    const errEl = $('obsPhotoError');
    errEl.hidden = true;
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (composerPhotos.length + files.length > MAX_PHOTOS) { errEl.hidden = false; errEl.textContent = `You can attach up to ${MAX_PHOTOS} photos.`; return; }
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) { errEl.hidden = false; errEl.textContent = file.name + ' is not a supported image type.'; return; }
      if (file.size > MAX_PHOTO_BYTES) { errEl.hidden = false; errEl.textContent = file.name + ' is larger than 5MB.'; return; }
      const reader = new FileReader();
      reader.onload = () => { composerPhotos.push({ id: uid('PHOTO'), dataUrl: reader.result, name: file.name }); renderComposerBody(obs); };
      reader.onerror = () => { errEl.hidden = false; errEl.textContent = 'Could not read ' + file.name + '. Please try again.'; };
      reader.readAsDataURL(file);
    });
  }
  function saveObservation(targetStatus) {
    composerNote = $('obsNoteInput').value;
    composerSharedWithFamily = $('obsShareCheck').checked;
    const note = composerNote;
    const sharedWithFamily = composerSharedWithFamily;
    if (targetStatus === 'Published') {
      if (!note.trim()) { window.PlayShell.toast('error', 'Add a note first', 'Describe what you observed before publishing.'); return; }
      if (!composerChildIds.length) { window.PlayShell.toast('error', 'Tag at least one child', 'Publishing requires at least one tagged child.'); return; }
    } else if (!note.trim() && !composerPhotos.length) {
      window.PlayShell.toast('error', 'Nothing to save', 'Add a note or a photo before saving a draft.'); return;
    }
    const btn = targetStatus === 'Published' ? $('obsPublishBtn') : $('obsSaveDraftBtn');
    btn.disabled = true; btn.classList.add('is-loading');
    const now = new Date().toISOString();
    try {
      if (editingId) {
        const existing = window.PlayStore.getById(editingId);
        if (!existing || !canEdit(existing)) throw new Error('permission');
        const wasPublished = existing.status === 'Published';
        const patch = {
          note, photos: composerPhotos, childIds: composerChildIds.slice(), outcomeIds: composerOutcomeIds.slice(),
          sharedWithFamily, updatedAt: now,
          status: wasPublished ? 'Published' : targetStatus,
          publishedAt: wasPublished ? existing.publishedAt : (targetStatus === 'Published' ? now : null),
          sharedAt: sharedWithFamily ? (existing.sharedAt || now) : null,
        };
        const result = window.PlayStore.updateRecord(editingId, patch);
        if (!result) throw new Error('save-failed');
        window.PlayShell.toast('success', 'Observation updated', wasPublished ? 'Changes are reflected in every tagged child’s portfolio.' : 'Draft updated.');
      } else {
        const record = {
          id: uid('OBS'), type: 'Observation', note, photos: composerPhotos, childIds: composerChildIds.slice(), outcomeIds: composerOutcomeIds.slice(),
          authorId: CURRENT_AUTHOR.id, authorName: CURRENT_AUTHOR.name, status: targetStatus, sharedWithFamily,
          createdAt: now, updatedAt: now, publishedAt: targetStatus === 'Published' ? now : null, sharedAt: sharedWithFamily ? now : null,
        };
        window.PlayStore.addRecord(record);
        window.PlayShell.toast('success', targetStatus === 'Published' ? 'Observation published' : 'Draft saved', targetStatus === 'Published' ? `Added to the portfolio of ${composerChildIds.length} child${composerChildIds.length === 1 ? '' : 'ren'}.` : 'You can publish it later from the feed.');
      }
      closeModal('obsComposerBackdrop');
      resetComposerState();
      render();
    } catch (e) {
      window.PlayShell.toast('error', "Couldn't save", e.message === 'permission' ? 'You no longer have permission to edit this observation.' : 'Please try again.');
    } finally {
      btn.disabled = false; btn.classList.remove('is-loading');
    }
  }

  /* ========================================================================
     PUBLISH (from feed, drafts only) / DELETE / SHARE
     ======================================================================== */
  function publishObservation(id) {
    const obs = window.PlayStore.getById(id);
    if (!obs) return;
    if (!canEdit(obs)) { window.PlayShell.toast('error', "Can't publish", 'Only the author or a Director can publish this observation.'); return; }
    if (obs.status === 'Published') return; // idempotent — already published, nothing to do
    if (!obs.note || !obs.note.trim()) { window.PlayShell.toast('error', "Can't publish yet", 'Add an observation note first.'); return; }
    if (!obs.childIds || !obs.childIds.length) { window.PlayShell.toast('error', "Can't publish yet", 'Tag at least one child first.'); return; }
    const now = new Date().toISOString();
    const result = window.PlayStore.updateRecord(id, { status: 'Published', publishedAt: now, updatedAt: now });
    if (!result) { window.PlayShell.toast('error', "Couldn't publish", 'Please try again.'); return; }
    window.PlayShell.toast('success', 'Observation published', `Now in the portfolio of ${obs.childIds.length} child${obs.childIds.length === 1 ? '' : 'ren'} and linked as outcome evidence.`);
    render();
  }
  function wireDelete() {
    $('obsConfirmDeleteBtn').addEventListener('click', () => {
      if (!pendingDeleteId) return;
      const obs = window.PlayStore.getById(pendingDeleteId);
      if (!obs || !canEdit(obs)) { window.PlayShell.toast('error', "Can't delete", 'Only the author or a Director can delete this observation.'); closeModal('obsDeleteBackdrop'); return; }
      const result = window.PlayStore.updateRecord(pendingDeleteId, { status: 'Deleted', deletedAt: new Date().toISOString() });
      if (!result) { window.PlayShell.toast('error', "Couldn't delete", 'Please try again.'); return; }
      window.PlayShell.toast('success', 'Observation deleted', '');
      pendingDeleteId = null;
      closeModal('obsDeleteBackdrop');
      render();
    });
  }
  function requestDelete(id) {
    const obs = window.PlayStore.getById(id);
    if (!canEdit(obs)) { window.PlayShell.toast('error', "Can't delete", 'Only the author or a Director can delete this observation.'); return; }
    pendingDeleteId = id;
    const impact = obs.status === 'Published' ? ` This is part of ${obs.childIds.length} ${obs.childIds.length === 1 ? 'child’s portfolio' : 'children’s portfolios'} and linked to ${obs.outcomeIds.length} outcome${obs.outcomeIds.length === 1 ? '' : 's'} as evidence — deleting removes it from those records too.` : '';
    $('obsDeleteText').textContent = 'This cannot be undone from the feed.' + impact;
    openModal('obsDeleteBackdrop');
  }
  function wireShare() {
    $('obsConfirmShareBtn').addEventListener('click', () => {
      if (!pendingShareId) return;
      const now = new Date().toISOString();
      const result = window.PlayStore.updateRecord(pendingShareId, { sharedWithFamily: true, sharedAt: now });
      if (!result) { window.PlayShell.toast('error', "Couldn't share", 'Please try again.'); return; }
      window.PlayShell.toast('success', 'Shared with family', '');
      pendingShareId = null;
      closeModal('obsShareBackdrop');
      render();
    });
  }
  function requestShare(id) {
    const obs = window.PlayStore.getById(id);
    if (!obs || obs.status !== 'Published') { window.PlayShell.toast('error', "Can't share yet", 'Publish this observation first.'); return; }
    pendingShareId = id;
    $('obsShareText').textContent = `This will make the observation and its photos visible to the families of ${obs.childIds.map((cid) => childName(childById(cid))).join(', ')}.`;
    openModal('obsShareBackdrop');
  }

  /* ========================================================================
     DETAILS
     ======================================================================== */
  function wireDetail() { /* content rendered on open */ }
  function openDetail(id) {
    const obs = window.PlayStore.getById(id);
    if (!obs) return;
    const kids = obs.childIds.map(childById).filter(Boolean);
    const editable = canEdit(obs);
    $('obsDetailBody').innerHTML = `
      ${(obs.photos || []).length ? `<div class="obs-detail-photos">${obs.photos.map((p, i) => `<img src="${p.dataUrl}" alt="" data-detail-photo="${i}" />`).join('')}</div>` : `<div class="obs-card__photo-placeholder" style="aspect-ratio:21/9; border-radius:var(--radius-md); margin-bottom:var(--space-4);">${ICON.photoOff}<span>No photo attached</span></div>`}
      <div class="obs-detail-section">
        <span class="badge ${obs.status === 'Published' ? 'badge--success' : 'badge--warning'}">${obs.status}</span>
        <span class="badge ${obs.sharedWithFamily ? 'badge--primary' : 'badge--neutral'}" style="margin-left:6px;">${obs.sharedWithFamily ? 'Shared with family' : 'Not shared'}</span>
      </div>
      <div class="obs-detail-section"><div class="obs-section-label">Note</div><p style="white-space:pre-wrap; font-size:var(--fs-body-sm); color:var(--color-text-secondary);">${escapeHtml(obs.note)}</p></div>
      <div class="obs-detail-section"><div class="obs-section-label">Tagged children</div><div class="avatar-row" style="flex-wrap:wrap;">${kids.map((c) => `<span class="chip">${escapeHtml(childName(c))}</span>`).join('') || '<span style="color:var(--color-text-muted); font-size:var(--fs-caption);">None</span>'}</div></div>
      <div class="obs-detail-section"><div class="obs-section-label">Linked outcomes</div>${outcomeChipsHtml(obs) || '<span style="color:var(--color-text-muted); font-size:var(--fs-caption);">None</span>'}</div>
      <div class="obs-detail-section"><div class="obs-section-label">Author &amp; timestamp</div><p style="font-size:var(--fs-body-sm);">${escapeHtml(obs.authorName)} · ${formatDateTime(obs.createdAt)}${obs.publishedAt ? ' · Published ' + formatDateTime(obs.publishedAt) : ''}</p></div>
      <div class="obs-composer-footer">
        <span class="obs-composer-footer__spacer"></span>
        ${editable && obs.status === 'Draft' ? `<button class="btn btn--secondary" type="button" id="obsDetailPublishBtn">Publish</button>` : ''}
        ${editable && obs.status === 'Published' && !obs.sharedWithFamily ? `<button class="btn btn--secondary" type="button" id="obsDetailShareBtn">Share with family</button>` : ''}
        ${editable ? `<button class="btn btn--accent" type="button" id="obsDetailEditBtn">Edit</button>` : ''}
      </div>`;
    $('obsDetailBody').querySelectorAll('[data-detail-photo]').forEach((img) => img.addEventListener('click', () => openLightbox(obs.photos, Number(img.dataset.detailPhoto))));
    const editBtn = $('obsDetailEditBtn'); if (editBtn) editBtn.addEventListener('click', () => { closeModal('obsDetailBackdrop'); openComposer(obs.id); });
    const pubBtn = $('obsDetailPublishBtn'); if (pubBtn) pubBtn.addEventListener('click', () => { publishObservation(obs.id); closeModal('obsDetailBackdrop'); });
    const shareBtn = $('obsDetailShareBtn'); if (shareBtn) shareBtn.addEventListener('click', () => { closeModal('obsDetailBackdrop'); requestShare(obs.id); });
    openModal('obsDetailBackdrop');
  }

  /* ========================================================================
     LIGHTBOX
     ======================================================================== */
  function wireLightbox() {
    $('obsLightboxClose').addEventListener('click', closeLightbox);
    $('obsLightboxBackdrop').addEventListener('click', (e) => { if (e.target.id === 'obsLightboxBackdrop') closeLightbox(); });
    $('obsLightboxPrev').addEventListener('click', () => stepLightbox(-1));
    $('obsLightboxNext').addEventListener('click', () => stepLightbox(1));
  }
  function openLightbox(photos, index) {
    lightboxPhotos = photos || [];
    lightboxIndex = index || 0;
    if (!lightboxPhotos.length) return;
    $('obsLightboxImg').src = lightboxPhotos[lightboxIndex].dataUrl;
    const multi = lightboxPhotos.length > 1;
    $('obsLightboxPrev').style.display = multi ? '' : 'none';
    $('obsLightboxNext').style.display = multi ? '' : 'none';
    $('obsLightboxBackdrop').classList.add('is-open');
  }
  function stepLightbox(dir) {
    lightboxIndex = (lightboxIndex + dir + lightboxPhotos.length) % lightboxPhotos.length;
    $('obsLightboxImg').src = lightboxPhotos[lightboxIndex].dataUrl;
  }
  function closeLightbox() { $('obsLightboxBackdrop').classList.remove('is-open'); }

  /* ========================================================================
     MOBILE (camera-first FAB)
     ======================================================================== */
  function wireMobile() {
    $('obsFabBtn').addEventListener('click', () => $('obsCameraInput').click());
    $('obsCameraInput').addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      const presets = [];
      let remaining = files.length;
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          presets.push({ id: uid('PHOTO'), dataUrl: reader.result, name: file.name });
          remaining -= 1;
          if (remaining === 0) openComposer(null, presets);
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    });
  }

  /* ========================================================================
     MODAL / SHEET HELPERS
     ======================================================================== */
  function openModal(id) { const el = $(id); el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const el = $(id); if (!el.classList.contains('is-open')) return; el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  function openSheet(id) { $(id).classList.add('is-open'); document.body.style.overflow = 'hidden'; }
  function closeSheet(id) { $(id).classList.remove('is-open'); document.body.style.overflow = ''; }
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal(backdrop.id); });
    });
    document.getElementById('obsFilterSheetBackdrop').addEventListener('click', (e) => { if (e.target.id === 'obsFilterSheetBackdrop') closeSheet('obsFilterSheetBackdrop'); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      document.querySelectorAll('.modal-backdrop.is-open').forEach((b) => closeModal(b.id));
      closeSheet('obsFilterSheetBackdrop');
      closeLightbox();
    });
  });
})();
