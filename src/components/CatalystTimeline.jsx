export default function CatalystTimeline({ catalysts = [], weekCatalysts = [] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizonDays = 14;
  const horizonEnd = new Date(today.getTime() + horizonDays * 24 * 60 * 60 * 1000);

  const items = [
    ...(Array.isArray(weekCatalysts) ? weekCatalysts : []).map((c) => {
      if (typeof c === 'string') return { date: 'TBD', event: c, ticker: 'MARKET', impact: 'medium', isMacro: true };
      return {
        date: c?.date || 'TBD',
        event: c?.event || '',
        ticker: 'MARKET',
        impact: c?.importance || c?.impact || 'medium',
        isMacro: true,
      };
    }),
    ...(Array.isArray(catalysts) ? catalysts : []),
  ]
    .map((c) => {
      const t = Date.parse(c?.date);
      return { ...c, ts: isNaN(t) ? null : t };
    })
    .filter((c) => c.ts !== null && c.ts >= today.getTime() && c.ts <= horizonEnd.getTime() && c.event);

  items.sort((a, b) => a.ts - b.ts);

  if (items.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-stone-800/60 bg-stone-950/40 text-stone-500 text-sm text-center">
        No dated catalysts in the next 14 days
      </div>
    );
  }

  const byDate = {};
  for (const it of items) {
    const d = new Date(it.ts);
    const key = d.toISOString().slice(0, 10);
    (byDate[key] = byDate[key] || []).push(it);
  }

  const dates = Object.keys(byDate).sort();

  return (
    <div className="relative">
      <div className="absolute left-[88px] top-2 bottom-2 w-px bg-gradient-to-b from-stone-800 via-stone-800/50 to-transparent" />
      <ul className="space-y-3">
        {dates.map((dateKey) => {
          const d = new Date(dateKey + 'T00:00:00');
          const daysOut = Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
          const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = d.getDate();
          const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
          const dayItems = byDate[dateKey];

          return (
            <li key={dateKey} className="flex gap-4">
              <div className="shrink-0 w-20 text-right">
                <div className="mono text-[10px] uppercase tracking-widest text-stone-500">{dayLabel}</div>
                <div className="display text-2xl font-light text-stone-100 leading-none">{dayNum}</div>
                <div className="mono text-[10px] uppercase tracking-widest text-stone-500">{monthLabel}</div>
                <div className={`mono text-[9px] mt-0.5 ${daysOut === 0 ? 'text-amber-400' : 'text-stone-600'}`}>
                  {daysOut === 0 ? 'TODAY' : daysOut === 1 ? 'TOMORROW' : `+${daysOut}D`}
                </div>
              </div>

              <div className="relative shrink-0">
                <div className="absolute left-[-7px] top-2 w-3 h-3 rounded-full bg-amber-400 ring-4 ring-stone-950"
                     style={{ boxShadow: '0 0 12px rgba(212,165,116,0.6)' }} />
              </div>

              <div className="flex-1 space-y-1.5 pt-1 pl-3">
                {dayItems.map((it, i) => (
                  <div key={i}
                       className="flex items-start gap-2 px-3 py-2 rounded-lg border border-stone-800/60 bg-stone-950/40 hover:border-stone-700 transition"
                       style={{
                         borderLeftColor: it.industryColor || '#d4a574',
                         borderLeftWidth: '2px',
                       }}>
                    <span className={`mono text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      it.isMacro
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-stone-800/70 text-stone-300'
                    }`}>
                      {it.ticker || 'EVENT'}
                    </span>
                    <span className="text-sm text-stone-300 leading-snug flex-1">{it.event}</span>
                    {it.impact && (
                      <span className={`mono text-[9px] uppercase tracking-wider shrink-0 mt-0.5 ${
                        it.impact === 'high' ? 'text-rose-400' : it.impact === 'medium' ? 'text-amber-400' : 'text-stone-500'
                      }`}>
                        {it.impact}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
