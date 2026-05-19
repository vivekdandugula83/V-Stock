// V-Stock category configuration — 4 categories, 10 picks each.
// Every category uses the SAME 4-bucket scoring (Valuation 40% + Growth 30% + Insider 15% + Volume 15%).
// All categories return the SAME fundamental shape. They differ in:
//   - prompt focus (what stocks to look for)
//   - tradePlan fields (entry/stop/target for daytrade/swing; missing for longterm/dividend)
//   - dividendInfo block (only for dividend category)
//   - prediction.horizon (3 days vs 12 months)

export const CATEGORIES = {
  longterm: {
    id: 'longterm',
    label: 'Long-term Value',
    short: 'Long-term',
    horizon: '1-3 years',
    icon: 'TrendingUp',
    color: '#fbbf24',
    description: 'Quality businesses at fair prices · Buffett/Lynch lens',
  },
  swing: {
    id: 'swing',
    label: 'Swing Trade',
    short: 'Swing',
    horizon: '2-4 weeks',
    icon: 'Activity',
    color: '#22d3ee',
    description: 'Earnings setups + technical breakouts in fundamentally sound stocks',
  },
  daytrade: {
    id: 'daytrade',
    label: 'Day Trade',
    short: 'Day',
    horizon: '1-5 days',
    icon: 'Zap',
    color: '#f87171',
    description: 'Momentum + volume setups, filtered by liquidity & quality',
  },
  dividend: {
    id: 'dividend',
    label: 'Dividend / Income',
    short: 'Dividend',
    horizon: 'Long-term hold',
    icon: 'DollarSign',
    color: '#34d399',
    description: 'High-yield + safe payout + dividend growth track record',
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES);

// ============================================================
// PROMPT BUILDERS — every category returns a pick with the same fundamental
// shape, plus category-specific tradePlan / dividendInfo / prediction.horizon.
// ============================================================

const COMMON_RULES = `
SCORING MODEL (every pick — same model for every category):
- Each of 4 buckets scored 0-100
- compositeScore = valuation × 0.40 + growth × 0.30 + insider × 0.15 + volume × 0.15
- Verdict + recommendation derive from compositeScore + risk profile

REQUIRED FUNDAMENTAL DATA (every pick MUST include):
- P/E (TTM), Forward P/E, PEG
- Revenue growth YoY + 5-year CAGR
- EPS growth YoY + 5-year CAGR
- SEC Form 4 insider activity (last 6 months) — real names, real dollar amounts when available
- Volume profile

SOURCES (MANDATORY — every pick + the run):
- "sources" array per pick: 4-7 REAL URLs you visited via web_search
- Prefer SEC EDGAR (sec.gov/edgar), openinsider.com, stockanalysis.com, macrotrends.net, finviz.com
- News: Reuters, Bloomberg, WSJ, Barron's
- AVOID: Reddit, Twitter, opinion blogs

OUTPUT:
- Return ONLY a JSON object. No markdown, no preamble.
- NEVER include <cite>, , or any citation markup in any string field.
- If unsure of a number, use "N/A" rather than fabricating.
`;

function commonPickShape({ tradePlanFields, dividendInfoFields, predictionHorizon, verdictOptions }) {
  return `{
  "ticker": "SYMBOL",
  "company": "Full Name",
  "sector": "Technology | Financials | Healthcare | Energy | Consumer Disc | Consumer Stap | Industrials | Materials | Utilities | Real Estate | Communication",
  "currentPrice": 123.45,
  "marketCap": "$XB",

  "valuation": {
    "pe": 12.4,
    "forwardPe": 10.8,
    "peg": 0.9,
    "priceBook": 2.1,
    "priceSales": 1.8,
    "evToEbitda": 8.5,
    "earningsYield": "8.1%",
    "dividendYield": "2.3%",
    "vsSectorMedian": "-32% vs sector P/E",
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

  "insider": {
    "last6moDirection": "Net buying | Net selling | Mixed | No activity",
    "totalBuys": 3,
    "totalSells": 0,
    "totalBuyValue": "$2.5M",
    "totalSellValue": "$0",
    "largestBuy": "CEO Jane Smith purchased $1.2M on YYYY-MM-DD",
    "notableNames": ["CEO Jane Smith", "CFO John Doe"],
    "score": 88
  },

  "volume": {
    "avgDaily20d": "2.1M shares",
    "currentVsAvg": "1.33x avg",
    "trend": "rising | flat | falling",
    "liquidityGrade": "A | B | C | D",
    "score": 75
  },

  "compositeScore": 82,
  "verdict": "${verdictOptions}",
  "verdictColor": "emerald | cyan | amber | rose",
  "recommendation": "STRONG BUY | BUY | HOLD | AVOID",
  "conviction": "high | medium | low",

  ${tradePlanFields ? `"tradePlan": {
    ${tradePlanFields}
  },` : ''}

  ${dividendInfoFields ? `"dividendInfo": {
    ${dividendInfoFields}
  },` : ''}

  "prediction": {
    "target": "$X (price target)",
    "expectedReturn": "+X.X%",
    "upside": "+X.X% (bull case)",
    "downside": "-X.X% (bear case)",
    "keyCatalyst": "1 sentence: what could move this",
    "horizon": "${predictionHorizon}"
  },

  "thesis": "3-4 sentences: WHY this stock NOW. Specific numbers + specific catalyst.",

  "risks": ["specific risk 1", "specific risk 2", "specific risk 3"],

  "sources": [
    "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=...",
    "https://openinsider.com/...",
    "https://stockanalysis.com/stocks/SYMBOL/...",
    "https://..."
  ],

  "priceHistory": [120.40, 121.10, 119.85, 122.20, 123.00, 122.50, 124.10, 125.00, 124.50, 126.00, 125.80, 127.20, 128.00, 127.50, 128.90, 129.50, 130.00, 131.20, 130.80, 132.10]
}`;
}

export function buildCategoryPrompt(categoryId, { today, maxSearches, sourceGuidance }) {
  const cat = CATEGORIES[categoryId];
  if (!cat) throw new Error(`Unknown category: ${categoryId}`);
  const builder = PROMPT_BUILDERS[categoryId];
  if (!builder) throw new Error(`No prompt builder: ${categoryId}`);
  return builder(today, maxSearches, sourceGuidance);
}

const PROMPT_BUILDERS = {
  longterm: (today, maxSearches, sourceGuidance) => `You are a value-investing analyst. Today is ${today}.

Find TEN best LONG-TERM VALUE PICKS in US public markets (1-3 year horizon).

Search criteria (web_search max ${maxSearches}):
- Fundamentally sound businesses trading at reasonable P/E vs sector
- Forward P/E < trailing P/E suggesting earnings growth
- Consistent revenue & EPS growth + 5-yr CAGR
- Quality margins, healthy ROE/ROIC
- Recent SEC Form 4 insider buying is a strong positive
- Min $1B market cap, healthy liquidity
- Mix sectors (don't return all tech) — aim for sector diversification

EXCLUDE: pre-revenue, chronically negative earnings, value traps with declining fundamentals.

${sourceGuidance}
${COMMON_RULES}

Return ONLY this JSON (no markdown, no preamble):
{
  "category": "longterm",
  "categoryNotes": "1-2 sentences on the current value-investing environment",
  "sources": ["https://...", "https://..."],
  "picks": [
    ${commonPickShape({
      tradePlanFields: `"entry": "$X (current price or buy zone)",
    "fairValue": "$X (intrinsic value estimate)",
    "twelveMonthTarget": "$X (12-month price target)",
    "stop": "$X (-X% — thesis-break level, NOT a tight stop)",
    "positionThesis": "1-2 sentence summary"`,
      predictionHorizon: '12 months',
      verdictOptions: 'Deep Value | Undervalued | Fair Value | Overvalued',
    })}
  ]
}

Exactly 10 picks. Sort by compositeScore descending.`,

  swing: (today, maxSearches, sourceGuidance) => `You are a swing-trading specialist. Today is ${today}.

Find TEN best SWING TRADE SETUPS across US public markets (2-4 week horizon).

Search criteria (web_search max ${maxSearches}):
- Fundamentally sound (NOT junk) with clear 2-4 week catalyst
- Earnings within next 1-4 weeks, analyst upgrade, or breakout pattern
- Setup criteria: technical pattern (pullback to support, breakout, base), trend with the move
- Healthy volume (not falling-knife declines)
- Recent SEC Form 4 insider buying is a major positive
- Min $2B market cap, liquid options preferred

${sourceGuidance}
${COMMON_RULES}

Return ONLY this JSON:
{
  "category": "swing",
  "categoryNotes": "1-2 sentences on current setup environment / sector rotation",
  "sources": ["https://...", "https://..."],
  "picks": [
    ${commonPickShape({
      tradePlanFields: `"entry": "$X-Y (entry zone)",
    "stop": "$X (-X% from entry)",
    "target1": "$X (+X%)",
    "target2": "$X (+X%)",
    "rrRatio": "1:X.X",
    "pattern": "Bull flag | Cup-handle | Breakout | Pullback to MA | etc",
    "catalystEvent": "Q3 Earnings YYYY-MM-DD | Analyst day | Product launch | etc",
    "daysToCatalyst": "X days"`,
      predictionHorizon: '2-4 weeks',
      verdictOptions: 'Prime Setup | Solid Setup | Watch | Avoid',
    })}
  ]
}

Exactly 10 picks. Sort by compositeScore desc.`,

  daytrade: (today, maxSearches, sourceGuidance) => `You are a day-trading specialist. Today is ${today}.

Find TEN best DAY TRADE SETUPS in US public markets (1-5 day horizon).

Search criteria (web_search max ${maxSearches}):
- High-momentum stocks with TODAY's relative strength
- BUT not garbage — must have decent fundamentals (positive earnings, real revenue, healthy growth)
- Strong volume profile (current vs 20d avg, accumulation pattern)
- Clear technical setup: breakout, momentum continuation, oversold bounce
- RSI in right zone (55-70 for breakouts, 30-45 for bounces)
- Near-term catalyst within 1-7 days
- Min $1B market cap, >2M daily volume for liquidity

${sourceGuidance}
${COMMON_RULES}

Return ONLY this JSON:
{
  "category": "daytrade",
  "categoryNotes": "1-2 sentences on intraday market conditions / where momentum is concentrated",
  "sources": ["https://...", "https://..."],
  "picks": [
    ${commonPickShape({
      tradePlanFields: `"entry": "$X-Y on confirmation",
    "stop": "$X (-X% — tight intraday stop)",
    "target1": "$X (+X%)",
    "target2": "$X (+X%)",
    "rrRatio": "1:X.X",
    "holdingDays": "1-5 days",
    "rsi": "XX (zone interpretation)",
    "macd": "Bullish crossover | Bearish | Neutral",
    "volumeVsAvg": "X.Xx today",
    "catalyst": "earnings in N days | breakout above $X | momentum continuation"`,
      predictionHorizon: '1-5 days',
      verdictOptions: 'Strong Setup | Setup | Watch | Avoid',
    })}
  ]
}

Exactly 10 picks. Sort by compositeScore desc.`,

  dividend: (today, maxSearches, sourceGuidance) => `You are a dividend / income investing specialist. Today is ${today}.

Find TEN best DIVIDEND / INCOME STOCKS in US public markets (long-term income hold).

Search criteria (web_search max ${maxSearches}):
- Sustainable yield (3-6% sweet spot; >12% likely yield trap)
- Payout ratio < 80% of earnings; FCF coverage > 1.5x preferred
- Consecutive years of dividend increases (10+ Achiever, 25+ Aristocrat)
- 5-year dividend CAGR positive
- Reasonable valuation (don't overpay for yield)
- Solid balance sheet
- AVOID: dividend cuts in last 3 years

${sourceGuidance}
${COMMON_RULES}

Return ONLY this JSON:
{
  "category": "dividend",
  "categoryNotes": "1-2 sentences on current yield environment vs bond yields",
  "sources": ["https://...", "https://..."],
  "picks": [
    ${commonPickShape({
      dividendInfoFields: `"yield": "X.X%",
    "yield5yrAvg": "X.X% (own 5yr avg)",
    "payoutRatio": "XX%",
    "fcfCoverage": "X.Xx",
    "fiveYrDivCagr": "X.X%",
    "consecutiveYearsRaised": "XX years",
    "aristocratStatus": "Dividend Aristocrat | Dividend Achiever | Neither",
    "buyBelowYield": "$X (yield > X%)",
    "incomeTargetAnnual": "$X annual on $10K"`,
      predictionHorizon: 'Long-term hold',
      verdictOptions: 'Income Anchor | Stable Yield | Watch | Yield Trap',
    })}
  ]
}

Exactly 10 picks. Sort by compositeScore desc.`,
};

// ============================================================
// NORMALIZER — produces the shape consumed by CategoryPickCard
// ============================================================

function _stripCitations(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/<\/?(?:antml:)?cite[^>]*>/gi, '')
    .replace(/<\/?(?:antml:)?cite\b[^>]*$/gi, '')
    .replace(/\bite\s+index\s*=\s*"[^"]*"\s*>/gi, '')
    .replace(/<\/?\s*ite[^>]*>/gi, '')
    .replace(/&lt;\/?(?:antml:)?cite[^&]*&gt;/gi, '');
}

