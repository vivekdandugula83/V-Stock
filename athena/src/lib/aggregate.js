// Strategy-aware aggregator. Computes appropriate stats for each strategy.

export function aggregate(industryData, activeIndustries, strategyId = 'value') {
  const out = {
    allPicks: [],
    sectorAgg: [],
    stats: null,
    topConviction: [],
    verdictDist: {},
    strategyId,
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
      topPick: picks[0]
        ? { ticker: picks[0].ticker, score: picks[0].compositeScore, verdict: picks[0].verdict }
        : null,
      ...sectorExtras(strategyId, picks),
    });
  }

  // Compute verdict distribution (strategy-specific labels)
  out.verdictDist = computeVerdictDist(strategyId, out.allPicks);

  // Top conviction = sorted by compositeScore across all sectors
  out.topConviction = [...out.allPicks]
    .sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))
    .slice(0, 30);

  // Strategy-specific stats
  if (out.allPicks.length > 0) {
    out.stats = computeStats(strategyId, out.allPicks);
  }

  return out;
}

// ============================================================
// STRATEGY-SPECIFIC SECTOR EXTRAS — additional aggregations per sector
// ============================================================

function sectorExtras(strategyId, picks) {
  if (strategyId === 'value') {
    return {
      deepValueCount: picks.filter((p) => p.verdict === 'Deep Value').length,
      undervaluedCount: picks.filter((p) => p.verdict === 'Undervalued').length,
      avgPe: avg(picks.map((p) => Number(p?.valuation?.pe)).filter(Number.isFinite)),
      avgRevenueGrowth: pctAvg(picks.map((p) => p?.growth?.revenueGrowthYoY)),
      insiderBuyingCount: picks.filter((p) =>
        String(p?.insiderActivity?.last6moDirection || '').includes('Net buying')
      ).length,
    };
  }
  // Generic for non-value strategies
  return {
    topVerdictCount: picks.filter((p) => isStrongVerdict(p.verdict)).length,
    avgBucketScores: avgBucketScores(picks),
  };
}

function avgBucketScores(picks) {
  if (picks.length === 0 || !picks[0].buckets) return {};
  const out = {};
  for (const b of picks[0].buckets) {
    const scores = picks
      .map((p) => p.buckets?.find((bb) => bb.id === b.id)?.score)
      .filter((s) => Number.isFinite(s));
    out[b.id] = avg(scores);
  }
  return out;
}

// ============================================================
// VERDICT DISTRIBUTION — counts per verdict label
// ============================================================

function computeVerdictDist(strategyId, picks) {
  const dist = {};
  for (const p of picks) {
    const k = p.verdict || 'Unknown';
    dist[k] = (dist[k] || 0) + 1;
  }
  return dist;
}

function isStrongVerdict(v) {
  const k = String(v || '').toLowerCase();
  return k.includes('deep value') || k.includes('strong setup') || k.includes('prime setup') || k.includes('income anchor');
}

// ============================================================
// PER-STRATEGY HERO STATS
// ============================================================

