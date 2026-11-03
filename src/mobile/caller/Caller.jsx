import { useEffect, useState } from 'react';
import { Phone, PhoneOff, Moon, Send, MessageSquareQuote, LogOut, AlertTriangle, ShieldCheck, Check, Hourglass, CircleSlash, Radio, Lock } from 'lucide-react';
import { useDb, startCall, endCall, sayLine, pushPaymentRequest, callOutcome, fillName } from '../../core/store.js';
import { SCRIPTS, scriptById } from '../../core/calls.js';
import { TIER } from '../../core/risk.js';
import { Top } from '../MobileApp.jsx';
import { inr, initials, ago, TierPill, SyncBadge } from '../../ui.jsx';

const TARGETS = [['u_aarav', 'member'], ['c_anaya', 'child']];

export function useClock(from) {
  const [, tick] = useState(0);
  useEffect(() => { if (!from) return; const id = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(id); }, [from]);
  if (!from) return '00:00';
  const s = Math.max(0, Math.floor((Date.now() - from) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const OUTCOME = {
  none: { label: 'No payment yet', cls: 'c-mute', Icon: Hourglass },
  held: { label: 'PayShield paused the payment', cls: 'c-high', Icon: ShieldCheck },
  stopped: { label: 'Payment stopped: scam failed', cls: 'c-low', Icon: CircleSlash },
  paid: { label: 'Money sent: scam succeeded', cls: 'c-crit', Icon: AlertTriangle },
  declined: { label: 'Victim declined the call', cls: 'c-low', Icon: PhoneOff },
  locked: { label: 'Call cut: PayShield locked their phone', cls: 'c-low', Icon: Lock },
  blocked: { label: 'Didn’t connect: their phone is locked', cls: 'c-low', Icon: Lock }
};

export function CallerConsole({ user, signOut }) {
  const db = useDb();
  const call = (db.calls || []).find((c) => ['ringing', 'active'].includes(c.status));
  const [target, setTarget] = useState('u_aarav');
  const [scriptId, setScriptId] = useState('digital_arrest');
  const [late, setLate] = useState(true);
  const [lastId, setLastId] = useState(null);
  const ended = !call && lastId && db.calls.find((c) => c.id === lastId);
  const role = TARGETS.find((t) => t[0] === target)[1];
  const scripts = SCRIPTS.filter((s) => s.target === role);
  useEffect(() => { if (!scripts.some((s) => s.id === scriptId)) setScriptId(scripts[0].id); }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  if (call) return <LiveCall call={call} db={db} onEnd={() => { setLastId(call.id); endCall(call.id, 'caller'); }} />;

  return (
    <>
      <Top title="Scam caller" sub="Role-play simulator" avatar={<span className="avatar" style={{ color: 'var(--t-crit)' }}><Radio size={18} /></span>} right={<button className="iconbtn" onClick={signOut} aria-label="Sign out"><LogOut size={18} /></button>} />
      <div className="m-body">
        <div className="tier-banner tb-CRITICAL" style={{ gap: 4 }}>
          <b style={{ fontSize: 15 }}>Simulation only</b>
          <p style={{ fontSize: 13 }}>This phone plays the scammer so the team can test PayShield live. It calls the demo member or child phone, no real number.</p>
        </div>
        {ended && <CallSummary call={ended} db={db} />}
        <div className="card">
          <span className="eyebrow">Who to call</span>
          <div className="seg">
            {TARGETS.map(([id]) => <button key={id} className={target === id ? 'on' : ''} onClick={() => setTarget(id)}>{db.users[id]?.name.split(' ')[0]} · {db.users[id]?.role}</button>)}
          </div>
        </div>
        <div className="card">
          <span className="eyebrow">Script</span>
          <div className="list">
            {scripts.map((s) => (
              <button key={s.id} className="li" onClick={() => setScriptId(s.id)} style={{ background: scriptId === s.id ? 'color-mix(in srgb, var(--t-crit) 12%, transparent)' : undefined, borderRadius: 10, paddingInline: 8 }}>
                <span className="avatar" style={{ color: 'var(--t-crit)' }}><MessageSquareQuote size={16} /></span>
                <span className="t"><b>{s.label}</b><small>{s.persona} · asks {inr(s.payment.amount)}</small></span>
                {scriptId === s.id && <Check size={18} color="var(--t-crit)" />}
              </button>
            ))}
          </div>
        </div>
        <label className="card toggle-row" style={{ padding: '12px 16px' }}>
          <span className="row"><Moon size={18} color="var(--accent-2)" /><span>Late-night call<small>Pretend it’s 11:40 pm on the victim’s phone</small></span></span>
          <input type="checkbox" className="switch" checked={late} onChange={(e) => setLate(e.target.checked)} />
        </label>
        <button className="btn danger block" style={{ padding: 16, fontSize: 16 }} onClick={() => { const c = startCall({ toUserId: target, scriptId, lateNight: late }); setLastId(c.id); }}>
          <Phone size={19} />Call {db.users[target]?.name.split(' ')[0]}
        </button>
      </div>
    </>
  );
}

function LiveCall({ call, db, onEnd }) {
  const sc = scriptById(call.scriptId);
  const victim = db.users[call.toUserId];
  const time = useClock(call.answeredAt);
  const out = callOutcome(db, call);
  const O = OUTCOME[out.state];
  const ringing = call.status === 'ringing';
  return (
    <>
      <Top title={ringing ? `Calling ${victim.name.split(' ')[0]}…` : `On call · ${time}`} sub={`${sc.label}${call.lateNight ? ' · late night' : ''}`} avatar={<span className="avatar" style={{ color: 'var(--t-crit)' }}><Radio size={18} /></span>}
        right={<button className="iconbtn" style={{ background: 'var(--t-crit)', borderColor: 'var(--t-crit)' }} onClick={onEnd} aria-label="Hang up"><PhoneOff size={18} color="#fff" /></button>} />
      <div className="m-body">
        {ringing ? (
          <div className="ring-wait"><span className="ring-dot"><Phone size={30} /></span><b>Ringing {victim.name}</b><small className="muted">Their phone shows an incoming call from {sc.callerId}.</small></div>
        ) : (
          <>
            <div className="card" style={{ gap: 8 }}>
              <div className="spread"><span className="eyebrow">Victim’s phone · simulation view</span>{out.last?.assessment && <TierPill tier={out.last.assessment.tier} score={out.last.assessment.score} />}</div>
              <span className={`row ${O.cls}`} style={{ fontWeight: 600 }}><O.Icon size={18} />{O.label}</span>
              {out.last && <small className="muted">{inr(out.last.amount)} to {out.last.payeeName} · {out.last.status.replace(/_/g, ' ').toLowerCase()}</small>}
              {out.reqs[0] && !out.last && <small className="muted">{inr(out.reqs[0].amount)} sent to the guardian for approval · {out.reqs[0].status}</small>}
            </div>
            <button className="btn soft block" onClick={() => pushPaymentRequest(call.id)}><Send size={17} />Send payment details to {victim.name.split(' ')[0]}</button>
            <div className="card">
              <span className="eyebrow">Script · tap a line after you say it</span>
              {sc.lines.map((l, i) => (
                <button key={i} className={`line ${i < call.lineIdx ? 'said' : i === call.lineIdx ? 'next' : ''}`} onClick={() => sayLine(call.id, fillName(l, victim.name.split(' ')[0]))}>
                  <span className="mono">{String(i + 1).padStart(2, '0')}</span>{fillName(l, victim.name.split(' ')[0])}
                </button>
              ))}
            </div>
            {(out.state === 'held' || out.last?.assessment?.tier && out.last.assessment.tier !== 'LOW') && (
              <div className="card" style={{ borderColor: 'color-mix(in srgb, var(--t-high) 50%, var(--line))' }}>
                <span className="eyebrow" style={{ color: 'var(--t-high)' }}>PayShield is in the way · try a comeback</span>
                {sc.counters.map((l, i) => <button key={i} className="line" onClick={() => sayLine(call.id, l)}><span className="mono">↺</span>{l}</button>)}
              </div>
            )}
          </>
        )}
        <button className="btn danger block" onClick={onEnd}><PhoneOff size={17} />{ringing ? 'Cancel call' : 'Hang up'}</button>
      </div>
    </>
  );
}

function CallSummary({ call, db }) {
  const out = callOutcome(db, call);
  const O = OUTCOME[out.state];
  const sc = scriptById(call.scriptId);
  return (
    <div className="card" style={{ borderColor: out.state === 'paid' ? 'var(--t-crit)' : 'color-mix(in srgb, var(--t-low) 50%, var(--line))' }}>
      <span className="eyebrow">Last call · {sc.label}</span>
      <span className={`row ${O.cls}`} style={{ fontWeight: 700, fontSize: 16 }}><O.Icon size={19} />{O.label}</span>
      <small className="muted">{out.paid ? `${inr(out.paid)} sent (simulated)` : out.state === 'locked' ? '₹0 lost. The guardian stopped the payment, the call was cut and the phone locked.' : out.state === 'blocked' ? '₹0 lost. A locked phone doesn’t take calls.' : `₹0 lost. PayShield ${out.state === 'declined' ? 'wasn’t needed' : 'held the line'}.`}</small>
    </div>
  );
}

export function CallerLog() {
  const db = useDb();
  const calls = (db.calls || []).filter((c) => !['ringing', 'active'].includes(c.status));
  const rows = calls.map((c) => ({ c, o: callOutcome(db, c) }));
  const lost = rows.reduce((a, r) => a + r.o.paid, 0);
  const asked = rows.reduce((a, r) => a + (r.o.txs[0]?.amount || r.o.reqs[0]?.amount || 0), 0);
  const failed = rows.filter((r) => r.o.state !== 'paid').length;
  return (
    <>
      <Top title="Call results" sub="How the scam calls went" avatar={<span className="avatar" style={{ color: 'var(--t-crit)' }}><Radio size={18} /></span>} />
      <div className="m-body">
        <div className="facts">
          <div className="fact"><small>Calls made</small><b style={{ fontSize: 22 }}>{calls.length}</b></div>
          <div className="fact"><small>Scams that failed</small><b style={{ fontSize: 22, color: 'var(--t-low)' }}>{failed}</b></div>
          <div className="fact"><small>Money asked for</small><b>{inr(asked)}</b></div>
          <div className="fact"><small>Money lost</small><b style={{ color: lost ? 'var(--t-crit)' : 'var(--t-low)' }}>{inr(lost)}</b></div>
        </div>
        {rows.length === 0 && <p className="muted" style={{ textAlign: 'center', padding: 24 }}>No calls yet. Start one from the Call tab.</p>}
        {rows.length > 0 && (
          <div className="card">
            <div className="list">
              {rows.map(({ c, o }) => {
                const O = OUTCOME[o.state];
                return (
                  <div className="li" key={c.id}>
                    <span className="avatar">{initials(db.users[c.toUserId]?.name)}</span>
                    <div className="t"><b>{scriptById(c.scriptId).label}</b><small>{db.users[c.toUserId]?.name.split(' ')[0]} · {ago(c.createdAt)}{c.lateNight ? ' · late night' : ''}</small></div>
                    <span className={`pill fill ${O.cls}`}>{o.state === 'paid' ? `Lost ${inr(o.paid)}` : o.state === 'held' ? 'Held' : o.state === 'none' ? 'No payment' : o.state === 'declined' ? 'Declined' : o.state === 'locked' ? 'Cut · locked' : o.state === 'blocked' ? 'Blocked' : 'Stopped'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <small className="help">Use these with the admin Role-play page to compare groups.</small>
        <div style={{ display: 'flex', justifyContent: 'center' }}><SyncBadge /></div>
      </div>
    </>
  );
}

export { TIER };
