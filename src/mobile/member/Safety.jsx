import { useState } from 'react';
import { ShieldCheck, UserCheck, PhoneCall, LogOut, RotateCcw, Hand, Info } from 'lucide-react';
import { useDb, updateSettings, setTrustedContact, resetDemo } from '../../core/store.js';
import { Top } from '../MobileApp.jsx';
import { initials, Sheet, useToast, SyncBadge } from '../../ui.jsx';

export default function Safety({ user, signOut }) {
  const db = useDb();
  const toast = useToast();
  const [pick, setPick] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
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
          <span className="eyebrow">Protection</span>
          <label className="toggle-row"><span>Pause risky payments<small>High and critical payments wait for your decision</small></span><input type="checkbox" className="switch" checked={s.pauseHighRisk !== false} onChange={(e) => updateSettings(user.id, { pauseHighRisk: e.target.checked })} /></label>
          <label className="toggle-row"><span>Use call state<small>With your permission, PayShield knows if you’re on a call with an unknown number while paying. Never the audio or who it is.</small></span><input type="checkbox" className="switch" checked={s.callState !== false} onChange={(e) => updateSettings(user.id, { callState: e.target.checked })} /></label>
          <label className="toggle-row"><span>Discreet pressure button<small>Press and hold the shield during a payment to pause it quietly and alert your contact</small></span><input type="checkbox" className="switch" checked={s.pressureButton !== false} onChange={(e) => updateSettings(user.id, { pressureButton: e.target.checked })} /></label>
        </div>

        <div className="card flat">
          <span className="row"><Hand size={17} color="var(--accent-2)" /><b>How the pressure button works</b></span>
          <small className="muted">If a caller is watching or listening, press and hold the shield icon at the top of the payment screen for 1.5 seconds. The app shows a neutral “routine security check” message, holds the payment, and alerts {contact ? contact.name.split(' ')[0] : 'your trusted contact'}.</small>
        </div>

        <div className="card">
          <span className="eyebrow">What PayShield never does</span>
          {['Listen to your calls or read your messages', 'Look inside other apps', 'Ask for your UPI PIN, OTP or password', 'Call you a criminal or block a payment without telling you why'].map((x) => (
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
