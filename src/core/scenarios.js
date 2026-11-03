// Scenario suite: labelled normal and coerced payments (FIN-11 deliverable 2).
// Each scenario fixes the signals directly so results are repeatable. All values are synthetic.
import { scoreSignals, baselineScore } from './risk.js';

const F = {
  known: null,
  newFriend: { type: 'individual', ageDays: 1460, senders24h: 1 },
  govt: { type: 'government', ageDays: 5200, senders24h: 830 },
  business: { type: 'business', ageDays: 2900, senders24h: 6 },
  caterer: { type: 'individual', ageDays: 700, senders24h: 2 },
  mule2: { type: 'individual', ageDays: 2, senders24h: 14 },
  mule9: { type: 'individual', ageDays: 9, senders24h: 22 },
  mule5: { type: 'individual', ageDays: 5, senders24h: 31 },
  mule3: { type: 'individual', ageDays: 3, senders24h: 18 },
  newInd: { type: 'individual', ageDays: 40, senders24h: 3 },
  unknown: { type: 'unknown' }
};

const S = (o = {}) => ({ external_pressure: false, threat_reported: false, secrecy_requested: false, continuous_call: false, independent_verification: false, ...o });

export const SCENARIOS = [
  // Normal payments
  { id: 'N1', label: 'normal', family: 'Routine', title: 'Rent to landlord', amount: 18000, sig: { }, purpose: 'rent', facts: F.known, note: 'Rent' },
  { id: 'N2', label: 'normal', family: 'Routine', title: 'Groceries', amount: 1200, sig: {}, purpose: 'shopping', facts: F.known, note: 'Groceries' },
  { id: 'N3', label: 'normal', family: 'Routine', title: 'Dinner split with a friend', amount: 600, sig: {}, purpose: 'family', facts: F.known, note: 'Dinner' },
  { id: 'N4', label: 'normal', family: 'Routine', title: 'Electricity bill', amount: 2100, sig: {}, purpose: 'shopping', facts: F.known, note: 'Bill' },
  { id: 'N5', label: 'normal', family: 'New payee', title: 'First payment to a new friend', amount: 800, sig: { new_beneficiary: true }, purpose: 'family', facts: F.newFriend, note: 'Concert ticket' },
  { id: 'N6', label: 'normal', family: 'High value', title: '₹2,00,000 to known builder', amount: 200000, sig: { amount_unusual: true }, purpose: 'rent', facts: F.known, note: 'Flat payment' },
  { id: 'N7', label: 'normal', family: 'New payee', title: 'Property tax to municipal account', amount: 14500, sig: { new_beneficiary: true, amount_unusual: true }, purpose: 'govt', facts: F.govt, note: 'Property tax' },
  { id: 'N8', label: 'normal', family: 'Hard case', title: 'Late-night wedding catering advance', amount: 150000, sig: { new_beneficiary: true, amount_unusual: true, unusual_hour: true }, purpose: 'rent', facts: F.caterer, note: 'Catering advance', hard: true },
  { id: 'N9', label: 'normal', family: 'New payee', title: 'New laptop from a shop', amount: 62000, sig: { new_beneficiary: true, amount_unusual: true }, purpose: 'shopping', facts: F.business, note: 'Laptop' },
  { id: 'N10', label: 'normal', family: 'Routine', title: 'Late-night transfer to sibling', amount: 3000, sig: { unusual_hour: true }, purpose: 'family', facts: F.known, note: 'Hostel fees' },
  // Coerced payments
  { id: 'C1', label: 'coerced', family: 'Digital arrest', title: 'Fake CBI officer, “verification deposit”', amount: 50000, sig: { new_beneficiary: true, amount_unusual: true }, s: S({ external_pressure: true, threat_reported: true, secrecy_requested: true, continuous_call: true }), purpose: 'govt', facts: F.mule2, note: 'CBI verification deposit' },
  { id: 'C2', label: 'coerced', family: 'Fake KYC / SIM block', title: '“Your SIM will be blocked today”', amount: 9999, sig: { new_beneficiary: true, amount_unusual: true }, s: S({ external_pressure: true, threat_reported: true, continuous_call: true }), purpose: 'bank', facts: F.mule3, note: 'kyc update' },
  { id: 'C3', label: 'coerced', family: 'Customs parcel', title: '“Drugs found in your parcel”', amount: 25000, sig: { new_beneficiary: true, amount_unusual: true }, s: S({ threat_reported: true, continuous_call: true }), purpose: 'customs', facts: F.mule9, note: 'customs clearance' },
  { id: 'C4', label: 'coerced', family: 'Investment group', title: 'Trading tip group, “guaranteed returns”', amount: 100000, sig: { new_beneficiary: true, amount_unusual: true }, s: S({ secrecy_requested: true }), purpose: 'invest', facts: F.mule5, note: 'guaranteed returns' },
  { id: 'C5', label: 'coerced', family: 'Relative in distress', title: '“Your nephew had an accident”', amount: 30000, sig: { new_beneficiary: true, amount_unusual: true }, s: S({ external_pressure: true, secrecy_requested: true }), purpose: 'family', facts: F.newInd, note: 'hospital' },
  { id: 'C6', label: 'coerced', family: 'Task scam', title: 'Online job, pay to unlock earnings', amount: 15000, sig: { new_beneficiary: true, amount_unusual: true }, s: S({ external_pressure: true }), purpose: 'job', facts: F.mule3, note: 'task unlock' },
  { id: 'C7', label: 'coerced', family: 'Digital arrest', title: 'Split transfers while on a call', amount: 20000, sig: { new_beneficiary: true, amount_unusual: true, rapid_transactions: true }, s: S({ continuous_call: true, threat_reported: true }), purpose: 'govt', facts: F.mule2, note: 'second instalment' },
  { id: 'C8', label: 'coerced', family: 'Fake KYC / SIM block', title: 'Unregistered account, bank claim', amount: 7500, sig: { new_beneficiary: true, amount_unusual: true }, s: S({ external_pressure: true }), purpose: 'bank', facts: F.unknown, note: 'account reactivation' },
  { id: 'C9', label: 'coerced', family: 'Hard case', title: 'Calm, fully convinced victim who answers “No” to everything', amount: 85000, sig: { new_beneficiary: true, amount_unusual: true }, s: S(), purpose: 'family', facts: F.mule2, note: 'Help for a friend', hard: true }
];

