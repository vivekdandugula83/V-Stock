import { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Star, ExternalLink } from 'lucide-react';
import MiniChart from './MiniChart.jsx';
import { findBucketKv } from '../lib/aggregate.js';

const VERDICT_BADGE = {
  'Deep Value':    'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  'Undervalued':   'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
  'Fair Value':    'bg-amber-500/15 text-amber-200 border-amber-400/30',
  'Overvalued':    'bg-rose-500/15 text-rose-200 border-rose-400/30',
  'Strong Setup':  'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  'Prime Setup':   'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  'Setup':         'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
  'Solid Setup':   'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
  'Watch':         'bg-amber-500/15 text-amber-200 border-amber-400/30',
  'Avoid':         'bg-rose-500/15 text-rose-200 border-rose-400/30',
  'Income Anchor': 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  'Stable Yield':  'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
  'Yield Trap':    'bg-rose-500/15 text-rose-200 border-rose-400/30',
};

// Column schemas per strategy
const COLUMNS = {
  value: [
    { id: 'pe',          label: 'P/E',     get: (p) => p?.valuation?.pe,                  fmt: numFmt, sort: 'asc' },
    { id: 'fwd_pe',      label: 'Fwd P/E', get: (p) => p?.valuation?.forwardPe,           fmt: numFmt, sort: 'asc' },
    { id: 'rev_growth',  label: 'Rev YoY', get: (p) => p?.growth?.revenueGrowthYoY,       fmt: strFmt, sort: 'pct-desc' },
    { id: 'eps_growth',  label: 'EPS YoY', get: (p) => p?.growth?.epsGrowthYoY,           fmt: strFmt, sort: 'pct-desc' },
    { id: 'piotroski',   label: 'Piotr.',  get: (p) => p?.growth?.piotroskiScore,         fmt: strFmt, sort: 'int-desc' },
    { id: 'insider',     label: 'Insider', get: (p) => p?.insiderActivity?.last6moDirection, fmt: insiderFmt, sort: 'insider' },
  ],
  daytrade: [
    { id: 'rsi',         label: 'RSI',      get: (p) => findBucketKv(p, 'momentum', 'rsi'),              fmt: strFmt, sort: 'num-desc' },
    { id: '5d_return',   label: '5d %',     get: (p) => findBucketKv(p, 'momentum', 'five day'),         fmt: strFmt, sort: 'pct-desc' },
    { id: 'vol_vs_avg',  label: 'Vol/Avg',  get: (p) => findBucketKv(p, 'volume', 'vs avg'),             fmt: strFmt, sort: 'num-desc' },
    { id: 'iv_rank',     label: 'IV Rank',  get: (p) => findBucketKv(p, 'volatility', 'iv rank'),        fmt: strFmt, sort: 'num-desc' },
    { id: 'days_to_evt', label: 'Days→Evt', get: (p) => findBucketKv(p, 'catalyst', 'days'),             fmt: strFmt, sort: 'int-asc' },
    { id: 'rr',          label: 'R/R',      get: (p) => p?.tradePlan?.rrRatio,                           fmt: strFmt, sort: 'rr-desc' },
  ],
  swing: [
    { id: 'pattern',     label: 'Pattern',   get: (p) => findBucketKv(p, 'setup', 'pattern'),             fmt: strFmt, sort: 'str' },
    { id: 'trend',       label: 'Trend',     get: (p) => findBucketKv(p, 'setup', 'trend'),               fmt: strFmt, sort: 'str' },
    { id: 'days_to_evt', label: 'Days→Evt',  get: (p) => findBucketKv(p, 'catalyst', 'days'),             fmt: strFmt, sort: 'int-asc' },
    { id: 'analyst',     label: 'Analyst',   get: (p) => findBucketKv(p, 'catalyst', 'analyst'),          fmt: strFmt, sort: 'str' },
    { id: 'rr',          label: 'R/R',       get: (p) => p?.tradePlan?.rrRatio,                           fmt: strFmt, sort: 'rr-desc' },
    { id: 'entry',       label: 'Entry',     get: (p) => p?.tradePlan?.entry,                             fmt: strFmt, sort: 'str' },
  ],
  dividend: [
    { id: 'yield',        label: 'Yield',     get: (p) => findBucketKv(p, 'yieldQuality', 'current yield'),    fmt: strFmt, sort: 'pct-desc' },
    { id: 'div_cagr',     label: '5y CAGR',   get: (p) => findBucketKv(p, 'dividendGrowth', 'five yr'),        fmt: strFmt, sort: 'pct-desc' },
    { id: 'years_raised', label: 'Yrs Rais.', get: (p) => findBucketKv(p, 'dividendGrowth', 'consecutive'),    fmt: strFmt, sort: 'int-desc' },
    { id: 'payout',       label: 'Payout',    get: (p) => findBucketKv(p, 'payoutSafety', 'payout ratio'),     fmt: strFmt, sort: 'pct-asc' },
    { id: 'fcf_cov',      label: 'FCF Cov',   get: (p) => findBucketKv(p, 'payoutSafety', 'fcf coverage'),     fmt: strFmt, sort: 'num-desc' },
    { id: 'status',       label: 'Status',    get: (p) => findBucketKv(p, 'dividendGrowth', 'aristocrat'),     fmt: strFmt, sort: 'str' },
  ],
};

