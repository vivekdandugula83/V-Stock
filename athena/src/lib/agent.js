// Multi-stage equity research agent with crash-proof error handling.
const API_URL = 'https://api.anthropic.com/v1/messages';

export const INDUSTRIES = [
  { id: 'tech',        label: 'Technology & Semiconductors',  short: 'Tech',         color: '#60a5fa' },
  { id: 'financials',  label: 'Financials & Banks',           short: 'Financials',   color: '#34d399' },
  { id: 'healthcare',  label: 'Healthcare & Biotech',         short: 'Healthcare',   color: '#f472b6' },
  { id: 'energy',      label: 'Energy & Materials',           short: 'Energy',       color: '#fb923c' },
  { id: 'consumer',    label: 'Consumer & Retail',            short: 'Consumer',     color: '#a78bfa' },
  { id: 'industrials', label: 'Industrials & Defense',        short: 'Industrials',  color: '#facc15' },
];

export const MODES = {
  express: {
    label: 'Express',
    model: 'claude-haiku-4-5-20251001',
    inputPer1M: 1.0, outputPer1M: 5.0,
    regimeSearches: 2, industrySearches: 1,
    industryTokens: 12000, regimeTokens: 2500,
    smartMoneyDepth: 'basic',
    description: 'Haiku 4.5 · 1 search/sector · ~$0.20/run',
  },
  standard: {
    label: 'Standard',
    model: 'claude-haiku-4-5-20251001',
    inputPer1M: 1.0, outputPer1M: 5.0,
    regimeSearches: 3, industrySearches: 3,
    industryTokens: 18000, regimeTokens: 3500,
    smartMoneyDepth: 'standard',
    description: 'Haiku 4.5 · 3 searches/sector · ~$0.65/run',
  },
  deep: {
    label: 'Deep',
    model: 'claude-sonnet-4-6',
    inputPer1M: 3.0, outputPer1M: 15.0,
    regimeSearches: 4, industrySearches: 5,
    industryTokens: 24000, regimeTokens: 4000,
    smartMoneyDepth: 'full',
    description: 'Sonnet 4.6 · 5 searches/sector · ~$2.20/run',
  },
};

export function estimateCost(modeKey, industryCount) {
  const m = MODES[modeKey];
  if (!m) return 0;
  // Calls: 1 regime + 1 news pulse + 1 movers + N sectors
  const totalCalls = 3 + industryCount;
  // Searches: regime + news + movers (regimeSearches each) + sectors
  const totalSearches = (m.regimeSearches * 3) + (industryCount * m.industrySearches);
  const searchCost = totalSearches * 0.01;
  // Movers call has bigger output (~1.5x industry tokens)
  const moversTokens = m.industryTokens * 1.5;
  const avgInputPerCall = 3500 + (m.industrySearches * 4500);
  const avgOutputPerCall = ((m.industryTokens * industryCount) + m.regimeTokens * 2 + moversTokens) / totalCalls / 2;
  const inputCost = (totalCalls * avgInputPerCall * m.inputPer1M) / 1_000_000;
  const outputCost = (totalCalls * avgOutputPerCall * m.outputPer1M) / 1_000_000;
  return searchCost + inputCost + outputCost;
}

// Convert real usage data to actual dollars
export function realCost(usage, modeKey) {
  const m = MODES[modeKey];
  if (!m || !usage) return 0;
  const inputTokens = (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) * 0.1 + (usage.cache_creation_input_tokens || 0) * 1.25;
  const outputTokens = usage.output_tokens || 0;
  const searches = usage.server_tool_use?.web_search_requests || 0;
  return (inputTokens * m.inputPer1M + outputTokens * m.outputPer1M) / 1_000_000 + searches * 0.01;
}

// Custom error class with classification
export class ApiError extends Error {
  constructor(kind, message, raw) {
    super(message);
    this.kind = kind;
    this.raw = raw;
  }
}

