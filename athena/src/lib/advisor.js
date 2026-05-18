// Streaming chat with Claude — used by the V-Advisor floating panel.
// Provides token-by-token streaming so the user gets a "real-time" feel.

const MODEL = 'claude-haiku-4-5-20251001'; // fast + cheap for chat
const MAX_TOKENS = 1500;

/**
 * Stream a chat response from Claude. Calls `onToken` with each text delta,
 * `onDone` with the full final text + usage, `onError` on failure.
 *
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.systemPrompt
 * @param {Array<{role:'user'|'assistant', content:string}>} opts.messages
 * @param {boolean} opts.enableWebSearch
 * @param {(token:string)=>void} opts.onToken
 * @param {(fullText:string, usage:object)=>void} opts.onDone
 * @param {(err:Error)=>void} opts.onError
 * @returns {() => void} Cancel function
 */
export function streamChat({
  apiKey, systemPrompt, messages,
  enableWebSearch = false,
  onToken, onDone, onError,
}) {
  const ctrl = new AbortController();
  let cancelled = false;

  (async () => {
    try {
      const body = {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        system: systemPrompt,
        messages,
      };
      if (enableWebSearch) {
        body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }];
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const bodyText = await res.text();
        let parsed = null;
        try { parsed = JSON.parse(bodyText); } catch {}
        const msg = parsed?.error?.message || bodyText.slice(0, 300);
        throw new Error(`API ${res.status}: ${msg}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let usage = {};

      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              const txt = evt.delta.text || '';
              fullText += txt;
              onToken && onToken(txt);
            } else if (evt.type === 'message_delta' && evt.usage) {
              usage = { ...usage, ...evt.usage };
            } else if (evt.type === 'message_start' && evt.message?.usage) {
              usage = { ...usage, ...evt.message.usage };
            }
          } catch { /* ignore malformed SSE lines */ }
        }
      }

      if (!cancelled) onDone && onDone(fullText, usage);
    } catch (err) {
      if (err.name === 'AbortError') return;
      onError && onError(err);
    }
  })();

  return () => { cancelled = true; ctrl.abort(); };
}

/**
 * Build a context-aware system prompt for the advisor.
 * Includes a compact summary of the user's currently loaded picks + regime,
 * so the model can reference them naturally.
 */
export function buildAdvisorSystemPrompt({ picks = [], regime = null, watchlist = [] }) {
  const today = new Date().toDateString();
  const picksSummary = (Array.isArray(picks) ? picks : [])
    .slice(0, 30)
    .map((p) => {
      const v = p.valuation || {};
      const g = p.growth || {};
      const ins = p.insiderActivity || {};
      return `${p.ticker} (${p.industryShort || p.subIndustry || '?'}): score ${p.compositeScore}, ${p.verdict}, P/E ${v.pe ?? '?'}, FwdP/E ${v.forwardPe ?? '?'}, Rev YoY ${g.revenueGrowthYoY ?? '?'}, EPS YoY ${g.epsGrowthYoY ?? '?'}, Insider ${ins.last6moDirection ?? '?'}`;
    })
    .join('\n');

  const regimeSummary = regime
    ? `Market valuation: ${regime.marketValuation || '?'}. S&P P/E: ${regime.spxPe || '?'}. Shiller CAPE: ${regime.shillerCape || '?'}. 10yr: ${regime.tenYear || '?'}.`
    : 'Market regime data not yet loaded.';

  const watchSummary = (watchlist || []).length > 0
    ? `User's watchlist: ${watchlist.join(', ')}.`
    : '';

  return `You are V-Advisor, a value-investing analyst embedded in the V-Stock dashboard. Today is ${today}.

Be concise, specific, and quantitative. Use real numbers from the picks summary below when relevant. Help the user reason through investment decisions — explain trade-offs, compare stocks, clarify concepts (P/E, PEG, Piotroski F-Score, Altman Z, dark pool sentiment, etc), and think about portfolio construction.

OUTPUT FORMAT:
- Plain prose with light markdown (**bold**, *italic*, \`code\`). No HTML.
- DO NOT include <cite>, , or any citation/grounding markup in your text. If you reference a source, write it inline as plain text: "per SEC EDGAR" or "per Reuters" — never as XML tags.
- Default to 2-4 short paragraphs. Bullet lists for comparisons or step-by-step reasoning.
- Reference specific tickers and numbers from the user's loaded data.

STANCE:
- When asked "should I buy X" — DO NOT give explicit buy/sell calls. Instead frame as "the case for", "the case against", and "key questions to answer".
- When you don't know something current (today's price, breaking news), say so or offer to web-search.
- Be honest about uncertainty.

USER'S CURRENT CONTEXT:
${regimeSummary}
${watchSummary}

Loaded picks (top by composite score):
${picksSummary || '(no picks loaded yet — user just opened the app)'}
`;
}
