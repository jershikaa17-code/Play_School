/* ==========================================================================
   PLAY SCHOOL — Marketing, Campaigns & Family Referrals (S42)
   Reuses: store.js ('Enquiry' records — same source/stage/history fields
   admissions.js/applicant-profile.js/tours.js/waitlist.js already read and
   write; 'Campaign' is a new, simple record type matched against real
   Enquiry data at render time, never a manually-incremented counter),
   shell.js (shell/toasts/notifications — the referral auto-earn logic
   itself lives in shell.js's ensureReferralRewardsSync so it runs on every
   page, not just this one), admissions.css (.adm-kpi-grid/.adm-kpi-card,
   .filter-dropdown), dashboard.css (.bar-chart).

   Honest limitations (static, no backend):
   - S38 Billing: this project's "Billing" module (payroll.html) is staff
     payroll, not a family fee ledger — there is no credit-note model to
     integrate with. The "Create credit note" action is shown disabled with
     an explanation rather than faked.
   - Cross-device sync: referral/campaign state lives in this browser's
     localStorage only, same as every other feature in this app.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function formatDate(iso) { if (!iso) return '—'; const d = new Date(iso + 'T00:00:00'); if (isNaN(d.getTime())) return '—'; return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  function formatDateTime(iso) { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d.getTime())) return '—'; return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function normalize(str) { return String(str || '').trim().toLowerCase(); }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  const ICON = {
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    users: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/></svg>',
    trend: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    gift: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>',
    dots: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
  };
  const STAGE_ORDER = ['Enquiry', 'Tour booked', 'Applied', 'Offer sent', 'Enrolled', 'Lost'];

  let dateRange = 'all';
  let highlightedSource = null;
  let convSort = { key: 'enquiries', dir: 'desc' };
  let referralSearch = '';
  let rewardStatusFilter = '';
  let stageFilter = '';
  let pendingCampaignEdit = null;
  let campaignSubmitting = false;
  let pendingGivenEnquiryId = null;
  let givenSubmitting = false;
  let pendingLinkEnquiryId = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    window.PlayShell.login();
    window.PlayShell.mount('marketing', 'Marketing & Referrals');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    wireHeader();
    wireCampaignModal();
    wireGivenModal();
    wireLinkFamilyModal();
    wireDrawer();
    wireReferralToolbar();
    wireModals();
    window.addEventListener('resize', debounce(render, 150));

    render();
  }

  /* ---------- data access ---------- */
  function allEnquiries() { return window.PlayStore.getByType('Enquiry'); }
  function allCampaigns() { return window.PlayStore.getByType('Campaign'); }
  function referralEnquiries() { return allEnquiries().filter((e) => e.source === 'Referral' && e.referral); }

  function rangeStart() {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (dateRange === '30') { d.setDate(d.getDate() - 30); return d; }
    if (dateRange === '90') { d.setDate(d.getDate() - 90); return d; }
    if (dateRange === 'year') { d.setMonth(0, 1); return d; }
    return null; // all time
  }
  function inRange(e) {
    const start = rangeStart();
    if (!start) return true;
    if (!e.createdAt) return true;
    return new Date(e.createdAt) >= start;
  }
  function rangedEnquiries() { return allEnquiries().filter(inRange); }

  function render() {
    renderKpis();
    renderChart();
    renderConversionTable();
    renderCampaigns();
    renderReferrals();
  }

  /* ========================================================================
     HEADER
     ======================================================================== */
  function wireHeader() {
    $('mkDateRange').addEventListener('change', () => { dateRange = $('mkDateRange').value; render(); });
    $('mkNewCampaignBtn').addEventListener('click', () => openCampaignModal(null));
  }

  /* ========================================================================
     KPIs
     ======================================================================== */
  function renderKpis() {
    const list = rangedEnquiries();
    const totalEnquiries = list.length;
    const enrolled = list.filter((e) => e.stage === 'Enrolled').length;
    const bySource = {};
    list.forEach((e) => { const s = e.source || 'Other'; (bySource[s] = bySource[s] || { total: 0, enrolled: 0 }).total++; if (e.stage === 'Enrolled') bySource[s].enrolled++; });
    let bestSource = null, bestRate = -1;
    Object.keys(bySource).forEach((s) => {
      const rate = bySource[s].total ? bySource[s].enrolled / bySource[s].total : 0;
      if (bySource[s].total >= 1 && (rate > bestRate || (rate === bestRate && bySource[s].total > (bySource[bestSource] || {}).total))) { bestRate = rate; bestSource = s; }
    });
    const pendingRewards = referralEnquiries().filter((e) => e.referral.rewardStatus === 'Pending').length;

    const cards = [
      { label: 'Total Enquiries', value: totalEnquiries, icon: ICON.users, hint: dateRangeLabel() },
      { label: 'Enrolled Children', value: enrolled, icon: ICON.check, hint: dateRangeLabel() },
      { label: 'Best Performing Source', value: bestSource || '—', icon: ICON.trend, hint: bestSource ? `${Math.round(bestRate * 100)}% conversion` : 'Not enough data yet' },
      { label: 'Referral Rewards Pending', value: pendingRewards, icon: ICON.gift, hint: 'Awaiting enrolment or payout' },
    ];
    $('mkKpiGrid').innerHTML = cards.map((c, i) => `
      <div class="adm-kpi-card" style="animation-delay:${i * 45}ms">
        <span class="adm-kpi-card__icon">${c.icon}</span>
        <div><div class="adm-kpi-card__value">${escapeHtml(String(c.value))}</div><div class="adm-kpi-card__label">${escapeHtml(c.label)}</div><div class="adm-kpi-card__hint">${escapeHtml(c.hint)}</div></div>
      </div>`).join('');
  }
  function dateRangeLabel() {
    if (dateRange === '30') return 'Last 30 days';
    if (dateRange === '90') return 'Last 90 days';
    if (dateRange === 'year') return 'This year';
    return 'All time';
  }

  /* ========================================================================
     ENQUIRIES BY SOURCE — bar chart
     ======================================================================== */
  function sourceCounts() {
    const list = rangedEnquiries();
    const map = {};
    list.forEach((e) => { const s = e.source || 'Other'; map[s] = (map[s] || 0) + 1; });
    return map;
  }
  function renderChart() {
    const counts = sourceCounts();
    const sources = Object.keys(counts);
    const host = $('mkChartHost');
    if (!sources.length) {
      host.innerHTML = `<div class="profile-empty">${ICON.inbox}<div>No enquiries in this period yet.</div></div>`;
      return;
    }
    const max = Math.max(...sources.map((s) => counts[s]));
    host.innerHTML = `<div class="bar-chart" role="img" aria-label="Enquiries by source: ${sources.map((s) => `${s} ${counts[s]}`).join(', ')}">
      ${sources.map((s) => `
        <div class="bar-chart__col mk-bar-col${highlightedSource === s ? ' is-highlighted' : ''}" data-source="${escapeHtml(s)}" tabindex="0" role="button" aria-label="${escapeHtml(s)}: ${counts[s]} enquiries">
          <span class="mk-bar-value">${counts[s]}</span>
          <div class="bar-chart__bar" style="height:${Math.max((counts[s] / max) * 100, 4)}%" title="${escapeHtml(s)}: ${counts[s]} enquiries"></div>
          <span class="bar-chart__label">${escapeHtml(s)}</span>
        </div>`).join('')}
    </div>`;
    host.querySelectorAll('[data-source]').forEach((col) => {
      const toggle = () => { highlightedSource = highlightedSource === col.dataset.source ? null : col.dataset.source; render(); };
      col.addEventListener('click', toggle);
      col.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
  }

  /* ========================================================================
     CONVERSION BY SOURCE — table
     ======================================================================== */
  function conversionRows() {
    const list = rangedEnquiries();
    const bySource = {};
    list.forEach((e) => {
      const s = e.source || 'Other';
      if (!bySource[s]) bySource[s] = { source: s, enquiryIds: new Set(), tourIds: new Set(), enrolledIds: new Set() };
      bySource[s].enquiryIds.add(e.id);
      const reachedTour = (e.history || []).some((h) => h.to === 'Tour booked') || window.PlayStore.getByType('TourBooking').some((b) => b.enquiryId === e.id);
      if (reachedTour) bySource[s].tourIds.add(e.id);
      if (e.stage === 'Enrolled') bySource[s].enrolledIds.add(e.id);
    });
    return Object.values(bySource).map((r) => ({
      source: r.source, enquiries: r.enquiryIds.size, tours: r.tourIds.size, enrolled: r.enrolledIds.size,
      rate: r.enquiryIds.size ? (r.enrolledIds.size / r.enquiryIds.size) * 100 : 0,
    }));
  }
  function renderConversionTable() {
    const rows = conversionRows();
    const host = $('mkConversionHost');
    if (!rows.length) { host.innerHTML = `<div class="profile-empty">${ICON.inbox}<div>No conversion data yet.</div></div>`; return; }
    const sorted = rows.slice().sort((a, b) => {
      const mul = convSort.dir === 'asc' ? 1 : -1;
      return (a[convSort.key] - b[convSort.key]) * mul;
    });
    host.innerHTML = `
      <div class="table-wrap">
        <table class="mk-table">
          <thead><tr>
            <th>Source</th>
            <th data-sort="enquiries">Enquiries</th>
            <th>Tours</th>
            <th data-sort="enrolled">Enrolled</th>
            <th data-sort="rate">Conversion %</th>
          </tr></thead>
          <tbody>${sorted.map((r) => `
            <tr data-source="${escapeHtml(r.source)}" class="${highlightedSource === r.source ? 'is-highlighted' : ''}">
              <td>${escapeHtml(r.source)}</td>
              <td>${r.enquiries}</td>
              <td>${r.tours}</td>
              <td>${r.enrolled}</td>
              <td><div class="mk-conv-bar-wrap"><div class="mk-conv-bar"><div class="mk-conv-bar__fill" style="width:${Math.min(r.rate, 100)}%"></div></div><span>${Math.round(r.rate)}%</span></div></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`;
    host.querySelectorAll('[data-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        if (convSort.key === th.dataset.sort) convSort.dir = convSort.dir === 'asc' ? 'desc' : 'asc';
        else convSort = { key: th.dataset.sort, dir: 'desc' };
        renderConversionTable();
      });
    });
    host.querySelectorAll('[data-source]').forEach((row) => {
      row.addEventListener('click', () => { highlightedSource = highlightedSource === row.dataset.source ? null : row.dataset.source; render(); });
    });
  }

  /* ========================================================================
     CAMPAIGNS
     ======================================================================== */
  function campaignStatus(c) {
    if (c.pausedManually) return 'Paused';
    const today = todayISO();
    if (today < c.startDate) return 'Scheduled';
    if (today > c.endDate) return 'Completed';
    return 'Active';
  }
  function campaignStatusBadge(status) {
    if (status === 'Active') return 'badge--success';
    if (status === 'Scheduled') return 'badge--primary';
    if (status === 'Paused') return 'badge--warning';
    return 'badge--neutral';
  }
  function campaignMetrics(c) {
    const matching = allEnquiries().filter((e) => normalize(e.source) === normalize(c.sourceTag) && (!e.createdAt || (e.createdAt.slice(0, 10) >= c.startDate && e.createdAt.slice(0, 10) <= c.endDate)));
    return { enquiries: matching.length, enrolled: matching.filter((e) => e.stage === 'Enrolled').length };
  }
  function renderCampaigns() {
    const campaigns = allCampaigns().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const host = $('mkCampaignsHost');
    if (!campaigns.length) {
      host.innerHTML = `<div class="state-panel"><div class="state-panel__icon">${ICON.inbox}</div><div class="state-panel__title">No campaigns yet</div><p class="state-panel__text">Create a campaign to track how a specific marketing push performs.</p><div class="state-panel__action"><button class="btn btn--accent" type="button" id="mkEmptyCampaignBtn">New Campaign</button></div></div>`;
      $('mkEmptyCampaignBtn').addEventListener('click', () => openCampaignModal(null));
      return;
    }
    host.innerHTML = `<div class="mk-campaign-grid">${campaigns.map((c) => campaignCardHtml(c)).join('')}</div>`;
    host.querySelectorAll('[data-open-campaign]').forEach((card) => card.addEventListener('click', (e) => { if (e.target.closest('[data-pause],[data-edit]')) return; openCampaignDrawer(card.dataset.openCampaign); }));
    host.querySelectorAll('[data-pause]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); togglePause(btn.dataset.pause); }));
    host.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); openCampaignModal(btn.dataset.edit); }));
  }
  function campaignCardHtml(c) {
    const status = campaignStatus(c);
    const metrics = campaignMetrics(c);
    return `
      <div class="mk-campaign-card" data-open-campaign="${c.id}">
        <div class="mk-campaign-card__head">
          <span class="mk-campaign-card__name">${escapeHtml(c.name)}</span>
          <span class="badge ${campaignStatusBadge(status)}">${escapeHtml(status)}</span>
        </div>
        <div class="mk-campaign-card__meta">${escapeHtml(formatDate(c.startDate))} – ${escapeHtml(formatDate(c.endDate))} · <span class="badge badge--neutral">${escapeHtml(c.sourceTag)}</span></div>
        <div class="mk-campaign-card__stats">
          <span><strong>${metrics.enquiries}</strong>Enquiries</span>
          <span><strong>${metrics.enrolled}</strong>Enrolled</span>
        </div>
        <div class="mk-campaign-card__actions">
          <button class="btn btn--secondary btn--sm" type="button" data-edit="${c.id}">Edit</button>
          <button class="btn btn--secondary btn--sm" type="button" data-pause="${c.id}">${c.pausedManually ? 'Resume' : 'Pause'}</button>
        </div>
      </div>`;
  }
  function togglePause(id) {
    const c = window.PlayStore.getById(id);
    window.PlayStore.updateRecord(id, { pausedManually: !c.pausedManually });
    window.PlayShell.toast('success', c.pausedManually ? 'Campaign resumed' : 'Campaign paused', c.name);
    renderCampaigns();
  }
  function openCampaignDrawer(id) {
    const c = window.PlayStore.getById(id);
    if (!c) return;
    const metrics = campaignMetrics(c);
    const status = campaignStatus(c);
    $('mkDrawerTitle').textContent = c.name;
    $('mkDrawerBody').innerHTML = `
      <div class="mk-drawer-row"><span class="mk-drawer-row__label">Status</span><span class="mk-drawer-row__value"><span class="badge ${campaignStatusBadge(status)}">${escapeHtml(status)}</span></span></div>
      <div class="mk-drawer-row"><span class="mk-drawer-row__label">Dates</span><span class="mk-drawer-row__value">${escapeHtml(formatDate(c.startDate))} – ${escapeHtml(formatDate(c.endDate))}</span></div>
      <div class="mk-drawer-row"><span class="mk-drawer-row__label">Source tag</span><span class="mk-drawer-row__value">${escapeHtml(c.sourceTag)}</span></div>
      <div class="mk-drawer-row"><span class="mk-drawer-row__label">Enquiries</span><span class="mk-drawer-row__value">${metrics.enquiries}</span></div>
      <div class="mk-drawer-row"><span class="mk-drawer-row__label">Enrolled</span><span class="mk-drawer-row__value">${metrics.enrolled}</span></div>
      ${c.notes ? `<div class="mk-drawer-row"><span class="mk-drawer-row__label">Notes</span><span class="mk-drawer-row__value">${escapeHtml(c.notes)}</span></div>` : ''}
      <div class="mk-drawer-row"><span class="mk-drawer-row__label">Created</span><span class="mk-drawer-row__value">${formatDateTime(c.createdAt)}</span></div>`;
    $('mkDrawer').classList.add('is-open');
    $('mkDrawerBackdrop').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function wireDrawer() {
    $('mkDrawerBackdrop').addEventListener('click', closeDrawer);
    document.querySelector('[data-close-drawer]').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('mkDrawer').classList.contains('is-open')) closeDrawer(); });
  }
  function closeDrawer() {
    $('mkDrawer').classList.remove('is-open');
    $('mkDrawerBackdrop').classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /* ---------- New/edit campaign modal ---------- */
  function wireCampaignModal() {
    $('mkCampaignSave').addEventListener('click', saveCampaign);
  }
  function sourceTagOptions() {
    const fromEnquiries = Array.from(new Set(allEnquiries().map((e) => e.source).filter(Boolean)));
    const common = ['Website', 'Walk-in', 'Referral', 'Social', 'Event', 'Other'];
    return Array.from(new Set(common.concat(fromEnquiries)));
  }
  function openCampaignModal(id) {
    pendingCampaignEdit = id;
    const c = id ? window.PlayStore.getById(id) : null;
    $('mkCampaignModalTitle').textContent = c ? 'Edit campaign' : 'New campaign';
    $('mkCampaignSaveLabel').textContent = c ? 'Save changes' : 'Create campaign';
    $('mkcSource').innerHTML = sourceTagOptions().map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    $('mkcName').value = c ? c.name : '';
    $('mkcStart').value = c ? c.startDate : '';
    $('mkcEnd').value = c ? c.endDate : '';
    if (c) $('mkcSource').value = c.sourceTag;
    $('mkcNotes').value = c ? c.notes || '' : '';
    ['mkcName', 'mkcStart', 'mkcEnd'].forEach(clearFieldError);
    openModal('mkCampaignBackdrop');
  }
  function saveCampaign() {
    if (campaignSubmitting) return;
    ['mkcName', 'mkcStart', 'mkcEnd'].forEach(clearFieldError);
    const name = $('mkcName').value.trim();
    const start = $('mkcStart').value;
    const end = $('mkcEnd').value;
    let ok = true;
    if (!name) { setFieldError('mkcName', 'Enter a campaign name.'); ok = false; }
    if (!start) { setFieldError('mkcStart', 'Choose a start date.'); ok = false; }
    if (!end) { setFieldError('mkcEnd', 'Choose an end date.'); ok = false; }
    else if (start && end < start) { setFieldError('mkcEnd', 'End date cannot be before the start date.'); ok = false; }
    if (!ok) return;
    campaignSubmitting = true;
    const btn = $('mkCampaignSave'); btn.classList.add('is-loading'); btn.disabled = true;
    window.setTimeout(() => {
      const patch = { name, startDate: start, endDate: end, sourceTag: $('mkcSource').value, notes: $('mkcNotes').value.trim() };
      if (pendingCampaignEdit) {
        window.PlayStore.updateRecord(pendingCampaignEdit, patch);
        window.PlayShell.toast('success', 'Campaign updated', name);
      } else {
        window.PlayStore.addRecord(Object.assign({ id: uid('CAMP'), type: 'Campaign', pausedManually: false, createdAt: new Date().toISOString() }, patch));
        window.PlayShell.toast('success', 'Campaign created', name);
      }
      campaignSubmitting = false;
      btn.classList.remove('is-loading'); btn.disabled = false;
      closeModal('mkCampaignBackdrop');
      renderCampaigns();
    }, 400);
  }

  /* ========================================================================
     FAMILY REFERRALS
     ======================================================================== */
  function wireReferralToolbar() {
    $('mkReferralSearch').addEventListener('input', () => { referralSearch = $('mkReferralSearch').value; renderReferrals(); });
    $('mkRewardStatusFilter').addEventListener('change', () => { rewardStatusFilter = $('mkRewardStatusFilter').value; renderReferrals(); });
    $('mkStageFilter').innerHTML = '<option value="">All stages</option>' + STAGE_ORDER.map((s) => `<option value="${s}">${s}</option>`).join('');
    $('mkStageFilter').addEventListener('change', () => { stageFilter = $('mkStageFilter').value; renderReferrals(); });
  }
  function filteredReferrals() {
    return referralEnquiries().filter((e) => {
      const q = normalize(referralSearch);
      if (q) {
        const hay = normalize([(e.referral.referringFamilyName || ''), e.childName].join(' '));
        if (!hay.includes(q)) return false;
      }
      if (rewardStatusFilter && e.referral.rewardStatus !== rewardStatusFilter) return false;
      if (stageFilter && e.stage !== stageFilter) return false;
      return true;
    });
  }
  function rewardBadgeClass(status) {
    if (status === 'Earned') return 'mk-reward-badge--earned';
    if (status === 'Given') return 'mk-reward-badge--given';
    return 'mk-reward-badge--pending';
  }
  function renderReferrals() {
    const list = filteredReferrals();
    const host = $('mkReferralsHost');
    const total = referralEnquiries().length;
    if (!total) {
      host.innerHTML = `<div class="state-panel"><div class="state-panel__icon">${ICON.gift}</div><div class="state-panel__title">No referrals yet</div><p class="state-panel__text">Referrals appear automatically whenever a new enquiry's source is set to "Referral".</p></div>`;
      return;
    }
    if (!list.length) {
      host.innerHTML = `<div class="state-panel"><div class="state-panel__icon">${ICON.inbox}</div><div class="state-panel__title">No matching referrals</div><p class="state-panel__text">Try a different search or clear your filters.</p></div>`;
      return;
    }
    const mobile = window.innerWidth < 768;
    if (mobile) {
      host.innerHTML = list.map((e) => referralCardHtml(e)).join('');
    } else {
      host.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Referring family</th><th>Referred child</th><th>Enquiry date</th><th>Stage</th><th>Reward</th><th>Reward status</th><th style="width:40px;"></th></tr></thead>
            <tbody>${list.map((e) => referralRowHtml(e)).join('')}</tbody>
          </table>
        </div>`;
    }
    wireReferralActions(host);
  }
  function referralRowHtml(e) {
    const r = e.referral;
    return `
      <tr>
        <td>${r.referringFamilyName ? escapeHtml(r.referringFamilyName) : `<button class="btn btn--secondary btn--sm" type="button" data-link-family="${e.id}">Link family</button>`}</td>
        <td>${escapeHtml(e.childName)}</td>
        <td>${formatDate((e.createdAt || '').slice(0, 10))}</td>
        <td><span class="badge badge--neutral">${escapeHtml(e.stage)}</span></td>
        <td>${escapeHtml(r.rewardDescription)}</td>
        <td><span class="badge ${rewardBadgeClass(r.rewardStatus)}">${escapeHtml(r.rewardStatus)}</span></td>
        <td>${r.rewardStatus === 'Earned' ? `<button class="btn btn--accent btn--sm" type="button" data-mark-given="${e.id}">Mark Given</button>` : ''}</td>
      </tr>`;
  }
  function referralCardHtml(e) {
    const r = e.referral;
    return `
      <div class="mk-referral-card">
        <div class="mk-referral-card__row"><span class="mk-referral-card__label">Referring family</span><span>${r.referringFamilyName ? escapeHtml(r.referringFamilyName) : 'Not linked'}</span></div>
        <div class="mk-referral-card__row"><span class="mk-referral-card__label">Referred child</span><span>${escapeHtml(e.childName)}</span></div>
        <div class="mk-referral-card__row"><span class="mk-referral-card__label">Enquiry date</span><span>${formatDate((e.createdAt || '').slice(0, 10))}</span></div>
        <div class="mk-referral-card__row"><span class="mk-referral-card__label">Stage</span><span class="badge badge--neutral">${escapeHtml(e.stage)}</span></div>
        <div class="mk-referral-card__row"><span class="mk-referral-card__label">Reward</span><span>${escapeHtml(r.rewardDescription)}</span></div>
        <div class="mk-referral-card__row"><span class="mk-referral-card__label">Status</span><span class="badge ${rewardBadgeClass(r.rewardStatus)}">${escapeHtml(r.rewardStatus)}</span></div>
        <div class="mk-referral-card__actions">
          ${!r.referringFamilyName ? `<button class="btn btn--secondary btn--sm" type="button" data-link-family="${e.id}">Link family</button>` : ''}
          ${r.rewardStatus === 'Earned' ? `<button class="btn btn--accent btn--sm" type="button" data-mark-given="${e.id}">Mark Given</button>` : ''}
        </div>
      </div>`;
  }
  function wireReferralActions(host) {
    host.querySelectorAll('[data-mark-given]').forEach((btn) => btn.addEventListener('click', () => openGivenModal(btn.dataset.markGiven)));
    host.querySelectorAll('[data-link-family]').forEach((btn) => btn.addEventListener('click', () => openLinkFamilyModal(btn.dataset.linkFamily)));
  }

  /* ---------- link referring family ---------- */
  function wireLinkFamilyModal() {
    $('mkFamilySearch').addEventListener('input', renderFamilySearchResults);
  }
  function openLinkFamilyModal(enquiryId) {
    pendingLinkEnquiryId = enquiryId;
    $('mkFamilySearch').value = '';
    renderFamilySearchResults();
    openModal('mkLinkFamilyBackdrop');
    window.setTimeout(() => $('mkFamilySearch').focus(), 50);
  }
  function renderFamilySearchResults() {
    const q = normalize($('mkFamilySearch').value);
    const results = $('mkFamilyResults');
    if (!q) { results.innerHTML = '<p class="card__text" style="font-size:var(--fs-caption); color:var(--color-text-muted);">Start typing a family or guardian name…</p>'; return; }
    const families = window.PlayStore.getByType('Family').filter((f) => normalize(f.name).includes(q) || (f.guardianIds || []).some((gid) => { const g = window.PlayStore.getById(gid); return g && normalize(g.name).includes(q); })).slice(0, 10);
    if (!families.length) { results.innerHTML = '<p class="card__text" style="font-size:var(--fs-caption); color:var(--color-text-muted);">No matching families found.</p>'; return; }
    results.innerHTML = families.map((f) => `<div class="tr-search-result" style="display:flex; align-items:center; justify-content:space-between; gap:var(--space-3); padding:var(--space-3); border-radius:var(--radius-md); border:1px solid var(--color-border-subtle); margin-bottom:var(--space-2);"><span>${escapeHtml(f.name)}</span><button class="btn btn--accent btn--sm" type="button" data-select-family="${f.id}">Link</button></div>`).join('');
    results.querySelectorAll('[data-select-family]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const family = window.PlayStore.getById(btn.dataset.selectFamily);
        const e = window.PlayStore.getById(pendingLinkEnquiryId);
        window.PlayStore.updateRecord(e.id, { referral: Object.assign({}, e.referral, { referringFamilyId: family.id, referringFamilyName: family.name }) });
        closeModal('mkLinkFamilyBackdrop');
        window.PlayShell.toast('success', 'Referring family linked', family.name);
        renderReferrals();
      });
    });
  }

  /* ---------- mark as given ---------- */
  function wireGivenModal() {
    $('mkGivenConfirm').addEventListener('click', confirmGiven);
  }
  function openGivenModal(enquiryId) {
    const e = window.PlayStore.getById(enquiryId);
    if (!e || e.referral.rewardStatus !== 'Earned') return;
    pendingGivenEnquiryId = enquiryId;
    givenSubmitting = false;
    $('mkGivenBody').innerHTML = `
      <div class="mk-given-row"><span>Referring family</span><strong>${escapeHtml(e.referral.referringFamilyName || 'Not linked')}</strong></div>
      <div class="mk-given-row"><span>Referred child</span><strong>${escapeHtml(e.childName)}</strong></div>
      <div class="mk-given-row"><span>Reward</span><strong>${escapeHtml(e.referral.rewardDescription)}</strong></div>
      <p class="field__text" style="font-size: var(--fs-caption); color: var(--color-text-muted); margin-top: var(--space-3);">Confirm the family has actually received this reward before marking it Given. This cannot be done for a reward that hasn't been Earned yet.</p>`;
    openModal('mkGivenBackdrop');
  }
  function confirmGiven() {
    if (givenSubmitting) return;
    const e = window.PlayStore.getById(pendingGivenEnquiryId);
    if (!e || e.referral.rewardStatus !== 'Earned') { closeModal('mkGivenBackdrop'); return; }
    givenSubmitting = true;
    const btn = $('mkGivenConfirm'); btn.classList.add('is-loading'); btn.disabled = true;
    window.setTimeout(() => {
      const nowIso = new Date().toISOString();
      window.PlayStore.updateRecord(e.id, { referral: Object.assign({}, e.referral, { rewardStatus: 'Given', givenAt: nowIso, givenBy: window.PlayShell.getDemoRole() }) });
      givenSubmitting = false;
      btn.classList.remove('is-loading'); btn.disabled = false;
      pendingGivenEnquiryId = null;
      closeModal('mkGivenBackdrop');
      window.PlayShell.toast('success', 'Reward marked as given', e.childName);
      render();
    }, 400);
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
