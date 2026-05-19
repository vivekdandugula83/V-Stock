import { useState } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, AlertTriangle, Star, Target, ArrowUp, ArrowDown } from 'lucide-react';
import MiniChart from './MiniChart.jsx';
import SourceList from './SourceList.jsx';
import { safeStr } from './SafeText.jsx';

const RECOMMENDATION_STYLES = {
  'STRONG BUY': { bg: 'bg-emerald-500/20', border: 'border-emerald-400/50', text: 'text-emerald-200', dot: 'bg-emerald-400' },
  'BUY':        { bg: 'bg-cyan-500/15',    border: 'border-cyan-400/40',    text: 'text-cyan-200',    dot: 'bg-cyan-400' },
  'HOLD':       { bg: 'bg-amber-500/15',   border: 'border-amber-400/40',   text: 'text-amber-200',   dot: 'bg-amber-400' },
  'AVOID':      { bg: 'bg-rose-500/15',    border: 'border-rose-400/40',    text: 'text-rose-200',    dot: 'bg-rose-400' },
};

const VERDICT_RING = {
  emerald: 'border-emerald-400/50 bg-emerald-500/8',
  cyan:    'border-cyan-400/40 bg-cyan-500/6',
  amber:   'border-amber-400/30 bg-amber-500/6',
  rose:    'border-rose-400/30 bg-rose-500/6',
};

function pctClass(v) {
  if (typeof v !== 'string') return 'text-white/85';
  if (v.startsWith('+') || (parseFloat(v) > 0 && !v.startsWith('-'))) return 'text-emerald-300';
  if (v.startsWith('-') || parseFloat(v) < 0) return 'text-rose-300';
  return 'text-white/85';
}

function fmt(v, suffix = '') {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return v.toFixed(v >= 100 ? 0 : 1) + suffix;
  return String(v) + suffix;
}

