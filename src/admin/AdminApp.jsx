import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, ListChecks, Hourglass, IdCard, Database, SlidersHorizontal, FlaskConical, Users, ScrollText, LogOut, Smartphone, KeyRound } from 'lucide-react';
import { useDb } from '../core/store.js';
import { Logo, initials, SyncBadge } from '../ui.jsx';
import Overview from './Overview.jsx';
import Transactions from './Transactions.jsx';
import Kyc from './Kyc.jsx';
import Registry from './Registry.jsx';
import Policy from './Policy.jsx';
import Scenarios from './Scenarios.jsx';
import Roleplay from './Roleplay.jsx';
import Audit from './Audit.jsx';

const AKEY = 'ps.admin.session';
const readAdmin = () => { try { return sessionStorage.getItem(AKEY) || localStorage.getItem(AKEY); } catch { return null; } };

export function Head({ title, sub, right }) {
  return (
    <div className="ad-head">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      <div className="row wrap">{right}<span className="live"><i />Live</span></div>
    </div>
  );
}

export default function AdminApp() {
  const db = useDb();
  const [signed, setSigned] = useState(readAdmin);
  useEffect(() => { document.title = 'PayShield risk console'; document.documentElement.classList.remove('in-frame'); }, []);
  const signIn = () => { try { sessionStorage.setItem(AKEY, 'a_meera'); localStorage.setItem(AKEY, 'a_meera'); } catch { /* ignore */ } setSigned('a_meera'); };
  const signOut = () => { try { sessionStorage.removeItem(AKEY); localStorage.removeItem(AKEY); } catch { /* ignore */ } setSigned(null); };
  if (!signed) return <Login onDone={signIn} />;

  const review = db.transactions.filter((t) => ['PENDING_REVIEW', 'AWAITING_CONTACT'].includes(t.status)).length;
  const kyc = db.kyc.filter((k) => k.status === 'pending').length;
  const me = db.users.a_meera;
  const NAV = [
    ['Monitor', [['overview', 'Overview', LayoutDashboard], ['payments', 'Payments', ListChecks], ['review', 'Review queue', Hourglass, review], ['kyc', 'KYC queue', IdCard, kyc]]],
    ['Engine', [['registry', 'Payee registry', Database], ['policy', 'Policy & weights', SlidersHorizontal]]],
    ['Evidence', [['scenarios', 'Scenario suite', FlaskConical], ['roleplay', 'Role-play test', Users], ['audit', 'Audit log', ScrollText]]]
  ];
  return (
    <div className="ad">
      <nav className="ad-side" aria-label="Console">
        <div className="brand"><Logo size={26} sub="Risk console" /></div>
        {NAV.map(([sec, items]) => (
          <div key={sec} style={{ display: 'contents' }}>
            <div className="sec">{sec}</div>
            {items.map(([to, label, Icon, badge]) => (
              <NavLink key={to} to={to}><Icon size={18} />{label}{badge ? <em>{badge}</em> : null}</NavLink>
            ))}
          </div>
        ))}
        <div className="me">
          <div className="row"><span className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials(me.name)}</span><div className="grow"><b style={{ fontSize: 13 }}>{me.name}</b><br /><small className="muted mono">{me.staffId}</small></div></div>
          <SyncBadge compact />
          <Link to="/app" className="row muted" style={{ textDecoration: 'none', fontSize: 13 }}><Smartphone size={15} />Open mobile app</Link>
          <button className="link row" style={{ color: 'var(--mute)', textDecoration: 'none', fontSize: 13 }} onClick={signOut}><LogOut size={15} />Sign out</button>
        </div>
      </nav>
      <main className="ad-main">
        <Routes>
          <Route path="overview" element={<Overview />} />
          <Route path="payments" element={<Transactions mode="all" />} />
          <Route path="review" element={<Transactions mode="review" />} />
          <Route path="kyc" element={<Kyc />} />
          <Route path="registry" element={<Registry />} />
          <Route path="policy" element={<Policy />} />
          <Route path="scenarios" element={<Scenarios />} />
          <Route path="roleplay" element={<Roleplay />} />
          <Route path="audit" element={<Audit />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Login({ onDone }) {
  const [step, setStep] = useState(0);
  const [id, setId] = useState('RISK-2291');
  const [pw, setPw] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [err, setErr] = useState('');
  const refs = useRef([]);
  const first = () => {
    if (id.trim().toUpperCase() !== 'RISK-2291' || pw !== 'demo') { setErr('Use the demo staff ID RISK-2291 and password demo.'); return; }
    setErr(''); setStep(1); setTimeout(() => refs.current[0]?.focus(), 50);
  };
  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[i] = d; setOtp(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
    if (next.join('').length === 6) { if (next.join('') === '246810') setTimeout(onDone, 150); else setErr('Code didn’t match. The demo code is 246810.'); }
  };
  return (
    <div className="login-wrap">
      <div className="login-card">
        <Logo size={30} sub="Risk console" />
        {step === 0 ? (
          <form onSubmit={(e) => { e.preventDefault(); first(); }} style={{ display: 'grid', gap: 14 }}>
            <div><h1 className="h2">Staff sign in</h1><p className="muted" style={{ margin: '6px 0 0' }}>For the bank’s risk and KYC team.</p></div>
            <div className="field"><label htmlFor="sid">Employee ID</label><input id="sid" className="input mono" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" /></div>
            <div className="field"><label htmlFor="spw">Password</label><input id="spw" className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" placeholder="demo" /></div>
            {err && <div className="error" role="alert">{err}</div>}
            <button className="btn block" type="submit"><KeyRound size={17} />Continue</button>
            <button className="btn ghost block" type="button" onClick={() => { setPw('demo'); setErr(''); setStep(1); }}>Use demo credentials</button>
            <p className="help" style={{ margin: 0 }}>Demo: <span className="mono">RISK-2291</span> / <span className="mono">demo</span>, then code <span className="mono">246810</span>.</p>
          </form>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            <div><h1 className="h2">Two-step check</h1><p className="muted" style={{ margin: '6px 0 0' }}>Enter the 6-digit code from your authenticator app.</p></div>
            <div className="otp">{otp.map((d, i) => <input key={i} ref={(el) => (refs.current[i] = el)} className="input" inputMode="numeric" aria-label={`Digit ${i + 1}`} value={d} onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => e.key === 'Backspace' && !d && i > 0 && refs.current[i - 1]?.focus()} />)}</div>
            {err && <div className="error" role="alert">{err}</div>}
            <button className="btn block" onClick={onDone}>Use demo code</button>
            <button className="link" onClick={() => setStep(0)}>Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
