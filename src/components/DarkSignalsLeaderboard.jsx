import { Eye, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

export default function DarkSignalsLeaderboard({ items = [], onTickerClick }) {
  const safe = Array.isArray(items) ? items : [];
  if (safe.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-2 text-white/70 mb-2">
          <Eye size={16} className="text-violet-300" />
          <h3 className="display text-base">Dark Signals Leaderboard</h3>
        </div>
        <div className="text-white/40 text-sm">No detectable smart-money signals in this run.</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-500/5 via-white/5 to-white/5 border border-violet-400/20 rounded-xl overflow-hidden slide-up">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-400/20 flex items-center justify-center">
            <Eye size={18} className="text-violet-300" />
          </div>
          <div>
            <h2 className="display text-lg text-white">Dark Signals Leaderboard</h2>
            <div className="text-xs text-white/50">Tickers with strongest dark-pool / institutional / insider / options signals</div>
          </div>
        </div>
        <div className="text-xs text-violet-300 mono">{safe.length} signals</div>
      </div>

      <div className="divide-y divide-white/5">
        {safe.map((p, i) => {
          const dir = p.signalDirection || 'Mixed';
          const isBull = dir === 'Bullish';
          const isBear = dir === 'Bearish';
          const Arrow = isBull ? ArrowUpRight : isBear ? ArrowDownRight : Activity;
          const dirColor = isBull ? 'text-emerald-300' : isBear ? 'text-rose-300' : 'text-white/60';
          const dirBg = isBull ? 'bg-emerald-400/10 border-emerald-400/30' : isBear ? 'bg-rose-400/10 border-rose-400/30' : 'bg-white/5 border-white/15';
          return (
            <div
              key={`${p.ticker}-${i}`}
              onClick={() => onTickerClick && onTickerClick(p.ticker)}
              className="px-6 py-4 hover:bg-white/5 transition cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="text-violet-300/60 mono text-sm w-6">#{i + 1}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="mono text-base text-white font-medium">{p.ticker}</span>
                    <span
                      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{ background: `${p.industryColor}25`, color: p.industryColor }}
                    >
                      {p.industryShort || ''}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${dirBg} ${dirColor} flex items-center gap-1`}>
                      <Arrow size={10} /> {dir}
                    </span>
                  </div>
                  <div className="text-xs text-white/50 mt-1 line-clamp-1">
                    {(p.signalReasons || []).join(' · ') || 'Composite signal'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-white/40 uppercase">Signal</div>
                  <div className="display text-violet-200 text-lg leading-none">{p.signalScore || 0}</div>
                </div>
              </div>

              {/* signal bar */}
              <div className="mt-3 h-1 bg-white/5 rounded overflow-hidden">
                <div
                  className={isBull ? 'h-full bg-emerald-400/60' : isBear ? 'h-full bg-rose-400/60' : 'h-full bg-white/30'}
                  style={{ width: `${Math.min(100, p.signalScore || 0)}%` }}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-white/5 px-2 py-1.5 rounded">
                  <div className="text-white/40 text-[9px] uppercase">Dark Pool</div>
                  <div className="text-white/80 truncate">{p?.smartMoney?.darkPoolSentiment || '—'}</div>
                </div>
                <div className="bg-white/5 px-2 py-1.5 rounded">
                  <div className="text-white/40 text-[9px] uppercase">Inst Flow</div>
                  <div className="text-white/80 truncate">{p?.smartMoney?.institutionalFlow || '—'}</div>
                </div>
                <div className="bg-white/5 px-2 py-1.5 rounded">
                  <div className="text-white/40 text-[9px] uppercase">Insider</div>
                  <div className="text-white/80 truncate">{p?.smartMoney?.insiderActivity || '—'}</div>
                </div>
                <div className="bg-white/5 px-2 py-1.5 rounded">
                  <div className="text-white/40 text-[9px] uppercase">Options</div>
                  <div className="text-white/80 truncate">{p?.smartMoney?.optionsFlow || '—'}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-6 py-3 border-t border-white/10 bg-white/[0.02] text-[10px] text-white/40">
        These are model-inferred signals from public sources, not live institutional feeds. Treat as a heuristic, not ground truth.
      </div>
    </div>
  );
}
