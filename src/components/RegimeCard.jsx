import { TrendingUp, Activity, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const regimeStyle = (r) => {
  const x = (r || '').toLowerCase();
  if (x.includes('on'))   return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (x.includes('off'))  return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  if (x.includes('chop')) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  return 'text-sky-400 border-sky-500/30 bg-sky-500/10';
};

const changeStyle = (s) => {
  if (!s) return 'text-stone-400';
  if (String(s).includes('+')) return 'text-emerald-400';
  if (String(s).includes('-')) return 'text-rose-400';
  return 'text-stone-400';
};

export default function RegimeCard({ regime, fromCache }) {
  if (!regime) return null;
  const r = regime;
  const indices = r.indices || {};
  const catalysts = Array.isArray(r.thisWeekCatalysts) ? r.thisWeekCatalysts : [];

  return (
    <section className="mb-8 p-6 sm:p-8 rounded-2xl border border-stone-800/80 bg-gradient-to-br from-stone-950/60 to-stone-900/30 slide-up">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="mono text-[11px] tracking-[0.25em] uppercase text-stone-500 mb-2">
            Market Briefing
          </div>
          <div className="display italic text-2xl sm:text-3xl text-stone-100 leading-snug max-w-3xl">
            {r.regimeReason || r.marketSummary || 'Market context unavailable.'}
          </div>
        </div>
        {r.regime && (
          <div className="flex items-center gap-2">
            {fromCache && (
              <span className="px-2 py-1 rounded-full border text-[10px] mono tracking-wider uppercase text-stone-500 border-stone-700/60 bg-stone-900/40">
                cached
              </span>
            )}
            <div className={`px-3 py-1.5 rounded-full border text-xs mono tracking-wider uppercase ${regimeStyle(r.regime)}`}>
              {r.regime}
            </div>
          </div>
        )}
      </div>

      {Object.keys(indices).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {Object.entries(indices).map(([k, v]) => (
            <div key={k} className="p-4 rounded-xl bg-stone-950/60 border border-stone-800/60">
              <div className="mono text-[10px] tracking-widest uppercase text-stone-500 mb-1">{k}</div>
              <div className="display text-2xl text-stone-100">{v?.level || '—'}</div>
              <div className={`mono text-xs mt-1 ${changeStyle(v?.change)}`}>{v?.change || '—'}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {r.vix && (
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800/60">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3.5 h-3.5 text-amber-400/70" />
              <span className="mono text-[10px] tracking-widest uppercase text-stone-500">VIX</span>
              <span className="mono text-sm text-stone-200 ml-auto">{r.vix.level || '—'}</span>
            </div>
            <div className="text-xs text-stone-400 leading-relaxed">{r.vix.interpretation || ''}</div>
          </div>
        )}
        {r.rates && (
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800/60">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400/70" />
              <span className="mono text-[10px] tracking-widest uppercase text-stone-500">RATES & DOLLAR</span>
            </div>
            <div className="text-xs text-stone-400 leading-relaxed">
              <span className="text-stone-200 mono">{r.rates.ten_year || '—'}</span> · {r.rates.dollar || '—'}
              <div className="mt-1 text-stone-500">{r.rates.implication || ''}</div>
            </div>
          </div>
        )}
      </div>

      {r.sectorRotation && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-emerald-950/15 border border-emerald-900/40">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span className="mono text-[10px] tracking-widest uppercase text-emerald-400/80">LEADING</span>
            </div>
            <ul className="space-y-1">
              {(r.sectorRotation.leaders || []).map((s, i) => (
                <li key={i} className="text-xs text-stone-300">▸ {s}</li>
              ))}
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-rose-950/15 border border-rose-900/40">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
              <span className="mono text-[10px] tracking-widest uppercase text-rose-400/80">LAGGING</span>
            </div>
            <ul className="space-y-1">
              {(r.sectorRotation.laggards || []).map((s, i) => (
                <li key={i} className="text-xs text-stone-300">▸ {s}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {catalysts.length > 0 && (
        <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800/60 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3.5 h-3.5 text-amber-400/70" />
            <span className="mono text-[10px] tracking-widest uppercase text-stone-500">This week's catalysts</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {catalysts.map((c, i) => {
              const text = typeof c === 'string' ? c : `${c.event || ''}${c.date ? ` · ${c.date}` : ''}`;
              return (
                <li key={i} className="text-xs text-stone-300 flex gap-2">
                  <span className="text-amber-400/70">▸</span>
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {r.tradingPlaybook && (
        <div className="p-5 rounded-xl bg-amber-950/15 border border-amber-900/40">
          <div className="mono text-[10px] tracking-widest uppercase text-amber-400/80 mb-2">
            Tactical playbook
          </div>
          <p className="text-sm text-amber-50/90 leading-relaxed display italic">{r.tradingPlaybook}</p>
        </div>
      )}

      <div className="mono text-[10px] text-stone-600 tracking-wider mt-6">
        AS OF {new Date(r.asOf || Date.now()).toLocaleString()}
      </div>
    </section>
  );
}
