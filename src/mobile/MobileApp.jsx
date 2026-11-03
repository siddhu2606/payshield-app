import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useSearchParams, useNavigate } from 'react-router-dom';
import { Home, Send, Clock, ShieldCheck, Bell, Users, HandCoins, Wallet, UserRound, ArrowLeft, Baby, Check, Camera, IdCard, ChevronRight, Delete, PhoneCall, ListChecks } from 'lucide-react';
import { useDb, registerMember, markNotificationsRead } from '../core/store.js';
import { PERSONAS } from '../core/data.js';
import { cleanName, cleanMobile } from '../core/validate.js';
import { Logo, Sheet, ago, initials, SyncBadge } from '../ui.jsx';
import MemberHome from './member/MemberHome.jsx';
import PayFlow from './member/PayFlow.jsx';
import Activity from './member/Activity.jsx';
import Safety from './member/Safety.jsx';
import ChildHome from './child/ChildHome.jsx';
import ChildPay from './child/ChildPay.jsx';
import ChildAsk from './child/ChildAsk.jsx';
import Alerts from './guardian/Alerts.jsx';
import Family from './guardian/Family.jsx';
import CallLayer from './CallLayer.jsx';
import MessageLayer, { LinkOpen } from './MessageLayer.jsx';
import { startCallWatch } from '../core/device.js';
import { checkPin, gate, fail, succeed } from '../core/auth.js';
import LockScreen from './LockScreen.jsx';
import { CallerConsole, CallerLog } from './caller/Caller.jsx';

const SKEY = `ps.session.${(typeof window !== 'undefined' && window.name) || 'main'}`;
function readSession() { try { return JSON.parse(sessionStorage.getItem(SKEY) || localStorage.getItem(SKEY) || 'null'); } catch { return null; } }
function writeSession(s) {
  try {
    if (s) { sessionStorage.setItem(SKEY, JSON.stringify(s)); localStorage.setItem(SKEY, JSON.stringify(s)); }
    else { sessionStorage.removeItem(SKEY); localStorage.removeItem(SKEY); }
  } catch { /* ignore */ }
}

export function Top({ title, sub, back, right, avatar }) {
  const nav = useNavigate();
  return (
    <header className="m-top">
      {back ? <button className="iconbtn" onClick={typeof back === 'function' ? back : () => nav(-1)} aria-label="Back"><ArrowLeft size={19} /></button> : avatar}
      <div className="title"><b>{title}</b>{sub && <small>{sub}</small>}</div>
      {right}
    </header>
  );
}

