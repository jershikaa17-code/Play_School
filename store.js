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
      alerts: [{ type: 'allergy', detail: 'Severe peanut allergy — EpiPen in office', allergen: 'peanuts' }],
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

    /* ---------- weekly menu template ----------
       One record per weekday (0=Sunday … 6=Saturday), each item tagged with
       the allergens it contains so the Daily Care Log can cross-check them
       against a child's recorded allergies. Resolved for a given date via
       PlayStore.getMenuForDate() below — not a per-date record, so it never
       goes stale. */
    {
      id: 'MENU-1', type: 'MenuTemplate', dayOfWeek: 1,
      meals: {
        Breakfast: [{ name: 'Oatmeal with banana', allergens: [] }, { name: 'Milk', allergens: ['dairy'] }],
        Snack: [{ name: 'Apple slices with peanut butter', allergens: ['peanuts'] }],
        Lunch: [{ name: 'Grilled cheese sandwich', allergens: ['dairy', 'gluten'] }, { name: 'Tomato soup', allergens: [] }, { name: 'Orange wedges', allergens: [] }],
      },
    },
    {
      id: 'MENU-2', type: 'MenuTemplate', dayOfWeek: 2,
      meals: {
        Breakfast: [{ name: 'Scrambled eggs', allergens: ['eggs'] }, { name: 'Toast', allergens: ['gluten'] }],
        Snack: [{ name: 'Yogurt with berries', allergens: ['dairy'] }],
        Lunch: [{ name: 'Chicken pasta', allergens: ['gluten'] }, { name: 'Garden salad', allergens: [] }, { name: 'Watermelon', allergens: [] }],
      },
    },
    {
      id: 'MENU-3', type: 'MenuTemplate', dayOfWeek: 3,
      meals: {
        Breakfast: [{ name: 'Pancakes', allergens: ['gluten', 'eggs', 'dairy'] }],
        Snack: [{ name: 'Hummus with carrot sticks', allergens: [] }],
        Lunch: [{ name: 'Veggie wrap', allergens: ['gluten'] }, { name: 'Lentil soup', allergens: [] }, { name: 'Banana', allergens: [] }],
      },
    },
    {
      id: 'MENU-4', type: 'MenuTemplate', dayOfWeek: 4,
      meals: {
        Breakfast: [{ name: 'Cereal with milk', allergens: ['gluten', 'dairy'] }],
        Snack: [{ name: 'Peanut butter crackers', allergens: ['peanuts', 'gluten'] }],
        Lunch: [{ name: 'Fish fingers', allergens: ['fish', 'gluten'] }, { name: 'Mixed vegetables', allergens: [] }, { name: 'Pear slices', allergens: [] }],
      },
    },
    {
      id: 'MENU-5', type: 'MenuTemplate', dayOfWeek: 5,
      meals: {
        Breakfast: [{ name: 'Fruit yogurt parfait', allergens: ['dairy'] }],
        Snack: [{ name: 'Cheese cubes', allergens: ['dairy'] }],
        Lunch: [{ name: 'Rice and dal', allergens: [] }, { name: 'Cucumber salad', allergens: [] }, { name: 'Apple', allergens: [] }],
      },
    },

    /* ---------- calendar events ----------
       `recurrence.freq` is 'none' | 'weekly' | 'monthly'; occurrences are computed
       on the fly from this one master record (see calendar.js expandEvent()) —
       `exceptions` holds per-occurrence overrides/cancellations keyed by the
       original occurrence date, so editing/deleting a single instance never
       duplicates or rewrites the whole series. */
    {
      id: 'EVT-9001', type: 'Event', seriesId: 'EVT-9001', title: 'Weekly staff meeting', eventType: 'meeting',
      allDay: false, startDate: '2026-10-05', startTime: '08:00', endDate: '2026-10-05', endTime: '08:45',
      recurrence: { freq: 'weekly', until: null }, exceptions: {},
      location: 'Staff room', classIds: [], staffIds: ['S-3001', 'S-3002'],
      requiresRSVP: false, requiresConsent: false, attachmentName: null,
      description: 'Weekly check-in on room ratios, incidents and upcoming events.',
      rsvps: {}, consents: {},
    },
    {
      id: 'EVT-9002', type: 'Event', seriesId: 'EVT-9002', title: 'Parent-teacher conferences', eventType: 'conference',
      allDay: false, startDate: '2026-10-15', startTime: '15:00', endDate: '2026-10-15', endTime: '18:00',
      recurrence: { freq: 'monthly', until: null }, exceptions: {},
      location: 'Classrooms', classIds: [], staffIds: [],
      requiresRSVP: true, requiresConsent: false, attachmentName: null,
      description: 'Individual 15-minute slots — sign up at the front desk.',
      rsvps: { 'G-2001': 'yes', 'G-2002': 'no' }, consents: {},
    },
    {
      id: 'EVT-9003', type: 'Event', seriesId: 'EVT-9003', title: 'Daisy Room farm visit', eventType: 'trip',
      allDay: false, startDate: '2026-10-22', startTime: '09:30', endDate: '2026-10-22', endTime: '13:00',
      recurrence: { freq: 'none', until: null }, exceptions: {},
      location: 'Greenfield Farm', classIds: ['CLS-9003'], staffIds: ['S-3001'],
      requiresRSVP: true, requiresConsent: true, attachmentName: 'farm-visit-itinerary.pdf',
      description: 'A morning visit to see farm animals and the harvest. Please dress for the weather.',
      rsvps: { 'G-2006': 'yes' }, consents: { 'C-1006': true },
    },
    {
      id: 'EVT-9004', type: 'Event', seriesId: 'EVT-9004', title: 'Autumn holiday', eventType: 'holiday',
      allDay: true, startDate: '2026-11-02', startTime: null, endDate: '2026-11-06', endTime: null,
      recurrence: { freq: 'none', until: null }, exceptions: {},
      location: '', classIds: [], staffIds: [],
      requiresRSVP: false, requiresConsent: false, attachmentName: null,
      description: 'School closed for the autumn half-term break.',
      rsvps: {}, consents: {},
    },
    {
      id: 'EVT-9005', type: 'Event', seriesId: 'EVT-9005', title: 'Staff training day — school closed', eventType: 'closure',
      allDay: true, startDate: '2026-10-30', startTime: null, endDate: '2026-10-30', endTime: null,
      recurrence: { freq: 'none', until: null }, exceptions: {},
      location: '', classIds: [], staffIds: [],
      requiresRSVP: false, requiresConsent: false, attachmentName: null,
      description: 'No childcare available — staff attend first-aid recertification.',
      rsvps: {}, consents: {},
    },
    {
      id: 'EVT-9006', type: 'Event', seriesId: 'EVT-9006', title: 'Harvest festival', eventType: 'event',
      allDay: false, startDate: '2026-10-24', startTime: '10:00', endDate: '2026-10-24', endTime: '12:00',
      recurrence: { freq: 'none', until: null }, exceptions: {},
      location: 'Garden courtyard', classIds: ['CLS-9001', 'CLS-9002', 'CLS-9003'], staffIds: [],
      requiresRSVP: true, requiresConsent: false, attachmentName: null,
      description: 'Families welcome to join us for songs, crafts and a harvest potluck.',
      rsvps: { 'G-2001': 'yes', 'G-2003': 'yes', 'G-2005': 'no' }, consents: {},
    },
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

  /** Resolves the day's menu from the weekly MenuTemplate by weekday — not a
      per-date record, so "today" never goes stale. Returns null on days with
      no scheduled menu (weekends). */
  function getMenuForDate(dateISO) {
    const dow = new Date(dateISO + 'T00:00:00').getDay();
    return records.find((r) => r.type === 'MenuTemplate' && r.dayOfWeek === dow) || null;
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
    getMenuForDate,
  };
})();
