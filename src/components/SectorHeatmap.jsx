import { TrendingUp } from 'lucide-react';

const heatColor = (score) => {
  if (!score || isNaN(score)) return '#1c1917';
  if (score >= 80) return 'rgba(52, 211, 153, 0.25)';
  if (score >= 70) return 'rgba(163, 230, 53, 0.22)';
  if (score >= 60) return 'rgba(212, 165, 116, 0.20)';
  if (score >= 50) return 'rgba(96, 165, 250, 0.15)';
  return 'rgba(120, 113, 108, 0.10)';
};

const borderHue = (score, accent) => {
  if (score >= 75) return accent || '#d4a574';
  return 'rgba(120, 113, 108, 0.4)';
};

export default function SectorHeatmap({ sectors, onSectorClick }) {
  if (!sectors?.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {sectors.map((s) => {
        const avgScore = s.avgScore || 0;
        return (
          <button
            key={s.id}
            onClick={() => onSectorClick?.(s.id)}
            className="relative overflow-hidden text-left rounded-xl border p-4 transition hover:scale-[1.02] hover:-translate-y-0.5 group"
            style={{
              borderColor: borderHue(avgScore, s.color),
              background: `linear-gradient(135deg, ${heatColor(avgScore)} 0%, transparent 100%)`,
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ background: `radial-gradient(circle at top, ${s.color}20, transparent 70%)` }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
                <span className="mono text-[10px] tracking-widest uppercase text-stone-400">{s.short}</span>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <span className="display text-3xl font-light text-stone-100 tabular-nums">
                  {avgScore.toFixed(0)}
                </span>
                {s.strongBuys > 0 && (
                  <span className="mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {s.strongBuys} SB
                  </span>
                )}
              </div>

              <div className="text-[11px] text-stone-500 mono mb-2">avg score · {s.pickCount || 0} picks</div>

              {s.topPick && (
                <div className="pt-2 border-t border-stone-800/50 flex items-center justify-between gap-2">
                  <span className="mono text-xs font-bold" style={{ color: s.color }}>
                    {s.topPick.ticker || '?'}
                  </span>
                  <span className="mono text-[10px] text-stone-500">top · {s.topPick.score || 0}</span>
                </div>
              )}

              {s.bullishNextDay > 0 && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400/80">
                  <TrendingUp className="w-3 h-3" />
                  <span>{s.bullishNextDay} bullish next-day</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
