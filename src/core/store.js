// Shared state for every PayShield screen.
// Stored in localStorage and broadcast between tabs and frames, so the member phone, the guardian phone and
// the admin console update each other live when they run in the same browser. It is the stand-in for the
// FastAPI + PostgreSQL backend in the plan: the functions below mirror its API contract.
import { useSyncExternalStore } from 'react';
import { createSeed, factsFor } from './data.js';
import { contextSignals, scoreSignals, needsSafetyCheck } from './risk.js';
import { scriptById, fillName } from './calls.js';

const KEY = 'payshield.db.v4';
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('payshield') : null;
const listeners = new Set();
let db = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 4) return parsed;
    }
  } catch { /* storage unavailable: fall through to a fresh seed */ }
  const fresh = createSeed();
  persist(fresh);
  return fresh;
}

function persist(next) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: keep in memory */ }
}

function emit() { listeners.forEach((l) => l()); }

function commit(mutator) {
  const next = structuredClone(db);
  const out = mutator(next);
  db = next;
  persist(db);
  channel?.postMessage({ type: 'sync' });
  emit();
  return out;
}

function reloadFromStorage() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { db = JSON.parse(raw); emit(); }
  } catch { /* ignore */ }
}
channel?.addEventListener('message', reloadFromStorage);
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => { if (e.key === KEY) reloadFromStorage(); });

export function useDb() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => db);
}
export const getDb = () => db;

let seq = 0;
const uid = (p) => `${p}${Date.now().toString(36).slice(-5).toUpperCase()}${(seq++ % 36).toString(36).toUpperCase()}`;
const log = (d, actor, action, detail) => d.audit.unshift({ t: Date.now(), actor, action, detail });
const notify = (d, userId, n) => d.notifications.unshift({ id: uid('N'), userId, t: Date.now(), read: false, ...n });
const nameOf = (d, id) => d.users[id]?.name || id;

