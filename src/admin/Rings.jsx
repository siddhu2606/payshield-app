import { Flag, Snowflake, FileText, Share2, Smartphone, Phone, ArrowRight } from 'lucide-react';
import { useDb, muleRings, ringAction } from '../core/store.js';
import { Head } from './AdminApp.jsx';
import { useToast, ago, inr } from '../ui.jsx';

// Two-column graph: accounts on the left, the device IDs and phone numbers they share on the right.
function RingGraph({ ring }) {
  const ids = [...ring.devices.map((d) => ({ key: d, kind: 'device' })), ...ring.phones.map((p) => ({ key: p, kind: 'phone' }))];
  const rowH = 46;
  const h = Math.max(ring.members.length, ids.length) * rowH + 10;
  const ay = (i) => 28 + i * rowH + ((Math.max(ring.members.length, ids.length) - ring.members.length) * rowH) / 2;
  const iy = (i) => 28 + i * rowH + ((Math.max(ring.members.length, ids.length) - ids.length) * rowH) / 2;
  const color = (m) => (m.frozen ? 'var(--accent)' : m.reported ? 'var(--t-crit)' : 'var(--t-high)');
  return (
    <svg viewBox={`0 0 900 ${h}`} width="100%" role="img" aria-label={`${ring.id}: ${ring.members.length} accounts linked by ${ids.length} shared identifiers`} style={{ display: 'block', width: '100%', maxWidth: 900 }}>
      {ring.members.map((m, i) => ids.map((x, j) => ((x.kind === 'device' && m.device === x.key) || (x.kind === 'phone' && m.phone === x.key)) && (
        <path key={`${m.upi}-${x.key}`} d={`M 340 ${ay(i)} C 470 ${ay(i)}, 470 ${iy(j)}, 600 ${iy(j)}`} fill="none" stroke={m.reported ? 'var(--t-crit)' : 'var(--line2)'} strokeWidth="2" opacity={m.reported ? 0.8 : 1} />
      )))}
      {ring.members.map((m, i) => (
        <g key={m.upi}>
          <rect x="6" y={ay(i) - 18} width="334" height="36" rx="10" fill="var(--panel2)" stroke={color(m)} strokeWidth="1.5" />
          <circle cx="22" cy={ay(i)} r="5" fill={color(m)} />
          <text x="34" y={ay(i) - 3} fill="var(--fg)" fontSize="12.5" fontFamily="var(--mono)">{m.upi.length > 36 ? `${m.upi.slice(0, 35)}…` : m.upi}</text>
          <text x="34" y={ay(i) + 12} fill="var(--mute)" fontSize="11">{m.ageDays} d old · {m.senders24h} senders today{m.frozen ? ' · frozen' : m.reported ? ' · reported' : ' · not reported'}</text>
        </g>
      ))}
      {ids.map((x, j) => (
        <g key={x.key}>
          <rect x="600" y={iy(j) - 16} width="280" height="32" rx="16" fill="color-mix(in srgb, var(--accent-2) 12%, var(--panel))" stroke="var(--accent-2)" strokeWidth="1" />
          <text x="618" y={iy(j) + 4} fill="var(--fg)" fontSize="12" fontFamily="var(--mono)">{x.kind === 'device' ? 'Device ' : 'Phone '}{x.key}</text>
        </g>
      ))}
    </svg>
  );
}

