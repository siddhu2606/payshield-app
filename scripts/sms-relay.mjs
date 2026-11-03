#!/usr/bin/env node
// PayShield SMS relay: turns "Send as a real SMS" on the scam-caller phone into a real text message via Twilio.
//
// Why a relay: the website and APK are public, so the Twilio token can never be in them. This small script runs on
// the team laptop, reads the token from .env (git-ignored), joins the same encrypted sync room as the phones and
// sends only what it is allowed to send.
//
// Safety rails (Twilio trial has a small daily allowance, so nothing is wasted):
//  - DRY RUN by default. Nothing is sent unless SMS_LIVE=1 in .env.
//  - Daily cap (SMS_DAILY_CAP, default 5) and a minimum gap between texts (SMS_MIN_GAP_SEC, default 20).
//  - Each message is sent at most once (ledger in .sms-relay.json), even if the relay restarts.
//  - Recipients come only from .env (SMS_TO_u_aarav, SMS_TO_c_anaya). Phone numbers never enter the shared state.
//  - The text is rebuilt here from the fixed script and a validated link code, so nobody in the room can make the
//    relay send arbitrary text.
//
// Usage:  npm run sms-relay            (dry run unless SMS_LIVE=1)
//         npm run sms-relay -- --check (check config and show the exact texts, then exit; sends nothing)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import mqtt from 'mqtt';
import { roomKey, roomTopicId, seal, open } from '../src/core/crypto.js';
import { SCRIPTS, smsLink } from '../src/core/calls.js';
import { validRemoteDb } from '../src/core/validate.js';

/* ---------- config ---------- */
function loadEnv(file = '.env') {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_a-z]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();
const E = process.env;
const ROOM = (E.ROOM || 'vslash-vk26').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
const LIVE = E.SMS_LIVE === '1';
const CAP = Math.max(0, Math.min(50, Number(E.SMS_DAILY_CAP || 5)));
const GAP = Math.max(5, Number(E.SMS_MIN_GAP_SEC || 20)) * 1000;
const BROKERS = E.SYNC_BROKER ? [E.SYNC_BROKER] : ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
const TRIAL_PREFIX = 'Sent from your Twilio trial account - ';
const E164 = /^\+[1-9]\d{7,14}$/;
const recipients = Object.fromEntries(Object.entries(E).filter(([k, v]) => k.startsWith('SMS_TO_') && E164.test(v)).map(([k, v]) => [k.slice(7), v]));
const mask = (n) => (n ? `${n.slice(0, 3)}••••••${n.slice(-3)}` : 'none');
const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);

/** The exact text the relay sends for a message: fixed script text + validated link code. */
export function bodyFor(scriptId, code) {
  const sc = SCRIPTS.find((s) => s.id === scriptId);
  if (!sc?.sms || !/^[A-Z2-9]{6}$/.test(code || '')) return null;
  return sc.sms.text.replace('{link}', smsLink(code, ROOM));
}
const segments = (t) => (/^[\x20-\x7E\n]*$/.test(t) ? Math.ceil(t.length / (t.length > 160 ? 153 : 160)) : Math.ceil(t.length / (t.length > 70 ? 67 : 70)));

function configProblems() {
  const p = [];
  if (!/^AC[0-9a-f]{32}$/.test(E.TWILIO_ACCOUNT_SID || '')) p.push('TWILIO_ACCOUNT_SID missing or malformed');
  if (!/^[0-9a-f]{32}$/.test(E.TWILIO_AUTH_TOKEN || '')) p.push('TWILIO_AUTH_TOKEN missing or malformed');
  if (!E164.test(E.TWILIO_FROM || '')) p.push('TWILIO_FROM missing (your Twilio phone number, e.g. +1XXXXXXXXXX)');
  if (!Object.keys(recipients).length) p.push('No SMS_TO_u_aarav / SMS_TO_c_anaya recipient set (E.164, e.g. +91XXXXXXXXXX)');
  return p;
}

