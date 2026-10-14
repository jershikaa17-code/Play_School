/* ==========================================================================
   PLAY SCHOOL — School Tours (S06)
   Reuses: store.js ('TourSlot'/'TourBooking' records via the same flat
   PlayStore.addRecord/updateRecord/getByType API as every other page),
   modules.js, shell.js (shell/toasts/notifications), calendar.css (the
   week time-grid — .cal-timegrid-wrap/.cal-week-head/.cal-hour-label/
   .cal-day-col/.cal-hour-row/.cal-event-block — reused for layout, with
   tour-specific slot/booking treatments in tours.css). No competing store.

   Honest limitation: this is a static, frontend-only demo with no shared
   backend. Capacity/duplicate/guide checks below are real (re-read the
   latest record state immediately before saving) but only protect against
   conflicting actions within THIS browser tab — there is no transaction or
   lock that would also protect against two different users booking the
   same slot from two different browsers at the same moment. That would
   need a real backend; it does not exist here, and this comment is the
   closest thing to "deploy" documentation for that limitation.

   Admissions integration: a booking updates the same 'Enquiry' record
   admissions.js/applicant-profile.js already use — same stage/history/
   activities fields — so all three pages stay in sync automatically
   (same localStorage-backed store, same browser/session).
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function toISODate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
  function sameDate(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function todayDate() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function todayISO() { return toISODate(todayDate()); }
  function startOfWeek(d) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0, 0, 0, 0); return r; }
  function formatTime(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + (m ? ':' + pad2(m) : '') + ' ' + period;
  }
  function formatDateMed(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function timeToMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
  function minutesToTime(mins) { return pad2(Math.floor(mins / 60)) + ':' + pad2(mins % 60); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }

  const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_START_HOUR = 7;
  const DAY_END_HOUR = 19;
  const ACTIVE_STATUSES = ['Booked', 'Attended', 'No-show'];
  const STAGES = ['Enquiry', 'Tour booked', 'Applied', 'Offer sent', 'Enrolled'];

  let weekStart = startOfWeek(todayDate());
  let mobileDate = todayDate();
  let pendingSlot = null; // { id, date, startTime, endTime, guideId, guideName, maxFamilies }
  let bookTab = 'link';
  let selectedEnquiryId = null;
  let bookSubmitting = false;
  let pendingCancelBookingId = null;
  let drawerSlotId = null;
  let rescheduleBookingId = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    window.PlayShell.login();
    window.PlayShell.mount('tours', 'School Tours');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    wireWeekNav();
    wireManageSlotsModal();
    wireBookModal();
    wireDrawer();
    wireCancelModal();
    wireModals();
    window.addEventListener('resize', debounce(render, 150));

    render();
  }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  /* ---------- data access ---------- */
  function slots() { return window.PlayStore.getByType('TourSlot'); }
  function bookings() { return window.PlayStore.getByType('TourBooking'); }
  function bookingsForSlot(slotId) { return bookings().filter((b) => b.slotId === slotId); }
  function activeBookingsForSlot(slotId) { return bookingsForSlot(slotId).filter((b) => ACTIVE_STATUSES.indexOf(b.status) !== -1); }
  function occupancy(slot) { return activeBookingsForSlot(slot.id).length; }
  function remaining(slot) { return slot.maxFamilies - occupancy(slot); }
  function slotState(slot) {
    const occ = occupancy(slot);
    if (occ >= slot.maxFamilies) return 'full';
    if (occ > 0) return 'partial';
    return 'open';
  }
  function slotsOnDate(iso) { return slots().filter((s) => s.date === iso).sort((a, b) => a.startTime.localeCompare(b.startTime)); }

  function render() {
    renderWeekRange();
    renderDaySelect();
    const days = []; for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i));
    applyResponsiveHost();
    if (window.innerWidth < 768) renderDayList(mobileDate);
    else renderWeekGrid(days);
    renderUpcoming();
  }
  function applyResponsiveHost() {
    const mobile = window.innerWidth < 768;
    $('trCalendarHost').style.display = mobile ? 'none' : '';
    $('trDayListHost').style.display = mobile ? '' : 'none';
  }

  /* ---------- week nav ---------- */
  function wireWeekNav() {
    $('trPrevWeek').addEventListener('click', () => { weekStart = addDays(weekStart, -7); render(); });
    $('trNextWeek').addEventListener('click', () => { weekStart = addDays(weekStart, 7); render(); });
    $('trTodayBtn').addEventListener('click', () => { weekStart = startOfWeek(todayDate()); mobileDate = todayDate(); render(); });
  }
  function renderWeekRange() {
    const end = addDays(weekStart, 6);
    const el = $('trWeekRange');
    el.textContent = `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    el.classList.add('is-changing');
    requestAnimationFrame(() => el.classList.remove('is-changing'));
  }
  function renderDaySelect() {
    const days = []; for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i));
    const today = todayDate();
    $('trDaySelect').innerHTML = days.map((d) => {
      const iso = toISODate(d);
      return `<button class="tr-day-select__btn${sameDate(d, mobileDate) ? ' is-active' : ''}" type="button" data-day="${iso}">
        <span>${WEEKDAY_LABELS[d.getDay()]}</span><span class="tr-day-select__num">${d.getDate()}</span>
      </button>`;
    }).join('');
    $('trDaySelect').querySelectorAll('[data-day]').forEach((btn) => {
      btn.addEventListener('click', () => { mobileDate = new Date(btn.dataset.day + 'T00:00:00'); render(); });
    });
  }

  /* ---------- week grid (desktop/tablet) ---------- */
  function renderWeekGrid(days) {
    const today = todayDate();
    const hours = []; for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) hours.push(h);
    const gridTotalMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60;

    const headHtml = `
      <div class="cal-week-head">
        <div></div>
        <div class="cal-week-head__days">${days.map((d) => `
          <div class="cal-week-head__day${sameDate(d, today) ? ' is-today' : ''}">
            <div class="cal-week-head__dow">${WEEKDAY_LABELS[d.getDay()]}</div>
            <div class="cal-week-head__num">${d.getDate()}</div>
          </div>`).join('')}</div>
      </div>`;

    const colsHtml = days.map((d) => {
      const iso = toISODate(d);
      const daySlots = slotsOnDate(iso);
      const isToday = sameDate(d, today);
      return `<div class="cal-day-col${isToday ? ' is-today' : ''}" data-date="${iso}">
        ${hours.map((h) => `<div class="cal-hour-row"></div>`).join('')}
        ${daySlots.map((s) => slotBlockHtml(s, gridTotalMinutes)).join('')}
      </div>`;
    }).join('');

    $('trCalendarHost').innerHTML = `
      <div class="cal-timegrid-wrap">
        ${headHtml}
        <div class="cal-timegrid-scroll">
          <div class="cal-timegrid">
            <div class="cal-timegrid__hours">${hours.map((h) => `<div class="cal-hour-label">${formatTime(pad2(h) + ':00')}</div>`).join('')}</div>
            <div class="cal-timegrid__days cal-timegrid__days--week">${colsHtml}</div>
          </div>
        </div>
      </div>`;
    wireSlotBlocks($('trCalendarHost'));
  }
  function slotBlockHtml(s, gridTotalMinutes) {
    const startMin = Math.max(0, timeToMinutes(s.startTime) - DAY_START_HOUR * 60);
    let endMin = timeToMinutes(s.endTime) - DAY_START_HOUR * 60;
    const top = (startMin / gridTotalMinutes) * 100;
    const height = Math.max(((endMin - startMin) / gridTotalMinutes) * 100, 2.2);
    const state = slotState(s);
    const occ = occupancy(s);
    const label = state === 'open' ? `Open · 0/${s.maxFamilies}` : state === 'full' ? `Full · ${occ}/${s.maxFamilies}` : `${occ}/${s.maxFamilies} booked`;
    return `
      <div class="cal-event-block tr-slot tr-slot--${state}" data-slot-id="${s.id}" tabindex="0" role="button"
        aria-label="${escapeHtml(formatDateMed(s.date))} ${escapeHtml(formatTime(s.startTime))} with ${escapeHtml(s.guideName)} — ${escapeHtml(label)}"
        style="top:${top}%; height:${height}%; left:3px; right:3px;">
        <span class="tr-slot__time">${escapeHtml(formatTime(s.startTime))}</span>
        <span class="tr-slot__meta">${escapeHtml(s.guideName)}</span>
        <span class="tr-slot__capacity">${escapeHtml(label)}</span>
      </div>`;
  }
  function wireSlotBlocks(container) {
    container.querySelectorAll('[data-slot-id]').forEach((el) => {
      const open = () => onSlotClick(el.dataset.slotId);
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }
  function onSlotClick(slotId) {
    const slot = slots().find((s) => s.id === slotId);
    if (!slot) return;
    if (occupancy(slot) === 0) {
      if (slot.date < todayISO()) { window.PlayShell.toast('info', 'This slot is in the past', 'Past slots are kept for history and can no longer be booked.'); return; }
      openBookModal(slot);
    } else {
      openSlotDrawer(slotId);
    }
  }

  /* ---------- mobile day list ---------- */
  function renderDayList(date) {
    const iso = toISODate(date);
    const daySlots = slotsOnDate(iso);
    $('trDayListHost').innerHTML = daySlots.length ? daySlots.map((s) => {
      const state = slotState(s);
      const occ = occupancy(s);
      const label = state === 'open' ? `Open · 0/${s.maxFamilies}` : state === 'full' ? `Full · ${occ}/${s.maxFamilies}` : `${occ}/${s.maxFamilies} booked`;
      return `
        <div class="tr-slot-row tr-slot-row--${state}" data-slot-id="${s.id}" tabindex="0" role="button">
          <span class="tr-slot-row__time">${escapeHtml(formatTime(s.startTime))}</span>
          <span class="tr-slot-row__body">${escapeHtml(s.guideName)} · ${escapeHtml(label)}</span>
        </div>`;
    }).join('') : `<div class="state-panel"><div class="state-panel__title">No tours scheduled</div><p class="state-panel__text">No slots are set up for this day yet.</p></div>`;
    wireSlotBlocks($('trDayListHost'));
  }

  /* ---------- upcoming tours ---------- */
  function renderUpcoming() {
    const today = todayISO();
    const list = bookings()
      .filter((b) => b.date >= today && b.status !== 'Cancelled')
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .slice(0, 25);
    const host = $('trUpcomingList');
    if (!list.length) {
      host.innerHTML = `<div class="profile-empty"><div>No upcoming tours booked yet.</div></div>`;
      return;
    }
    host.innerHTML = list.map((b) => `
      <div class="tr-upcoming-item" data-slot-id="${b.slotId}">
        <span class="tr-upcoming-item__time">${escapeHtml(formatDateMed(b.date))}<br/>${escapeHtml(formatTime(b.startTime))}</span>
        <span class="tr-upcoming-item__body">
          <span class="tr-upcoming-item__name">${escapeHtml(b.parentName)}${b.childName ? ' · ' + escapeHtml(b.childName) : ''}</span>
          <span class="tr-upcoming-item__meta">${escapeHtml(b.guideName)} · <span class="badge ${bookingBadgeClass(b.status)}" style="margin-left:4px;">${escapeHtml(b.status)}</span></span>
        </span>
      </div>`).join('');
    host.querySelectorAll('[data-slot-id]').forEach((el) => el.addEventListener('click', () => openSlotDrawer(el.dataset.slotId)));
  }
  function bookingBadgeClass(status) {
    if (status === 'Attended') return 'badge--success';
    if (status === 'No-show') return 'badge--error';
    if (status === 'Cancelled') return 'badge--neutral';
    return 'badge--primary';
  }

  /* ========================================================================
     MANAGE SLOTS MODAL
     ======================================================================== */
  function wireManageSlotsModal() {
    $('trManageSlotsBtn').addEventListener('click', openManageSlotsModal);
    ['tmDays', 'tmStart', 'tmEnd', 'tmDuration', 'tmBreak', 'tmCapacity', 'tmGuide', 'tmRecurStart', 'tmRecurEnd'].forEach((id) => {
      const el = $(id);
      const target = id === 'tmDays' ? $('tmDays') : el;
      target.addEventListener('input', renderManagePreview);
      target.addEventListener('change', renderManagePreview);
    });
    $('tmSave').addEventListener('click', saveManageSlots);
  }
  function openManageSlotsModal() {
    const staff = window.PlayStore.getByType('Staff').filter((s) => s.status === 'Active');
    $('tmGuide').innerHTML = staff.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    $('tmName').value = '';
    $('tmDays').querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
    $('tmStart').value = '09:00'; $('tmEnd').value = '11:00';
    $('tmDuration').value = '30'; $('tmBreak').value = '15'; $('tmCapacity').value = '3';
    $('tmRecurStart').value = todayISO();
    const in4Weeks = addDays(todayDate(), 28);
    $('tmRecurEnd').value = toISODate(in4Weeks);
    clearFieldError('tmDays'); clearFieldError('tmGeneral');
    openModal('trManageSlotsBackdrop');
    renderManagePreview();
  }
  function selectedDays() {
    return Array.from($('tmDays').querySelectorAll('input[type="checkbox"]:checked')).map((cb) => Number(cb.value));
  }
  function computeCandidateSlots() {
    const days = selectedDays();
    const start = $('tmStart').value, end = $('tmEnd').value;
    const duration = Number($('tmDuration').value) || 0;
    const brk = Number($('tmBreak').value) || 0;
    const capacity = Number($('tmCapacity').value) || 0;
    const guideId = $('tmGuide').value;
    const guideStaff = window.PlayStore.getById(guideId);
    const recurStart = $('tmRecurStart').value, recurEnd = $('tmRecurEnd').value;
    const result = { candidates: [], conflicts: [], errors: [] };
    if (!days.length) result.errors.push('Choose at least one day of the week.');
    if (!start || !end || timeToMinutes(end) <= timeToMinutes(start)) result.errors.push('End time must be after start time.');
    if (duration <= 0) result.errors.push('Tour duration must be greater than zero.');
    if (capacity <= 0) result.errors.push('Max families must be at least 1.');
    if (!guideId) result.errors.push('Choose a tour guide.');
    if (!recurStart || !recurEnd || recurEnd < recurStart) result.errors.push('End date must be on or after the start date.');
    if (result.errors.length) return result;

    const existing = slots();
    let d = new Date(recurStart + 'T00:00:00');
    const last = new Date(recurEnd + 'T00:00:00');
    while (d <= last) {
      if (days.indexOf(d.getDay()) !== -1) {
        const dateISO = toISODate(d);
        let cursor = timeToMinutes(start);
        const endMin = timeToMinutes(end);
        while (cursor + duration <= endMin) {
          const slotStart = minutesToTime(cursor);
          const slotEnd = minutesToTime(cursor + duration);
          const conflict = existing.find((s) => s.guideId === guideId && s.date === dateISO &&
            timeToMinutes(s.startTime) < cursor + duration && timeToMinutes(s.endTime) > cursor);
          const candidate = { date: dateISO, startTime: slotStart, endTime: slotEnd, guideId, guideName: guideStaff ? guideStaff.name : '', maxFamilies: capacity, patternName: $('tmName').value.trim() || null };
          if (conflict) result.conflicts.push(candidate);
          else result.candidates.push(candidate);
          cursor += duration + brk;
        }
      }
      d = addDays(d, 1);
    }
    return result;
  }
  function renderManagePreview() {
    const r = computeCandidateSlots();
    const preview = $('tmPreview');
    if (r.errors.length) {
      preview.innerHTML = `<strong>Fix the following before previewing:</strong><ul style="margin-top:6px; padding-left:18px;">${r.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`;
      return;
    }
    preview.innerHTML = `
      <strong>${r.candidates.length}</strong> new slot${r.candidates.length === 1 ? '' : 's'} will be created across the selected date range.
      ${r.conflicts.length ? `<div class="tr-preview__conflicts">${r.conflicts.length} slot${r.conflicts.length === 1 ? '' : 's'} skipped — the guide already has a slot at that date/time: ${r.conflicts.slice(0, 5).map((c) => escapeHtml(formatDateMed(c.date) + ' ' + formatTime(c.startTime))).join(', ')}${r.conflicts.length > 5 ? '…' : ''}</div>` : ''}`;
  }
  function saveManageSlots() {
    clearFieldError('tmDays'); clearFieldError('tmGeneral');
    const r = computeCandidateSlots();
    if (r.errors.length) { setFieldError('tmGeneral', r.errors.join(' ')); return; }
    if (!r.candidates.length) { setFieldError('tmGeneral', 'No new slots to create — every candidate conflicts with an existing slot.'); return; }
    r.candidates.forEach((c) => {
      window.PlayStore.addRecord(Object.assign({ id: uid('TSLOT'), type: 'TourSlot' }, c));
    });
    closeModal('trManageSlotsBackdrop');
    window.PlayShell.toast('success', 'Tour slots created', `${r.candidates.length} slot${r.candidates.length === 1 ? '' : 's'} added${r.conflicts.length ? `, ${r.conflicts.length} skipped due to conflicts` : ''}.`);
    render();
  }

  /* ========================================================================
     BOOK A SLOT
     ======================================================================== */
  function wireBookModal() {
    document.querySelectorAll('[data-book-tab]').forEach((btn) => {
      btn.addEventListener('click', () => { bookTab = btn.dataset.bookTab; renderBookTabs(); renderBookBody(); });
    });
    $('trBookConfirm').addEventListener('click', confirmBooking);
  }
  function openBookModal(slot) {
    pendingSlot = slot;
    bookTab = 'link';
    selectedEnquiryId = null;
    bookSubmitting = false;
    $('err-trBookCapacity').hidden = true;
    renderBookSummary();
    renderBookTabs();
    renderBookBody();
    openModal('trBookBackdrop');
  }
  function renderBookSummary() {
    const occ = occupancy(pendingSlot);
    $('trBookSummary').innerHTML = `
      <span><strong>${escapeHtml(formatDateMed(pendingSlot.date))}</strong></span>
      <span>${escapeHtml(formatTime(pendingSlot.startTime))}–${escapeHtml(formatTime(pendingSlot.endTime))}</span>
      <span>Guide: ${escapeHtml(pendingSlot.guideName)}</span>
      <span>${occ}/${pendingSlot.maxFamilies} booked · ${remaining(pendingSlot)} remaining</span>`;
  }
  function renderBookTabs() {
    document.querySelectorAll('[data-book-tab]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.bookTab === bookTab)));
  }
  function renderBookBody() {
    const host = $('trBookBody');
    if (bookTab === 'link') {
      host.innerHTML = `
        <div class="field"><input class="input" id="trEnquirySearch" type="text" placeholder="Search by child, parent, phone or email…" /></div>
        <div id="trEnquiryResults"></div>`;
      $('trEnquirySearch').addEventListener('input', renderEnquiryResults);
      renderEnquiryResults();
    } else {
      host.innerHTML = `
        <div class="field"><label class="field__label" for="tbParentName">Parent / guardian name <span class="req">*</span></label><input class="input" id="tbParentName" type="text" /><p class="field__error" id="err-tbParentName" hidden></p></div>
        <div class="input-grid">
          <div class="field"><label class="field__label" for="tbPhone">Phone <span class="req">*</span></label><input class="input" id="tbPhone" type="tel" /><p class="field__error" id="err-tbPhone" hidden></p></div>
          <div class="field"><label class="field__label" for="tbEmail">Email <span class="req">*</span></label><input class="input" id="tbEmail" type="email" /><p class="field__error" id="err-tbEmail" hidden></p></div>
        </div>
        <div class="field"><label class="field__label" for="tbChildName">Child's name <span class="req">*</span></label><input class="input" id="tbChildName" type="text" /><p class="field__error" id="err-tbChildName" hidden></p></div>
        <div class="input-grid">
          <div class="field"><label class="field__label" for="tbDob">Date of birth</label><input class="input" id="tbDob" type="date" /></div>
          <div class="field"><label class="field__label" for="tbProgram">Program / class</label><select class="select" id="tbProgram"></select></div>
        </div>
        <div class="input-grid">
          <div class="field"><label class="field__label" for="tbStart">Preferred start</label><input class="input" id="tbStart" type="date" /></div>
          <div class="field"><label class="field__label" for="tbSource">Source</label>
            <select class="select" id="tbSource"><option value="Walk-in">Walk-in</option><option value="Website">Website</option><option value="Referral">Referral</option><option value="Social">Social</option><option value="Event">Event</option><option value="Other">Other</option></select>
          </div>
        </div>
        <div class="field"><label class="field__label" for="tbNotes">Notes</label><textarea class="textarea" id="tbNotes"></textarea></div>`;
      const classes = window.PlayStore.getByType('Class');
      $('tbProgram').innerHTML = '<option value="">Not set</option>' + classes.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
    }
  }
  function normalizePhone(p) { return String(p || '').replace(/\D+/g, ''); }
  function activeEnquiryBooking(enquiryId) { return bookings().find((b) => b.enquiryId === enquiryId && b.status === 'Booked'); }
  function renderEnquiryResults() {
    const q = ($('trEnquirySearch').value || '').trim().toLowerCase();
    const results = $('trEnquiryResults');
    if (!q) { results.innerHTML = '<p class="card__text" style="font-size:var(--fs-caption); color:var(--color-text-muted);">Start typing to search enquiries…</p>'; selectedEnquiryId = null; return; }
    const matches = window.PlayStore.getByType('Enquiry').filter((e) => e.stage !== 'Enrolled' && e.stage !== 'Lost' &&
      [e.childName, e.parentName, e.phone, e.email].filter(Boolean).some((v) => v.toLowerCase().includes(q))).slice(0, 10);
    if (!matches.length) { results.innerHTML = '<p class="card__text" style="font-size:var(--fs-caption); color:var(--color-text-muted);">No matching enquiries found.</p>'; return; }
    results.innerHTML = matches.map((e) => {
      const existing = activeEnquiryBooking(e.id);
      return `
        <div class="tr-search-result${selectedEnquiryId === e.id ? ' is-selected' : ''}" data-enquiry-id="${e.id}">
          <span>${escapeHtml(e.childName)} <span style="color:var(--color-text-muted); font-size:var(--fs-caption);">· ${escapeHtml(e.parentName)}</span>${existing ? `<br/><span style="color:var(--color-warning); font-size:var(--fs-caption);">Already has a booked tour on ${escapeHtml(formatDateMed(existing.date))}</span>` : ''}</span>
          <button class="btn btn--secondary btn--sm" type="button" data-select-enquiry="${e.id}">${selectedEnquiryId === e.id ? 'Selected' : 'Select'}</button>
        </div>`;
    }).join('');
    results.querySelectorAll('[data-select-enquiry]').forEach((btn) => {
      btn.addEventListener('click', () => { selectedEnquiryId = btn.dataset.selectEnquiry; renderEnquiryResults(); });
    });
  }
  function confirmBooking() {
    if (bookSubmitting || !pendingSlot) return;
    $('err-trBookCapacity').hidden = true;

    // Re-validate against the latest slot/booking state immediately before saving.
    const freshSlot = slots().find((s) => s.id === pendingSlot.id);
    if (!freshSlot) { showBookCapacityError('This slot no longer exists. Please choose another time.'); return; }
    if (remaining(freshSlot) <= 0) { showBookCapacityError('This tour slot is full. Please choose another time.'); return; }

    if (bookTab === 'link') {
      if (!selectedEnquiryId) { window.PlayShell.toast('error', 'Select a family first', 'Search and select an enquiry to book.'); return; }
      const enquiry = window.PlayStore.getById(selectedEnquiryId);
      if (!enquiry) { window.PlayShell.toast('error', 'Enquiry not found', ''); return; }
      if (activeEnquiryBooking(enquiry.id)) { showBookCapacityError('This family already has an active tour booked. Reschedule it instead of creating a new booking.'); return; }
      bookSubmitting = true;
      doBooking(freshSlot, enquiry);
    } else {
      const parentName = $('tbParentName').value.trim();
      const phone = $('tbPhone').value.trim();
      const email = $('tbEmail').value.trim();
      const childName = $('tbChildName').value.trim();
      let ok = true;
      ['tbParentName', 'tbPhone', 'tbEmail', 'tbChildName'].forEach(clearFieldError);
      if (!parentName) { setFieldError('tbParentName', 'Enter a name.'); ok = false; }
      if (!phone || normalizePhone(phone).length < 7) { setFieldError('tbPhone', 'Enter a valid phone number.'); ok = false; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('tbEmail', 'Enter a valid email.'); ok = false; }
      if (!childName) { setFieldError('tbChildName', "Enter the child's name."); ok = false; }
      if (!ok) return;
      bookSubmitting = true;
      const nowIso = new Date().toISOString();
      const enquiry = {
        id: uid('ENQ'), type: 'Enquiry', childName, dob: $('tbDob').value || null,
        parentName, phone, email, program: $('tbProgram').value || null,
        preferredStart: $('tbStart').value || null, source: $('tbSource').value,
        ownerId: null, ownerName: null, stage: 'Enquiry', createdAt: nowIso, stageEnteredAt: nowIso,
        nextFollowUp: null, notes: $('tbNotes').value.trim(), lostReason: null, lostNote: null, convertedChildId: null,
        history: [{ from: null, to: 'Enquiry', at: nowIso, actor: window.PlayShell.getDemoRole() }], activities: [],
      };
      window.PlayStore.addRecord(enquiry);
      doBooking(freshSlot, enquiry);
    }
  }
  function showBookCapacityError(msg) {
    const el = $('err-trBookCapacity');
    el.textContent = msg; el.hidden = false;
  }
  function doBooking(slot, enquiry) {
    const nowIso = new Date().toISOString();
    const booking = {
      id: uid('TBK'), type: 'TourBooking', slotId: slot.id, enquiryId: enquiry.id,
      childName: enquiry.childName, parentName: enquiry.parentName,
      date: slot.date, startTime: slot.startTime, endTime: slot.endTime,
      guideId: slot.guideId, guideName: slot.guideName,
      status: 'Booked', notes: '', noShowFollowUpCreated: false, createdAt: nowIso,
      history: [{ action: 'Booked', at: nowIso, actor: window.PlayShell.getDemoRole() }],
    };
    window.PlayStore.addRecord(booking);

    if (STAGES.indexOf(enquiry.stage) < STAGES.indexOf('Tour booked')) {
      const history = (enquiry.history || []).concat([{ from: enquiry.stage, to: 'Tour booked', at: nowIso, actor: window.PlayShell.getDemoRole() }]);
      const activities = (enquiry.activities || []).concat([{ id: uid('ACT'), type: 'tour_booked', title: `Tour booked — ${formatDateMed(slot.date)} ${formatTime(slot.startTime)} with ${slot.guideName}`, detail: '', at: nowIso, actor: window.PlayShell.getDemoRole() }]);
      window.PlayStore.updateRecord(enquiry.id, { stage: 'Tour booked', stageEnteredAt: nowIso, history, activities });
    } else {
      const activities = (enquiry.activities || []).concat([{ id: uid('ACT'), type: 'tour_booked', title: `Tour booked — ${formatDateMed(slot.date)} ${formatTime(slot.startTime)} with ${slot.guideName}`, detail: '', at: nowIso, actor: window.PlayShell.getDemoRole() }]);
      window.PlayStore.updateRecord(enquiry.id, { activities });
    }

    window.PlayShell.addNotification({
      title: 'Tour booked', text: `${enquiry.childName} is booked for a tour on ${formatDateMed(slot.date)} at ${formatTime(slot.startTime)}.`,
      forRole: 'Admin', module: 'tours', mention: true, recordRoute: 'applicant-profile.html?id=' + enquiry.id,
    });

    bookSubmitting = false;
    closeModal('trBookBackdrop');
    window.PlayShell.toast('success', 'Tour booked', `${enquiry.childName} — ${formatDateMed(slot.date)} ${formatTime(slot.startTime)}.`);
    render();
  }

  /* ========================================================================
     SLOT / BOOKING DETAILS DRAWER
     ======================================================================== */
  function wireDrawer() {
    $('trDrawerBackdrop').addEventListener('click', closeDrawer);
    document.querySelector('[data-close-drawer]').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('trDrawer').classList.contains('is-open')) closeDrawer(); });
  }
  function openSlotDrawer(slotId) {
    drawerSlotId = slotId;
    rescheduleBookingId = null;
    renderDrawerBody();
    $('trDrawer').classList.add('is-open');
    $('trDrawerBackdrop').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    $('trDrawer').classList.remove('is-open');
    $('trDrawerBackdrop').classList.remove('is-open');
    document.body.style.overflow = '';
    drawerSlotId = null;
  }
  function renderDrawerBody() {
    const slot = slots().find((s) => s.id === drawerSlotId);
    if (!slot) { closeDrawer(); return; }
    $('trDrawerTitle').textContent = `${formatDateMed(slot.date)} · ${formatTime(slot.startTime)}`;
    const list = bookingsForSlot(slot.id).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const canBookMore = remaining(slot) > 0;
    $('trDrawerBody').innerHTML = `
      <div class="tr-drawer-row"><span class="tr-drawer-row__label">Date</span><span class="tr-drawer-row__value">${escapeHtml(formatDateMed(slot.date))}</span></div>
      <div class="tr-drawer-row"><span class="tr-drawer-row__label">Time</span><span class="tr-drawer-row__value">${escapeHtml(formatTime(slot.startTime))}–${escapeHtml(formatTime(slot.endTime))}</span></div>
      <div class="tr-drawer-row"><span class="tr-drawer-row__label">Guide</span><span class="tr-drawer-row__value">${escapeHtml(slot.guideName)}</span></div>
      <div class="tr-drawer-row"><span class="tr-drawer-row__label">Capacity</span><span class="tr-drawer-row__value">${occupancy(slot)}/${slot.maxFamilies} (${remaining(slot)} remaining)</span></div>
      <div style="margin-top: var(--space-5);">
        <div class="profile-card__title" style="margin-bottom: var(--space-3);">Bookings</div>
        ${list.length ? list.map(bookingCardHtml).join('') : '<div class="profile-empty"><div>No bookings for this slot.</div></div>'}
      </div>
      ${canBookMore ? `<button class="btn btn--accent" type="button" id="trDrawerBookMore" style="width:100%;">Book another family</button>` : ''}`;
    list.forEach((b) => wireBookingCardActions(b));
    const more = $('trDrawerBookMore');
    if (more) more.addEventListener('click', () => { closeDrawer(); openBookModal(slot); });
  }
  function bookingCardHtml(b) {
    return `
      <div class="tr-booking-card" data-booking-id="${b.id}">
        <div class="tr-booking-card__head">
          <span class="tr-booking-card__name">${escapeHtml(b.parentName)}${b.childName ? ' · ' + escapeHtml(b.childName) : ''}</span>
          <span class="badge ${bookingBadgeClass(b.status)}">${escapeHtml(b.status)}</span>
        </div>
        <div class="tr-booking-card__meta">Booked ${formatDateTime(b.createdAt)}${b.notes ? ' · ' + escapeHtml(b.notes) : ''}</div>
        ${b.status === 'Booked' ? `
        <div class="tr-booking-card__actions">
          <button class="btn btn--secondary btn--sm" type="button" data-action="attended">Mark attended</button>
          <button class="btn btn--secondary btn--sm" type="button" data-action="noshow">Mark no-show</button>
          <button class="btn btn--secondary btn--sm" type="button" data-action="reschedule">Reschedule</button>
          <button class="btn btn--destructive btn--sm" type="button" data-action="cancel">Cancel</button>
        </div>` : ''}
      </div>`;
  }
  function wireBookingCardActions(b) {
    const card = document.querySelector(`[data-booking-id="${b.id}"]`);
    if (!card) return;
    const attended = card.querySelector('[data-action="attended"]');
    const noshow = card.querySelector('[data-action="noshow"]');
    const reschedule = card.querySelector('[data-action="reschedule"]');
    const cancel = card.querySelector('[data-action="cancel"]');
    if (attended) attended.addEventListener('click', () => markAttended(b.id));
    if (noshow) noshow.addEventListener('click', () => markNoShow(b.id));
    if (reschedule) reschedule.addEventListener('click', () => openReschedule(b.id));
    if (cancel) cancel.addEventListener('click', () => { pendingCancelBookingId = b.id; openModal('trCancelBackdrop'); });
  }
  function bookingActivity(enquiryId, type, title) {
    const enquiry = window.PlayStore.getById(enquiryId);
    if (!enquiry) return;
    const nowIso = new Date().toISOString();
    const activities = (enquiry.activities || []).concat([{ id: uid('ACT'), type, title, detail: '', at: nowIso, actor: window.PlayShell.getDemoRole() }]);
    window.PlayStore.updateRecord(enquiryId, { activities });
  }
  function markAttended(bookingId) {
    const b = bookings().find((x) => x.id === bookingId);
    if (!b || b.status !== 'Booked') return;
    const nowIso = new Date().toISOString();
    const history = (b.history || []).concat([{ action: 'Attended', at: nowIso, actor: window.PlayShell.getDemoRole() }]);
    window.PlayStore.updateRecord(bookingId, { status: 'Attended', history });
    bookingActivity(b.enquiryId, 'tour_attended', `Tour attended — ${formatDateMed(b.date)} ${formatTime(b.startTime)}`);
    window.PlayShell.toast('success', 'Marked attended', b.parentName);
    renderDrawerBody(); render();
  }
  function markNoShow(bookingId) {
    const b = bookings().find((x) => x.id === bookingId);
    if (!b || b.status !== 'Booked') return;
    const alreadyNotified = b.noShowFollowUpCreated; // read before updateRecord mutates this same object
    const nowIso = new Date().toISOString();
    const history = (b.history || []).concat([{ action: 'No-show', at: nowIso, actor: window.PlayShell.getDemoRole() }]);
    window.PlayStore.updateRecord(bookingId, { status: 'No-show', history, noShowFollowUpCreated: true });
    bookingActivity(b.enquiryId, 'tour_no_show', `Tour no-show — ${formatDateMed(b.date)} ${formatTime(b.startTime)}`);
    if (!alreadyNotified) {
      const enquiry = window.PlayStore.getById(b.enquiryId);
      if (enquiry) {
        const task = { id: uid('TASK'), title: `Follow up on missed tour — ${b.childName || b.parentName}`, dueDate: todayISO(), assigneeId: enquiry.ownerId || null, assigneeName: enquiry.ownerName || null, notes: '', status: 'Open', createdAt: nowIso, notifiedOverdue: false };
        window.PlayStore.updateRecord(enquiry.id, { followUps: (enquiry.followUps || []).concat([task]) });
        window.PlayShell.addNotification({
          title: 'Tour no-show', text: `${b.parentName} missed their tour on ${formatDateMed(b.date)} — a follow-up has been created.`,
          forRole: 'Admin', module: 'tours', mention: true, recordRoute: 'applicant-profile.html?id=' + enquiry.id,
        });
      }
    }
    window.PlayShell.toast('success', 'Marked no-show', `${b.parentName} — a follow-up task was created.`);
    renderDrawerBody(); render();
  }
  function wireCancelModal() {
    $('trCancelConfirm').addEventListener('click', () => {
      if (!pendingCancelBookingId) return;
      const b = bookings().find((x) => x.id === pendingCancelBookingId);
      pendingCancelBookingId = null;
      closeModal('trCancelBackdrop');
      if (!b) return;
      const nowIso = new Date().toISOString();
      const history = (b.history || []).concat([{ action: 'Cancelled', at: nowIso, actor: window.PlayShell.getDemoRole() }]);
      window.PlayStore.updateRecord(b.id, { status: 'Cancelled', history });
      bookingActivity(b.enquiryId, 'tour_cancelled', `Tour cancelled — ${formatDateMed(b.date)} ${formatTime(b.startTime)}`);
      window.PlayShell.toast('success', 'Booking cancelled', 'The slot is now available again.');
      renderDrawerBody(); render();
    });
  }

  /* ---------- reschedule ---------- */
  function openReschedule(bookingId) {
    rescheduleBookingId = bookingId;
    const b = bookings().find((x) => x.id === bookingId);
    if (!b) return;
    const today = todayISO();
    const candidates = slots().filter((s) => s.id !== b.slotId && s.date >= today && remaining(s) > 0).sort((a, b2) => (a.date + a.startTime).localeCompare(b2.date + b2.startTime)).slice(0, 12);
    $('trDrawerTitle').textContent = 'Reschedule tour';
    $('trDrawerBody').innerHTML = `
      <p class="card__text" style="margin-bottom: var(--space-4);">Choose a new slot for ${escapeHtml(b.parentName)}. The original slot is released only once the new one is confirmed.</p>
      ${candidates.length ? candidates.map((s) => `
        <div class="tr-reschedule-option" data-new-slot="${s.id}">
          <span>${escapeHtml(formatDateMed(s.date))} · ${escapeHtml(formatTime(s.startTime))} · ${escapeHtml(s.guideName)}</span>
          <span class="badge badge--primary">${remaining(s)} left</span>
        </div>`).join('') : '<div class="profile-empty"><div>No open slots available to reschedule into.</div></div>'}
      <button class="btn btn--ghost" type="button" id="trRescheduleBack" style="width:100%; margin-top: var(--space-4);">Back</button>`;
    $('trRescheduleBack').addEventListener('click', () => { rescheduleBookingId = null; renderDrawerBody(); });
    $('trDrawerBody').querySelectorAll('[data-new-slot]').forEach((el) => {
      el.addEventListener('click', () => confirmReschedule(bookingId, el.dataset.newSlot));
    });
  }
  function confirmReschedule(bookingId, newSlotId) {
    const oldBooking = bookings().find((x) => x.id === bookingId);
    const newSlot = slots().find((s) => s.id === newSlotId);
    if (!oldBooking || !newSlot) return;
    if (remaining(newSlot) <= 0) { window.PlayShell.toast('error', 'That slot just filled up', 'Choose another slot.'); openReschedule(bookingId); return; }
    const nowIso = new Date().toISOString();
    const newBooking = {
      id: uid('TBK'), type: 'TourBooking', slotId: newSlot.id, enquiryId: oldBooking.enquiryId,
      childName: oldBooking.childName, parentName: oldBooking.parentName,
      date: newSlot.date, startTime: newSlot.startTime, endTime: newSlot.endTime,
      guideId: newSlot.guideId, guideName: newSlot.guideName,
      status: 'Booked', notes: oldBooking.notes || '', noShowFollowUpCreated: false, createdAt: nowIso,
      rescheduledFromBookingId: oldBooking.id,
      history: [{ action: 'Booked (rescheduled)', at: nowIso, actor: window.PlayShell.getDemoRole() }],
    };
    window.PlayStore.addRecord(newBooking);
    const oldHistory = (oldBooking.history || []).concat([{ action: 'Rescheduled to ' + formatDateMed(newSlot.date) + ' ' + formatTime(newSlot.startTime), at: nowIso, actor: window.PlayShell.getDemoRole() }]);
    window.PlayStore.updateRecord(oldBooking.id, { status: 'Cancelled', history: oldHistory, rescheduledToBookingId: newBooking.id });
    bookingActivity(oldBooking.enquiryId, 'tour_rescheduled', `Tour rescheduled to ${formatDateMed(newSlot.date)} ${formatTime(newSlot.startTime)}`);
    window.PlayShell.toast('success', 'Tour rescheduled', `${oldBooking.parentName} — ${formatDateMed(newSlot.date)} ${formatTime(newSlot.startTime)}.`);
    rescheduleBookingId = null;
    drawerSlotId = newSlot.id;
    renderDrawerBody();
    render();
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
