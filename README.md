# Athena.research — v4

AI agent for daily-trade equity research. Multi-stage workflow that pulls a macro briefing, runs parallel sector specialists with web search, and assembles a dashboard with dark-data signals (dark-pool sentiment, institutional flow, insider activity, options flow), volatility scatter, catalyst timeline, and next-day forecasts.

Calls the Anthropic API directly from the browser. Your API key never leaves your device.

---

## What's new in v4 (crash-proofing pass)

- **Top-level ErrorBoundary.** A bug in any component no longer takes the page to a black screen. You get an error card with reset buttons.
- **Real-time spend tracker.** Every API call's actual `usage` (input, output, cached, web-search count) is recorded to localStorage and shown in a session / today / all-time meter at the top.
- **Smart error classification.** Failures are tagged as `credit`, `auth`, `ratelimit`, `cors`, `parse`, `network`, `server`, `overloaded`, or `unknown`. Each gets a tailored message — credit-too-low shows a direct link to the billing page.
- **Aborts cleanly on credit/auth errors.** No more spinning forever burning failed requests when your balance drops to zero — the run stops and surfaces a banner.
- **Optional budget cap.** Set a session limit in the meter. The app warns before spending past it.
- **Defensive everywhere.** Every property access, every array, every API field is guarded. Malformed model output won't crash the dashboard — it just shows a fallback.

---

## Why no live "credits remaining" number?

Anthropic does not expose a public balance endpoint for regular API keys. The Usage and Cost API requires an Admin key (`sk-ant-admin…`) most accounts don't have, and even that returns aggregated usage rather than a live balance.

So Athena does the next-best thing: **tracks every API response's `usage` block and sums real spend locally**. The numbers you see are derived from actual returned token counts at current public pricing — not estimates. When a request fails with `insufficient_balance_error`, the app tells you immediately and links you to billing.

---

## Quick start

### Option A — Netlify drag-and-drop (60 seconds)

1. Unzip this package
2. Open https://app.netlify.com/drop
3. Drag the **`dist/`** folder onto the page
4. Open the URL Netlify gives you
5. Paste your Anthropic API key (get one at https://console.anthropic.com/settings/keys)
6. Add at least $5 of credits at https://console.anthropic.com/settings/billing
7. Hit **Deploy Agent**

### Option B — Git + Netlify dashboard (auto-deploys on push)

```bash
cd athena-research
git remote add origin <your-repo-url>
git push -u origin main
```

Then in Netlify: **Add new site → Import from Git** → pick the repo. Build settings are already in `netlify.toml` (build command `npm run build`, publish directory `dist`).

### Option C — Run locally

```bash
npm install
npm run dev   # localhost:5173
```

---

## File structure

```
athena/
├── dist/                    # Pre-built, drop straight into Netlify
├── src/
│   ├── App.jsx              # Top-level state + run orchestration
│   ├── main.jsx             # Wraps App in ErrorBoundary
│   ├── index.css            # Design tokens + utility classes
│   ├── lib/
│   │   ├── agent.js         # API calls, ApiError class, error classification
│   │   ├── usage.js         # Real-spend ledger (localStorage)
│   │   └── aggregate.js     # Picks → dashboard stats
│   └── components/
│       ├── ErrorBoundary.jsx       # Crash catcher
│       ├── ApiError.jsx            # Kind-specific error UI
│       ├── UsageMeter.jsx          # Spend tracker + budget
│       ├── Dashboard.jsx           # Hero stats panel
│       ├── RegimeCard.jsx          # Macro briefing display
│       ├── SectorHeatmap.jsx       # Sector grid
│       ├── SmartMoneyPanel.jsx     # Dark-data signals
│       ├── VolatilityScatter.jsx   # Risk/return plot
│       ├── CatalystTimeline.jsx    # Upcoming events
│       ├── NextDayForecast.jsx     # Forward-looking view
│       ├── IndustrySection.jsx     # Per-sector picks
│       ├── StatTile.jsx            # Animated counter
│       └── Sparkline.jsx           # Mini trend graphs
├── package.json
├── vite.config.js
├── tailwind.config.js
├── netlify.toml             # Netlify build config
└── index.html
```

---

## Modes & cost (Haiku 4.5 default)

| Mode      | Sectors | Picks/sector | Web search | Approx cost/run |
|-----------|---------|--------------|------------|-----------------|
| Express   | 3       | 3            | off        | ~$0.05          |
| Standard  | 6       | 5            | on         | ~$0.25          |
| Deep      | 6       | 7            | on (Sonnet)| ~$1.50          |

Costs come from Anthropic's published pricing as of May 2026: Haiku 4.5 at $1/$5 per million input/output tokens, Sonnet 4.6 at $3/$15, web search at $10 per 1,000 searches. Cached input is 90% off.

---

## Honest caveats

This is a research aid, not a trading system. A few things to internalize:

- **AI hallucinates.** The model may invent ticker fundamentals or misread filings. Verify every pick against a primary source before risking capital.
- **"Dark data" here is not real.** True dark-pool prints, institutional flow, and live Form 4 data come from paid feeds (Bloomberg, FactSet, Quiver, Unusual Whales). The signals shown are the model's best inference from publicly searchable information — useful as a heuristic, not as ground truth.
- **Day-trade win rates are brutal.** Studies consistently show 70–90% of retail day traders lose money. Backtests and paper trading first.
- **Web search results lag.** "Real-time" search snippets are typically minutes-to-hours old.

Use this to generate ideas to investigate, not orders to place blindly.

---

## Troubleshooting

**Black screen / app won't load** → fixed in v4. If it still happens, open browser console (F12), copy the first red error, and check the GitHub issues.

**"Credit balance is too low"** → the meter will show this directly with a billing link. Add at least $5 at https://console.anthropic.com/settings/billing.

**"CORS error" or "403"** → enable "Allow browser direct access" on your API key in the Anthropic console, or run the app on a domain with that header allowed. Some org-managed keys block browser calls entirely.

**Sectors fail with "parse" error** → model returned malformed JSON. Try Express mode or rerun. v4 doesn't crash on these — it shows the failed sector inline and continues.

**Spend meter at zero after a run** → check that requests actually succeeded. Failed calls don't record usage. Look for the error banner.

---

## License

MIT. Do whatever you want, but don't blame me if you lose money.
