// Multi-strategy configuration for V-Stock.
// Each strategy has its own prompt, scoring weights, bucket schema, and verdict thresholds.

export const STRATEGIES = {
  value: {
    id: 'value',
    label: 'Long-term Value',
    short: 'Value',
    description: 'Buffett-style fundamentals · 1-3 year horizon',
    color: '#fbbf24',
    icon: 'TrendingUp',
    horizonLabel: '1-3 years',
    weights: { valuation: 0.40, growth: 0.30, insider: 0.15, volume: 0.15 },
    verdictThresholds: [
      { min: 80, label: 'Deep Value',  color: 'emerald' },
      { min: 65, label: 'Undervalued', color: 'cyan' },
      { min: 50, label: 'Fair Value',  color: 'amber' },
      { min: 0,  label: 'Overvalued',  color: 'rose' },
    ],
    // Value uses the existing dedicated ValuePickCard with hardcoded fields
    useExistingValueCard: true,
  },

  swing: {
    id: 'swing',
    label: 'Swing Trade',
    short: 'Swing',
    description: 'Setups with 2-4 week horizon · earnings + technicals',
    color: '#22d3ee',
    icon: 'Activity',
    horizonLabel: '2-4 weeks',
    weights: { setup: 0.35, catalyst: 0.30, riskReward: 0.20, flow: 0.15 },
    verdictThresholds: [
      { min: 80, label: 'Prime Setup', color: 'emerald' },
      { min: 65, label: 'Solid Setup', color: 'cyan' },
      { min: 50, label: 'Watch',       color: 'amber' },
      { min: 0,  label: 'Avoid',       color: 'rose' },
    ],
    buckets: [
      { id: 'setup',      label: 'Setup',       weightLabel: '35%', color: 'text-cyan-300',
        primary: ['pattern', 'trend', 'rsi'], all: ['pattern', 'trend', 'keyLevels', 'rsi', 'maPosition'] },
      { id: 'catalyst',   label: 'Catalyst',    weightLabel: '30%', color: 'text-emerald-300',
        primary: ['nextEvent', 'daysToEvent', 'analystAction'], all: ['nextEvent', 'daysToEvent', 'analystAction', 'recentNews', 'sectorTailwind'] },
      { id: 'riskReward', label: 'Risk/Reward', weightLabel: '20%', color: 'text-amber-300',
        primary: ['entry', 'stop', 'target1'], all: ['entry', 'stop', 'target1', 'target2', 'rrRatio'] },
      { id: 'flow',       label: 'Flow',        weightLabel: '15%', color: 'text-violet-300',
        primary: ['volumeProfile', 'institutional'], all: ['volumeProfile', 'institutional', 'options', 'shortInterest'] },
    ],
  },

  daytrade: {
    id: 'daytrade',
    label: 'Day Trade',
    short: 'Day',
    description: 'Intraday setups · 1-5 day horizon · momentum & volume',
    color: '#f87171',
    icon: 'Zap',
    horizonLabel: '1-5 days',
    weights: { momentum: 0.40, volume: 0.25, volatility: 0.20, catalyst: 0.15 },
    verdictThresholds: [
      { min: 80, label: 'Strong Setup', color: 'emerald' },
      { min: 65, label: 'Setup',        color: 'cyan' },
      { min: 50, label: 'Watch',        color: 'amber' },
      { min: 0,  label: 'Avoid',        color: 'rose' },
    ],
    buckets: [
      { id: 'momentum',   label: 'Momentum',   weightLabel: '40%', color: 'text-cyan-300',
        primary: ['rsi', 'macd', 'fiveDayReturn'], all: ['rsi', 'macd', 'fiveDayReturn', 'trend', 'breakoutPattern', 'relativeStrength'] },
      { id: 'volume',     label: 'Volume',     weightLabel: '25%', color: 'text-emerald-300',
        primary: ['vsAvg20d', 'pattern'], all: ['vsAvg20d', 'pattern', 'optionsFlow', 'darkPool'] },
      { id: 'volatility', label: 'Volatility', weightLabel: '20%', color: 'text-amber-300',
        primary: ['atr', 'ivRank', 'expectedMove'], all: ['atr', 'ivRank', 'expectedMove', 'regime'] },
      { id: 'catalyst',   label: 'Catalyst',   weightLabel: '15%', color: 'text-violet-300',
        primary: ['nextEvent', 'newsToday'], all: ['nextEvent', 'daysToEvent', 'newsToday', 'analystAction'] },
    ],
  },

  dividend: {
    id: 'dividend',
    label: 'Dividend / Income',
    short: 'Dividend',
    description: 'Yield, safety, growth · long-term income',
    color: '#34d399',
    icon: 'DollarSign',
    horizonLabel: 'Long-term hold',
    weights: { yieldQuality: 0.35, dividendGrowth: 0.30, payoutSafety: 0.20, totalReturn: 0.15 },
    verdictThresholds: [
      { min: 80, label: 'Income Anchor', color: 'emerald' },
      { min: 65, label: 'Stable Yield',  color: 'cyan' },
      { min: 50, label: 'Watch',         color: 'amber' },
      { min: 0,  label: 'Yield Trap',    color: 'rose' },
    ],
    buckets: [
      { id: 'yieldQuality',  label: 'Yield Quality', weightLabel: '35%', color: 'text-cyan-300',
        primary: ['currentYield', 'vsSectorAvg', 'vs5yrAvg'], all: ['currentYield', 'vsSectorAvg', 'vs5yrAvg', 'vsBondYield'] },
      { id: 'dividendGrowth', label: 'Div Growth',   weightLabel: '30%', color: 'text-emerald-300',
        primary: ['fiveYrCagr', 'consecutiveYearsRaised'], all: ['fiveYrCagr', 'consecutiveYearsRaised', 'aristocratStatus', 'recentRaise'] },
      { id: 'payoutSafety',  label: 'Payout Safety', weightLabel: '20%', color: 'text-violet-300',
        primary: ['payoutRatio', 'fcfCoverage'], all: ['payoutRatio', 'fcfCoverage', 'debtToEquity', 'cashCushion'] },
      { id: 'totalReturn',   label: 'Total Return',  weightLabel: '15%', color: 'text-amber-300',
        primary: ['valuationFair', 'capitalAppreciation'], all: ['valuationFair', 'capitalAppreciation', 'insiderActivity'] },
    ],
  },
};

