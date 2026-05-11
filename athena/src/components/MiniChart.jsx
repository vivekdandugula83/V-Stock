// Compact price chart — auto-detects up/down trend, shows fill area, key levels
export default function MiniChart({ prices = [], width = 120, height = 32, accent }) {
  const pts = (Array.isArray(prices) ? prices : [])
    .filter((n) => typeof n === 'number' && isFinite(n));
  if (pts.length < 2) {
    return (
      <div style={{ width, height }} className="bg-white/[0.03] rounded flex items-center justify-center">
        <span className="text-[8px] text-white/30 mono">no data</span>
      </div>
    );
  }
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const isUp = pts[pts.length - 1] >= pts[0];
  const stroke = accent || (isUp ? '#34d399' : '#f87171');
  const fill = isUp ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)';

  const stepX = width / (pts.length - 1);
  const path = pts
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
  const fillPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={fillPath} fill={fill} />
      <path d={path} stroke={stroke} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
