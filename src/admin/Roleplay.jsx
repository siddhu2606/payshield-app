import { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { useDb, addRoleplay, removeRoleplay } from '../core/store.js';
import { Head } from './AdminApp.jsx';
import { ago, useToast } from '../ui.jsx';

const GROUPS = [['control', 'Control: no warning'], ['generic', 'Generic “possible fraud” banner'], ['payshield', 'PayShield: specific story vs facts']];

export default function Roleplay() {
  const db = useDb();
  const toast = useToast();
  const [f, setF] = useState({ participant: 'P01', group: 'payshield', task: 'coerced', outcome: 'abandoned', seconds: 95, ageBand: '18-30' });
  const rows = db.roleplay;
  const stat = (g) => {
    const co = rows.filter((r) => r.group === g && r.task === 'coerced');
    const ge = rows.filter((r) => r.group === g && r.task === 'genuine');
    return {
      n: co.length,
      abandon: co.length ? Math.round((co.filter((r) => r.outcome === 'abandoned').length / co.length) * 100) : null,
      genuineSec: ge.length ? Math.round(ge.reduce((a, r) => a + Number(r.seconds || 0), 0) / ge.length) : null,
      genuineN: ge.length
    };
  };
  const csv = () => {
    const text = ['participant,group,task,outcome,seconds,age_band,recorded_at', ...rows.map((r) => [r.participant, r.group, r.task, r.outcome, r.seconds, r.ageBand, new Date(r.t).toISOString()].join(','))].join('\n');
    navigator.clipboard?.writeText(text).then(() => toast('CSV copied'), () => toast('Copy blocked by the browser'));
  };

  return (
    <>
      <Head title="Role-play test" sub="FIN-11 deliverable 3: does the intervention change the decision? Record each session here." />
      <div className="ad-body">
        <div className="g2">
          <section className="panel">
            <h2>Protocol</h2>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, fontSize: 14 }}>
              <li>Recruit 10 to 15 people. Assign each to one of the three groups at random.</li>
              <li>A teammate plays the caller from a script: “You are under investigation, pay a refundable deposit.”</li>
              <li>The participant uses the PayShield app (or the same flow with warnings switched off for control).</li>
              <li>Record whether they completed or abandoned the coerced payment, and how long it took.</li>
              <li>Add two genuine payment tasks per person to measure friction on normal use.</li>
              <li>Debrief: tell every participant it was a test and show them the real warning signs.</li>
            </ol>
            <small className="muted">The comparison that matters: does the specific contradiction beat a generic banner? Results here are blank until we run it.</small>
          </section>
          <section className="panel">
            <h2>Record a session</h2>
            <div className="g2e" style={{ gap: 10 }}>
              <div className="field"><label htmlFor="rp-p">Participant code</label><input id="rp-p" className="input" value={f.participant} onChange={(e) => setF({ ...f, participant: e.target.value })} /></div>
              <div className="field"><label htmlFor="rp-a">Age band</label><select id="rp-a" className="input" value={f.ageBand} onChange={(e) => setF({ ...f, ageBand: e.target.value })}>{['18-30', '31-45', '46-60', '60+'].map((a) => <option key={a}>{a}</option>)}</select></div>
              <div className="field"><label htmlFor="rp-g">Group</label><select id="rp-g" className="input" value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })}>{GROUPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              <div className="field"><label htmlFor="rp-t">Task</label><select id="rp-t" className="input" value={f.task} onChange={(e) => setF({ ...f, task: e.target.value })}><option value="coerced">Coerced payment</option><option value="genuine">Genuine payment</option></select></div>
              <div className="field"><label htmlFor="rp-o">Outcome</label><select id="rp-o" className="input" value={f.outcome} onChange={(e) => setF({ ...f, outcome: e.target.value })}><option value="abandoned">Abandoned / cancelled</option><option value="completed">Completed</option></select></div>
              <div className="field"><label htmlFor="rp-s">Seconds taken</label><input id="rp-s" className="input mono" inputMode="numeric" value={f.seconds} onChange={(e) => setF({ ...f, seconds: e.target.value.replace(/\D/g, '') })} /></div>
            </div>
            <button className="btn sm" onClick={() => { addRoleplay(f); toast(`Session ${f.participant} recorded`); setF({ ...f, participant: `P${String(rows.length + 2).padStart(2, '0')}` }); }}><Plus size={15} />Add session</button>
            <small className="dim">Stored in this browser only. Copy the CSV to keep it.</small>
          </section>
        </div>
        <section className="panel">
          <header><h2>Results by group</h2>{rows.length > 0 && <button className="btn xs soft" onClick={csv}><Copy size={12} />Copy CSV</button>}</header>
          <div className="tablewrap">
            <table className="tbl">
              <thead><tr><th>Group</th><th className="r">Coerced sessions</th><th className="r">Abandoned the coerced payment</th><th className="r">Genuine tasks</th><th className="r">Avg seconds, genuine</th></tr></thead>
              <tbody>{GROUPS.map(([k, l]) => { const s = stat(k); return <tr key={k} style={{ cursor: 'default' }}><td>{l}</td><td className="r mono">{s.n}</td><td className="r mono">{s.abandon == null ? '—' : `${s.abandon}%`}</td><td className="r mono">{s.genuineN}</td><td className="r mono">{s.genuineSec ?? '—'}</td></tr>; })}</tbody>
            </table>
          </div>
          {rows.length === 0 && <div className="empty">No sessions recorded yet. Nothing here is a result until the role-play has been run.</div>}
        </section>
        {rows.length > 0 && (
          <section className="panel">
            <h2>Sessions</h2>
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>Participant</th><th>Group</th><th>Task</th><th>Outcome</th><th className="r">Seconds</th><th>Age</th><th>Recorded</th><th /></tr></thead>
                <tbody>{rows.map((r) => <tr key={r.id} style={{ cursor: 'default' }}><td className="mono">{r.participant}</td><td>{r.group}</td><td>{r.task}</td><td>{r.outcome}</td><td className="r mono">{r.seconds}</td><td>{r.ageBand}</td><td className="muted">{ago(r.t)}</td><td className="r"><button className="btn xs ghost" aria-label="Delete session" onClick={() => removeRoleplay(r.id)}><Trash2 size={12} /></button></td></tr>)}</tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
