import { useDb } from '../core/store.js';
import { Head } from './AdminApp.jsx';
import { ago } from '../ui.jsx';

export default function Audit() {
  const db = useDb();
  return (
    <>
      <Head title="Audit log" sub="Every assessment, decision and staff action, newest first." />
      <div className="ad-body">
        <section className="panel">
          <div className="tablewrap">
            <table className="tbl">
              <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Detail</th></tr></thead>
              <tbody>
                {db.audit.slice(0, 200).map((a, i) => (
                  <tr key={i} style={{ cursor: 'default' }}>
                    <td className="muted" title={new Date(a.t).toLocaleString('en-IN')}>{ago(a.t)}</td>
                    <td>{a.actor}</td>
                    <td>{a.action}</td>
                    <td className="wrap mono" style={{ fontSize: 12.5, color: 'var(--mute)' }}>{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
