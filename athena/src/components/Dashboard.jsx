import { Target, TrendingUp, Users, Activity, BarChart3, Zap, DollarSign, Flame, AlertCircle, Calendar } from 'lucide-react';
import StatTile from './StatTile.jsx';
import EarningsCalendar from './EarningsCalendar.jsx';
import StocksListTable from './StocksListTable.jsx';
import { STRATEGIES } from '../lib/strategies.js';

const VERDICT_COLOR = {
  // value
  'Deep Value': '#34d399', 'Undervalued': '#22d3ee', 'Fair Value': '#fbbf24', 'Overvalued': '#f87171',
  // day/swing
  'Strong Setup': '#34d399', 'Prime Setup': '#34d399',
  'Setup': '#22d3ee', 'Solid Setup': '#22d3ee',
  'Watch': '#fbbf24', 'Avoid': '#f87171',
  // dividend
  'Income Anchor': '#34d399', 'Stable Yield': '#22d3ee', 'Yield Trap': '#f87171',
};

export default function Dashboard({ strategyId = 'value', aggregate, onSectorClick, onTickerClick, watchlist, onToggleWatch }) {
  const stats = aggregate?.stats;
  const sectorAgg = Array.isArray(aggregate?.sectorAgg) ? aggregate.sectorAgg : [];
  const verdictDist = aggregate?.verdictDist || {};
  const allPicks = Array.isArray(aggregate?.allPicks) ? aggregate.allPicks : [];

  if (!stats) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center text-stone-500">
        Dashboard appears once {STRATEGIES[strategyId]?.label || ''} scans complete.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Strategy header */}
      <StrategyHeader strategyId={strategyId} stats={stats} />

      {/* Hero stats — strategy-specific */}
      <HeroStats strategyId={strategyId} stats={stats} />

      {/* Verdict distribution */}
      <VerdictDistribution dist={verdictDist} total={stats.totalPicks} />

      {/* Top 5 highlights — strategy-specific */}
      <TopHighlights strategyId={strategyId} picks={allPicks} onTickerClick={onTickerClick} />

      {/* Earnings calendar */}
      {(strategyId === 'value' || strategyId === 'swing' || strategyId === 'daytrade') && (
        <EarningsCalendar picks={allPicks} onTickerClick={onTickerClick} />
      )}

      {/* Sector breakdown */}
      <SectorBreakdown strategyId={strategyId} sectorAgg={sectorAgg} onSectorClick={onSectorClick} />

      {/* The big comprehensive stocks list */}
      <StocksListTable
        strategyId={strategyId}
        picks={allPicks}
        onTickerClick={onTickerClick}
        watchlist={watchlist}
        onToggleWatch={onToggleWatch}
      />
    </div>
  );
}

function StrategyHeader({ strategyId, stats }) {
  const cfg = STRATEGIES[strategyId];
  if (!cfg) return null;
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h2 className="display text-xl text-white">{cfg.label} Dashboard</h2>
        <div className="text-xs text-stone-500">{cfg.description}</div>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="px-2 py-1 rounded bg-stone-800/60 text-stone-300 mono">{cfg.horizonLabel}</span>
        <span className="px-2 py-1 rounded bg-stone-800/60 text-stone-300">
          Avg score <span className="mono text-amber-300">{stats.avgCompositeScore ?? '—'}</span>
        </span>
        <span className="px-2 py-1 rounded bg-stone-800/60 text-stone-300">
          <span className="mono">{stats.totalPicks}</span> picks · <span className="mono">{stats.sectors}</span> sectors
        </span>
      </div>
    </div>
  );
}

function HeroStats({ strategyId, stats }) {
  const tiles = buildHeroTiles(strategyId, stats);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {tiles.map((t, i) => (
        <StatTile key={i} label={t.label} value={t.value} sub={t.sub} accent={t.accent} />
      ))}
    </div>
  );
}