export const STRATEGY_IDS = Object.keys(STRATEGIES);

export function verdictForStrategy(strategyId, score) {
  const s = STRATEGIES[strategyId];
  if (!s) return { label: 'Unknown', color: 'stone' };
  for (const v of s.verdictThresholds) {
    if (score >= v.min) return v;
  }
  return s.verdictThresholds[s.verdictThresholds.length - 1];
}

export function computeStrategyComposite(strategyId, scores) {
  const s = STRATEGIES[strategyId];
  if (!s) return 0;
  let total = 0;
  for (const [k, w] of Object.entries(s.weights)) {
    total += (Number(scores[k]) || 0) * w;
  }
  return Math.round(Math.max(0, Math.min(100, total)));
}

// ============================================================
// PROMPT BUILDERS — each strategy has its own targeted prompt
// ============================================================

export function buildStrategyPrompt(strategyId, industryLabel, ctx) {
  const { today, maxSearches, sourceGuidance } = ctx;
  const s = STRATEGIES[strategyId];
  if (!s) throw new Error(`Unknown strategy: ${strategyId}`);
  const builder = PROMPT_BUILDERS[strategyId];
  if (!builder) throw new Error(`No prompt builder for: ${strategyId}`);
  return builder(industryLabel, today, maxSearches, sourceGuidance);
}

