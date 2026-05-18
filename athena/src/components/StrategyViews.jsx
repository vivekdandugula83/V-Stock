// Wrappers that pick the right card component for a strategy.
// Value → uses existing ValuePickCard.
// Day Trade / Swing / Dividend → uses GenericPickCard.

import { Loader2, RefreshCw, Target } from 'lucide-react';
import { useState } from 'react';
import ValuePickCard from './ValuePickCard.jsx';
import GenericPickCard from './GenericPickCard.jsx';
import ApiError from './ApiError.jsx';
import SourceList from './SourceList.jsx';
import MiniChart from './MiniChart.jsx';
import { safeStr } from './SafeText.jsx';
import { STRATEGIES } from '../lib/strategies.js';
import PicksControls, { applyControls } from './PicksControls.jsx';

const VERDICT_BADGE = {
  // value
  'Deep Value':  'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  'Undervalued': 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
  'Fair Value':  'bg-amber-500/15 text-amber-200 border-amber-400/30',
  'Overvalued':  'bg-rose-500/15 text-rose-200 border-rose-400/30',
  // day / swing
  'Strong Setup': 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  'Setup':        'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
  'Prime Setup':  'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  'Solid Setup':  'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
  'Watch':        'bg-amber-500/15 text-amber-200 border-amber-400/30',
  'Avoid':        'bg-rose-500/15 text-rose-200 border-rose-400/30',
  // dividend
  'Income Anchor': 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  'Stable Yield':  'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
  'Yield Trap':    'bg-rose-500/15 text-rose-200 border-rose-400/30',
};

export function StrategySection({
  strategyId, industry, state, sectionId,
  onRetry, onTickerClick, watchlist, onToggleWatch,
}) {
  const status = state?.status || 'pending';
  const data = state?.data;
  const error = state?.error;
  const useValue = strategyId === 'value';

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
            {(data?.industryValuation || data?.industryNotes) && (
              <div className="text-[11px] text-white/55 max-w-2xl line-clamp-2">{safeStr(data.industryValuation || data.industryNotes)}</div>
            )}
          </div>
        </div>
        <div className="text-right flex items-center gap-3">
          {status === 'loading' && <Loader2 size={16} className="text-amber-300 animate-spin" />}
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
            Scanning {industry.label}...
          </div>
        )}
        {status === 'error' && error && <ApiError error={error} compact onRetry={onRetry} />}
        {status === 'done' && Array.isArray(data?.picks) && data.picks.length > 0 && (
          <div className="space-y-3">
            {data.picks.map((p, i) =>
              useValue ? (
                <ValuePickCard
                  key={`${p.ticker}-${i}`}
                  pick={p}
                  sectorMedianPe={data.sectorMedianPe}
                  onTickerClick={onTickerClick}
                  watchlist={watchlist}
                  onToggleWatch={onToggleWatch}
                />
              ) : (
                <GenericPickCard
                  key={`${p.ticker}-${i}`}
                  pick={p}
                  onTickerClick={onTickerClick}
                  watchlist={watchlist}
                  onToggleWatch={onToggleWatch}
                />
              )
            )}
            {Array.isArray(data?.industrySources) && data.industrySources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <SourceList sources={data.industrySources} compact label={`${industry.short} sources`} />
              </div>
            )}
          </div>
        )}
        {status === 'done' && (!data?.picks || data.picks.length === 0) && (
          <div className="text-center py-6 text-white/40 text-sm">No picks returned. Retry?</div>
        )}
      </div>
    </section>
  );
}

// Top-N panel that works for any strategy
export function StrategyTopPicks({ strategyId, picks = [], onTickerClick, watchlist, onToggleWatch, limit = 15 }) {
  const [sort, setSort] = useState('composite');
  const [filters, setFilters] = useState([]);
  const [search, setSearch] = useState('');

  const all = Array.isArray(picks) ? picks : [];
  const filtered = applyControls(all, { sort, filters, search });
  const safe = filtered.slice(0, limit);
  const cfg = STRATEGIES[strategyId];
  const useValueCard = strategyId === 'value';

  if (all.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-white/50 text-sm">Top picks for {cfg?.label} will appear once sector scans complete.</div>
      </div>
    );
  }

  const weightsText = cfg
    ? `Composite = ${Object.entries(cfg.weights).map(([k, w]) => `${k} ×${Math.round(w * 100)}%`).join(' + ')}`
    : '';

  return (
    <div className="space-y-3">
      <PicksControls
        sort={sort} setSort={setSort}
        filters={filters} setFilters={setFilters}
        search={search} setSearch={setSearch}
        total={all.length} shown={Math.min(safe.length, filtered.length)}
      />
      <div className="bg-gradient-to-br from-amber-500/5 via-white/5 to-emerald-500/5 border border-amber-400/30 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-400/20 flex items-center justify-center">
              <Target size={18} className="text-amber-300" />
            </div>
            <div>
              <h2 className="display text-lg text-white">
                Top {safe.length} {cfg?.label}{filters.length > 0 || search ? ' (filtered)' : ''}
              </h2>
              <div className="text-xs text-white/50">{weightsText}</div>
            </div>
          </div>
          {cfg?.horizonLabel && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-stone-800/60 text-stone-300">
              {cfg.horizonLabel} horizon
            </span>
          )}
        </div>

        <div className="divide-y divide-white/5 p-3 space-y-2">
          {safe.length === 0 && (
            <div className="px-6 py-8 text-center text-stone-500 text-sm">
              No picks match these filters.{' '}
              <button onClick={() => { setFilters([]); setSearch(''); }} className="underline hover:text-amber-300">Clear filters</button>
            </div>
          )}
          {safe.map((p, i) =>
            useValueCard ? (
              <ValuePickCard
                key={`${p.ticker}-${i}`}
                pick={p}
                onTickerClick={onTickerClick}
                watchlist={watchlist}
                onToggleWatch={onToggleWatch}
              />
            ) : (
              <GenericPickCard
                key={`${p.ticker}-${i}`}
                pick={p}
                onTickerClick={onTickerClick}
                watchlist={watchlist}
                onToggleWatch={onToggleWatch}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
