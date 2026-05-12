// Concurrency-limited queue with min-spacing between calls and 429-aware auto-retry.
// All API calls in V-Stock funnel through this to avoid Tier 1 rate limits.

export class RateLimitQueue {
  constructor({ concurrency = 1, minSpacingMs = 2000, maxRetries = 4 } = {}) {
    this.concurrency = Math.max(1, concurrency);
    this.minSpacingMs = Math.max(0, minSpacingMs);
    this.maxRetries = maxRetries;
    this.queue = [];
    this.running = 0;
    this.lastStartTime = 0;
    this.listeners = new Set();
    this.stats = {
      pending: 0, running: 0, done: 0, failed: 0, retrying: 0,
      nextRetryAt: null, nextRetryLabel: null,
    };
    this.id = 0;
  }

  onUpdate(fn) {
    this.listeners.add(fn);
    // Push current state immediately
    fn({ ...this.stats });
    return () => this.listeners.delete(fn);
  }

  emit() {
    this.stats.pending = this.queue.length;
    this.stats.running = this.running;
    this.listeners.forEach((fn) => {
      try { fn({ ...this.stats }); } catch {}
    });
  }

  add(fn, label = 'task') {
    return new Promise((resolve, reject) => {
      const task = { fn, label, resolve, reject, attempt: 0, id: ++this.id };
      this.queue.push(task);
      this.emit();
      this.tick();
    });
  }

  async tick() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      const sinceLast = Date.now() - this.lastStartTime;
      const wait = this.minSpacingMs - sinceLast;
      if (wait > 0) {
        await new Promise((r) => setTimeout(r, wait));
      }
      this.lastStartTime = Date.now();
      this.running++;
      this.emit();
      this.execute(task);
    }
  }

  async execute(task) {
    try {
      const result = await task.fn();
      this.running--;
      this.stats.done++;
      this.emit();
      task.resolve(result);
      this.tick();
    } catch (err) {
      const kind = err?.kind || 'unknown';
      const isRetryable = kind === 'ratelimit' || kind === 'overloaded' || kind === 'server' || kind === 'network';

      // Never retry credit/auth — they need user action
      if (!isRetryable || task.attempt >= this.maxRetries) {
        this.running--;
        this.stats.failed++;
        this.emit();
        task.reject(err);
        this.tick();
        return;
      }

      task.attempt++;
      // Pull retry-after from response, or exponential backoff
      const retryAfterMs = parseRetryAfter(err)
                       || Math.min(60_000, Math.pow(2, task.attempt) * 1500 + Math.random() * 1000);

      this.stats.retrying++;
      this.stats.nextRetryAt = Date.now() + retryAfterMs;
      this.stats.nextRetryLabel = task.label;
      this.emit();

      // Hold the slot while waiting, then re-queue at front
      await new Promise((r) => setTimeout(r, retryAfterMs));

      this.stats.retrying = Math.max(0, this.stats.retrying - 1);
      if (this.stats.retrying === 0) {
        this.stats.nextRetryAt = null;
        this.stats.nextRetryLabel = null;
      }
      this.queue.unshift(task);
      this.running--;
      this.emit();
      this.tick();
    }
  }

  // Force-cancel pending tasks (e.g. on credit/auth fatal error)
  drain() {
    const dropped = this.queue.splice(0);
    for (const t of dropped) {
      try { t.reject(new Error('Run aborted')); } catch {}
    }
    this.emit();
  }
}

function parseRetryAfter(err) {
  // 1. Check structured retryAfter on ApiError (parsed from response header)
  if (err?.raw?.retryAfter && typeof err.raw.retryAfter === 'number') {
    return err.raw.retryAfter;
  }
  // 2. Parse body text — anthropic sometimes embeds it
  const body = String(err?.raw?.body || err?.message || '');
  const m = body.match(/retry[-_]?after[:\s"]*(\d+)/i);
  if (m) return parseInt(m[1], 10) * 1000;
  return null;
}

// Tier presets — most users should use Tier 1 unless they've spent $40+
export const TIERS = {
  tier1: {
    label: 'Tier 1 (Free / New)',
    concurrency: 1,
    minSpacingMs: 2500,
    description: 'Safest. 1 call at a time, 2.5s spacing. ~60-90s per run.',
  },
  tier2: {
    label: 'Tier 2 ($40+ spent)',
    concurrency: 2,
    minSpacingMs: 1000,
    description: '2 concurrent, 1s spacing. ~30-45s per run.',
  },
  tier3: {
    label: 'Tier 3+ ($200+ spent)',
    concurrency: 4,
    minSpacingMs: 200,
    description: '4 concurrent. ~10-15s per run.',
  },
  tier4: {
    label: 'Tier 4+ ($400+ spent)',
    concurrency: 8,
    minSpacingMs: 0,
    description: 'Full parallel. Fastest.',
  },
};