const KNOWN_ERROR_KINDS = {
  CREDIT: 'credit',          // out of credits
  AUTH: 'auth',              // bad/missing key
  RATELIMIT: 'ratelimit',    // 429
  CORS: 'cors',              // browser direct access blocked
  PARSE: 'parse',            // response parse failed
  NETWORK: 'network',        // fetch failed
  SERVER: 'server',          // 5xx
  OVERLOADED: 'overloaded',  // 529
  UNKNOWN: 'unknown',
};
export { KNOWN_ERROR_KINDS };

function classifyError(status, bodyText) {
  const lower = String(bodyText || '').toLowerCase();
  if (lower.includes('credit balance') || lower.includes('insufficient_balance') || lower.includes('billing')) {
    return KNOWN_ERROR_KINDS.CREDIT;
  }
  if (status === 401 || lower.includes('authentication') || lower.includes('invalid api key') || lower.includes('invalid x-api-key')) {
    return KNOWN_ERROR_KINDS.AUTH;
  }
  if (status === 429 || lower.includes('rate limit') || lower.includes('rate_limit')) {
    return KNOWN_ERROR_KINDS.RATELIMIT;
  }
  if (status === 403 || lower.includes('cors') || lower.includes('dangerous-direct-browser-access')) {
    return KNOWN_ERROR_KINDS.CORS;
  }
  if (status === 529 || lower.includes('overloaded')) {
    return KNOWN_ERROR_KINDS.OVERLOADED;
  }
  if (status >= 500) return KNOWN_ERROR_KINDS.SERVER;
  return KNOWN_ERROR_KINDS.UNKNOWN;
}

async function callClaude(apiKey, prompt, mode, maxTokens, maxUses) {
  const m = MODES[mode];

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: m.model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxUses }],
      }),
    });
  } catch (err) {
    // Fetch itself failed — almost always CORS or network
    throw new ApiError(KNOWN_ERROR_KINDS.NETWORK,
      'Network request failed. Most likely CORS — your account may need browser direct access enabled in Console settings.',
      err.message);
  }

  if (!res.ok) {
    const bodyText = await res.text();
    let parsedBody = null;
    try { parsedBody = JSON.parse(bodyText); } catch {}
    const message = parsedBody?.error?.message || bodyText.slice(0, 300);
    const kind = classifyError(res.status, message);
    throw new ApiError(kind, message, { status: res.status, body: bodyText });
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new ApiError(KNOWN_ERROR_KINDS.PARSE, 'Response was not valid JSON', err.message);
  }

  const text = (data.content || [])
    .filter((b) => b?.type === 'text')
    .map((b) => b.text || '')
    .join('\n');

  // Extract JSON object from response — be lenient
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new ApiError(KNOWN_ERROR_KINDS.PARSE,
      `Agent returned no structured data. The model may have refused or output unstructured text. (First 200 chars: "${cleaned.slice(0, 200)}")`,
      cleaned);
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch (err) {
    throw new ApiError(KNOWN_ERROR_KINDS.PARSE,
      `Failed to parse agent JSON output: ${err.message}`,
      cleaned.slice(start, end + 1));
  }

  return { parsed, usage: data.usage || {} };
}

// Defensive normalizer — guarantees every pick has the fields the UI expects
function normalizePicks(rawPicks) {
  if (!Array.isArray(rawPicks)) return [];
  return rawPicks.map((p, i) => ({
    rank: p?.rank ?? (i + 1),
    ticker: p?.ticker || '?',
    company: p?.company || '',
    subIndustry: p?.subIndustry || '',
    currentPrice: typeof p?.currentPrice === 'number' ? p.currentPrice : null,
    score: typeof p?.score === 'number' ? Math.max(0, Math.min(100, p.score)) : 0,
    action: p?.action || 'Watch',
    conviction: p?.conviction || 'Low',
    thesis: p?.thesis || '',
    edge: p?.edge || '',
    earnings: p?.earnings || null,
    technicals: p?.technicals || null,
    tradePlan: p?.tradePlan || null,
    volatility: p?.volatility || null,
    smartMoney: p?.smartMoney || null,
    nextDayForecast: p?.nextDayForecast || null,
    priceHistory: Array.isArray(p?.priceHistory)
      ? p.priceHistory.filter((n) => typeof n === 'number' && !isNaN(n))
      : [],
    catalysts: Array.isArray(p?.catalysts) ? p.catalysts : [],
    risks: Array.isArray(p?.risks) ? p.risks : [],
  }));
}