function computeStats(strategyId, picks) {
  const base = {
    totalPicks: picks.length,
    sectors: new Set(picks.map((p) => p.industryId)).size,
    avgCompositeScore: avg(picks.map((p) => p.compositeScore)),
  };

  switch (strategyId) {
    case 'value':
      return {
        ...base,
        deepValueCount: picks.filter((p) => p.verdict === 'Deep Value').length,
        undervaluedCount: picks.filter((p) => p.verdict === 'Undervalued').length,
        avgPe: avg(picks.map((p) => Number(p?.valuation?.pe)).filter(Number.isFinite)),
        avgForwardPe: avg(picks.map((p) => Number(p?.valuation?.forwardPe)).filter(Number.isFinite)),
        avgRevenueGrowth: pctAvg(picks.map((p) => p?.growth?.revenueGrowthYoY)),
        avgEpsGrowth: pctAvg(picks.map((p) => p?.growth?.epsGrowthYoY)),
        insiderBuyingCount: picks.filter((p) =>
          String(p?.insiderActivity?.last6moDirection || '').includes('Net buying')
        ).length,
      };

    case 'daytrade':
      return {
        ...base,
        strongSetupCount: picks.filter((p) => p.verdict === 'Strong Setup').length,
        setupCount: picks.filter((p) => p.verdict === 'Setup').length,
        avgMomentum: avgBucket(picks, 'momentum'),
        avgVolume: avgBucket(picks, 'volume'),
        avgVolatility: avgBucket(picks, 'volatility'),
        avgCatalyst: avgBucket(picks, 'catalyst'),
        unusualVolumeCount: picks.filter((p) => {
          const kv = findBucketKv(p, 'volume', 'vs avg');
          if (!kv) return false;
          const m = String(kv).match(/(\d+(?:\.\d+)?)x?/);
          return m && parseFloat(m[1]) >= 1.5;
        }).length,
        nearEarningsCount: picks.filter((p) => {
          const kv = findBucketKv(p, 'catalyst', 'days');
          if (!kv) return false;
          const m = String(kv).match(/(\d+)/);
          return m && parseInt(m[1], 10) <= 7;
        }).length,
      };

    case 'swing':
      return {
        ...base,
        primeSetupCount: picks.filter((p) => p.verdict === 'Prime Setup').length,
        solidSetupCount: picks.filter((p) => p.verdict === 'Solid Setup').length,
        avgSetup: avgBucket(picks, 'setup'),
        avgCatalyst: avgBucket(picks, 'catalyst'),
        avgRiskReward: avgBucket(picks, 'riskReward'),
        avgFlow: avgBucket(picks, 'flow'),
        avgRRRatio: avgRRRatio(picks),
        earningsNext14Count: picks.filter((p) => {
          const kv = findBucketKv(p, 'catalyst', 'days');
          if (!kv) return false;
          const m = String(kv).match(/(\d+)/);
          return m && parseInt(m[1], 10) <= 14;
        }).length,
        instFlowPositiveCount: picks.filter((p) => {
          const kv = findBucketKv(p, 'flow', 'institutional');
          return kv && /buying|added|positive|bullish/i.test(String(kv));
        }).length,
      };

    case 'dividend':
      return {
        ...base,
        anchorCount: picks.filter((p) => p.verdict === 'Income Anchor').length,
        stableCount: picks.filter((p) => p.verdict === 'Stable Yield').length,
        avgYield: pctAvg(picks.map((p) => findBucketKv(p, 'yieldQuality', 'current yield'))),
        avgPayoutRatio: pctAvg(picks.map((p) => findBucketKv(p, 'payoutSafety', 'payout ratio'))),
        aristocratCount: picks.filter((p) => {
          const v = findBucketKv(p, 'dividendGrowth', 'aristocrat');
          return v && /aristocrat/i.test(String(v));
        }).length,
        strongFcfCoverageCount: picks.filter((p) => {
          const v = findBucketKv(p, 'payoutSafety', 'fcf coverage');
          if (!v) return false;
          const m = String(v).match(/(\d+(?:\.\d+)?)/);
          return m && parseFloat(m[1]) >= 1.5;
        }).length,
        avgYearsRaised: avgInt(picks.map((p) => findBucketKv(p, 'dividendGrowth', 'consecutive years'))),
      };

    default:
      return base;
  }
}

// ============================================================
// HELPERS
// ============================================================

function avg(arr) {
  const nums = arr.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 100) / 100;
}

function avgInt(arr) {
  const nums = arr
    .map((v) => {
      if (typeof v === 'number') return v;
      if (typeof v !== 'string') return NaN;
      const m = v.match(/-?\d+/);
      return m ? parseInt(m[0], 10) : NaN;
    })
    .filter(Number.isFinite);
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
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

function avgBucket(picks, bucketId) {
  const scores = picks
    .map((p) => p.buckets?.find((b) => b.id === bucketId)?.score)
    .filter((s) => Number.isFinite(s));
  return avg(scores);
}

function findBucketKv(pick, bucketId, keyPattern) {
  const bucket = pick?.buckets?.find((b) => b.id === bucketId);
  if (!bucket) return null;
  const needle = String(keyPattern).toLowerCase();
  const kv = bucket.kvs?.find((kv) => String(kv.k || '').toLowerCase().includes(needle));
  return kv?.v ?? null;
}

function avgRRRatio(picks) {
  // tradePlan.rrRatio is e.g. "1:2.5" or "1:3"
  const vals = picks
    .map((p) => p?.tradePlan?.rrRatio)
    .filter((v) => typeof v === 'string')
    .map((v) => {
      const m = v.match(/1\s*:\s*(\d+(?:\.\d+)?)/);
      return m ? parseFloat(m[1]) : NaN;
    })
    .filter(Number.isFinite);
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((s, n) => s + n, 0) / vals.length) * 10) / 10;
}

// Export helpers so Dashboard can use them too
export { findBucketKv, avgBucket };