function buildHeroTiles(strategyId, s) {
  if (strategyId === 'daytrade') {
    return [
      { label: 'Total Setups', value: s.totalPicks, sub: `${s.sectors} sectors` },
      { label: 'Strong Setup', value: s.strongSetupCount, sub: 'composite ≥ 80', accent: '#34d399' },
      { label: 'Setup', value: s.setupCount, sub: '65-79', accent: '#22d3ee' },
      { label: 'Avg Momentum', value: s.avgMomentum ?? '—', sub: 'RSI / MACD bucket', accent: '#22d3ee' },
      { label: 'Unusual Vol', value: s.unusualVolumeCount, sub: '≥1.5× avg', accent: '#a78bfa' },
      { label: 'Earnings ≤7d', value: s.nearEarningsCount, sub: 'event vol risk', accent: '#fbbf24' },
    ];
  }
  if (strategyId === 'swing') {
    return [
      { label: 'Total Setups', value: s.totalPicks, sub: `${s.sectors} sectors` },
      { label: 'Prime Setup', value: s.primeSetupCount, sub: 'composite ≥ 80', accent: '#34d399' },
      { label: 'Solid Setup', value: s.solidSetupCount, sub: '65-79', accent: '#22d3ee' },
      { label: 'Avg R/R', value: s.avgRRRatio != null ? `1:${s.avgRRRatio}` : '—', sub: 'target ÷ stop', accent: '#fbbf24' },
      { label: 'Earnings ≤14d', value: s.earningsNext14Count, sub: 'catalyst window', accent: '#fbbf24' },
      { label: 'Inst Buying', value: s.instFlowPositiveCount, sub: '13F / blocks', accent: '#a78bfa' },
    ];
  }
  if (strategyId === 'dividend') {
    return [
      { label: 'Total Picks', value: s.totalPicks, sub: `${s.sectors} sectors` },
      { label: 'Income Anchor', value: s.anchorCount, sub: 'composite ≥ 80', accent: '#34d399' },
      { label: 'Avg Yield', value: s.avgYield != null ? `${s.avgYield}%` : '—', sub: `payout ${s.avgPayoutRatio != null ? s.avgPayoutRatio + '%' : '—'}` },
      { label: 'Aristocrats', value: s.aristocratCount, sub: '25+ years raised', accent: '#fbbf24' },
      { label: 'Strong FCF Cov', value: s.strongFcfCoverageCount, sub: '≥1.5× dividend', accent: '#34d399' },
      { label: 'Avg Yrs Raised', value: s.avgYearsRaised ?? '—', sub: 'consecutive', accent: '#a78bfa' },
    ];
  }
  // value (default)
  return [
    { label: 'Total Picks', value: s.totalPicks, sub: `${s.sectors} sectors` },
    { label: 'Deep Value', value: s.deepValueCount, sub: 'composite ≥ 80', accent: '#34d399' },
    { label: 'Undervalued', value: s.undervaluedCount, sub: '65-79', accent: '#22d3ee' },
    { label: 'Avg P/E', value: s.avgPe ?? '—', sub: `fwd ${s.avgForwardPe ?? '—'}` },
    { label: 'Avg Rev YoY', value: s.avgRevenueGrowth != null ? `${s.avgRevenueGrowth}%` : '—', sub: `EPS ${s.avgEpsGrowth != null ? s.avgEpsGrowth + '%' : '—'}`, accent: '#34d399' },
    { label: 'Insider Buys', value: s.insiderBuyingCount, sub: `of ${s.totalPicks}`, accent: '#a78bfa' },
  ];
}

