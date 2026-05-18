import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';

function zScoreSafety(z) {
  if (!z) return null;
  const m = String(z).match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const num = parseFloat(m[0]);
  if (num >= 3.0) return { label: 'Safe', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-400/30' };
  if (num >= 1.81) return { label: 'Grey zone', color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-400/30' };
  return { label: 'Distress risk', color: 'text-rose-300', bg: 'bg-rose-500/15', border: 'border-rose-400/40' };
}

function dteSafety(de) {
  if (!de) return null;
  const m = String(de).match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const num = parseFloat(m[0]);
  if (num < 0.5) return { label: 'Conservative', color: 'text-emerald-300' };
  if (num < 1.0) return { label: 'Moderate', color: 'text-cyan-300' };
  if (num < 2.0) return { label: 'Leveraged', color: 'text-amber-300' };
  return { label: 'Heavily leveraged', color: 'text-rose-300' };
}

export default function FinancialStrengthPanel({ strength }) {
  if (!strength) return null;
  const z = zScoreSafety(strength.altmanZScore);
  const dte = dteSafety(strength.debtToEquity);

  return (
    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield size={13} className="text-emerald-300/80" />
          <h4 className="display text-sm text-white">Financial Strength</h4>
        </div>
        {z && (
          <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${z.bg} ${z.border} ${z.color} flex items-center gap-1`}>
            {z.label === 'Safe' ? <CheckCircle2 size={9} /> : <AlertTriangle size={9} />}
            {z.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric
          k="Altman Z"
          v={strength.altmanZScore}
          accent={z?.color}
          tip="≥3.0 safe · 1.81-3.0 grey · <1.81 distress"
        />
        <Metric
          k="D/E"
          v={strength.debtToEquity}
          accent={dte?.color}
          tip={dte?.label}
        />
        <Metric k="Current" v={strength.currentRatio} tip="≥2 strong liquidity" />
        <Metric k="Net Debt / EBITDA" v={strength.netDebtToEbitda} tip="<3 healthy" />
        <Metric k="Interest Cov" v={strength.interestCoverage} tip="≥3x covers interest" />
        <Metric k="Credit" v={strength.creditRating} tip="Investment grade ≥BBB-" />
        <Metric k="FCF" v={strength.fcfAnnual} tip="Annual free cash flow" />
        <Metric k="Cash" v={strength.cashOnHand} tip="Cash on hand" />
      </div>
    </div>
  );
}

function Metric({ k, v, accent, tip }) {
  return (
    <div className="p-2 bg-black/30 rounded border border-white/5" title={tip || ''}>
      <div className="text-[9px] uppercase tracking-wider text-stone-500">{k}</div>
      <div className={`text-xs mono mt-0.5 truncate ${accent || 'text-stone-200'}`}>{v || '—'}</div>
    </div>
  );
}
