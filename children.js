/* ==========================================================================
   PLAY SCHOOL — Children management
   Reuses: store.js (records/overrides), modules.js (plan/entitlements),
   shell.js (sidebar/header/bell/toast/role switcher). No competing store —
   every child, guardian and class comes from PlayStore, and every mutation
   (enrol, edit, move class, withdraw) goes through PlayStore.addRecord /
   PlayStore.updateRecord so S13 (record.html) sees the same data.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const ICON = {
    allergy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    medical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
    custody: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>',
    dietary: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a9 9 0 0 0 9-9c0-4-2-8-9-11-7 3-9 7-9 11a9 9 0 0 0 9 9Z"/><path d="M12 21V11"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>',
  };

  const ALERT_META = {
    allergy: { label: 'Allergy', icon: ICON.allergy, cls: 'alert-icon--allergy' },
    medical: { label: 'Medical', icon: ICON.medical, cls: 'alert-icon--medical' },
    custody: { label: 'Custody', icon: ICON.custody, cls: 'alert-icon--custody' },
    dietary: { label: 'Dietary', icon: ICON.dietary, cls: 'alert-icon--dietary' },
  };
  /** Minimal language-aware template set — demonstrates the integration point
      a guardian's preferredLanguage (S16) is meant to drive. Real translated
      copy for every language isn't built out; English is always the
      fallback when a guardian's language has no template. */
  const MESSAGE_TEMPLATES = {
    English: { subject: 'A note from Play School', body: 'Hello,\n\nWe wanted to reach out regarding your family. Please let us know if you have any questions.\n\nWarm regards,\nPlay School' },
    Spanish: { subject: 'Un mensaje de Play School', body: 'Hola,\n\nQueríamos comunicarnos con respecto a su familia. No dude en contactarnos si tiene alguna pregunta.\n\nSaludos cordiales,\nPlay School' },
  };
  function templateForLanguage(language) { return MESSAGE_TEMPLATES[language] || MESSAGE_TEMPLATES.English; }

  const STATUS_OPTIONS = ['Active', 'Starting soon', 'Draft', 'Waitlisted', 'Withdrawn', 'Graduated'];
  const STATUS_BADGE = { 'Active': 'badge--success', 'Starting soon': 'badge--warning', 'Draft': 'badge--neutral', 'Waitlisted': 'badge--warning', 'Withdrawn': 'badge--error', 'Graduated': 'badge--neutral' };
  const AGE_BANDS = [
    { key: 'infant', label: 'Infant (0–18mo)', min: 0, max: 18 },
    { key: 'toddler', label: 'Toddler (18mo–3y)', min: 18, max: 36 },
    { key: 'primary', label: 'Primary (3–6y)', min: 36, max: 72 },
    { key: 'lower-el', label: 'Lower Elementary (6–9y)', min: 72, max: 108 },
    { key: 'upper-el', label: 'Upper Elementary (9–12y)', min: 108, max: Infinity },
  ];

  const FILTER_GROUPS = [
    { key: 'classes', label: 'Class', options: () => classOptions().map((c) => ({ key: c, label: c })) },
    { key: 'ageBands', label: 'Age band', options: () => AGE_BANDS.map((b) => ({ key: b.key, label: b.label })) },
    { key: 'statuses', label: 'Status', options: () => STATUS_OPTIONS.map((s) => ({ key: s, label: s })) },
    { key: 'alerts', label: 'Alerts', options: () => Object.keys(ALERT_META).map((k) => ({ key: k, label: ALERT_META[k].label })) },
  ];

  /* ---------- page state ---------- */
  let role = window.PlayShell.getDemoRole();
  let view = getViewPref(role);
  let searchQuery = '';
  const filters = { classes: new Set(), ageBands: new Set(), statuses: new Set(), alerts: new Set() };
  let selectedIds = new Set();
  let editingChildId = null;
  let pendingMoveChildren = null;
  let pendingWithdrawChild = null;
  let messageRecipientGuardianIds = new Set();
  let messageChildren = [];

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', (e) => { role = e.detail.role; view = getViewPref(role); render(); });

  function init() {
    window.PlayShell.login();
    window.PlayShell.mount('children', 'Children');

    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    wireToolbar();
    wireViewToggle();
    wireFilterSheet();
    wireBulkBar();
    wireChildFormModal();
    wireMoveClassModal();
    wireWithdrawModal();
    wireMessageModal();
    wireGlobalMenuClose();

    window.setTimeout(() => {
      $('childSkeleton').hidden = true;
      render();
      maybeHandleDeepLinkAction();
    }, 500);
  }

  /** Lets other pages (the Child Profile) trigger an existing workflow here
      instead of duplicating it — e.g. children.html?action=edit&id=C-1001. */
  function maybeHandleDeepLinkAction() {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const id = params.get('id');
    if (action === 'message') {
      const idsParam = params.get('childIds');
      if (idsParam) {
        const ids = idsParam.split(',').filter(Boolean);
        const kids = allChildren().filter((c) => ids.includes(c.id));
        if (kids.length) openMessageComposer(kids);
        return;
      }
    }
    if (!action || !id) return;
    const child = allChildren().find((c) => c.id === id);
    if (!child) return;
    if (action === 'edit') openChildFormModal(child);
    else if (action === 'move') openMoveClassModal([child]);
    else if (action === 'withdraw') openWithdrawModal(child);
    else if (action === 'message') openMessageComposer([child]);
  }

  function getViewPref(r) {
    try { return localStorage.getItem('ps_children_view_' + r) === 'list' ? 'list' : 'grid'; } catch (e) { return 'grid'; }
  }
  function setViewPref(r, v) {
    try { localStorage.setItem('ps_children_view_' + r, v); } catch (e) { /* storage unavailable */ }
  }

  /* ---------- data helpers ---------- */
  function allChildren() { return window.PlayStore.getByType('Child'); }
  function guardianFor(child) { return child.guardianId ? window.PlayStore.getById(child.guardianId) : null; }
  function classOptions() {
    const classRecords = window.PlayStore.getByType('Class');
    if (classRecords.length) return classRecords.map((c) => c.name);
    const rooms = new Set();
    allChildren().forEach((c) => { if (c.room) rooms.add(c.room); });
    return Array.from(rooms).sort();
  }
  function ageInfo(dob) {
    if (!dob) return { years: 0, months: 0, totalMonths: 0, label: '—' };
    const d = new Date(dob + 'T00:00:00');
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    let months = now.getMonth() - d.getMonth();
    if (now.getDate() < d.getDate()) months -= 1;
    if (months < 0) { years -= 1; months += 12; }
    years = Math.max(years, 0);
    const totalMonths = years * 12 + months;
    return { years, months, totalMonths, label: years + 'y ' + months + 'm' };
  }
  function ageBandFor(totalMonths) {
    return AGE_BANDS.find((b) => totalMonths >= b.min && totalMonths < b.max) || AGE_BANDS[AGE_BANDS.length - 1];
  }
  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/);
    if (!parts.length || !parts[0]) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  function alertsOf(child) { return Array.isArray(child.alerts) ? child.alerts : []; }
  function isModuleUnlocked(moduleId) {
    if (!moduleId || !window.PlayModules) return true;
    const mod = window.PlayModules.getById(moduleId);
    if (!mod) return true;
    return window.PlayModules.isUnlocked(mod, window.PlayModules.getCurrentPlan());
  }

  /* ---------- filtering ---------- */
  function matchesSearch(child, q) {
    if (!q) return true;
    const guardian = guardianFor(child);
    const haystack = [child.name, guardian ? guardian.name : ''].join(' ').toLowerCase();
    return haystack.includes(q);
  }
  function passesFilters(child) {
    if (filters.classes.size && !filters.classes.has(child.room)) return false;
    if (filters.statuses.size && !filters.statuses.has(child.status)) return false;
    if (filters.ageBands.size) {
      const band = ageBandFor(ageInfo(child.dob).totalMonths);
      if (!filters.ageBands.has(band.key)) return false;
    }
    if (filters.alerts.size) {
      const types = alertsOf(child).map((a) => a.type);
      const hasOne = types.some((t) => filters.alerts.has(t));
      if (!hasOne) return false;
    }
    return true;
  }
  function filteredChildren() {
    const q = searchQuery.trim().toLowerCase();
    return allChildren()
      .filter((c) => matchesSearch(c, q) && passesFilters(c))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  function anyFilterActive() {
    return filters.classes.size + filters.ageBands.size + filters.statuses.size + filters.alerts.size > 0;
  }

  /* ---------- render orchestration ---------- */
  function render() {
    $('childSkeleton').hidden = true;
    renderHeading();
    renderToolbarFilters();
    renderFilterSheetBody();
    renderChips();
    const list = filteredChildren();
    selectedIds = new Set(Array.from(selectedIds).filter((id) => allChildren().some((c) => c.id === id)));
    renderResultCount(list);
    renderEmpty(list);
    renderViewToggleState();
    if (view === 'grid') {
      $('childGrid').hidden = !list.length;
      $('childTableWrap').hidden = true;
      renderGrid(list);
    } else {
      $('childGrid').hidden = true;
      $('childTableWrap').hidden = !list.length;
      renderTable(list);
    }
    renderBulkBar();
  }

  function renderHeading() {
    $('childHeading').textContent = `Children (${allChildren().length})`;
  }

  function renderResultCount(list) {
    const total = allChildren().length;
    $('childResultCount').textContent = (searchQuery.trim() || anyFilterActive())
      ? `${list.length} of ${total} children match`
      : `${total} ${total === 1 ? 'child' : 'children'}`;
  }

  function renderEmpty(list) {
    const empty = $('childEmptyState');
    if (list.length) { empty.hidden = true; return; }
    empty.hidden = false;
    const hasAny = allChildren().length > 0;
    if (hasAny) {
      $('childEmptyIcon').innerHTML = ICON.inbox;
      $('childEmptyTitle').textContent = 'No children match these filters';
      $('childEmptyText').textContent = 'Try a different search term or clear your filters to see the full roster.';
      $('childEmptyAction').innerHTML = '<button class="btn btn--secondary" type="button" id="childEmptyClearBtn">Clear filters</button>';
      const btn = $('childEmptyClearBtn');
      if (btn) btn.addEventListener('click', clearFilters);
    } else {
      $('childEmptyIcon').innerHTML = ICON.userPlus;
      $('childEmptyTitle').textContent = 'No children enrolled yet';
      $('childEmptyText').textContent = 'Once you enrol your first child, they will appear here with their class and safety details.';
      $('childEmptyAction').innerHTML = '<button class="btn btn--accent" type="button" id="childEmptyEnrolBtn">Enrol child</button>';
      const btn = $('childEmptyEnrolBtn');
      if (btn) btn.addEventListener('click', () => { window.location.href = 'enroll.html'; });
    }
  }

  /* ---------- toolbar: search + filter dropdowns ---------- */
  function wireToolbar() {
    $('childSearch').addEventListener('input', (e) => { searchQuery = e.target.value; render(); });
    $('exportAllBtn').addEventListener('click', () => exportChildren(filteredChildren(), 'children-export'));
    $('enrolBtn').addEventListener('click', () => { window.location.href = 'enroll.html'; });
    $('childFab').addEventListener('click', () => { window.location.href = 'enroll.html'; });
  }

  function renderToolbarFilters() {
    const wrap = $('childFiltersDesktop');
    wrap.innerHTML = FILTER_GROUPS.map((g) => filterDropdownHtml(g)).join('');
    wrap.querySelectorAll('[data-filter-group]').forEach((el) => wireFilterDropdown(el));
    updateFilterCountBadge();
  }

  function filterDropdownHtml(group) {
    const selected = filters[group.key];
    const options = group.options();
    const label = selected.size ? `${group.label} (${selected.size})` : group.label;
    return `
      <span class="filter-dropdown" data-filter-group="${group.key}">
        <button class="child-filter-trigger${selected.size ? ' has-value' : ''}" type="button" aria-haspopup="true" aria-expanded="false">
          <span>${escapeHtml(label)}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <span class="filter-dropdown__panel" role="menu">
          ${options.map((o) => `
            <span class="check-row">
              <input type="checkbox" class="checkbox" id="fg-${group.key}-${escapeHtml(o.key)}" data-group="${group.key}" value="${escapeHtml(o.key)}" ${selected.has(o.key) ? 'checked' : ''} />
              <label for="fg-${group.key}-${escapeHtml(o.key)}">${escapeHtml(o.label)}</label>
            </span>`).join('') || '<p class="card__text" style="font-size:var(--fs-caption); padding: var(--space-2) var(--space-3);">No options yet.</p>'}
        </span>
      </span>`;
  }

  function wireFilterDropdown(el) {
    const trigger = el.querySelector('.child-filter-trigger');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !el.classList.contains('is-open');
      document.querySelectorAll('.filter-dropdown.is-open').forEach((p) => { p.classList.remove('is-open'); const t = p.querySelector('.child-filter-trigger'); if (t) t.setAttribute('aria-expanded', 'false'); });
      el.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    });
    el.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const set = filters[cb.dataset.group];
        if (cb.checked) set.add(cb.value); else set.delete(cb.value);
        render();
        const reopened = document.querySelector(`.filter-dropdown[data-filter-group="${cb.dataset.group}"]`);
        if (reopened) { reopened.classList.add('is-open'); const t = reopened.querySelector('.child-filter-trigger'); if (t) t.setAttribute('aria-expanded', 'true'); }
      });
    });
  }

  function updateFilterCountBadge() {
    const count = filters.classes.size + filters.ageBands.size + filters.statuses.size + filters.alerts.size;
    const badge = $('filterCountBadge');
    if (count) { badge.hidden = false; badge.textContent = String(count); } else { badge.hidden = true; }
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.filter-dropdown.is-open').forEach((p) => { p.classList.remove('is-open'); const t = p.querySelector('.child-filter-trigger'); if (t) t.setAttribute('aria-expanded', 'false'); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.filter-dropdown.is-open').forEach((p) => p.classList.remove('is-open'));
  });

  /* ---------- chips ---------- */
  function filterLabelFor(groupKey, valueKey) {
    const group = FILTER_GROUPS.find((g) => g.key === groupKey);
    const opt = group.options().find((o) => o.key === valueKey);
    return opt ? opt.label : valueKey;
  }
  function renderChips() {
    const row = $('childChipRow');
    const chips = [];
    FILTER_GROUPS.forEach((g) => {
      filters[g.key].forEach((val) => {
        chips.push({ group: g.key, value: val, text: `${g.label}: ${filterLabelFor(g.key, val)}` });
      });
    });
    if (!chips.length) { row.hidden = true; row.innerHTML = ''; return; }
    row.hidden = false;
    row.innerHTML = chips.map((c) => `
      <span class="chip" data-chip-group="${c.group}" data-chip-value="${escapeHtml(c.value)}">
        ${escapeHtml(c.text)}
        <span class="chip__remove" role="button" tabindex="0" aria-label="Remove filter ${escapeHtml(c.text)}">&times;</span>
      </span>`).join('') + `<button class="child-chip-row__clear" type="button" id="clearAllChipsBtn">Clear all</button>`;
    row.querySelectorAll('.chip__remove').forEach((btn) => {
      const chipEl = btn.closest('.chip');
      const act = () => { filters[chipEl.dataset.chipGroup].delete(chipEl.dataset.chipValue); render(); };
      btn.addEventListener('click', act);
      btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    });
    const clearBtn = $('clearAllChipsBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearFilters);
  }
  function clearFilters() {
    FILTER_GROUPS.forEach((g) => filters[g.key].clear());
    render();
  }

  /* ---------- mobile filter sheet ---------- */
  function wireFilterSheet() {
    $('filterSheetBtn').addEventListener('click', () => {
      $('filterSheetBackdrop').classList.add('is-open');
      document.body.style.overflow = 'hidden';
    });
    $('filterSheetBackdrop').addEventListener('click', (e) => { if (e.target.id === 'filterSheetBackdrop') closeFilterSheet(); });
    $('filterSheetClear').addEventListener('click', () => { clearFilters(); });
    $('filterSheetApply').addEventListener('click', closeFilterSheet);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFilterSheet(); });
  }
  function closeFilterSheet() {
    $('filterSheetBackdrop').classList.remove('is-open');
    document.body.style.overflow = '';
  }
  function renderFilterSheetBody() {
    const body = $('filterSheetBody');
    body.innerHTML = FILTER_GROUPS.map((g) => `
      <div class="sheet__group">
        <div class="sheet__group-label">${escapeHtml(g.label)}</div>
        ${g.options().map((o) => `
          <div class="check-row" style="margin-bottom: var(--space-2);">
            <input type="checkbox" class="checkbox" id="sheet-${g.key}-${escapeHtml(o.key)}" data-group="${g.key}" value="${escapeHtml(o.key)}" ${filters[g.key].has(o.key) ? 'checked' : ''} />
            <label for="sheet-${g.key}-${escapeHtml(o.key)}" style="font-size: var(--fs-body-sm);">${escapeHtml(o.label)}</label>
          </div>`).join('') || '<p class="card__text" style="font-size: var(--fs-caption);">No options yet.</p>'}
      </div>`).join('');
    body.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const set = filters[cb.dataset.group];
        if (cb.checked) set.add(cb.value); else set.delete(cb.value);
        render();
      });
    });
  }

  /* ---------- view toggle ---------- */
  function wireViewToggle() {
    $('viewToggle').querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        view = btn.dataset.view;
        setViewPref(role, view);
        render();
      });
    });
  }
  function renderViewToggleState() {
    $('viewToggle').querySelectorAll('[data-view]').forEach((btn) => {
      const active = btn.dataset.view === view;
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  /* ---------- grid view ---------- */
  function renderGrid(list) {
    const grid = $('childGrid');
    grid.innerHTML = list.map((c, i) => childCardHtml(c, i)).join('');
    wireCardSelection(grid);
    wireAlertTooltips(grid);
    wireMenus(grid);
    wireCardNavigation(grid);
  }

  function alertsRowHtml(child) {
    const alerts = alertsOf(child);
    if (!alerts.length) return '';
    return `<span class="alert-row">${alerts.map((a) => alertIconHtml(a)).join('')}</span>`;
  }
  function alertIconHtml(alert) {
    const meta = ALERT_META[alert.type];
    if (!meta) return '';
    const tip = `${meta.label}: ${alert.detail}`;
    return `
      <span class="tooltip-wrap alert-tooltip" data-alert>
        <button type="button" class="alert-icon ${meta.cls}" aria-label="${escapeHtml(tip)}">${meta.icon}</button>
        <span class="tooltip tooltip--top" role="tooltip" aria-hidden="true">${escapeHtml(alert.detail)}</span>
      </span>`;
  }

  function childCardHtml(child, i) {
    const age = ageInfo(child.dob);
    const selected = selectedIds.has(child.id);
    return `
      <div class="child-card${selected ? ' is-selected' : ''}" data-child-id="${child.id}" tabindex="0" role="button" aria-label="Open ${escapeHtml(child.name)}" style="animation-delay:${Math.min(i, 10) * 25}ms">
        <input type="checkbox" class="checkbox child-card__select" data-select="${child.id}" ${selected ? 'checked' : ''} aria-label="Select ${escapeHtml(child.name)}" />
        <span class="popover child-card__menu" data-child-menu data-id="${child.id}">
          <button class="child-card__menu-trigger" type="button" data-menu-trigger aria-haspopup="true" aria-expanded="false" aria-label="Actions for ${escapeHtml(child.name)}">${ICON.dots}</button>
          ${actionMenuPanelHtml(child)}
        </span>
        <div class="child-card__photo">${escapeHtml(initials(child.name))}</div>
        <div class="child-card__name"><span class="child-card__name-full">${escapeHtml(child.name)}</span><span class="child-card__name-first">${escapeHtml((child.name || '').split(' ')[0])}</span></div>
        <div class="child-card__meta">${escapeHtml(age.label)}</div>
        <span class="badge badge--primary child-card__class">${escapeHtml(child.room || '—')}</span>
        <div class="child-card__alerts">${alertsRowHtml(child)}</div>
      </div>`;
  }

  function actionMenuPanelHtml(child) {
    return `
      <span class="popover__panel" role="menu" style="right:0; left:auto;">
        <button class="popover__item" type="button" data-action="view" role="menuitem">View</button>
        <button class="popover__item" type="button" data-action="edit" role="menuitem">Edit</button>
        <button class="popover__item" type="button" data-action="move" role="menuitem">Move class</button>
        <button class="popover__item popover__item--danger" type="button" data-action="withdraw" role="menuitem" ${child.status === 'Withdrawn' ? 'disabled' : ''}>Withdraw</button>
      </span>`;
  }

  /* ---------- list view ---------- */
  function renderTable(list) {
    const body = $('childTableBody');
    body.innerHTML = list.map((c) => tableRowHtml(c)).join('');
    const cards = $('childTableCards');
    cards.innerHTML = list.map((c) => tableCardHtml(c)).join('');
    [body, cards].forEach((container) => {
      wireCardSelection(container);
      wireAlertTooltips(container);
      wireMenus(container);
      wireCardNavigation(container);
    });
    const selectAll = $('childSelectAll');
    selectAll.checked = list.length > 0 && list.every((c) => selectedIds.has(c.id));
    selectAll.indeterminate = list.some((c) => selectedIds.has(c.id)) && !selectAll.checked;
    selectAll.onchange = () => {
      if (selectAll.checked) list.forEach((c) => selectedIds.add(c.id));
      else list.forEach((c) => selectedIds.delete(c.id));
      render();
    };
  }

  function tableRowHtml(child) {
    const age = ageInfo(child.dob);
    const guardian = guardianFor(child);
    const selected = selectedIds.has(child.id);
    return `
      <tr data-child-id="${child.id}" tabindex="0">
        <td><input type="checkbox" class="checkbox" data-select="${child.id}" ${selected ? 'checked' : ''} aria-label="Select ${escapeHtml(child.name)}" /></td>
        <td>
          <div class="child-row-name">
            <span class="avatar avatar--sm">${escapeHtml(initials(child.name))}</span>
            <span class="child-row-name__text"><span class="cell-primary">${escapeHtml(child.name)}</span></span>
          </div>
        </td>
        <td class="child-cell-tight">${escapeHtml(age.label)}</td>
        <td>${escapeHtml(child.room || '—')}</td>
        <td>${escapeHtml(guardian ? guardian.name : '—')}</td>
        <td class="cell-muted child-cell-tight">${escapeHtml(formatDate(child.startDate))}</td>
        <td><span class="badge ${STATUS_BADGE[child.status] || 'badge--neutral'}">${escapeHtml(child.status)}</span></td>
        <td><span class="alert-row${alertsOf(child).length ? '' : ' alert-row--empty'}">${alertsOf(child).length ? alertsRowHtml(child) : '—'}</span></td>
        <td>
          <span class="popover child-row-menu" data-child-menu data-id="${child.id}">
            <button class="btn btn--icon" type="button" data-menu-trigger aria-haspopup="true" aria-expanded="false" aria-label="Actions for ${escapeHtml(child.name)}">${ICON.dots}</button>
            ${actionMenuPanelHtml(child)}
          </span>
        </td>
      </tr>`;
  }

  function tableCardHtml(child) {
    const age = ageInfo(child.dob);
    const guardian = guardianFor(child);
    const selected = selectedIds.has(child.id);
    return `
      <div class="table-card__item" data-child-id="${child.id}" tabindex="0">
        <div class="table-card__head">
          <input type="checkbox" class="checkbox" data-select="${child.id}" ${selected ? 'checked' : ''} aria-label="Select ${escapeHtml(child.name)}" />
          <span class="avatar avatar--sm">${escapeHtml(initials(child.name))}</span>
          <span class="cell-primary">${escapeHtml(child.name)}</span>
          <span class="popover child-row-menu" data-child-menu data-id="${child.id}" style="margin-left:auto;">
            <button class="btn btn--icon" type="button" data-menu-trigger aria-haspopup="true" aria-expanded="false" aria-label="Actions for ${escapeHtml(child.name)}">${ICON.dots}</button>
            ${actionMenuPanelHtml(child)}
          </span>
        </div>
        <div class="table-card__row"><span class="table-card__label">Age</span><span class="table-card__value">${escapeHtml(age.label)}</span></div>
        <div class="table-card__row"><span class="table-card__label">Class</span><span class="table-card__value">${escapeHtml(child.room || '—')}</span></div>
        <div class="table-card__row"><span class="table-card__label">Guardian</span><span class="table-card__value">${escapeHtml(guardian ? guardian.name : '—')}</span></div>
        <div class="table-card__row"><span class="table-card__label">Start date</span><span class="table-card__value">${escapeHtml(formatDate(child.startDate))}</span></div>
        <div class="table-card__row"><span class="table-card__label">Status</span><span class="table-card__value"><span class="badge ${STATUS_BADGE[child.status] || 'badge--neutral'}">${escapeHtml(child.status)}</span></span></div>
        ${alertsOf(child).length ? `<div class="table-card__row"><span class="table-card__label">Alerts</span><span class="table-card__value">${alertsRowHtml(child)}</span></div>` : ''}
      </div>`;
  }

  /* ---------- shared wiring: selection / tooltips / menus / navigation ---------- */
  function wireCardSelection(container) {
    container.querySelectorAll('[data-select]').forEach((cb) => {
      cb.addEventListener('click', (e) => e.stopPropagation());
      cb.addEventListener('change', () => {
        if (cb.checked) selectedIds.add(cb.dataset.select); else selectedIds.delete(cb.dataset.select);
        render();
      });
    });
  }
  function wireAlertTooltips(container) {
    container.querySelectorAll('[data-alert]').forEach((wrap) => {
      const btn = wrap.querySelector('.alert-icon');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = !wrap.classList.contains('is-open');
        document.querySelectorAll('.alert-tooltip.is-open').forEach((w) => w.classList.remove('is-open'));
        wrap.classList.toggle('is-open', willOpen);
      });
    });
  }
  function wireMenus(container) {
    container.querySelectorAll('[data-child-menu]').forEach((menu) => {
      const trigger = menu.querySelector('[data-menu-trigger]');
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = !menu.classList.contains('is-open');
        document.querySelectorAll('[data-child-menu].is-open').forEach((m) => { m.classList.remove('is-open'); m.querySelector('[data-menu-trigger]').setAttribute('aria-expanded', 'false'); });
        menu.classList.toggle('is-open', willOpen);
        trigger.setAttribute('aria-expanded', String(willOpen));
      });
      menu.querySelectorAll('[data-action]').forEach((item) => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          menu.classList.remove('is-open');
          handleMenuAction(item.dataset.action, menu.dataset.id);
        });
      });
    });
  }
  function wireGlobalMenuClose() {
    document.addEventListener('click', () => {
      document.querySelectorAll('[data-child-menu].is-open').forEach((m) => m.classList.remove('is-open'));
      document.querySelectorAll('.alert-tooltip.is-open').forEach((w) => w.classList.remove('is-open'));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      document.querySelectorAll('[data-child-menu].is-open').forEach((m) => m.classList.remove('is-open'));
      document.querySelectorAll('.alert-tooltip.is-open').forEach((w) => w.classList.remove('is-open'));
    });
  }
  function wireCardNavigation(container) {
    const openIt = (id) => { window.location.href = 'record.html?id=' + encodeURIComponent(id); };
    container.querySelectorAll('[data-child-id]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-select]') || e.target.closest('[data-child-menu]') || e.target.closest('[data-alert]')) return;
        openIt(el.dataset.childId);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('a')) openIt(el.dataset.childId);
      });
    });
  }

  function handleMenuAction(action, childId) {
    const child = allChildren().find((c) => c.id === childId);
    if (!child) return;
    if (action === 'view') window.location.href = 'record.html?id=' + encodeURIComponent(childId);
    else if (action === 'edit') window.location.href = 'enroll.html?id=' + encodeURIComponent(childId);
    else if (action === 'move') openMoveClassModal([child]);
    else if (action === 'withdraw') openWithdrawModal(child);
  }

  /* ---------- bulk bar ---------- */
  function renderBulkBar() {
    const bar = $('childBulkBar');
    if (!selectedIds.size) { bar.hidden = true; return; }
    bar.hidden = false;
    $('childBulkCount').textContent = `${selectedIds.size} selected`;
  }
  function wireBulkBar() {
    $('bulkClearBtn').addEventListener('click', () => { selectedIds.clear(); render(); });
    $('bulkExportBtn').addEventListener('click', () => exportChildren(selectedChildren(), 'children-export-selected'));
    $('bulkMoveBtn').addEventListener('click', () => openMoveClassModal(selectedChildren()));
    $('bulkMessageBtn').addEventListener('click', () => openMessageComposer(selectedChildren()));
  }
  function selectedChildren() { return allChildren().filter((c) => selectedIds.has(c.id)); }

  /* ---------- CSV export ---------- */
  function csvEscape(value) {
    let v = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@]/.test(v)) v = "'" + v;
    if (/[",\n\r]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
    return v;
  }
  function alertDetail(child, type) {
    return alertsOf(child).filter((a) => a.type === type).map((a) => a.detail).join('; ');
  }
  function buildCSV(children) {
    const header = ['Child name', 'Age', 'Class', 'Primary guardian', 'Start date', 'Status', 'Allergy details', 'Medical details', 'Custody alerts', 'Dietary details'];
    const lines = [header.map(csvEscape).join(',')];
    children.forEach((c) => {
      const guardian = guardianFor(c);
      lines.push([
        c.name,
        ageInfo(c.dob).label,
        c.room || '',
        guardian ? guardian.name : '',
        c.startDate ? formatDate(c.startDate) : '',
        c.status,
        alertDetail(c, 'allergy'),
        alertDetail(c, 'medical'),
        alertDetail(c, 'custody'),
        alertDetail(c, 'dietary'),
      ].map(csvEscape).join(','));
    });
    return '﻿' + lines.join('\r\n');
  }
  function exportChildren(children, baseName) {
    if (!children.length) { window.PlayShell.toast('info', 'Nothing to export', 'There are no children in this view.'); return; }
    const blob = new Blob([buildCSV(children)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}-${todayStr()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    window.PlayShell.toast('success', 'Export ready', `${children.length} ${children.length === 1 ? 'child' : 'children'} exported to CSV.`);
  }

  /* ---------- enrol / edit child modal ---------- */
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
    }, 450);
  }

  function populateClassSelect(selectEl, currentValue) {
    const options = classOptions();
    selectEl.innerHTML = options.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (currentValue && options.includes(currentValue)) selectEl.value = currentValue;
  }

  function openChildFormModal(child) {
    editingChildId = child ? child.id : null;
    $('childFormModalTitle').textContent = child ? 'Edit child' : 'Enrol child';
    $('childFormModalText').textContent = child ? "Update this child's details and safety information." : 'Add a new child to the roster. You can update safety details any time.';
    $('childFormSubmitLabel').textContent = child ? 'Save changes' : 'Enrol child';
    populateClassSelect($('cfClass'), child ? child.room : null);

    const guardian = child ? guardianFor(child) : null;
    $('cfName').value = child ? child.name : '';
    $('cfDob').value = child ? (child.dob || '') : '';
    $('cfStart').value = child ? (child.startDate || '') : todayStr();
    $('cfGuardianName').value = guardian ? guardian.name : '';
    $('cfGuardianContact').value = guardian ? (guardian.contact || '') : '';
    const findAlert = (type) => (child ? alertsOf(child).find((a) => a.type === type) : null);
    $('cfAllergy').value = (findAlert('allergy') || {}).detail || '';
    $('cfMedical').value = (findAlert('medical') || {}).detail || '';
    $('cfCustody').value = (findAlert('custody') || {}).detail || '';
    $('cfDietary').value = (findAlert('dietary') || {}).detail || '';
    ['cfName', 'cfDob', 'cfStart', 'cfGuardianName', 'cfGuardianContact'].forEach((id) => setFieldError(id, null));

    openModal('childFormModalBackdrop');
    $('cfName').focus();
  }

  function buildAlertsFromForm() {
    const alerts = [];
    const map = [['cfAllergy', 'allergy'], ['cfMedical', 'medical'], ['cfCustody', 'custody'], ['cfDietary', 'dietary']];
    map.forEach(([inputId, type]) => {
      const detail = $(inputId).value.trim();
      if (detail) alerts.push({ type, detail });
    });
    return alerts;
  }

  function isValidContact(value) {
    if (value.indexOf('@') !== -1) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return value.replace(/[^0-9]/g, '').length >= 7;
  }

  function wireChildFormModal() {
    const backdrop = $('childFormModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('childFormModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('childFormModalBackdrop'); });

    $('childFormSubmit').addEventListener('click', () => {
      const name = $('cfName').value.trim();
      const dob = $('cfDob').value;
      const start = $('cfStart').value;
      const guardianName = $('cfGuardianName').value.trim();
      const guardianContact = $('cfGuardianContact').value.trim();
      let ok = true;
      if (!name) { setFieldError('cfName', 'Enter the child’s name.'); ok = false; } else setFieldError('cfName', null);
      if (!dob) { setFieldError('cfDob', 'Date of birth is required.'); ok = false; } else setFieldError('cfDob', null);
      if (!start) { setFieldError('cfStart', 'Start date is required.'); ok = false; } else setFieldError('cfStart', null);
      if (!guardianName) { setFieldError('cfGuardianName', 'Guardian name is required.'); ok = false; } else setFieldError('cfGuardianName', null);
      if (!guardianContact || !isValidContact(guardianContact)) { setFieldError('cfGuardianContact', 'Enter a valid email or phone number.'); ok = false; } else setFieldError('cfGuardianContact', null);
      if (!ok) return;

      submitWithLoading('childFormSubmit', () => {
        const room = $('cfClass').value;
        const alerts = buildAlertsFromForm();
        if (editingChildId) {
          const child = allChildren().find((c) => c.id === editingChildId);
          window.PlayStore.updateRecord(editingChildId, { name, dob, startDate: start, room, alerts });
          if (child && child.guardianId) window.PlayStore.updateRecord(child.guardianId, { name: guardianName, contact: guardianContact });
          closeModal('childFormModalBackdrop');
          render();
          window.PlayShell.toast('success', 'Changes saved', `${name}'s details have been updated.`);
        } else {
          const guardianId = 'G-' + Date.now().toString(36);
          window.PlayStore.addRecord({ id: guardianId, type: 'Guardian', name: guardianName, relation: `Parent of ${name}`, status: 'Active', contact: guardianContact });
          const childId = 'C-' + Date.now().toString(36).toUpperCase();
          window.PlayStore.addRecord({ id: childId, type: 'Child', name, room, status: 'Active', guardianId, dob, startDate: start, alerts });
          closeModal('childFormModalBackdrop');
          render();
          window.PlayShell.toast('success', 'Child enrolled', `${name} has been added to ${room}.`);
          window.PlayShell.addNotification({ title: 'New enrolment', text: `${name} was enrolled in ${room}.`, module: null, recordRoute: 'record.html?id=' + childId });
        }
      });
    });
  }

  /* ---------- move class modal ---------- */
  function openMoveClassModal(children) {
    if (!children.length) return;
    pendingMoveChildren = children;
    $('moveClassText').textContent = children.length === 1
      ? `Move ${children[0].name} to a new class.`
      : `Move ${children.length} selected children to a new class.`;
    $('moveClassCurrent').value = children.length === 1 ? (children[0].room || '—') : 'Multiple classes';
    populateClassSelect($('moveClassNew'), children.length === 1 ? children[0].room : null);
    setFieldError('moveClassNew', null);
    openModal('moveClassModalBackdrop');
  }
  function wireMoveClassModal() {
    const backdrop = $('moveClassModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('moveClassModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('moveClassModalBackdrop'); });
    $('moveClassConfirm').addEventListener('click', () => {
      const newClass = $('moveClassNew').value;
      if (!newClass) { setFieldError('moveClassNew', 'Choose a destination class.'); return; }
      setFieldError('moveClassNew', null);
      submitWithLoading('moveClassConfirm', () => {
        const children = pendingMoveChildren || [];
        children.forEach((c) => window.PlayStore.updateRecord(c.id, { room: newClass }));
        const count = children.length;
        children.forEach((c) => selectedIds.delete(c.id));
        pendingMoveChildren = null;
        closeModal('moveClassModalBackdrop');
        render();
        window.PlayShell.toast('success', 'Class updated', `${count} ${count === 1 ? 'child moved' : 'children moved'} to ${newClass}.`);
      });
    });
  }

  /* ---------- withdraw modal ---------- */
  function openWithdrawModal(child) {
    pendingWithdrawChild = child;
    $('withdrawTitle').textContent = `Withdraw ${child.name}`;
    $('withdrawDate').value = todayStr();
    $('withdrawReason').value = '';
    setFieldError('withdrawDate', null);
    setFieldError('withdrawReason', null);
    openModal('withdrawModalBackdrop');
  }
  function wireWithdrawModal() {
    const backdrop = $('withdrawModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('withdrawModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('withdrawModalBackdrop'); });
    $('withdrawConfirm').addEventListener('click', () => {
      const date = $('withdrawDate').value;
      const reason = $('withdrawReason').value.trim();
      let ok = true;
      if (!date) { setFieldError('withdrawDate', 'Withdrawal date is required.'); ok = false; } else setFieldError('withdrawDate', null);
      if (!reason) { setFieldError('withdrawReason', 'Please provide a reason.'); ok = false; } else setFieldError('withdrawReason', null);
      if (!ok) return;
      submitWithLoading('withdrawConfirm', () => {
        const child = pendingWithdrawChild;
        if (!child) return;
        window.PlayStore.updateRecord(child.id, { status: 'Withdrawn', withdrawnDate: date, withdrawnReason: reason });
        selectedIds.delete(child.id);
        pendingWithdrawChild = null;
        closeModal('withdrawModalBackdrop');
        render();
        window.PlayShell.toast('success', 'Child withdrawn', `${child.name} has been marked as withdrawn.`);
        window.PlayShell.addNotification({ title: 'Child withdrawn', text: `${child.name} was withdrawn: ${reason}`, module: null, recordRoute: 'record.html?id=' + child.id });
      });
    });
  }

  /* ---------- message families composer (S31 stand-in) ---------- */
  function openMessageComposer(children) {
    if (!children.length) return;
    if (!isModuleUnlocked('communication')) {
      window.PlayShell.toast('warning', 'Upgrade required', 'Direct messaging to families is part of the Premium plan. Visit Plans to upgrade.');
      return;
    }
    messageChildren = children;
    const guardianIds = new Map();
    children.forEach((c) => {
      const g = guardianFor(c);
      if (g) guardianIds.set(g.id, g);
    });
    messageRecipientGuardianIds = new Set(guardianIds.keys());
    renderMessageRecipients(guardianIds);
    const firstGuardian = Array.from(guardianIds.values())[0];
    const tmpl = templateForLanguage(firstGuardian && firstGuardian.preferredLanguage);
    $('msgSubject').value = tmpl.subject;
    $('msgBody').value = tmpl.body;
    setFieldError('msgSubject', null);
    setFieldError('msgBody', null);
    openModal('messageModalBackdrop');
  }
  function renderMessageRecipients(guardianMap) {
    const wrap = $('messageRecipients');
    const guardians = Array.from(messageRecipientGuardianIds).map((id) => guardianMap ? guardianMap.get(id) : window.PlayStore.getById(id)).filter(Boolean);
    wrap.innerHTML = guardians.map((g) => `
      <span class="chip" data-guardian-id="${g.id}">
        ${escapeHtml(g.name)}
        <span class="chip__remove" role="button" tabindex="0" aria-label="Remove ${escapeHtml(g.name)}">&times;</span>
      </span>`).join('');
    wrap.querySelectorAll('.chip__remove').forEach((btn) => {
      const chipEl = btn.closest('.chip');
      const act = () => { messageRecipientGuardianIds.delete(chipEl.dataset.guardianId); renderMessageRecipients(); };
      btn.addEventListener('click', act);
      btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    });
  }
  function wireMessageModal() {
    const backdrop = $('messageModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('messageModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('messageModalBackdrop'); });
    $('messageSend').addEventListener('click', () => {
      const subject = $('msgSubject').value.trim();
      const body = $('msgBody').value.trim();
      let ok = true;
      if (!subject) { setFieldError('msgSubject', 'Add a subject.'); ok = false; } else setFieldError('msgSubject', null);
      if (!body) { setFieldError('msgBody', 'Write a message before sending.'); ok = false; } else setFieldError('msgBody', null);
      if (!messageRecipientGuardianIds.size) { window.PlayShell.toast('error', 'No recipients', 'Add at least one guardian to message.'); ok = false; }
      if (!ok) return;
      submitWithLoading('messageSend', () => {
        const recipientIds = Array.from(messageRecipientGuardianIds);
        window.PlayStore.addRecord({ id: 'MSG-' + Date.now().toString(36), type: 'Message', subject, body, recipientGuardianIds: recipientIds, date: todayStr() });
        const count = recipientIds.length;
        closeModal('messageModalBackdrop');
        window.PlayShell.toast('success', 'Message sent', `Sent to ${count} ${count === 1 ? 'family' : 'families'}.`);
      });
    });
  }
})();
