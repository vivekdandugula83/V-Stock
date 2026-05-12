import { useState, useEffect } from 'react';
import { X, Loader2, Search, Users, TrendingUp, AlertTriangle, DollarSign, BarChart3, Building2 } from 'lucide-react';
import { fetchTickerDeepDive } from '../lib/agent.js';
import ApiError from './ApiError.jsx';
import SourceList from './SourceList.jsx';
import InstitutionalPanel from './InstitutionalPanel.jsx';

const CACHE_KEY = 'vstock_deep_dives_v7';
const TTL_MS = 10 * 60 * 1000;

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function saveCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
}

const VERDICT_STYLES = {
  'Deep Value':  'bg-emerald-500/15 border-emerald-400/40 text-emerald-200',
  'Undervalued': 'bg-cyan-500/10 border-cyan-400/30 text-cyan-200',
  'Fair Value':  'bg-amber-500/10 border-amber-400/30 text-amber-200',
  'Overvalued':  'bg-rose-500/10 border-rose-400/30 text-rose-200',
};

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
    runDeepDive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  async function runDeepDive() {
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
      <div className="relative w-full max-w-5xl bg-[#0a0a14] border border-white/10 rounded-2xl shadow-2xl my-auto">
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
                Value deep-dive {fromCache && '· cached'} {loading && '· loading...'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <button onClick={runDeepDive} className="text-xs px-3 py-1.5 rounded border border-white/15 text-white/70 hover:bg-white/5">
                Refresh
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading && !data && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={28} className="text-amber-300 animate-spin" />
              <div className="text-sm text-white/60">Running fundamental scan on {ticker}...</div>
              <div className="text-xs text-white/40">Valuation · Growth · SEC insider · Balance sheet</div>
            </div>
          )}

          {error && (
            <ApiError error={error} title={`Failed to research ${ticker}`} onRetry={runDeepDive} />
          )}

          {data && !loading && <DeepDiveContent data={data} />}
        </div>
      </div>
    </div>
  );
}

