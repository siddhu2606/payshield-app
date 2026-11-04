import { useState } from 'react';
import { ShieldCheck, UserCheck, PhoneCall, LogOut, RotateCcw, Hand, Info, ScanSearch, Landmark, Plus, Smartphone, Check } from 'lucide-react';
import { useDeviceCall, askPhonePermission, isNativeApp } from '../../core/device.js';
import { ScanCard } from '../MessageLayer.jsx';
import { SmsShieldCard } from '../SmsShield.jsx';
import { useDb, updateSettings, setTrustedContact, resetDemo } from '../../core/store.js';
import { Top } from '../MobileApp.jsx';
import { initials, Sheet, useToast, SyncBadge, LangSwitch } from '../../ui.jsx';
import { langOf } from '../../core/i18n.js';

export default function Safety({ user, signOut }) {
  const db = useDb();
  const toast = useToast();
  const [pick, setPick] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState('');
  const [aa, setAa] = useState(false);
  const dev = useDeviceCall();
  const native = isNativeApp();
  const s = user.settings || {};
  const contact = user.trustedContactId && db.users[user.trustedContactId];
  const guardians = Object.values(db.users).filter((u) => u.role === 'guardian');

  return (
    <>
      <Top title="Safety" sub="You decide who steps in" avatar={<span className="avatar">{initials(user.name)}</span>} />
      <div className="m-body">
        <div className="card">
          <div className="spread"><span className="eyebrow">Trusted contact</span>{contact && <span className="pill fill c-low">Consent given</span>}</div>
          {contact ? (
            <div className="row"><span className="avatar lg">{initials(contact.name)}</span><div className="grow"><b>{contact.name}</b><br /><small className="muted">Asked to check high-risk payments, only with your OK each time</small></div></div>
          ) : <p className="muted" style={{ margin: 0 }}>Choose someone you trust. When a payment looks risky, you can ask them to check it before money moves.</p>}
          <button className="btn soft block" onClick={() => setPick(true)}><UserCheck size={17} />{contact ? 'Change trusted contact' : 'Choose a trusted contact'}</button>
        </div>

        <div className="card">
          <span className="eyebrow">Warning language · चेतावनी की भाषा · इशाऱ्याची भाषा</span>
          <LangSwitch user={user} />
          <small className="muted">The safety check, risk warnings, message labels and the lock screen use this language, and can be read aloud.</small>
        </div>

        <div className="card">
          <span className="eyebrow">Protection</span>
          <label className="toggle-row"><span>Pause risky payments<small>High and critical payments wait for your decision</small></span><input type="checkbox" className="switch" checked={s.pauseHighRisk !== false} onChange={(e) => updateSettings(user.id, { pauseHighRisk: e.target.checked })} /></label>
          <label className="toggle-row"><span>Use call state<small>With your permission, PayShield knows if you’re on a call with an unknown number while paying. Never the audio or who it is.</small></span><input type="checkbox" className="switch" checked={s.callState !== false} onChange={(e) => updateSettings(user.id, { callState: e.target.checked })} /></label>
          <label className="toggle-row"><span>Discreet pressure button<small>Press and hold the shield during a payment to pause it quietly and alert your contact</small></span><input type="checkbox" className="switch" checked={s.pressureButton !== false} onChange={(e) => updateSettings(user.id, { pressureButton: e.target.checked })} /></label>
        </div>

        <div className="card">
          <div className="spread"><span className="eyebrow">Real call detection</span>{native ? <span className={`pill fill ${dev.onCall ? 'c-high' : 'c-low'}`}>{dev.onCall ? (dev.kind === 'internet' ? 'On an internet call' : 'On a call') : 'No call'}</span> : <span className="pill c-mute">Android app</span>}</div>
          {native ? (
            <>
              <small className="muted">PayShield checks only <b>whether</b> a call is in progress (phone or WhatsApp-style) and whether the screen is being shared. Never the number, the audio or what is said.</small>
              <div className="facts">
                <div className="fact"><small>Phone or internet call</small><b>{dev.onCall ? 'In progress' : 'None'}</b></div>
                <div className="fact"><small>Screen sharing</small><b style={{ color: dev.screenShared ? 'var(--t-crit)' : undefined }}>{dev.screenShared ? 'Detected' : 'None'}</b></div>
              </div>
              {!dev.phonePermission && <button className="btn soft block" onClick={askPhonePermission}><Smartphone size={16} />Also detect SIM calls (allow phone state)</button>}
              {dev.phonePermission && <small className="row c-low" style={{ gap: 6 }}><Check size={14} />SIM call state allowed</small>}
            </>
          ) : (
            <small className="muted">The Android app detects a real phone or WhatsApp call, and screen sharing, while you pay. In a browser this isn’t possible, so the role-play caller phone simulates the call.</small>
          )}
        </div>

        <SmsShieldCard />

        <div className="card">
          <span className="row" style={{ gap: 6 }}><ScanSearch size={17} color="var(--accent-2)" /><span className="eyebrow">Check a message</span></span>
          <small className="muted">Got an SMS or WhatsApp asking you to pay? Paste it here. It’s checked on this phone and not stored.</small>
          <textarea className="input" rows={3} maxLength={600} placeholder="Paste the message" value={msg} onChange={(e) => setMsg(e.target.value)} style={{ resize: 'vertical', minHeight: 76 }} />
          {msg.trim().length > 8 && <ScanCard text={msg} compact lang={langOf(user)} />}
        </div>

        <div className="card">
          <div className="spread"><span className="eyebrow">Linked bank accounts</span><span className="pill c-mute">simulated</span></div>
          <div className="row"><span className="avatar"><Landmark size={17} /></span><div className="grow"><b>Savings account ••4210</b><br /><small className="muted">Your bank · linked via UPI · used for the balance and history</small></div><span className="pill fill c-low">Primary</span></div>
          <button className="btn soft block" onClick={() => setAa(true)}><Plus size={16} />Link another bank (Account Aggregator)</button>
          <small className="help" style={{ margin: 0 }}>PayShield is a safety layer, not a wallet: it works on top of your existing bank and UPI apps.</small>
        </div>

        <div className="card flat">
          <span className="row"><Hand size={17} color="var(--accent-2)" /><b>How the pressure button works</b></span>
          <small className="muted">If a caller is watching or listening, press and hold the shield icon at the top of the payment screen for 1.5 seconds. The app shows a neutral “routine security check” message, holds the payment, and alerts {contact ? contact.name.split(' ')[0] : 'your trusted contact'}.</small>
        </div>

        <div className="card">
          <span className="eyebrow">What PayShield never does</span>
          {['Listen to your calls, see who is calling, or read your SMS inbox', 'Look inside other apps', 'Ask for your UPI PIN, OTP or password', 'Call you a criminal or block a payment without telling you why'].map((x) => (
            <div key={x} className="row" style={{ fontSize: 13.5 }}><ShieldCheck size={16} color="var(--t-low)" style={{ flex: 'none' }} />{x}</div>
          ))}
        </div>

        <div className="card flat tight">
          <span className="row" style={{ alignItems: 'flex-start' }}><PhoneCall size={17} color="var(--t-high)" style={{ flex: 'none', marginTop: 2 }} /><small className="muted">Being threatened? Hang up and call the national cyber-crime helpline <b className="mono" style={{ color: 'var(--fg)' }}>1930</b>.</small></span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}><SyncBadge /></div>
        <button className="btn ghost block" onClick={() => setConfirmReset(true)}><RotateCcw size={16} />Reset demo data</button>
        <button className="btn ghost block" onClick={signOut}><LogOut size={16} />Sign out</button>
        <p className="help" style={{ textAlign: 'center', margin: 0 }}><Info size={12} /> Prototype for FIN-11 · Team V/Slash · synthetic data</p>
      </div>

      {pick && (
        <Sheet onClose={() => setPick(false)} label="Choose trusted contact">
          <b className="h3">Choose a trusted contact</b>
          <p className="muted" style={{ margin: 0 }}>They only see a payment when you choose to share it. You can change this any time.</p>
          <div className="list">
            {guardians.map((g) => (
              <button key={g.id} className="li" onClick={() => { setTrustedContact(user.id, g.id); setPick(false); toast(`${g.name} is now your trusted contact`); }}>
                <span className="avatar">{initials(g.name)}</span><span className="t"><b>{g.name}</b><small>{g.mobile} · demo</small></span>
                {user.trustedContactId === g.id && <span className="pill fill c-low">Current</span>}
              </button>
            ))}
          </div>
          {contact && <button className="btn ghost block" onClick={() => { setTrustedContact(user.id, null); setPick(false); }}>Remove trusted contact</button>}
        </Sheet>
      )}
      {aa && (
        <Sheet onClose={() => setAa(false)} label="Link a bank">
          <b className="h3">Link a bank with your consent</b>
          <p className="muted" style={{ margin: 0 }}>In a real rollout this uses RBI’s Account Aggregator framework: you approve a time-limited consent in your bank’s app, and PayShield receives only your payment history, to learn what’s normal for you.</p>
          {['Choose your bank from the AA directory', 'Approve the consent: payment history, read-only, 12 months', 'PayShield builds your normal pattern on the phone', 'Revoke any time from the AA app'].map((x, i) => (
            <div key={x} className="row" style={{ fontSize: 14 }}><span className="mono dim">{String(i + 1).padStart(2, '0')}</span>{x}</div>
          ))}
          <button className="btn block" onClick={() => { setAa(false); toast('Demo: in production this opens the Account Aggregator consent screen'); }}>Continue (demo)</button>
        </Sheet>
      )}
      {confirmReset && (
        <Sheet onClose={() => setConfirmReset(false)} label="Reset demo">
          <b className="h3">Reset all demo data?</b>
          <p className="muted" style={{ margin: 0 }}>Every phone and the admin console in this browser go back to the starting story. Payments you made in the demo are removed.</p>
          <button className="btn danger block" onClick={() => { resetDemo(); setConfirmReset(false); toast('Demo data reset'); }}>Reset demo</button>
          <button className="btn ghost block" onClick={() => setConfirmReset(false)}>Keep my data</button>
        </Sheet>
      )}
    </>
  );
}
