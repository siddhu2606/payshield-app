// SMS Shield: check an SMS sender ID (like AD-AXISBK-T) before trusting a message. Runs on the phone.
import { useState } from 'react';
import { MessageSquareWarning, ShieldCheck, ShieldAlert, ShieldQuestion, ChevronDown, ChevronUp } from 'lucide-react';
import { checkSender, parseSender, SUFFIX } from '../core/sender.js';
import { Sheet } from '../ui.jsx';

const TONE = {
  good: { banner: 'tb-LOW', pill: 'c-low', color: 'var(--t-low)', Icon: ShieldCheck, short: 'Registered' },
  warn: { banner: 'tb-MEDIUM', pill: 'c-med', color: 'var(--t-med)', Icon: ShieldQuestion, short: 'Check it' },
  bad: { banner: 'tb-CRITICAL', pill: 'c-crit', color: 'var(--t-crit)', Icon: ShieldAlert, short: 'Likely fake' },
  info: { banner: 'tb-MEDIUM', pill: 'c-mute', color: 'var(--t-med)', Icon: ShieldQuestion, short: 'Unknown sender' }
};
const SAMPLES = ['AD-AXISBK-T', 'VK-CBIGOV', 'AX-HDFCBN-S', '+91 90000 00000', 'JD-SBIINB-P'];

/** Small pill for the message screen: what SMS Shield thinks of this sender. */
export function SenderBadge({ from }) {
  if (!from) return null;
  const r = checkSender(from);
  if (r.verdict === 'invalid') return null;
  const T = TONE[r.tone];
  return <span className={`pill fill ${T.pill}`} title={r.body} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><T.Icon size={12} />SMS Shield: {r.verdict === 'official' ? `registered · ${r.org}` : r.title.toLowerCase()}</span>;
}

/** Card on the Safety tab. */
export function SmsShieldCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="card">
        <div className="spread">
          <span className="row" style={{ gap: 6 }}><MessageSquareWarning size={17} color="var(--accent-2)" /><span className="eyebrow">SMS Shield</span></span>
          <span className="pill c-low">on this phone</span>
        </div>
        <small className="muted">Banks and government send SMS only from registered sender IDs like AD-AXISBK, never from a mobile number. Check who really sent a message.</small>
        <button className="btn soft block" onClick={() => setOpen(true)}>Check an SMS sender</button>
      </div>
      {open && <SmsShieldSheet onClose={() => setOpen(false)} />}
    </>
  );
}

export function SmsShieldSheet({ onClose }) {
  const [prefix, setPrefix] = useState('');
  const [header, setHeader] = useState('');
  const [suffix, setSuffix] = useState('');
  const [res, setRes] = useState(null);
  const [why, setWhy] = useState(false);

  // Pasting a whole sender ("VK-CBIGOV-T" or a phone number) into any box fills all three.
  const fill = (raw) => {
    const p = parseSender(raw);
    if (p.mobile) { setPrefix(''); setHeader(p.raw.slice(0, 16)); setSuffix(''); }
    else { setPrefix(p.prefix.slice(0, 2)); setHeader(p.header.slice(0, 16)); setSuffix(p.suffix.slice(0, 1)); }
    setRes(null);
  };
  const onBox = (set, max) => (e) => {
    const v = e.target.value;
    if (/[-\s+]/.test(v) && v.replace(/[-\s+]/g, '').length > max) return fill(v);
    set(v.toUpperCase().replace(/[^A-Z0-9+ ]/g, '').slice(0, max)); setRes(null);
  };
  const check = () => setRes(checkSender({ prefix, header, suffix }));
  const T = res && TONE[res.tone];

  return (
    <Sheet onClose={onClose} label="SMS Shield">
      <span className="h3">SMS Shield</span>
      <div className="tier-banner tb-LOW" style={{ gap: 4 }}>
        <b>Protect your account</b>
        <p style={{ fontSize: 13 }}>Banks and government offices only send messages from official sender IDs, never from mobile numbers. Type or paste the sender’s name exactly as your SMS app shows it.</p>
      </div>
      <span className="eyebrow">Check SMS sender</span>
      <div className="row" style={{ gap: 6, alignItems: 'center' }}>
        <input className="input mono" aria-label="Network and region (2 letters)" placeholder="AD" value={prefix} onChange={onBox(setPrefix, 2)} style={{ width: 58, textAlign: 'center' }} />
        <span className="dim">-</span>
        <input className="input mono" aria-label="Sender name (6 characters)" placeholder="AXISBK" value={header} onChange={onBox(setHeader, 16)} style={{ flex: 1, minWidth: 0 }} onKeyDown={(e) => e.key === 'Enter' && header && check()} />
        <span className="dim">-</span>
        <input className="input mono" aria-label="Message type (optional: P, S, T or G)" placeholder="T" value={suffix} onChange={onBox(setSuffix, 1)} style={{ width: 50, textAlign: 'center' }} />
      </div>
      <small className="help" style={{ margin: 0, lineHeight: 1.6 }}>
        · The middle part is the six-character sender name.<br />
        · The first two letters show the network and region, and can change.<br />
        · The last letter is optional: P promo, S service, T transaction, G government.
      </small>
      <button className="btn block" disabled={!header.trim()} onClick={check}>Check sender</button>

      {res && (
        <div className={`tier-banner ${T.banner}`} style={{ gap: 6 }} role="status">
          <span className="row" style={{ gap: 6 }}><T.Icon size={18} color={T.color} /><b style={{ fontSize: 15 }}>{res.title}</b></span>
          {res.id && <span className="mono" style={{ fontSize: 12.5 }}>{res.id}{suffix && SUFFIX[suffix.toUpperCase()] ? ` · ${SUFFIX[suffix.toUpperCase()]}` : ''}</span>}
          <p style={{ fontSize: 13 }}>{res.body}</p>
          {res.tone !== 'good' && <p style={{ fontSize: 13 }}><span style={{ fontWeight: 700 }}>If you’ve already paid or shared an OTP, call 1930</span> (national cyber-fraud helpline) straight away.</p>}
        </div>
      )}

      <span className="eyebrow">Try one</span>
      <div className="chips">
        {SAMPLES.map((s) => <button key={s} className="chip mono" onClick={() => { fill(s); setRes(checkSender(s)); }}>{s}</button>)}
      </div>

      <button className="btn ghost block" onClick={() => setWhy(!why)} aria-expanded={why}>{why ? <ChevronUp size={16} /> : <ChevronDown size={16} />}What is a sender ID?</button>
      {why && (
        <small className="muted" style={{ lineHeight: 1.6 }}>
          In India, every business and government SMS must come from a sender ID registered with TRAI, shown like <span className="mono">AD-AXISBK-T</span>. Scammers can’t use a real bank’s ID, so they send from mobile numbers or register look-alikes such as <span className="mono">HDFCBN</span> or names like <span className="mono">CBIGOV</span>. This demo knows a short sample list of bank sender IDs; a bank running PayShield would load its own list and TRAI’s registry. Nothing you type here leaves the phone.
        </small>
      )}
    </Sheet>
  );
}
