import { TrendingUp, Activity, Zap, DollarSign } from 'lucide-react';
import { STRATEGIES } from '../lib/strategies.js';

const ICON_MAP = { TrendingUp, Activity, Zap, DollarSign };

export default function StrategyTabs({ active, onChange, enabled, completionByStrategy = {} }) {
  const list = Object.values(STRATEGIES);
  return (
    <div className="flex p-1 rounded-xl border border-stone-800 bg-stone-950/60 overflow-x-auto">
      {list.map((s) => {
        const Icon = ICON_MAP[s.icon] || TrendingUp;
        const isActive = active === s.id;
        const isEnabled = enabled.includes(s.id);
        const completion = completionByStrategy[s.id] || { done: 0, total: 0 };
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            disabled={!isEnabled}
            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition flex-shrink-0 ${
              isActive
                ? 'bg-amber-400/20 text-amber-200'
                : isEnabled
                  ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
                  : 'text-stone-600 cursor-not-allowed'
            }`}
            title={s.description}
          >
            <Icon size={13} style={{ color: isActive ? undefined : s.color, opacity: isActive ? 1 : 0.7 }} />
            <span className="font-medium">{s.label}</span>
            {isEnabled && completion.total > 0 && (
              <span className="text-[10px] mono text-stone-500">{completion.done}/{completion.total}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