function safe(v) {
  if (v == null) return null;
  return typeof v === 'string' ? _stripCitations(v) : v;
}

function deepSafe(obj) {
  if (obj == null) return obj;
  if (typeof obj === 'string') return safe(obj);
  if (Array.isArray(obj)) return obj.map(deepSafe);
  if (typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = deepSafe(obj[k]);
    return out;
  }
  return obj;
}

function clampScore(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function computeComposite(p) {
  const w = { valuation: 0.40, growth: 0.30, insider: 0.15, volume: 0.15 };
  return clampScore(
    (p?.valuation?.score || 0) * w.valuation
    + (p?.growth?.score || 0) * w.growth
    + (p?.insider?.score || 0) * w.insider
    + (p?.volume?.score || 0) * w.volume
  );
}

function verdictColorFor(verdict) {
  const k = String(verdict || '').toLowerCase();
  if (k.includes('deep value') || k.includes('strong setup') || k.includes('prime setup') || k.includes('income anchor')) return 'emerald';
  if (k.includes('undervalued') || k === 'setup' || k.includes('solid setup') || k.includes('stable yield')) return 'cyan';
  if (k.includes('fair') || k.includes('watch') || k.includes('hold')) return 'amber';
  return 'rose';
}

function recommendationFor(composite, verdict) {
  const v = String(verdict || '').toLowerCase();
  if (v.includes('avoid') || v.includes('yield trap') || v.includes('overvalued')) return 'AVOID';
  if (composite >= 80) return 'STRONG BUY';
  if (composite >= 65) return 'BUY';
  if (composite >= 50) return 'HOLD';
  return 'AVOID';
}

function convictionFor(composite) {
  if (composite >= 80) return 'high';
  if (composite >= 65) return 'medium';
  return 'low';
}

export function normalizeCategoryPicks(categoryId, rawPicks) {
  if (!Array.isArray(rawPicks)) return [];
  return rawPicks
    .map((p, i) => {
      const valuation = {
        pe: safe(p?.valuation?.pe),
        forwardPe: safe(p?.valuation?.forwardPe),
        peg: safe(p?.valuation?.peg),
        priceBook: safe(p?.valuation?.priceBook),
        priceSales: safe(p?.valuation?.priceSales),
        evToEbitda: safe(p?.valuation?.evToEbitda),
        earningsYield: safe(p?.valuation?.earningsYield),
        dividendYield: safe(p?.valuation?.dividendYield),
        vsSectorMedian: safe(p?.valuation?.vsSectorMedian),
        score: clampScore(p?.valuation?.score),
      };
      const growth = {
        revenueGrowthYoY: safe(p?.growth?.revenueGrowthYoY),
        revenue5yrCagr: safe(p?.growth?.revenue5yrCagr),
        epsGrowthYoY: safe(p?.growth?.epsGrowthYoY),
        eps5yrCagr: safe(p?.growth?.eps5yrCagr),
        operatingMargin: safe(p?.growth?.operatingMargin),
        netMargin: safe(p?.growth?.netMargin),
        fcfMargin: safe(p?.growth?.fcfMargin),
        roe: safe(p?.growth?.roe),
        roic: safe(p?.growth?.roic),
        piotroskiScore: safe(p?.growth?.piotroskiScore),
        score: clampScore(p?.growth?.score),
      };
      const insider = {
        last6moDirection: safe(p?.insider?.last6moDirection || p?.insiderActivity?.last6moDirection) || 'No activity',
        totalBuys: Number(p?.insider?.totalBuys ?? p?.insiderActivity?.totalBuys) || 0,
        totalSells: Number(p?.insider?.totalSells ?? p?.insiderActivity?.totalSells) || 0,
        totalBuyValue: safe(p?.insider?.totalBuyValue || p?.insiderActivity?.totalBuyValue),
        totalSellValue: safe(p?.insider?.totalSellValue || p?.insiderActivity?.totalSellValue),
        largestBuy: safe(p?.insider?.largestBuy || p?.insiderActivity?.largestBuy),
        notableNames: Array.isArray(p?.insider?.notableNames || p?.insiderActivity?.notableNames)
          ? (p.insider?.notableNames || p.insiderActivity?.notableNames || []).map(safe).filter(Boolean)
          : [],
        score: clampScore(p?.insider?.score ?? p?.insiderActivity?.score),
      };
      const volume = {
        avgDaily20d: safe(p?.volume?.avgDaily20d),
        currentVsAvg: safe(p?.volume?.currentVsAvg),
        trend: safe(p?.volume?.trend) || 'flat',
        liquidityGrade: safe(p?.volume?.liquidityGrade) || 'C',
        score: clampScore(p?.volume?.score),
      };

      const prediction = p?.prediction ? {
        target: safe(p.prediction.target),
        expectedReturn: safe(p.prediction.expectedReturn),
        upside: safe(p.prediction.upside),
        downside: safe(p.prediction.downside),
        keyCatalyst: safe(p.prediction.keyCatalyst),
        horizon: safe(p.prediction.horizon),
      } : null;

      const tradePlan = p?.tradePlan ? deepSafe(p.tradePlan) : null;
      const dividendInfo = p?.dividendInfo ? deepSafe(p.dividendInfo) : null;

      const sources = Array.isArray(p?.sources)
        ? p.sources.filter((s) => typeof s === 'string' && s.startsWith('http')).slice(0, 10)
        : [];

      const normalized = {
        rank: p?.rank ?? (i + 1),
        ticker: p?.ticker || '?',
        company: safe(p?.company) || '',
        sector: safe(p?.sector) || '',
        currentPrice: typeof p?.currentPrice === 'number' ? p.currentPrice : safe(p?.currentPrice),
        marketCap: safe(p?.marketCap),
        valuation,
        growth,
        insider,
        volume,
        tradePlan,
        dividendInfo,
        prediction,
        thesis: safe(p?.thesis) || '',
        risks: Array.isArray(p?.risks) ? p.risks.map(safe).filter(Boolean) : [],
        sources,
        priceHistory: Array.isArray(p?.priceHistory)
          ? p.priceHistory.filter((n) => typeof n === 'number' && !isNaN(n))
          : [],
        categoryId,
      };

      const modelComposite = clampScore(p?.compositeScore);
      normalized.compositeScore = modelComposite > 0 ? modelComposite : computeComposite(normalized);
      normalized.verdict = safe(p?.verdict) || 'Hold';
      normalized.verdictColor = safe(p?.verdictColor) || verdictColorFor(normalized.verdict);
      normalized.recommendation = safe(p?.recommendation) || recommendationFor(normalized.compositeScore, normalized.verdict);
      normalized.conviction = safe(p?.conviction) || convictionFor(normalized.compositeScore);
      return normalized;
    })
    .sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))
    .map((p, i) => ({ ...p, rank: i + 1 }));
}
