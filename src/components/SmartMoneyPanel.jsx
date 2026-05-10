import { Eye, Building2, UserCheck, Activity } from 'lucide-react';
import Sparkline from './Sparkline';

const sentimentTone = (s) => {
  const x = (s || '').toLowerCase();
  if (x.includes('bull') || x.includes('net buy')) return 'text-emerald-400';
  if (x.includes('bear') || x.includes('net sell')) return 'text-rose-400';
  return 'text-stone-400';
};

const sentimentBg = (s) => {
  const x = (s || '').toLowerCase();
  if (x.includes('bull') || x.includes('net buy')) return 'bg-emerald-500/10 border-emerald-500/20';
  if (x.includes('bear') || x.includes('net sell')) return 'bg-rose-500/10 border-rose-500/20';
  return 'bg-stone-800/40 border-stone-800/60';
};

export default function SmartMoneyPanel({ allPicks }) {
  const picks = Array.isArray(allPicks) ? allPicks : [];
  if (picks.length === 0) return null;

  const ranked = picks
    .filter((p) => p?.smartMoney?.score)
    .sort((a, b) => (b.smartMoney?.score || 0) - (a.smartMoney?.score || 0))
    .slice(0, 8);

  const counts = {
    bullishDarkPool: picks.filter((p) => /bull/i.test(p?.smartMoney?.darkPoolSentiment || '')).length,
    bearishDarkPool: picks.filter((p) => /bear/i.test(p?.smartMoney?.darkPoolSentiment || '')).length,
    netBuying: picks.filter((p) => /net buy|buying/i.test(p?.smartMoney?.institutionalFlow || '')).length,
    netSelling: picks.filter((p) => /net sell|selling/i.test(p?.smartMoney?.institutionalFlow || '')).length,
  };

  return (
    <div className="rounded-2xl border border-stone-800/70 bg-gradient-to-br from-stone-950/60 to-stone-900/30 overflow-hidden">
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-stone-900">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="w-4 h-4 text-amber-400/80" />
          <h3 className="display text-xl text-stone-100">Dark data signals</h3>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed max-w-xl">
          AI-aggregated public reports on dark pool prints, institutional flow (13F), insider Form 4 filings,
          and unusual options activity. Lags real-time pro feeds — directional, not precise.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 border-b border-stone-900/80">
        <SentimentBar label="Dark pool" bullish={counts.bullishDarkPool} bearish={counts.bearishDarkPool} total={picks.length} />
        <SentimentBar label="Institutional flow" bullish={counts.netBuying} bearish={counts.netSelling} total={picks.length} />
      </div>

      <div className="p-5">
        {ranked.length > 0 ? (
          <>
            <div className="mono text-[10px] tracking-widest uppercase text-stone-500 mb-3">
              Highest smart-money score
            </div>
            <div className="space-y-2">
              {ranked.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-stone-800/50 bg-stone-950/40 hover:border-stone-700 transition">
                  <div className="shrink-0 mono text-xs text-stone-600 w-6">{String(i + 1).padStart(2, '0')}</div>
                  <span className="mono text-sm font-bold w-16 shrink-0" style={{ color: p.industryColor || '#d4a574' }}>
                    {p.ticker || '?'}
                  </span>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${sentimentBg(p.smartMoney?.darkPoolSentiment)}`}>
                        <Eye className="inline w-2.5 h-2.5 mr-0.5" />
                        <span className={sentimentTone(p.smartMoney?.darkPoolSentiment)}>
                          {p.smartMoney?.darkPoolSentiment || 'unk'}
                        </span>
                      </span>
                      <span className={`mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${sentimentBg(p.smartMoney?.institutionalFlow)}`}>
                        <Building2 className="inline w-2.5 h-2.5 mr-0.5" />
                        <span className={sentimentTone(p.smartMoney?.institutionalFlow)}>
                          {p.smartMoney?.institutionalFlow || 'unk'}
                        </span>
                      </span>
                    </div>
                    {p.smartMoney?.insiderActivity && (
                      <div className="text-[11px] text-stone-400 line-clamp-1">
                        <UserCheck className="inline w-2.5 h-2.5 mr-1 text-stone-500" />
                        {p.smartMoney.insiderActivity}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    {p.priceHistory?.length >= 2 && <Sparkline data={p.priceHistory} width={50} height={18} />}
                    <div className="text-right">
                      <div className="display text-lg font-light text-amber-200 leading-none">
                        {p.smartMoney?.score || 0}
                      </div>
                      <div className="mono text-[8px] text-stone-600 uppercase tracking-widest">SM</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-stone-500 text-sm text-center py-6">
            Smart-money data not returned for these picks. Try Standard or Deep mode for richer signals.
          </div>
        )}
      </div>
    </div>
  );
}

function SentimentBar({ label, bullish, bearish, total }) {
  const neutral = Math.max(0, total - bullish - bearish);
  const t = total || 1;
  const bullPct = (bullish / t) * 100;
  const neutPct = (neutral / t) * 100;
  const bearPct = (bearish / t) * 100;

  return (
    <div className="p-3 rounded-lg bg-stone-950/60 border border-stone-800/60">
      <div className="flex items-center justify-between mb-2">
        <span className="mono text-[10px] tracking-widest uppercase text-stone-500">{label}</span>
        <Activity className="w-3 h-3 text-stone-600" />
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-stone-900">
        <div className="bg-emerald-500/70 transition-all duration-700" style={{ width: `${bullPct}%` }} />
        <div className="bg-stone-700/50 transition-all duration-700" style={{ width: `${neutPct}%` }} />
        <div className="bg-rose-500/70 transition-all duration-700" style={{ width: `${bearPct}%` }} />
      </div>
      <div className="flex justify-between mt-2 mono text-[10px]">
        <span className="text-emerald-400">{bullish} bullish</span>
        <span className="text-stone-500">{neutral} neutral</span>
        <span className="text-rose-400">{bearish} bearish</span>
      </div>
    </div>
  );
}
