import { useState } from 'react';
import { Flag } from 'lucide-react';
import { useDb, toggleReported } from '../core/store.js';
import { Head } from './AdminApp.jsx';
import { useToast } from '../ui.jsx';

export default function Registry() {
  const db = useDb();
  const toast = useToast();
  const [only, setOnly] = useState(false);
  const rows = Object.values(db.registry).filter((r) => !only || (r.type === 'individual' && r.ageDays < 30 && r.senders24h >= 10) || r.reported);
  return (
    <>
      <Head title="Payee registry" sub="The facts the caller can’t change. Synthetic here; a real rollout would use the bank’s or payment provider’s own account data." />
      <div className="ad-body">
        <div className="filters">
          <div className="seg" style={{ gridAutoColumns: 'auto' }}>
            <button className={!only ? 'on' : ''} onClick={() => setOnly(false)} style={{ padding: '7px 12px' }}>All accounts</button>
            <button className={only ? 'on' : ''} onClick={() => setOnly(true)} style={{ padding: '7px 12px' }}>Mule-like or reported</button>
          </div>
        </div>
        <section className="panel">
          <div className="tablewrap">
            <table className="tbl">
              <thead><tr><th>UPI ID</th><th>Registered name</th><th>Type</th><th className="r">Age (days)</th><th className="r">Senders today</th><th>Signals</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const mule = r.type === 'individual' && r.ageDays < 30 && r.senders24h >= 10;
                  return (
                    <tr key={r.upi} style={{ cursor: 'default' }}>
                      <td className="mono">{r.upi}</td>
                      <td>{r.name}</td>
                      <td><span className={`pill fill ${r.type === 'individual' ? 'c-mute' : 'c-acc'}`}>{r.type}</span></td>
                      <td className="r mono" style={{ color: r.ageDays < 30 ? 'var(--t-high)' : undefined }}>{r.ageDays}</td>
                      <td className="r mono" style={{ color: mule ? 'var(--t-high)' : undefined }}>{r.senders24h}</td>
                      <td className="row" style={{ gap: 6 }}>{mule && <span className="pill fill c-high">New + many senders</span>}{r.reported && <span className="pill fill c-crit">Reported</span>}{r.verified && <span className="pill fill c-low">Verified</span>}</td>
                      <td className="r"><button className={`btn xs ${r.reported ? 'danger' : 'soft'}`} onClick={() => { toggleReported(r.upi, 'a_meera'); toast(r.reported ? 'Report removed' : `${r.upi} marked as reported`); }}><Flag size={12} />{r.reported ? 'Unmark' : 'Report'}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <p className="help" style={{ margin: 0 }}>We never call an account criminal. A report adds weight to the score and the member sees a neutral explanation.</p>
      </div>
    </>
  );
}
