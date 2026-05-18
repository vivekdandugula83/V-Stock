import { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertTriangle, Loader2, Sparkles, Eye, Key, Lock,
  DollarSign, Gauge, LayoutDashboard, ListTree, Target, Zap, Filter,
} from 'lucide-react';

import {
  INDUSTRIES, MODES, estimateCost,
  fetchMarketRegime, fetchStrategyPicks,
  loadCachedRegime, saveCachedRegime,
} from './lib/agent';
import { STRATEGIES, STRATEGY_IDS } from './lib/strategies';
import { RateLimitQueue, TIERS } from './lib/queue';
import { aggregate } from './lib/aggregate';
import { recordUsage } from './lib/usage';
import RegimeCard from './components/RegimeCard';
import { StrategySection, StrategyTopPicks } from './components/StrategyViews';
import Dashboard from './components/Dashboard';
import ApiError from './components/ApiError';
import UsageMeter from './components/UsageMeter';
import TickerDeepDive from './components/TickerDeepDive';
import WatchlistPanel from './components/WatchlistPanel';
import QueueStatus from './components/QueueStatus';
import AdvisorChat from './components/AdvisorChat';
import StrategyTabs from './components/StrategyTabs';

const KEY_STORAGE = 'vstock_anthropic_key';
const PREF_STORAGE = 'vstock_prefs_v7';
const WATCHLIST_STORAGE = 'vstock_watchlist_v7';

