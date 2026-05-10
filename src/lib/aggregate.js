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

  const topConviction = [...allPicks]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 8);

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