/* ---------- reads ---------- */
export function historyOf(d, userId) {
  return d.transactions.filter((t) => t.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
}

export function activeCallFor(d, userId) {
  return (d.calls || []).find((c) => c.toUserId === userId && c.status === 'active') || null;
}

// Context = payment history + (simulated, consented) call state. Never call audio or content.
function fullContext(d, userId, upi, amount) {
  const ctx = contextSignals({ history: historyOf(d, userId), payeeUpi: upi, amount, policy: d.policy });
  const call = activeCallFor(d, userId);
  const useCall = d.users[userId]?.settings?.callState !== false;
  if (call && useCall) {
    ctx.active_call = true;
    if (call.lateNight) ctx.unusual_hour = true;
  }
  return { ctx, call };
}

export function lookupPayee(d, userId, upi) {
  const saved = d.beneficiaries.find((b) => b.userId === userId && b.upi === upi);
  const facts = factsFor(d.registry, upi);
  return { saved, facts, name: saved?.name || d.registry[upi]?.name || null };
}

/** POST /api/transactions/initiate: validate and load context before anything is shown to the user. */
export function previewPayment(userId, upi, amount) {
  const d = db;
  if (!upi || !/^[a-z0-9._-]+@[a-z]+$/i.test(upi)) return { error: 'Enter a UPI ID like name@bank.' };
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Enter an amount above ₹0.' };
  if (amount > 1000000) return { error: 'The demo limit is ₹10,00,000 per payment.' };
  const user = d.users[userId];
  if (amount > user.balance) return { error: 'Not enough demo balance for this payment.' };
  if (user.kyc !== 'verified' && amount > 10000) return { error: 'Until your KYC is verified, payments are limited to ₹10,000.' };
  const { ctx } = fullContext(d, userId, upi, amount);
  const p = lookupPayee(d, userId, upi);
  return { ctx, ...p, needsCheck: needsSafetyCheck(ctx) || p.facts.reported };
}

/** POST /api/risk/assess: score on the "server" side from context, answers and payee facts. */
export function assessPayment({ userId, upi, amount, note, purpose, screening }) {
  const d = db;
  const { ctx } = fullContext(d, userId, upi, amount);
  const facts = factsFor(d.registry, upi);
  return scoreSignals({ ...ctx, screening: screening || {}, purpose, facts, note }, d.policy);
}

/* ---------- member payment lifecycle ---------- */
export function createPayment({ userId, upi, amount, note, purpose, screening, skipped }) {
  return commit((d) => {
    const { ctx, call } = fullContext(d, userId, upi, amount);
    const facts = factsFor(d.registry, upi);
    const assessment = scoreSignals({ ...ctx, screening: screening || {}, purpose, facts, note }, d.policy);
    const p = lookupPayee(d, userId, upi);
    const t = Date.now();
    const tx = {
      id: uid('T'), userId, payeeUpi: upi, payeeName: p.name || upi, amount, note, purpose, createdAt: t,
      status: assessment.tier === 'LOW' ? 'COMPLETED' : 'AWAITING_DECISION', kind: 'assessed',
      screening: screening || null, screeningSkipped: !!skipped, assessment, facts, callId: call?.id || null,
      timeline: [{ t, label: `Risk assessed: ${assessment.score} (${assessment.tier})` }]
    };
    if (tx.status === 'COMPLETED') {
      d.users[userId].balance -= amount;
      tx.timeline.push({ t, label: 'Completed with no extra steps' });
    }
    d.transactions.push(tx);
    log(d, nameOf(d, userId), 'Payment assessed', `${tx.id} · ₹${amount.toLocaleString('en-IN')} → ${tx.payeeName} · ${assessment.score} ${assessment.tier}`);
    return tx;
  });
}

/** POST /api/transactions/{id}/decision */
export function decide(txId, decision) {
  return commit((d) => {
    const tx = d.transactions.find((t) => t.id === txId);
    if (!tx) return null;
    const t = Date.now();
    const label = { CONTINUED: 'Member continued after review', CANCELLED: 'Member cancelled the payment', POSTPONED: 'Member postponed the payment', PENDING_REVIEW: 'Sent to pending review', VERIFIED: 'Member chose to verify independently first' }[decision];
    tx.timeline.push({ t, label });
    tx.decision = decision;
    if (decision === 'CONTINUED') {
      tx.status = 'COMPLETED';
      d.users[tx.userId].balance -= tx.amount;
    } else tx.status = decision === 'VERIFIED' ? 'POSTPONED' : decision;
    log(d, nameOf(d, tx.userId), label, `${tx.id} · ₹${tx.amount.toLocaleString('en-IN')}`);
    return tx;
  });
}

/** POST /api/trusted-contact/request: consent-gated, simulated. */
export function requestTrustedContact(txId, { silent = false } = {}) {
  return commit((d) => {
    const tx = d.transactions.find((t) => t.id === txId);
    const user = d.users[tx.userId];
    const to = user.trustedContactId || user.guardianId;
    if (!to) return null;
    const req = { id: uid('R'), kind: silent ? 'pressure' : 'trusted', fromUserId: tx.userId, toUserId: to, txId, amount: tx.amount, reason: tx.note, status: 'pending', createdAt: Date.now() };
    d.requests.unshift(req);
    tx.status = 'AWAITING_CONTACT';
    tx.timeline.push({ t: Date.now(), label: silent ? 'Discreet pressure button: payment held, trusted contact alerted' : `Trusted contact (${nameOf(d, to)}) asked to review` });
    notify(d, to, { title: silent ? `${user.name.split(' ')[0]} pressed the pressure button` : `${user.name.split(' ')[0]} asked you to check a payment`, body: `₹${tx.amount.toLocaleString('en-IN')} to ${tx.payeeName}`, link: 'alerts' });
    log(d, user.name, silent ? 'Pressure button pressed' : 'Trusted contact requested', `${tx.id} → ${nameOf(d, to)}`);
    return req;
  });
}

/** Pressure button pressed before a payment exists: create a held record so the guardian sees it. */
export function pressureHold({ userId, upi, amount, note }) {
  const tx = commit((d) => {
    const p = lookupPayee(d, userId, upi);
    const t = Date.now();
    const x = { id: uid('T'), userId, payeeUpi: upi || 'not entered', payeeName: p.name || upi || 'Payee not entered', amount: amount || 0, note, createdAt: t, status: 'AWAITING_DECISION', kind: 'assessed', discreet: true, assessment: { score: 100, tier: 'CRITICAL', action: 'STRONG_PAUSE', reasons: [{ code: 'pressure_button', group: 'answers', points: 100, label: 'Discreet pressure button pressed', detail: 'The member asked for help without saying it out loud.' }] }, timeline: [{ t, label: 'Discreet pressure button pressed' }] };
    d.transactions.push(x);
    return x;
  });
  requestTrustedContact(tx.id, { silent: true });
  return tx;
}

export function resolveRequest(reqId, approve, actorId) {
  return commit((d) => {
    const req = d.requests.find((r) => r.id === reqId);
    if (!req || req.status !== 'pending') return null;
    req.status = approve ? 'approved' : 'denied';
    req.resolvedAt = Date.now();
    const actor = nameOf(d, actorId);
    if (req.kind === 'child') {
      const child = d.users[req.fromUserId];
      if (approve) {
        child.balance += req.amount;
        notify(d, req.fromUserId, { title: `${actor.split(' ')[0]} approved your request`, body: `₹${req.amount.toLocaleString('en-IN')} added for ${req.reason}` });
      } else notify(d, req.fromUserId, { title: `${actor.split(' ')[0]} said no this time`, body: `Request for ${req.reason}` });
    } else {
      const tx = d.transactions.find((t) => t.id === req.txId);
      if (tx) {
        if (approve && tx.amount > 0 && tx.payeeUpi !== 'not entered') {
          tx.status = 'COMPLETED';
          d.users[tx.userId].balance -= tx.amount;
          tx.timeline.push({ t: Date.now(), label: `Approved by trusted contact (${actor}) and completed` });
        } else {
          tx.status = 'CANCELLED';
          tx.timeline.push({ t: Date.now(), label: approve ? `Checked by ${actor}; nothing to send` : `Declined by trusted contact (${actor})` });
        }
        notify(d, tx.userId, { title: approve ? `${actor.split(' ')[0]} approved your payment` : `${actor.split(' ')[0]} stopped the payment`, body: `₹${tx.amount.toLocaleString('en-IN')} to ${tx.payeeName}` });
      }
    }
    log(d, actor, approve ? 'Request approved' : 'Request declined', req.id);
    return req;
  });
}

/* ---------- child ---------- */
export function childSpentToday(d, childId) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return d.transactions.filter((t) => t.userId === childId && t.status === 'COMPLETED' && t.createdAt >= start.getTime()).reduce((a, t) => a + t.amount, 0);
}

