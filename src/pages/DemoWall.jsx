import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, ArrowLeft, Maximize2 } from 'lucide-react';
import { resetDemo } from '../core/store.js';
import { Logo, useToast, SyncBadge } from '../ui.jsx';

const PHONES = [
  ['member', 'Member · Aarav', 'Pay the “Coercion ₹50,000” demo case'],
  ['guardian', 'Guardian · Priya', 'Approve or stop what Aarav shares'],
  ['caller', 'Scam caller · simulation', 'Rings Aarav or Anaya with a script'],
  ['child', 'Child · Anaya', 'Try the “free game coins” offer']
];

export default function DemoWall() {
  const toast = useToast();
  const [key, setKey] = useState(0);
  const [showAdmin, setShowAdmin] = useState(true);
  useEffect(() => {
    document.title = 'PayShield live demo';
    try { localStorage.setItem('ps.admin.session', 'a_meera'); } catch { /* ignore */ }
  }, []);
  const base = `${location.pathname}${location.search}`;
  return (
    <div className="wall">
      <header className="wall-top">
        <div className="row" style={{ gap: 14 }}>
          <Link to="/" className="iconbtn" aria-label="Back to start"><ArrowLeft size={18} /></Link>
          <Logo size={26} sub="Live demo wall" />
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <SyncBadge />
          <button className="btn soft sm" onClick={() => setShowAdmin(!showAdmin)}>{showAdmin ? 'Hide' : 'Show'} admin</button>
          <button className="btn ghost sm" onClick={() => { resetDemo(); setKey((k) => k + 1); toast('Demo reset to the starting story'); }}><RotateCcw size={15} />Reset demo</button>
        </div>
      </header>
      <div className={`wall-grid ${showAdmin ? '' : 'no-admin'}`}>
        <div className="wall-phones">
          {PHONES.map(([role, label, hint]) => (
            <figure key={role + key} className="wall-phone">
              <figcaption><b>{label}</b><small>{hint}</small></figcaption>
              <div className="bezel"><iframe title={label} name={role} src={`${base}#/app?as=${role}&frame=1`} /></div>
            </figure>
          ))}
        </div>
        {showAdmin && (
          <figure className="wall-admin" key={'admin' + key}>
            <figcaption className="spread"><span><b>Admin risk console</b><small> · Meera, risk ops</small></span><Link to="/admin" className="link row" style={{ gap: 5, fontSize: 13 }}><Maximize2 size={13} />Full screen</Link></figcaption>
            <div className="screen"><iframe title="Admin console" name="admin" src={`${base}#/admin/overview`} /></div>
          </figure>
        )}
      </div>
    </div>
  );
}
