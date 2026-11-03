import { useMemo } from 'react';
import { Check, X, Minus } from 'lucide-react';
import { useDb } from '../core/store.js';
import { runSuite } from '../core/scenarios.js';
import { Head } from './AdminApp.jsx';
import { inr, TierPill } from '../ui.jsx';

export default function Scenarios() {
  const db = useDb();
  const res = useMemo(() => runSuite(db.policy), [db.policy]);
  const bars = [
    ['Coerced caught (High+)', res.ours.detection, res.base.detection, 'var(--t-low)'],
    ['Normal interrupted (High+)', res.ours.falseIntervention, res.base.falseIntervention, 'var(--t-crit)'],
    ['Normal with any friction', res.ours.friction, res.base.friction, 'var(--t-med)']
  ];
  const verdict = (r) => {
    const hi = ['HIGH', 'CRITICAL'].includes(r.ours.tier);
    if (r.label === 'coerced') return hi ? ['ok', 'Caught'] : ['miss', 'Missed'];
    if (hi) return ['miss', 'Interrupted'];
    return r.ours.tier === 'MEDIUM' ? ['soft', 'Caution only'] : ['ok', 'No friction'];
  };
  return (
    <>
      <Head title="Scenario suite" sub={`${res.nNormal} normal and ${res.nCoerced} coerced scripted payments, run through the live policy. Synthetic and labelled by us.`} />
      <div className="ad-body">
        <section className="panel">
          <header><h2>PayShield vs a transaction-rules baseline<small>same points, but the baseline only sees amount, payee and timing</small></h2></header>
          <div style={{ display: 'grid', gap: 14 }}>
            {bars.map(([label, ours, base, color]) => (
              <div key={label} style={{ display: 'grid', gap: 6 }}>
                <b style={{ fontSize: 13.5 }}>{label}</b>
                <div className="cmp"><span className="muted">PayShield</span><div className="bar"><i style={{ width: `${ours}%`, background: color }} /></div><b className="mono" style={{ textAlign: 'right' }}>{ours}%</b></div>
                <div className="cmp"><span className="muted">Rules baseline</span><div className="bar"><i style={{ width: `${base}%`, background: 'var(--dim)' }} /></div><b className="mono" style={{ textAlign: 'right' }}>{base}%</b></div>
              </div>
            ))}
          </div>
          <small className="muted">Why the baseline misses: a coerced payment and a legitimate first payment look the same to transaction rules. The difference is in the answers and the account facts.</small>
        </section>
        <section className="panel">
          <div className="tablewrap">
            <table className="tbl">
              <thead><tr><th>ID</th><th>Scenario</th><th>Family</th><th>Label</th><th className="r">Amount</th><th>PayShield</th><th>Baseline</th><th>Result</th></tr></thead>
              <tbody>
                {res.rows.map((r) => {
                  const [k, v] = verdict(r);
                  return (
                    <tr key={r.id} style={{ cursor: 'default' }}>
                      <td className="mono dim">{r.id}</td>
                      <td className="wrap">{r.title}{r.hard && <span className="pill fill c-acc" style={{ marginLeft: 8 }}>hard case</span>}</td>
                      <td className="muted">{r.family}</td>
                      <td><span className={`pill ${r.label === 'coerced' ? 'c-crit' : 'c-low'}`}>{r.label}</span></td>
                      <td className="r mono">{inr(r.amount)}</td>
                      <td><TierPill tier={r.ours.tier} score={r.ours.score} /></td>
                      <td><TierPill tier={r.base.tier} score={r.base.score} /></td>
                      <td><span className={`row ${k === 'ok' ? 'c-low' : k === 'miss' ? 'c-crit' : 'c-med'}`} style={{ gap: 5, fontSize: 13 }}>{k === 'ok' ? <Check size={15} /> : k === 'miss' ? <X size={15} /> : <Minus size={15} />}{v}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h2>Limits we state openly</h2>
          <small className="muted">The calm, fully convinced victim (C9) answers “No” to every question and gives a harmless reason, so only the account facts flag it: Medium, not High. Weights are design values and the scenarios are ours, so a perfect score here would prove nothing. Real accuracy needs authorised bank data and the role-play test.</small>
        </section>
      </div>
    </>
  );
}
