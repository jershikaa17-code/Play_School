/* ==========================================================================
   PLAY SCHOOL — Child Enrolment & Edit
   Reuses: store.js (Child/Guardian/Class records + persistence), modules.js
   (plan checks), shell.js (shell chrome, toasts, notifications). Writes
   through PlayStore.addRecord/updateRecord so S12 (children.html), S13
   (record.html) and S18 (class rosters, derived from Child.room) all see
   the same data immediately — there is no separate enrolment store.

   Known integration gaps (no dedicated pages/records exist for these yet):
   - S09 waitlist: represented as a Child record with status 'Waitlisted'
     (shows up in S12/S13 like any other child) rather than a tracked queue.
   - S15 family management: no standalone page yet; guardians/households are
     Guardian records linked to the child, visible from S12/S13 today.
   - Teacher notifications are role-addressed (forRole: 'Teacher'), since the
     shared notification store has no per-staff-member inbox.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function initials(name) { const p = String(name || '').trim().split(/\s+/); return p[0] ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '?'; }
  function ageLabel(dob) {
    if (!dob) return '—';
    const d = new Date(dob + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    const now = new Date();
    let y = now.getFullYear() - d.getFullYear(), m = now.getMonth() - d.getMonth();
    if (now.getDate() < d.getDate()) m -= 1;
    if (m < 0) { y -= 1; m += 12; }
    y = Math.max(y, 0);
    return y + 'y ' + m + 'm';
  }

  const ICON = {
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    shieldOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/><line x1="4.5" y1="4.5" x2="19.5" y2="19.5"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
  };

  const STEPS = [
    { key: 'details', label: 'Child details', hint: 'Basic information' },
    { key: 'guardians', label: 'Guardians & households', hint: 'Family' },
    { key: 'emergency', label: 'Emergency & pickup', hint: 'Safety' },
    { key: 'health', label: 'Health', hint: 'Medical & dietary' },
    { key: 'schedule', label: 'Class & schedule', hint: 'Enrolment' },
  ];
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const SESSIONS = ['Full day', 'Morning', 'Afternoon'];
  const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Dairy-free', 'Gluten-free', 'Nut-free', 'No pork'];
  const GENDERS = ['Girl', 'Boy', 'Non-binary', 'Prefer not to say'];
  const RELATIONS = ['Mother', 'Father', 'Guardian', 'Grandparent', 'Other'];
  const PHOTO_MAX_BYTES = 800 * 1024;

  let mode = 'new';
  let role = null;
  let currentStep = 0;
  let duplicateMatch = null;
  let duplicateDismissed = false;
  let classFullBlocked = false;
  let saving = false;

  let formState = null;
  function freshFormState() {
    return {
      id: null, firstName: '', lastName: '', preferredName: '', photoDataUrl: null,
      dob: '', gender: '', homeLanguages: '', nationality: '',
      guardians: [], emergencyContacts: [], pickups: [], restricted: [],
      allergies: [], conditions: [], medications: [], dietaryTags: [], dietaryNotes: '',
      immunizationStatus: 'Not recorded', immunizationNotes: '',
      doctor: { name: '', practice: '', phone: '' },
      custodyAlerts: [],
      classId: '', scheduleStartDate: todayISO(), daysAttending: DAYS.slice(), session: 'Full day',
      waitlisted: false, originalStatus: null,
    };
  }

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    window.PlayShell.login();
    role = window.PlayShell.getDemoRole();
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const existing = id ? window.PlayStore.getById(id) : null;

    window.PlayShell.mount('', existing ? 'Edit Child' : 'Enrol a Child');
    $('pageContent').hidden = false;
    document.getElementById('appContent').appendChild($('pageContent'));

    formState = freshFormState();
    if (existing && existing.type === 'Child') {
      mode = 'edit';
      loadChildIntoForm(existing);
      $('enrollTitle').textContent = 'Edit Child';
      $('enrollSubtitle').textContent = `Update ${existing.name}'s details, family, safety and class information.`;
      $('enrollBreadcrumb').textContent = 'Edit ' + existing.name;
    } else {
      mode = 'new';
      $('enrollBreadcrumb').textContent = 'Enrol a child';
    }

    renderAll();
    wireFooter();
  }

  function classRecords() { return window.PlayStore.getByType('Class'); }
  function enrolledCountFor(classRecord) {
    return window.PlayStore.getByType('Child').filter((c) => c.room === classRecord.name && c.status === 'Active' && c.id !== formState.id).length;
  }

  /* ---------- load existing child (edit mode) ---------- */
  function loadChildIntoForm(child) {
    const f = formState;
    f.id = child.id;
    f.originalStatus = child.status;
    f.firstName = child.firstName || (child.name || '').split(' ')[0] || '';
    f.lastName = child.lastName || (child.name || '').split(' ').slice(1).join(' ') || '';
    f.preferredName = child.preferredName || '';
    f.photoDataUrl = child.photoDataUrl || null;
    f.dob = child.dob || '';
    f.gender = child.gender || '';
    f.homeLanguages = child.homeLanguages || '';
    f.nationality = child.nationality || '';

    if (Array.isArray(child.guardians) && child.guardians.length) {
      f.guardians = child.guardians.map((g) => Object.assign({}, g));
    } else if (child.guardianId) {
      const g = window.PlayStore.getById(child.guardianId);
      if (g) {
        const contact = g.contact || '';
        f.guardians = [{
          id: uid('TMP'), existingGuardianId: g.id, name: g.name,
          relation: (g.relation || '').replace('Parent of ' + child.name, '').replace(/^[\s()]*|[\s()]*$/g, '') || 'Guardian',
          phone: contact.indexOf('@') === -1 ? contact : '', email: contact.indexOf('@') !== -1 ? contact : '',
          primary: true, livesWith: true, parentalResponsibility: true, household: 'A',
        }];
      }
    }

    f.emergencyContacts = Array.isArray(child.emergencyContacts) ? child.emergencyContacts.map((c) => Object.assign({}, c)) : [];
    const pickups = Array.isArray(child.authorizedPickups) ? child.authorizedPickups : [];
    f.pickups = pickups.filter((p) => !p.restricted).map((p) => Object.assign({ idDetails: '', status: 'Authorised' }, p));
    f.restricted = pickups.filter((p) => p.restricted).map((p) => ({ id: p.id, name: p.name, reason: p.restrictionReason || '', documentName: p.documentName || null }));

    const alerts = Array.isArray(child.alerts) ? child.alerts : [];
    f.allergies = Array.isArray(child.healthAllergies) ? child.healthAllergies.map((a) => Object.assign({}, a))
      : alerts.filter((a) => a.type === 'allergy').map((a) => ({ id: a.id || uid('AL'), allergen: a.allergen || '', severity: a.severity || 'Moderate', reaction: a.detail || '', actionPlanDocName: a.actionPlanDocName || null }));
    f.conditions = Array.isArray(child.medicalConditions) ? child.medicalConditions.map((c) => Object.assign({}, c))
      : alerts.filter((a) => a.type === 'medical').map((a) => ({ id: a.id || uid('MC'), name: a.detail || '', notes: '' }));
    f.custodyAlerts = alerts.filter((a) => a.type === 'custody');
    f.medications = Array.isArray(child.medications) ? child.medications.map((m) => Object.assign({}, m)) : [];
    f.dietaryTags = Array.isArray(child.dietaryTags) ? child.dietaryTags.slice() : [];
    f.dietaryNotes = child.dietaryNotes || (alerts.find((a) => a.type === 'dietary') || {}).detail || '';
    f.immunizationStatus = child.immunizationStatus || 'Not recorded';
    f.immunizationNotes = child.immunizationNotes || '';
    f.doctor = child.doctor ? Object.assign({ name: '', practice: '', phone: '' }, child.doctor) : { name: '', practice: '', phone: '' };

    const cls = classRecords().find((c) => c.name === child.room);
    f.classId = cls ? cls.id : '';
    f.scheduleStartDate = child.scheduleStartDate || child.startDate || todayISO();
    f.daysAttending = Array.isArray(child.daysAttending) ? child.daysAttending.slice() : DAYS.slice();
    f.session = child.session || 'Full day';
    f.waitlisted = child.status === 'Waitlisted';
  }

  /* ========================================================================
     ORCHESTRATION
     ======================================================================== */
  function renderAll() {
    renderDuplicateBanner();
    renderStepper();
    renderMobileProgress();
    renderStepContent();
    renderFooter();
  }

  function renderStepper() {
    const nav = $('enrollStepper');
    nav.innerHTML = STEPS.map((s, i) => {
      const state = i < currentStep ? 'is-complete' : i === currentStep ? 'is-current' : '';
      const dotContent = i < currentStep ? `<span class="enroll-step__check">${ICON.check}</span>` : String(i + 1);
      return `
        <button class="enroll-step ${state}" type="button" data-step-index="${i}">
          <span class="enroll-step__dot">${dotContent}</span>
          <span class="enroll-step__body">
            <span class="enroll-step__label">${escapeHtml(s.label)}</span>
            <div class="enroll-step__hint">${escapeHtml(s.hint)}</div>
          </span>
        </button>`;
    }).join('');
    nav.querySelectorAll('[data-step-index]').forEach((btn) => {
      btn.addEventListener('click', () => goToStep(Number(btn.dataset.stepIndex), true));
    });
  }

  function renderMobileProgress() {
    const pct = Math.round(((currentStep + 1) / STEPS.length) * 100);
    $('enrollMobileProgress').innerHTML = `
      <div class="enroll-mobile-progress__row">
        <span>Step ${currentStep + 1} of ${STEPS.length}</span>
        <span class="enroll-mobile-progress__label">${escapeHtml(STEPS[currentStep].label)}</span>
      </div>
      <div class="progress-linear"><div class="progress-linear__bar" style="width:${pct}%; background: linear-gradient(90deg, var(--color-primary-soft), var(--color-primary));"></div></div>`;
  }

  function renderFooter() {
    $('enrollBackBtn').disabled = currentStep === 0;
    const isLast = currentStep === STEPS.length - 1;
    $('enrollNextLabel').textContent = isLast ? (formState.waitlisted ? 'Add to waitlist' : (mode === 'edit' ? 'Save changes' : 'Save child')) : 'Next';
  }

  const STEP_RENDERERS = [renderStepDetails, renderStepGuardians, renderStepEmergency, renderStepHealth, renderStepSchedule];
  const STEP_WIRERS = [wireStepDetails, wireStepGuardians, wireStepEmergency, wireStepHealth, wireStepSchedule];
  function renderStepContent() {
    const panel = $('enrollStepContent');
    panel.innerHTML = '';
    void panel.offsetWidth;
    STEP_RENDERERS[currentStep]();
    STEP_WIRERS[currentStep]();
  }

  function goToStep(index, fromStepper) {
    if (index === currentStep) return;
    if (index > currentStep) {
      for (let i = currentStep; i < index; i++) {
        if (!validateStep(i)) { currentStep = i; renderAll(); return; }
      }
    }
    currentStep = index;
    renderAll();
    if (!fromStepper) $('enrollStepContent').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function wireFooter() {
    $('enrollBackBtn').addEventListener('click', () => { if (currentStep > 0) goToStep(currentStep - 1); });
    $('enrollNextBtn').addEventListener('click', () => {
      if (!validateStep(currentStep)) return;
      if (currentStep < STEPS.length - 1) { goToStep(currentStep + 1); return; }
      performFinalSave();
    });
    $('enrollDraftBtn').addEventListener('click', performSaveDraft);
  }

  /* ---------- shared field helpers ---------- */
  function setFieldError(inputId, message) {
    const input = $(inputId);
    const err = $('err-' + inputId);
    if (!input || !err) return;
    if (message) { err.textContent = message; err.hidden = false; input.closest('.field').classList.add('is-error'); }
    else { err.hidden = true; input.closest('.field').classList.remove('is-error'); }
  }
  function readFile(file, maxBytes, cb) {
    if (!file) return cb(null);
    if (file.size > maxBytes) { window.PlayShell.toast('warning', 'File too large', 'Please choose a smaller image (under ' + Math.round(maxBytes / 1024) + 'KB) for this demo.'); return cb(null); }
    const reader = new FileReader();
    reader.onload = () => cb(reader.result);
    reader.readAsDataURL(file);
  }

  /* ========================================================================
     STEP 1 — CHILD DETAILS
     ======================================================================== */
  function renderStepDetails() {
    const f = formState;
    $('enrollStepContent').innerHTML = `
      <h2 class="enroll-section-title">Child details</h2>
      <p class="enroll-section-text">Basic information about the child. Required fields are marked with an asterisk.</p>

      <div class="enroll-photo">
        <div class="enroll-photo__frame${f.photoDataUrl ? ' has-photo' : ''}" id="edPhotoFrame">
          ${f.photoDataUrl ? `<img src="${f.photoDataUrl}" alt="" />` : ICON.camera}
        </div>
        <div class="enroll-photo__actions">
          <button class="btn btn--secondary btn--sm" type="button" id="edPhotoBtn">${f.photoDataUrl ? 'Change photo' : 'Upload photo'}</button>
          ${f.photoDataUrl ? '<button class="btn btn--ghost btn--sm" type="button" id="edPhotoRemoveBtn">Remove</button>' : ''}
          <input type="file" accept="image/*" id="edPhotoInput" hidden />
        </div>
      </div>

      <div class="enroll-grid">
        <div class="field"><label class="field__label" for="edFirst">First name <span class="req">*</span></label><input class="input" id="edFirst" type="text" value="${escapeHtml(f.firstName)}" /><p class="field__error" id="err-edFirst" hidden></p></div>
        <div class="field"><label class="field__label" for="edLast">Last name <span class="req">*</span></label><input class="input" id="edLast" type="text" value="${escapeHtml(f.lastName)}" /><p class="field__error" id="err-edLast" hidden></p></div>
        <div class="field"><label class="field__label" for="edPreferred">Preferred name <span style="opacity:.6;">(optional)</span></label><input class="input" id="edPreferred" type="text" value="${escapeHtml(f.preferredName)}" /></div>
        <div class="field">
          <label class="field__label" for="edDob">Date of birth <span class="req">*</span></label>
          <input class="input" id="edDob" type="date" value="${escapeHtml(f.dob)}" max="${todayISO()}" />
          <p class="field__error" id="err-edDob" hidden></p>
        </div>
        <div class="field">
          <label class="field__label">Age</label>
          <div class="enroll-field-age" id="edAgeDisplay">${escapeHtml(ageLabel(f.dob))}</div>
        </div>
        <div class="field">
          <label class="field__label" for="edGender">Gender <span style="opacity:.6;">(optional)</span></label>
          <select class="select" id="edGender">
            <option value="">Not specified</option>
            ${GENDERS.map((g) => `<option value="${g}" ${f.gender === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label class="field__label" for="edLang">Home language(s) <span style="opacity:.6;">(optional)</span></label><input class="input" id="edLang" type="text" placeholder="e.g. English, Hindi" value="${escapeHtml(f.homeLanguages)}" /></div>
        <div class="field"><label class="field__label" for="edNationality">Nationality <span style="opacity:.6;">(optional)</span></label><input class="input" id="edNationality" type="text" value="${escapeHtml(f.nationality)}" /></div>
      </div>`;
  }
  function wireStepDetails() {
    const f = formState;
    $('edFirst').addEventListener('input', (e) => { f.firstName = e.target.value; setFieldError('edFirst', null); runDuplicateCheck(); });
    $('edLast').addEventListener('input', (e) => { f.lastName = e.target.value; setFieldError('edLast', null); runDuplicateCheck(); });
    $('edPreferred').addEventListener('input', (e) => { f.preferredName = e.target.value; });
    $('edDob').addEventListener('input', (e) => { f.dob = e.target.value; setFieldError('edDob', null); $('edAgeDisplay').textContent = ageLabel(f.dob); runDuplicateCheck(); });
    $('edGender').addEventListener('change', (e) => { f.gender = e.target.value; });
    $('edLang').addEventListener('input', (e) => { f.homeLanguages = e.target.value; });
    $('edNationality').addEventListener('input', (e) => { f.nationality = e.target.value; });
    $('edPhotoBtn').addEventListener('click', () => $('edPhotoInput').click());
    $('edPhotoInput').addEventListener('change', (e) => {
      readFile(e.target.files[0], PHOTO_MAX_BYTES, (dataUrl) => { if (dataUrl) { f.photoDataUrl = dataUrl; renderStepContent(); } });
    });
    const removeBtn = $('edPhotoRemoveBtn');
    if (removeBtn) removeBtn.addEventListener('click', () => { f.photoDataUrl = null; renderStepContent(); });
  }
  function validateDetails() {
    let ok = true;
    if (!formState.firstName.trim()) { setFieldError('edFirst', 'First name is required.'); ok = false; }
    if (!formState.lastName.trim()) { setFieldError('edLast', 'Last name is required.'); ok = false; }
    if (!formState.dob) { setFieldError('edDob', 'Date of birth is required.'); ok = false; }
    else if (formState.dob > todayISO()) { setFieldError('edDob', 'Date of birth cannot be in the future.'); ok = false; }
    if (!ok) { const firstBad = ['edFirst', 'edLast', 'edDob'].find((id) => $(id).closest('.field').classList.contains('is-error')); if (firstBad) $(firstBad).focus(); }
    return ok;
  }

  /* ---------- duplicate detection (persists across steps) ---------- */
  function findDuplicate() {
    const { firstName, lastName, dob } = formState;
    if (!firstName.trim() || !lastName.trim() || !dob) return null;
    const fullName = (firstName.trim() + ' ' + lastName.trim()).toLowerCase();
    return window.PlayStore.getByType('Child').find((c) => c.id !== formState.id && (c.name || '').trim().toLowerCase() === fullName && c.dob === dob) || null;
  }
  function runDuplicateCheck() {
    const match = findDuplicate();
    if (match && match.id !== (duplicateMatch && duplicateMatch.id)) duplicateDismissed = false;
    duplicateMatch = match;
    renderDuplicateBanner();
  }
  function renderDuplicateBanner() {
    const banner = $('enrollDuplicateBanner');
    if (!duplicateMatch || duplicateDismissed) { banner.hidden = true; banner.innerHTML = ''; return; }
    banner.hidden = false;
    banner.innerHTML = `
      <span class="enroll-duplicate__icon">${ICON.warn}</span>
      <span class="enroll-duplicate__body">
        <div class="enroll-duplicate__title">Possible duplicate: ${escapeHtml(duplicateMatch.name)} — ${escapeHtml(duplicateMatch.room || 'No class')}</div>
        <div class="enroll-duplicate__text">A child with this exact name and date of birth already exists. Check their profile before continuing.</div>
      </span>
      <a class="btn btn--secondary btn--sm" href="record.html?id=${encodeURIComponent(duplicateMatch.id)}" target="_blank" rel="noopener">View profile</a>
      <button class="enroll-icon-btn" type="button" id="dupDismissBtn" aria-label="Dismiss">&times;</button>`;
    $('dupDismissBtn').addEventListener('click', () => { duplicateDismissed = true; renderDuplicateBanner(); });
  }

  /* ========================================================================
     STEP 2 — GUARDIANS & HOUSEHOLDS
     ======================================================================== */
  let familySearchQuery = '';
  function renderStepGuardians() {
    const f = formState;
    const households = Array.from(new Set(f.guardians.map((g) => g.household || 'A')));
    $('enrollStepContent').innerHTML = `
      <h2 class="enroll-section-title">Guardians & households</h2>
      <p class="enroll-section-text">Search for an existing family or create a new one, then add each guardian's details.</p>

      <div class="enroll-family-search">
        <div class="input-wrap">
          <svg class="input-wrap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="input" id="familySearchInput" type="text" placeholder="Search an existing family by guardian name" value="${escapeHtml(familySearchQuery)}" />
        </div>
        <div class="enroll-family-results" id="familyResults"></div>
      </div>

      ${households.map((h) => renderHouseholdGroup(h)).join('')}

      <div style="display:flex; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-2);">
        <button class="btn btn--secondary enroll-add-btn" type="button" id="addGuardianBtn">${ICON.plus}<span>Add guardian</span></button>
        <button class="btn btn--secondary enroll-add-btn" type="button" id="addHouseholdBtn">${ICON.plus}<span>Add second household</span></button>
      </div>`;
    renderFamilyResults();
  }
  function renderHouseholdGroup(household) {
    const guardians = formState.guardians.filter((g) => (g.household || 'A') === household);
    if (!guardians.length) return '';
    return `
      <div class="enroll-subhead"><span>${household === 'A' ? 'Household' : 'Household ' + escapeHtml(household)}</span></div>
      ${guardians.map((g) => guardianCardHtml(g)).join('')}`;
  }
  function guardianCardHtml(g) {
    const open = g._open !== false;
    return `
      <div class="enroll-entity${open ? ' is-open' : ''}" data-guardian-id="${g.id}">
        <div class="enroll-entity__head" data-toggle>
          <span class="enroll-entity__avatar">${escapeHtml(initials(g.name || 'New guardian'))}</span>
          <span class="enroll-entity__title">
            ${escapeHtml(g.name || 'New guardian')}
            ${g.primary ? '<span class="enroll-badge-primary-contact">Primary</span>' : ''}
            ${g.existingGuardianId ? '<span class="badge badge--neutral" style="font-size:.65rem;">Existing family</span>' : ''}
          </span>
          <span class="enroll-entity__actions">
            <button class="enroll-icon-btn enroll-icon-btn--danger" type="button" data-remove aria-label="Remove guardian">${ICON.trash}</button>
            <span class="enroll-entity__chevron">${ICON.chevron}</span>
          </span>
        </div>
        <div class="enroll-entity__body">
          <div class="enroll-entity__body-inner">
            <div class="enroll-grid">
              <div class="field"><label class="field__label">Full name <span class="req">*</span></label><input class="input" data-field="name" value="${escapeHtml(g.name)}" /></div>
              <div class="field"><label class="field__label">Relationship to child</label>
                <select class="select" data-field="relation">${RELATIONS.map((r) => `<option value="${r}" ${g.relation === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
              </div>
              <div class="field"><label class="field__label">Phone number</label><input class="input" data-field="phone" type="tel" value="${escapeHtml(g.phone)}" /></div>
              <div class="field"><label class="field__label">Email</label><input class="input" data-field="email" type="email" value="${escapeHtml(g.email)}" /></div>
            </div>
            <div class="enroll-entity__toggles">
              <label class="enroll-entity__toggle"><span class="toggle"><input type="checkbox" data-field="primary" ${g.primary ? 'checked' : ''} /><span class="toggle__track"><span class="toggle__thumb"></span></span></span>Primary contact</label>
              <label class="enroll-entity__toggle"><span class="toggle"><input type="checkbox" data-field="livesWith" ${g.livesWith ? 'checked' : ''} /><span class="toggle__track"><span class="toggle__thumb"></span></span></span>Lives with child</label>
              <label class="enroll-entity__toggle"><span class="toggle"><input type="checkbox" data-field="parentalResponsibility" ${g.parentalResponsibility ? 'checked' : ''} /><span class="toggle__track"><span class="toggle__thumb"></span></span></span>Parental responsibility</label>
            </div>
          </div>
        </div>
      </div>`;
  }
  function renderFamilyResults() {
    const wrap = $('familyResults');
    const q = familySearchQuery.trim().toLowerCase();
    if (!q) { wrap.innerHTML = '<button class="btn btn--text btn--sm" type="button" id="createNewFamilyBtn" style="margin-top:4px;">+ Create a new family instead</button>'; wireCreateNewFamily(); return; }
    const linkedIds = new Set(formState.guardians.map((g) => g.existingGuardianId).filter(Boolean));
    const matches = window.PlayStore.getByType('Guardian').filter((g) => g.name.toLowerCase().includes(q) && !linkedIds.has(g.id)).slice(0, 6);
    wrap.innerHTML = (matches.length ? matches.map((g) => `
      <div class="enroll-family-result" data-pick-guardian="${g.id}">
        <span class="enroll-family-result__avatar">${escapeHtml(initials(g.name))}</span>
        <span class="enroll-family-result__body"><span class="enroll-family-result__name">${escapeHtml(g.name)}</span><span class="enroll-family-result__sub">${escapeHtml(g.relation || 'Guardian')} · ${escapeHtml(g.contact || 'No contact on file')}</span></span>
        <span class="btn btn--secondary btn--sm">Select family</span>
      </div>`).join('') : '<p class="field__hint">No matching family found.</p>')
      + '<button class="btn btn--text btn--sm" type="button" id="createNewFamilyBtn" style="margin-top:4px;">+ Create a new family instead</button>';
    wrap.querySelectorAll('[data-pick-guardian]').forEach((row) => row.addEventListener('click', () => {
      const g = window.PlayStore.getById(row.dataset.pickGuardian);
      if (!g) return;
      const contact = g.contact || '';
      formState.guardians.push({
        id: uid('TMP'), existingGuardianId: g.id, name: g.name, relation: 'Guardian',
        phone: contact.indexOf('@') === -1 ? contact : '', email: contact.indexOf('@') !== -1 ? contact : '',
        primary: formState.guardians.length === 0, livesWith: true, parentalResponsibility: true, household: 'A', _open: true,
      });
      familySearchQuery = '';
      renderStepContent();
      window.PlayShell.toast('success', 'Family linked', g.name + "'s existing family record will be reused.");
    }));
    wireCreateNewFamily();
  }
  function wireCreateNewFamily() {
    const btn = $('createNewFamilyBtn');
    if (btn) btn.addEventListener('click', () => { familySearchQuery = ''; addGuardian('A'); });
  }
  function addGuardian(household) {
    formState.guardians.push({ id: uid('TMP'), name: '', relation: 'Mother', phone: '', email: '', primary: formState.guardians.length === 0, livesWith: true, parentalResponsibility: true, household: household || 'A', _open: true });
    renderStepContent();
  }
  function wireStepGuardians() {
    $('familySearchInput').addEventListener('input', (e) => { familySearchQuery = e.target.value; renderFamilyResults(); });
    $('addGuardianBtn').addEventListener('click', () => addGuardian('A'));
    $('addHouseholdBtn').addEventListener('click', () => addGuardian('B'));
    document.querySelectorAll('[data-guardian-id]').forEach((card) => {
      const id = card.dataset.guardianId;
      const g = formState.guardians.find((x) => x.id === id);
      card.querySelector('[data-toggle]').addEventListener('click', () => { g._open = !(g._open !== false); card.classList.toggle('is-open', g._open); });
      card.querySelector('[data-remove]').addEventListener('click', () => {
        if (formState.guardians.length <= 1) { window.PlayShell.toast('warning', 'At least one guardian is required', 'Add another guardian before removing this one.'); return; }
        formState.guardians = formState.guardians.filter((x) => x.id !== id);
        if (!formState.guardians.some((x) => x.primary)) formState.guardians[0].primary = true;
        renderStepContent();
      });
      card.querySelectorAll('[data-field]').forEach((input) => {
        const field = input.dataset.field;
        const evt = input.type === 'checkbox' ? 'change' : 'input';
        input.addEventListener(evt, () => {
          if (field === 'primary') {
            if (input.checked) formState.guardians.forEach((x) => { x.primary = x.id === id; });
            else input.checked = true; // at least one primary required
            renderStepContent();
            return;
          }
          g[field] = input.type === 'checkbox' ? input.checked : input.value;
          if (field === 'name') card.querySelector('.enroll-entity__avatar').textContent = initials(input.value);
        });
      });
    });
  }
  function validateGuardians() {
    if (!formState.guardians.length) { window.PlayShell.toast('error', 'Add a guardian', 'At least one guardian is required before continuing.'); return false; }
    let ok = true;
    formState.guardians.forEach((g) => {
      if (!g.name.trim() || (!g.phone.trim() && !g.email.trim())) ok = false;
    });
    if (!ok) window.PlayShell.toast('error', 'Guardian details incomplete', 'Each guardian needs a name and at least a phone number or email.');
    return ok;
  }

  /* ========================================================================
     STEP 3 — EMERGENCY & PICKUP
     ======================================================================== */
  function renderStepEmergency() {
    const f = formState;
    $('enrollStepContent').innerHTML = `
      <h2 class="enroll-section-title">Emergency & pickup</h2>
      <p class="enroll-section-text">Safety-critical information. Please double-check names and contact details.</p>

      <div class="enroll-subhead"><span>Emergency contacts</span><button class="btn btn--secondary btn--sm enroll-add-btn" type="button" id="addEmergencyBtn">${ICON.plus}<span>Add contact</span></button></div>
      <div id="emergencyList">${f.emergencyContacts.length ? f.emergencyContacts.map((c, i) => emergencyRowHtml(c, i, f.emergencyContacts.length)).join('') : emptyState('No emergency contacts added yet.')}</div>

      <div class="enroll-subhead"><span>Authorised pickup people</span><button class="btn btn--secondary btn--sm enroll-add-btn" type="button" id="addPickupBtn">${ICON.plus}<span>Add authorised pickup person</span></button></div>
      <div id="pickupList">${f.pickups.length ? f.pickups.map((p) => pickupCardHtml(p)).join('') : emptyState('No authorised pickup people added yet.')}</div>

      <div class="enroll-subhead"><span>Restricted persons</span><button class="btn btn--secondary btn--sm enroll-add-btn" type="button" id="addRestrictedBtn">${ICON.plus}<span>Add restricted person</span></button></div>
      <p class="field__hint" style="margin-top:-8px; margin-bottom: var(--space-3);">These people must never be allowed to collect this child. This information is always shown prominently on the child's profile.</p>
      <div id="restrictedList">${f.restricted.length ? f.restricted.map((r) => restrictedCardHtml(r)).join('') : emptyState('No restricted persons on file.')}</div>`;
  }
  function emptyState(text) { return `<div class="enroll-empty">${ICON.inbox}<div>${escapeHtml(text)}</div></div>`; }

  function emergencyRowHtml(c, i, total) {
    return `
      <div class="enroll-entity is-open" data-emergency-id="${c.id}">
        <div class="enroll-entity__body" style="max-height:none;">
          <div class="enroll-entity__body-inner" style="padding-top: var(--space-4);">
            <div class="enroll-grid enroll-grid--3">
              <div class="field"><label class="field__label">Name</label><input class="input" data-field="name" value="${escapeHtml(c.name)}" /></div>
              <div class="field"><label class="field__label">Relationship</label><input class="input" data-field="relation" value="${escapeHtml(c.relation)}" /></div>
              <div class="field"><label class="field__label">Phone</label><input class="input" data-field="phone" type="tel" value="${escapeHtml(c.phone)}" /></div>
            </div>
            <div style="display:flex; align-items:center; gap: var(--space-2);">
              <span class="field__hint">Priority: ${i + 1} of ${total}</span>
              <button class="enroll-icon-btn" type="button" data-move="up" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${ICON.up}</button>
              <button class="enroll-icon-btn" type="button" data-move="down" ${i === total - 1 ? 'disabled' : ''} aria-label="Move down">${ICON.down}</button>
              <button class="enroll-icon-btn enroll-icon-btn--danger" type="button" data-remove style="margin-left:auto;" aria-label="Remove contact">${ICON.trash}</button>
            </div>
          </div>
        </div>
      </div>`;
  }
  function pickupCardHtml(p) {
    const canReveal = role === 'Director' || role === 'Admin';
    return `
      <div class="enroll-entity is-open" data-pickup-id="${p.id}">
        <div class="enroll-entity__head" data-toggle>
          <span class="enroll-entity__avatar">${p.photoDataUrl ? `<img src="${p.photoDataUrl}" alt="" />` : escapeHtml(initials(p.name || 'New person'))}</span>
          <span class="enroll-entity__title">${escapeHtml(p.name || 'New pickup person')}</span>
          <span class="enroll-entity__actions"><button class="enroll-icon-btn enroll-icon-btn--danger" type="button" data-remove aria-label="Remove">${ICON.trash}</button><span class="enroll-entity__chevron">${ICON.chevron}</span></span>
        </div>
        <div class="enroll-entity__body">
          <div class="enroll-entity__body-inner">
            <div class="enroll-grid">
              <div class="field"><label class="field__label">Full name <span class="req">*</span></label><input class="input" data-field="name" value="${escapeHtml(p.name)}" /></div>
              <div class="field"><label class="field__label">Relationship to child</label><input class="input" data-field="relation" value="${escapeHtml(p.relation || '')}" /></div>
              <div class="field"><label class="field__label">Contact information</label><input class="input" data-field="phone" value="${escapeHtml(p.phone || '')}" /></div>
              <div class="field"><label class="field__label">ID details</label><input class="input" data-field="idDetails" placeholder="e.g. Driving licence no." value="${escapeHtml(p.idDetails || '')}" /></div>
              <div class="field"><label class="field__label">Passcode</label><input class="input" data-field="passcode" type="${canReveal ? 'text' : 'password'}" ${canReveal ? '' : 'disabled placeholder="Hidden — admin only"'} value="${canReveal ? escapeHtml(p.passcode || '') : (p.passcode ? '••••' : '')}" /></div>
              <div class="field"><label class="field__label">Authorisation status</label>
                <select class="select" data-field="status">
                  <option value="Authorised" ${p.status !== 'Pending verification' ? 'selected' : ''}>Authorised</option>
                  <option value="Pending verification" ${p.status === 'Pending verification' ? 'selected' : ''}>Pending verification</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }
  function restrictedCardHtml(r) {
    return `
      <div class="enroll-restricted-card" data-restricted-id="${r.id}">
        <div class="enroll-restricted-card__head">
          <span class="enroll-restricted-card__icon">${ICON.shieldOff}</span>
          <span style="flex:1;"><span class="enroll-badge-restricted">Do not release</span></span>
          <button class="enroll-icon-btn enroll-icon-btn--danger" type="button" data-remove-start aria-label="Remove restriction">${ICON.trash}</button>
        </div>
        <div class="enroll-grid" style="margin-top: var(--space-3);">
          <div class="field"><label class="field__label">Name <span class="req">*</span></label><input class="input" data-field="name" value="${escapeHtml(r.name)}" /></div>
          <div class="field"><label class="field__label">Reason for restriction <span class="req">*</span></label><input class="input" data-field="reason" value="${escapeHtml(r.reason)}" /></div>
        </div>
        <div class="field" style="margin-top: var(--space-3);">
          <label class="field__label">Supporting document</label>
          <div style="display:flex; align-items:center; gap: var(--space-3);">
            <input type="file" hidden data-doc-input />
            <button class="btn btn--secondary btn--sm" type="button" data-doc-btn>${ICON.upload}<span>${r.documentName ? 'Replace file' : 'Upload document'}</span></button>
            ${r.documentName ? `<span class="field__hint">${escapeHtml(r.documentName)}</span>` : ''}
          </div>
        </div>
        <div class="enroll-restricted-confirm" hidden style="margin-top: var(--space-3); display:flex; align-items:center; gap: var(--space-3);">
          <span style="font-size: var(--fs-caption); font-weight:700;">Remove this restriction?</span>
          <button class="btn btn--destructive btn--sm" type="button" data-remove-confirm>Yes, remove</button>
          <button class="btn btn--ghost btn--sm" type="button" data-remove-cancel>Cancel</button>
        </div>
      </div>`;
  }
  function wireStepEmergency() {
    $('addEmergencyBtn').addEventListener('click', () => { formState.emergencyContacts.push({ id: uid('EC'), name: '', relation: '', phone: '' }); renderStepContent(); });
    $('addPickupBtn').addEventListener('click', () => { formState.pickups.push({ id: uid('PU'), name: '', relation: '', phone: '', idDetails: '', passcode: '', status: 'Authorised', _open: true }); renderStepContent(); });
    $('addRestrictedBtn').addEventListener('click', () => { formState.restricted.push({ id: uid('RS'), name: '', reason: '', documentName: null }); renderStepContent(); });

    document.querySelectorAll('[data-emergency-id]').forEach((row) => {
      const c = formState.emergencyContacts.find((x) => x.id === row.dataset.emergencyId);
      row.querySelectorAll('[data-field]').forEach((input) => input.addEventListener('input', () => { c[input.dataset.field] = input.value; }));
      const removeBtn = row.querySelector('[data-remove]');
      if (removeBtn) removeBtn.addEventListener('click', () => { formState.emergencyContacts = formState.emergencyContacts.filter((x) => x.id !== c.id); renderStepContent(); });
      const upBtn = row.querySelector('[data-move="up"]'); const downBtn = row.querySelector('[data-move="down"]');
      if (upBtn) upBtn.addEventListener('click', () => { moveItem(formState.emergencyContacts, c.id, -1); renderStepContent(); });
      if (downBtn) downBtn.addEventListener('click', () => { moveItem(formState.emergencyContacts, c.id, 1); renderStepContent(); });
    });

    document.querySelectorAll('[data-pickup-id]').forEach((card) => {
      const p = formState.pickups.find((x) => x.id === card.dataset.pickupId);
      card.querySelector('[data-toggle]').addEventListener('click', () => { p._open = !(p._open !== false); card.classList.toggle('is-open', p._open); });
      card.querySelector('[data-remove]').addEventListener('click', () => { formState.pickups = formState.pickups.filter((x) => x.id !== p.id); renderStepContent(); });
      card.querySelectorAll('[data-field]').forEach((input) => {
        const evt = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(evt, () => { if (input.dataset.field === 'passcode' && input.disabled) return; p[input.dataset.field] = input.value; });
      });
    });

    document.querySelectorAll('[data-restricted-id]').forEach((card) => {
      const r = formState.restricted.find((x) => x.id === card.dataset.restrictedId);
      card.querySelectorAll('[data-field]').forEach((input) => input.addEventListener('input', () => { r[input.dataset.field] = input.value; }));
      card.querySelector('[data-doc-btn]').addEventListener('click', () => card.querySelector('[data-doc-input]').click());
      card.querySelector('[data-doc-input]').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) { r.documentName = file.name; renderStepContent(); }
      });
      const confirmRow = card.querySelector('.enroll-restricted-confirm');
      card.querySelector('[data-remove-start]').addEventListener('click', () => { confirmRow.hidden = false; });
      card.querySelector('[data-remove-cancel]').addEventListener('click', () => { confirmRow.hidden = true; });
      card.querySelector('[data-remove-confirm]').addEventListener('click', () => { formState.restricted = formState.restricted.filter((x) => x.id !== r.id); renderStepContent(); });
    });
  }
  function moveItem(list, id, dir) {
    const idx = list.findIndex((x) => x.id === id);
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const [item] = list.splice(idx, 1);
    list.splice(target, 0, item);
  }
  function validateEmergency() {
    const badPickup = formState.pickups.some((p) => !p.name.trim());
    const badRestricted = formState.restricted.some((r) => !r.name.trim() || !r.reason.trim());
    if (badPickup) window.PlayShell.toast('error', 'Pickup person incomplete', 'Every authorised pickup person needs a name.');
    if (badRestricted) window.PlayShell.toast('error', 'Restricted person incomplete', 'Every restricted person needs a name and a reason.');
    return !badPickup && !badRestricted;
  }

  /* ========================================================================
     STEP 4 — HEALTH
     ======================================================================== */
  function renderStepHealth() {
    const f = formState;
    $('enrollStepContent').innerHTML = `
      <h2 class="enroll-section-title">Health</h2>
      <p class="enroll-section-text">Never leave medical details to guesswork — leave anything unknown blank rather than assuming.</p>

      <div class="enroll-subhead"><span>Allergies</span><button class="btn btn--secondary btn--sm enroll-add-btn" type="button" id="addAllergyBtn">${ICON.plus}<span>Add allergy</span></button></div>
      <div id="allergyList">${f.allergies.length ? f.allergies.map((a) => allergyCardHtml(a)).join('') : emptyState('No allergies on file.')}</div>

      <div class="enroll-subhead"><span>Medical conditions</span><button class="btn btn--secondary btn--sm enroll-add-btn" type="button" id="addConditionBtn">${ICON.plus}<span>Add condition</span></button></div>
      <div id="conditionList">${f.conditions.length ? f.conditions.map((c) => conditionRowHtml(c)).join('') : emptyState('No medical conditions on file.')}</div>

      <div class="enroll-subhead"><span>Medications</span><button class="btn btn--secondary btn--sm enroll-add-btn" type="button" id="addMedicationBtn">${ICON.plus}<span>Add medication</span></button></div>
      <div id="medicationList">${f.medications.length ? f.medications.map((m) => medicationRowHtml(m)).join('') : emptyState('No regular medications on file.')}</div>

      <div class="enroll-subhead"><span>Dietary needs</span></div>
      <div class="enroll-chip-row" id="dietaryChips">${DIETARY_OPTIONS.map((d) => `<button type="button" class="enroll-chip${f.dietaryTags.includes(d) ? ' is-selected' : ''}" data-diet="${d}">${d}</button>`).join('')}</div>
      <div class="field" style="margin-top: var(--space-4);"><label class="field__label" for="dietNotes">Dietary notes</label><textarea class="textarea" id="dietNotes" placeholder="Any other dietary instructions">${escapeHtml(f.dietaryNotes)}</textarea></div>

      <div class="enroll-subhead"><span>Immunisations</span></div>
      <div class="enroll-grid">
        <div class="field"><label class="field__label" for="immunStatus">Status</label>
          <select class="select" id="immunStatus">
            ${['Not recorded', 'Up to date', 'Incomplete', 'Exempt'].map((s) => `<option value="${s}" ${f.immunizationStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="field field--wide"><label class="field__label" for="immunNotes">Notes</label><textarea class="textarea" id="immunNotes" placeholder="Optional — e.g. exemption details">${escapeHtml(f.immunizationNotes)}</textarea></div>
      </div>

      <div class="enroll-subhead"><span>Doctor</span></div>
      <div class="enroll-grid enroll-grid--3">
        <div class="field"><label class="field__label" for="docName">Doctor name</label><input class="input" id="docName" value="${escapeHtml(f.doctor.name)}" /></div>
        <div class="field"><label class="field__label" for="docPractice">Practice</label><input class="input" id="docPractice" value="${escapeHtml(f.doctor.practice)}" /></div>
        <div class="field"><label class="field__label" for="docPhone">Contact number</label><input class="input" id="docPhone" value="${escapeHtml(f.doctor.phone)}" /></div>
      </div>`;
  }
  function allergyCardHtml(a) {
    const sevClass = a.severity === 'Severe' ? 'enroll-severity--high' : a.severity === 'Moderate' ? 'enroll-severity--medium' : 'enroll-severity--low';
    return `
      <div class="enroll-entity${a.severity === 'Severe' ? ' is-restricted' : ''} is-open" data-allergy-id="${a.id}">
        <div class="enroll-entity__body" style="max-height:none;">
          <div class="enroll-entity__body-inner" style="padding-top: var(--space-4);">
            <div class="enroll-grid enroll-grid--3">
              <div class="field"><label class="field__label">Allergen <span class="req">*</span></label><input class="input" data-field="allergen" value="${escapeHtml(a.allergen)}" /></div>
              <div class="field"><label class="field__label">Severity <span class="${sevClass}"></span></label>
                <select class="select" data-field="severity">${['Mild', 'Moderate', 'Severe'].map((s) => `<option ${a.severity === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
              </div>
              <div class="field"><label class="field__label">Reaction</label><input class="input" data-field="reaction" value="${escapeHtml(a.reaction)}" /></div>
            </div>
            <div style="display:flex; align-items:center; gap: var(--space-3);">
              <input type="file" hidden data-doc-input />
              <button class="btn btn--secondary btn--sm" type="button" data-doc-btn>${ICON.upload}<span>${a.actionPlanDocName ? 'Replace action plan' : 'Upload action plan'}</span></button>
              ${a.actionPlanDocName ? `<span class="field__hint">${escapeHtml(a.actionPlanDocName)}</span>` : ''}
              <button class="enroll-icon-btn enroll-icon-btn--danger" type="button" data-remove style="margin-left:auto;" aria-label="Remove allergy">${ICON.trash}</button>
            </div>
          </div>
        </div>
      </div>`;
  }
  function conditionRowHtml(c) {
    return `
      <div class="enroll-entity is-open" data-condition-id="${c.id}">
        <div class="enroll-entity__body" style="max-height:none;">
          <div class="enroll-entity__body-inner" style="padding-top: var(--space-4);">
            <div class="enroll-grid">
              <div class="field"><label class="field__label">Condition name</label><input class="input" data-field="name" value="${escapeHtml(c.name)}" /></div>
              <div class="field"><label class="field__label">Notes</label><input class="input" data-field="notes" value="${escapeHtml(c.notes)}" /></div>
            </div>
            <button class="enroll-icon-btn enroll-icon-btn--danger" type="button" data-remove aria-label="Remove condition">${ICON.trash}</button>
          </div>
        </div>
      </div>`;
  }
  function medicationRowHtml(m) {
    return `
      <div class="enroll-entity is-open" data-medication-id="${m.id}">
        <div class="enroll-entity__body" style="max-height:none;">
          <div class="enroll-entity__body-inner" style="padding-top: var(--space-4);">
            <div class="enroll-grid enroll-grid--3">
              <div class="field"><label class="field__label">Medication name</label><input class="input" data-field="name" value="${escapeHtml(m.name)}" /></div>
              <div class="field"><label class="field__label">Dosage &amp; instructions</label><input class="input" data-field="dosage" value="${escapeHtml(m.dosage)}" /></div>
              <div class="field"><label class="field__label">Notes</label><input class="input" data-field="notes" value="${escapeHtml(m.notes)}" /></div>
            </div>
            <button class="enroll-icon-btn enroll-icon-btn--danger" type="button" data-remove aria-label="Remove medication">${ICON.trash}</button>
          </div>
        </div>
      </div>`;
  }
  function wireStepHealth() {
    const f = formState;
    $('addAllergyBtn').addEventListener('click', () => { f.allergies.push({ id: uid('AL'), allergen: '', severity: 'Moderate', reaction: '', actionPlanDocName: null }); renderStepContent(); });
    $('addConditionBtn').addEventListener('click', () => { f.conditions.push({ id: uid('MC'), name: '', notes: '' }); renderStepContent(); });
    $('addMedicationBtn').addEventListener('click', () => { f.medications.push({ id: uid('MD'), name: '', dosage: '', notes: '' }); renderStepContent(); });

    document.querySelectorAll('[data-allergy-id]').forEach((card) => {
      const a = f.allergies.find((x) => x.id === card.dataset.allergyId);
      card.querySelectorAll('[data-field]').forEach((input) => {
        const evt = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(evt, () => { a[input.dataset.field] = input.value; if (input.dataset.field === 'severity') renderStepContent(); });
      });
      card.querySelector('[data-doc-btn]').addEventListener('click', () => card.querySelector('[data-doc-input]').click());
      card.querySelector('[data-doc-input]').addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { a.actionPlanDocName = file.name; renderStepContent(); } });
      card.querySelector('[data-remove]').addEventListener('click', () => { f.allergies = f.allergies.filter((x) => x.id !== a.id); renderStepContent(); });
    });
    document.querySelectorAll('[data-condition-id]').forEach((row) => {
      const c = f.conditions.find((x) => x.id === row.dataset.conditionId);
      row.querySelectorAll('[data-field]').forEach((input) => input.addEventListener('input', () => { c[input.dataset.field] = input.value; }));
      row.querySelector('[data-remove]').addEventListener('click', () => { f.conditions = f.conditions.filter((x) => x.id !== c.id); renderStepContent(); });
    });
    document.querySelectorAll('[data-medication-id]').forEach((row) => {
      const m = f.medications.find((x) => x.id === row.dataset.medicationId);
      row.querySelectorAll('[data-field]').forEach((input) => input.addEventListener('input', () => { m[input.dataset.field] = input.value; }));
      row.querySelector('[data-remove]').addEventListener('click', () => { f.medications = f.medications.filter((x) => x.id !== m.id); renderStepContent(); });
    });
    document.querySelectorAll('#dietaryChips [data-diet]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const d = chip.dataset.diet;
        if (f.dietaryTags.includes(d)) f.dietaryTags = f.dietaryTags.filter((x) => x !== d); else f.dietaryTags.push(d);
        chip.classList.toggle('is-selected');
      });
    });
    $('dietNotes').addEventListener('input', (e) => { f.dietaryNotes = e.target.value; });
    $('immunStatus').addEventListener('change', (e) => { f.immunizationStatus = e.target.value; });
    $('immunNotes').addEventListener('input', (e) => { f.immunizationNotes = e.target.value; });
    $('docName').addEventListener('input', (e) => { f.doctor.name = e.target.value; });
    $('docPractice').addEventListener('input', (e) => { f.doctor.practice = e.target.value; });
    $('docPhone').addEventListener('input', (e) => { f.doctor.phone = e.target.value; });
  }
  function validateHealth() { return true; }

  /* ========================================================================
     STEP 5 — CLASS & SCHEDULE
     ======================================================================== */
  function renderStepSchedule() {
    const f = formState;
    const classes = classRecords();
    $('enrollStepContent').innerHTML = `
      <h2 class="enroll-section-title">Class & schedule</h2>
      <p class="enroll-section-text">Choose a class and set the attendance schedule.</p>

      <div class="enroll-class-grid" id="classGrid">
        ${classes.map((c) => classCardHtml(c)).join('')}
      </div>
      <p class="field__error" id="err-classGrid" hidden style="margin-top: var(--space-2);"></p>
      <div id="waitlistNoticeWrap"></div>

      <div class="enroll-subhead"><span>Schedule</span></div>
      <div class="enroll-grid">
        <div class="field"><label class="field__label" for="schStart">Start date <span class="req">*</span></label><input class="input" id="schStart" type="date" value="${escapeHtml(f.scheduleStartDate)}" /><p class="field__error" id="err-schStart" hidden></p></div>
        <div class="field">
          <label class="field__label">Session</label>
          <div class="enroll-chip-row" id="sessionChips">${SESSIONS.map((s) => `<button type="button" class="enroll-chip${f.session === s ? ' is-selected' : ''}" data-session="${s}">${s}</button>`).join('')}</div>
        </div>
        <div class="field field--wide">
          <label class="field__label">Days attending <span class="req">*</span></label>
          <div class="enroll-chip-row" id="daysChips">${DAYS.map((d) => `<button type="button" class="enroll-chip${f.daysAttending.includes(d) ? ' is-selected' : ''}" data-day="${d}">${d}</button>`).join('')}</div>
          <p class="field__error" id="err-daysChips" hidden></p>
        </div>
      </div>`;
    renderWaitlistNotice();
  }
  function classCardHtml(c) {
    const enrolled = enrolledCountFor(c);
    const cap = c.capacity || 0;
    const full = cap > 0 && enrolled >= cap;
    const pct = cap > 0 ? Math.min(100, Math.round((enrolled / cap) * 100)) : 0;
    const selected = formState.classId === c.id;
    return `
      <button type="button" class="enroll-class-card${selected ? ' is-selected' : ''}" data-class-id="${c.id}">
        <div class="enroll-class-card__name">${escapeHtml(c.name)}</div>
        <div class="enroll-class-card__meta">${escapeHtml([c.ageGroup, c.teacherName].filter(Boolean).join(' · '))}</div>
        <div class="enroll-class-card__cap">
          <div class="enroll-class-card__cap-row"><span>${enrolled} of ${cap} seats</span>${full ? '<span class="enroll-severity--medium">Full</span>' : ''}</div>
          <div class="enroll-capacity-bar"><div class="enroll-capacity-bar__fill${full ? ' is-full' : ''}" style="width:${pct}%;"></div></div>
        </div>
      </button>`;
  }
  function renderWaitlistNotice() {
    const wrap = $('waitlistNoticeWrap');
    const cls = classRecords().find((c) => c.id === formState.classId);
    if (!cls) { wrap.innerHTML = ''; return; }
    const enrolled = enrolledCountFor(cls);
    const full = cls.capacity > 0 && enrolled >= cls.capacity;
    if (!full) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `
      <div class="enroll-waitlist-notice">
        <span class="enroll-waitlist-notice__icon">${ICON.warn}</span>
        <span style="flex:1;">
          <div class="enroll-waitlist-notice__title">${escapeHtml(cls.name)} is full</div>
          <div class="enroll-waitlist-notice__text">There ${enrolled === 1 ? 'is' : 'are'} ${enrolled} of ${cls.capacity} seats already filled. You can add this child to the waitlist — their details are kept so staff can enrol them as soon as a seat opens up.</div>
          <div class="enroll-waitlist-notice__action">
            <button class="btn btn--secondary btn--sm" type="button" id="joinWaitlistBtn">${formState.waitlisted ? '✓ Added to waitlist' : 'Add to waitlist'}</button>
          </div>
        </span>
      </div>`;
    $('joinWaitlistBtn').addEventListener('click', () => { formState.waitlisted = true; renderFooter(); renderWaitlistNotice(); window.PlayShell.toast('info', 'Waitlist selected', "Saving will add this child to " + cls.name + "'s waitlist instead of enrolling them directly."); });
  }
  function wireStepSchedule() {
    const f = formState;
    document.querySelectorAll('#classGrid [data-class-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        f.classId = btn.dataset.classId;
        f.waitlisted = false;
        $('err-classGrid').hidden = true;
        renderStepContent();
      });
    });
    $('schStart').addEventListener('input', (e) => { f.scheduleStartDate = e.target.value; setFieldError('schStart', null); });
    document.querySelectorAll('#sessionChips [data-session]').forEach((chip) => chip.addEventListener('click', () => {
      f.session = chip.dataset.session;
      document.querySelectorAll('#sessionChips [data-session]').forEach((c) => c.classList.toggle('is-selected', c.dataset.session === f.session));
    }));
    document.querySelectorAll('#daysChips [data-day]').forEach((chip) => chip.addEventListener('click', () => {
      const d = chip.dataset.day;
      if (f.daysAttending.includes(d)) f.daysAttending = f.daysAttending.filter((x) => x !== d); else f.daysAttending.push(d);
      chip.classList.toggle('is-selected');
      setFieldError('daysChips', null);
    }));
  }
  function validateSchedule() {
    let ok = true;
    const classGridErr = $('err-classGrid');
    if (!formState.classId) { classGridErr.textContent = 'Choose a class.'; classGridErr.hidden = false; ok = false; } else classGridErr.hidden = true;
    if (!formState.scheduleStartDate) { setFieldError('schStart', 'Start date is required.'); ok = false; } else setFieldError('schStart', null);
    const daysErr = $('err-daysChips');
    if (!formState.daysAttending.length) { daysErr.textContent = 'Select at least one day.'; daysErr.hidden = false; ok = false; } else daysErr.hidden = true;
    if (!ok) return false;
    const cls = classRecords().find((c) => c.id === formState.classId);
    if (cls && cls.capacity > 0 && enrolledCountFor(cls) >= cls.capacity && !formState.waitlisted) {
      window.PlayShell.toast('warning', 'Class is full', cls.name + ' has no available seats. Add this child to the waitlist to continue.');
      return false;
    }
    return true;
  }

  /* ---------- per-step validation dispatch ---------- */
  function validateStep(index) {
    return [validateDetails, validateGuardians, validateEmergency, validateHealth, validateSchedule][index]();
  }

  /* ========================================================================
     BUILD PATCH + SAVE
     ======================================================================== */
  function buildChildPatch() {
    const f = formState;
    const fullName = (f.firstName.trim() + ' ' + f.lastName.trim()).trim();
    const cls = classRecords().find((c) => c.id === f.classId);
    const alerts = []
      .concat(f.allergies.filter((a) => a.allergen.trim()).map((a) => ({ id: a.id, type: 'allergy', detail: a.reaction ? a.reaction : (a.allergen + ' allergy'), allergen: a.allergen, severity: a.severity, actionPlanDocName: a.actionPlanDocName })))
      .concat(f.conditions.filter((c) => c.name.trim()).map((c) => ({ id: c.id, type: 'medical', detail: c.name + (c.notes ? ': ' + c.notes : '') })))
      .concat(f.dietaryTags.length ? [{ id: uid('AL'), type: 'dietary', detail: f.dietaryTags.join(', ') + (f.dietaryNotes ? ' — ' + f.dietaryNotes : '') }] : [])
      .concat(f.custodyAlerts);

    const authorizedPickups = []
      .concat(f.pickups.map((p) => ({ id: p.id, name: p.name, relation: p.relation, phone: p.phone, idDetails: p.idDetails, passcode: p.passcode || null, status: p.status, photoDataUrl: p.photoDataUrl || null, restricted: false })))
      .concat(f.restricted.map((r) => ({ id: r.id, name: r.name, restricted: true, restrictionReason: r.reason, documentName: r.documentName })));

    let status = f.waitlisted ? 'Waitlisted' : (mode === 'edit' && f.originalStatus && f.originalStatus !== 'Waitlisted' ? f.originalStatus : 'Active');

    return {
      name: fullName, firstName: f.firstName.trim(), lastName: f.lastName.trim(), preferredName: f.preferredName.trim(),
      photoDataUrl: f.photoDataUrl, dob: f.dob, gender: f.gender, homeLanguages: f.homeLanguages, nationality: f.nationality,
      room: cls ? cls.name : '', status,
      guardians: f.guardians.map((g) => ({ name: g.name, relation: g.relation, phone: g.phone, email: g.email, primary: g.primary, livesWith: g.livesWith, parentalResponsibility: g.parentalResponsibility, household: g.household })),
      emergencyContacts: f.emergencyContacts,
      authorizedPickups,
      alerts,
      healthAllergies: f.allergies, medicalConditions: f.conditions, medications: f.medications,
      dietaryTags: f.dietaryTags, dietaryNotes: f.dietaryNotes,
      immunizationStatus: f.immunizationStatus, immunizationNotes: f.immunizationNotes, doctor: f.doctor,
      scheduleStartDate: f.scheduleStartDate, startDate: f.scheduleStartDate, daysAttending: f.daysAttending, session: f.session,
    };
  }

  function persistGuardiansAndGetIds(patch) {
    const guardianIds = [];
    let primaryId = null;
    formState.guardians.forEach((g) => {
      const relation = (g.relation || 'Guardian') + ' of ' + patch.name;
      const contact = g.email || g.phone || '';
      let gid;
      if (g.existingGuardianId) {
        gid = g.existingGuardianId;
        window.PlayStore.updateRecord(gid, { name: g.name, relation, contact, phone: g.phone, email: g.email });
      } else {
        gid = uid('G');
        window.PlayStore.addRecord({ id: gid, type: 'Guardian', name: g.name, relation, status: 'Active', contact, phone: g.phone, email: g.email });
      }
      guardianIds.push(gid);
      if (g.primary) primaryId = gid;
    });
    return { guardianIds, guardianId: primaryId || guardianIds[0] || null };
  }

  function submitWithLoading(btnId, work) {
    if (saving) return;
    saving = true;
    const btn = $(btnId);
    btn.classList.add('is-loading'); btn.disabled = true;
    window.setTimeout(() => {
      work();
      saving = false;
      btn.classList.remove('is-loading'); btn.disabled = false;
    }, 450);
  }

  function performSaveDraft() {
    if (!formState.firstName.trim() && !formState.lastName.trim()) {
      window.PlayShell.toast('error', 'Add a name first', "Enter at least the child's name before saving a draft.");
      return;
    }
    submitWithLoading('enrollDraftBtn', () => {
      const patch = buildChildPatch();
      const { guardianIds, guardianId } = persistGuardiansAndGetIds(patch);
      patch.guardianIds = guardianIds; patch.guardianId = guardianId;
      if (!formState.id) {
        patch.status = 'Draft';
        const id = uid('C');
        window.PlayStore.addRecord(Object.assign({ id, type: 'Child' }, patch));
        formState.id = id;
      } else {
        if (mode === 'new') patch.status = 'Draft';
        window.PlayStore.updateRecord(formState.id, patch);
      }
      const name = patch.name || 'This child';
      window.PlayShell.toast('success', 'Draft saved', name + "'s progress has been saved. You can resume this enrolment any time.");
    });
  }

  function performFinalSave() {
    for (let i = 0; i < STEPS.length; i++) {
      if (!validateStep(i)) { currentStep = i; renderAll(); return; }
    }
    submitWithLoading('enrollNextBtn', () => {
      const patch = buildChildPatch();
      const { guardianIds, guardianId } = persistGuardiansAndGetIds(patch);
      patch.guardianIds = guardianIds; patch.guardianId = guardianId;

      let childId = formState.id;
      if (childId) {
        window.PlayStore.updateRecord(childId, patch);
      } else {
        childId = uid('C');
        window.PlayStore.addRecord(Object.assign({ id: childId, type: 'Child' }, patch));
      }

      const cls = classRecords().find((c) => c.id === formState.classId);
      if (cls && cls.teacherId) {
        window.PlayShell.addNotification({
          title: formState.waitlisted ? 'Waitlist request' : (mode === 'edit' ? 'Child details updated' : 'New enrolment'),
          text: `${patch.name} ${formState.waitlisted ? 'was added to the waitlist for' : (mode === 'edit' ? 'had their details updated in' : 'was enrolled in')} ${cls.name}.`,
          forRole: 'Teacher', module: null, mention: true, recordRoute: 'record.html?id=' + childId,
        });
      }

      const successText = formState.waitlisted
        ? `${patch.name} added to the ${cls ? cls.name : 'class'} waitlist`
        : mode === 'edit' ? `${patch.name}'s details were saved` : `${patch.name} enrolled`;
      window.PlayShell.toast('success', successText, formState.waitlisted ? "We'll let staff know as soon as a seat opens up." : "Redirecting to their profile…");
      window.setTimeout(() => { window.location.href = 'record.html?id=' + encodeURIComponent(childId); }, 900);
    });
  }
})();
