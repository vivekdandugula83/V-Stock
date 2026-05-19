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

// Preferred source priority for web_search grounding.
// The model is directed to prefer these sources for higher reliability,
// and to include the actual URLs it relied on in every response.
export const PREFERRED_SOURCES = {
  primary: [
    { domain: 'sec.gov',                  use: 'SEC EDGAR — 10-K, 10-Q, Form 4 insider, 13F institutional' },
    { domain: 'investor relations pages', use: 'Company IR — earnings transcripts, investor decks' },
  ],
  news: [
    { domain: 'reuters.com',     use: 'Financial news' },
    { domain: 'bloomberg.com',   use: 'Markets, M&A' },
    { domain: 'wsj.com',         use: 'Wall Street Journal' },
    { domain: 'ft.com',          use: 'Financial Times' },
    { domain: 'barrons.com',     use: "Barron's" },
  ],
  fundamentals: [
    { domain: 'stockanalysis.com',  use: 'Historical financials, 5yr CAGR' },
    { domain: 'macrotrends.net',    use: 'Long-term historical data' },
    { domain: 'finviz.com',         use: 'Valuation comps, sector screener' },
    { domain: 'simplywall.st',      use: 'Financial summaries' },
  ],
  insider: [
    { domain: 'openinsider.com', use: 'SEC Form 4 aggregation, cluster buys' },
    { domain: 'finviz.com/insidertrading.ashx', use: 'Insider rollups' },
  ],
  institutional: [
    { domain: 'whalewisdom.com', use: '13F institutional holdings tracking' },
    { domain: 'dataroma.com',    use: 'Super-investor 13F holdings' },
    { domain: 'hedgefollow.com', use: 'Hedge fund positions' },
  ],
  darkPoolFlow: [
    { domain: 'chartexchange.com',   use: 'Dark pool prints, ATS data' },
    { domain: 'squeezemetrics.com',  use: 'DIX, GEX, dark pool indicators' },
    { domain: 'unusualwhales.com',   use: 'Options flow, dark pool sentiment' },
    { domain: 'ortex.com',           use: 'Short interest, days-to-cover' },
  ],
  fallback: [
    { domain: 'finance.yahoo.com', use: 'Price, volume, basic metrics' },
    { domain: 'google.com/finance', use: 'Quick quotes' },
  ],
  avoid: [
    'reddit.com', 'twitter.com', 'x.com', 'seekingalpha.com (paywall, lower quality)',
    'low-quality SEO content farms', 'forums', 'opinion posts from non-credentialed sources',
  ],
};

// Source priority text injected into prompts
const SOURCE_GUIDANCE = `
SOURCE PRIORITY (use these in this order for the highest reliability):

PRIMARY — always prefer:
- SEC EDGAR (sec.gov/edgar) for 10-K, 10-Q, Form 4 (insider transactions), 13F (institutional holdings), 13D/G
- Company investor relations pages for earnings transcripts and decks

NEWS (reputable):
- Reuters, Bloomberg, WSJ, FT, Barron's

FUNDAMENTALS aggregators:
- stockanalysis.com, macrotrends.net for historical financials and 5-year CAGR
- finviz.com for valuation comps

INSIDER ACTIVITY:
- openinsider.com (SEC Form 4 aggregation, cluster buys are most predictive)
- finviz.com/insidertrading.ashx

INSTITUTIONAL POSITIONING:
- whalewisdom.com, dataroma.com, hedgefollow.com for 13F filings

DARK POOL / SMART MONEY FLOW (when available):
- chartexchange.com, squeezemetrics.com for dark pool prints and DIX/GEX
- unusualwhales.com for options flow and dark pool sentiment
- ortex.com for short interest and days-to-cover

FALLBACK only:
- Yahoo Finance, Google Finance for current price/volume

AVOID: Reddit, Twitter/X, low-quality SEO content, forums, paywalled aggregators without primary data.

For EVERY pick, include a "sources" array with 3-6 actual URLs you used. Cite primary sources when possible.
`;

