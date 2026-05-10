# Deploy Athena.research in 60 seconds

## Fastest path: Netlify drag-and-drop

1. Unzip `athena-research.zip` (or `athena-dist-only.zip` if you only want the deployable build)
2. Go to **https://app.netlify.com/drop**
3. Drag the **`dist`** folder onto the page (not the parent folder — the `dist` folder itself)
4. Netlify gives you a URL like `https://random-name-12345.netlify.app`
5. Open it
6. Paste your Anthropic API key — get one at **https://console.anthropic.com/settings/keys**
7. Make sure you have at least **$5 in credits** at **https://console.anthropic.com/settings/billing**
8. Hit **Deploy Agent**

## If you see "Credit balance too low"

v4 detects this immediately and shows a banner with a direct billing link. Add credits, refresh, and try again.

## If you see a black screen (shouldn't happen in v4)

1. Hit Cmd/Ctrl + Shift + R to hard refresh
2. Open the browser console (F12 → Console tab)
3. Copy the first red error — that tells you what failed

The v4 ErrorBoundary should catch every React crash and show a recovery card. If you genuinely get a black screen, there's a bug — file it with the console error.

## Alternative: deploy via Git

```bash
cd athena-research
git remote add origin <your-github-or-gitlab-repo-url>
git push -u origin main
```

In Netlify dashboard → **Add new site → Import existing project** → pick your repo. The included `netlify.toml` configures everything (build command, publish directory). New pushes auto-deploy.

## Run locally for development

```bash
cd athena-research
npm install
npm run dev
# opens at http://localhost:5173
```

## Costs to expect

- **Express mode** (3 sectors, no web search): ~$0.05/run
- **Standard mode** (6 sectors, web search, default): ~$0.25/run
- **Deep mode** (6 sectors, Sonnet, 7 picks each): ~$1.50/run

The session spend meter at the top of the app shows actual costs from API response usage data, not estimates.