export function childPay({ childId, upi, amount, note }) {
  const d = db;
  const child = d.users[childId];
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Enter an amount above ₹0.' };
  if (amount > child.balance) return { error: 'You don’t have enough pocket money for this.' };
  const left = child.dailyLimit - childSpentToday(d, childId);
  const facts = factsFor(d.registry, upi);
  const saved = d.beneficiaries.find((b) => b.userId === childId && b.upi === upi);
  const call = activeCallFor(d, childId);
  if (child.approveAll || amount > left || !saved || call) {
    const why = call ? 'Paying during a call with an unknown number' : child.approveAll ? 'Every payment needs approval' : amount > left ? `Above today’s limit (₹${Math.max(0, left)} left)` : 'New payee';
    const req = commit((x) => {
      const r = { id: uid('R'), kind: 'child', callId: call?.id || null, fromUserId: childId, toUserId: child.guardianId, amount, reason: note || 'Payment', payeeUpi: upi, payeeName: saved?.name || x.registry[upi]?.name || upi, why, facts, status: 'pending', createdAt: Date.now(), childPayment: true };
      x.requests.unshift(r);
      notify(x, child.guardianId, { title: `${child.name.split(' ')[0]} needs your OK`, body: `₹${amount.toLocaleString('en-IN')} to ${r.payeeName} · ${why}`, link: 'alerts' });
      log(x, child.name, 'Child payment sent for approval', `${r.id} · ${why}`);
      return r;
    });
    return { pending: req };
  }
  const tx = commit((x) => {
    const t = { id: uid('T'), userId: childId, payeeUpi: upi, payeeName: saved.name, amount, note, createdAt: Date.now(), status: 'COMPLETED', kind: 'child', timeline: [{ t: Date.now(), label: 'Paid within daily limit' }] };
    x.transactions.push(t);
    x.users[childId].balance -= amount;
    return t;
  });
  return { tx };
}

export function childAsk({ childId, amount, reason }) {
  return commit((d) => {
    const child = d.users[childId];
    const r = { id: uid('R'), kind: 'child', fromUserId: childId, toUserId: child.guardianId, amount, reason, status: 'pending', createdAt: Date.now() };
    d.requests.unshift(r);
    notify(d, child.guardianId, { title: `${child.name.split(' ')[0]} asked for pocket money`, body: `₹${amount.toLocaleString('en-IN')} · ${reason}`, link: 'alerts' });
    log(d, child.name, 'Pocket money requested', `${r.id} · ₹${amount}`);
    return r;
  });
}

