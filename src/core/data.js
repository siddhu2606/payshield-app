// Synthetic demo data. Every person, account and UPI ID here is fictional (handles end in "demo").
import { contextSignals, scoreSignals, DEFAULT_POLICY } from './risk.js';
import { DEMO_PIN_HASH } from './auth.js';

const DAY = 864e5;
const MIN = 60e3;

// Small deterministic PRNG so every reset produces the same story.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

export const REGISTRY = [
  // Known, ordinary accounts
  { upi: 'rohan.shah@okdemo', name: 'Rohan Shah', type: 'individual', ageDays: 2210, senders24h: 1 },
  { upi: 'suresh.patil@okdemo', name: 'Suresh Patil', type: 'individual', ageDays: 3650, senders24h: 2 },
  { upi: 'freshbasket@hdfcdemo', name: 'Fresh Basket Groceries', type: 'business', ageDays: 1900, senders24h: 212, verified: true },
  { upi: 'mahapower.bill@sbidemo', name: 'Maha Power Electricity', type: 'business', ageDays: 4100, senders24h: 5400, verified: true },
  { upi: 'sunrise.builders@icicidemo', name: 'Sunrise Builders Pvt Ltd', type: 'business', ageDays: 2900, senders24h: 6, verified: true },
  { upi: 'neha.sharma@okdemo', name: 'Neha Sharma', type: 'individual', ageDays: 1460, senders24h: 1 },
  { upi: 'pmc.propertytax@sbidemo', name: 'Pune Municipal Corporation', type: 'government', ageDays: 5200, senders24h: 830, verified: true },
  { upi: 'kumar.electronics@hdfcdemo', name: 'Kumar Electronics', type: 'business', ageDays: 2000, senders24h: 41, verified: true },
  { upi: 'school.canteen@okdemo', name: 'School Canteen', type: 'business', ageDays: 1300, senders24h: 96, verified: true },
  { upi: 'bookworm.store@okdemo', name: 'Bookworm Store', type: 'business', ageDays: 900, senders24h: 18, verified: true },
  { upi: 'annapurna.caterers@okdemo', name: 'Annapurna Caterers', type: 'individual', ageDays: 700, senders24h: 2 },
  // Accounts that look like mule accounts in this synthetic world. `device` and `phone` are the footprint a bank
  // sees when an account is opened or used (device ID, registered mobile). Scammers swap accounts every few
  // payments, but the footprint repeats, so a brand-new account can be linked to one already reported.
  { upi: 'rajesh.k4471@ybldemo', name: 'Rajesh Kumar', type: 'individual', ageDays: 2, senders24h: 14, device: 'DEV-7F3A', phone: '+91 70•• ••342' },
  { upi: 'clearance.desk@pnbdemo', name: 'Mohd. Arif', type: 'individual', ageDays: 9, senders24h: 22, device: 'DEV-7F3A', phone: '+91 88•• ••019', reportedSeed: true },
  { upi: 'kyc.update.help@axldemo', name: 'Pooja Singh', type: 'individual', ageDays: 3, senders24h: 18, device: 'DEV-91BC', phone: '+91 70•• ••342' },
  { upi: 'rk.enterprises22@ybldemo', name: 'R K Enterprises', type: 'individual', ageDays: 1, senders24h: 3, device: 'DEV-7F3A', phone: '+91 70•• ••342' },
  { upi: 'tradeguru.vip@icicidemo', name: 'Sanjay Verma', type: 'individual', ageDays: 5, senders24h: 31, device: 'DEV-22C9', phone: '+91 96•• ••871' },
  { upi: 'gamecoins.topup@okdemo', name: 'Aman Gupta', type: 'individual', ageDays: 6, senders24h: 27, device: 'DEV-22C9', phone: '+91 62•• ••531', reportedSeed: true },
  { upi: 'vip.signals.desk@okdemo', name: 'Neeraj Pal', type: 'individual', ageDays: 2, senders24h: 4, device: 'DEV-5D10', phone: '+91 62•• ••531' }
];

