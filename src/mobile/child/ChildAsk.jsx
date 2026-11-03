import { useState } from 'react';
import { Check } from 'lucide-react';
import { useDb, childAsk } from '../../core/store.js';
import { Top } from '../MobileApp.jsx';
import { inr, ago, StatusPill, useToast } from '../../ui.jsx';

export default function ChildAsk({ user }) {
  const db = useDb();
  const toast = useToast();
  const g = db.users[user.guardianId]?.name.split(' ')[0];
  const [amount, setAmount] = useState(500);
  const [reason, setReason] = useState('School trip');
  const [why, setWhy] = useState('Class trip on Friday');
  const mine = db.requests.filter((r) => r.fromUserId === user.id && !r.childPayment);
  return (
    <>
      <Top title={`Ask ${g}`} sub="For pocket money top-ups" />
      <div className="m-body">
        <div className="card" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <span className="eyebrow">How much?</span>
          <span className="num" style={{ font: '800 44px var(--display)' }}>{inr(amount)}</span>
          <div className="chips" style={{ justifyContent: 'center' }}>{[200, 500, 1000, 1500].map((a) => <button key={a} className={`chip ${amount === a ? 'on' : ''}`} onClick={() => setAmount(a)}>{inr(a)}</button>)}</div>
        </div>
        <div className="field"><span className="label">For</span><div className="chips">{['School trip', 'Books', 'Gift', 'Other'].map((r) => <button key={r} className={`chip ${reason === r ? 'on' : ''}`} onClick={() => setReason(r)}>{r}</button>)}</div></div>
        <div className="field"><label htmlFor="why">Tell {g} why</label><input id="why" className="input" value={why} onChange={(e) => setWhy(e.target.value)} /></div>
        <button className="btn block" onClick={() => { childAsk({ childId: user.id, amount, reason: `${reason}${why ? ` · ${why}` : ''}` }); toast(`Sent to ${g}`); }}>Send request</button>
        {mine.length > 0 && (
          <div className="card">
            <span className="eyebrow">Earlier requests</span>
            <div className="list">{mine.slice(0, 6).map((r) => <div className="li" key={r.id}><span className="avatar">{r.status === 'approved' ? <Check size={16} /> : '₹'}</span><div className="t"><b>{inr(r.amount)}</b><small>{r.reason} · {ago(r.createdAt)}</small></div><StatusPill s={r.status} /></div>)}</div>
          </div>
        )}
      </div>
    </>
  );
}
