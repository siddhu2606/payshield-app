// Shared state for every PayShield screen.
// Stored in localStorage, broadcast between tabs and frames in the same browser, and synced across devices
// (phone APK, phone browser, laptop) through a relay room — see sync.js. It is the stand-in for the
// FastAPI + PostgreSQL backend in the plan: the functions below mirror its API contract.
import { useSyncExternalStore } from 'react';
import { createSeed, factsFor, muleRings } from './data.js';
import { contextSignals, scoreSignals, needsSafetyCheck } from './risk.js';
import { scriptById, fillName, smsLink } from './calls.js';
import { initSync, publish, getRoom, clientId, seenRev } from './sync.js';
import { getDeviceCall } from './device.js';
import { scanMessage } from './scan.js';
import { cleanText, cleanUpi, cleanAmount, cleanName, cleanMobile, validRemoteDb, isPin } from './validate.js';
import { hashPin } from './auth.js';

const ROOM = getRoom();
const KEY = `payshield.db.v5.${ROOM}`;
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('payshield') : null;
const listeners = new Set();
let db = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 5) return parsed;
    }
  } catch { /* storage unavailable: fall through to a fresh seed */ }
  const fresh = createSeed();
  persist(fresh);
  return fresh;
}

function persist(next) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: keep in memory */ }
}

/* ---------- daily backups: one snapshot per day on this device, last 7 kept ---------- */
const BK = `payshield.backup.${ROOM}.`;
function dailyBackup() {
  try {
    const day = new Date().toISOString().slice(0, 10);
    if (!localStorage.getItem(BK + day)) localStorage.setItem(BK + day, JSON.stringify(db));
    Object.keys(localStorage).filter((k) => k.startsWith(BK)).sort().reverse().slice(7).forEach((k) => localStorage.removeItem(k));
  } catch { /* storage full or blocked: skip */ }
}
export function listBackups() {
  try { return Object.keys(localStorage).filter((k) => k.startsWith(BK)).sort().reverse().map((k) => ({ day: k.slice(BK.length), bytes: localStorage.getItem(k).length })); } catch { return []; }
}
export function exportState() { return JSON.stringify(db, null, 1); }
/** Restore a backup (a daily snapshot on this device or an exported file). Rejected unless it validates. */
export function restoreState(raw, actorId = 'a_meera') {
  let d;
  try { d = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return false; }
  if (!d || typeof d !== 'object') return false;
  const candidate = { ...d, rev: typeof d.rev === 'number' ? d.rev : 0 };
  if (!validRemoteDb(candidate)) return false;
  commit((x) => { Object.keys(x).forEach((k) => delete x[k]); Object.assign(x, candidate); log(x, nameOf(x, actorId), 'Backup restored', `${candidate.transactions.length} payments`); });
  return true;
}
export function restoreBackup(day, actorId) { try { return restoreState(localStorage.getItem(BK + day), actorId); } catch { return false; } }

function emit() { listeners.forEach((l) => l()); }

function commit(mutator) {
  const prevRev = db.rev || 0;
  const next = structuredClone(db);
  const out = mutator(next);
  // Logical revision for cross-device "newest wins"; keep the synced payload small.
  next.rev = Math.max(prevRev, seenRev()) + 1;
  next.revBy = clientId();
  if (next.audit?.length > 150) next.audit.length = 150;
  if (next.notifications?.length > 80) next.notifications.length = 80;
  if (next.calls?.length > 40) next.calls.length = 40;
  if (next.messages?.length > 60) next.messages.length = 60;
  db = next;
  persist(db);
  channel?.postMessage({ type: 'sync' });
  emit();
  publish(db);
  return out;
}

// State that arrived from another device (already decrypted and shape-checked by sync.js).
function adoptRemote(remote) {
  if (!validRemoteDb(remote)) return;
  db = remote;
  persist(db);
  channel?.postMessage({ type: 'sync' });
  emit();
}
initSync({ getDb: () => db, adopt: adoptRemote });
dailyBackup();

function reloadFromStorage() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const next = JSON.parse(raw);
      if (next?.version !== 5) return;
      db = next;
      emit();
      // A frame (demo wall) changed state: the top-level window carries it to other devices.
      if (typeof window !== 'undefined' && window.top === window) publish(db);
    }
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

