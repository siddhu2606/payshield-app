import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Link2, Check, X, Clock, PhoneCall, UserCheck, ShieldAlert, Search, Sparkles, Hourglass, ShieldCheck, Building2, User, Landmark, HelpCircle, CircleSlash } from 'lucide-react';
import { useDb, previewPayment, createPayment, decide, requestTrustedContact, pressureHold } from '../../core/store.js';
import { QUESTIONS, PURPOSES, TIER } from '../../core/risk.js';
import { Top } from '../MobileApp.jsx';
import { inr, initials, Gauge, ReasonList, StoryVsFacts, MemberStatus, useToast } from '../../ui.jsx';

const DEMOS = [
  { label: 'Routine ₹2,000', upi: 'rohan.shah@okdemo', amount: 2000, note: 'Trip share' },
  { label: 'Coercion ₹50,000', upi: 'rajesh.k4471@ybldemo', amount: 50000, note: 'CBI verification deposit' },
  { label: 'High value ₹2,00,000', upi: 'sunrise.builders@icicidemo', amount: 200000, note: 'Flat payment' }
];

const TIER_COPY = {
  LOW: { title: 'Looks normal', body: 'Nothing unusual about this payment.' },
  MEDIUM: { title: 'Take a moment', body: 'A couple of things are different from your usual payments. If someone asked you to pay, check with them on a number you already know.' },
  HIGH: { title: 'Someone may be pressuring you', body: 'Take a moment before you continue. Real police, banks and companies never ask you to pay to stay safe.' },
  CRITICAL: { title: 'Stop. This looks like a scam pattern', body: 'We strongly recommend not sending this money. Hang up, then call the organisation on a number you find yourself.' }
};

