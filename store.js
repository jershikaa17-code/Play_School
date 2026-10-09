/* ==========================================================================
   PLAY SCHOOL — shared data store
   Minimal in-memory dataset + search used across app pages (dashboard,
   record pages, 404 global search). No backend — static demo data only.
   ========================================================================== */
(function () {
  'use strict';

  const records = [
    { id: 'C-1001', type: 'Child', name: 'Amara Osei', room: 'Sunflower Room', status: 'Active', guardianId: 'G-2001' },
    { id: 'C-1002', type: 'Child', name: 'Rhea Kapoor', room: 'Marigold Room', status: 'Active', guardianId: 'G-2002' },
    { id: 'C-1003', type: 'Child', name: 'Leo Fernandes', room: 'Daisy Room', status: 'Waitlisted', guardianId: 'G-2003' },
    { id: 'C-1004', type: 'Child', name: 'Noor Haddad', room: 'Sunflower Room', status: 'Inactive', guardianId: 'G-2004' },
    { id: 'C-1005', type: 'Child', name: 'Ananya Raj', room: 'Marigold Room', status: 'Active', guardianId: 'G-2005' },

    { id: 'G-2001', type: 'Guardian', name: 'Folasade Osei', relation: 'Parent of Amara Osei', status: 'Active' },
    { id: 'G-2002', type: 'Guardian', name: 'Nikhil Kapoor', relation: 'Parent of Rhea Kapoor', status: 'Active' },
    { id: 'G-2003', type: 'Guardian', name: 'Priya Fernandes', relation: 'Parent of Leo Fernandes', status: 'Active' },
    { id: 'G-2004', type: 'Guardian', name: 'Sara Haddad', relation: 'Parent of Noor Haddad', status: 'Active' },
    { id: 'G-2005', type: 'Guardian', name: 'Aanya Kumar', relation: 'Parent of Ananya Raj', status: 'Active' },

    { id: 'S-3001', type: 'Staff', name: 'Nithya', relation: 'Admin', status: 'Active' },
    { id: 'S-3002', type: 'Staff', name: 'Rhea Kapoor', relation: 'Teacher · Marigold Room', status: 'Active' },
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

  function addRecord(record) {
    records.push(record);
    const extras = loadExtraRecords();
    extras.push(record);
    saveExtraRecords(extras);
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
    removeRecord,
    getByType,
    getSettings,
    saveSettings,
  };
})();
