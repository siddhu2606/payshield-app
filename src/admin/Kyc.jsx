import { useState } from 'react';
import { Check, X, HelpCircle } from 'lucide-react';
import { useDb, reviewKyc } from '../core/store.js';
import { Head } from './AdminApp.jsx';
import { initials, ago, StatusPill, useToast } from '../ui.jsx';

export default function Kyc() {
  const db = useDb();
  const toast = useToast();
  const [sel, setSel] = useState(db.kyc[0]?.id);
  const k = db.kyc.find((x) => x.id === sel) || db.kyc[0];
  const act = (status) => { reviewKyc(k.id, status, 'a_meera'); toast(`${k.name}: ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'asked for more documents'}`); };
  const chk = (label, ok, val) => <div className="kv2"><span>{label}</span><b className={ok ? 'c-low' : 'c-high'}>{val}</b></div>;
  return (
    <>
      <Head title="KYC queue" sub="New members waiting for identity checks. Sign up in the mobile app to add one." />
      <div className="ad-body">
        <div className="g2">
          <section className="panel">
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>Applicant</th><th>Segment</th><th>Name match</th><th>Status</th><th>Submitted</th></tr></thead>
                <tbody>
                  {db.kyc.map((x) => (
                    <tr key={x.id} className={x.id === k?.id ? 'sel' : ''} onClick={() => setSel(x.id)}>
                      <td><div className="who"><span className="avatar">{initials(x.name)}</span><div><b>{x.name}</b><small>{x.id}{x.userId ? ' · from app' : ''}</small></div></div></td>
                      <td>{x.segment}</td>
                      <td className="mono" style={{ color: x.checks.nameMatch >= 85 ? 'var(--t-low)' : 'var(--t-high)' }}>{x.checks.nameMatch}%</td>
                      <td><StatusPill s={x.status} /></td>
                      <td className="muted">{ago(x.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {k && (
            <section className="panel">
              <header><h2>{k.id} · {k.name}</h2><StatusPill s={k.status} /></header>
              <div className="docs"><div className="doc">Aadhaar (masked)</div><div className="doc">PAN</div><div className="doc">Selfie</div></div>
              <small className="dim">Document images are placeholders. The prototype never collects real ID documents.</small>
              {chk('Aadhaar OTP match', k.checks.aadhaar, k.checks.aadhaar ? 'Verified' : 'Failed')}
              {chk('PAN match', k.checks.pan, k.checks.pan ? 'Verified' : 'Mismatch')}
              {chk('Liveness', k.checks.liveness, k.checks.liveness ? 'Passed' : 'Failed')}
              {chk('Name similarity', k.checks.nameMatch >= 85, `${k.checks.nameMatch}%`)}
              <div className="row wrap">
                <button className="btn ok sm" disabled={k.status === 'approved'} onClick={() => act('approved')}><Check size={15} />Approve</button>
                <button className="btn soft sm" onClick={() => act('pending')}><HelpCircle size={15} />Ask for more</button>
                <button className="btn danger sm" disabled={k.status === 'rejected'} onClick={() => act('rejected')}><X size={15} />Reject</button>
              </div>
              {k.userId && <small className="muted">Approving lifts the ₹10,000 limit in this member’s app immediately.</small>}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