export async function fetchMarketRegime(apiKey, { horizon, risk, mode }) {
  const m = MODES[mode];
  const today = new Date().toDateString();
  const prompt = `You are a Wall Street market strategist. Today is ${today}.

Use web_search (max ${m.regimeSearches}) for CURRENT data:
- US indices (SPX, NDX, RUT) levels and day/week change
- VIX level and trend
- 10-year yield, DXY
- This week's earnings + econ calendar
- Sector rotation: leaders/laggards
- Smart money signals: notable institutional flow

Synthesize a tactical briefing for a ${risk}-risk trader, ${horizon} horizon.

Return ONLY this JSON (no markdown, no preamble):
{
  "regime": "Risk-On" | "Risk-Off" | "Mixed" | "Choppy",
  "regimeReason": "1 sentence why",
  "indices": {
    "spx": { "level": "5xxx", "change": "+0.X% today, +X% week" },
    "ndx": { "level": "1xxxx", "change": "+0.X% today, +X% week" },
    "rut": { "level": "2xxx", "change": "+0.X% today, +X% week" }
  },
  "vix": { "level": "1X.X", "interpretation": "1 sentence" },
  "rates": { "ten_year": "X.XX%", "dollar": "DXY at XXX, trend", "implication": "1 sentence" },
  "thisWeekCatalysts": [
    { "date": "YYYY-MM-DD", "event": "specific event", "importance": "high|medium|low" }
  ],
  "sectorRotation": {
    "leaders": ["sector — why"],
    "laggards": ["sector — why"]
  },
  "smartMoneyPulse": "1-2 sentences on aggregate institutional flow",
  "tradingPlaybook": "3 sentences: tactical guidance — what to lean into, avoid, key levels",
  "asOf": "${new Date().toISOString()}"
}

Real numbers, named events.`;

  const { parsed, usage } = await callClaude(apiKey, prompt, mode, m.regimeTokens, m.regimeSearches);
  return { data: parsed, usage };
}