export const PERSONAS = {
  member: { id: 'u_aarav', label: 'Aarav Mehta', hint: 'Member · KYC verified' },
  child: { id: 'c_anaya', label: 'Anaya Mehta', hint: 'Child · age 14' },
  guardian: { id: 'g_priya', label: 'Priya Mehta', hint: 'Guardian of Aarav and Anaya' },
  caller: { id: 'x_caller', label: 'Scam caller', hint: 'Role-play simulator' },
  admin: { id: 'a_meera', label: 'Meera Iyer', hint: 'Risk operations' }
};

function history(userId, now, r) {
  const tx = [];
  const push = (payeeUpi, payeeName, amount, daysAgo, note) =>
    tx.push({ id: `h_${userId}_${tx.length}`, userId, payeeUpi, payeeName, amount, note, createdAt: now - daysAgo * DAY - Math.floor(r() * 8) * 60 * MIN, status: 'COMPLETED', kind: 'history' });
  for (let m = 0; m < 3; m++) {
    push('suresh.patil@okdemo', 'Suresh Patil', 18000, 5 + m * 30, 'Rent');
    push('mahapower.bill@sbidemo', 'Maha Power Electricity', 1400 + Math.round(r() * 900), 9 + m * 30, 'Electricity bill');
  }
  for (let i = 0; i < 14; i++) push('freshbasket@hdfcdemo', 'Fresh Basket Groceries', 300 + Math.round(r() * 22) * 100, 2 + i * 6, 'Groceries');
  for (let i = 0; i < 9; i++) push('rohan.shah@okdemo', 'Rohan Shah', [300, 450, 600, 800, 1200, 1500][Math.floor(r() * 6)], 3 + i * 9, ['Dinner split', 'Movie', 'Cab share', 'Trip share'][Math.floor(r() * 4)]);
  push('sunrise.builders@icicidemo', 'Sunrise Builders Pvt Ltd', 50000, 40, 'Flat booking instalment');
  push('kumar.electronics@hdfcdemo', 'Kumar Electronics', 7200, 21, 'Mixer grinder');
  return tx;
}

function childHistory(now) {
  return [
    { id: 'h_c1', userId: 'c_anaya', payeeUpi: 'school.canteen@okdemo', payeeName: 'School Canteen', amount: 120, note: 'Lunch', createdAt: now - 3 * 60 * MIN, status: 'COMPLETED', kind: 'history' },
    { id: 'h_c2', userId: 'c_anaya', payeeUpi: 'bookworm.store@okdemo', payeeName: 'Bookworm Store', amount: 80, note: 'Pens', createdAt: now - DAY, status: 'COMPLETED', kind: 'history' },
    { id: 'h_c3', userId: 'c_anaya', payeeUpi: 'school.canteen@okdemo', payeeName: 'School Canteen', amount: 60, note: 'Snacks', createdAt: now - 2 * DAY, status: 'COMPLETED', kind: 'history' },
    { id: 'h_c4', userId: 'c_anaya', payeeUpi: 'bookworm.store@okdemo', payeeName: 'Bookworm Store', amount: 400, note: 'Notebooks', createdAt: now - 6 * DAY, status: 'COMPLETED', kind: 'history' }
  ];
}

