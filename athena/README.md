# V-Stock

A fundamental value-investing screener powered by Claude. Returns 10 undervalued stocks per sector, scored across four factor buckets using a transparent composite model.

Calls the Anthropic API directly from the browser. Your API key never leaves your device.

---

## What V-Stock does

For each sector you select, V-Stock:
1. Pulls fundamental data via web search (P/E, forward P/E, PEG, revenue growth, EPS growth, 5-yr CAGR, margins, insider Form 4 activity, volume)
2. Scores each stock across 4 factor buckets
3. Combines them into a composite score
4. Assigns a verdict: **Deep Value · Undervalued · Fair Value · Overvalued**
5. Ranks the top 10 within the sector, plus a global Top 15 across all sectors

It also pulls a **market valuation briefing** — S&P 500 P/E, Shiller CAPE, sector P/E dispersion, aggregate insider activity, and value opportunities.

---

## Where the data comes from (and how to verify it)

Every run shows the sources the model actually used so you can click through and verify. The model is directed to prefer high-quality primary sources first.

### Source priority

| Tier | Source | Used for | Reliability |
|------|--------|----------|-------------|
| **1 — Primary** | **SEC EDGAR** (sec.gov/edgar) | 10-K, 10-Q, Form 4 (insider), 13F (institutional), 13D/G | Highest — direct filings |
| **1 — Primary** | Company investor relations pages | Earnings transcripts, decks | Highest — primary |
| **2 — News** | Reuters, Bloomberg, WSJ, FT, Barron's | Catalysts, M&A, breaking news | High |
| **3 — Fundamentals** | stockanalysis.com, macrotrends.net | Historical P/E, 5yr CAGR | High |
| **3 — Fundamentals** | finviz.com | Valuation comps, sector screener | Good |
| **3 — Insider** | **openinsider.com** | SEC Form 4 aggregation, cluster buys | High |
| **3 — Institutional** | whalewisdom.com, dataroma.com, hedgefollow.com | 13F filings, super-investor positions | High |
| **4 — Dark Pool / Flow** | chartexchange.com, squeezemetrics.com | Dark pool prints, DIX/GEX | Medium — some paywalled |
| **4 — Options Flow** | unusualwhales.com | Options flow, dark pool sentiment | Medium — paywalled |
| **4 — Short Interest** | ortex.com, FINRA short interest | % of float, days to cover | High |
| **5 — Fallback** | finance.yahoo.com | Current price, volume | Acceptable |

**Avoided sources**: Reddit, Twitter/X, low-quality SEO content farms, opinion posts from non-credentialed sources, paywalled aggregators without primary data.

### Where you'll see sources in the UI

- **Each pick card** → click "Thesis · Institutional · Sources" to expand. Sources appear as clickable domain pills color-coded by tier.
- **Market regime card** → sources panel at the bottom.
- **Per sector** → sector-level sources at the bottom of each sector section.
- **Deep-dive modal** → full sources list with tier labels at the bottom of every ticker research.

Source pills are color-coded:
- 🟢 **Green** = SEC (primary, most reliable)
- 🔵 **Sky blue** = News (Reuters, Bloomberg, etc.)
- 🔷 **Cyan** = Fundamentals data (stockanalysis, macrotrends)
- 🟣 **Violet** = Insider (openinsider, SEC Form 4)
- 🟡 **Amber** = Institutional (13F filings)
- 🟪 **Fuchsia** = Dark pool / options flow

### Institutional / Smart Money panel (per pick)

A separate "Institutional / Smart Money" panel appears in the expanded pick details and in every deep-dive. It shows:

| Signal | What it tells you |
|--------|-------------------|
| **Dark Pool Sentiment** | Bullish/Bearish based on dark pool prints aggregators (often Limited — paywalled) |
| **13F Flow** | Net buying or selling by funds in last quarterly filings |
| **Notable 13F Changes** | Specific funds and direction (Berkshire, Renaissance, Citadel moves) |
| **Short Interest** | % of float + days to cover + trend |
| **Options Flow** | C/P ratio + unusual activity (often Limited — paywalled) |
| **Top Holders** | Largest 13F holders by stake size |

