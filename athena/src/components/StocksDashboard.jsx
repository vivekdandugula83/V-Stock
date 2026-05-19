import { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Star, ExternalLink, Target,
  ArrowUp, ArrowDown, ArrowRight, Sparkles, Calendar,
} from 'lucide-react';
import { STRATEGIES } from '../lib/strategies.js';
import { findBucketKv } from '../lib/aggregate.js';
import { safeStr } from './SafeText.jsx';
import MiniChart from './MiniChart.jsx';
import SourceList from './SourceList.jsx';

// ============================================================
// RECOMMENDATION → visual style
// ============================================================
const REC_STYLES = {
  'Strong Buy':  { bg: 'bg-emerald-500/20', border: 'border-emerald-400/60', text: 'text-emerald-200', icon: ArrowUp,    label: 'STRONG BUY' },
  'Buy':         { bg: 'bg-emerald-500/12', border: 'border-emerald-400/40', text: 'text-emerald-300', icon: ArrowUp,    label: 'BUY' },
  'Hold':        { bg: 'bg-amber-500/12',   border: 'border-amber-400/40',   text: 'text-amber-300',   icon: ArrowRight, label: 'HOLD' },
  'Sell':        { bg: 'bg-rose-500/12',    border: 'border-rose-400/40',    text: 'text-rose-300',    icon: ArrowDown,  label: 'SELL' },
  'Strong Sell': { bg: 'bg-rose-500/20',    border: 'border-rose-400/60',    text: 'text-rose-200',    icon: ArrowDown,  label: 'STRONG SELL' },
};

function recStyle(rec) {
  return REC_STYLES[rec] || REC_STYLES.Hold;
}

function upsideClass(upside) {
  if (!upside) return 'text-stone-400';
  if (String(upside).startsWith('+')) return 'text-emerald-300';
  if (String(upside).startsWith('-')) return 'text-rose-300';
  return 'text-stone-300';
}

// Extract a single metric value from a pick, regardless of strategy.
function getMetric(pick, key) {
  if (!pick) return null;
  // Value strategy has hardcoded objects
  if (pick.valuation || pick.growth) {
    switch (key) {
      case 'pe':         return pick.valuation?.pe;
      case 'fwdPe':      return pick.valuation?.forwardPe;
      case 'revYoY':     return pick.growth?.revenueGrowthYoY;
      case 'epsYoY':     return pick.growth?.epsGrowthYoY;
      case 'rev5y':      return pick.growth?.revenue5yrCagr;
      case 'eps5y':      return pick.growth?.eps5yrCagr;
      case 'insider':    return pick.insiderActivity?.last6moDirection;
      case 'volume':     return pick.volume?.currentVsAvg;
      default: return null;
    }
  }
  // Non-value strategy — pull from buckets
  switch (key) {
    case 'pe':       return findBucketKv(pick, 'valuation', 'p/e');
    case 'fwdPe':    return findBucketKv(pick, 'valuation', 'forward');
    case 'revYoY':   return findBucketKv(pick, 'growth', 'revenue yoy') || findBucketKv(pick, 'momentum', 'five day');
    case 'epsYoY':   return findBucketKv(pick, 'growth', 'eps yoy');
    case 'rev5y':    return findBucketKv(pick, 'growth', 'cagr');
    case 'eps5y':    return findBucketKv(pick, 'growth', 'eps') || findBucketKv(pick, 'momentum', 'rsi');
    case 'insider':  return findBucketKv(pick, 'insider', 'direction') || findBucketKv(pick, 'volume', 'pattern');
    case 'volume':   return findBucketKv(pick, 'volume', 'vs avg');
    default: return null;
  }
}

function valueClass(val) {
  if (typeof val !== 'string') return 'text-white/85';
  if (val.toLowerCase().includes('net buying') || val.startsWith('+')) return 'text-emerald-300';
  if (val.toLowerCase().includes('net selling') || val.startsWith('-')) return 'text-rose-300';
  return 'text-white/85';
}

