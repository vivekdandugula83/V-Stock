import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Loader2, Sparkles, Eye, Key, Lock,
  DollarSign, Gauge, LayoutDashboard, Target, Zap, Filter,
  TrendingUp, Activity, AlertCircle,
} from 'lucide-react';

import {
  MODES, estimateCost,
  fetchMarketRegime, fetchCategoryPicks,
  loadCachedRegime, saveCachedRegime,
} from './lib/agent';
import { CATEGORIES, CATEGORY_IDS } from './lib/strategies';
import { RateLimitQueue, TIERS } from './lib/queue';
import { recordUsage } from './lib/usage';
import RegimeCard from './components/RegimeCard';
import CategoryPickCard from './components/CategoryPickCard';
import Dashboard from './components/Dashboard';
import ApiError from './components/ApiError';
import UsageMeter from './components/UsageMeter';
import TickerDeepDive from './components/TickerDeepDive';
import WatchlistPanel from './components/WatchlistPanel';
import QueueStatus from './components/QueueStatus';
import AdvisorChat from './components/AdvisorChat';
import SourceList from './components/SourceList';

const KEY_STORAGE = 'vstock_anthropic_key';
const PREF_STORAGE = 'vstock_prefs_v8';
const WATCHLIST_STORAGE = 'vstock_watchlist_v8';

const ICON_MAP = { TrendingUp, Activity, Zap, DollarSign };