// Assessed payments by other (fictional) members, so the admin console opens with realistic activity.
const OTHER_CASES = [
  { user: 'u_kavita', upi: 'clearance.desk@pnbdemo', amount: 32000, purpose: 'customs', s: { threat_reported: 1, continuous_call: 1 }, note: 'customs clearance parcel', ago: 18, status: 'PENDING_REVIEW' },
  { user: 'u_vikram', upi: 'rajesh.k4471@ybldemo', amount: 95000, purpose: 'govt', s: { external_pressure: 1, threat_reported: 1, secrecy_requested: 1, continuous_call: 1 }, note: 'CBI verification deposit', ago: 46, status: 'CANCELLED' },
  { user: 'u_nitin', upi: 'neha.sharma@okdemo', amount: 9500, purpose: 'family', s: {}, note: 'Wedding gift', ago: 75, status: 'COMPLETED' },
  { user: 'u_pooja', upi: 'tradeguru.vip@icicidemo', amount: 60000, purpose: 'invest', s: { secrecy_requested: 1 }, note: 'guaranteed returns slot', ago: 130, status: 'POSTPONED' },
  { user: 'u_imran', upi: 'kumar.electronics@hdfcdemo', amount: 42000, purpose: 'shopping', s: {}, note: 'Laptop', ago: 210, status: 'COMPLETED' },
  { user: 'u_divya', upi: 'kyc.update.help@axldemo', amount: 4999, purpose: 'bank', s: { external_pressure: 1, threat_reported: 1 }, note: 'kyc update sim block', ago: 260, status: 'CANCELLED' },
  { user: 'u_kavita', upi: 'freshbasket@hdfcdemo', amount: 1800, purpose: 'shopping', s: {}, note: 'Groceries', ago: 300, status: 'COMPLETED', known: true },
  { user: 'u_nitin', upi: 'pmc.propertytax@sbidemo', amount: 14500, purpose: 'govt', s: {}, note: 'Property tax', ago: 420, status: 'COMPLETED' },
  { user: 'u_imran', upi: 'annapurna.caterers@okdemo', amount: 150000, purpose: 'rent', s: {}, note: 'Wedding catering advance', ago: 520, status: 'COMPLETED', hour: 23 },
  { user: 'u_vikram', upi: 'mahapower.bill@sbidemo', amount: 2100, purpose: 'shopping', s: {}, note: 'Electricity', ago: 700, status: 'COMPLETED', known: true },
  { user: 'u_divya', upi: 'rohan.shah@okdemo', amount: 700, purpose: 'family', s: {}, note: 'Coffee', ago: 900, status: 'COMPLETED' },
  { user: 'u_pooja', upi: 'gamecoins.topup@okdemo', amount: 3000, purpose: 'other', s: { secrecy_requested: 1 }, note: 'unlock bonus task', ago: 1100, status: 'CANCELLED' },
  { user: 'u_kavita', upi: 'sunrise.builders@icicidemo', amount: 200000, purpose: 'rent', s: {}, note: 'Flat payment', ago: 1300, status: 'COMPLETED', known: true },
  { user: 'u_nitin', upi: 'kyc.update.help@axldemo', amount: 9999, purpose: 'bank', s: { external_pressure: 1, continuous_call: 1 }, note: 'kyc verification', ago: 1500, status: 'PENDING_REVIEW' }
];

export const OTHER_MEMBERS = {
  u_kavita: { name: 'Kavita Joshi', age: 58 },
  u_vikram: { name: 'Vikram Rao', age: 67 },
  u_nitin: { name: 'Nitin Rao', age: 34 },
  u_pooja: { name: 'Pooja Desai', age: 29 },
  u_imran: { name: 'Imran Shaikh', age: 41 },
  u_divya: { name: 'Divya Nair', age: 23 }
};

/** Accounts that share a device or registered mobile with this one. */
export function linkedAccounts(registry, upi) {
  const r = registry[upi];
  if (!r || (!r.device && !r.phone)) return [];
  return Object.values(registry).filter((x) => x.upi !== upi && ((r.device && x.device === r.device) || (r.phone && x.phone === r.phone)))
    .map((x) => ({ upi: x.upi, name: x.name, reported: !!x.reported, frozen: !!x.frozen, via: [r.device && x.device === r.device && 'device', r.phone && x.phone === r.phone && 'phone'].filter(Boolean) }));
}