const PROMPT_BUILDERS = {
  // VALUE — reuse existing prompt (kept inline here for reference; agent.js uses its own version)
  value: (industry, today, maxSearches, sourceGuidance) => `[VALUE STRATEGY — see fetchIndustryPicks in agent.js for the canonical prompt]`,

  swing: (industry, today, maxSearches, sourceGuidance) => `You are a swing-trading specialist covering ${industry}. Today is ${today}.

Find TEN best SWING TRADE SETUPS in ${industry} for a 2-4 week horizon.

${sourceGuidance}

Focus on:

TECHNICAL SETUP (35%):
- Chart pattern (breakout, pullback to support, base building, cup-handle, etc)
- Trend direction (uptrend / pullback in uptrend / sideways)
- Key support and resistance levels
- 20/50/200-day moving average position
- RSI in swing range (35-65 ideal for entries)

CATALYST (30%):
- Upcoming earnings within next 1-30 days
- Recent analyst rating changes or price target revisions (last 30 days)
- Sector rotation tailwind
- Specific company news/announcements

RISK/REWARD (20%):
- Clear entry zone
- Defined stop (technical support)
- Realistic 2-4 week target (min 2:1 R/R)
- Position size guidance

FLOW (15%):
- Volume pattern last 5-10 days (accumulation vs distribution)
- Institutional buying signals (notable block trades, 13F changes)
- Options activity, especially leading expiry

Return ONLY this JSON (no markdown):
{
  "industry": "${industry}",
  "industryNotes": "1-2 sentences on sector setup environment",
  "industrySources": ["url1", "url2"],
  "picks": [
    {
      "rank": 1,
      "ticker": "SYMBOL",
      "company": "Full Name",
      "currentPrice": 123.45,
      "marketCap": "$XB",
      "setup":      { "pattern": "Bull flag", "trend": "Uptrend, pulled back to 20MA", "keyLevels": "Support $120, Resistance $135", "rsi": "52", "maPosition": "Above 20/50/200", "score": 85 },
      "catalyst":   { "nextEvent": "Q3 Earnings", "daysToEvent": 12, "analystAction": "Upgrade to Buy 2025-MM-DD", "recentNews": "Product launch this week", "sectorTailwind": "Sector rotating in", "score": 78 },
      "riskReward": { "entry": "$122-124", "stop": "$118 (-3.3%)", "target1": "$135 (+9.7%)", "target2": "$142 (+15%)", "rrRatio": "1:3", "score": 82 },
      "flow":       { "volumeProfile": "Rising on green days, falling on red", "institutional": "13F: 3 funds added Q3", "options": "C/P 1.8, call sweeps at $130", "shortInterest": "5.2% of float", "score": 70 },
      "compositeScore": 80,
      "verdict": "Prime Setup | Solid Setup | Watch | Avoid",
      "thesis": "3 sentences: what's the setup, why now, what's the catalyst trigger.",
      "risks": ["risk 1", "risk 2", "risk 3"],
      "sources": ["https://...", "https://..."],
      "priceHistory": [120.40, 121.10, ..., 132.10]
    }
  ]
}

Composite = setup × 0.35 + catalyst × 0.30 + riskReward × 0.20 + flow × 0.15
Verdict: ≥80 Prime · 65-79 Solid · 50-64 Watch · <50 Avoid
Exactly 10 picks. Sort by compositeScore desc. priceHistory 20 numbers most-recent-last.`,

  daytrade: (industry, today, maxSearches, sourceGuidance) => `You are a day-trading specialist covering ${industry}. Today is ${today}.

Find TEN best DAY TRADE SETUPS in ${industry} for a 1-5 day horizon.

${sourceGuidance}

Focus on:

MOMENTUM (40%):
- RSI position (oversold bounce 30-40 / breakout setup 55-70 / overbought caution 70+)
- MACD signal (recent bullish/bearish crossover, histogram direction)
- 5-day return
- Trend: uptrend / pullback / sideways / breakout / breakdown
- Breakout pattern: ascending triangle, flag, cup, etc
- Relative strength vs sector and SPX

VOLUME (25%):
- Today's / yesterday's volume vs 20-day average
- Accumulation pattern (rising on volume) vs distribution (falling on volume)
- Unusual options activity (large block trades, sweep prints)
- Dark pool sentiment when accessible

VOLATILITY (20%):
- ATR (Average True Range, 10-day) for stop placement
- IV Rank (current implied volatility vs 1-year history)
- Expected daily move (±%)
- Volatility regime: low / normal / elevated / extreme

CATALYST (15%):
- Earnings within next 1-7 days (high event-driven move likelihood)
- Today's / yesterday's news
- Analyst upgrade/downgrade today
- Sector or theme rotation

Return ONLY this JSON (no markdown):
{
  "industry": "${industry}",
  "industryNotes": "1-2 sentences on sector momentum environment",
  "industrySources": ["url1", "url2"],
  "picks": [
    {
      "rank": 1,
      "ticker": "SYMBOL",
      "company": "Full Name",
      "currentPrice": 123.45,
      "marketCap": "$XB",
      "momentum":   { "rsi": "62", "macd": "Bullish crossover yesterday", "fiveDayReturn": "+5.2%", "trend": "Uptrend, near breakout", "breakoutPattern": "Ascending triangle", "relativeStrength": "Outperforming SPX +3%", "score": 85 },
      "volume":     { "vsAvg20d": "1.8x avg today", "pattern": "Accumulation", "optionsFlow": "C/P 2.1, large call sweeps", "darkPool": "Bullish prints", "score": 78 },
      "volatility": { "atr": "$2.45", "ivRank": "45 (mid)", "expectedMove": "±$2.10 (1.7%)", "regime": "normal", "score": 70 },
      "catalyst":   { "nextEvent": "Earnings in 3 days", "daysToEvent": 3, "newsToday": "Analyst upgrade pre-market", "analystAction": "PT raised to $140", "score": 82 },
      "tradePlan":  { "entry": "$122-124 on breakout above $124", "stop": "$120 (-3.2%, below 20MA)", "target1": "$130 (+4.8%)", "target2": "$135 (+8.9%)", "rrRatio": "1:2.5", "horizonDays": 3 },
      "compositeScore": 79,
      "verdict": "Strong Setup | Setup | Watch | Avoid",
      "thesis": "2-3 sentences: why this setup, what triggers entry, what catalyst could ignite it.",
      "risks": ["risk 1", "risk 2"],
      "sources": ["https://...", "https://..."],
      "priceHistory": [120.40, 121.10, ..., 132.10]
    }
  ]
}

Composite = momentum × 0.40 + volume × 0.25 + volatility × 0.20 + catalyst × 0.15
Verdict: ≥80 Strong Setup · 65-79 Setup · 50-64 Watch · <50 Avoid
Exactly 10 picks. Sort by compositeScore desc. priceHistory 20 numbers most-recent-last.

EXCLUDE: stocks under $5, micro-caps under $300M market cap, illiquid (<500K daily volume).`,

  dividend: (industry, today, maxSearches, sourceGuidance) => `You are a dividend / income investing specialist covering ${industry}. Today is ${today}.

Find TEN best DIVIDEND / INCOME STOCKS in ${industry} for long-term income generation.

${sourceGuidance}

Focus on:

YIELD QUALITY (35%):
- Current dividend yield
- vs sector average dividend yield
- vs the company's own 5-year average yield (is it elevated now? bargain or warning?)
- vs 10-year Treasury yield (equity risk premium)

DIVIDEND GROWTH (30%):
- 5-year dividend CAGR
- Consecutive years of dividend increases
- Status: Dividend Aristocrat (25+ years), Dividend Achiever (10+), or Other
- Most recent dividend raise (% and date)

PAYOUT SAFETY (20%):
- Payout ratio (% of earnings paid as dividends; >80% = caution, >100% = unsustainable)
- Free cash flow coverage (FCF / dividend; >1.5x = strong)
- Debt to equity (leveraged dividend = risk)
- Cash cushion on balance sheet

TOTAL RETURN (15%):
- Valuation reasonable (don't overpay for yield — P/E vs sector)
- Capital appreciation potential alongside dividend
- Insider activity (CEO/CFO buying = confidence signal)

Return ONLY this JSON (no markdown):
{
  "industry": "${industry}",
  "industryNotes": "1-2 sentences on sector yield environment",
  "industrySources": ["url1", "url2"],
  "picks": [
    {
      "rank": 1,
      "ticker": "SYMBOL",
      "company": "Full Name",
      "currentPrice": 123.45,
      "marketCap": "$XB",
      "yieldQuality":   { "currentYield": "3.8%", "vsSectorAvg": "+0.9% vs sector", "vs5yrAvg": "+0.4% vs own 5yr avg (elevated)", "vsBondYield": "0.7% premium to 10yr Treasury", "score": 80 },
      "dividendGrowth": { "fiveYrCagr": "7.5%", "consecutiveYearsRaised": "28 years", "aristocratStatus": "Dividend Aristocrat", "recentRaise": "+8% on 2025-MM-DD", "score": 90 },
      "payoutSafety":   { "payoutRatio": "58%", "fcfCoverage": "1.9x", "debtToEquity": "0.45", "cashCushion": "$4B", "score": 85 },
      "totalReturn":    { "valuationFair": "P/E 15 vs sector 18, reasonable", "capitalAppreciation": "Moderate, single-digit organic growth", "insiderActivity": "CEO net buyer last 6mo", "score": 70 },
      "compositeScore": 83,
      "verdict": "Income Anchor | Stable Yield | Watch | Yield Trap",
      "thesis": "3 sentences: yield + safety + growth profile. Why this is a quality income holding.",
      "risks": ["risk 1", "risk 2", "risk 3"],
      "sources": ["https://...", "https://..."],
      "priceHistory": [120.40, ..., 132.10]
    }
  ]
}

Composite = yieldQuality × 0.35 + dividendGrowth × 0.30 + payoutSafety × 0.20 + totalReturn × 0.15
Verdict: ≥80 Income Anchor · 65-79 Stable Yield · 50-64 Watch · <50 Yield Trap
Exactly 10 picks. Sort by compositeScore desc. priceHistory 20 numbers most-recent-last.

EXCLUDE: non-dividend payers, dividend cuts in last 3 years, yields >12% (likely yield traps), MLPs/REITs unless explicitly identified as such (different tax treatment).`,
};

