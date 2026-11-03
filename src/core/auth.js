// Sign-in for the phones and the admin console.
// Passcodes and the admin password are stored only as bcrypt hashes (cost 10) and checked with bcrypt.compare.
// Repeated wrong attempts are rate limited with an escalating lock-out.
// This is a static prototype, so these checks run on the device; in production the same rules run on the
// bank's server behind its API gateway (see SECURITY.md).
import bcrypt from 'bcryptjs';

/** bcrypt hash of the demo passcode 1234 (printed on screen for judges; never stored in plain text). */
export const DEMO_PIN_HASH = '$2b$10$Bz1esIQzgfI/m/OvQ2VvyumkTdEfM8sa2tsiK.P3/RNq9291./2uS';
/** bcrypt hash of the demo staff password. */
const ADMIN = { staffId: 'RISK-2291', userId: 'a_meera', hash: '$2b$10$RLT5kCAzl4tdtrCkMlczJOnSbnOVJ71gZ/7.bT7DZ2S6S8Is1MZiK', mfa: '246810' };

export const hashPin = (pin) => bcrypt.hashSync(String(pin), 10);
export const checkPin = (pin, hash) => bcrypt.compare(String(pin), hash || DEMO_PIN_HASH);

/* ---------- rate limiting: 5 free attempts, then 30 s, doubling up to 15 min ---------- */
const LK = (k) => `ps.gate.${k}`;
const read = (k) => { try { return JSON.parse(localStorage.getItem(LK(k)) || '{}'); } catch { return {}; } };
const write = (k, v) => { try { localStorage.setItem(LK(k), JSON.stringify(v)); } catch { /* ignore */ } };

export function gate(k) {
  const g = read(k);
  const wait = (g.until || 0) - Date.now();
  return wait > 0 ? { ok: false, waitMs: wait } : { ok: true, left: Math.max(0, 5 - (g.fails || 0)) };
}
export function fail(k) {
  const g = read(k);
  const fails = (g.fails || 0) + 1;
  const until = fails >= 5 ? Date.now() + Math.min(15 * 60e3, 30e3 * 2 ** (fails - 5)) : 0;
  write(k, { fails, until });
  return gate(k);
}
export function succeed(k) { write(k, {}); }

/* ---------- admin ---------- */
export async function checkAdminPassword(staffId, password) {
  if (String(staffId).trim().toUpperCase() !== ADMIN.staffId) { await bcrypt.compare('x', ADMIN.hash); return false; } // same timing either way
  return bcrypt.compare(String(password), ADMIN.hash);
}
export const checkMfa = (code) => String(code) === ADMIN.mfa;

const AKEY = 'ps.admin.session';
const IDLE_MS = 20 * 60e3;
export function adminSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(AKEY) || 'null');
    if (!s || s.role !== 'admin' || Date.now() > s.exp) { sessionStorage.removeItem(AKEY); return null; }
    return s;
  } catch { return null; }
}
export function startAdminSession() {
  const s = { userId: ADMIN.userId, role: 'admin', exp: Date.now() + IDLE_MS };
  try { sessionStorage.setItem(AKEY, JSON.stringify(s)); localStorage.removeItem(AKEY); } catch { /* ignore */ }
  return s;
}
export function touchAdminSession() {
  const s = adminSession();
  if (s) { s.exp = Date.now() + IDLE_MS; try { sessionStorage.setItem(AKEY, JSON.stringify(s)); } catch { /* ignore */ } }
  return s;
}
export function endAdminSession() { try { sessionStorage.removeItem(AKEY); localStorage.removeItem(AKEY); } catch { /* ignore */ } }
