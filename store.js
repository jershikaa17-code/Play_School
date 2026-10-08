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

  function normalize(str) {
    return String(str || '').toLowerCase();
  }

  function secondaryLine(record) {
    if (record.type === 'Child') return `${record.room} · ${record.status}`;
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
  };
})();