function DeepDiveContent({ data }) {
  const verdict = data?.verdict || 'Fair Value';
  const verdictClr = VERDICT_STYLES[verdict] || VERDICT_STYLES['Fair Value'];
  const v = data?.valuation || {};
  const g = data?.growth || {};
  const ins = data?.insiderActivity || {};
  const vol = data?.volume || {};
  const bs = data?.balanceSheet || {};
  const txs = Array.isArray(ins?.transactions) ? ins.transactions : [];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Price" value={data?.currentPrice != null ? `$${data.currentPrice}` : '—'} />
        <Stat label="Mkt Cap" value={data?.marketCap || '—'} />
        <Stat label="Sector" value={data?.sector || '—'} />
        <Stat label="Composite" value={data?.compositeScore ?? '—'} accent="amber" />
        <Stat label="Verdict" value={verdict} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded border ${verdictClr}`}>
          {verdict}
        </span>
      </div>

      {data?.snapshot && (
        <div className="p-4 bg-amber-400/[0.06] border border-amber-400/20 rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">Investment Thesis</div>
          <div className="text-sm text-white/90 leading-relaxed">{data.snapshot}</div>
        </div>
      )}

      {/* Four scoring panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScorePanel title="Valuation" score={v.score} weight="40%" color="text-cyan-300" icon={DollarSign}>
          <KV k="P/E (TTM)" v={v.pe} />
          <KV k="Forward P/E" v={v.forwardPe} />
          <KV k="PEG" v={v.peg} />
          <KV k="P/B" v={v.priceBook} />
          <KV k="EV/EBITDA" v={v.evToEbitda} />
          <KV k="Dividend Yield" v={v.dividendYield} />
          <KV k="vs Sector Median" v={v.vsSectorMedianPe} />
        </ScorePanel>

        <ScorePanel title="Growth & Profitability" score={g.score} weight="30%" color="text-emerald-300" icon={TrendingUp}>
          <KV k="Revenue YoY" v={g.revenueGrowthYoY} />
          <KV k="Revenue 5yr CAGR" v={g.revenue5yrCagr} />
          <KV k="EPS YoY" v={g.epsGrowthYoY} />
          <KV k="EPS 5yr CAGR" v={g.eps5yrCagr} />
          <KV k="Operating Margin" v={g.operatingMargin} />
          <KV k="Net Margin" v={g.netMargin} />
          <KV k="ROE" v={g.roe} />
          <KV k="ROIC" v={g.roic} />
          <KV k="FCF Growth" v={g.fcfGrowth} />
        </ScorePanel>

        <ScorePanel title="Insider Activity (SEC Form 4)" score={ins.score} weight="15%" color="text-violet-300" icon={Users}>
          <KV k="6mo Direction" v={ins.last6moDirection} />
          <KV k="Total Buys" v={ins.totalBuys} />
          <KV k="Total Sells" v={ins.totalSells} />
          <KV k="Buy Value" v={ins.totalBuyValue} />
          <KV k="Sell Value" v={ins.totalSellValue} />
          {txs.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="text-[10px] uppercase text-white/40 mb-1">Recent transactions</div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {txs.slice(0, 6).map((tx, i) => {
                  const isBuy = String(tx?.type || '').toLowerCase() === 'buy';
                  return (
                    <div key={i} className="text-[11px] flex items-start gap-2">
                      <span className="mono text-white/45 w-20 flex-shrink-0">{tx?.date || '—'}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${
                        isBuy ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                      }`}>{tx?.type || '?'}</span>
                      <span className="flex-1 text-white/80 break-words">{tx?.name || '—'} · {tx?.value || tx?.shares || '?'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ScorePanel>

        <ScorePanel title="Volume & Liquidity" score={vol.score} weight="15%" color="text-amber-300" icon={BarChart3}>
          <KV k="20d Avg Volume" v={vol.avgDaily20d} />
          <KV k="Current vs Avg" v={vol.currentVsAvg} />
          <KV k="Trend" v={vol.trend} />
          <KV k="Liquidity Grade" v={vol.liquidityGrade} />
        </ScorePanel>
      </div>

      {/* Balance sheet */}
      {(bs.debtToEquity || bs.fcf) && (
        <Section title="Balance Sheet" icon={Building2}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <KV k="D/E" v={bs.debtToEquity} />
            <KV k="Current Ratio" v={bs.currentRatio} />
            <KV k="FCF" v={bs.fcf} />
            <KV k="Cash" v={bs.cashOnHand} />
            <KV k="Credit" v={bs.creditRating} />
          </div>
        </Section>
      )}

      {/* Earnings */}
      {data?.earnings && (
        <Section title="Earnings" icon={TrendingUp}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <KV k="Last Date" v={data.earnings.lastDate} />
            <KV k="Result" v={data.earnings.result} />
            <KV k="Guidance" v={data.earnings.guidance} />
            <KV k="Next Date" v={data.earnings.nextDate} />
          </div>
        </Section>
      )}

      {/* Outlook */}
      {data?.outlook && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <OutlookCard tone="bull" title="Bull Case (12mo)" body={data.outlook.bullCase} />
          <OutlookCard tone="base" title="Base Case" body={data.outlook.baseCase} />
          <OutlookCard tone="bear" title="Bear Case" body={data.outlook.bearCase} />
        </div>
      )}

      {/* Risks */}
      {Array.isArray(data?.risks) && data.risks.length > 0 && (
        <Section title="Risks" icon={AlertTriangle} accent="rose">
          <ul className="space-y-1.5 text-sm">
            {data.risks.slice(0, 5).map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-white/85">
                <span className="text-rose-400 mt-1">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Institutional / smart money */}
      {data?.institutional && (
        <InstitutionalPanel institutional={data.institutional} />
      )}

      {/* Sources — full attribution */}
      <div className="pt-2">
        <SourceList sources={data?.sources || []} label="Sources used in this research" />
        <div className="mt-3 text-[11px] text-stone-500 italic">
          Always cross-check critical figures (P/E, insider Form 4, 13F) directly at <a href="https://www.sec.gov/edgar" target="_blank" rel="noreferrer" className="underline hover:text-amber-300">sec.gov/edgar</a> before committing capital.
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  const clr = accent === 'amber' ? 'text-amber-300' : 'text-white';
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`mono text-base ${clr} mt-0.5 truncate`}>{value}</div>
    </div>
  );
}

function Section({ title, icon: Icon, accent, children }) {
  const clr = accent === 'rose' ? 'text-rose-300' : 'text-white/70';
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

function ScorePanel({ title, score, weight, color, icon: Icon, children }) {
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={13} className={color} />}
          <h4 className="display text-sm text-white">{title}</h4>
          <span className="text-[9px] mono text-white/30">{weight}</span>
        </div>
        <div className={`display text-2xl ${color || 'text-white'}`}>{score || 0}</div>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-white/45 w-32 flex-shrink-0">{k}</span>
      <span className="text-white/85 text-right flex-1 break-words mono">{v ?? '—'}</span>
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