function loadPrefs() { try { return JSON.parse(localStorage.getItem(PREF_STORAGE) || '{}'); } catch { return {}; } }
function savePrefs(p) { try { localStorage.setItem(PREF_STORAGE, JSON.stringify(p)); } catch {} }

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE) || '');
  const [keyEditing, setKeyEditing] = useState(!apiKey);

  const initial = loadPrefs();
  const [mode, setMode] = useState(initial.mode || 'standard');
  const [tier, setTier] = useState(initial.tier || 'tier1');
  const [selectedInd, setSelectedInd] = useState(initial.selectedInd || INDUSTRIES.map((i) => i.id));
  const [enabledStrategies, setEnabledStrategies] = useState(initial.enabledStrategies || ['value', 'swing', 'daytrade', 'dividend']);
  const [activeStrategy, setActiveStrategy] = useState(initial.activeStrategy || 'value');
  const [view, setView] = useState(initial.view || 'top');

  const queueRef = useRef(null);
  const [activeQueue, setActiveQueue] = useState(null);

  const [running, setRunning] = useState(false);
  const [regime, setRegime] = useState(null);
  const [regimeError, setRegimeError] = useState(null);
  const [regimeFromCache, setRegimeFromCache] = useState(false);

  // strategyData[strategyId][sectorId] = { status, data, error }
  const [strategyData, setStrategyData] = useState({});

  const [usageRefresh, setUsageRefresh] = useState(0);
  const [deepDiveTicker, setDeepDiveTicker] = useState(null);
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem(WATCHLIST_STORAGE) || '[]'); } catch { return []; }
  });

  useEffect(() => { try { localStorage.setItem(WATCHLIST_STORAGE, JSON.stringify(watchlist)); } catch {} }, [watchlist]);
  useEffect(() => {
    savePrefs({ mode, selectedInd, view, tier, enabledStrategies, activeStrategy });
  }, [mode, selectedInd, view, tier, enabledStrategies, activeStrategy]);

  // If active strategy gets disabled, fall back to first enabled
  useEffect(() => {
    if (!enabledStrategies.includes(activeStrategy) && enabledStrategies.length > 0) {
      setActiveStrategy(enabledStrategies[0]);
    }
  }, [enabledStrategies, activeStrategy]);

  const toggleWatch = (ticker) => {
    if (!ticker) return;
    setWatchlist((p) => (p.includes(ticker) ? p.filter((t) => t !== ticker) : [...p, ticker]));
  };
  const recordUsageAndRefresh = (usage, modeKey, label) => {
    recordUsage(usage, modeKey, label);
    setUsageRefresh((n) => n + 1);
  };
  const activeIndustries = INDUSTRIES.filter((i) => selectedInd.includes(i.id));
  const toggleIndustry = (id) =>
    setSelectedInd((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleStrategy = (id) =>
    setEnabledStrategies((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // Total scans = strategies × sectors  +  1 (regime)
  const totalCalls = enabledStrategies.length * activeIndustries.length + 1;
  const cost = estimateCost(mode, enabledStrategies.length * activeIndustries.length);

  // Aggregate per strategy for the active tab
  const activeStrategyData = strategyData[activeStrategy] || {};
  const agg = useMemo(
    () => aggregate(activeStrategyData, activeIndustries),
    [activeStrategyData, activeIndustries]
  );

  // Completion counts per strategy
  const completionByStrategy = useMemo(() => {
    const out = {};
    for (const sid of STRATEGY_IDS) {
      const data = strategyData[sid] || {};
      let done = 0;
      let total = 0;
      for (const ind of activeIndustries) {
        if (!data[ind.id]) continue;
        total++;
        if (data[ind.id].status === 'done') done++;
      }
      out[sid] = { done, total: enabledStrategies.includes(sid) ? activeIndustries.length : 0 };
    }
    return out;
  }, [strategyData, activeIndustries, enabledStrategies]);

  const completedCount = Object.values(activeStrategyData).filter((v) => v.status === 'done').length;
  const errorCount = Object.values(activeStrategyData).filter((v) => v.status === 'error').length;
  const loadingCount = Object.values(activeStrategyData).filter((v) => v.status === 'loading' || v.status === 'pending').length;
  const hasResults = regime || Object.keys(strategyData).some((sid) =>
    Object.values(strategyData[sid] || {}).some((v) => v.status === 'done')
  );

  const fatalError = useMemo(() => {
    if (regimeError && (regimeError.kind === 'credit' || regimeError.kind === 'auth')) return regimeError;
    for (const sid of Object.keys(strategyData)) {
      for (const id of Object.keys(strategyData[sid] || {})) {
        const err = strategyData[sid][id]?.error;
        if (err && (err.kind === 'credit' || err.kind === 'auth')) return err;
      }
    }
    return null;
  }, [regimeError, strategyData]);

  const saveKey = () => {
    const t = apiKey.trim();
    if (t && t.startsWith('sk-ant-')) {
      localStorage.setItem(KEY_STORAGE, t);
      setKeyEditing(false);
    } else {
      alert("That doesn't look like a valid Anthropic API key. They start with sk-ant-");
    }
  };

  const setSectorState = (strategyId, sectorId, val) =>
    setStrategyData((prev) => ({
      ...prev,
      [strategyId]: { ...(prev[strategyId] || {}), [sectorId]: val },
    }));

  const runAgent = async (forceRegimeRefresh = false) => {
    if (!apiKey) { setKeyEditing(true); return; }
    if (activeIndustries.length === 0) { alert('Select at least one sector.'); return; }
    if (enabledStrategies.length === 0) { alert('Enable at least one strategy.'); return; }

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

    // Initialize all enabled strategy × sector slots as pending
    const initial = {};
    for (const sid of enabledStrategies) {
      initial[sid] = {};
      for (const ind of activeIndustries) {
        initial[sid][ind.id] = { status: 'pending', data: null, error: null };
      }
    }
    setStrategyData(initial);

    // 1. Market regime (run once)
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
          for (const sid of enabledStrategies)
            for (const ind of activeIndustries)
              setSectorState(sid, ind.id, { status: 'error', data: null, error: err });
          setRunning(false);
          return;
        }
      }
    }

    // 2. For each strategy × each sector, queue a scan
    const allPromises = [];
    for (const strategyId of enabledStrategies) {
      for (const ind of activeIndustries) {
        setSectorState(strategyId, ind.id, { status: 'loading', data: null, error: null });
        const label = `${STRATEGIES[strategyId]?.short || strategyId}/${ind.short}`;
        allPromises.push(
          queue.add(() => fetchStrategyPicks(apiKey, strategyId, ind.id, { mode }), label)
            .then(({ data, usage }) => {
              recordUsageAndRefresh(usage, mode, label);
              setSectorState(strategyId, ind.id, { status: 'done', data, error: null });
            })
            .catch((err) => {
              setSectorState(strategyId, ind.id, { status: 'error', data: null, error: err });
              if (err.kind === 'credit' || err.kind === 'auth') queue.drain();
            })
        );
      }
    }

    await Promise.allSettled(allPromises);
    setRunning(false);
    setActiveQueue(null);
  };

  const retrySector = async (strategyId, industryId) => {
    if (!apiKey) return;
    setSectorState(strategyId, industryId, { status: 'loading', data: null, error: null });
    const tierCfg = TIERS[tier] || TIERS.tier1;
    const q = new RateLimitQueue({ concurrency: 1, minSpacingMs: tierCfg.minSpacingMs, maxRetries: 4 });
    try {
      const { data, usage } = await q.add(() => fetchStrategyPicks(apiKey, strategyId, industryId, { mode }), 'retry');
      recordUsageAndRefresh(usage, mode, `${strategyId}/retry`);
      setSectorState(strategyId, industryId, { status: 'done', data, error: null });
    } catch (err) {
      setSectorState(strategyId, industryId, { status: 'error', data: null, error: err });
    }
  };

  const scrollToSector = (id) => {
    const el = document.getElementById(`sector-${activeStrategy}-${id}`);
    if (el) {
      setView('industries');
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
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
              Multi-Strategy Stock Intelligence
            </span>
          </div>
          <h1 className="display text-5xl sm:text-7xl font-light leading-[0.95] tracking-tight mb-4">
            <span className="shimmer-text italic">V-Stock</span>
          </h1>
          <p className="text-stone-400 text-base sm:text-lg max-w-2xl leading-relaxed">
            Four strategies, one dashboard. Long-term value · swing setups · day trades · dividend income — each with its own scoring model, 10 picks per sector.
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
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <span className="mono text-[10px] tracking-[0.2em] uppercase text-stone-400">Strategies ({enabledStrategies.length}/4)</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {Object.values(STRATEGIES).map((s) => {
              const enabled = enabledStrategies.includes(s.id);
              return (
                <button key={s.id} onClick={() => toggleStrategy(s.id)} disabled={running}
                  className={`text-left p-3 rounded-lg border transition disabled:opacity-50 ${
                    enabled
                      ? 'border-amber-400/60 bg-amber-500/10'
                      : 'border-stone-800 bg-stone-900/40 hover:border-stone-700'
                  }`}>
                  <div className={`display text-base mb-1 ${enabled ? 'text-amber-200' : 'text-stone-400'}`}>{s.label}</div>
                  <div className="mono text-[10px] text-stone-500 leading-snug">{s.description}</div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-3.5 h-3.5 text-stone-400" />
            <span className="mono text-[10px] tracking-[0.2em] uppercase text-stone-400">Scan Depth</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {Object.entries(MODES).map(([key, m]) => {
              const active = mode === key;
              return (
                <button key={key} onClick={() => setMode(key)} disabled={running}
                  className={`text-left p-3 rounded-lg border transition disabled:opacity-50 ${
                    active ? 'border-amber-400/60 bg-amber-500/10 ring-1 ring-amber-400/30'
                           : 'border-stone-800 bg-stone-900/40 hover:border-stone-700'
                  }`}>
                  <div className={`display text-base mb-1 ${active ? 'text-amber-200' : 'text-stone-200'}`}>{m.label}</div>
                  <div className="mono text-[10px] text-stone-500 leading-snug">{m.description}</div>
                </button>
              );
            })}
          </div>

          <div className="mb-6 p-3 rounded-lg border border-amber-900/30 bg-amber-950/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5 text-amber-400/80" />
              <span className="mono text-[10px] tracking-[0.2em] uppercase text-stone-400">API Tier</span>
              <a href="https://console.anthropic.com/settings/limits" target="_blank" rel="noreferrer"
                 className="text-[10px] text-stone-500 underline hover:text-amber-300 ml-auto">Check your tier →</a>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {Object.entries(TIERS).map(([key, t]) => {
                const active = tier === key;
                return (
                  <button key={key} onClick={() => setTier(key)} disabled={running}
                    className={`text-left p-2 rounded border transition disabled:opacity-50 ${
                      active ? 'border-amber-400/60 bg-amber-500/10' : 'border-stone-800 bg-stone-900/40 hover:border-stone-700'
                    }`}>
                    <div className={`text-[11px] font-medium ${active ? 'text-amber-200' : 'text-stone-300'}`}>{t.label}</div>
                    <div className="text-[9px] text-stone-500 leading-snug mt-0.5">{t.description}</div>
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] text-stone-500 mt-2">
              On Tier 1 with all 4 strategies × 6 sectors = 24 calls. Expect ~5-10 minutes per run.
            </div>
          </div>

          <div className="mb-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="mono text-[10px] tracking-[0.2em] uppercase text-stone-400">Sectors ({selectedInd.length} of {INDUSTRIES.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRIES.map((ind) => {
                const active = selectedInd.includes(ind.id);
                return (
                  <button key={ind.id} onClick={() => toggleIndustry(ind.id)} disabled={running}
                    className={`text-xs px-2.5 py-1 rounded-md border transition disabled:opacity-50 ${
                      active ? 'bg-amber-400/15 border-amber-400/40 text-amber-200'
                             : 'bg-stone-900/40 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}>
                    {ind.short}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <DollarSign size={11} />
            Est cost: <span className="mono text-amber-300/80">${cost.toFixed(2)}</span>
            <span className="text-stone-600">· {totalCalls} API calls · {enabledStrategies.length} strategies × {activeIndustries.length} sectors × 10 picks</span>
          </span>
        </div>

        <button onClick={() => runAgent(false)} disabled={running || !apiKey || enabledStrategies.length === 0}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 font-medium hover:from-amber-400 hover:to-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
          {running ? (
            <><Loader2 size={16} className="animate-spin" /> Running multi-strategy scan...</>
          ) : (
            <span className="tracking-wide">{hasResults ? 'RUN AGAIN' : 'DEPLOY AGENT'}</span>
          )}
        </button>

        {regimeFromCache && hasResults && (
          <button onClick={() => runAgent(true)} disabled={running}
            className="w-full mt-2 mb-6 text-xs text-stone-500 hover:text-amber-300 transition py-1 mono tracking-wider uppercase">
            ↻ refresh market valuation (cached, &lt;5min old)
          </button>
        )}

        {!apiKey && !keyEditing && <p className="my-3 text-center text-xs text-amber-400/80">Add your Anthropic API key above.</p>}
        {fatalError && <div className="mt-6"><ApiError error={fatalError} onRetry={() => runAgent(true)} contextLabel="The agent stopped" /></div>}
        {regimeError && !fatalError && <div className="mt-6"><ApiError error={regimeError} onRetry={() => runAgent(true)} contextLabel="Market valuation scan failed" /></div>}

        {running && activeQueue && (
          <div className="mt-6">
            <QueueStatus queue={activeQueue} totalExpected={totalCalls} label={`${TIERS[tier]?.label || 'Tier 1'} · ${enabledStrategies.length}×${activeIndustries.length} scans`} />
          </div>
        )}

        {/* RESULTS */}
        {hasResults && (
          <div className="mt-8">
            {regime && <RegimeCard regime={regime} fromCache={regimeFromCache} />}

            {/* STRATEGY TABS — top level */}
            <div className="mb-4">
              <StrategyTabs
                active={activeStrategy}
                onChange={setActiveStrategy}
                enabled={enabledStrategies}
                completionByStrategy={completionByStrategy}
              />
            </div>

            {/* Sub-tabs */}
            <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex p-1 rounded-xl border border-stone-800 bg-stone-950/60 flex-wrap">
                <ViewTab active={view === 'top'} onClick={() => setView('top')}
                         icon={<Target className="w-3.5 h-3.5" />} label="Top Picks" />
                <ViewTab active={view === 'dashboard'} onClick={() => setView('dashboard')}
                         icon={<LayoutDashboard className="w-3.5 h-3.5" />} label="Dashboard" />
                <ViewTab active={view === 'industries'} onClick={() => setView('industries')}
                         icon={<ListTree className="w-3.5 h-3.5" />} label="By Sector" />
              </div>
              <div className="text-xs text-stone-500">
                {loadingCount > 0 && `${loadingCount} loading · `}
                {errorCount > 0 && `${errorCount} failed · `}
                {completedCount} of {activeIndustries.length} sectors ({STRATEGIES[activeStrategy]?.label})
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

            {view === 'top' && (
              <StrategyTopPicks
                strategyId={activeStrategy}
                picks={agg.topConviction}
                limit={15}
                watchlist={watchlist}
                onTickerClick={(t) => setDeepDiveTicker(t)}
                onToggleWatch={toggleWatch}
              />
            )}

            {view === 'dashboard' && (
              <Dashboard
                aggregate={agg}
                onSectorClick={scrollToSector}
                onTickerClick={(t) => setDeepDiveTicker(t)}
              />
            )}

            {view === 'industries' && (
              <div className="space-y-6">
                {activeIndustries.map((ind) => (
                  <StrategySection
                    key={`${activeStrategy}-${ind.id}`}
                    strategyId={activeStrategy}
                    sectionId={`sector-${activeStrategy}-${ind.id}`}
                    industry={ind}
                    state={activeStrategyData[ind.id] || { status: 'pending' }}
                    onRetry={() => retrySector(activeStrategy, ind.id)}
                    onTickerClick={(t) => setDeepDiveTicker(t)}
                    watchlist={watchlist}
                    onToggleWatch={toggleWatch}
                  />
                ))}
              </div>
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
                Pick strategies + sectors, then deploy. Each strategy returns 10 picks per sector scored on its own framework.
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
              V-Stock generates research candidates across 4 strategies using AI + web search. Day-trade and swing-trade signals are especially noisy — verify technicals on your charting tool. Always cross-check fundamentals against SEC EDGAR. Not investment advice.
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
        picks={agg.allPicks || []}
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