// Approving a child's *payment* request sends the payment, rather than topping up the balance.
export function resolveChildPayment(reqId, approve, actorId) {
  return commit((d) => {
    const r = d.requests.find((x) => x.id === reqId);
    if (!r || r.status !== 'pending') return null;
    r.status = approve ? 'approved' : 'denied';
    r.resolvedAt = Date.now();
    const child = d.users[r.fromUserId];
    if (approve && child.balance >= r.amount) {
      child.balance -= r.amount;
      d.transactions.push({ id: uid('T'), userId: child.id, payeeUpi: r.payeeUpi, payeeName: r.payeeName, amount: r.amount, note: r.reason, createdAt: Date.now(), status: 'COMPLETED', kind: 'child', timeline: [{ t: Date.now(), label: `Approved by ${nameOf(d, actorId)}` }] });
    }
    notify(d, child.id, { title: approve ? 'Your payment was approved' : 'Your payment was not approved', body: `₹${r.amount.toLocaleString('en-IN')} to ${r.payeeName}` });
    log(d, nameOf(d, actorId), approve ? 'Child payment approved' : 'Child payment declined', r.id);
    return r;
  });
}

export function updateChild(childId, patch, actorId) {
  commit((d) => { Object.assign(d.users[childId], patch); log(d, nameOf(d, actorId), 'Child limits changed', JSON.stringify(patch)); });
}

/* ---------- member settings and KYC ---------- */
export function updateSettings(userId, patch) {
  commit((d) => { d.users[userId].settings = { ...d.users[userId].settings, ...patch }; });
}

export function registerMember({ name, mobile, segment }) {
  return commit((d) => {
    const id = uid('u_');
    d.users[id] = { id, role: 'member', name, mobile, balance: 25000, kyc: 'pending', trustedContactId: null, settings: { pauseHighRisk: true, pressureButton: true, consentTrusted: false }, created: Date.now() };
    const k = { id: `KYC-${2042 + d.kyc.length}`, userId: id, name, segment, submittedAt: Date.now(), status: 'pending', checks: { aadhaar: true, pan: true, liveness: true, nameMatch: 88 + Math.floor(Math.random() * 10) } };
    d.kyc.unshift(k);
    log(d, name, 'KYC submitted', k.id);
    return id;
  });
}

export function setTrustedContact(userId, contactId) {
  commit((d) => { d.users[userId].trustedContactId = contactId; d.users[userId].settings.consentTrusted = !!contactId; });
}

export function markNotificationsRead(userId) {
  commit((d) => d.notifications.forEach((n) => { if (n.userId === userId) n.read = true; }));
}

/* ---------- admin ---------- */
export function reviewKyc(id, status, actorId) {
  commit((d) => {
    const k = d.kyc.find((x) => x.id === id);
    k.status = status;
    k.reviewedAt = Date.now();
    if (k.userId && d.users[k.userId]) {
      d.users[k.userId].kyc = status === 'approved' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending';
      notify(d, k.userId, { title: status === 'approved' ? 'Your KYC is verified' : status === 'rejected' ? 'Your KYC could not be verified' : 'We need one more document', body: status === 'approved' ? 'Payment limits are lifted.' : 'Open the app for details.' });
    }
    log(d, nameOf(d, actorId), `KYC ${status}`, `${k.id} · ${k.name}`);
  });
}

export function adminReview(txId, release, actorId) {
  commit((d) => {
    const tx = d.transactions.find((t) => t.id === txId);
    const actor = nameOf(d, actorId);
    if (release) {
      tx.status = 'COMPLETED';
      if (!tx.seeded && d.users[tx.userId]) d.users[tx.userId].balance -= tx.amount;
      tx.timeline.push({ t: Date.now(), label: `Released by ${actor} after review` });
    } else {
      tx.status = 'CANCELLED';
      tx.timeline.push({ t: Date.now(), label: `Kept stopped by ${actor}; member advised to call 1930` });
    }
    d.requests.filter((r) => r.txId === txId && r.status === 'pending').forEach((r) => { r.status = release ? 'approved' : 'denied'; r.resolvedAt = Date.now(); });
    notify(d, tx.userId, { title: release ? 'Your payment was released' : 'Your payment stayed stopped', body: `₹${tx.amount.toLocaleString('en-IN')} to ${tx.payeeName}` });
    log(d, actor, release ? 'Case released' : 'Case kept stopped', tx.id);
  });
}

