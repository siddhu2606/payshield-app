import { useState, useSyncExternalStore } from 'react';
import { ShieldCheck, ShieldHalf, Download, RotateCcw, Lock } from 'lucide-react';
import { listBackups, restoreBackup, exportState } from '../core/store.js';
import { syncStatus } from '../core/sync.js';
import { adminSession } from '../core/auth.js';
import { Head } from './AdminApp.jsx';
import { useToast } from '../ui.jsx';

// The 12-point security review, with what was done in this prototype and what production adds.
const CHECKS = [
  ['Secrets only in environment variables, never in the frontend or git', 'done',
    'The SMS API key (Fast2SMS or Twilio) lives only in a git-ignored .env on the team laptop, read by the SMS relay. The website and APK contain no keys. CI scans every commit with gitleaks and checks the built bundle for key patterns.'],
  ['Admin routes need an admin login', 'done',
    'Every /admin page renders the sign-in until a valid admin session exists: bcrypt-checked password, then a second factor. The session is tab-scoped and expires after 20 minutes idle.'],
  ['Every page checks the user is signed in', 'done',
    'Phone screens need a session and a passcode; a locked phone shows only the lock screen. Production: the same checks on every API call, with short-lived signed tokens.'],
  ['Users can only read and change their own data', 'partial',
    'Each role’s screens only load its own records (a guardian sees only their wards). Sync is end-to-end encrypted per room. Production: row-level authorisation on the server for every query.'],
  ['Validate and sanitise all input', 'done',
    'validate.js cleans every write (UPI ID, amount, names, notes, codes, control and bidi-override characters stripped). State from other devices is shape-checked before use. React escapes all output. Covered by tests.'],
  ['Rate-limit sign-in and API requests', 'done',
    'Passcode and admin sign-in lock after 5 wrong tries, for 30 s and then doubling. The SMS relay has a daily cap and a minimum gap. Sync publishes are debounced. Production: API gateway rate limits.'],
  ['HTTPS everywhere, plus security headers', 'done',
    'GitHub Pages serves HTTPS only; sync uses WSS only; the Android app blocks cleartext traffic. A Content-Security-Policy and a referrer policy are set in the page. GitHub Pages can’t send HSTS or X-Frame-Options headers; production sets them at the gateway.'],
  ['Passwords hashed with bcrypt or argon2', 'done',
    'Passcodes and the admin password are stored only as bcrypt hashes (cost 10). New members choose their own passcode, which is hashed before it’s saved.'],
  ['Database not publicly reachable, daily backups on', 'done',
    'There is no database server to reach. The public relay only sees a hashed topic and AES-256-GCM ciphertext. Every device keeps a daily snapshot (last 7), with export and restore below. Production: PostgreSQL in a private subnet, with encrypted daily backups.'],
  ['Debug mode off, no error details shown to users', 'done',
    'Production build without source maps; console and debugger calls stripped; an error boundary shows a plain message, never a stack trace. The APK is a signed release build, not debuggable, with app backup disabled.'],
  ['Update vulnerable packages, remove unused ones', 'done',
    'npm audit: no known vulnerabilities in anything shipped to users. Upgraded Vite, React Router, sharp and node-tar. Dependabot opens weekly update PRs. Each CI build runs npm audit.'],
  ['Scan git history for leaked secrets', 'done',
    'The full history was scanned for key patterns (Fast2SMS, Twilio, AWS, Google, private keys, tokens): nothing found. gitleaks re-scans on every push.']
];

export default function Security() {
  const toast = useToast();
  const sync = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const [backups, setBackups] = useState(listBackups);
  const s = adminSession();
  const download = () => {
    const blob = new Blob([exportState()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `payshield-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const done = CHECKS.filter((c) => c[1] === 'done').length;
  return (
    <>
      <Head title="Security" sub="The 12-point review: what this prototype does, and what a production rollout adds." />
      <div className="ad-body">
        <div className="kpis">
          <div className="kpi"><span>Checks passed</span><b>{done}/{CHECKS.length}</b><small>{CHECKS.length - done} partial, needs a real server</small></div>
          <div className="kpi"><span>Sync encryption</span><b style={{ fontSize: 20 }}>AES-256-GCM</b><small>{sync.state === 'live' ? `live via ${sync.broker}, topic hashed` : sync.state}</small></div>
          <div className="kpi"><span>Your session</span><b style={{ fontSize: 20 }}>{s ? `${Math.max(0, Math.round((s.exp - Date.now()) / 60e3))} min` : 'expired'}</b><small>idle time-out 20 min</small></div>
          <div className="kpi"><span>Backups on this device</span><b>{backups.length}</b><small>daily, last 7 kept</small></div>
        </div>

        <section className="panel">
          {CHECKS.map(([t, st, how], i) => (
            <div key={t} className="check-row">
              <span className="mono dim" style={{ paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
              <div style={{ display: 'grid', gap: 4 }}><b style={{ fontSize: 14.5 }}>{t}</b><small className="muted" style={{ lineHeight: 1.5 }}>{how}</small></div>
              {st === 'done' ? <span className="pill fill c-low"><ShieldCheck size={12} /> Done</span> : <span className="pill fill c-med"><ShieldHalf size={12} /> Prototype</span>}
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-h"><b>Backups</b><button className="btn sm soft" onClick={download}><Download size={14} />Export backup (JSON)</button></div>
          {backups.length === 0 && <small className="muted">No snapshot yet on this device. One is taken automatically each day the app is opened.</small>}
          <div className="tablewrap"><table className="tbl"><tbody>
            {backups.map((b) => (
              <tr key={b.day} style={{ cursor: 'default' }}>
                <td className="mono">{b.day}</td><td className="muted">{(b.bytes / 1024).toFixed(0)} KB · synthetic data</td>
                <td className="r"><button className="btn xs ghost" onClick={() => { if (restoreBackup(b.day)) { toast(`Restored the ${b.day} snapshot on every device in the room`); setBackups(listBackups()); } else toast('That snapshot didn’t pass validation'); }}><RotateCcw size={12} />Restore</button></td>
              </tr>
            ))}
          </tbody></table></div>
          <small className="help" style={{ margin: 0 }}><Lock size={11} /> Restores are validated first and logged in the audit log.</small>
        </section>
      </div>
    </>
  );
}