export function estimateCost(modeKey, industryCount) {
  const m = MODES[modeKey];
  if (!m) return 0;
  // Calls: 1 regime + N sector specialists
  const totalCalls = 1 + industryCount;
  const totalSearches = m.regimeSearches + (industryCount * m.industrySearches);
  const searchCost = totalSearches * 0.01;
  const avgInputPerCall = 3500 + (m.industrySearches * 4500);
  const avgOutputPerCall = ((m.industryTokens * industryCount) + m.regimeTokens) / totalCalls / 2;
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
    // Capture retry-after header for the queue to honor
    const retryAfterHeader = res.headers.get('retry-after');
    const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : null;
    throw new ApiError(kind, message, {
      status: res.status,
      body: bodyText,
      retryAfter: Number.isFinite(retryAfterMs) ? retryAfterMs : null,
    });
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new ApiError(KNOWN_ERROR_KINDS.PARSE, 'Response was not valid JSON', err.message);
  }

  const rawText = (data.content || [])
    .filter((b) => b?.type === 'text')
    .map((b) => b.text || '')
    .join('\n');

  // Strip grounding citation tags from web search (these are NOT part of the JSON
  // but the model embeds them in string values, e.g. "P/E is 12<cite ...>4</cite>".
  // Without this scrub, citation tags appear as visible mangled text in the UI.
  const text = stripCitations(rawText);

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

  // Defense in depth — also strip any residual citation fragments from every string
  // inside the parsed object (in case malformed tags survived JSON parsing).
  parsed = deepStripCitations(parsed);

  return { parsed, usage: data.usage || {} };
}

// Strip Claude grounding citation tags. Defensive — handles multiple variants:
//   <cite index="...">text</cite>
//   text
//   raw fragments like 'ite index="2-1">'  (from broken/escaped tags)
//   partial tags during streaming (open tag at end of buffer, no closing >)
export function stripCitations(text) {
  if (typeof text !== 'string') return text;
  return text
    // Full well-formed tags — keep inner content, drop tags
    .replace(/<\/?(?:antml:)?cite[^>]*>/gi, '')
    // Partial open tag at the end of a streaming buffer (no closing `>` yet)
    .replace(/<\/?(?:antml:)?cite\b[^>]*$/gi, '')
    // Half-broken fragments left over from escaping/rendering bugs
    .replace(/\bite\s+index\s*=\s*"[^"]*"\s*>/gi, '')
    .replace(/<\/?\s*ite[^>]*>/gi, '')
    // HTML-entity-escaped variants
    .replace(/&lt;\/?(?:antml:)?cite[^&]*&gt;/gi, '');
}

function deepStripCitations(obj) {
  if (obj == null) return obj;
  if (typeof obj === 'string') return stripCitations(obj);
  if (Array.isArray(obj)) return obj.map(deepStripCitations);
  if (typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = deepStripCitations(obj[k]);
    return out;
  }
  return obj;
}

// Defensive normalizer — guarantees every pick has the fields the UI expects
// Composite scoring weights (V-Stock value model)
export const SCORE_WEIGHTS = {
  valuation: 0.40,
  growth: 0.30,
  insider: 0.15,
  volume: 0.15,
};

export function computeCompositeScore(pick) {
  const v = pick?.valuation?.score || 0;
  const g = pick?.growth?.score || 0;
  const i = pick?.insiderActivity?.score || 0;
  const vol = pick?.volume?.score || 0;
  const composite = v * SCORE_WEIGHTS.valuation
                  + g * SCORE_WEIGHTS.growth
                  + i * SCORE_WEIGHTS.insider
                  + vol * SCORE_WEIGHTS.volume;
  return Math.round(Math.max(0, Math.min(100, composite)));
}

export function verdictFor(score) {
  const s = Number(score) || 0;
  if (s >= 80) return 'Deep Value';
  if (s >= 65) return 'Undervalued';
  if (s >= 50) return 'Fair Value';
  return 'Overvalued';
}

