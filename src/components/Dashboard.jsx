import { Target, TrendingUp, Users, Activity, BarChart3 } from 'lucide-react';
import StatTile from './StatTile.jsx';

const VERDICT_COLORS = {
  deep: '#34d399',
  undervalued: '#22d3ee',
  fair: '#fbbf24',
  overvalued: '#f87171',
};

export default function Dashboard({ aggregate, onSectorClick }) {
  const stats = aggregate?.stats;
  const sectorAgg = Array.isArray(aggregate?.sectorAgg) ? aggregate.sectorAgg : [];
  const valuationDist = aggregate?.valuationDist || { deep: 0, undervalued: 0, fair: 0, overvalued: 0 };

  if (!stats) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center text-white/40">
        Dashboard appears once sector scans complete.
      </div>
    );
  }

  const totalValuation = Object.values(valuationDist).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-6">
      {/* Hero stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile label="Total Picks" value={stats.totalPicks} sub={`${stats.sectors} sectors`} />
        <StatTile label="Deep Value" value={stats.deepValueCount} sub="composite ≥ 80" accent="#34d399" />
        <StatTile label="Undervalued" value={stats.undervaluedCount} sub="65-79" accent="#22d3ee" />
        <StatTile label="Avg P/E" value={stats.avgPe ?? '—'} sub={`fwd ${stats.avgForwardPe ?? '—'}`} />
        <StatTile label="Avg Rev YoY" value={stats.avgRevenueGrowth != null ? `${stats.avgRevenueGrowth}%` : '—'} sub={`EPS ${stats.avgEpsGrowth != null ? stats.avgEpsGrowth + '%' : '—'}`} accent="#34d399" />
        <StatTile label="Insider Buys" value={stats.insiderBuyingCount} sub={`of ${stats.totalPicks}`} accent="#a78bfa" />
      </div>

      {/* Valuation distribution bar */}
      {totalValuation > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-white/60" />
            <h3 className="display text-sm text-white">Valuation Distribution</h3>
          </div>
          <div className="flex h-8 rounded-lg overflow-hidden">
            {Object.entries(valuationDist).map(([k, v]) => {
              if (v === 0) return null;
              const pct = (v / totalValuation) * 100;
              return (
                <div
                  key={k}
                  className="flex items-center justify-center text-[11px] font-medium text-white"
                  style={{ background: VERDICT_COLORS[k], width: `${pct}%`, color: '#0a0a14' }}
                  title={`${k}: ${v} (${pct.toFixed(0)}%)`}
                >
                  {pct > 8 ? `${v}` : ''}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[11px] flex-wrap">
            <Legend color={VERDICT_COLORS.deep} label="Deep Value" count={valuationDist.deep} />
            <Legend color={VERDICT_COLORS.undervalued} label="Undervalued" count={valuationDist.undervalued} />
            <Legend color={VERDICT_COLORS.fair} label="Fair Value" count={valuationDist.fair} />
            <Legend color={VERDICT_COLORS.overvalued} label="Overvalued" count={valuationDist.overvalued} />
          </div>
        </div>
      )}

      {/* Sector breakdown */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10">
          <h3 className="display text-sm text-white">Sector Breakdown</h3>
        </div>
        <div className="divide-y divide-white/5">
          {sectorAgg.map((s) => (
            <button
              key={s.id}
              onClick={() => onSectorClick && onSectorClick(s.id)}
              className="w-full px-5 py-3 hover:bg-white/[0.03] transition text-left flex items-center gap-4"
            >
              <div
                className="w-8 h-8 rounded mono text-xs font-bold flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}25`, color: s.color }}
              >
                {s.short?.slice(0, 2) || '??'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium">{s.label}</div>
                <div className="text-[11px] text-white/45 truncate">
                  {s.deepValueCount} deep value · {s.undervaluedCount} undervalued · {s.insiderBuyingCount} w/ insider buying
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] text-white/40 uppercase">Picks</div>
                  <div className="mono text-white/85">{s.pickCount}</div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] text-white/40 uppercase">Avg P/E</div>
                  <div className="mono text-white/85">{s.avgPe ?? '—'}</div>
                </div>
                <div className="text-right hidden md:block">
                  <div className="text-[10px] text-white/40 uppercase">Avg Rev YoY</div>
                  <div className="mono text-emerald-300">{s.avgRevenueGrowth != null ? `${s.avgRevenueGrowth}%` : '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-white/40 uppercase">Avg Score</div>
                  <div className="display text-amber-300 text-lg leading-none">{s.avgCompositeScore ?? '—'}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label, count }) {
  return (
    <span className="flex items-center gap-1.5 text-white/60">
      <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
      {label} <span className="mono text-white/85">{count}</span>
    </span>
  );
}
