// Local usage ledger — tracks cumulative API spend in localStorage.
// Anthropic doesn't expose account balance via API, so we track our own estimate
// from the real `usage` data each API response returns.

import { realCost } from './agent';

const LEDGER_KEY = 'vstock_usage_ledger_v1';
const BUDGET_KEY = 'vstock_budget_v1';
const MAX_ENTRIES = 200;

export function recordUsage(usage, mode, label) {
  if (!usage) return;
  const cost = realCost(usage, mode);
  const entry = {
    ts: Date.now(),
    mode,
    label,
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
    searches: usage.server_tool_use?.web_search_requests || 0,
    cost,
  };
  try {
    const ledger = loadLedger();
    ledger.push(entry);
    // Keep only most recent N entries
    const trimmed = ledger.slice(-MAX_ENTRIES);
    localStorage.setItem(LEDGER_KEY, JSON.stringify(trimmed));
  } catch {}
  return entry;
}

export function loadLedger() {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearLedger() {
  try { localStorage.removeItem(LEDGER_KEY); } catch {}
}

export function summarizeUsage() {
  const ledger = loadLedger();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const session = 30 * 60 * 1000;  // last 30 min

  const sumIn = (entries) => entries.reduce((s, e) => ({
    cost: s.cost + (e.cost || 0),
    in: s.in + (e.inputTokens || 0),
    out: s.out + (e.outputTokens || 0),
    searches: s.searches + (e.searches || 0),
    runs: s.runs + 1,
  }), { cost: 0, in: 0, out: 0, searches: 0, runs: 0 });

  return {
    total: sumIn(ledger),
    today: sumIn(ledger.filter((e) => now - e.ts < day)),
    session: sumIn(ledger.filter((e) => now - e.ts < session)),
    last: ledger[ledger.length - 1] || null,
    entries: ledger.length,
  };
}

export function loadBudget() {
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    if (!raw) return { dailyLimit: 5, sessionLimit: 1.5 };
    return JSON.parse(raw);
  } catch {
    return { dailyLimit: 5, sessionLimit: 1.5 };
  }
}
export function saveBudget(b) {
  try { localStorage.setItem(BUDGET_KEY, JSON.stringify(b)); } catch {}
}