function normalizePicks(rawPicks) {
  if (!Array.isArray(rawPicks)) return [];
  return rawPicks
    .map((p, i) => {
      const valuation = {
        pe: p?.valuation?.pe ?? null,
        forwardPe: p?.valuation?.forwardPe ?? null,
        peg: p?.valuation?.peg ?? null,
        priceBook: p?.valuation?.priceBook ?? null,
        priceSales: p?.valuation?.priceSales ?? null,
        priceFcf: p?.valuation?.priceFcf ?? null,
        evToEbitda: p?.valuation?.evToEbitda ?? null,
        earningsYield: p?.valuation?.earningsYield || null,
        dividendYield: p?.valuation?.dividendYield || null,
        vsSectorMedian: p?.valuation?.vsSectorMedian || null,
        score: clampScore(p?.valuation?.score),
      };
      const growth = {
        revenueGrowthYoY: p?.growth?.revenueGrowthYoY || null,
        revenue5yrCagr: p?.growth?.revenue5yrCagr || null,
        epsGrowthYoY: p?.growth?.epsGrowthYoY || null,
        eps5yrCagr: p?.growth?.eps5yrCagr || null,
        operatingMargin: p?.growth?.operatingMargin || null,
        netMargin: p?.growth?.netMargin || null,
        fcfMargin: p?.growth?.fcfMargin || null,
        roe: p?.growth?.roe || null,
        roic: p?.growth?.roic || null,
        piotroskiScore: p?.growth?.piotroskiScore || null,
        score: clampScore(p?.growth?.score),
      };
      const insiderActivity = {
        last6moDirection: p?.insiderActivity?.last6moDirection || 'No activity',
        totalBuys: Number(p?.insiderActivity?.totalBuys) || 0,
        totalSells: Number(p?.insiderActivity?.totalSells) || 0,
        totalBuyValue: p?.insiderActivity?.totalBuyValue || null,
        totalSellValue: p?.insiderActivity?.totalSellValue || null,
        largestBuy: p?.insiderActivity?.largestBuy || null,
        notableNames: Array.isArray(p?.insiderActivity?.notableNames) ? p.insiderActivity.notableNames : [],
        score: clampScore(p?.insiderActivity?.score),
      };
      const volume = {
        avgDaily20d: p?.volume?.avgDaily20d || null,
        currentVsAvg: p?.volume?.currentVsAvg || null,
        trend: p?.volume?.trend || 'flat',
        liquidityGrade: p?.volume?.liquidityGrade || 'C',
        score: clampScore(p?.volume?.score),
      };
      const marketSentiment = p?.marketSentiment ? {
        analystRating: p.marketSentiment.analystRating || null,
        analystBreakdown: p.marketSentiment.analystBreakdown || null,
        avgPriceTarget: p.marketSentiment.avgPriceTarget || null,
        upsideToTarget: p.marketSentiment.upsideToTarget || null,
        recentRevisions: p.marketSentiment.recentRevisions || null,
        beta: p.marketSentiment.beta || null,
        fiftyTwoWeekPosition: p.marketSentiment.fiftyTwoWeekPosition || null,
        daysToNextEarnings: p.marketSentiment.daysToNextEarnings != null ? Number(p.marketSentiment.daysToNextEarnings) : null,
      } : null;
      const financialStrength = p?.financialStrength ? {
        debtToEquity: p.financialStrength.debtToEquity || null,
        currentRatio: p.financialStrength.currentRatio || null,
        netDebtToEbitda: p.financialStrength.netDebtToEbitda || null,
        altmanZScore: p.financialStrength.altmanZScore || null,
        interestCoverage: p.financialStrength.interestCoverage || null,
        creditRating: p.financialStrength.creditRating || null,
        fcfAnnual: p.financialStrength.fcfAnnual || null,
        cashOnHand: p.financialStrength.cashOnHand || null,
      } : null;
      const institutional = p?.institutional ? {
        darkPoolSentiment: p.institutional.darkPoolSentiment || 'Unknown',
        institutionalFlow: p.institutional.institutionalFlow || 'Unknown',
        notable13fChanges: p.institutional.notable13fChanges || null,
        shortInterest: p.institutional.shortInterest || null,
        optionsFlow: p.institutional.optionsFlow || null,
        topHolders: Array.isArray(p.institutional.topHolders) ? p.institutional.topHolders : [],
        dataAvailability: p.institutional.dataAvailability || 'Limited',
      } : null;
      const sources = Array.isArray(p?.sources)
        ? p.sources.filter((s) => typeof s === 'string' && s.startsWith('http')).slice(0, 8)
        : [];
      const catalysts = Array.isArray(p?.catalysts) ? p.catalysts.slice(0, 5) : [];
      const recommendation = p?.recommendation || deriveRec(p?.verdict);
      const prediction = p?.prediction ? {
        target12mo: p.prediction.target12mo || null,
        targetLow: p.prediction.targetLow || null,
        targetHigh: p.prediction.targetHigh || null,
        upsidePct: p.prediction.upsidePct || null,
        horizon: p.prediction.horizon || '12 months',
        confidence: p.prediction.confidence || 'Medium',
        rationale: p.prediction.rationale || null,
      } : null;
      const normalized = {
        rank: p?.rank ?? (i + 1),
        ticker: p?.ticker || '?',
        company: p?.company || '',
        subIndustry: p?.subIndustry || '',
        currentPrice: typeof p?.currentPrice === 'number' ? p.currentPrice : null,
        marketCap: p?.marketCap || null,
        valuation,
        growth,
        insiderActivity,
        volume,
        marketSentiment,
        financialStrength,
        institutional,
        thesis: p?.thesis || '',
        recommendation,
        recommendationReason: p?.recommendationReason || null,
        prediction,
        catalysts,
        risks: Array.isArray(p?.risks) ? p.risks : [],
        sources,
        priceHistory: Array.isArray(p?.priceHistory)
          ? p.priceHistory.filter((n) => typeof n === 'number' && !isNaN(n))
          : [],
      };
      // Use model's compositeScore if it looks reasonable, else compute client-side
      const modelComposite = clampScore(p?.compositeScore);
      const computed = computeCompositeScore(normalized);
      normalized.compositeScore = modelComposite > 0 ? modelComposite : computed;
      normalized.verdict = p?.verdict || verdictFor(normalized.compositeScore);
      return normalized;
    })
    .sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

function clampScore(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

// Derive a recommendation from verdict if model didn't supply one
function deriveRec(verdict) {
  const v = String(verdict || '').toLowerCase();
  if (v.includes('deep value') || v.includes('strong setup') || v.includes('prime setup') || v.includes('income anchor')) return 'Strong Buy';
  if (v.includes('undervalued') || v === 'setup' || v.includes('solid setup') || v.includes('stable yield')) return 'Buy';
  if (v.includes('fair') || v.includes('watch')) return 'Hold';
  if (v.includes('overvalued') || v.includes('avoid') || v.includes('yield trap')) return 'Sell';
  return 'Hold';
}

export async function fetchMarketRegime(apiKey, { horizon, risk, mode }) {
  const m = MODES[mode];
  const today = new Date().toDateString();
  const prompt = `You are a value-investing market strategist. Today is ${today}.

Use web_search (max ${m.regimeSearches}) for current market valuation context:
- S&P 500 trailing P/E and forward P/E (vs 10/20-year averages)
- Shiller CAPE ratio
- Sector P/E dispersion — which sectors are cheap vs expensive
- 10-year Treasury yield (affects equity risk premium)
- Aggregate insider buying/selling trends across S&P (Form 4 net flow)
- Current narratives driving over/undervaluation

${SOURCE_GUIDANCE}

Return ONLY this JSON (no markdown, no preamble):
{
  "marketValuation": "Expensive | Fair | Cheap | Mixed",
  "valuationReason": "2-3 sentences with concrete numbers",
  "spxPe": "trailing X.X (X-yr avg Y.Y)",
  "spxForwardPe": "X.X",
  "shillerCape": "XX.X (avg XX.X)",
  "tenYear": "X.XX%",
  "equityRiskPremium": "X.XX% — narrow | wide | normal",
  "sectorValuation": [
    { "sector": "Tech", "pe": "X.X", "vsHistorical": "+X% premium or -X% discount", "rating": "Cheap|Fair|Expensive" }
  ],
  "insiderAggregate": "1 sentence on aggregate insider buy/sell ratio in S&P last 30 days",
  "valueOpportunities": ["sector or theme — 1 sentence why undervalued"],
  "sources": ["https://www.sec.gov/...", "https://stockanalysis.com/...", "https://openinsider.com/..."],
  "asOf": "${new Date().toISOString()}"
}

Real numbers. Specific sectors. The "sources" array must contain 3-5 actual URLs you used.`;

  const { parsed, usage } = await callClaude(apiKey, prompt, mode, m.regimeTokens, m.regimeSearches);
  return { data: parsed, usage };
}

export async function fetchIndustryPicks(apiKey, industryId, { horizon, risk, regime, mode }) {
  const ind = INDUSTRIES.find((i) => i.id === industryId);
  if (!ind) throw new ApiError(KNOWN_ERROR_KINDS.UNKNOWN, `Unknown industry: ${industryId}`);
  const m = MODES[mode];
  const today = new Date().toDateString();

  const prompt = `You are a fundamental value-investing analyst covering ${ind.label}. Today is ${today}.

Use web_search (max ${m.industrySearches}) to find the TEN most UNDERVALUED stocks in ${ind.label} using fundamental analysis.

${SOURCE_GUIDANCE}

Focus on (think like a value investor — Buffett/Graham/Lynch lens):

VALUATION:
- Trailing P/E (TTM) — vs sector median, vs 5-year average
- Forward P/E — low forward P/E vs current P/E suggests earnings growth ahead
- PEG ratio — P/E ÷ growth rate; <1 is undervalued growth (Lynch)
- Price/Book — quality businesses can sustain higher P/B; <1.5 is Graham defensive
- Price/Sales — useful when earnings are volatile/distorted
- Price/Free Cash Flow (Buffett's preferred — earnings can be manipulated, FCF cannot)
- EV/EBITDA — capital-structure neutral
- Earnings Yield (E/P, inverse of P/E) — compare directly to bond yields
- Dividend Yield — if applicable

GROWTH & QUALITY:
- Revenue growth YoY and 5-year CAGR (consistency matters)
- EPS growth YoY and 5-year CAGR
- Operating margin, net margin, FCF margin (capital efficiency)
- Return on Equity (ROE), Return on Invested Capital (ROIC)
- Piotroski F-Score (0-9) — composite of 9 financial-health tests; 8-9 = strong, 0-3 = weak

INSIDER ACTIVITY:
- SEC Form 4 filings — last 6 months
- Cluster buys (multiple insiders buying) are strongest signal
- CEO/CFO purchases > director purchases > 10% holder purchases

VOLUME / LIQUIDITY:
- 20-day average volume, current volume vs avg
- Accumulation (rising on volume) vs distribution (falling on volume)

MARKET SENTIMENT:
- Analyst rating consensus and breakdown
- Average price target and implied upside
- Recent estimate revisions trend
- Beta (volatility vs market)
- 52-week range position
- Days to next earnings

FINANCIAL STRENGTH (avoid value traps):
- Debt/Equity, Current Ratio
- Net Debt / EBITDA — leverage
- Altman Z-Score — bankruptcy risk (>3.0 safe, <1.8 distressed)
- Interest Coverage Ratio
- Credit rating
- Free Cash Flow

INSTITUTIONAL / SMART MONEY (informational, not scored):
- 13F changes from major funds, dark pool sentiment, short interest, options flow

EXCLUDE:
- Value traps: declining revenue, falling earnings, weakening margins
- Pre-revenue or chronically negative earnings companies
- Illiquid micro-caps (< $500M market cap or < 200K daily volume)
- Pure meme/momentum plays with no fundamental support

Return ONLY this JSON (no markdown, no preamble):
{
  "industry": "${ind.label}",
  "industryValuation": "2-3 sentences on sector valuation — is the sector cheap or expensive vs history? P/E range?",
  "sectorMedianPe": 18.5,
  "industrySources": ["https://...", "https://..."],
  "picks": [
    {
      "rank": 1,
      "ticker": "SYMBOL",
      "company": "Full Name",
      "subIndustry": "specific sub-industry",
      "currentPrice": 123.45,
      "marketCap": "$XB",

      "valuation": {
        "pe": 12.4,
        "forwardPe": 10.8,
        "peg": 0.9,
        "priceBook": 2.1,
        "priceSales": 1.8,
        "priceFcf": 14.2,
        "evToEbitda": 8.5,
        "earningsYield": "8.1%",
        "dividendYield": "2.3%",
        "vsSectorMedian": "-32%",
        "score": 85
      },

      "growth": {
        "revenueGrowthYoY": "+14%",
        "revenue5yrCagr": "11.2%",
        "epsGrowthYoY": "+22%",
        "eps5yrCagr": "15.0%",
        "operatingMargin": "22%",
        "netMargin": "18%",
        "fcfMargin": "15%",
        "roe": "16%",
        "roic": "12%",
        "piotroskiScore": "8/9",
        "score": 78
      },

      "insiderActivity": {
        "last6moDirection": "Net buying" | "Net selling" | "Mixed" | "No activity",
        "totalBuys": 3,
        "totalSells": 0,
        "totalBuyValue": "$2.5M",
        "totalSellValue": "$0",
        "largestBuy": "CEO John Smith purchased $1.2M on 2025-MM-DD",
        "notableNames": ["CEO John Smith", "CFO Jane Doe"],
        "score": 88
      },

      "volume": {
        "avgDaily20d": "2.1M shares",
        "currentVsAvg": "1.33x avg",
        "trend": "rising" | "flat" | "falling",
        "liquidityGrade": "A" | "B" | "C" | "D",
        "score": 75
      },

      "marketSentiment": {
        "analystRating": "Buy | Strong Buy | Hold | Sell",
        "analystBreakdown": "8 buy / 3 hold / 0 sell",
        "avgPriceTarget": "$145",
        "upsideToTarget": "+15%",
        "recentRevisions": "Rising | Falling | Stable",
        "beta": "1.2",
        "fiftyTwoWeekPosition": "65% (range $90-$140)",
        "daysToNextEarnings": 23
      },

      "financialStrength": {
        "debtToEquity": "0.45",
        "currentRatio": "2.1",
        "netDebtToEbitda": "1.2",
        "altmanZScore": "3.8 (safe)",
        "interestCoverage": "12.5x",
        "creditRating": "BBB+",
        "fcfAnnual": "$4.5B"
      },

      "institutional": {
        "darkPoolSentiment": "Bullish | Neutral | Bearish | Unknown",
        "institutionalFlow": "Net buying | Net selling | Mixed | Unknown",
        "notable13fChanges": "1 sentence on notable fund moves last quarter, or 'No notable changes' / 'No data'",
        "shortInterest": "X.X% of float, X days to cover (trend: rising/falling/stable)" ,
        "optionsFlow": "C/P ratio + notable unusual activity, or 'No significant flow'",
        "dataAvailability": "Strong | Partial | Limited"
      },

      "compositeScore": 82,
      "verdict": "Deep Value" | "Undervalued" | "Fair Value" | "Overvalued",
      "recommendation": "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell",
      "recommendationReason": "1 sentence explaining the rec based on the analysis",

      "prediction": {
        "target12mo": "$145",
        "targetLow": "$130",
        "targetHigh": "$165",
        "upsidePct": "+18%",
        "horizon": "12 months",
        "confidence": "High" | "Medium" | "Low",
        "rationale": "1-2 sentences: what gets the stock to the target — P/E re-rating, earnings growth, margin expansion, etc"
      },

      "thesis": "3-4 sentences: WHY this is undervalued. What is the market missing? What catalyst could re-rate the valuation? Reference specific numbers.",

      "catalysts": [
        { "date": "YYYY-MM-DD or 'TBD'", "event": "specific event", "impact": "high|medium|low" }
      ],

      "risks": ["specific risk 1", "specific risk 2", "specific risk 3"],

      "sources": [
        "https://www.sec.gov/...",
        "https://stockanalysis.com/...",
        "https://openinsider.com/..."
      ],

      "priceHistory": [120.40, 121.10, 119.85, 122.20, 123.00, 122.50, 124.10, 125.00, 124.50, 126.00, 125.80, 127.20, 128.00, 127.50, 128.90, 129.50, 130.00, 131.20, 130.80, 132.10]
    }
  ]
}

CRITICAL:
- Use REAL trailing TTM P/E and forward P/E from latest filings/consensus estimates
- Insider data must come from actual SEC Form 4 filings (search sec.gov/edgar or openinsider.com)
- The "sources" array MUST contain actual URLs you used during web_search — at least 3 per pick
- Each score 0-100. Composite = valuation × 0.40 + growth × 0.30 + insider × 0.15 + volume × 0.15 (institutional is informational only, NOT scored into composite)
- Verdict: ≥80 Deep Value; 65-79 Undervalued; 50-64 Fair; <50 Overvalued
- Recommendation mapping: Deep Value → Strong Buy or Buy · Undervalued → Buy · Fair → Hold · Overvalued → Sell or Strong Sell. The "recommendation" should align with verdict and your thesis.
- For "prediction.target12mo", base it on realistic P/E re-rating + projected earnings. Be conservative — typical 12mo upside in value names is 10-30%. For deep value with strong catalysts, 30-50%. Be honest.
- Confidence: High = clear catalyst + strong moat + insider buying; Medium = decent setup; Low = speculative.
- Rank picks by compositeScore descending
- Exactly 10 picks. priceHistory 20 numbers most-recent-last (use [] if unavailable).
- For "institutional" — if data is paywalled or unavailable, set dataAvailability="Limited" and use "No data" / "Unknown" rather than guessing.`;

  const { parsed, usage } = await callClaude(apiKey, prompt, mode, m.industryTokens, m.industrySearches);

  return {
    data: {
      industry: parsed?.industry || ind.label,
      industryValuation: parsed?.industryValuation || '',
      sectorMedianPe: parsed?.sectorMedianPe || null,
      industrySources: Array.isArray(parsed?.industrySources)
        ? parsed.industrySources.filter((s) => typeof s === 'string' && s.startsWith('http')).slice(0, 6)
        : [],
      picks: normalizePicks(parsed?.picks),
    },
    usage,
  };
}

// ============================================================
// CATEGORY DISPATCHER — ONE call per category returns 10 picks total
// All categories share the same 4-bucket scoring (Valuation × 40% +
// Growth × 30% + Insider × 15% + Volume × 15%). Different categories
// differ only in stock selection criteria.
// ============================================================
import { CATEGORIES, buildCategoryPrompt, normalizeCategoryPicks } from './strategies.js';

export async function fetchCategoryPicks(apiKey, categoryId, { mode }) {
  const cat = CATEGORIES[categoryId];
  if (!cat) throw new ApiError(KNOWN_ERROR_KINDS.UNKNOWN, `Unknown category: ${categoryId}`);
  const m = MODES[mode];
  const today = new Date().toDateString();
  // Each category uses a bit more search budget since we're scanning ALL sectors at once
  const maxSearches = Math.max(m.industrySearches + 1, 4);

  const prompt = buildCategoryPrompt(categoryId, {
    today,
    maxSearches,
    sourceGuidance: SOURCE_GUIDANCE,
  });

  const tokenBudget = Math.max(m.industryTokens, 6000); // Need more room for 10 picks + recommendation + prediction
  const { parsed, usage } = await callClaude(apiKey, prompt, mode, tokenBudget, maxSearches);

  return {
    data: {
      category: parsed?.category || cat.label,
      categoryNotes: parsed?.categoryNotes || '',
      sources: Array.isArray(parsed?.sources)
        ? parsed.sources.filter((u) => typeof u === 'string' && u.startsWith('http')).slice(0, 8)
        : [],
      picks: normalizeCategoryPicks(categoryId, parsed?.picks),
    },
    usage,
  };
}

// Legacy compatibility — keep fetchStrategyPicks as alias of fetchCategoryPicks
// (App.jsx old code may still reference it during refactor; remove later)
export const fetchStrategyPicks = (apiKey, categoryId, _industryId, opts) =>
  fetchCategoryPicks(apiKey, categoryId, opts);

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

  const prompt = `You are a value-investing analyst. Today is ${today}.
Deep-dive ${symbol} as a long-term investment. Use web_search (max ${m.industrySearches}) to gather:
- Trailing P/E, forward P/E, PEG, P/B, EV/EBITDA — vs sector medians
- Revenue growth YoY and 5-year CAGR
- EPS growth YoY and 5-year CAGR
- Operating margin, net margin, ROE, ROIC trends
- Recent insider buying/selling from SEC Form 4 filings (last 6 months) — name buyers, sizes, dates
- Volume profile — 20-day avg, accumulation/distribution
- Institutional / smart money: notable 13F changes, dark pool sentiment, short interest, options flow
- Latest earnings — beat/miss, guidance direction
- Balance sheet strength (debt/equity, FCF)
- Bull case, bear case, base case 12-month target
- Top 3 risks

${SOURCE_GUIDANCE}

Return ONLY this JSON (no markdown, no preamble):
{
  "ticker": "${symbol}",
  "company": "Full Name",
  "currentPrice": 123.45,
  "marketCap": "$XB",
  "sector": "name",

  "valuation": {
    "pe": 12.4,
    "forwardPe": 10.8,
    "peg": 0.9,
    "priceBook": 2.1,
    "priceSales": 1.8,
    "priceFcf": 14.2,
    "evToEbitda": 8.5,
    "earningsYield": "8.1%",
    "dividendYield": "X.X%",
    "vsSectorMedianPe": "-32%",
    "score": 85
  },

  "growth": {
    "revenueGrowthYoY": "+14%",
    "revenue5yrCagr": "11.2%",
    "epsGrowthYoY": "+22%",
    "eps5yrCagr": "15%",
    "operatingMargin": "22%",
    "netMargin": "18%",
    "fcfMargin": "15%",
    "roe": "16%",
    "roic": "12%",
    "fcfGrowth": "+18%",
    "piotroskiScore": "8/9",
    "score": 78
  },

  "insiderActivity": {
    "last6moDirection": "Net buying | Net selling | Mixed | No activity",
    "totalBuys": 3,
    "totalSells": 0,
    "totalBuyValue": "$X",
    "totalSellValue": "$X",
    "transactions": [
      { "date": "YYYY-MM-DD", "name": "Name (Title)", "type": "Buy|Sell", "shares": "X", "value": "$X" }
    ],
    "score": 88
  },

  "volume": {
    "avgDaily20d": "X.XM",
    "currentVsAvg": "X.XXx",
    "trend": "rising|flat|falling",
    "liquidityGrade": "A|B|C|D",
    "score": 75
  },

  "marketSentiment": {
    "analystRating": "Buy | Strong Buy | Hold | Sell",
    "analystBreakdown": "X buy / X hold / X sell",
    "avgPriceTarget": "$X",
    "upsideToTarget": "+X%",
    "recentRevisions": "Rising | Falling | Stable",
    "beta": "X.X",
    "fiftyTwoWeekPosition": "X% (range $X-$Y)",
    "daysToNextEarnings": 23
  },

  "financialStrength": {
    "debtToEquity": "X.XX",
    "currentRatio": "X.X",
    "netDebtToEbitda": "X.X",
    "altmanZScore": "X.X (safe|grey|distressed)",
    "interestCoverage": "X.Xx",
    "creditRating": "AA|A|BBB|BB|junk|N/A",
    "fcfAnnual": "$X annual",
    "cashOnHand": "$X"
  },

  "institutional": {
    "darkPoolSentiment": "Bullish | Neutral | Bearish | Unknown",
    "institutionalFlow": "Net buying | Net selling | Mixed | Unknown",
    "notable13fChanges": "Specific funds + size + direction last quarter, or 'No notable changes'",
    "shortInterest": "X.X% of float, X days to cover (trend)",
    "optionsFlow": "C/P ratio + notable unusual activity, or 'No significant flow'",
    "topHolders": ["Fund 1 (X% stake)", "Fund 2 (X% stake)"],
    "dataAvailability": "Strong | Partial | Limited"
  },

  "earnings": {
    "lastDate": "YYYY-MM-DD",
    "result": "EPS $X vs est $Y, Rev $X vs est $Y",
    "guidance": "raised|lowered|maintained",
    "nextDate": "YYYY-MM-DD"
  },

  "compositeScore": 82,
  "verdict": "Deep Value | Undervalued | Fair Value | Overvalued",
  "snapshot": "3 sentences — the investment elevator pitch. WHY undervalued, what's the catalyst, what's the upside.",

  "outlook": {
    "bullCase": "1-2 sentences + 12-month upside target",
    "bearCase": "1-2 sentences + downside target",
    "baseCase": "1-2 sentences + 12-month base target"
  },

  "risks": ["specific risk 1", "specific risk 2", "specific risk 3"],

  "sources": [
    "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=...",
    "https://www.sec.gov/Archives/edgar/data/.../form4.xml",
    "https://openinsider.com/...",
    "https://stockanalysis.com/stocks/${symbol}/...",
    "https://whalewisdom.com/stock/..."
  ],

  "asOf": "${new Date().toISOString()}"
}

Real numbers from latest filings. Real SEC Form 4 names if available.
"sources" array MUST contain 5-8 actual URLs you used. Prefer SEC EDGAR and primary sources.
For "institutional" — if data is paywalled or genuinely unavailable, set dataAvailability="Limited" with "Unknown" values rather than guessing.`;

  const { parsed, usage } = await callClaude(apiKey, prompt, mode, Math.min(m.industryTokens, 8000), m.industrySearches);
  return { data: parsed, usage };
}

// ============================================================
// CACHE — regime
// ============================================================
const REGIME_TTL_MS = 5 * 60 * 1000;
const REGIME_CACHE_KEY = 'vstock_regime_cache_v3';
export function loadCachedRegime(mode, risk, horizon) {
  try {
    const raw = localStorage.getItem(REGIME_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (c.mode !== mode || c.risk !== risk || c.horizon !== horizon) return null;
    if (Date.now() - c.savedAt > REGIME_TTL_MS) return null;
    return c.data;
  } catch { return null; }
}
export function saveCachedRegime(data, mode, risk, horizon) {
  try {
    localStorage.setItem(REGIME_CACHE_KEY, JSON.stringify({
      data, mode, risk, horizon, savedAt: Date.now(),
    }));
  } catch {}
}
