// Input validation and sanitising, used by every write in store.js (the "server side" of this prototype)
// and by the forms. React already escapes everything it renders; this keeps stored data clean and bounded.

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g; // control and bidi-override characters

/** Trim, strip control characters, collapse whitespace and cap the length. */
export function cleanText(v, max = 80) {
  return String(v ?? '').replace(CONTROL, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const UPI_RE = /^[a-z0-9._-]{2,64}@[a-z][a-z0-9]{1,31}$/;
export function cleanUpi(v) {
  const u = String(v ?? '').trim().toLowerCase();
  return UPI_RE.test(u) ? u : null;
}

/** Whole rupees between 1 and the cap. Returns null when invalid. */
export function cleanAmount(v, cap = 1000000) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= 1 && r <= cap ? r : null;
}

export function cleanName(v) {
  const s = cleanText(v, 60).replace(/[^\p{L}\p{M} .'-]/gu, '');
  return s.length >= 2 ? s : null;
}

export function cleanMobile(v) {
  const d = String(v ?? '').replace(/\D/g, '');
  return d.length >= 10 && d.length <= 13 ? d : null;
}

export const isPin = (v) => /^\d{4}$/.test(String(v ?? ''));
export const isCode = (v) => /^[A-Z0-9]{4,8}$/.test(String(v ?? ''));

/**
 * Shape check for state arriving from another device. Anything that doesn't look like PayShield state, or is
 * oversized, is rejected before it can reach the UI.
 */
export function validRemoteDb(d) {
  if (!d || typeof d !== 'object') return false;
  if (d.version !== 5 || typeof d.rev !== 'number') return false;
  if (!d.users || typeof d.users !== 'object' || !d.registry || typeof d.registry !== 'object') return false;
  for (const k of ['transactions', 'requests', 'kyc', 'notifications', 'audit']) if (!Array.isArray(d[k])) return false;
  if (d.transactions.length > 2000 || Object.keys(d.users).length > 500) return false;
  return true;
}
