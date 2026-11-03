// Live sync across devices (phone APK, phone browser, laptop) through a public MQTT relay over secure WebSockets.
// The whole demo state (fictional data, ~30-80 KB) is published as one retained message per room.
// Newest revision wins; the revision counter is logical, so clocks on different devices don't matter.
// Anyone who knows the room name can read that room: never put real personal data in the demo.

export const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
export const DEFAULT_ROOM = 'vslash-vk26';
const CLIENT = Math.random().toString(36).slice(2, 10);

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

/* ---------- status, observable from React ---------- */
let status = { state: 'connecting', room: getRoom(), broker: null, lastSync: null };
const subs = new Set();
const setStatus = (p) => { status = { ...status, ...p }; subs.forEach((f) => f()); };
export const syncStatus = { get: () => status, subscribe: (f) => { subs.add(f); return () => subs.delete(f); } };

let client = null;
let topic = null;
let pending = null;
let timer = null;
let api = null;
let gotRetained = false;

export function clientId() { return CLIENT; }
/** Highest revision seen from the room, so a new local change always outranks it. */
export function seenRev() { return status.remoteRev || 0; }

export async function initSync(hooks) {
  api = hooks; // { getDb, adopt(db), stamp(db) }
  if (typeof window === 'undefined' || !('WebSocket' in window)) { setStatus({ state: 'off' }); return; }
  // Frames inside the demo wall share the parent's connection through BroadcastChannel.
  if (window.top !== window) { setStatus({ state: 'framed' }); return; }
  const room = getRoom();
  topic = `payshield-app/v1/${room}/state`;
  setStatus({ room });
  let mqtt;
  try { const m = await import('mqtt'); mqtt = m.connect ? m : m.default; } catch { setStatus({ state: 'off' }); return; }
  connect(mqtt, 0);
}

function connect(mqtt, i) {
  const url = BROKERS[i % BROKERS.length];
  let opened = false;
  const c = mqtt.connect(url, { clientId: `ps-${CLIENT}-${i}`, connectTimeout: 7000, reconnectPeriod: 4000, clean: true, keepalive: 30 });
  const giveUp = setTimeout(() => { if (!opened) { c.end(true); connect(mqtt, i + 1); } }, 8000);
  c.on('connect', () => {
    opened = true; clearTimeout(giveUp); client = c;
    setStatus({ state: 'live', broker: new URL(url).hostname });
    gotRetained = false;
    c.subscribe(topic, { qos: 1 }, () => {
      // If the room is empty, or we changed things while offline, publish ours.
      setTimeout(() => { const d = api.getDb(); if (!gotRetained || (d.rev || 0) > (status.remoteRev || 0)) publish(d, true); }, 1800);
    });
  });
  c.on('message', (_t, buf) => {
    if (!buf?.length) return;
    let msg;
    try { msg = JSON.parse(new TextDecoder().decode(buf)); } catch { return; }
    gotRetained = true;
    setStatus({ remoteRev: Math.max(status.remoteRev || 0, msg.db?.rev || 0), lastSync: Date.now() });
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
  const go = () => {
    if (!client?.connected || !pending) return;
    const payload = JSON.stringify({ v: 1, from: CLIENT, at: Date.now(), db: pending });
    client.publish(topic, payload, { qos: 1, retain: true });
    setStatus({ lastSync: Date.now(), remoteRev: Math.max(status.remoteRev || 0, pending.rev || 0) });
    pending = null;
  };
  if (now) go(); else timer = setTimeout(go, 120);
}