// Context = payment history + consented call state (real on the Android app, simulated from the role-play caller
// phone) + where the payment came from. Never call audio, numbers or message content.
function fullContext(d, userId, upi, amount, source) {
  const ctx = contextSignals({ history: historyOf(d, userId), payeeUpi: upi, amount, policy: d.policy });
  const call = activeCallFor(d, userId);
  const useCall = d.users[userId]?.settings?.callState !== false;
  const real = getDeviceCall();
  if (useCall && real.supported && real.onCall) { ctx.active_call = true; ctx.callKind = real.kind; }
  else if (call && useCall) { ctx.active_call = true; ctx.callKind = 'simulated'; }
  if (call && useCall && call.lateNight) ctx.unusual_hour = true;
  if (useCall && real.supported && real.screenShared) ctx.screen_shared = true;
  const msg = source?.msgId && (d.messages || []).find((m) => m.id === source.msgId);
  if (msg) { ctx.from_message = true; ctx.messageFrom = msg.from; }
  return { ctx, call, msg };
}

export function lookupPayee(d, userId, upi) {
  const saved = d.beneficiaries.find((b) => b.userId === userId && b.upi === upi);
  const facts = factsFor(d.registry, upi);
  return { saved, facts, name: saved?.name || d.registry[upi]?.name || null };
}

/** POST /api/transactions/initiate: validate and load context before anything is shown to the user. */
export function previewPayment(userId, rawUpi, rawAmount, source) {
  const d = db;
  const upi = cleanUpi(rawUpi);
  if (!upi) return { error: 'Enter a UPI ID like name@bank.' };
  const amount = cleanAmount(rawAmount, 1e9);
  if (!amount) return { error: 'Enter an amount above ₹0.' };
  if (amount > 1000000) return { error: 'The demo limit is ₹10,00,000 per payment.' };
  const user = d.users[userId];
  if (amount > user.balance) return { error: 'Not enough demo balance for this payment.' };
  if (user.kyc !== 'verified' && amount > 10000) return { error: 'Until your KYC is verified, payments are limited to ₹10,000.' };
  const { ctx } = fullContext(d, userId, upi, amount, source);
  const p = lookupPayee(d, userId, upi);
  return { ctx, ...p, needsCheck: needsSafetyCheck(ctx) || p.facts.reported || !!p.facts.linkedReported?.length };
}

/** POST /api/risk/assess: score on the "server" side from context, answers and payee facts. */
export function assessPayment({ userId, upi, amount, note, purpose, screening }) {
  const d = db;
  const { ctx } = fullContext(d, userId, upi, amount);
  const facts = factsFor(d.registry, upi);
  return scoreSignals({ ...ctx, screening: screening || {}, purpose, facts, note }, d.policy);
}

/* ---------- member payment lifecycle ---------- */
export function createPayment({ userId, upi: rawUpi, amount: rawAmount, note: rawNote, purpose, screening, skipped, source }) {
  // Re-validate on the "server" side: never trust what the form sent.
  const upi = cleanUpi(rawUpi);
  const amount = cleanAmount(rawAmount);
  const note = cleanText(rawNote, 60);
  if (!upi || !amount || !db.users[userId]) throw new Error('Invalid payment');
  return commit((d) => {
    const { ctx, call, msg } = fullContext(d, userId, upi, amount, source);
    const facts = factsFor(d.registry, upi);
    const assessment = scoreSignals({ ...ctx, screening: screening || {}, purpose, facts, note }, d.policy);
    const p = lookupPayee(d, userId, upi);
    const t = Date.now();
    const tx = {
      id: uid('T'), userId, payeeUpi: upi, payeeName: p.name || upi, amount, note, purpose, createdAt: t,
      status: assessment.tier === 'LOW' ? 'COMPLETED' : 'AWAITING_DECISION', kind: 'assessed',
      screening: screening || null, screeningSkipped: !!skipped, assessment, facts, callId: call?.id || null, msgId: msg?.id || null,
      source: msg ? 'sms_link' : ctx.callKind && ctx.callKind !== 'simulated' ? 'real_call' : 'typed',
      timeline: [{ t, label: `Risk assessed: ${assessment.score} (${assessment.tier})` }]
    };
    if (tx.status === 'COMPLETED') {
      d.users[userId].balance -= amount;
      tx.timeline.push({ t, label: 'Completed with no extra steps' });
    }
    d.transactions.push(tx);
    if (msg) msg.paymentTxId = tx.id;
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
        if (!approve) lockPhone(d, tx.userId, actorId, `${actor.split(' ')[0]} stopped a ${tx.amount > 0 ? `₹${tx.amount.toLocaleString('en-IN')} ` : ''}payment`);
      }
    }
    log(d, actor, approve ? 'Request approved' : 'Request declined', req.id);
    return req;
  });
}

/* ---------- phone lock ---------- */
export const LOCK_COOLOFF_MS = 60e3;

