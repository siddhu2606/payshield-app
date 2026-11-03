import { Link, useNavigate } from 'react-router-dom';
import { Send, QrCode, ShieldCheck, Clock, ChevronRight, AlertTriangle, BadgeCheck, Hourglass, PhoneCall, MonitorSmartphone } from 'lucide-react';
import { InboxButton } from '../MessageLayer.jsx';
import { useDeviceCall } from '../../core/device.js';
import { useDb, historyOf } from '../../core/store.js';
import { Top, Bellbtn } from '../MobileApp.jsx';
import { inr, initials, ago, MemberStatus } from '../../ui.jsx';

export default function MemberHome({ user }) {
  const db = useDb();
  const nav = useNavigate();
  const hist = historyOf(db, user.id);
  const saved = db.beneficiaries.filter((b) => b.userId === user.id);
  const open = hist.filter((t) => ['AWAITING_CONTACT', 'PENDING_REVIEW', 'AWAITING_DECISION'].includes(t.status));
  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
  const checked = hist.filter((t) => t.kind === 'assessed' && t.createdAt >= month.getTime());
  const stopped = checked.filter((t) => ['CANCELLED', 'POSTPONED'].includes(t.status)).length;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const contact = user.trustedContactId && db.users[user.trustedContactId];
  const dev = useDeviceCall();
  const realCall = user.settings?.callState !== false && dev.supported && dev.onCall;
  const shared = user.settings?.callState !== false && dev.supported && dev.screenShared;

  return (
    <>
      <Top avatar={<span className="avatar">{initials(user.name)}</span>} title={user.name.split(' ')[0]} sub={greet} right={<span className="row" style={{ gap: 6 }}><InboxButton userId={user.id} /><Bellbtn userId={user.id} /></span>} />
      <div className="m-body">
        {realCall && (
          <div className="tier-banner tb-HIGH" role="status">
            <span className="row"><PhoneCall size={18} color="var(--t-high)" /><b style={{ fontSize: 15.5 }}>You’re on a {dev.kind === 'internet' ? 'WhatsApp or internet' : 'phone'} call</b></span>
            <p>Detected on this phone by PayShield. If the caller is asking you to pay, verify, or install an app, hang up first. Police and banks never ask for money on a call.</p>
          </div>
        )}
        {shared && (
          <div className="tier-banner tb-CRITICAL" role="status">
            <span className="row"><MonitorSmartphone size={18} color="var(--t-crit)" /><b style={{ fontSize: 15.5 }}>Your screen is being shared</b></span>
            <p>Someone else may be able to see this phone. Stop screen sharing before you pay or enter any PIN.</p>
          </div>
        )}
        {user.kyc !== 'verified' && (
          <div className="tier-banner tb-MEDIUM">
            <span className="row"><Hourglass size={18} color="var(--t-med)" /><b style={{ fontSize: 16 }}>KYC under review</b></span>
            <p>The risk team is checking your documents. Until then, each payment is limited to ₹10,000.</p>
          </div>
        )}
        <div className="balance">
          <small>Available balance · demo money</small>
          <span className="n num">{inr(user.balance)}</span>
          <span className="row" style={{ gap: 6, fontSize: 12.5, color: '#cfe0ff', zIndex: 1 }}>
            {user.kyc === 'verified' ? <><BadgeCheck size={15} /> KYC verified</> : <><Hourglass size={15} /> KYC pending</>}
            <span style={{ opacity: .5 }}>·</span><span className="mono">{user.mobile}</span>
          </span>
        </div>

        <div className="quick">
          <Link to="../pay"><span className="ic"><Send size={19} /></span>Pay</Link>
          <button onClick={() => nav('../pay', { state: { upi: 'kumar.electronics@hdfcdemo' } })}><span className="ic"><QrCode size={19} /></span>Scan</button>
          <Link to="../activity"><span className="ic"><Clock size={19} /></span>Activity</Link>
          <Link to="../safety"><span className="ic"><ShieldCheck size={19} /></span>Safety</Link>
        </div>

        {open.length > 0 && (
          <Link to="../activity" className="shield-strip" style={{ textDecoration: 'none', color: 'inherit', borderColor: 'color-mix(in srgb, var(--t-high) 50%, var(--line))' }}>
            <span className="ic" style={{ background: 'color-mix(in srgb, var(--t-high) 15%, transparent)', color: 'var(--t-high)' }}><AlertTriangle size={18} /></span>
            <span className="grow"><b style={{ fontSize: 14 }}>{open.length} payment{open.length > 1 ? 's' : ''} paused</b><br /><small className="muted">{inr(open[0].amount)} to {open[0].payeeName} · <MemberStatus tx={open[0]} /></small></span>
            <ChevronRight size={18} className="dim" />
          </Link>
        )}

        <div className="shield-strip">
          <span className="ic"><ShieldCheck size={18} /></span>
          <span className="grow">
            <b style={{ fontSize: 14 }}>PayShield is on</b><br />
            <small className="muted">{checked.length ? `${checked.length} payment${checked.length > 1 ? 's' : ''} checked this month${stopped ? `, ${stopped} paused or stopped` : ''}` : 'Routine payments go straight through'}{contact ? ` · Trusted contact: ${contact.name.split(' ')[0]}` : ''}</small>
          </span>
        </div>

        <div className="card">
          <div className="spread"><span className="eyebrow">Pay again</span></div>
          <div className="row" style={{ gap: 14, overflowX: 'auto', paddingBottom: 2 }}>
            {saved.map((b) => (
              <button key={b.id} onClick={() => nav('../pay', { state: { upi: b.upi } })} style={{ background: 'none', border: 0, display: 'grid', justifyItems: 'center', gap: 6, minWidth: 64, padding: 0 }}>
                <span className="avatar lg">{initials(b.name)}</span>
                <small style={{ fontSize: 11.5, maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name.split(' ')[0]}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="spread"><span className="eyebrow">Recent</span><Link to="../activity" className="link" style={{ fontSize: 13 }}>See all</Link></div>
          <div className="list">
            {hist.slice(0, 5).map((t) => (
              <div className="li" key={t.id}>
                <span className="avatar">{initials(t.payeeName)}</span>
                <div className="t"><b>{t.payeeName}</b><small>{t.note || 'Payment'} · {ago(t.createdAt)}</small></div>
                <div style={{ display: 'grid', justifyItems: 'end', gap: 4 }}>
                  <span className="amt">−{inr(t.amount)}</span>
                  {t.status !== 'COMPLETED' && <MemberStatus tx={t} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
