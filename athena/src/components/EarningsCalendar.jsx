import { Calendar, AlertCircle } from 'lucide-react';

const BUCKETS = [
  { id: 'this_week',  label: 'This Week',       max: 7 },
  { id: 'next_week',  label: 'Next 7-14 Days',  max: 14 },
  { id: 'this_month', label: '14-30 Days',      max: 30 },
  { id: 'later',      label: '30+ Days',        max: Infinity },
];

export default function EarningsCalendar({ picks = [], onTickerClick }) {
  // Bucket picks by daysToNextEarnings
  const buckets = { this_week: [], next_week: [], this_month: [], later: [] };
  let totalWithDate = 0;
  for (const p of picks) {
    const d = p?.marketSentiment?.daysToNextEarnings;
    if (!Number.isFinite(d) || d < 0) continue;
    totalWithDate++;
    if (d <= 7) buckets.this_week.push({ ...p, daysOut: d });
    else if (d <= 14) buckets.next_week.push({ ...p, daysOut: d });
    else if (d <= 30) buckets.this_month.push({ ...p, daysOut: d });
    else buckets.later.push({ ...p, daysOut: d });
  }
  for (const k of Object.keys(buckets)) {
    buckets[k].sort((a, b) => a.daysOut - b.daysOut);
  }

  if (totalWithDate === 0) {
    return null; // Don't render if no data
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-cyan-300/80" />
          <h3 className="display text-sm text-white">Upcoming Earnings</h3>
        </div>
        <div className="text-[10px] text-stone-500 mono">{totalWithDate} picks with dates</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/5">
        {BUCKETS.map((b) => {
          const items = buckets[b.id];
          const urgent = b.id === 'this_week';
          return (
            <div key={b.id} className="p-3">
              <div className={`text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1 ${
                urgent ? 'text-amber-300' : 'text-stone-500'
              }`}>
                {urgent && <AlertCircle size={10} />}
                {b.label} <span className="mono opacity-60">({items.length})</span>
              </div>
              {items.length === 0 ? (
                <div className="text-[11px] text-stone-600 italic">No picks reporting</div>
              ) : (
                <div className="space-y-1">
                  {items.slice(0, 6).map((p, i) => (
                    <button
                      key={`${p.ticker}-${i}`}
                      onClick={() => onTickerClick && onTickerClick(p.ticker)}
                      className="w-full flex items-center justify-between text-[11px] px-1.5 py-1 rounded hover:bg-white/5 transition text-left"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="mono text-stone-200 font-medium">{p.ticker}</span>
                        <span
                          className="text-[9px] px-1 py-0.5 rounded uppercase"
                          style={{ background: `${p.industryColor}25`, color: p.industryColor }}
                        >
                          {p.industryShort}
                        </span>
                      </div>
                      <span className={`mono ${urgent ? 'text-amber-300' : 'text-stone-400'}`}>
                        {p.daysOut}d
                      </span>
                    </button>
                  ))}
                  {items.length > 6 && (
                    <div className="text-[10px] text-stone-500 italic px-1.5">
                      +{items.length - 6} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