function loadPrefs() { try { return JSON.parse(localStorage.getItem(PREF_STORAGE) || '{}'); } catch { return {}; } }
function savePrefs(p) { try { localStorage.setItem(PREF_STORAGE, JSON.stringify(p)); } catch {} }

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE) || '');
  const [keyEditing, setKeyEditing] = useState(!apiKey);

  const initial = loadPrefs();
  const [mode, setMode] = useState(initial.mode || 'standard');
  const [tier, setTier] = useState(initial.tier || 'tier1');
  const [enabledCategories, setEnabledCategories] = useState(initial.enabledCategories || ['longterm', 'swing', 'daytrade', 'dividend']);
  const [activeCategory, setActiveCategory] = useState(initial.activeCategory || 'longterm');
  const [view, setView] = useState(initial.view || 'list');

  const queueRef = useRef(null);
  const [activeQueue, setActiveQueue] = useState(null);
  const [running, setRunning] = useState(false);
  const [regime, setRegime] = useState(null);
  const [regimeError, setRegimeError] = useState(null);
  const [regimeFromCache, setRegimeFromCache] = useState(false);
  // categoryData[categoryId] = { status, data, error }
  const [categoryData, setCategoryData] = useState({});
  const [usageRefresh, setUsageRefresh] = useState(0);
  const [deepDiveTicker, setDeepDiveTicker] = useState(null);
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem(WATCHLIST_STORAGE) || '[]'); } catch { return []; }
  });

  useEffect(() => { try { localStorage.setItem(WATCHLIST_STORAGE, JSON.stringify(watchlist)); } catch {} }, [watchlist]);
  useEffect(() => {
    savePrefs({ mode, view, tier, enabledCategories, activeCategory });
  }, [mode, view, tier, enabledCategories, activeCategory]);

  useEffect(() => {
    if (!enabledCategories.includes(activeCategory) && enabledCategories.length > 0) {
      setActiveCategory(enabledCategories[0]);
    }
  }, [enabledCategories, activeCategory]);

  const toggleWatch = (ticker) => {
    if (!ticker) return;
    setWatchlist((p) => (p.includes(ticker) ? p.filter((t) => t !== ticker) : [...p, ticker]));
  };
  const recordUsageAndRefresh = (usage, modeKey, label) => {
    recordUsage(usage, modeKey, label);
    setUsageRefresh((n) => n + 1);
  };
  const toggleCategory = (id) =>
    setEnabledCategories((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // 4 API calls = 4 categories + 1 regime
  const totalCalls = enabledCategories.length + 1;
  // Cost estimate: each category call is heavier (more searches, bigger output)
  const cost = enabledCategories.reduce((sum) => sum + (MODES[mode]?.regimeTokens ? 0.10 : 0.05), 0)
             + 0.05; // approximate

  const activeData = categoryData[activeCategory] || null;
  const activePicks = activeData?.data?.picks || [];
  const activeSources = activeData?.data?.sources || [];

  // Cross-category combined picks (for advisor)
  const allLoadedPicks = useMemo(() => {
    const out = [];
    for (const cid of CATEGORY_IDS) {
      const d = categoryData[cid]?.data;
      if (!d?.picks) continue;
      for (const p of d.picks) out.push({ ...p, categoryId: cid });
    }
    return out;
  }, [categoryData]);

  const completion = useMemo(() => {
    const out = {};
    for (const cid of CATEGORY_IDS) {
      const status = categoryData[cid]?.status;
      out[cid] = status === 'done' ? 'done' : status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'pending';
    }
    return out;
  }, [categoryData]);

  const hasResults = regime || Object.values(categoryData).some((d) => d?.status === 'done');
  const fatalError = useMemo(() => {
    if (regimeError && (regimeError.kind === 'credit' || regimeError.kind === 'auth')) return regimeError;
    for (const cid of Object.keys(categoryData)) {
      const err = categoryData[cid]?.error;
      if (err && (err.kind === 'credit' || err.kind === 'auth')) return err;
    }
    return null;
  }, [regimeError, categoryData]);

  const saveKey = () => {
    const t = apiKey.trim();
    if (t && t.startsWith('sk-ant-')) {
      localStorage.setItem(KEY_STORAGE, t);
      setKeyEditing(false);
    } else {
      alert("That doesn't look like a valid Anthropic API key. They start with sk-ant-");
    }
  };

  const setCategoryState = (cid, val) => setCategoryData((prev) => ({ ...prev, [cid]: val }));

  const runAgent = async (forceRegimeRefresh = false) => {
    if (!apiKey) { setKeyEditing(true); return; }
    if (enabledCategories.length === 0) { alert('Enable at least one category.'); return; }

    const tierCfg = TIERS[tier] || TIERS.tier1;
    const queue = new RateLimitQueue({
      concurrency: tierCfg.concurrency,
      minSpacingMs: tierCfg.minSpacingMs,
      maxRetries: 5,
    });
    queueRef.current = queue;
    setActiveQueue(queue);

    setRunning(true);
    setRegime(null);
    setRegimeError(null);
    setRegimeFromCache(false);
    setCategoryData(Object.fromEntries(
      enabledCategories.map((cid) => [cid, { status: 'pending', data: null, error: null }])
    ));

    // 1. Market regime
    let regimeResult = forceRegimeRefresh ? null : loadCachedRegime(mode, 'moderate', 'position');
    if (regimeResult) {
      setRegime(regimeResult);
      setRegimeFromCache(true);
    } else {
      try {
        const { data, usage } = await queue.add(
          () => fetchMarketRegime(apiKey, { horizon: 'position', risk: 'moderate', mode }),
          'regime'
        );
        regimeResult = data;
        recordUsageAndRefresh(usage, mode, 'regime');
        setRegime(regimeResult);
        saveCachedRegime(regimeResult, mode, 'moderate', 'position');
      } catch (err) {
        setRegimeError(err);
        if (err.kind === 'credit' || err.kind === 'auth') {
          queue.drain();
          for (const cid of enabledCategories)
            setCategoryState(cid, { status: 'error', data: null, error: err });
          setRunning(false);
          return;
        }
      }
    }

    // 2. One call per category — each returns 10 picks
    const promises = enabledCategories.map((cid) => {
      setCategoryState(cid, { status: 'loading', data: null, error: null });
      return queue.add(() => fetchCategoryPicks(apiKey, cid, { mode }), CATEGORIES[cid]?.short || cid)
        .then(({ data, usage }) => {
          recordUsageAndRefresh(usage, mode, cid);
          setCategoryState(cid, { status: 'done', data, error: null });
        })
        .catch((err) => {
          setCategoryState(cid, { status: 'error', data: null, error: err });
          if (err.kind === 'credit' || err.kind === 'auth') queue.drain();
        });
    });

    await Promise.allSettled(promises);
    setRunning(false);
    setActiveQueue(null);
  };

  const retryCategory = async (cid) => {
    if (!apiKey) return;
    setCategoryState(cid, { status: 'loading', data: null, error: null });
    const tierCfg = TIERS[tier] || TIERS.tier1;
    const q = new RateLimitQueue({ concurrency: 1, minSpacingMs: tierCfg.minSpacingMs, maxRetries: 4 });
    try {
      const { data, usage } = await q.add(() => fetchCategoryPicks(apiKey, cid, { mode }), 'retry');
      recordUsageAndRefresh(usage, mode, `${cid}/retry`);
      setCategoryState(cid, { status: 'done', data, error: null });
    } catch (err) {
      setCategoryState(cid, { status: 'error', data: null, error: err });
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 grain">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* HEADER */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="mono text-[11px] tracking-[0.25em] uppercase text-amber-300/80">
              4 Categories · 10 Picks Each · Unified Scoring
            </span>
          </div>
          <h1 className="display text-5xl sm:text-7xl font-light leading-[0.95] tracking-tight mb-4">
            <span className="shimmer-text italic">V-Stock</span>
          </h1>
          <p className="text-stone-400 text-base sm:text-lg max-w-2xl leading-relaxed">
            Same 4-bucket scoring across all categories: <strong className="text-amber-200">Valuation 40%</strong> · <strong className="text-emerald-200">Growth 30%</strong> · <strong className="text-violet-200">Insider 15%</strong> · <strong className="text-cyan-200">Volume 15%</strong>.
            Each category picks 10 stocks fit for its horizon with explicit recommendation + 12-month prediction + sources.
          </p>
        </header>

        <UsageMeter refresh={usageRefresh} />

        {/* API KEY */}
        {keyEditing && (
          <div className="mb-6 p-4 rounded-xl border border-amber-400/30 bg-amber-950/15">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4 text-amber-400" />
              <span className="display text-sm text-amber-100">Add your Anthropic API key</span>
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="password" value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                placeholder="sk-ant-api03-..."
                className="flex-1 bg-stone-900/60 border border-stone-800 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-400/50"
              />
              <button onClick={saveKey} className="px-4 py-2 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-200 hover:bg-amber-400/30 text-sm">Save</button>
            </div>
            <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
              <Lock size={9} /> Stored only in your browser.
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="underline hover:text-amber-300">Get a key →</a>
            </div>
          </div>
        )}
        {!keyEditing && apiKey && (
          <div className="mb-6 flex items-center justify-between text-xs text-stone-500">
            <span className="flex items-center gap-2"><Lock size={11} className="text-emerald-400/60" /> API key saved</span>
            <button onClick={() => setKeyEditing(true)} className="text-stone-400 hover:text-amber-300 underline">change</button>
          </div>
        )}

        {/* CONTROLS */}
        <div className="mb-6 p-5 rounded-xl border border-stone-800 bg-stone-950/60">
          {/* Category selector — visual chips */}
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <span className="mono text-[10px] tracking-[0.2em] uppercase text-stone-400">Categories ({enabledCategories.length}/4)</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {Object.values(CATEGORIES).map((c) => {
              const enabled = enabledCategories.includes(c.id);
              const Icon = ICON_MAP[c.icon] || TrendingUp;
              return (
                <button key={c.id} onClick={() => toggleCategory(c.id)} disabled={running}
                  className={`text-left p-3 rounded-lg border transition disabled:opacity-50 ${
                    enabled
                      ? 'border-amber-400/60 bg-amber-500/10'
                      : 'border-stone-800 bg-stone-900/40 hover:border-stone-700'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={13} style={{ color: enabled ? c.color : '#737373' }} />
                    <div className={`display text-base ${enabled ? 'text-amber-200' : 'text-stone-400'}`}>{c.label}</div>
                  </div>
                  <div className="mono text-[10px] text-stone-500 leading-snug">{c.horizon}</div>
                </button>
              );
            })}
          </div>

          {/* Mode + tier compact */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-3.5 h-3.5 text-stone-400" />
                <span className="mono text-[10px] tracking-[0.2em] uppercase text-stone-400">Depth</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(MODES).map(([key, m]) => {
                  const active = mode === key;
                  return (
                    <button key={key} onClick={() => setMode(key)} disabled={running}
                      className={`text-center p-2 rounded-lg border transition disabled:opacity-50 ${
                        active ? 'border-amber-400/60 bg-amber-500/10' : 'border-stone-800 bg-stone-900/40 hover:border-stone-700'
                      }`}>
                      <div className={`display text-sm ${active ? 'text-amber-200' : 'text-stone-300'}`}>{m.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-amber-400/80" />
                <span className="mono text-[10px] tracking-[0.2em] uppercase text-stone-400">Tier</span>
                <a href="https://console.anthropic.com/settings/limits" target="_blank" rel="noreferrer"
                   className="text-[10px] text-stone-500 underline hover:text-amber-300 ml-auto">Check →</a>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {Object.entries(TIERS).map(([key, t]) => {
                  const active = tier === key;
                  return (
                    <button key={key} onClick={() => setTier(key)} disabled={running}
                      className={`text-center p-2 rounded border text-[10px] transition disabled:opacity-50 ${
                        active ? 'border-amber-400/60 bg-amber-500/10 text-amber-200' : 'border-stone-800 bg-stone-900/40 text-stone-400 hover:border-stone-700'
                      }`}>
                      {t.label.split(' ')[0]} {t.label.split(' ')[1]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <DollarSign size={11} />
            ~${cost.toFixed(2)} per run · <span className="mono">{totalCalls} API calls</span> · {enabledCategories.length} categories × 10 picks each
          </span>
        </div>

        <button onClick={() => runAgent(false)} disabled={running || !apiKey || enabledCategories.length === 0}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 font-medium hover:from-amber-400 hover:to-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
          {running ? (
            <><Loader2 size={16} className="animate-spin" /> Running scan...</>
          ) : (
            <span className="tracking-wide">{hasResults ? 'RUN AGAIN' : 'DEPLOY AGENT'}</span>
          )}
        </button>

        {regimeFromCache && hasResults && (
          <button onClick={() => runAgent(true)} disabled={running}
            className="w-full mt-2 text-xs text-stone-500 hover:text-amber-300 transition py-1 mono tracking-wider uppercase">
            ↻ refresh market valuation
          </button>
        )}

        {!apiKey && !keyEditing && <p className="my-3 text-center text-xs text-amber-400/80">Add your Anthropic API key above.</p>}
        {fatalError && <div className="mt-6"><ApiError error={fatalError} onRetry={() => runAgent(true)} contextLabel="The agent stopped" /></div>}

        {running && activeQueue && (
          <div className="mt-6">
            <QueueStatus queue={activeQueue} totalExpected={totalCalls} label={`${TIERS[tier]?.label || 'Tier 1'} · scanning ${enabledCategories.length} categories`} />
          </div>
        )}

        {/* RESULTS */}
        {hasResults && (
          <div className="mt-8">
            {regime && <RegimeCard regime={regime} fromCache={regimeFromCache} />}

            {/* CATEGORY TABS */}
            <div className="mb-4 flex p-1 rounded-xl border border-stone-800 bg-stone-950/60 overflow-x-auto">
              {Object.values(CATEGORIES).map((c) => {
                const Icon = ICON_MAP[c.icon] || TrendingUp;
                const isActive = activeCategory === c.id;
                const isEnabled = enabledCategories.includes(c.id);
                const status = completion[c.id];
                const data = categoryData[c.id]?.data;
                const pickCount = data?.picks?.length || 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    disabled={!isEnabled}
                    className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition flex-shrink-0 ${
                      isActive ? 'bg-amber-400/20 text-amber-200'
                        : isEnabled ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
                        : 'text-stone-600 cursor-not-allowed'
                    }`}
                    title={c.description}
                  >
                    <Icon size={13} style={{ color: isActive ? undefined : c.color, opacity: isActive ? 1 : 0.8 }} />
                    <span className="font-medium">{c.label}</span>
                    {status === 'loading' && <Loader2 size={10} className="animate-spin" />}
                    {status === 'error' && <AlertCircle size={10} className="text-rose-400" />}
                    {status === 'done' && pickCount > 0 && (
                      <span className="text-[10px] mono text-stone-500">{pickCount}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sub-tabs: List / Dashboard */}
            <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex p-1 rounded-xl border border-stone-800 bg-stone-950/60">
                <ViewTab active={view === 'list'} onClick={() => setView('list')}
                         icon={<Target className="w-3.5 h-3.5" />} label="10 Picks" />
                <ViewTab active={view === 'dashboard'} onClick={() => setView('dashboard')}
                         icon={<LayoutDashboard className="w-3.5 h-3.5" />} label="Dashboard" />
              </div>
              <div className="text-xs text-stone-500">
                {activeData?.status === 'loading' && 'Loading...'}
                {activeData?.status === 'error' && (
                  <button onClick={() => retryCategory(activeCategory)} className="text-rose-300 hover:text-rose-200 underline">
                    Failed — retry
                  </button>
                )}
                {activeData?.status === 'done' && `${activePicks.length} picks · ${CATEGORIES[activeCategory]?.horizon}`}
              </div>
            </div>

            <div className="mb-6">
              <WatchlistPanel
                watchlist={watchlist}
                onTickerClick={(t) => setDeepDiveTicker(t)}
                onRemove={(t) => toggleWatch(t)}
                onSearch={(t) => setDeepDiveTicker(t)}
              />
            </div>

            {activeData?.status === 'error' && (
              <ApiError error={activeData.error} onRetry={() => retryCategory(activeCategory)} contextLabel={`${CATEGORIES[activeCategory]?.label} scan failed`} />
            )}

            {activeData?.status === 'loading' && (
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-12 text-center">
                <Loader2 size={28} className="text-amber-300 animate-spin mx-auto mb-3" />
                <div className="text-sm text-stone-300">Scanning {CATEGORIES[activeCategory]?.label}...</div>
                <div className="text-xs text-stone-500 mt-1">10 picks · 4-bucket scoring · sourcing from SEC + openinsider + fundamentals</div>
              </div>
            )}

            {activeData?.status === 'done' && view === 'list' && (
              <div className="space-y-3">
                {activeData?.data?.categoryNotes && (
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-stone-300">
                    <span className="text-[10px] uppercase tracking-wider text-amber-300/70 mr-2">Category outlook:</span>
                    {activeData.data.categoryNotes}
                  </div>
                )}
                {activePicks.map((p, i) => (
                  <CategoryPickCard
                    key={`${p.ticker}-${i}`}
                    pick={p}
                    onTickerClick={(t) => setDeepDiveTicker(t)}
                    watchlist={watchlist}
                    onToggleWatch={toggleWatch}
                  />
                ))}
                {activeSources.length > 0 && (
                  <div className="mt-6 p-4 rounded-xl border border-stone-800 bg-stone-950/60">
                    <SourceList sources={activeSources} label={`Run-level sources for ${CATEGORIES[activeCategory]?.label}`} />
                  </div>
                )}
              </div>
            )}

            {activeData?.status === 'done' && view === 'dashboard' && (
              <Dashboard
                categoryId={activeCategory}
                picks={activePicks}
                onTickerClick={(t) => setDeepDiveTicker(t)}
                watchlist={watchlist}
                onToggleWatch={toggleWatch}
              />
            )}
          </div>
        )}

        {!hasResults && !running && apiKey && (
          <>
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-stone-900/60 border border-stone-800 mb-5">
                <Eye className="w-6 h-6 text-stone-600" />
              </div>
              <p className="text-stone-500 max-w-md mx-auto">
                Enable categories, hit Deploy. Each category returns 10 stocks with composite score, recommendation, 12-month prediction, and source URLs.
              </p>
            </div>
            <div className="max-w-md mx-auto">
              <WatchlistPanel watchlist={watchlist} onTickerClick={(t) => setDeepDiveTicker(t)}
                onRemove={(t) => toggleWatch(t)} onSearch={(t) => setDeepDiveTicker(t)} />
            </div>
          </>
        )}

        {hasResults && (
          <div className="mt-16 pt-8 border-t border-stone-900 text-[11px] text-stone-600 leading-relaxed mono tracking-wide">
            <p>
              V-Stock generates 10 recommendations per category using AI + web search. AI can hallucinate financial numbers — always verify the picks against SEC EDGAR (sec.gov/edgar), openinsider.com, and the company's own filings before risking capital. Recommendations are research candidates, not financial advice.
            </p>
          </div>
        )}
      </div>

      {deepDiveTicker && (
        <TickerDeepDive
          ticker={deepDiveTicker}
          apiKey={apiKey}
          mode={mode}
          onClose={() => setDeepDiveTicker(null)}
          onUsage={recordUsageAndRefresh}
        />
      )}

      <AdvisorChat
        apiKey={apiKey}
        picks={allLoadedPicks}
        regime={regime}
        watchlist={watchlist}
        onTickerClick={(t) => setDeepDiveTicker(t)}
      />
    </div>
  );
}

function ViewTab({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition ${
      active ? 'bg-amber-400/20 text-amber-200' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
    }`}>{icon}{label}</button>
  );
}
