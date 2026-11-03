// Every warning shown to the member exists in Hindi and Marathi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tr, reasonText, questionText, purposeLabel, svfText, flagLabel } from '../src/core/i18n.js';
import { DEFAULT_POLICY, QUESTIONS, PURPOSES, scoreSignals, storyVsFacts } from '../src/core/risk.js';

const devanagari = /[ऀ-ॿ]/;
for (const lang of ['hi', 'mr']) {
  test(`${lang}: every risk signal, question, purpose and tier is translated`, () => {
    for (const code of Object.keys(DEFAULT_POLICY.weights)) {
      const x = reasonText(lang, { code, label: 'EN', detail: 'About 12× your usual payment. Opened 2 days ago, paid by 14 different people today. from VK-CBIGOV, not typed' }, 'govt');
      assert.match(x.label, devanagari, `${lang} ${code} label`);
      assert.match(x.detail, devanagari, `${lang} ${code} detail`);
    }
    for (const q of QUESTIONS) assert.match(questionText(lang, q), devanagari);
    for (const p of PURPOSES) assert.match(purposeLabel(lang, p), devanagari);
    for (const t of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) tr(lang).tier[t].forEach((s) => assert.match(s, devanagari));
    for (const c of ['pay_request', 'lookalike', 'link', 'threat', 'urgency', 'secrecy', 'too_good', 'personal_sender', 'new_account', 'reported', 'script']) assert.match(flagLabel(lang, { code: c, label: 'EN' }), devanagari);
  });
  test(`${lang}: story vs facts and real reasons translate with their numbers`, () => {
    const svf = svfText(lang, storyVsFacts('govt', { type: 'individual', ageDays: 2, senders24h: 14 }), 'govt');
    assert.match(svf.said, devanagari);
    assert.match(svf.fact, devanagari);
    const r = scoreSignals({ amount_unusual: true, amountRatio: 33, facts: { type: 'individual', ageDays: 2, senders24h: 14 } });
    const amt = reasonText(lang, r.reasons.find((x) => x.code === 'amount_unusual'));
    assert.ok(amt.detail.includes('33'));
    const mule = reasonText(lang, r.reasons.find((x) => x.code === 'mule_pattern'));
    assert.ok(mule.detail.includes('2') && mule.detail.includes('14'));
  });
}
