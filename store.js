/* ==========================================================================
   PLAY SCHOOL — shared data store
   Minimal in-memory dataset + search used across app pages (dashboard,
   record pages, 404 global search). No backend — static demo data only.
   ========================================================================== */
(function () {
  'use strict';

  const records = [
    {
      id: 'C-1001', type: 'Child', name: 'Amara Osei', room: 'Sunflower Room', status: 'Active', guardianId: 'G-2001',
      dob: '2023-06-10', startDate: '2025-09-02',
      alerts: [{ type: 'allergy', detail: 'Severe peanut allergy — EpiPen in office' }],
    },
    {
      id: 'C-1002', type: 'Child', name: 'Rhea Kapoor', room: 'Marigold Room', status: 'Active', guardianId: 'G-2002',
      dob: '2024-02-10', startDate: '2026-02-10',
      alerts: [{ type: 'dietary', detail: 'Vegetarian diet only — no meat or fish' }],
    },
    {
      id: 'C-1003', type: 'Child', name: 'Leo Fernandes', room: 'Daisy Room', status: 'Starting soon', guardianId: 'G-2003',
      dob: '2024-12-10', startDate: '2026-11-03',
      alerts: [],
    },
    {
      id: 'C-1004', type: 'Child', name: 'Noor Haddad', room: 'Sunflower Room', status: 'Withdrawn', guardianId: 'G-2004',
      dob: '2022-08-15', startDate: '2024-09-01', withdrawnDate: '2026-01-14', withdrawnReason: 'Family relocated out of the district.',
      alerts: [{ type: 'medical', detail: 'Asthma — rescue inhaler kept in classroom cabinet' }],
    },
    {
      id: 'C-1005', type: 'Child', name: 'Ananya Raj', room: 'Marigold Room', status: 'Active', guardianId: 'G-2005',
      dob: '2022-11-10', startDate: '2025-01-13',
      alerts: [{ type: 'custody', detail: 'Only Aanya Kumar and the listed grandparents may collect Ananya — see custody order on file' }],
    },
    {
      id: 'C-1006', type: 'Child', name: 'Kabir Siddiqui', room: 'Daisy Room', status: 'Graduated', guardianId: 'G-2006',
      dob: '2020-09-02', startDate: '2022-09-01',
      alerts: [],
    },

    { id: 'G-2001', type: 'Guardian', name: 'Folasade Osei', relation: 'Parent of Amara Osei', status: 'Active', contact: 'folasade.osei@example.com' },
    { id: 'G-2002', type: 'Guardian', name: 'Nikhil Kapoor', relation: 'Parent of Rhea Kapoor', status: 'Active', contact: 'nikhil.kapoor@example.com' },
    { id: 'G-2003', type: 'Guardian', name: 'Priya Fernandes', relation: 'Parent of Leo Fernandes', status: 'Active', contact: 'priya.fernandes@example.com' },
    { id: 'G-2004', type: 'Guardian', name: 'Sara Haddad', relation: 'Parent of Noor Haddad', status: 'Active', contact: 'sara.haddad@example.com' },
    { id: 'G-2005', type: 'Guardian', name: 'Aanya Kumar', relation: 'Parent of Ananya Raj', status: 'Active', contact: 'aanya.kumar@example.com' },
    { id: 'G-2006', type: 'Guardian', name: 'Imran Siddiqui', relation: 'Parent of Kabir Siddiqui', status: 'Active', contact: 'imran.siddiqui@example.com' },

    { id: 'S-3001', type: 'Staff', name: 'Nithya', relation: 'Admin', status: 'Active' },
    { id: 'S-3002', type: 'Staff', name: 'Rhea Kapoor', relation: 'Teacher · Marigold Room', status: 'Active' },

    { id: 'CLS-9001', type: 'Class', name: 'Sunflower Room', ageGroup: 'Toddler · 18mo–3y', teacherName: 'Nithya', status: 'Active' },
    { id: 'CLS-9002', type: 'Class', name: 'Marigold Room', ageGroup: 'Primary · 3–6y', teacherName: 'Rhea Kapoor', status: 'Active' },
    { id: 'CLS-9003', type: 'Class', name: 'Daisy Room', ageGroup: 'Lower Elementary · 6–9y', teacherName: 'Nithya', status: 'Active' },
  ];

  /* ---------- persisted additions (classes, staff, etc. added post-seed) ----------
     The static `records` above is the seed dataset. Anything added at runtime
     (e.g. by the onboarding wizard) is appended to the same live array so every
     existing consumer (search, dashboard, record pages) sees it immediately,
     and mirrored to localStorage so it survives a refresh. */
  const EXTRA_RECORDS_KEY = 'ps_extra_records';
  function loadExtraRecords() {
    try { return JSON.parse(localStorage.getItem(EXTRA_RECORDS_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveExtraRecords(list) {
    try { localStorage.setItem(EXTRA_RECORDS_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
  }
  records.push(...loadExtraRecords());

  /* ---------- persisted edits to existing records (status changes, moves, withdrawals, …) ----------
     Keyed by record id so a seed record (not in the extras array above) can still
     be edited in place and survive a refresh, without duplicating it. */
  const RECORD_OVERRIDES_KEY = 'ps_record_overrides';
  function loadOverrides() {
    try { return JSON.parse(localStorage.getItem(RECORD_OVERRIDES_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveOverrides(map) {
    try { localStorage.setItem(RECORD_OVERRIDES_KEY, JSON.stringify(map)); } catch (e) { /* storage unavailable */ }
  }
  (function applyOverrides() {
    const overrides = loadOverrides();
    records.forEach((r) => { if (overrides[r.id]) Object.assign(r, overrides[r.id]); });
  })();

  function addRecord(record) {
    records.push(record);
    const extras = loadExtraRecords();
    extras.push(record);
    saveExtraRecords(extras);
    return record;
  }
  function updateRecord(id, patch) {
    const record = records.find((r) => normalize(r.id) === normalize(id));
    if (!record) return null;
    Object.assign(record, patch);
    const overrides = loadOverrides();
    overrides[id] = Object.assign({}, overrides[id], patch);
    saveOverrides(overrides);
    return record;
  }
  function removeRecord(id) {
    const idx = records.findIndex((r) => normalize(r.id) === normalize(id));
    if (idx !== -1) records.splice(idx, 1);
    saveExtraRecords(loadExtraRecords().filter((r) => normalize(r.id) !== normalize(id)));
  }
  function getByType(type) {
    return records.filter((r) => r.type === type);
  }

  /* ---------- app settings (school profile, admin profile, academic year, preferences) ----------
     Single settings object — the de facto "S58 Settings" store for this demo,
     since no dedicated settings page/backend exists yet. */
  const SETTINGS_KEY = 'ps_app_settings';
  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveSettings(partial) {
    const next = Object.assign({}, getSettings(), partial);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch (e) { /* storage unavailable */ }
    return next;
  }

  function normalize(str) {
    return String(str || '').toLowerCase();
  }

  function secondaryLine(record) {
    if (record.type === 'Child') return `${record.room} · ${record.status}`;
    if (record.type === 'Class') return [record.ageGroup, record.teacherName].filter(Boolean).join(' · ');
    if (record.type === 'Guardian') return record.relation;
    return record.relation;
  }

  function search(query) {
    const q = normalize(query).trim();
    if (!q) return [];
    return records.filter((r) => {
      const haystack = normalize([r.id, r.name, r.type, r.room, r.relation, r.status].filter(Boolean).join(' '));
      return haystack.includes(q);
    });
  }

  function getById(id) {
    return records.find((r) => normalize(r.id) === normalize(id)) || null;
  }

  window.PlayStore = {
    records,
    search,
    getById,
    secondaryLine,
    addRecord,
    updateRecord,
    removeRecord,
    getByType,
    getSettings,
    saveSettings,
  };
})();
