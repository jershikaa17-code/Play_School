/* ==========================================================================
   PLAY SCHOOL — Admissions Pipeline (S07)
   Reuses: store.js ('Enquiry' records via PlayStore.addRecord/updateRecord/
   getByType — same flat records array as every other page), modules.js
   (plan/entitlements), shell.js (sidebar/header/bell/toast/role switcher/
   notifications). No competing store or backend — this is a static demo
   project, so "API failure" handling below is defensive only (updateRecord
   never actually throws here); see the final build report for what that
   means in practice.

   S07 (applicant detail) does not exist as a dedicated page anywhere in
   this project — grepped the whole repo, it is an unused codename. Rather
   than inventing a fake route, applicant detail is a drawer on this same
   page (the existing .drawer pattern from class-workspace.html/calendar.html),
   deep-linkable via admissions.html?enquiryId=ENQ-xxxx.

   S14 (enroll.html) *does* exist — "Move to Enrolled" hands off to it via
   ?enquiryId=, and enroll.js has been given a small, explicit prefill step
   (see enroll.js) that only fires for that param; it never marks the
   Enquiry as Enrolled until enroll.js's own final save completes.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function normalize(str) { return String(str || '').toLowerCase(); }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
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

  const ICON = {
    dots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  };

  const STAGES = [
    { key: 'Enquiry', label: 'Enquiry' },
    { key: 'Tour booked', label: 'Tour booked' },
    { key: 'Applied', label: 'Applied' },
    { key: 'Offer sent', label: 'Offer sent' },
    { key: 'Enrolled', label: 'Enrolled' },
    { key: 'Lost', label: 'Lost' },
  ];
  const SOURCES = ['Website', 'Walk-in', 'Referral', 'Social', 'Event', 'Other'];

  const FILTER_GROUPS = [
    { key: 'programs', label: 'Program', options: () => programOptions() },
    { key: 'sources', label: 'Source', options: () => SOURCES.map((s) => ({ key: s, label: s })) },
    { key: 'starts', label: 'Preferred start', options: () => startMonthOptions() },
    { key: 'owners', label: 'Owner', options: () => ownerOptions() },
  ];

  /* ---------- page state ---------- */
  let view = getViewPref();
  let searchQuery = '';
  const filters = { programs: new Set(), sources: new Set(), starts: new Set(), owners: new Set() };
  let mobileStage = 'Enquiry';
  let sortState = { key: 'preferredStart', dir: 'asc' };
  let dragEnquiryId = null;
  let pendingLostId = null;
  let pendingEnrolId = null;
  let duplicateMatchId = null;
  let duplicateAcknowledged = false;
  let enqSubmitting = false;
  let currentDrawerId = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    window.PlayShell.login();
    window.PlayShell.mount('admissions', 'Admissions Pipeline');

    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    wireToolbar();
    wireViewToggle();
    wireFilterSheet();
    wireEnqForm();
    wireLostModal();
    wireEnrolModal();
    wireModals();
    wireDrawer();

    render();
    maybeHandleDeepLink();
  }

  /* ---------- data access ---------- */
  function enquiries() { return window.PlayStore.getByType('Enquiry'); }
  function getById(id) { return window.PlayStore.getById(id); }

  function programOptions() { return window.PlayStore.getByType('Class').map((c) => ({ key: c.name, label: c.name })); }
  function ownerOptions() {
    const names = Array.from(new Set(enquiries().map((e) => e.ownerName).filter(Boolean)));
    return names.map((n) => ({ key: n, label: n }));
  }
  function startMonthOptions() {
    const months = Array.from(new Set(enquiries().map((e) => (e.preferredStart || '').slice(0, 7)).filter(Boolean))).sort();
    return months.map((m) => ({ key: m, label: formatMonth(m + '-01') }));
  }

  /* ---------- derived values ---------- */
  function ageAtStart(dob, preferredStart) {
    if (!dob || !preferredStart) return null;
    const d1 = new Date(dob + 'T00:00:00');
    const d2 = new Date(preferredStart + 'T00:00:00');
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
    let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    if (d2.getDate() < d1.getDate()) months--;
    if (months < 0) return null;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (years <= 0) return `${rem} mo`;
    return rem === 0 ? `${years}y` : `${years}y ${rem}mo`;
  }
  function daysInStage(e) {
    if (!e.stageEnteredAt) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(e.stageEnteredAt).getTime()) / 86400000));
  }
  function stageAgeClass(days) { return days >= 14 ? 'danger' : days >= 7 ? 'warning' : 'neutral'; }
  function stageBadgeClass(stage) {
    if (stage === 'Enrolled') return 'badge--success';
    if (stage === 'Lost') return 'badge--neutral';
    if (stage === 'Offer sent') return 'badge--accent';
    if (stage === 'Applied') return 'badge--primary';
    if (stage === 'Tour booked') return 'badge--warning';
    return 'badge--neutral';
  }
  function normalizePhone(p) { return String(p || '').replace(/\D+/g, ''); }
  function normalizeEmail(e) { return String(e || '').trim().toLowerCase(); }
  function findDuplicate(phone, email) {
    const np = normalizePhone(phone);
    const ne = normalizeEmail(email);
    return enquiries().find((e) => (np && normalizePhone(e.phone) === np) || (ne && normalizeEmail(e.email) === ne));
  }
  function startOfWeek() {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  /* ---------- KPIs ----------
     New this week: created since the most recent Monday.
     Tours booked / Applications / Offers out: current record count in that stage.
     Conversion rate: Enrolled ÷ (all enquiries excluding Lost) — Enrolled is
     itself part of that denominator, it is not added on top of it; shown
     with a hint on the card so the formula is never ambiguous.
     Expected starts: Enrolled records whose preferredStart falls within
     [today, today+3 months), counted once per enquiry (1 enquiry = 1 child
     in this model, so no de-duplication step is needed). */
  function calcKpis(list) {
    const weekStart = startOfWeek();
    const newThisWeek = list.filter((e) => e.createdAt && new Date(e.createdAt) >= weekStart).length;
    const toursBooked = list.filter((e) => e.stage === 'Tour booked').length;
    const applications = list.filter((e) => e.stage === 'Applied').length;
    const offersOut = list.filter((e) => e.stage === 'Offer sent').length;
    const enrolled = list.filter((e) => e.stage === 'Enrolled');
    const nonLost = list.filter((e) => e.stage !== 'Lost');
    const conversionRate = nonLost.length ? Math.round((enrolled.length / nonLost.length) * 100) : 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in3Months = new Date(today); in3Months.setMonth(in3Months.getMonth() + 3);
    const expectedStarts = enrolled.filter((e) => {
      const d = new Date((e.preferredStart || '') + 'T00:00:00');
      return !isNaN(d.getTime()) && d >= today && d < in3Months;
    }).length;
    return { newThisWeek, toursBooked, applications, offersOut, conversionRate, expectedStarts };
  }

  function renderKpis() {
    const list = enquiries();
    const k = calcKpis(list);
    const cards = [
      { label: 'New this week', value: k.newThisWeek, icon: ICON.userPlus, hint: 'Created since Monday' },
      { label: 'Tours booked', value: k.toursBooked, icon: ICON.calendar, hint: 'Currently in Tour booked' },
      { label: 'Applications', value: k.applications, icon: ICON.clipboard, hint: 'Currently in Applied' },
      { label: 'Offers out', value: k.offersOut, icon: ICON.send, hint: 'Currently in Offer sent' },
      { label: 'Conversion rate', value: k.conversionRate + '%', icon: ICON.trend, hint: 'Enrolled ÷ all non-Lost enquiries' },
      { label: 'Expected starts', value: k.expectedStarts, icon: ICON.flag, hint: 'Enrolled, starting within 3 months' },
    ];
    $('admKpiGrid').innerHTML = cards.map((c, i) => `
      <div class="adm-kpi-card" style="animation-delay:${i * 45}ms">
        <span class="adm-kpi-card__icon">${c.icon}</span>
        <div>
          <div class="adm-kpi-card__value">${escapeHtml(String(c.value))}</div>
          <div class="adm-kpi-card__label">${escapeHtml(c.label)}</div>
          <div class="adm-kpi-card__hint">${escapeHtml(c.hint)}</div>
        </div>
      </div>`).join('');

    const pill = $('admLivePill');
    const active = list.filter((e) => e.stage !== 'Lost' && e.stage !== 'Enrolled').length;
    if (list.length) { pill.hidden = false; $('admLivePillText').textContent = `${active} active in pipeline`; }
    else pill.hidden = true;
  }

  /* ---------- filtering ---------- */
  function passesFilters(e) {
    const q = normalize(searchQuery).trim();
    if (q) {
      const haystack = normalize([e.childName, e.parentName, e.phone, e.email].filter(Boolean).join(' '));
      if (!haystack.includes(q)) return false;
    }
    if (filters.programs.size && !filters.programs.has(e.program)) return false;
    if (filters.sources.size && !filters.sources.has(e.source)) return false;
    if (filters.owners.size && !filters.owners.has(e.ownerName)) return false;
    if (filters.starts.size && !filters.starts.has((e.preferredStart || '').slice(0, 7))) return false;
    return true;
  }
  function filteredEnquiries() { return enquiries().filter(passesFilters); }
  function clearFilters() {
    FILTER_GROUPS.forEach((g) => filters[g.key].clear());
    searchQuery = '';
    $('admSearch').value = '';
    render();
  }

  /* ========================================================================
     ORCHESTRATION
     ======================================================================== */
  function render() {
    renderKpis();
    renderToolbarFilters();
    renderFilterSheetBody();
    renderChips();

    const all = enquiries();
    const list = filteredEnquiries();
    renderResultCount(list.length, all.length);
    renderViewToggleState();
    applyViewVisibility();

    if (view === 'kanban') {
      renderBoard(list);
      renderMobileStageSelect(list);
      renderMobileList(list);
    } else {
      renderTable(list);
    }
    renderEmptyState(list, all);
  }

  function applyViewVisibility() {
    const kanban = view === 'kanban';
    $('admBoardWrap').style.display = kanban ? '' : 'none';
    $('admStageSelectWrap').style.display = kanban ? '' : 'none';
    $('admMobileList').style.display = kanban ? '' : 'none';
    $('admTableWrap').hidden = kanban;
  }

  function renderResultCount(shown, total) {
    const el = $('admResultCount');
    if (!total) { el.textContent = ''; return; }
    el.textContent = shown === total ? `${total} ${total === 1 ? 'enquiry' : 'enquiries'}` : `Showing ${shown} of ${total} enquiries`;
  }

  function renderEmptyState(list, all) {
    const empty = $('admEmptyState');
    const noneAtAll = all.length === 0;
    const noResults = all.length > 0 && list.length === 0;

    if (view === 'list') {
      if (noneAtAll || noResults) {
        empty.hidden = false;
        $('admTableWrap').hidden = true;
        fillEmptyState(noneAtAll);
      } else {
        empty.hidden = true;
      }
      return;
    }

    // Kanban: each column already shows its own polished empty state, so the
    // big panel only appears when there is truly no data anywhere yet.
    if (noneAtAll) {
      empty.hidden = false;
      $('admBoardWrap').style.display = 'none';
      $('admStageSelectWrap').style.display = 'none';
      $('admMobileList').style.display = 'none';
      fillEmptyState(true);
    } else {
      empty.hidden = true;
    }
  }
  function fillEmptyState(noneAtAll) {
    if (noneAtAll) {
      $('admEmptyIcon').innerHTML = ICON.userPlus;
      $('admEmptyTitle').textContent = 'No enquiries yet';
      $('admEmptyText').textContent = 'Add your first enquiry to start building the admissions pipeline.';
      $('admEmptyAction').innerHTML = '<button class="btn btn--accent" type="button" id="admEmptyAddBtn">Add enquiry</button>';
      const b = $('admEmptyAddBtn'); if (b) b.addEventListener('click', openAddModal);
    } else {
      $('admEmptyIcon').innerHTML = ICON.search;
      $('admEmptyTitle').textContent = 'No matching enquiries';
      $('admEmptyText').textContent = 'Try a different search term or clear your filters.';
      $('admEmptyAction').innerHTML = '<button class="btn btn--secondary" type="button" id="admEmptyClearBtn">Clear filters</button>';
      const b = $('admEmptyClearBtn'); if (b) b.addEventListener('click', clearFilters);
    }
  }

  /* ---------- toolbar: search + add ---------- */
  function wireToolbar() {
    $('admSearch').addEventListener('input', (e) => { searchQuery = e.target.value; render(); });
    $('admAddBtn').addEventListener('click', openAddModal);
  }

  function renderToolbarFilters() {
    const wrap = $('admFiltersDesktop');
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
        <button class="adm-filter-trigger${selected.size ? ' has-value' : ''}" type="button" aria-haspopup="true" aria-expanded="false">
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
    const trigger = el.querySelector('.adm-filter-trigger');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !el.classList.contains('is-open');
      document.querySelectorAll('.filter-dropdown.is-open').forEach((p) => { p.classList.remove('is-open'); const t = p.querySelector('.adm-filter-trigger'); if (t) t.setAttribute('aria-expanded', 'false'); });
      el.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    });
    el.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const set = filters[cb.dataset.group];
        if (cb.checked) set.add(cb.value); else set.delete(cb.value);
        render();
        const reopened = document.querySelector(`.filter-dropdown[data-filter-group="${cb.dataset.group}"]`);
        if (reopened) { reopened.classList.add('is-open'); const t = reopened.querySelector('.adm-filter-trigger'); if (t) t.setAttribute('aria-expanded', 'true'); }
      });
    });
  }
  function updateFilterCountBadge() {
    const count = Object.values(filters).reduce((s, set) => s + set.size, 0);
    const badge = $('admFilterCountBadge');
    if (count) { badge.hidden = false; badge.textContent = String(count); } else badge.hidden = true;
  }
  document.addEventListener('click', () => {
    document.querySelectorAll('.filter-dropdown.is-open').forEach((p) => { p.classList.remove('is-open'); const t = p.querySelector('.adm-filter-trigger'); if (t) t.setAttribute('aria-expanded', 'false'); });
  });

  /* ---------- chips ---------- */
  function filterLabelFor(groupKey, valueKey) {
    const group = FILTER_GROUPS.find((g) => g.key === groupKey);
    const opt = group.options().find((o) => o.key === valueKey);
    return opt ? opt.label : valueKey;
  }
  function renderChips() {
    const row = $('admChipRow');
    const chips = [];
    FILTER_GROUPS.forEach((g) => { filters[g.key].forEach((val) => chips.push({ group: g.key, value: val, text: `${g.label}: ${filterLabelFor(g.key, val)}` })); });
    const q = searchQuery.trim();
    if (q) chips.push({ group: '__search', value: '__search', text: `Search: "${q}"` });
    if (!chips.length) { row.hidden = true; row.innerHTML = ''; return; }
    row.hidden = false;
    row.innerHTML = chips.map((c) => `
      <span class="chip" data-chip-group="${c.group}" data-chip-value="${escapeHtml(c.value)}">
        ${escapeHtml(c.text)}
        <span class="chip__remove" role="button" tabindex="0" aria-label="Remove filter ${escapeHtml(c.text)}">&times;</span>
      </span>`).join('') + `<button class="adm-chip-row__clear" type="button" id="admClearAllChipsBtn">Clear all</button>`;
    row.querySelectorAll('.chip__remove').forEach((btn) => {
      const chipEl = btn.closest('.chip');
      const act = () => {
        if (chipEl.dataset.chipGroup === '__search') { searchQuery = ''; $('admSearch').value = ''; }
        else filters[chipEl.dataset.chipGroup].delete(chipEl.dataset.chipValue);
        render();
      };
      btn.addEventListener('click', act);
      btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    });
    const clearBtn = $('admClearAllChipsBtn'); if (clearBtn) clearBtn.addEventListener('click', clearFilters);
  }

  /* ---------- mobile filter sheet ---------- */
  function wireFilterSheet() {
    $('admFilterSheetBtn').addEventListener('click', () => { $('admFilterSheetBackdrop').classList.add('is-open'); document.body.style.overflow = 'hidden'; });
    $('admFilterSheetBackdrop').addEventListener('click', (e) => { if (e.target.id === 'admFilterSheetBackdrop') closeFilterSheet(); });
    $('admFilterSheetClear').addEventListener('click', () => clearFilters());
    $('admFilterSheetApply').addEventListener('click', closeFilterSheet);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFilterSheet(); });
  }
  function closeFilterSheet() { $('admFilterSheetBackdrop').classList.remove('is-open'); document.body.style.overflow = ''; }
  function renderFilterSheetBody() {
    const body = $('admFilterSheetBody');
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
      cb.addEventListener('change', () => { const set = filters[cb.dataset.group]; if (cb.checked) set.add(cb.value); else set.delete(cb.value); render(); });
    });
  }

  /* ---------- view toggle ---------- */
  function getViewPref() { try { return localStorage.getItem('ps_admissions_view') || 'kanban'; } catch (e) { return 'kanban'; } }
  function saveViewPref(v) { try { localStorage.setItem('ps_admissions_view', v); } catch (e) { /* storage unavailable */ } }
  function wireViewToggle() {
    $('admViewToggle').querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => { view = btn.dataset.view; saveViewPref(view); render(); });
    });
  }
  function renderViewToggleState() {
    $('admViewToggle').querySelectorAll('[data-view]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.view === view)));
  }

  /* ---------- shared card / row wiring ---------- */
  function closeAllCardMenus() { document.querySelectorAll('[data-card-menu].is-open').forEach((p) => p.classList.remove('is-open')); }
  document.addEventListener('click', closeAllCardMenus);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllCardMenus(); });

  function moveMenuHtml(e) {
    const others = STAGES.filter((s) => s.key !== e.stage);
    return `
      <span class="popover__panel adm-move-submenu" role="menu" aria-label="Move to">
        <span class="adm-move-submenu__label">Move to</span>
        ${others.map((s) => `<button class="popover__item" type="button" role="menuitem" data-move-to="${escapeHtml(s.key)}" data-id="${e.id}">${escapeHtml(s.label)}</button>`).join('')}
        <button class="popover__item" type="button" role="menuitem" data-view-detail="${e.id}">View details</button>
      </span>`;
  }
  function wireOverflowMenus(container) {
    container.querySelectorAll('[data-menu-trigger]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wrap = btn.closest('[data-card-menu]');
        const willOpen = !wrap.classList.contains('is-open');
        closeAllCardMenus();
        wrap.classList.toggle('is-open', willOpen);
        btn.setAttribute('aria-expanded', String(willOpen));
      });
    });
    container.querySelectorAll('[data-move-to]').forEach((btn) => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); attemptStageChange(btn.dataset.id, btn.dataset.moveTo); closeAllCardMenus(); });
    });
    container.querySelectorAll('[data-view-detail]').forEach((btn) => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); openDrawer(btn.dataset.viewDetail); closeAllCardMenus(); });
    });
  }
  function wireRowOpen(container, selector) {
    container.querySelectorAll(selector).forEach((row) => {
      const open = (ev) => { if (ev.target.closest('[data-card-menu]')) return; openDrawer(row.dataset.id); };
      row.addEventListener('click', open);
      row.addEventListener('keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && !ev.target.closest('[data-card-menu]')) { ev.preventDefault(); openDrawer(row.dataset.id); } });
    });
  }

  /* ---------- Kanban board ---------- */
  function cardHtml(e) {
    const age = ageAtStart(e.dob, e.preferredStart);
    const days = daysInStage(e);
    const ageCls = stageAgeClass(days);
    const overdue = e.nextFollowUp && e.nextFollowUp < todayISO();
    return `
      <div class="adm-card" draggable="true" tabindex="0" role="button" data-id="${e.id}" aria-label="Open ${escapeHtml(e.childName)}">
        <div class="adm-card__top">
          <div>
            <div class="adm-card__name">${escapeHtml(e.childName)}</div>
            <div class="adm-card__meta">${escapeHtml(e.parentName)} · ${age ? escapeHtml(age) : 'Age unknown'}</div>
          </div>
          <span class="popover adm-card__menu" data-card-menu data-id="${e.id}">
            <button class="adm-card__menu-trigger" type="button" data-menu-trigger aria-haspopup="true" aria-expanded="false" aria-label="Actions for ${escapeHtml(e.childName)}">${ICON.dots}</button>
            ${moveMenuHtml(e)}
          </span>
        </div>
        <div class="adm-card__row">
          <span class="adm-card__chip">${escapeHtml(e.program || 'Any program')}</span>
          <span class="adm-card__chip">${escapeHtml(formatMonth(e.preferredStart))}</span>
          <span class="adm-card__chip">${escapeHtml(e.source)}</span>
        </div>
        <div class="adm-card__foot">
          <span class="adm-age adm-age--${ageCls}" title="${days} day(s) in ${escapeHtml(e.stage)}">${days}d in stage</span>
          <span class="adm-card__followup${overdue ? ' is-overdue' : ''}">${e.nextFollowUp ? (overdue ? 'Overdue ' : 'Follow up ') + formatDate(e.nextFollowUp) : 'No follow-up set'}</span>
        </div>
      </div>`;
  }
  function columnEmptyHtml(stage) {
    return `<div class="adm-column__empty">${ICON.inbox}<div>No families in ${escapeHtml(stage.label)} yet.</div></div>`;
  }
  function columnHtml(stage, items) {
    const cls = stage.key === 'Enrolled' ? ' adm-column--enrolled' : stage.key === 'Lost' ? ' adm-column--lost' : '';
    return `
      <div class="adm-column${cls}" data-stage="${escapeHtml(stage.key)}">
        <div class="adm-column__head">
          <div class="adm-column__head-main"><span class="adm-column__dot"></span><span class="adm-column__name">${escapeHtml(stage.label)}</span></div>
          <span class="adm-column__count">${items.length}</span>
        </div>
        <div class="adm-column__summary">${items.length} ${items.length === 1 ? 'family' : 'families'} in this stage</div>
        <div class="adm-column__body" data-stage-body="${escapeHtml(stage.key)}">
          ${items.length ? items.map(cardHtml).join('') : columnEmptyHtml(stage)}
        </div>
      </div>`;
  }
  function renderBoard(list) {
    const board = $('admBoard');
    board.innerHTML = STAGES.map((s) => columnHtml(s, list.filter((e) => e.stage === s.key))).join('');
    wireColumnDnD(board);
    wireCardDrag(board);
    wireOverflowMenus(board);
    wireRowOpen(board, '.adm-card[data-id]');
  }
  function wireCardDrag(container) {
    container.querySelectorAll('.adm-card[draggable="true"]').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        dragEnquiryId = card.dataset.id;
        card.classList.add('is-dragging');
        e.dataTransfer.setData('text/plain', card.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => { card.classList.remove('is-dragging'); dragEnquiryId = null; });
    });
  }
  function wireColumnDnD(board) {
    board.querySelectorAll('[data-stage-body]').forEach((body) => {
      body.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; body.classList.add('is-drag-over'); });
      body.addEventListener('dragleave', () => body.classList.remove('is-drag-over'));
      body.addEventListener('drop', (e) => {
        e.preventDefault();
        body.classList.remove('is-drag-over');
        const id = e.dataTransfer.getData('text/plain') || dragEnquiryId;
        if (id) attemptStageChange(id, body.dataset.stageBody);
      });
    });
  }

  /* ---------- mobile stage select + vertical list ---------- */
  function renderMobileStageSelect(list) {
    const sel = $('admStageSelect');
    sel.innerHTML = STAGES.map((s) => `<option value="${escapeHtml(s.key)}" ${s.key === mobileStage ? 'selected' : ''}>${escapeHtml(s.label)} (${list.filter((e) => e.stage === s.key).length})</option>`).join('');
    sel.onchange = () => { mobileStage = sel.value; render(); };
  }
  function renderMobileList(list) {
    const items = list.filter((e) => e.stage === mobileStage);
    const wrap = $('admMobileList');
    wrap.innerHTML = items.length ? items.map(cardHtml).join('')
      : `<div class="state-panel"><div class="state-panel__icon">${ICON.inbox}</div><div class="state-panel__title">No families in ${escapeHtml(mobileStage)}</div><p class="state-panel__text">Switch stages above or add a new enquiry.</p></div>`;
    wireOverflowMenus(wrap);
    wireRowOpen(wrap, '.adm-card[data-id]');
  }

  /* ---------- list view ---------- */
  function sortList(list) {
    const { key, dir } = sortState;
    const mul = dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      const av = key === 'daysInStage' ? daysInStage(a) : (a[key] || '');
      const bv = key === 'daysInStage' ? daysInStage(b) : (b[key] || '');
      if (av < bv) return -1 * mul;
      if (av > bv) return 1 * mul;
      return 0;
    });
  }
  function rowHtml(e) {
    const days = daysInStage(e);
    const ageCls = stageAgeClass(days);
    return `
      <tr data-id="${e.id}" tabindex="0" role="button" aria-label="Open ${escapeHtml(e.childName)}" style="cursor:pointer;">
        <td>${escapeHtml(e.childName)}</td>
        <td>${escapeHtml(e.parentName)}</td>
        <td>${escapeHtml(e.program || '—')}</td>
        <td><span class="badge ${stageBadgeClass(e.stage)}">${escapeHtml(e.stage)}</span></td>
        <td>${escapeHtml(formatMonth(e.preferredStart))}</td>
        <td>${escapeHtml(e.source)}</td>
        <td><span class="adm-age adm-age--${ageCls}">${days}d</span></td>
        <td>${e.nextFollowUp ? escapeHtml(formatDate(e.nextFollowUp)) : '—'}</td>
        <td>${escapeHtml(e.ownerName || 'Unassigned')}</td>
        <td>
          <span class="popover" data-card-menu data-id="${e.id}">
            <button class="adm-card__menu-trigger" type="button" data-menu-trigger aria-haspopup="true" aria-expanded="false" aria-label="Actions for ${escapeHtml(e.childName)}">${ICON.dots}</button>
            ${moveMenuHtml(e)}
          </span>
        </td>
      </tr>`;
  }
  function tableCardHtml(e) {
    const days = daysInStage(e);
    return `
      <div class="table-card__item" data-id="${e.id}" role="button" tabindex="0" aria-label="Open ${escapeHtml(e.childName)}">
        <div class="table-card__row"><span class="table-card__label">Child</span><span class="table-card__value">${escapeHtml(e.childName)}</span></div>
        <div class="table-card__row"><span class="table-card__label">Parent</span><span class="table-card__value">${escapeHtml(e.parentName)}</span></div>
        <div class="table-card__row"><span class="table-card__label">Stage</span><span class="table-card__value"><span class="badge ${stageBadgeClass(e.stage)}">${escapeHtml(e.stage)}</span></span></div>
        <div class="table-card__row"><span class="table-card__label">Preferred start</span><span class="table-card__value">${escapeHtml(formatMonth(e.preferredStart))}</span></div>
        <div class="table-card__row"><span class="table-card__label">Days in stage</span><span class="table-card__value">${days}d</span></div>
        <div class="table-card__row"><span class="table-card__label">Next follow-up</span><span class="table-card__value">${e.nextFollowUp ? escapeHtml(formatDate(e.nextFollowUp)) : '—'}</span></div>
      </div>`;
  }
  function renderTable(list) {
    const sorted = sortList(list.slice());
    $('admTableBody').innerHTML = sorted.map(rowHtml).join('');
    $('admTableCards').innerHTML = sorted.map(tableCardHtml).join('');
    wireOverflowMenus($('admTableBody'));
    wireRowOpen($('admTableBody'), 'tr[data-id]');
    wireOverflowMenus($('admTableCards'));
    wireRowOpen($('admTableCards'), '.table-card__item[data-id]');
    document.querySelectorAll('[data-sort]').forEach((th) => {
      th.style.cursor = 'pointer';
      th.onclick = () => {
        const key = th.dataset.sort;
        if (sortState.key === key) sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
        else { sortState.key = key; sortState.dir = 'asc'; }
        render();
      };
    });
  }

  /* ---------- stage transitions ---------- */
  function attemptStageChange(id, toStage) {
    const enq = getById(id);
    if (!enq || enq.stage === toStage) return;
    if (toStage === 'Lost') { openLostModal(id); return; }
    if (toStage === 'Enrolled') { openEnrolModal(id); return; }
    commitStageChange(id, toStage);
  }
  function commitStageChange(id, toStage, extra) {
    const enq = getById(id);
    if (!enq) return;
    const prevStage = enq.stage;
    try {
      const nowIso = new Date().toISOString();
      const history = (enq.history || []).concat([{ from: prevStage, to: toStage, at: nowIso, actor: window.PlayShell.getDemoRole() }]);
      window.PlayStore.updateRecord(id, Object.assign({ stage: toStage, stageEnteredAt: nowIso, history }, extra || {}));
      window.PlayShell.toast('success', `Moved to ${toStage}`, `${enq.childName} is now in ${toStage}.`);
      render();
    } catch (e) {
      // Defensive only — this static demo store has no real backend call that
      // can fail; nothing here mutates state until this point, so "restoring
      // the previous stage" on failure is simply never applying the change.
      window.PlayShell.toast('error', 'Could not update stage', 'Please try again.');
      render();
    }
  }

  /* ---------- Lost modal ---------- */
  function wireLostModal() {
    $('enqLostReason').addEventListener('change', () => { $('enqLostOtherWrap').hidden = $('enqLostReason').value !== 'Other'; });
    $('enqLostConfirm').addEventListener('click', () => {
      const reason = $('enqLostReason').value;
      clearFieldError('enqLostReason'); clearFieldError('enqLostOther');
      if (!reason) { setFieldError('enqLostReason', 'Choose a reason.'); return; }
      let note = '';
      if (reason === 'Other') {
        note = $('enqLostOther').value.trim();
        if (!note) { setFieldError('enqLostOther', 'Please add a short explanation.'); return; }
      }
      if (!pendingLostId) return;
      const id = pendingLostId;
      pendingLostId = null;
      closeModal('enqLostModalBackdrop');
      commitStageChange(id, 'Lost', { lostReason: reason, lostNote: note || null });
    });
  }
  function openLostModal(id) {
    pendingLostId = id;
    $('enqLostReason').value = '';
    $('enqLostOther').value = '';
    $('enqLostOtherWrap').hidden = true;
    clearFieldError('enqLostReason'); clearFieldError('enqLostOther');
    const enq = getById(id);
    $('enqLostText').textContent = enq ? `Tell us why ${enq.childName}'s enquiry didn't continue.` : 'Let us know why so the team can learn from it.';
    openModal('enqLostModalBackdrop');
  }

  /* ---------- Enrol confirmation modal ---------- */
  function wireEnrolModal() {
    $('enqEnrolConfirm').addEventListener('click', () => {
      if (!pendingEnrolId) return;
      const id = pendingEnrolId;
      pendingEnrolId = null;
      closeModal('enqEnrolModalBackdrop');
      window.location.href = 'enroll.html?enquiryId=' + encodeURIComponent(id);
    });
  }
  function openEnrolModal(id) { pendingEnrolId = id; openModal('enqEnrolModalBackdrop'); }

  /* ---------- generic modal open/close (mirrors access-denied.js) ---------- */
  function openModal(id) { const el = $(id); el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const el = $(id); if (!el.classList.contains('is-open')) return; el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  function wireModals() {
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal(backdrop.id); });
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop.is-open').forEach((b) => closeModal(b.id)); });
  }

  /* ---------- field validation helpers ---------- */
  function setFieldError(id, msg) {
    const el = $('err-' + id); if (el) { el.textContent = msg; el.hidden = false; }
    const input = $(id); if (input) input.setAttribute('aria-invalid', 'true');
  }
  function clearFieldError(id) {
    const el = $('err-' + id); if (el) el.hidden = true;
    const input = $(id); if (input) input.removeAttribute('aria-invalid');
  }

  /* ---------- Add enquiry modal ---------- */
  function wireEnqForm() {
    $('efPhone').addEventListener('input', checkDuplicateLive);
    $('efEmail').addEventListener('input', checkDuplicateLive);
    $('enqFormSubmit').addEventListener('click', submitEnqForm);
  }
  function openAddModal() {
    populateProgramOptions();
    populateOwnerOptions();
    $('efParentName').value = ''; $('efPhone').value = ''; $('efEmail').value = '';
    $('efChildName').value = ''; $('efDob').value = ''; $('efProgram').value = '';
    $('efStart').value = ''; $('efSource').value = 'Website'; $('efOwner').value = '';
    $('efFollowUp').value = ''; $('efNotes').value = '';
    duplicateMatchId = null; duplicateAcknowledged = false;
    $('admDuplicateBanner').hidden = true;
    ['efParentName', 'efPhone', 'efEmail', 'efChildName', 'efProgram', 'efStart'].forEach(clearFieldError);
    openModal('enqFormModalBackdrop');
    window.setTimeout(() => $('efParentName').focus(), 50);
  }
  function populateProgramOptions() {
    const classes = window.PlayStore.getByType('Class');
    $('efProgram').innerHTML = '<option value="">Choose a program…</option>' + classes.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
  }
  function populateOwnerOptions() {
    const staff = window.PlayStore.getByType('Staff').filter((s) => s.status === 'Active');
    $('efOwner').innerHTML = '<option value="">Unassigned</option>' + staff.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  }
  function checkDuplicateLive() {
    const phone = $('efPhone').value.trim();
    const email = $('efEmail').value.trim();
    duplicateAcknowledged = false;
    if (!phone && !email) { $('admDuplicateBanner').hidden = true; duplicateMatchId = null; return; }
    const match = findDuplicate(phone, email);
    if (match) {
      duplicateMatchId = match.id;
      renderDuplicateBanner(match);
    } else {
      duplicateMatchId = null;
      $('admDuplicateBanner').hidden = true;
    }
  }
  function renderDuplicateBanner(match) {
    const banner = $('admDuplicateBanner');
    banner.hidden = false;
    banner.innerHTML = `
      <span>A possible duplicate already exists: <strong>${escapeHtml(match.childName)}</strong> (${escapeHtml(match.parentName)}) — currently in <strong>${escapeHtml(match.stage)}</strong>.</span>
      <span class="adm-duplicate-banner__actions">
        <button type="button" class="adm-duplicate-banner__link" id="dupViewBtn">View existing enquiry</button>
        <button type="button" class="adm-duplicate-banner__link" id="dupContinueBtn">Continue anyway</button>
      </span>`;
    $('dupViewBtn').addEventListener('click', () => { closeModal('enqFormModalBackdrop'); openDrawer(match.id); });
    $('dupContinueBtn').addEventListener('click', () => {
      duplicateAcknowledged = true;
      banner.innerHTML = `<span>Continuing — this will be saved as a separate enquiry from <strong>${escapeHtml(match.childName)}</strong>.</span>`;
    });
  }
  function validateEnqForm() {
    let ok = true;
    ['efParentName', 'efPhone', 'efEmail', 'efChildName', 'efProgram', 'efStart'].forEach(clearFieldError);
    const parentName = $('efParentName').value.trim();
    const phone = $('efPhone').value.trim();
    const email = $('efEmail').value.trim();
    const childName = $('efChildName').value.trim();
    const program = $('efProgram').value;
    const start = $('efStart').value;
    if (!parentName) { setFieldError('efParentName', "Enter the parent or guardian's name."); ok = false; }
    if (!phone) { setFieldError('efPhone', 'Enter a phone number.'); ok = false; }
    else if (normalizePhone(phone).length < 7) { setFieldError('efPhone', 'Enter a valid phone number.'); ok = false; }
    if (!email) { setFieldError('efEmail', 'Enter an email address.'); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('efEmail', 'Enter a valid email address.'); ok = false; }
    if (!childName) { setFieldError('efChildName', "Enter the child's name."); ok = false; }
    if (!program) { setFieldError('efProgram', 'Choose a program or class.'); ok = false; }
    if (!start) { setFieldError('efStart', 'Choose a preferred start date.'); ok = false; }
    return ok;
  }
  function submitEnqForm() {
    if (enqSubmitting) return;
    if (!validateEnqForm()) return;
    if (duplicateMatchId && !duplicateAcknowledged) {
      window.PlayShell.toast('warning', 'Possible duplicate found', 'Review the warning above, then choose "Continue anyway" to proceed.');
      return;
    }
    enqSubmitting = true;
    const btn = $('enqFormSubmit');
    btn.classList.add('is-loading'); btn.disabled = true;
    window.setTimeout(() => {
      const id = 'ENQ-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
      const nowIso = new Date().toISOString();
      const ownerId = $('efOwner').value || null;
      const ownerStaff = ownerId ? getById(ownerId) : null;
      const record = {
        id, type: 'Enquiry',
        childName: $('efChildName').value.trim(),
        dob: $('efDob').value || null,
        parentName: $('efParentName').value.trim(),
        phone: $('efPhone').value.trim(),
        email: $('efEmail').value.trim(),
        program: $('efProgram').value,
        preferredStart: $('efStart').value,
        source: $('efSource').value,
        ownerId, ownerName: ownerStaff ? ownerStaff.name : null,
        stage: 'Enquiry', createdAt: nowIso, stageEnteredAt: nowIso,
        nextFollowUp: $('efFollowUp').value || null,
        notes: $('efNotes').value.trim(),
        lostReason: null, lostNote: null, convertedChildId: null,
        history: [{ from: null, to: 'Enquiry', at: nowIso, actor: window.PlayShell.getDemoRole() }],
      };
      window.PlayStore.addRecord(record);

      btn.classList.remove('is-loading'); btn.disabled = false; enqSubmitting = false;
      closeModal('enqFormModalBackdrop');
      window.PlayShell.toast('success', 'Enquiry added', `${record.childName} has entered the pipeline at Enquiry.`);
      window.PlayShell.addNotification({
        title: 'New admissions enquiry',
        text: `${record.childName} (${record.parentName}) enquired about ${record.program || 'a program'}.`,
        forRole: 'Admin', module: 'admissions', mention: true,
        recordRoute: 'admissions.html?enquiryId=' + id,
      });
      render();
      if (!passesFilters(record)) {
        window.PlayShell.toast('info', 'Hidden by filters', 'The new enquiry was added but is hidden by your current filters.');
      }
    }, 450);
  }

  /* ---------- applicant detail drawer (S07 fallback) ---------- */
  function wireDrawer() {
    $('admDrawerBackdrop').addEventListener('click', closeDrawer);
    document.querySelector('[data-close-drawer]').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('admDrawer').classList.contains('is-open')) closeDrawer(); });
  }
  function openDrawer(id) {
    const e = getById(id);
    if (!e) return;
    currentDrawerId = id;
    $('admDrawerTitle').textContent = e.childName;
    $('admDrawerBody').innerHTML = drawerBodyHtml(e);
    wireDrawerActions(e);
    $('admDrawer').classList.add('is-open');
    $('admDrawerBackdrop').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    $('admDrawer').classList.remove('is-open');
    $('admDrawerBackdrop').classList.remove('is-open');
    document.body.style.overflow = '';
    currentDrawerId = null;
    if (window.location.search.includes('enquiryId')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('enquiryId');
      window.history.replaceState({}, '', url.toString());
    }
  }
  function drawerBodyHtml(e) {
    const age = ageAtStart(e.dob, e.preferredStart);
    const days = daysInStage(e);
    const ageCls = stageAgeClass(days);
    return `
      <div class="adm-drawer-section">
        <div class="adm-drawer-section__title">Overview</div>
        <div class="adm-drawer-row"><span class="adm-drawer-row__label">Stage</span><span class="adm-drawer-row__value"><span class="badge ${stageBadgeClass(e.stage)}">${escapeHtml(e.stage)}</span></span></div>
        <div class="adm-drawer-row"><span class="adm-drawer-row__label">Days in stage</span><span class="adm-drawer-row__value"><span class="adm-age adm-age--${ageCls}">${days}d</span></span></div>
        <div class="adm-drawer-row"><span class="adm-drawer-row__label">Age at start</span><span class="adm-drawer-row__value">${age ? escapeHtml(age) : 'Unknown'}</span></div>
        <div class="adm-drawer-row"><span class="adm-drawer-row__label">Program</span><span class="adm-drawer-row__value">${escapeHtml(e.program || '—')}</span></div>
        <div class="adm-drawer-row"><span class="adm-drawer-row__label">Preferred start</span><span class="adm-drawer-row__value">${escapeHtml(formatMonth(e.preferredStart))}</span></div>
        <div class="adm-drawer-row"><span class="adm-drawer-row__label">Source</span><span class="adm-drawer-row__value">${escapeHtml(e.source)}</span></div>
        <div class="adm-drawer-row"><span class="adm-drawer-row__label">Owner</span><span class="adm-drawer-row__value">${escapeHtml(e.ownerName || 'Unassigned')}</span></div>
        <div class="adm-drawer-row"><span class="adm-drawer-row__label">Next follow-up</span><span class="adm-drawer-row__value">${e.nextFollowUp ? escapeHtml(formatDate(e.nextFollowUp)) : '—'}</span></div>
        ${e.stage === 'Lost' ? `<div class="adm-drawer-row"><span class="adm-drawer-row__label">Lost reason</span><span class="adm-drawer-row__value">${escapeHtml(e.lostReason || '—')}</span></div>` : ''}
      </div>
      <div class="adm-drawer-section">
        <div class="adm-drawer-section__title">Contact</div>
        <div class="adm-drawer-row"><span class="adm-drawer-row__label">Parent / guardian</span><span class="adm-drawer-row__value">${escapeHtml(e.parentName)}</span></div>
        <div class="adm-drawer-row"><span class="adm-drawer-row__label">Phone</span><span class="adm-drawer-row__value">${escapeHtml(e.phone || '—')}</span></div>
        <div class="adm-drawer-row"><span class="adm-drawer-row__label">Email</span><span class="adm-drawer-row__value">${escapeHtml(e.email || '—')}</span></div>
      </div>
      ${e.notes ? `<div class="adm-drawer-section"><div class="adm-drawer-section__title">Notes</div><p class="card__text" style="font-size: var(--fs-body-sm);">${escapeHtml(e.notes)}</p></div>` : ''}
      <div class="adm-drawer-section">
        <div class="adm-drawer-section__title">Timeline</div>
        <div class="adm-timeline">${(e.history || []).slice().reverse().map((h) => `
          <div class="adm-timeline__item"><span class="adm-timeline__dot"></span><div class="adm-timeline__body">
            <div>${h.from ? `Moved from <strong>${escapeHtml(h.from)}</strong> to <strong>${escapeHtml(h.to)}</strong>` : `Entered pipeline at <strong>${escapeHtml(h.to)}</strong>`}${h.actor ? ' · ' + escapeHtml(h.actor) : ''}</div>
            <div class="adm-timeline__time">${formatDateTime(h.at)}</div>
          </div></div>`).join('') || '<p class="card__text" style="font-size:var(--fs-caption);">No history yet.</p>'}</div>
      </div>
      <div class="adm-drawer-section">
        <div class="adm-drawer-section__title">Actions</div>
        <div class="adm-drawer-actions">
          ${STAGES.filter((s) => s.key !== e.stage).map((s) => `<button class="btn btn--secondary btn--sm" type="button" data-drawer-move="${escapeHtml(s.key)}">Move to ${escapeHtml(s.label)}</button>`).join('')}
        </div>
      </div>`;
  }
  function wireDrawerActions(e) {
    $('admDrawerBody').querySelectorAll('[data-drawer-move]').forEach((btn) => {
      btn.addEventListener('click', () => { attemptStageChange(e.id, btn.dataset.drawerMove); closeDrawer(); });
    });
  }

  /* ---------- deep link (?enquiryId=) ---------- */
  function maybeHandleDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('enquiryId');
    if (id && getById(id)) openDrawer(id);
  }
})();