// ============================================================
// MAIN
// ============================================================

export default function StocksDashboard({
  strategyId,
  aggregate,
  onTickerClick,
  watchlist = [],
  onToggleWatch,
}) {
  const [sectorFilter, setSectorFilter] = useState('all');
  const allPicks = Array.isArray(aggregate?.allPicks) ? aggregate.allPicks : [];
  const sectorAgg = Array.isArray(aggregate?.sectorAgg) ? aggregate.sectorAgg : [];
  const cfg = STRATEGIES[strategyId] || {};

  // Sectors that have picks
  const availableSectors = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const p of allPicks) {
      if (!p.industryId || seen.has(p.industryId)) continue;
      seen.add(p.industryId);
      list.push({ id: p.industryId, label: p.industryShort, color: p.industryColor });
    }
    return list;
  }, [allPicks]);

  // Filter picks by sector
  const filtered = useMemo(() => {
    if (sectorFilter === 'all') return allPicks;
    return allPicks.filter((p) => p.industryId === sectorFilter);
  }, [allPicks, sectorFilter]);

  // Counts per recommendation
  const recCounts = useMemo(() => {
    const counts = { 'Strong Buy': 0, 'Buy': 0, 'Hold': 0, 'Sell': 0, 'Strong Sell': 0 };
    for (const p of filtered) {
      const r = p.recommendation || 'Hold';
      if (counts[r] != null) counts[r]++;
    }
    return counts;
  }, [filtered]);

  if (allPicks.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center text-stone-500">
        Stocks will appear here once {cfg.label || ''} scans complete.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="display text-xl text-white">{cfg.label || 'Stocks'} — Recommendations & Predictions</h2>
          <div className="text-xs text-stone-500 mt-0.5">
            10 stocks per sector · scored across 4 buckets · recommendation + 12mo target
          </div>
        </div>
        <div className="text-[11px] text-stone-500 mono">
          {filtered.length} picks shown · {cfg.horizonLabel || '12 months'} horizon
        </div>
      </div>

      {/* RECOMMENDATION SUMMARY STRIP */}
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(REC_STYLES).map(([rec, style]) => {
          const count = recCounts[rec] || 0;
          const Icon = style.icon;
          return (
            <div key={rec} className={`p-3 rounded-lg border ${style.bg} ${style.border}`}>
              <div className="flex items-center gap-1 mb-1">
                <Icon size={11} className={style.text} />
                <span className={`text-[10px] uppercase tracking-wider ${style.text} font-medium`}>{style.label}</span>
              </div>
              <div className={`text-2xl display ${style.text}`}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* SECTOR FILTER CHIPS */}
      <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-xl border border-stone-800 bg-stone-950/60">
        <span className="text-[10px] uppercase tracking-wider text-stone-500 mr-1 px-1">Sector:</span>
        <SectorChip
          label={`All (${allPicks.length})`}
          active={sectorFilter === 'all'}
          onClick={() => setSectorFilter('all')}
        />
        {availableSectors.map((s) => {
          const count = allPicks.filter((p) => p.industryId === s.id).length;
          return (
            <SectorChip
              key={s.id}
              label={`${s.label} (${count})`}
              color={s.color}
              active={sectorFilter === s.id}
              onClick={() => setSectorFilter(s.id)}
            />
          );
        })}
      </div>

      {/* STOCKS LIST — the main attraction */}
      <div className="space-y-3">
        {filtered.map((p, i) => (
          <StockRow
            key={`${p.ticker}-${i}`}
            rank={i + 1}
            pick={p}
            inWatch={watchlist.includes(p.ticker)}
            onTickerClick={onTickerClick}
            onToggleWatch={onToggleWatch}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-stone-500 text-sm">
            No picks in this sector. <button onClick={() => setSectorFilter('all')} className="underline hover:text-amber-300">View all sectors</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SectorChip({ label, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-md border transition ${
        active
          ? 'bg-amber-400/15 border-amber-400/40 text-amber-200'
          : 'bg-stone-900/40 border-stone-800 text-stone-400 hover:border-stone-700'
      }`}
      style={!active && color ? { borderColor: `${color}40` } : undefined}
    >
      {label}
    </button>
  );
}

// ============================================================
// STOCK ROW — the big clean per-pick display
// ============================================================
function StockRow({ rank, pick, inWatch, onTickerClick, onToggleWatch }) {
  const [expanded, setExpanded] = useState(false);
  const rec = recStyle(pick.recommendation || 'Hold');
  const RecIcon = rec.icon;
  const pred = pick.prediction;

  const metrics = [
    { k: 'P/E',       v: getMetric(pick, 'pe'),     fmt: (v) => v == null ? '—' : typeof v === 'number' ? v.toFixed(1) : v },
    { k: 'Fwd P/E',   v: getMetric(pick, 'fwdPe'),  fmt: (v) => v == null ? '—' : typeof v === 'number' ? v.toFixed(1) : v },
    { k: 'Rev YoY',   v: getMetric(pick, 'revYoY') },
    { k: 'EPS YoY',   v: getMetric(pick, 'epsYoY') },
    { k: '5y CAGR',   v: getMetric(pick, 'rev5y') },
    { k: 'Insider',   v: getMetric(pick, 'insider') },
    { k: 'Volume',    v: getMetric(pick, 'volume') },
  ];

  return (
    <div className={`rounded-xl border ${rec.border} ${rec.bg} overflow-hidden transition hover:border-white/30`}>
      {/* Top row — the headline */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4 flex-wrap">
          {/* Left: rank + ticker + company */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="display text-3xl text-white/30 w-10 text-center flex-shrink-0">{rank}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <button
                  onClick={() => onTickerClick && onTickerClick(pick.ticker)}
                  className="mono text-2xl text-white font-medium hover:text-amber-300 transition"
                >
                  {pick.ticker}
                </button>
                {pick.industryShort && (
                  <span
                    className="text-[10px] uppercase px-1.5 py-0.5 rounded"
                    style={{ background: `${pick.industryColor}25`, color: pick.industryColor }}
                  >
                    {pick.industryShort}
                  </span>
                )}
                {pick.marketCap && (
                  <span className="text-[10px] text-white/45 mono">{pick.marketCap}</span>
                )}
              </div>
              <div className="text-sm text-white/65 truncate">{safeStr(pick.company)}</div>
            </div>
          </div>

          {/* Recommendation badge — BIG, prominent */}
          <div className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl border-2 ${rec.border} ${rec.bg} flex-shrink-0`}>
            <div className={`flex items-center gap-1.5 ${rec.text}`}>
              <RecIcon size={14} />
              <span className="display text-base font-medium tracking-wide">{rec.label}</span>
            </div>
            <div className={`text-[9px] mono ${rec.text} opacity-70 mt-0.5`}>{pick.verdict}</div>
          </div>

          {/* Composite score */}
          <div className="flex-shrink-0 text-center">
            <div className={`display text-3xl leading-none ${rec.text}`}>{pick.compositeScore}</div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wider">Composite</div>
          </div>

          {/* Price + prediction */}
          <div className="text-right flex-shrink-0 min-w-[120px]">
            <div className="flex items-baseline gap-2 justify-end">
              <span className="text-[10px] text-stone-500 uppercase">Now</span>
              <span className="mono text-base text-white">{pick.currentPrice != null ? `$${pick.currentPrice}` : '—'}</span>
            </div>
            {pred?.target12mo && (
              <div className="flex items-baseline gap-2 justify-end mt-0.5">
                <span className="text-[10px] text-stone-500 uppercase">Target</span>
                <span className="mono text-base text-amber-300">{pred.target12mo}</span>
              </div>
            )}
            {pred?.upsidePct && (
              <div className={`text-xs mt-1 font-medium ${upsideClass(pred.upsidePct)}`}>
                {pred.upsidePct} <span className="text-stone-500 text-[10px] uppercase mono">{pred.horizon}</span>
              </div>
            )}
          </div>

          {/* Watchlist */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleWatch && onToggleWatch(pick.ticker); }}
            className={`text-base px-2 py-1 rounded border transition flex-shrink-0 ${
              inWatch
                ? 'bg-amber-400/20 border-amber-400/40 text-amber-200'
                : 'border-white/15 text-white/40 hover:border-white/30 hover:text-white/70'
            }`}
          >
            {inWatch ? '★' : '☆'}
          </button>
        </div>

        {/* Metric strip — the exact metrics you asked for */}
        <div className="mt-4 p-3 bg-black/30 rounded-lg border border-white/5">
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-3 text-center">
            {metrics.map((m, i) => (
              <div key={i}>
                <div className="text-[9px] uppercase tracking-wider text-stone-500">{m.k}</div>
                <div className={`text-xs mono mt-0.5 truncate ${valueClass(m.v)}`}>
                  {m.fmt ? m.fmt(m.v) : (m.v == null || m.v === '' ? '—' : String(m.v))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price chart + prediction rationale */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1 flex items-center justify-center bg-black/20 rounded-lg p-2">
            <MiniChart prices={pick.priceHistory} width={180} height={40} />
          </div>
          {(pred?.rationale || pick.recommendationReason) && (
            <div className="sm:col-span-2 p-2.5 bg-amber-400/[0.06] border border-amber-400/20 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <Sparkles size={10} className="text-amber-300/80" />
                <span className="text-[9px] uppercase tracking-wider text-amber-300/80">Recommendation Reasoning</span>
                {pred?.confidence && (
                  <span className={`ml-auto text-[9px] mono px-1.5 py-0.5 rounded ${
                    pred.confidence === 'High' ? 'bg-emerald-500/15 text-emerald-300' :
                    pred.confidence === 'Low' ? 'bg-rose-500/15 text-rose-300' :
                    'bg-amber-500/15 text-amber-300'
                  }`}>
                    {pred.confidence} confidence
                  </span>
                )}
              </div>
              <div className="text-xs text-white/85 leading-snug">
                {safeStr(pick.recommendationReason) || safeStr(pred?.rationale)}
              </div>
            </div>
          )}
        </div>

        {/* Sources strip — always visible */}
        {Array.isArray(pick.sources) && pick.sources.length > 0 && (
          <div className="mt-3">
            <SourceList sources={pick.sources} compact label="Sources" />
          </div>
        )}

        {/* Expand for thesis + risks */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-[11px] text-white/50 hover:text-amber-300 transition flex items-center gap-1"
        >
          {expanded ? '− Hide' : '+ Show'} full thesis & risks · <span className="text-amber-300/60">click ticker for full deep-dive</span>
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
            {pick.thesis && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">Thesis</div>
                <p className="text-sm text-white/85 leading-relaxed">{safeStr(pick.thesis)}</p>
              </div>
            )}
            {Array.isArray(pick.risks) && pick.risks.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-rose-300/80 mb-1">Risks</div>
                <ul className="space-y-1">
                  {pick.risks.slice(0, 3).map((r, i) => (
                    <li key={i} className="text-sm text-white/75 flex items-start gap-2">
                      <span className="text-rose-400/70 mt-1">•</span>
                      <span>{safeStr(r)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {pred?.targetLow && pred?.targetHigh && (
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded bg-rose-500/8 border border-rose-400/20">
                  <div className="text-[10px] uppercase text-rose-300/80">Bear Target</div>
                  <div className="mono text-rose-300">{pred.targetLow}</div>
                </div>
                <div className="p-2 rounded bg-amber-500/8 border border-amber-400/20">
                  <div className="text-[10px] uppercase text-amber-300/80">Base Target</div>
                  <div className="mono text-amber-300">{pred.target12mo}</div>
                </div>
                <div className="p-2 rounded bg-emerald-500/8 border border-emerald-400/20">
                  <div className="text-[10px] uppercase text-emerald-300/80">Bull Target</div>
                  <div className="mono text-emerald-300">{pred.targetHigh}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