export default function Rings() {
  const db = useDb();
  const toast = useToast();
  const rings = muleRings(db.registry);
  const cases = db.cases || [];
  const act = (r, a) => { const label = ringAction(r.id, a, 'a_meera'); toast(`${r.id}: ${label}`); };
  const attempts = (r) => db.transactions.filter((t) => r.members.some((m) => m.upi === t.payeeUpi) && t.kind === 'assessed');

  return (
    <>
      <Head title="Mule network" sub="Scammers switch to a fresh account every few payments. The phone and device behind those accounts don’t change, so PayShield links them." />
      <div className="ad-body">
        <section className="panel" style={{ padding: 18 }}>
          <div className="steps3">
            {[['A victim reports one account', 'Through 1930, a guardian “stop”, or a held payment the member cancels.'],
              ['PayShield links the footprint', 'Every account opened or used from the same device ID or registered mobile joins that ring.'],
              ['The next account is flagged first time', 'A day-old account with no reports still scores +20: “linked to a reported account”.']].map(([t, b], i) => (
              <div key={t} className="step3"><span className="mono">{String(i + 1).padStart(2, '0')}</span><b>{t}</b><small className="muted">{b}</small>{i < 2 && <ArrowRight className="arrow" size={18} />}</div>
            ))}
          </div>
        </section>

        {rings.map((r) => {
          const tx = attempts(r);
          return (
            <section key={r.id} className="panel">
              <div className="panel-h">
                <div><b>{r.id}</b> <small className="muted">· {r.members.length} accounts · {r.devices.length} device{r.devices.length > 1 ? 's' : ''} · {r.phones.length} phone number{r.phones.length > 1 ? 's' : ''}</small></div>
                <div className="row wrap" style={{ gap: 6 }}>
                  <span className="pill fill c-crit">{r.reported} reported</span>
                  {r.frozen > 0 && <span className="pill fill c-acc">{r.frozen} frozen</span>}
                  <span className="pill c-mute">{r.senders24h} senders today</span>
                </div>
              </div>
              <div style={{ padding: '6px 14px 14px' }}><RingGraph ring={r} /></div>
              <div className="ring-foot">
                <small className="muted">{tx.length ? `${tx.length} PayShield-checked payment${tx.length > 1 ? 's' : ''} to this ring, ${inr(tx.reduce((a, t) => a + t.amount, 0))} asked for, ${tx.filter((t) => t.status !== 'COMPLETED').length} not sent.` : 'No checked payments to this ring yet.'}</small>
                <div className="row wrap" style={{ gap: 6 }}>
                  <button className="btn xs soft" onClick={() => act(r, 'report')}><Flag size={12} />Report whole ring</button>
                  <button className="btn xs soft" onClick={() => act(r, r.frozen === r.members.length ? 'unfreeze' : 'freeze')}><Snowflake size={12} />{r.frozen === r.members.length ? 'Lift freeze' : 'Freeze inbound (lien)'}</button>
                  <button className="btn xs soft" onClick={() => act(r, 'str')}><FileText size={12} />Draft STR (FIU-IND)</button>
                  <button className="btn xs soft" onClick={() => act(r, 'i4c')}><Share2 size={12} />Share with 1930 / I4C</button>
                </div>
              </div>
            </section>
          );
        })}

        {cases.length > 0 && (
          <section className="panel">
            <div className="panel-h"><b>Cases filed</b><small className="muted">simulated, nothing leaves this demo</small></div>
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>Case</th><th>Ring</th><th>Sent to</th><th className="r">Accounts</th><th className="r">Attempts</th><th className="r">Asked for</th><th>Identifiers</th><th>When</th></tr></thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id} style={{ cursor: 'default' }}>
                      <td className="mono">{c.id}</td><td>{c.ringId}</td>
                      <td>{c.type === 'str' ? 'FIU-IND (suspicious transaction report)' : 'Cyber-crime suspect registry / 1930'}</td>
                      <td className="r mono">{c.accounts.length}</td><td className="r mono">{c.attempts}</td><td className="r mono">{inr(c.amount)}</td>
                      <td className="mono" style={{ fontSize: 12 }}><span className="row" style={{ gap: 4 }}><Smartphone size={12} />{c.devices.join(', ')}</span><span className="row" style={{ gap: 4 }}><Phone size={12} />{c.phones.join(', ')}</span></td>
                      <td>{ago(c.t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="panel" style={{ padding: 18, display: 'grid', gap: 10 }}>
          <b>Why this isn’t already solved, and what PayShield changes</b>
          <div className="grid2">
            <div><span className="eyebrow">The loophole</span>
              <ul className="tight-list">
                <li>The victim authorises the payment, so the bank sees a valid PIN and a willing customer.</li>
                <li>Mule accounts are opened with real, rented KYC, so each looks legitimate on its own.</li>
                <li>Money is split and moved on within minutes, before a complaint arrives.</li>
                <li>Signals sit in silos: the bank sees money, the telecom sees calls, the police see complaints.</li>
              </ul>
            </div>
            <div><span className="eyebrow">How PayShield closes it</span>
              <ul className="tight-list">
                <li><b>Doesn’t need to know the scammer’s account in advance.</b> It catches the coercion on the victim’s side: call in progress, pressure, story vs facts.</li>
                <li><b>A fresh account is itself a signal:</b> days old, many senders, linked device or phone.</li>
                <li><b>One report covers the whole ring</b>, so the next account is flagged on its first payment.</li>
                <li><b>Closes the loop</b> with the bank’s existing powers: lien on fraud proceeds, an STR to FIU-IND, a 1930 report.</li>
              </ul>
            </div>
          </div>
          <small className="help" style={{ margin: 0 }}>Device IDs and phone numbers here are synthetic. A real deployment would use the bank’s own device-binding and KYC data, under its existing legal obligations, and would never label a person a criminal: it raises the score and explains why.</small>
        </section>
      </div>
    </>
  );
}
