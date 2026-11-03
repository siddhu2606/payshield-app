// Run with `npm test`. Security rails and the new detection features.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, cleanUpi, cleanAmount, cleanName, validRemoteDb } from '../src/core/validate.js';
import { roomKey, seal, open, roomTopicId } from '../src/core/crypto.js';
import { scanMessage } from '../src/core/scan.js';
import { createSeed, factsFor, muleRings } from '../src/core/data.js';
import { scoreSignals } from '../src/core/risk.js';
import { SCRIPTS, smsLink } from '../src/core/calls.js';
import { checkPin, DEMO_PIN_HASH, hashPin } from '../src/core/auth.js';

test('validation: strips control and bidi characters, bounds lengths and amounts', () => {
  assert.equal(cleanText('  hi‮there\u0000 ', 80), 'hithere');
  assert.equal(cleanText('x'.repeat(200), 60).length, 60);
  assert.equal(cleanUpi(' Rohan.Shah@OkDemo '), 'rohan.shah@okdemo');
  assert.equal(cleanUpi('javascript:alert(1)'), null);
  assert.equal(cleanUpi('<img src=x>@bank'), null);
  assert.equal(cleanAmount('₹50,000'), 50000);
  assert.equal(cleanAmount(-5), null);
  assert.equal(cleanAmount(2e7), null);
  assert.equal(cleanName('<script>'), 'script');
});

test('remote state: only well-formed PayShield state is accepted', () => {
  const d = { ...createSeed(), rev: 3 };
  assert.equal(validRemoteDb(d), true);
  assert.equal(validRemoteDb({ ...d, version: 4 }), false);
  assert.equal(validRemoteDb({ ...d, transactions: 'x' }), false);
  assert.equal(validRemoteDb(null), false);
});

test('sync encryption: round-trips, rejects tampering and other rooms, hides the room name', async () => {
  const k = await roomKey('vslash-vk26');
  const msg = await seal(k, { hello: 'world' });
  assert.ok(!msg.includes('world'));
  assert.deepEqual(await open(k, msg), { hello: 'world' });
  const m = JSON.parse(msg);
  const bad = JSON.stringify({ ...m, ct: (m.ct[0] === 'A' ? 'B' : 'A') + m.ct.slice(1) });
  assert.equal(await open(k, bad), null);
  assert.equal(await open(await roomKey('other-room'), msg), null);
  assert.ok(!(await roomTopicId('vslash-vk26')).includes('vslash'));
});

test('passcodes: stored as bcrypt, demo passcode checks, wrong one fails', async () => {
  assert.match(DEMO_PIN_HASH, /^\$2[aby]\$10\$/);
  assert.equal(await checkPin('1234', DEMO_PIN_HASH), true);
  assert.equal(await checkPin('0000', DEMO_PIN_HASH), false);
  const h = hashPin('8642');
  assert.ok(!h.includes('8642'));
  assert.equal(await checkPin('8642', h), true);
});

test('scam SMS: every script is flagged as a scam and fits one SMS with the trial prefix', () => {
  const reg = createSeed().registry;
  for (const s of SCRIPTS) {
    const text = s.sms.text.replace('{link}', smsLink('ABC234'));
    const r = scanMessage(text, { from: s.sms.from, registry: reg });
    assert.equal(r.verdict, 'scam', `${s.id}: ${r.score}`);
    assert.ok(('Sent from your Twilio trial account - ' + text).length <= 160, `${s.id} too long`);
  }
});

test('message scanner: an ordinary message is not flagged', () => {
  const r = scanMessage('Hey, dinner at 8 tonight? I booked the table.', { from: 'Rohan' });
  assert.equal(r.verdict, 'ok');
});

test('opened from a message link adds points and triggers the safety check', () => {
  const r = scoreSignals({ from_message: true, messageFrom: 'VK-CBIGOV' });
  assert.equal(r.reasons[0].code, 'link_from_message');
  assert.equal(r.score, 15);
});

test('mule rings: a brand-new account sharing a device with a reported one is flagged', () => {
  const reg = createSeed().registry;
  const f = factsFor(reg, 'rk.enterprises22@ybldemo');
  assert.equal(f.reported, false);
  assert.ok(f.linkedReported.includes('clearance.desk@pnbdemo'));
  const r = scoreSignals({ facts: f });
  assert.ok(r.reasons.some((x) => x.code === 'linked_to_reported'));
  const rings = muleRings(reg);
  assert.ok(rings.length >= 2);
  assert.ok(rings.every((x) => x.members.length >= 2));
});

test('real call detected on the phone counts as an active call', () => {
  const r = scoreSignals({ active_call: true, callKind: 'internet', screen_shared: true });
  assert.deepEqual(r.reasons.map((x) => x.code).sort(), ['active_call', 'screen_shared']);
  assert.match(r.reasons.find((x) => x.code === 'active_call').detail, /internet call/);
});
