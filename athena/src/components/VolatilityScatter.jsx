const parsePct = (s) => {
  if (typeof s === 'number') return isFinite(s) ? s : null;
  if (!s) return null;
  const m = String(s).match(/(-?\d+\.?\d*)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return isNaN(n) ? null : n;
};

export default function VolatilityScatter({ picks }) {
  const W = 520, H = 240;
  const padL = 40, padR = 12, padT = 12, padB = 32;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const points = (picks || []).map((p) => {
    const ivRank = parsePct(p?.volatility?.ivRank);
    const score = typeof p?.score === 'number' ? p.score : null;
    if (ivRank == null || score == null) return null;
    return {
      x: Math.max(0, Math.min(100, ivRank)),
      y: Math.max(0, Math.min(100, score)),
      ticker: p.ticker || '?',
      color: p.industryColor || '#d4a574',
    };
  }).filter(Boolean);

  if (points.length < 2) {
    return (
      <div className="p-6 rounded-xl border border-stone-800/60 bg-stone-950/40 text-center text-stone-500 text-sm">
        Volatility data unavailable for these picks
      </div>
    );
  }

  const xToPx = (x) => padL + (x / 100) * innerW;
  const yToPx = (y) => padT + (1 - y / 100) * innerH;

  return (
    <div className="rounded-xl border border-stone-800/70 bg-stone-950/40 p-4 sm:p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="display text-lg text-stone-100">Volatility map</div>
          <div className="text-[11px] text-stone-500 mono">score vs implied volatility rank</div>
        </div>
        <div className="hidden sm:flex gap-3 text-[10px] mono uppercase tracking-wider text-stone-500">
          <span>↑ Y conviction · ↑ X vol risk</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <rect x={padL} y={padT} width={innerW / 2} height={innerH / 2} fill="rgba(52, 211, 153, 0.04)" />
        <rect x={padL + innerW / 2} y={padT} width={innerW / 2} height={innerH / 2} fill="rgba(251, 146, 60, 0.04)" />

        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={xToPx(g)} y1={padT} x2={xToPx(g)} y2={H - padB} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <line x1={padL} y1={yToPx(g)} x2={W - padR} y2={yToPx(g)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </g>
        ))}

        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

        {[0, 50, 100].map((g) => (
          <g key={g}>
            <text x={xToPx(g)} y={H - padB + 14} textAnchor="middle"
                  fill="rgba(245,241,234,0.4)" fontSize="9" fontFamily="JetBrains Mono">{g}</text>
            <text x={padL - 6} y={yToPx(g) + 3} textAnchor="end"
                  fill="rgba(245,241,234,0.4)" fontSize="9" fontFamily="JetBrains Mono">{g}</text>
          </g>
        ))}

        <text x={xToPx(25)} y={yToPx(85)} textAnchor="middle"
              fill="rgba(52, 211, 153, 0.5)" fontSize="9" fontFamily="JetBrains Mono"
              letterSpacing="0.1em">SWEET SPOT</text>
        <text x={xToPx(75)} y={yToPx(85)} textAnchor="middle"
              fill="rgba(251, 146, 60, 0.5)" fontSize="9" fontFamily="JetBrains Mono"
              letterSpacing="0.1em">HIGH-VOL HUNT</text>

        <text x={W / 2} y={H - 4} textAnchor="middle"
              fill="rgba(245,241,234,0.5)" fontSize="10" fontFamily="JetBrains Mono"
              letterSpacing="0.15em">IV RANK</text>
        <text x={12} y={H / 2} textAnchor="middle"
              fill="rgba(245,241,234,0.5)" fontSize="10" fontFamily="JetBrains Mono"
              letterSpacing="0.15em" transform={`rotate(-90 12 ${H / 2})`}>SCORE</text>

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xToPx(p.x)} cy={yToPx(p.y)} r="10" fill={p.color} opacity="0.15" />
            <circle cx={xToPx(p.x)} cy={yToPx(p.y)} r="4.5" fill={p.color}
                    style={{ filter: `drop-shadow(0 0 6px ${p.color})` }} />
            <text x={xToPx(p.x) + 7} y={yToPx(p.y) + 3} fill="rgba(245,241,234,0.85)"
                  fontSize="9" fontWeight="600" fontFamily="JetBrains Mono">{p.ticker}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