This panel is **informational only** — it is NOT scored into the composite. The composite remains the clean 4-bucket model (Valuation 40% + Growth 30% + Insider 15% + Volume 15%). Institutional signals are additional context for forward-looking decisions.

### Honest caveats on dark pool / flow data

Much of the most actionable smart-money data is paywalled:
- **Unusual Whales, FlowAlgo, Cheddar Flow** — paid subscriptions
- **SqueezeMetrics DIX/GEX** — partial free, premium paid
- **Quant feeds (Bloomberg, FactSet)** — institutional pricing

The model can only see what's publicly indexable. When data is genuinely unavailable, the panel shows **"Limited data"** with "Unknown" values rather than hallucinating. For truly current dark-pool and options-flow analysis, you need a paid feed.

What works well via free sources:
- ✅ SEC Form 4 insider buying (openinsider.com mirrors EDGAR in real time)
- ✅ 13F institutional positions (quarterly, public)
- ✅ Short interest (FINRA, bi-weekly)
- ✅ Earnings & guidance (company IR, news)

What's limited:
- ⚠️ Real-time dark pool prints
- ⚠️ Live options flow
- ⚠️ Intraday institutional positioning

---

## The composite scoring model

Every stock is scored 0-100 in four buckets, then combined:

```
Composite = Valuation × 40%
          + Growth × 30%
          + Insider × 15%
          + Volume × 15%
```