export default function PayFlow({ user }) {
  const db = useDb();
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const [step, setStep] = useState('payee');
  const [upi, setUpi] = useState(loc.state?.upi || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState(null);
  const [purpose, setPurpose] = useState(null);
  const [answers, setAnswers] = useState({});
  const [txId, setTxId] = useState(null);
  const [source, setSource] = useState(null); // { msgId } when opened from a message link

  useEffect(() => {
    if (!loc.state?.upi) return;
    setUpi(loc.state.upi); setTxId(null); setPurpose(null); setAnswers({}); setErr('');
    setSource(loc.state.msgId ? { msgId: loc.state.msgId } : null);
    if (loc.state.amount) setAmount(String(loc.state.amount));
    if (loc.state.note) setNote(loc.state.note);
    setStep('amount');
  }, [loc.state]);

  const saved = db.beneficiaries.filter((b) => b.userId === user.id);
  const tx = txId ? db.transactions.find((t) => t.id === txId) : null;
  const amt = Number(String(amount).replace(/[^\d]/g, '')) || 0;
  const payeeName = saved.find((b) => b.upi === upi)?.name || db.registry[upi]?.name;
  const msg = source && (db.messages || []).find((m) => m.id === source.msgId);
  const reset = () => { setSource(null); setStep('payee'); setUpi(''); setAmount(''); setNote(''); setPurpose(null); setAnswers({}); setTxId(null); setPreview(null); setErr(''); };

  const goReview = () => {
    const p = previewPayment(user.id, upi.trim().toLowerCase(), amt, source);
    if (p.error) { setErr(p.error); return; }
    setErr(''); setPreview(p); setStep('review');
  };
  const submit = (skipped) => {
    const t = createPayment({ userId: user.id, upi: upi.trim().toLowerCase(), amount: amt, note, purpose, screening: skipped ? null : answers, skipped, source });
    setTxId(t.id);
    setStep(t.status === 'COMPLETED' ? 'done' : 'risk');
  };
  const onPressure = () => {
    const t = pressureHold({ userId: user.id, upi: upi.trim().toLowerCase(), amount: amt, note });
    setTxId(t.id); setStep('done');
  };

  const back = { amount: () => setStep('payee'), review: () => setStep('amount'), check: () => setStep('review') }[step];
  const stepIdx = { payee: 0, amount: 1, review: 2, check: 3, risk: 3 }[step];
  const title = { payee: 'Pay', amount: 'Amount', review: 'Review', check: 'Safety check', risk: 'Before you pay', done: 'Payment' }[step];

  return (
    <>
      <Top title={title} sub={step === 'check' ? 'Optional · 30 seconds' : payeeName && step !== 'payee' ? `to ${payeeName}` : 'Send money'} back={back}
        right={user.settings?.pressureButton !== false && ['amount', 'review', 'check', 'risk'].includes(step) ? <PressureButton onTrigger={onPressure} /> : null} />
      <div className="m-body">
        {stepIdx != null && <div className="steps-bar">{[0, 1, 2, 3].map((i) => <i key={i} className={i <= stepIdx ? 'on' : ''} />)}</div>}

        {step === 'payee' && (
          <>
            <div className="field">
              <label htmlFor="upi">UPI ID or mobile</label>
              <div style={{ position: 'relative' }}>
                <Search size={17} style={{ position: 'absolute', left: 13, top: 15, color: 'var(--dim)' }} />
                <input id="upi" className="input" style={{ paddingLeft: 38 }} placeholder="name@bank" autoCapitalize="none" autoComplete="off" value={upi} onChange={(e) => setUpi(e.target.value)} />
              </div>
              {upi && db.registry[upi.trim().toLowerCase()] && <span className="help">Registered name: <b style={{ color: 'var(--fg)' }}>{db.registry[upi.trim().toLowerCase()].name}</b></span>}
            </div>
            <button className="btn block" disabled={!upi.includes('@')} onClick={() => setStep('amount')}>Continue</button>
            <div className="card">
              <span className="eyebrow">Saved payees</span>
              <div className="list">
                {saved.map((b) => (
                  <button key={b.id} className="li" onClick={() => { setUpi(b.upi); setStep('amount'); }}>
                    <span className="avatar">{initials(b.name)}</span>
                    <span className="t"><b>{b.name}</b><small className="mono">{b.upi}</small></span>
                    <span className="pill c-mute">{b.tag}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="card flat">
              <span className="row"><Sparkles size={16} color="var(--accent-2)" /><span className="eyebrow">Demo cases from the plan</span></span>
              <div className="chips">
                {DEMOS.map((d) => <button key={d.label} className="chip" onClick={() => { setUpi(d.upi); setAmount(String(d.amount)); setNote(d.note); setStep('amount'); }}>{d.label}</button>)}
              </div>
            </div>
          </>
        )}

        {msg && ['amount', 'review'].includes(step) && (
          <div className="tier-banner tb-HIGH" style={{ gap: 4 }}>
            <span className="row" style={{ gap: 6 }}><Link2 size={16} color="var(--t-high)" /><b style={{ fontSize: 14.5 }}>Opened from a link in a message</b></span>
            <p style={{ fontSize: 13 }}>From {msg.from}. You didn’t type these details. PayShield will check this payment before any money moves.</p>
          </div>
        )}
        {step === 'amount' && (
          <>
            <div className="card" style={{ justifyItems: 'center', textAlign: 'center', gap: 6, padding: '22px 16px' }}>
              <span className="avatar lg">{initials(payeeName || upi)}</span>
              <b>{payeeName || 'Unregistered account'}</b>
              <small className="muted mono">{upi}</small>
              <label htmlFor="amt" className="sr">Amount in rupees</label>
              <input id="amt" className="amount-in num" inputMode="numeric" placeholder="₹0" autoFocus
                value={amount ? inr(amt) : ''} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, '').slice(0, 7))} />
              <span className="help">Balance {inr(user.balance)}</span>
            </div>
            <div className="field"><label htmlFor="note">Note (optional)</label><input id="note" className="input" placeholder="What’s it for?" value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} /></div>
            {err && <div className="error" role="alert">{err}</div>}
            <button className="btn block" disabled={!amt} onClick={goReview}>Review payment</button>
          </>
        )}

        {step === 'review' && preview && (
          <>
            <div className="card">
              <div className="spread"><span className="eyebrow">You’re paying</span>{preview.saved ? <span className="pill fill c-low">Saved payee</span> : <span className="pill fill c-med">First payment</span>}</div>
              <div className="row"><span className="avatar lg">{initials(preview.name || upi)}</span><div className="grow"><b style={{ fontSize: 17 }}>{preview.name || 'Unregistered account'}</b><br /><small className="muted mono">{upi}</small></div></div>
              <div className="divider" />
              <div className="spread"><span className="muted">Amount</span><b className="num" style={{ font: '800 26px var(--display)' }}>{inr(amt)}</b></div>
              {note && <div className="spread"><span className="muted">Note</span><span>{note}</span></div>}
            </div>
            <PayeeFacts facts={preview.facts} />
            {preview.needsCheck ? (
              <div className="tier-banner tb-MEDIUM" style={{ gap: 4 }}>
                <b style={{ fontSize: 15 }}>One quick check before you pay</b>
                <p className="muted" style={{ color: 'var(--mute)' }}>
                  {[preview.ctx.from_message && 'opened from a link in a message', preview.ctx.active_call && (preview.ctx.callKind === 'phone' || preview.ctx.callKind === 'internet' ? 'a call is in progress on this phone' : 'you’re on a call'), preview.ctx.screen_shared && 'your screen is being shared', preview.ctx.new_beneficiary && 'first payment to this account', preview.ctx.amount_unusual && `about ${Math.round(preview.ctx.amountRatio)}× your usual amount`, preview.ctx.rapid_transactions && 'several payments in a short time'].filter(Boolean).join(', ').replace(/^./, (c) => c.toUpperCase())}.
                </p>
              </div>
            ) : (
              <div className="shield-strip"><span className="ic"><ShieldCheck size={18} /></span><span className="grow"><b style={{ fontSize: 14 }}>No warning signs</b><br /><small className="muted">Payments like this go through without extra steps.</small></span></div>
            )}
            <div className="m-foot" style={{ padding: 0, background: 'none', position: 'static' }}>
              {preview.needsCheck ? <button className="btn block" onClick={() => setStep('check')}>Continue to safety check</button> : <button className="btn block" onClick={() => submit(true)}>Pay {inr(amt)}</button>}
            </div>
          </>
        )}

        {step === 'check' && (
          <>
            <p className="muted" style={{ margin: 0 }}>Answer honestly. Nobody else sees these answers, and you can skip.</p>
            <div className="q-card">
              <p>Who asked you to make this payment, and what is it for?</p>
              <div className="purpose">
                {PURPOSES.map((p) => <button key={p.id} className={purpose === p.id ? 'on' : ''} onClick={() => setPurpose(p.id)}>{p.label}</button>)}
              </div>
            </div>
            {QUESTIONS.map((q) => (
              <div className="q-card" key={q.id}>
                <p>{q.q}</p>
                <div className="yn">
                  {[[true, 'Yes'], [false, 'No']].map(([v, l]) => <button key={l} className={answers[q.id] === v ? 'on' : ''} onClick={() => setAnswers({ ...answers, [q.id]: v })}>{l}</button>)}
                </div>
                {q.id === 'independent_verification' && <small className="help">Checking means using a number or website you found yourself, not one given by the person asking for money.</small>}
              </div>
            ))}
            <button className="btn block" onClick={() => submit(false)}>See result</button>
            <button className="btn ghost block" onClick={() => submit(true)}>Skip the questions</button>
          </>
        )}

        {step === 'risk' && tx && <RiskResult user={user} tx={tx} onDone={() => setStep('done')} toast={toast} />}

        {step === 'done' && tx && <Outcome tx={tx} onNew={reset} onActivity={() => nav('../activity')} />}
      </div>
    </>
  );
}

