import { useState } from 'react';
import {
  Loader2, RefreshCw, ChevronRight, Flame, AlertTriangle,
  Target, Calendar, LineChart, Zap, Eye, Sunrise, Activity,
} from 'lucide-react';
import Sparkline from './Sparkline';
import ApiError from './ApiError';

const actionStyle = (action) => {
  const a = (action || '').toLowerCase();
  if (a.includes('strong'))  return { bg: 'bg-emerald-500/15', border: 'border-emerald-400/40', text: 'text-emerald-300', dot: 'bg-emerald-400' };
  if (a.includes('buy'))     return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-500' };
  if (a.includes('accum'))   return { bg: 'bg-sky-500/10',     border: 'border-sky-500/30',     text: 'text-sky-300',     dot: 'bg-sky-400' };
  return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', dot: 'bg-amber-400' };
};

const scoreColor = (s) => {
  if (!s) return '#94a3b8';
  if (s >= 85) return '#fbbf24';
  if (s >= 70) return '#a3e635';
  if (s >= 55) return '#60a5fa';
  return '#94a3b8';
};

const convictionDots = (c) => {
  const x = (c || '').toLowerCase();
  const f = x === 'high' ? 3 : x === 'medium' ? 2 : 1;
  return [0, 1, 2].map((i) => i < f);
};

const sentimentTone = (s) => {
  const x = (s || '').toLowerCase();
  if (x.includes('bull') || x.includes('net buy')) return 'text-emerald-400';
  if (x.includes('bear') || x.includes('net sell')) return 'text-rose-400';
  return 'text-stone-400';
};

const biasIcon = (bias) => {
  const x = (bias || '').toLowerCase();
  if (x.includes('bull')) return { color: '#34d399', label: 'BULL' };
  if (x.includes('bear')) return { color: '#f87171', label: 'BEAR' };
  return { color: '#94a3b8', label: 'NEUT' };
};

