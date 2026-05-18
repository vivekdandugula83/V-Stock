import { TrendingUp, TrendingDown, Activity, Target, Calendar, Gauge } from 'lucide-react';

const RATING_STYLES = {
  'strong buy':  { bg: 'bg-emerald-500/15', border: 'border-emerald-400/40', text: 'text-emerald-200' },
  'buy':         { bg: 'bg-emerald-500/10', border: 'border-emerald-400/30', text: 'text-emerald-300' },
  'hold':        { bg: 'bg-amber-500/10',   border: 'border-amber-400/30',   text: 'text-amber-300' },
  'sell':        { bg: 'bg-rose-500/15',    border: 'border-rose-400/40',    text: 'text-rose-200' },
  'strong sell': { bg: 'bg-rose-500/20',    border: 'border-rose-400/50',    text: 'text-rose-200' },
};

const REVISION_ICON = {
  rising:  { Icon: TrendingUp,   color: 'text-emerald-300' },
  falling: { Icon: TrendingDown, color: 'text-rose-300' },
  stable:  { Icon: Activity,     color: 'text-stone-300' },
};

export default function MarketSentimentPanel({ sentiment, compact = false }) {
  if (!sentiment) return null;
  const rating = String(sentiment.analystRating || '').toLowerCase();
  const ratingStyle = RATING_STYLES[rating] || RATING_STYLES.hold;
  const revisionKey = String(sentiment.recentRevisions || '').toLowerCase();
  const revision = REVISION_ICON[revisionKey] || REVISION_ICON.stable;
  const RevIcon = revision.Icon;
  const isUpside = String(sentiment.upsideToTarget || '').startsWith('+');
  const daysToEarn = sentiment.daysToNextEarnings;
  const isEarningsSoon = daysToEarn != null && daysToEarn >= 0 && daysToEarn <= 14;

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap text-[10px]">
        <span className="text-stone-500 uppercase">Market:</span>
        {sentiment.analystRating && (
          <span className={`px-1.5 py-0.5 rounded border ${ratingStyle.bg} ${ratingStyle.border} ${ratingStyle.text}`}>
            {sentiment.analystRating}
          </span>
        )}
        {sentiment.upsideToTarget && (
          <span className={`px-1.5 py-0.5 rounded border ${
            isUpside ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300'
                     : 'bg-rose-500/10 border-rose-400/30 text-rose-300'
          }`}>
            Target {sentiment.upsideToTarget}
          </span>
        )}
        {isEarningsSoon && (
          <span className="px-1.5 py-0.5 rounded border bg-amber-500/15 border-amber-400/40 text-amber-200">
            Earnings in {daysToEarn}d
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={13} className="text-cyan-300/80" />
          <h4 className="display text-sm text-white">Market Sentiment</h4>
          <span className="text-[9px] text-stone-500 mono">informational</span>
        </div>
        {isEarningsSoon && (
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-200 flex items-center gap-1">
            <Calendar size={9} /> Earnings in {daysToEarn}d
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Tile
          label="Analyst Rating"
          value={sentiment.analystRating}
          sub={sentiment.analystBreakdown}
          style={ratingStyle}
        />
        <div className={`p-2 rounded border ${
          isUpside ? 'bg-emerald-500/10 border-emerald-400/30'
                   : 'bg-stone-500/10 border-stone-400/20'
        }`}>
          <div className="text-[9px] uppercase tracking-wider text-stone-400 mb-0.5">Avg Target</div>
          <div className={`text-xs ${isUpside ? 'text-emerald-300' : 'text-stone-200'}`}>
            <span className="font-medium">{sentiment.avgPriceTarget || '—'}</span>
            {sentiment.upsideToTarget && (
              <span className="ml-1.5 opacity-80 mono">({sentiment.upsideToTarget})</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 text-[11px]">
        {sentiment.recentRevisions && (
          <div className="flex items-start gap-2">
            <span className="text-stone-500 text-[10px] uppercase tracking-wider w-24 flex-shrink-0">Revisions</span>
            <span className={`flex-1 flex items-center gap-1 ${revision.color}`}>
              <RevIcon size={11} /> {sentiment.recentRevisions}
            </span>
          </div>
        )}
        {sentiment.beta && (
          <div className="flex items-start gap-2">
            <span className="text-stone-500 text-[10px] uppercase tracking-wider w-24 flex-shrink-0">Beta</span>
            <span className="flex-1 text-stone-200 flex items-center gap-1">
              <Gauge size={11} className="text-stone-400" />
              <span className="mono">{sentiment.beta}</span>
              <span className="text-stone-500 text-[10px]">
                {parseFloat(sentiment.beta) > 1.2 ? '(more volatile than market)'
                  : parseFloat(sentiment.beta) < 0.8 ? '(less volatile)' : '(market-like)'}
              </span>
            </span>
          </div>
        )}
        {sentiment.fiftyTwoWeekPosition && (
          <div className="flex items-start gap-2">
            <span className="text-stone-500 text-[10px] uppercase tracking-wider w-24 flex-shrink-0">52w Position</span>
            <span className="flex-1 text-stone-200 mono">{sentiment.fiftyTwoWeekPosition}</span>
          </div>
        )}
        {daysToEarn != null && (
          <div className="flex items-start gap-2">
            <span className="text-stone-500 text-[10px] uppercase tracking-wider w-24 flex-shrink-0">Next Earnings</span>
            <span className={`flex-1 ${isEarningsSoon ? 'text-amber-300' : 'text-stone-200'}`}>
              <span className="mono">{daysToEarn}d</span>
              {isEarningsSoon && <span className="text-[10px] ml-2 italic">(volatility risk near event)</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, sub, style }) {
  return (
    <div className={`p-2 rounded border ${style.bg} ${style.border}`}>
      <div className="text-[9px] uppercase tracking-wider text-stone-400 mb-0.5">{label}</div>
      <div className={`text-xs ${style.text} font-medium truncate`}>{value || 'Unknown'}</div>
      {sub && <div className="text-[10px] text-stone-400 mono mt-0.5 truncate">{sub}</div>}
    </div>
  );
}
