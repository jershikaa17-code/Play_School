/* ==========================================================================
   PLAY SCHOOL — Waitlist Management (S17)
   Reuses: store.js ('Child' records — a waitlisted family is a Child with
   status 'Waitlisted' plus a `waitlist` object for position/priority/notes/
   history, added by ensureWaitlistSeed; this is the same record every
   other page already reads/writes, not a parallel store), modules.js,
   shell.js (shell/toasts/notifications), record.css (drawer components).

   Design choice, stated plainly: offering a place does NOT change
   `Child.status` (children.js/enroll.js's status badges don't know an
   "Offer sent" value) — it sets `waitlist.active = false` plus
   `waitlist.offer`/`offerSentAt`, which is what this page's queries use.
   If the waitlisted child also has a linked Admissions enquiry
   (enquiry.convertedChildId — rare for children enrolled directly through
   enroll.js, which is how every seeded waitlist entry here was created),
   that enquiry's stage is updated to 'Offer sent' too, reusing the same
   S07 offer concept/variables instead of a second implementation.

   Vacancy detection (section 7) has no real backend event bus to listen
   to, so it runs the same "check once on page load" pattern store.js uses
   everywhere else: a per-class enrolled-headcount baseline is kept in
   localStorage, and a drop since last check (a withdrawal or class move)
   fires exactly one notification per class per drop, suggesting — never
   auto-offering to — the top waiting family.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function formatMonth(iso) {
    if (!iso) return 'Flexible';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return 'Flexible';
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }
  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function ageAtStart(dob, requestedStart) {
    if (!dob || !requestedStart) return null;
    const d1 = new Date(dob + 'T00:00:00');
    const d2 = new Date(requestedStart + 'T00:00:00');
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
    let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    if (d2.getDate() < d1.getDate()) months--;
    if (months < 0) return null;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (years <= 0) return `${rem} mo`;
    return rem === 0 ? `${years}y` : `${years}y ${rem}mo`;
  }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function initials(name) { return (name || '').trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase(); }

  const ICON = {
    dots: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    grip: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  };
  const PRIORITY_META = {
    sibling: { label: 'Sibling' },
    staffChild: { label: 'Staff child' },
    returning: { label: 'Returning' },
  };
  const FILTER_GROUPS = [
    { key: 'priority', label: 'Priority', options: () => Object.keys(PRIORITY_META).map((k) => ({ key: k, label: PRIORITY_META[k].label })) },
    { key: 'starts', label: 'Requested start', options: () => startMonthOptions() },
  ];

  let classes = [];
  let activeClassId = null;
  let searchQuery = '';
  const filters = { priority: new Set(), starts: new Set() };
  let selectedChildId = null;
  let dragChildId = null;
  let pendingReorder = null; // { childId, fromPosition, toPosition }
  let pendingRemoveChildId = null;
  let offerChildId = null;
  let offerStep = 1;
  let offerDraft = { subject: '', body: '', fees: '' };
  let offerSubmitting = false;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    window.PlayShell.login();
    window.PlayShell.mount('waitlist', 'Waitlist Management');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    classes = window.PlayStore.getByType('Class').filter((c) => c.status !== 'Archived');
    activeClassId = classes.length ? classes[0].id : null;

    checkVacanciesOnce();

    wireToolbar();
    wireFilterSheet();
    wireReorderModal();
    wireRemoveModal();
    wireOfferModal();
    wireDrawer();
    wireModals();
    $('wlOfferBtn').addEventListener('click', () => { if (selectedChildId) openOfferModal(selectedChildId); });
    $('wlClassSelect').addEventListener('change', () => { activeClassId = $('wlClassSelect').value; selectedChildId = null; render(); });

    render();
  }

  /* ---------- data access ---------- */
  function waitlistedChildren() { return window.PlayStore.getByType('Child').filter((c) => c.waitlist); }
  function activeQueueForClass(classId) {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return [];
    return waitlistedChildren().filter((c) => c.room === cls.name && c.waitlist.active).sort((a, b) => a.waitlist.position - b.waitlist.position);
  }
  function enrolledCountFor(cls) { return window.PlayStore.getByType('Child').filter((c) => c.room === cls.name && c.status === 'Active').length; }
  function freeSeats(cls) { return Math.max(0, (cls.capacity || 0) - enrolledCountFor(cls)); }

  /* ---------- vacancy detection (section 7) ---------- */
  const VACANCY_BASELINE_KEY = 'ps_waitlist_seats_baseline';
  function loadBaseline() { try { return JSON.parse(localStorage.getItem(VACANCY_BASELINE_KEY) || '{}'); } catch (e) { return {}; } }
  function saveBaseline(map) { try { localStorage.setItem(VACANCY_BASELINE_KEY, JSON.stringify(map)); } catch (e) { /* storage unavailable */ } }
  function checkVacanciesOnce() {
    const baseline = loadBaseline();
    let changed = false;
    classes.forEach((cls) => {
      const count = enrolledCountFor(cls);
      const prev = baseline[cls.id];
      if (prev !== undefined && count < prev) {
        const queue = activeQueueForClass(cls.id);
        if (queue.length) {
          const top = queue[0];
          window.PlayShell.addNotification({
            title: 'A seat just opened up',
            text: `A seat is now available in ${cls.name}. ${top.name} is first on the waitlist. Review the family before offering the place.`,
            forRole: 'Admin', module: 'waitlist', mention: true,
            recordRoute: 'waitlist.html?class=' + cls.id,
          });
        }
      }
      if (prev !== count) { baseline[cls.id] = count; changed = true; }
    });
    if (changed) saveBaseline(baseline);
  }

  function startMonthOptions() {
    const months = Array.from(new Set(waitlistedChildren().map((c) => (c.waitlist.requestedStart || '').slice(0, 7)).filter(Boolean))).sort();
    return months.map((m) => ({ key: m, label: formatMonth(m + '-01') }));
  }

  function passesFilters(child) {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const guardian = window.PlayStore.getById(child.guardianId);
      const haystack = [child.name, guardian && guardian.name].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.priority.size) {
      const has = Array.from(filters.priority).some((k) => child.waitlist.priority && child.waitlist.priority[k]);
      if (!has) return false;
    }
    if (filters.starts.size && !filters.starts.has((child.waitlist.requestedStart || '').slice(0, 7))) return false;
    return true;
  }

  function render() {
    renderHeaderSummary();
    renderClassTabs();
    renderClassSelect();
    renderSeatSummary();
    renderToolbarFilters();
    renderFilterSheetBody();
    renderChips();
    renderList();
    renderOfferButtonState();
  }

  function renderHeaderSummary() {
    const totalWaiting = waitlistedChildren().filter((c) => c.waitlist.active).length;
    const totalFree = classes.reduce((sum, c) => sum + freeSeats(c), 0);
    $('wlHeaderSummary').innerHTML = `
      <div class="wl-summary-stat"><div class="wl-summary-stat__value">${totalWaiting}</div><div class="wl-summary-stat__label">Waiting</div></div>
      <div class="wl-summary-stat"><div class="wl-summary-stat__value">${totalFree}</div><div class="wl-summary-stat__label">Seats free</div></div>`;
  }

  function renderClassTabs() {
    $('wlClassTabs').innerHTML = classes.map((c, i) => {
      const free = freeSeats(c);
      const waiting = activeQueueForClass(c.id).length;
      return `
        <button class="wl-class-tab${c.id === activeClassId ? ' is-active' : ''}${free === 0 ? ' wl-class-tab--full' : ''}" type="button" data-class-id="${c.id}" style="animation-delay:${i * 40}ms">
          <span class="wl-class-tab__name">${escapeHtml(c.name)}</span>
          <span class="wl-class-tab__meta"><strong>${free}</strong> seats free · ${waiting} waiting</span>
        </button>`;
    }).join('');
    $('wlClassTabs').querySelectorAll('[data-class-id]').forEach((btn) => {
      btn.addEventListener('click', () => { activeClassId = btn.dataset.classId; selectedChildId = null; render(); });
    });
  }
  function renderClassSelect() {
    $('wlClassSelect').innerHTML = classes.map((c) => `<option value="${c.id}" ${c.id === activeClassId ? 'selected' : ''}>${escapeHtml(c.name)} — ${freeSeats(c)} free, ${activeQueueForClass(c.id).length} waiting</option>`).join('');
  }

  function renderSeatSummary() {
    const cls = classes.find((c) => c.id === activeClassId);
    if (!cls) { $('wlSeatSummary').innerHTML = ''; return; }
    const enrolled = enrolledCountFor(cls);
    const free = freeSeats(cls);
    const waiting = activeQueueForClass(cls.id).length;
    const pct = cls.capacity ? Math.min(100, Math.round((enrolled / cls.capacity) * 100)) : 0;
    const isFull = free === 0;
    const approaching = !isFull && waiting >= free && waiting > 0;
    $('wlSeatSummary').innerHTML = `
      <div class="wl-seat-card">
        <div class="wl-seat-card__title">${escapeHtml(cls.name)}</div>
        <div class="wl-seat-card__stat"><div class="wl-seat-card__stat-value">${cls.capacity || 0}</div><div class="wl-seat-card__stat-label">Capacity</div></div>
        <div class="wl-seat-card__stat"><div class="wl-seat-card__stat-value">${enrolled}</div><div class="wl-seat-card__stat-label">Enrolled</div></div>
        <div class="wl-seat-card__stat"><div class="wl-seat-card__stat-value" style="color:${isFull ? 'var(--color-error)' : 'var(--color-success)'}">${free}</div><div class="wl-seat-card__stat-label">Available</div></div>
        <div class="wl-seat-card__stat"><div class="wl-seat-card__stat-value">${waiting}</div><div class="wl-seat-card__stat-label">Waiting</div></div>
        <div class="wl-seat-card__bar-wrap">
          <div class="wl-seat-card__bar"><div class="wl-seat-card__bar-fill${isFull ? ' is-full' : ''}" style="width:${pct}%"></div></div>
          <div class="wl-seat-card__bar-label">${isFull ? 'Class full' : approaching ? 'Waitlist approaching capacity' : 'Seats available'}</div>
        </div>
      </div>`;
  }

  /* ---------- toolbar / filters ---------- */
  function wireToolbar() {
    $('wlSearch').addEventListener('input', (e) => { searchQuery = e.target.value; render(); });
  }
  function renderToolbarFilters() {
    const wrap = $('wlFiltersDesktop');
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
        <button class="wl-filter-trigger${selected.size ? ' has-value' : ''}" type="button" aria-haspopup="true" aria-expanded="false">
          <span>${escapeHtml(label)}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <span class="filter-dropdown__panel" role="menu">
          ${options.map((o) => `
            <span class="check-row">
              <input type="checkbox" class="checkbox" id="wfg-${group.key}-${escapeHtml(o.key)}" data-group="${group.key}" value="${escapeHtml(o.key)}" ${selected.has(o.key) ? 'checked' : ''} />
              <label for="wfg-${group.key}-${escapeHtml(o.key)}">${escapeHtml(o.label)}</label>
            </span>`).join('') || '<p class="card__text" style="font-size:var(--fs-caption); padding: var(--space-2) var(--space-3);">No options yet.</p>'}
        </span>
      </span>`;
  }
  function wireFilterDropdown(el) {
    const trigger = el.querySelector('.wl-filter-trigger');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !el.classList.contains('is-open');
      document.querySelectorAll('.filter-dropdown.is-open').forEach((p) => p.classList.remove('is-open'));
      el.classList.toggle('is-open', willOpen);
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
  }
  function updateFilterCountBadge() {
    const count = Object.values(filters).reduce((s, set) => s + set.size, 0);
    const badge = $('wlFilterCountBadge');
    if (count) { badge.hidden = false; badge.textContent = String(count); } else badge.hidden = true;
  }
  document.addEventListener('click', () => document.querySelectorAll('.filter-dropdown.is-open').forEach((p) => p.classList.remove('is-open')));

  function filterLabelFor(groupKey, valueKey) {
    const group = FILTER_GROUPS.find((g) => g.key === groupKey);
    const opt = group.options().find((o) => o.key === valueKey);
    return opt ? opt.label : valueKey;
  }
  function renderChips() {
    const row = $('wlChipRow');
    const chips = [];
    FILTER_GROUPS.forEach((g) => filters[g.key].forEach((val) => chips.push({ group: g.key, value: val, text: `${g.label}: ${filterLabelFor(g.key, val)}` })));
    const q = searchQuery.trim();
    if (q) chips.push({ group: '__search', value: '__search', text: `Search: "${q}"` });
    if (!chips.length) { row.hidden = true; row.innerHTML = ''; return; }
    row.hidden = false;
    row.innerHTML = chips.map((c) => `
      <span class="chip" data-chip-group="${c.group}" data-chip-value="${escapeHtml(c.value)}">
        ${escapeHtml(c.text)}
        <span class="chip__remove" role="button" tabindex="0" aria-label="Remove filter ${escapeHtml(c.text)}">&times;</span>
      </span>`).join('') + `<button class="wl-chip-row__clear" type="button" id="wlClearAllChipsBtn">Clear all</button>`;
    row.querySelectorAll('.chip__remove').forEach((btn) => {
      const chipEl = btn.closest('.chip');
      const act = () => {
        if (chipEl.dataset.chipGroup === '__search') { searchQuery = ''; $('wlSearch').value = ''; }
        else filters[chipEl.dataset.chipGroup].delete(chipEl.dataset.chipValue);
        render();
      };
      btn.addEventListener('click', act);
    });
    const clearBtn = $('wlClearAllChipsBtn'); if (clearBtn) clearBtn.addEventListener('click', clearFilters);
  }
  function clearFilters() { FILTER_GROUPS.forEach((g) => filters[g.key].clear()); searchQuery = ''; $('wlSearch').value = ''; render(); }

  function wireFilterSheet() {
    $('wlFilterSheetBtn').addEventListener('click', () => { $('wlFilterSheetBackdrop').classList.add('is-open'); document.body.style.overflow = 'hidden'; });
    $('wlFilterSheetBackdrop').addEventListener('click', (e) => { if (e.target.id === 'wlFilterSheetBackdrop') closeFilterSheet(); });
    $('wlFilterSheetClear').addEventListener('click', () => clearFilters());
    $('wlFilterSheetApply').addEventListener('click', closeFilterSheet);
  }
  function closeFilterSheet() { $('wlFilterSheetBackdrop').classList.remove('is-open'); document.body.style.overflow = ''; }
  function renderFilterSheetBody() {
    const body = $('wlFilterSheetBody');
    body.innerHTML = FILTER_GROUPS.map((g) => `
      <div class="sheet__group">
        <div class="sheet__group-label">${escapeHtml(g.label)}</div>
        ${g.options().map((o) => `
          <div class="check-row" style="margin-bottom: var(--space-2);">
            <input type="checkbox" class="checkbox" id="wsheet-${g.key}-${escapeHtml(o.key)}" data-group="${g.key}" value="${escapeHtml(o.key)}" ${filters[g.key].has(o.key) ? 'checked' : ''} />
            <label for="wsheet-${g.key}-${escapeHtml(o.key)}" style="font-size: var(--fs-body-sm);">${escapeHtml(o.label)}</label>
          </div>`).join('') || '<p class="card__text" style="font-size: var(--fs-caption);">No options yet.</p>'}
      </div>`).join('');
    body.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => { const set = filters[cb.dataset.group]; if (cb.checked) set.add(cb.value); else set.delete(cb.value); render(); });
    });
  }

  /* ========================================================================
     ORDERED LIST
     ======================================================================== */
  function renderList() {
    const fullQueue = activeQueueForClass(activeClassId);
    const filtered = fullQueue.filter(passesFilters);
    $('wlResultCount').textContent = fullQueue.length
      ? (filtered.length === fullQueue.length ? `${fullQueue.length} waiting` : `Showing ${filtered.length} of ${fullQueue.length} waiting`)
      : '';

    const empty = $('wlEmptyState');
    if (!fullQueue.length) {
      $('wlListHost').innerHTML = '';
      empty.hidden = false;
      $('wlEmptyIcon').innerHTML = ICON.inbox;
      $('wlEmptyTitle').textContent = 'No one waiting for this class';
      $('wlEmptyText').textContent = 'When a family joins the waitlist for this class, they\'ll appear here.';
      return;
    }
    if (!filtered.length) {
      $('wlListHost').innerHTML = '';
      empty.hidden = false;
      $('wlEmptyIcon').innerHTML = ICON.search;
      $('wlEmptyTitle').textContent = 'No matching families';
      $('wlEmptyText').textContent = 'Try a different search term or clear your filters.';
      return;
    }
    empty.hidden = true;
    $('wlListHost').innerHTML = `<div class="wl-list">${filtered.map((c, i) => rowHtml(c, i)).join('')}</div>`;
    wireRows();
  }
  function rowHtml(child, i) {
    const wl = child.waitlist;
    const guardian = window.PlayStore.getById(child.guardianId);
    const age = ageAtStart(child.dob, wl.requestedStart);
    const cls = classes.find((c) => c.id === activeClassId);
    const eligible = freeSeats(cls) > 0;
    const chips = Object.keys(wl.priority || {}).filter((k) => wl.priority[k]).map((k) => `<span class="wl-priority-chip wl-priority-chip--${k}" title="${PRIORITY_META[k].label} priority">${PRIORITY_META[k].label}</span>`).join('');
    return `
      <div class="wl-row${child.id === selectedChildId ? ' is-selected' : ''}" data-child-id="${child.id}" draggable="true" style="animation-delay:${Math.min(i, 10) * 25}ms">
        <span class="wl-row__handle" aria-hidden="true">${ICON.grip}</span>
        <span class="wl-row__position">${wl.position}</span>
        <div class="wl-row__main" data-select="${child.id}">
          <div class="wl-row__name-row"><span class="wl-row__name">${escapeHtml(child.name)}</span>${chips}</div>
          <div class="wl-row__meta">
            <span>${age ? escapeHtml(age) : 'Age unknown'}</span>
            <span>Requested ${escapeHtml(formatMonth(wl.requestedStart))}</span>
            <span>Added ${escapeHtml(formatDate(wl.dateAdded))}</span>
            ${guardian ? `<span>${escapeHtml(guardian.name)}</span>` : ''}
          </div>
          ${wl.notes ? `<div class="wl-row__notes-preview" title="${escapeHtml(wl.notes)}">${escapeHtml(wl.notes)}</div>` : ''}
        </div>
        <div class="wl-row__actions">
          ${eligible ? `<button class="btn btn--accent btn--sm" type="button" data-quick-offer="${child.id}">Offer place</button>` : ''}
          <span class="popover" data-row-menu>
            <button class="btn btn--icon" type="button" data-menu-trigger aria-haspopup="true" aria-expanded="false" aria-label="Actions for ${escapeHtml(child.name)}">${ICON.dots}</button>
            <span class="popover__panel" role="menu" style="right:0; left:auto;">
              <button class="popover__item" type="button" data-move="up" ${i === 0 ? 'disabled' : ''}>Move up</button>
              <button class="popover__item" type="button" data-move="down">Move down</button>
              <button class="popover__item" type="button" data-view-details="${child.id}">View details</button>
              ${eligible ? `<button class="popover__item" type="button" data-offer="${child.id}">Offer place</button>` : ''}
              <button class="popover__item popover__item--danger" type="button" data-remove="${child.id}">Remove from waitlist</button>
            </span>
          </span>
        </div>
      </div>`;
  }
  function wireRows() {
    const host = $('wlListHost');
    host.querySelectorAll('[data-select]').forEach((el) => {
      el.addEventListener('click', () => { selectedChildId = el.dataset.select === selectedChildId ? null : el.dataset.select; renderList(); renderOfferButtonState(); });
    });
    host.querySelectorAll('[data-menu-trigger]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wrap = btn.closest('[data-row-menu]');
        const willOpen = !wrap.classList.contains('is-open');
        document.querySelectorAll('[data-row-menu].is-open').forEach((p) => p.classList.remove('is-open'));
        wrap.classList.toggle('is-open', willOpen);
      });
    });
    host.querySelectorAll('[data-quick-offer]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); openOfferModal(btn.dataset.quickOffer); }));
    host.querySelectorAll('[data-offer]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); openOfferModal(btn.dataset.offer); closeRowMenus(); }));
    host.querySelectorAll('[data-view-details]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); openDrawer(btn.dataset.viewDetails); closeRowMenus(); }));
    host.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); openRemoveModal(btn.dataset.remove); closeRowMenus(); }));
    host.querySelectorAll('[data-move]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.wl-row');
        moveByStep(row.dataset.childId, btn.dataset.move === 'up' ? -1 : 1);
        closeRowMenus();
      });
    });
    // drag-and-drop reorder
    host.querySelectorAll('.wl-row[draggable="true"]').forEach((row) => {
      row.addEventListener('dragstart', (e) => { dragChildId = row.dataset.childId; row.classList.add('is-dragging'); e.dataTransfer.setData('text/plain', row.dataset.childId); });
      row.addEventListener('dragend', () => row.classList.remove('is-dragging'));
      row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('is-drag-over'); });
      row.addEventListener('dragleave', () => row.classList.remove('is-drag-over'));
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('is-drag-over');
        const draggedId = e.dataTransfer.getData('text/plain') || dragChildId;
        const targetId = row.dataset.childId;
        if (draggedId && draggedId !== targetId) requestReorder(draggedId, targetId);
      });
    });
  }
  function closeRowMenus() { document.querySelectorAll('[data-row-menu].is-open').forEach((p) => p.classList.remove('is-open')); }
  document.addEventListener('click', closeRowMenus);

  function renderOfferButtonState() {
    const btn = $('wlOfferBtn');
    const cls = classes.find((c) => c.id === activeClassId);
    btn.disabled = !selectedChildId || !cls || freeSeats(cls) <= 0;
  }

  /* ---------- reorder ---------- */
  function moveByStep(childId, delta) {
    const queue = activeQueueForClass(activeClassId);
    const idx = queue.findIndex((c) => c.id === childId);
    if (idx === -1) return;
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= queue.length) return;
    requestReorder(childId, queue[targetIdx].id);
  }
  function requestReorder(draggedId, targetId) {
    const queue = activeQueueForClass(activeClassId);
    const fromIdx = queue.findIndex((c) => c.id === draggedId);
    const toIdx = queue.findIndex((c) => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    pendingReorder = { childId: draggedId, fromPosition: queue[fromIdx].waitlist.position, toPosition: queue[toIdx].waitlist.position, fromIdx, toIdx };
    const child = queue[fromIdx];
    $('wlReorderText').textContent = `Move ${child.name} from position ${pendingReorder.fromPosition} to position ${pendingReorder.toPosition}.`;
    $('wlReorderReason').value = '';
    clearFieldError('wlReorderReason');
    openModal('wlReorderBackdrop');
  }
  function wireReorderModal() {
    $('wlReorderCancel').addEventListener('click', () => { pendingReorder = null; closeModal('wlReorderBackdrop'); });
    $('wlReorderConfirm').addEventListener('click', () => {
      const reason = $('wlReorderReason').value.trim();
      if (!reason) { setFieldError('wlReorderReason', 'A reason is required to reorder the queue.'); return; }
      if (!pendingReorder) { closeModal('wlReorderBackdrop'); return; }
      const queue = activeQueueForClass(activeClassId);
      const reordered = queue.slice();
      const [moved] = reordered.splice(pendingReorder.fromIdx, 1);
      reordered.splice(pendingReorder.toIdx, 0, moved);
      const nowIso = new Date().toISOString();
      reordered.forEach((child, i) => {
        const newPosition = i + 1;
        if (newPosition === child.waitlist.position) return;
        const history = (child.waitlist.history || []).concat(child.id === pendingReorder.childId ? [{
          action: 'Reordered', from: child.waitlist.position, to: newPosition, reason, at: nowIso, actor: window.PlayShell.getDemoRole(),
        }] : []);
        window.PlayStore.updateRecord(child.id, { waitlist: Object.assign({}, child.waitlist, { position: newPosition, history }) });
      });
      pendingReorder = null;
      closeModal('wlReorderBackdrop');
      window.PlayShell.toast('success', 'Queue reordered', `${moved.name} is now at position ${toIdxFinal(moved.id)}.`);
      render();
    });
  }
  function toIdxFinal(childId) {
    const child = window.PlayStore.getById(childId);
    return child.waitlist.position;
  }

  /* ---------- remove from waitlist ---------- */
  function wireRemoveModal() {
    $('wlRemoveReason').addEventListener('change', () => { $('wlRemoveOtherWrap').hidden = $('wlRemoveReason').value !== 'Other'; });
    $('wlRemoveConfirm').addEventListener('click', () => {
      const reason = $('wlRemoveReason').value;
      clearFieldError('wlRemoveReason'); clearFieldError('wlRemoveOther');
      if (!reason) { setFieldError('wlRemoveReason', 'Choose a reason.'); return; }
      let explanation = '';
      if (reason === 'Other') {
        explanation = $('wlRemoveOther').value.trim();
        if (!explanation) { setFieldError('wlRemoveOther', 'Please add a short explanation.'); return; }
      }
      const child = window.PlayStore.getById(pendingRemoveChildId);
      pendingRemoveChildId = null;
      closeModal('wlRemoveBackdrop');
      if (!child) return;
      const nowIso = new Date().toISOString();
      const history = (child.waitlist.history || []).concat([{ action: 'Removed from waitlist', reason: reason + (explanation ? ' — ' + explanation : ''), at: nowIso, actor: window.PlayShell.getDemoRole() }]);
      window.PlayStore.updateRecord(child.id, { waitlist: Object.assign({}, child.waitlist, { active: false, removedReason: reason, removedAt: nowIso, history }) });
      recalcPositionsForClass(child.room);
      if (selectedChildId === child.id) selectedChildId = null;
      window.PlayShell.toast('success', 'Removed from waitlist', `${child.name} has been removed from the active queue.`);
      render();
    });
  }
  function openRemoveModal(childId) {
    pendingRemoveChildId = childId;
    $('wlRemoveReason').value = ''; $('wlRemoveOther').value = ''; $('wlRemoveOtherWrap').hidden = true;
    clearFieldError('wlRemoveReason'); clearFieldError('wlRemoveOther');
    openModal('wlRemoveBackdrop');
  }
  function recalcPositionsForClass(roomName) {
    const cls = classes.find((c) => c.name === roomName);
    if (!cls) return;
    const queue = activeQueueForClass(cls.id);
    queue.forEach((child, i) => {
      const newPosition = i + 1;
      if (newPosition !== child.waitlist.position) window.PlayStore.updateRecord(child.id, { waitlist: Object.assign({}, child.waitlist, { position: newPosition }) });
    });
  }

  /* ========================================================================
     OFFER PLACE (mirrors applicant-profile.js's S07 wizard)
     ======================================================================== */
  function defaultOfferBody() {
    return `Dear {{parent_name}},\n\nWe're delighted to offer {{child_name}} a place at Play School, starting {{start_date}}.\n\nTuition for this term is {{fees}}. Please confirm within 7 days to secure the place.\n\nWarm regards,\nPlay School Admissions`;
  }
  function wireOfferModal() { /* body rendered on open */ }
  function openOfferModal(childId) {
    const child = window.PlayStore.getById(childId);
    const cls = classes.find((c) => c.id === activeClassId);
    if (!cls || freeSeats(cls) <= 0) { window.PlayShell.toast('error', 'No seats available', `${cls ? cls.name : 'This class'} has no free seats right now.`); return; }
    offerChildId = childId;
    offerStep = 1;
    offerDraft = { subject: `Your offer from Play School — ${child.name}`, body: defaultOfferBody(), fees: '' };
    offerSubmitting = false;
    renderOfferStep();
    openModal('wlOfferBackdrop');
  }
  function resolveOfferVars(str, child) {
    const guardian = window.PlayStore.getById(child.guardianId);
    return str
      .replace(/\{\{child_name\}\}/g, child.name || '')
      .replace(/\{\{parent_name\}\}/g, (guardian && guardian.name) || '')
      .replace(/\{\{start_date\}\}/g, formatMonth(child.waitlist.requestedStart))
      .replace(/\{\{fees\}\}/g, offerDraft.fees || '{{fees}}');
  }
  function renderOfferStep() {
    document.querySelectorAll('#wlOfferSteps .wl-offer-step').forEach((el) => el.classList.toggle('is-current', Number(el.dataset.step) === offerStep));
    const child = window.PlayStore.getById(offerChildId);
    const body = $('wlOfferBody');
    const actions = $('wlOfferActions');
    if (offerStep === 1) {
      body.innerHTML = `
        <div class="field"><label class="field__label" for="wlOfferSubject">Subject <span class="req">*</span></label><input class="input" id="wlOfferSubject" type="text" value="${escapeHtml(offerDraft.subject)}" /><p class="field__error" id="err-wlOfferSubject" hidden></p></div>
        <div class="field"><label class="field__label" for="wlOfferFees">Fees <span class="req">*</span></label><input class="input" id="wlOfferFees" type="text" placeholder="e.g. £1,450 per term" value="${escapeHtml(offerDraft.fees)}" /><p class="field__error" id="err-wlOfferFees" hidden></p></div>
        <div class="field"><label class="field__label" for="wlOfferContent">Offer content <span class="req">*</span></label><textarea class="textarea" id="wlOfferContent" style="min-height:160px;">${escapeHtml(offerDraft.body)}</textarea><p class="field__error" id="err-wlOfferContent" hidden></p></div>
        <div><p class="field__label" style="margin-bottom:6px;">Available variables</p><div class="wl-offer-vars"><span class="wl-offer-var">{{child_name}}</span><span class="wl-offer-var">{{parent_name}}</span><span class="wl-offer-var">{{start_date}}</span><span class="wl-offer-var">{{fees}}</span></div></div>`;
      actions.innerHTML = `<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--accent" type="button" id="wlOfferNext1">Preview</button>`;
      $('wlOfferNext1').addEventListener('click', () => {
        clearFieldError('wlOfferSubject'); clearFieldError('wlOfferFees'); clearFieldError('wlOfferContent');
        const subject = $('wlOfferSubject').value.trim();
        const fees = $('wlOfferFees').value.trim();
        const content = $('wlOfferContent').value.trim();
        let ok = true;
        if (!subject) { setFieldError('wlOfferSubject', 'Enter a subject.'); ok = false; }
        if (!fees) { setFieldError('wlOfferFees', 'Enter the fees — the {{fees}} variable needs a value before you can send.'); ok = false; }
        if (!content) { setFieldError('wlOfferContent', 'Enter the offer content.'); ok = false; }
        if (!ok) return;
        offerDraft = { subject, fees, body: content };
        offerStep = 2;
        renderOfferStep();
      });
    } else if (offerStep === 2) {
      body.innerHTML = `
        <div><p class="field__label" style="margin-bottom:6px;">Subject</p><div class="wl-offer-preview">${escapeHtml(resolveOfferVars(offerDraft.subject, child))}</div></div>
        <div><p class="field__label" style="margin-bottom:6px;">Content</p><div class="wl-offer-preview">${escapeHtml(resolveOfferVars(offerDraft.body, child))}</div></div>`;
      actions.innerHTML = `<button class="btn btn--ghost" type="button" id="wlOfferBack2">Back to editor</button><button class="btn btn--accent" type="button" id="wlOfferNext2">Continue</button>`;
      $('wlOfferBack2').addEventListener('click', () => { offerStep = 1; renderOfferStep(); });
      $('wlOfferNext2').addEventListener('click', () => { offerStep = 3; renderOfferStep(); });
    } else {
      body.innerHTML = `
        <div class="wl-offer-demo-note">This project has no real email-delivery integration. "Mark as sent" records the offer, removes ${escapeHtml(child.name)} from the active waitlist, and preserves full history — it does not deliver an email.</div>
        <div><p class="field__label" style="margin-bottom:6px;">Ready to send</p><div class="wl-offer-preview">${escapeHtml(resolveOfferVars(offerDraft.subject, child))}</div></div>`;
      actions.innerHTML = `<button class="btn btn--ghost" type="button" id="wlOfferBack3">Back to preview</button><button class="btn btn--accent" type="button" id="wlOfferSend"><span class="btn__spinner" aria-hidden="true"></span><span>Mark as sent (demo)</span></button>`;
      $('wlOfferBack3').addEventListener('click', () => { offerStep = 2; renderOfferStep(); });
      $('wlOfferSend').addEventListener('click', () => confirmOfferSend());
    }
  }
  function confirmOfferSend() {
    if (offerSubmitting) return;
    offerSubmitting = true;
    const btn = $('wlOfferSend'); if (btn) { btn.classList.add('is-loading'); btn.disabled = true; }
    window.setTimeout(() => {
      const child = window.PlayStore.getById(offerChildId);
      const cls = classes.find((c) => c.id === activeClassId);
      if (!child || !cls || freeSeats(cls) <= 0) {
        // Re-validate immediately before the write — if the seat disappeared while the modal was open, fail safely.
        offerSubmitting = false;
        window.PlayShell.toast('error', 'No seats available', 'This class filled up while the offer was open. The family stays on the waitlist.');
        closeModal('wlOfferBackdrop');
        render();
        return;
      }
      const nowIso = new Date().toISOString();
      const offer = { subject: offerDraft.subject, body: offerDraft.body, fees: offerDraft.fees, sentAt: nowIso };
      const history = (child.waitlist.history || []).concat([{ action: 'Offer sent', at: nowIso, actor: window.PlayShell.getDemoRole() }]);
      window.PlayStore.updateRecord(child.id, { waitlist: Object.assign({}, child.waitlist, { active: false, offer, offerSentAt: nowIso, history }) });
      recalcPositionsForClass(child.room);

      // Bonus integration: if this child also has a linked Admissions enquiry, advance it too.
      const linkedEnquiry = window.PlayStore.getByType('Enquiry').find((e) => e.convertedChildId === child.id);
      if (linkedEnquiry) {
        const enqHistory = (linkedEnquiry.history || []).concat([{ from: linkedEnquiry.stage, to: 'Offer sent', at: nowIso, actor: window.PlayShell.getDemoRole() }]);
        window.PlayStore.updateRecord(linkedEnquiry.id, { stage: 'Offer sent', stageEnteredAt: nowIso, history: enqHistory, offer });
      }

      window.PlayShell.addNotification({
        title: 'Offer sent', text: `${child.name}'s place in ${cls.name} was offered and they've been removed from the waitlist.`,
        forRole: 'Admin', module: 'waitlist', mention: true,
      });

      offerSubmitting = false;
      if (selectedChildId === child.id) selectedChildId = null;
      closeModal('wlOfferBackdrop');
      window.PlayShell.toast('success', 'Offer marked as sent', `${child.name} has been offered a place.`);
      render();
    }, 500);
  }

  /* ========================================================================
     DETAILS DRAWER
     ======================================================================== */
  function wireDrawer() {
    $('wlDrawerBackdrop').addEventListener('click', closeDrawer);
    document.querySelector('[data-close-drawer]').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('wlDrawer').classList.contains('is-open')) closeDrawer(); });
  }
  function openDrawer(childId) {
    const child = window.PlayStore.getById(childId);
    if (!child) return;
    const guardian = window.PlayStore.getById(child.guardianId);
    const wl = child.waitlist;
    $('wlDrawerTitle').textContent = child.name;
    $('wlDrawerBody').innerHTML = `
      <div class="wl-drawer-row"><span class="wl-drawer-row__label">Position</span><span class="wl-drawer-row__value">${wl.active ? wl.position : 'Not active'}</span></div>
      <div class="wl-drawer-row"><span class="wl-drawer-row__label">Class</span><span class="wl-drawer-row__value">${escapeHtml(child.room)}</span></div>
      <div class="wl-drawer-row"><span class="wl-drawer-row__label">Age at requested start</span><span class="wl-drawer-row__value">${ageAtStart(child.dob, wl.requestedStart) || 'Unknown'}</span></div>
      <div class="wl-drawer-row"><span class="wl-drawer-row__label">Requested start</span><span class="wl-drawer-row__value">${escapeHtml(formatMonth(wl.requestedStart))}</span></div>
      <div class="wl-drawer-row"><span class="wl-drawer-row__label">Added to waitlist</span><span class="wl-drawer-row__value">${escapeHtml(formatDate(wl.dateAdded))}</span></div>
      <div class="wl-drawer-row"><span class="wl-drawer-row__label">Parent / guardian</span><span class="wl-drawer-row__value">${guardian ? escapeHtml(guardian.name) : '—'}</span></div>
      ${wl.notes ? `<div class="wl-drawer-row"><span class="wl-drawer-row__label">Notes</span><span class="wl-drawer-row__value">${escapeHtml(wl.notes)}</span></div>` : ''}
      <div style="margin-top: var(--space-5);">
        <div class="profile-card__title" style="margin-bottom: var(--space-2);">History</div>
        <div class="wl-drawer-history">${(wl.history || []).slice().reverse().map((h) => `
          <div class="wl-drawer-history__item">
            <div>${escapeHtml(h.action)}${h.from && h.to ? ` (${h.from} → ${h.to})` : ''}${h.reason ? ' — ' + escapeHtml(h.reason) : ''}</div>
            <div class="wl-drawer-history__time">${escapeHtml(h.actor || '')} · ${formatDateTime(h.at)}</div>
          </div>`).join('') || '<p class="card__text" style="font-size:var(--fs-caption);">No history yet.</p>'}</div>
      </div>`;
    $('wlDrawer').classList.add('is-open');
    $('wlDrawerBackdrop').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    $('wlDrawer').classList.remove('is-open');
    $('wlDrawerBackdrop').classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /* ========================================================================
     SHARED MODAL / FIELD HELPERS
     ======================================================================== */
  function openModal(id) { const el = $(id); el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const el = $(id); if (!el.classList.contains('is-open')) return; el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  function wireModals() {
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal(backdrop.id); });
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop.is-open').forEach((b) => closeModal(b.id)); });
  }
  function setFieldError(id, msg) {
    const el = $('err-' + id); if (el) { el.textContent = msg; el.hidden = false; }
    const input = $(id); if (input) input.setAttribute('aria-invalid', 'true');
  }
  function clearFieldError(id) {
    const el = $('err-' + id); if (el) el.hidden = true;
    const input = $(id); if (input) input.removeAttribute('aria-invalid');
  }
})();