// Called inside a commit. Cuts any live call and locks the phone so nothing can be read or paid from it.
function lockPhone(d, userId, byId, reason) {
  const u = d.users[userId];
  if (!u) return;
  const t = Date.now();
  (d.calls || []).forEach((c) => {
    if (c.toUserId === userId && ['ringing', 'active'].includes(c.status)) { c.status = 'ended'; c.endedAt = t; c.endedBy = 'payshield'; }
  });
  u.lock = { at: t, by: byId, reason, until: t + LOCK_COOLOFF_MS };
  d.transactions.filter((x) => x.userId === userId && x.status === 'AWAITING_DECISION').forEach((x) => { x.status = 'CANCELLED'; x.timeline?.push({ t, label: 'Cancelled when the phone was locked' }); });
  notify(d, byId, { title: `${u.name.split(' ')[0]}’s phone is locked`, body: 'Any call was cut. You can unlock it from Family.', link: 'family' });
  log(d, 'PayShield', 'Phone locked', `${u.name} · ${reason} · call ended`);
}

export function unlockPhone(userId, byId, method) {
  commit((d) => {
    const u = d.users[userId];
    if (!u?.lock) return;
    const by = nameOf(d, byId);
    delete u.lock;
    notify(d, userId, { title: method === 'guardian' ? `${by.split(' ')[0]} unlocked your phone` : 'Phone unlocked', body: 'If someone calls again asking for money, hang up and call 1930.' });
    log(d, by, 'Phone unlocked', `${u.name} · ${method === 'guardian' ? 'by guardian' : 'passcode after cool-off'}`);
  });
}

/* ---------- child ---------- */
export function childSpentToday(d, childId) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return d.transactions.filter((t) => t.userId === childId && t.status === 'COMPLETED' && t.createdAt >= start.getTime()).reduce((a, t) => a + t.amount, 0);
}