function PayeeFacts({ facts }) {
  if (!facts || facts.type === 'unknown') {
    return <div className="card flat tight"><span className="row"><HelpCircle size={16} className="dim" /><small className="muted">This account isn’t in the payee registry, so we can’t show its details.</small></span></div>;
  }
  const TypeIcon = facts.type === 'business' ? Building2 : facts.type === 'government' ? Landmark : User;
  const age = facts.ageDays < 60 ? `${facts.ageDays} day${facts.ageDays === 1 ? '' : 's'}` : facts.ageDays < 730 ? `${Math.round(facts.ageDays / 30)} months` : `${Math.round(facts.ageDays / 365)} years`;
  return (
    <div className="card flat">
      <div className="spread"><span className="eyebrow">About this account</span><span className="eyebrow dim">payee registry</span></div>
      <div className="facts">
        <div className="fact"><small>Type</small><b className="row" style={{ gap: 6 }}><TypeIcon size={15} />{facts.type[0].toUpperCase() + facts.type.slice(1)}{facts.verified ? <Check size={14} color="var(--t-low)" /> : null}</b></div>
        <div className="fact"><small>Account age</small><b>{age}</b></div>
        <div className="fact"><small>Paid by today</small><b>{facts.senders24h} {facts.senders24h === 1 ? 'person' : 'people'}</b></div>
        <div className="fact"><small>Reports</small><b style={{ color: facts.reported ? 'var(--t-crit)' : undefined }}>{facts.reported ? 'Reported' : 'None'}</b></div>
      </div>
    </div>
  );
}

