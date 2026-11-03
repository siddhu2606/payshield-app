// End-to-end encryption for live sync. The relay (a public MQTT broker) only ever sees an opaque topic and
// AES-256-GCM ciphertext. The key is derived from the room name with PBKDF2, so only devices that know the room
// can read or write it, and any tampered message fails the GCM check and is dropped.
// Works in browsers and in Node 20+ (globalThis.crypto).

const enc = new TextEncoder();
const dec = new TextDecoder();
const SALT = enc.encode('payshield-app/v2/room-key');
const subtle = () => globalThis.crypto.subtle;

const b64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function sha256hex(text) {
  const h = await subtle().digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Topic id for a room: a hash, so the room name itself is never sent to the broker. */
export async function roomTopicId(room) {
  return (await sha256hex(`payshield-topic:${room}`)).slice(0, 24);
}

export async function roomKey(room) {
  const base = await subtle().importKey('raw', enc.encode(`payshield-room:${room}`), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', salt: SALT, iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function seal(key, obj) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return JSON.stringify({ v: 2, iv: b64(iv), ct: b64(ct) });
}

/** Returns the decrypted object, or null if the message is malformed, tampered or for another room. */
export async function open(key, text) {
  try {
    const m = JSON.parse(text);
    if (m?.v !== 2 || typeof m.iv !== 'string' || typeof m.ct !== 'string') return null;
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: unb64(m.iv) }, key, unb64(m.ct));
    return JSON.parse(dec.decode(pt));
  } catch {
    return null;
  }
}
