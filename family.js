/* ==========================================================================
   PLAY SCHOOL — Family profile (S16)
   Reuses: store.js (Family/Child/Guardian/Payment/Message records),
   modules.js (billing/communication plan checks), shell.js (shell chrome,
   toasts, demo role), record.css (profile card/header/person components —
   see family.css), children.js's message composer (deep-linked, never
   duplicated).

   Schema notes (additive, backward-compatible — see store.js's existing
   "small schema extension" convention):
   - Guardian gains optional `preferredLanguage` and `commPreferences`.
   - Family gains optional `households`: [{id,label,address,guardianIds,
     childIds,invoiceGuardianId,reportGuardianId}]. When absent, a single
     default household covering every current member is computed on the fly
     and only persisted once the user actually edits household info or adds
     a second household — existing family records are never silently
     rewritten just by viewing this page.

   Known limitations (disclosed, not hidden):
   - Custody & legal notes are gated by role in the UI only — this is a
     100% static frontend demo with no server, so the underlying data is
     still present in the client bundle/store regardless of role. The same
     limitation already applies to S13's passcode reveal; real deployments
     need server-side authorisation to actually secure this.
   - "View all messages" is omitted — no messaging inbox/thread page exists
     in this app yet, so clicking a message reopens the same one-way
     composer addressed to the same recipients rather than a true thread.
   - "Statement" scrolls to the Account summary section below, since no
     separate printable family-statement route exists yet; the summary here
     already aggregates every child's billing, so it stands in as the
     family statement.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function initials(name) { const p = String(name || '').trim().split(/\s+/); return p[0] ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '?'; }
  function formatDate(iso) { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d.getTime())) return '—'; return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  function isPhoneLike(v) { return !!v && v.indexOf('@') === -1; }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function ageLabel(dob) {
    if (!dob) return '—';
    const d = new Date(dob + 'T00:00:00'); if (isNaN(d.getTime())) return '—';
    const now = new Date();
    let y = now.getFullYear() - d.getFullYear(), m = now.getMonth() - d.getMonth();
    if (now.getDate() < d.getDate()) m -= 1;
    if (m < 0) { y -= 1; m += 12; }
    return Math.max(y, 0) + 'y ' + m + 'm';
  }

  const ICON = {
    star: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    starOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>',
    call: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/></svg>',
    shieldOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  };
  const STATUS_CLASS = { 'Not invited': 'badge--neutral', 'Invited': 'badge--warning', 'Active': 'badge--success' };
  const COMM_OPTIONS = ['Parent app', 'Email', 'SMS', 'WhatsApp'];
  const RESTRICTED_ROLES = ['Director', 'Safeguarding lead'];

  let family = null;
  let role = null;
  let hasBilling = true;
  let hasCommunication = true;
  let editingGuardianId = null;
  let editingHouseholdId = null;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', (e) => { role = e.detail.role; renderCustody(); });

  function init() {
    window.PlayShell.login();
    role = window.PlayShell.getDemoRole();
    const params = new URLSearchParams(window.location.search);
    family = window.PlayStore.getById(params.get('id'));
    if (!family || family.type !== 'Family') { window.location.replace('404.html'); return; }

    hasBilling = isModuleUnlocked('billing');
    hasCommunication = isModuleUnlocked('communication');
    window.PlayShell.mount('families', family.name);
    $('pageContent').hidden = false;
    document.getElementById('appContent').appendChild($('pageContent'));

    $('famBreadcrumb').textContent = family.name;
    wireGuardianModal();
    wireHouseholdModal();
    renderAll();
  }

  function isModuleUnlocked(moduleId) {
    if (!window.PlayModules) return true;
    const mod = window.PlayModules.getById(moduleId);
    return !mod || window.PlayModules.isUnlocked(mod, window.PlayModules.getCurrentPlan());
  }
  function refetchFamily() { family = window.PlayStore.getById(family.id); }

  /* ---------- data helpers ---------- */
  function guardians() { return (family.guardianIds || []).map((id) => window.PlayStore.getById(id)).filter(Boolean); }
  function children() { return (family.childIds || []).map((id) => window.PlayStore.getById(id)).filter(Boolean); }
  function primaryGuardian() { return window.PlayStore.getById(family.primaryGuardianId) || guardians()[0] || null; }
  function contactOf(g) { return g ? (g.phone || (isPhoneLike(g.contact) ? g.contact : null)) : null; }
  function primaryContact() { return contactOf(primaryGuardian()); }
  function balance() {
    const names = new Set(children().map((c) => c.name));
    return window.PlayStore.getByType('Payment').filter((p) => names.has(p.childName) && p.status === 'Pending').reduce((s, p) => s + Number(p.amount || 0), 0);
  }
  function payments() {
    const names = new Set(children().map((c) => c.name));
    return window.PlayStore.getByType('Payment').filter((p) => names.has(p.childName)).sort((a, b) => b.date.localeCompare(a.date));
  }
  function households() {
    if (Array.isArray(family.households) && family.households.length) return family.households;
    return [{
      id: 'HH-A', label: 'A', address: '',
      guardianIds: (family.guardianIds || []).slice(), childIds: (family.childIds || []).slice(),
      invoiceGuardianId: family.primaryGuardianId, reportGuardianId: family.primaryGuardianId,
    }];
  }
  function saveHouseholds(list) { window.PlayStore.updateRecord(family.id, { households: list }); refetchFamily(); }
  function messagesForFamily() {
    const guardianIdSet = new Set(family.guardianIds || []);
    return window.PlayStore.getByType('Message')
      .filter((m) => (m.recipientGuardianIds || []).some((id) => guardianIdSet.has(id)))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }
  function canSeeCustody() { return RESTRICTED_ROLES.indexOf(role) !== -1; }
  function custodyNotes() {
    const notes = [];
    children().forEach((c) => (c.alerts || []).forEach((a) => { if (a.type === 'custody') notes.push({ child: c, detail: a.detail }); }));
    return notes;
  }

  function renderAll() {
    renderHeader();
    renderGuardians();
    renderHouseholds();
    renderChildren();
    renderCustody();
    renderMessages();
    renderAccountSummary();
  }

  /* ========================================================================
     HEADER
     ======================================================================== */
  function renderHeader() {
    const pg = primaryGuardian();
    const contact = primaryContact();
    const addresses = households().map((h) => h.address).filter(Boolean);
    $('famHeader').innerHTML = `
      <div class="profile-header">
        <div class="profile-header__photo">${escapeHtml(initials(family.name))}</div>
        <div class="profile-header__body">
          <div class="profile-header__name-row">
            <span class="profile-header__name">${escapeHtml(family.name)}</span>
            <span class="badge ${STATUS_CLASS[family.parentAppStatus] || 'badge--neutral'}">${escapeHtml(family.parentAppStatus)}</span>
          </div>
          <div class="profile-header__meta">
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Primary contact</span><span class="profile-header__meta-value">${pg ? escapeHtml(pg.name) : '—'}</span></div>
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Phone</span><span class="profile-header__meta-value">${contact ? escapeHtml(contact) : '—'}</span></div>
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Children</span><span class="profile-header__meta-value">${children().length}</span></div>
            <div class="profile-header__meta-item"><span class="profile-header__meta-label">Households</span><span class="profile-header__meta-value">${households().length}</span></div>
          </div>
          <div class="famp-address">${addresses.length ? escapeHtml(addresses.join(' · ')) : 'No household address on file'}</div>
        </div>
        <div class="profile-header__actions">
          <div class="famp-quick-actions">
            <button class="btn btn--secondary btn--sm" type="button" id="famMessageBtn" ${hasCommunication ? '' : 'disabled title="Messaging is part of a higher plan"'}>${ICON.message}<span>&nbsp;Message</span></button>
            <button class="btn btn--secondary btn--sm" type="button" id="famCallBtn" ${contact ? '' : 'disabled title="No phone number on file"'}>${ICON.call}<span>&nbsp;Call</span></button>
            <button class="btn btn--secondary btn--sm" type="button" id="famStatementBtn" ${hasBilling ? '' : 'disabled title="Billing is part of a higher plan"'}>${ICON.doc}<span>&nbsp;Statement</span></button>
          </div>
          <button class="btn btn--accent btn--sm" type="button" id="famInviteBtn" ${family.parentAppStatus === 'Active' ? 'hidden' : ''}>Invite to parent app</button>
        </div>
      </div>`;

    const msgBtn = $('famMessageBtn');
    if (hasCommunication) msgBtn.addEventListener('click', () => {
      const childIds = (family.childIds || []).join(',');
      if (!childIds) { window.PlayShell.toast('info', 'No children to message about', 'Add a child to this family first.'); return; }
      window.location.href = 'children.html?action=message&childIds=' + encodeURIComponent(childIds);
    });
    const callBtn = $('famCallBtn');
    if (contact) {
      callBtn.replaceWith(Object.assign(document.createElement('a'), { className: 'btn btn--secondary btn--sm', href: 'tel:' + contact.replace(/[^\d+]/g, ''), innerHTML: ICON.call + '<span>&nbsp;Call</span>' }));
    }
    const statementBtn = $('famStatementBtn');
    if (hasBilling) statementBtn.addEventListener('click', () => {
      const el = $('famAccountSummary');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('famp-highlight');
      window.setTimeout(() => el.classList.remove('famp-highlight'), 1400);
    });
    const inviteBtn = $('famInviteBtn');
    if (inviteBtn && !inviteBtn.hidden) inviteBtn.addEventListener('click', () => {
      inviteBtn.classList.add('is-loading'); inviteBtn.disabled = true;
      window.setTimeout(() => {
        window.PlayStore.updateRecord(family.id, { parentAppStatus: 'Invited', invitedAt: new Date().toISOString() });
        refetchFamily();
        window.PlayShell.toast('success', 'Invite sent', `${family.name} was invited to the parent app.`);
        renderHeader();
      }, 450);
    });
  }

  function emptyState(text) { return `<p class="profile-empty">${escapeHtml(text)}</p>`; }

  /* ========================================================================
     GUARDIANS
     ======================================================================== */
  function renderGuardians() {
    const section = $('famGuardiansSection');
    const rows = guardians().map((g) => guardianCardHtml(g)).join('');
    section.innerHTML = `
      <div class="famp-section__head">
        <span class="profile-card__title" id="famGuardiansHeading">Guardians</span>
        <button class="btn btn--secondary btn--sm" type="button" id="addGuardianBtn">${ICON.plus}<span>&nbsp;Add guardian</span></button>
      </div>
      <div class="famp-section__body">${rows || emptyState('No guardians on file.')}</div>`;
    $('addGuardianBtn').addEventListener('click', () => openGuardianModal(null));
    section.querySelectorAll('[data-star]').forEach((btn) => btn.addEventListener('click', () => setPrimaryContact(btn.dataset.star)));
    section.querySelectorAll('[data-edit-guardian]').forEach((btn) => btn.addEventListener('click', () => {
      const g = guardians().find((x) => x.id === btn.dataset.editGuardian);
      if (g) openGuardianModal(g);
    }));
  }
  function guardianCardHtml(g) {
    const isPrimary = g.id === family.primaryGuardianId;
    const prefs = g.commPreferences || ['Parent app'];
    const household = households().find((h) => (h.guardianIds || []).includes(g.id));
    return `
      <div class="famp-guardian-card${isPrimary ? ' is-primary' : ''}">
        <div class="famp-guardian-card__head">
          <span class="profile-person__avatar">${escapeHtml(initials(g.name))}</span>
          <span>
            <span class="famp-guardian-card__name">${escapeHtml(g.name)}</span>
            <div class="famp-guardian-card__sub">${escapeHtml(g.relation || 'Guardian')}${household ? ' · Household ' + escapeHtml(household.label) : ''}</div>
          </span>
          <span class="famp-guardian-card__actions">
            <button class="famp-star-btn${isPrimary ? ' is-active' : ''}" type="button" data-star="${g.id}" aria-pressed="${isPrimary}" aria-label="${isPrimary ? 'Primary contact' : 'Set as primary contact'}" title="${isPrimary ? 'Primary contact' : 'Set as primary contact'}">${isPrimary ? ICON.star : ICON.starOutline}</button>
            <button class="enroll-icon-btn" type="button" data-edit-guardian="${g.id}" aria-label="Edit ${escapeHtml(g.name)}">${ICON.pencil}</button>
          </span>
        </div>
        <div class="famp-guardian-card__details">
          <div><span class="famp-guardian-card__detail-label">Phone</span><span class="famp-guardian-card__detail-value">${escapeHtml(g.phone || (isPhoneLike(g.contact) ? g.contact : '—'))}</span></div>
          <div><span class="famp-guardian-card__detail-label">Email</span><span class="famp-guardian-card__detail-value">${escapeHtml(g.email || (!isPhoneLike(g.contact) ? g.contact : '') || '—')}</span></div>
          <div><span class="famp-guardian-card__detail-label">Preferred language</span><span class="famp-guardian-card__detail-value">${escapeHtml(g.preferredLanguage || 'English')}</span></div>
        </div>
        <div class="famp-comm-chips">${prefs.map((p) => `<span class="famp-comm-chip">${escapeHtml(p)}</span>`).join('')}</div>
      </div>`;
  }
  function setPrimaryContact(guardianId) {
    window.PlayStore.updateRecord(family.id, { primaryGuardianId: guardianId });
    refetchFamily();
    // keep S13 (each child's Family tab reads child.guardianId) in sync
    (family.childIds || []).forEach((cid) => window.PlayStore.updateRecord(cid, { guardianId: guardianId, guardianIds: family.guardianIds }));
    renderHeader(); renderGuardians();
    const g = window.PlayStore.getById(guardianId);
    window.PlayShell.toast('success', 'Primary contact updated', `${g ? g.name : 'Guardian'} is now the primary contact.`);
  }

  function wireGuardianModal() {
    const backdrop = $('guardianModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('guardianModalBackdrop'); });
    $('gmCancel').addEventListener('click', () => closeModal('guardianModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('guardianModalBackdrop'); });
    $('gmSave').addEventListener('click', () => {
      const name = $('gmName').value.trim();
      const phone = $('gmPhone').value.trim();
      const email = $('gmEmail').value.trim();
      let ok = true;
      if (!name) { setFieldError('gmName', 'Name is required.'); ok = false; } else setFieldError('gmName', null);
      if (!phone && !email) { setFieldError('gmContact', 'Add a phone number or email.'); ok = false; } else setFieldError('gmContact', null);
      if (!ok) return;
      submitWithLoading('gmSave', () => {
        const commPreferences = Array.from(document.querySelectorAll('#gmCommOptions input:checked')).map((cb) => cb.value);
        const fields = {
          name, relation: $('gmRelation').value, phone, email, contact: email || phone,
          preferredLanguage: $('gmLanguage').value, commPreferences,
        };
        let guardianId = editingGuardianId;
        if (guardianId) {
          window.PlayStore.updateRecord(guardianId, fields);
        } else {
          guardianId = uid('G');
          window.PlayStore.addRecord(Object.assign({ id: guardianId, type: 'Guardian', status: 'Active' }, fields));
          const list = (family.guardianIds || []).concat(guardianId);
          window.PlayStore.updateRecord(family.id, { guardianIds: list, primaryGuardianId: family.primaryGuardianId || guardianId });
          refetchFamily();
        }
        const householdId = $('gmHousehold').value;
        if (householdId) moveGuardianToHousehold(guardianId, householdId);
        if ($('gmPrimary').checked) {
          window.PlayStore.updateRecord(family.id, { primaryGuardianId: guardianId });
          refetchFamily();
          (family.childIds || []).forEach((cid) => window.PlayStore.updateRecord(cid, { guardianId, guardianIds: family.guardianIds }));
        }
        closeModal('guardianModalBackdrop');
        renderHeader(); renderGuardians(); renderHouseholds();
        window.PlayShell.toast('success', editingGuardianId ? 'Guardian updated' : 'Guardian added', `${name}'s details have been saved.`);
      });
    });
  }
  function moveGuardianToHousehold(guardianId, householdId) {
    const list = households().map((h) => Object.assign({}, h, { guardianIds: (h.guardianIds || []).filter((id) => id !== guardianId) }));
    const target = list.find((h) => h.id === householdId);
    if (target) target.guardianIds = target.guardianIds.concat(guardianId);
    saveHouseholds(list);
  }
  function openGuardianModal(guardian) {
    editingGuardianId = guardian ? guardian.id : null;
    $('guardianModalTitle').textContent = guardian ? 'Edit guardian' : 'Add guardian';
    $('gmName').value = guardian ? guardian.name : '';
    $('gmRelation').value = guardian ? (guardian.relation || 'Guardian') : 'Mother';
    $('gmPhone').value = guardian ? (guardian.phone || '') : '';
    $('gmEmail').value = guardian ? (guardian.email || (!isPhoneLike(guardian.contact) ? guardian.contact : '') || '') : '';
    $('gmLanguage').value = guardian ? (guardian.preferredLanguage || 'English') : 'English';
    const hh = households();
    $('gmHousehold').innerHTML = hh.map((h) => `<option value="${h.id}">Household ${escapeHtml(h.label)}</option>`).join('');
    $('gmHouseholdField').hidden = hh.length < 2;
    const currentHousehold = guardian ? hh.find((h) => (h.guardianIds || []).includes(guardian.id)) : hh[0];
    if (currentHousehold) $('gmHousehold').value = currentHousehold.id;
    const prefs = guardian ? (guardian.commPreferences || ['Parent app']) : ['Parent app'];
    $('gmCommOptions').innerHTML = COMM_OPTIONS.map((opt) => `<label><input type="checkbox" class="checkbox" value="${opt}" ${prefs.includes(opt) ? 'checked' : ''} /> ${opt}</label>`).join('');
    $('gmPrimary').checked = guardian ? guardian.id === family.primaryGuardianId : guardians().length === 0;
    setFieldError('gmName', null); setFieldError('gmContact', null);
    openModal('guardianModalBackdrop');
    $('gmName').focus();
  }

  /* ========================================================================
     HOUSEHOLDS
     ======================================================================== */
  function renderHouseholds() {
    const section = $('famHouseholdsSection');
    const hh = households();
    section.innerHTML = `
      <div class="famp-section__head">
        <span class="profile-card__title" id="famHouseholdsHeading">Households</span>
        ${hh.length < 2 ? `<button class="btn btn--secondary btn--sm" type="button" id="addHouseholdBtn">${ICON.plus}<span>&nbsp;Add second household</span></button>` : ''}
      </div>
      <div class="famp-section__body">${hh.map((h) => householdCardHtml(h)).join('')}</div>`;
    const addBtn = $('addHouseholdBtn');
    if (addBtn) addBtn.addEventListener('click', addSecondHousehold);
    section.querySelectorAll('[data-edit-household]').forEach((btn) => btn.addEventListener('click', () => openHouseholdModal(btn.dataset.editHousehold)));
  }
  function householdCardHtml(h) {
    const hGuardians = (h.guardianIds || []).map((id) => window.PlayStore.getById(id)).filter(Boolean);
    const hChildren = (h.childIds || []).map((id) => window.PlayStore.getById(id)).filter(Boolean);
    const invoiceG = window.PlayStore.getById(h.invoiceGuardianId);
    const reportG = window.PlayStore.getById(h.reportGuardianId);
    return `
      <div class="famp-household-card">
        <div class="famp-household-card__head">
          <span><span class="famp-household-card__label">Household ${escapeHtml(h.label)}</span><div class="famp-household-card__address">${escapeHtml(h.address || 'No address on file')}</div></span>
          <button class="enroll-icon-btn" type="button" data-edit-household="${h.id}" style="margin-left:auto;" aria-label="Edit household ${escapeHtml(h.label)}">${ICON.pencil}</button>
        </div>
        <div class="famp-household-row"><span class="famp-household-row__label">Guardians</span><span class="famp-household-row__value">${hGuardians.map((g) => escapeHtml(g.name)).join(', ') || '—'}</span></div>
        <div class="famp-household-row"><span class="famp-household-row__label">Children</span><span class="famp-household-row__value">${hChildren.map((c) => escapeHtml(c.name)).join(', ') || '—'}</span></div>
        <div class="famp-household-row"><span class="famp-household-row__label">Invoice recipient</span><span class="famp-household-row__value">${invoiceG ? escapeHtml(invoiceG.name) : '—'}</span></div>
        <div class="famp-household-row"><span class="famp-household-row__label">Report recipient</span><span class="famp-household-row__value">${reportG ? escapeHtml(reportG.name) : '—'}</span></div>
      </div>`;
  }
  function addSecondHousehold() {
    const list = households();
    list.push({ id: uid('HH'), label: 'B', address: '', guardianIds: [], childIds: [], invoiceGuardianId: null, reportGuardianId: null });
    saveHouseholds(list);
    renderHouseholds(); renderGuardians();
    window.PlayShell.toast('success', 'Household added', 'Move guardians and children into Household B from the Edit guardian dialog.');
  }
  function wireHouseholdModal() {
    const backdrop = $('householdModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('householdModalBackdrop'); });
    $('hmCancel').addEventListener('click', () => closeModal('householdModalBackdrop'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('householdModalBackdrop'); });
    $('hmSave').addEventListener('click', () => {
      submitWithLoading('hmSave', () => {
        const list = households().map((h) => h.id === editingHouseholdId
          ? Object.assign({}, h, { address: $('hmAddress').value.trim(), invoiceGuardianId: $('hmInvoice').value || null, reportGuardianId: $('hmReport').value || null })
          : h);
        saveHouseholds(list);
        closeModal('householdModalBackdrop');
        renderHouseholds(); renderHeader();
        window.PlayShell.toast('success', 'Household updated', 'Household details have been saved.');
      });
    });
  }
  function openHouseholdModal(householdId) {
    editingHouseholdId = householdId;
    const h = households().find((x) => x.id === householdId);
    if (!h) return;
    $('householdModalTitle').textContent = 'Edit household ' + h.label;
    $('hmAddress').value = h.address || '';
    const hGuardians = (h.guardianIds || []).map((id) => window.PlayStore.getById(id)).filter(Boolean);
    const options = '<option value="">None</option>' + hGuardians.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
    $('hmInvoice').innerHTML = options; $('hmInvoice').value = h.invoiceGuardianId || '';
    $('hmReport').innerHTML = options; $('hmReport').value = h.reportGuardianId || '';
    openModal('householdModalBackdrop');
  }

  /* ========================================================================
     CHILDREN
     ======================================================================== */
  function renderChildren() {
    const section = $('famChildrenSection');
    const cards = children().map((c) => `
      <a class="famp-child-card" href="record.html?id=${encodeURIComponent(c.id)}">
        <div class="famp-child-card__photo">${escapeHtml(initials(c.name))}</div>
        <div class="famp-child-card__name">${escapeHtml(c.name)}${c.preferredName ? ' "' + escapeHtml(c.preferredName) + '"' : ''}</div>
        <div class="famp-child-card__meta">${escapeHtml(ageLabel(c.dob))} · ${escapeHtml(c.room || 'No class')}</div>
        <div class="famp-child-card__meta">${escapeHtml(c.status || '')}</div>
      </a>`).join('');
    section.innerHTML = `
      <div class="famp-section__head"><span class="profile-card__title" id="famChildrenHeading">Children</span></div>
      <div class="famp-section__body"><div class="famp-child-grid">${cards || emptyState('No children linked to this family yet.')}</div></div>`;
  }

  /* ========================================================================
     CUSTODY & LEGAL NOTES — restricted
     ======================================================================== */
  function renderCustody() {
    const section = $('famCustodySection');
    if (!canSeeCustody()) { section.hidden = true; section.innerHTML = ''; return; }
    const notes = custodyNotes();
    section.hidden = false;
    section.innerHTML = `
      <div class="famp-section__head"><span class="profile-card__title" id="famCustodyHeading">Custody &amp; legal notes</span></div>
      <div class="famp-custody-banner">${ICON.shieldOff} Restricted — visible to Director and Safeguarding lead</div>
      <div class="famp-section__body">
        ${notes.length ? notes.map((n) => `<div class="famp-custody-note"><div class="famp-custody-note__child">${escapeHtml(n.child.name)}</div>${escapeHtml(n.detail)}</div>`).join('') : emptyState('No custody or legal restrictions on file for this family.')}
      </div>`;
  }

  /* ========================================================================
     MESSAGES
     ======================================================================== */
  function renderMessages() {
    const section = $('famMessagesSection');
    const msgs = messagesForFamily();
    section.innerHTML = `
      <div class="famp-section__head"><span class="profile-card__title" id="famMessagesHeading">Messages</span></div>
      <div class="famp-section__body">
        ${msgs.length ? msgs.map((m) => messageRowHtml(m)).join('') : `${emptyState('No messages with this family yet.')}${hasCommunication ? `<button class="btn btn--secondary btn--sm" type="button" id="famStartMessageBtn" style="margin-top:var(--space-2);">Start a conversation</button>` : ''}`}
      </div>`;
    section.querySelectorAll('[data-reopen-message]').forEach((row) => row.addEventListener('click', () => {
      const childIds = (family.childIds || []).join(',');
      if (childIds) window.location.href = 'children.html?action=message&childIds=' + encodeURIComponent(childIds);
    }));
    const startBtn = $('famStartMessageBtn');
    if (startBtn) startBtn.addEventListener('click', () => $('famMessageBtn').click());
  }
  function messageRowHtml(m) {
    const recipients = (m.recipientGuardianIds || []).map((id) => window.PlayStore.getById(id)).filter(Boolean);
    return `
      <div class="famp-message-row" data-reopen-message>
        <span class="profile-person__avatar">${escapeHtml(initials(recipients[0] ? recipients[0].name : family.name))}</span>
        <span class="famp-message-row__body">
          <div class="famp-message-row__subject">${escapeHtml(m.subject)}</div>
          <div class="famp-message-row__preview">${escapeHtml(recipients.map((g) => g.name).join(', '))} — ${escapeHtml(m.body)}</div>
        </span>
        <span class="famp-message-row__meta">${formatDate(m.date)}</span>
      </div>`;
  }

  /* ========================================================================
     ACCOUNT SUMMARY
     ======================================================================== */
  function renderAccountSummary() {
    const section = $('famAccountSummary');
    if (!hasBilling) {
      section.innerHTML = `<div class="famp-section__head"><span class="profile-card__title" id="famAccountHeading">Account summary</span></div><div class="famp-section__body">${emptyState('Billing is not available on the current plan.')}</div>`;
      return;
    }
    const pays = payments();
    const last = pays[0];
    const bal = balance();
    section.innerHTML = `
      <div class="famp-section__head"><span class="profile-card__title" id="famAccountHeading">Account summary</span></div>
      <div class="famp-section__body">
        ${pays.length ? `
          <div class="famp-balance-figure${bal > 0 ? ' famp-balance-figure--due' : ' famp-balance-figure--settled'}">${bal > 0 ? '$' + bal.toFixed(2) + ' due' : 'Settled'}</div>
          <div class="profile-row"><span class="profile-row__label">Last payment</span><span class="profile-row__value">${last ? '$' + Number(last.amount).toFixed(2) + ' · ' + formatDate(last.date) : '—'}</span></div>
          <div class="profile-row"><span class="profile-row__label">Status</span><span class="profile-row__value">${last ? escapeHtml(last.status) : '—'}</span></div>
        ` : emptyState('No billing records for this family.')}
      </div>`;
  }

  /* ========================================================================
     SHARED MODAL PLUMBING
     ======================================================================== */
  function openModal(id) { const b = $(id); b.classList.add('is-open'); b.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const b = $(id); b.classList.remove('is-open'); b.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  function setFieldError(inputId, message) {
    const input = $(inputId); const err = $('err-' + inputId);
    if (!err) return;
    if (message) { err.textContent = message; err.hidden = false; if (input) input.closest('.field').classList.add('is-error'); }
    else { err.hidden = true; if (input) input.closest('.field').classList.remove('is-error'); }
  }
  function submitWithLoading(btnId, work) {
    const btn = $(btnId);
    if (btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading'); btn.disabled = true;
    window.setTimeout(() => { work(); btn.classList.remove('is-loading'); btn.disabled = false; }, 400);
  }
})();
