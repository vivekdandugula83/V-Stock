import { Loader2, RefreshCw } from 'lucide-react';
import ValuePickCard from './ValuePickCard.jsx';
import ApiError from './ApiError.jsx';
import SourceList from './SourceList.jsx';

export default function IndustrySection({
  industry, state, sectionId,
  onRetry, onTickerClick, watchlist = [], onToggleWatch,
}) {
  if (!industry) return null;
  const status = state?.status || 'pending';
  const data = state?.data;
  const error = state?.error;

  return (
    <section id={sectionId} className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
      <header
        className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3"
        style={{ borderTopColor: industry.color, borderTopWidth: 2 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm mono"
            style={{ background: `${industry.color}25`, color: industry.color }}
          >
            {industry.short?.slice(0, 2) || '??'}
          </div>
          <div>
            <h3 className="display text-lg text-white">{industry.label}</h3>
            {data?.industryValuation && (
              <div className="text-[11px] text-white/55 max-w-2xl line-clamp-2">{data.industryValuation}</div>
            )}
          </div>
        </div>
        <div className="text-right flex items-center gap-3">
          {data?.sectorMedianPe && (
            <div className="hidden sm:block text-right">
              <div className="text-[10px] uppercase text-white/40">Median P/E</div>
              <div className="mono text-sm text-white">{data.sectorMedianPe}</div>
            </div>
          )}
          {status === 'loading' && (
            <Loader2 size={16} className="text-amber-300 animate-spin" />
          )}
          {(status === 'error' || (status === 'done' && (!data?.picks || data.picks.length === 0))) && onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 text-xs text-white/60 hover:text-amber-300 px-2 py-1 rounded border border-white/10 hover:border-amber-400/30 transition"
            >
              <RefreshCw size={11} /> Retry
            </button>
          )}
        </div>
      </header>

      <div className="p-4">
        {status === 'pending' && (
          <div className="text-center py-6 text-white/40 text-sm">Queued — waiting for slot...</div>
        )}
        {status === 'loading' && (
          <div className="flex items-center justify-center py-8 gap-2 text-white/50 text-sm">
            <Loader2 size={14} className="animate-spin" />
            Running value scan on {industry.label}...
          </div>
        )}
        {status === 'error' && error && (
          <ApiError error={error} compact onRetry={onRetry} />
        )}
        {status === 'done' && Array.isArray(data?.picks) && data.picks.length > 0 && (
          <div className="space-y-3">
            {data.picks.map((p, i) => (
              <ValuePickCard
                key={`${p.ticker}-${i}`}
                pick={p}
                sectorMedianPe={data.sectorMedianPe}
                onTickerClick={onTickerClick}
                watchlist={watchlist}
                onToggleWatch={onToggleWatch}
              />
            ))}
            {Array.isArray(data?.industrySources) && data.industrySources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <SourceList sources={data.industrySources} compact label={`${industry.short} sector sources`} />
              </div>
            )}
          </div>
        )}
        {status === 'done' && (!data?.picks || data.picks.length === 0) && (
          <div className="text-center py-6 text-white/40 text-sm">
            No picks returned. Retry?
          </div>
        )}
      </div>
    </section>
  );
}
