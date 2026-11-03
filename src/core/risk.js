// PayShield risk engine.
// Deterministic, explainable points (SAFEPAY plan §5) plus the story-versus-facts layer.
// Pure functions only: the same code scores live payments, the scenario suite and the policy preview.

export const DEFAULT_POLICY = {
  weights: {
    new_beneficiary: 10,
    amount_unusual: 15,
    rapid_transactions: 15,
    unusual_hour: 5,
    active_call: 10,
    external_pressure: 20,
    secrecy_requested: 15,
    threat_reported: 25,
    continuous_call: 10,
    claim_vs_account: 25,
    claim_unconfirmed: 10,
    mule_pattern: 15,
    reported_payee: 20,
    script_words: 10
  },
  thresholds: { medium: 25, high: 50, critical: 75 },
  amountMultiple: 3,
  amountFloor: 5000,
  rapidCount: 3,
  rapidWindowMin: 30
};

export const WEIGHT_LABELS = {
  new_beneficiary: 'New beneficiary',
  amount_unusual: 'Amount far above usual',
  rapid_transactions: 'Several payments in a short time',
  unusual_hour: 'Unusual hour (11 pm to 5 am)',
  active_call: 'On a call with an unknown number',
  external_pressure: 'Pressure to pay now (reported)',
  secrecy_requested: 'Told to keep it secret (reported)',
  threat_reported: 'Threat of arrest or penalty (reported)',
  continuous_call: 'Someone directing on a call (reported)',
  claim_vs_account: 'Stated purpose contradicts the account',
  claim_unconfirmed: 'Organisation named, account unconfirmed',
  mule_pattern: 'New account paid by many people',
  reported_payee: 'Payee reported by other users',
  script_words: 'Scam-script words in the note'
};

export const QUESTIONS = [
  { id: 'external_pressure', q: 'Is anyone pressuring you to make this payment right now?' },
  { id: 'threat_reported', q: 'Has anyone threatened arrest, legal action, account closure or another serious consequence if you do not pay?' },
  { id: 'secrecy_requested', q: 'Has anyone told you to keep this payment secret from family, friends or your bank?' },
  { id: 'continuous_call', q: 'Is someone on a call with you, or guiding you step by step, while you pay?' },
  { id: 'independent_verification', q: 'Did you check this request yourself, using an official number or website you found on your own?' }
];

export const PURPOSES = [
  { id: 'family', label: 'Friend or family' },
  { id: 'shopping', label: 'Shopping or bills' },
  { id: 'rent', label: 'Rent, fees or services' },
  { id: 'govt', label: 'Police, court or government', claim: 'authority', said: 'a police, court or government payment', fact: 'Police, courts and government departments never collect money in a personal account.' },
  { id: 'bank', label: 'Bank, KYC or SIM update', claim: 'authority', said: 'a bank, KYC or SIM update', fact: 'Banks and telecom companies do not ask you to transfer money to update KYC or keep a SIM active.' },
  { id: 'customs', label: 'Courier or customs fee', claim: 'authority', said: 'a courier or customs fee', fact: 'Customs duty is paid on official portals, never to a personal account.' },
  { id: 'invest', label: 'Investment or trading', claim: 'invest', said: 'an investment or trading deposit', fact: 'Registered investment platforms collect money through business accounts, not new personal ones.' },
  { id: 'job', label: 'Online job or task deposit', claim: 'invest', said: 'a deposit for an online job or task', fact: 'Real employers do not ask you to pay to start work or unlock earnings.' },
  { id: 'other', label: 'Something else' }
];

// Phrases that recur in digital-arrest, KYC, customs and investment scripts.
const SCRIPT_TERMS = [
  'arrest', 'cbi', 'police', 'customs', 'parcel', 'narcotic', 'drugs', 'safe account', 'refundable',
  'verification', 'verify', 'kyc', 'sim block', 'investigation', 'warrant', 'rbi', 'court', 'fine', 'penalty',
  'deposit', 'guaranteed', 'double', 'task', 'unlock', 'digital arrest', 'money laundering', 'fedex', 'trai'
];

export function findScriptWords(text = '') {
  const t = ` ${String(text).toLowerCase()} `;
  return SCRIPT_TERMS.filter((w) => new RegExp(`[^a-z]${w.replace(/ /g, '\\s+')}[^a-z]`).test(t));
}

export function tierOf(score, thresholds = DEFAULT_POLICY.thresholds) {
  if (score >= thresholds.critical) return 'CRITICAL';
  if (score >= thresholds.high) return 'HIGH';
  if (score >= thresholds.medium) return 'MEDIUM';
  return 'LOW';
}

export const TIER = {
  LOW: { label: 'Low', action: 'NORMAL', color: 'var(--t-low)', short: 'Looks normal' },
  MEDIUM: { label: 'Medium', action: 'CAUTION', color: 'var(--t-med)', short: 'Take a moment' },
  HIGH: { label: 'High', action: 'SAFETY_CHECK', color: 'var(--t-high)', short: 'Strong warning signs' },
  CRITICAL: { label: 'Critical', action: 'STRONG_PAUSE', color: 'var(--t-crit)', short: 'Stop and verify' }
};

/**
 * Compare what the person says the payment is for with facts about the receiving account.
 * facts: { type: 'individual'|'business'|'government'|'unknown', ageDays, senders24h, reported }
 */