// ============================================================
// NORMALIZER — converts strategy-specific raw picks into a uniform
// internal shape consumed by GenericPickCard.
// ============================================================

// Inline stripCitations here to avoid circular import with agent.js
function _stripCitations(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/<\/?(?:antml:)?cite[^>]*>/gi, '')
    .replace(/<\/?(?:antml:)?cite\b[^>]*$/gi, '')
    .replace(/\bite\s+index\s*=\s*"[^"]*"\s*>/gi, '')
    .replace(/<\/?\s*ite[^>]*>/gi, '')
    .replace(/&lt;\/?(?:antml:)?cite[^&]*&gt;/gi, '');
}

function clamp(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function safe(v) {
  if (v == null) return null;
  return typeof v === 'string' ? _stripCitations(v) : v;
}

export function normalizeStrategyPicks(strategyId, rawPicks) {
  if (!Array.isArray(rawPicks)) return [];
  const cfg = STRATEGIES[strategyId];
  if (!cfg || !cfg.buckets) return [];

  return rawPicks
    .map((p, i) => {
      // Build generic buckets from strategy-specific fields
      const buckets = cfg.buckets.map((b) => {
        const raw = p?.[b.id] || {};
        // Collect KVs in the order the schema declares; fall back to all available keys
        const fields = b.all || Object.keys(raw);
        const kvs = fields
          .filter((f) => f !== 'score' && raw[f] != null && raw[f] !== '')
          .map((f) => ({ k: humanizeKey(f), v: safe(raw[f]) }));
        return {
          id: b.id,
          label: b.label,
          weightLabel: b.weightLabel,
          color: b.color,
          score: clamp(raw.score),
          primaryFields: b.primary || [],
          kvs,
        };
      });

      const composite = clamp(
        p?.compositeScore != null
          ? p.compositeScore
          : computeStrategyComposite(strategyId, Object.fromEntries(buckets.map((b) => [b.id, b.score])))
      );

      const verdict = p?.verdict || verdictForStrategy(strategyId, composite).label;

      return {
        rank: p?.rank ?? (i + 1),
        ticker: p?.ticker || '?',
        company: safe(p?.company) || '',
        currentPrice: typeof p?.currentPrice === 'number' ? p.currentPrice : null,
        marketCap: safe(p?.marketCap) || null,
        compositeScore: composite,
        verdict,
        buckets,
        thesis: safe(p?.thesis) || '',
        risks: Array.isArray(p?.risks) ? p.risks.map(safe).filter(Boolean) : [],
        sources: Array.isArray(p?.sources)
          ? p.sources.filter((s) => typeof s === 'string' && s.startsWith('http')).slice(0, 8)
          : [],
        priceHistory: Array.isArray(p?.priceHistory)
          ? p.priceHistory.filter((n) => typeof n === 'number' && !isNaN(n))
          : [],
        // Strategy-specific extras (tradePlan for daytrade/swing)
        tradePlan: p?.tradePlan || null,
        strategyId,
      };
    })
    .sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

function humanizeKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/ Yr /g, ' yr ')
    .replace(/ Vs /g, ' vs ')
    .replace(/Ma /g, 'MA ')
    .replace(/Rsi/g, 'RSI')
    .replace(/Macd/g, 'MACD')
    .replace(/Iv /g, 'IV ')
    .replace(/Atr/g, 'ATR')
    .replace(/Cagr/g, 'CAGR')
    .replace(/Fcf/g, 'FCF')
    .replace(/Pt/g, 'PT')
    .replace(/Rr Ratio/g, 'R/R Ratio')
    .trim();
}
