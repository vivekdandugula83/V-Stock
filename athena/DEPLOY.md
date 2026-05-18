# Deploy V-Stock

## Fastest: Netlify drag-and-drop

1. Unzip `v-stock-dist-only.zip` (or `v-stock.zip` for full repo)
2. https://app.netlify.com/drop
3. Drag the **`dist`** folder
4. Open the URL Netlify gives you
5. Paste your Anthropic API key — https://console.anthropic.com/settings/keys
6. Add $5+ credits — https://console.anthropic.com/settings/billing
7. **Leave tier on Tier 1** if your account is new
8. Hit **Deploy Agent**

## Three views after the run

- **Top Picks** — top 15 undervalued stocks across all sectors
- **Dashboard** — avg P/E, growth, insider buying count, sector breakdown, valuation distribution
- **By Sector** — full 10-pick value scan per sector with 4-bucket scoring

Click any ticker for a 12-month deep-dive (full valuation breakdown, SEC Form 4 transactions, balance sheet, bull/bear/base cases).

## The composite scoring model

```
Composite = Valuation (40%) + Growth (30%) + Insider (15%) + Volume (15%)
```

- Valuation: P/E, Forward P/E, PEG, P/B, EV/EBITDA, vs sector median
- Growth: Revenue YoY + 5yr CAGR, EPS YoY + 5yr CAGR, margins, ROE
- Insider: Net direction last 6 months from SEC Form 4 filings
- Volume: 20d avg, current vs avg, trend, liquidity grade

Verdicts: ≥80 Deep Value · 65-79 Undervalued · 50-64 Fair · <50 Overvalued

## Cost

| Mode | 6 sectors |
|------|-----------|
| Express | ~$0.20 |
| Standard | ~$0.55 |
| Deep | ~$1.80 |

Plus ~$0.05-0.10 per ticker deep-dive.

The spend meter at the top shows actual usage from API responses.

## Git deploy

```bash
unzip v-stock.zip
cd athena
git remote add origin <your-repo-url>
git push -u origin main
```

Netlify dashboard → **Add new site → Import from Git**. `netlify.toml` is preconfigured.

## Local dev

```bash
cd athena
npm install
npm run dev   # localhost:5173
```

## Troubleshooting

- **Black screen** → F12 → Console → copy first red error
- **"Credit balance too low"** → meter banner links to billing
- **"Rate limited"** → automatic retry; live queue status shows countdown
- **Sector parse error** → click Retry on that sector
