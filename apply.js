/* ==========================================================================
   PLAY SCHOOL — Public Application Form (S06 submission endpoint)
   Standalone public page (no app shell/login, like index.html/signin.html)
   — a parent reaches this via the link application-builder.js generates.
   Submitting creates a real 'Enquiry' record with source 'Website form',
   using the exact same PlayStore API every other admissions page uses.

   Honest limitation: this is a static, frontend-only project with one
   shared localStorage per browser. A submission here only reaches the
   admin's Admissions Pipeline if it's the SAME browser profile — there is
   no backend to relay it across devices. That's a real constraint of this
   demo, not a bug, and is not hidden from the user building the form (see
   the publish-confirmation copy in application-builder.js).
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }

  const ICON_FILE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/><polyline points="9 12 11 14 15 10"/></svg>';

  let answers = {};
  let submitting = false;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const params = new URLSearchParams(window.location.search);
    const slugOrId = params.get('form');
    const form = findForm(slugOrId);
    if (!form) {
      $('pfRoot').innerHTML = `<div class="state-panel"><div class="state-panel__title">Form not found</div><p class="state-panel__text">This application link may have been removed or isn't published yet.</p></div>`;
      return;
    }
    if (form.status !== 'Live') {
      $('pfRoot').innerHTML = `<div class="state-panel"><div class="state-panel__title">This form isn't accepting applications yet</div><p class="state-panel__text">Please check back later or contact the school directly.</p></div>`;
      return;
    }
    render(form);
  }
  function findForm(slugOrId) {
    if (!slugOrId) return null;
    const all = window.PlayStore.getByType('ApplicationForm');
    return all.find((f) => f.publicSlug === slugOrId) || all.find((f) => f.id === slugOrId) || null;
  }

  function render(form) {
    $('pfRoot').innerHTML = formHtml(form);
    wireForm(form);
  }
  function formHtml(form) {
    return `
      <form id="pfForm" novalidate>
        <h1 style="font-family:var(--font-display); font-weight:600; font-size:var(--fs-h2); margin-bottom:var(--space-2);">${escapeHtml(form.title)}</h1>
        <p class="card__text" style="color:var(--color-text-muted); margin-bottom:var(--space-5);">Fields marked with * are required.</p>
        ${(form.sections || []).map((sec) => `
          <div class="pf-section-title">${escapeHtml(sec.title)}</div>
          ${sec.fields.map((f) => fieldHtml(f)).join('')}
        `).join('')}
        <button type="submit" class="btn btn--accent" style="width:100%; margin-top: var(--space-5);" id="pfSubmitBtn"><span class="btn__spinner" aria-hidden="true"></span><span>Submit application</span></button>
      </form>`;
  }
  function fieldHtml(f) {
    const req = f.required ? ' <span class="req">*</span>' : '';
    const err = `<div class="pf-error" id="pferr-${f.id}" hidden></div>`;
    let control = '';
    if (f.type === 'short' || f.type === 'email' || f.type === 'phone') {
      control = `<input class="input" type="${f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}" data-pf-field="${f.id}" placeholder="${escapeHtml(f.placeholder || '')}" />`;
    } else if (f.type === 'long') {
      control = `<textarea class="textarea" data-pf-field="${f.id}" placeholder="${escapeHtml(f.placeholder || '')}"></textarea>`;
    } else if (f.type === 'date') {
      control = `<input class="input" type="date" data-pf-field="${f.id}" />`;
    } else if (f.type === 'dropdown') {
      control = `<select class="select" data-pf-field="${f.id}"><option value="">Choose…</option>${(f.options || []).map((o) => `<option value="${escapeHtml(o.label)}">${escapeHtml(o.label)}</option>`).join('')}</select>`;
    } else if (f.type === 'multiselect') {
      control = (f.options || []).map((o) => `<div class="pf-checkbox-option"><input type="checkbox" class="checkbox" data-pf-multi="${f.id}" value="${escapeHtml(o.label)}" /><label>${escapeHtml(o.label)}</label></div>`).join('');
    } else if (f.type === 'checkbox') {
      return `<div class="pf-field"><div class="pf-checkbox-option"><input type="checkbox" class="checkbox" data-pf-field="${f.id}" data-pf-bool="1" /><label>${escapeHtml(f.label)}</label></div>${f.helpText ? `<div class="pf-help">${escapeHtml(f.helpText)}</div>` : ''}${err}</div>`;
    } else if (f.type === 'consent') {
      return `<div class="pf-field"><div class="pf-consent"><input type="checkbox" class="checkbox" data-pf-field="${f.id}" data-pf-bool="1" /><span class="pf-consent__text">${escapeHtml(f.label)}${req}</span></div>${err}</div>`;
    } else if (f.type === 'file') {
      control = `<div class="pf-file-drop" data-pf-file="${f.id}">${ICON_FILE}<div>Click to choose a file</div><span class="pf-file-drop__hint">${escapeHtml(f.fileTypes || '')} · up to ${f.maxSizeMB || 5}MB</span></div>`;
    } else if (f.type === 'signature') {
      control = `<div class="pf-signature-pad" data-pf-signature="${f.id}">Click to sign</div>`;
    }
    return `<div class="pf-field"><label class="pf-label">${escapeHtml(f.label)}${req}</label>${control}${f.helpText ? `<div class="pf-help">${escapeHtml(f.helpText)}</div>` : ''}${err}</div>`;
  }
  function wireForm(form) {
    const root = $('pfRoot');
    root.querySelectorAll('[data-pf-field]').forEach((el) => {
      const evt = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(evt, () => { answers[el.dataset.pfField] = el.dataset.pfBool ? el.checked : el.value; });
    });
    root.querySelectorAll('[data-pf-multi]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const key = cb.dataset.pfMulti;
        const list = Array.isArray(answers[key]) ? answers[key].slice() : [];
        const idx = list.indexOf(cb.value);
        if (cb.checked && idx === -1) list.push(cb.value);
        if (!cb.checked && idx !== -1) list.splice(idx, 1);
        answers[key] = list;
      });
    });
    root.querySelectorAll('[data-pf-file]').forEach((box) => {
      box.addEventListener('click', () => {
        answers[box.dataset.pfFile] = 'document.pdf';
        box.classList.add('has-file');
        box.querySelector('div').textContent = 'document.pdf';
      });
    });
    root.querySelectorAll('[data-pf-signature]').forEach((pad) => {
      pad.addEventListener('click', () => {
        answers[pad.dataset.pfSignature] = 'Signed';
        pad.classList.add('is-signed');
        pad.textContent = 'Signed ✓';
      });
    });
    $('pfForm').addEventListener('submit', (e) => { e.preventDefault(); submit(form); });
  }
  function validate(form) {
    const errors = {};
    form.sections.forEach((sec) => sec.fields.forEach((f) => {
      const v = answers[f.id];
      if (f.required) {
        const empty = f.type === 'multiselect' ? !(Array.isArray(v) && v.length) : (f.type === 'checkbox' || f.type === 'consent' || f.type === 'signature' || f.type === 'file') ? !v : !v || !String(v).trim();
        if (empty) { errors[f.id] = 'This field is required.'; return; }
      }
      if (v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[f.id] = 'Enter a valid email address.';
      if (v && f.type === 'phone' && String(v).replace(/\D+/g, '').length < 7) errors[f.id] = 'Enter a valid phone number.';
      if (v && f.type === 'date' && isNaN(new Date(v).getTime())) errors[f.id] = 'Enter a valid date.';
    }));
    return errors;
  }
  function showErrors(errors) {
    document.querySelectorAll('.pf-error').forEach((el) => { el.hidden = true; el.textContent = ''; });
    Object.keys(errors).forEach((fieldId) => {
      const el = $('pferr-' + fieldId);
      if (el) { el.hidden = false; el.textContent = errors[fieldId]; }
    });
  }
  function submit(form) {
    if (submitting) return;
    const errors = validate(form);
    if (Object.keys(errors).length) { showErrors(errors); return; }
    submitting = true;
    const btn = $('pfSubmitBtn'); btn.classList.add('is-loading'); btn.disabled = true;

    window.setTimeout(() => {
      const mapped = {};
      form.sections.forEach((sec) => sec.fields.forEach((f) => {
        if (f.profileMapping && f.profileMapping !== 'none') mapped[f.profileMapping] = answers[f.id];
      }));
      const nowIso = new Date().toISOString();
      const childName = mapped.childName || 'Unnamed applicant';
      const enquiry = {
        id: uid('ENQ'), type: 'Enquiry',
        childName, dob: mapped.childDob || null,
        parentName: mapped.parentName || 'Not provided',
        phone: mapped.parentPhone || '', email: mapped.parentEmail || '',
        program: mapped.program || null, preferredStart: null,
        source: 'Website form',
        ownerId: null, ownerName: null,
        stage: 'Enquiry', createdAt: nowIso, stageEnteredAt: nowIso,
        nextFollowUp: null, notes: mapped.notes || '',
        lostReason: null, lostNote: null, convertedChildId: null,
        history: [{ from: null, to: 'Enquiry', at: nowIso, actor: 'Website form' }],
        activities: [{ id: uid('ACT'), type: 'note', title: 'Submitted via online application form', detail: `Form: ${form.title}`, at: nowIso, actor: 'Website form' }],
        sourceFormId: form.id, sourceFormSubmission: answers,
      };
      window.PlayStore.addRecord(enquiry);
      if (window.PlayShell && window.PlayShell.addNotification) {
        window.PlayShell.addNotification({
          title: 'New application submitted', text: `${childName} applied via "${form.title}".`,
          forRole: 'Admin', module: 'admissions', mention: true, recordRoute: 'applicant-profile.html?id=' + enquiry.id,
        });
      }
      submitting = false;
      $('pfRoot').innerHTML = `<div class="pf-success"><div class="pf-success__icon">${ICON_CHECK}</div><h2 style="font-family:var(--font-display); font-weight:600; font-size:var(--fs-h3);">Application received</h2><p class="card__text" style="margin-top:var(--space-2);">Thank you for applying to Play School — our admissions team will be in touch soon.</p></div>`;
    }, 450);
  }
})();
