import { useMemo, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { useDb, setPolicy } from '../core/store.js';
import { DEFAULT_POLICY, WEIGHT_LABELS } from '../core/risk.js';
import { runSuite } from '../core/scenarios.js';
import { Head } from './AdminApp.jsx';
import { TierPill, useToast } from '../ui.jsx';

const GROUPS = [
  ['Payment context', ['new_beneficiary', 'amount_unusual', 'rapid_transactions', 'unusual_hour', 'active_call']],
  ['Safety check answers', ['external_pressure', 'threat_reported', 'secrecy_requested', 'continuous_call', 'script_words']],
  ['Story vs facts', ['claim_vs_account', 'claim_unconfirmed', 'mule_pattern', 'reported_payee']]
];

export default function Policy() {
  const db = useDb();
  const toast = useToast();
  const [draft, setDraft] = useState(() => structuredClone(db.policy));
  const res = useMemo(() => runSuite(draft), [draft]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(db.policy);
  const setW = (k, v) => setDraft({ ...draft, weights: { ...draft.weights, [k]: v } });
  const setT = (k, v) => setDraft({ ...draft, thresholds: { ...draft.thresholds, [k]: v } });
  const demo = ['N2', 'C1', 'N6'].map((id) => res.rows.find((r) => r.id === id));
  const thOk = draft.thresholds.medium < draft.thresholds.high && draft.thresholds.high < draft.thresholds.critical;

  return (
    <>
      <Head title="Policy & weights" sub="Illustrative points, not validated probabilities. Changes apply to new payments in every app once saved."
        right={<>
          <button className="btn ghost sm" onClick={() => setDraft(structuredClone(DEFAULT_POLICY))}><RotateCcw size={15} />Defaults</button>
          <button className="btn sm" disabled={!dirty || !thOk} onClick={() => { setPolicy(draft, 'a_meera'); toast('Policy saved. New payments use it now.'); }}><Save size={15} />Save policy</button>
        </>} />
      <div className="ad-body">
        <div className="g3">
          <div className="panel"><span className="eyebrow">Coerced scenarios caught</span><div className="big-stat"><b style={{ color: 'var(--t-low)' }}>{res.ours.caught}/{res.nCoerced}</b><small>reach High or Critical ({res.ours.detection}%)</small></div></div>
          <div className="panel"><span className="eyebrow">Normal payments interrupted</span><div className="big-stat"><b style={{ color: res.ours.falseCount ? 'var(--t-crit)' : 'var(--fg)' }}>{res.ours.falseCount}/{res.nNormal}</b><small>reach High or Critical ({res.ours.falseIntervention}%)</small></div></div>
          <div className="panel"><span className="eyebrow">Normal payments with any friction</span><div className="big-stat"><b>{res.ours.frictionCount}/{res.nNormal}</b><small>Medium or above ({res.ours.friction}%)</small></div></div>
        </div>
        <p className="help" style={{ margin: '-6px 0 0' }}>Live preview on the scenario suite as you move the sliders. Synthetic scenarios, so these are design checks, not accuracy claims.</p>

        <div className="g2">
          <section className="panel">
            {GROUPS.map(([g, keys]) => (
              <div key={g} style={{ display: 'grid', gap: 2 }}>
                <h2 style={{ marginTop: 6 }}>{g}</h2>
                {keys.map((k) => (
                  <div className="weight" key={k}>
                    <label htmlFor={`w-${k}`}>{WEIGHT_LABELS[k]}</label>
                    <input id={`w-${k}`} type="range" className="range" min="0" max="40" step="5" value={draft.weights[k]} onChange={(e) => setW(k, Number(e.target.value))} />
                    <b>+{draft.weights[k]}</b>
                  </div>
                ))}
              </div>
            ))}
          </section>
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <section className="panel">
              <h2>Tier thresholds</h2>
              {[['medium', 'Medium from'], ['high', 'High from'], ['critical', 'Critical from']].map(([k, l]) => (
                <div className="weight" key={k}><label htmlFor={`t-${k}`}>{l}</label><input id={`t-${k}`} type="range" className="range" min="5" max="95" step="5" value={draft.thresholds[k]} onChange={(e) => setT(k, Number(e.target.value))} /><b>{draft.thresholds[k]}</b></div>
              ))}
              {!thOk && <div className="error">Each threshold must be higher than the one before it.</div>}
            </section>
            <section className="panel">
              <h2>The three demo cases</h2>
              {demo.map((r) => <div className="kv2" key={r.id}><span>{r.title}</span><TierPill tier={r.ours.tier} score={r.ours.score} /></div>)}
              <small className="muted">Guard rail: a legitimate ₹2,00,000 payment to a known payee must never be Critical on amount alone.</small>
            </section>
            <section className="panel">
              <h2>Rules that never change</h2>
              <small className="muted">Saying “I verified it” never subtracts points. No hard block: the member always has an exit. The score is computed on the server side, never trusted from the app.</small>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
