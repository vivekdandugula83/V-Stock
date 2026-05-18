import { useState } from 'react';
import { TrendingUp, TrendingDown, Users, Activity, ChevronDown, ChevronUp, AlertTriangle, Star, Calendar } from 'lucide-react';
import MiniChart from './MiniChart.jsx';
import SourceList from './SourceList.jsx';
import InstitutionalPanel from './InstitutionalPanel.jsx';
import MarketSentimentPanel from './MarketSentimentPanel.jsx';
import FinancialStrengthPanel from './FinancialStrengthPanel.jsx';
import { safeStr } from './SafeText.jsx';

const VERDICT_STYLES = {
  'Deep Value':    { ring: 'border-emerald-400/50',  bg: 'bg-emerald-500/10',  text: 'text-emerald-300',  badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' },
  'Undervalued':   { ring: 'border-cyan-400/40',     bg: 'bg-cyan-500/8',      text: 'text-cyan-300',     badge: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30' },
  'Fair Value':    { ring: 'border-amber-400/30',    bg: 'bg-amber-500/6',     text: 'text-amber-300',    badge: 'bg-amber-500/15 text-amber-200 border-amber-400/30' },
  'Overvalued':    { ring: 'border-rose-400/30',     bg: 'bg-rose-500/6',      text: 'text-rose-300',     badge: 'bg-rose-500/15 text-rose-200 border-rose-400/30' },
};

function styleFor(verdict) {
  return VERDICT_STYLES[verdict] || VERDICT_STYLES['Fair Value'];
}

function fmt(v, suffix = '') {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return v.toFixed(v >= 100 ? 0 : 1) + suffix;
  return String(v) + suffix;
}

function fmtPct(v) {
  if (v == null) return '—';
  return String(v);
}

function pctClass(v) {
  if (typeof v !== 'string') return 'text-white/85';
  if (v.startsWith('+') || (parseFloat(v) > 0 && !v.startsWith('-'))) return 'text-emerald-300';
  if (v.startsWith('-') || parseFloat(v) < 0) return 'text-rose-300';
  return 'text-white/85';
}

function piotroskiHighlight(score) {
  if (!score) return null;
  const m = String(score).match(/^(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n >= 7) return 'good';
  if (n <= 3) return 'bad';
  return null;
}

export default function ValuePickCard({ pick, onTickerClick, watchlist = [], onToggleWatch, sectorMedianPe }) {
  const [expanded, setExpanded] = useState(false);
  if (!pick) return null;
  const s = styleFor(pick.verdict);
  const v = pick.valuation || {};
  const g = pick.growth || {};
  const ins = pick.insiderActivity || {};
  const vol = pick.volume || {};
  const inWatch = watchlist.includes(pick.ticker);

  const peCheap = Number.isFinite(v.pe) && sectorMedianPe && v.pe < sectorMedianPe;
  const fwdLower = Number.isFinite(v.forwardPe) && Number.isFinite(v.pe) && v.forwardPe < v.pe;
  const netBuying = String(ins.last6moDirection || '').toLowerCase().includes('net buying');
  const netSelling = String(ins.last6moDirection || '').toLowerCase().includes('net selling');

  return (
    <div className={`rounded-xl border ${s.ring} ${s.bg} overflow-hidden transition hover:border-white/30`}>
      {/* Header row */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-4 flex-wrap">
          {/* rank + ticker */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-2xl display text-white/40 w-8 text-center flex-shrink-0">
              {pick.rank}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <button
                  onClick={() => onTickerClick && onTickerClick(pick.ticker)}
                  className="mono text-xl text-white font-medium hover:text-amber-300 transition"
                >
                  {pick.ticker}
                </button>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${s.badge}`}>
                  {pick.verdict}
                </span>
                {pick.marketCap && (
                  <span className="text-[10px] text-white/45 mono">{pick.marketCap}</span>
                )}
              </div>
              <div className="text-sm text-white/65 truncate">{pick.company}</div>
              {pick.subIndustry && (
                <div className="text-[11px] text-white/40 italic mt-0.5">{pick.subIndustry}</div>
              )}
            </div>
          </div>

          {/* chart + price + score */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="hidden sm:block">
              <MiniChart prices={pick.priceHistory} width={100} height={30} />
            </div>
            <div className="text-right">
              <div className="mono text-base text-white">{pick.currentPrice != null ? `$${pick.currentPrice}` : '—'}</div>
              <div className="text-[10px] text-white/40 uppercase">Price</div>
            </div>
            <div className="text-right">
              <div className={`display text-2xl ${s.text}`}>{pick.compositeScore}</div>
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

        {/* Four scoring buckets */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <ScoreBucket
            label="Valuation"
            score={v.score}
            weight="40%"
            color="text-cyan-300"
            details={[
              { k: 'P/E (TTM)', val: fmt(v.pe), highlight: peCheap ? 'good' : null },
              { k: 'Forward P/E', val: fmt(v.forwardPe), highlight: fwdLower ? 'good' : null },
              { k: 'PEG', val: fmt(v.peg), highlight: Number.isFinite(v.peg) && v.peg < 1 ? 'good' : null },
              { k: 'P/S', val: fmt(v.priceSales) },
              { k: 'P/FCF', val: fmt(v.priceFcf) },
              { k: 'Earnings Yield', val: v.earningsYield || '—' },
            ]}
          />
          <ScoreBucket
            label="Growth"
            score={g.score}
            weight="30%"
            color="text-emerald-300"
            details={[
              { k: 'Rev YoY', val: g.revenueGrowthYoY || '—', highlight: pctClass(g.revenueGrowthYoY).includes('emerald') ? 'good' : null },
              { k: 'Rev 5yr CAGR', val: g.revenue5yrCagr || '—' },
              { k: 'EPS YoY', val: g.epsGrowthYoY || '—', highlight: pctClass(g.epsGrowthYoY).includes('emerald') ? 'good' : null },
              { k: 'ROIC', val: g.roic || '—' },
              { k: 'FCF Margin', val: g.fcfMargin || '—' },
              { k: 'Piotroski', val: g.piotroskiScore || '—', highlight: piotroskiHighlight(g.piotroskiScore) },
            ]}
          />
          <ScoreBucket
            label="Insider"
            score={ins.score}
            weight="15%"
            color={netBuying ? 'text-emerald-300' : netSelling ? 'text-rose-300' : 'text-white/70'}
            details={[
              { k: '6mo Direction', val: ins.last6moDirection || '—', highlight: netBuying ? 'good' : netSelling ? 'bad' : null },
              { k: 'Buys', val: ins.totalBuys || 0 },
              { k: 'Sells', val: ins.totalSells || 0 },
              { k: 'Buy Value', val: ins.totalBuyValue || '—' },
            ]}
          />
          <ScoreBucket
            label="Volume"
            score={vol.score}
            weight="15%"
            color="text-violet-300"
            details={[
              { k: '20d Avg', val: vol.avgDaily20d || '—' },
              { k: 'vs Avg', val: vol.currentVsAvg || '—' },
              { k: 'Trend', val: vol.trend || '—', highlight: vol.trend === 'rising' ? 'good' : vol.trend === 'falling' ? 'bad' : null },
              { k: 'Liquidity', val: vol.liquidityGrade || '—' },
            ]}
          />
        </div>

        {/* Compact sentiment row — always visible */}
        {(pick.marketSentiment || pick.institutional) && (
          <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:gap-4">
            {pick.marketSentiment && <MarketSentimentPanel sentiment={pick.marketSentiment} compact />}
            {pick.institutional && <InstitutionalPanel institutional={pick.institutional} variant="compact" />}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-[11px] text-white/50 hover:text-white/80 transition flex items-center gap-1"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Hide details' : 'Thesis · Institutional · Sources'}
        </button>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
            {pick.thesis && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1.5">Thesis</div>
                <p className="text-sm text-white/85 leading-relaxed">{safeStr(pick.thesis)}</p>
              </div>
            )}

            {ins.largestBuy && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 mb-1.5">Largest Insider Buy</div>
                <p className="text-sm text-white/85 italic">{safeStr(ins.largestBuy)}</p>
              </div>
            )}

            {Array.isArray(ins.notableNames) && ins.notableNames.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Users size={12} className="text-white/40" />
                <span className="text-[10px] uppercase tracking-wider text-white/40">Insider names:</span>
                {ins.notableNames.map((n, i) => (
                  <span key={i} className="text-xs text-white/80 bg-white/5 px-2 py-0.5 rounded">{n}</span>
                ))}
              </div>
            )}

            {/* Market sentiment - full */}
            {pick.marketSentiment && (
              <MarketSentimentPanel sentiment={pick.marketSentiment} />
            )}

            {/* Financial strength */}
            {pick.financialStrength && (
              <FinancialStrengthPanel strength={pick.financialStrength} />
            )}

            {/* Institutional / smart money */}
            {pick.institutional && (
              <InstitutionalPanel institutional={pick.institutional} />
            )}

            {/* Catalysts */}
            {Array.isArray(pick.catalysts) && pick.catalysts.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-cyan-300/80 mb-1.5 flex items-center gap-1">
                  <Calendar size={11} /> Upcoming Catalysts
                </div>
                <ul className="space-y-1">
                  {pick.catalysts.slice(0, 4).map((c, i) => (
                    <li key={i} className="text-xs flex items-start gap-2">
                      <span className="mono text-cyan-300/70 w-24 flex-shrink-0">{c?.date || 'TBD'}</span>
                      <span className="flex-1 text-white/80">{c?.event}</span>
                      {c?.impact && (
                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${
                          c.impact === 'high' ? 'bg-rose-500/15 text-rose-300' :
                          c.impact === 'medium' ? 'bg-amber-500/15 text-amber-300' :
                          'bg-stone-500/15 text-stone-400'
                        }`}>{c.impact}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(pick.risks) && pick.risks.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-rose-300/80 mb-1.5 flex items-center gap-1">
                  <AlertTriangle size={11} /> Risks
                </div>
                <ul className="space-y-1">
                  {pick.risks.slice(0, 3).map((r, i) => (
                    <li key={i} className="text-sm text-white/75 flex items-start gap-2">
                      <span className="text-rose-400/70 mt-1">•</span>
                      <span>{safeStr(r)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources — verify each pick */}
            <div className="pt-3 border-t border-white/5">
              <SourceList sources={pick.sources} compact />
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

function ScoreBucket({ label, score, weight, color, details }) {
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
        {details.map((d, i) => (
          <div key={i} className="flex justify-between items-center text-[11px] gap-2">
            <span className="text-white/45 truncate">{d.k}</span>
            <span className={`mono truncate text-right ${
              d.highlight === 'good' ? 'text-emerald-300' :
              d.highlight === 'bad' ? 'text-rose-300' : 'text-white/85'
            }`}>
              {d.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