export function childPay({ childId, upi: rawUpi, amount: rawAmount, note: rawNote, source }) {
  const d = db;
  const child = d.users[childId];
  const upi = cleanUpi(rawUpi);
  const amount = cleanAmount(rawAmount, 100000);
  const note = cleanText(rawNote, 60);
  if (!upi) return { error: 'Enter a UPI ID like name@bank.' };
  if (!amount) return { error: 'Enter an amount above ₹0.' };
  if (amount > child.balance) return { error: 'You don’t have enough pocket money for this.' };
  const left = child.dailyLimit - childSpentToday(d, childId);
  const facts = factsFor(d.registry, upi);
  const saved = d.beneficiaries.find((b) => b.userId === childId && b.upi === upi);
  const call = activeCallFor(d, childId);
  const real = getDeviceCall();
  const onCall = call || (real.supported && real.onCall);
  const msg = source?.msgId && (d.messages || []).find((m) => m.id === source.msgId);
  if (child.approveAll || amount > left || !saved || onCall || msg) {
    const why = msg ? `Opened from a link in a message from ${msg.from}` : onCall ? 'Paying during a call with an unknown number' : child.approveAll ? 'Every payment needs approval' : amount > left ? `Above today’s limit (₹${Math.max(0, left)} left)` : 'New payee';
    const req = commit((x) => {
      const r = { id: uid('R'), kind: 'child', callId: call?.id || null, msgId: msg?.id || null, fromUserId: childId, toUserId: child.guardianId, amount, reason: note || 'Payment', payeeUpi: upi, payeeName: saved?.name || x.registry[upi]?.name || upi, why, facts, status: 'pending', createdAt: Date.now(), childPayment: true };
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

export function childAsk({ childId, amount: rawAmount, reason: rawReason }) {
  const amount = cleanAmount(rawAmount, 100000);
  const reason = cleanText(rawReason, 40) || 'Pocket money';
  if (!amount) return null;
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
    if (!approve) lockPhone(d, child.id, actorId, `${nameOf(d, actorId).split(' ')[0]} stopped a ₹${r.amount.toLocaleString('en-IN')} payment`);
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

export function registerMember({ name: rawName, mobile: rawMobile, segment: rawSegment, pin }) {
  const name = cleanName(rawName);
  const mobile = cleanMobile(rawMobile);
  const segment = ['Salaried', 'Student', 'Business', 'Retired'].includes(rawSegment) ? rawSegment : 'Salaried';
  if (!name || !mobile || !isPin(pin)) throw new Error('Invalid registration');
  const pinHash = hashPin(pin);
  return commit((d) => {
    const id = uid('u_');
    d.users[id] = { id, role: 'member', name, mobile: `+${mobile.length > 10 ? mobile.slice(0, mobile.length - 10) : '91'} ${mobile.slice(-10, -8)}••• •${mobile.slice(-4)}`, pinHash, balance: 25000, kyc: 'pending', trustedContactId: null, settings: { pauseHighRisk: true, pressureButton: true, consentTrusted: false }, created: Date.now() };
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

/* ---------- mule rings (admin) ---------- */
export { muleRings };
/** Act on every account in a ring at once: report, freeze inbound credit (lien), or file a case. Simulated. */
export function ringAction(ringId, action, actorId) {
  return commit((d) => {
    const ring = muleRings(d.registry).find((r) => r.id === ringId);
    if (!ring) return null;
    const actor = nameOf(d, actorId);
    const upis = ring.members.map((m) => m.upi);
    const t = Date.now();
    d.cases = d.cases || [];
    if (action === 'report') upis.forEach((u) => { d.registry[u].reported = true; });
    if (action === 'freeze') upis.forEach((u) => { d.registry[u].frozen = true; d.registry[u].reported = true; });
    if (action === 'unfreeze') upis.forEach((u) => { d.registry[u].frozen = false; });
    if (action === 'str' || action === 'i4c') {
      const victims = d.transactions.filter((x) => upis.includes(x.payeeUpi) && x.kind === 'assessed');
      d.cases.unshift({
        id: uid(action === 'str' ? 'STR-' : 'I4C-'), type: action, ringId, t, by: actor, accounts: upis, devices: ring.devices, phones: ring.phones,
        attempts: victims.length, amount: victims.reduce((a, x) => a + x.amount, 0), stopped: victims.filter((x) => x.status !== 'COMPLETED').length
      });
    }
    const label = { report: 'Ring reported', freeze: 'Ring frozen (lien on inbound credits)', unfreeze: 'Ring unfrozen', str: 'STR drafted for FIU-IND', i4c: 'Shared with cyber-crime suspect registry' }[action];
    log(d, actor, label, `${ringId} · ${upis.length} accounts`);
    return label;
  });
}

export function toggleReported(upi, actorId) {
  commit((d) => { const r = d.registry[upi]; r.reported = !r.reported; log(d, nameOf(d, actorId), r.reported ? 'Payee marked as reported' : 'Report removed', upi); });
}

export function addRoleplay(row) {
  const fix = {};
  Object.entries(row).forEach(([k, v]) => { fix[k] = typeof v === 'string' ? cleanText(v, 140) : typeof v === 'number' ? Math.max(0, Math.min(36000, v)) : v; });
  commit((d) => { d.roleplay.unshift({ id: uid('RP'), t: Date.now(), ...fix }); });
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
    const locked = !!d.users[toUserId]?.lock;
    const c = { id: uid('C'), toUserId, scriptId, lateNight: !!lateNight, status: locked ? 'ended' : 'ringing', endedBy: locked ? 'payshield' : undefined, endedAt: locked ? Date.now() : undefined, blocked: locked, createdAt: Date.now(), callerId: sc.callerId, transcript: [], messages: [], lineIdx: 0 };
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

/* ---------- scam SMS with a payment link (role-play caller phone) ---------- */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(6)), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');

/** Send the script's scam SMS to the demo member or child. `real` also asks the laptop relay to send it as a real SMS (Fast2SMS or Twilio). */
export function sendScamSms({ toUserId, scriptId, real }) {
  return commit((d) => {
    d.messages = d.messages || [];
    const sc = scriptById(scriptId);
    if (!sc?.sms || !d.users[toUserId]) return null;
    const code = newCode();
    const link = smsLink(code, ROOM);
    const text = sc.sms.text.replace('{link}', link);
    const scan = scanMessage(text, { from: sc.sms.from, registry: d.registry });
    const m = { id: uid('M'), code, toUserId, scriptId, from: sc.sms.from, text, link, payment: { ...sc.payment }, t: Date.now(), read: false, scan: { score: scan.score, verdict: scan.verdict }, real: real ? { status: 'queued', at: Date.now() } : null };
    d.messages.unshift(m);
    log(d, 'Caller (simulation)', real ? 'Scam SMS sent (real SMS requested)' : 'Scam SMS sent', `${m.id} · ${sc.label} → ${nameOf(d, toUserId)} · scan ${scan.score}`);
    return m;
  });
}
export function markMessageRead(id) {
  commit((d) => { const m = (d.messages || []).find((x) => x.id === id); if (m && !m.read) m.read = true; });
}
/** The person tapped the link in the message (in the demo inbox or a real SMS). */
export function linkOpened(code, userId) {
  return commit((d) => {
    const m = (d.messages || []).find((x) => x.code === code);
    if (!m) return null;
    if (!m.openedAt) { m.openedAt = Date.now(); m.openedBy = userId; m.read = true; log(d, nameOf(d, userId), 'Payment link opened', `${m.id} · PayShield intercepted`); }
    return m;
  });
}
export const messageByCode = (d, code) => (d.messages || []).find((x) => x.code === code) || null;

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
  const state = paid ? 'paid' : c.blocked ? 'blocked' : c.endedBy === 'payshield' ? 'locked' : held ? 'held' : stopped ? 'stopped' : c.status === 'declined' ? 'declined' : 'none';
  return { txs, reqs, paid, state, last };
}

export { fillName };