export async function fetchIndustryPicks(apiKey, industryId, { horizon, risk, regime, mode }) {
  const ind = INDUSTRIES.find((i) => i.id === industryId);
  if (!ind) throw new ApiError(KNOWN_ERROR_KINDS.UNKNOWN, `Unknown industry: ${industryId}`);
  const m = MODES[mode];
  const today = new Date().toDateString();

  const horizonGuidance = {
    intraday: 'opens-to-close intraday or 1-2 day swing — tight technical setups',
    swing:    '3-10 trading day swing — earnings setups, breakouts, momentum',
    position: '2-8 week position — fundamental thesis with technical confirmation',
  }[horizon] || 'swing trade';

  const smartMoneyAsk = {
    basic: 'Note any obvious analyst upgrade/downgrade or insider pattern.',
    standard: `Search for institutional signals:
- Recent insider transactions (Form 4) — buys vs sells
- Unusual options activity, C/P ratio anomalies
- Dark pool prints / off-exchange volume if reported
- Notable 13F changes, ETF flow`,
    full: `Aggressively pull smart money signals:
- Insider Form 4 — names, sizes, recency
- Unusual options activity — strikes, expiries, premium spent
- Dark pool prints from public aggregators
- Notable 13F changes from major funds (Berkshire, Renaissance, Citadel)
- IV rank, expected next-day move`,
  }[m.smartMoneyDepth];

  const prompt = `You are a sector specialist covering ${ind.label}. Today is ${today}.
Current market regime: ${regime || 'unknown'}.
Trade target: ${horizonGuidance} (${risk} risk).

Use web_search (max ${m.industrySearches}) to find TEN highest-quality trade setups in ${ind.label}.

For each: earnings (beat/miss, guidance), analyst actions, technical setup, catalysts in next 14 days,
${smartMoneyAsk}, recent 5-day price trajectory.

Return ONLY this JSON (no markdown, no preamble):
{
  "industry": "${ind.label}",
  "industryThesis": "2-3 sentences on this sector",
  "industrySmartMoney": "1-2 sentences on aggregate institutional positioning",
  "picks": [
    {
      "rank": 1,
      "ticker": "SYMBOL",
      "company": "Full Name",
      "subIndustry": "specific sub-industry",
      "currentPrice": 123.45,
      "score": 88,
      "action": "Strong Buy" | "Buy" | "Accumulate" | "Watch",
      "conviction": "High" | "Medium" | "Low",
      "thesis": "3-4 sentences with hard data",
      "edge": "1 sentence — why NOW",
      "earnings": {
        "lastDate": "YYYY-MM-DD or N/A",
        "result": "EPS/Rev result vs est",
        "guidance": "raised/lowered/maintained",
        "nextDate": "YYYY-MM-DD"
      },
      "technicals": {
        "trend": "trend label",
        "keyLevels": "support $X, resistance $Y",
        "pattern": "specific pattern",
        "rsi": "value",
        "volume": "above/below average"
      },
      "tradePlan": {
        "entry": "$X.XX - $Y.YY",
        "stop": "$X.XX (% below)",
        "target1": "$X.XX (% gain)",
        "target2": "$X.XX (% gain)",
        "rrRatio": "1:X.X",
        "positionSize": "X% of trading capital"
      },
      "volatility": {
        "iv": "X%", "ivRank": "X (0-100)", "hv30": "X%",
        "expectedMove": "$X.XX (±X%) for next 1-day",
        "regime": "low|normal|elevated|extreme"
      },
      "smartMoney": {
        "darkPoolSentiment": "Bullish | Neutral | Bearish",
        "institutionalFlow": "Net buying | Net selling | Mixed | Unknown",
        "insiderActivity": "1-2 sentences on Form 4",
        "optionsFlow": "C/P ratio + unusual activity",
        "score": 75
      },
      "nextDayForecast": {
        "bias": "Bullish | Neutral | Bearish",
        "confidence": "High | Medium | Low",
        "expectedRange": "$X.XX - $Y.YY",
        "keyLevel": "$X.XX",
        "rationale": "1 sentence",
        "gapRisk": "low | medium | high"
      },
      "priceHistory": [120.40, 121.10, 119.85, 122.20, 123.00, 122.50, 124.10, 125.00, 124.50, 126.00, 125.80, 127.20, 128.00, 127.50, 128.90, 129.50, 130.00, 131.20, 130.80, 132.10],
      "catalysts": [
        { "date": "YYYY-MM-DD or 'TBD'", "event": "specific", "impact": "high|medium|low" }
      ],
      "risks": ["risk 1", "risk 2"]
    }
  ]
}

Exactly 10 picks. Real tickers. Concrete dollar levels. priceHistory should be 20 numbers most-recent-last (use [] if unavailable).`;

  const { parsed, usage } = await callClaude(apiKey, prompt, mode, m.industryTokens, m.industrySearches);

  // Normalize defensively before returning
  return {
    data: {
      industry: parsed?.industry || ind.label,
      industryThesis: parsed?.industryThesis || '',
      industrySmartMoney: parsed?.industrySmartMoney || '',
      picks: normalizePicks(parsed?.picks),
    },
    usage,
  };
}

