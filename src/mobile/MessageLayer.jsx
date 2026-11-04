// The demo phone's SMS inbox. A scam SMS from the role-play caller arrives as a banner with a chime; PayShield scans
// it on the phone and labels it before the person taps anything. Tapping the payment link goes through PayShield's
// checks like any other payment, plus a "came from a message link" signal.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquare, ShieldAlert, ShieldCheck, Link2, Trash2, X, Inbox } from 'lucide-react';
import { useDb, markMessageRead, linkOpened, messageByCode } from '../core/store.js';
import { scanMessage } from '../core/scan.js';
import { isCode } from '../core/validate.js';
import { chime } from '../core/speech.js';
import { Sheet, ago, LangSwitch } from '../ui.jsx';
import { tr, langOf, flagLabel } from '../core/i18n.js';
import { Top } from './MobileApp.jsx';
import { SenderBadge } from './SmsShield.jsx';

export const openInbox = () => window.dispatchEvent(new Event('ps:inbox'));

const VERDICT = {
  scam: { label: 'Likely scam', cls: 'c-crit', color: 'var(--t-crit)', Icon: ShieldAlert, body: 'This message matches a scam pattern. Don’t pay from it. If you’re worried, call the organisation on a number you find yourself.' },
  suspicious: { label: 'Be careful', cls: 'c-high', color: 'var(--t-high)', Icon: ShieldAlert, body: 'Parts of this message are often used by scammers. Check it another way before you act.' },
  ok: { label: 'No warning signs', cls: 'c-low', color: 'var(--t-low)', Icon: ShieldCheck, body: 'Nothing unusual found. Still, never share a PIN or OTP.' }
};

