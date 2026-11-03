import { LogOut, RotateCcw } from 'lucide-react';
import { useDb, updateChild, childSpentToday, resetDemo } from '../../core/store.js';
import { Top } from '../MobileApp.jsx';
import { inr, initials, useToast } from '../../ui.jsx';

export default function Family({ user, signOut }) {
  const db = useDb();
  const toast = useToast();
  const members = Object.values(db.users).filter((u) => u.role === 'member' && u.trustedContactId === user.id);
  const kids = Object.values(db.users).filter((u) => u.role === 'child' && u.guardianId === user.id);
  return (
    <>
      <Top title="Family" sub="People who trust you" avatar={<span className="avatar" style={{ color: '#b892ff' }}>{initials(user.name)}</span>} />
      <div className="m-body">
        {members.map((m) => {
          const checked = db.transactions.filter((t) => t.userId === m.id && t.kind === 'assessed').length;
          return (
            <div className="card" key={m.id}>
              <div className="row"><span className="avatar lg">{initials(m.name)}</span><div className="grow"><b>{m.name}</b><br /><small className="muted">Member · named you as trusted contact</small></div><span className="pill fill c-low">Linked</span></div>
              <small className="muted">{checked} payment{checked === 1 ? '' : 's'} checked by PayShield. You only see a payment when {m.name.split(' ')[0]} chooses to share it or presses the pressure button.</small>
            </div>
          );
        })}
        {kids.map((k) => {
          const spent = childSpentToday(db, k.id);
          return (
            <div className="card" key={k.id}>
              <div className="row"><span className="avatar lg" style={{ color: 'var(--t-med)' }}>{initials(k.name)}</span><div className="grow"><b>{k.name}</b><br /><small className="muted">Child · age {k.age} · balance {inr(k.balance)}</small></div><span className="pill fill c-med">Child</span></div>
              <div className="field">
                <label htmlFor={`lim-${k.id}`}>Daily limit · {inr(k.dailyLimit)}</label>
                <input id={`lim-${k.id}`} type="range" className="range" min="100" max="2000" step="100" value={k.dailyLimit} onChange={(e) => updateChild(k.id, { dailyLimit: Number(e.target.value) }, user.id)} />
                <span className="help">{inr(spent)} spent today</span>
              </div>
              <label className="toggle-row"><span>Approve every payment<small>Instead of the daily limit</small></span><input type="checkbox" className="switch" checked={!!k.approveAll} onChange={(e) => { updateChild(k.id, { approveAll: e.target.checked }, user.id); toast(e.target.checked ? 'Every payment now needs your OK' : 'Daily limit is back on'); }} /></label>
              <div className="chips">{[200, 500].map((a) => <button key={a} className="chip" onClick={() => { updateChild(k.id, { balance: k.balance + a }, user.id); toast(`Added ${inr(a)} to ${k.name.split(' ')[0]}’s pocket money`); }}>+ {inr(a)} pocket money</button>)}</div>
            </div>
          );
        })}
        <button className="btn ghost block" onClick={() => { resetDemo(); toast('Demo data reset'); }}><RotateCcw size={16} />Reset demo data</button>
        <button className="btn ghost block" onClick={signOut}><LogOut size={16} />Sign out</button>
      </div>
    </>
  );
}
