import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Target, Calendar, Zap } from 'lucide-react';
import MiniChart from './MiniChart.jsx';
import SourceList from './SourceList.jsx';
import { safeStr } from './SafeText.jsx';

const VERDICT_STYLES = {
  emerald: { ring: 'border-emerald-400/50', bg: 'bg-emerald-500/10',  text: 'text-emerald-300',  badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' },
  cyan:    { ring: 'border-cyan-400/40',    bg: 'bg-cyan-500/8',      text: 'text-cyan-300',     badge: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30' },
  amber:   { ring: 'border-amber-400/30',   bg: 'bg-amber-500/6',     text: 'text-amber-300',    badge: 'bg-amber-500/15 text-amber-200 border-amber-400/30' },
  rose:    { ring: 'border-rose-400/30',    bg: 'bg-rose-500/6',      text: 'text-rose-300',     badge: 'bg-rose-500/15 text-rose-200 border-rose-400/30' },
  stone:   { ring: 'border-stone-400/20',   bg: 'bg-stone-500/5',     text: 'text-stone-300',    badge: 'bg-stone-500/15 text-stone-200 border-stone-400/30' },
};

const VERDICT_COLOR_MAP = {
  'Strong Setup': 'emerald', 'Setup': 'cyan', 'Watch': 'amber', 'Avoid': 'rose',
  'Prime Setup': 'emerald', 'Solid Setup': 'cyan',
  'Income Anchor': 'emerald', 'Stable Yield': 'cyan', 'Yield Trap': 'rose',
};

function styleFor(verdict) {
  const color = VERDICT_COLOR_MAP[verdict] || 'amber';
  return VERDICT_STYLES[color] || VERDICT_STYLES.amber;
}

export default function GenericPickCard({ pick, onTickerClick, watchlist = [], onToggleWatch }) {
  const [expanded, setExpanded] = useState(false);
  if (!pick) return null;
  const s = styleFor(pick.verdict);
  const inWatch = watchlist.includes(pick.ticker);
  const buckets = Array.isArray(pick.buckets) ? pick.buckets : [];

  return (
    <div className={`rounded-xl border ${s.ring} ${s.bg} overflow-hidden transition hover:border-white/30`}>
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
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${s.badge}`}>
                  {pick.verdict}
                </span>
                {pick.marketCap && (
                  <span className="text-[10px] text-white/45 mono">{pick.marketCap}</span>
                )}
              </div>
              <div className="text-sm text-white/65 truncate">{pick.company}</div>
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

        {/* Four bucket scorecards */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {buckets.map((b) => (
            <BucketCard key={b.id} bucket={b} />
          ))}
        </div>

        {/* Trade plan strip (day trade / swing) */}
        {pick.tradePlan && (
          <div className="mt-3 p-2.5 bg-black/30 border border-white/10 rounded-lg">
            <div className="flex items-center gap-1 mb-1.5">
              <Target size={11} className="text-amber-300/80" />
              <span className="text-[10px] uppercase tracking-wider text-amber-300/80">Trade Plan</span>
              {pick.tradePlan.horizonDays && (
                <span className="text-[9px] text-stone-500 ml-auto mono">{pick.tradePlan.horizonDays}d horizon</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
              <TradeKV k="Entry"   v={pick.tradePlan.entry} />
              <TradeKV k="Stop"    v={pick.tradePlan.stop}    accent="rose" />
              <TradeKV k="Target1" v={pick.tradePlan.target1} accent="emerald" />
              <TradeKV k="Target2" v={pick.tradePlan.target2} accent="emerald" />
              <TradeKV k="R/R"     v={pick.tradePlan.rrRatio} accent="cyan" />
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-[11px] text-white/50 hover:text-white/80 transition flex items-center gap-1"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Hide details' : 'Thesis · Risks · Sources'}
        </button>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
            {pick.thesis && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1.5">Thesis</div>
                <p className="text-sm text-white/85 leading-relaxed">{safeStr(pick.thesis)}</p>
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

function BucketCard({ bucket }) {
  // Show primary fields first
  const primaryKvs = (bucket.primaryFields || [])
    .map((f) => bucket.kvs.find((kv) => kv.k && kv.k.toLowerCase().replace(/\s+/g, '').includes(f.toLowerCase())))
    .filter(Boolean);
  const display = primaryKvs.length > 0 ? primaryKvs : bucket.kvs.slice(0, 3);

  return (
    <div className="p-3 bg-black/30 rounded-lg border border-white/10">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">{bucket.label}</div>
          <div className="text-[9px] text-white/30 mono">weight {bucket.weightLabel}</div>
        </div>
        <div className={`display text-xl ${bucket.color || 'text-white'} leading-none`}>{bucket.score || 0}</div>
      </div>
      <div className="space-y-1 mt-2">
        {display.slice(0, 4).map((kv, i) => (
          <div key={i} className="flex justify-between items-center text-[11px] gap-2">
            <span className="text-white/45 truncate">{kv.k}</span>
            <span className="mono truncate text-right text-white/85">{kv.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TradeKV({ k, v, accent }) {
  const clr = accent === 'rose' ? 'text-rose-300' : accent === 'emerald' ? 'text-emerald-300' : accent === 'cyan' ? 'text-cyan-300' : 'text-white/85';
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-white/40">{k}</div>
      <div className={`mono ${clr} truncate`}>{v || '—'}</div>
    </div>
  );
}