function VerdictDistribution({ dist, total }) {
  if (!total || total === 0) return null;
  const entries = Object.entries(dist).filter(([, n]) => n > 0).sort(([, a], [, b]) => b - a);
  if (entries.length === 0) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={14} className="text-white/60" />
        <h3 className="display text-sm text-white">Verdict Distribution</h3>
      </div>
      <div className="flex h-8 rounded-lg overflow-hidden">
        {entries.map(([k, n]) => {
          const pct = (n / total) * 100;
          const color = VERDICT_COLOR[k] || '#a3a3a3';
          return (
            <div
              key={k}
              className="flex items-center justify-center text-[11px] font-medium"
              style={{ background: color, width: `${pct}%`, color: '#0a0a14' }}
              title={`${k}: ${n} (${pct.toFixed(0)}%)`}
            >
              {pct > 8 ? n : ''}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[11px] flex-wrap">
        {entries.map(([k, n]) => (
          <span key={k} className="flex items-center gap-1.5 text-white/60">
            <span className="w-3 h-3 rounded-sm" style={{ background: VERDICT_COLOR[k] || '#a3a3a3' }} />
            {k} <span className="mono text-white/85">{n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TopHighlights({ strategyId, picks, onTickerClick }) {
  if (!picks || picks.length === 0) return null;
  const top5 = [...picks].sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0)).slice(0, 5);
  const titleByStrategy = {
    value:    { title: 'Top 5 Highest Conviction',   icon: TrendingUp, sub: 'Best composite scores' },
    daytrade: { title: 'Top 5 Day-Trade Setups',     icon: Zap,        sub: 'Highest momentum + volume' },
    swing:    { title: 'Top 5 Swing Setups',          icon: Activity,   sub: 'Best setup + catalyst alignment' },
    dividend: { title: 'Top 5 Income Picks',         icon: DollarSign, sub: 'Best yield + safety + growth' },
  };
  const meta = titleByStrategy[strategyId] || titleByStrategy.value;
  const Icon = meta.icon;

  return (
    <div className="bg-gradient-to-br from-amber-500/5 via-white/[0.03] to-emerald-500/5 border border-amber-400/20 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
        <Icon size={14} className="text-amber-300" />
        <h3 className="display text-sm text-white">{meta.title}</h3>
        <span className="text-[10px] text-stone-500 ml-2">{meta.sub}</span>
      </div>
      <div className="divide-y divide-white/5">
        {top5.map((p, i) => (
          <button
            key={`${p.ticker}-${i}`}
            onClick={() => onTickerClick && onTickerClick(p.ticker)}
            className="w-full px-5 py-3 hover:bg-white/[0.04] transition text-left flex items-center gap-3"
          >
            <div className="display text-amber-300/70 text-xl w-6 text-center">{i + 1}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="mono text-sm text-white font-medium">{p.ticker}</span>
                <span
                  className="text-[10px] uppercase px-1.5 py-0.5 rounded"
                  style={{ background: `${p.industryColor}25`, color: p.industryColor }}
                >
                  {p.industryShort}
                </span>
                <span className="text-[10px] text-white/85 uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: `${VERDICT_COLOR[p.verdict] || '#a3a3a3'}30`, color: VERDICT_COLOR[p.verdict] || '#a3a3a3' }}>
                  {p.verdict}
                </span>
              </div>
              <div className="text-xs text-stone-500 truncate mt-0.5">{p.company}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="display text-amber-300 text-2xl leading-none">{p.compositeScore}</div>
              <div className="text-[10px] text-stone-500 uppercase">Score</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SectorBreakdown({ strategyId, sectorAgg, onSectorClick }) {
  if (sectorAgg.length === 0) return null;
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10">
        <h3 className="display text-sm text-white">Sector Breakdown ({sectorAgg.length})</h3>
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
              <div className="text-[11px] text-stone-500 truncate">
                <SectorTagline strategyId={strategyId} sector={s} />
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs flex-shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] text-white/40 uppercase">Picks</div>
                <div className="mono text-white/85">{s.pickCount}</div>
              </div>
              {s.topPick && (
                <div className="text-right hidden md:block">
                  <div className="text-[10px] text-white/40 uppercase">Top Pick</div>
                  <div className="mono text-amber-200">{s.topPick.ticker} <span className="text-amber-300">{s.topPick.score}</span></div>
                </div>
              )}
              <div className="text-right">
                <div className="text-[10px] text-white/40 uppercase">Avg Score</div>
                <div className="display text-amber-300 text-lg leading-none">{s.avgCompositeScore ?? '—'}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SectorTagline({ strategyId, sector }) {
  if (strategyId === 'value') {
    return `${sector.deepValueCount || 0} deep value · ${sector.undervaluedCount || 0} undervalued · ${sector.insiderBuyingCount || 0} w/ insider buying`;
  }
  if (strategyId === 'daytrade' || strategyId === 'swing' || strategyId === 'dividend') {
    return `${sector.topVerdictCount || 0} strong · avg ${sector.avgCompositeScore ?? '—'} composite`;
  }
  return `${sector.pickCount} picks`;
}
