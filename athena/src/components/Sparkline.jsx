export default function Sparkline({ data, width = 64, height = 20, strokeWidth = 1.5 }) {
  const safeData = Array.isArray(data)
    ? data.filter((n) => typeof n === 'number' && !isNaN(n) && isFinite(n))
    : [];

  if (safeData.length < 2) {
    return (
      <div
        className="rounded bg-stone-900/40 flex items-center justify-center"
        style={{ width, height }}
      >
        <span className="mono text-[8px] text-stone-600">—</span>
      </div>
    );
  }

  const min = Math.min(...safeData);
  const max = Math.max(...safeData);
  const range = max - min || 1;
  const padX = 1, padY = 2;
  const w = width - padX * 2;
  const h = height - padY * 2;
  const stepX = w / (safeData.length - 1);

  const points = safeData.map((v, i) => [
    padX + i * stepX,
    padY + h - ((v - min) / range) * h,
  ]);

  const path = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const fillPath = `${path} L${points[points.length - 1][0]},${height - padY} L${padX},${height - padY} Z`;

  const isUp = safeData[safeData.length - 1] >= safeData[0];
  const stroke = isUp ? '#34d399' : '#f87171';
  const fillStart = isUp ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)';
  const fillEnd = isUp ? 'rgba(52, 211, 153, 0)' : 'rgba(248, 113, 113, 0)';
  const gradId = `sg-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillStart} />
          <stop offset="100%" stopColor={fillEnd} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2" fill={stroke} />
    </svg>
  );
}