export function storyVsFacts(purposeId, facts) {
  const p = PURPOSES.find((x) => x.id === purposeId);
  if (!p || !p.claim || !facts) return null;
  if (facts.type === 'unknown') {
    if (p.claim === 'authority') return { kind: 'unconfirmed', said: p.said, fact: 'We could not confirm that this account belongs to the organisation you named.' };
    return null;
  }
  if (p.claim === 'authority' && facts.type === 'individual') return { kind: 'contradiction', said: p.said, fact: p.fact };
  if (p.claim === 'invest' && facts.type === 'individual' && facts.ageDays < 180) return { kind: 'contradiction', said: p.said, fact: p.fact };
  return null;
}

/**
 * Score a payment from already-computed signals. Every point carries a plain-language reason.
 * signals: { new_beneficiary, amount_unusual, rapid_transactions, unusual_hour,
 *            screening: {external_pressure, secrecy_requested, threat_reported, continuous_call, independent_verification},
 *            purpose, facts, note, amountRatio, recentCount, payeeName }
 */
export function scoreSignals(signals, policy = DEFAULT_POLICY) {
  const w = { ...DEFAULT_POLICY.weights, ...(policy.weights || {}) };
  const th = { ...DEFAULT_POLICY.thresholds, ...(policy.thresholds || {}) };
  const reasons = [];
  const add = (code, group, detail) => {
    if (!w[code]) return;
    reasons.push({ code, group, points: w[code], label: WEIGHT_LABELS[code], detail });
  };
  const s = signals.screening || {};
  const f = signals.facts || null;

  if (signals.new_beneficiary) add('new_beneficiary', 'context', 'First payment to this account.');
  if (signals.amount_unusual) add('amount_unusual', 'context', signals.amountRatio ? `About ${Math.round(signals.amountRatio)}× your usual payment.` : 'Much larger than your usual payments.');
  if (signals.rapid_transactions) add('rapid_transactions', 'context', signals.recentCount ? `${signals.recentCount} payments in the last few minutes.` : 'Several payments close together.');
  if (signals.unusual_hour) add('unusual_hour', 'context', 'Late-night payments are unusual for you.');
  if (signals.active_call) add('active_call', 'context', 'You’re paying during a call with a number not in your contacts (call state, with permission).');

  if (s.external_pressure) add('external_pressure', 'answers', 'You said someone is pressuring you.');
  if (s.threat_reported) add('threat_reported', 'answers', 'You said someone threatened a serious consequence.');
  if (s.secrecy_requested) add('secrecy_requested', 'answers', 'You were told to keep it secret.');
  if (s.continuous_call) add('continuous_call', 'answers', 'Someone is guiding you during the payment.');
  // Independent verification never subtracts points (SAFEPAY §5.2): a "yes" is not proof of safety.

  const svf = storyVsFacts(signals.purpose, f);
  if (svf?.kind === 'contradiction') add('claim_vs_account', 'facts', svf.fact);
  if (svf?.kind === 'unconfirmed') add('claim_unconfirmed', 'facts', svf.fact);
  if (f && f.type !== 'unknown' && f.ageDays < 30 && f.senders24h >= 10) add('mule_pattern', 'facts', `Opened ${f.ageDays} day${f.ageDays === 1 ? '' : 's'} ago, paid by ${f.senders24h} different people today.`);
  if (f?.reported) add('reported_payee', 'facts', 'Other users have reported this account.');

  const words = findScriptWords(signals.note);
  if (words.length) add('script_words', 'answers', `Note mentions: ${words.slice(0, 3).map((x) => `“${x}”`).join(', ')}.`);

  const raw = reasons.reduce((a, r) => a + r.points, 0);
  const score = Math.max(0, Math.min(100, raw));
  const tier = tierOf(score, th);
  reasons.sort((a, b) => b.points - a.points);
  return { score, raw, tier, action: TIER[tier].action, reasons, storyVsFacts: svf, words };
}

/** Context signals from the user's own payment history (no other apps, no calls, no messages). */
export function contextSignals({ history, payeeUpi, amount, now = Date.now(), policy = DEFAULT_POLICY }) {
  const P = { ...DEFAULT_POLICY, ...policy };
  const done = history.filter((t) => t.status === 'COMPLETED');
  const ninety = done.filter((t) => now - t.createdAt < 90 * 864e5);
  const amounts = ninety.map((t) => t.amount).sort((a, b) => a - b);
  const median = amounts.length ? amounts[Math.floor(amounts.length / 2)] : 2000;
  const toPayee = done.filter((t) => t.payeeUpi === payeeUpi);
  const maxToPayee = toPayee.reduce((m, t) => Math.max(m, t.amount), 0);
  const recent = history.filter((t) => now - t.createdAt < P.rapidWindowMin * 60e3 && t.status !== 'CANCELLED');
  const hour = new Date(now).getHours();
  return {
    new_beneficiary: toPayee.length === 0,
    amount_unusual: amount >= Math.max(P.amountMultiple * median, P.amountFloor) && amount > 1.5 * maxToPayee,
    rapid_transactions: recent.length + 1 >= P.rapidCount,
    unusual_hour: hour >= 23 || hour < 5,
    amountRatio: amount / median,
    recentCount: recent.length + 1,
    median,
    priorToPayee: toPayee.length
  };
}

/** What the bank's transaction rules alone would see: no answers, no account facts. Used as the baseline. */
export function baselineScore(signals, policy = DEFAULT_POLICY) {
  return scoreSignals({ new_beneficiary: signals.new_beneficiary, amount_unusual: signals.amount_unusual, rapid_transactions: signals.rapid_transactions, unusual_hour: signals.unusual_hour }, policy);
}

/** Show a safety check only when context gives a reason to. Routine payments stay friction-free. */
export function needsSafetyCheck(ctx) {
  return Boolean(ctx.new_beneficiary || ctx.amount_unusual || ctx.rapid_transactions || ctx.active_call);
}
