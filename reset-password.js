/* ==========================================================================
   PLAY SCHOOL — Password reset (S02) logic
   Standalone demo flow: no backend exists in this static project, so every
   "send"/"resend"/"update password" step below is explicitly simulated.
   Swap the three TODO-marked points for real API calls when a password
   reset backend exists. Passwords are kept in memory only — never written
   to localStorage/sessionStorage.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const EYE_ICON = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>';
  const EYE_OFF_ICON = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

  const RESEND_SECONDS = 30;

  let step = 1;
  let email = '';
  let resendRemaining = RESEND_SECONDS;
  let resendTimerId = null;
  let resendStarted = false;
  let isSubmittingStep1 = false;
  let isSubmittingStep3 = false;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('beforeunload', () => { if (resendTimerId) clearInterval(resendTimerId); });

  function init() {
    wireStep1();
    wirePasswordToggle('newPasswordToggle', 'newPassword', 'newPasswordEyeIcon');
    wirePasswordToggle('confirmPasswordToggle', 'confirmPassword', 'confirmPasswordEyeIcon');
    wireStep2();
    wireStep3();
  }

  /* ---------- step navigation ---------- */
  function goToStep(n) {
    step = n;
    [1, 2, 3].forEach((i) => {
      $('resetStep' + i).hidden = i !== n;
    });
    document.querySelectorAll('.reset-progress__seg').forEach((seg) => {
      const segNum = Number(seg.dataset.seg);
      seg.classList.toggle('is-complete', segNum < n);
      seg.classList.toggle('is-active', segNum <= n);
    });
    $('resetProgress').setAttribute('aria-valuenow', String(n));
    $('resetStepLabel').textContent = `Step ${n} of 3`;

    const activeStep = $('resetStep' + n);
    activeStep.classList.remove('reset-step'); // restart entrance animation
    void activeStep.offsetWidth; // force reflow
    activeStep.classList.add('reset-step');

    const firstField = activeStep.querySelector('input:not([type="hidden"])');
    if (firstField) window.setTimeout(() => firstField.focus(), 350);
  }

  /* ---------- Step 1: find account ---------- */
  function wireStep1() {
    $('step1Form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (isSubmittingStep1) return;

      const input = $('resetEmail');
      const value = input.value.trim();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!valid) {
        setFieldError('resetEmailError', input, value ? 'Enter a valid email address.' : 'This field is required.');
        return;
      }
      setFieldError('resetEmailError', input, null);

      email = value;
      isSubmittingStep1 = true;
      const btn = $('step1Submit');
      btn.classList.add('is-loading');
      btn.disabled = true;

      // TODO (backend integration): replace with a real "request password
      // reset" API call. This demo never confirms whether the email exists.
      window.setTimeout(() => {
        isSubmittingStep1 = false;
        btn.classList.remove('is-loading');
        btn.disabled = false;
        $('resetStep2Message').textContent =
          `If an account exists for ${email}, we've sent a link. It expires in 30 minutes.`;
        goToStep(2);
        startResendCountdown(true);
      }, 700);
    });
  }

  function setFieldError(errorId, input, message) {
    const errorEl = $(errorId);
    if (message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
      input.closest('.field').classList.add('is-error');
    } else {
      errorEl.hidden = true;
      input.closest('.field').classList.remove('is-error');
    }
  }

  /* ---------- Step 2: check email / resend ---------- */
  function wireStep2() {
    $('step2OpenLink').addEventListener('click', () => goToStep(3));
    $('step2Back').addEventListener('click', () => goToStep(1));
    $('step2Resend').addEventListener('click', () => {
      if (!$('step2Resend').disabled) {
        startResendCountdown(true);
        showToast('info', 'Reset link resent', `We've sent another link to ${email}.`);
      }
    });
  }

  function startResendCountdown(restart) {
    if (resendStarted && !restart) return; // just revisiting step 2 — keep ticking
    resendStarted = true;
    if (resendTimerId) { clearInterval(resendTimerId); resendTimerId = null; }
    resendRemaining = RESEND_SECONDS;
    renderResend();

    resendTimerId = setInterval(() => {
      resendRemaining -= 1;
      if (resendRemaining <= 0) {
        clearInterval(resendTimerId);
        resendTimerId = null;
        resendRemaining = 0;
      }
      renderResend();
    }, 1000);
  }

  function renderResend() {
    const btn = $('step2Resend');
    $('resendCountdown').textContent = String(resendRemaining);
    if (resendRemaining <= 0) {
      btn.disabled = false;
      btn.innerHTML = 'Resend';
    } else {
      btn.disabled = true;
      btn.innerHTML = `Resend in <span id="resendCountdown">${resendRemaining}</span>s`;
    }
  }

  /* ---------- Step 3: set new password ---------- */
  const RULES = {
    length: (v) => v.length >= 8,
    number: (v) => /\d/.test(v),
    symbol: (v) => /[^A-Za-z0-9]/.test(v),
    upper: (v) => /[A-Z]/.test(v),
  };

  function wireStep3() {
    const newPw = $('newPassword');
    const confirmPw = $('confirmPassword');

    newPw.addEventListener('input', () => { updateChecklist(newPw.value); updateConfirmState(); updateSaveState(); });
    confirmPw.addEventListener('input', () => { updateConfirmState(); updateSaveState(); });

    $('step3Back').addEventListener('click', () => goToStep(2));

    $('step3Form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (isSubmittingStep3 || $('step3Submit').disabled) return;

      isSubmittingStep3 = true;
      const btn = $('step3Submit');
      btn.classList.add('is-loading');
      btn.disabled = true;

      // TODO (backend integration): replace with a real "update password"
      // API call. This demo never persists the password anywhere.
      window.setTimeout(() => {
        isSubmittingStep3 = false;
        btn.classList.remove('is-loading');
        showToast('success', "Password updated. Please sign in.");
        window.setTimeout(() => {
          window.location.href = 'signin.html?email=' + encodeURIComponent(email);
        }, 900);
      }, 900);
    });
  }

  function updateChecklist(value) {
    let score = 0;
    Object.keys(RULES).forEach((key) => {
      const pass = RULES[key](value);
      const row = document.querySelector(`.pw-rule[data-rule="${key}"]`);
      row.classList.toggle('is-valid', pass);
      if (pass) score += 1;
    });
    renderStrength(score, value.length > 0);
  }

  function renderStrength(score, hasValue) {
    const segs = document.querySelectorAll('.pw-strength__seg');
    const label = $('pwStrengthLabel');
    let color = 'var(--signin-border)';
    let tier = '';
    let text = 'Password strength';

    if (hasValue) {
      if (score <= 1) { color = 'var(--color-error)'; tier = 'is-weak'; text = 'Weak'; }
      else if (score <= 3) { color = 'var(--color-warning)'; tier = 'is-fair'; text = 'Fair'; }
      else { color = 'var(--color-success)'; tier = 'is-strong'; text = 'Strong'; }
    }

    segs.forEach((seg, i) => {
      seg.style.background = hasValue && i < Math.max(score, hasValue ? 1 : 0) ? color : '';
    });
    label.className = 'pw-strength__label' + (tier ? ' ' + tier : '');
    label.textContent = text;
  }

  function updateConfirmState() {
    const newVal = $('newPassword').value;
    const confirmVal = $('confirmPassword').value;
    const errorEl = $('confirmError');
    const successEl = $('confirmSuccess');

    if (!confirmVal) {
      errorEl.hidden = true;
      successEl.hidden = true;
      return;
    }
    if (newVal !== confirmVal) {
      errorEl.hidden = false;
      successEl.hidden = true;
    } else {
      errorEl.hidden = true;
      successEl.hidden = false;
    }
  }

  function updateSaveState() {
    const newVal = $('newPassword').value;
    const confirmVal = $('confirmPassword').value;
    const allRulesPass = Object.keys(RULES).every((key) => RULES[key](newVal));
    const match = newVal.length > 0 && confirmVal.length > 0 && newVal === confirmVal;
    $('step3Submit').disabled = !(allRulesPass && match);
  }

  /* ---------- password visibility ---------- */
  function wirePasswordToggle(btnId, inputId, iconId) {
    const btn = $(btnId);
    const input = $(inputId);
    btn.addEventListener('click', () => {
      const willShow = input.type === 'password';
      input.type = willShow ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(willShow));
      btn.setAttribute('aria-label', willShow ? 'Hide password' : 'Show password');
      $(iconId).innerHTML = willShow ? EYE_OFF_ICON : EYE_ICON;
    });
  }

  /* ---------- toast ---------- */
  function showToast(type, title, text) {
    const region = $('resetToastRegion');
    const icons = { success: '&#10003;', error: '&#9888;', warning: '&#9888;', info: '&#9432;' };
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <span class="toast__icon">${icons[type] || icons.info}</span>
      <span><div class="toast__title"></div>${text ? '<div class="toast__text"></div>' : ''}</span>
      <span class="toast__close" role="button" tabindex="0" aria-label="Dismiss notification">&times;</span>
    `;
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
