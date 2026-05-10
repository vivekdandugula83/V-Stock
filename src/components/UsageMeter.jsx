import { useState, useEffect } from 'react';
import { TrendingUp, Settings, AlertTriangle, X, Trash2 } from 'lucide-react';
import { summarizeUsage, loadBudget, saveBudget, clearLedger } from '../lib/usage';

export default function UsageMeter({ refreshKey }) {
  const [summary, setSummary] = useState(() => summarizeUsage());
  const [budget, setBudget] = useState(() => loadBudget());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setSummary(summarizeUsage());
  }, [refreshKey]);

  // Refresh every 30s in case of background updates
  useEffect(() => {
    const id = setInterval(() => setSummary(summarizeUsage()), 30000);
    return () => clearInterval(id);
  }, []);

  const updateBudget = (patch) => {
    const next = { ...budget, ...patch };
    setBudget(next);
    saveBudget(next);
  };

  const handleClear = () => {
    if (confirm('Clear local usage ledger? This only resets the on-screen tracker — actual API charges are unaffected.')) {
      clearLedger();
      setSummary(summarizeUsage());
    }
  };

  const dailyPct = budget.dailyLimit > 0 ? (summary.today.cost / budget.dailyLimit) * 100 : 0;
  const sessionPct = budget.sessionLimit > 0 ? (summary.session.cost / budget.sessionLimit) * 100 : 0;

  const dailyState = dailyPct >= 100 ? 'over' : dailyPct >= 80 ? 'warn' : 'ok';
  const sessionState = sessionPct >= 100 ? 'over' : sessionPct >= 80 ? 'warn' : 'ok';

  return (
    <div className="rounded-2xl border border-stone-800/80 bg-stone-950/40 backdrop-blur p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400/80" />
          <h2 className="mono text-[10px] tracking-[0.25em] uppercase text-stone-400">Local spend tracker</h2>
        </div>
        <div className="flex items-center gap-3">
          {summary.entries > 0 && (
            <button
              onClick={handleClear}
              title="Clear local ledger"
              className="text-stone-600 hover:text-rose-400 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="text-stone-500 hover:text-amber-300 transition"
          >
            {showSettings ? <X className="w-4 h-4" /> : <Settings className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Three columns: session, today, total */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <SpendCol
          label="Session (30m)" cost={summary.session.cost} runs={summary.session.runs}
          searches={summary.session.searches} state={sessionState}
          pct={Math.min(100, sessionPct)} limit={budget.sessionLimit}
        />
        <SpendCol
          label="Today" cost={summary.today.cost} runs={summary.today.runs}
          searches={summary.today.searches} state={dailyState}
          pct={Math.min(100, dailyPct)} limit={budget.dailyLimit}
        />
        <SpendCol
          label="All-time" cost={summary.total.cost} runs={summary.total.runs}
          searches={summary.total.searches} plain
        />
      </div>

      {/* Warnings */}
      {(dailyState !== 'ok' || sessionState !== 'ok') && (
        <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs leading-relaxed ${
          dailyState === 'over' || sessionState === 'over'
            ? 'border-rose-900/40 bg-rose-950/20 text-rose-200'
            : 'border-amber-900/40 bg-amber-950/20 text-amber-200'
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div>
            {dailyState === 'over' && <div>Daily budget exceeded — running again will keep spending real money.</div>}
            {sessionState === 'over' && dailyState !== 'over' && <div>Session budget exceeded — consider taking a break or switching to Express mode.</div>}
            {(dailyState === 'warn' || sessionState === 'warn') && (dailyState !== 'over' && sessionState !== 'over') && (
              <div>Approaching budget limit — next run may exceed.</div>
            )}
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="mt-4 pt-4 border-t border-stone-800/60 space-y-3">
          <div>
            <label className="block mono text-[10px] uppercase tracking-widest text-stone-500 mb-1.5">
              Session budget (USD)
            </label>
            <input
              type="number" step="0.25" min="0"
              value={budget.sessionLimit}
              onChange={(e) => updateBudget({ sessionLimit: parseFloat(e.target.value) || 0 })}
              className="w-full bg-stone-900/60 border border-stone-700/60 rounded-lg px-3 py-1.5 mono text-sm text-stone-100 focus:border-amber-500/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="block mono text-[10px] uppercase tracking-widest text-stone-500 mb-1.5">
              Daily budget (USD)
            </label>
            <input
              type="number" step="1" min="0"
              value={budget.dailyLimit}
              onChange={(e) => updateBudget({ dailyLimit: parseFloat(e.target.value) || 0 })}
              className="w-full bg-stone-900/60 border border-stone-700/60 rounded-lg px-3 py-1.5 mono text-sm text-stone-100 focus:border-amber-500/60 focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            These are local soft warnings only — they don't actually cap API spend. For a hard cap, set a monthly
            spend limit in <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noreferrer" className="text-amber-300 underline">Anthropic Console</a>.
          </p>
        </div>
      )}

      {summary.last && (
        <div className="mt-3 mono text-[10px] text-stone-600 tracking-wider">
          last call: ${summary.last.cost.toFixed(4)} · {summary.last.label || 'unknown'} · {summary.last.searches} searches
        </div>
      )}
    </div>
  );
}

function SpendCol({ label, cost, runs, searches, state, pct, limit, plain }) {
  const stateColor = state === 'over' ? '#f87171' : state === 'warn' ? '#fbbf24' : '#34d399';

  return (
    <div className="p-3 rounded-lg bg-stone-950/60 border border-stone-800/60">
      <div className="mono text-[10px] tracking-widest uppercase text-stone-500 mb-1.5">{label}</div>
      <div className="display text-2xl font-light tabular-nums" style={{ color: plain ? '#f5f1ea' : stateColor }}>
        ${cost.toFixed(2)}
      </div>
      <div className="mono text-[10px] text-stone-500 mt-0.5">
        {runs} run{runs !== 1 ? 's' : ''} · {searches} searches
      </div>
      {!plain && limit > 0 && (
        <div className="mt-2">
          <div className="h-1 rounded-full bg-stone-900 overflow-hidden">
            <div className="h-full transition-all"
                 style={{ width: `${pct}%`, background: stateColor }} />
          </div>
          <div className="mono text-[9px] text-stone-600 mt-1">of ${limit} limit</div>
        </div>
      )}
    </div>
  );
}
