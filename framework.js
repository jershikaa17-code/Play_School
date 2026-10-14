/* ==========================================================================
   PLAY SCHOOL — Learning Framework Management
   Reuses: store.js ('Framework'/'FrameworkArea' — new types — plus the
   EXISTING 'FrameworkOutcome' records planner.js (S27) already reads via
   PlayStore.getByType('FrameworkOutcome') and tags onto Activity.outcomeIds;
   this page edits those SAME records (adding parentId/visible/ageBand/etc.
   fields onto them) rather than a second, disconnected model), shell.js
   (shell/toasts/notifications), record.css (state-panel-mini/drawer rows).

   Honest limitations:
   - No real "S25 Observations" feature exists in this project (grepped the
     whole repo — it's only ever mentioned as unbuilt upsell copy in
     modules.js / record.js's own Curriculum tab). This page integrates with
     the one real consumer that exists: planner.js's outcome picker (S27),
     which now respects `visible`/renamed labels (see the small patch in
     planner.js's outcome-picker render).
   - "Import from Library" has no real P15 template service to call — the
     three templates below are a small built-in starter set, clearly
     labelled as such in the modal, not a fabricated backend integration.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function slugify(str) { return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
  function formatDateTime(iso) { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d.getTime())) return '—'; return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  const ICON = {
    area: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    subarea: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/></svg>',
    outcome: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
  };

  /* ---------- built-in "library" templates (honest stand-in for P15) ---------- */
  const LIBRARY_TEMPLATES = [
    {
      id: 'tpl-montessori', name: 'Montessori Foundations (Starter)', version: '1.0', montessori: true,
      description: 'The five classic Montessori areas with a starter outcome in each.',
      areas: [
        { name: 'Practical Life', materials: ['Pouring jugs', 'Dressing frames'], outcomes: [{ code: 'PL.1', label: 'Develops independence in everyday self-care routines', ageBand: '18mo–3y' }] },
        { name: 'Sensorial', materials: ['Pink Tower', 'Colour Tablets'], outcomes: [{ code: 'SEN.1', label: 'Refines visual discrimination of size, shape and dimension', ageBand: '2.5–6y' }] },
        { name: 'Language & Literacy', materials: ['Sandpaper Letters'], outcomes: [{ code: 'LANG.1', label: 'Builds phonemic awareness through sound and language games', ageBand: '3–6y' }] },
        { name: 'Mathematics', materials: ['Number Rods'], outcomes: [{ code: 'MATH.1', label: 'Understands one-to-one correspondence with concrete materials', ageBand: '4–6y' }] },
      ],
    },
    {
      id: 'tpl-eyfs', name: 'Early Years Foundations (Starter)', version: '1.0', montessori: false,
      description: 'A simplified early-years inspired structure across core development areas.',
      areas: [
        { name: 'Communication & Language', outcomes: [{ code: 'CL.1', label: 'Listens attentively in a range of situations', ageBand: '3–5y' }, { code: 'CL.2', label: 'Expresses ideas using full sentences', ageBand: '3–5y' }] },
        { name: 'Personal, Social & Emotional', outcomes: [{ code: 'PSE.1', label: 'Shows confidence to try new activities', ageBand: '2–5y' }] },
        { name: 'Physical Development', outcomes: [{ code: 'PD.1', label: 'Shows good control and co-ordination in large movements', ageBand: '2–5y' }] },
      ],
    },
    {
      id: 'tpl-generic', name: 'Generic Early Years (Starter)', version: '1.0', montessori: false,
      description: 'A minimal, framework-agnostic structure for schools building their own taxonomy.',
      areas: [
        { name: 'Social & Emotional', outcomes: [{ code: 'SE.1', label: 'Builds positive relationships with peers and adults', ageBand: '2–6y' }] },
        { name: 'Cognitive Development', outcomes: [{ code: 'CD.1', label: 'Demonstrates curiosity and problem-solving', ageBand: '2–6y' }] },
      ],
    },
  ];

  let expandedIds = new Set();
  let selectedId = null;
  let renamingId = null;
  let treeSearch = '';
  let dragNodeId = null;
  let pendingDelete = null; // { id, type }
  let importSelectedTemplateId = null;
  let importMode = 'new'; // 'new' | 'merge'

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    window.PlayShell.login();
    window.PlayShell.mount('framework', 'Learning Framework');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    wireActiveCardActions();
    wireTreeSearch();
    wireChangeModal();
    wireImportModal();
    wireDeleteModal();
    wireHistoryDrawer();
    wireModals();
    window.addEventListener('resize', debounce(render, 150));

    // Expand top-level areas by default.
    activeAreas().filter((a) => !a.parentId).forEach((a) => expandedIds.add(a.id));

    render();
  }

  /* ---------- data access ---------- */
  function allFrameworks() { return window.PlayStore.getByType('Framework'); }
  function activeFramework() { return allFrameworks().find((f) => f.isActive) || allFrameworks()[0]; }
  function allAreas() { return window.PlayStore.getByType('FrameworkArea'); }
  function allOutcomes() { return window.PlayStore.getByType('FrameworkOutcome'); }
  function activeAreas() { const fw = activeFramework(); return fw ? allAreas().filter((a) => a.frameworkId === fw.id) : []; }
  function activeOutcomes() { const fw = activeFramework(); return fw ? allOutcomes().filter((o) => o.frameworkId === fw.id) : []; }
  function childrenOf(nodeId) {
    const areas = activeAreas().filter((a) => a.parentId === nodeId);
    const outcomes = activeOutcomes().filter((o) => o.parentId === nodeId);
    return areas.concat(outcomes).sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  function nodeType(node) {
    if (node.type === 'FrameworkArea') return node.parentId ? 'subarea' : 'area';
    return 'outcome';
  }
  function getNode(id) { return window.PlayStore.getById(id); }
  function nodeLabel(node) { return nodeType(node) === 'outcome' ? node.label : node.name; }
  function logChange(action, itemId, itemName, before, after) {
    const fw = activeFramework();
    window.PlayStore.addRecord({ id: uid('FCL'), type: 'FrameworkChangeLog', frameworkId: fw ? fw.id : null, action, itemId, itemName, actor: window.PlayShell.getDemoRole(), at: new Date().toISOString(), before: before || null, after: after || null });
  }
  function touchFramework() { const fw = activeFramework(); if (fw) window.PlayStore.updateRecord(fw.id, { updatedAt: new Date().toISOString() }); }

  function render() {
    renderActiveCard();
    const mobile = window.innerWidth < 768;
    $('fwMobileBanner').hidden = !mobile;
    if (!mobile) renderTree();
    else renderMobileTreeOnly();
  }

  /* ========================================================================
     ACTIVE FRAMEWORK HEADER CARD
     ======================================================================== */
  function renderActiveCard() {
    const fw = activeFramework();
    const host = $('fwActiveCard');
    if (!fw) {
      host.innerHTML = `<div class="state-panel"><div class="state-panel__title">No active framework</div><p class="state-panel__text">Import a framework from the library to get started.</p><div class="state-panel__action"><button class="btn btn--accent" type="button" id="fwEmptyImportBtn">Import from Library</button></div></div>`;
      const b = $('fwEmptyImportBtn'); if (b) b.addEventListener('click', openImportModal);
      return;
    }
    const areas = activeAreas();
    const outcomes = activeOutcomes();
    host.innerHTML = `
      <div class="fw-active-card__name-wrap">
        <div class="fw-active-card__name">${escapeHtml(fw.name)}</div>
        <div class="fw-active-card__sub">v${escapeHtml(fw.version)} · Updated ${formatDateTime(fw.updatedAt)} · <span style="color:var(--color-success);">● Active</span></div>
      </div>
      <div class="fw-active-card__stats">
        <div><div class="fw-active-card__stat-value">${areas.length}</div><div class="fw-active-card__stat-label">Areas</div></div>
        <div><div class="fw-active-card__stat-value">${outcomes.length}</div><div class="fw-active-card__stat-label">Outcomes</div></div>
      </div>
      <div class="fw-active-card__actions">
        <button class="btn btn--secondary btn--sm" type="button" id="fwHistoryBtn">${ICON.history}<span>&nbsp;Change History</span></button>
        <button class="btn btn--secondary btn--sm" type="button" id="fwChangeBtn">Change Framework</button>
        <button class="btn btn--accent btn--sm" type="button" id="fwImportBtn">Import from Library</button>
      </div>`;
    $('fwHistoryBtn').addEventListener('click', openHistoryDrawer);
    $('fwChangeBtn').addEventListener('click', openChangeModal);
    $('fwImportBtn').addEventListener('click', openImportModal);
  }
  function wireActiveCardActions() { /* buttons wired fresh in renderActiveCard each time */ }

  /* ========================================================================
     TREE
     ======================================================================== */
  function wireTreeSearch() {
    $('fwTreeSearch').addEventListener('input', () => { treeSearch = $('fwTreeSearch').value.trim().toLowerCase(); render(); });
  }
  function matchesSearch(node) {
    if (!treeSearch) return true;
    return nodeLabel(node).toLowerCase().includes(treeSearch) || (node.code || '').toLowerCase().includes(treeSearch);
  }
  function subtreeMatches(node) {
    if (matchesSearch(node)) return true;
    return childrenOf(node.id).some((c) => subtreeMatches(c));
  }
  function renderTree() {
    const fw = activeFramework();
    const host = $('fwTreeHost');
    if (!fw) { host.innerHTML = `<div class="profile-empty">${ICON.inbox}<div>No framework to display.</div></div>`; return; }
    const topAreas = activeAreas().filter((a) => !a.parentId).sort((a, b) => (a.order || 0) - (b.order || 0)).filter((a) => subtreeMatches(a));
    host.innerHTML = `
      <div class="fw-tree-toolbar" style="display:flex; justify-content:flex-end; margin-bottom:var(--space-2);">
        <button class="btn btn--secondary btn--sm" type="button" id="fwAddAreaBtn">${ICON.plus}<span>&nbsp;Add area</span></button>
      </div>
      <div class="fw-tree" id="fwTreeRoot">${topAreas.map((a) => nodeHtml(a, 0)).join('') || `<div class="profile-empty">${ICON.inbox}<div>No matching items.</div></div>`}</div>`;
    $('fwAddAreaBtn').addEventListener('click', () => addArea(null));
    wireTreeInteractions();
    if (selectedId) renderDetails(getNode(selectedId)); else showDetailsEmpty();
  }
  function renderMobileTreeOnly() {
    const host = $('fwTreeHost');
    const topAreas = activeAreas().filter((a) => !a.parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
    host.innerHTML = `<div class="fw-tree" id="fwTreeRoot">${topAreas.map((a) => nodeHtmlReadOnly(a, 0)).join('')}</div>`;
    host.querySelectorAll('[data-node-chevron]').forEach((el) => el.addEventListener('click', () => { toggleExpand(el.dataset.nodeChevron); renderMobileTreeOnly(); }));
    host.querySelectorAll('[data-node-row]').forEach((el) => el.addEventListener('click', (e) => { if (e.target.closest('[data-node-chevron]')) return; openMobileSheet(el.dataset.nodeRow); }));
  }
  function nodeHtmlReadOnly(node, depth) {
    const type = nodeType(node);
    const children = childrenOf(node.id);
    const expanded = expandedIds.has(node.id);
    return `
      <div class="fw-node">
        <div class="fw-node__row${node.visible === false ? ' is-hidden-item' : ''}" data-node-row="${node.id}">
          <span class="fw-node__chevron${children.length ? (expanded ? ' is-expanded' : '') : ' is-empty'}" data-node-chevron="${node.id}">${ICON.chevron}</span>
          <span class="fw-node__icon">${ICON[type]}</span>
          <span class="fw-node__label">${escapeHtml(nodeLabel(node))}</span>
          ${type === 'outcome' && node.ageBand ? `<span class="fw-node__ageband">${escapeHtml(node.ageBand)}</span>` : ''}
          ${children.length ? `<span class="fw-node__count">${children.length}</span>` : ''}
        </div>
        <div class="fw-node__children${expanded ? '' : ' is-collapsed'}">${children.map((c) => nodeHtmlReadOnly(c, depth + 1)).join('')}</div>
      </div>`;
  }
  function nodeHtml(node, depth) {
    const type = nodeType(node);
    const children = childrenOf(node.id);
    const expanded = expandedIds.has(node.id);
    const isRenaming = renamingId === node.id;
    return `
      <div class="fw-node" data-node="${node.id}">
        <div class="fw-node__row fw-node--${type}${selectedId === node.id ? ' is-selected' : ''}${node.visible === false ? ' is-hidden-item' : ''}" data-node-row="${node.id}" draggable="${isRenaming ? 'false' : 'true'}" tabindex="0" role="treeitem" aria-selected="${selectedId === node.id}">
          <span class="fw-node__chevron${children.length ? (expanded ? ' is-expanded' : '') : ' is-empty'}" data-node-chevron="${node.id}">${ICON.chevron}</span>
          <span class="fw-node__icon">${ICON[type]}</span>
          ${isRenaming
            ? `<input class="fw-node__rename-input" data-rename-input="${node.id}" value="${escapeHtml(nodeLabel(node))}" />`
            : `<span class="fw-node__label">${escapeHtml(nodeLabel(node))}</span>`}
          ${type === 'outcome' && node.ageBand ? `<span class="fw-node__ageband">${escapeHtml(node.ageBand)}</span>` : ''}
          ${children.length ? `<span class="fw-node__count">${children.length}</span>` : ''}
          <span class="fw-node__actions">
            ${type !== 'outcome' ? `<button class="fw-node__action-btn" type="button" data-add-child="${node.id}" aria-label="Add child" title="Add child">${ICON.plus}</button>` : ''}
            <button class="fw-node__action-btn" type="button" data-rename="${node.id}" aria-label="Rename" title="Rename">${ICON.pencil}</button>
            <button class="fw-node__action-btn is-hidden-toggle${node.visible === false ? ' is-active' : ''}" type="button" data-toggle-visible="${node.id}" aria-label="${node.visible === false ? 'Show' : 'Hide'}" title="${node.visible === false ? 'Show' : 'Hide'}">${node.visible === false ? ICON.eyeOff : ICON.eye}</button>
            <button class="fw-node__action-btn" type="button" data-delete="${node.id}" aria-label="Delete" title="Delete">${ICON.trash}</button>
          </span>
        </div>
        <div class="fw-node__children${expanded ? '' : ' is-collapsed'}" data-children-of="${node.id}">${children.map((c) => nodeHtml(c, depth + 1)).join('')}</div>
      </div>`;
  }
  function toggleExpand(id) { if (expandedIds.has(id)) expandedIds.delete(id); else expandedIds.add(id); }

  function wireTreeInteractions() {
    const root = $('fwTreeRoot');
    if (!root) return;
    root.querySelectorAll('[data-node-chevron]').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); toggleExpand(el.dataset.nodeChevron); renderTree(); }));
    root.querySelectorAll('[data-node-row]').forEach((el) => {
      el.addEventListener('click', (e) => { if (e.target.closest('[data-node-chevron],.fw-node__actions,input')) return; selectNode(el.dataset.nodeRow); });
      el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('input')) { e.preventDefault(); selectNode(el.dataset.nodeRow); } });
    });
    root.querySelectorAll('[data-add-child]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); handleAddChild(btn.dataset.addChild); }));
    root.querySelectorAll('[data-rename]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); startRename(btn.dataset.rename); }));
    root.querySelectorAll('[data-toggle-visible]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); toggleVisible(btn.dataset.toggleVisible); }));
    root.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); requestDelete(btn.dataset.delete); }));
    root.querySelectorAll('[data-rename-input]').forEach((input) => {
      input.addEventListener('click', (e) => e.stopPropagation());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commitRename(input.dataset.renameInput, input.value); }
        else if (e.key === 'Escape') { e.preventDefault(); renamingId = null; renderTree(); }
      });
      input.addEventListener('blur', () => commitRename(input.dataset.renameInput, input.value));
      window.setTimeout(() => { input.focus(); input.select(); }, 10);
    });
    // drag and drop (reorder + reparent)
    root.querySelectorAll('[data-node-row][draggable="true"]').forEach((row) => {
      row.addEventListener('dragstart', (e) => { dragNodeId = row.dataset.nodeRow; row.classList.add('is-dragging'); e.dataTransfer.setData('text/plain', row.dataset.nodeRow); });
      row.addEventListener('dragend', () => row.classList.remove('is-dragging'));
      row.addEventListener('dragover', (e) => {
        const targetId = row.dataset.nodeRow;
        if (!isValidDrop(dragNodeId, targetId)) return;
        e.preventDefault();
        row.classList.add('is-drag-over');
      });
      row.addEventListener('dragleave', () => row.classList.remove('is-drag-over'));
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('is-drag-over');
        const draggedId = e.dataTransfer.getData('text/plain') || dragNodeId;
        const targetId = row.dataset.nodeRow;
        if (isValidDrop(draggedId, targetId)) reparentNode(draggedId, targetId);
        else if (draggedId !== targetId) window.PlayShell.toast('error', "Can't move item here", 'That would create an invalid or circular hierarchy.');
      });
    });
  }
  function isDescendant(ancestorId, nodeId) {
    const kids = childrenOf(ancestorId);
    if (kids.some((k) => k.id === nodeId)) return true;
    return kids.some((k) => isDescendant(k.id, nodeId));
  }
  function isValidDrop(draggedId, targetId) {
    if (!draggedId || draggedId === targetId) return false;
    const dragged = getNode(draggedId);
    const target = getNode(targetId);
    if (!dragged || !target) return false;
    const draggedType = nodeType(dragged);
    const targetType = nodeType(target);
    if (targetType === 'outcome') return false; // outcomes can't have children
    if (draggedType === 'area' && targetType !== 'area') return false; // areas only reorder among themselves (become siblings via root drop — simplified: areas can be dropped onto other top areas to reorder, not re-nested)
    if (draggedType === 'subarea' && targetType === 'subarea') return false; // sub-areas can't nest inside sub-areas
    if (isDescendant(draggedId, targetId)) return false; // circular
    return true;
  }
  function reparentNode(draggedId, targetId) {
    const dragged = getNode(draggedId);
    const target = getNode(targetId);
    const draggedType = nodeType(dragged);
    const before = { parentId: dragged.parentId };
    let newParentId;
    if (draggedType === 'area') {
      // reorder among top-level areas: place after target
      const tops = activeAreas().filter((a) => !a.parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
      const without = tops.filter((a) => a.id !== draggedId);
      const idx = without.findIndex((a) => a.id === targetId);
      without.splice(idx + 1, 0, dragged);
      without.forEach((a, i) => window.PlayStore.updateRecord(a.id, { order: i }));
      logChange('Reordered', draggedId, nodeLabel(dragged), before, { order: 'updated' });
      renderTree();
      return;
    }
    newParentId = targetId;
    const siblings = childrenOf(newParentId);
    window.PlayStore.updateRecord(draggedId, { parentId: newParentId, order: siblings.length });
    logChange('Re-parented', draggedId, nodeLabel(dragged), before, { parentId: newParentId });
    touchFramework();
    window.PlayShell.toast('success', 'Moved', `${nodeLabel(dragged)} moved under ${nodeLabel(target)}.`);
    renderTree();
  }

  function selectNode(id) {
    selectedId = id;
    renamingId = null;
    renderTree();
  }
  function startRename(id) { renamingId = id; renderTree(); }
  function commitRename(id, value) {
    if (renamingId !== id) return;
    renamingId = null;
    const node = getNode(id);
    const trimmed = value.trim();
    if (!trimmed) { window.PlayShell.toast('error', 'Name required', ''); renderTree(); return; }
    const type = nodeType(node);
    const field = type === 'outcome' ? 'label' : 'name';
    if (trimmed === node[field]) { renderTree(); return; }
    const before = { [field]: node[field] };
    window.PlayStore.updateRecord(id, { [field]: trimmed, updatedAt: new Date().toISOString() });
    logChange('Renamed', id, trimmed, before, { [field]: trimmed });
    touchFramework();
    window.PlayShell.toast('success', 'Renamed', trimmed);
    render();
  }
  function toggleVisible(id) {
    const node = getNode(id);
    const next = node.visible === false;
    window.PlayStore.updateRecord(id, { visible: next, updatedAt: new Date().toISOString() });
    logChange(next ? 'Shown' : 'Hidden', id, nodeLabel(node), { visible: node.visible }, { visible: next });
    touchFramework();
    render();
  }
  function handleAddChild(parentId) {
    const parent = getNode(parentId);
    const type = nodeType(parent);
    if (type === 'area') {
      // small inline choice: default to adding a sub-area; outcomes can be added via the sub-area once created,
      // or directly if the admin wants a flat area (supported — outcome parentId can point straight at an area).
      const menu = window.confirm(`Add a Sub-area under "${nodeLabel(parent)}"?\n\nOK = Add sub-area\nCancel = Add outcome directly here`);
      if (menu) addSubarea(parentId); else addOutcome(parentId);
    } else if (type === 'subarea') {
      addOutcome(parentId);
    }
  }
  function addArea(parentId) {
    const fw = activeFramework();
    if (!fw) return;
    const siblings = activeAreas().filter((a) => !a.parentId);
    const area = { id: uid('FAREA'), type: 'FrameworkArea', frameworkId: fw.id, parentId: null, name: 'New area', order: siblings.length, visible: true, montessoriMaterials: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    window.PlayStore.addRecord(area);
    logChange('Created', area.id, area.name, null, { type: 'Area' });
    touchFramework();
    expandedIds.add(parentId || area.id);
    selectedId = area.id;
    renamingId = area.id;
    render();
  }
  function addSubarea(parentId) {
    const fw = activeFramework();
    const siblings = childrenOf(parentId);
    const sub = { id: uid('FAREA'), type: 'FrameworkArea', frameworkId: fw.id, parentId, name: 'New sub-area', order: siblings.length, visible: true, montessoriMaterials: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    window.PlayStore.addRecord(sub);
    logChange('Created', sub.id, sub.name, null, { type: 'Sub-area' });
    touchFramework();
    expandedIds.add(parentId);
    selectedId = sub.id;
    renamingId = sub.id;
    render();
  }
  function addOutcome(parentId) {
    const fw = activeFramework();
    const siblings = childrenOf(parentId);
    const parent = getNode(parentId);
    const legacyArea = nodeType(parent) === 'area' ? parent.areaKey : (getNode(parent.parentId) || {}).areaKey;
    const outcome = { id: uid('OUT'), type: 'FrameworkOutcome', frameworkId: fw.id, parentId, code: 'NEW.' + (siblings.length + 1), label: 'New outcome', area: legacyArea || slugify(nodeLabel(parent)), description: '', ageBand: '', visible: true, order: siblings.length, updatedAt: new Date().toISOString() };
    window.PlayStore.addRecord(outcome);
    logChange('Created', outcome.id, outcome.label, null, { type: 'Outcome' });
    touchFramework();
    expandedIds.add(parentId);
    selectedId = outcome.id;
    renamingId = outcome.id;
    render();
  }

  /* ---------- delete safety ---------- */
  function outcomeIsReferenced(outcomeId) {
    return window.PlayStore.getByType('Activity').some((a) => (a.outcomeIds || []).includes(outcomeId));
  }
  function wireDeleteModal() { /* actions wired fresh each open */ }
  function requestDelete(id) {
    const node = getNode(id);
    const type = nodeType(node);
    const children = childrenOf(id);
    pendingDelete = { id, type };
    $('fwDeleteTitle').textContent = `Delete "${nodeLabel(node)}"?`;
    let text = '';
    let actions = '';
    if (type === 'outcome' && outcomeIsReferenced(id)) {
      text = 'This outcome is referenced by one or more activities in the Weekly & Monthly Planner. It can\'t be permanently deleted while those references exist, to keep historical records intact.';
      actions = `<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--accent" type="button" id="fwHideInsteadBtn">Hide instead</button>`;
    } else if (children.length) {
      text = `This item has ${children.length} descendant${children.length === 1 ? '' : 's'}. Delete or move them first, or hide this item instead to keep everything intact.`;
      actions = `<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--accent" type="button" id="fwHideInsteadBtn">Hide instead</button>`;
    } else {
      text = 'This cannot be undone. The item will be permanently removed.';
      actions = `<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--destructive" type="button" id="fwPermDeleteBtn">Delete permanently</button>`;
    }
    $('fwDeleteText').textContent = text;
    $('fwDeleteActions').innerHTML = actions;
    const hideBtn = $('fwHideInsteadBtn'); if (hideBtn) hideBtn.addEventListener('click', () => { closeModal('fwDeleteBackdrop'); toggleVisible(id); });
    const permBtn = $('fwPermDeleteBtn'); if (permBtn) permBtn.addEventListener('click', confirmPermanentDelete);
    openModal('fwDeleteBackdrop');
  }
  function confirmPermanentDelete() {
    if (!pendingDelete) return;
    const node = getNode(pendingDelete.id);
    const name = nodeLabel(node);
    try {
      window.PlayStore.removeRecord(pendingDelete.id);
      logChange('Deleted', pendingDelete.id, name, null, null);
      touchFramework();
      if (selectedId === pendingDelete.id) selectedId = null;
      window.PlayShell.toast('success', 'Deleted', name);
    } catch (e) {
      window.PlayShell.toast('error', 'Could not delete', 'Please try again.');
    }
    pendingDelete = null;
    closeModal('fwDeleteBackdrop');
    render();
  }

  /* ========================================================================
     DETAILS PANEL (right)
     ======================================================================== */
  function showDetailsEmpty() { $('fwDetailsEmpty').hidden = false; $('fwDetailsBody').hidden = true; }
  function renderDetails(node) {
    if (!node) { showDetailsEmpty(); return; }
    $('fwDetailsEmpty').hidden = true;
    $('fwDetailsBody').hidden = false;
    $('fwDetailsBody').innerHTML = detailsBodyHtml(node);
    wireDetailsForm(node);
  }
  function detailsBodyHtml(node) {
    const type = nodeType(node);
    const parent = node.parentId ? getNode(node.parentId) : null;
    const fw = activeFramework();
    return `
      <div class="fw-detail-section">
        <div class="field"><label class="field__label" for="fwdName">Name</label><input class="input" id="fwdName" value="${escapeHtml(nodeLabel(node))}" /></div>
        ${type === 'outcome' ? `<div class="field"><label class="field__label" for="fwdCode">Code</label><input class="input" id="fwdCode" value="${escapeHtml(node.code || '')}" /></div>` : ''}
        <div class="field"><label class="field__label" for="fwdDesc">Description</label><textarea class="textarea" id="fwdDesc">${escapeHtml(node.description || '')}</textarea></div>
        ${type === 'outcome' ? `<div class="field"><label class="field__label" for="fwdAge">Age band</label><input class="input" id="fwdAge" placeholder="e.g. 3–6y" value="${escapeHtml(node.ageBand || '')}" /></div>` : ''}
        <div class="check-row" style="margin-top: var(--space-2);"><input type="checkbox" class="checkbox" id="fwdVisible" ${node.visible !== false ? 'checked' : ''} /><label for="fwdVisible">Visible for new tagging</label></div>
      </div>
      ${(type === 'area' || type === 'subarea') && fw && fw.montessori ? `
      <div class="fw-detail-section">
        <div class="field__label" style="margin-bottom:6px;">Linked Montessori materials</div>
        <div class="fw-materials-list" id="fwMaterialsList">${(node.montessoriMaterials || []).map((m, i) => `<span class="fw-material-chip">${escapeHtml(m)}<button type="button" data-remove-material="${i}" aria-label="Remove">&times;</button></span>`).join('')}</div>
        <div class="input-grid" style="margin-top:var(--space-3); grid-template-columns:1fr auto;">
          <input class="input" id="fwdNewMaterial" placeholder="Add a material…" />
          <button class="btn btn--secondary btn--sm" type="button" id="fwAddMaterialBtn">Add</button>
        </div>
      </div>` : ''}
      <div class="fw-detail-section">
        <div class="profile-row"><span class="profile-row__label">Type</span><span class="profile-row__value">${type === 'area' ? 'Area' : type === 'subarea' ? 'Sub-area' : 'Outcome'}</span></div>
        <div class="profile-row"><span class="profile-row__label">Parent</span><span class="profile-row__value">${parent ? escapeHtml(nodeLabel(parent)) : 'Top level'}</span></div>
        <div class="profile-row"><span class="profile-row__label">Last updated</span><span class="profile-row__value">${formatDateTime(node.updatedAt)}</span></div>
      </div>
      <div class="fw-save-status" id="fwSaveStatus"></div>`;
  }
  function wireDetailsForm(node) {
    const type = nodeType(node);
    const field = type === 'outcome' ? 'label' : 'name';
    const save = debounce(() => {
      const patch = { updatedAt: new Date().toISOString() };
      patch[field] = $('fwdName').value.trim() || nodeLabel(node);
      if (type === 'outcome') patch.code = $('fwdCode').value.trim();
      patch.description = $('fwdDesc').value;
      if (type === 'outcome') patch.ageBand = $('fwdAge').value.trim();
      window.PlayStore.updateRecord(node.id, patch);
      touchFramework();
      const status = $('fwSaveStatus'); if (status) { status.textContent = 'Saved'; status.className = 'fw-save-status is-saved'; }
      refreshTreeLabelsOnly();
    }, 450);
    ['fwdName', 'fwdCode', 'fwdDesc', 'fwdAge'].forEach((id) => {
      const el = $(id); if (!el) return;
      el.addEventListener('input', () => { const status = $('fwSaveStatus'); if (status) { status.textContent = 'Saving…'; status.className = 'fw-save-status'; } save(); });
    });
    $('fwdVisible').addEventListener('change', () => toggleVisible(node.id));
    const addMatBtn = $('fwAddMaterialBtn');
    if (addMatBtn) addMatBtn.addEventListener('click', () => {
      const val = $('fwdNewMaterial').value.trim();
      if (!val) return;
      const materials = (node.montessoriMaterials || []).concat([val]);
      window.PlayStore.updateRecord(node.id, { montessoriMaterials: materials, updatedAt: new Date().toISOString() });
      renderDetails(getNode(node.id));
    });
    document.querySelectorAll('[data-remove-material]').forEach((btn) => btn.addEventListener('click', () => {
      const materials = (node.montessoriMaterials || []).filter((_, i) => i !== Number(btn.dataset.removeMaterial));
      window.PlayStore.updateRecord(node.id, { montessoriMaterials: materials, updatedAt: new Date().toISOString() });
      renderDetails(getNode(node.id));
    }));
  }
  function refreshTreeLabelsOnly() {
    document.querySelectorAll('[data-node-row]').forEach((row) => {
      const node = getNode(row.dataset.nodeRow);
      if (!node) return;
      const label = row.querySelector('.fw-node__label');
      if (label) label.textContent = nodeLabel(node);
    });
    renderActiveCard();
  }

  /* ---------- mobile detail sheet ---------- */
  function openMobileSheet(id) {
    const node = getNode(id);
    if (!node) return;
    const type = nodeType(node);
    const parent = node.parentId ? getNode(node.parentId) : null;
    $('fwMobileSheetBody').innerHTML = `
      <div class="sheet__title">${escapeHtml(nodeLabel(node))}</div>
      ${type === 'outcome' ? `<div class="profile-row"><span class="profile-row__label">Code</span><span class="profile-row__value">${escapeHtml(node.code || '—')}</span></div>` : ''}
      ${node.description ? `<div class="profile-row"><span class="profile-row__label">Description</span><span class="profile-row__value">${escapeHtml(node.description)}</span></div>` : ''}
      ${type === 'outcome' && node.ageBand ? `<div class="profile-row"><span class="profile-row__label">Age band</span><span class="profile-row__value">${escapeHtml(node.ageBand)}</span></div>` : ''}
      <div class="profile-row"><span class="profile-row__label">Parent</span><span class="profile-row__value">${parent ? escapeHtml(nodeLabel(parent)) : 'Top level'}</span></div>
      <div class="profile-row"><span class="profile-row__label">Visibility</span><span class="profile-row__value">${node.visible === false ? 'Hidden' : 'Visible'}</span></div>`;
    $('fwMobileSheetBackdrop').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  /* ========================================================================
     CHANGE FRAMEWORK MODAL
     ======================================================================== */
  function wireChangeModal() { /* list rendered on open */ }
  function openChangeModal() {
    const frameworks = allFrameworks();
    $('fwChangeList').innerHTML = frameworks.map((f) => `
      <div class="fw-change-option${f.isActive ? ' is-active' : ''}" data-select-framework="${f.id}">
        <div><strong>${escapeHtml(f.name)}</strong><div style="font-size:var(--fs-caption); color:var(--color-text-muted);">v${escapeHtml(f.version)} · ${activeAreas.length ? '' : ''}${allAreas().filter((a) => a.frameworkId === f.id).length} areas · ${allOutcomes().filter((o) => o.frameworkId === f.id).length} outcomes</div></div>
        ${f.isActive ? '<span class="badge badge--success">Active</span>' : '<button class="btn btn--secondary btn--sm" type="button">Make active</button>'}
      </div>`).join('');
    $('fwChangeList').querySelectorAll('[data-select-framework]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.selectFramework;
        if (getNode(id).isActive) return;
        allFrameworks().forEach((f) => window.PlayStore.updateRecord(f.id, { isActive: f.id === id }));
        logChange('Framework changed', id, getNode(id).name, null, null);
        closeModal('fwChangeBackdrop');
        selectedId = null;
        window.PlayShell.toast('success', 'Framework activated', getNode(id).name);
        render();
      });
    });
    openModal('fwChangeBackdrop');
  }

  /* ========================================================================
     IMPORT FROM LIBRARY
     ======================================================================== */
  function wireImportModal() { /* body rendered on open */ }
  function openImportModal() {
    importSelectedTemplateId = null;
    importMode = 'new';
    renderImportBody();
    openModal('fwImportBackdrop');
  }
  function renderImportBody() {
    const tpl = LIBRARY_TEMPLATES.find((t) => t.id === importSelectedTemplateId);
    $('fwImportBody').innerHTML = `
      <div class="fw-template-grid">${LIBRARY_TEMPLATES.map((t) => `
        <div class="fw-template-card${importSelectedTemplateId === t.id ? ' is-selected' : ''}" data-template="${t.id}">
          <div class="fw-template-card__name">${escapeHtml(t.name)}</div>
          <div class="fw-template-card__meta">v${escapeHtml(t.version)} · ${t.areas.length} areas · ${t.areas.reduce((s, a) => s + a.outcomes.length, 0)} outcomes</div>
          <div class="fw-template-card__desc">${escapeHtml(t.description)}</div>
        </div>`).join('')}</div>
      ${tpl ? `
        <div class="fw-import-preview">
          ${tpl.areas.map((a) => `<div style="margin-bottom:var(--space-3);"><strong>${escapeHtml(a.name)}</strong>${(a.materials || []).length ? ` <span style="color:var(--color-text-muted); font-size:var(--fs-caption);">· ${a.materials.map(escapeHtml).join(', ')}</span>` : ''}<ul style="margin:4px 0 0 18px; padding:0; font-size:var(--fs-caption); color:var(--color-text-secondary);">${a.outcomes.map((o) => `<li>${escapeHtml(o.code)} — ${escapeHtml(o.label)}</li>`).join('')}</ul></div>`).join('')}
        </div>
        <div class="fw-import-actions">
          <button class="btn btn--secondary" type="button" id="fwImportMergeBtn">Merge into existing</button>
          <button class="btn btn--accent" type="button" id="fwImportNewBtn">Import as new</button>
        </div>
        <div id="fwMergeSummaryHost"></div>` : ''}`;
    $('fwImportBody').querySelectorAll('[data-template]').forEach((card) => card.addEventListener('click', () => { importSelectedTemplateId = card.dataset.template; renderImportBody(); }));
    const mergeBtn = $('fwImportMergeBtn'); if (mergeBtn) mergeBtn.addEventListener('click', () => previewMerge(tpl));
    const newBtn = $('fwImportNewBtn'); if (newBtn) newBtn.addEventListener('click', () => importAsNew(tpl));
  }
  function importAsNew(tpl) {
    const nowIso = new Date().toISOString();
    const fw = { id: uid('FRM'), type: 'Framework', name: tpl.name.replace(' (Starter)', ''), version: tpl.version, isActive: false, montessori: tpl.montessori, source: 'library:' + tpl.id, createdAt: nowIso, updatedAt: nowIso };
    window.PlayStore.addRecord(fw);
    tpl.areas.forEach((a, ai) => {
      const area = { id: uid('FAREA'), type: 'FrameworkArea', frameworkId: fw.id, parentId: null, name: a.name, order: ai, visible: true, montessoriMaterials: a.materials || [], createdAt: nowIso, updatedAt: nowIso };
      window.PlayStore.addRecord(area);
      a.outcomes.forEach((o, oi) => {
        window.PlayStore.addRecord({ id: uid('OUT'), type: 'FrameworkOutcome', frameworkId: fw.id, parentId: area.id, code: o.code, label: o.label, area: slugify(a.name), description: '', ageBand: o.ageBand || '', visible: true, order: oi, updatedAt: nowIso });
      });
    });
    logChange('Framework imported', fw.id, fw.name, null, { source: tpl.id });
    closeModal('fwImportBackdrop');
    window.PlayShell.toast('success', 'Framework imported', `${fw.name} was added. Use "Change Framework" to activate it.`);
    render();
  }
  function previewMerge(tpl) {
    const fw = activeFramework();
    if (!fw) { window.PlayShell.toast('error', 'No active framework', 'Import as new instead.'); return; }
    const existingCodes = new Set(activeOutcomes().map((o) => o.code.toLowerCase()));
    const existingAreaNames = new Set(activeAreas().map((a) => a.name.toLowerCase()));
    let newAreas = 0, matchedAreas = 0, newOutcomes = 0, matchedOutcomes = 0;
    tpl.areas.forEach((a) => {
      if (existingAreaNames.has(a.name.toLowerCase())) matchedAreas++; else newAreas++;
      a.outcomes.forEach((o) => { if (existingCodes.has(o.code.toLowerCase())) matchedOutcomes++; else newOutcomes++; });
    });
    $('fwMergeSummaryHost').innerHTML = `
      <div class="fw-merge-summary">
        <strong>Merge preview into "${escapeHtml(fw.name)}"</strong>
        <div style="margin-top:var(--space-2);">${newAreas} new area${newAreas === 1 ? '' : 's'}, ${matchedAreas} matched by name (skipped). ${newOutcomes} new outcome${newOutcomes === 1 ? '' : 's'}, ${matchedOutcomes} matched by code (skipped, no duplicates created).</div>
        <button class="btn btn--accent btn--sm" type="button" id="fwConfirmMergeBtn" style="margin-top:var(--space-3);">Apply merge</button>
      </div>`;
    $('fwConfirmMergeBtn').addEventListener('click', () => applyMerge(tpl));
  }
  function applyMerge(tpl) {
    const fw = activeFramework();
    const nowIso = new Date().toISOString();
    const existingCodes = new Set(activeOutcomes().map((o) => o.code.toLowerCase()));
    const existingAreasByName = new Map(activeAreas().filter((a) => !a.parentId).map((a) => [a.name.toLowerCase(), a]));
    let added = 0;
    tpl.areas.forEach((a) => {
      let area = existingAreasByName.get(a.name.toLowerCase());
      if (!area) {
        const tops = activeAreas().filter((x) => !x.parentId);
        area = { id: uid('FAREA'), type: 'FrameworkArea', frameworkId: fw.id, parentId: null, name: a.name, order: tops.length, visible: true, montessoriMaterials: a.materials || [], createdAt: nowIso, updatedAt: nowIso };
        window.PlayStore.addRecord(area);
        added++;
      }
      a.outcomes.forEach((o) => {
        if (existingCodes.has(o.code.toLowerCase())) return;
        const siblings = childrenOf(area.id);
        window.PlayStore.addRecord({ id: uid('OUT'), type: 'FrameworkOutcome', frameworkId: fw.id, parentId: area.id, code: o.code, label: o.label, area: slugify(a.name), description: '', ageBand: o.ageBand || '', visible: true, order: siblings.length, updatedAt: nowIso });
        added++;
      });
    });
    logChange('Framework merged', fw.id, fw.name, null, { source: tpl.id, added });
    touchFramework();
    closeModal('fwImportBackdrop');
    window.PlayShell.toast('success', 'Merge applied', `${added} new item${added === 1 ? '' : 's'} added to ${fw.name}.`);
    render();
  }

  /* ========================================================================
     CHANGE HISTORY DRAWER
     ======================================================================== */
  function wireHistoryDrawer() {
    $('fwHistoryBackdrop').addEventListener('click', closeHistoryDrawer);
    document.querySelector('#fwHistoryDrawer [data-close-drawer]').addEventListener('click', closeHistoryDrawer);
  }
  function openHistoryDrawer() {
    const fw = activeFramework();
    const entries = window.PlayStore.getByType('FrameworkChangeLog').filter((e) => !fw || e.frameworkId === fw.id).sort((a, b) => b.at.localeCompare(a.at));
    $('fwHistoryBody').innerHTML = entries.length ? entries.map((e) => `
      <div class="fw-history-item">
        <div><strong>${escapeHtml(e.action)}</strong> — ${escapeHtml(e.itemName || '')}</div>
        <div class="fw-history-item__meta">${escapeHtml(e.actor || 'Unknown')} · ${formatDateTime(e.at)}</div>
      </div>`).join('') : `<div class="profile-empty">${ICON.inbox}<div>No changes recorded yet.</div></div>`;
    $('fwHistoryDrawer').classList.add('is-open');
    $('fwHistoryBackdrop').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeHistoryDrawer() {
    $('fwHistoryDrawer').classList.remove('is-open');
    $('fwHistoryBackdrop').classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /* ========================================================================
     SHARED MODAL HELPERS
     ======================================================================== */
  function openModal(id) { const el = $(id); el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const el = $(id); if (!el.classList.contains('is-open')) return; el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  function wireModals() {
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal(backdrop.id); });
    });
    $('fwMobileSheetBackdrop').addEventListener('click', (e) => { if (e.target.id === 'fwMobileSheetBackdrop') { e.currentTarget.classList.remove('is-open'); document.body.style.overflow = ''; } });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.is-open').forEach((b) => closeModal(b.id));
        $('fwMobileSheetBackdrop').classList.remove('is-open');
        if ($('fwHistoryDrawer').classList.contains('is-open')) closeHistoryDrawer();
        document.body.style.overflow = '';
      }
    });
  }
})();
