// Run with `npm test`. Checks the guard rails from the SAFEPAY plan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreSignals, storyVsFacts, tierOf, findScriptWords, DEFAULT_POLICY } from '../src/core/risk.js';
import { runSuite } from '../src/core/scenarios.js';

test('routine payment to a known payee is Low with no reasons', () => {
  const r = scoreSignals({});
  assert.equal(r.score, 0);
  assert.equal(r.tier, 'LOW');
});

test('SAFEPAY coercion demo case is Critical', () => {
  const r = scoreSignals({ new_beneficiary: true, amount_unusual: true, screening: { external_pressure: true, secrecy_requested: true, threat_reported: true, continuous_call: true } });
  assert.equal(r.score, 95);
  assert.equal(r.tier, 'CRITICAL');
});

test('legitimate ₹2,00,000 to a known payee is not Critical on amount alone', () => {
  const r = scoreSignals({ amount_unusual: true });
  assert.notEqual(r.tier, 'CRITICAL');
  assert.equal(r.tier, 'LOW');
});

test('saying "I verified it" never lowers the score', () => {
  const a = scoreSignals({ new_beneficiary: true, screening: { external_pressure: true } });
  const b = scoreSignals({ new_beneficiary: true, screening: { external_pressure: true, independent_verification: true } });
  assert.equal(a.score, b.score);
});

test('score is clamped to 0-100', () => {
  const r = scoreSignals({ new_beneficiary: true, amount_unusual: true, rapid_transactions: true, unusual_hour: true, purpose: 'govt', note: 'cbi arrest warrant', facts: { type: 'individual', ageDays: 1, senders24h: 50, reported: true }, screening: { external_pressure: true, secrecy_requested: true, threat_reported: true, continuous_call: true } });
  assert.equal(r.score, 100);
});

test('story vs facts: authority claim into a personal account is a contradiction', () => {
  assert.equal(storyVsFacts('govt', { type: 'individual', ageDays: 2, senders24h: 14 }).kind, 'contradiction');
  assert.equal(storyVsFacts('govt', { type: 'government', ageDays: 5000, senders24h: 800 }), null);
  assert.equal(storyVsFacts('family', { type: 'individual', ageDays: 2, senders24h: 14 }), null);
  assert.equal(storyVsFacts('bank', { type: 'unknown' }).kind, 'unconfirmed');
});

test('tier boundaries follow the plan (25 / 50 / 75)', () => {
  assert.deepEqual([0, 24, 25, 49, 50, 74, 75, 100].map((s) => tierOf(s)), ['LOW', 'LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'HIGH', 'CRITICAL', 'CRITICAL']);
});

test('script words are matched as whole words', () => {
  assert.deepEqual(findScriptWords('CBI verification deposit'), ['cbi', 'verification', 'deposit']);
  assert.deepEqual(findScriptWords('police'), ['police']);
  assert.deepEqual(findScriptWords('policy renewal'), []);
});

test('scenario suite: no normal payment is interrupted at default policy', () => {
  const r = runSuite(DEFAULT_POLICY);
  assert.equal(r.ours.falseCount, 0);
  assert.ok(r.ours.caught >= 8);
  assert.ok(r.ours.detection > r.base.detection);
});
