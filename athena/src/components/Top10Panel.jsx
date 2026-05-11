import { TrendingUp, Target, Activity, Zap } from 'lucide-react';

export default function Top10Panel({ picks = [], onTickerClick, watchlist = [], onToggleWatch }) {
  const safe = Array.isArray(picks) ? picks.slice(0, 10) : [];
  if (safe.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-white/50 text-sm">Top 10 conviction list will appear after picks load.</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-500/5 via-white/5 to-white/5 border border-amber-400/30 rounded-xl overflow-hidden slide-up">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-400/20 flex items-center justify-center">
            <Target size={18} className="text-amber-300" />
          </div>
          <div>
            <h2 className="display text-lg text-white">Top 10 Conviction Picks</h2>
            <div className="text-xs text-white/50">Composite score across all sectors · conviction × smart money × catalysts</div>
          </div>
        </div>
        <div className="text-xs text-amber-300 mono">{safe.length} ranked</div>
      </div>

      <div className="divide-y divide-white/5">
        {safe.map((p, i) => {
          const inWatch = watchlist.includes(p.ticker);
          const composite = Math.round(p.composite || p.score || 0);
          const bullish = /bull/i.test(p?.nextDayForecast?.bias || '');
          const smScore = p?.smartMoney?.score || 0;
          return (
            <div
              key={`${p.ticker}-${i}`}
              className="px-6 py-4 hover:bg-white/5 transition cursor-pointer flex items-center gap-4"
              onClick={() => onTickerClick && onTickerClick(p.ticker)}
            >
              <div className="text-2xl display text-amber-300/70 w-8 text-center">{i + 1}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="mono text-lg text-white font-medium">{p.ticker}</span>
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: `${p.industryColor}25`, color: p.industryColor }}
                  >
                    {p.industryShort || ''}
                  </span>
                  <span className="text-xs text-white/60 truncate">{p.company}</span>
                </div>
                <div className="text-xs text-white/40 mt-1 line-clamp-1">{p.thesis || p.edge}</div>
              </div>

              <div className="flex items-center gap-4 text-xs flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="text-white/40">Action</div>
                  <div className="text-white/90">{p.action}</div>
                </div>
                <div className="text-right hidden md:block">
                  <div className="text-white/40 flex items-center gap-1 justify-end"><Zap size={10} /> Smart</div>
                  <div className="text-white/90 mono">{smScore}</div>
                </div>
                <div className="text-right hidden md:block">
                  <div className="text-white/40 flex items-center gap-1 justify-end"><Activity size={10} /> Next-day</div>
                  <div className={bullish ? 'text-emerald-300' : 'text-white/70'}>
                    {p?.nextDayForecast?.bias || '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white/40">Score</div>
                  <div className="display text-amber-300 text-base">{composite}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleWatch && onToggleWatch(p.ticker); }}
                  className={`text-xs px-2 py-1 rounded border transition ${
                    inWatch
                      ? 'bg-amber-400/20 border-amber-400/40 text-amber-200'
                      : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/80'
                  }`}
                  title={inWatch ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  {inWatch ? '★' : '☆'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-6 py-3 border-t border-white/10 bg-white/[0.02] text-[10px] text-white/40 flex items-center gap-2">
        <TrendingUp size={10} /> Click any row for a deep-dive research call. Star to add to watchlist.
      </div>
    </div>
  );
}
