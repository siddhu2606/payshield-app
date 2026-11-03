// Shown instead of the whole app once a guardian stops a payment. It deliberately shows no balance, payees,
// messages or notifications, so a caller watching the screen (or holding the phone) learns nothing.
import { useEffect, useState } from 'react';
import { Lock, Delete, PhoneCall, ShieldCheck } from 'lucide-react';
import { useDb, unlockPhone } from '../core/store.js';
import { checkPin, gate, fail, succeed } from '../core/auth.js';
import { tr, langOf } from '../core/i18n.js';

export default function LockScreen({ user }) {
  const db = useDb();
  const [now, setNow] = useState(Date.now());
  const [pad, setPad] = useState(false);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { try { navigator.vibrate?.([120, 80, 120]); } catch { /* ignore */ } }, []);
  const lock = user.lock;
  const guardian = db.users[lock.by];
  const left = Math.max(0, Math.ceil((lock.until - now) / 1000));
  const d = new Date(now);
  const L = tr(langOf(user));
  // Same bcrypt check and lock-out as sign-in, so the cool-off can't be brute-forced.
  const verify = async (pin) => {
    const g = gate(`pin.${user.id}`);
    if (!g.ok) { setErr(`Too many tries. Wait ${Math.ceil(g.waitMs / 1000)} s.`); setCode(''); return; }
    if (await checkPin(pin, user.pinHash)) { succeed(`pin.${user.id}`); unlockPhone(user.id, user.id, 'passcode'); return; }
    const a = fail(`pin.${user.id}`);
    setErr(a.ok ? 'Wrong passcode' : `Too many tries. Wait ${Math.ceil(a.waitMs / 1000)} s.`);
    setTimeout(() => setCode(''), 300);
  };
  const press = (k) => {
    setErr('');
    const next = k === 'del' ? code.slice(0, -1) : (code + k).slice(0, 4);
    setCode(next);
    if (next.length === 4) verify(next);
  };

  return (
    <div className="lock" role="dialog" aria-label="Phone locked">
      <div className="lock-time">
        <b className="num">{d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</b>
        <span>{d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>

      {!pad ? (
        <div className="lock-body">
          <span className="lock-badge"><ShieldCheck size={30} /><Lock size={16} className="lock-mini" /></span>
          <b className="h2" style={{ fontSize: 24 }}>{L.lockTitle}</b>
          <p>{L.lockBody(lock.reason)}</p>
          <div className="lock-card">
            <PhoneCall size={17} style={{ flex: 'none' }} />
            <span>{L.lockCallback.split('1930')[0]}<b className="mono">1930</b>{L.lockCallback.split('1930')[1]}</span>
          </div>
        </div>
      ) : (
        <div className="lock-body" style={{ gap: 16 }}>
          <b>Enter passcode</b>
          <div className="pin">{[0, 1, 2, 3].map((i) => <i key={i} className={i < code.length ? 'on' : ''} />)}</div>
          <div className="error" style={{ minHeight: 18 }} role="alert">{err}</div>
          <div className="keypad" style={{ width: '100%', maxWidth: 300 }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => <button key={k} onClick={() => press(k)}>{k}</button>)}
            <button onClick={() => { setPad(false); setCode(''); }} style={{ fontSize: 13 }}>Cancel</button>
            <button onClick={() => press('0')}>0</button>
            <button onClick={() => press('del')} aria-label="Delete"><Delete size={20} /></button>
          </div>
        </div>
      )}

      {!pad && (
        <div className="lock-foot">
          <button className="btn block" disabled={left > 0} onClick={() => setPad(true)}>
            {left > 0 ? `Unlock with passcode in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Unlock with passcode'}
          </button>
          <small>{guardian ? `${guardian.name.split(' ')[0]} can also unlock it from their phone.` : 'Your guardian can also unlock it.'}</small>
        </div>
      )}
    </div>
  );
}