export default function IndustrySection({ industry, state, accountSize, onRetry, sectionId }) {
  const status = state?.status || 'pending';
  const data = state?.data;
  const error = state?.error;

  if (status === 'pending' || status === 'loading') {
    return <SkeletonSection industry={industry} loading={status === 'loading'} sectionId={sectionId} />;
  }

  if (status === 'error') {
    return (
      <section id={sectionId} className="rounded-2xl border border-rose-900/40 bg-rose-950/10 p-5"
               style={{ borderLeft: `3px solid ${industry.color}` }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="display text-lg text-stone-200">{industry.label}</span>
          <span className="text-xs mono text-rose-400/80">— failed</span>
        </div>
        <ApiError error={error} onRetry={onRetry} compact />
      </section>
    );
  }

  if (!data?.picks?.length) return null;

  return (
    <section id={sectionId} className="rounded-2xl border border-stone-800/70 bg-stone-950/30 overflow-hidden slide-up"
             style={{ borderLeft: `3px solid ${industry.color}` }}>
      <div className="p-5 sm:p-6 border-b border-stone-900/80">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
          <h3 className="display text-2xl sm:text-3xl text-stone-100">{industry.label}</h3>
          <span className="mono text-[10px] tracking-widest uppercase text-stone-500">{data.picks.length} picks</span>
        </div>
        {data.industryThesis && (
          <p className="text-sm text-stone-400 leading-relaxed display italic max-w-3xl">{data.industryThesis}</p>
        )}
        {data.industrySmartMoney && (
          <div className="mt-2 flex items-start gap-2 text-xs text-stone-500">
            <Eye className="w-3 h-3 mt-0.5 text-amber-400/70 shrink-0" />
            <span>{data.industrySmartMoney}</span>
          </div>
        )}
      </div>

      <div className="divide-y divide-stone-900/80">
        {data.picks.map((pick, i) => (
          <PickRow key={i} pick={pick} accountSize={accountSize} accent={industry.color} />
        ))}
      </div>
    </section>
  );
}

function PickRow({ pick, accountSize, accent }) {
  const [open, setOpen] = useState(false);
  const a = actionStyle(pick.action);
  const tp = pick.tradePlan || {};
  const sizePct = parseFloat(String(tp.positionSize || '').match(/[\d.]+/)?.[0] || '0');
  const dollars = accountSize > 0 && sizePct > 0 ? Math.round(accountSize * sizePct / 100) : null;
  const entryNum = parseFloat(String(tp.entry || '').match(/[\d.]+/)?.[0] || '0');
  const shares = dollars && entryNum > 0 ? Math.floor(dollars / entryNum) : null;
  const bias = biasIcon(pick.nextDayForecast?.bias);
  const ph = Array.isArray(pick.priceHistory) ? pick.priceHistory : [];

  return (
    <article>
      <button onClick={() => setOpen((v) => !v)}
              className="w-full text-left p-5 sm:p-6 flex items-start gap-4 sm:gap-6 hover:bg-stone-900/30 transition">
        <div className="shrink-0 w-10 sm:w-12">
          <div className="display text-3xl sm:text-4xl font-light text-stone-700 leading-none">
            {String(pick.rank || 0).padStart(2, '0')}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 mb-1.5 flex-wrap">
            <span className="mono text-2xl sm:text-3xl font-bold tracking-tight ticker-glow" style={{ color: accent }}>
              {pick.ticker}
            </span>
            <span className="text-stone-300 text-sm sm:text-base font-medium truncate">{pick.company}</span>
            {typeof pick.currentPrice === 'number' && (
              <span className="mono text-xs text-stone-500">${pick.currentPrice.toFixed(2)}</span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-3">
            <span className={`px-2.5 py-1 rounded-md text-[11px] mono tracking-wider uppercase font-semibold ${a.bg} ${a.text} border ${a.border} flex items-center gap-1.5`}>
              <span className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
              {pick.action}
            </span>
            {pick.subIndustry && (
              <span className="text-[11px] mono text-stone-500 uppercase tracking-wider">{pick.subIndustry}</span>
            )}
            <div className="flex items-center gap-1">
              {convictionDots(pick.conviction).map((on, k) => (
                <div key={k} className={`w-1 h-3 rounded-sm ${on ? 'bg-amber-400' : 'bg-stone-700'}`} />
              ))}
              <span className="text-[10px] mono text-stone-500 uppercase tracking-wider ml-1">{pick.conviction}</span>
            </div>
            {pick.nextDayForecast?.bias && (
              <span className="mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border flex items-center gap-1"
                    style={{ color: bias.color, borderColor: `${bias.color}40`, background: `${bias.color}12` }}>
                <Sunrise className="w-2.5 h-2.5" />
                {bias.label} TMR
              </span>
            )}
          </div>

          <p className="text-stone-300 text-sm leading-relaxed line-clamp-2 sm:line-clamp-none">{pick.thesis}</p>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {ph.length >= 2 && <Sparkline data={ph} width={64} height={20} />}
          <div className="display text-3xl sm:text-4xl font-medium leading-none mono" style={{ color: scoreColor(pick.score) }}>
            {pick.score || 0}
          </div>
          <div className="mono text-[9px] text-stone-600 tracking-widest uppercase">SCORE</div>
          <ChevronRight className={`w-4 h-4 mt-1 text-stone-600 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="px-5 sm:px-6 pb-6 pt-1 bg-stone-950/50 border-t border-stone-900/60 slide-up">

          {pick.tradePlan && (
            <div className="my-5 p-5 rounded-xl bg-gradient-to-br from-amber-950/20 to-stone-950/40 border border-amber-900/30">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-amber-400" />
                <span className="display text-base text-amber-100">Daily trade plan</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <Metric label="Entry"    value={tp.entry}    tone="amber" />
                <Metric label="Stop"     value={tp.stop}     tone="rose" />
                <Metric label="Target 1" value={tp.target1}  tone="emerald" />
                <Metric label="Target 2" value={tp.target2}  tone="emerald" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-amber-900/30">
                <Metric label="R:R"      value={tp.rrRatio}      tone="sky" />
                <Metric label="Position" value={tp.positionSize} tone="sky" />
                {dollars !== null && (
                  <Metric label={`Size @ $${accountSize.toLocaleString()}`}
                          value={`$${dollars.toLocaleString()}${shares ? ` · ~${shares} sh` : ''}`}
                          tone="amber" />
                )}
              </div>
            </div>
          )}

          {pick.nextDayForecast && (
            <div className="mb-5 p-4 rounded-xl border" style={{
              borderColor: `${bias.color}30`,
              background: `linear-gradient(135deg, ${bias.color}08, transparent)`,
            }}>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Sunrise className="w-3.5 h-3.5" style={{ color: bias.color }} />
                <span className="display text-sm text-stone-100">Next-day setup</span>
                <span className="mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ml-auto"
                      style={{ color: bias.color, background: `${bias.color}15`, border: `1px solid ${bias.color}40` }}>
                  {pick.nextDayForecast.bias} · {pick.nextDayForecast.confidence}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
                <Metric label="Expected range" value={pick.nextDayForecast.expectedRange} tone="sky" />
                <Metric label="Key level"      value={pick.nextDayForecast.keyLevel}      tone="amber" />
                <Metric label="Gap risk"       value={pick.nextDayForecast.gapRisk}
                        tone={
                          /high/i.test(pick.nextDayForecast.gapRisk || '') ? 'rose' :
                          /med/i.test(pick.nextDayForecast.gapRisk || '') ? 'amber' : 'sky'
                        } />
              </div>
              {pick.nextDayForecast.rationale && (
                <p className="text-xs text-stone-400 italic mt-2">{pick.nextDayForecast.rationale}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            {pick.smartMoney && (
              <div className="p-4 rounded-xl border border-stone-800/60 bg-stone-950/40">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-3.5 h-3.5 text-amber-400/80" />
                  <span className="mono text-[10px] uppercase tracking-wider text-stone-400">Dark data</span>
                  {pick.smartMoney.score && (
                    <span className="mono text-xs ml-auto text-amber-200">{pick.smartMoney.score}/100</span>
                  )}
                </div>
                <div className="space-y-1.5 text-xs">
                  <Row k="Dark pool" v={
                    <span className={sentimentTone(pick.smartMoney.darkPoolSentiment)}>
                      {pick.smartMoney.darkPoolSentiment || '—'}
                    </span>
                  } />
                  <Row k="Inst. flow" v={
                    <span className={sentimentTone(pick.smartMoney.institutionalFlow)}>
                      {pick.smartMoney.institutionalFlow || '—'}
                    </span>
                  } />
                  {pick.smartMoney.insiderActivity && <Row k="Insider" v={pick.smartMoney.insiderActivity} />}
                  {pick.smartMoney.optionsFlow && <Row k="Options" v={pick.smartMoney.optionsFlow} />}
                </div>
              </div>
            )}

            {pick.volatility && (
              <div className="p-4 rounded-xl border border-stone-800/60 bg-stone-950/40">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-3.5 h-3.5 text-amber-400/80" />
                  <span className="mono text-[10px] uppercase tracking-wider text-stone-400">Volatility</span>
                  {pick.volatility.regime && (
                    <span className="mono text-[10px] uppercase tracking-wider ml-auto px-1.5 py-0.5 rounded text-stone-300 bg-stone-800/60">
                      {pick.volatility.regime}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Row k="IV" v={pick.volatility.iv} />
                  <Row k="IV rank" v={pick.volatility.ivRank} />
                  <Row k="HV30" v={pick.volatility.hv30} />
                  <Row k="Exp move" v={pick.volatility.expectedMove} />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pick.earnings && (
              <DetailBlock icon={<Calendar className="w-3.5 h-3.5" />} label="Earnings" tone="sky">
                <div className="space-y-1.5 text-xs">
                  <Row k="Last" v={pick.earnings.lastDate} />
                  <Row k="Result" v={pick.earnings.result} />
                  <Row k="Guidance" v={pick.earnings.guidance} />
                  <Row k="Next" v={pick.earnings.nextDate} />
                </div>
              </DetailBlock>
            )}

            {pick.technicals && (
              <DetailBlock icon={<LineChart className="w-3.5 h-3.5" />} label="Technical setup" tone="emerald">
                <div className="space-y-1.5 text-xs">
                  <Row k="Trend" v={pick.technicals.trend} />
                  <Row k="Pattern" v={pick.technicals.pattern} />
                  <Row k="Levels" v={pick.technicals.keyLevels} />
                  <Row k="RSI" v={pick.technicals.rsi} />
                  <Row k="Volume" v={pick.technicals.volume} />
                </div>
              </DetailBlock>
            )}

            <DetailBlock icon={<Flame className="w-3.5 h-3.5" />} label="Catalysts" tone="amber">
              <ul className="space-y-1.5">
                {(pick.catalysts || []).map((c, k) => {
                  const text = typeof c === 'string'
                    ? c
                    : `${c?.event || ''}${c?.date && c.date !== 'TBD' ? ` · ${c.date}` : ''}`;
                  if (!text) return null;
                  return (
                    <li key={k} className="text-sm text-stone-300 flex gap-2">
                      <span className="text-amber-400 mt-1">▸</span>
                      <span>{text}</span>
                    </li>
                  );
                })}
              </ul>
            </DetailBlock>

            <DetailBlock icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Risks" tone="rose">
              <ul className="space-y-1.5">
                {(pick.risks || []).map((r, k) => (
                  <li key={k} className="text-sm text-stone-300 flex gap-2">
                    <span className="text-rose-400 mt-1">▸</span><span>{r}</span>
                  </li>
                ))}
              </ul>
            </DetailBlock>
          </div>

          {pick.edge && (
            <div className="mt-5 px-4 py-3 rounded-lg bg-amber-950/30 border border-amber-900/40">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="mono text-[10px] tracking-widest uppercase text-amber-400/80">Edge</span>
              </div>
              <p className="text-sm text-amber-100/90 italic display">{pick.edge}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function SkeletonSection({ industry, loading, sectionId }) {
  return (
    <section id={sectionId} className="rounded-2xl border border-stone-800/50 bg-stone-950/20 p-5 sm:p-6"
             style={{ borderLeft: `3px solid ${loading ? industry.color : '#3a3530'}`, opacity: loading ? 1 : 0.4 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="display text-2xl text-stone-200">{industry.label}</h3>
          {loading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: industry.color }} />}
        </div>
        <span className="mono text-[10px] tracking-widest uppercase text-stone-600">
          {loading ? 'researching…' : 'queued'}
        </span>
      </div>
      {loading && (
        <div className="space-y-2 mt-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-stone-900/40 animate-pulse" />)}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, tone }) {
  const tones = {
    amber:   'text-amber-300 border-amber-900/40 bg-amber-950/20',
    rose:    'text-rose-300 border-rose-900/40 bg-rose-950/20',
    emerald: 'text-emerald-300 border-emerald-900/40 bg-emerald-950/20',
    sky:     'text-sky-300 border-sky-900/40 bg-sky-950/20',
  };
  return (
    <div className={`p-3 rounded-lg border ${tones[tone] || tones.sky}`}>
      <div className="mono text-[9px] tracking-widest uppercase opacity-70 mb-1">{label}</div>
      <div className="mono text-sm font-semibold leading-tight">{value || '—'}</div>
    </div>
  );
}

function DetailBlock({ icon, label, tone, children }) {
  const tones = {
    amber:   'text-amber-400/80', rose: 'text-rose-400/80',
    sky:     'text-sky-400/80',   emerald: 'text-emerald-400/80',
  };
  return (
    <div>
      <div className={`flex items-center gap-1.5 mb-2 mono text-[10px] tracking-[0.2em] uppercase ${tones[tone] || tones.sky}`}>
        {icon}{label}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex gap-2">
      <span className="mono text-[10px] uppercase tracking-wider text-stone-500 shrink-0 w-16 pt-0.5">{k}</span>
      <span className="text-stone-300">{v || '—'}</span>
    </div>
  );
}
