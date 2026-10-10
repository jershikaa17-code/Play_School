/* ==========================================================================
   PLAY SCHOOL — Families (S15)
   Reuses: store.js (Family/Child/Guardian/Payment records + persistence),
   modules.js (billing plan check), shell.js (shell chrome, toasts). Family
   records are derived/persisted by store.js's ensureFamiliesForAllChildren()
   the first time they're needed — this page only reads/writes them like any
   other PlayStore record, so S12/S13/S16 all stay in sync automatically.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function initials(name) { const p = String(name || '').trim().split(/\s+/); return p[0] ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '?'; }
  function nowISO() { return new Date().toISOString(); }
  function formatDate(iso) { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d.getTime())) return '—'; return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  function isPhoneLike(v) { return !!v && v.indexOf('@') === -1; }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }

  const ICON = {
    dots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  };

  const STATUS_LABEL = { 'Not invited': 'Not invited', 'Invited': 'Invited', 'Active': 'Active' };
  const STATUS_CLASS = { 'Not invited': 'fam-status-chip--not-invited', 'Invited': 'fam-status-chip--invited', 'Active': 'fam-status-chip--active' };

  let role = null;
  let hasBilling = true;
  let searchQuery = '';
  const filters = { classes: new Set(), statuses: new Set(), balance: 'all' };
  let selectedIds = new Set();
  let afChosenChildren = [];   // [{id,name}]
  let afChosenGuardians = [];  // [{id,name}]
  let afPrimaryContactId = null;
  let afEditingFamilyId = null;
  let pendingInviteFamilies = [];
  let pendingMergeFamilies = null;
  let mergeSurvivorChoice = 'a'; // 'a' | 'b' — which family's name/order to keep as base
  let mergePrimaryContactId = null;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', (e) => { role = e.detail.role; render(); });

  function init() {
    window.PlayShell.login();
    role = window.PlayShell.getDemoRole();
    window.PlayShell.mount('families', 'Families');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    hasBilling = isModuleUnlocked('billing');
    if (!hasBilling) $('famBalanceHead').hidden = true;

    wireToolbar();
    wireFilterSheet();
    wireAddFamilyModal();
    wireInviteModal();
    wireMergeModal();
    wireGlobalMenuClose();
    wireBulkBarOnce();

    window.setTimeout(() => { $('famSkeleton').hidden = true; render(); maybeHandleDeepLinkAction(); }, 450);
  }

  /** Lets the Family profile (S16) trigger this page's own Edit modal
      instead of duplicating it — families.html?action=edit&id=FAM-xxx. */
  function maybeHandleDeepLinkAction() {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const id = params.get('id');
    if (!action || !id) return;
    const family = allFamilies().find((f) => f.id === id);
    if (!family) return;
    if (action === 'edit') openAddFamilyModal(family);
  }

  function isModuleUnlocked(moduleId) {
    if (!window.PlayModules) return true;
    const mod = window.PlayModules.getById(moduleId);
    if (!mod) return true;
    return window.PlayModules.isUnlocked(mod, window.PlayModules.getCurrentPlan());
  }

  /* ---------- data helpers ---------- */
  function allFamilies() { return window.PlayStore.getByType('Family'); }
  function guardiansOf(f) { return (f.guardianIds || []).map((id) => window.PlayStore.getById(id)).filter(Boolean); }
  function childrenOf(f) { return (f.childIds || []).map((id) => window.PlayStore.getById(id)).filter(Boolean); }
  function primaryGuardianOf(f) { return window.PlayStore.getById(f.primaryGuardianId) || guardiansOf(f)[0] || null; }
  function primaryContactOf(f) {
    const g = primaryGuardianOf(f);
    if (!g) return null;
    return g.phone || (isPhoneLike(g.contact) ? g.contact : null);
  }
  function classesOf(f) { return Array.from(new Set(childrenOf(f).map((c) => c.room).filter(Boolean))); }
  function balanceOf(f) {
    const names = new Set(childrenOf(f).map((c) => c.name));
    return window.PlayStore.getByType('Payment').filter((p) => names.has(p.childName) && p.status === 'Pending').reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }
  function classOptions() { return window.PlayStore.getByType('Class').map((c) => c.name); }

  /* ---------- filtering ---------- */
  function matchesSearch(f, q) {
    if (!q) return true;
    const names = [f.name, ...guardiansOf(f).map((g) => g.name), ...childrenOf(f).map((c) => c.name)].join(' ').toLowerCase();
    return names.includes(q);
  }
  function passesFilters(f) {
    if (filters.classes.size) { const fc = classesOf(f); if (!fc.some((c) => filters.classes.has(c))) return false; }
    if (filters.statuses.size && !filters.statuses.has(f.parentAppStatus)) return false;
    if (hasBilling && filters.balance === 'outstanding' && balanceOf(f) <= 0) return false;
    return true;
  }
  function filteredFamilies() {
    const q = searchQuery.trim().toLowerCase();
    return allFamilies().filter((f) => matchesSearch(f, q) && passesFilters(f)).sort((a, b) => a.name.localeCompare(b.name));
  }
  function anyFilterActive() { return filters.classes.size + filters.statuses.size + (filters.balance !== 'all' ? 1 : 0) > 0; }

  const FILTER_GROUPS = [
    { key: 'classes', label: 'Class', type: 'multi', options: () => classOptions().map((c) => ({ key: c, label: c })) },
    { key: 'statuses', label: 'Parent app', type: 'multi', options: () => Object.keys(STATUS_LABEL).map((s) => ({ key: s, label: s })) },
  ];
  if (hasBilling) FILTER_GROUPS.push({ key: 'balance', label: 'Balance', type: 'single', options: () => [{ key: 'all', label: 'All families' }, { key: 'outstanding', label: 'Has outstanding balance' }] });

  /* ========================================================================
     RENDER ORCHESTRATION
     ======================================================================== */
  function render() {
    $('famSkeleton').hidden = true;
    renderSummary();
    renderToolbarFilters();
    renderFilterSheetBody();
    renderChips();
    const list = filteredFamilies();
    selectedIds = new Set(Array.from(selectedIds).filter((id) => allFamilies().some((f) => f.id === id)));
    renderResultCount(list);
    renderEmpty(list);
    $('famTableWrap').hidden = !list.length;
    if (list.length) renderTable(list);
    renderBulkBar();
  }

  function renderSummary() {
    const families = allFamilies();
    const active = families.filter((f) => f.parentAppStatus === 'Active').length;
    const invited = families.filter((f) => f.parentAppStatus === 'Invited').length;
    const items = [
      { value: families.length, label: 'Total families' },
      { value: active, label: 'Active parent app' },
      { value: invited, label: 'Invitations pending' },
    ];
    if (hasBilling) items.push({ value: families.filter((f) => balanceOf(f) > 0).length, label: 'Outstanding balance' });
    $('famHeading').textContent = `Families (${families.length})`;
    $('famSummary').innerHTML = items.map((i) => `<div class="stat-card"><div class="stat-card__value">${i.value}</div><div class="stat-card__label">${escapeHtml(i.label)}</div></div>`).join('');
  }

  function renderResultCount(list) {
    const total = allFamilies().length;
    $('famResultCount').textContent = (searchQuery.trim() || anyFilterActive())
      ? `${list.length} of ${total} families match`
      : `${total} ${total === 1 ? 'family' : 'families'}`;
  }

  function renderEmpty(list) {
    const empty = $('famEmptyState');
    if (list.length) { empty.hidden = true; return; }
    empty.hidden = false;
    const hasAny = allFamilies().length > 0;
    if (hasAny) {
      $('famEmptyIcon').innerHTML = ICON.inbox;
      $('famEmptyTitle').textContent = 'No families match these filters';
      $('famEmptyText').textContent = 'Try a different search term or clear your filters.';
      $('famEmptyAction').innerHTML = '<button class="btn btn--secondary" type="button" id="famEmptyClearBtn">Clear filters</button>';
      $('famEmptyClearBtn').addEventListener('click', clearFilters);
    } else {
      $('famEmptyIcon').innerHTML = ICON.users;
      $('famEmptyTitle').textContent = 'No families added yet';
      $('famEmptyText').textContent = 'Families are created automatically as children are enrolled, or you can add one directly.';
      $('famEmptyAction').innerHTML = '<button class="btn btn--accent" type="button" id="famEmptyAddBtn">Add family</button>';
      $('famEmptyAddBtn').addEventListener('click', () => openAddFamilyModal(null));
    }
  }

  /* ---------- toolbar: search + filters ---------- */
  function wireToolbar() {
    $('famSearch').addEventListener('input', (e) => { searchQuery = e.target.value; render(); });
    $('addFamilyBtn').addEventListener('click', () => openAddFamilyModal(null));
  }
  function renderToolbarFilters() {
    const wrap = $('famFiltersDesktop');
    wrap.innerHTML = FILTER_GROUPS.map((g) => filterDropdownHtml(g)).join('');
    wrap.querySelectorAll('[data-filter-group]').forEach((el) => wireFilterDropdown(el));
    const count = filters.classes.size + filters.statuses.size + (filters.balance !== 'all' ? 1 : 0);
    const badge = $('famFilterCountBadge');
    if (count) { badge.hidden = false; badge.textContent = String(count); badge.classList.add('fam-filter-count'); } else badge.hidden = true;
  }
  function filterDropdownHtml(group) {
    if (group.type === 'single') {
      const selected = filters[group.key] !== 'all';
      return `
        <span class="filter-dropdown" data-filter-group="${group.key}">
          <button class="fam-filter-trigger${selected ? ' has-value' : ''}" type="button" aria-haspopup="true" aria-expanded="false">
            <span>${escapeHtml(group.label)}${selected ? ': Outstanding' : ''}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <span class="filter-dropdown__panel" role="menu">
            ${group.options().map((o) => `<button class="popover__item" type="button" data-single-value="${o.key}">${escapeHtml(o.label)}</button>`).join('')}
          </span>
        </span>`;
    }
    const selectedSet = filters[group.key];
    const options = group.options();
    const label = selectedSet.size ? `${group.label} (${selectedSet.size})` : group.label;
    return `
      <span class="filter-dropdown" data-filter-group="${group.key}">
        <button class="fam-filter-trigger${selectedSet.size ? ' has-value' : ''}" type="button" aria-haspopup="true" aria-expanded="false">
          <span>${escapeHtml(label)}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <span class="filter-dropdown__panel" role="menu">
          ${options.map((o) => `
            <span class="check-row">
              <input type="checkbox" class="checkbox" id="fg-${group.key}-${escapeHtml(o.key)}" data-group="${group.key}" value="${escapeHtml(o.key)}" ${selectedSet.has(o.key) ? 'checked' : ''} />
              <label for="fg-${group.key}-${escapeHtml(o.key)}">${escapeHtml(o.label)}</label>
            </span>`).join('') || '<p class="field__hint" style="padding: var(--space-2) var(--space-3);">No options yet.</p>'}
        </span>
      </span>`;
  }
  function wireFilterDropdown(el) {
    const trigger = el.querySelector('.fam-filter-trigger');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !el.classList.contains('is-open');
      document.querySelectorAll('.filter-dropdown.is-open').forEach((p) => p.classList.remove('is-open'));
      el.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    });
    el.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const set = filters[cb.dataset.group];
        if (cb.checked) set.add(cb.value); else set.delete(cb.value);
        render();
        const reopened = document.querySelector(`.filter-dropdown[data-filter-group="${cb.dataset.group}"]`);
        if (reopened) reopened.classList.add('is-open');
      });
    });
    el.querySelectorAll('[data-single-value]').forEach((btn) => {
      btn.addEventListener('click', () => { filters[el.dataset.filterGroup] = btn.dataset.singleValue; render(); });
    });
  }
  document.addEventListener('click', () => document.querySelectorAll('.filter-dropdown.is-open').forEach((p) => p.classList.remove('is-open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.filter-dropdown.is-open').forEach((p) => p.classList.remove('is-open')); });

  function renderChips() {
    const row = $('famChipRow');
    const chips = [];
    filters.classes.forEach((v) => chips.push({ group: 'classes', value: v, text: `Class: ${v}` }));
    filters.statuses.forEach((v) => chips.push({ group: 'statuses', value: v, text: `Parent app: ${v}` }));
    if (filters.balance !== 'all') chips.push({ group: 'balance', value: 'all', text: 'Balance: Outstanding' });
    if (!chips.length) { row.hidden = true; row.innerHTML = ''; return; }
    row.hidden = false;
    row.innerHTML = chips.map((c) => `<span class="chip" data-chip-group="${c.group}" data-chip-value="${escapeHtml(c.value)}">${escapeHtml(c.text)}<span class="chip__remove" role="button" tabindex="0" aria-label="Remove filter ${escapeHtml(c.text)}">&times;</span></span>`).join('')
      + `<button class="fam-chip-row__clear" type="button" id="famClearAllChipsBtn">Clear all</button>`;
    row.querySelectorAll('.chip__remove').forEach((btn) => {
      const chipEl = btn.closest('.chip');
      const act = () => {
        if (chipEl.dataset.chipGroup === 'balance') filters.balance = 'all';
        else filters[chipEl.dataset.chipGroup].delete(chipEl.dataset.chipValue);
        render();
      };
      btn.addEventListener('click', act);
      btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    });
    $('famClearAllChipsBtn').addEventListener('click', clearFilters);
  }
  function clearFilters() { filters.classes.clear(); filters.statuses.clear(); filters.balance = 'all'; render(); }

  /* ---------- mobile filter sheet ---------- */
  function wireFilterSheet() {
    $('famFilterSheetBtn').addEventListener('click', () => { $('famFilterSheetBackdrop').classList.add('is-open'); document.body.style.overflow = 'hidden'; });
    $('famFilterSheetBackdrop').addEventListener('click', (e) => { if (e.target.id === 'famFilterSheetBackdrop') closeFilterSheet(); });
    $('famFilterSheetClear').addEventListener('click', clearFilters);
    $('famFilterSheetApply').addEventListener('click', closeFilterSheet);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFilterSheet(); });
  }
  function closeFilterSheet() { $('famFilterSheetBackdrop').classList.remove('is-open'); document.body.style.overflow = ''; }
  function renderFilterSheetBody() {
    const body = $('famFilterSheetBody');
    body.innerHTML = FILTER_GROUPS.map((g) => `
      <div class="sheet__group">
        <div class="sheet__group-label">${escapeHtml(g.label)}</div>
        ${g.options().map((o) => {
          if (g.type === 'single') {
            const checked = filters[g.key] === o.key;
            return `<div class="check-row" style="margin-bottom: var(--space-2);"><input type="radio" class="checkbox" name="sheet-${g.key}" id="sheet-${g.key}-${escapeHtml(o.key)}" value="${escapeHtml(o.key)}" ${checked ? 'checked' : ''} /><label for="sheet-${g.key}-${escapeHtml(o.key)}" style="font-size: var(--fs-body-sm);">${escapeHtml(o.label)}</label></div>`;
          }
          return `<div class="check-row" style="margin-bottom: var(--space-2);"><input type="checkbox" class="checkbox" id="sheet-${g.key}-${escapeHtml(o.key)}" data-group="${g.key}" value="${escapeHtml(o.key)}" ${filters[g.key].has(o.key) ? 'checked' : ''} /><label for="sheet-${g.key}-${escapeHtml(o.key)}" style="font-size: var(--fs-body-sm);">${escapeHtml(o.label)}</label></div>`;
        }).join('')}
      </div>`).join('');
    body.querySelectorAll('input[type="checkbox"][data-group]').forEach((cb) => cb.addEventListener('change', () => { const set = filters[cb.dataset.group]; if (cb.checked) set.add(cb.value); else set.delete(cb.value); render(); }));
    body.querySelectorAll('input[type="radio"]').forEach((rb) => rb.addEventListener('change', () => { if (rb.checked) { filters.balance = rb.value; render(); } }));
  }

  /* ========================================================================
     TABLE / CARDS
     ======================================================================== */
  function renderTable(list) {
    $('famTableBody').innerHTML = list.map((f) => familyRowHtml(f)).join('');
    $('famTableCards').innerHTML = list.map((f) => familyCardHtml(f)).join('');
    [$('famTableBody'), $('famTableCards')].forEach((container) => {
      wireRowSelection(container);
      wireMenus(container);
      wireRowNavigation(container);
    });
    const selectAll = $('famSelectAll');
    selectAll.checked = list.length > 0 && list.every((f) => selectedIds.has(f.id));
    selectAll.indeterminate = list.some((f) => selectedIds.has(f.id)) && !selectAll.checked;
    selectAll.onchange = () => { if (selectAll.checked) list.forEach((f) => selectedIds.add(f.id)); else list.forEach((f) => selectedIds.delete(f.id)); render(); };
  }

  function guardiansSummaryHtml(f) {
    const guardians = guardiansOf(f);
    if (!guardians.length) return `<span class="fam-people-empty">No guardians on file</span>`;
    const shown = guardians.slice(0, 3);
    const extra = guardians.length - shown.length;
    return `
      <div class="fam-people-row">
        <div class="fam-avatar-stack">
          ${shown.map((g) => `<span class="avatar avatar--sm" title="${escapeHtml(g.name)}">${escapeHtml(initials(g.name))}</span>`).join('')}
          ${extra > 0 ? `<span class="fam-avatar-more" title="${guardians.slice(3).map((g) => escapeHtml(g.name)).join(', ')}">+${extra}</span>` : ''}
        </div>
        <span class="fam-people-names">${escapeHtml(guardians.map((g) => g.name).join(', '))}</span>
      </div>`;
  }
  function childrenSummaryHtml(f) {
    const children = childrenOf(f);
    if (!children.length) return `<span class="fam-people-empty">No children linked</span>`;
    const shown = children.slice(0, 4);
    const extra = children.length - shown.length;
    return `
      <div class="fam-people-row">
        <div class="fam-avatar-stack">
          ${shown.map((c) => `<span class="avatar avatar--sm" title="${escapeHtml(c.name)}">${escapeHtml(initials(c.name))}</span>`).join('')}
          ${extra > 0 ? `<span class="fam-avatar-more">+${extra}</span>` : ''}
        </div>
        <span class="fam-people-names">${children.length} ${children.length === 1 ? 'child' : 'children'}</span>
      </div>`;
  }
  function statusChipHtml(f) { return `<span class="fam-status-chip ${STATUS_CLASS[f.parentAppStatus] || 'fam-status-chip--not-invited'}">${escapeHtml(STATUS_LABEL[f.parentAppStatus] || f.parentAppStatus)}</span>`; }
  function balanceHtml(f) {
    if (!hasBilling) return `<span class="fam-balance-locked">${ICON.lock} Locked</span>`;
    const bal = balanceOf(f);
    return bal > 0 ? `<span class="fam-balance--outstanding">$${bal.toFixed(2)}</span>` : `<span class="fam-balance--settled">Settled</span>`;
  }
  function actionMenuHtml(f) {
    return `
      <span class="popover fam-row-menu" data-fam-menu data-id="${f.id}">
        <button class="btn btn--icon" type="button" data-menu-trigger aria-haspopup="true" aria-expanded="false" aria-label="Actions for ${escapeHtml(f.name)}">${ICON.dots}</button>
        <span class="popover__panel" role="menu" style="right:0; left:auto;">
          <button class="popover__item" type="button" data-action="view" role="menuitem">View family</button>
          <button class="popover__item" type="button" data-action="edit" role="menuitem">Edit family</button>
          ${f.parentAppStatus !== 'Active' ? `<button class="popover__item" type="button" data-action="invite" role="menuitem">Invite to parent app</button>` : ''}
        </span>
      </span>`;
  }

  function familyRowHtml(f) {
    const selected = selectedIds.has(f.id);
    const contact = primaryContactOf(f);
    return `
      <tr data-fam-id="${f.id}" tabindex="0">
        <td><input type="checkbox" class="checkbox" data-select="${f.id}" ${selected ? 'checked' : ''} aria-label="Select ${escapeHtml(f.name)}" /></td>
        <td><div class="fam-name-cell"><span class="fam-name-cell__name">${escapeHtml(f.name)}</span><span class="fam-name-cell__sub">${classesOf(f).join(', ') || '—'}</span></div></td>
        <td>${guardiansSummaryHtml(f)}</td>
        <td>${childrenSummaryHtml(f)}</td>
        <td class="cell-muted">${contact ? escapeHtml(contact) : '—'}</td>
        <td>${statusChipHtml(f)}</td>
        <td>${balanceHtml(f)}</td>
        <td>${actionMenuHtml(f)}</td>
      </tr>`;
  }
  function familyCardHtml(f) {
    const selected = selectedIds.has(f.id);
    const contact = primaryContactOf(f);
    return `
      <div class="table-card__item" data-fam-id="${f.id}">
        <div class="table-card__head">
          <input type="checkbox" class="checkbox" data-select="${f.id}" ${selected ? 'checked' : ''} aria-label="Select ${escapeHtml(f.name)}" />
          <span class="cell-primary">${escapeHtml(f.name)}</span>
          ${actionMenuHtml(f)}
        </div>
        <div class="table-card__row"><span class="table-card__label">Children</span><span class="table-card__value">${childrenSummaryHtml(f)}</span></div>
        <div class="table-card__row"><span class="table-card__label">Guardians</span><span class="table-card__value">${guardiansSummaryHtml(f)}</span></div>
        <div class="table-card__row"><span class="table-card__label">Primary contact</span><span class="table-card__value">${contact ? escapeHtml(contact) : '—'}</span></div>
        <div class="table-card__row"><span class="table-card__label">Parent app</span><span class="table-card__value">${statusChipHtml(f)}</span></div>
        ${hasBilling ? `<div class="table-card__row"><span class="table-card__label">Balance</span><span class="table-card__value">${balanceHtml(f)}</span></div>` : ''}
      </div>`;
  }

  function wireRowSelection(container) {
    container.querySelectorAll('[data-select]').forEach((cb) => {
      cb.addEventListener('click', (e) => e.stopPropagation());
      cb.addEventListener('change', () => { if (cb.checked) selectedIds.add(cb.dataset.select); else selectedIds.delete(cb.dataset.select); render(); });
    });
  }
  function wireMenus(container) {
    container.querySelectorAll('[data-fam-menu]').forEach((menu) => {
      const trigger = menu.querySelector('[data-menu-trigger]');
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = !menu.classList.contains('is-open');
        document.querySelectorAll('[data-fam-menu].is-open').forEach((m) => m.classList.remove('is-open'));
        menu.classList.toggle('is-open', willOpen);
      });
      menu.querySelectorAll('[data-action]').forEach((item) => {
        item.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.remove('is-open'); handleMenuAction(item.dataset.action, menu.dataset.id); });
      });
    });
  }
  function wireGlobalMenuClose() {
    document.addEventListener('click', () => document.querySelectorAll('[data-fam-menu].is-open').forEach((m) => m.classList.remove('is-open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('[data-fam-menu].is-open').forEach((m) => m.classList.remove('is-open')); });
  }
  function wireRowNavigation(container) {
    const openIt = (id) => { window.location.href = 'family.html?id=' + encodeURIComponent(id); };
    container.querySelectorAll('[data-fam-id]').forEach((el) => {
      el.addEventListener('click', (e) => { if (e.target.closest('[data-select]') || e.target.closest('[data-fam-menu]')) return; openIt(el.dataset.famId); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.target.closest('button') && !e.target.closest('input')) openIt(el.dataset.famId); });
    });
  }
  function handleMenuAction(action, familyId) {
    const family = allFamilies().find((f) => f.id === familyId);
    if (!family) return;
    if (action === 'view') window.location.href = 'family.html?id=' + encodeURIComponent(familyId);
    else if (action === 'edit') openAddFamilyModal(family);
    else if (action === 'invite') openInviteModal([family]);
  }

  /* ---------- bulk bar ---------- */
  function renderBulkBar() {
    const bar = $('famBulkBar');
    if (!selectedIds.size) { bar.hidden = true; return; }
    bar.hidden = false;
    $('famBulkCount').textContent = `${selectedIds.size} selected`;
    $('bulkMergeBtn').disabled = selectedIds.size !== 2;
  }
  function wireBulkBarOnce() {
    $('bulkClearBtn').addEventListener('click', () => { selectedIds.clear(); render(); });
    $('bulkInviteBtn').addEventListener('click', () => openInviteModal(selectedFamilies()));
    $('bulkMergeBtn').addEventListener('click', () => { if (selectedIds.size === 2) openMergeModal(selectedFamilies()); });
  }
  function selectedFamilies() { return allFamilies().filter((f) => selectedIds.has(f.id)); }

  /* ========================================================================
     MODAL PLUMBING
     ======================================================================== */
  function openModal(id) { const b = $(id); b.classList.add('is-open'); b.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const b = $(id); b.classList.remove('is-open'); b.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  function setFieldError(inputId, message) {
    const input = $(inputId); const err = $('err-' + inputId);
    if (!err) return;
    if (message) { err.textContent = message; err.hidden = false; if (input) input.closest('.field').classList.add('is-error'); }
    else { err.hidden = true; if (input) input.closest('.field').classList.remove('is-error'); }
  }
  function submitWithLoading(btnId, work) {
    const btn = $(btnId);
    if (btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading'); btn.disabled = true;
    window.setTimeout(() => { work(); btn.classList.remove('is-loading'); btn.disabled = false; }, 450);
  }

  /* ========================================================================
     ADD / EDIT FAMILY MODAL
     ======================================================================== */
  function openAddFamilyModal(family) {
    afEditingFamilyId = family ? family.id : null;
    document.querySelector('#addFamilyModalBackdrop .modal__title').textContent = family ? 'Edit family' : 'Add family';
    $('afSave').querySelector('span:last-child').textContent = family ? 'Save changes' : 'Save family';
    $('afName').value = family ? family.name : '';
    afChosenChildren = family ? childrenOf(family).map((c) => ({ id: c.id, name: c.name })) : [];
    afChosenGuardians = family ? guardiansOf(family).map((g) => ({ id: g.id, name: g.name })) : [];
    afPrimaryContactId = family ? family.primaryGuardianId : null;
    $('afChildSearch').value = ''; $('afGuardianSearch').value = '';
    setFieldError('afName', null); setFieldError('afChildChips', null); setFieldError('afGuardianChips', null);
    renderAfChildChips(); renderAfGuardianChips(); renderAfPrimaryContactOptions();
    renderAfPickerResults('child', ''); renderAfPickerResults('guardian', '');
    openModal('addFamilyModalBackdrop');
    $('afName').focus();
  }
  function renderAfPickerResults(kind, q) {
    const resultsEl = $(kind === 'child' ? 'afChildResults' : 'afGuardianResults');
    if (!q.trim()) { resultsEl.innerHTML = ''; resultsEl.hidden = true; return; }
    const chosen = kind === 'child' ? afChosenChildren : afChosenGuardians;
    const chosenIds = new Set(chosen.map((x) => x.id));
    const records = window.PlayStore.getByType(kind === 'child' ? 'Child' : 'Guardian')
      .filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase()) && !chosenIds.has(r.id))
      .slice(0, 6);
    resultsEl.innerHTML = records.map((r) => `
      <div class="fam-picker-row" data-pick-id="${r.id}" data-pick-name="${escapeHtml(r.name)}">
        <span class="avatar avatar--sm">${escapeHtml(initials(r.name))}</span>
        <span>${escapeHtml(r.name)}</span>
        <span class="fam-picker-row__sub">${escapeHtml(kind === 'child' ? (r.room || '') : (r.contact || ''))}</span>
      </div>`).join('') || '<p class="field__hint" style="padding: var(--space-2);">No matches.</p>';
    resultsEl.hidden = false;
    resultsEl.querySelectorAll('[data-pick-id]').forEach((row) => row.addEventListener('click', () => {
      const entry = { id: row.dataset.pickId, name: row.dataset.pickName };
      if (kind === 'child') { afChosenChildren.push(entry); renderAfChildChips(); } else { afChosenGuardians.push(entry); renderAfGuardianChips(); renderAfPrimaryContactOptions(); }
      $(kind === 'child' ? 'afChildSearch' : 'afGuardianSearch').value = '';
      renderAfPickerResults(kind, '');
    }));
  }
  function renderAfChildChips() {
    $('afChildChips').innerHTML = afChosenChildren.map((c) => `<span class="chip" data-chip-id="${c.id}">${escapeHtml(c.name)}<span class="chip__remove" role="button" tabindex="0" aria-label="Remove ${escapeHtml(c.name)}">&times;</span></span>`).join('');
    $('afChildChips').hidden = !afChosenChildren.length;
    $('afChildChips').querySelectorAll('.chip__remove').forEach((btn) => btn.addEventListener('click', () => {
      const id = btn.closest('.chip').dataset.chipId;
      afChosenChildren = afChosenChildren.filter((c) => c.id !== id);
      renderAfChildChips();
    }));
  }
  function renderAfGuardianChips() {
    $('afGuardianChips').innerHTML = afChosenGuardians.map((g) => `<span class="chip" data-chip-id="${g.id}">${escapeHtml(g.name)}<span class="chip__remove" role="button" tabindex="0" aria-label="Remove ${escapeHtml(g.name)}">&times;</span></span>`).join('');
    $('afGuardianChips').hidden = !afChosenGuardians.length;
    $('afGuardianChips').querySelectorAll('.chip__remove').forEach((btn) => btn.addEventListener('click', () => {
      const id = btn.closest('.chip').dataset.chipId;
      afChosenGuardians = afChosenGuardians.filter((g) => g.id !== id);
      if (afPrimaryContactId === id) afPrimaryContactId = afChosenGuardians[0] ? afChosenGuardians[0].id : null;
      renderAfGuardianChips(); renderAfPrimaryContactOptions();
    }));
  }
  function renderAfPrimaryContactOptions() {
    const field = $('afPrimaryContactField');
    if (!afChosenGuardians.length) { field.hidden = true; return; }
    field.hidden = false;
    if (!afPrimaryContactId || !afChosenGuardians.some((g) => g.id === afPrimaryContactId)) afPrimaryContactId = afChosenGuardians[0].id;
    $('afPrimaryContactOptions').innerHTML = afChosenGuardians.map((g) => `
      <label class="check-row" style="margin-bottom: 4px;"><input type="radio" class="checkbox" name="afPrimaryContact" value="${g.id}" ${afPrimaryContactId === g.id ? 'checked' : ''} /> ${escapeHtml(g.name)}</label>`).join('');
    $('afPrimaryContactOptions').querySelectorAll('input[type="radio"]').forEach((rb) => rb.addEventListener('change', () => { if (rb.checked) afPrimaryContactId = rb.value; }));
  }
  function wireAddFamilyModal() {
    const backdrop = $('addFamilyModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('addFamilyModalBackdrop'); });
    $('afCancel').addEventListener('click', () => closeModal('addFamilyModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('addFamilyModalBackdrop'); });
    $('afChildSearch').addEventListener('input', (e) => renderAfPickerResults('child', e.target.value));
    $('afGuardianSearch').addEventListener('input', (e) => renderAfPickerResults('guardian', e.target.value));
    $('afSave').addEventListener('click', () => {
      const name = $('afName').value.trim();
      let ok = true;
      if (!name) { setFieldError('afName', 'Family name is required.'); ok = false; } else setFieldError('afName', null);
      if (!afChosenGuardians.length) { setFieldError('afGuardianChips', 'Add at least one guardian.'); ok = false; } else setFieldError('afGuardianChips', null);
      if (!ok) return;
      submitWithLoading('afSave', () => {
        const guardianIds = afChosenGuardians.map((g) => g.id);
        const childIds = afChosenChildren.map((c) => c.id);
        const primaryGuardianId = afPrimaryContactId || guardianIds[0];
        let familyId = afEditingFamilyId;
        // a child/guardian can only belong to one family — unclaim them from
        // wherever they currently live before this family claims them
        allFamilies().forEach((other) => {
          if (other.id === familyId) return;
          const remainingChildren = (other.childIds || []).filter((id) => !childIds.includes(id));
          const remainingGuardians = (other.guardianIds || []).filter((id) => !guardianIds.includes(id));
          if (remainingChildren.length !== (other.childIds || []).length || remainingGuardians.length !== (other.guardianIds || []).length) {
            window.PlayStore.updateRecord(other.id, { childIds: remainingChildren, guardianIds: remainingGuardians });
          }
        });
        if (familyId) {
          window.PlayStore.updateRecord(familyId, { name, guardianIds, childIds, primaryGuardianId });
        } else {
          familyId = uid('FAM');
          window.PlayStore.addRecord({ id: familyId, type: 'Family', name, guardianIds, childIds, primaryGuardianId, parentAppStatus: 'Not invited', invitedAt: null });
        }
        // keep each linked child's own guardian reference consistent with this family
        childIds.forEach((cid) => window.PlayStore.updateRecord(cid, { guardianId: primaryGuardianId, guardianIds }));
        closeModal('addFamilyModalBackdrop');
        render();
        window.PlayShell.toast('success', afEditingFamilyId ? 'Family updated' : 'Family added', `${name} ${afEditingFamilyId ? 'has been updated' : 'is now available in Families'}.`);
      });
    });
  }

  /* ========================================================================
     INVITE MODAL
     ======================================================================== */
  function openInviteModal(families) {
    const eligible = families.filter((f) => f.parentAppStatus !== 'Active');
    if (!eligible.length) { window.PlayShell.toast('info', 'Already active', 'The selected families already have parent-app access.'); return; }
    pendingInviteFamilies = eligible;
    const names = eligible.map((f) => f.name);
    const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? `, +${names.length - 3} more` : '');
    $('inviteModalTitle').textContent = eligible.length === 1 ? `Invite ${names[0]} to the parent app?` : `Invite ${eligible.length} families to the parent app?`;
    $('inviteModalText').textContent = `This will send a parent-app invite to: ${shown}. This demo simulates the invite and updates each family's status — no real email or SMS is sent.`;
    openModal('inviteModalBackdrop');
  }
  function wireInviteModal() {
    const backdrop = $('inviteModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal('inviteModalBackdrop'); });
    $('inviteCancel').addEventListener('click', () => closeModal('inviteModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('inviteModalBackdrop'); });
    $('inviteConfirm').addEventListener('click', () => {
      submitWithLoading('inviteConfirm', () => {
        const families = pendingInviteFamilies;
        families.forEach((f) => window.PlayStore.updateRecord(f.id, { parentAppStatus: 'Invited', invitedAt: nowISO() }));
        families.forEach((f) => guardiansOf(f).forEach((g) => window.PlayShell.addNotification({ title: 'Parent app invite sent', text: `${g.name} (${f.name}) was invited to the parent app.`, forRole: 'Director', module: null, mention: false, recordRoute: 'family.html?id=' + f.id })));
        closeModal('inviteModalBackdrop');
        selectedIds.clear();
        render();
        window.PlayShell.toast('success', 'Invites sent', `Invites sent to ${families.length} ${families.length === 1 ? 'family' : 'families'}.`);
      });
    });
  }

  /* ========================================================================
     MERGE MODAL
     ======================================================================== */
  function openMergeModal(families) {
    if (families.length !== 2) return;
    pendingMergeFamilies = families;
    mergeSurvivorChoice = 'a';
    mergePrimaryContactId = primaryGuardianOf(families[0]) ? families[0].primaryGuardianId : (primaryGuardianOf(families[1]) ? families[1].primaryGuardianId : null);
    renderMergeComparison();
    openModal('mergeModalBackdrop');
  }
  function mergePanelHtml(f, key) {
    const guardians = guardiansOf(f), children = childrenOf(f);
    const contact = primaryContactOf(f);
    return `
      <div class="fam-merge-panel${mergeSurvivorChoice === key ? ' is-chosen' : ''}" data-merge-panel="${key}">
        <div class="fam-merge-panel__title">${escapeHtml(f.name)}</div>
        <div class="fam-merge-row"><span class="fam-merge-row__label">Guardians</span><span class="fam-merge-row__value">${guardians.map((g) => escapeHtml(g.name)).join(', ') || '—'}</span></div>
        <div class="fam-merge-row"><span class="fam-merge-row__label">Children</span><span class="fam-merge-row__value">${children.map((c) => escapeHtml(c.name)).join(', ') || '—'}</span></div>
        <div class="fam-merge-row"><span class="fam-merge-row__label">Primary contact</span><span class="fam-merge-row__value">${contact ? escapeHtml(contact) : '—'}</span></div>
        <div class="fam-merge-row"><span class="fam-merge-row__label">Parent app</span><span class="fam-merge-row__value">${escapeHtml(STATUS_LABEL[f.parentAppStatus])}</span></div>
        ${hasBilling ? `<div class="fam-merge-row"><span class="fam-merge-row__label">Balance</span><span class="fam-merge-row__value">$${balanceOf(f).toFixed(2)}</span></div>` : ''}
        <div class="fam-merge-pick"><label class="check-row"><input type="radio" class="checkbox" name="mergeSurvivor" value="${key}" ${mergeSurvivorChoice === key ? 'checked' : ''} /> Keep this family's name</label></div>
      </div>`;
  }
  function renderMergeComparison() {
    const [a, b] = pendingMergeFamilies;
    $('mergeComparison').innerHTML = mergePanelHtml(a, 'a') + mergePanelHtml(b, 'b');
    document.querySelectorAll('[name="mergeSurvivor"]').forEach((rb) => rb.addEventListener('change', () => { if (rb.checked) { mergeSurvivorChoice = rb.value; renderMergeComparison(); } }));
    renderMergeSummary();
  }
  function renderMergeSummary() {
    const [a, b] = pendingMergeFamilies;
    const allGuardians = [...guardiansOf(a), ...guardiansOf(b)].filter((g, i, arr) => arr.findIndex((x) => x.id === g.id) === i);
    const allChildren = [...childrenOf(a), ...childrenOf(b)].filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
    const survivor = mergeSurvivorChoice === 'a' ? a : b;
    const removed = mergeSurvivorChoice === 'a' ? b : a;
    if (!allGuardians.some((g) => g.id === mergePrimaryContactId)) mergePrimaryContactId = survivor.primaryGuardianId || allGuardians[0]?.id || null;
    $('mergeSummary').innerHTML = `
      <strong>Summary</strong>
      <ul>
        <li>Resulting family name: <b>${escapeHtml(survivor.name)}</b></li>
        <li>${allGuardians.length} unique ${allGuardians.length === 1 ? 'guardian' : 'guardians'} and ${allChildren.length} unique ${allChildren.length === 1 ? 'child' : 'children'} will be combined</li>
        <li>Primary contact: <select class="select" id="mergePrimaryContactSelect" style="margin-top:4px; max-width:220px;">${allGuardians.map((g) => `<option value="${g.id}" ${mergePrimaryContactId === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}</select></li>
        <li>"${escapeHtml(removed.name)}" will be removed and will no longer appear as a separate family</li>
      </ul>`;
    const sel = $('mergePrimaryContactSelect');
    if (sel) sel.addEventListener('change', () => { mergePrimaryContactId = sel.value; });
  }
  function wireMergeModal() {
    const backdrop = $('mergeModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('mergeModalBackdrop'); });
    $('mergeCancel').addEventListener('click', () => closeModal('mergeModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('mergeModalBackdrop'); });
    $('mergeConfirm').addEventListener('click', () => {
      submitWithLoading('mergeConfirm', () => {
        const [a, b] = pendingMergeFamilies;
        const survivor = mergeSurvivorChoice === 'a' ? a : b;
        const removed = mergeSurvivorChoice === 'a' ? b : a;
        const guardianIds = Array.from(new Set([...(a.guardianIds || []), ...(b.guardianIds || [])]));
        const childIds = Array.from(new Set([...(a.childIds || []), ...(b.childIds || [])]));
        window.PlayStore.updateRecord(survivor.id, { name: survivor.name, guardianIds, childIds, primaryGuardianId: mergePrimaryContactId || survivor.primaryGuardianId });
        window.PlayStore.removeRecord(removed.id);
        selectedIds.clear();
        pendingMergeFamilies = null;
        closeModal('mergeModalBackdrop');
        render();
        window.PlayShell.toast('success', 'Families merged', `${removed.name} was merged into ${survivor.name}.`);
      });
    });
  }
})();
