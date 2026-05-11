import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, Flame, Volume2, Newspaper, Search } from 'lucide-react';
import MiniChart from './MiniChart.jsx';

const MOVE_TYPES = [
  { id: 'all', label: 'All', icon: Activity },
  { id: 'Gainer', label: 'Gainers', icon: TrendingUp },
  { id: 'Loser', label: 'Losers', icon: TrendingDown },
  { id: 'UnusualVol', label: 'Volume', icon: Volume2 },
  { id: 'NewsCatalyst', label: 'News', icon: Newspaper },
  { id: 'EarningsBeat', label: 'Earnings', icon: Flame },
];

function parsePct(str) {
  if (typeof str !== 'string') return 0;
  const m = str.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

export default function DailyMovers({ data, onTickerClick, watchlist = [], onToggleWatch }) {
  const movers = Array.isArray(data?.movers) ? data.movers : [];
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('rank'); // rank, gain, vol, score

  const filtered = useMemo(() => {
    let list = movers;
    if (filter !== 'all') {
      list = list.filter((m) => {
        const t = String(m?.moveType || '');
        if (filter === 'Gainer') return parsePct(m?.dailyChangePct) > 0 || t === 'Gainer' || t === 'EarningsBeat';
        if (filter === 'Loser') return parsePct(m?.dailyChangePct) < 0 || t === 'Loser' || t === 'EarningsMiss';
        return t === filter;
      });
    }
    if (search) {
      const q = search.toUpperCase();
      list = list.filter((m) => (m?.ticker || '').includes(q) || (m?.company || '').toUpperCase().includes(q));
    }
    if (sort === 'gain') {
      list = [...list].sort((a, b) => parsePct(b?.dailyChangePct) - parsePct(a?.dailyChangePct));
    } else if (sort === 'gain-desc') {
      list = [...list].sort((a, b) => parsePct(a?.dailyChangePct) - parsePct(b?.dailyChangePct));
    } else if (sort === 'score') {
      list = [...list].sort((a, b) => (b?.trendScore || 0) - (a?.trendScore || 0));
    }
    return list;
  }, [movers, filter, search, sort]);

  if (movers.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
        <Activity className="w-6 h-6 text-white/30 mx-auto mb-2" />
        <div className="text-sm text-white/50">Daily movers data not loaded yet.</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-500/5 via-white/5 to-rose-500/5 border border-white/10 rounded-xl overflow-hidden slide-up">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400/30 to-rose-400/30 flex items-center justify-center">
            <Flame size={18} className="text-amber-300" />
          </div>
          <div>
            <h2 className="display text-lg text-white">Today's Top {movers.length} Movers</h2>
            <div className="text-xs text-white/50">{data?.marketBreath || 'Live market scan across all sectors'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="mono text-emerald-400">{movers.filter((m) => parsePct(m?.dailyChangePct) > 0).length} ↑</span>
          <span className="mono text-rose-400">{movers.filter((m) => parsePct(m?.dailyChangePct) < 0).length} ↓</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-6 py-3 border-b border-white/10 bg-white/[0.02] flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {MOVE_TYPES.map((m) => {
            const Icon = m.icon;
            const active = filter === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setFilter(m.id)}
                className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition ${
                  active ? 'bg-amber-400/20 border border-amber-400/40 text-amber-200'
                         : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <Icon size={11} /> {m.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 min-w-[160px]">
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter ticker..."
              className="w-full bg-black/30 border border-white/10 rounded-md pl-7 pr-2 py-1 text-xs text-white placeholder:text-white/30 mono focus:outline-none focus:border-amber-400/40"
            />
          </div>
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="text-[11px] bg-black/30 border border-white/10 rounded-md px-2 py-1 text-white/80"
        >
          <option value="rank">Sort: rank</option>
          <option value="gain">Sort: top gain</option>
          <option value="gain-desc">Sort: top loss</option>
          <option value="score">Sort: trend score</option>
        </select>
      </div>

      {/* List */}
      <div className="divide-y divide-white/5 max-h-[700px] overflow-y-auto">
        {filtered.map((m, i) => {
          const pctNum = parsePct(m?.dailyChangePct);
          const up = pctNum > 0;
          const dn = pctNum < 0;
          const tickerCol = up ? 'text-emerald-300' : dn ? 'text-rose-300' : 'text-white';
          const bgGlow = up ? 'hover:bg-emerald-500/[0.04]' : dn ? 'hover:bg-rose-500/[0.04]' : 'hover:bg-white/[0.04]';
          const inWatch = watchlist.includes(m.ticker);
          const score = Math.round(m?.trendScore || 0);

          return (
            <div
              key={`${m.ticker}-${i}`}
              onClick={() => onTickerClick && onTickerClick(m.ticker)}
              className={`px-4 sm:px-6 py-3 cursor-pointer transition ${bgGlow}`}
            >
              <div className="flex items-center gap-3">
                {/* rank */}
                <div className="text-[11px] mono text-white/40 w-7 text-center flex-shrink-0">
                  {i + 1}
                </div>

                {/* ticker + company */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`mono text-base font-medium ${tickerCol}`}>{m?.ticker || '?'}</span>
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/60">
                      {m?.sector || '—'}
                    </span>
                    {m?.moveType && m.moveType !== 'Gainer' && m.moveType !== 'Loser' && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-200">
                        {m.moveType}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-white/45 truncate">{m?.company || ''}</div>
                  {m?.catalyst && (
                    <div className="text-[10px] text-white/55 mt-0.5 truncate italic">{m.catalyst}</div>
                  )}
                </div>

                {/* mini chart */}
                <div className="hidden sm:block flex-shrink-0">
                  <MiniChart prices={m?.priceHistory} width={90} height={28} />
                </div>

                {/* price + change */}
                <div className="text-right flex-shrink-0 min-w-[80px]">
                  <div className="mono text-sm text-white">${m?.currentPrice ?? '—'}</div>
                  <div className={`mono text-xs ${up ? 'text-emerald-400' : dn ? 'text-rose-400' : 'text-white/50'}`}>
                    {m?.dailyChangePct || '—'}
                  </div>
                </div>

                {/* volume */}
                <div className="text-right flex-shrink-0 hidden md:block min-w-[70px]">
                  <div className="text-[10px] text-white/40 uppercase">Vol</div>
                  <div className="mono text-[11px] text-white/80 truncate">{m?.volume || '—'}</div>
                </div>

                {/* score */}
                <div className="text-right flex-shrink-0 hidden lg:block min-w-[40px]">
                  <div className="text-[10px] text-white/40 uppercase">Score</div>
                  <div className="display text-sm text-amber-300">{score}</div>
                </div>

                {/* watch button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleWatch && onToggleWatch(m.ticker); }}
                  className={`text-xs px-2 py-1 rounded border transition flex-shrink-0 ${
                    inWatch
                      ? 'bg-amber-400/20 border-amber-400/40 text-amber-200'
                      : 'border-white/15 text-white/40 hover:border-white/30 hover:text-white/70'
                  }`}
                >
                  {inWatch ? '★' : '☆'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="px-6 py-8 text-center text-white/40 text-sm">No movers match the current filter.</div>
      )}

      <div className="px-6 py-3 border-t border-white/10 bg-white/[0.02] text-[10px] text-white/40 flex items-center justify-between gap-2">
        <span>Click any row for full deep-dive research. ★ to watchlist.</span>
        <span>Showing {filtered.length} of {movers.length}</span>
      </div>
    </div>
  );
}
