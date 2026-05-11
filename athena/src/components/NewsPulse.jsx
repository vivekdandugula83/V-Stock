import { Newspaper, Globe, Cpu, Building2, Landmark, Zap } from 'lucide-react';

const ICONS = {
  political: Globe,
  macro: Landmark,
  tech: Cpu,
  policy: Building2,
};

const COLORS = {
  political: { ring: 'ring-rose-400/30', bg: 'bg-rose-400/10', text: 'text-rose-300' },
  macro: { ring: 'ring-blue-400/30', bg: 'bg-blue-400/10', text: 'text-blue-300' },
  tech: { ring: 'ring-cyan-400/30', bg: 'bg-cyan-400/10', text: 'text-cyan-300' },
  policy: { ring: 'ring-amber-400/30', bg: 'bg-amber-400/10', text: 'text-amber-300' },
};

function Section({ kind, items, onTickerClick }) {
  const safe = Array.isArray(items) ? items : [];
  if (safe.length === 0) return null;
  const Icon = ICONS[kind] || Newspaper;
  const colors = COLORS[kind] || COLORS.macro;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded ${colors.bg} flex items-center justify-center`}>
          <Icon size={13} className={colors.text} />
        </div>
        <h4 className="display text-sm text-white capitalize">{kind}</h4>
      </div>
      <div className="space-y-2">
        {safe.slice(0, 5).map((item, i) => {
          const direction = String(item?.direction || '').toLowerCase();
          const dirColor =
            direction.includes('bull') ? 'text-emerald-300' :
            direction.includes('bear') ? 'text-rose-300' : 'text-white/60';
          const impact = String(item?.impact || '').toLowerCase();
          const impactDot = impact === 'high' ? 'bg-rose-400' : impact === 'medium' ? 'bg-amber-400' : 'bg-white/40';
          return (
            <div key={i} className={`p-3 rounded-lg bg-white/[0.03] border border-white/5 ring-1 ${colors.ring}/0 hover:${colors.ring} transition`}>
              <div className="flex items-start gap-2">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${impactDot} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/95 font-medium">{item?.title || '(no title)'}</div>
                  <div className="text-xs text-white/60 mt-1">{item?.summary || ''}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {(item?.tickers || []).slice(0, 6).map((t, ti) => (
                      <button
                        key={ti}
                        onClick={() => onTickerClick && onTickerClick(t)}
                        className="mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                      >
                        {t}
                      </button>
                    ))}
                    {direction && (
                      <span className={`text-[10px] uppercase tracking-wider ${dirColor}`}>· {direction}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function NewsPulse({ data, onTickerClick }) {
  if (!data) return null;
  const themes = Array.isArray(data?.themes) ? data.themes : [];
  const sentiment = String(data?.sentiment || 'Mixed');
  const sentClr =
    sentiment.toLowerCase().includes('on') ? 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30' :
    sentiment.toLowerCase().includes('off') ? 'text-rose-300 bg-rose-400/10 border-rose-400/30' :
                                              'text-white/70 bg-white/5 border-white/15';

  return (
    <div className="bg-gradient-to-br from-cyan-500/5 via-white/5 to-white/5 border border-cyan-400/20 rounded-xl overflow-hidden slide-up">
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-400/20 flex items-center justify-center">
              <Newspaper size={18} className="text-cyan-300" />
            </div>
            <div>
              <h2 className="display text-lg text-white">News Pulse</h2>
              <div className="text-xs text-white/50">Political · Macro · Tech · Policy</div>
            </div>
          </div>
          <span className={`text-xs uppercase tracking-wider px-3 py-1 rounded border ${sentClr}`}>
            {sentiment}
          </span>
        </div>
        {data?.headline && (
          <div className="text-sm text-white/85 italic border-l-2 border-cyan-400/40 pl-3">
            "{data.headline}"
          </div>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section kind="political" items={data?.political} onTickerClick={onTickerClick} />
        <Section kind="macro" items={data?.macro} onTickerClick={onTickerClick} />
        <Section kind="tech" items={data?.tech} onTickerClick={onTickerClick} />
        <Section kind="policy" items={data?.policy} onTickerClick={onTickerClick} />
      </div>

      {themes.length > 0 && (
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={13} className="text-amber-300" />
            <h4 className="display text-sm text-white">Trade Themes</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {themes.slice(0, 6).map((th, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
                <div className="text-sm text-white/95 font-medium">{th?.theme || ''}</div>
                <div className="text-xs text-white/55 mt-1">{th?.rationale || ''}</div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {(th?.longs || []).length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-emerald-300 uppercase">Long</span>
                      {(th.longs || []).slice(0, 4).map((t, ti) => (
                        <button
                          key={ti}
                          onClick={() => onTickerClick && onTickerClick(t)}
                          className="mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/20 text-emerald-200 hover:bg-emerald-400/20"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                  {(th?.shorts || []).length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-rose-300 uppercase">Short</span>
                      {(th.shorts || []).slice(0, 4).map((t, ti) => (
                        <button
                          key={ti}
                          onClick={() => onTickerClick && onTickerClick(t)}
                          className="mono text-[10px] px-1.5 py-0.5 rounded bg-rose-400/10 border border-rose-400/20 text-rose-200 hover:bg-rose-400/20"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