export function setPolicy(policy, actorId) {
  commit((d) => { d.policy = policy; log(d, nameOf(d, actorId), 'Policy updated', `Thresholds ${policy.thresholds.medium}/${policy.thresholds.high}/${policy.thresholds.critical}`); });
}

export function toggleReported(upi, actorId) {
  commit((d) => { const r = d.registry[upi]; r.reported = !r.reported; log(d, nameOf(d, actorId), r.reported ? 'Payee marked as reported' : 'Report removed', upi); });
}

export function addRoleplay(row) {
  commit((d) => { d.roleplay.unshift({ id: uid('RP'), t: Date.now(), ...row }); });
}
export function removeRoleplay(id) {
  commit((d) => { d.roleplay = d.roleplay.filter((r) => r.id !== id); });
}

export function resetDemo() {
  commit((d) => { Object.keys(d).forEach((k) => delete d[k]); Object.assign(d, createSeed()); });
}

/* ---------- simulated scam calls (role-play caller phone) ---------- */
export function startCall({ toUserId, scriptId, lateNight }) {
  return commit((d) => {
    d.calls = d.calls || [];
    d.calls.forEach((c) => { if (c.toUserId === toUserId && ['ringing', 'active'].includes(c.status)) { c.status = 'ended'; c.endedAt = Date.now(); } });
    const sc = scriptById(scriptId);
    const c = { id: uid('C'), toUserId, scriptId, lateNight: !!lateNight, status: 'ringing', createdAt: Date.now(), callerId: sc.callerId, transcript: [], messages: [], lineIdx: 0 };
    d.calls.unshift(c);
    log(d, 'Caller (simulation)', 'Simulated scam call started', `${c.id} · ${sc.label} → ${nameOf(d, toUserId)}${lateNight ? ' · late night' : ''}`);
    return c;
  });
}

export function answerCall(id) {
  commit((d) => { const c = d.calls.find((x) => x.id === id); if (c && c.status === 'ringing') { c.status = 'active'; c.answeredAt = Date.now(); } });
}

export function endCall(id, by) {
  commit((d) => {
    const c = d.calls.find((x) => x.id === id);
    if (!c || c.status === 'ended' || c.status === 'declined') return;
    c.status = c.status === 'ringing' && by === 'victim' ? 'declined' : 'ended';
    c.endedAt = Date.now();
    c.endedBy = by;
    log(d, by === 'victim' ? nameOf(d, c.toUserId) : 'Caller (simulation)', c.status === 'declined' ? 'Call declined' : 'Call ended', c.id);
  });
}

export function sayLine(id, text) {
  commit((d) => { const c = d.calls.find((x) => x.id === id); if (c) { c.transcript.push({ t: Date.now(), text }); c.lineIdx += 1; } });
}

export function pushPaymentRequest(id) {
  commit((d) => {
    const c = d.calls.find((x) => x.id === id);
    if (!c) return;
    const p = scriptById(c.scriptId).payment;
    c.messages.push({ id: uid('M'), t: Date.now(), from: c.callerId, ...p, text: `Pay ₹${p.amount.toLocaleString('en-IN')} to ${p.upi} (${p.note}). Do it now and stay on the line.` });
  });
}

/** What happened to the money on this call, for the caller's simulation view and the role-play log. */
export function callOutcome(d, c) {
  const from = c.answeredAt || c.createdAt;
  const until = (c.endedAt || Infinity) + 60e3;
  const txs = d.transactions.filter((t) => t.callId === c.id || (t.userId === c.toUserId && t.kind !== 'history' && t.createdAt >= from && t.createdAt <= until));
  const reqs = d.requests.filter((r) => r.callId === c.id);
  const paid = txs.filter((t) => t.status === 'COMPLETED').reduce((a, t) => a + t.amount, 0) + reqs.filter((r) => r.status === 'approved').reduce((a, r) => a + r.amount, 0);
  const held = txs.some((t) => ['AWAITING_DECISION', 'AWAITING_CONTACT', 'PENDING_REVIEW'].includes(t.status)) || reqs.some((r) => r.status === 'pending');
  const stopped = txs.some((t) => ['CANCELLED', 'POSTPONED'].includes(t.status)) || reqs.some((r) => r.status === 'denied');
  const last = [...txs].sort((a, b) => b.createdAt - a.createdAt)[0];
  const state = paid ? 'paid' : held ? 'held' : stopped ? 'stopped' : c.status === 'declined' ? 'declined' : 'none';
  return { txs, reqs, paid, state, last };
}

export { fillName };