// ============================================================
// DAILY MOVERS — top 50 stocks by daily momentum, mixed sectors
// ============================================================
export async function fetchDailyMovers(apiKey, { mode }) {
  const m = MODES[mode];
  const today = new Date().toDateString();
  const prompt = `You are a market scanner. Today is ${today}.
Use web_search (max ${Math.max(3, m.regimeSearches)}) for TODAY'S top-moving US-listed stocks across ALL sectors.

Cover a mix of:
- Top % gainers today (high-volume only — skip illiquid penny stocks)
- Top % losers today (potential reversal/short candidates)
- Highest unusual volume (volume vs 20-day avg)
- Stocks with breaking news catalysts in last 24-48hr (earnings, FDA, M&A, AI partnerships, lawsuits, guidance)
- Names with notable analyst actions today

Mix large-cap (>$10B), mid-cap, and high-momentum small-cap. NO penny stocks under $2.

Return ONLY this JSON (no markdown, no preamble):
{
  "asOf": "${new Date().toISOString()}",
  "marketBreath": "1 sentence — advance/decline, breadth tone",
  "movers": [
    {
      "rank": 1,
      "ticker": "SYMBOL",
      "company": "Full Name",
      "sector": "Tech | Financials | Healthcare | Energy | Consumer | Industrials | Materials | Utilities | Real Estate | Communication",
      "currentPrice": 123.45,
      "dailyChangePct": "+8.4%",
      "dailyChangeAbs": "+$9.65",
      "volume": "X.XM (Y× avg)",
      "marketCap": "$XB",
      "moveType": "Gainer | Loser | UnusualVol | NewsCatalyst | AnalystUpgrade | EarningsBeat | EarningsMiss",
      "catalyst": "specific reason it's moving today (1 sentence)",
      "trendScore": 88,
      "momentumLabel": "🔥 strong | ↑ up | → flat | ↓ down | 🧊 weak",
      "shortInterest": "X% of float | unknown",
      "rsi": "value or null",
      "newsHook": "headline if news-driven, else null",
      "priceHistory": [120.4, 121.1, 119.8, 122.2, 123.0, 122.5, 124.1, 125.0, 124.5, 126.0]
    }
  ]
}

Exactly 50 movers. Real tickers. Use real % moves from the actual market today.`;

  const tokenBudget = Math.max(m.industryTokens * 1.5, 16000);
  const { parsed, usage } = await callClaude(apiKey, prompt, mode, Math.floor(tokenBudget), Math.max(3, m.regimeSearches));
  return { data: parsed, usage };
}

// ============================================================
// NEWS PULSE — political / macro / tech briefing
// ============================================================
export async function fetchNewsPulse(apiKey, { mode }) {
  const m = MODES[mode];
  const today = new Date().toDateString();
  const prompt = `You are a markets-focused news analyst. Today is ${today}.

Use web_search (max ${m.regimeSearches}) for THIS WEEK's market-moving news across:
- POLITICAL: tariffs, trade policy, elections, regulatory actions, geopolitical risk (Russia/China/Mideast)
- MACRO: Fed commentary, CPI/jobs/GDP prints, central bank moves, currency moves
- TECH: AI breakthroughs, chip news (NVDA/TSM/AMD/AVGO), big tech earnings/guidance, antitrust
- POLICY: executive orders, congressional bills affecting sectors (energy, healthcare, defense)

Return ONLY this JSON (no markdown, no preamble):
{
  "headline": "1 sentence — the single biggest market-moving theme right now",
  "sentiment": "Risk-On | Risk-Off | Mixed",
  "political": [
    { "title": "specific event/headline", "summary": "1-2 sentences", "tickers": ["AFFECTED", "TICKERS"], "impact": "high|medium|low", "direction": "bullish|bearish|mixed" }
  ],
  "macro": [
    { "title": "specific event", "summary": "1-2 sentences", "tickers": ["TICKERS"], "impact": "high|medium|low", "direction": "bullish|bearish|mixed" }
  ],
  "tech": [
    { "title": "specific event", "summary": "1-2 sentences", "tickers": ["TICKERS"], "impact": "high|medium|low", "direction": "bullish|bearish|mixed" }
  ],
  "policy": [
    { "title": "specific event", "summary": "1-2 sentences", "tickers": ["TICKERS"], "impact": "high|medium|low", "direction": "bullish|bearish|mixed" }
  ],
  "themes": [
    { "theme": "named theme", "rationale": "1 sentence", "longs": ["TICKER"], "shorts": ["TICKER"] }
  ],
  "asOf": "${new Date().toISOString()}"
}

3-5 items per category. Real headlines. Specific tickers.`;

  const { parsed, usage } = await callClaude(apiKey, prompt, mode, m.regimeTokens, m.regimeSearches);
  return { data: parsed, usage };
}

