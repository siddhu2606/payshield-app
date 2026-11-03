import { PhoneCall, ShieldAlert, Baby, Hand, Lock } from 'lucide-react';
import { useDb, resolveRequest, resolveChildPayment, unlockPhone } from '../../core/store.js';
import { Top, Bellbtn } from '../MobileApp.jsx';
import { inr, initials, ago, StatusPill, TierPill, ReasonList, StoryVsFacts, useToast, useNow } from '../../ui.jsx';

export default function Alerts({ user }) {
  const db = useDb();
  const toast = useToast();
  useNow(15000);
  const mine = db.requests.filter((r) => r.toUserId === user.id);
  const pending = mine.filter((r) => r.status === 'pending');
  const done = mine.filter((r) => r.status !== 'pending').slice(0, 8);

  const act = (r, ok) => {
    (r.childPayment ? resolveChildPayment : resolveRequest)(r.id, ok, user.id);
    toast(ok ? 'Approved. They’ve been told.' : 'Stopped. Their phone is now locked and the call was cut.');
  };

  return (
    <>
      <Top avatar={<span className="avatar" style={{ color: '#b892ff' }}>{initials(user.name)}</span>} title="Alerts" sub={pending.length ? `${pending.length} need${pending.length === 1 ? 's' : ''} you` : 'All clear'} right={<Bellbtn userId={user.id} />} />
      <div className="m-body">
        {Object.values(db.users).filter((u) => u.lock && u.lock.by === user.id).map((u) => (
          <div key={u.id} className="alert-card mild" style={{ borderColor: 'color-mix(in srgb, var(--accent) 50%, var(--line))' }}>
            <span className="row"><Lock size={18} color="var(--accent-2)" /><b>{u.name.split(' ')[0]}’s phone is locked</b></span>
            <small className="muted">You stopped the payment, so PayShield cut the call and locked the phone. Call {u.name.split(' ')[0]} first, then unlock it when they’re safe. It also unlocks with their passcode after a 1-minute cool-off.</small>
            <button className="btn sm" onClick={() => { unlockPhone(u.id, user.id, 'guardian'); toast(`${u.name.split(' ')[0]}’s phone is unlocked`); }}>Unlock {u.name.split(' ')[0]}’s phone</button>
          </div>
        ))}
        {pending.length === 0 && (
          <div className="card" style={{ justifyItems: 'center', textAlign: 'center', padding: 26 }}>
            <span className="avatar lg" style={{ color: 'var(--t-low)' }}><ShieldAlert size={22} /></span>
            <b>Nothing needs you right now</b>
            <small className="muted">When Aarav shares a risky payment or Anaya asks for money, it appears here instantly.</small>
          </div>
        )}
        {pending.map((r) => <PendingCard key={r.id} r={r} db={db} onAct={act} />)}
        {done.length > 0 && (
          <div className="card">
            <span className="eyebrow">Earlier</span>
            <div className="list">
              {done.map((r) => (
                <div className="li" key={r.id}>
                  <span className="avatar">{initials(db.users[r.fromUserId]?.name)}</span>
                  <div className="t"><b>{db.users[r.fromUserId]?.name.split(' ')[0]} · {inr(r.amount)}</b><small>{r.kind === 'child' ? r.reason : 'Payment check'} · {ago(r.resolvedAt || r.createdAt)}</small></div>
                  <StatusPill s={r.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function PendingCard({ r, db, onAct }) {
  const from = db.users[r.fromUserId];
  const first = from?.name.split(' ')[0];
  if (r.kind === 'child') {
    return (
      <div className="alert-card mild">
        <div className="spread"><span className="row"><Baby size={18} color="var(--t-med)" /><b>{first} {r.childPayment ? 'wants to pay' : 'asked for money'}</b></span><small className="dim">{ago(r.createdAt)}</small></div>
        <span className="num" style={{ font: '800 32px var(--display)' }}>{inr(r.amount)}</span>
        <small className="muted">{r.childPayment ? `To ${r.payeeName} · ${r.reason} · ${r.why}` : r.reason}</small>
        {r.childPayment && r.facts?.type === 'individual' && r.facts.ageDays < 30 && (
          <div className="tier-banner tb-HIGH" style={{ padding: '10px 12px' }}><p style={{ fontSize: 13 }}>This account is {r.facts.ageDays} days old and {r.facts.senders24h} people paid it today. “Free coins” offers often look like this.</p></div>
        )}
        <div className="yn"><button onClick={() => onAct(r, false)}>Decline</button><button className="on" onClick={() => onAct(r, true)}>Approve</button></div>
      </div>
    );
  }
  const tx = db.transactions.find((t) => t.id === r.txId);
  const pressure = r.kind === 'pressure';
  return (
    <div className="alert-card">
      <div className="spread">
        <span className="row">{pressure ? <Hand size={18} color="var(--t-crit)" /> : <ShieldAlert size={18} color="var(--t-crit)" />}<b>{pressure ? `${first} pressed the pressure button` : `${first} wants you to check a payment`}</b></span>
        <small className="dim">{ago(r.createdAt)}</small>
      </div>
      {tx?.amount > 0 && <span className="num" style={{ font: '800 34px var(--display)' }}>{inr(tx.amount)}</span>}
      <small className="muted">{tx?.amount > 0 ? `To ${tx.payeeName} (${tx.payeeUpi}). The payment is on hold.` : 'They may be on a call with someone pressuring them. No payment details were entered yet.'}</small>
      {tx?.assessment && !pressure && <div className="spread"><span className="eyebrow">Why it was paused</span><TierPill tier={tx.assessment.tier} score={tx.assessment.score} /></div>}
      {tx?.assessment && !pressure && <ReasonList reasons={tx.assessment.reasons} limit={4} />}
      {tx?.assessment?.storyVsFacts && <StoryVsFacts svf={tx.assessment.storyVsFacts} facts={tx.facts} compact />}
      <div className="card flat tight"><span className="row"><PhoneCall size={16} color="var(--accent-2)" /><small>Call {first} first on <b className="mono">{from?.mobile}</b>. If someone else is on the line, ask {first} to hang up.</small></span></div>
      <div className="yn">
        <button style={{ borderColor: 'var(--t-crit)', color: 'var(--t-crit)' }} onClick={() => onAct(r, false)}>Stop payment</button>
        <button onClick={() => onAct(r, true)}>{tx?.amount > 0 && tx.payeeUpi !== 'not entered' ? 'It’s fine, release' : 'I’ve spoken to them'}</button>
      </div>
    </div>
  );
}