export function Bellbtn({ userId }) {
  const db = useDb();
  const [open, setOpen] = useState(false);
  const mine = db.notifications.filter((n) => n.userId === userId);
  const unread = mine.some((n) => !n.read);
  return (
    <>
      <button className="iconbtn" aria-label={`Notifications${unread ? ', unread' : ''}`} onClick={() => { setOpen(true); markNotificationsRead(userId); }}>
        <Bell size={19} />{unread && <span className="dot" />}
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)} label="Notifications">
          <span className="h3">Notifications</span>
          {mine.length === 0 && <p className="muted" style={{ margin: 0 }}>Nothing yet. Alerts from PayShield and your family appear here.</p>}
          <div className="list">
            {mine.slice(0, 12).map((n) => (
              <div className="li" key={n.id}><span className="avatar"><Bell size={16} /></span><div className="t"><b>{n.title}</b><small>{n.body}</small></div><small className="dim">{ago(n.t)}</small></div>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}

export default function MobileApp() {
  const db = useDb();
  const [sp] = useSearchParams();
  const [session, setSession] = useState(readSession);
  const embedded = sp.get('frame') === '1';

  useEffect(() => {
    const as = sp.get('as');
    if (as && PERSONAS[as] && as !== 'admin' && (!session || session.role !== as)) {
      const s = { userId: PERSONAS[as].id, role: as };
      writeSession(s); setSession(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { document.documentElement.classList.toggle('in-frame', embedded); }, [embedded]);
  useEffect(() => { document.title = 'PayShield app'; }, []);

  const signIn = (s) => { writeSession(s); setSession(s); };
  const signOut = () => { writeSession(null); setSession(null); };
  const user = session && db.users[session.userId];
  useEffect(() => { if (user && ['member', 'child'].includes(user.role)) startCallWatch(); }, [user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  let content;
  if (!user) content = <SignIn onSignIn={signIn} />;
  else if (user.lock && ['member', 'child'].includes(user.role)) content = <LockScreen user={user} />;
  else if (user.role === 'member') content = <MemberApp user={user} signOut={signOut} />;
  else if (user.role === 'child') content = <ChildApp user={user} signOut={signOut} />;
  else if (user.role === 'caller') content = <CallerApp user={user} signOut={signOut} />;
  else content = <GuardianApp user={user} signOut={signOut} />;

  return <div className="m-stage"><div className="m-shell">{content}</div></div>;
}

function Tabs({ items }) {
  return (
    <nav className="m-tabs" aria-label="Main">
      {items.map(([to, label, Icon, badge]) => (
        <NavLink key={to} to={`/app/${to}`} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon size={22} />{label}{badge ? <span className="badge">{badge}</span> : null}
        </NavLink>
      ))}
    </nav>
  );
}

function MemberApp({ user, signOut }) {
  const db = useDb();
  const waiting = db.transactions.filter((t) => t.userId === user.id && ['AWAITING_CONTACT', 'PENDING_REVIEW', 'AWAITING_DECISION'].includes(t.status) && !t.seeded).length;
  return (
    <>
      <CallLayer user={user} />
      <MessageLayer user={user} />
      <Routes>
        <Route path="home" element={<MemberHome user={user} />} />
        <Route path="l/:code" element={<LinkOpen user={user} />} />
        <Route path="pay" element={<PayFlow user={user} />} />
        <Route path="activity" element={<Activity user={user} />} />
        <Route path="safety" element={<Safety user={user} signOut={signOut} />} />
        <Route path="*" element={<Navigate to="/app/home" replace />} />
      </Routes>
      <Tabs items={[['home', 'Home', Home], ['pay', 'Pay', Send], ['activity', 'Activity', Clock, waiting], ['safety', 'Safety', ShieldCheck]]} />
    </>
  );
}

function ChildApp({ user, signOut }) {
  return (
    <>
      <CallLayer user={user} />
      <MessageLayer user={user} />
      <Routes>
        <Route path="home" element={<ChildHome user={user} signOut={signOut} />} />
        <Route path="l/:code" element={<LinkOpen user={user} />} />
        <Route path="pay" element={<ChildPay user={user} />} />
        <Route path="ask" element={<ChildAsk user={user} />} />
        <Route path="*" element={<Navigate to="/app/home" replace />} />
      </Routes>
      <Tabs items={[['home', 'Home', Wallet], ['pay', 'Pay', Send], ['ask', 'Ask', HandCoins]]} />
    </>
  );
}

function GuardianApp({ user, signOut }) {
  const db = useDb();
  const pending = db.requests.filter((r) => r.toUserId === user.id && r.status === 'pending').length;
  return (
    <>
      <Routes>
        <Route path="alerts" element={<Alerts user={user} />} />
        <Route path="family" element={<Family user={user} signOut={signOut} />} />
        <Route path="*" element={<Navigate to="/app/alerts" replace />} />
      </Routes>
      <Tabs items={[['alerts', 'Alerts', Bell, pending], ['family', 'Family', Users]]} />
    </>
  );
}

function CallerApp({ user, signOut }) {
  return (
    <>
      <Routes>
        <Route path="call" element={<CallerConsole user={user} signOut={signOut} />} />
        <Route path="results" element={<CallerLog />} />
        <Route path="*" element={<Navigate to="/app/call" replace />} />
      </Routes>
      <Tabs items={[['call', 'Call', PhoneCall], ['results', 'Results', ListChecks]]} />
    </>
  );
}

/* ---------------- sign in ---------------- */
const ROLE_CARDS = [
  { role: 'member', title: 'Member', sub: 'Pay people and stay protected', Icon: UserRound, color: 'var(--accent)' },
  { role: 'child', title: 'Child', sub: 'Pocket money with a daily limit', Icon: Baby, color: 'var(--t-med)' },
  { role: 'guardian', title: 'Guardian', sub: 'Approve held payments, set limits', Icon: ShieldCheck, color: '#b892ff' },
  { role: 'caller', title: 'Scam caller', sub: 'Role-play phone that makes the fake calls', Icon: PhoneCall, color: 'var(--t-crit)', sim: true }
];

function SignIn({ onSignIn }) {
  const [role, setRole] = useState(null);
  const [onboard, setOnboard] = useState(false);
  if (onboard) return <Onboarding onDone={(id) => onSignIn({ userId: id, role: 'member' })} onBack={() => setOnboard(false)} />;
  if (role) return <Passcode role={role} onBack={() => setRole(null)} onOk={() => onSignIn({ userId: PERSONAS[role].id, role })} />;
  return (
    <div className="m-body" style={{ paddingTop: 'calc(30px + env(safe-area-inset-top, 0px))' }}>
      <div className="signin">
        <Logo size={34} sub="Pause before you pay" />
        <div style={{ marginTop: 18 }}>
          <h1 className="h2" style={{ fontSize: 30 }}>Who’s using this phone?</h1>
          <p className="muted" style={{ margin: '8px 0 0' }}>PayShield checks that a payment is being made freely, not only by the right person.</p>
        </div>
        {ROLE_CARDS.map(({ role: r, title, sub, Icon, color, sim }) => (
          <button key={r} className="persona" onClick={() => setRole(r)}>
            <span className="ic" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}><Icon size={23} /></span>
            <span className="grow"><b style={{ display: 'block', fontSize: 16 }}>{title}{sim && <span className="pill fill c-crit" style={{ marginLeft: 8, verticalAlign: 2 }}>simulation</span>}</b><small className="muted">{sub}</small><br /><small className="dim">{sim ? 'For testing PayShield in the role-play' : `Demo: ${PERSONAS[r].label}`}</small></span>
            <ChevronRight size={18} className="dim" />
          </button>
        ))}
        <button className="btn ghost block" onClick={() => setOnboard(true)}>New member? Create an account</button>
        <div style={{ display: 'flex', justifyContent: 'center' }}><SyncBadge /></div>
        <p className="help" style={{ textAlign: 'center', margin: 0 }}>Simulated app. Fictional people and money. Never enter a real PIN, OTP or ID number.</p>
      </div>
    </div>
  );
}

function Passcode({ role, onBack, onOk }) {
  const db = useDb();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const userId = PERSONAS[role].id;
  // Checked against the stored bcrypt hash; 5 wrong tries lock sign-in for 30 s, then longer each time.
  const verify = async (pin) => {
    const g = gate(`pin.${userId}`);
    if (!g.ok) { setErr(`Too many tries. Wait ${Math.ceil(g.waitMs / 1000)} s.`); setCode(''); return; }
    setBusy(true);
    const ok = await checkPin(pin, db.users[userId]?.pinHash);
    setBusy(false);
    if (ok) { succeed(`pin.${userId}`); onOk(); return; }
    const after = fail(`pin.${userId}`);
    setErr(after.ok ? `Wrong passcode. ${after.left} ${after.left === 1 ? 'try' : 'tries'} left before a pause.` : `Too many tries. Wait ${Math.ceil(after.waitMs / 1000)} s.`);
    setTimeout(() => setCode(''), 300);
  };
  const press = (k) => {
    if (busy) return;
    setErr('');
    const next = k === 'del' ? code.slice(0, -1) : (code + k).slice(0, 4);
    setCode(next);
    if (next.length === 4) verify(next);
  };
  return (
    <>
      <Top title="Sign in" sub={PERSONAS[role].label} back={onBack} />
      <div className="m-body" style={{ alignContent: 'center', gap: 22 }}>
        <div style={{ textAlign: 'center', display: 'grid', gap: 10, justifyItems: 'center' }}>
          <span className="avatar lg">{initials(PERSONAS[role].label)}</span>
          <b style={{ fontSize: 18 }}>Enter your app passcode</b>
          <span className="help">Demo passcode: <span className="mono">1234</span></span>
        </div>
        <div className="pin" aria-label={`${code.length} of 4 digits entered`}>{[0, 1, 2, 3].map((i) => <i key={i} className={i < code.length ? 'on' : ''} />)}</div>
        <div className="error" style={{ textAlign: 'center', minHeight: 18 }} role="alert">{err}</div>
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => <button key={k} onClick={() => press(k)}>{k}</button>)}
          <button onClick={() => { setCode('1234'); verify('1234'); }} style={{ fontSize: 13 }} aria-label="Fill demo passcode">Demo</button>
          <button onClick={() => press('0')}>0</button>
          <button onClick={() => press('del')} aria-label="Delete"><Delete size={20} /></button>
        </div>
      </div>
    </>
  );
}

function Onboarding({ onDone, onBack }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: 'Rahul Verma', mobile: '+91 90000 00000', segment: 'Salaried' });
  const [ids, setIds] = useState({ aadhaar: false, pan: false });
  const [selfie, setSelfie] = useState('idle');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const valid = cleanName(form.name) && cleanMobile(form.mobile) && /^\d{4}$/.test(pin) && !['0000', '1111', '1234', '4321'].includes(pin);
  const submit = () => { try { onDone(registerMember({ ...form, pin })); } catch { setErr('Please check your details.'); } };
  const takeSelfie = () => { setSelfie('scanning'); setTimeout(() => setSelfie('ok'), 1600); };
  return (
    <>
      <Top title="Create account" sub={`Step ${step + 1} of 3`} back={step ? () => setStep(step - 1) : onBack} />
      <div className="m-body">
        <div className="steps-bar" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>{[0, 1, 2].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
        {step === 0 && (
          <>
            <h2 className="h2">About you</h2>
            <div className="field"><label htmlFor="ob-name">Full name</label><input id="ob-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label htmlFor="ob-mob">Mobile number</label><input id="ob-mob" className="input" inputMode="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /><span className="help">Demo only. Use a made-up number.</span></div>
            <div className="field"><label htmlFor="ob-pin">Choose a 4-digit app passcode</label><input id="ob-pin" className="input mono" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} /><span className="help">Stored only as a bcrypt hash. Avoid easy ones like 1234.</span></div>
            <div className="field"><span className="label">You are</span>
              <div className="chips">{['Salaried', 'Student', 'Business', 'Retired'].map((s) => <button key={s} className={`chip ${form.segment === s ? 'on' : ''}`} onClick={() => setForm({ ...form, segment: s })}>{s}</button>)}</div>
            </div>
            <button className="btn block" disabled={!valid} onClick={() => setStep(1)}>Continue</button>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="h2">Verify your ID</h2>
            <p className="muted" style={{ margin: 0 }}>In this prototype nothing is uploaded. Tapping a card simulates a successful check.</p>
            {[['aadhaar', 'Aadhaar', 'XXXX XXXX 4821'], ['pan', 'PAN', 'ABCDE••••F']].map(([k, label, mask]) => (
              <button key={k} className={`payee-card ${ids[k] ? 'sel' : ''}`} onClick={() => setIds({ ...ids, [k]: true })}>
                <span className="avatar"><IdCard size={18} /></span>
                <span className="grow"><b>{label}</b><br /><small className="muted mono">{ids[k] ? `${mask} · matched` : 'Tap to verify (simulated)'}</small></span>
                {ids[k] ? <Check size={20} color="var(--t-low)" /> : <ChevronRight size={18} className="dim" />}
              </button>
            ))}
            <button className="btn block" disabled={!ids.aadhaar || !ids.pan} onClick={() => setStep(2)}>Continue</button>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="h2">Liveness check</h2>
            <p className="muted" style={{ margin: 0 }}>A quick selfie confirms a real person is opening the account. Simulated: the camera is not used.</p>
            <div className={`selfie ${selfie === 'ok' ? 'ok' : ''}`}>{selfie === 'ok' ? <Check size={56} /> : <Camera size={46} />}</div>
            <p style={{ textAlign: 'center', margin: 0 }} className="muted">{selfie === 'idle' ? 'Hold the phone at eye level' : selfie === 'scanning' ? 'Checking… blink once' : 'Liveness passed'}</p>
            {selfie !== 'ok'
              ? <button className="btn block" disabled={selfie === 'scanning'} onClick={takeSelfie}>{selfie === 'scanning' ? 'Checking…' : 'Start selfie check'}</button>
              : <button className="btn block" onClick={submit}>Submit for KYC review</button>}
            {err && <div className="error" role="alert">{err}</div>}
            <p className="help" style={{ margin: 0 }}>Your application goes to the risk team’s KYC queue in the admin console. Until it’s approved, payments are limited to ₹10,000.</p>
          </>
        )}
      </div>
    </>
  );
}