if (process.argv.includes('--check')) {
  const p = configProblems();
  console.log(`Room: ${ROOM}\nMode: ${LIVE ? 'LIVE (will send real SMS)' : 'DRY RUN (sends nothing)'}\nDaily cap: ${CAP}, gap ${GAP / 1000}s\nRecipients: ${Object.entries(recipients).map(([u, n]) => `${u} → ${mask(n)}`).join(', ') || 'none'}`);
  console.log(p.length ? `Config problems:\n - ${p.join('\n - ')}` : 'Config looks complete.');
  console.log('\nTexts (with the trial prefix Twilio adds):');
  for (const s of SCRIPTS) {
    const b = bodyFor(s.id, 'ABC234');
    const full = TRIAL_PREFIX + b;
    console.log(`\n[${s.id}] ${full.length} chars, ${segments(full)} segment(s)\n${b}`);
  }
  process.exit(0);
}

// --verify: ask Twilio whether the credentials work and the From number belongs to the account. Read-only, sends nothing.
if (process.argv.includes('--verify')) {
  const p = configProblems();
  if (p.length) { console.log(`Fix .env first:\n - ${p.join('\n - ')}`); process.exit(1); }
  const auth = { Authorization: `Basic ${Buffer.from(`${E.TWILIO_ACCOUNT_SID}:${E.TWILIO_AUTH_TOKEN}`).toString('base64')}` };
  const base = `https://api.twilio.com/2010-04-01/Accounts/${E.TWILIO_ACCOUNT_SID}`;
  const acc = await fetch(`${base}.json`, { headers: auth });
  if (!acc.ok) { console.log(`Twilio rejected the credentials (HTTP ${acc.status}). Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.`); process.exit(1); }
  const a = await acc.json();
  console.log(`Credentials OK · account "${a.friendly_name}" · status ${a.status} · type ${a.type}`);
  const nums = await fetch(`${base}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(E.TWILIO_FROM)}`, { headers: auth }).then((r) => r.json()).catch(() => ({}));
  console.log(nums.incoming_phone_numbers?.length ? `From number ${E.TWILIO_FROM} belongs to this account · SMS ${nums.incoming_phone_numbers[0].capabilities?.sms ? 'enabled' : 'NOT enabled'}` : `From number ${E.TWILIO_FROM} was not found on this account`);
  if (a.type === 'Trial') {
    const ver = await fetch(`${base}/OutgoingCallerIds.json`, { headers: auth }).then((r) => r.json()).catch(() => ({}));
    const verified = new Set((ver.outgoing_caller_ids || []).map((x) => x.phone_number));
    for (const [u, n] of Object.entries(recipients)) console.log(`Recipient ${u} ${mask(n)}: ${verified.has(n) ? 'verified, trial can text it' : 'NOT verified: a trial account can only text verified numbers'}`);
  }
  console.log('Nothing was sent.');
  process.exit(0);
}

/* ---------- ledger: once per message, per-day cap ---------- */
const LEDGER = '.sms-relay.json';
const today = () => new Date().toISOString().slice(0, 10);
let ledger = { day: today(), sent: 0, handled: {}, lastAt: 0 };
try { ledger = { ...ledger, ...JSON.parse(readFileSync(LEDGER, 'utf8')) }; } catch { /* first run */ }
const saveLedger = () => writeFileSync(LEDGER, JSON.stringify(ledger, null, 1));
function rollDay() { if (ledger.day !== today()) { ledger.day = today(); ledger.sent = 0; saveLedger(); } }

async function twilioSend(to, body) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${E.TWILIO_ACCOUNT_SID}/Messages.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${E.TWILIO_ACCOUNT_SID}:${E.TWILIO_AUTH_TOKEN}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: E.TWILIO_FROM, Body: body })
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(j.message || `HTTP ${res.status}`), { code: j.code });
  return j.sid;
}

/* ---------- room ---------- */
const key = await roomKey(ROOM);
const id = await roomTopicId(ROOM);
const T = { state: `payshield-app/v2/${id}/state`, relay: `payshield-app/v2/${id}/relay` };
const ME = `relay-${Math.random().toString(36).slice(2, 8)}`;
let latest = null;
let seen = 0;
let busy = false;
let client = null;

const relayStatus = (online) => seal(key, { online, mode: LIVE ? 'live' : 'dry-run', sentToday: ledger.sent, cap: CAP, at: Date.now() });

