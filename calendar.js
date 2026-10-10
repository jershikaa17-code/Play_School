/* ==========================================================================
   PLAY SCHOOL — Calendar
   Reuses: store.js (records — events are type 'Event', classes/staff/children
   come from the same shared store), shell.js (shell/toast/notifications),
   modules.js (plan gating, unused here since Calendar is core).
   Recurring events are NOT pre-expanded into stored records — a single
   "master" Event record carries a recurrence rule + an exceptions map keyed
   by original occurrence date, and visible occurrences are computed on the
   fly for whatever date range is on screen (see expandEvent()).
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function pad2(n) { return String(n).padStart(2, '0'); }

  /* ---------- date helpers (local-time, no timezone library needed) ---------- */
  function toISODate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function parseISODate(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
  function startOfWeek(d) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0, 0, 0, 0); return r; }
  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function sameDate(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function todayDate() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function clampDayOfMonth(year, monthIndex, day) {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return Math.min(day, lastDay);
  }
  function addMonthsClamped(baseDate, n, originalDay) {
    const y = baseDate.getFullYear();
    const m = baseDate.getMonth() + n;
    const targetYear = y + Math.floor(m / 12);
    const targetMonth = ((m % 12) + 12) % 12;
    const day = clampDayOfMonth(targetYear, targetMonth, originalDay);
    return new Date(targetYear, targetMonth, day);
  }
  function formatTime(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + (m ? ':' + pad2(m) : '') + ' ' + period;
  }
  function formatDateLong(d) { return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  function formatDateMed(d) { return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); }
  function formatDateShort(d) { return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); }

  const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_START_HOUR = 7;
  const DAY_END_HOUR = 19;
  const HOUR_PX = 56;

  const EVENT_TYPES = {
    event: { label: 'Event', chip: 'cal-chip--event', badge: 'badge badge--ink' },
    trip: { label: 'Trip', chip: 'cal-chip--trip', badge: 'badge badge--trip' },
    meeting: { label: 'Meeting', chip: 'cal-chip--meeting', badge: 'badge badge--neutral' },
    holiday: { label: 'Holiday', chip: 'cal-chip--holiday', badge: 'badge badge--stripe' },
    closure: { label: 'Closure', chip: 'cal-chip--closure', badge: 'badge badge--stripe' },
    conference: { label: 'Parent conference', chip: 'cal-chip--conference', badge: 'badge badge--primary badge--outline' },
  };
  const TYPE_ORDER = ['event', 'trip', 'meeting', 'holiday', 'closure', 'conference'];

  const ICON = {
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    paperclip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  };

  /* ---------- filter groups ---------- */
  function classOptions() { return window.PlayStore.getByType('Class'); }
  function staffOptions() { return window.PlayStore.getByType('Staff'); }

  const FILTER_GROUPS = [
    { key: 'types', label: 'Event type', options: () => TYPE_ORDER.map((k) => ({ key: k, label: EVENT_TYPES[k].label })) },
    { key: 'classes', label: 'Class', options: () => classOptions().map((c) => ({ key: c.id, label: c.name })) },
  ];

  /* ---------- page state ---------- */
  let view = window.innerWidth < 768 ? 'agenda' : 'month';
  let focusDate = todayDate();
  let selectedDate = todayDate();
  const filters = { types: new Set(), classes: new Set() };
  let editingEventId = null;
  let editingOccDate = null;
  let formSnapshot = null;
  let pendingDeleteRef = null; // { event, occDate, isSeriesOnly }
  let pendingScope = null; // { mode: 'edit'|'delete', event, occDate, apply(scope) }
  let pendingMove = null; // { event, occDate, newDate, newStartTime, newEndTime }
  let dragPayload = null;
  let role = window.PlayShell.getDemoRole();

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', (e) => { role = e.detail.role; render(); });
  window.addEventListener('resize', () => { renderViewIndicator(); });

  function init() {
    window.PlayShell.login();
    window.PlayShell.mount('calendar', 'Calendar');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    renderLegend();
    wireToolbar();
    wireViewTabs();
    wireFilterSheet();
    wireEventModal();
    wireDrawer();
    wireScopeModal();
    wireDeleteConfirm();
    wireDiscardConfirm();
    wireMoveConfirm();
    wireDayPopover();

    window.setTimeout(() => {
      $('calSkeleton').hidden = true;
      $('calViews').hidden = false;
      render();
      maybeOpenFromQuery();
    }, 450);
  }

  function maybeOpenFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event');
    const date = params.get('date');
    if (!eventId) return;
    const ev = window.PlayStore.getById(eventId);
    if (!ev) return;
    openDrawer(ev, date || ev.startDate);
  }

  /* ---------- data helpers ---------- */
  function allEvents() { return window.PlayStore.getByType('Event'); }
  function classNameById(id) { const c = window.PlayStore.getById(id); return c ? c.name : id; }
  function staffNameById(id) { const s = window.PlayStore.getById(id); return s ? s.name : id; }
  function classNamesFor(ev) {
    const classes = classOptions();
    if (!ev.classIds || !ev.classIds.length) return classes.map((c) => c.name);
    return classes.filter((c) => ev.classIds.includes(c.id)).map((c) => c.name);
  }
  function childrenFor(ev) {
    const names = classNamesFor(ev);
    return window.PlayStore.getByType('Child').filter((c) => names.includes(c.room) && c.status !== 'Withdrawn');
  }
  function eligibleGuardiansFor(ev) {
    const children = childrenFor(ev);
    const seen = new Map();
    children.forEach((c) => {
      const g = c.guardianId ? window.PlayStore.getById(c.guardianId) : null;
      if (g && !seen.has(g.id)) seen.set(g.id, g);
    });
    return Array.from(seen.values());
  }

  /* ---------- recurrence engine ---------- */
  function dayBeforeISO(iso) { return toISODate(addDays(parseISODate(iso), -1)); }

  function occurrenceDatesInRange(ev, rangeStart, rangeEnd) {
    const baseStart = parseISODate(ev.startDate);
    const freq = (ev.recurrence && ev.recurrence.freq) || 'none';
    const until = ev.recurrence && ev.recurrence.until ? parseISODate(ev.recurrence.until) : null;
    const dates = [];
    if (freq === 'none') {
      if (baseStart <= rangeEnd && (!until || baseStart <= until)) dates.push(toISODate(baseStart));
      return dates;
    }
    if (freq === 'weekly') {
      // Jump the cursor close to rangeStart first (preserving the weekday
      // offset by skipping whole weeks) so a long-lived series doesn't have
      // to iterate week-by-week from its original start date every time.
      let cursor = new Date(baseStart);
      if (cursor < rangeStart) {
        const weeksToSkip = Math.floor((rangeStart - cursor) / (7 * 86400000));
        if (weeksToSkip > 0) cursor = addDays(cursor, weeksToSkip * 7);
      }
      let i = 0;
      while (cursor <= rangeEnd && i < 1000) {
        if (until && cursor > until) break;
        if (cursor >= baseStart) dates.push(toISODate(cursor));
        cursor = addDays(cursor, 7);
        i += 1;
      }
      return dates;
    }
    if (freq === 'monthly') {
      const originalDay = baseStart.getDate();
      // Same idea: start counting months from near rangeStart instead of
      // always walking forward from the series' original start date.
      let n = Math.max(0, (rangeStart.getFullYear() - baseStart.getFullYear()) * 12 + (rangeStart.getMonth() - baseStart.getMonth()) - 1);
      let i = 0;
      while (i < 600) {
        const occ = addMonthsClamped(baseStart, n, originalDay);
        if (occ > rangeEnd) break;
        if (until && occ > until) break;
        if (occ >= baseStart) dates.push(toISODate(occ));
        n += 1;
        i += 1;
      }
      return dates;
    }
    return dates;
  }

  function computeOccurrenceInstance(ev, occDateISO) {
    const exception = (ev.exceptions && ev.exceptions[occDateISO]) || null;
    if (exception && exception.cancelled) return null;

    const baseStartDate = ev.startDate;
    const baseEndDate = ev.endDate || ev.startDate;
    const shiftDays = (() => {
      const a = parseISODate(baseStartDate);
      const b = parseISODate(occDateISO);
      return Math.round((b - a) / 86400000);
    })();
    const spanDays = (() => {
      const a = parseISODate(baseStartDate);
      const b = parseISODate(baseEndDate);
      return Math.round((b - a) / 86400000);
    })();

    let startDate = exception && exception.startDate ? exception.startDate : toISODate(addDays(parseISODate(baseStartDate), shiftDays));
    let endDate = exception && exception.endDate ? exception.endDate : toISODate(addDays(parseISODate(startDate), spanDays));

    const merged = Object.assign({}, ev, exception || {});
    merged.startDate = startDate;
    merged.endDate = endDate;
    merged.occDate = occDateISO;
    merged.eventId = ev.id;
    merged.seriesId = ev.seriesId || ev.id;
    merged.isException = !!exception;
    merged.isRecurring = (ev.recurrence && ev.recurrence.freq && ev.recurrence.freq !== 'none') ? true : false;

    const startDT = merged.allDay ? parseISODate(startDate) : new Date(startDate + 'T' + (merged.startTime || '00:00'));
    const endDT = merged.allDay ? addDays(parseISODate(endDate), 1) : new Date(endDate + 'T' + (merged.endTime || '23:59'));
    merged.startDT = startDT;
    merged.endDT = endDT;
    return merged;
  }

  function expandEvent(ev, rangeStart, rangeEnd) {
    const dates = occurrenceDatesInRange(ev, rangeStart, rangeEnd);
    const out = [];
    dates.forEach((iso) => {
      const occ = computeOccurrenceInstance(ev, iso);
      if (!occ) return;
      if (occ.endDT < rangeStart || occ.startDT > addDays(rangeEnd, 1)) return;
      out.push(occ);
    });
    return out;
  }

  function expandAll(rangeStart, rangeEnd) {
    const out = [];
    allEvents().forEach((ev) => { out.push(...expandEvent(ev, rangeStart, rangeEnd)); });
    out.sort((a, b) => a.startDT - b.startDT);
    return out;
  }

  function passesFilters(occ) {
    if (filters.types.size && !filters.types.has(occ.eventType)) return false;
    if (filters.classes.size) {
      const ids = occ.classIds || [];
      if (!ids.some((id) => filters.classes.has(id))) return false;
    }
    return true;
  }

  /* ---------- view range + title ---------- */
  function getViewRange() {
    if (view === 'month') {
      const gridStart = startOfWeek(startOfMonth(focusDate));
      return { start: gridStart, end: addDays(gridStart, 41) };
    }
    if (view === 'week') {
      const start = startOfWeek(focusDate);
      return { start, end: addDays(start, 6) };
    }
    if (view === 'day') {
      return { start: new Date(focusDate), end: new Date(focusDate) };
    }
    // agenda — rolling 30-day window anchored at focusDate
    return { start: new Date(focusDate), end: addDays(focusDate, 29) };
  }

  function renderTitle() {
    const r = getViewRange();
    let text;
    if (view === 'month') text = focusDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    else if (view === 'week') {
      text = r.start.getMonth() === r.end.getMonth()
        ? `${formatDateShort(r.start)} – ${r.end.getDate()}, ${r.end.getFullYear()}`
        : `${formatDateShort(r.start)} – ${formatDateShort(r.end)}, ${r.end.getFullYear()}`;
    } else if (view === 'day') text = formatDateLong(focusDate);
    else text = `${formatDateShort(r.start)} – ${formatDateShort(r.end)}, ${r.end.getFullYear()}`;
    $('calTitle').textContent = text;
  }

  /* ---------- toolbar / navigation ---------- */
  function wireToolbar() {
    $('calTodayBtn').addEventListener('click', () => { focusDate = todayDate(); selectedDate = todayDate(); render(); });
    $('calPrevBtn').addEventListener('click', () => { step(-1); });
    $('calNextBtn').addEventListener('click', () => { step(1); });
    $('calNewEventBtn').addEventListener('click', () => openEventForm({}));
    $('calFab').addEventListener('click', () => openEventForm({}));
  }
  function step(dir) {
    if (view === 'month') focusDate = addMonthsClamped(focusDate, dir, 1);
    else if (view === 'week') focusDate = addDays(focusDate, dir * 7);
    else if (view === 'day') focusDate = addDays(focusDate, dir);
    else focusDate = addDays(focusDate, dir * 30);
    render();
  }

  function wireViewTabs() {
    document.querySelectorAll('#calViewTabs [data-view]').forEach((btn) => {
      btn.addEventListener('click', () => { view = btn.dataset.view; render(); });
    });
  }
  function renderViewIndicator() {
    document.querySelectorAll('#calViewTabs .tabs__tab').forEach((btn) => {
      btn.setAttribute('aria-selected', String(btn.dataset.view === view));
    });
    const activeBtn = document.querySelector(`#calViewTabs [data-view="${view}"]`);
    const indicator = $('calViewIndicator');
    if (activeBtn && indicator) {
      indicator.style.left = activeBtn.offsetLeft + 'px';
      indicator.style.width = activeBtn.offsetWidth + 'px';
    }
  }

  /* ---------- legend ---------- */
  function renderLegend() {
    $('calLegend').innerHTML = TYPE_ORDER.map((k) => `
      <span class="cal-legend__item"><span class="cal-legend__swatch ${EVENT_TYPES[k].chip}"></span>${escapeHtml(EVENT_TYPES[k].label)}</span>
    `).join('');
  }

  /* ---------- filters: dropdowns (desktop) + sheet (mobile) + chips ---------- */
  function renderToolbarFilters() {
    const wrap = $('calFiltersDesktop');
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
        <button class="cal-filter-trigger${selected.size ? ' has-value' : ''}" type="button" aria-haspopup="true" aria-expanded="false">
          <span>${escapeHtml(label)}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <span class="filter-dropdown__panel" role="menu">
          ${options.map((o) => `
            <span class="check-row">
              <input type="checkbox" class="checkbox" id="cfg-${group.key}-${escapeHtml(o.key)}" data-group="${group.key}" value="${escapeHtml(o.key)}" ${selected.has(o.key) ? 'checked' : ''} />
              <label for="cfg-${group.key}-${escapeHtml(o.key)}">${escapeHtml(o.label)}</label>
            </span>`).join('') || '<p class="card__text" style="font-size:var(--fs-caption); padding: var(--space-2) var(--space-3);">None yet.</p>'}
        </span>
      </span>`;
  }
  function wireFilterDropdown(el) {
    const trigger = el.querySelector('.cal-filter-trigger');
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
        if (reopened) { reopened.classList.add('is-open'); }
      });
    });
  }
  document.addEventListener('click', () => document.querySelectorAll('.filter-dropdown.is-open').forEach((p) => p.classList.remove('is-open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.filter-dropdown.is-open').forEach((p) => p.classList.remove('is-open')); });

  function updateFilterCountBadge() {
    const count = filters.types.size + filters.classes.size;
    const badge = $('calFilterCount');
    if (count) { badge.hidden = false; badge.textContent = String(count); } else badge.hidden = true;
  }

  function filterLabelFor(groupKey, valueKey) {
    const group = FILTER_GROUPS.find((g) => g.key === groupKey);
    const opt = group.options().find((o) => o.key === valueKey);
    return opt ? opt.label : valueKey;
  }
  function renderChips() {
    const row = $('calChipRow');
    const chips = [];
    FILTER_GROUPS.forEach((g) => { filters[g.key].forEach((val) => chips.push({ group: g.key, value: val, text: `${g.label}: ${filterLabelFor(g.key, val)}` })); });
    if (!chips.length) { row.hidden = true; row.innerHTML = ''; return; }
    row.hidden = false;
    row.innerHTML = chips.map((c) => `
      <span class="chip" data-chip-group="${c.group}" data-chip-value="${escapeHtml(c.value)}">
        ${escapeHtml(c.text)}
        <span class="chip__remove" role="button" tabindex="0" aria-label="Remove filter ${escapeHtml(c.text)}">&times;</span>
      </span>`).join('') + `<button class="cal-chip-row__clear" type="button" id="calClearAllChips">Clear all</button>`;
    row.querySelectorAll('.chip__remove').forEach((btn) => {
      const chipEl = btn.closest('.chip');
      const act = () => { filters[chipEl.dataset.chipGroup].delete(chipEl.dataset.chipValue); render(); };
      btn.addEventListener('click', act);
      btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    });
    const clearBtn = $('calClearAllChips');
    if (clearBtn) clearBtn.addEventListener('click', clearFilters);
  }
  function clearFilters() { FILTER_GROUPS.forEach((g) => filters[g.key].clear()); render(); }

  function wireFilterSheet() {
    $('calFilterSheetBtn').addEventListener('click', () => {
      $('filterSheetBackdrop').classList.add('is-open');
      document.body.style.overflow = 'hidden';
    });
    $('filterSheetBackdrop').addEventListener('click', (e) => { if (e.target.id === 'filterSheetBackdrop') closeFilterSheet(); });
    $('filterSheetClear').addEventListener('click', clearFilters);
    $('filterSheetApply').addEventListener('click', closeFilterSheet);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFilterSheet(); });
  }
  function closeFilterSheet() { $('filterSheetBackdrop').classList.remove('is-open'); document.body.style.overflow = ''; }
  function renderFilterSheetBody() {
    const body = $('filterSheetBody');
    body.innerHTML = FILTER_GROUPS.map((g) => `
      <div class="sheet__group">
        <div class="sheet__group-label">${escapeHtml(g.label)}</div>
        ${g.options().map((o) => `
          <div class="check-row" style="margin-bottom: var(--space-2);">
            <input type="checkbox" class="checkbox" id="sfg-${g.key}-${escapeHtml(o.key)}" data-group="${g.key}" value="${escapeHtml(o.key)}" ${filters[g.key].has(o.key) ? 'checked' : ''} />
            <label for="sfg-${g.key}-${escapeHtml(o.key)}" style="font-size: var(--fs-body-sm);">${escapeHtml(o.label)}</label>
          </div>`).join('') || '<p class="card__text" style="font-size: var(--fs-caption);">None yet.</p>'}
      </div>`).join('');
    body.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const set = filters[cb.dataset.group];
        if (cb.checked) set.add(cb.value); else set.delete(cb.value);
        render();
      });
    });
  }

  /* ========================================================================
     RENDER ORCHESTRATION
     ======================================================================== */
  function render() {
    renderTitle();
    renderToolbarFilters();
    renderFilterSheetBody();
    renderChips();
    renderViewIndicator();

    document.querySelectorAll('.cal-view-panel').forEach((el) => { el.hidden = el.dataset.panel !== view; });
    const r = getViewRange();
    const occurrences = expandAll(r.start, r.end).filter(passesFilters);

    if (view === 'month') renderMonth(r, occurrences);
    else if (view === 'week') renderWeek(r, occurrences);
    else if (view === 'day') renderDay(r, occurrences);
    else renderAgenda(r, occurrences);

    const isEmpty = occurrences.length === 0 && (filters.types.size > 0 || filters.classes.size > 0);
    $('calEmptyState').hidden = !isEmpty || view === 'month' || view === 'week' || view === 'day';
    if (isEmpty && view === 'agenda') {
      $('calEmptyIcon').innerHTML = ICON.inbox;
      $('calEmptyTitle').textContent = 'No events match these filters';
      $('calEmptyText').textContent = 'Try a different date range or clear your filters.';
      $('calEmptyAction').innerHTML = '<button class="btn btn--secondary" type="button" id="calEmptyClearBtn">Clear filters</button>';
      const btn = $('calEmptyClearBtn');
      if (btn) btn.addEventListener('click', clearFilters);
    }
  }

  /* ---------- MONTH VIEW ---------- */
  function renderMonth(range, occurrences) {
    const panel = $('calMonthPanel');
    const byDate = {};
    occurrences.forEach((occ) => {
      let cursor = new Date(Math.max(occ.startDT, range.start));
      const last = new Date(Math.min(occ.endDT, addDays(range.end, 1)));
      while (cursor < last) {
        const iso = toISODate(cursor);
        (byDate[iso] = byDate[iso] || []).push(occ);
        cursor = addDays(cursor, 1);
      }
    });

    const today = todayDate();
    let cellsHtml = '';
    for (let i = 0; i < 42; i += 1) {
      const d = addDays(range.start, i);
      const iso = toISODate(d);
      const isOutside = d.getMonth() !== focusDate.getMonth();
      const isToday = sameDate(d, today);
      const isSelected = sameDate(d, selectedDate);
      const dayEvents = (byDate[iso] || []).sort((a, b) => (a.allDay === b.allDay ? a.startDT - b.startDT : a.allDay ? -1 : 1));
      const visible = dayEvents.slice(0, 3);
      const overflow = dayEvents.length - visible.length;
      cellsHtml += `
        <div class="cal-day${isOutside ? ' is-outside' : ''}${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}" data-date="${iso}">
          ${dayEvents.length > 4 ? '<span class="cal-day__busy" title="Busy day"></span>' : ''}
          <span class="cal-day__num" data-date-num="${iso}" tabindex="0" role="button" aria-label="Open ${iso}">${d.getDate()}</span>
          <div class="cal-day__events">
            ${visible.map((occ) => chipHtml(occ)).join('')}
            ${overflow > 0 ? `<button class="cal-chip cal-chip--more" type="button" data-more="${iso}">+${overflow} more</button>` : ''}
          </div>
          <div class="cal-day__dots">${dayEvents.slice(0, 4).map((occ) => `<span class="cal-day__dot" style="background:var(--color-text-muted);" data-dot-type="${occ.eventType}"></span>`).join('')}</div>
        </div>`;
    }
    panel.innerHTML = `
      <div class="cal-month">
        <div class="cal-month__weekdays">${WEEKDAY_LABELS.map((w) => `<div class="cal-month__weekday">${w}</div>`).join('')}</div>
        <div class="cal-month__grid" id="calMonthGrid">${cellsHtml}</div>
      </div>`;
    colorDots(panel);
    wireMonthCells(panel);
  }
  function colorDots(panel) {
    panel.querySelectorAll('[data-dot-type]').forEach((dot) => {
      const t = EVENT_TYPES[dot.dataset.dotType];
      if (!t) return;
      dot.className = 'cal-day__dot ' + t.chip;
      dot.style.background = '';
    });
  }
  function chipHtml(occ) {
    const t = EVENT_TYPES[occ.eventType] || EVENT_TYPES.event;
    const timeLabel = occ.allDay ? '' : formatTime(occ.startTime) + ' ';
    return `<div class="cal-chip ${t.chip}" draggable="true" data-event-id="${occ.eventId}" data-occ="${occ.occDate}" tabindex="0" role="button" aria-label="${escapeHtml(occ.title)}">
      <span class="cal-chip__dot"></span><span>${escapeHtml(timeLabel + occ.title)}</span>
    </div>`;
  }
  function wireMonthCells(panel) {
    panel.querySelectorAll('.cal-chip[data-event-id]').forEach((chip) => wireEventChip(chip));
    panel.querySelectorAll('[data-more]').forEach((btn) => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); openDayPopover(btn.dataset.more, btn); });
    });
    panel.querySelectorAll('[data-date-num]').forEach((num) => {
      const go = (e) => {
        e.stopPropagation();
        selectedDate = parseISODate(num.dataset.dateNum);
        focusDate = new Date(selectedDate);
        view = 'day';
        render();
      };
      num.addEventListener('click', go);
      num.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); } });
    });
    panel.querySelectorAll('.cal-day').forEach((cell) => {
      cell.addEventListener('click', (e) => {
        if (e.target.closest('[data-event-id]') || e.target.closest('[data-more]') || e.target.closest('[data-date-num]')) return;
        openEventForm({ prefillDate: cell.dataset.date, allDay: true });
      });
      cell.addEventListener('dragover', (e) => { e.preventDefault(); cell.classList.add('is-dragover'); });
      cell.addEventListener('dragleave', () => cell.classList.remove('is-dragover'));
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('is-dragover');
        if (!dragPayload) return;
        handleDrop(dragPayload, cell.dataset.date, null, null);
      });
    });
  }

  function wireEventChip(chip) {
    chip.addEventListener('click', (e) => { e.stopPropagation(); const ev = window.PlayStore.getById(chip.dataset.eventId); if (ev) openDrawer(ev, chip.dataset.occ); });
    chip.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const ev = window.PlayStore.getById(chip.dataset.eventId); if (ev) openDrawer(ev, chip.dataset.occ); } });
    chip.addEventListener('dragstart', (e) => {
      dragPayload = { eventId: chip.dataset.eventId, occDate: chip.dataset.occ };
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', JSON.stringify(dragPayload)); } catch (err) { /* ignore */ }
    });
    chip.addEventListener('dragend', () => { dragPayload = null; });
  }

  /* ---------- day "+N more" popover ---------- */
  function openDayPopover(iso, anchorEl) {
    const r = getViewRange();
    const occs = expandAll(parseISODate(iso), parseISODate(iso)).filter(passesFilters);
    const pop = $('calDayPopover');
    $('calDayPopoverTitle').textContent = formatDateMed(parseISODate(iso));
    $('calDayPopoverList').innerHTML = occs.map((occ) => `
      <div class="cal-agenda-card" style="padding: var(--space-3); animation:none; opacity:1; transform:none;" data-event-id="${occ.eventId}" data-occ="${occ.occDate}">
        <div class="cal-agenda-card__time">${occ.allDay ? 'All day' : formatTime(occ.startTime)}</div>
        <div class="cal-agenda-card__body">
          <div class="cal-agenda-card__title-row"><span class="${EVENT_TYPES[occ.eventType].badge}">${escapeHtml(EVENT_TYPES[occ.eventType].label)}</span><span class="cal-agenda-card__title">${escapeHtml(occ.title)}</span></div>
        </div>
      </div>`).join('');
    pop.querySelectorAll('[data-event-id]').forEach((row) => row.addEventListener('click', () => { closeDayPopover(); const ev = window.PlayStore.getById(row.dataset.eventId); if (ev) openDrawer(ev, row.dataset.occ); }));
    const rect = anchorEl.getBoundingClientRect();
    pop.style.top = Math.min(rect.bottom + 6, window.innerHeight - 340) + 'px';
    pop.style.left = Math.min(rect.left, window.innerWidth - 310) + 'px';
    pop.hidden = false;
    requestAnimationFrame(() => pop.classList.add('is-open'));
  }
  function closeDayPopover() { const pop = $('calDayPopover'); pop.classList.remove('is-open'); window.setTimeout(() => { pop.hidden = true; }, 180); }
  function wireDayPopover() {
    $('calDayPopoverClose').addEventListener('click', closeDayPopover);
    document.addEventListener('click', (e) => { const pop = $('calDayPopover'); if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('[data-more]')) closeDayPopover(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDayPopover(); });
  }

  /* ---------- WEEK / DAY VIEW (shared time grid) ---------- */
  function renderTimeGrid(panel, days, occurrences) {
    const hours = [];
    for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h += 1) hours.push(h);
    const isWeek = days.length > 1;
    const today = todayDate();

    const allDayOccs = occurrences.filter((o) => o.allDay);
    const timedOccs = occurrences.filter((o) => !o.allDay);

    const headHtml = isWeek ? `
      <div class="cal-week-head">
        <div></div>
        <div class="cal-week-head__days">${days.map((d) => `
          <div class="cal-week-head__day${sameDate(d, today) ? ' is-today' : ''}">
            <div class="cal-week-head__dow">${WEEKDAY_LABELS[d.getDay()]}</div>
            <div class="cal-week-head__num">${d.getDate()}</div>
          </div>`).join('')}</div>
      </div>` : '';

    const alldayHtml = `
      <div class="cal-allday">
        <div class="cal-allday__label">All day</div>
        <div class="cal-allday__row${isWeek ? ' cal-allday__row--week' : ''}" style="${isWeek ? '' : 'grid-template-columns:1fr;'}">
          ${days.map((d) => {
            const iso = toISODate(d);
            const list = allDayOccs.filter((o) => o.startDT <= addDays(d, 1) && o.endDT > d);
            return `<div>${list.map((occ) => `<div class="cal-allday__chip ${EVENT_TYPES[occ.eventType].chip}" data-event-id="${occ.eventId}" data-occ="${occ.occDate}" tabindex="0" role="button">${escapeHtml(occ.title)}</div>`).join('')}</div>`;
          }).join('')}
        </div>
      </div>`;

    function layoutDayEvents(list) {
      const sorted = list.slice().sort((a, b) => a.startDT - b.startDT);
      const laneEnds = [];
      const placed = sorted.map((occ) => {
        let lane = laneEnds.findIndex((end) => end <= occ.startDT);
        if (lane === -1) { lane = laneEnds.length; laneEnds.push(occ.endDT); } else laneEnds[lane] = occ.endDT;
        return { occ, lane };
      });
      const totalLanes = laneEnds.length || 1;
      return placed.map((p) => Object.assign({}, p, { totalLanes }));
    }

    const gridTotalMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60;
    function eventBlockHtml(occ, lane, totalLanes) {
      const startMin = Math.max(0, (occ.startDT.getHours() * 60 + occ.startDT.getMinutes()) - DAY_START_HOUR * 60);
      let endMin = (occ.endDT.getHours() * 60 + occ.endDT.getMinutes()) - DAY_START_HOUR * 60;
      if (occ.endDT.getDate() !== occ.startDT.getDate() || endMin <= startMin) endMin = gridTotalMinutes;
      endMin = Math.min(endMin, gridTotalMinutes);
      const top = (startMin / gridTotalMinutes) * 100;
      const height = Math.max(((endMin - startMin) / gridTotalMinutes) * 100, 3);
      const width = 100 / totalLanes;
      const left = lane * width;
      const t = EVENT_TYPES[occ.eventType];
      return `<div class="cal-event-block ${t.chip}" draggable="true" data-event-id="${occ.eventId}" data-occ="${occ.occDate}" tabindex="0" role="button"
        style="top:${top}%; height:${height}%; width:calc(${width}% - 4px); left:calc(${left}% + 2px);">
        <span class="cal-event-block__time">${formatTime(occ.startTime)}</span>${escapeHtml(occ.title)}
      </div>`;
    }

    const nowMinutes = (() => { const n = new Date(); return (n.getHours() * 60 + n.getMinutes()) - DAY_START_HOUR * 60; })();
    const showNowLine = nowMinutes >= 0 && nowMinutes <= gridTotalMinutes;

    const colsHtml = days.map((d) => {
      const iso = toISODate(d);
      const dayTimed = timedOccs.filter((o) => sameDate(o.startDT, d) || (o.startDT < d && o.endDT > d));
      const placed = layoutDayEvents(dayTimed);
      const isToday = sameDate(d, today);
      return `<div class="cal-day-col${isToday ? ' is-today' : ''}" data-date="${iso}">
        ${hours.map((h) => `<div class="cal-hour-row" data-hour="${h}"></div>`).join('')}
        ${placed.map((p) => eventBlockHtml(p.occ, p.lane, p.totalLanes)).join('')}
        ${isToday && showNowLine ? `<div class="cal-now-line" style="top:${(nowMinutes / gridTotalMinutes) * 100}%;"></div>` : ''}
      </div>`;
    }).join('');

    panel.innerHTML = `
      <div class="cal-timegrid-wrap">
        ${headHtml}
        ${alldayHtml}
        <div class="cal-timegrid-scroll">
          <div class="cal-timegrid">
            <div class="cal-timegrid__hours">${hours.map((h) => `<div class="cal-hour-label">${formatTime(pad2(h) + ':00')}</div>`).join('')}</div>
            <div class="cal-timegrid__days cal-timegrid__days--${isWeek ? 'week' : 'day'}">${colsHtml}</div>
          </div>
        </div>
      </div>`;

    panel.querySelectorAll('[data-event-id]').forEach((el) => wireEventChip(el));
    panel.querySelectorAll('.cal-hour-row').forEach((row) => {
      row.addEventListener('click', () => {
        const col = row.closest('[data-date]');
        const hour = Number(row.dataset.hour);
        openEventForm({ prefillDate: col.dataset.date, prefillStartTime: pad2(hour) + ':00', prefillEndTime: pad2(hour + 1) + ':00', allDay: false });
      });
      row.addEventListener('dragover', (e) => { e.preventDefault(); row.closest('[data-date]').classList.add('is-dragover'); });
      row.addEventListener('dragleave', () => row.closest('[data-date]').classList.remove('is-dragover'));
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        const col = row.closest('[data-date]');
        col.classList.remove('is-dragover');
        if (!dragPayload) return;
        handleDrop(dragPayload, col.dataset.date, pad2(Number(row.dataset.hour)) + ':00', null);
      });
    });
  }
  function renderWeek(range, occurrences) {
    const days = []; for (let i = 0; i < 7; i += 1) days.push(addDays(range.start, i));
    renderTimeGrid($('calWeekPanel'), days, occurrences);
  }
  function renderDay(range, occurrences) {
    renderTimeGrid($('calDayPanel'), [new Date(focusDate)], occurrences);
  }

  /* ---------- AGENDA VIEW ---------- */
  function renderAgenda(range, occurrences) {
    const panel = $('calAgendaPanel');
    if (!occurrences.length) { panel.innerHTML = ''; return; }
    const byDate = {};
    occurrences.forEach((occ) => { (byDate[occ.occDate] = byDate[occ.occDate] || []).push(occ); });
    const dates = Object.keys(byDate).sort();
    panel.innerHTML = `<div class="cal-agenda">${dates.map((iso) => `
      <div>
        <div class="cal-agenda__group-label">${escapeHtml(formatDateLong(parseISODate(iso)))}</div>
        <div class="cal-agenda__list">${byDate[iso].map((occ) => agendaCardHtml(occ)).join('')}</div>
      </div>`).join('')}</div>`;
    panel.querySelectorAll('[data-event-id]').forEach((el) => {
      el.addEventListener('click', () => { const ev = window.PlayStore.getById(el.dataset.eventId); if (ev) openDrawer(ev, el.dataset.occ); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const ev = window.PlayStore.getById(el.dataset.eventId); if (ev) openDrawer(ev, el.dataset.occ); } });
    });
  }
  function agendaCardHtml(occ) {
    const classNames = classNamesFor(occ).join(', ');
    return `
      <div class="cal-agenda-card" data-event-id="${occ.eventId}" data-occ="${occ.occDate}" tabindex="0" role="button">
        <div class="cal-agenda-card__time">${occ.allDay ? 'All day' : formatTime(occ.startTime) + ' – ' + formatTime(occ.endTime)}</div>
        <div class="cal-agenda-card__body">
          <div class="cal-agenda-card__title-row">
            <span class="${EVENT_TYPES[occ.eventType].badge}">${escapeHtml(EVENT_TYPES[occ.eventType].label)}</span>
            <span class="cal-agenda-card__title">${escapeHtml(occ.title)}</span>
            ${occ.isRecurring ? `<span class="cal-agenda-card__meta">${ICON.repeat}</span>` : ''}
          </div>
          <div class="cal-agenda-card__meta">
            ${occ.location ? `<span>${ICON.pin}${escapeHtml(occ.location)}</span>` : ''}
            ${classNames ? `<span>${ICON.users}${escapeHtml(classNames)}</span>` : ''}
          </div>
        </div>
      </div>`;
  }

  /* ---------- drag-and-drop: handle drop → move confirm ---------- */
  function handleDrop(payload, newDateISO, newStartTime) {
    const ev = window.PlayStore.getById(payload.eventId);
    if (!ev) return;
    const occ = computeOccurrenceInstance(ev, payload.occDate);
    if (!occ) return;
    if (occ.occDate === newDateISO && (!newStartTime || newStartTime === occ.startTime)) return;

    let newStart, newEnd;
    if (occ.allDay || !newStartTime) {
      const spanDays = Math.round((parseISODate(occ.endDate) - parseISODate(occ.startDate)) / 86400000);
      newStart = { date: newDateISO, time: occ.startTime };
      newEnd = { date: toISODate(addDays(parseISODate(newDateISO), spanDays)), time: occ.endTime };
    } else {
      const durationMin = Math.round((occ.endDT - occ.startDT) / 60000);
      const [h, m] = newStartTime.split(':').map(Number);
      const endTotal = h * 60 + m + durationMin;
      newStart = { date: newDateISO, time: newStartTime };
      newEnd = { date: newDateISO, time: pad2(Math.floor(endTotal / 60) % 24) + ':' + pad2(endTotal % 60) };
    }
    pendingMove = { event: ev, occDate: payload.occDate, occ, newStart, newEnd };
    const newLabel = formatDateMed(parseISODate(newStart.date)) + (occ.allDay ? '' : ' at ' + formatTime(newStart.time));
    $('moveConfirmText').textContent = `"${occ.title}" will move to ${newLabel}.` + (occ.requiresRSVP ? ' Families who RSVP’d will be notified of the change.' : '');
    openModal('moveConfirmBackdrop');
  }
  function wireMoveConfirm() {
    const backdrop = $('moveConfirmBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal('moveConfirmBackdrop'); });
    $('moveConfirmCancel').addEventListener('click', () => closeModal('moveConfirmBackdrop'));
    $('moveConfirmOk').addEventListener('click', () => {
      if (!pendingMove) return;
      const { event: ev, occDate, newStart, newEnd } = pendingMove;
      const isRecurring = ev.recurrence && ev.recurrence.freq && ev.recurrence.freq !== 'none';
      if (!isRecurring) {
        window.PlayStore.updateRecord(ev.id, { startDate: newStart.date, startTime: newStart.time, endDate: newEnd.date, endTime: newEnd.time });
      } else {
        const exceptions = Object.assign({}, ev.exceptions);
        exceptions[occDate] = Object.assign({}, exceptions[occDate], { startDate: newStart.date, startTime: newStart.time, endDate: newEnd.date, endTime: newEnd.time });
        window.PlayStore.updateRecord(ev.id, { exceptions });
      }
      if (pendingMove.occ.requiresRSVP) {
        eligibleGuardiansFor(pendingMove.occ).forEach((g) => {
          window.PlayShell.addNotification({ title: 'Event moved', text: `"${pendingMove.occ.title}" moved to ${formatDateMed(parseISODate(newStart.date))}.`, module: null, recordRoute: `calendar.html?event=${ev.id}&date=${newStart.date}` });
        });
      }
      closeModal('moveConfirmBackdrop');
      pendingMove = null;
      render();
      window.PlayShell.toast('success', 'Event moved', 'The calendar has been updated.');
    });
  }

  /* ========================================================================
     EVENT FORM (create / edit)
     ======================================================================== */
  function populateTypeSelect() {
    $('evType').innerHTML = TYPE_ORDER.map((k) => `<option value="${k}">${escapeHtml(EVENT_TYPES[k].label)}</option>`).join('');
  }
  function populateClassChecklist(selected) {
    $('evClassList').innerHTML = classOptions().map((c) => `
      <div class="check-row"><input type="checkbox" class="checkbox" id="evcls-${c.id}" value="${c.id}" ${selected && selected.includes(c.id) ? 'checked' : ''} /><label for="evcls-${c.id}">${escapeHtml(c.name)}</label></div>
    `).join('') || '<p class="card__text" style="font-size:var(--fs-caption);">No classes yet.</p>';
  }
  function populateStaffChecklist(selected) {
    $('evStaffList').innerHTML = staffOptions().map((s) => `
      <div class="check-row"><input type="checkbox" class="checkbox" id="evstf-${s.id}" value="${s.id}" ${selected && selected.includes(s.id) ? 'checked' : ''} /><label for="evstf-${s.id}">${escapeHtml(s.name)}</label></div>
    `).join('') || '<p class="card__text" style="font-size:var(--fs-caption);">No staff yet.</p>';
  }

  function serializeForm() {
    return JSON.stringify({
      title: $('evTitle').value, type: $('evType').value, allDay: $('evAllDay').checked,
      startDate: $('evStartDate').value, startTime: $('evStartTime').value,
      endDate: $('evEndDate').value, endTime: $('evEndTime').value,
      repeat: $('evRepeat').value, location: $('evLocation').value,
      classes: checkedValues('evClassList'), staff: checkedValues('evStaffList'),
      rsvp: $('evRSVP').checked, consent: $('evConsent').checked, description: $('evDescription').value,
    });
  }
  function checkedValues(containerId) {
    return Array.from(document.querySelectorAll('#' + containerId + ' input[type="checkbox"]:checked')).map((cb) => cb.value);
  }
  function isFormDirty() { return formSnapshot !== null && serializeForm() !== formSnapshot; }

  function toggleAllDayFields() {
    const allDay = $('evAllDay').checked;
    $('evStartTimeField').hidden = allDay;
    $('evEndTimeField').hidden = allDay;
  }

  function openEventForm(opts) {
    const { event, occDate, prefillDate, prefillStartTime, prefillEndTime, allDay } = opts || {};
    editingEventId = event ? event.id : null;
    editingOccDate = event ? occDate : null;
    populateTypeSelect();

    const today = toISODate(selectedDate || todayDate());
    let occ = null;
    if (event) occ = computeOccurrenceInstance(event, occDate);

    $('eventModalTitle').textContent = event ? 'Edit event' : 'New event';
    $('eventModalSaveLabel').textContent = event ? 'Save changes' : 'Save event';

    $('evTitle').value = occ ? occ.title : '';
    $('evType').value = occ ? occ.eventType : 'event';
    $('evAllDay').checked = occ ? !!occ.allDay : !!allDay;
    $('evStartDate').value = occ ? occ.startDate : (prefillDate || today);
    $('evEndDate').value = occ ? occ.endDate : (prefillDate || today);
    $('evStartTime').value = occ ? (occ.startTime || '09:00') : (prefillStartTime || '09:00');
    $('evEndTime').value = occ ? (occ.endTime || '10:00') : (prefillEndTime || '10:00');
    $('evRepeat').value = event ? ((event.recurrence && event.recurrence.freq) || 'none') : 'none';
    $('evLocation').value = occ ? (occ.location || '') : '';
    populateClassChecklist(occ ? occ.classIds : []);
    populateStaffChecklist(occ ? occ.staffIds : []);
    $('evRSVP').checked = occ ? !!occ.requiresRSVP : false;
    $('evConsent').checked = occ ? !!occ.requiresConsent : false;
    $('evDescription').value = occ ? (occ.description || '') : '';
    $('evAttachment').value = '';
    $('evAttachmentName').textContent = occ && occ.attachmentName ? `Current: ${occ.attachmentName}` : '';

    toggleAllDayFields();
    toggleConsentVisibility();
    ['evTitle', 'evStartDate', 'evEndDate', 'evDates'].forEach((id) => setFieldError(id, null));

    openModal('eventModalBackdrop');
    formSnapshot = serializeForm();
    $('evTitle').focus();
  }

  function toggleConsentVisibility() {
    $('evConsentRow').hidden = $('evType').value !== 'trip';
    if ($('evType').value !== 'trip') $('evConsent').checked = false;
  }

  function wireEventModal() {
    $('evAllDay').addEventListener('change', toggleAllDayFields);
    $('evType').addEventListener('change', toggleConsentVisibility);
    $('evAttachment').addEventListener('change', () => {
      const f = $('evAttachment').files[0];
      $('evAttachmentName').textContent = f ? `Selected: ${f.name} (stored as a reference only in this demo)` : '';
    });

    const backdrop = $('eventModalBackdrop');
    const tryClose = () => { if (isFormDirty()) openModal('discardConfirmBackdrop'); else closeModal('eventModalBackdrop'); };
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) tryClose(); });
    $('eventModalCancel').addEventListener('click', tryClose);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) tryClose(); });

    $('eventModalSave').addEventListener('click', onSaveEventClicked);
  }

  function validateForm() {
    let ok = true;
    const title = $('evTitle').value.trim();
    if (!title) { setFieldError('evTitle', 'Give this event a title.'); ok = false; } else setFieldError('evTitle', null);

    const allDay = $('evAllDay').checked;
    const sD = $('evStartDate').value, eD = $('evEndDate').value;
    const sT = $('evStartTime').value, eT = $('evEndTime').value;
    if (!sD || !eD) { setFieldError('evStartDate', 'Start and end dates are required.'); ok = false; } else setFieldError('evStartDate', null);
    if (!allDay && (!sT || !eT)) { setFieldError('evDates', 'Start and end time are required.'); ok = false; }
    else if (sD && eD) {
      const startDT = allDay ? parseISODate(sD) : new Date(sD + 'T' + sT);
      const endDT = allDay ? parseISODate(eD) : new Date(eD + 'T' + eT);
      if (endDT < startDT) { setFieldError('evDates', 'End must not be before start.'); ok = false; }
      else setFieldError('evDates', null);
    }
    return ok;
  }
  function setFieldError(inputId, message) {
    const errorEl = $('err-' + inputId);
    if (!errorEl) return;
    const input = $(inputId);
    if (message) { errorEl.textContent = message; errorEl.hidden = false; if (input) input.closest('.field').classList.add('is-error'); }
    else { errorEl.hidden = true; if (input) input.closest('.field').classList.remove('is-error'); }
  }

  function readFormData() {
    return {
      title: $('evTitle').value.trim(),
      eventType: $('evType').value,
      allDay: $('evAllDay').checked,
      startDate: $('evStartDate').value,
      startTime: $('evAllDay').checked ? null : $('evStartTime').value,
      endDate: $('evEndDate').value,
      endTime: $('evAllDay').checked ? null : $('evEndTime').value,
      location: $('evLocation').value.trim(),
      classIds: checkedValues('evClassList'),
      staffIds: checkedValues('evStaffList'),
      requiresRSVP: $('evRSVP').checked,
      requiresConsent: $('evConsent').checked,
      description: $('evDescription').value.trim(),
      attachmentName: $('evAttachment').files[0] ? $('evAttachment').files[0].name : ($('evAttachmentName').textContent.indexOf('Current:') === 0 ? $('evAttachmentName').textContent.replace('Current: ', '') : null),
    };
  }

  function submitWithLoading(btnId, work) {
    const btn = $(btnId);
    if (btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading'); btn.disabled = true;
    window.setTimeout(() => { work(); btn.classList.remove('is-loading'); btn.disabled = false; }, 400);
  }

  function onSaveEventClicked() {
    if (!validateForm()) return;
    const data = readFormData();
    const repeat = $('evRepeat').value;

    if (!editingEventId) {
      submitWithLoading('eventModalSave', () => {
        const id = 'EVT-' + Date.now().toString(36).toUpperCase();
        const record = Object.assign({ id, type: 'Event', seriesId: id, recurrence: { freq: repeat, until: null }, exceptions: {}, rsvps: {}, consents: {} }, data);
        window.PlayStore.addRecord(record);
        closeModal('eventModalBackdrop');
        formSnapshot = null;
        render();
        window.PlayShell.toast('success', 'Event saved', `"${data.title}" has been added to the calendar.`);
        window.PlayShell.addNotification({ title: 'New calendar event', text: `${data.title} on ${formatDateMed(parseISODate(data.startDate))}.`, module: null, recordRoute: `calendar.html?event=${id}&date=${data.startDate}` });
      });
      return;
    }

    const ev = window.PlayStore.getById(editingEventId);
    if (!ev) return;
    const isRecurring = ev.recurrence && ev.recurrence.freq && ev.recurrence.freq !== 'none';
    if (!isRecurring) {
      submitWithLoading('eventModalSave', () => { applySeriesEdit(ev, data, repeat); finishSave(data); });
      return;
    }
    openScopeModal('edit', ev, editingOccDate, (scope) => {
      submitWithLoading('eventModalSave', () => {
        if (scope === 'only') applyOccurrenceEdit(ev, editingOccDate, data);
        else if (scope === 'following') applyFollowingEdit(ev, editingOccDate, data, repeat);
        else applySeriesEdit(ev, data, repeat);
        finishSave(data);
      });
    });
  }
  function finishSave(data) {
    closeModal('eventModalBackdrop');
    formSnapshot = null;
    render();
    window.PlayShell.toast('success', 'Event updated', `"${data.title}" has been updated.`);
  }
  function applyOccurrenceEdit(ev, occDate, data) {
    const exceptions = Object.assign({}, ev.exceptions);
    exceptions[occDate] = Object.assign({}, data);
    window.PlayStore.updateRecord(ev.id, { exceptions });
  }
  function applyFollowingEdit(ev, occDate, data, repeat) {
    window.PlayStore.updateRecord(ev.id, { recurrence: { freq: ev.recurrence.freq, until: dayBeforeISO(occDate) } });
    const newId = 'EVT-' + Date.now().toString(36).toUpperCase();
    const record = Object.assign({ id: newId, type: 'Event', seriesId: newId, recurrence: { freq: repeat, until: null }, exceptions: {}, rsvps: {}, consents: {} }, data);
    window.PlayStore.addRecord(record);
  }
  function applySeriesEdit(ev, data, repeat) {
    window.PlayStore.updateRecord(ev.id, Object.assign({}, data, { recurrence: { freq: repeat, until: (ev.recurrence && ev.recurrence.until) || null }, exceptions: {} }));
  }

  function wireDiscardConfirm() {
    $('discardCancel').addEventListener('click', () => closeModal('discardConfirmBackdrop'));
    $('discardConfirm').addEventListener('click', () => { closeModal('discardConfirmBackdrop'); closeModal('eventModalBackdrop'); formSnapshot = null; });
    $('discardConfirmBackdrop').addEventListener('click', (e) => { if (e.target.id === 'discardConfirmBackdrop') closeModal('discardConfirmBackdrop'); });
  }

  /* ---------- scope modal (edit / delete of recurring events) ---------- */
  function openScopeModal(mode, ev, occDate, apply) {
    pendingScope = { mode, event: ev, occDate, apply };
    $('scopeModalTitle').textContent = mode === 'delete' ? 'Delete recurring event' : 'This is a recurring event';
    $('scopeModalText').textContent = mode === 'delete' ? 'Which events would you like to delete?' : 'Which events would you like to update?';
    document.querySelector('#scopeModalOptions input[value="only"]').checked = true;
    openModal('scopeModalBackdrop');
  }
  function wireScopeModal() {
    const backdrop = $('scopeModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal('scopeModalBackdrop'); });
    $('scopeModalCancel').addEventListener('click', () => closeModal('scopeModalBackdrop'));
    $('scopeModalConfirm').addEventListener('click', () => {
      const scope = document.querySelector('#scopeModalOptions input[name="scope"]:checked').value;
      const action = pendingScope && pendingScope.apply;
      closeModal('scopeModalBackdrop');
      if (action) action(scope);
      pendingScope = null;
    });
  }

  /* ========================================================================
     EVENT DETAILS DRAWER
     ======================================================================== */
  function openDrawer(ev, occDate) {
    const occ = computeOccurrenceInstance(ev, occDate || ev.startDate);
    if (!occ) return;
    const t = EVENT_TYPES[occ.eventType];
    const classNames = classNamesFor(occ);
    const staffNames = (occ.staffIds || []).map(staffNameById);

    let dateLine;
    if (occ.allDay) dateLine = formatDateLong(parseISODate(occ.startDate)) + (occ.endDate !== occ.startDate ? ` – ${formatDateLong(parseISODate(occ.endDate))}` : '') + ' · All day';
    else dateLine = `${formatDateLong(parseISODate(occ.startDate))} · ${formatTime(occ.startTime)} – ${formatTime(occ.endTime)}`;

    let rsvpHtml = '';
    if (occ.requiresRSVP) {
      const guardians = eligibleGuardiansFor(occ);
      const rsvps = ev.rsvps || {};
      const yes = guardians.filter((g) => rsvps[g.id] === 'yes');
      const no = guardians.filter((g) => rsvps[g.id] === 'no');
      const noReply = guardians.filter((g) => !rsvps[g.id]);
      rsvpHtml = `
        <div class="cal-drawer__section">
          <span class="cal-drawer__label">RSVP</span>
          <div class="cal-rsvp-row">
            <div class="cal-rsvp-stat"><div class="cal-rsvp-stat__value" style="color:var(--color-success);">${yes.length}</div><div class="cal-rsvp-stat__label">Yes</div></div>
            <div class="cal-rsvp-stat"><div class="cal-rsvp-stat__value" style="color:var(--color-error);">${no.length}</div><div class="cal-rsvp-stat__label">No</div></div>
            <div class="cal-rsvp-stat"><div class="cal-rsvp-stat__value" style="color:var(--color-text-muted);">${noReply.length}</div><div class="cal-rsvp-stat__label">No reply</div></div>
          </div>
          <div class="cal-rsvp-list">${guardians.map((g) => `<div class="cal-rsvp-list__row"><span>${escapeHtml(g.name)}</span><span class="badge ${rsvps[g.id] === 'yes' ? 'badge--success' : rsvps[g.id] === 'no' ? 'badge--error' : 'badge--neutral'}">${rsvps[g.id] === 'yes' ? 'Yes' : rsvps[g.id] === 'no' ? 'No' : 'No reply'}</span></div>`).join('') || '<p class="card__text" style="font-size:var(--fs-caption);">No eligible families for the selected classes.</p>'}</div>
          ${noReply.length ? '<button class="btn btn--secondary btn--sm" type="button" id="drawerRemindBtn">Remind non-responders</button>' : ''}
        </div>`;
    }

    let consentHtml = '';
    if (occ.requiresConsent) {
      const children = childrenFor(occ);
      const consents = ev.consents || {};
      const given = children.filter((c) => consents[c.id]);
      const pending = children.filter((c) => !consents[c.id]);
      consentHtml = `
        <div class="cal-drawer__section">
          <span class="cal-drawer__label">Trip consent</span>
          <div class="cal-rsvp-row">
            <div class="cal-rsvp-stat"><div class="cal-rsvp-stat__value" style="color:var(--color-success);">${given.length}</div><div class="cal-rsvp-stat__label">Consent given</div></div>
            <div class="cal-rsvp-stat"><div class="cal-rsvp-stat__value" style="color:var(--color-warning);">${pending.length}</div><div class="cal-rsvp-stat__label">Pending</div></div>
          </div>
          <div class="cal-rsvp-list">${children.map((c) => `<div class="cal-rsvp-list__row"><span>${escapeHtml(c.name)}</span><span class="badge ${consents[c.id] ? 'badge--success' : 'badge--warning'}">${consents[c.id] ? 'Given' : 'Pending'}</span></div>`).join('') || '<p class="card__text" style="font-size:var(--fs-caption);">No children in the selected classes.</p>'}</div>
        </div>`;
    }

    $('eventDrawerBody').innerHTML = `
      <div class="cal-drawer__type-row">
        <span class="${t.badge}">${escapeHtml(t.label)}</span>
        ${occ.isRecurring ? `<span class="badge badge--neutral">${ICON.repeat} Repeats ${escapeHtml((ev.recurrence.freq))}</span>` : ''}
      </div>
      <h2 style="font-family:var(--font-display); font-size:var(--fs-h3); font-weight:600;">${escapeHtml(occ.title)}</h2>
      <div class="cal-drawer__value">${ICON.clock}${escapeHtml(dateLine)}</div>
      ${occ.location ? `<div class="cal-drawer__value">${ICON.pin}${escapeHtml(occ.location)}</div>` : ''}
      ${classNames.length ? `<div class="cal-drawer__section"><span class="cal-drawer__label">Classes involved</span><div class="cal-drawer__chips">${classNames.map((n) => `<span class="badge badge--neutral">${escapeHtml(n)}</span>`).join('')}</div></div>` : ''}
      ${staffNames.length ? `<div class="cal-drawer__section"><span class="cal-drawer__label">Staff involved</span><div class="cal-drawer__chips">${staffNames.map((n) => `<span class="badge badge--neutral">${escapeHtml(n)}</span>`).join('')}</div></div>` : ''}
      ${occ.description ? `<div class="cal-drawer__section"><span class="cal-drawer__label">Description</span><p class="card__text">${escapeHtml(occ.description)}</p></div>` : ''}
      ${occ.attachmentName ? `<div class="cal-drawer__value">${ICON.paperclip}${escapeHtml(occ.attachmentName)}</div>` : ''}
      ${rsvpHtml}
      ${consentHtml}
      <div class="cal-drawer__actions">
        <button class="btn btn--secondary btn--sm" type="button" id="drawerEditBtn">Edit</button>
        <button class="btn btn--destructive btn--sm" type="button" id="drawerDeleteBtn">Delete</button>
      </div>
    `;

    $('drawerEditBtn').addEventListener('click', () => { closeDrawer(); openEventForm({ event: ev, occDate: occ.occDate }); });
    $('drawerDeleteBtn').addEventListener('click', () => requestDelete(ev, occ.occDate));
    const remindBtn = $('drawerRemindBtn');
    if (remindBtn) remindBtn.addEventListener('click', () => remindNonResponders(ev, occ));

    document.querySelector('.drawer__title').textContent = occ.title;
    $('eventDrawerBackdrop').classList.add('is-open');
    $('eventDrawer').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    $('eventDrawerBackdrop').classList.remove('is-open');
    $('eventDrawer').classList.remove('is-open');
    document.body.style.overflow = '';
  }
  function wireDrawer() {
    $('eventDrawerBackdrop').addEventListener('click', closeDrawer);
    document.querySelectorAll('[data-close-drawer]').forEach((btn) => btn.addEventListener('click', closeDrawer));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('eventDrawer').classList.contains('is-open')) closeDrawer(); });
  }

  function remindNonResponders(ev, occ) {
    const guardians = eligibleGuardiansFor(occ);
    const rsvps = ev.rsvps || {};
    const noReply = guardians.filter((g) => !rsvps[g.id]);
    noReply.forEach((g) => {
      window.PlayShell.addNotification({ title: 'RSVP reminder', text: `Please respond to "${occ.title}" on ${formatDateMed(parseISODate(occ.startDate))}.`, module: null, recordRoute: `calendar.html?event=${ev.id}&date=${occ.occDate}` });
    });
    window.PlayShell.toast('success', 'Reminder sent (demo)', `${noReply.length} ${noReply.length === 1 ? 'family was' : 'families were'} notified in-app. This demo has no real email/SMS delivery.`);
  }

  /* ---------- delete flow ---------- */
  function requestDelete(ev, occDate) {
    const isRecurring = ev.recurrence && ev.recurrence.freq && ev.recurrence.freq !== 'none';
    if (!isRecurring) {
      pendingDeleteRef = { event: ev, occDate, scope: 'series' };
      openModal('deleteConfirmBackdrop');
      return;
    }
    openScopeModal('delete', ev, occDate, (scope) => {
      pendingDeleteRef = { event: ev, occDate, scope };
      performDelete();
    });
  }
  function wireDeleteConfirm() {
    $('deleteConfirmBackdrop').addEventListener('click', (e) => { if (e.target.id === 'deleteConfirmBackdrop') closeModal('deleteConfirmBackdrop'); });
    $('deleteConfirmCancel').addEventListener('click', () => closeModal('deleteConfirmBackdrop'));
    $('deleteConfirmOk').addEventListener('click', () => { closeModal('deleteConfirmBackdrop'); performDelete(); });
  }
  function performDelete() {
    const ref = pendingDeleteRef;
    if (!ref) return;
    const { event: ev, occDate, scope } = ref;
    if (scope === 'series') {
      window.PlayStore.removeRecord(ev.id);
    } else if (scope === 'following') {
      window.PlayStore.updateRecord(ev.id, { recurrence: { freq: ev.recurrence.freq, until: dayBeforeISO(occDate) } });
    } else {
      const exceptions = Object.assign({}, ev.exceptions);
      exceptions[occDate] = { cancelled: true };
      window.PlayStore.updateRecord(ev.id, { exceptions });
    }
    pendingDeleteRef = null;
    closeDrawer();
    render();
    window.PlayShell.toast('success', 'Event deleted', 'The calendar has been updated.');
  }

  /* ---------- generic modal plumbing ---------- */
  function openModal(id) { const b = $(id); b.classList.add('is-open'); b.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const b = $(id); b.classList.remove('is-open'); b.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
})();
