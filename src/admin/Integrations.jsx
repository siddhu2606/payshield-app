import { useMemo, useState } from 'react';
import { Landmark, Smartphone, Network, Database, ShieldAlert, FileText, PhoneCall, KeyRound, Webhook, Copy } from 'lucide-react';
import { useDb } from '../core/store.js';
import { scoreSignals } from '../core/risk.js';
import { factsFor } from '../core/data.js';
import { scanMessage } from '../core/scan.js';
import { Head } from './AdminApp.jsx';
import { useToast } from '../ui.jsx';

// How PayShield sits inside the systems money already moves through.
function Architecture() {
  const box = (x, y, w, h, title, sub, tone = 'var(--line2)', fill = 'var(--panel2)') => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="12" fill={fill} stroke={tone} strokeWidth="1.5" />
      <text x={x + w / 2} y={y + h / 2 - (sub ? 4 : -4)} textAnchor="middle" fill="var(--fg)" fontSize="13.5" fontWeight="600">{title}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fill="var(--mute)" fontSize="11">{sub}</text>}
    </g>
  );
  const arrow = (x1, y1, x2, y2, label, dashed) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--dim)" strokeWidth="1.6" strokeDasharray={dashed ? '5 4' : undefined} markerEnd="url(#ah)" />
      {label && (x1 === x2
        ? <text x={x1 + 8} y={(y1 + y2) / 2 + 4} fill="var(--mute)" fontSize="10.5">{label}</text>
        : <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fill="var(--mute)" fontSize="10.5">{label}</text>)}
    </g>
  );
  const acc = 'var(--accent)';
  const accFill = 'color-mix(in srgb, var(--accent) 14%, var(--panel))';
  return (
    <svg viewBox="0 0 960 360" width="100%" role="img" aria-label="Architecture: the bank or UPI app embeds the PayShield SDK, which calls the PayShield risk API before the bank authorises the payment on UPI." style={{ display: 'block' }}>
      <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--dim)" /></marker></defs>
      {box(20, 40, 180, 64, 'Customer’s bank / UPI app', 'existing app, existing PIN')}
      {box(20, 150, 180, 82, 'PayShield SDK', 'call state · safety check · SMS scan', acc, accFill)}
      {box(300, 150, 200, 82, 'PayShield Risk API', 'score · story vs facts · rings', acc, accFill)}
      {box(600, 40, 160, 64, 'Bank core / PSP', 'authorises or holds')}
      {box(800, 40, 140, 64, 'NPCI UPI', 'money moves')}
      {box(600, 150, 160, 82, 'Trusted contact', 'guardian approve / stop')}
      {box(300, 280, 200, 62, 'Data feeds (with consent)', 'AA history · payee facts · fraud intel')}
      {box(600, 280, 160, 62, 'Reporting', '1930 / CFCFRMS · FIU-IND STR')}
      {box(800, 150, 140, 82, 'Risk console', 'review · policy · audit')}
      {arrow(110, 104, 110, 150, 'pay tapped')}
      {arrow(200, 191, 300, 191, 'POST /assess')}
      {arrow(500, 175, 600, 80, 'tier + action')}
      {arrow(760, 72, 800, 72)}
      {arrow(500, 200, 600, 191, 'hold → ask')}
      {arrow(400, 280, 400, 232, '', true)}
      {arrow(500, 220, 600, 300, 'case', true)}
      {arrow(760, 191, 800, 191, '', true)}
      <text x="20" y="22" fill="var(--mute)" fontSize="11.5" fontFamily="var(--mono)">BLUE = PAYSHIELD · GREY = SYSTEMS THAT ALREADY EXIST</text>
    </svg>
  );
}