async function writeBack(msgId, real) {
  if (!latest) return;
  const next = structuredClone(latest);
  const m = (next.messages || []).find((x) => x.id === msgId);
  if (!m) return;
  m.real = { ...m.real, ...real, at: Date.now() };
  next.audit = next.audit || [];
  next.audit.unshift({ t: Date.now(), actor: 'SMS relay', action: `Real SMS ${real.status.replace(/_/g, ' ')}`, detail: `${m.id}${real.error ? ` · ${real.error}` : ''}` });
  next.rev = Math.max(latest.rev || 0, seen) + 1;
  next.revBy = ME;
  latest = next; seen = next.rev;
  client.publish(T.state, await seal(key, { from: ME, at: Date.now(), db: next }), { qos: 1, retain: true });
}

async function process1() {
  if (busy || !latest) return;
  busy = true;
  try {
    rollDay();
    const queued = (latest.messages || []).filter((m) => m.real?.status === 'queued' && !ledger.handled[m.id]).sort((a, b) => a.t - b.t);
    for (const m of queued) {
      const to = recipients[m.toUserId];
      const body = bodyFor(m.scriptId, m.code);
      let real;
      if (Date.now() - m.t > 10 * 60e3) real = { status: 'expired' };
      else if (!body) real = { status: 'rejected', error: 'unknown script or link code' };
      else if (!to) real = { status: 'no_number', error: `no SMS_TO_${m.toUserId} in .env` };
      else if (ledger.sent >= CAP) real = { status: 'cap_reached', error: `daily cap ${CAP} reached` };
      else if (Date.now() - ledger.lastAt < GAP) { setTimeout(process1, GAP - (Date.now() - ledger.lastAt) + 200); break; }
      else if (!LIVE) { real = { status: 'dry_run' }; log(`DRY RUN: would text ${mask(to)}: "${body}"`); }
      else {
        try {
          const sid = await twilioSend(to, body);
          ledger.sent += 1; ledger.lastAt = Date.now();
          real = { status: 'sent', ref: `${sid.slice(0, 6)}…` };
          log(`SENT to ${mask(to)} (${ledger.sent}/${CAP} today)`);
        } catch (e) {
          real = { status: 'failed', error: `${e.code || ''} ${e.message}`.trim().slice(0, 120) };
          log('Twilio error:', real.error);
        }
      }
      ledger.handled[m.id] = real.status;
      saveLedger();
      await writeBack(m.id, real);
      client.publish(T.relay, await relayStatus(true), { qos: 1, retain: true });
    }
  } finally { busy = false; }
}

function connect(i) {
  const url = BROKERS[i % BROKERS.length];
  log(`Connecting to ${new URL(url).hostname} for room "${ROOM}" (${LIVE ? 'LIVE' : 'dry run'}, cap ${CAP}/day, recipients ${Object.keys(recipients).join(', ') || 'none'})`);
  relayStatus(false).then((will) => {
    const c = mqtt.connect(url, { clientId: `ps-${ME}-${i}`, connectTimeout: 8000, reconnectPeriod: 4000, keepalive: 30, will: { topic: T.relay, payload: will, qos: 1, retain: true } });
    let opened = false;
    const giveUp = setTimeout(() => { if (!opened) { c.end(true); connect(i + 1); } }, 9000);
    c.on('connect', async () => {
      opened = true; clearTimeout(giveUp); client = c;
      log('Connected. Waiting for "Send as real SMS" from the caller phone. Ctrl+C to stop.');
      c.subscribe(T.state, { qos: 1 });
      const beat = async () => c.publish(T.relay, await relayStatus(true), { qos: 1, retain: true });
      beat(); setInterval(beat, 30e3);
    });
    c.on('message', async (_t, buf) => {
      const msg = await open(key, buf.toString());
      if (!msg || !validRemoteDb(msg.db)) return;
      seen = Math.max(seen, msg.db.rev || 0);
      if (!latest || (msg.db.rev || 0) >= (latest.rev || 0)) latest = msg.db;
      process1();
    });
    c.on('error', (e) => log('Connection error:', e.message));
  });
}

const problems = configProblems();
if (problems.length && LIVE) { console.error(`Can't go live:\n - ${problems.join('\n - ')}\nFix .env (see .env.example) or run without SMS_LIVE=1 for a dry run.`); process.exit(1); }
if (problems.length) log(`Dry run. Config not complete yet: ${problems.join('; ')}`);
process.on('SIGINT', async () => { try { client?.publish(T.relay, await relayStatus(false), { qos: 1, retain: true }, () => process.exit(0)); setTimeout(() => process.exit(0), 800); } catch { process.exit(0); } });
connect(0);