const INTERVENE = new Set(['HIGH', 'CRITICAL']);
const TOUCH = new Set(['MEDIUM', 'HIGH', 'CRITICAL']);

export function runSuite(policy) {
  const rows = SCENARIOS.map((sc) => {
    const signals = { ...sc.sig, screening: sc.s || S(), purpose: sc.purpose, facts: sc.facts, note: sc.note };
    const ours = scoreSignals(signals, policy);
    const base = baselineScore(sc.sig, policy);
    return { ...sc, ours, base };
  });
  const coerced = rows.filter((r) => r.label === 'coerced');
  const normal = rows.filter((r) => r.label === 'normal');
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
  const summary = (key) => ({
    detection: pct(coerced.filter((r) => INTERVENE.has(r[key].tier)).length, coerced.length),
    caught: coerced.filter((r) => INTERVENE.has(r[key].tier)).length,
    falseIntervention: pct(normal.filter((r) => INTERVENE.has(r[key].tier)).length, normal.length),
    falseCount: normal.filter((r) => INTERVENE.has(r[key].tier)).length,
    friction: pct(normal.filter((r) => TOUCH.has(r[key].tier)).length, normal.length),
    frictionCount: normal.filter((r) => TOUCH.has(r[key].tier)).length
  });
  return { rows, ours: summary('ours'), base: summary('base'), nCoerced: coerced.length, nNormal: normal.length };
}
