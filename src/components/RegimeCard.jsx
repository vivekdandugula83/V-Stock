import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import SourceList from './SourceList.jsx';

const VAL_STYLES = {
  cheap:     { ring: 'border-emerald-400/40', bg: 'bg-emerald-500/8',  text: 'text-emerald-300', icon: TrendingDown },
  fair:      { ring: 'border-amber-400/30',   bg: 'bg-amber-500/8',    text: 'text-amber-300',   icon: Minus },
  expensive: { ring: 'border-rose-400/40',    bg: 'bg-rose-500/8',     text: 'text-rose-300',    icon: TrendingUp },
  mixed:     { ring: 'border-white/15',       bg: 'bg-white/[0.03]',   text: 'text-white/70',    icon: BarChart3 },
};

const SECTOR_RATING_STYLES = {
  cheap:     'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
  fair:      'bg-amber-500/15 text-amber-200 border-amber-400/30',
  expensive: 'bg-rose-500/15 text-rose-200 border-rose-400/30',
};

function styleFor(v) {
  const k = String(v || '').toLowerCase();
  if (k.includes('cheap')) return VAL_STYLES.cheap;
  if (k.includes('expensive')) return VAL_STYLES.expensive;
  if (k.includes('fair')) return VAL_STYLES.fair;
  return VAL_STYLES.mixed;
}

function sectorRatingStyle(r) {
  const k = String(r || '').toLowerCase();
  if (k.includes('cheap')) return SECTOR_RATING_STYLES.cheap;
  if (k.includes('expensive')) return SECTOR_RATING_STYLES.expensive;
  return SECTOR_RATING_STYLES.fair;
}

export default function RegimeCard({ regime, fromCache }) {
  if (!regime) return null;
  const s = styleFor(regime?.marketValuation);
  const Icon = s.icon;
  const sectorVal = Array.isArray(regime?.sectorValuation) ? regime.sectorValuation : [];
  const opps = Array.isArray(regime?.valueOpportunities) ? regime.valueOpportunities : [];

  return (
    <div className={`rounded-xl border ${s.ring} ${s.bg} p-5 mb-6 slide-up`}>
      <div className="flex items-start gap-3 mb-4 flex-wrap">
        <div className={`w-12 h-12 rounded-lg ${s.bg} border ${s.ring} flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} className={s.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="display text-lg text-white">Market Valuation:</h3>
            <span className={`display text-lg ${s.text}`}>{regime?.marketValuation || 'Mixed'}</span>
            {fromCache && (
              <span className="text-[10px] uppercase text-white/40 px-2 py-0.5 rounded bg-white/5">cached</span>
            )}
          </div>
          {regime?.valuationReason && (
            <p className="text-sm text-white/75 leading-relaxed">{regime.valuationReason}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Metric label="S&P P/E" value={regime?.spxPe} />
        <Metric label="Fwd P/E" value={regime?.spxForwardPe} />
        <Metric label="Shiller CAPE" value={regime?.shillerCape} />
        <Metric label="10-yr Yield" value={regime?.tenYear} />
      </div>

      {regime?.equityRiskPremium && (
        <div className="mb-4 text-[11px] text-white/60">
          <span className="text-white/40">Equity Risk Premium:</span> <span className="mono text-white/85">{regime.equityRiskPremium}</span>
        </div>
      )}

      {sectorVal.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Sector Valuation</div>
          <div className="flex flex-wrap gap-2">
            {sectorVal.map((sv, i) => (
              <div key={i} className={`text-[11px] px-2 py-1 rounded border ${sectorRatingStyle(sv?.rating)}`}>
                <span className="font-medium">{sv?.sector}</span>
                <span className="opacity-70 ml-1.5 mono">P/E {sv?.pe}</span>
                {sv?.vsHistorical && <span className="opacity-50 ml-1.5">({sv.vsHistorical})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {regime?.insiderAggregate && (
        <div className="mb-4 p-3 bg-violet-500/5 border border-violet-400/20 rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-violet-300/80 mb-1">Aggregate Insider Activity</div>
          <p className="text-sm text-white/80">{regime.insiderAggregate}</p>
        </div>
      )}

      {opps.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">Value Opportunities</div>
          <ul className="space-y-1">
            {opps.map((o, i) => (
              <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                <span className="text-amber-300/60 mt-1">•</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(regime?.sources) && regime.sources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/5">
          <SourceList sources={regime.sources} compact label="Market sources" />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mono text-sm text-white mt-1 truncate">{value || '—'}</div>
    </div>
  );
}
