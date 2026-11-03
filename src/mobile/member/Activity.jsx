import { useState } from 'react';
import { useDb, historyOf, decide } from '../../core/store.js';
import { Top, Bellbtn } from '../MobileApp.jsx';
import { inr, initials, ago, clock, dateShort, MemberStatus, TierPill, ReasonList, StoryVsFacts, Sheet } from '../../ui.jsx';

const OPEN = ['AWAITING_CONTACT', 'PENDING_REVIEW', 'AWAITING_DECISION'];

export default function Activity({ user }) {
  const db = useDb();
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState(null);
  const all = historyOf(db, user.id);
  const list = all.filter((t) => filter === 'all' || (filter === 'checked' ? t.kind === 'assessed' : filter === 'open' ? OPEN.includes(t.status) || t.status === 'POSTPONED' : true));
  const tx = sel && db.transactions.find((t) => t.id === sel);

  // Group by day for scanning.
  const groups = [];
  list.forEach((t) => {
    const k = dateShort(t.createdAt);
    const g = groups.find((x) => x.k === k);
    g ? g.items.push(t) : groups.push({ k, items: [t] });
  });

  return (
    <>
      <Top title="Activity" sub={`${all.length} payments`} right={<Bellbtn userId={user.id} />} />
      <div className="m-body">
        <div className="seg" role="tablist">
          {[['all', 'All'], ['checked', 'Checked'], ['open', 'Paused']].map(([k, l]) => <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>)}
        </div>
        {list.length === 0 && <p className="muted" style={{ textAlign: 'center', padding: 30 }}>Nothing here yet.</p>}
        {groups.map((g) => (
          <div key={g.k} className="card" style={{ paddingTop: 12 }}>
            <span className="eyebrow">{g.k}</span>
            <div className="list">
              {g.items.map((t) => (
                <button key={t.id} className="li" onClick={() => setSel(t.id)}>
                  <span className="avatar">{initials(t.payeeName)}</span>
                  <span className="t"><b>{t.payeeName}</b><small>{t.note || 'Payment'} · {clock(t.createdAt)}</small></span>
                  <span style={{ display: 'grid', justifyItems: 'end', gap: 4 }}>
                    <span className="amt" style={{ textDecoration: ['CANCELLED'].includes(t.status) ? 'line-through' : 'none', color: t.status === 'CANCELLED' ? 'var(--dim)' : undefined }}>−{inr(t.amount)}</span>
                    {t.status !== 'COMPLETED' ? <MemberStatus tx={t} /> : t.assessment && !t.discreet ? <TierPill tier={t.assessment.tier} /> : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {tx && (
        <Sheet onClose={() => setSel(null)} label="Payment details">
          <div className="spread"><b className="h3">{tx.payeeName}</b><MemberStatus tx={tx} /></div>
          <div className="spread"><span className="mono muted">{tx.payeeUpi}</span><b className="num" style={{ font: '800 24px var(--display)' }}>{inr(tx.amount)}</b></div>
          {tx.discreet && <p className="muted" style={{ margin: 0 }}>Payment paused for a routine security check. You’ll be notified shortly.</p>}
          {tx.assessment && !tx.discreet && (
            <div className="card flat">
              <div className="spread"><span className="eyebrow">Risk check</span><TierPill tier={tx.assessment.tier} score={tx.assessment.score} /></div>
              <ReasonList reasons={tx.assessment.reasons} />
            </div>
          )}
          {tx.assessment?.storyVsFacts && <StoryVsFacts svf={tx.assessment.storyVsFacts} facts={tx.facts} compact />}
          {tx.timeline && !tx.discreet && (
            <div className="card flat">
              <span className="eyebrow">Timeline</span>
              {tx.timeline.map((e, i) => <div key={i} className="row" style={{ alignItems: 'flex-start' }}><span className="mono dim" style={{ fontSize: 12, width: 56, flex: 'none' }}>{clock(e.t)}</span><span style={{ fontSize: 13.5 }}>{e.label}</span></div>)}
            </div>
          )}
          {['AWAITING_DECISION', 'POSTPONED'].includes(tx.status) && (
            <div className="col" style={{ gap: 8 }}>
              <button className="btn danger block" onClick={() => { decide(tx.id, 'CANCELLED'); setSel(null); }}>Cancel payment</button>
              {tx.assessment?.tier !== 'CRITICAL' && <button className="btn ghost block" onClick={() => { decide(tx.id, 'CONTINUED'); setSel(null); }}>I’ve checked, pay now</button>}
            </div>
          )}
          <small className="dim">Reference {tx.id} · {ago(tx.createdAt)} · simulated, no real money moved</small>
        </Sheet>
      )}
    </>
  );
}