function numFmt(v) { return v == null ? '—' : (typeof v === 'number' ? v.toFixed(v >= 100 ? 0 : 1) : String(v)); }
function strFmt(v) { return v == null || v === '' ? '—' : String(v); }
function insiderFmt(v) {
  if (!v) return '—';
  const s = String(v);
  if (s.toLowerCase().includes('net buying')) return '🟢 Buy';
  if (s.toLowerCase().includes('net selling')) return '🔴 Sell';
  if (s.toLowerCase().includes('mixed')) return '🟡 Mixed';
  return s.slice(0, 14);
}

function sortValueFor(get, sortType, pick) {
  const v = get(pick);
  if (v == null) return sortType.includes('asc') ? Number.MAX_VALUE : -Number.MAX_VALUE;
  const s = String(v);
  if (sortType === 'asc' || sortType === 'desc' || sortType === 'num-desc' || sortType === 'num-asc') {
    if (typeof v === 'number') return v;
    const m = s.match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : (sortType.includes('asc') ? Number.MAX_VALUE : -Number.MAX_VALUE);
  }
  if (sortType === 'pct-desc' || sortType === 'pct-asc') {
    const m = s.match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : (sortType.includes('asc') ? Number.MAX_VALUE : -Number.MAX_VALUE);
  }
  if (sortType === 'int-desc' || sortType === 'int-asc') {
    const m = s.match(/-?\d+/);
    return m ? parseInt(m[0], 10) : (sortType.includes('asc') ? Number.MAX_VALUE : -Number.MAX_VALUE);
  }
  if (sortType === 'rr-desc') {
    const m = s.match(/1\s*:\s*(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : -Number.MAX_VALUE;
  }
  if (sortType === 'insider') {
    if (s.toLowerCase().includes('net buying')) return 3;
    if (s.toLowerCase().includes('mixed')) return 2;
    if (s.toLowerCase().includes('no activity')) return 1;
    if (s.toLowerCase().includes('net selling')) return 0;
    return 1;
  }
  return s.toLowerCase();
}

export default function StocksListTable({ strategyId, picks = [], onTickerClick, watchlist = [], onToggleWatch }) {
  const [sortCol, setSortCol] = useState('composite');
  const [sortDir, setSortDir] = useState('desc');

  const columns = COLUMNS[strategyId] || COLUMNS.value;
  const safe = Array.isArray(picks) ? picks : [];

  // Build sort comparator
  const sorted = [...safe].sort((a, b) => {
    if (sortCol === 'composite') {
      const av = a.compositeScore || 0;
      const bv = b.compositeScore || 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    if (sortCol === 'ticker') {
      return sortDir === 'asc'
        ? String(a.ticker).localeCompare(String(b.ticker))
        : String(b.ticker).localeCompare(String(a.ticker));
    }
    if (sortCol === 'sector') {
      return sortDir === 'asc'
        ? String(a.industryShort || '').localeCompare(String(b.industryShort || ''))
        : String(b.industryShort || '').localeCompare(String(a.industryShort || ''));
    }
    const col = columns.find((c) => c.id === sortCol);
    if (!col) return 0;
    const av = sortValueFor(col.get, col.sort, a);
    const bv = sortValueFor(col.get, col.sort, b);
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  if (safe.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-stone-500 text-sm">No picks loaded yet.</div>
      </div>
    );
  }

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ArrowUpDown size={9} className="text-stone-600" />;
    return sortDir === 'asc'
      ? <ArrowUp size={9} className="text-amber-300" />
      : <ArrowDown size={9} className="text-amber-300" />;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
        <h3 className="display text-sm text-white">All Picks — Sortable Index ({safe.length})</h3>
        <div className="text-[10px] text-stone-500">Click any column header to sort · Click ticker for deep-dive</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <Th label="#" />
              <Th label="Ticker" onClick={() => toggleSort('ticker')} sortIcon={<SortIcon col="ticker" />} />
              <Th label="Sector" onClick={() => toggleSort('sector')} sortIcon={<SortIcon col="sector" />} />
              <Th label="Composite ↓" onClick={() => toggleSort('composite')} sortIcon={<SortIcon col="composite" />} right />
              <Th label="Verdict" />
              <Th label="Chart" />
              {columns.map((c) => (
                <Th key={c.id} label={c.label} onClick={() => toggleSort(c.id)} sortIcon={<SortIcon col={c.id} />} right />
              ))}
              <Th label="" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const verdictCls = VERDICT_BADGE[p.verdict] || VERDICT_BADGE['Watch'];
              const inWatch = watchlist.includes(p.ticker);
              return (
                <tr
                  key={`${p.ticker}-${i}`}
                  className="border-b border-white/5 hover:bg-white/[0.03] transition cursor-pointer"
                  onClick={() => onTickerClick && onTickerClick(p.ticker)}
                >
                  <td className="px-2 py-2 text-stone-500 mono text-[10px]">{i + 1}</td>
                  <td className="px-2 py-2 mono font-medium text-white whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {p.ticker}
                      <ExternalLink size={9} className="text-stone-600" />
                    </div>
                    <div className="text-[10px] text-stone-500 font-normal truncate max-w-[140px]">{p.company}</div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {p.industryShort && (
                      <span
                        className="text-[10px] uppercase px-1.5 py-0.5 rounded"
                        style={{ background: `${p.industryColor}25`, color: p.industryColor }}
                      >
                        {p.industryShort}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <span className="mono text-amber-300 font-medium">{p.compositeScore}</span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${verdictCls}`}>
                      {p.verdict}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <MiniChart prices={p.priceHistory} width={60} height={20} />
                  </td>
                  {columns.map((c) => (
                    <td key={c.id} className="px-2 py-2 text-right mono text-stone-200 text-[11px] whitespace-nowrap">
                      {c.fmt(c.get(p))}
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleWatch && onToggleWatch(p.ticker); }}
                      className={`text-[12px] px-1.5 py-0.5 rounded transition ${
                        inWatch ? 'text-amber-300' : 'text-stone-600 hover:text-amber-300'
                      }`}
                    >
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
    <th
      onClick={onClick}
      className={`px-2 py-2 text-[10px] uppercase tracking-wider font-medium text-stone-400 ${
        onClick ? 'cursor-pointer hover:text-amber-300' : ''
      } ${right ? 'text-right' : 'text-left'}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortIcon}
      </span>
    </th>
  );
}