// ============================================================
// TICKER DEEP DIVE — focused research on one symbol
// ============================================================
export async function fetchTickerDeepDive(apiKey, ticker, { mode }) {
  const m = MODES[mode];
  const today = new Date().toDateString();
  const symbol = String(ticker || '').toUpperCase().trim();
  if (!symbol || symbol.length > 10) {
    throw new ApiError(KNOWN_ERROR_KINDS.UNKNOWN, `Invalid ticker: "${ticker}"`);
  }

  const prompt = `You are an equity research analyst. Today is ${today}.
Deep-dive ${symbol}. Use web_search (max ${m.industrySearches}) to gather:
- Latest news (last 7 days) — headlines that moved the stock
- Recent earnings — beat/miss, guidance, analyst reactions
- Smart money: insider Form 4, unusual options, dark pool prints, 13F changes
- Technical setup — current price, key support/resistance, RSI, recent pattern
- Upcoming catalysts (next 30 days)
- Top 3 risks
- Forward outlook — bull case, bear case, base case 6-month target

Return ONLY this JSON (no markdown, no preamble):
{
  "ticker": "${symbol}",
  "company": "Full Name",
  "currentPrice": 123.45,
  "dailyChange": "+X.X%",
  "ytdChange": "+X.X%",
  "marketCap": "$XB",
  "sector": "name",
  "verdict": "Strong Buy | Buy | Hold | Sell",
  "convictionScore": 85,
  "snapshot": "3 sentences — the elevator pitch on this stock RIGHT NOW",
  "recentNews": [
    { "date": "YYYY-MM-DD", "headline": "specific", "impact": "high|medium|low", "direction": "bullish|bearish|neutral" }
  ],
  "earnings": {
    "lastDate": "YYYY-MM-DD", "result": "EPS/Rev vs est", "guidance": "raised|lowered|maintained",
    "nextDate": "YYYY-MM-DD", "expectedMove": "±X%"
  },
  "smartMoney": {
    "darkPoolSentiment": "Bullish|Neutral|Bearish",
    "institutionalFlow": "Net buying|Net selling|Mixed",
    "insiderActivity": "specific names + sizes if available",
    "optionsFlow": "C/P ratio + notable strikes",
    "score": 75
  },
  "technicals": {
    "trend": "label", "keyLevels": "support $X, resistance $Y",
    "rsi": "value", "pattern": "specific", "volume": "above/below avg"
  },
  "catalysts": [
    { "date": "YYYY-MM-DD", "event": "specific", "impact": "high|medium|low" }
  ],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "outlook": {
    "bullCase": "1-2 sentences + price target",
    "bearCase": "1-2 sentences + downside target",
    "baseCase": "1-2 sentences + 6-month target"
  },
  "tradePlan": {
    "entry": "$X-$Y", "stop": "$X (% below)", "target": "$X (% gain)", "horizon": "swing|position|long-term"
  },
  "asOf": "${new Date().toISOString()}"
}

Real numbers. Concrete details.`;

  const { parsed, usage } = await callClaude(apiKey, prompt, mode, Math.min(m.industryTokens, 8000), m.industrySearches);
  return { data: parsed, usage };
}

// ============================================================
// CACHE — regime
// ============================================================
const REGIME_TTL_MS = 5 * 60 * 1000;
export function loadCachedRegime(mode, risk, horizon) {
  try {
    const raw = localStorage.getItem('vstock_regime_cache');
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (c.mode !== mode || c.risk !== risk || c.horizon !== horizon) return null;
    if (Date.now() - c.savedAt > REGIME_TTL_MS) return null;
    return c.data;
  } catch { return null; }
}
export function saveCachedRegime(data, mode, risk, horizon) {
  try {
    localStorage.setItem('vstock_regime_cache', JSON.stringify({
      data, mode, risk, horizon, savedAt: Date.now(),
    }));
  } catch {}
}
