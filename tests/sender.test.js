import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSender, parseSender } from '../src/core/sender.js';
import { scanMessage } from '../src/core/scan.js';
import { SCRIPTS } from '../src/core/calls.js';

test('SMS Shield: a registered bank sender is recognised, with or without prefix and suffix', () => {
  for (const s of ['AD-AXISBK-T', 'AD-AXISBK', 'axisbk', 'VM-HDFCBK-S']) assert.equal(checkSender(s).verdict, 'official', s);
  assert.equal(checkSender({ prefix: 'ad', header: 'axisbk', suffix: 't' }).org, 'Axis Bank');
});
test('SMS Shield: promotional channel of a real bank is a caution, not a pass', () => {
  assert.equal(checkSender('JD-SBIINB-P').tone, 'warn');
});
test('SMS Shield: mobile numbers, look-alikes and fake authorities are flagged', () => {
  assert.equal(checkSender('+91 90000 00000').verdict, 'mobile');
  assert.equal(checkSender({ header: '9000000000' }).verdict, 'mobile');
  assert.equal(checkSender('AX-HDFCBN').verdict, 'lookalike');
  assert.equal(checkSender('AX-AXISKY').verdict, 'lookalike');
  assert.equal(checkSender('VK-CBIGOV').verdict, 'authority');
  assert.equal(checkSender('AD-AXISBK-G').verdict, 'lookalike');
});
test('SMS Shield: bad formats are explained, ordinary unknown senders are neutral', () => {
  assert.equal(checkSender('AD-AXIS').verdict, 'invalid');
  assert.equal(checkSender('AD-AXISBK-Q').verdict, 'invalid');
  assert.equal(checkSender('AD-ZOMATO').verdict, 'unknown');
  assert.deepEqual(parseSender('vk-cbigov-t'), { prefix: 'VK', header: 'CBIGOV', suffix: 'T', raw: 'vk-cbigov-t' });
});
test('message scan adds the fake-sender flag for the scam scripts that use header IDs', () => {
  const withHeader = SCRIPTS.filter((s) => /^[A-Z]{2}-/.test(s.sms.from));
  assert.ok(withHeader.length >= 3);
  for (const s of withHeader) assert.ok(scanMessage(s.sms.text, { from: s.sms.from }).flags.some((f) => f.code === 'fake_sender'), s.id);
  assert.ok(!scanMessage('Your OTP is 123456', { from: 'AD-AXISBK-T' }).flags.some((f) => f.code === 'fake_sender'));
});
test('message scan: multi-word phrases like "last chance" and "do not tell" are caught', () => {
  const codes = scanMessage('last chance, do not tell anyone', {}).flags.map((f) => f.code);
  assert.ok(codes.includes('urgency') && codes.includes('secrecy'));
});
