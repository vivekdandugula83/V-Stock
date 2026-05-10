// Compute dashboard-level aggregates from per-industry results. Defensive everywhere.

export function aggregate(industryData, industries) {
  const allPicks = [];
  const sectorAgg = [];

  for (const ind of (industries || [])) {
    const state = industryData?.[ind.id];
    if (state?.status !== 'done' || !state?.data?.picks) continue;
    const picks = (state.data.picks || []).map((p) => ({
      ...p,
      industryId: ind.id,
      industryLabel: ind.label,
      industryShort: ind.short,
      industryColor: ind.color,
    }));
    allPicks.push(...picks);

    if (picks.length === 0) continue;
    const avgScore = picks.reduce((s, p) => s + (p.score || 0), 0) / picks.length;
    const strongBuys = picks.filter((p) => /strong/i.test(p.action || '')).length;
    const buys = picks.filter((p) => /buy/i.test(p.action || '')).length;
    const bullishNextDay = picks.filter((p) => /bull/i.test(p.nextDayForecast?.bias || '')).length;
    const avgSmartMoney = picks.reduce((s, p) => s + (p.smartMoney?.score || 0), 0) / picks.length;
    const topPick = [...picks].sort((a, b) => (b.score || 0) - (a.score || 0))[0];

    sectorAgg.push({
      ...ind,
      avgScore: avgScore || 0,
      strongBuys, buys, bullishNextDay, avgSmartMoney: avgSmartMoney || 0,
      topPick, pickCount: picks.length,
      thesis: state.data.industryThesis || '',
      smartMoneyNote: state.data.industrySmartMoney || '',
    });
  }

  if (allPicks.length === 0) {
    return { allPicks, sectorAgg, stats: null, topConviction: [], catalysts: [], nextDayBullish: [] };
  }

  // Composite scoring: conviction × smart money × catalyst weight
  const convictionWeight = { high: 1.2, medium: 1.0, low: 0.8 };
  const actionWeight = { 'strong buy': 1.15, buy: 1.05, accumulate: 1.0, watch: 0.85 };
  const scored = allPicks.map((p) => {
    const baseScore = p.score || 0;
    const cw = convictionWeight[(p.conviction || '').toLowerCase()] || 1.0;
    const aw = actionWeight[(p.action || '').toLowerCase()] || 1.0;
    const smartBonus = (p.smartMoney?.score || 50) / 100; // 0.5 baseline
    const catalystBonus = Math.min((p.catalysts?.length || 0) * 2, 8);
    const bullishBonus = /bull/i.test(p.nextDayForecast?.bias || '') ? 5 : 0;
    const composite = (baseScore * cw * aw) + (smartBonus * 10) + catalystBonus + bullishBonus;
    return { ...p, composite };
  });

  const topConviction = [...scored]
    .sort((a, b) => (b.composite || 0) - (a.composite || 0))
    .slice(0, 12);

  const cmap = { high: 3, medium: 2, low: 1 };
  const nextDayBullish = allPicks
    .filter((p) => /bull/i.test(p.nextDayForecast?.bias || ''))
    .sort((a, b) => {
      const ac = cmap[(a.nextDayForecast?.confidence || '').toLowerCase()] || 0;
      const bc = cmap[(b.nextDayForecast?.confidence || '').toLowerCase()] || 0;
      if (ac !== bc) return bc - ac;
      return (b.score || 0) - (a.score || 0);
    })
    .slice(0, 6);

  // Catalysts — handle string OR object form
  const catalystEntries = [];
  for (const p of allPicks) {
    for (const c of (p.catalysts || [])) {
      if (typeof c === 'string') {
        catalystEntries.push({ ticker: p.ticker, date: 'TBD', event: c, impact: 'medium', industryColor: p.industryColor });
      } else if (c && typeof c === 'object') {
        catalystEntries.push({
          ticker: p.ticker,
          date: c.date || 'TBD',
          event: c.event || c.description || '',
          impact: c.impact || 'medium',
          industryColor: p.industryColor,
        });
      }
    }
  }
  catalystEntries.sort((a, b) => {
    const da = Date.parse(a.date), db = Date.parse(b.date);
    if (isNaN(da) && isNaN(db)) return 0;
    if (isNaN(da)) return 1;
    if (isNaN(db)) return -1;
    return da - db;
  });

  const stats = {
    totalPicks: allPicks.length,
    avgScore: allPicks.reduce((s, p) => s + (p.score || 0), 0) / allPicks.length,
    strongBuys: allPicks.filter((p) => /strong/i.test(p.action || '')).length,
    bullishNextDay: nextDayBullish.length,
    sectorsCovered: sectorAgg.length,
    highConviction: allPicks.filter((p) => (p.conviction || '').toLowerCase() === 'high').length,
    avgSmartMoney: allPicks.reduce((s, p) => s + (p.smartMoney?.score || 0), 0) / allPicks.length,
  };

  return { allPicks, sectorAgg, stats, topConviction, catalysts: catalystEntries, nextDayBullish };
}

// ============================================================
// Dark signals leaderboard — rank tickers by signal strength
// ============================================================
export function darkSignalsLeaderboard(allPicks) {
  if (!Array.isArray(allPicks) || allPicks.length === 0) return [];

  const scored = allPicks.map((p) => {
    const sm = p.smartMoney || {};
    let signalScore = sm.score || 0;
    let signalDirection = 0; // -1 bear, 0 mixed, 1 bull
    const reasons = [];

    const dpSent = String(sm.darkPoolSentiment || '').toLowerCase();
    if (dpSent.includes('bull')) { signalScore += 12; signalDirection += 1; reasons.push('dark-pool bullish'); }
    else if (dpSent.includes('bear')) { signalScore += 12; signalDirection -= 1; reasons.push('dark-pool bearish'); }

    const flow = String(sm.institutionalFlow || '').toLowerCase();
    if (flow.includes('net buying')) { signalScore += 10; signalDirection += 1; reasons.push('institutional buying'); }
    else if (flow.includes('net selling')) { signalScore += 10; signalDirection -= 1; reasons.push('institutional selling'); }

    const insider = String(sm.insiderActivity || '').toLowerCase();
    if (/(buy|purchase|acquired)/.test(insider) && !/no\s+/.test(insider)) {
      signalScore += 6; signalDirection += 1; reasons.push('insider buys');
    } else if (/(sell|sold|disposed)/.test(insider) && !/no\s+/.test(insider)) {
      signalScore += 6; signalDirection -= 1; reasons.push('insider sells');
    }

    const opts = String(sm.optionsFlow || '').toLowerCase();
    if (/(call|bullish|c\/p\s*[<])/.test(opts)) { signalScore += 4; signalDirection += 1; reasons.push('call-heavy options'); }
    else if (/(put|bearish|c\/p\s*[>])/.test(opts)) { signalScore += 4; signalDirection -= 1; reasons.push('put-heavy options'); }

    return {
      ...p,
      signalScore: Math.min(100, signalScore),
      signalDirection: signalDirection > 0 ? 'Bullish' : signalDirection < 0 ? 'Bearish' : 'Mixed',
      signalReasons: reasons,
    };
  });

  return scored
    .filter((p) => (p.signalScore || 0) > 0)
    .sort((a, b) => (b.signalScore || 0) - (a.signalScore || 0))
    .slice(0, 15);
}