### Valuation (40%)
- **P/E (TTM)** — trailing twelve months earnings multiple vs sector median
- **Forward P/E** — next-12-month estimate; lower than P/E hints at earnings growth ahead
- **PEG** — P/E ÷ growth rate; <1 = undervalued growth (Lynch's rule)
- **P/B** — Price/Book; <1.5 is Graham defensive territory
- **P/S** — Price/Sales; useful when earnings are distorted
- **P/FCF** — Price/Free Cash Flow (Buffett's preferred; earnings can be manipulated, FCF cannot)
- **EV/EBITDA** — capital-structure neutral multiple
- **Earnings Yield** — E/P, compare directly to bond yields
- **Dividend Yield** — for income investors

### Growth & Quality (30%)
- **Revenue growth YoY** + **5-year CAGR** (consistency matters)
- **EPS growth YoY** + **5-year CAGR**
- **Operating Margin**, **Net Margin**, **FCF Margin** (capital efficiency)
- **ROE** (Return on Equity), **ROIC** (Return on Invested Capital)
- **Piotroski F-Score (0-9)** — composite of 9 financial-health tests; 8-9 = strong, 0-3 = weak

### Insider Activity (15%)
- 6-month net direction (buying / selling / mixed / no activity)
- # of insider buys and sells
- Total $ value of buys and sells
- Largest single buy (CEO/CFO purchases are strongest signals)
- Notable names involved
- Source: **SEC Form 4 filings** (retrieved via openinsider.com and EDGAR)

### Volume & Liquidity (15%)
- 20-day average volume
- Current vs avg
- Trend (rising / flat / falling)
- Liquidity grade A/B/C/D

---

## Additional indicator panels (informational, not scored)

These show alongside the 4 scoring buckets but are NOT part of the composite. They're for forward-looking context.

### Market Sentiment
- **Analyst Rating** — consensus + buy/hold/sell breakdown
- **Avg Price Target** + **upside %** vs current price
- **Recent Revisions** — analyst estimate trend (rising/falling/stable)
- **Beta** — volatility vs market (>1.2 more volatile, <0.8 less)
- **52-week Position** — where it trades in the annual range
- **Days to Next Earnings** — flagged in amber if ≤14 days (event volatility risk)

### Financial Strength
- **Altman Z-Score** — bankruptcy risk; ≥3.0 safe, 1.81-3.0 grey, <1.81 distress
- **D/E** — debt to equity, with label (Conservative/Moderate/Leveraged)
- **Current Ratio** — short-term liquidity
- **Net Debt / EBITDA** — leverage
- **Interest Coverage** — EBIT/interest expense
- **Credit Rating** — investment grade ≥BBB-
- **FCF** annual + Cash on hand

### Institutional / Smart Money
- **Dark Pool Sentiment** (Bullish/Bearish — often Limited data)
- **13F Flow** — net institutional buying or selling
- **Notable 13F Changes** — specific Berkshire/Renaissance/Citadel moves
- **Short Interest** — % of float + days to cover
- **Options Flow** — C/P ratio + unusual activity
- **Top Holders** — largest fund stakes

### Verdict thresholds
| Composite | Verdict |
|-----------|---------|
| ≥ 80 | **Deep Value** |
| 65 – 79 | **Undervalued** |
| 50 – 64 | **Fair Value** |
| < 50 | **Overvalued** |

---

## Three views + V-Advisor chat

| Tab | Shows |
|-----|-------|
| **Top Picks** | Top 15 across all sectors, with **sort & filter controls** (cheapest P/E, only Deep Value, only insider buying, Piotroski 7+, earnings <14 days, etc.) and a free-text search |
| **Dashboard** | Hero stats · valuation distribution · **upcoming earnings calendar** · sector breakdown |
| **By Sector** | All 10 picks per sector with full metric panels, expandable thesis + institutional + sources |

**V-Advisor floating chat** (✨ bottom-right button):
- Streaming responses (token-by-token) using **Claude Haiku 4.5** for fast, cheap chat
- Loaded with your current picks + market regime as context — knows your data
- Reference any ticker by name and it pulls from loaded data
- Quick prompts: "Compare top 3", "Cheapest by P/E", "Explain Piotroski", "Portfolio allocation"
- Optional **web search toggle** — flip it on for fresh prices, today's news, current filings
- Chat history saved in localStorage
- Click tickers in advisor responses to open the deep-dive modal

### Filter chips on the Top Picks tab

- Deep Value · Undervalued
- Insider buying
- PEG < 1
- Piotroski 7+
- Earnings <14 days

### Sort options

- Composite score (default)
- P/E lowest first
- Forward P/E lowest first
- Revenue growth high → low
- EPS growth high → low
- Insider score high → low
- Market cap high → low

Plus:
- **Watchlist** — star any pick to track across sessions
- **Free-form ticker search** — paste any symbol to get the full value deep-dive
- **Deep-dive modal** — click any ticker for a 12-month investment view (full valuation breakdown, recent insider transactions table, balance sheet, bull/base/bear cases)

---

## Quick start

### Option A — Netlify drag-and-drop (60 seconds)

1. Unzip `v-stock.zip` (or `v-stock-dist-only.zip`)
2. Go to **https://app.netlify.com/drop**
3. Drag the **`dist/`** folder onto the page
4. Open the URL Netlify gives you
5. Paste your Anthropic API key (get one at https://console.anthropic.com/settings/keys)
6. Add at least $5 of credits at https://console.anthropic.com/settings/billing
7. Pick your tier (default Tier 1) and sectors
8. Hit **Deploy Agent**

### Option B — Git + Netlify dashboard

```bash
unzip v-stock.zip
cd athena
git remote add origin <your-repo-url>
git push -u origin main
```

In Netlify: **Add new site → Import from Git**. `netlify.toml` is preconfigured.

### Option C — Run locally

```bash
npm install
npm run dev   # localhost:5173
```

---

## Modes & cost

V-Stock removed the trader-focused daily movers and news pulse calls. Standard runs are now leaner — 1 regime call + N sector calls. Each sector returns 10 deeply-scored picks.

| Mode      | Sectors (you pick) | Picks/sector | Searches/sector | Approx cost (6 sectors) |
|-----------|--------------------|--------------|-----------------|-------------------------|
| Express   | up to 6            | 10           | 1               | ~$0.20                  |
| Standard  | up to 6            | 10           | 3               | ~$0.55                  |
| Deep      | up to 6            | 10           | 5 (Sonnet 4.6)  | ~$1.80                  |

Plus ~$0.05-0.10 per on-demand ticker deep-dive.

---

## Rate-limit handling

V-Stock includes a **per-tier queue** that controls how many calls run in parallel and how long between them. If you hit a 429, the queue reads `retry-after` from the response and automatically retries with exponential backoff.

| Tier | Concurrency | Spacing |
|------|-------------|---------|
| Tier 1 (Free / New) | 1 call at a time | 2.5s spacing |
| Tier 2 ($40+ spent) | 2 concurrent | 1s spacing |
| Tier 3+ ($200+ spent) | 4 concurrent | 0.2s |
| Tier 4+ | 8 concurrent | none |

The live queue status panel shows pending / running / done / retrying counts during every run.

---

## Honest caveats

This is a screening tool, not investment advice.

- **The model can hallucinate fundamentals.** P/E, revenue growth, and insider counts are pulled via web search and can be wrong, stale, or fabricated. Always verify against:
  - **SEC EDGAR** (https://www.sec.gov/edgar) for 10-K, 10-Q, Form 4
  - The company's investor relations page for earnings transcripts
  - Your broker's data
- **Insider buying is a heuristic, not a guarantee.** Insiders sell for many reasons (taxes, diversification). They also buy as PR. The signal is most useful when concentrated (multiple buyers, large amounts).
- **Composite scores are model-generated.** They reflect what the model could find, not ground truth. Treat them as a starting screen.
- **Forward estimates are uncertain.** Forward P/E depends on analyst forecasts that change frequently.
- **Value investing requires patience.** Undervalued can stay undervalued for years. Build a thesis, set a time horizon, watch for the catalyst.

Use V-Stock to generate a research list, then do your own work before risking capital.

---

## File structure

```
athena/                              # repo root (legacy folder name)
├── dist/                            # Pre-built — drop into Netlify
├── src/
│   ├── App.jsx                      # Main app
│   ├── main.jsx                     # ErrorBoundary wrapper
│   ├── index.css
│   ├── lib/
│   │   ├── agent.js                 # API calls + composite scoring weights
│   │   ├── aggregate.js             # Dashboard stats
│   │   ├── queue.js                 # Rate-limit queue with auto-retry
│   │   └── usage.js                 # Real-spend ledger
│   └── components/
│       ├── ErrorBoundary.jsx
│       ├── ApiError.jsx
│       ├── UsageMeter.jsx
│       ├── QueueStatus.jsx          # Live queue progress
│       ├── RegimeCard.jsx           # Market valuation context
│       ├── Top10Panel.jsx           # Global top-15 ranked
│       ├── Dashboard.jsx            # Hero stats + sector breakdown
│       ├── IndustrySection.jsx      # 10 picks per sector
│       ├── ValuePickCard.jsx        # Per-stock card with 4 score buckets
│       ├── TickerDeepDive.jsx       # On-demand single-ticker modal
│       ├── WatchlistPanel.jsx
│       ├── MiniChart.jsx
│       └── StatTile.jsx
├── package.json
├── vite.config.js
├── tailwind.config.js
├── netlify.toml
└── index.html
```

---

## Troubleshooting

**Black screen** → ErrorBoundary catches React crashes. F12 → Console for the first red error.

**"Credit balance too low"** → meter banner links to billing. Add credits.

**"Rate limited"** → automatic. Queue auto-retries on `retry-after`. Live status panel shows the countdown.

**Sectors fail with "parse"** → model returned malformed JSON. Click Retry on that sector card.

**Deep dive returning stale data** → click Refresh in the modal header (bypasses 10-min cache).

---

## License

MIT.