export function ScanCard({ text, from, compact, lang = 'en' }) {
  const db = useDb();
  const r = scanMessage(text, { from, registry: db.registry });
  const V0 = VERDICT[r.verdict];
  const [vl, vb] = tr(lang).verdict[r.verdict];
  const V = { ...V0, label: vl, body: vb };
  return (
    <div className="card" style={{ gap: 8, borderColor: `color-mix(in srgb, ${V.color} 45%, var(--line))` }}>
      <div className="spread"><span className="row" style={{ gap: 6, color: V.color, fontWeight: 700 }}><V.Icon size={17} />PayShield: {V.label}</span><span className="mono dim" style={{ fontSize: 12 }}>{r.score}/100</span></div>
      {!compact && <small className="muted">{V.body}</small>}
      {r.flags.length > 0 && (
        <div className="col" style={{ gap: 6 }}>
          {r.flags.slice(0, compact ? 3 : 8).map((f) => (
            <div key={f.code} className="row" style={{ alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
              <span className="mono" style={{ color: V.color, minWidth: 30 }}>+{f.points}</span>
              <span><b style={{ fontWeight: 600 }}>{flagLabel(lang, f)}</b>{lang === 'en' && <><br /><small className="muted">{f.detail}</small></>}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Text with the URL drawn as a link-looking span (not a real anchor: tapping goes through openLink). */
function Bubble({ m, onLink }) {
  const i = m.text.indexOf(m.link);
  return (
    <div className="bubble">
      {i < 0 ? m.text : <>{m.text.slice(0, i)}<button className="msg-link" onClick={onLink}>{m.link}</button>{m.text.slice(i + m.link.length)}</>}
    </div>
  );
}

export default function MessageLayer({ user }) {
  const db = useDb();
  const nav = useNavigate();
  const mine = (db.messages || []).filter((m) => m.toUserId === user.id);
  const unread = mine.filter((m) => !m.read);
  const [view, setView] = useState(null); // null | 'inbox' | message id
  const [hidden, setHidden] = useState({});
  const last = useRef(unread[0]?.id);

  useEffect(() => {
    const id = unread[0]?.id;
    if (id && id !== last.current) { chime(); try { navigator.vibrate?.([120, 80, 120]); } catch { /* ignore */ } }
    last.current = id;
  }, [unread[0]?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const f = () => setView('inbox'); window.addEventListener('ps:inbox', f); return () => window.removeEventListener('ps:inbox', f); }, []);

  const banner = unread.find((m) => !hidden[m.id]);
  const current = view && view !== 'inbox' ? mine.find((m) => m.id === view) : null;
  const openLink = (m) => {
    linkOpened(m.code, user.id);
    setView(null);
    nav('/app/pay', { state: { upi: m.payment.upi, amount: m.payment.amount, note: m.payment.note, from: 'sms_link', msgId: m.id, at: Date.now() } });
  };
  const show = (m) => { markMessageRead(m.id); setView(m.id); };

  return (
    <>
      {banner && !view && (
        <div className="msg-banner" role="status">
          <button className="grow" onClick={() => show(banner)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
            <span className="avatar" style={{ width: 34, height: 34, flex: 'none' }}><MessageSquare size={16} /></span>
            <span style={{ minWidth: 0, display: 'grid', gap: 2 }}>
              <span className="row" style={{ gap: 6 }}><b style={{ fontSize: 13 }}>{banner.from}</b><small className="dim">now</small>{banner.scan?.verdict !== 'ok' && <span className={`pill fill ${VERDICT[banner.scan?.verdict || 'scam'].cls}`}>PayShield: {VERDICT[banner.scan?.verdict || 'scam'].label.toLowerCase()}</span>}</span>
              <small className="clamp2">{banner.text}</small>
            </span>
          </button>
          <button className="iconbtn sm" aria-label="Dismiss" onClick={() => setHidden({ ...hidden, [banner.id]: true })}><X size={14} /></button>
        </div>
      )}

      {view === 'inbox' && (
        <Sheet onClose={() => setView(null)} label="Messages">
          <span className="h3">Messages</span>
          {mine.length === 0 && <p className="muted" style={{ margin: 0 }}>No messages yet.</p>}
          <div className="list">
            {mine.map((m) => (
              <button key={m.id} className="li" onClick={() => show(m)}>
                <span className="avatar"><MessageSquare size={16} /></span>
                <span className="t"><b>{m.from}</b><small className="clamp2">{m.text}</small></span>
                <span style={{ display: 'grid', justifyItems: 'end', gap: 4 }}><small className="dim">{ago(m.t)}</small>{m.scan?.verdict !== 'ok' && <span className={`pill fill ${VERDICT[m.scan?.verdict || 'scam'].cls}`}>{VERDICT[m.scan?.verdict || 'scam'].label}</span>}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {current && (
        <Sheet onClose={() => setView(null)} label={`Message from ${current.from}`}>
          <div className="spread"><span className="h3">{current.from}</span><small className="dim">{ago(current.t)}</small></div>
          <div><SenderBadge from={current.from} /></div>
          <Bubble m={current} onLink={() => openLink(current)} />
          <LangSwitch user={user} />
          <ScanCard text={current.text} from={current.from} lang={langOf(user)} />
          <button className="btn soft block" onClick={() => openLink(current)}><Link2 size={16} />Open the link anyway</button>
          <small className="help" style={{ margin: 0 }}>PayShield checks any payment opened from a message before money moves.</small>
          <button className="btn ghost block" onClick={() => setView(null)}><Trash2 size={16} />Ignore this message</button>
        </Sheet>
      )}
    </>
  );
}

export function InboxButton({ userId }) {
  const db = useDb();
  const n = (db.messages || []).filter((m) => m.toUserId === userId && !m.read).length;
  return (
    <button className="iconbtn" aria-label={`Messages${n ? `, ${n} unread` : ''}`} onClick={openInbox}>
      <Inbox size={19} />{n > 0 && <span className="dot" />}
    </button>
  );
}

/** Route for a payment link opened from a real SMS (or copied from the demo inbox): #/app/l/CODE */
export function LinkOpen({ user }) {
  const { code } = useParams();
  const db = useDb();
  const nav = useNavigate();
  const ok = isCode(code);
  const m = ok ? messageByCode(db, code) : null;
  const [waited, setWaited] = useState(false);
  useEffect(() => { const t = setTimeout(() => setWaited(true), 7000); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (!m) return;
    linkOpened(code, user.id);
    nav('/app/pay', { replace: true, state: { upi: m.payment.upi, amount: m.payment.amount, note: m.payment.note, from: 'sms_link', msgId: m.id, at: Date.now() } });
  }, [m?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Top title="Payment link" sub="Checked by PayShield" />
      <div className="m-body" style={{ alignContent: 'center' }}>
        {!waited || m ? (
          <div className="result"><div className="badge" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)' }}><ShieldCheck size={40} /></div><b className="h3">Checking this payment link…</b><p className="muted" style={{ margin: 0 }}>Links in messages that open a payment are checked before any money moves.</p></div>
        ) : (
          <>
            <div className="tier-banner tb-HIGH"><b>We don’t recognise this payment link</b><p>Messages with links that open a filled-in payment are a common scam. Don’t pay from a link someone sent you.</p></div>
            <button className="btn block" onClick={() => nav('/app', { replace: true })}>Go to home</button>
          </>
        )}
      </div>
    </>
  );
}
