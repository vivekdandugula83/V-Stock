// Finviz-style heatmap — boxes sized by market-cap proxy (volume × price), colored by % change
import { useMemo } from 'react';

function parsePct(str) {
  if (typeof str !== 'string') return 0;
  const m = str.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

function parseSizeProxy(m) {
  // Use abs daily change as a "heat" weight if no marketCap, else parse marketCap
  const cap = String(m?.marketCap || '');
  const mb = cap.match(/(\d+(\.\d+)?)\s*B/i);
  const mt = cap.match(/(\d+(\.\d+)?)\s*T/i);
  if (mt) return parseFloat(mt[1]) * 1000;
  if (mb) return parseFloat(mb[1]);
  // fallback: use price × 1
  return Math.max(1, (m?.currentPrice || 1) / 10);
}

function colorFor(pct) {
  if (pct >= 5) return 'bg-emerald-500/85 border-emerald-300/40';
  if (pct >= 2) return 'bg-emerald-500/55 border-emerald-300/30';
  if (pct >= 0.5) return 'bg-emerald-500/30 border-emerald-300/20';
  if (pct > -0.5) return 'bg-stone-500/30 border-stone-400/20';
  if (pct > -2) return 'bg-rose-500/30 border-rose-300/20';
  if (pct > -5) return 'bg-rose-500/55 border-rose-300/30';
  return 'bg-rose-500/85 border-rose-300/40';
}

export default function MarketHeatmap({ data, onTickerClick }) {
  const movers = Array.isArray(data?.movers) ? data.movers : [];

  const buckets = useMemo(() => {
    const bySector = {};
    for (const m of movers) {
      const s = m?.sector || 'Other';
      if (!bySector[s]) bySector[s] = [];
      bySector[s].push({
        ...m,
        _pct: parsePct(m?.dailyChangePct),
        _size: parseSizeProxy(m),
      });
    }
    return Object.entries(bySector).map(([sector, items]) => ({
      sector,
      items: items.sort((a, b) => b._size - a._size).slice(0, 10),
      avgPct: items.reduce((s, x) => s + x._pct, 0) / items.length,
    })).sort((a, b) => b.items.length - a.items.length);
  }, [movers]);

  if (movers.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden slide-up">
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between gap-3">
          <h3 className="display text-base text-white">Market Heatmap</h3>
          <div className="flex items-center gap-2 text-[10px] text-white/50">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-rose-500/80 rounded-sm" /> Down</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-stone-500/50 rounded-sm" /> Flat</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500/80 rounded-sm" /> Up</span>
          </div>
        </div>
      </div>

      <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {buckets.map((b) => (
          <div key={b.sector} className="bg-white/[0.02] border border-white/10 rounded-lg p-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] text-white/70 uppercase tracking-wider">{b.sector}</span>
              <span className={`text-[10px] mono ${b.avgPct > 0 ? 'text-emerald-300' : b.avgPct < 0 ? 'text-rose-300' : 'text-white/50'}`}>
                {b.avgPct >= 0 ? '+' : ''}{b.avgPct.toFixed(1)}%
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
              {b.items.map((m, i) => {
                const cls = colorFor(m._pct);
                return (
                  <button
                    key={`${m.ticker}-${i}`}
                    onClick={() => onTickerClick && onTickerClick(m.ticker)}
                    className={`aspect-square rounded border ${cls} flex flex-col items-center justify-center p-1 hover:scale-105 hover:z-10 transition`}
                    title={`${m.ticker} ${m.dailyChangePct} — ${m.company}`}
                  >
                    <div className="mono text-[10px] sm:text-[11px] text-white font-bold leading-none truncate w-full text-center">
                      {m.ticker}
                    </div>
                    <div className="mono text-[9px] text-white/95 leading-none mt-1">
                      {m._pct > 0 ? '+' : ''}{m._pct.toFixed(1)}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
