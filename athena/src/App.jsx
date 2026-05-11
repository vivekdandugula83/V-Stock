import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, Loader2, Sparkles, BarChart3, Clock, Shield, Eye,
  ArrowUpRight, Key, Lock, DollarSign, Gauge, Layers, LayoutDashboard, ListTree,
  Target, Newspaper, Flame, Activity,
} from 'lucide-react';

import {
  INDUSTRIES, MODES, estimateCost,
  fetchMarketRegime, fetchIndustryPicks, fetchNewsPulse, fetchDailyMovers,
  loadCachedRegime, saveCachedRegime,
} from './lib/agent';
import { aggregate, darkSignalsLeaderboard } from './lib/aggregate';
import { recordUsage } from './lib/usage';
import RegimeCard from './components/RegimeCard';
import IndustrySection from './components/IndustrySection';
import Dashboard from './components/Dashboard';
import ApiError from './components/ApiError';
import UsageMeter from './components/UsageMeter';
import Top10Panel from './components/Top10Panel';
import DarkSignalsLeaderboard from './components/DarkSignalsLeaderboard';
import NewsPulse from './components/NewsPulse';
import TickerDeepDive from './components/TickerDeepDive';
import WatchlistPanel from './components/WatchlistPanel';
import DailyMovers from './components/DailyMovers';
import MarketHeatmap from './components/MarketHeatmap';

const KEY_STORAGE = 'vstock_anthropic_key';
const PREF_STORAGE = 'vstock_prefs_v5';
const WATCHLIST_STORAGE = 'vstock_watchlist_v5';

