/* ==========================================================================
   PLAY SCHOOL — Applicant Profile & Family Journey (S07)
   Reuses: store.js ('Enquiry' records, same PlayStore.addRecord/updateRecord/
   getByType API as admissions.js and every other page), shell.js (shell,
   toasts, notifications — forRole is informational only, no real per-user
   auth in this static demo), record.css (profile-header/card/row/people/
   locked/empty components, S13). No competing store or backend.

   Honest limitations (static, no backend):
   - Documents: file bytes are only kept as a data URL in localStorage
     (mirrors enroll.js's child-photo convention) — not a real secure
     document store, and capped in size accordingly. Stated in the UI.
   - "Send offer": there's no email-sending integration, so step 3 is
     explicitly labelled a demo action; it never claims delivery.
   - Overdue follow-up notifications fire once, the next time this page is
     opened after the due date passes (same "ensureX on load" idempotent
     pattern store.js uses elsewhere) — there's no background scheduler.
   - "Convert to enrolled" hands off to the existing enroll.html (S14) flow,
     which performs the actual Child/Guardian/Family creation; this page
     does not duplicate that logic.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
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
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function initials(name) { return (name || '').trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase(); }

  const ICON = {
    dots: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    note: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
    call: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg>',
    stage: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v18"/><path d="M5 5h13l-3 4 3 4H5"/></svg>',
    document: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    task: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    enrol: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
    upload: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    eye: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  };

  const STAGES = ['Enquiry', 'Tour booked', 'Applied', 'Offer sent', 'Enrolled'];
  const DOC_TYPES = [
    { key: 'birthCertificate', label: 'Birth certificate' },
    { key: 'immunisation', label: 'Immunisation record' },
    { key: 'photo', label: 'Child photo' },
    { key: 'previousSchoolReport', label: 'Previous school report' },
  ];
  const DOC_MAX_BYTES = 900 * 1024;

  let enquiry = null;
  let composerTab = 'note';
  let pendingLostStage = false;
  let offerStep = 1;
  let offerDraft = { subject: '', body: '', fees: '' };
  let offerSubmitting = false;
  let taskSubmitting = false;
  let childFormSubmitting = false;
  let familyFormSubmitting = false;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    window.PlayShell.login();
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    enquiry = id ? window.PlayStore.getById(id) : null;

    if (!enquiry || enquiry.type !== 'Enquiry') {
      window.PlayShell.mount('admissions', 'Applicant');
      $('apNotFound').hidden = false;
      document.getElementById('appContent').appendChild($('apNotFound'));
      return;
    }

    window.PlayShell.mount('admissions', enquiry.childName);
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    notifyOverdueFollowUpsOnce();

    wireMobileTabs();
    wireMoveStageModal();
    wireLostModal();
    wireEnrolModal();
    wireFamilyModal();
    wireChildModal();
    wireSiblingModal();
    wireTaskModal();
    wireOfferModal();
    wireDeleteModal();
    wireModals();

    render();
  }

  /* ---------- data helpers ---------- */
  function reload() { enquiry = window.PlayStore.getById(enquiry.id); }
  function patch(p) { window.PlayStore.updateRecord(enquiry.id, p); reload(); }
  function addActivity({ type, title, detail, meta }) {
    const nowIso = new Date().toISOString();
    const activities = (enquiry.activities || []).concat([{
      id: uid('ACT'), type, title, detail: detail || '', at: nowIso,
      actor: window.PlayShell.getDemoRole(), meta: meta || null,
    }]);
    patch({ activities });
  }
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
  function stageBadgeClass(stage) {
    if (stage === 'Enrolled') return 'badge--success';
    if (stage === 'Lost') return 'badge--neutral';
    if (stage === 'Offer sent') return 'badge--accent';
    if (stage === 'Applied') return 'badge--primary';
    if (stage === 'Tour booked') return 'badge--warning';
    return 'badge--neutral';
  }

  /** Merges the stage-change history (written by admissions.js) with this
      page's richer activity log into one chronological list — newest first,
      matching the "latest activity at the top" requirement. */
  function timelineEvents() {
    const stageEvents = (enquiry.history || []).map((h) => ({
      type: 'stage', at: h.at, actor: h.actor,
      title: h.from ? `Stage changed: ${h.from} → ${h.to}` : `Enquiry created — ${h.to}`,
      detail: h.to === 'Lost' && enquiry.lostReason ? `Reason: ${enquiry.lostReason}${enquiry.lostNote ? ' — ' + enquiry.lostNote : ''}` : '',
    }));
    const activityEvents = (enquiry.activities || []).map((a) => ({ type: a.type, at: a.at, actor: a.actor, title: a.title, detail: a.detail }));
    return stageEvents.concat(activityEvents).sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  function render() {
    renderHeader();
    renderStageTracker();
    renderComposer();
    renderTimeline();
    renderDetailsSection();
    renderDocumentsSection();
    renderTasksSection();
    applyMobileTabVisibility();
  }

  /* ========================================================================
     HEADER + STAGE TRACKER
     ======================================================================== */
  function renderHeader() {
    $('apBreadcrumb').textContent = enquiry.childName;
    const age = ageAtStart(enquiry.dob, enquiry.preferredStart);
    $('apHeader').innerHTML = `
      <div class="profile-header">
        <div class="profile-header__photo">${escapeHtml(initials(enquiry.childName))}</div>
        <div class="profile-header__body">
          <div class="profile-header__name-row">
            <span class="profile-header__name">${escapeHtml(enquiry.childName)}</span>
            <span class="badge ${stageBadgeClass(enquiry.stage)}">${escapeHtml(enquiry.stage)}</span>
          </div>
          <div class="profile-header__meta">
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Age at start</span><span class="profile-header__meta-value">${age ? escapeHtml(age) : 'Not provided'}</span></div>
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Program</span><span class="profile-header__meta-value">${escapeHtml(enquiry.program || 'Not provided')}</span></div>
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Owner</span><span class="profile-header__meta-value">${escapeHtml(enquiry.ownerName || 'Unassigned')}</span></div>
          </div>
        </div>
        <div class="profile-header__actions">
          <button class="btn btn--accent btn--sm" type="button" id="apMoveStageBtn">${ICON.stage}<span>&nbsp;Move stage</span></button>
          <span class="popover" id="apMoreMenu">
            <button class="btn btn--icon" type="button" id="apMoreBtn" aria-haspopup="true" aria-expanded="false" aria-label="More actions">${ICON.dots}</button>
            <span class="popover__panel" role="menu" style="right:0; left:auto;">
              <button class="popover__item" type="button" id="apEditApplicantBtn" role="menuitem">Edit applicant details</button>
              <button class="popover__item" type="button" id="apCopyContactBtn" role="menuitem">Copy contact information</button>
              <button class="popover__item" type="button" id="apViewLinkedBtn" role="menuitem">View linked child record</button>
              <button class="popover__item" type="button" id="apViewHistoryBtn" role="menuitem">View activity history</button>
              <button class="popover__item popover__item--danger" type="button" id="apDeleteBtn" role="menuitem">Delete enquiry</button>
            </span>
          </span>
        </div>
      </div>`;
    wireHeaderActions();
  }
  function wireHeaderActions() {
    $('apMoveStageBtn').addEventListener('click', openMoveStageModal);
    const menu = $('apMoreMenu');
    $('apMoreBtn').addEventListener('click', (e) => { e.stopPropagation(); const willOpen = !menu.classList.contains('is-open'); menu.classList.toggle('is-open', willOpen); });
    document.addEventListener('click', () => menu.classList.remove('is-open'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.classList.remove('is-open'); });
    $('apEditApplicantBtn').addEventListener('click', () => { menu.classList.remove('is-open'); openChildModal(); });
    $('apCopyContactBtn').addEventListener('click', async () => {
      menu.classList.remove('is-open');
      const text = `${enquiry.parentName} — ${enquiry.phone || ''} — ${enquiry.email || ''}`;
      try { await navigator.clipboard.writeText(text); window.PlayShell.toast('success', 'Copied', 'Contact information copied to clipboard.'); }
      catch (e2) { window.PlayShell.toast('error', 'Could not copy', 'Your browser blocked clipboard access.'); }
    });
    $('apViewLinkedBtn').addEventListener('click', () => {
      menu.classList.remove('is-open');
      if (enquiry.convertedChildId && window.PlayStore.getById(enquiry.convertedChildId)) window.location.href = 'record.html?id=' + encodeURIComponent(enquiry.convertedChildId);
      else window.PlayShell.toast('info', 'Not yet linked', 'This applicant has not been converted to a child record yet.');
    });
    $('apViewHistoryBtn').addEventListener('click', () => { menu.classList.remove('is-open'); $('apTimeline').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('apDeleteBtn').addEventListener('click', () => { menu.classList.remove('is-open'); openModal('apDeleteBackdrop'); });
  }

  function renderStageTracker() {
    const idx = STAGES.indexOf(enquiry.stage);
    const isLost = enquiry.stage === 'Lost';
    const html = STAGES.map((s, i) => {
      const cls = isLost ? '' : i < idx ? ' ap-stage--done' : i === idx ? ' ap-stage--current' : '';
      const connector = i < STAGES.length - 1 ? `<span class="ap-stage__connector${!isLost && i < idx ? ' is-done' : ''}"></span>` : '';
      return `<span class="ap-stage${cls}"><span class="ap-stage__pill"><span class="ap-stage__dot"></span>${escapeHtml(s)}</span></span>${connector}`;
    }).join('');
    const lostTag = isLost ? `<span class="ap-stage"><span class="ap-stage__pill ap-stage--lost"><span class="ap-stage__dot"></span>Lost</span></span>` : '';
    $('apStageTracker').innerHTML = `<div class="ap-stage-tracker">${isLost ? lostTag : html}</div>`;
  }

  /* ---------- move stage / lost / enrol ---------- */
  function openMoveStageModal() {
    const wrap = $('apStageOptions');
    const others = STAGES.concat(['Lost']).filter((s) => s !== enquiry.stage);
    wrap.innerHTML = others.map((s) => `<button class="btn btn--secondary" type="button" data-stage-to="${escapeHtml(s)}" style="width:100%; justify-content:flex-start; margin-bottom: var(--space-2);">${escapeHtml(s)}</button>`).join('');
    wrap.querySelectorAll('[data-stage-to]').forEach((btn) => {
      btn.addEventListener('click', () => { closeModal('apMoveStageBackdrop'); attemptStageChange(btn.dataset.stageTo); });
    });
    openModal('apMoveStageBackdrop');
  }
  function attemptStageChange(toStage) {
    if (toStage === enquiry.stage) return;
    if (toStage === 'Lost') { openLostModal(); return; }
    if (toStage === 'Enrolled') { openModal('apEnrolBackdrop'); return; }
    commitStageChange(toStage);
  }
  function commitStageChange(toStage, extra) {
    const prevStage = enquiry.stage;
    const nowIso = new Date().toISOString();
    const history = (enquiry.history || []).concat([{ from: prevStage, to: toStage, at: nowIso, actor: window.PlayShell.getDemoRole() }]);
    try {
      patch(Object.assign({ stage: toStage, stageEnteredAt: nowIso, history }, extra || {}));
      window.PlayShell.toast('success', `Moved to ${toStage}`, `${enquiry.childName} is now in ${toStage}.`);
      render();
    } catch (e) {
      window.PlayShell.toast('error', 'Could not update stage', 'Please try again.');
    }
  }
  function wireMoveStageModal() { /* options rendered on open; backdrop handled by wireModals() */ }

  function wireLostModal() {
    $('apLostReason').addEventListener('change', () => { $('apLostOtherWrap').hidden = $('apLostReason').value !== 'Other'; });
    $('apLostConfirm').addEventListener('click', () => {
      const reason = $('apLostReason').value;
      clearFieldError('apLostReason'); clearFieldError('apLostOther');
      if (!reason) { setFieldError('apLostReason', 'Choose a reason.'); return; }
      let note = '';
      if (reason === 'Other') {
        note = $('apLostOther').value.trim();
        if (!note) { setFieldError('apLostOther', 'Please add a short explanation.'); return; }
      }
      closeModal('apLostBackdrop');
      commitStageChange('Lost', { lostReason: reason, lostNote: note || null });
    });
  }
  function openLostModal() {
    $('apLostReason').value = ''; $('apLostOther').value = ''; $('apLostOtherWrap').hidden = true;
    clearFieldError('apLostReason'); clearFieldError('apLostOther');
    openModal('apLostBackdrop');
  }
  function wireEnrolModal() {
    $('apEnrolConfirm').addEventListener('click', () => {
      closeModal('apEnrolBackdrop');
      addActivity({ type: 'enrolment_started', title: 'Enrolment started', detail: 'Handed off to the enrolment wizard.' });
      window.location.href = 'enroll.html?enquiryId=' + encodeURIComponent(enquiry.id);
    });
  }

  /* ========================================================================
     INTERACTION COMPOSER
     ======================================================================== */
  function renderComposer() {
    const tabs = [
      { key: 'note', label: 'Log a note', icon: ICON.note },
      { key: 'call', label: 'Log a call', icon: ICON.call },
      { key: 'email', label: 'Log an email', icon: ICON.mail },
    ];
    $('apComposer').innerHTML = `
      <div class="ap-composer">
        <div class="ap-composer__tabs" role="tablist" aria-label="Interaction type">
          ${tabs.map((t) => `<button class="ap-composer__tab" type="button" data-composer-tab="${t.key}" aria-pressed="${t.key === composerTab}" role="tab">${t.label}</button>`).join('')}
        </div>
        <div id="apComposerForm"></div>
      </div>`;
    $('apComposer').querySelectorAll('[data-composer-tab]').forEach((btn) => {
      btn.addEventListener('click', () => { composerTab = btn.dataset.composerTab; renderComposer(); });
    });
    renderComposerForm();
  }
  function renderComposerForm() {
    const host = $('apComposerForm');
    if (composerTab === 'note') {
      host.innerHTML = `
        <div class="ap-composer__form">
          <div class="field"><label class="field__label" for="apNoteText">Note</label><textarea class="textarea" id="apNoteText" placeholder="What happened?"></textarea></div>
          <div class="field"><label class="field__label" for="apNoteFollowUp">Follow-up date (optional)</label><input class="input" id="apNoteFollowUp" type="date" /></div>
          <div class="ap-composer__actions">
            <button class="btn btn--accent" type="button" id="apSaveNote"><span class="btn__spinner" aria-hidden="true"></span><span>Save note</span></button>
          </div>
        </div>`;
      $('apSaveNote').addEventListener('click', () => {
        const text = $('apNoteText').value.trim();
        if (!text) { window.PlayShell.toast('error', 'Add a note first', 'Write something before saving.'); return; }
        const followUp = $('apNoteFollowUp').value || null;
        addActivity({ type: 'note', title: 'Note added', detail: text });
        if (followUp) patch({ nextFollowUp: followUp });
        window.PlayShell.toast('success', 'Note saved', 'Added to the activity timeline.');
        composerTab = 'note';
        render();
      });
    } else if (composerTab === 'call') {
      host.innerHTML = `
        <div class="ap-composer__form">
          <div class="field"><label class="field__label" for="apCallOutcome">Outcome</label>
            <select class="select" id="apCallOutcome"><option value="Answered">Answered</option><option value="No answer">No answer</option><option value="Voicemail">Voicemail</option></select>
          </div>
          <div class="field"><label class="field__label" for="apCallNotes">Notes</label><textarea class="textarea" id="apCallNotes" placeholder="Summary of the call…"></textarea></div>
          <div class="field"><label class="field__label" for="apCallFollowUp">Next follow-up date</label><input class="input" id="apCallFollowUp" type="date" /></div>
          <div class="ap-composer__actions">
            <button class="btn btn--accent" type="button" id="apSaveCall"><span class="btn__spinner" aria-hidden="true"></span><span>Save call</span></button>
          </div>
        </div>`;
      $('apSaveCall').addEventListener('click', () => {
        const outcome = $('apCallOutcome').value;
        const notes = $('apCallNotes').value.trim();
        const followUp = $('apCallFollowUp').value || null;
        addActivity({ type: 'call', title: `Call logged — ${outcome}`, detail: notes });
        if (followUp) patch({ nextFollowUp: followUp });
        window.PlayShell.toast('success', 'Call logged', 'Added to the activity timeline.');
        composerTab = 'call';
        render();
      });
    } else {
      const defaultRecipient = enquiry.email || '';
      host.innerHTML = `
        <div class="ap-composer__form">
          <div class="field"><label class="field__label" for="apEmailTo">Recipient</label><input class="input" id="apEmailTo" type="email" value="${escapeHtml(defaultRecipient)}" ${defaultRecipient ? 'disabled' : ''} /></div>
          <div class="field"><label class="field__label" for="apEmailSubject">Subject <span class="req">*</span></label><input class="input" id="apEmailSubject" type="text" /><p class="field__error" id="err-apEmailSubject" hidden></p></div>
          <div class="field"><label class="field__label" for="apEmailBody">Summary <span class="req">*</span></label><textarea class="textarea" id="apEmailBody" placeholder="What was this email about?"></textarea><p class="field__error" id="err-apEmailBody" hidden></p></div>
          <p class="field__text" style="font-size: var(--fs-caption); color: var(--color-text-muted);">This logs the interaction for the record — there's no email-sending integration in this project, so nothing is actually sent.</p>
          <div class="ap-composer__actions">
            <button class="btn btn--accent" type="button" id="apSaveEmail"><span class="btn__spinner" aria-hidden="true"></span><span>Save interaction</span></button>
          </div>
        </div>`;
      $('apSaveEmail').addEventListener('click', () => {
        clearFieldError('apEmailSubject'); clearFieldError('apEmailBody');
        const subject = $('apEmailSubject').value.trim();
        const body = $('apEmailBody').value.trim();
        let ok = true;
        if (!subject) { setFieldError('apEmailSubject', 'Enter a subject.'); ok = false; }
        if (!body) { setFieldError('apEmailBody', 'Enter a summary.'); ok = false; }
        if (!ok) return;
        addActivity({ type: 'email', title: `Email logged: ${subject}`, detail: body });
        window.PlayShell.toast('success', 'Email interaction logged', 'This was recorded, not sent — no email integration exists here.');
        composerTab = 'email';
        render();
      });
    }
  }

  /* ========================================================================
     TIMELINE
     ======================================================================== */
  function renderTimeline() {
    const events = timelineEvents();
    const body = events.length
      ? `<div class="ap-timeline">${events.map((e, i) => timelineItemHtml(e, i)).join('')}</div>`
      : `<div class="profile-empty">${ICON.inbox}<div>No activity yet. Log your first interaction above.</div></div>`;
    $('apTimeline').innerHTML = `<div class="ap-timeline-card"><div class="ap-timeline-card__title">Activity timeline</div>${body}</div>`;
  }
  const EVENT_ICON = {
    stage: ICON.stage, note: ICON.note, call: ICON.call, email: ICON.mail,
    document: ICON.document, offer_sent: ICON.send, offer_prepared: ICON.send,
    followup_created: ICON.task, followup_completed: ICON.check, enrolment_started: ICON.enrol,
  };
  function timelineItemHtml(e, i) {
    return `
      <div class="ap-tl-item ap-tl-item--${e.type}" style="animation-delay:${Math.min(i, 12) * 30}ms">
        <span class="ap-tl-item__icon">${EVENT_ICON[e.type] || ICON.note}</span>
        <div class="ap-tl-item__body">
          <div class="ap-tl-item__title">${escapeHtml(e.title)}</div>
          ${e.detail ? `<div class="ap-tl-item__detail">${escapeHtml(e.detail)}</div>` : ''}
          <div class="ap-tl-item__meta">${e.actor ? escapeHtml(e.actor) + ' · ' : ''}${formatDateTime(e.at)}</div>
        </div>
      </div>`;
  }

  /* ========================================================================
     RIGHT COLUMN — DETAILS (family, child, siblings)
     ======================================================================== */
  function renderDetailsSection() {
    $('apDetailsSection').innerHTML = `
      <div class="profile-card" style="margin-bottom: var(--space-5);">
        <div class="profile-card__head">
          <span class="profile-card__title">Family details</span>
          <button class="profile-card__edit" type="button" id="apEditFamilyBtn" aria-label="Edit family details">${ICON.pencil}</button>
        </div>
        <div class="profile-row"><span class="profile-row__label">Parent / guardian</span><span class="profile-row__value">${escapeHtml(enquiry.parentName || 'Not provided')}</span></div>
        <div class="profile-row"><span class="profile-row__label">Phone</span><span class="profile-row__value">${enquiry.phone ? `<a href="tel:${escapeHtml(enquiry.phone)}">${escapeHtml(enquiry.phone)}</a>` : 'Not provided'}</span></div>
        <div class="profile-row"><span class="profile-row__label">Email</span><span class="profile-row__value">${enquiry.email ? `<a href="mailto:${escapeHtml(enquiry.email)}">${escapeHtml(enquiry.email)}</a>` : 'Not provided'}</span></div>
        <div class="profile-row"><span class="profile-row__label">Relationship</span><span class="profile-row__value">Parent / guardian</span></div>
        <div class="profile-row"><span class="profile-row__label">Admissions owner</span><span class="profile-row__value">${escapeHtml(enquiry.ownerName || 'Unassigned')}</span></div>
      </div>
      <div class="profile-card" style="margin-bottom: var(--space-5);">
        <div class="profile-card__head">
          <span class="profile-card__title">Child details</span>
          <button class="profile-card__edit" type="button" id="apEditChildBtn" aria-label="Edit child details">${ICON.pencil}</button>
        </div>
        <div class="profile-row"><span class="profile-row__label">Name</span><span class="profile-row__value">${escapeHtml(enquiry.childName)}</span></div>
        <div class="profile-row"><span class="profile-row__label">Date of birth</span><span class="profile-row__value">${enquiry.dob ? formatDate(enquiry.dob) : 'Not provided'}</span></div>
        <div class="profile-row"><span class="profile-row__label">Age at preferred start</span><span class="profile-row__value">${ageAtStart(enquiry.dob, enquiry.preferredStart) || 'Not provided'}</span></div>
        <div class="profile-row"><span class="profile-row__label">Program</span><span class="profile-row__value">${escapeHtml(enquiry.program || 'Not provided')}</span></div>
        <div class="profile-row"><span class="profile-row__label">Preferred start</span><span class="profile-row__value">${formatMonth(enquiry.preferredStart)}</span></div>
        <div class="profile-row"><span class="profile-row__label">Source</span><span class="profile-row__value">${escapeHtml(enquiry.source || 'Not provided')}</span></div>
        <div class="profile-row"><span class="profile-row__label">Admission notes</span><span class="profile-row__value">${enquiry.notes ? escapeHtml(enquiry.notes) : 'Not provided'}</span></div>
      </div>
      <div class="profile-card" id="apSiblingsCard" style="margin-bottom: var(--space-5);">
        <div class="profile-card__head"><span class="profile-card__title">Siblings</span></div>
        <div id="apSiblingsBody"></div>
      </div>
      ${offerActionHtml()}
      ${enquiry.stage !== 'Enrolled' && enquiry.stage !== 'Lost' ? `<button class="btn btn--secondary" type="button" id="apConvertBtn" style="width:100%;">${ICON.enrol}&nbsp;Convert to enrolled</button>` : ''}`;
    $('apEditFamilyBtn').addEventListener('click', openFamilyModal);
    $('apEditChildBtn').addEventListener('click', openChildModal);
    const convertBtn = $('apConvertBtn');
    if (convertBtn) convertBtn.addEventListener('click', () => openModal('apEnrolBackdrop'));
    const offerBtn = $('apSendOfferBtn');
    if (offerBtn) offerBtn.addEventListener('click', openOfferModal);
    renderSiblings();
  }
  function offerActionHtml() {
    if (enquiry.stage !== 'Applied' && enquiry.stage !== 'Offer sent') return '';
    const already = enquiry.offer && enquiry.offer.sentAt;
    return `<button class="btn btn--accent" type="button" id="apSendOfferBtn" style="width:100%; margin-bottom: var(--space-5);">${ICON.send}&nbsp;${already ? 'Edit & resend offer' : 'Send offer'}</button>`;
  }

  /* ---------- siblings ---------- */
  function renderSiblings() {
    const ids = enquiry.siblingChildIds || [];
    const children = ids.map((id) => window.PlayStore.getById(id)).filter(Boolean);
    const body = $('apSiblingsBody');
    if (!children.length) {
      body.innerHTML = `<div class="profile-empty">${ICON.inbox}<div>No siblings linked yet.</div></div><button class="btn btn--secondary" type="button" id="apLinkSiblingBtn" style="width:100%; margin-top: var(--space-3);">Link existing sibling</button>`;
    } else {
      body.innerHTML = `<div class="profile-people">${children.map((c) => `
        <div class="profile-person">
          <span class="profile-person__avatar">${escapeHtml(initials(c.name))}</span>
          <span class="profile-person__body"><span class="profile-person__name">${escapeHtml(c.name)}</span><span class="profile-person__sub">${escapeHtml(c.room || '—')}</span></span>
          <span class="profile-person__actions"><a class="btn btn--secondary btn--sm" href="record.html?id=${encodeURIComponent(c.id)}">View</a></span>
        </div>`).join('')}</div>
        <button class="btn btn--secondary btn--sm" type="button" id="apLinkSiblingBtn" style="width:100%; margin-top: var(--space-3);">Link another sibling</button>`;
    }
    $('apLinkSiblingBtn').addEventListener('click', openSiblingModal);
  }
  function wireSiblingModal() {
    $('apSiblingSearch').addEventListener('input', renderSiblingSearchResults);
  }
  function openSiblingModal() {
    $('apSiblingSearch').value = '';
    renderSiblingSearchResults();
    openModal('apSiblingModalBackdrop');
    window.setTimeout(() => $('apSiblingSearch').focus(), 50);
  }
  function renderSiblingSearchResults() {
    const q = $('apSiblingSearch').value.trim().toLowerCase();
    const linked = new Set(enquiry.siblingChildIds || []);
    const results = $('apSiblingResults');
    if (!q) { results.innerHTML = '<p class="card__text" style="font-size:var(--fs-caption); color:var(--color-text-muted);">Start typing a child\'s name…</p>'; return; }
    const matches = window.PlayStore.getByType('Child').filter((c) => c.name.toLowerCase().includes(q) && !linked.has(c.id)).slice(0, 10);
    if (!matches.length) { results.innerHTML = '<p class="card__text" style="font-size:var(--fs-caption); color:var(--color-text-muted);">No matching children found.</p>'; return; }
    results.innerHTML = matches.map((c) => `
      <div class="ap-sibling-search-item">
        <span>${escapeHtml(c.name)} <span style="color:var(--color-text-muted); font-size:var(--fs-caption);">· ${escapeHtml(c.room || '—')}</span></span>
        <button class="btn btn--accent btn--sm" type="button" data-link-id="${c.id}">Link</button>
      </div>`).join('');
    results.querySelectorAll('[data-link-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = Array.from(new Set((enquiry.siblingChildIds || []).concat([btn.dataset.linkId])));
        patch({ siblingChildIds: next });
        window.PlayShell.toast('success', 'Sibling linked', 'Added to this applicant\'s family record.');
        closeModal('apSiblingModalBackdrop');
        renderDetailsSection();
      });
    });
  }

  /* ---------- edit family / child modals ---------- */
  function wireFamilyModal() {
    $('apFamilySave').addEventListener('click', () => {
      if (familyFormSubmitting) return;
      clearFieldError('apfName'); clearFieldError('apfPhone'); clearFieldError('apfEmail');
      const name = $('apfName').value.trim();
      const phone = $('apfPhone').value.trim();
      const email = $('apfEmail').value.trim();
      let ok = true;
      if (!name) { setFieldError('apfName', 'Enter a name.'); ok = false; }
      if (!phone) { setFieldError('apfPhone', 'Enter a phone number.'); ok = false; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('apfEmail', 'Enter a valid email.'); ok = false; }
      if (!ok) return;
      familyFormSubmitting = true;
      const ownerId = $('apfOwner').value || null;
      const ownerStaff = ownerId ? window.PlayStore.getById(ownerId) : null;
      patch({ parentName: name, phone, email, ownerId, ownerName: ownerStaff ? ownerStaff.name : null });
      familyFormSubmitting = false;
      closeModal('apFamilyModalBackdrop');
      window.PlayShell.toast('success', 'Family details updated', '');
      render();
    });
  }
  function openFamilyModal() {
    const staff = window.PlayStore.getByType('Staff').filter((s) => s.status === 'Active');
    $('apfOwner').innerHTML = '<option value="">Unassigned</option>' + staff.map((s) => `<option value="${s.id}" ${s.id === enquiry.ownerId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('');
    $('apfName').value = enquiry.parentName || '';
    $('apfPhone').value = enquiry.phone || '';
    $('apfEmail').value = enquiry.email || '';
    ['apfName', 'apfPhone', 'apfEmail'].forEach(clearFieldError);
    openModal('apFamilyModalBackdrop');
  }
  function wireChildModal() {
    $('apChildSave').addEventListener('click', () => {
      if (childFormSubmitting) return;
      clearFieldError('apcName');
      const name = $('apcName').value.trim();
      if (!name) { setFieldError('apcName', "Enter the child's name."); return; }
      childFormSubmitting = true;
      patch({
        childName: name, dob: $('apcDob').value || null, program: $('apcProgram').value || null,
        preferredStart: $('apcStart').value || null, source: $('apcSource').value, notes: $('apcNotes').value.trim(),
      });
      childFormSubmitting = false;
      closeModal('apChildModalBackdrop');
      window.PlayShell.toast('success', 'Child details updated', '');
      render();
    });
  }
  function openChildModal() {
    const classes = window.PlayStore.getByType('Class');
    $('apcProgram').innerHTML = '<option value="">Not set</option>' + classes.map((c) => `<option value="${escapeHtml(c.name)}" ${c.name === enquiry.program ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
    $('apcName').value = enquiry.childName || '';
    $('apcDob').value = enquiry.dob || '';
    $('apcStart').value = enquiry.preferredStart || '';
    $('apcSource').value = enquiry.source || 'Website';
    $('apcNotes').value = enquiry.notes || '';
    clearFieldError('apcName');
    openModal('apChildModalBackdrop');
  }

  /* ========================================================================
     DOCUMENTS
     ======================================================================== */
  function renderDocumentsSection() {
    const docs = enquiry.documents || {};
    const uploadedCount = DOC_TYPES.filter((d) => docs[d.key] && docs[d.key].status === 'Uploaded').length;
    const pct = Math.round((uploadedCount / DOC_TYPES.length) * 100);
    $('apDocumentsSection').innerHTML = `
      <div class="profile-card">
        <div class="profile-card__head"><span class="profile-card__title">Documents</span></div>
        <div class="ap-doc-progress"><span>${uploadedCount} of ${DOC_TYPES.length} documents received</span><span>${pct}%</span></div>
        <div class="ap-doc-progress-bar"><div class="ap-doc-progress-bar__fill" style="width:${pct}%"></div></div>
        ${DOC_TYPES.map((d) => docRowHtml(d, docs[d.key])).join('')}
        <p class="ap-doc-note">Demo storage only — files are kept as local data in this browser, not a real secure cloud document store, and capped at ${Math.round(DOC_MAX_BYTES / 1024)}KB each.</p>
      </div>`;
    DOC_TYPES.forEach((d) => wireDocRow(d));
  }
  function docRowHtml(d, doc) {
    const status = doc ? doc.status : 'Not uploaded';
    const cls = status === 'Uploaded' ? ' ap-doc-row--uploaded' : '';
    return `
      <div class="ap-doc-row${cls}">
        <span class="ap-doc-row__icon">${status === 'Uploaded' ? ICON.check : ICON.document}</span>
        <div class="ap-doc-row__body">
          <div class="ap-doc-row__name">${escapeHtml(d.label)}</div>
          <div class="ap-doc-row__meta">
            ${status === 'Uploaded' ? `${escapeHtml(doc.fileName)} · uploaded ${formatDate((doc.uploadedAt || '').slice(0, 10))}` : status === 'Uploading' ? 'Uploading…' : status === 'Upload failed' ? 'Upload failed — try again' : 'Not uploaded'}
          </div>
        </div>
        <div class="ap-doc-row__actions">
          ${status === 'Uploaded' ? `<a class="btn btn--secondary btn--sm" href="${doc.dataUrl}" download="${escapeHtml(doc.fileName)}" aria-label="Download ${escapeHtml(d.label)}">${ICON.eye}</a>` : ''}
          <button class="btn btn--secondary btn--sm" type="button" data-doc-upload="${d.key}">${status === 'Uploaded' ? 'Replace' : 'Upload'}</button>
          ${status === 'Uploaded' ? `<button class="btn btn--icon" type="button" data-doc-remove="${d.key}" aria-label="Remove ${escapeHtml(d.label)}">${ICON.trash}</button>` : ''}
          <input type="file" hidden id="apDocInput-${d.key}" accept="image/*,application/pdf" />
        </div>
      </div>`;
  }
  function wireDocRow(d) {
    const uploadBtn = document.querySelector(`[data-doc-upload="${d.key}"]`);
    const removeBtn = document.querySelector(`[data-doc-remove="${d.key}"]`);
    const input = $('apDocInput-' + d.key);
    if (uploadBtn) uploadBtn.addEventListener('click', () => input.click());
    if (input) input.addEventListener('change', (e) => handleDocUpload(d, e.target.files[0]));
    if (removeBtn) removeBtn.addEventListener('click', () => {
      const docs = Object.assign({}, enquiry.documents);
      delete docs[d.key];
      patch({ documents: docs });
      window.PlayShell.toast('success', 'Document removed', escapeHtml(d.label));
      render();
    });
  }
  function handleDocUpload(d, file) {
    if (!file) return;
    if (!/^image\/|^application\/pdf$/.test(file.type)) {
      window.PlayShell.toast('error', 'Unsupported file type', 'Please upload an image or PDF.');
      return;
    }
    if (file.size > DOC_MAX_BYTES) {
      window.PlayShell.toast('warning', 'File too large', `Please choose a file under ${Math.round(DOC_MAX_BYTES / 1024)}KB for this demo.`);
      const docs = Object.assign({}, enquiry.documents, { [d.key]: { status: 'Upload failed' } });
      patch({ documents: docs });
      render();
      return;
    }
    const docs = Object.assign({}, enquiry.documents, { [d.key]: { status: 'Uploading' } });
    patch({ documents: docs });
    render();
    const reader = new FileReader();
    reader.onload = () => {
      const nowIso = new Date().toISOString();
      const finalDocs = Object.assign({}, enquiry.documents, { [d.key]: { status: 'Uploaded', fileName: file.name, uploadedAt: nowIso, dataUrl: reader.result } });
      patch({ documents: finalDocs });
      addActivity({ type: 'document', title: `Document uploaded: ${d.label}`, detail: file.name });
      window.PlayShell.toast('success', 'Document uploaded', d.label);
      render();
    };
    reader.onerror = () => {
      const failDocs = Object.assign({}, enquiry.documents, { [d.key]: { status: 'Upload failed' } });
      patch({ documents: failDocs });
      window.PlayShell.toast('error', 'Upload failed', 'Please try again.');
      render();
    };
    reader.readAsDataURL(file);
  }

  /* ========================================================================
     FOLLOW-UP TASKS
     ======================================================================== */
  function notifyOverdueFollowUpsOnce() {
    const today = todayISO();
    const tasks = enquiry.followUps || [];
    let changed = false;
    const next = tasks.map((t) => {
      if (t.status === 'Open' && t.dueDate && t.dueDate < today && !t.notifiedOverdue) {
        changed = true;
        window.PlayShell.addNotification({
          title: 'Overdue follow-up', text: `"${t.title}" for ${enquiry.childName} is overdue.`,
          forRole: 'Admin', module: 'admissions', mention: true, recordRoute: 'applicant-profile.html?id=' + enquiry.id,
        });
        return Object.assign({}, t, { notifiedOverdue: true });
      }
      return t;
    });
    if (changed) patch({ followUps: next });
  }
  function renderTasksSection() {
    const tasks = (enquiry.followUps || []).slice().sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Open' ? -1 : 1;
      return (a.dueDate || '').localeCompare(b.dueDate || '');
    });
    const today = todayISO();
    $('apTasksSection').innerHTML = `
      <div class="profile-card">
        <div class="profile-card__head"><span class="profile-card__title">Follow-up tasks</span></div>
        ${tasks.length ? tasks.map((t) => taskRowHtml(t, today)).join('') : `<div class="profile-empty">${ICON.inbox}<div>No follow-ups yet.</div></div>`}
        <button class="btn btn--secondary btn--sm" type="button" id="apAddTaskBtn" style="width:100%; margin-top: var(--space-4);">${ICON.plus}&nbsp;Add follow-up</button>
      </div>`;
    $('apAddTaskBtn').addEventListener('click', openTaskModal);
    tasks.forEach((t) => {
      const btn = document.querySelector(`[data-task-complete="${t.id}"]`);
      if (btn) btn.addEventListener('click', () => completeTask(t.id));
    });
  }
  function taskRowHtml(t, today) {
    const overdue = t.status === 'Open' && t.dueDate && t.dueDate < today;
    return `
      <div class="ap-task-row${t.status === 'Done' ? ' ap-task-row--done' : ''}">
        <div class="ap-task-row__body">
          <div class="ap-task-row__title">${escapeHtml(t.title)}</div>
          <div class="ap-task-row__meta${overdue ? ' is-overdue' : ''}">
            ${overdue ? '<span class="badge badge--error">Overdue</span>' : ''}
            <span>Due ${formatDate(t.dueDate)}</span>
            ${t.assigneeName ? `<span>· ${escapeHtml(t.assigneeName)}</span>` : ''}
          </div>
        </div>
        ${t.status === 'Open' ? `<button class="btn btn--secondary btn--sm" type="button" data-task-complete="${t.id}">Mark complete</button>` : `<span class="badge badge--success">Done</span>`}
      </div>`;
  }
  function completeTask(id) {
    const tasks = (enquiry.followUps || []).map((t) => t.id === id ? Object.assign({}, t, { status: 'Done', completedAt: new Date().toISOString() }) : t);
    patch({ followUps: tasks });
    const t = tasks.find((x) => x.id === id);
    addActivity({ type: 'followup_completed', title: `Follow-up completed: ${t.title}` });
    window.PlayShell.toast('success', 'Task completed', t.title);
    render();
  }
  function wireTaskModal() {
    $('apTaskSave').addEventListener('click', () => {
      if (taskSubmitting) return;
      clearFieldError('aptTitle'); clearFieldError('aptDate');
      const title = $('aptTitle').value.trim();
      const dueDate = $('aptDate').value;
      let ok = true;
      if (!title) { setFieldError('aptTitle', 'Enter a task title.'); ok = false; }
      if (!dueDate) { setFieldError('aptDate', 'Choose a due date.'); ok = false; }
      if (!ok) return;
      taskSubmitting = true;
      const assigneeId = $('aptAssignee').value || null;
      const assigneeStaff = assigneeId ? window.PlayStore.getById(assigneeId) : null;
      const task = {
        id: uid('TASK'), title, dueDate, assigneeId, assigneeName: assigneeStaff ? assigneeStaff.name : null,
        notes: $('aptNotes').value.trim(), status: 'Open', createdAt: new Date().toISOString(), notifiedOverdue: false,
      };
      patch({ followUps: (enquiry.followUps || []).concat([task]) });
      addActivity({ type: 'followup_created', title: `Follow-up created: ${title}`, detail: `Due ${formatDate(dueDate)}` });
      if (assigneeStaff) {
        window.PlayShell.addNotification({
          title: 'New follow-up assigned', text: `"${title}" for ${enquiry.childName}, due ${formatDate(dueDate)}.`,
          forRole: 'Admin', module: 'admissions', mention: true, recordRoute: 'applicant-profile.html?id=' + enquiry.id,
        });
      }
      taskSubmitting = false;
      closeModal('apTaskModalBackdrop');
      window.PlayShell.toast('success', 'Follow-up added', title);
      render();
    });
  }
  function openTaskModal() {
    const staff = window.PlayStore.getByType('Staff').filter((s) => s.status === 'Active');
    $('aptAssignee').innerHTML = '<option value="">Unassigned</option>' + staff.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    $('aptTitle').value = ''; $('aptDate').value = ''; $('aptNotes').value = '';
    clearFieldError('aptTitle'); clearFieldError('aptDate');
    openModal('apTaskModalBackdrop');
  }

  /* ========================================================================
     SEND OFFER (3-step wizard)
     ======================================================================== */
  function defaultOfferBody() {
    return `Dear {{parent_name}},\n\nWe're delighted to offer {{child_name}} a place at Play School, starting {{start_date}}.\n\nTuition for this term is {{fees}}. Please confirm within 7 days to secure the place.\n\nWarm regards,\nPlay School Admissions`;
  }
  function wireOfferModal() { /* body rendered on open */ }
  function openOfferModal() {
    offerStep = 1;
    offerDraft = enquiry.offer ? {
      subject: enquiry.offer.subject, body: enquiry.offer.body, fees: enquiry.offer.fees,
    } : { subject: `Your offer from Play School — ${enquiry.childName}`, body: defaultOfferBody(), fees: '' };
    offerSubmitting = false;
    renderOfferStep();
    openModal('apOfferBackdrop');
  }
  function resolveOfferVars(str) {
    return str
      .replace(/\{\{child_name\}\}/g, enquiry.childName || '')
      .replace(/\{\{parent_name\}\}/g, enquiry.parentName || '')
      .replace(/\{\{start_date\}\}/g, formatMonth(enquiry.preferredStart))
      .replace(/\{\{fees\}\}/g, offerDraft.fees || '{{fees}}');
  }
  function renderOfferStep() {
    document.querySelectorAll('#apOfferSteps .ap-offer-step').forEach((el) => el.classList.toggle('is-current', Number(el.dataset.step) === offerStep));
    const body = $('apOfferBody');
    const actions = $('apOfferActions');
    if (offerStep === 1) {
      body.innerHTML = `
        <div class="field"><label class="field__label" for="apOfferSubject">Subject <span class="req">*</span></label><input class="input" id="apOfferSubject" type="text" value="${escapeHtml(offerDraft.subject)}" /><p class="field__error" id="err-apOfferSubject" hidden></p></div>
        <div class="field"><label class="field__label" for="apOfferFees">Fees <span class="req">*</span></label><input class="input" id="apOfferFees" type="text" placeholder="e.g. £1,450 per term" value="${escapeHtml(offerDraft.fees)}" /><p class="field__error" id="err-apOfferFees" hidden></p></div>
        <div class="field"><label class="field__label" for="apOfferContent">Offer content <span class="req">*</span></label><textarea class="textarea" id="apOfferContent" style="min-height:160px;">${escapeHtml(offerDraft.body)}</textarea><p class="field__error" id="err-apOfferContent" hidden></p></div>
        <div><p class="field__label" style="margin-bottom:6px;">Available variables</p><div class="ap-offer-vars"><span class="ap-offer-var">{{child_name}}</span><span class="ap-offer-var">{{parent_name}}</span><span class="ap-offer-var">{{start_date}}</span><span class="ap-offer-var">{{fees}}</span></div></div>`;
      actions.innerHTML = `<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--accent" type="button" id="apOfferNext1">Preview</button>`;
      $('apOfferNext1').addEventListener('click', () => {
        clearFieldError('apOfferSubject'); clearFieldError('apOfferFees'); clearFieldError('apOfferContent');
        const subject = $('apOfferSubject').value.trim();
        const fees = $('apOfferFees').value.trim();
        const content = $('apOfferContent').value.trim();
        let ok = true;
        if (!subject) { setFieldError('apOfferSubject', 'Enter a subject.'); ok = false; }
        if (!fees) { setFieldError('apOfferFees', 'Enter the fees — the {{fees}} variable needs a value before you can send.'); ok = false; }
        if (!content) { setFieldError('apOfferContent', 'Enter the offer content.'); ok = false; }
        if (!ok) return;
        offerDraft = { subject, fees, body: content };
        offerStep = 2;
        renderOfferStep();
      });
    } else if (offerStep === 2) {
      const resolvedSubject = resolveOfferVars(offerDraft.subject);
      const resolvedBody = resolveOfferVars(offerDraft.body);
      body.innerHTML = `
        <div><p class="field__label" style="margin-bottom:6px;">Subject</p><div class="ap-offer-preview">${escapeHtml(resolvedSubject)}</div></div>
        <div><p class="field__label" style="margin-bottom:6px;">Content</p><div class="ap-offer-preview">${escapeHtml(resolvedBody)}</div></div>`;
      actions.innerHTML = `<button class="btn btn--ghost" type="button" id="apOfferBack2">Back to editor</button><button class="btn btn--accent" type="button" id="apOfferNext2">Continue</button>`;
      $('apOfferBack2').addEventListener('click', () => { offerStep = 1; renderOfferStep(); });
      $('apOfferNext2').addEventListener('click', () => { offerStep = 3; renderOfferStep(); });
    } else {
      body.innerHTML = `
        <div class="ap-offer-demo-note">This project has no real email-delivery integration. "Mark as sent" records the offer and moves this applicant to <strong>Offer sent</strong> — it does not deliver an email.</div>
        <div><p class="field__label" style="margin-bottom:6px;">Ready to send</p><div class="ap-offer-preview">${escapeHtml(resolveOfferVars(offerDraft.subject))}</div></div>`;
      actions.innerHTML = `<button class="btn btn--ghost" type="button" id="apOfferBack3">Back to preview</button><button class="btn btn--accent" type="button" id="apOfferSend"><span class="btn__spinner" aria-hidden="true"></span><span>Mark as sent (demo)</span></button>`;
      $('apOfferBack3').addEventListener('click', () => { offerStep = 2; renderOfferStep(); });
      $('apOfferSend').addEventListener('click', () => {
        if (offerSubmitting) return;
        offerSubmitting = true;
        const btn = $('apOfferSend'); btn.classList.add('is-loading'); btn.disabled = true;
        window.setTimeout(() => {
          const nowIso = new Date().toISOString();
          const offer = { subject: offerDraft.subject, body: offerDraft.body, fees: offerDraft.fees, preparedAt: enquiry.offer ? enquiry.offer.preparedAt : nowIso, sentAt: nowIso };
          patch({ offer });
          addActivity({ type: 'offer_sent', title: 'Offer marked as sent (demo)', detail: resolveOfferVars(offerDraft.subject) });
          if (enquiry.stage !== 'Offer sent') commitStageChange('Offer sent');
          offerSubmitting = false;
          closeModal('apOfferBackdrop');
          window.PlayShell.toast('success', 'Offer marked as sent', 'No real email was delivered — this is a demo action.');
          render();
        }, 500);
      });
    }
  }

  /* ========================================================================
     DELETE
     ======================================================================== */
  function wireDeleteModal() {
    $('apDeleteConfirm').addEventListener('click', () => {
      window.PlayStore.removeRecord(enquiry.id);
      window.PlayShell.toast('success', 'Enquiry deleted', '');
      window.location.href = 'admissions.html';
    });
  }

  /* ========================================================================
     MOBILE TABS
     ======================================================================== */
  let activeMobileTab = 'timeline';
  function wireMobileTabs() {
    $('apMobileTabs').querySelectorAll('[data-ap-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeMobileTab = btn.dataset.apTab;
        $('apMobileTabs').querySelectorAll('[data-ap-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.apTab === activeMobileTab)));
        applyMobileTabVisibility();
      });
    });
    window.addEventListener('resize', debounce(applyMobileTabVisibility, 150));
  }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function applyMobileTabVisibility() {
    const sections = document.querySelectorAll('[data-ap-tab]:not(button)');
    if (window.innerWidth < 768) {
      sections.forEach((el) => { el.style.display = el.dataset.apTab === activeMobileTab ? '' : 'none'; });
    } else {
      sections.forEach((el) => { el.style.display = ''; });
    }
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
