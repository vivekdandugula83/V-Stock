// Aggregate sector picks into dashboard stats focused on value-investing metrics.
// Defensive — never throws on malformed model output.

export function aggregate(industryData, activeIndustries) {
  const out = {
    allPicks: [],
    sectorAgg: [],
    stats: null,
    topConviction: [],
    valuationDist: { deep: 0, undervalued: 0, fair: 0, overvalued: 0 },
  };
  if (!industryData || !Array.isArray(activeIndustries)) return out;

  // Flatten all picks with industry context
  for (const ind of activeIndustries) {
    if (!ind) continue;
    const state = industryData[ind.id];
    if (!state || state.status !== 'done' || !state.data) continue;
    const picks = Array.isArray(state.data.picks) ? state.data.picks : [];
    for (const p of picks) {
      out.allPicks.push({
        ...p,
        industryId: ind.id,
        industryLabel: ind.label,
        industryShort: ind.short,
        industryColor: ind.color,
      });
    }
    out.sectorAgg.push({
      id: ind.id,
      label: ind.label,
      short: ind.short,
      color: ind.color,
      pickCount: picks.length,
      avgCompositeScore: avg(picks.map((p) => p.compositeScore)),
      avgPe: avg(picks.map((p) => Number(p?.valuation?.pe)).filter(Number.isFinite)),
      avgRevenueGrowth: pctAvg(picks.map((p) => p?.growth?.revenueGrowthYoY)),
      deepValueCount: picks.filter((p) => p.verdict === 'Deep Value').length,
      undervaluedCount: picks.filter((p) => p.verdict === 'Undervalued').length,
      insiderBuyingCount: picks.filter((p) =>
        String(p?.insiderActivity?.last6moDirection || '').includes('Net buying')
      ).length,
      sectorValuation: state.data.industryValuation || '',
      sectorMedianPe: state.data.sectorMedianPe || null,
    });
  }

  // Valuation distribution
  for (const p of out.allPicks) {
    const v = String(p.verdict || '').toLowerCase();
    if (v.includes('deep')) out.valuationDist.deep++;
    else if (v.includes('underval')) out.valuationDist.undervalued++;
    else if (v.includes('fair')) out.valuationDist.fair++;
    else if (v.includes('over')) out.valuationDist.overvalued++;
  }

  if (out.allPicks.length > 0) {
    out.stats = {
      totalPicks: out.allPicks.length,
      sectors: out.sectorAgg.length,
      avgCompositeScore: avg(out.allPicks.map((p) => p.compositeScore)),
      deepValueCount: out.valuationDist.deep,
      undervaluedCount: out.valuationDist.undervalued,
      avgPe: avg(out.allPicks.map((p) => Number(p?.valuation?.pe)).filter(Number.isFinite)),
      avgForwardPe: avg(out.allPicks.map((p) => Number(p?.valuation?.forwardPe)).filter(Number.isFinite)),
      avgRevenueGrowth: pctAvg(out.allPicks.map((p) => p?.growth?.revenueGrowthYoY)),
      avgEpsGrowth: pctAvg(out.allPicks.map((p) => p?.growth?.epsGrowthYoY)),
      insiderBuyingCount: out.allPicks.filter((p) =>
        String(p?.insiderActivity?.last6moDirection || '').includes('Net buying')
      ).length,
    };
  }

  // Top conviction = sorted by compositeScore across all sectors
  out.topConviction = [...out.allPicks]
    .sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))
    .slice(0, 15);

  return out;
}

function avg(arr) {
  const nums = arr.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 100) / 100;
}

function pctAvg(arr) {
  const nums = arr
    .map((v) => {
      if (typeof v === 'number') return v;
      if (typeof v !== 'string') return NaN;
      const m = v.match(/-?\d+(\.\d+)?/);
      return m ? parseFloat(m[0]) : NaN;
    })
    .filter(Number.isFinite);
  if (nums.length === 0) return null;
  const a = nums.reduce((s, n) => s + n, 0) / nums.length;
  return Math.round(a * 10) / 10;
}
