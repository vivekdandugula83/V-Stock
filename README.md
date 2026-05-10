# Athena.research — v5

AI agent for daily-trade equity research. Multi-stage workflow that pulls a macro briefing, scans political/macro/tech news, runs parallel sector specialists with web search, surfaces dark-data signals, ranks the top 10 across all sectors, and lets you deep-dive any ticker on demand.

Calls the Anthropic API directly from the browser. Your API key never leaves your device.

---

## What's new in v5

- **Top 10 Conviction List** — composite ranking across all sectors using `score × conviction × smart-money × catalysts × bullish-bias`. The headline view shows the 10 highest-conviction picks regardless of sector.
- **Dark Signals Leaderboard** — separate panel ranking tickers purely by smart-money signal strength: dark-pool sentiment, institutional flow, insider Form 4, options flow. Each ticker gets a directional score (bullish/bearish/mixed) and a stack rank.
- **News Pulse** — dedicated stage that runs in parallel with sector calls. Pulls this week's market-moving news across **political** (tariffs, elections, regulations), **macro** (Fed, CPI, jobs), **tech** (AI, chips, big tech), and **policy** (executive orders, congressional bills). Each item lists affected tickers and direction. Ends with a "Trade Themes" section pairing longs and shorts.
- **Ticker Deep Dive** — click any ticker anywhere in the app to launch a focused single-stock research call: 7-day news, last earnings, smart money, technicals, catalysts, risks, bull/base/bear cases, and a trade plan. Cached for 10 minutes per ticker.
- **Free-form ticker search** — paste any symbol and get the full deep-dive treatment. Costs ~$0.05-0.10 per dive.
- **Persistent watchlist** — star picks to track them across sessions. Stored in localStorage.

Carrying forward from v4:
- Top-level ErrorBoundary (no more black screens)
- Real-time spend tracker pulling actual `usage` data from API responses
- Smart error classification with kind-specific UI (credit / auth / ratelimit / cors / parse / network / server)
- Direct billing link surfaced on credit-too-low errors
- Optional budget cap with warnings
- Defensive everywhere — malformed model output won't crash the dashboard

---

## Why no live "credits remaining" number?

Anthropic does not expose a public balance endpoint for regular API keys. The Usage and Cost API requires an Admin key (`sk-ant-admin…`) most accounts don't have, and even that returns aggregated usage rather than a live balance.

So Athena does the next-best thing: **tracks every API response's `usage` block and sums real spend locally**. The numbers in the meter are derived from actual returned token counts at current public pricing — not estimates. When a request fails with `insufficient_balance_error`, the app tells you immediately and links you to billing.

---

## Quick start

### Option A — Netlify drag-and-drop (60 seconds)

