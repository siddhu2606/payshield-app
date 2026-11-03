import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, Monitor, MonitorSmartphone, Download, ArrowRight, MessageCircleQuestion, Scale, Gauge as GaugeIc, UserCheck, Github } from 'lucide-react';
import { Logo, Mark, SyncBadge } from '../ui.jsx';
import { APK_URL, REPO_URL } from '../config.js';

const STEPS = [
  { Icon: MessageCircleQuestion, t: 'Ask', d: 'A short, voluntary safety check, only when the payment gives a reason to. Routine payments see nothing.' },
  { Icon: Scale, t: 'Compare the story with the facts', d: '“Police verification” paid into a personal account opened 2 days ago? The caller can coach the answer. They can’t change the account.' },
  { Icon: GaugeIc, t: 'Respond in proportion', d: 'A 0–100 score with plain reasons maps to four tiers: carry on, take a moment, strong warning, stop and verify.' },
  { Icon: UserCheck, t: 'Bring in someone they trust', d: 'With consent, a guardian can check a held payment. A discreet pressure button pauses it quietly.' }
];

export default function Landing() {
  useEffect(() => { document.title = 'PayShield'; document.documentElement.classList.remove('in-frame'); }, []);
  return (
    <div className="lp">
      <header className="lp-top">
        <Logo size={30} />
        <nav className="row wrap" style={{ gap: 8 }}>
          <SyncBadge />
          <Link className="btn ghost sm" to="/demo">Live demo</Link>
          <a className="btn ghost sm" href={REPO_URL} target="_blank" rel="noreferrer"><Github size={15} />Code</a>
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-copy">
          <span className="eyebrow">FIN-11 · Interrupting coerced payments · VK’26</span>
          <h1 className="h1">The PIN proves who is paying. <span style={{ color: 'var(--accent)' }}>PayShield checks they’re paying freely.</span></h1>
          <p className="lp-lead">In “digital arrest” and impersonation scams the victim approves the payment themselves, so every normal check passes. PayShield sits between Pay and Paid and adds a pause that’s proportionate, explained and hard for a caller to coach around.</p>
        </div>
        <div className="lp-mark" aria-hidden="true"><Mark size={210} /></div>
      </section>

      <section className="lp-doors">
        <article className="door">
          <span className="door-ic"><Smartphone size={24} /></span>
          <h2 className="h3">Mobile app</h2>
          <p className="muted">One app, four roles: <b>Member</b> pays and stays protected, <b>Child</b> has pocket money and a daily limit, <b>Guardian</b> approves held payments, and <b>Scam caller</b> places simulated fraud calls to test it all live.</p>
          <div className="door-actions">
            <a className="btn" href={APK_URL}><Download size={17} />Download for Android</a>
            <Link className="btn soft" to="/app">Open in browser<ArrowRight size={16} /></Link>
          </div>
          <small className="dim">On iPhone, open in Safari, then Share → Add to Home Screen. Demo passcode <span className="mono">1234</span>.</small>
        </article>
        <article className="door">
          <span className="door-ic"><Monitor size={24} /></span>
          <h2 className="h3">Admin risk console</h2>
          <p className="muted">For the bank’s risk and KYC team: live overview, review queue, KYC approvals, payee registry, tunable policy, scenario suite and role-play results.</p>
          <div className="door-actions"><Link className="btn" to="/admin">Open console<ArrowRight size={16} /></Link></div>
          <small className="dim">Staff ID <span className="mono">RISK-2291</span> · password <span className="mono">demo</span> · code <span className="mono">246810</span></small>
        </article>
        <article className="door door-wide">
          <span className="door-ic"><MonitorSmartphone size={24} /></span>
          <div style={{ display: 'grid', gap: 6 }}>
            <h2 className="h3">Live demo wall</h2>
            <p className="muted" style={{ margin: 0 }}>The member, guardian, scam-caller and child phones next to the admin console in one window. Ring Aarav from the caller phone, push the “verification deposit”, and watch PayShield, Priya and the console react live.</p>
          </div>
          <div className="door-actions"><Link className="btn" to="/demo">Open demo wall<ArrowRight size={16} /></Link></div>
        </article>
      </section>

      <section className="lp-how">
        <span className="eyebrow">How it works</span>
        <div className="lp-steps">
          {STEPS.map(({ Icon, t, d }) => (
            <div key={t} className="lp-step"><span className="door-ic sm"><Icon size={19} /></span><b>{t}</b><p className="muted">{d}</p></div>
          ))}
        </div>
        <div className="tiers" role="img" aria-label="Risk tiers: Low 0 to 24, Medium 25 to 49, High 50 to 74, Critical 75 to 100">
          {[['Low', '0–24', 'var(--t-low)', 'Pays normally'], ['Medium', '25–49', 'var(--t-med)', 'Caution + verify'], ['High', '50–74', 'var(--t-high)', 'Warning, pause, trusted contact'], ['Critical', '75–100', 'var(--t-crit)', 'Stop, review, helpline']].map(([n, r, c, d]) => (
            <div key={n} style={{ '--c': c }}><b>{n}</b><span className="mono">{r}</span><small>{d}</small></div>
          ))}
        </div>
      </section>

      <footer className="lp-foot">
        <span>Prototype by Team V/Slash for Vishwakarandak’26. Simulated payments, fictional people, synthetic data. No real money, PIN, OTP or ID is ever used.</span>
        <span className="mono">A pause, not a block.</span>
      </footer>
    </div>
  );
}
