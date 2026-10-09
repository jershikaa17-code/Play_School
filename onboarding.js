/* ==========================================================================
   PLAY SCHOOL — New school admin onboarding wizard
   Persists via PlayStore (store.js): school/admin/academic-year/preferences
   go into PlayStore.saveSettings(); classes/staff go into PlayStore records
   (type 'Class' / 'Staff') via addRecord/removeRecord — the same store used
   by the rest of the app, so nothing here is a competing data model.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const STATE_KEY = 'ps_onboarding_state';
  const STEPS = [
    { id: 1, key: 'school', label: 'School details' },
    { id: 2, key: 'admin', label: 'Admin profile' },
    { id: 3, key: 'year', label: 'Academic year' },
    { id: 4, key: 'classes', label: 'Classes' },
    { id: 5, key: 'staff', label: 'Staff' },
    { id: 6, key: 'prefs', label: 'Preferences' },
    { id: 7, key: 'review', label: 'Review & finish' },
  ];

  function defaultState() {
    return {
      currentStep: 1,
      completedSteps: [],
      noClassWarningAccepted: false,
      complete: false,
      school: { name: '', email: '', phone: '', address: '', language: 'English' },
      admin: { name: 'Nithya', email: '', phone: '' },
      academicYear: { name: '', start: '', end: '' },
      classes: [],
      staff: [],
      preferences: { language: 'English', dateFormat: 'DD/MM/YYYY', notifyEmail: true, notifyApp: true },
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return defaultState();
      return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { return defaultState(); }
  }
  function persistState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
    isDirty = false;
  }

  let state = loadState();
  let isDirty = false;
  let isSubmitting = false;
  let pendingRemove = null; // { kind: 'class'|'staff', id }
  let saveDebounce = null;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('beforeunload', (e) => {
    if (isDirty) { e.preventDefault(); e.returnValue = ''; }
  });

  function init() {
    if (window.PlayShell) window.PlayShell.login();
    hydrateFormsFromState();
    wireForms();
    wireClassStep();
    wireStaffStep();
    wirePrefsStep();
    wireFooterAndModals();
    render();
  }

  /* ---------- rendering ---------- */
  function maxReachableStep() {
    const maxCompleted = state.completedSteps.length ? Math.max(...state.completedSteps) : 0;
    return Math.max(maxCompleted + 1, state.currentStep);
  }

  function render() {
    document.querySelectorAll('.wiz-step-panel').forEach((panel) => {
      panel.hidden = Number(panel.dataset.step) !== state.currentStep;
    });
    renderStepper();
    renderFooter();
    if (state.currentStep === 4) renderClassList();
    if (state.currentStep === 5) renderStaffList();
    if (state.currentStep === 7) renderReview();

    const activePanel = document.querySelector(`.wiz-step-panel[data-step="${state.currentStep}"]`);
    if (activePanel) {
      activePanel.classList.remove('wiz-step-panel');
      void activePanel.offsetWidth;
      activePanel.classList.add('wiz-step-panel');
    }
  }

  function renderStepper() {
    const reach = maxReachableStep();
    const stepper = $('wizStepper');
    stepper.innerHTML = STEPS.map((s) => {
      const complete = state.completedSteps.includes(s.id);
      const current = s.id === state.currentStep;
      const clickable = s.id <= reach && s.id !== state.currentStep;
      const cls = ['wiz-step', complete ? 'is-complete' : '', current ? 'is-current' : '', clickable ? 'is-clickable' : ''].filter(Boolean).join(' ');
      return `
        <div class="${cls}" data-goto="${s.id}">
          <span class="wiz-step__line" aria-hidden="true"></span>
          <span class="wiz-step__dot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>${s.id}</span>
          </span>
          <span class="wiz-step__label">${escapeHtml(s.label)}</span>
        </div>`;
    }).join('');
    stepper.querySelectorAll('[data-goto]').forEach((el) => {
      const target = Number(el.dataset.goto);
      if (target <= reach && target !== state.currentStep) {
        el.addEventListener('click', () => goToStep(target));
      }
    });

    const current = STEPS.find((s) => s.id === state.currentStep);
    $('wizMobileLabel').textContent = `Step ${state.currentStep} of 7 · ${current.label}`;
    $('wizMobileBarFill').style.width = (state.currentStep / 7 * 100) + '%';
  }

  function renderFooter() {
    $('wizBack').hidden = state.currentStep === 1;
    $('wizNextLabel').textContent = state.currentStep === 7 ? 'Complete setup' : 'Next';
  }

  function goToStep(n) {
    if (n > maxReachableStep()) return;
    state.currentStep = n;
    persistState();
    render();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  /* ---------- field helpers ---------- */
  function setError(fieldId, message) {
    const input = $(fieldId);
    const errorEl = $('err-' + fieldId);
    if (!errorEl) return;
    if (message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
      if (input) input.closest('.field').classList.add('is-error');
    } else {
      errorEl.hidden = true;
      if (input) input.closest('.field').classList.remove('is-error');
    }
  }
  function markDirty() {
    isDirty = true;
    if (saveDebounce) clearTimeout(saveDebounce);
    saveDebounce = setTimeout(() => { persistState(); }, 500);
  }

  function hydrateFormsFromState() {
    $('schoolName').value = state.school.name;
    $('schoolEmail').value = state.school.email;
    $('schoolPhone').value = state.school.phone;
    $('schoolAddress').value = state.school.address;
    $('schoolLanguage').value = state.school.language;
    $('adminName').value = state.admin.name;
    $('adminEmail').value = state.admin.email;
    $('adminPhone').value = state.admin.phone;
    $('yearName').value = state.academicYear.name;
    $('yearStart').value = state.academicYear.start;
    $('yearEnd').value = state.academicYear.end;
    $('prefLanguage').value = state.preferences.language;
    $('prefDateFormat').value = state.preferences.dateFormat;
    $('prefNotifyEmail').checked = !!state.preferences.notifyEmail;
    $('prefNotifyApp').checked = !!state.preferences.notifyApp;
  }

  function wireForms() {
    ['schoolName', 'schoolEmail', 'schoolPhone', 'schoolAddress', 'schoolLanguage',
     'adminName', 'adminEmail', 'adminPhone', 'yearName', 'yearStart', 'yearEnd'].forEach((id) => {
      $(id).addEventListener('input', markDirty);
    });
  }

  function wirePrefsStep() {
    ['prefLanguage', 'prefDateFormat', 'prefNotifyEmail', 'prefNotifyApp'].forEach((id) => {
      $(id).addEventListener('change', markDirty);
    });
    $('skipPrefs').addEventListener('click', (e) => {
      e.preventDefault();
      commitStep(6);
      advanceAfterStep(6);
    });
  }

  /* ---------- validation per step ---------- */
  function validateStep(n) {
    if (n === 1) {
      let ok = true;
      if (!$('schoolName').value.trim()) { setError('schoolName', 'School name is required.'); ok = false; } else setError('schoolName', null);
      const email = $('schoolEmail').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('schoolEmail', 'Enter a valid email.'); ok = false; } else setError('schoolEmail', null);
      if (!$('schoolPhone').value.trim()) { setError('schoolPhone', 'Phone number is required.'); ok = false; } else setError('schoolPhone', null);
      if (!$('schoolAddress').value.trim()) { setError('schoolAddress', 'Address is required.'); ok = false; } else setError('schoolAddress', null);
      return ok;
    }
    if (n === 2) {
      let ok = true;
      if (!$('adminName').value.trim()) { setError('adminName', 'Your name is required.'); ok = false; } else setError('adminName', null);
      const email = $('adminEmail').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('adminEmail', 'Enter a valid email.'); ok = false; } else setError('adminEmail', null);
      return ok;
    }
    if (n === 3) {
      let ok = true;
      if (!$('yearName').value.trim()) { setError('yearName', 'Give this academic year a name.'); ok = false; } else setError('yearName', null);
      const start = $('yearStart').value, end = $('yearEnd').value;
      if (!start) { setError('yearStart', 'Start date is required.'); ok = false; } else setError('yearStart', null);
      if (!end) { setError('yearEnd', 'End date is required.'); ok = false; }
      else if (start && end <= start) { setError('yearEnd', 'End date must be after the start date.'); ok = false; }
      else setError('yearEnd', null);
      return ok;
    }
    return true;
  }

  function commitStep(n) {
    if (n === 1) {
      state.school = {
        name: $('schoolName').value.trim(),
        email: $('schoolEmail').value.trim(),
        phone: $('schoolPhone').value.trim(),
        address: $('schoolAddress').value.trim(),
        language: $('schoolLanguage').value,
      };
      window.PlayStore.saveSettings({ school: state.school });
    } else if (n === 2) {
      state.admin = { name: $('adminName').value.trim(), email: $('adminEmail').value.trim(), phone: $('adminPhone').value.trim() };
      window.PlayStore.saveSettings({ admin: state.admin });
    } else if (n === 3) {
      state.academicYear = { name: $('yearName').value.trim(), start: $('yearStart').value, end: $('yearEnd').value };
      window.PlayStore.saveSettings({ academicYear: state.academicYear });
    } else if (n === 6) {
      state.preferences = {
        language: $('prefLanguage').value,
        dateFormat: $('prefDateFormat').value,
        notifyEmail: $('prefNotifyEmail').checked,
        notifyApp: $('prefNotifyApp').checked,
      };
      window.PlayStore.saveSettings({ preferences: state.preferences });
    }
    if (!state.completedSteps.includes(n)) state.completedSteps.push(n);
    persistState();
  }

  function advanceAfterStep(n) {
    if (n < 7) { state.currentStep = n + 1; persistState(); render(); window.scrollTo(0, 0); }
  }

  /* ---------- classes ---------- */
  function renderClassList() {
    const list = $('classList');
    if (!state.classes.length) {
      list.innerHTML = '<div class="wiz-list-empty">No classes added yet. Add your first class above.</div>';
      return;
    }
    list.innerHTML = state.classes.map((c) => `
      <div class="wiz-list-row" data-id="${c.id}">
        <div class="wiz-list-row__main">
          <div class="wiz-list-row__title">${escapeHtml(c.name)}</div>
          <div class="wiz-list-row__meta">${escapeHtml([c.ageGroup, c.teacherName].filter(Boolean).join(' · ') || 'No additional details')}</div>
        </div>
        <button class="btn btn--icon" type="button" data-remove-class="${c.id}" aria-label="Remove ${escapeHtml(c.name)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`).join('');
    list.querySelectorAll('[data-remove-class]').forEach((btn) => {
      btn.addEventListener('click', () => confirmRemove('class', btn.dataset.removeClass));
    });
  }

  function wireClassStep() {
    $('addClassBtn').addEventListener('click', () => {
      const name = $('classNameInput').value.trim();
      if (!name) { setError('class', 'Enter a class name to add it.'); return; }
      setError('class', null);
      const record = {
        id: 'CLS-' + Date.now().toString(36),
        type: 'Class',
        name,
        ageGroup: $('classAgeInput').value.trim(),
        teacherName: $('classTeacherInput').value.trim(),
        status: 'Active',
      };
      window.PlayStore.addRecord(record);
      state.classes.push(record);
      $('classNameInput').value = '';
      $('classAgeInput').value = '';
      $('classTeacherInput').value = '';
      persistState();
      renderClassList();
      $('classNameInput').focus();
    });
  }

  /* ---------- staff ---------- */
  function renderStaffList() {
    const list = $('staffList');
    if (!state.staff.length) {
      list.innerHTML = '<div class="wiz-list-empty">No staff added yet — totally fine, you can invite your team anytime.</div>';
      return;
    }
    list.innerHTML = state.staff.map((s) => `
      <div class="wiz-list-row" data-id="${s.id}">
        <div class="wiz-list-row__main">
          <div class="wiz-list-row__title">${escapeHtml(s.name)}</div>
          <div class="wiz-list-row__meta">${escapeHtml([s.relation, s.email].filter(Boolean).join(' · '))}</div>
        </div>
        <button class="btn btn--icon" type="button" data-remove-staff="${s.id}" aria-label="Remove ${escapeHtml(s.name)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`).join('');
    list.querySelectorAll('[data-remove-staff]').forEach((btn) => {
      btn.addEventListener('click', () => confirmRemove('staff', btn.dataset.removeStaff));
    });
  }

  function wireStaffStep() {
    $('addStaffBtn').addEventListener('click', () => {
      const name = $('staffNameInput').value.trim();
      const email = $('staffEmailInput').value.trim();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('staff', 'Enter a name and a valid email to add staff.');
        return;
      }
      setError('staff', null);
      const record = {
        id: 'S-' + Date.now().toString(36),
        type: 'Staff',
        name,
        email,
        relation: $('staffRoleInput').value,
        status: 'Active',
      };
      window.PlayStore.addRecord(record);
      state.staff.push(record);
      $('staffNameInput').value = '';
      $('staffEmailInput').value = '';
      persistState();
      renderStaffList();
      $('staffNameInput').focus();
    });
    $('skipStaff').addEventListener('click', (e) => {
      e.preventDefault();
      if (!state.completedSteps.includes(5)) state.completedSteps.push(5);
      advanceAfterStep(5);
    });
  }

  /* ---------- remove confirmation (shared) ---------- */
  function confirmRemove(kind, id) {
    pendingRemove = { kind, id };
    const item = kind === 'class' ? state.classes.find((c) => c.id === id) : state.staff.find((s) => s.id === id);
    if (!item) return;
    $('removeModalTitle').textContent = `Remove ${item.name}?`;
    $('removeModalText').textContent = `This removes ${item.name} from the onboarding setup. This can't be undone from here.`;
    openModal('removeModalBackdrop');
  }

  function performPendingRemove() {
    if (!pendingRemove) return;
    const { kind, id } = pendingRemove;
    const row = document.querySelector(`[data-id="${id}"]`);
    const finish = () => {
      window.PlayStore.removeRecord(id);
      if (kind === 'class') state.classes = state.classes.filter((c) => c.id !== id);
      else state.staff = state.staff.filter((s) => s.id !== id);
      persistState();
      if (kind === 'class') renderClassList(); else renderStaffList();
    };
    if (row) {
      row.classList.add('is-leaving');
      setTimeout(finish, 200);
    } else {
      finish();
    }
    pendingRemove = null;
  }

  /* ---------- review ---------- */
  function renderReview() {
    const sections = [
      { title: 'School details', step: 1, body: () => `
        <div><b>${escapeHtml(state.school.name || '—')}</b></div>
        <div>${escapeHtml(state.school.email || '—')} · ${escapeHtml(state.school.phone || '—')}</div>
        <div>${escapeHtml(state.school.address || '—')}</div>` },
      { title: 'Administrator', step: 2, body: () => `
        <div><b>${escapeHtml(state.admin.name || '—')}</b></div>
        <div>${escapeHtml(state.admin.email || '—')}${state.admin.phone ? ' · ' + escapeHtml(state.admin.phone) : ''}</div>` },
      { title: 'Academic year', step: 3, body: () => `
        <div><b>${escapeHtml(state.academicYear.name || '—')}</b></div>
        <div>${escapeHtml(state.academicYear.start || '—')} to ${escapeHtml(state.academicYear.end || '—')}</div>` },
      { title: 'Classes', step: 4, body: () => state.classes.length
        ? state.classes.map((c) => `<div>${escapeHtml(c.name)}${c.ageGroup ? ' · ' + escapeHtml(c.ageGroup) : ''}</div>`).join('')
        : '<div>No classes added yet (optional, but recommended).</div>' },
      { title: 'Staff', step: 5, body: () => state.staff.length
        ? state.staff.map((s) => `<div>${escapeHtml(s.name)} · ${escapeHtml(s.relation)}</div>`).join('')
        : '<div>No staff added yet (optional).</div>' },
      { title: 'Preferences', step: 6, body: () => `
        <div>Language: <b>${escapeHtml(state.preferences.language)}</b> · Date format: <b>${escapeHtml(state.preferences.dateFormat)}</b></div>
        <div>Notifications: ${state.preferences.notifyEmail ? 'Email' : ''}${state.preferences.notifyEmail && state.preferences.notifyApp ? ', ' : ''}${state.preferences.notifyApp ? 'In-app' : ''}${!state.preferences.notifyEmail && !state.preferences.notifyApp ? 'Off' : ''}</div>` },
    ];
    $('reviewSections').innerHTML = sections.map((s) => `
      <div class="wiz-review-section">
        <div class="wiz-review-section__head">
          <span class="wiz-review-section__title">${escapeHtml(s.title)}</span>
          <button class="btn btn--text" type="button" data-edit-step="${s.step}">Edit</button>
        </div>
        <div class="wiz-review-section__body">${s.body()}</div>
      </div>`).join('');
    $('reviewSections').querySelectorAll('[data-edit-step]').forEach((btn) => {
      btn.addEventListener('click', () => goToStep(Number(btn.dataset.editStep)));
    });
  }

  /* ---------- modal plumbing (shared pattern across the app) ---------- */
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
  function wireModal(id, onConfirmId, onConfirm) {
    const backdrop = $(id);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop || e.target.closest('[data-close]')) closeModal(id);
    });
    if (onConfirmId) $(onConfirmId).addEventListener('click', () => { closeModal(id); onConfirm(); });
  }

  /* ---------- footer / navigation / save & exit ---------- */
  function wireFooterAndModals() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      ['removeModalBackdrop', 'noClassModalBackdrop', 'exitModalBackdrop'].forEach((id) => {
        if ($(id).classList.contains('is-open')) closeModal(id);
      });
    });

    wireModal('removeModalBackdrop', 'removeModalConfirm', performPendingRemove);
    wireModal('noClassModalBackdrop', 'noClassContinue', () => {
      state.noClassWarningAccepted = true;
      commitStep(4);
      advanceAfterStep(4);
    });
    wireModal('exitModalBackdrop', 'exitModalSave', () => { saveAndExit(true); });

    $('wizBack').addEventListener('click', () => {
      if (state.currentStep > 1) goToStep(state.currentStep - 1);
    });

    $('wizNext').addEventListener('click', () => {
      if (isSubmitting) return;
      const n = state.currentStep;

      if (n >= 1 && n <= 3) {
        if (!validateStep(n)) return;
        commitStep(n);
        advanceAfterStep(n);
        return;
      }
      if (n === 4) {
        if (!state.classes.length && !state.noClassWarningAccepted) { openModal('noClassModalBackdrop'); return; }
        commitStep(4);
        advanceAfterStep(4);
        return;
      }
      if (n === 5) {
        if (!state.completedSteps.includes(5)) state.completedSteps.push(5);
        persistState();
        advanceAfterStep(5);
        return;
      }
      if (n === 6) {
        commitStep(6);
        advanceAfterStep(6);
        return;
      }
      if (n === 7) {
        completeSetup();
      }
    });

    $('wizSaveExit').addEventListener('click', () => {
      if (isDirty) openModal('exitModalBackdrop');
      else saveAndExit(false);
    });
  }

  function saveAndExit(fromModal) {
    persistState();
    showToast('info', 'Progress saved', "You can pick up right where you left off.");
    window.setTimeout(() => { window.location.href = 'dashboard.html'; }, fromModal ? 500 : 300);
  }

  function completeSetup() {
    if (isSubmitting) return;
    isSubmitting = true;
    const btn = $('wizNext');
    btn.classList.add('is-loading');
    btn.disabled = true;

    window.setTimeout(() => {
      state.complete = true;
      persistState();
      if (window.PlayShell) window.PlayShell.login();
      isSubmitting = false;
      btn.classList.remove('is-loading');
      btn.disabled = false;
      showToast('success', 'Setup complete', "Your school is ready. Taking you to your dashboard.");
      window.setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
    }, 800);
  }

  /* ---------- toast ---------- */
  function showToast(type, title, text) {
    const region = $('wizToastRegion');
    const icons = { success: '&#10003;', error: '&#9888;', warning: '&#9888;', info: '&#9432;' };
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="toast__icon">${icons[type] || icons.info}</span><span><div class="toast__title"></div>${text ? '<div class="toast__text"></div>' : ''}</span><span class="toast__close" role="button" tabindex="0" aria-label="Dismiss notification">&times;</span>`;
    el.querySelector('.toast__title').textContent = title;
    if (text) el.querySelector('.toast__text').textContent = text;
    region.appendChild(el);
    const remove = () => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 220); };
    const timer = setTimeout(remove, 5000);
    const closeBtn = el.querySelector('.toast__close');
    closeBtn.addEventListener('click', () => { clearTimeout(timer); remove(); });
    closeBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clearTimeout(timer); remove(); } });
  }
})();
