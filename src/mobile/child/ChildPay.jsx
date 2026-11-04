import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Hourglass, AlertTriangle, Link2 } from 'lucide-react';
import { useDb, childPay, childSpentToday } from '../../core/store.js';
import { factsFor } from '../../core/data.js';
import { Top } from '../MobileApp.jsx';
import { inr, initials } from '../../ui.jsx';

export default function ChildPay({ user }) {
  const db = useDb();
  const [upi, setUpi] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [res, setRes] = useState(null);
  const loc = useLocation();
  const [source, setSource] = useState(null);
  useEffect(() => { if (loc.state?.upi) { setUpi(loc.state.upi); setAmount(String(loc.state.amount || '')); setNote(loc.state.note || ''); setRes(null); setSource(loc.state.msgId ? { msgId: loc.state.msgId } : null); } }, [loc.state]);
  const [err, setErr] = useState('');
  const saved = db.beneficiaries.filter((b) => b.userId === user.id);
  const amt = Number(amount) || 0;
  const g = db.users[user.guardianId]?.name.split(' ')[0];
  const left = Math.max(0, user.dailyLimit - childSpentToday(db, user.id));
  const facts = upi && factsFor(db.registry, upi.trim().toLowerCase());
  const isSaved = saved.some((b) => b.upi === upi.trim().toLowerCase());
  const risky = facts && !isSaved && facts.type === 'individual' && facts.ageDays < 30;

  const pay = () => {
    const r = childPay({ childId: user.id, upi: upi.trim().toLowerCase(), amount: amt, note: note || 'Payment', source });
    if (r.error) setErr(r.error); else { setErr(''); setRes(r); }
  };

  if (res) {
    const pending = !!res.pending;
    return (
      <>
        <Top title={pending ? 'Sent to ' + g : 'Paid'} sub={pending ? res.pending.why : 'Within today’s limit'} />
        <div className="m-body">
          <div className="result">
            <div className="badge" style={{ color: pending ? 'var(--t-med)' : 'var(--t-low)', background: `color-mix(in srgb, ${pending ? 'var(--t-med)' : 'var(--t-low)'} 16%, transparent)` }}>{pending ? <Hourglass size={40} /> : <Check size={44} />}</div>
            <span className="big num">{inr(amt)}</span>
            <b className="h3">{pending ? `${g} needs to OK this` : 'Payment sent'}</b>
            <p className="muted" style={{ margin: 0 }}>{pending ? 'You’ll get a notification when they reply.' : 'Simulated payment. No real money moved.'}</p>
          </div>
          <button className="btn block" onClick={() => { setRes(null); setAmount(''); setNote(''); setUpi(''); }}>Done</button>
        </div>
      </>
    );
  }

  return (
    <>
      <Top title="Pay" sub={user.approveAll ? `${g} approves every payment` : `${inr(left)} left today`} />
      <div className="m-body">
        {source?.msgId && (() => { const m = (db.messages || []).find((x) => x.id === source.msgId); return m && (
          <div className="tier-banner tb-HIGH" style={{ gap: 4 }}>
            <span className="row" style={{ gap: 6 }}><Link2 size={16} color="var(--t-high)" /><b style={{ fontSize: 14.5 }}>Opened from a link in a message</b></span>
            <p style={{ fontSize: 13 }}>From {m.from}. You didn’t type these details. {g} will check this payment before any money moves.</p>
          </div>
        ); })()}
        <div className="card">
          <span className="eyebrow">Pay to</span>
          <div className="list">
            {saved.map((b) => (
              <button key={b.id} className="li" onClick={() => setUpi(b.upi)} style={{ background: upi === b.upi ? 'var(--accent-soft)' : undefined, borderRadius: 10, paddingInline: 8 }}>
                <span className="avatar">{initials(b.name)}</span><span className="t"><b>{b.name}</b><small>{b.tag}</small></span>{upi === b.upi && <Check size={18} color="var(--accent-2)" />}
              </button>
            ))}
          </div>
          <div className="field"><label htmlFor="cupi">Or a UPI ID</label><input id="cupi" className="input" placeholder="name@bank" autoCapitalize="none" value={upi} onChange={(e) => setUpi(e.target.value)} /></div>
          <div className="chips"><button className="chip" onClick={() => { setUpi('gamecoins.topup@okdemo'); setAmount('300'); setNote('Free game coins'); }}>Demo: “free game coins” offer</button></div>
        </div>
        {risky && (
          <div className="tier-banner tb-HIGH">
            <span className="row"><AlertTriangle size={18} color="var(--t-high)" /><b style={{ fontSize: 16 }}>Careful with this one</b></span>
            <p>This account was opened {facts.ageDays} days ago and {facts.senders24h} people paid it today. Offers of free coins or prizes are often tricks. {g} will check it first.</p>
          </div>
        )}
        <div className="field"><label htmlFor="camt">Amount</label><input id="camt" className="input num" inputMode="numeric" placeholder="₹" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 5))} /></div>
        <div className="field"><label htmlFor="cnote">What’s it for?</label><input id="cnote" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lunch, books…" /></div>
        {err && <div className="error" role="alert">{err}</div>}
        <button className="btn block" disabled={!amt || !upi.includes('@')} onClick={pay}>{!isSaved || amt > left || user.approveAll ? `Send to ${g} for OK` : `Pay ${inr(amt)}`}</button>
      </div>
    </>
  );
}
