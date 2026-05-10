import { useEffect, useState } from 'react';

export default function StatTile({ label, value, suffix = '', icon, accent = '#d4a574', sub }) {
  const [display, setDisplay] = useState(0);
  const isNumber = typeof value === 'number' && !isNaN(value) && isFinite(value);
  const targetValue = isNumber ? value : 0;

  useEffect(() => {
    if (!isNumber) return;
    let raf;
    const start = performance.now();
    const dur = 900;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(targetValue * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetValue, isNumber]);

  const formatted = isNumber
    ? (Number.isInteger(targetValue) ? Math.round(display) : display.toFixed(1))
    : (value ?? '—');

  return (
    <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl border border-stone-800/70 bg-gradient-to-br from-stone-950/80 to-stone-900/30 group">
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${accent}15, transparent 70%)` }}
      />
      <div className="relative flex items-center justify-between mb-2">
        <span className="mono text-[10px] tracking-[0.2em] uppercase text-stone-500">{label}</span>
        {icon && <span style={{ color: accent }} className="opacity-70">{icon}</span>}
      </div>
      <div className="relative flex items-baseline gap-1">
        <span className="display text-3xl sm:text-4xl font-light tabular-nums" style={{ color: accent }}>
          {formatted}
        </span>
        {suffix && <span className="mono text-sm text-stone-500">{suffix}</span>}
      </div>
      {sub && <div className="relative mt-1 text-[11px] text-stone-500">{sub}</div>}
    </div>
  );
}
