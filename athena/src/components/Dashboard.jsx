import { useState } from 'react';
import { TrendingUp, Activity, Zap, DollarSign, BarChart3, ArrowUp, ArrowDown, ArrowUpDown, ExternalLink } from 'lucide-react';
import StatTile from './StatTile.jsx';
import MiniChart from './MiniChart.jsx';
import EarningsCalendar from './EarningsCalendar.jsx';
import { CATEGORIES } from '../lib/strategies.js';
import { safeStr } from './SafeText.jsx';

const ICON_MAP = { TrendingUp, Activity, Zap, DollarSign };

const RECOMMENDATION_COLOR = {
  'STRONG BUY': '#34d399',
  'BUY':        '#22d3ee',
  'HOLD':       '#fbbf24',
  'AVOID':      '#f87171',
};

const RECOMMENDATION_BADGE = {
  'STRONG BUY': 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  'BUY':        'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
  'HOLD':       'bg-amber-500/15 text-amber-200 border-amber-400/30',
  'AVOID':      'bg-rose-500/15 text-rose-200 border-rose-400/30',
};

export default function Dashboard({ categoryId, picks = [], onTickerClick, watchlist, onToggleWatch }) {
  const cat = CATEGORIES[categoryId] || CATEGORIES.longterm;
  const Icon = ICON_MAP[cat.icon] || TrendingUp;

  if (picks.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center text-stone-500">
        Dashboard appears once {cat.label} scan completes.
      </div>
    );
  }

  const stats = computeStats(categoryId, picks);
  const recDist = computeRecommendationDist(picks);
  const sectorDist = computeSectorDist(picks);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${cat.color}25` }}>
            <Icon size={18} style={{ color: cat.color }} />
          </div>
          <div>
            <h2 className="display text-xl text-white">{cat.label} Dashboard</h2>
            <div className="text-xs text-stone-500">{cat.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-1 rounded bg-stone-800/60 text-stone-300 mono">{cat.horizon}</span>
          <span className="px-2 py-1 rounded bg-stone-800/60 text-stone-300">
            Avg score <span className="mono text-amber-300">{stats.avgScore ?? '—'}</span>
          </span>
        </div>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile label="Total Picks" value={stats.total} sub={`${stats.sectors} sectors`} />
        <StatTile label="Strong Buy" value={stats.strongBuyCount} sub="composite ≥ 80" accent="#34d399" />
        <StatTile label="Buy" value={stats.buyCount} sub="65-79" accent="#22d3ee" />
        <StatTile label="Avg P/E" value={stats.avgPe ?? '—'} sub={`fwd ${stats.avgFwdPe ?? '—'}`} />
        <StatTile label="Avg Rev YoY" value={stats.avgRevGrowth != null ? `${stats.avgRevGrowth}%` : '—'} accent="#34d399" sub={`EPS ${stats.avgEpsGrowth != null ? stats.avgEpsGrowth + '%' : '—'}`} />
        <StatTile label="Insider Buys" value={stats.insiderBuyCount} sub={`of ${stats.total}`} accent="#a78bfa" />
      </div>

      {/* Recommendation distribution */}
      <RecommendationBar dist={recDist} total={picks.length} />

      {/* Sector exposure */}
      <SectorExposure sectorDist={sectorDist} total={picks.length} onTickerClick={onTickerClick} picks={picks} />

      {/* Earnings calendar — only useful for non-dividend */}
      {categoryId !== 'dividend' && <EarningsCalendar picks={picks} onTickerClick={onTickerClick} />}

      {/* Full sortable table */}
      <StocksListTable picks={picks} categoryId={categoryId} onTickerClick={onTickerClick} watchlist={watchlist} onToggleWatch={onToggleWatch} />
    </div>
  );
}

function computeStats(categoryId, picks) {
  const recCount = (rec) => picks.filter((p) => p.recommendation === rec).length;
  const num = (v) => {
    if (typeof v === 'number') return v;
    if (typeof v !== 'string') return NaN;
    const m = v.match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : NaN;
  };
  const avg = (arr) => {
    const nums = arr.filter((n) => Number.isFinite(n));
    if (nums.length === 0) return null;
    return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;
  };
  return {
    total: picks.length,
    sectors: new Set(picks.map((p) => p.sector).filter(Boolean)).size,
    avgScore: avg(picks.map((p) => p.compositeScore)),
    strongBuyCount: recCount('STRONG BUY'),
    buyCount: recCount('BUY'),
    avgPe: avg(picks.map((p) => Number(p?.valuation?.pe)).filter(Number.isFinite)),
    avgFwdPe: avg(picks.map((p) => Number(p?.valuation?.forwardPe)).filter(Number.isFinite)),
    avgRevGrowth: avg(picks.map((p) => num(p?.growth?.revenueGrowthYoY))),
    avgEpsGrowth: avg(picks.map((p) => num(p?.growth?.epsGrowthYoY))),
    insiderBuyCount: picks.filter((p) => String(p?.insider?.last6moDirection || '').toLowerCase().includes('net buying')).length,
  };
}

function computeRecommendationDist(picks) {
  const out = { 'STRONG BUY': 0, 'BUY': 0, 'HOLD': 0, 'AVOID': 0 };
  for (const p of picks) {
    const k = p.recommendation || 'HOLD';
    if (k in out) out[k]++;
  }
  return out;
}

function computeSectorDist(picks) {
  const out = {};
  for (const p of picks) {
    const k = p.sector || 'Other';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function RecommendationBar({ dist, total }) {
  if (!total) return null;
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={14} className="text-white/60" />
        <h3 className="display text-sm text-white">Recommendation Distribution</h3>
      </div>
      <div className="flex h-10 rounded-lg overflow-hidden">
        {Object.entries(dist).map(([rec, count]) => {
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div key={rec} className="flex flex-col items-center justify-center text-[11px] font-medium"
                 style={{ background: RECOMMENDATION_COLOR[rec], width: `${pct}%`, color: '#0a0a14' }}>
              <span>{count}</span>
              {pct > 15 && <span className="text-[9px]">{rec}</span>}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[11px] flex-wrap">
        {Object.entries(dist).map(([rec, count]) => (
          <span key={rec} className="flex items-center gap-1.5 text-white/60">
            <span className="w-3 h-3 rounded-sm" style={{ background: RECOMMENDATION_COLOR[rec] }} />
            {rec} <span className="mono text-white/85">{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SectorExposure({ sectorDist, total, picks, onTickerClick }) {
  if (Object.keys(sectorDist).length === 0) return null;
  const sorted = Object.entries(sectorDist).sort(([, a], [, b]) => b - a);
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10">
        <h3 className="display text-sm text-white">Sector Exposure</h3>
      </div>
      <div className="divide-y divide-white/5">
        {sorted.map(([sector, count]) => {
          const sectorPicks = picks.filter((p) => p.sector === sector);
          const avg = sectorPicks.reduce((s, p) => s + (p.compositeScore || 0), 0) / sectorPicks.length;
          return (
            <div key={sector} className="px-5 py-3 flex items-center gap-3">
              <div className="text-sm text-white font-medium w-32 truncate">{sector}</div>
              <div className="flex-1 h-2 bg-stone-900 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${(count / total) * 100}%` }} />
              </div>
              <span className="text-xs text-stone-400 mono w-12 text-right">{count}/{total}</span>
              <span className="text-xs text-amber-300 mono w-10 text-right">{Math.round(avg)}</span>
              <div className="flex gap-1 flex-wrap max-w-[200px] justify-end">
                {sectorPicks.slice(0, 4).map((p, i) => (
                  <button key={i} onClick={() => onTickerClick && onTickerClick(p.ticker)}
                    className="text-[10px] mono px-1.5 py-0.5 rounded bg-stone-800/60 hover:bg-amber-500/15 hover:text-amber-200 text-stone-300 transition">
                    {p.ticker}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// STOCKS LIST TABLE — sortable
// ============================================================

function StocksListTable({ picks, categoryId, onTickerClick, watchlist = [], onToggleWatch }) {
  const [sortCol, setSortCol] = useState('composite');
  const [sortDir, setSortDir] = useState('desc');

  const num = (v) => {
    if (typeof v === 'number') return v;
    if (typeof v !== 'string') return null;
    const m = v.match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  };

  const getters = {
    composite: (p) => p.compositeScore || 0,
    pe:        (p) => p.valuation?.pe ?? Number.MAX_VALUE,
    fwd_pe:    (p) => p.valuation?.forwardPe ?? Number.MAX_VALUE,
    rev_yoy:   (p) => num(p.growth?.revenueGrowthYoY) ?? -Infinity,
    rev_cagr:  (p) => num(p.growth?.revenue5yrCagr) ?? -Infinity,
    eps_yoy:   (p) => num(p.growth?.epsGrowthYoY) ?? -Infinity,
    eps_cagr:  (p) => num(p.growth?.eps5yrCagr) ?? -Infinity,
    insider:   (p) => p.insider?.score || 0,
    volume:    (p) => p.volume?.score || 0,
  };

  const sorted = [...picks].sort((a, b) => {
    const aVal = getters[sortCol] ? getters[sortCol](a) : 0;
    const bVal = getters[sortCol] ? getters[sortCol](b) : 0;
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir(col === 'pe' || col === 'fwd_pe' ? 'asc' : 'desc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ArrowUpDown size={9} className="text-stone-600" />;
    return sortDir === 'asc' ? <ArrowUp size={9} className="text-amber-300" /> : <ArrowDown size={9} className="text-amber-300" />;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
        <h3 className="display text-sm text-white">Sortable Index — All 10 Picks</h3>
        <div className="text-[10px] text-stone-500">Click headers to sort · Click ticker for deep-dive</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <Th label="#" />
              <Th label="Ticker" />
              <Th label="Sector" />
              <Th label="Recommend" />
              <Th label="Composite" onClick={() => toggleSort('composite')} sortIcon={<SortIcon col="composite" />} right />
              <Th label="P/E" onClick={() => toggleSort('pe')} sortIcon={<SortIcon col="pe" />} right />
              <Th label="Fwd P/E" onClick={() => toggleSort('fwd_pe')} sortIcon={<SortIcon col="fwd_pe" />} right />
              <Th label="Rev YoY" onClick={() => toggleSort('rev_yoy')} sortIcon={<SortIcon col="rev_yoy" />} right />
              <Th label="Rev 5y CAGR" onClick={() => toggleSort('rev_cagr')} sortIcon={<SortIcon col="rev_cagr" />} right />
              <Th label="EPS YoY" onClick={() => toggleSort('eps_yoy')} sortIcon={<SortIcon col="eps_yoy" />} right />
              <Th label="EPS 5y CAGR" onClick={() => toggleSort('eps_cagr')} sortIcon={<SortIcon col="eps_cagr" />} right />
              <Th label="Insider" onClick={() => toggleSort('insider')} sortIcon={<SortIcon col="insider" />} right />
              <Th label="Volume" onClick={() => toggleSort('volume')} sortIcon={<SortIcon col="volume" />} right />
              <Th label="Target" right />
              <Th label="" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const recCls = RECOMMENDATION_BADGE[p.recommendation] || RECOMMENDATION_BADGE.HOLD;
              const inWatch = watchlist.includes(p.ticker);
              const insiderEmoji = (() => {
                const s = String(p?.insider?.last6moDirection || '').toLowerCase();
                if (s.includes('net buying')) return '🟢';
                if (s.includes('net selling')) return '🔴';
                if (s.includes('mixed')) return '🟡';
                return '⚪';
              })();
              return (
                <tr key={`${p.ticker}-${i}`} className="border-b border-white/5 hover:bg-white/[0.03] transition cursor-pointer"
                    onClick={() => onTickerClick && onTickerClick(p.ticker)}>
                  <td className="px-2 py-2 text-stone-500 mono">{i + 1}</td>
                  <td className="px-2 py-2 mono font-medium text-white">
                    <div className="flex items-center gap-1.5">{p.ticker}<ExternalLink size={9} className="text-stone-600" /></div>
                    <div className="text-[10px] text-stone-500 font-normal truncate max-w-[120px]">{safeStr(p.company)}</div>
                  </td>
                  <td className="px-2 py-2">
                    {p.sector && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-stone-800/60 text-stone-300">{p.sector}</span>}
                  </td>
                  <td className="px-2 py-2">
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-bold ${recCls}`}>
                      {p.recommendation}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right"><span className="mono text-amber-300 font-medium">{p.compositeScore}</span></td>
                  <td className="px-2 py-2 text-right mono text-stone-200">{p.valuation?.pe ?? '—'}</td>
                  <td className="px-2 py-2 text-right mono text-stone-200">{p.valuation?.forwardPe ?? '—'}</td>
                  <td className="px-2 py-2 text-right mono text-emerald-300">{p.growth?.revenueGrowthYoY || '—'}</td>
                  <td className="px-2 py-2 text-right mono text-stone-200">{p.growth?.revenue5yrCagr || '—'}</td>
                  <td className="px-2 py-2 text-right mono text-emerald-300">{p.growth?.epsGrowthYoY || '—'}</td>
                  <td className="px-2 py-2 text-right mono text-stone-200">{p.growth?.eps5yrCagr || '—'}</td>
                  <td className="px-2 py-2 text-right">
                    <span className="mono text-stone-200">{insiderEmoji} {p.insider?.score || 0}</span>
                  </td>
                  <td className="px-2 py-2 text-right mono text-violet-300">{p.volume?.score || 0}</td>
                  <td className="px-2 py-2 text-right mono text-amber-200 text-[11px]">{p.prediction?.target || '—'}</td>
                  <td className="px-2 py-2">
                    <button onClick={(e) => { e.stopPropagation(); onToggleWatch && onToggleWatch(p.ticker); }}
                      className={`px-1.5 py-0.5 rounded transition ${inWatch ? 'text-amber-300' : 'text-stone-600 hover:text-amber-300'}`}>
                      {inWatch ? '★' : '☆'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ label, onClick, sortIcon, right }) {
  return (
    <th onClick={onClick}
        className={`px-2 py-2 text-[10px] uppercase tracking-wider font-medium text-stone-400 ${
          onClick ? 'cursor-pointer hover:text-amber-300' : ''
        } ${right ? 'text-right' : 'text-left'}`}>
      <span className="inline-flex items-center gap-1">{label}{sortIcon}</span>
    </th>
  );
}
