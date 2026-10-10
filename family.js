/* ==========================================================================
   PLAY SCHOOL — Family profile (S16)
   Reuses: store.js (Family/Child/Guardian/Payment records), modules.js
   (billing plan check), shell.js (shell chrome, toasts, notifications),
   record.css (profile card/header/person components — see family.css).
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function initials(name) { const p = String(name || '').trim().split(/\s+/); return p[0] ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '?'; }
  function formatDate(iso) { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d.getTime())) return '—'; return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  function isPhoneLike(v) { return !!v && v.indexOf('@') === -1; }
  const STATUS_CLASS = { 'Not invited': 'badge--neutral', 'Invited': 'badge--warning', 'Active': 'badge--success' };

  let family = null;
  let role = null;
  let hasBilling = true;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    window.PlayShell.login();
    role = window.PlayShell.getDemoRole();
    const params = new URLSearchParams(window.location.search);
    family = window.PlayStore.getById(params.get('id'));
    if (!family || family.type !== 'Family') { window.location.replace('404.html'); return; }

    hasBilling = isModuleUnlocked('billing');
    window.PlayShell.mount('families', family.name);
    $('pageContent').hidden = false;
    document.getElementById('appContent').appendChild($('pageContent'));

    $('famBreadcrumb').textContent = family.name;
    renderHeader();
    renderCards();
  }

  function isModuleUnlocked(moduleId) {
    if (!window.PlayModules) return true;
    const mod = window.PlayModules.getById(moduleId);
    return !mod || window.PlayModules.isUnlocked(mod, window.PlayModules.getCurrentPlan());
  }

  function guardians() { return (family.guardianIds || []).map((id) => window.PlayStore.getById(id)).filter(Boolean); }
  function children() { return (family.childIds || []).map((id) => window.PlayStore.getById(id)).filter(Boolean); }
  function primaryGuardian() { return window.PlayStore.getById(family.primaryGuardianId) || guardians()[0] || null; }
  function primaryContact() { const g = primaryGuardian(); if (!g) return null; return g.phone || (isPhoneLike(g.contact) ? g.contact : null); }
  function balance() {
    const names = new Set(children().map((c) => c.name));
    return window.PlayStore.getByType('Payment').filter((p) => names.has(p.childName) && p.status === 'Pending').reduce((s, p) => s + Number(p.amount || 0), 0);
  }
  function payments() {
    const names = new Set(children().map((c) => c.name));
    return window.PlayStore.getByType('Payment').filter((p) => names.has(p.childName)).sort((a, b) => b.date.localeCompare(a.date));
  }

  function renderHeader() {
    const pg = primaryGuardian();
    $('famHeader').innerHTML = `
      <div class="profile-header">
        <div class="profile-header__photo">${escapeHtml(initials(family.name))}</div>
        <div class="profile-header__body">
          <div class="profile-header__name-row">
            <span class="profile-header__name">${escapeHtml(family.name)}</span>
            <span class="badge ${STATUS_CLASS[family.parentAppStatus] || 'badge--neutral'}">${escapeHtml(family.parentAppStatus)}</span>
          </div>
          <div class="profile-header__meta">
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Guardians</span><span class="profile-header__meta-value">${guardians().length}</span></div>
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Children</span><span class="profile-header__meta-value">${children().length}</span></div>
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Primary contact</span><span class="profile-header__meta-value">${pg ? escapeHtml(pg.name) : '—'}</span></div>
            ${hasBilling ? `<div class="profile-header__meta-item"><span class="profile-header__meta-label">Balance</span><span class="profile-header__meta-value">${balance() > 0 ? '$' + balance().toFixed(2) + ' due' : 'Settled'}</span></div>` : ''}
          </div>
        </div>
        <div class="profile-header__actions">
          <button class="btn btn--secondary btn--sm" type="button" id="famEditBtn">Edit family</button>
          ${family.parentAppStatus !== 'Active' ? `<button class="btn btn--accent btn--sm" type="button" id="famInviteBtn">Invite to parent app</button>` : ''}
        </div>
      </div>`;
    $('famEditBtn').addEventListener('click', () => { window.location.href = 'families.html?action=edit&id=' + encodeURIComponent(family.id); });
    const inviteBtn = $('famInviteBtn');
    if (inviteBtn) inviteBtn.addEventListener('click', () => {
      inviteBtn.classList.add('is-loading'); inviteBtn.disabled = true;
      window.setTimeout(() => {
        window.PlayStore.updateRecord(family.id, { parentAppStatus: 'Invited', invitedAt: new Date().toISOString() });
        family = window.PlayStore.getById(family.id);
        window.PlayShell.toast('success', 'Invite sent', `${family.name} was invited to the parent app.`);
        renderHeader();
      }, 450);
    });
  }

  function emptyState(text) { return `<p class="profile-empty">${escapeHtml(text)}</p>`; }

  function renderCards() {
    const guardianRows = guardians().map((g) => `
      <div class="profile-person">
        <span class="profile-person__avatar">${escapeHtml(initials(g.name))}</span>
        <span class="profile-person__body"><span class="profile-person__name">${escapeHtml(g.name)}${g.id === family.primaryGuardianId ? ' <span class="badge badge--primary" style="font-size:.65rem;">Primary</span>' : ''}</span><span class="profile-person__sub">${escapeHtml(g.phone || g.contact || 'No contact on file')}</span></span>
      </div>`).join('');

    const childRows = children().map((c) => `
      <a class="profile-person" href="record.html?id=${encodeURIComponent(c.id)}" style="text-decoration:none; color:inherit;">
        <span class="profile-person__avatar">${escapeHtml(initials(c.name))}</span>
        <span class="profile-person__body"><span class="profile-person__name">${escapeHtml(c.name)}</span><span class="profile-person__sub">${escapeHtml(c.room || 'No class assigned')} · ${escapeHtml(c.status || '')}</span></span>
      </a>`).join('');

    const paymentRows = payments().map((p) => `
      <div class="profile-list-row">
        <div><div class="profile-list-row__title">$${Number(p.amount).toFixed(2)}</div><div class="profile-list-row__meta">${escapeHtml(p.childName)} · ${formatDate(p.date)}</div></div>
        <span class="badge ${p.status === 'Paid' ? 'badge--success' : 'badge--warning'}">${escapeHtml(p.status)}</span>
      </div>`).join('');

    $('famCards').innerHTML = `
      <div class="profile-card">
        <span class="profile-card__title">Guardians</span>
        <div class="profile-people" style="margin-top: var(--space-3);">${guardianRows || emptyState('No guardians on file.')}</div>
      </div>
      <div class="profile-card fam-profile-children">
        <span class="profile-card__title">Children</span>
        <div class="profile-people" style="margin-top: var(--space-3);">${childRows || emptyState('No children linked to this family yet.')}</div>
      </div>
      <div class="profile-card profile-card--wide">
        <span class="profile-card__title">Billing</span>
        ${hasBilling
          ? (payments().length ? `<div class="profile-row"><span class="profile-row__label">Outstanding balance</span><span class="profile-row__value">${balance() > 0 ? '$' + balance().toFixed(2) : 'Settled'}</span></div><div class="profile-list" style="margin-top: var(--space-3);">${paymentRows}</div>` : emptyState('No billing records for this family.'))
          : emptyState('Billing is not available on the current plan.')}
      </div>`;
  }
})();
