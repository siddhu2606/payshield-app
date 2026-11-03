import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, CartesianGrid } from 'recharts';
import { useDb } from '../core/store.js';
import { TIER, WEIGHT_LABELS } from '../core/risk.js';
import { Head } from './AdminApp.jsx';
import { inr, initials, ago, TierPill, StatusPill, useNow } from '../ui.jsx';

const TIER_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const TIER_HEX = { LOW: '#34d399', MEDIUM: '#fbbf24', HIGH: '#fb8c3c', CRITICAL: '#f4475f' };

export function ChartTip({ active, payload, label, unit = 'payments' }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--panel3)', border: '1px solid var(--line2)', borderRadius: 10, padding: '8px 11px', fontSize: 13 }}>
      <b>{label}</b><br /><span className="mono">{payload[0].value}</span> <span className="muted">{unit}</span>
    </div>
  );
}

export default function Overview() {
  const db = useDb();
  useNow(20000);
  const assessed = db.transactions.filter((t) => t.kind === 'assessed');
  const nameOf = (id) => db.users[id]?.name || id;
  const tiers = TIER_ORDER.map((k) => ({ k, name: TIER[k].label, v: assessed.filter((t) => t.assessment?.tier === k).length }));
  const OUT = [['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled'], ['POSTPONED', 'Postponed'], ['PENDING_REVIEW', 'Pending review'], ['AWAITING_CONTACT', 'With trusted contact']];
  const outcomes = OUT.map(([k, name]) => ({ name, v: assessed.filter((t) => t.status === k).length }));
  const stopped = assessed.filter((t) => ['CANCELLED', 'POSTPONED'].includes(t.status) && t.assessment?.tier !== 'LOW').length;
  const elevated = assessed.filter((t) => t.assessment && t.assessment.tier !== 'LOW').length;
  const open = assessed.filter((t) => ['PENDING_REVIEW', 'AWAITING_CONTACT', 'AWAITING_DECISION'].includes(t.status)).sort((a, b) => b.assessment.score - a.assessment.score);
  const lowShare = assessed.length ? Math.round((tiers[0].v / assessed.length) * 100) : 0;
  const protectedAmt = assessed.filter((t) => ['CANCELLED', 'POSTPONED'].includes(t.status) && ['HIGH', 'CRITICAL'].includes(t.assessment?.tier)).reduce((a, t) => a + t.amount, 0);

  const counts = {};
  assessed.forEach((t) => t.assessment?.reasons?.forEach((r) => { if (WEIGHT_LABELS[r.code]) counts[r.code] = (counts[r.code] || 0) + 1; }));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxTop = top[0]?.[1] || 1;

  return (
    <>
      <Head title="Overview" sub="Every payment PayShield has checked, across all members. Synthetic data." />
      <div className="ad-body">
        <div className="kpis">
          <div className="kpi"><span>Payments checked</span><b>{assessed.length}</b><small>{lowShare}% went through with no friction</small></div>
          <div className="kpi"><span>Raised a warning</span><b>{elevated}</b><small>Medium, high or critical</small></div>
          <div className="kpi"><span>Paused or stopped by member</span><b style={{ color: 'var(--t-low)' }}>{stopped}</b><small>{inr(protectedAmt)} not sent at high risk</small></div>
          <div className="kpi"><span>Need a decision now</span><b style={{ color: open.length ? 'var(--t-crit)' : undefined }}>{open.length}</b><small>Review queue and trusted contacts</small></div>
        </div>

        <div className="g2">
          <section className="panel">
            <header><h2>Risk tiers<small>payments by assessed tier</small></h2></header>
            <div style={{ height: 230 }}>
              <ResponsiveContainer>
                <BarChart data={tiers} margin={{ top: 22, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: 'var(--line2)' }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(143,194,255,.06)' }} />
                  <Bar dataKey="v" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {tiers.map((t) => <Cell key={t.k} fill={TIER_HEX[t.k]} />)}
                    <LabelList dataKey="v" position="top" style={{ fill: 'var(--fg)', font: '500 12px var(--mono)' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="panel">
            <header><h2>Outcomes<small>what happened next</small></h2></header>
            <div style={{ height: 230 }}>
              <ResponsiveContainer>
                <BarChart data={outcomes} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }} barCategoryGap="26%">
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={136} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(143,194,255,.06)' }} />
                  <Bar dataKey="v" fill="#3d8bff" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    <LabelList dataKey="v" position="right" style={{ fill: 'var(--fg)', font: '500 12px var(--mono)' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <div className="g2">
          <section className="panel">
            <header><h2>Needs attention</h2><Link to="../review" className="link" style={{ fontSize: 13 }}>Open review queue</Link></header>
            {open.length === 0 ? <div className="empty">Nothing waiting. New held payments appear here live.</div> : (
              <div className="list">
                {open.slice(0, 5).map((t) => (
                  <Link key={t.id} to="../review" state={{ id: t.id }} className="li" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <span className="avatar">{initials(nameOf(t.userId))}</span>
                    <span className="t"><b>{nameOf(t.userId)} → {t.payeeName}</b><small>{t.assessment.reasons[0]?.label} · {ago(t.createdAt)}</small></span>
                    <span className="amt">{inr(t.amount)}</span>
                    <TierPill tier={t.assessment.tier} score={t.assessment.score} />
                  </Link>
                ))}
              </div>
            )}
          </section>
          <section className="panel">
            <header><h2>Most common warning signs</h2></header>
            <div style={{ display: 'grid', gap: 10 }}>
              {top.map(([code, n]) => (
                <div className="cmp" key={code} style={{ gridTemplateColumns: 'minmax(0,1fr) 120px 32px' }}>
                  <span style={{ minWidth: 0 }}>{WEIGHT_LABELS[code]}</span>
                  <div className="bar"><i style={{ width: `${(n / maxTop) * 100}%`, background: 'var(--accent)' }} /></div>
                  <b className="mono" style={{ textAlign: 'right' }}>{n}</b>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="panel">
          <header><h2>Live activity</h2><Link to="../audit" className="link" style={{ fontSize: 13 }}>Full audit log</Link></header>
          <div className="list">
            {db.audit.slice(0, 7).map((a, i) => (
              <div className="li" key={i}>
                <span className="mono dim" style={{ width: 74, fontSize: 12 }}>{ago(a.t)}</span>
                <span className="t"><b style={{ fontWeight: 500 }}>{a.action}</b><small>{a.actor} · {a.detail}</small></span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

export { TIER_HEX, StatusPill };
