import { Link } from 'react-router-dom';
import { Send, HandCoins, LogOut } from 'lucide-react';
import { useDb, historyOf, childSpentToday } from '../../core/store.js';
import { Top, Bellbtn } from '../MobileApp.jsx';
import { inr, initials, ago, StatusPill, SyncBadge } from '../../ui.jsx';

export default function ChildHome({ user, signOut }) {
  const db = useDb();
  const guardian = db.users[user.guardianId];
  const today = childSpentToday(db, user.id);
  const left = Math.max(0, user.dailyLimit - today);
  const hist = historyOf(db, user.id).filter((t) => t.status === 'COMPLETED');
  const reqs = db.requests.filter((r) => r.fromUserId === user.id).slice(0, 4);
  return (
    <>
      <Top avatar={<span className="avatar" style={{ color: 'var(--t-med)' }}>{initials(user.name)}</span>} title={`Hey ${user.name.split(' ')[0]}`} sub="Child account" right={<Bellbtn userId={user.id} />} />
      <div className="m-body">
        <div className="child-hero">
          <small style={{ color: '#c9d3ff' }}>Pocket money</small>
          <span className="num" style={{ font: '800 38px/1 var(--display)' }}>{inr(user.balance)}</span>
          <small style={{ color: '#c9d3ff' }}>Linked to {guardian?.name}</small>
        </div>
        <div className="card">
          <div className="spread"><b>Today’s limit</b><span className="mono">{inr(today)} / {inr(user.dailyLimit)}</span></div>
          <div className="meter"><i style={{ width: `${Math.min(100, (today / user.dailyLimit) * 100)}%`, background: left === 0 ? 'var(--t-high)' : 'var(--accent)' }} /></div>
          <small className="muted">{user.approveAll ? `${guardian?.name.split(' ')[0]} approves every payment.` : left ? `${inr(left)} left today. Bigger payments go to ${guardian?.name.split(' ')[0]} first.` : `You’ve reached today’s limit. Ask ${guardian?.name.split(' ')[0]} if you need more.`}</small>
        </div>
        <div className="quick" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Link to="../pay"><span className="ic"><Send size={19} /></span>Pay</Link>
          <Link to="../ask"><span className="ic"><HandCoins size={19} /></span>Ask {guardian?.name.split(' ')[0]}</Link>
        </div>
        {reqs.length > 0 && (
          <div className="card">
            <span className="eyebrow">Your requests</span>
            <div className="list">
              {reqs.map((r) => <div className="li" key={r.id}><span className="avatar">{initials(guardian?.name)}</span><div className="t"><b>{inr(r.amount)} · {r.reason}</b><small>{r.payeeName ? `To ${r.payeeName} · ` : ''}{ago(r.createdAt)}</small></div><StatusPill s={r.status} /></div>)}
            </div>
          </div>
        )}
        <div className="card">
          <span className="eyebrow">Recent</span>
          <div className="list">
            {hist.slice(0, 5).map((t) => <div className="li" key={t.id}><span className="avatar">{initials(t.payeeName)}</span><div className="t"><b>{t.payeeName}</b><small>{t.note} · {ago(t.createdAt)}</small></div><span className="amt">−{inr(t.amount)}</span></div>)}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}><SyncBadge /></div>
        <button className="btn ghost block" onClick={signOut}><LogOut size={16} />Sign out</button>
      </div>
    </>
  );
}
