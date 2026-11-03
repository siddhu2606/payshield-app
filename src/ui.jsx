import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { TIER } from './core/risk.js';

/* ---------- formatting ---------- */
export const inr = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
export function ago(t) {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
export const clock = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
export const dateShort = (t) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
export const tierClass = (tier) => ({ LOW: 'c-low', MEDIUM: 'c-med', HIGH: 'c-high', CRITICAL: 'c-crit' })[tier] || 'c-mute';

export const STATUS = {
  COMPLETED: { label: 'Completed', cls: 'c-low' },
  CANCELLED: { label: 'Cancelled', cls: 'c-mute' },
  POSTPONED: { label: 'Postponed', cls: 'c-acc' },
  PENDING_REVIEW: { label: 'Pending review', cls: 'c-crit' },
  AWAITING_CONTACT: { label: 'With trusted contact', cls: 'c-high' },
  AWAITING_DECISION: { label: 'Awaiting decision', cls: 'c-med' },
  pending: { label: 'Pending', cls: 'c-med' },
  approved: { label: 'Approved', cls: 'c-low' },
  denied: { label: 'Declined', cls: 'c-mute' },
  rejected: { label: 'Rejected', cls: 'c-crit' },
  verified: { label: 'KYC verified', cls: 'c-low' }
};
export const StatusPill = ({ s }) => <span className={`pill fill ${STATUS[s]?.cls || 'c-mute'}`}>{STATUS[s]?.label || s}</span>;
// What the member's own screen shows. A pressure-button hold must look routine to anyone watching the phone.
export const MemberStatus = ({ tx }) => (tx.discreet && ['AWAITING_CONTACT', 'AWAITING_DECISION', 'PENDING_REVIEW'].includes(tx.status)
  ? <span className="pill fill c-med">Security check</span>
  : <StatusPill s={tx.status} />);
export const TierPill = ({ tier, score }) => (
  <span className={`pill fill ${tierClass(tier)}`}>{TIER[tier]?.label || tier}{score != null ? ` · ${score}` : ''}</span>
);

/* ---------- brand ---------- */
export function Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="psg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5aa0ff" />
          <stop offset="1" stopColor="#1f5fd6" />
        </linearGradient>
      </defs>
      <path d="M32 4 54 12v17c0 15-9.4 26.4-22 31C19.4 55.4 10 44 10 29V12Z" fill="url(#psg)" />
      <path d="M32 9.5 49 15.7V29c0 12-7.2 21.2-17 25.3C22.2 50.2 15 41 15 29V15.7Z" fill="#05070c" />
      <rect x="23.5" y="21" width="6" height="20" rx="2" fill="#8fc2ff" />
      <rect x="34.5" y="21" width="6" height="20" rx="2" fill="#8fc2ff" />
    </svg>
  );
}
export function Logo({ size = 28, sub }) {
  return (
    <span className="row" style={{ gap: 10 }}>
      <Mark size={size} />
      <span style={{ display: 'grid', lineHeight: 1 }}>
        <span style={{ font: `800 ${Math.round(size * 0.68)}px var(--display)`, letterSpacing: '-.01em' }}>Pay<span style={{ color: 'var(--accent)' }}>Shield</span></span>
        {sub && <span className="eyebrow" style={{ fontSize: 9.5, marginTop: 4 }}>{sub}</span>}
      </span>
    </span>
  );
}

/* ---------- risk visuals ---------- */
export function Gauge({ score, tier, size = 190 }) {
  const [shown, setShown] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(score)); return () => cancelAnimationFrame(id); }, [score]);
  const color = TIER[tier]?.color || 'var(--accent)';
  return (
    <div className="gauge" style={{ width: size }} role="img" aria-label={`Risk score ${score} of 100, ${TIER[tier]?.label}`}>
      <svg viewBox="0 0 200 112">
        <path d="M14 100a86 86 0 0 1 172 0" fill="none" stroke="var(--line2)" strokeWidth="14" strokeLinecap="round" pathLength="100" />
        <path d="M14 100a86 86 0 0 1 172 0" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" pathLength="100"
          strokeDasharray={`${Math.max(1, shown)} 100`} style={{ transition: 'stroke-dasharray .9s cubic-bezier(.2,.8,.2,1)', filter: `drop-shadow(0 0 8px ${color})` }} />
        {[25, 50, 75].map((v) => {
          const a = Math.PI * (1 - v / 100);
          return <line key={v} x1={100 + 70 * Math.cos(a)} y1={100 - 70 * Math.sin(a)} x2={100 + 62 * Math.cos(a)} y2={100 - 62 * Math.sin(a)} stroke="var(--dim)" strokeWidth="2" />;
        })}
      </svg>
      <div className="score"><b className="num">{score}</b><span style={{ color }}>{TIER[tier]?.label} risk</span></div>
    </div>
  );
}

export function ReasonList({ reasons, limit = 6 }) {
  if (!reasons?.length) return <p className="muted" style={{ margin: 0 }}>No warning signs found.</p>;
  return (
    <ul className="reasons">
      {reasons.slice(0, limit).map((r) => (
        <li key={r.code}><em>+{r.points}</em><span>{r.label}{r.detail && <small>{r.detail}</small>}</span></li>
      ))}
    </ul>
  );
}

export function StoryVsFacts({ svf, facts, compact }) {
  if (!svf) return null;
  const f = facts || {};
  const factLine = f.type && f.type !== 'unknown'
    ? `${f.type === 'individual' ? 'Personal account' : f.type === 'business' ? 'Business account' : 'Government account'}${f.ageDays != null ? ` · opened ${f.ageDays < 60 ? `${f.ageDays} day${f.ageDays === 1 ? '' : 's'}` : `${Math.round(f.ageDays / 365)} yr`} ago` : ''}${f.senders24h != null ? ` · paid by ${f.senders24h} ${f.senders24h === 1 ? 'person' : 'people'} today` : ''}`
    : 'Not found in the payee registry';
  return (
    <div className="card flat" style={{ borderColor: 'color-mix(in srgb, var(--t-crit) 45%, var(--line))', gap: 12 }}>
      <div className="spread"><span className="eyebrow" style={{ color: 'var(--t-crit)' }}>Story vs facts</span>{!compact && <span className="eyebrow">synthetic registry</span>}</div>
      <div className="svf">
        <div><small>You said it’s</small><b>{svf.said}</b></div>
        <div className="ne" aria-label="does not match">≠</div>
        <div><small>This account is</small><b>{factLine}</b></div>
      </div>
      <p style={{ margin: 0, fontSize: 13.5 }}>{svf.fact}</p>
    </div>
  );
}

/* ---------- toast ---------- */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const show = useCallback((m) => { setMsg(m); clearTimeout(show.t); show.t = setTimeout(() => setMsg(null), 2600); }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className={`toast ${msg ? 'on' : ''}`} role="status" aria-live="polite">{msg}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function Sheet({ onClose, children, label }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

export function useNow(ms = 30000) {
  const [, set] = useState(0);
  useEffect(() => { const id = setInterval(() => set((x) => x + 1), ms); return () => clearInterval(id); }, [ms]);
}
