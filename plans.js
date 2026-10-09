/* ==========================================================================
   PLAY SCHOOL — Plans & upgrade page logic ("S61")
   Guarded like payroll.html (Admin/Director only). Lets the school change
   its simulated subscription plan; module entitlement (module.js) re-checks
   this on every visit, so upgrading here immediately unlocks modules.
   ========================================================================== */
(function () {
  'use strict';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const PLAN_TAGLINES = {
    Starter: 'Core tools to run day-to-day operations.',
    Standard: 'Starter, plus operational insight and reporting.',
    Premium: 'The complete toolkit for safeguarding, communication and growth.',
  };
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  let moduleId = null;
  let role = 'Teacher';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const params = new URLSearchParams(window.location.search);
    role = params.get('role') || 'Teacher';
    moduleId = params.get('module');

    const allowed = ['Admin', 'Director'];
    if (allowed.indexOf(role) === -1) {
      window.location.replace('access-denied.html?role=' + encodeURIComponent(role) + '&page=' + encodeURIComponent('Plans & upgrade'));
      return;
    }

    window.PlayShell.login();
    const appContent = window.PlayShell.mount('', 'Plans & upgrade');
    const pageContent = document.getElementById('pageContent');
    pageContent.hidden = false;
    appContent.appendChild(pageContent);

    if (moduleId && window.PlayModules.getById(moduleId)) {
      const mod = window.PlayModules.getById(moduleId);
      document.getElementById('plansIntroText').textContent = `Upgrade to unlock ${mod.name} — and everything else included at that plan.`;
    }

    renderGrid();
  }

  function modulesAddedAt(tier) {
    return window.PlayModules.MODULES.filter((m) => m.requiredPlan === tier).map((m) => m.navLabel);
  }

  function tileHtml(tier, currentPlan, delayMs) {
    const idx = window.PlayModules.planIndex(tier);
    const currentIdx = window.PlayModules.planIndex(currentPlan);
    const isCurrent = tier === currentPlan;
    const isIncluded = idx < currentIdx;
    const isUpgrade = idx > currentIdx;
    const highlightClass = tier === 'Premium' ? ' plan-tile--highlight' : '';
    const currentClass = isCurrent ? ' plan-tile--current' : '';

    const included = modulesAddedAt(tier);
    const listHtml = included.length
      ? included.map((name) => `<div class="plan-tile__list-row">${CHECK_ICON}<span>${escapeHtml(name)}</span></div>`).join('')
      : `<div class="plan-tile__list-row" style="color: var(--color-text-muted);">No module-specific inclusions at this tier.</div>`;

    let badge = '';
    if (isCurrent) badge = '<span class="badge badge--primary plan-tile__badge">Current plan</span>';
    else if (tier === 'Premium') badge = '<span class="badge badge--accent plan-tile__badge">Most popular</span>';

    let action;
    if (isCurrent) action = `<button class="btn btn--secondary plan-tile__action" type="button" disabled>Current plan</button>`;
    else if (isIncluded) action = `<button class="btn btn--ghost plan-tile__action" type="button" disabled>Included in your plan</button>`;
    else if (isUpgrade) action = `<button class="btn ${tier === 'Premium' ? 'btn--accent' : 'btn--primary'} plan-tile__action" type="button" data-choose-plan="${tier}">Choose ${tier}</button>`;

    const nameColor = tier === 'Premium' ? 'style="color: var(--raw-white);"' : '';

    return `
      <div class="plan-tile${highlightClass}${currentClass}" style="animation-delay:${delayMs}ms">
        ${badge}
        <div class="plan-tile__name" ${nameColor}>${tier}</div>
        <p class="plan-tile__tagline" style="${tier === 'Premium' ? 'color: var(--color-text-secondary);' : ''}">${PLAN_TAGLINES[tier]}</p>
        <div class="plan-tile__list">${listHtml}</div>
        ${action}
      </div>`;
  }

  function renderGrid() {
    const currentPlan = window.PlayModules.getCurrentPlan();
    const grid = document.getElementById('plansGrid');
    grid.innerHTML = window.PlayModules.PLAN_ORDER
      .map((tier, i) => tileHtml(tier, currentPlan, i * 90))
      .join('');

    grid.querySelectorAll('[data-choose-plan]').forEach((btn) => {
      btn.addEventListener('click', () => choosePlan(btn.getAttribute('data-choose-plan'), btn));
    });
  }

  function choosePlan(tier, btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    window.PlayModules.setCurrentPlan(tier);

    try {
      window.PlayShell.addNotification({
        title: 'Plan updated',
        text: `${role} upgraded the school to the ${tier} plan.`,
        forRole: 'Director',
        module: null,
        mention: false,
        recordRoute: 'plans.html',
      });
    } catch (e) { /* non-fatal — notification is a courtesy, not the source of truth */ }

    showToast('success', `You're now on ${tier}`, 'The new modules are unlocked for your whole team.');
    renderGrid();

    const confirm = document.getElementById('planConfirm');
    if (moduleId && window.PlayModules.getById(moduleId)) {
      const mod = window.PlayModules.getById(moduleId);
      document.getElementById('planConfirmText').innerHTML = `You're on the <b>${escapeHtml(tier)}</b> plan. <b>${escapeHtml(mod.name)}</b> is ready.`;
      document.getElementById('planConfirmLink').textContent = `Go to ${mod.name}`;
      document.getElementById('planConfirmLink').href = `module.html?id=${encodeURIComponent(mod.id)}&role=${encodeURIComponent(role)}`;
      confirm.hidden = false;
      confirm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      document.getElementById('planConfirmText').innerHTML = `You're now on the <b>${escapeHtml(tier)}</b> plan.`;
      document.getElementById('planConfirmLink').textContent = 'Go to dashboard';
      document.getElementById('planConfirmLink').href = 'dashboard.html';
      confirm.hidden = false;
    }
  }

  function showToast(type, title, text) {
    const region = document.getElementById('plansToastRegion');
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
