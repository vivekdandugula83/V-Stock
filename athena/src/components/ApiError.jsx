import { AlertCircle, ExternalLink, RefreshCw, Wifi, CreditCard, Key, Clock, Server } from 'lucide-react';
import { KNOWN_ERROR_KINDS } from '../lib/agent';

const ERROR_DISPLAY = {
  [KNOWN_ERROR_KINDS.CREDIT]: {
    icon: CreditCard,
    title: 'Out of API credits',
    color: 'rose',
    body: 'Your Anthropic API account has insufficient credit balance. Add funds before the agent can run.',
    action: { label: 'Open Anthropic Billing', href: 'https://console.anthropic.com/settings/billing' },
    hint: 'Tip: enable auto-reload in Console → Billing so you never hit zero again.',
  },
  [KNOWN_ERROR_KINDS.AUTH]: {
    icon: Key,
    title: 'Invalid API key',
    color: 'rose',
    body: 'The API key was rejected. It may be revoked, deleted, or copied incorrectly.',
    action: { label: 'Get a new key', href: 'https://console.anthropic.com/settings/keys' },
    hint: 'Click "change" on the key indicator above to paste a fresh key.',
  },
  [KNOWN_ERROR_KINDS.CORS]: {
    icon: Wifi,
    title: 'Browser direct access blocked',
    color: 'amber',
    body: 'The browser was blocked from calling the Anthropic API directly. Your account may need this enabled, or an extension is blocking the request.',
    action: { label: 'Anthropic Console', href: 'https://console.anthropic.com/' },
    hint: 'Try: (1) disable ad-blockers / privacy extensions on this page, (2) try an incognito window, (3) check Console settings for browser-direct-access permission.',
  },
  [KNOWN_ERROR_KINDS.RATELIMIT]: {
    icon: Clock,
    title: 'Rate limited',
    color: 'amber',
    body: 'Too many requests too quickly. Wait a minute and retry — try Express mode for fewer parallel calls.',
    hint: 'New accounts have lower limits. Console → Limits to see your tier.',
  },
  [KNOWN_ERROR_KINDS.OVERLOADED]: {
    icon: Server,
    title: 'Anthropic API overloaded',
    color: 'amber',
    body: 'Their servers are temporarily at capacity. Wait 30 seconds and try again.',
  },
  [KNOWN_ERROR_KINDS.SERVER]: {
    icon: Server,
    title: 'Anthropic server error',
    color: 'amber',
    body: 'Server-side error from the API. This is usually transient — retry.',
  },
  [KNOWN_ERROR_KINDS.NETWORK]: {
    icon: Wifi,
    title: 'Network request failed',
    color: 'amber',
    body: 'The request never reached the API. Most commonly a CORS issue or bad internet connection.',
    hint: 'Check your network, try incognito mode, or disable extensions.',
  },
  [KNOWN_ERROR_KINDS.PARSE]: {
    icon: AlertCircle,
    title: 'Agent returned malformed data',
    color: 'amber',
    body: 'The model responded but the output couldn\'t be parsed. This sometimes happens with complex prompts.',
    hint: 'Retry — usually works on the second try. If persistent, try Express mode.',
  },
  [KNOWN_ERROR_KINDS.UNKNOWN]: {
    icon: AlertCircle,
    title: 'Unknown error',
    color: 'rose',
  },
};

const colorClasses = {
  rose:  'border-rose-900/50 bg-rose-950/20 text-rose-200',
  amber: 'border-amber-900/50 bg-amber-950/20 text-amber-200',
};

export default function ApiError({ error, onRetry, compact = false, contextLabel }) {
  if (!error) return null;
  const kind = error.kind || KNOWN_ERROR_KINDS.UNKNOWN;
  const cfg = ERROR_DISPLAY[kind] || ERROR_DISPLAY[KNOWN_ERROR_KINDS.UNKNOWN];
  const Icon = cfg.icon;
  const cls = colorClasses[cfg.color] || colorClasses.rose;

  if (compact) {
    return (
      <div className={`flex items-start gap-2 p-3 rounded-lg border ${cls}`}>
        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{cfg.title}</div>
          <div className="mono text-[11px] opacity-70 mt-0.5 break-words">
            {error.message?.slice(0, 200) || cfg.body}
          </div>
        </div>
        {onRetry && (
          <button onClick={onRetry} className="text-xs flex items-center gap-1 hover:underline shrink-0">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`my-6 p-5 sm:p-6 rounded-2xl border ${cls}`}>
      <div className="flex items-start gap-4">
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${cfg.color === 'rose' ? 'bg-rose-500/15' : 'bg-amber-500/15'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="display text-xl mb-1">{cfg.title}</h3>
          {contextLabel && <div className="mono text-[10px] uppercase tracking-widest opacity-60 mb-2">{contextLabel}</div>}
          <p className="text-sm leading-relaxed opacity-90 mb-3">{cfg.body || error.message}</p>

          {error.message && cfg.body && error.message !== cfg.body && (
            <details className="mb-3">
              <summary className="cursor-pointer text-xs opacity-60 hover:opacity-100">Show server message</summary>
              <pre className="mt-2 p-3 rounded bg-black/30 mono text-[10px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-words opacity-80">
                {error.message}
              </pre>
            </details>
          )}

          {cfg.hint && (
            <div className="text-xs opacity-70 italic mb-3">💡 {cfg.hint}</div>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {cfg.action && (
              <a
                href={cfg.action.href}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 text-stone-950 hover:bg-white text-xs font-semibold transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> {cfg.action.label}
              </a>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-current/40 hover:bg-current/10 text-xs font-semibold transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