function RiskResult({ user, tx, onDone, toast }) {
  const db = useDb();
  const a = tx.assessment;
  const copy = TIER_COPY[a.tier];
  const contact = user.trustedContactId && db.users[user.trustedContactId];
  const canAsk = contact && user.settings?.consentTrusted;
  const [wait, setWait] = useState(a.tier === 'HIGH' ? 10 : 0);
  const [confirmAsk, setConfirmAsk] = useState(false);
  useEffect(() => { if (!wait) return; const id = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(id); }, [wait]);
  const act = (d) => { decide(tx.id, d); onDone(); };
  const ask = () => { requestTrustedContact(tx.id); toast(`${contact.name.split(' ')[0]} has been asked to check`); onDone(); };

  return (
    <>
      <div className={`tier-banner tb-${a.tier}`}>
        <span className="eyebrow" style={{ color: TIER[a.tier].color }}>{TIER[a.tier].label} risk</span>
        <b>{copy.title}</b>
        <p>{copy.body}</p>
      </div>
      <div className="card" style={{ justifyItems: 'center', paddingTop: 20 }}>
        <Gauge score={a.score} tier={a.tier} />
        <div style={{ width: '100%' }}><span className="eyebrow">Why we paused</span><div style={{ height: 8 }} /><ReasonList reasons={a.reasons} /></div>
      </div>
      <StoryVsFacts svf={a.storyVsFacts} facts={tx.facts} />

      <div className="col" style={{ gap: 8 }}>
        {a.tier === 'MEDIUM' && <>
          <button className="btn block" onClick={() => act('CONTINUED')}>I’ve checked, pay {inr(tx.amount)}</button>
          <button className="btn soft block" onClick={() => act('VERIFIED')}><PhoneCall size={17} />I’ll verify first</button>
          <button className="btn ghost block" onClick={() => act('POSTPONED')}><Clock size={17} />Pay later</button>
        </>}
        {(a.tier === 'HIGH' || a.tier === 'CRITICAL') && <>
          <button className="btn danger block" onClick={() => act('CANCELLED')}><X size={18} />Cancel payment</button>
          {canAsk
            ? <button className="btn soft block" onClick={() => setConfirmAsk(true)}><UserCheck size={17} />Ask {contact.name.split(' ')[0]} to check</button>
            : <button className="btn soft block" disabled title="Add a trusted contact in Safety"><UserCheck size={17} />No trusted contact set</button>}
          <button className="btn ghost block" onClick={() => act('POSTPONED')}><Clock size={17} />Postpone</button>
          {a.tier === 'HIGH'
            ? <button className="btn ghost block" disabled={wait > 0} onClick={() => act('CONTINUED')}>{wait > 0 ? `Continue after review (${wait}s)` : `Continue and pay ${inr(tx.amount)}`}</button>
            : <button className="btn ghost block" onClick={() => act('PENDING_REVIEW')}><Hourglass size={17} />I still want to pay: send for review</button>}
        </>}
        <div className="card flat tight">
          <span className="row" style={{ alignItems: 'flex-start' }}><ShieldAlert size={18} color="var(--t-high)" style={{ flex: 'none', marginTop: 2 }} />
            <small className="muted">If someone is threatening you, hang up. Report it on the national cyber-crime helpline <b style={{ color: 'var(--fg)' }} className="mono">1930</b> or at <span className="mono" style={{ color: 'var(--fg)' }}>cybercrime.gov.in</span>.</small>
          </span>
        </div>
      </div>
      {confirmAsk && (
        <div className="scrim" onClick={(e) => e.target === e.currentTarget && setConfirmAsk(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Share with trusted contact">
            <div className="grab" />
            <b className="h3">Share this payment with {contact.name}?</b>
            <p className="muted" style={{ margin: 0 }}>They’ll see the amount, the payee and why it was paused. The payment stays on hold until they reply. Nothing else is shared.</p>
            <button className="btn block" onClick={ask}>Yes, ask {contact.name.split(' ')[0]}</button>
            <button className="btn ghost block" onClick={() => setConfirmAsk(false)}>Not now</button>
          </div>
        </div>
      )}
    </>
  );
}

function Outcome({ tx, onNew, onActivity }) {
  const live = useDb().transactions.find((t) => t.id === tx.id) || tx;
  const s = live.status;
  const pressure = live.assessment?.reasons?.[0]?.code === 'pressure_button';
  const V = {
    COMPLETED: { icon: <Check size={44} />, color: 'var(--t-low)', title: 'Payment sent', body: 'Simulated payment. No real money moved.' },
    CANCELLED: { icon: <CircleSlash size={40} />, color: 'var(--mute)', title: 'Payment cancelled', body: 'Nothing was sent.' },
    POSTPONED: { icon: <Clock size={40} />, color: 'var(--accent-2)', title: 'Saved for later', body: 'Nothing was sent. Take your time and check the request on a number you trust.' },
    PENDING_REVIEW: { icon: <Hourglass size={40} />, color: 'var(--t-high)', title: 'Sent for review', body: 'Our risk team will look at it shortly. You’ll get a notification either way.' },
    AWAITING_CONTACT: { icon: <UserCheck size={40} />, color: 'var(--t-high)', title: pressure ? 'Payment paused for a routine security check' : 'Waiting for your trusted contact', body: pressure ? 'You’ll be notified shortly.' : 'This screen updates as soon as they reply.' },
    AWAITING_DECISION: { icon: <Hourglass size={40} />, color: 'var(--t-med)', title: 'Paused', body: 'Open Activity to finish or cancel this payment.' }
  }[s] || { icon: <Check size={40} />, color: 'var(--accent)', title: s, body: '' };
  return (
    <>
      <div className="result">
        <div className="badge" style={{ color: V.color, background: `color-mix(in srgb, ${V.color} 16%, transparent)` }}>{V.icon}</div>
        {live.amount > 0 && <span className="big num">{inr(live.amount)}</span>}
        <b className="h3">{V.title}</b>
        <p className="muted" style={{ margin: 0, maxWidth: 300 }}>{V.body}</p>
      </div>
      <div className="card receipt">
        <div className="kv"><span>To</span><span>{live.payeeName}</span></div>
        <div className="kv"><span>Status</span><MemberStatus tx={live} /></div>
        {live.assessment && !pressure && <div className="kv"><span>Risk</span><span className="mono">{live.assessment.score} · {TIER[live.assessment.tier].label}</span></div>}
        <div className="kv"><span>Reference</span><span className="mono">{live.id}</span></div>
      </div>
      <button className="btn block" onClick={onNew}>Make another payment</button>
      <button className="btn ghost block" onClick={onActivity}>View activity</button>
    </>
  );
}

/* Discreet pressure button: press and hold for 1.5 s. Nothing on screen says "scam" afterwards. */
function PressureButton({ onTrigger }) {
  const [p, setP] = useState(0);
  const timer = useRef(null);
  const start = () => {
    const t0 = Date.now();
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      const v = Math.min(1, (Date.now() - t0) / 1500);
      setP(v);
      if (v >= 1) { clearInterval(timer.current); setP(0); navigator.vibrate?.(60); onTrigger(); }
    }, 30);
  };
  const stop = () => { clearInterval(timer.current); setP(0); };
  useEffect(() => () => clearInterval(timer.current), []);
  const C = 2 * Math.PI * 20;
  return (
    <button className={`iconbtn ${p ? 'holding' : ''}`} aria-label="Press and hold if you are being pressured"
      onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'none', userSelect: 'none' }}>
      <ShieldCheck size={19} color={p ? 'var(--t-crit)' : undefined} />
      {p > 0 && <svg width="44" height="44" style={{ position: 'absolute', inset: -3, transform: 'rotate(-90deg)' }}><circle cx="22" cy="22" r="20" fill="none" stroke="var(--t-crit)" strokeWidth="3" strokeDasharray={`${p * C} ${C}`} /></svg>}
    </button>
  );
}
