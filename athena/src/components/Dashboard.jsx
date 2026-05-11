import {
  Target, TrendingUp, Sparkles, Activity, Layers, Calendar,
  Zap, BarChart3, Eye, Sunrise,
} from 'lucide-react';

import StatTile from './StatTile';
import SectorHeatmap from './SectorHeatmap';
import CatalystTimeline from './CatalystTimeline';
import VolatilityScatter from './VolatilityScatter';
import SmartMoneyPanel from './SmartMoneyPanel';
import NextDayForecast from './NextDayForecast';
import Sparkline from './Sparkline';

export default function Dashboard({ aggregate, regime, onSectorClick }) {
  const agg = aggregate || {};
  const stats = agg.stats;
  const sectorAgg = Array.isArray(agg.sectorAgg) ? agg.sectorAgg : [];
  const topConviction = Array.isArray(agg.topConviction) ? agg.topConviction : [];
  const catalysts = Array.isArray(agg.catalysts) ? agg.catalysts : [];
  const nextDayBullish = Array.isArray(agg.nextDayBullish) ? agg.nextDayBullish : [];
  const allPicks = Array.isArray(agg.allPicks) ? agg.allPicks : [];

  if (!stats) {
    return (
      <div className="p-12 rounded-2xl border border-stone-800/60 bg-stone-950/30 text-center">
        <Activity className="w-8 h-8 text-stone-600 mx-auto mb-3 spin-slow" />
        <p className="text-stone-500">Waiting for sector research to complete…</p>
      </div>
    );
  }

  const bullishPct = stats.totalPicks > 0 ? (stats.bullishNextDay / stats.totalPicks) * 100 : 0;

  return (
    <div className="space-y-8 slide-up">

      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400/80" />
            <h2 className="mono text-[10px] tracking-[0.25em] uppercase text-stone-400">Run summary</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Total picks" value={stats.totalPicks} icon={<Target className="w-4 h-4" />}
                    accent="#d4a574" sub={`${stats.sectorsCovered} sectors`} />
          <StatTile label="Avg score" value={stats.avgScore} icon={<BarChart3 className="w-4 h-4" />}
                    accent={stats.avgScore >= 75 ? '#34d399' : stats.avgScore >= 60 ? '#fbbf24' : '#94a3b8'}
                    sub={`${stats.highConviction} high conviction`} />
          <StatTile label="Strong buys" value={stats.strongBuys} icon={<Zap className="w-4 h-4" />}
                    accent="#34d399" sub={`of ${stats.totalPicks}`} />
          <StatTile label="Bullish next-day" value={stats.bullishNextDay} icon={<Sunrise className="w-4 h-4" />}
                    accent="#fbbf24" sub={`${bullishPct.toFixed(0)}% of universe`} />
        </div>
      </section>

      {sectorAgg.length > 0 && (
        <section>
          <SectionHeader icon={<Layers className="w-4 h-4 text-amber-400/80" />}
                         title="Sector heatmap"
                         subtitle="Avg score & strong-buy density per sector — click to jump to detail" />
          <SectorHeatmap sectors={sectorAgg} onSectorClick={onSectorClick} />
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SectionHeader icon={<TrendingUp className="w-4 h-4 text-amber-400/80" />}
                         title="Top conviction"
                         subtitle="Highest-scored picks across all sectors" tight />
          <div className="rounded-2xl border border-stone-800/70 bg-stone-950/40 overflow-hidden">
            {topConviction.length === 0 ? (
              <div className="p-6 text-stone-500 text-sm text-center">No picks yet</div>
            ) : (
              <ul className="divide-y divide-stone-900/80">
                {topConviction.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 p-3.5 hover:bg-stone-900/30 transition">
                    <span className="display text-2xl text-stone-700 font-light w-6 text-right">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="mono text-sm font-bold w-16 ticker-glow"
                          style={{ color: p.industryColor || '#d4a574' }}>
                      {p.ticker || '?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-stone-300 truncate">{p.company || ''}</div>
                      <div className="mono text-[10px] text-stone-600 uppercase tracking-wider mt-0.5">
                        {p.industryShort || ''} · {p.action || ''}
                      </div>
                    </div>
                    {p.priceHistory?.length >= 2 && <Sparkline data={p.priceHistory} width={50} height={20} />}
                    <div className="text-right shrink-0">
                      <div className="display text-lg leading-none"
                           style={{ color: (p.score || 0) >= 85 ? '#fbbf24' : (p.score || 0) >= 70 ? '#a3e635' : '#60a5fa' }}>
                        {p.score || 0}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <SectionHeader icon={<Sunrise className="w-4 h-4 text-amber-400/80" />}
                         title="Next-day bullish setups"
                         subtitle="Probabilistic forecasts — not guarantees" tight />
          <NextDayForecast picks={nextDayBullish} />
        </div>
      </section>

      <section>
        <SectionHeader icon={<Eye className="w-4 h-4 text-amber-400/80" />}
                       title="Where the dark data points"
                       subtitle="Aggregated dark pool, institutional flow, insider, and options signals" />
        <SmartMoneyPanel allPicks={allPicks} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <SectionHeader icon={<Activity className="w-4 h-4 text-amber-400/80" />}
                         title="Volatility map"
                         subtitle="High score + low IV = sweet spot. High vol = wider stops, bigger moves." tight />
          <VolatilityScatter picks={allPicks} />
        </div>

        <div className="lg:col-span-2">
          <SectionHeader icon={<Calendar className="w-4 h-4 text-amber-400/80" />}
                         title="Catalyst timeline"
                         subtitle="Next 14 days · earnings, FDA, macro events" tight />
          <div className="rounded-2xl border border-stone-800/70 bg-stone-950/40 p-4 sm:p-5 max-h-[480px] overflow-y-auto">
            <CatalystTimeline catalysts={catalysts} weekCatalysts={regime?.thisWeekCatalysts || []} />
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, tight = false }) {
  return (
    <div className={`flex items-end justify-between gap-3 ${tight ? 'mb-3' : 'mb-4'} px-1`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <h2 className="display text-xl sm:text-2xl text-stone-100 font-light">{title}</h2>
        </div>
        {subtitle && <p className="text-[11px] text-stone-500">{subtitle}</p>}
      </div>
    </div>
  );
}
