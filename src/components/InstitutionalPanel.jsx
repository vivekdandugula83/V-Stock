import { Activity, TrendingUp, TrendingDown, Eye, Building2 } from 'lucide-react';

const SENTIMENT_STYLES = {
  bullish:  { bg: 'bg-emerald-500/10', border: 'border-emerald-400/30', text: 'text-emerald-300', icon: TrendingUp },
  bearish:  { bg: 'bg-rose-500/10',    border: 'border-rose-400/30',    text: 'text-rose-300',    icon: TrendingDown },
  neutral:  { bg: 'bg-amber-500/10',   border: 'border-amber-400/30',   text: 'text-amber-300',   icon: Activity },
  unknown:  { bg: 'bg-stone-500/5',    border: 'border-stone-400/15',   text: 'text-stone-400',   icon: Eye },
};

function styleFor(sentiment) {
  const k = String(sentiment || '').toLowerCase();
  if (k.includes('bullish')) return SENTIMENT_STYLES.bullish;
  if (k.includes('bearish')) return SENTIMENT_STYLES.bearish;
  if (k.includes('neutral') || k.includes('mixed')) return SENTIMENT_STYLES.neutral;
  return SENTIMENT_STYLES.unknown;
}

export default function InstitutionalPanel({ institutional, variant = 'card' }) {
  if (!institutional) return null;
  const dp = styleFor(institutional.darkPoolSentiment);
  const flow = styleFor(institutional.institutionalFlow);
  const DpIcon = dp.icon;
  const FlowIcon = flow.icon;
  const isLimited = String(institutional.dataAvailability || '').toLowerCase() === 'limited';

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 flex-wrap text-[10px]">
        <span className="text-stone-500 uppercase">Smart $:</span>
        <span className={`px-1.5 py-0.5 rounded border ${dp.bg} ${dp.border} ${dp.text} flex items-center gap-1`}>
          <DpIcon size={9} />
          DP {institutional.darkPoolSentiment || '?'}
        </span>
        <span className={`px-1.5 py-0.5 rounded border ${flow.bg} ${flow.border} ${flow.text} flex items-center gap-1`}>
          <FlowIcon size={9} />
          13F {institutional.institutionalFlow || '?'}
        </span>
        {institutional.shortInterest && (
          <span className="px-1.5 py-0.5 rounded border bg-fuchsia-500/8 border-fuchsia-400/20 text-fuchsia-200">
            SI {institutional.shortInterest.split(',')[0]}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 size={13} className="text-fuchsia-300/80" />
          <h4 className="display text-sm text-white">Institutional / Smart Money</h4>
          <span className="text-[9px] text-stone-500 mono">informational</span>
        </div>
        {isLimited && (
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-400/20 text-amber-300">
            Limited data
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Tile label="Dark Pool" value={institutional.darkPoolSentiment} style={dp} icon={DpIcon} />
        <Tile label="13F Flow" value={institutional.institutionalFlow} style={flow} icon={FlowIcon} />
      </div>

      <div className="space-y-1.5 text-[11px]">
        {institutional.shortInterest && (
          <Row k="Short Interest" v={institutional.shortInterest} />
        )}
        {institutional.optionsFlow && (
          <Row k="Options Flow" v={institutional.optionsFlow} />
        )}
        {institutional.notable13fChanges && (
          <Row k="13F Changes" v={institutional.notable13fChanges} />
        )}
        {Array.isArray(institutional.topHolders) && institutional.topHolders.length > 0 && (
          <div>
            <div className="text-stone-500 text-[10px] uppercase tracking-wider mb-1">Top Holders</div>
            <div className="flex flex-wrap gap-1">
              {institutional.topHolders.slice(0, 5).map((h, i) => (
                <span key={i} className="text-[10px] bg-stone-800/50 px-1.5 py-0.5 rounded text-stone-200">{h}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLimited && (
        <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-stone-500 italic">
          Dark pool and options flow are often paywalled. For free 13F data verify at whalewisdom.com or sec.gov/edgar Form 13F filings.
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, style, icon: Icon }) {
  return (
    <div className={`p-2 rounded border ${style.bg} ${style.border}`}>
      <div className="text-[9px] uppercase tracking-wider text-stone-400 mb-0.5">{label}</div>
      <div className={`text-xs flex items-center gap-1 ${style.text}`}>
        <Icon size={11} />
        <span className="truncate font-medium">{value || 'Unknown'}</span>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-stone-500 text-[10px] uppercase tracking-wider w-20 flex-shrink-0">{k}</span>
      <span className="text-stone-200 flex-1">{v}</span>
    </div>
  );
}
