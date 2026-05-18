import { useState } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';

export const SORT_OPTIONS = [
  { id: 'composite', label: 'Composite score (high → low)' },
  { id: 'pe_asc',    label: 'P/E lowest first' },
  { id: 'fwd_pe_asc', label: 'Forward P/E lowest first' },
  { id: 'rev_growth', label: 'Revenue growth (high → low)' },
  { id: 'eps_growth', label: 'EPS growth (high → low)' },
  { id: 'insider',   label: 'Insider score (high → low)' },
  { id: 'cap_high',  label: 'Market cap (high → low)' },
];

export const FILTER_OPTIONS = [
  { id: 'deep_value',    label: 'Deep Value',     match: (p) => p.verdict === 'Deep Value' },
  { id: 'undervalued',   label: 'Undervalued',    match: (p) => p.verdict === 'Undervalued' },
  { id: 'insider_buying', label: 'Insider buying', match: (p) => String(p?.insiderActivity?.last6moDirection || '').toLowerCase().includes('net buying') },
  { id: 'peg_lt_1',      label: 'PEG < 1',        match: (p) => Number.isFinite(p?.valuation?.peg) && p.valuation.peg < 1 },
  { id: 'piotroski_7plus', label: 'Piotroski 7+', match: (p) => {
    const m = String(p?.growth?.piotroskiScore || '').match(/^(\d+)/);
    return m && parseInt(m[1], 10) >= 7;
  }},
  { id: 'earnings_soon', label: 'Earnings <14d', match: (p) => {
    const d = p?.marketSentiment?.daysToNextEarnings;
    return Number.isFinite(d) && d >= 0 && d <= 14;
  }},
];

export function applyControls(picks, { sort, filters, search }) {
  let out = Array.isArray(picks) ? [...picks] : [];

  // Filters (AND across active filters)
  if (filters && filters.length > 0) {
    out = out.filter((p) => {
      for (const f of filters) {
        const def = FILTER_OPTIONS.find((x) => x.id === f);
        if (def && !def.match(p)) return false;
      }
      return true;
    });
  }

  // Search
  if (search) {
    const q = search.toLowerCase();
    out = out.filter((p) =>
      String(p.ticker || '').toLowerCase().includes(q) ||
      String(p.company || '').toLowerCase().includes(q) ||
      String(p.industryShort || '').toLowerCase().includes(q)
    );
  }

  // Sort
  const cmp = {
    composite:  (a, b) => (b.compositeScore || 0) - (a.compositeScore || 0),
    pe_asc:     (a, b) => (a.valuation?.pe ?? 9999) - (b.valuation?.pe ?? 9999),
    fwd_pe_asc: (a, b) => (a.valuation?.forwardPe ?? 9999) - (b.valuation?.forwardPe ?? 9999),
    rev_growth: (a, b) => num(b.growth?.revenueGrowthYoY) - num(a.growth?.revenueGrowthYoY),
    eps_growth: (a, b) => num(b.growth?.epsGrowthYoY) - num(a.growth?.epsGrowthYoY),
    insider:    (a, b) => (b.insiderActivity?.score || 0) - (a.insiderActivity?.score || 0),
    cap_high:   (a, b) => capValue(b.marketCap) - capValue(a.marketCap),
  }[sort || 'composite'];

  if (cmp) out.sort(cmp);
  return out;
}

function num(v) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return -9999;
  const m = v.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : -9999;
}

function capValue(s) {
  if (!s) return 0;
  const m = String(s).match(/(\d+(?:\.\d+)?)\s*([BMK]?)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  if (unit === 'T') return n * 1e12;
  if (unit === 'B') return n * 1e9;
  if (unit === 'M') return n * 1e6;
  if (unit === 'K') return n * 1e3;
  return n;
}

export default function PicksControls({ sort, setSort, filters, setFilters, search, setSearch, total, shown }) {
  const [sortOpen, setSortOpen] = useState(false);
  const toggleFilter = (id) => {
    setFilters(filters.includes(id) ? filters.filter((f) => f !== id) : [...filters, id]);
  };
  const sortLabel = SORT_OPTIONS.find((s) => s.id === sort)?.label || 'Composite score';

  return (
    <div className="mb-4 p-3 rounded-xl border border-stone-800 bg-stone-950/60">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg px-2 py-1.5 flex-1 min-w-[180px]">
          <Search size={12} className="text-stone-500 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticker, company..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-stone-500 focus:outline-none min-w-0"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-stone-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-300"
          >
            <SlidersHorizontal size={11} />
            <span className="hidden sm:inline">Sort:</span>
            <span className="truncate max-w-[140px]">{sortLabel}</span>
            <ChevronDown size={11} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 mt-1 z-20 bg-stone-950 border border-stone-800 rounded-lg shadow-xl min-w-[220px] overflow-hidden">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => { setSort(o.id); setSortOpen(false); }}
                  className={`w-full text-left text-xs px-3 py-2 hover:bg-stone-900 transition ${
                    sort === o.id ? 'bg-amber-400/10 text-amber-200' : 'text-stone-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Count */}
        <div className="text-[10px] text-stone-500 mono">
          {shown} of {total}
        </div>
      </div>

      {/* Filter chips */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-stone-500">Filter:</span>
        {FILTER_OPTIONS.map((f) => {
          const active = filters.includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => toggleFilter(f.id)}
              className={`text-[11px] px-2 py-0.5 rounded-md border transition ${
                active
                  ? 'bg-amber-400/15 border-amber-400/40 text-amber-200'
                  : 'bg-stone-900/40 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              {f.label}
            </button>
          );
        })}
        {(filters.length > 0 || search) && (
          <button
            onClick={() => { setFilters([]); setSearch(''); }}
            className="text-[10px] text-stone-500 hover:text-amber-300 underline ml-auto"
          >
            clear all
          </button>
        )}
      </div>
    </div>
  );
}
