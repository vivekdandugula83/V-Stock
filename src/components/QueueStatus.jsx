import { useState, useEffect } from 'react';
import { Loader2, Clock, CheckCircle2, AlertCircle, Pause } from 'lucide-react';

export default function QueueStatus({ queue, totalExpected, label }) {
  const [stats, setStats] = useState({
    pending: 0, running: 0, done: 0, failed: 0, retrying: 0,
    nextRetryAt: null, nextRetryLabel: null,
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!queue) return;
    const off = queue.onUpdate((s) => setStats(s));
    return off;
  }, [queue]);

  useEffect(() => {
    if (!stats.nextRetryAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [stats.nextRetryAt]);

  const total = totalExpected || (stats.pending + stats.running + stats.done + stats.failed);
  const progress = total > 0 ? (stats.done / total) * 100 : 0;

  const retryRemainingSec = stats.nextRetryAt
    ? Math.max(0, Math.ceil((stats.nextRetryAt - now) / 1000))
    : 0;

  return (
    <div className="mb-6 p-4 rounded-xl border border-amber-900/40 bg-amber-950/15">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="text-amber-300 animate-spin" />
          <span className="display text-sm text-amber-100">{label || 'Running research...'}</span>
        </div>
        <div className="text-xs mono text-amber-200/70">
          {stats.done}/{total} done
        </div>
      </div>

      <div className="h-2 bg-stone-900 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-4 flex-wrap text-[11px] mono">
        <Stat icon={<Loader2 size={11} className="animate-spin" />} value={stats.running} label="running" color="text-cyan-300" />
        <Stat icon={<Clock size={11} />} value={stats.pending} label="pending" color="text-stone-400" />
        <Stat icon={<CheckCircle2 size={11} />} value={stats.done} label="done" color="text-emerald-300" />
        {stats.failed > 0 && (
          <Stat icon={<AlertCircle size={11} />} value={stats.failed} label="failed" color="text-rose-300" />
        )}
        {stats.retrying > 0 && (
          <Stat
            icon={<Pause size={11} />}
            value={stats.retrying}
            label={retryRemainingSec > 0
              ? `retrying ${stats.nextRetryLabel || ''} in ${retryRemainingSec}s`
              : 'retrying...'}
            color="text-amber-300"
          />
        )}
      </div>

      {stats.retrying > 0 && (
        <div className="mt-2 text-[10px] text-amber-200/60 leading-relaxed">
          Hit a rate limit — automatically backing off and retrying. Your API key is fine; this is just queueing for the per-minute window.
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label, color }) {
  return (
    <span className={`flex items-center gap-1.5 ${color}`}>
      {icon}
      <span className="font-medium">{value}</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}