export function factsFor(registry, upi) {
  const r = registry[upi];
  if (!r) return { type: 'unknown' };
  const links = linkedAccounts(registry, upi).filter((x) => x.reported);
  const via = new Set(links.flatMap((x) => x.via));
  return {
    type: r.type, ageDays: r.ageDays, senders24h: r.senders24h, reported: !!r.reported, verified: !!r.verified, name: r.name, frozen: !!r.frozen,
    linkedReported: links.map((x) => x.upi),
    linkedVia: via.size === 2 ? 'a device and a phone number' : via.has('device') ? 'a device' : via.has('phone') ? 'a registered phone number' : null
  };
}

/** Mule rings: groups of accounts connected through shared devices or phone numbers. */
export function muleRings(registry) {
  const seen = new Set();
  const rings = [];
  Object.values(registry).forEach((r) => {
    if (seen.has(r.upi) || (!r.device && !r.phone)) return;
    const stack = [r.upi];
    const members = [];
    while (stack.length) {
      const u = stack.pop();
      if (seen.has(u)) continue;
      seen.add(u); members.push(registry[u]);
      linkedAccounts(registry, u).forEach((x) => { if (!seen.has(x.upi)) stack.push(x.upi); });
    }
    if (members.length > 1) rings.push(members);
  });
  return rings.map((m, i) => ({
    id: `RING-${String.fromCharCode(65 + i)}`,
    members: m,
    devices: [...new Set(m.map((x) => x.device).filter(Boolean))],
    phones: [...new Set(m.map((x) => x.phone).filter(Boolean))],
    senders24h: m.reduce((a, x) => a + (x.senders24h || 0), 0),
    reported: m.filter((x) => x.reported).length,
    frozen: m.filter((x) => x.frozen).length
  }));
}