const CONNECTORS = [
  { Icon: Smartphone, name: 'Bank & UPI apps (SDK)', how: 'Android/iOS SDK drops the safety check, call-state signal and SMS scan into the bank’s own app, before its PIN screen.', state: 'This app is the reference client' },
  { Icon: Landmark, name: 'Core banking / PSP', how: 'REST + webhooks: the bank calls POST /v1/payments/assess before debit and keeps full control of authorise, hold or decline.', state: 'Contract ready · simulated adapter' },
  { Icon: Network, name: 'UPI (via the PSP bank)', how: 'Runs at the PSP’s pre-authorisation step, so it works with any UPI app the bank powers. No change to NPCI rails.', state: 'Needs a PSP partner' },
  { Icon: Database, name: 'Account Aggregator', how: 'RBI’s consent framework: read-only payment history the member approves, to learn their normal amounts and payees.', state: 'Consent flow mocked in the app' },
  { Icon: ShieldAlert, name: 'Fraud intelligence', how: 'Payee facts from the bank’s own data (account age, senders today), plus reported-account and risky-number lists shared through official channels.', state: 'Synthetic registry in this demo' },
  { Icon: FileText, name: 'Reporting', how: 'Pre-filled 1930 / cybercrime.gov.in complaint for the member; ring cases drafted for the bank’s STR filing to FIU-IND.', state: 'Drafts generated, nothing sent' },
  { Icon: PhoneCall, name: 'Telecom signals', how: 'Call-in-progress from the handset today; a fraud-risk flag on the calling number from the telecom side would plug into the same weight.', state: 'Handset signal live in the APK' },
  { Icon: KeyRound, name: 'Identity & auth', how: 'Uses the bank’s existing login, device binding and MFA. PayShield never sees a PIN, OTP or password.', state: 'By design' }
];

const ENDPOINTS = [
  ['POST', '/v1/payments/assess', 'Score a payment before debit. Returns score, tier, action and reasons.'],
  ['POST', '/v1/payments/{id}/decision', 'Record the member’s choice: continue, cancel, postpone, ask contact, review.'],
  ['POST', '/v1/messages/scan', 'Scan a message the member chose to check. Text is not stored.'],
  ['GET', '/v1/payees/{upi}/facts', 'Account type, age, senders today, reports and ring links.'],
  ['POST', '/v1/trusted-contact/requests', 'Consent-gated hold and alert to the trusted contact.'],
  ['WEBHOOK', 'payment.held · payment.released · ring.flagged', 'Pushed to the bank’s case system and the risk console.']
];

