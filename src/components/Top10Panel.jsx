import { Target, Users, TrendingUp } from 'lucide-react';
import MiniChart from './MiniChart.jsx';

const VERDICT_BADGE = {
  'Deep Value':  'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  'Undervalued': 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
  'Fair Value':  'bg-amber-500/15 text-amber-200 border-amber-400/30',
  'Overvalued':  'bg-rose-500/15 text-rose-200 border-rose-400/30',
};

export default function Top10Panel({ picks = [], onTickerClick, watchlist = [], onToggleWatch, limit = 10 }) {
  const safe = (Array.isArray(picks) ? picks : []).slice(0, limit);
  if (safe.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-white/50 text-sm">Top picks will appear once sector scans complete.</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-500/5 via-white/5 to-emerald-500/5 border border-amber-400/30 rounded-xl overflow-hidden slide-up">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-400/20 flex items-center justify-center">
            <Target size={18} className="text-amber-300" />
          </div>
          <div>
            <h2 className="display text-lg text-white">Top {safe.length} Undervalued Picks</h2>
            <div className="text-xs text-white/50">
              Composite = Valuation×40% + Growth×30% + Insider×15% + Volume×15%
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {safe.map((p, i) => {
          const inWatch = watchlist.includes(p.ticker);
          const v = p.valuation || {};
          const g = p.growth || {};
          const ins = p.insiderActivity || {};
          const verdict = p.verdict || 'Fair Value';
          const badge = VERDICT_BADGE[verdict] || VERDICT_BADGE['Fair Value'];
          const netBuying = String(ins.last6moDirection || '').includes('Net buying');

          return (
            <div
              key={`${p.ticker}-${i}`}
              onClick={() => onTickerClick && onTickerClick(p.ticker)}
              className="px-4 sm:px-6 py-4 hover:bg-white/[0.03] cursor-pointer transition"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-2xl display text-amber-300/60 w-8 text-center flex-shrink-0">{i + 1}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="mono text-base text-white font-medium">{p.ticker}</span>
                    <span
                      className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: `${p.industryColor}25`, color: p.industryColor }}
                    >
                      {p.industryShort}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${badge}`}>
                      {verdict}
                    </span>
                    {netBuying && (
                      <span className="text-[10px] flex items-center gap-1 text-emerald-300">
                        <Users size={9} /> insider buying
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/55 truncate">{p.company}</div>
                </div>

                {/* sparkline */}
                <div className="hidden md:block flex-shrink-0">
                  <MiniChart prices={p.priceHistory} width={80} height={26} />
                </div>

                {/* key metrics */}
                <div className="hidden sm:flex items-center gap-4 text-xs flex-shrink-0">
                  <div className="text-right">
                    <div className="text-white/40 text-[10px]">P/E</div>
                    <div className="mono text-white/85">{v.pe ?? '—'}</div>
                  </div>
                  <div className="text-right hidden md:block">
                    <div className="text-white/40 text-[10px]">Fwd P/E</div>
                    <div className="mono text-white/85">{v.forwardPe ?? '—'}</div>
                  </div>
                  <div className="text-right hidden lg:block">
                    <div className="text-white/40 text-[10px]">Rev YoY</div>
                    <div className="mono text-emerald-300">{g.revenueGrowthYoY || '—'}</div>
                  </div>
                  <div className="text-right hidden lg:block">
                    <div className="text-white/40 text-[10px]">EPS YoY</div>
                    <div className="mono text-emerald-300">{g.epsGrowthYoY || '—'}</div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="display text-amber-300 text-xl leading-none">{p.compositeScore}</div>
                  <div className="text-[10px] text-white/40 uppercase">Score</div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); onToggleWatch && onToggleWatch(p.ticker); }}
                  className={`text-sm px-2 py-1 rounded border transition flex-shrink-0 ${
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

      <div className="px-6 py-3 border-t border-white/10 bg-white/[0.02] text-[10px] text-white/40">
        Click any row for full deep-dive research. Star to add to watchlist.
      </div>
    </div>
  );
}