export function createSeed(now = Date.now()) {
  const r = rng(26);
  const registry = Object.fromEntries(REGISTRY.map(({ reportedSeed, ...x }) => [x.upi, { ...x, reported: !!reportedSeed }]));
  const users = {
    u_aarav: { id: 'u_aarav', role: 'member', name: 'Aarav Mehta', mobile: '+91 98••• •4210', balance: 348250, kyc: 'verified', pinHash: DEMO_PIN_HASH, trustedContactId: 'g_priya', settings: { pauseHighRisk: true, pressureButton: true, consentTrusted: true, callState: true } },
    c_anaya: { id: 'c_anaya', role: 'child', name: 'Anaya Mehta', age: 14, pinHash: DEMO_PIN_HASH, balance: 1340, guardianId: 'g_priya', dailyLimit: 500, monthlyAllowance: 2000, approveAll: false },
    g_priya: { id: 'g_priya', role: 'guardian', name: 'Priya Mehta', mobile: '+91 98••• •7733', pinHash: DEMO_PIN_HASH, wards: ['u_aarav', 'c_anaya'] },
    a_meera: { id: 'a_meera', role: 'admin', name: 'Meera Iyer', staffId: 'RISK-2291' },
    x_caller: { id: 'x_caller', role: 'caller', name: 'Scam caller (simulation)', pinHash: DEMO_PIN_HASH },
    u_new: null
  };
  delete users.u_new;
  Object.entries(OTHER_MEMBERS).forEach(([id, m]) => (users[id] = { id, role: 'member', name: m.name, age: m.age, balance: 90000, kyc: 'verified', seeded: true }));

  const beneficiaries = [
    { id: 'b1', userId: 'u_aarav', name: 'Rohan Shah', upi: 'rohan.shah@okdemo', tag: 'Friend' },
    { id: 'b2', userId: 'u_aarav', name: 'Suresh Patil', upi: 'suresh.patil@okdemo', tag: 'Landlord' },
    { id: 'b3', userId: 'u_aarav', name: 'Fresh Basket Groceries', upi: 'freshbasket@hdfcdemo', tag: 'Groceries' },
    { id: 'b4', userId: 'u_aarav', name: 'Maha Power Electricity', upi: 'mahapower.bill@sbidemo', tag: 'Bill' },
    { id: 'b5', userId: 'u_aarav', name: 'Sunrise Builders Pvt Ltd', upi: 'sunrise.builders@icicidemo', tag: 'Home' },
    { id: 'b6', userId: 'c_anaya', name: 'School Canteen', upi: 'school.canteen@okdemo', tag: 'School' },
    { id: 'b7', userId: 'c_anaya', name: 'Bookworm Store', upi: 'bookworm.store@okdemo', tag: 'Books' }
  ];

  const transactions = [...history('u_aarav', now, r), ...childHistory(now)];

  // Score the other members' cases with the real engine so their reasons are genuine.
  OTHER_CASES.forEach((c, i) => {
    const created = now - c.ago * MIN;
    const ownHist = c.known ? [{ payeeUpi: c.upi, amount: c.amount, status: 'COMPLETED', createdAt: created - 20 * DAY }] : [];
    const baseHist = [{ payeeUpi: 'x', amount: 2500, status: 'COMPLETED', createdAt: created - 10 * DAY }, ...ownHist];
    const ctx = contextSignals({ history: baseHist, payeeUpi: c.upi, amount: c.amount, now: created });
    ctx.unusual_hour = c.hour ? true : false;
    const res = scoreSignals({ ...ctx, screening: c.s, purpose: c.purpose, facts: factsFor(registry, c.upi), note: c.note }, DEFAULT_POLICY);
    transactions.push({
      id: `T${2400 + i}`, userId: c.user, payeeUpi: c.upi, payeeName: registry[c.upi]?.name || c.upi, amount: c.amount, note: c.note, purpose: c.purpose,
      createdAt: created, status: c.status, kind: 'assessed', seeded: true,
      screening: Object.keys(c.s).length ? { external_pressure: !!c.s.external_pressure, threat_reported: !!c.s.threat_reported, secrecy_requested: !!c.s.secrecy_requested, continuous_call: !!c.s.continuous_call, independent_verification: false } : null,
      assessment: res,
      timeline: [
        { t: created, label: `Risk assessed: ${res.score} (${res.tier})` },
        ...(c.status !== 'COMPLETED' ? [{ t: created + 40e3, label: c.status === 'PENDING_REVIEW' ? 'Sent to pending review' : `Member chose to ${c.status === 'CANCELLED' ? 'cancel' : 'postpone'}` }] : [{ t: created + 20e3, label: 'Completed by member' }])
      ]
    });
  });

  return {
    version: 5,
    createdAt: now,
    policy: JSON.parse(JSON.stringify(DEFAULT_POLICY)),
    users,
    beneficiaries,
    registry,
    transactions,
    requests: [
      { id: 'R100', kind: 'child', fromUserId: 'c_anaya', toUserId: 'g_priya', amount: 600, reason: 'Books', status: 'approved', createdAt: now - DAY, resolvedAt: now - DAY + 30 * MIN }
    ],
    kyc: [
      { id: 'KYC-2041', userId: null, name: 'Rahul Verma', segment: 'Salaried', submittedAt: now - 40 * MIN, status: 'pending', checks: { aadhaar: true, pan: true, liveness: true, nameMatch: 94 } },
      { id: 'KYC-2040', userId: null, name: 'Sneha Kulkarni', segment: 'Student', submittedAt: now - 3 * 60 * MIN, status: 'pending', checks: { aadhaar: true, pan: false, liveness: true, nameMatch: 71 } },
      { id: 'KYC-2038', userId: null, name: 'Imran Shaikh', segment: 'Business', submittedAt: now - DAY, status: 'approved', checks: { aadhaar: true, pan: true, liveness: true, nameMatch: 97 } },
      { id: 'KYC-2031', userId: null, name: 'Vikas Rane', segment: 'Retired', submittedAt: now - 2 * DAY, status: 'rejected', checks: { aadhaar: true, pan: true, liveness: false, nameMatch: 49 } }
    ],
    notifications: [],
    calls: [],
    messages: [],
    cases: [],
    roleplay: [],
    audit: [{ t: now, actor: 'system', action: 'Demo data created', detail: 'Synthetic users, payees and history loaded' }]
  };
}