1. Unzip `athena-research.zip` (or `athena-dist-only.zip`)
2. Open https://app.netlify.com/drop
3. Drag the **`dist/`** folder onto the page
4. Open the URL Netlify gives you
5. Paste your Anthropic API key (get one at https://console.anthropic.com/settings/keys)
6. Add at least $5 of credits at https://console.anthropic.com/settings/billing
7. Hit **Deploy Agent**

### Option B — Git + Netlify dashboard (auto-deploys on push)

```bash
unzip athena-research.zip
cd athena
git remote add origin <your-repo-url>
git push -u origin main
```

Then in Netlify: **Add new site → Import from Git** → pick the repo. Build settings are already in `netlify.toml`.

### Option C — Run locally

```bash
npm install
npm run dev   # localhost:5173
```

---

## Modes & cost

| Mode      | Sectors | Picks/sector | News pulse  | Web search/sector | Approx cost/run |
|-----------|---------|--------------|-------------|-------------------|-----------------|
| Express   | 3       | 5            | yes         | 1 search          | ~$0.15          |
| Standard  | 6       | 5            | yes         | 3 searches        | ~$0.40          |
| Deep      | 6       | 5            | yes (Sonnet)| 5 searches        | ~$1.30          |

Plus ~$0.05-0.10 per ticker deep-dive (on demand).

Pricing per Anthropic public docs (May 2026): Haiku 4.5 at $1/$5 per M input/output tokens, Sonnet 4.6 at $3/$15, web search at $10 per 1,000 searches. Cached input is 90% off.

---

## What you get per run

- **Market regime briefing** — indices, VIX, rates, sector rotation, smart-money pulse, this-week catalysts, tactical playbook
- **News pulse** — political/macro/tech/policy items + trade themes (longs vs shorts)
- **Top 10 picks** — composite-ranked across all sectors
- **Dark signals leaderboard** — up to 15 tickers with strongest smart-money signals
- **Per-sector deep-dives** — 5 picks each with full thesis, technicals, trade plan, smart money, next-day forecast, catalysts, risks
- **On-demand ticker deep-dive** — any symbol, full research treatment
- **Persistent watchlist** — saved across sessions

---

## Honest caveats

This is a research aid, not a trading system.

- **AI hallucinates.** The model may invent ticker fundamentals or misread filings. Verify every pick against a primary source (company filings, exchange data) before risking capital.
- **"Dark data" here is not real.** Actual dark-pool prints, institutional flow, and live Form 4 data come from paid feeds (Bloomberg, FactSet, Quiver, Unusual Whales). The signals shown are the model's best inference from publicly searchable information — useful as a heuristic, not as ground truth.
- **News lags.** Web search results are typically minutes-to-hours old. For genuine real-time you need a paid news terminal.
- **Day-trade win rates are brutal.** Studies consistently show 70–90% of retail day traders lose money over time. Backtest and paper-trade first.

Use this to generate ideas to investigate, not orders to place blindly.

---

## File structure

```
athena/
├── dist/                            # Pre-built, drop straight into Netlify
├── src/
│   ├── App.jsx                      # Top-level state + run orchestration
│   ├── main.jsx                     # Wraps App in ErrorBoundary
│   ├── index.css                    # Design tokens
│   ├── lib/
│   │   ├── agent.js                 # API calls (regime, sectors, news, deep-dive)
│   │   ├── usage.js                 # Real-spend ledger
│   │   └── aggregate.js             # Picks → dashboard + leaderboards
│   └── components/
│       ├── ErrorBoundary.jsx
│       ├── ApiError.jsx
│       ├── UsageMeter.jsx
│       ├── Top10Panel.jsx           # NEW: Top 10 conviction list
│       ├── DarkSignalsLeaderboard.jsx  # NEW: Dark-data ranking
│       ├── NewsPulse.jsx            # NEW: Political/macro/tech briefing
│       ├── TickerDeepDive.jsx       # NEW: Per-ticker research modal
│       ├── WatchlistPanel.jsx       # NEW: Saved tickers + free-form search
│       ├── Dashboard.jsx
│       ├── RegimeCard.jsx
│       ├── SectorHeatmap.jsx
│       ├── SmartMoneyPanel.jsx
│       ├── VolatilityScatter.jsx
│       ├── CatalystTimeline.jsx
│       ├── NextDayForecast.jsx
│       ├── IndustrySection.jsx
│       ├── StatTile.jsx
│       └── Sparkline.jsx
├── package.json
├── vite.config.js
├── tailwind.config.js
├── netlify.toml
└── index.html
```

---

## Troubleshooting

**Black screen / app won't load** → fixed in v4 with ErrorBoundary. If it still happens, open the browser console (F12), copy the first red error.

**"Credit balance is too low"** → meter banner shows this directly with a billing link. Add credits at https://console.anthropic.com/settings/billing.

**"CORS error" or "403"** → enable "Allow browser direct access" on your API key in the Anthropic console. Some org-managed keys block browser calls entirely.

**Sectors fail with "parse" error** → model returned malformed JSON. Click Retry on that sector — v5 doesn't crash on these, it shows the failed sector inline and continues.

**News pulse failed but sectors worked** → network blip on one of the parallel calls. Switch to the News tab and click Retry.

**Deep dive returning stale data** → click Refresh in the modal header to bypass the 10-minute cache.

---

## License

MIT. Do whatever you want, but don't blame me if you lose money.
