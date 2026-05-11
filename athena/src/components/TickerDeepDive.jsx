import { useState, useEffect } from 'react';
import { X, Loader2, Search, TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';
import { fetchTickerDeepDive } from '../lib/agent.js';
import ApiError from './ApiError.jsx';

const CACHE_KEY = 'vstock_deep_dives_v5';
const TTL_MS = 10 * 60 * 1000;

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

export default function TickerDeepDive({ ticker, apiKey, mode, onClose, onUsage }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    const cache = loadCache();
    const cached = cache[ticker];
    if (cached && Date.now() - cached.savedAt < TTL_MS) {
      setData(cached.data);
      setFromCache(true);
      return;
    }
    runDeepDive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  async function runDeepDive(force) {
    if (!apiKey) { setError({ kind: 'auth', message: 'No API key' }); return; }
    setLoading(true); setError(null); setFromCache(false);
    try {
      const result = await fetchTickerDeepDive(apiKey, ticker, { mode });
      setData(result.data);
      onUsage && onUsage(result.usage, mode, 'deep-dive');
      const cache = loadCache();
      cache[ticker] = { data: result.data, savedAt: Date.now() };
      saveCache(cache);
    } catch (e) {
      setError({ kind: e.kind || 'unknown', message: e.message, raw: e.raw });
    } finally {
      setLoading(false);
    }
  }

  if (!ticker) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-[#0a0a14] border border-white/10 rounded-2xl shadow-2xl my-auto">
        {/* header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-white/10 bg-[#0a0a14]/95 backdrop-blur flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-amber-400/15 flex items-center justify-center flex-shrink-0">
              <Search size={18} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="mono text-2xl text-white font-medium">{ticker}</span>
                {data?.company && <span className="text-sm text-white/60 truncate">· {data.company}</span>}
              </div>
              <div className="text-xs text-white/40">
                Deep-dive research {fromCache && '· cached'} {loading && '· loading...'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <button
                onClick={() => runDeepDive(true)}
                className="text-xs px-3 py-1.5 rounded border border-white/15 text-white/70 hover:bg-white/5"
              >
                Refresh
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="p-6">
          {loading && !data && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={28} className="text-amber-300 animate-spin" />
              <div className="text-sm text-white/60">Pulling research on {ticker}...</div>
              <div className="text-xs text-white/40">News, earnings, smart money, technicals, catalysts</div>
            </div>
          )}

          {error && (
            <ApiError error={error} title={`Failed to research ${ticker}`} onRetry={() => runDeepDive(true)} />
          )}

          {data && !loading && <DeepDiveContent data={data} />}
        </div>
      </div>
    </div>
  );
}

function DeepDiveContent({ data }) {
  const verdict = String(data?.verdict || '').toLowerCase();
  const verdictClr =
    verdict.includes('strong buy') ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200' :
    verdict.includes('buy') ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200' :
    verdict.includes('hold') ? 'bg-amber-500/10 border-amber-400/30 text-amber-200' :
    verdict.includes('sell') ? 'bg-rose-500/10 border-rose-400/30 text-rose-200' :
                               'bg-white/5 border-white/15 text-white/70';

  return (
    <div className="space-y-5">
      {/* hero */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Price" value={data?.currentPrice != null ? `$${data.currentPrice}` : '—'} />
        <Stat label="Daily" value={data?.dailyChange || '—'} accent={String(data?.dailyChange || '').includes('-') ? 'red' : 'green'} />
        <Stat label="YTD" value={data?.ytdChange || '—'} accent={String(data?.ytdChange || '').includes('-') ? 'red' : 'green'} />
        <Stat label="Mkt Cap" value={data?.marketCap || '—'} />
        <Stat label="Score" value={data?.convictionScore ?? '—'} accent="amber" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded border ${verdictClr}`}>
          {data?.verdict || 'Unrated'}
        </span>
        <span className="text-xs text-white/50">Sector: {data?.sector || '—'}</span>
      </div>

      {data?.snapshot && (
        <div className="p-4 bg-amber-400/[0.06] border border-amber-400/20 rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">Snapshot</div>
          <div className="text-sm text-white/90 leading-relaxed">{data.snapshot}</div>
        </div>
      )}

      {/* outlook */}
      {data?.outlook && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <OutlookCard tone="bull" title="Bull Case" body={data.outlook.bullCase} />
          <OutlookCard tone="base" title="Base Case" body={data.outlook.baseCase} />
          <OutlookCard tone="bear" title="Bear Case" body={data.outlook.bearCase} />
        </div>
      )}

      {/* news */}
      {Array.isArray(data?.recentNews) && data.recentNews.length > 0 && (
        <Section title="Recent News" icon={Activity}>
          <div className="space-y-2">
            {data.recentNews.slice(0, 6).map((n, i) => {
              const dirClr = String(n?.direction || '').includes('bull') ? 'text-emerald-300' :
                             String(n?.direction || '').includes('bear') ? 'text-rose-300' : 'text-white/50';
              return (
                <div key={i} className="p-3 bg-white/[0.03] border border-white/5 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-[10px] mono text-white/40 mt-0.5 flex-shrink-0">{n?.date || '—'}</div>
                    <div className="flex-1">
                      <div className="text-sm text-white/95">{n?.headline || ''}</div>
                      <div className={`text-[10px] mt-1 uppercase tracking-wider ${dirClr}`}>
                        {n?.impact || 'medium'} · {n?.direction || 'neutral'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* smart money + technicals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.smartMoney && (
          <Section title="Smart Money" icon={TrendingUp}>
            <div className="space-y-2 text-sm">
              <KV k="Dark Pool" v={data.smartMoney.darkPoolSentiment} />
              <KV k="Inst. Flow" v={data.smartMoney.institutionalFlow} />
              <KV k="Insider" v={data.smartMoney.insiderActivity} />
              <KV k="Options" v={data.smartMoney.optionsFlow} />
              <KV k="Score" v={data.smartMoney.score != null ? `${data.smartMoney.score}/100` : '—'} />
            </div>
          </Section>
        )}
        {data?.technicals && (
          <Section title="Technicals" icon={Activity}>
            <div className="space-y-2 text-sm">
              <KV k="Trend" v={data.technicals.trend} />
              <KV k="Levels" v={data.technicals.keyLevels} />
              <KV k="RSI" v={data.technicals.rsi} />
              <KV k="Pattern" v={data.technicals.pattern} />
              <KV k="Volume" v={data.technicals.volume} />
            </div>
          </Section>
        )}
      </div>

      {/* catalysts + risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.isArray(data?.catalysts) && data.catalysts.length > 0 && (
          <Section title="Upcoming Catalysts" icon={TrendingUp}>
            <div className="space-y-2">
              {data.catalysts.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className="mono text-white/50 w-20 flex-shrink-0">{c?.date || 'TBD'}</div>
                  <div className="flex-1 text-white/85">{c?.event || ''}</div>
                  <div className="text-[10px] uppercase text-white/40">{c?.impact || 'med'}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
        {Array.isArray(data?.risks) && data.risks.length > 0 && (
          <Section title="Risks" icon={AlertTriangle} accent="rose">
            <ul className="space-y-1.5 text-xs text-white/85">
              {data.risks.slice(0, 5).map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-rose-400 mt-1">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {/* trade plan */}
      {data?.tradePlan && (
        <Section title="Trade Plan" icon={TrendingUp} accent="amber">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <KV k="Entry" v={data.tradePlan.entry} />
            <KV k="Stop" v={data.tradePlan.stop} />
            <KV k="Target" v={data.tradePlan.target} />
            <KV k="Horizon" v={data.tradePlan.horizon} />
          </div>
        </Section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  const clr = accent === 'green' ? 'text-emerald-300' :
              accent === 'red' ? 'text-rose-300' :
              accent === 'amber' ? 'text-amber-300' : 'text-white';
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`mono text-base ${clr} mt-0.5`}>{value}</div>
    </div>
  );
}

function Section({ title, icon: Icon, accent, children }) {
  const clr = accent === 'rose' ? 'text-rose-300' : accent === 'amber' ? 'text-amber-300' : 'text-white/70';
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={13} className={clr} />}
        <h4 className="display text-sm text-white">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-white/45 w-20 flex-shrink-0">{k}</span>
      <span className="text-white/85 text-right flex-1 break-words">{v || '—'}</span>
    </div>
  );
}

function OutlookCard({ tone, title, body }) {
  const styles = tone === 'bull'
    ? 'bg-emerald-500/[0.06] border-emerald-400/20'
    : tone === 'bear'
      ? 'bg-rose-500/[0.06] border-rose-400/20'
      : 'bg-amber-500/[0.06] border-amber-400/20';
  const titleClr = tone === 'bull' ? 'text-emerald-300' : tone === 'bear' ? 'text-rose-300' : 'text-amber-300';
  return (
    <div className={`p-3 rounded-lg border ${styles}`}>
      <div className={`text-[10px] uppercase tracking-wider ${titleClr} mb-1`}>{title}</div>
      <div className="text-xs text-white/90 leading-relaxed">{body || '—'}</div>
    </div>
  );
}