export default function CategoryPickCard({ pick, onTickerClick, watchlist = [], onToggleWatch }) {
  const [expanded, setExpanded] = useState(false);
  if (!pick) return null;

  const v = pick.valuation || {};
  const g = pick.growth || {};
  const ins = pick.insider || {};
  const vol = pick.volume || {};
  const pred = pick.prediction || null;
  const tradePlan = pick.tradePlan || null;
  const inWatch = watchlist.includes(pick.ticker);

  const ringStyle = VERDICT_RING[pick.verdictColor] || VERDICT_RING.amber;
  const rec = RECOMMENDATION_STYLES[pick.recommendation] || RECOMMENDATION_STYLES.HOLD;

  const netBuying = String(ins.last6moDirection || '').toLowerCase().includes('net buying');
  const netSelling = String(ins.last6moDirection || '').toLowerCase().includes('net selling');
  const upsideIsPositive = String(pred?.expectedReturn || '').startsWith('+') || (pred?.expectedReturn && parseFloat(pred.expectedReturn) > 0);

  return (
    <div className={`rounded-xl border ${ringStyle} overflow-hidden transition hover:border-white/30`}>
      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-2xl display text-white/40 w-8 text-center flex-shrink-0">{pick.rank}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <button
                  onClick={() => onTickerClick && onTickerClick(pick.ticker)}
                  className="mono text-xl text-white font-medium hover:text-amber-300 transition"
                >
                  {pick.ticker}
                </button>
                {/* RECOMMENDATION BADGE — prominent */}
                <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border font-bold flex items-center gap-1 ${rec.bg} ${rec.border} ${rec.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${rec.dot}`} />
                  {pick.recommendation}
                </span>
                {pick.sector && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-800/60 text-stone-300">
                    {pick.sector}
                  </span>
                )}
                {pick.marketCap && (
                  <span className="text-[10px] text-white/45 mono">{pick.marketCap}</span>
                )}
              </div>
              <div className="text-sm text-white/65 truncate">{safeStr(pick.company)}</div>
              <div className="text-[10px] text-white/40 italic mt-0.5">
                {pick.verdict} · {pick.conviction} conviction
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="hidden sm:block">
              <MiniChart prices={pick.priceHistory} width={100} height={30} />
            </div>
            <div className="text-right">
              <div className="mono text-base text-white">{pick.currentPrice != null ? `$${pick.currentPrice}` : '—'}</div>
              <div className="text-[10px] text-white/40 uppercase">Price</div>
            </div>
            <div className="text-right">
              <div className="display text-2xl text-amber-300">{pick.compositeScore}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Composite</div>
            </div>
            <button
              onClick={() => onToggleWatch && onToggleWatch(pick.ticker)}
              className={`text-base px-2 py-1 rounded border transition ${
                inWatch
                  ? 'bg-amber-400/20 border-amber-400/40 text-amber-200'
                  : 'border-white/15 text-white/40 hover:border-white/30 hover:text-white/70'
              }`}
              title={inWatch ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              {inWatch ? '★' : '☆'}
            </button>
          </div>
        </div>

        {/* PREDICTION STRIP — prominent */}
        {pred && (
          <div className="mt-3 p-3 bg-gradient-to-r from-amber-500/[0.06] to-emerald-500/[0.06] border border-amber-400/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Target size={12} className="text-amber-300" />
              <span className="text-[10px] uppercase tracking-wider text-amber-300">Prediction</span>
              {pred.horizon && (
                <span className="text-[10px] text-stone-400 mono">· {pred.horizon}</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <PredictionTile label="Target" value={pred.target} accent="amber" />
              <PredictionTile
                label="Expected"
                value={pred.expectedReturn}
                accent={upsideIsPositive ? 'emerald' : 'rose'}
              />
              <PredictionTile label="Upside" value={pred.upside} accent="emerald" smallText />
              <PredictionTile label="Downside" value={pred.downside} accent="rose" smallText />
              <PredictionTile label="Catalyst" value={pred.keyCatalyst} smallText spanWide />
            </div>
          </div>
        )}

        {/* TRADE PLAN STRIP — only for daytrade / swing */}
        {tradePlan && (
          <div className="mt-2 p-2.5 bg-black/30 border border-white/10 rounded-lg">
            <div className="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1.5">Trade Plan</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
              <TradeKV k="Entry" v={tradePlan.entry} />
              <TradeKV k="Stop" v={tradePlan.stop} accent="rose" />
              <TradeKV k="T1" v={tradePlan.target1} accent="emerald" />
              <TradeKV k="T2" v={tradePlan.target2} accent="emerald" />
              <TradeKV k="R/R" v={tradePlan.rrRatio} accent="cyan" />
            </div>
          </div>
        )}

        {/* DIVIDEND STRIP — only for dividend category */}
        {pick.dividendInfo && (
          <div className="mt-2 p-2.5 bg-emerald-500/[0.06] border border-emerald-400/20 rounded-lg">
            <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 mb-1.5">Dividend</div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px]">
              <DivKV k="Yield" v={pick.dividendInfo.yield} accent="emerald" />
              <DivKV k="Payout" v={pick.dividendInfo.payoutRatio} />
              <DivKV k="FCF Cov" v={pick.dividendInfo.fcfCoverage} />
              <DivKV k="5y CAGR" v={pick.dividendInfo.fiveYrDivCagr} accent="emerald" />
              <DivKV k="Yrs Raised" v={pick.dividendInfo.consecutiveYearsRaised} />
              <DivKV k="Status" v={pick.dividendInfo.aristocratStatus} />
            </div>
          </div>
        )}

        {/* Four scoring buckets */}
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <ScoreBucket
            label="Valuation" weight="40%" score={v.score} color="text-cyan-300"
            kvs={[
              { k: 'P/E (TTM)',   v: fmt(v.pe) },
              { k: 'Forward P/E', v: fmt(v.forwardPe) },
              { k: 'PEG',         v: fmt(v.peg) },
              { k: 'vs Sector',   v: v.vsSectorMedian || '—' },
            ]}
          />
          <ScoreBucket
            label="Growth" weight="30%" score={g.score} color="text-emerald-300"
            kvs={[
              { k: 'Rev YoY',     v: g.revenueGrowthYoY || '—', cls: pctClass(g.revenueGrowthYoY) },
              { k: 'Rev 5yr CAGR', v: g.revenue5yrCagr || '—' },
              { k: 'EPS YoY',     v: g.epsGrowthYoY || '—', cls: pctClass(g.epsGrowthYoY) },
              { k: 'EPS 5yr CAGR', v: g.eps5yrCagr || '—' },
            ]}
          />
          <ScoreBucket
            label="Insider (SEC)" weight="15%" score={ins.score}
            color={netBuying ? 'text-emerald-300' : netSelling ? 'text-rose-300' : 'text-white/70'}
            kvs={[
              { k: '6mo Direction', v: ins.last6moDirection || '—',
                cls: netBuying ? 'text-emerald-300' : netSelling ? 'text-rose-300' : 'text-white/85' },
              { k: 'Buys', v: ins.totalBuys || 0 },
              { k: 'Sells', v: ins.totalSells || 0 },
              { k: 'Buy Value', v: ins.totalBuyValue || '—' },
            ]}
          />
          <ScoreBucket
            label="Volume" weight="15%" score={vol.score} color="text-violet-300"
            kvs={[
              { k: '20d Avg', v: vol.avgDaily20d || '—' },
              { k: 'vs Avg', v: vol.currentVsAvg || '—' },
              { k: 'Trend', v: vol.trend || '—',
                cls: vol.trend === 'rising' ? 'text-emerald-300' : vol.trend === 'falling' ? 'text-rose-300' : 'text-white/85' },
              { k: 'Liquidity', v: vol.liquidityGrade || '—' },
            ]}
          />
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-[11px] text-white/50 hover:text-white/80 transition flex items-center gap-1"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Hide thesis & sources' : 'Thesis · Risks · Sources'}
        </button>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
            {pick.thesis && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1.5">Investment Thesis</div>
                <p className="text-sm text-white/85 leading-relaxed">{safeStr(pick.thesis)}</p>
              </div>
            )}

            {ins.largestBuy && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 mb-1.5">Largest Insider Buy</div>
                <p className="text-sm text-white/85 italic">{safeStr(ins.largestBuy)}</p>
              </div>
            )}

            {Array.isArray(pick.risks) && pick.risks.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-rose-300/80 mb-1.5 flex items-center gap-1">
                  <AlertTriangle size={11} /> Risks
                </div>
                <ul className="space-y-1">
                  {pick.risks.slice(0, 4).map((r, i) => (
                    <li key={i} className="text-sm text-white/75 flex items-start gap-2">
                      <span className="text-rose-400/70 mt-1">•</span>
                      <span>{safeStr(r)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-3 border-t border-white/5">
              <SourceList sources={pick.sources} label="Sources for this pick" />
              <div className="mt-2 text-[10px] text-stone-500 italic">
                Verify these claims independently at sec.gov/edgar before committing capital.
              </div>
            </div>

            <button
              onClick={() => onTickerClick && onTickerClick(pick.ticker)}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-200 hover:bg-amber-400/25 transition"
            >
              Full deep-dive →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBucket({ label, weight, score, color, kvs }) {
  return (
    <div className="p-3 bg-black/30 rounded-lg border border-white/10">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
          <div className="text-[9px] text-white/30 mono">weight {weight}</div>
        </div>
        <div className={`display text-xl ${color || 'text-white'} leading-none`}>{score || 0}</div>
      </div>
      <div className="space-y-1 mt-2">
        {kvs.map((kv, i) => (
          <div key={i} className="flex justify-between items-center text-[11px] gap-2">
            <span className="text-white/45 truncate">{kv.k}</span>
            <span className={`mono truncate text-right ${kv.cls || 'text-white/85'}`}>{kv.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PredictionTile({ label, value, accent, smallText, spanWide }) {
  const colorMap = {
    emerald: 'text-emerald-300', amber: 'text-amber-300', rose: 'text-rose-300', cyan: 'text-cyan-300',
  };
  return (
    <div className={spanWide ? 'col-span-2 sm:col-span-1' : ''}>
      <div className="text-[9px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`${smallText ? 'text-[11px]' : 'text-sm'} mono ${colorMap[accent] || 'text-white/90'} truncate`}>
        {safeStr(value) || '—'}
      </div>
    </div>
  );
}

function TradeKV({ k, v, accent }) {
  const clr = accent === 'rose' ? 'text-rose-300' : accent === 'emerald' ? 'text-emerald-300' : accent === 'cyan' ? 'text-cyan-300' : 'text-white/85';
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-white/40">{k}</div>
      <div className={`mono ${clr} truncate`}>{safeStr(v) || '—'}</div>
    </div>
  );
}

function DivKV({ k, v, accent }) {
  const clr = accent === 'emerald' ? 'text-emerald-300' : 'text-white/85';
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-white/40">{k}</div>
      <div className={`mono ${clr} truncate text-[11px]`}>{safeStr(v) || '—'}</div>
    </div>
  );
}
