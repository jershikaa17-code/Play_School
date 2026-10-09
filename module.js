/* ==========================================================================
   PLAY SCHOOL — Locked module / plan-upgrade page logic
   Reads ?id= (module) and ?role= from the URL, resolves the module from the
   shared catalogue (modules.js), and renders either the real module content
   (if the school's current plan already includes it) or the premium
   upgrade experience. No backend — plan state, upgrade requests and contact
   requests are all simulated via localStorage, same as the rest of the app.
   ========================================================================== */
(function () {
  'use strict';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const CURRENT_USER = { name: 'Nithya', email: 'nithya@playschool.edu' };
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  const ASK_SENT_KEY = 'ps_module_upgrade_requests_sent';
  function getAskSentMap() {
    try { return JSON.parse(localStorage.getItem(ASK_SENT_KEY) || '{}'); } catch (e) { return {}; }
  }
  function markAskSent(moduleId) {
    const map = getAskSentMap();
    map[moduleId] = true;
    try { localStorage.setItem(ASK_SENT_KEY, JSON.stringify(map)); } catch (e) { /* storage unavailable */ }
  }

  let lastFocused = null;
  let activeModule = null;
  let isSubmittingContact = false;

  const trapFocus = (container, e) => {
    const focusables = $$('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])', container)
      .filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const params = new URLSearchParams(window.location.search);
    const moduleId = params.get('id');
    const role = params.get('role') || 'Teacher';
    const mod = window.PlayModules ? window.PlayModules.getById(moduleId) : null;

    if (!mod) { window.location.replace('404.html'); return; }
    if (mod.core) { window.location.replace(mod.href); return; }

    window.PlayShell.login();
    const currentPlan = window.PlayModules.getCurrentPlan();
    const unlocked = window.PlayModules.isUnlocked(mod, currentPlan);

    document.title = `${mod.name} — Play School`;
    const appContent = window.PlayShell.mount(mod.id, mod.navLabel);
    const pageContent = document.getElementById('pageContent');

    if (unlocked) renderUnlocked(pageContent, mod);
    else renderLocked(pageContent, mod, currentPlan, role);

    pageContent.hidden = false;
    appContent.appendChild(pageContent);

    wireContactForm();
  }

  function splitFeatures(features) {
    const mid = Math.ceil(features.length / 2);
    return [features.slice(0, mid), features.slice(mid)];
  }
  function featureRowHtml(f, i) {
    return `
      <div class="feature-row" style="animation-delay:${i * 70}ms">
        <span class="feature-row__icon" aria-hidden="true">${CHECK_ICON}</span>
        <span>
          <div class="feature-row__title">${escapeHtml(f.title)}</div>
          <div class="feature-row__text">${escapeHtml(f.text)}</div>
        </span>
      </div>`;
  }
  function renderFeatureColumns(idA, idB, features) {
    const [a, b] = splitFeatures(features);
    document.getElementById(idA).innerHTML = a.map((f, i) => featureRowHtml(f, i)).join('');
    document.getElementById(idB).innerHTML = b.map((f, i) => featureRowHtml(f, i + a.length)).join('');
  }
  function planListHtml(moduleNames) {
    if (!moduleNames.length) {
      return '<div style="color: var(--color-text-muted);">No additional modules at this tier.</div>';
    }
    return moduleNames.map((name) => `
      <div style="display:flex; align-items:center; gap: var(--space-2);">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${escapeHtml(name)}</span>
      </div>`).join('');
  }

  function renderLocked(container, mod, currentPlan, role) {
    const tpl = document.getElementById('lockedTemplate');
    container.innerHTML = '';
    container.appendChild(tpl.content.cloneNode(true));

    document.getElementById('moduleIcon').innerHTML = mod.icon;
    document.getElementById('moduleEyebrow').textContent = `${mod.requiredPlan} module`;
    document.getElementById('moduleHeading').textContent = `${mod.name} is available on ${mod.requiredPlan}`;
    document.getElementById('moduleText').textContent = mod.description;

    renderFeatureColumns('moduleFeaturesA', 'moduleFeaturesB', mod.features);

    document.getElementById('currentPlanName').textContent = currentPlan;
    document.getElementById('requiredPlanName').textContent = mod.requiredPlan;
    document.getElementById('currentPlanList').innerHTML = planListHtml(
      window.PlayModules.MODULES.filter((m) => m.requiredPlan === currentPlan).map((m) => m.navLabel)
    );
    document.getElementById('requiredPlanList').innerHTML = planListHtml(
      window.PlayModules.MODULES.filter((m) => m.requiredPlan === mod.requiredPlan).map((m) => m.navLabel)
    );
    document.getElementById('recommendedBadge').hidden = mod.requiredPlan !== 'Premium';

    renderActions(document.getElementById('moduleActions'), mod, role);
  }

  function renderUnlocked(container, mod) {
    const tpl = document.getElementById('unlockedTemplate');
    container.innerHTML = '';
    container.appendChild(tpl.content.cloneNode(true));

    document.getElementById('unlockedEyebrow').textContent = `${mod.requiredPlan} module`;
    document.getElementById('unlockedTitle').textContent = mod.name;
    document.getElementById('unlockedText').textContent = mod.description;
    renderFeatureColumns('unlockedFeaturesA', 'unlockedFeaturesB', mod.features);
  }

  function renderActions(container, mod, role) {
    container.innerHTML = '';
    if (role === 'Director' || role === 'Admin') {
      const upgradeLink = document.createElement('a');
      upgradeLink.className = 'btn btn--accent';
      upgradeLink.href = `plans.html?module=${encodeURIComponent(mod.id)}&role=${encodeURIComponent(role)}`;
      upgradeLink.textContent = 'See plans & upgrade';

      const talkBtn = document.createElement('button');
      talkBtn.type = 'button';
      talkBtn.className = 'btn btn--secondary';
      talkBtn.textContent = 'Talk to us';
      talkBtn.addEventListener('click', () => openContactModal(mod, talkBtn));

      container.append(upgradeLink, talkBtn);
    } else {
      const askBtn = document.createElement('button');
      askBtn.type = 'button';
      askBtn.className = 'btn btn--accent';
      askBtn.textContent = 'Ask my admin to upgrade';
      if (getAskSentMap()[mod.id]) setAskSentState(askBtn);
      askBtn.addEventListener('click', () => sendUpgradeRequest(mod, role, askBtn));
      container.appendChild(askBtn);
    }
  }

  function setAskSentState(btn) {
    btn.disabled = true;
    btn.textContent = 'Request sent';
  }

  function sendUpgradeRequest(mod, role, btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Sending…';
    try {
      window.PlayShell.addNotification({
        title: 'Upgrade request',
        text: `${role} requested access to ${mod.name} (requires ${mod.requiredPlan}).`,
        forRole: 'Director',
        module: mod.id,
        mention: true,
        recordRoute: `module.html?id=${mod.id}&role=${encodeURIComponent(role)}`,
      });
      markAskSent(mod.id);
      setAskSentState(btn);
      showToast('success', 'Request sent', `Your director has been notified about ${mod.name}.`);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = original;
      showToast('error', 'Could not send request', 'Please try again in a moment.');
    }
  }

  /* ---------- Talk to us modal ---------- */
  function openContactModal(mod, triggerBtn) {
    activeModule = mod;
    lastFocused = triggerBtn || document.activeElement;
    document.getElementById('contactModuleName').textContent = mod.name;
    document.getElementById('contactName').value = CURRENT_USER.name;
    document.getElementById('contactEmail').value = CURRENT_USER.email;
    document.getElementById('contactMessage').value = `Hi, I'd like to learn more about upgrading to unlock ${mod.name} for our school.`;
    document.getElementById('contactTime').value = 'Morning (9am–12pm)';
    const errorEl = document.getElementById('contactFormError');
    errorEl.hidden = true;
    errorEl.textContent = '';

    const backdrop = document.getElementById('contactModalBackdrop');
    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('contactName').focus(), 50);
  }
  function closeContactModal() {
    const backdrop = document.getElementById('contactModalBackdrop');
    if (!backdrop.classList.contains('is-open')) return;
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  function validateContactForm() {
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !emailOk || !message) {
      return 'Please add your name, a valid email, and a short message.';
    }
    return null;
  }

  /* Simulated submission — the project has no backend, so this is the
     integration point for a real contact/enquiry endpoint. It stores the
     request locally and only resolves success once that write succeeds. */
  function submitContactRequest(payload) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const KEY = 'ps_contact_requests';
          const list = JSON.parse(localStorage.getItem(KEY) || '[]');
          list.unshift(Object.assign({ id: 'CR-' + Date.now().toString(36), time: new Date().toISOString() }, payload));
          localStorage.setItem(KEY, JSON.stringify(list));
          resolve();
        } catch (e) {
          reject(e);
        }
      }, 650);
    });
  }

  function wireContactForm() {
    const backdrop = document.getElementById('contactModalBackdrop');
    const submitBtn = document.getElementById('contactSubmitBtn');
    const errorEl = document.getElementById('contactFormError');

    backdrop.addEventListener('click', (e) => {
      if (isSubmittingContact) return;
      if (e.target === backdrop || e.target.closest('[data-close]')) closeContactModal();
    });
    document.addEventListener('keydown', (e) => {
      if (!backdrop.classList.contains('is-open')) return;
      if (e.key === 'Escape' && !isSubmittingContact) closeContactModal();
      if (e.key === 'Tab') trapFocus($('.modal', backdrop), e);
    });

    submitBtn.addEventListener('click', () => {
      if (isSubmittingContact) return;
      const error = validateContactForm();
      errorEl.hidden = !error;
      errorEl.textContent = error || '';
      if (error) return;

      const payload = {
        module: activeModule ? activeModule.id : null,
        name: document.getElementById('contactName').value.trim(),
        email: document.getElementById('contactEmail').value.trim(),
        message: document.getElementById('contactMessage').value.trim(),
        preferredTime: document.getElementById('contactTime').value,
      };

      isSubmittingContact = true;
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;

      submitContactRequest(payload).then(() => {
        isSubmittingContact = false;
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        if (window.PlayShell) {
          window.PlayShell.addNotification({
            title: 'Contact request',
            text: `${payload.name} asked to be contacted about ${activeModule ? activeModule.name : 'a module'}.`,
            forRole: 'Director',
            module: activeModule ? activeModule.id : null,
            mention: true,
            recordRoute: activeModule ? `module.html?id=${activeModule.id}&role=Director` : null,
          });
        }
        closeContactModal();
        showToast('success', 'Request sent', "We'll be in touch at your preferred time.");
      }).catch(() => {
        isSubmittingContact = false;
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        errorEl.hidden = false;
        errorEl.textContent = 'Something went wrong sending your request. Please try again.';
        showToast('error', 'Could not send request', 'Please try again in a moment.');
      });
    });
  }

  /* ---------- toast ---------- */
  function showToast(type, title, text) {
    const region = document.getElementById('moduleToastRegion');
    const icons = { success: '&#10003;', error: '&#9888;', warning: '&#9888;', info: '&#9432;' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <span class="toast__icon">${icons[type] || icons.info}</span>
      <span><div class="toast__title">${escapeHtml(title)}</div>${text ? `<div class="toast__text">${escapeHtml(text)}</div>` : ''}</span>
      <span class="toast__close" role="button" tabindex="0" aria-label="Dismiss notification">&times;</span>
    `;
    region.appendChild(toast);
    const remove = () => { toast.classList.add('is-leaving'); setTimeout(() => toast.remove(), 220); };
    const timer = setTimeout(remove, 5000);
    const closeBtn = toast.querySelector('.toast__close');
    closeBtn.addEventListener('click', () => { clearTimeout(timer); remove(); });
    closeBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clearTimeout(timer); remove(); } });
  }
})();
