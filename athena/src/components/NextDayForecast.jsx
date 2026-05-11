import { AlertCircle, Sunrise } from 'lucide-react';
import Sparkline from './Sparkline';

const confidenceColor = (c) => {
  const x = (c || '').toLowerCase();
  if (x === 'high') return '#34d399';
  if (x === 'medium') return '#fbbf24';
  return '#94a3b8';
};

const gapColor = (g) => {
  const x = (g || '').toLowerCase();
  if (x === 'high') return 'text-rose-400';
  if (x === 'medium') return 'text-amber-400';
  return 'text-stone-500';
};

export default function NextDayForecast({ picks }) {
  const safe = Array.isArray(picks) ? picks : [];
  if (safe.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-stone-800/60 bg-stone-950/40 text-center text-stone-500 text-sm">
        No bullish next-day setups identified
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {safe.map((p, i) => {
        const conf = confidenceColor(p?.nextDayForecast?.confidence);
        const ph = Array.isArray(p?.priceHistory) ? p.priceHistory : [];
        const isUp = ph.length >= 2 && ph[ph.length - 1] >= ph[0];

        return (
          <div key={i}
               className="relative overflow-hidden rounded-xl border border-stone-800/70 bg-stone-950/40 p-4 hover:border-stone-700 transition group">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-30 blur-2xl pointer-events-none transition-opacity group-hover:opacity-50"
                 style={{ background: conf }} />

            <div className="relative">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="mono text-lg font-bold tracking-tight" style={{ color: p?.industryColor || '#d4a574' }}>
                    {p?.ticker || '?'}
                  </span>
                  <span className="mono text-[10px] tracking-widest uppercase text-stone-600">
                    {p?.industryShort || ''}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="mono text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded border"
                        style={{
                          color: conf, borderColor: `${conf}40`, background: `${conf}15`,
                        }}>
                    {p?.nextDayForecast?.confidence || 'med'} conv
                  </span>
                </div>
              </div>

              <div className="text-xs text-stone-300 line-clamp-2 mb-3 leading-relaxed">
                {p?.nextDayForecast?.rationale || p?.thesis || ''}
              </div>

              <div className="flex items-center gap-3 mb-3">
                {ph.length >= 2 && <Sparkline data={ph} width={70} height={24} />}
                <div className="flex-1 min-w-0">
                  {typeof p?.currentPrice === 'number' && (
                    <div className="mono text-sm text-stone-100 leading-tight">
                      ${p.currentPrice.toFixed(2)}
                      {ph.length >= 2 && (
                        <span className={`ml-2 text-xs ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isUp ? '↑' : '↓'} 5d
                        </span>
                      )}
                    </div>
                  )}
                  {p?.nextDayForecast?.expectedRange && (
                    <div className="mono text-[10px] text-stone-500 mt-0.5">
                      range · {p.nextDayForecast.expectedRange}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-3 border-t border-stone-800/50 flex-wrap gap-2">
                {p?.nextDayForecast?.keyLevel && (
                  <div className="flex items-center gap-1.5">
                    <Sunrise className="w-3 h-3 text-amber-400" />
                    <span className="mono text-stone-400">key · </span>
                    <span className="mono text-stone-200">{p.nextDayForecast.keyLevel}</span>
                  </div>
                )}
                {p?.nextDayForecast?.gapRisk && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className={`w-3 h-3 ${gapColor(p.nextDayForecast.gapRisk)}`} />
                    <span className={`mono text-[10px] uppercase tracking-wider ${gapColor(p.nextDayForecast.gapRisk)}`}>
                      gap {p.nextDayForecast.gapRisk}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
