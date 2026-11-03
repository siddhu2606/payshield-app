import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Flag, FileText, Copy, Check } from 'lucide-react';
import { useDb, adminReview, toggleReported } from '../core/store.js';
import { QUESTIONS, PURPOSES } from '../core/risk.js';
import { Head } from './AdminApp.jsx';
import { inr, initials, ago, clock, dateShort, TierPill, StatusPill, ReasonList, StoryVsFacts, useToast, useNow } from '../ui.jsx';

const OPEN = ['PENDING_REVIEW', 'AWAITING_CONTACT', 'AWAITING_DECISION'];

export default function Transactions({ mode }) {
  const db = useDb();
  const loc = useLocation();
  useNow(20000);
  const [tier, setTier] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(loc.state?.id || null);
  useEffect(() => { if (loc.state?.id) setSel(loc.state.id); }, [loc.state]);

  const nameOf = (id) => db.users[id]?.name || id;
  let rows = db.transactions.filter((t) => t.kind === 'assessed').sort((a, b) => b.createdAt - a.createdAt);
  if (mode === 'review') rows = rows.filter((t) => OPEN.includes(t.status)).sort((a, b) => b.assessment.score - a.assessment.score);
  if (tier !== 'ALL') rows = rows.filter((t) => t.assessment?.tier === tier);
  if (status !== 'ALL') rows = rows.filter((t) => t.status === status);
  if (q) rows = rows.filter((t) => `${nameOf(t.userId)} ${t.payeeName} ${t.payeeUpi} ${t.id}`.toLowerCase().includes(q.toLowerCase()));
  const tx = sel && db.transactions.find((t) => t.id === sel);

  return (
    <>
      <Head title={mode === 'review' ? 'Review queue' : 'Payments'} sub={mode === 'review' ? 'Held payments waiting for the risk team or a trusted contact, highest risk first.' : 'Every payment the engine assessed, with its reasons.'} />
      <div className="ad-body">
        <div className="filters">
          <input className="input" style={{ maxWidth: 260, padding: '9px 12px' }} placeholder="Search member, payee, ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search payments" />
          <div className="seg" style={{ gridAutoColumns: 'auto' }}>
            {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((k) => <button key={k} className={tier === k ? 'on' : ''} onClick={() => setTier(k)} style={{ padding: '7px 12px' }}>{k === 'ALL' ? 'All tiers' : k[0] + k.slice(1).toLowerCase()}</button>)}
          </div>
          {mode !== 'review' && (
            <select className="input" style={{ width: 'auto', padding: '9px 12px' }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter">
              <option value="ALL">All statuses</option>
              {['COMPLETED', 'CANCELLED', 'POSTPONED', 'PENDING_REVIEW', 'AWAITING_CONTACT', 'AWAITING_DECISION'].map((s) => <option key={s} value={s}>{s.replace('_', ' ').toLowerCase()}</option>)}
            </select>
          )}
          <span className="muted" style={{ fontSize: 13 }}>{rows.length} shown</span>
        </div>
        <section className="panel">
          {rows.length === 0 ? <div className="empty">{mode === 'review' ? 'The queue is empty. Payments a member sends for review appear here instantly.' : 'No payments match these filters.'}</div> : (
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>Member</th><th>Payee</th><th className="r">Amount</th><th>Risk</th><th>Top reason</th><th>Status</th><th>When</th></tr></thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id} className={sel === t.id ? 'sel' : ''} onClick={() => setSel(t.id)}>
                      <td><div className="who"><span className="avatar">{initials(nameOf(t.userId))}</span><div><b>{nameOf(t.userId)}</b><small>{t.id}</small></div></div></td>
                      <td><b style={{ fontWeight: 500 }}>{t.payeeName}</b><br /><small className="mono dim">{t.payeeUpi}</small></td>
                      <td className="r mono">{inr(t.amount)}</td>
                      <td><TierPill tier={t.assessment.tier} score={t.assessment.score} /></td>
                      <td className="wrap muted">{t.assessment.reasons[0]?.label || 'No warning signs'}</td>
                      <td><StatusPill s={t.status} /></td>
                      <td className="muted">{ago(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {tx && <CaseDrawer tx={tx} db={db} onClose={() => setSel(null)} />}
    </>
  );
}

function CaseDrawer({ tx, db, onClose }) {
  const toast = useToast();
  const [report, setReport] = useState(false);
  const [copied, setCopied] = useState(false);
  const member = db.users[tx.userId];
  const reg = db.registry[tx.payeeUpi];
  const open = OPEN.includes(tx.status);
  const purpose = PURPOSES.find((p) => p.id === tx.purpose)?.label;
  const reportText = [
    'Draft complaint for the National Cyber Crime Reporting Portal (cybercrime.gov.in) / helpline 1930',
    `Complainant: ${member?.name || tx.userId}`,
    `Date and time: ${new Date(tx.createdAt).toLocaleString('en-IN')}`,
    `Attempted payment: ${inr(tx.amount)} to ${tx.payeeName} (${tx.payeeUpi})`,
    `Stated purpose: ${purpose || 'not given'}${tx.note ? ` · note “${tx.note}”` : ''}`,
    `Warning signs: ${tx.assessment.reasons.map((r) => r.label).join('; ')}`,
    `Outcome: ${tx.status.replace('_', ' ').toLowerCase()}`,
    'Generated by the PayShield prototype from synthetic data. Not submitted anywhere.'
  ].join('\n');
  const copy = async () => { try { await navigator.clipboard.writeText(reportText); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { toast('Select the text and copy it manually'); } };

  return (
    <>
      <div className="scrim" style={{ background: 'rgba(2,4,8,.5)' }} onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={`Case ${tx.id}`}>
        <header>
          <div><span className="eyebrow">Case {tx.id}</span><div className="h3" style={{ marginTop: 4 }}>{member?.name} → {tx.payeeName}</div></div>
          <button className="iconbtn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="content">
          <div className="spread"><b className="num" style={{ font: '800 34px var(--display)' }}>{inr(tx.amount)}</b><div className="row"><TierPill tier={tx.assessment.tier} score={tx.assessment.score} /><StatusPill s={tx.status} /></div></div>
          {open && (
            <div className="row wrap">
              <button className="btn ok sm" onClick={() => { adminReview(tx.id, true, 'a_meera'); toast(`${tx.id} released`); }}><Check size={15} />Release payment</button>
              <button className="btn danger sm" onClick={() => { adminReview(tx.id, false, 'a_meera'); toast(`${tx.id} kept stopped`); }}><X size={15} />Keep stopped</button>
            </div>
          )}
          <div className="panel" style={{ background: 'var(--panel2)' }}>
            <h2>Why the engine scored it {tx.assessment.score}</h2>
            <ReasonList reasons={tx.assessment.reasons} limit={10} />
          </div>
          {tx.assessment.storyVsFacts && <StoryVsFacts svf={tx.assessment.storyVsFacts} facts={tx.facts || (reg && { type: reg.type, ageDays: reg.ageDays, senders24h: reg.senders24h })} compact />}
          <div className="panel" style={{ background: 'var(--panel2)' }}>
            <h2>Safety check answers</h2>
            {tx.screening ? QUESTIONS.map((q) => (
              <div className="kv2" key={q.id}><span style={{ flex: 1 }}>{q.q}</span><b className={tx.screening[q.id] ? (q.id === 'independent_verification' ? 'c-low' : 'c-crit') : 'muted'}>{tx.screening[q.id] == null ? '—' : tx.screening[q.id] ? 'Yes' : 'No'}</b></div>
            )) : <p className="muted" style={{ margin: 0 }}>{tx.screeningSkipped ? 'Member skipped the questions.' : 'No questions were shown for this payment.'}</p>}
            <div className="kv2"><span>Stated purpose</span><b>{purpose || '—'}</b></div>
          </div>
          {reg && (
            <div className="panel" style={{ background: 'var(--panel2)' }}>
              <header><h2>Payee registry</h2><button className={`btn xs ${reg.reported ? 'danger' : 'soft'}`} onClick={() => { toggleReported(reg.upi, 'a_meera'); toast(reg.reported ? 'Report removed' : 'Payee marked as reported'); }}><Flag size={13} />{reg.reported ? 'Reported' : 'Mark reported'}</button></header>
              <div className="kv2"><span>Registered name</span><b>{reg.name}</b></div>
              <div className="kv2"><span>Type</span><b>{reg.type}</b></div>
              <div className="kv2"><span>Account age</span><b>{reg.ageDays} days</b></div>
              <div className="kv2"><span>Different senders today</span><b>{reg.senders24h}</b></div>
            </div>
          )}
          <div className="panel" style={{ background: 'var(--panel2)' }}>
            <h2>Timeline</h2>
            <div className="timeline">{(tx.timeline || []).map((e, i) => <div key={i}><span>{dateShort(e.t) === dateShort(Date.now()) ? clock(e.t) : dateShort(e.t)}</span><i /><p>{e.label}</p></div>)}</div>
          </div>
          <button className="btn soft block" onClick={() => setReport(!report)}><FileText size={16} />{report ? 'Hide' : 'Generate'} pre-filled cyber-crime report</button>
          {report && (
            <div className="panel" style={{ background: 'var(--panel2)' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', font: '12.5px/1.6 var(--mono)', color: 'var(--fg)' }}>{reportText}</pre>
              <button className="btn sm soft" onClick={copy}>{copied ? <><Check size={14} />Copied</> : <><Copy size={14} />Copy text</>}</button>
              <small className="muted">The member can file this at cybercrime.gov.in or by calling 1930. PayShield does not submit it.</small>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
