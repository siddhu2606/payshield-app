// Live sync across devices (phone APK, phone browser, laptop) through a public MQTT relay over secure WebSockets.
// The whole demo state (fictional data) is published as one retained message per room, end-to-end encrypted with
// a key derived from the room name (see crypto.js). The broker sees only a hashed topic and ciphertext.
// Newest revision wins; the revision counter is logical, so clocks on different devices don't matter.
import { roomKey, roomTopicId, seal, open } from './crypto.js';
import { validRemoteDb } from './validate.js';

export const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
export const DEFAULT_ROOM = 'vslash-vk26';
const CLIENT = Math.random().toString(36).slice(2, 10);
const MAX_BYTES = 900 * 1024;

/** Pure decision used by sync and by the tests: should this device replace its state with the remote one? */
export function shouldAdopt(local, remote) {
  if (!remote || typeof remote.rev !== 'number') return false;
  const lr = local?.rev || 0;
  if (lr === 0) return true; // untouched local seed: always take the room's state
  if (remote.rev !== lr) return remote.rev > lr;
  return (remote.revBy || '') > (local.revBy || '');
}

export function getRoom() {
  try {
    const fromUrl = new URLSearchParams(location.hash.split('?')[1] || '').get('room') || new URLSearchParams(location.search).get('room');
    if (fromUrl) { localStorage.setItem('ps.room', clean(fromUrl)); return clean(fromUrl); }
    return localStorage.getItem('ps.room') || DEFAULT_ROOM;
  } catch { return DEFAULT_ROOM; }
}
export const clean = (r) => String(r).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32) || DEFAULT_ROOM;
export function setRoom(r) { try { localStorage.setItem('ps.room', clean(r)); } catch { /* ignore */ } location.reload(); }

// Local testing only: point a page served from localhost at a local broker with ?broker=ws://localhost:PORT
// Read once at start-up, before the app changes the URL.
function readBrokers() {
  try {
    const b = new URLSearchParams(location.hash.split('?')[1] || '').get('broker') || new URLSearchParams(location.search).get('broker');
    if (b && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /^wss?:\/\/(localhost|127\.0\.0\.1):\d+/.test(b)) return [b];
  } catch { /* ignore */ }
  return BROKERS;
}
const BROKER_LIST = typeof location !== 'undefined' ? readBrokers() : BROKERS;
const brokers = () => BROKER_LIST;

/* ---------- status, observable from React ---------- */
let status = { state: 'connecting', room: getRoom(), broker: null, lastSync: null, encrypted: true, relay: null };
const subs = new Set();
const setStatus = (p) => { status = { ...status, ...p }; subs.forEach((f) => f()); };
export const syncStatus = { get: () => status, subscribe: (f) => { subs.add(f); return () => subs.delete(f); } };

let client = null;
let topics = null;
let key = null;
let pending = null;
let timer = null;
let api = null;
let gotRetained = false;

export function clientId() { return CLIENT; }
/** Highest revision seen from the room, so a new local change always outranks it. */
export function seenRev() { return status.remoteRev || 0; }
/** Is the laptop SMS relay online for this room? */
export function relayOnline() { const r = status.relay; return !!(r && r.online); }

export async function initSync(hooks) {
  api = hooks; // { getDb, adopt(db) }
  if (typeof window === 'undefined' || !('WebSocket' in window) || !globalThis.crypto?.subtle) { setStatus({ state: 'off' }); return; }
  // Frames inside the demo wall share the parent's connection through BroadcastChannel.
  if (window.top !== window) { setStatus({ state: 'framed' }); return; }
  const room = getRoom();
  setStatus({ room });
  try {
    const id = await roomTopicId(room);
    topics = { state: `payshield-app/v2/${id}/state`, relay: `payshield-app/v2/${id}/relay` };
    key = await roomKey(room);
  } catch { setStatus({ state: 'off' }); return; }
  let mqtt;
  try { const m = await import('mqtt'); mqtt = m.connect ? m : m.default; } catch { setStatus({ state: 'off' }); return; }
  connect(mqtt, 0);
}

function connect(mqtt, i) {
  const list = brokers();
  const url = list[i % list.length];
  let opened = false;
  const c = mqtt.connect(url, { clientId: `ps-${CLIENT}-${i}`, connectTimeout: 7000, reconnectPeriod: 4000, clean: true, keepalive: 30 });
  const giveUp = setTimeout(() => { if (!opened) { c.end(true); connect(mqtt, i + 1); } }, 8000);
  c.on('connect', () => {
    opened = true; clearTimeout(giveUp); client = c;
    setStatus({ state: 'live', broker: new URL(url).hostname });
    gotRetained = false;
    c.subscribe([topics.state, topics.relay], { qos: 1 }, () => {
      // If the room is empty, or we changed things while offline, publish ours.
      setTimeout(() => { const d = api.getDb(); if (!gotRetained || (d.rev || 0) > (status.remoteRev || 0)) publish(d, true); }, 1800);
    });
  });
  c.on('message', async (t, buf) => {
    if (!buf?.length || buf.length > MAX_BYTES) return;
    const msg = await open(key, new TextDecoder().decode(buf));
    if (!msg) return; // not ours, tampered, or another room
    if (t === topics.relay) { setStatus({ relay: { online: !!msg.online, provider: ['Fast2SMS', 'Twilio'].includes(msg.provider) ? msg.provider : 'SMS', mode: msg.mode, sentToday: msg.sentToday, cap: msg.cap, at: msg.at } }); return; }
    gotRetained = true;
    if (!validRemoteDb(msg.db)) return;
    setStatus({ remoteRev: Math.max(status.remoteRev || 0, msg.db.rev || 0), lastSync: Date.now() });
    if (msg.from === CLIENT) return;
    if (shouldAdopt(api.getDb(), msg.db)) api.adopt(msg.db);
  });
  c.on('offline', () => setStatus({ state: 'offline' }));
  c.on('reconnect', () => setStatus({ state: 'connecting' }));
  c.on('error', () => setStatus({ state: 'offline' }));
}

/** Called after every local change. Debounced so a burst of changes goes out as one message. */
export function publish(db, now = false) {
  pending = db;
  clearTimeout(timer);
  const go = async () => {
    if (!client?.connected || !pending || !key) return;
    const snap = pending;
    pending = null;
    const payload = await seal(key, { from: CLIENT, at: Date.now(), db: snap });
    if (payload.length > MAX_BYTES) return;
    client.publish(topics.state, payload, { qos: 1, retain: true });
    setStatus({ lastSync: Date.now(), remoteRev: Math.max(status.remoteRev || 0, snap.rev || 0) });
  };
  if (now) go(); else timer = setTimeout(go, 120);
}