export default function Integrations() {
  const db = useDb();
  const toast = useToast();
  const [ex, setEx] = useState('coerced');
  const sample = useMemo(() => {
    const cases = {
      coerced: { upi: 'rajesh.k4471@ybldemo', amount: 50000, note: 'CBI verification deposit', purpose: 'govt', signals: { new_beneficiary: true, amount_unusual: true, active_call: true, callKind: 'phone' }, screening: { external_pressure: true, threat_reported: true, secrecy_requested: true, continuous_call: true, independent_verification: false } },
      sms: { upi: 'kyc.update.help@axldemo', amount: 9999, note: 'kyc update charges', purpose: 'bank', signals: { new_beneficiary: true, amount_unusual: true, from_message: true, messageFrom: 'AX-KYCUPD' }, screening: {} },
      routine: { upi: 'freshbasket@hdfcdemo', amount: 1200, note: 'Groceries', purpose: 'shopping', signals: {}, screening: {} }
    };
    const c = cases[ex];
    const facts = factsFor(db.registry, c.upi);
    const res = scoreSignals({ ...c.signals, screening: c.screening, purpose: c.purpose, facts, note: c.note }, db.policy);
    const request = {
      payment_ref: 'BANK-TXN-0001', member_id: 'hashed:7f3e…', payee_vpa: c.upi, amount_inr: c.amount, note: c.note,
      context: { new_beneficiary: !!c.signals.new_beneficiary, amount_vs_median: c.signals.amount_unusual ? 6.2 : 0.9, call_in_progress: c.signals.callKind || false, opened_from_message: !!c.signals.from_message },
      safety_check: Object.keys(c.screening).length ? { stated_purpose: c.purpose, ...c.screening } : null
    };
    const response = {
      score: res.score, tier: res.tier, action: res.action,
      hold: res.tier !== 'LOW', offer: res.tier === 'CRITICAL' ? ['cancel', 'ask_trusted_contact', 'postpone', 'send_for_review'] : res.tier === 'HIGH' ? ['cancel', 'ask_trusted_contact', 'postpone', 'continue_after_10s'] : res.tier === 'MEDIUM' ? ['continue', 'verify_first', 'pay_later'] : ['continue'],
      reasons: res.reasons.map((r) => ({ code: r.code, points: r.points, text: r.detail })),
      story_vs_facts: res.storyVsFacts, payee: { type: facts.type, age_days: facts.ageDays, senders_24h: facts.senders24h, reported: facts.reported, linked_to_reported: facts.linkedReported?.length || 0 },
      helpline: res.tier === 'LOW' ? undefined : '1930'
    };
    return { request, response };
  }, [ex, db.registry, db.policy]);
  const scanDemo = scanMessage('KYC expired, SIM blocks tonight. Pay Rs9999 update fee now: https://sbi-kyc-update.co/pay', { from: 'AX-KYCUPD', registry: db.registry });

  const copy = (t) => { try { navigator.clipboard.writeText(t); toast('Copied'); } catch { /* ignore */ } };
  return (
    <>
      <Head title="Integrations" sub="PayShield isn’t a new bank or wallet. It’s a safety layer that plugs into the bank and UPI apps people already use." />
      <div className="ad-body">
        <section className="panel"><Architecture /></section>

        <section className="panel">
          <div className="panel-h"><b>Connectors</b><small className="muted">what a bank would switch on</small></div>
          <div className="conn">
            {CONNECTORS.map(({ Icon, name, how, state }) => (
              <div key={name}>
                <span className="row" style={{ gap: 8 }}><Icon size={17} color="var(--accent-2)" /><b>{name}</b></span>
                <small className="muted">{how}</small>
                <span className="pill c-acc" style={{ justifySelf: 'start' }}>{state}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-h">
            <b>API playground <small className="muted">· live, scored by the same engine as the app</small></b>
            <div className="seg" style={{ gridAutoColumns: 'auto' }}>
              {[['coerced', 'Digital arrest'], ['sms', 'SMS link'], ['routine', 'Routine']].map(([k, l]) => <button key={k} className={ex === k ? 'on' : ''} onClick={() => setEx(k)} style={{ padding: '7px 12px' }}>{l}</button>)}
            </div>
          </div>
          <div className="g2e">
            <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
              <div className="spread"><span className="eyebrow">Request · POST /v1/payments/assess</span><button className="btn xs ghost" onClick={() => copy(JSON.stringify(sample.request, null, 2))}><Copy size={12} />Copy</button></div>
              <pre className="code">{JSON.stringify(sample.request, null, 2)}</pre>
            </div>
            <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
              <div className="spread"><span className="eyebrow">Response · 200 OK · ~40 ms</span><button className="btn xs ghost" onClick={() => copy(JSON.stringify(sample.response, null, 2))}><Copy size={12} />Copy</button></div>
              <pre className="code">{JSON.stringify(sample.response, null, 2)}</pre>
            </div>
          </div>
          <small className="help" style={{ margin: 0 }}>Member IDs are pseudonymised; PayShield receives no name, PIN, OTP, call audio or message history. The bank stays the decision-maker.</small>
        </section>

        <div className="g2e">
          <section className="panel">
            <div className="panel-h"><b>Endpoints</b><Webhook size={16} className="dim" /></div>
            <div className="tablewrap"><table className="tbl"><tbody>
              {ENDPOINTS.map(([m, p, d]) => <tr key={p} style={{ cursor: 'default' }}><td><span className="pill fill c-acc mono">{m}</span></td><td className="mono" style={{ fontSize: 12.5 }}>{p}</td><td className="muted" style={{ fontSize: 13 }}>{d}</td></tr>)}
            </tbody></table></div>
          </section>
          <section className="panel">
            <div className="panel-h"><b>POST /v1/messages/scan</b><small className="muted">example</small></div>
            <pre className="code">{JSON.stringify({ verdict: scanDemo.verdict, score: scanDemo.score, flags: scanDemo.flags.map((f) => `${f.code} +${f.points}`) }, null, 2)}</pre>
            <small className="muted">For a lookalike link “sbi-kyc-update.co” in a KYC-expiry text. The same scanner labels scam SMS in the app’s inbox.</small>
          </section>
        </div>
      </div>
    </>
  );
}