const loadPrefs = () => {
  try { return JSON.parse(localStorage.getItem(PREF_STORAGE) || '{}'); }
  catch { return {}; }
};
const savePrefs = (p) => {
  try { localStorage.setItem(PREF_STORAGE, JSON.stringify(p)); } catch {}
};

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE) || '');
  const [keyEditing, setKeyEditing] = useState(!localStorage.getItem(KEY_STORAGE));
  const [keyInput, setKeyInput] = useState('');

  const initial = loadPrefs();
  const [mode, setMode] = useState(initial.mode || 'standard');
  const [risk, setRisk] = useState(initial.risk || 'moderate');
  const [horizon, setHorizon] = useState(initial.horizon || 'swing');
  const [accountSize, setAccountSize] = useState(initial.accountSize || '25000');
  const [selectedInd, setSelectedInd] = useState(initial.selectedInd || INDUSTRIES.map((i) => i.id));
  const [view, setView] = useState(initial.view || 'movers');

  const [running, setRunning] = useState(false);
  const [regime, setRegime] = useState(null);
  const [regimeError, setRegimeError] = useState(null);
  const [regimeFromCache, setRegimeFromCache] = useState(false);
  const [industryData, setIndustryData] = useState({});
  const [usageRefresh, setUsageRefresh] = useState(0);
  const [newsPulse, setNewsPulse] = useState(null);
  const [newsPulseError, setNewsPulseError] = useState(null);
  const [movers, setMovers] = useState(null);
  const [moversError, setMoversError] = useState(null);
  const [moversLoading, setMoversLoading] = useState(false);
  const [deepDiveTicker, setDeepDiveTicker] = useState(null);
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem(WATCHLIST_STORAGE) || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(WATCHLIST_STORAGE, JSON.stringify(watchlist)); } catch {}
  }, [watchlist]);

  const toggleWatch = (ticker) => {
    if (!ticker) return;
    setWatchlist((prev) =>
      prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker]
    );
  };

  const recordUsageAndRefresh = (usage, modeKey, label) => {
    recordUsage(usage, modeKey, label);
    setUsageRefresh((n) => n + 1);
  };

  useEffect(() => {
    savePrefs({ mode, risk, horizon, accountSize, selectedInd, view });
  }, [mode, risk, horizon, accountSize, selectedInd, view]);

  const saveKey = () => {
    const trimmed = keyInput.trim();
    if (!trimmed.startsWith('sk-ant-')) {
      alert('Anthropic API keys start with "sk-ant-".');
      return;
    }
    localStorage.setItem(KEY_STORAGE, trimmed);
    setApiKey(trimmed);
    setKeyEditing(false);
    setKeyInput('');
  };

  const clearKey = () => {
    localStorage.removeItem(KEY_STORAGE);
    setApiKey('');
    setKeyEditing(true);
  };

  const toggleIndustry = (id) => {
    setSelectedInd((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const activeIndustries = useMemo(
    () => INDUSTRIES.filter((i) => selectedInd.includes(i.id)),
    [selectedInd]
  );
  const cost = estimateCost(mode, activeIndustries.length);
  const agg = useMemo(() => aggregate(industryData, activeIndustries), [industryData, activeIndustries]);
  const darkSignals = useMemo(() => darkSignalsLeaderboard(agg.allPicks), [agg.allPicks]);

  const runAgent = async (forceRegimeRefresh = false) => {
    if (!apiKey) { setKeyEditing(true); return; }
    if (activeIndustries.length === 0) {
      alert('Select at least one industry.');
      return;
    }

    setRunning(true);
    setRegime(null);
    setRegimeError(null);
    setRegimeFromCache(false);
    setNewsPulse(null);
    setNewsPulseError(null);
    setMovers(null);
    setMoversError(null);
    setMoversLoading(true);
    setIndustryData(Object.fromEntries(
      activeIndustries.map((i) => [i.id, { status: 'pending', data: null, error: null }])
    ));

    let regimeResult = forceRegimeRefresh ? null : loadCachedRegime(mode, risk, horizon);
    let regimeFailed = false;

    if (regimeResult) {
      setRegime(regimeResult);
      setRegimeFromCache(true);
    } else {
      try {
        const { data, usage } = await fetchMarketRegime(apiKey, { horizon, risk, mode });
        regimeResult = data;
        recordUsageAndRefresh(usage, mode, 'regime');
        setRegime(regimeResult);
        saveCachedRegime(regimeResult, mode, risk, horizon);
      } catch (err) {
        setRegimeError(err);
        regimeFailed = true;
        if (err.kind === 'credit' || err.kind === 'auth') {
          setIndustryData(Object.fromEntries(
            activeIndustries.map((i) => [i.id, { status: 'error', data: null, error: err }])
          ));
          setMoversLoading(false);
          setRunning(false);
          return;
        }
      }
    }

    // Daily movers — parallel
    fetchDailyMovers(apiKey, { mode })
      .then(({ data, usage }) => {
        recordUsageAndRefresh(usage, mode, 'movers');
        setMovers(data);
      })
      .catch((err) => setMoversError(err))
      .finally(() => setMoversLoading(false));

    // News pulse — parallel
    fetchNewsPulse(apiKey, { mode })
      .then(({ data, usage }) => {
        recordUsageAndRefresh(usage, mode, 'news');
        setNewsPulse(data);
      })
      .catch((err) => {
        setNewsPulseError(err);
      });

    const ctx = { horizon, risk, regime: regimeResult?.regime, mode };
    activeIndustries.forEach((ind) => {
      setIndustryData((p) => ({ ...p, [ind.id]: { status: 'loading', data: null, error: null } }));
      fetchIndustryPicks(apiKey, ind.id, ctx)
        .then(({ data, usage }) => {
          recordUsageAndRefresh(usage, mode, ind.short);
          setIndustryData((p) => ({ ...p, [ind.id]: { status: 'done', data, error: null } }));
        })
        .catch((err) => {
          setIndustryData((p) => ({ ...p, [ind.id]: { status: 'error', data: null, error: err } }));
        });
    });

    const checkDone = setInterval(() => {
      setIndustryData((current) => {
        const stillLoading = Object.values(current).some(
          (v) => v.status === 'loading' || v.status === 'pending'
        );
        if (!stillLoading) {
          clearInterval(checkDone);
          setRunning(false);
        }
        return current;
      });
    }, 800);
  };

  const retryIndustry = async (industryId) => {
    if (!apiKey) return;
    setIndustryData((p) => ({ ...p, [industryId]: { status: 'loading', data: null, error: null } }));
    try {
      const { data, usage } = await fetchIndustryPicks(apiKey, industryId, {
        horizon, risk, regime: regime?.regime, mode,
      });
      const ind = INDUSTRIES.find((i) => i.id === industryId);
      recordUsageAndRefresh(usage, mode, ind?.short || industryId);
      setIndustryData((p) => ({ ...p, [industryId]: { status: 'done', data, error: null } }));
    } catch (err) {
      setIndustryData((p) => ({ ...p, [industryId]: { status: 'error', data: null, error: err } }));
    }
  };

  const scrollToSector = (sectorId) => {
    setView('industries');
    setTimeout(() => {
      const el = document.getElementById(`sector-${sectorId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const completedCount = Object.values(industryData).filter((v) => v.status === 'done').length;
  const errorCount = Object.values(industryData).filter((v) => v.status === 'error').length;
  const loadingCount = Object.values(industryData).filter(
    (v) => v.status === 'loading' || v.status === 'pending'
  ).length;
  const hasResults = regime || completedCount > 0 || movers;
  const accountNum = parseFloat(accountSize) || 0;

  // Find first credit/auth error to surface big banner
  const fatalError = regimeError && (regimeError.kind === 'credit' || regimeError.kind === 'auth')
    ? regimeError
    : Object.values(industryData)
        .map((v) => v.error)
        .find((e) => e && (e.kind === 'credit' || e.kind === 'auth'));

  return (
    <div className="min-h-screen w-full" style={{
      background: 'radial-gradient(ellipse at top, #1a1410 0%, #0a0908 50%, #050403 100%)',
    }}>
      <div className="grain relative max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">

        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-amber-400 pulse-glow" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-amber-400 blur-md" />
            </div>
            <span className="mono text-[11px] tracking-[0.25em] uppercase text-amber-300/80">
              Live Market Intelligence · Multi-Stage AI Research
            </span>
          </div>
          <h1 className="display text-5xl sm:text-7xl font-light leading-[0.95] tracking-tight mb-4">
            <span className="shimmer-text italic">V-Stock</span>
          </h1>
          <p className="text-stone-400 text-base sm:text-lg max-w-2xl leading-relaxed">
            Top 50 daily movers · 10 picks per sector · dark-data signals · political/macro/tech news pulse · per-ticker deep-dive.
          </p>
        </header>

        {/* API key */}
        {keyEditing ? (
          <KeyGate keyInput={keyInput} setKeyInput={setKeyInput} onSave={saveKey}
                   onCancel={apiKey ? () => { setKeyEditing(false); setKeyInput(''); } : null} />
        ) : (
          <KeyStatus apiKey={apiKey} onEdit={() => setKeyEditing(true)} onClear={clearKey} />
        )}

        {/* Usage meter — always visible */}
        {apiKey && <UsageMeter refreshKey={usageRefresh} />}

        {/* Disclaimer */}
        <div className="flex gap-3 items-start my-6 px-4 py-3 rounded-lg border border-amber-900/40 bg-amber-950/20">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-amber-200/70 leading-relaxed">
            <span className="text-amber-300 font-semibold">Research aid, not investment advice.</span>{' '}
            "Dark data" signals lag real-time pro feeds. AI synthesis can hallucinate. Verify before risking capital.
          </p>
        </div>

        {/* Mode + mandate */}
        <section className="mb-6 p-5 sm:p-6 rounded-2xl border border-stone-800/80 bg-stone-950/40 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-amber-400/80" />
              <h2 className="mono text-[10px] tracking-[0.25em] uppercase text-stone-400">Research depth</h2>
            </div>
            <span className="mono text-xs text-emerald-400/80">≈ ${cost.toFixed(2)} / run</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-6">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
            <ControlGroup label="Risk profile" icon={<Shield className="w-3.5 h-3.5" />}>
              <select value={risk} onChange={(e) => setRisk(e.target.value)} disabled={running} className={selectCls}>
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </ControlGroup>
            <ControlGroup label="Time horizon" icon={<Clock className="w-3.5 h-3.5" />}>
              <select value={horizon} onChange={(e) => setHorizon(e.target.value)} disabled={running} className={selectCls}>
                <option value="intraday">Intraday (1-2 days)</option>
                <option value="swing">Swing (3-10 days)</option>
                <option value="position">Position (2-8 weeks)</option>
              </select>
            </ControlGroup>
            <ControlGroup label="Account size (USD)" icon={<DollarSign className="w-3.5 h-3.5" />}>
              <input type="number" value={accountSize} onChange={(e) => setAccountSize(e.target.value)}
                     disabled={running} placeholder="25000" className={selectCls} />
            </ControlGroup>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-1.5 mono text-[10px] tracking-[0.2em] uppercase text-stone-500">
                <Layers className="w-3.5 h-3.5 text-amber-500/70" />
                Sectors ({selectedInd.length} of {INDUSTRIES.length})
              </label>
              <div className="flex gap-3 mono text-[10px] uppercase tracking-wider">
                <button onClick={() => setSelectedInd(INDUSTRIES.map((i) => i.id))} disabled={running}
                        className="text-stone-500 hover:text-amber-300 transition disabled:opacity-50">all</button>
                <span className="text-stone-700">·</span>
                <button onClick={() => setSelectedInd([])} disabled={running}
                        className="text-stone-500 hover:text-rose-300 transition disabled:opacity-50">none</button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INDUSTRIES.map((ind) => {
                const active = selectedInd.includes(ind.id);
                return (
                  <button key={ind.id} onClick={() => toggleIndustry(ind.id)} disabled={running}
                          className={`text-left px-3 py-2 rounded-lg border text-xs transition disabled:opacity-50 flex items-center gap-2 ${
                            active ? 'bg-stone-900/80 border-stone-700/80'
                                   : 'bg-stone-950/40 border-stone-800/40 opacity-50 hover:opacity-80'
                          }`}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: active ? ind.color : '#3a3530' }} />
                    <span className={active ? 'text-stone-200' : 'text-stone-500 line-through decoration-stone-700'}>
                      {ind.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <button onClick={() => runAgent(false)} disabled={running || !apiKey || activeIndustries.length === 0}
                className="w-full group relative overflow-hidden rounded-lg py-4 px-6 font-semibold text-stone-950 transition-all disabled:cursor-not-allowed disabled:opacity-50 mb-2"
                style={{
                  background: running ? '#3a3530' : 'linear-gradient(180deg, #f5e6c8 0%, #d4a574 100%)',
                  boxShadow: running ? 'none' : '0 0 40px rgba(212, 165, 116, 0.25), inset 0 1px 0 rgba(255,255,255,0.4)',
                }}>
          <span className="relative z-10 flex items-center justify-center gap-2">
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#d4a574' }} />
                <span className="text-stone-300 mono text-sm tracking-wider">
                  {regime ? `Researching ${activeIndustries.length} sector${activeIndustries.length > 1 ? 's' : ''} · ${completedCount}/${activeIndustries.length} done`
                          : 'Reading market regime…'}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span className="tracking-wide">{hasResults ? 'RUN AGAIN' : 'DEPLOY AGENT'}</span>
                <span className="mono text-xs opacity-70 ml-1">≈ ${cost.toFixed(2)}</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </>
            )}
          </span>
        </button>

        {regimeFromCache && hasResults && (
          <button onClick={() => runAgent(true)} disabled={running}
                  className="w-full mb-6 text-xs text-stone-500 hover:text-amber-300 transition py-1 mono tracking-wider uppercase">
            ↻ refresh market regime (cached, &lt;5min old)
          </button>
        )}

        {!apiKey && !keyEditing && (
          <p className="my-3 text-center text-xs text-amber-400/80">Add your Anthropic API key above.</p>
        )}

        {/* Fatal error banner — credit/auth */}
        {fatalError && (
          <ApiError error={fatalError} onRetry={() => runAgent(true)} contextLabel="The agent stopped" />
        )}

        {/* Non-fatal regime error */}
        {regimeError && !fatalError && (
          <ApiError error={regimeError} onRetry={() => runAgent(true)} contextLabel="Market briefing failed" />
        )}

        {running && (
          <div className="mb-6 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${activeIndustries.length}, minmax(0, 1fr))` }}>
            {activeIndustries.map((ind) => {
              const s = industryData[ind.id]?.status;
              return (
                <div key={ind.id} className="h-1 rounded-full overflow-hidden bg-stone-800" title={ind.label}>
                  <div className="h-full transition-all" style={{
                    width: s === 'done' ? '100%' : s === 'loading' ? '60%' : s === 'error' ? '100%' : '0%',
                    background: s === 'done' ? '#34d399' : s === 'loading' ? ind.color : s === 'error' ? '#f87171' : 'transparent',
                    animation: s === 'loading' ? 'pulseGlow 1.5s ease-in-out infinite' : 'none',
                  }} />
                </div>
              );
            })}
          </div>
        )}

        {regime && <RegimeCard regime={regime} fromCache={regimeFromCache} />}

        {hasResults && (
          <>
            <div className="my-8 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex p-1 rounded-xl border border-stone-800 bg-stone-950/60 flex-wrap">
                <ViewTab active={view === 'movers'} onClick={() => setView('movers')}
                         icon={<Flame className="w-3.5 h-3.5" />} label="Daily Movers" />
                <ViewTab active={view === 'research'} onClick={() => setView('research')}
                         icon={<Target className="w-3.5 h-3.5" />} label="Research" />
                <ViewTab active={view === 'signals'} onClick={() => setView('signals')}
                         icon={<Eye className="w-3.5 h-3.5" />} label="Dark signals" />
                <ViewTab active={view === 'news'} onClick={() => setView('news')}
                         icon={<Newspaper className="w-3.5 h-3.5" />} label="News pulse" />
                <ViewTab active={view === 'dashboard'} onClick={() => setView('dashboard')}
                         icon={<LayoutDashboard className="w-3.5 h-3.5" />} label="Overview" />
                <ViewTab active={view === 'industries'} onClick={() => setView('industries')}
                         icon={<ListTree className="w-3.5 h-3.5" />} label="By sector" />
              </div>
              <div className="text-xs text-stone-500">
                {moversLoading && '50 movers loading · '}
                {loadingCount > 0 && `${loadingCount} sectors loading · `}
                {errorCount > 0 && `${errorCount} failed · `}
                {completedCount > 0 && `${completedCount}/${activeIndustries.length} sectors`}
              </div>
            </div>

            {/* Watchlist always shown */}
            <div className="mb-6">
              <WatchlistPanel
                watchlist={watchlist}
                onTickerClick={(t) => setDeepDiveTicker(t)}
                onRemove={(t) => toggleWatch(t)}
                onSearch={(t) => setDeepDiveTicker(t)}
              />
            </div>

            {/* DAILY MOVERS — Top 50 today */}
            {view === 'movers' && (
              <div className="space-y-6">
                {moversLoading && !movers && !moversError && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                    <Loader2 className="w-6 h-6 text-amber-300 animate-spin mx-auto mb-3" />
                    <div className="text-sm text-white/60">Scanning the market for today's top 50 movers...</div>
                    <div className="text-xs text-white/40 mt-1">Gainers · Losers · Unusual volume · News catalysts</div>
                  </div>
                )}
                {moversError && (
                  <ApiError error={moversError} contextLabel="Daily movers scan failed" onRetry={() => {
                    setMoversError(null);
                    setMoversLoading(true);
                    fetchDailyMovers(apiKey, { mode })
                      .then(({ data, usage }) => { recordUsageAndRefresh(usage, mode, 'movers'); setMovers(data); })
                      .catch((err) => setMoversError(err))
                      .finally(() => setMoversLoading(false));
                  }} />
                )}
                {movers && (
                  <>
                    <DailyMovers
                      data={movers}
                      onTickerClick={(t) => setDeepDiveTicker(t)}
                      watchlist={watchlist}
                      onToggleWatch={toggleWatch}
                    />
                    <MarketHeatmap data={movers} onTickerClick={(t) => setDeepDiveTicker(t)} />
                  </>
                )}
              </div>
            )}

            {/* RESEARCH — High-potential picks across sectors */}
            {view === 'research' && (
              <div className="space-y-6">
                {completedCount === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                    <Loader2 className="w-6 h-6 text-amber-300 animate-spin mx-auto mb-3" />
                    <div className="text-sm text-white/60">Running sector specialists...</div>
                    <div className="text-xs text-white/40 mt-1">{loadingCount} of {activeIndustries.length} working</div>
                  </div>
                ) : (
                  <Top10Panel
                    picks={agg.topConviction}
                    watchlist={watchlist}
                    onTickerClick={(t) => setDeepDiveTicker(t)}
                    onToggleWatch={toggleWatch}
                  />
                )}
              </div>
            )}

            {view === 'signals' && (
              <DarkSignalsLeaderboard
                items={darkSignals}
                onTickerClick={(t) => setDeepDiveTicker(t)}
              />
            )}

            {view === 'news' && (
              <>
                {newsPulse ? (
                  <NewsPulse data={newsPulse} onTickerClick={(t) => setDeepDiveTicker(t)} />
                ) : newsPulseError ? (
                  <ApiError error={newsPulseError} contextLabel="News pulse failed" onRetry={() => {
                    setNewsPulseError(null);
                    fetchNewsPulse(apiKey, { mode })
                      .then(({ data, usage }) => {
                        recordUsageAndRefresh(usage, mode, 'news');
                        setNewsPulse(data);
                      })
                      .catch((err) => setNewsPulseError(err));
                  }} />
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-white/50">
                    <Loader2 className="w-5 h-5 animate-spin inline-block text-amber-300" />
                    <div className="mt-2 text-sm">Loading news pulse...</div>
                  </div>
                )}
              </>
            )}

            {view === 'dashboard' && completedCount > 0 && (
              <Dashboard aggregate={agg} regime={regime} onSectorClick={scrollToSector} />
            )}

            {view === 'industries' && (
              <div className="space-y-6">
                {activeIndustries.map((ind) => (
                  <IndustrySection
                    key={ind.id}
                    sectionId={`sector-${ind.id}`}
                    industry={ind}
                    state={industryData[ind.id] || { status: 'pending' }}
                    accountSize={accountNum}
                    onRetry={() => retryIndustry(ind.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!hasResults && !running && apiKey && (
          <>
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-stone-900/60 border border-stone-800 mb-5">
                <Eye className="w-6 h-6 text-stone-600" />
              </div>
              <p className="text-stone-500 max-w-md mx-auto">
                Configure your mandate and deploy. Cached regime keeps repeat runs cheap (~5 min TTL).
              </p>
            </div>
            <div className="max-w-md mx-auto">
              <WatchlistPanel
                watchlist={watchlist}
                onTickerClick={(t) => setDeepDiveTicker(t)}
                onRemove={(t) => toggleWatch(t)}
                onSearch={(t) => setDeepDiveTicker(t)}
              />
            </div>
          </>
        )}

        {hasResults && (
          <div className="mt-16 pt-8 border-t border-stone-900 text-[11px] text-stone-600 leading-relaxed mono tracking-wide">
            <p>
              Synthesized by Anthropic API ({MODES[mode].model}). Data may be stale or wrong. Backtest before risking capital.
              None of this is investment advice.
            </p>
          </div>
        )}
      </div>

      {/* Deep dive modal — top level so it can overlay everything */}
      {deepDiveTicker && (
        <TickerDeepDive
          ticker={deepDiveTicker}
          apiKey={apiKey}
          mode={mode}
          onClose={() => setDeepDiveTicker(null)}
          onUsage={recordUsageAndRefresh}
        />
      )}
    </div>
  );
}

const selectCls = 'w-full bg-stone-900/60 border border-stone-700/60 rounded-lg px-3.5 py-2.5 text-stone-100 text-sm focus:border-amber-500/60 focus:outline-none transition disabled:opacity-50';

function ControlGroup({ label, icon, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 mb-2 mono text-[10px] tracking-[0.2em] uppercase text-stone-500">
        <span className="text-amber-500/70">{icon}</span>{label}
      </label>
      {children}
    </div>
  );
}

function ViewTab({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs mono uppercase tracking-wider transition ${
              active ? 'bg-amber-400 text-stone-950 font-semibold' : 'text-stone-400 hover:text-stone-200'
            }`}>
      {icon}{label}
    </button>
  );
}

function KeyGate({ keyInput, setKeyInput, onSave, onCancel }) {
  return (
    <section className="mb-8 p-6 sm:p-7 rounded-2xl border border-amber-900/30 bg-gradient-to-br from-amber-950/20 to-stone-950/40">
      <div className="flex items-center gap-2 mb-3">
        <Key className="w-4 h-4 text-amber-400" />
        <h2 className="display text-xl text-stone-100">Anthropic API key</h2>
      </div>
      <p className="text-sm text-stone-400 mb-4 leading-relaxed">
        Stored only in your browser. Get one at{' '}
        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer"
           className="text-amber-300 underline hover:text-amber-200">console.anthropic.com</a>.
      </p>
      <div className="flex gap-2">
        <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && onSave()} placeholder="sk-ant-..." autoFocus
               className="flex-1 bg-stone-900/60 border border-stone-700/60 rounded-lg px-3.5 py-2.5 mono text-sm text-stone-100 focus:border-amber-500/60 focus:outline-none" />
        <button onClick={onSave} disabled={!keyInput.trim()}
                className="px-5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-semibold text-sm transition">
          Save
        </button>
        {onCancel && (
          <button onClick={onCancel} className="px-4 rounded-lg border border-stone-700 text-stone-300 hover:bg-stone-800 text-sm transition">
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}

function KeyStatus({ apiKey, onEdit, onClear }) {
  const masked = apiKey.slice(0, 10) + '…' + apiKey.slice(-4);
  return (
    <div className="mb-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-stone-800/70 bg-stone-950/40">
      <div className="flex items-center gap-2 min-w-0">
        <Lock className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
        <span className="mono text-xs text-stone-400 truncate">{masked}</span>
        <span className="text-[10px] mono uppercase tracking-wider text-emerald-400/80">connected</span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={onEdit} className="text-xs text-stone-400 hover:text-amber-300 transition">change</button>
        <span className="text-stone-700">·</span>
        <button onClick={onClear} className="text-xs text-stone-400 hover:text-rose-300 transition">clear</button>
      </div>
    </div>
  );
}
