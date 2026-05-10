import { useState } from 'react';
import { Star, Search, X } from 'lucide-react';

export default function WatchlistPanel({ watchlist = [], onTickerClick, onRemove, onSearch }) {
  const [query, setQuery] = useState('');

  function submit(e) {
    e.preventDefault();
    const t = query.trim().toUpperCase();
    if (!t || t.length > 10) return;
    onSearch && onSearch(t);
    setQuery('');
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <Star size={14} className="text-amber-300" />
        <h3 className="display text-sm text-white">Watchlist & Research</h3>
      </div>

      <form onSubmit={submit} className="p-3 border-b border-white/10">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder="Research any ticker (e.g. NVDA)"
              maxLength={10}
              className="w-full bg-black/30 border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder:text-white/30 mono focus:outline-none focus:border-amber-400/40"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim()}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-200 hover:bg-amber-400/25 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Dive
          </button>
        </div>
        <div className="text-[10px] text-white/40 mt-1.5">Each deep-dive costs ~$0.05-0.10</div>
      </form>

      <div className="p-3">
        {watchlist.length === 0 ? (
          <div className="text-xs text-white/40 italic py-2">
            No tickers yet. Star picks above to track them, or search any ticker.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {watchlist.map((t) => (
              <div
                key={t}
                className="group flex items-center gap-1 px-2 py-1 rounded bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs"
              >
                <button
                  onClick={() => onTickerClick && onTickerClick(t)}
                  className="mono hover:underline"
                >
                  {t}
                </button>
                <button
                  onClick={() => onRemove && onRemove(t)}
                  className="opacity-50 hover:opacity-100"
                  title="Remove"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
