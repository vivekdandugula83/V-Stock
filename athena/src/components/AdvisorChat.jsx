import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2, Square, Globe } from 'lucide-react';
import { streamChat, buildAdvisorSystemPrompt } from '../lib/advisor.js';
import { stripCitations } from '../lib/agent.js';

const STORAGE_KEY = 'vstock_advisor_history_v1';
const MAX_HISTORY = 30;

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(-MAX_HISTORY))); } catch {}
}

const QUICK_PROMPTS = [
  { label: 'Explain the top pick', q: 'Walk me through the top-ranked pick — why is it scored so high, and what could change my mind on it?' },
  { label: 'Compare top 3', q: 'Compare the top 3 picks side by side. Which has the best risk/reward and why?' },
  { label: 'Cheapest by P/E', q: 'Which loaded picks have the cheapest P/E vs their growth rates? Use PEG ratio in your answer.' },
  { label: 'Insider buying alerts', q: 'Which picks have notable net insider buying? Anything I should pay particular attention to?' },
  { label: 'What is Piotroski?', q: 'Explain the Piotroski F-Score in 4-5 sentences and tell me which of my loaded picks have strong scores.' },
  { label: 'Portfolio allocation', q: 'If I were building a 10-stock value portfolio from my loaded picks, what allocation would balance risk and quality? Walk through your reasoning.' },
];

export default function AdvisorChat({ apiKey, picks, regime, watchlist, onTickerClick }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadHistory());
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [enableSearch, setEnableSearch] = useState(false);
  const [error, setError] = useState(null);
  const cancelRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = (text) => {
    if (!apiKey) { setError(new Error('Add your Anthropic API key first.')); return; }
    const userText = (text ?? input).trim();
    if (!userText || streaming) return;
    setError(null);
    setInput('');

    const next = [...messages, { role: 'user', content: userText }, { role: 'assistant', content: '' }];
    setMessages(next);
    setStreaming(true);

    const systemPrompt = buildAdvisorSystemPrompt({ picks, regime, watchlist });
    const apiMessages = next
      .filter((m) => m.content || m.role === 'user')
      .map((m, i) => ({
        role: m.role,
        content: m.role === 'assistant' && i === next.length - 1 ? '' : m.content,
      }))
      .filter((m, i, arr) => !(m.role === 'assistant' && m.content === '' && i === arr.length - 1));

    cancelRef.current = streamChat({
      apiKey,
      systemPrompt,
      messages: apiMessages,
      enableWebSearch: enableSearch,
      onToken: (token) => {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant') {
            copy[copy.length - 1] = { ...last, content: last.content + token };
          }
          return copy;
        });
      },
      onDone: () => {
        setStreaming(false);
        cancelRef.current = null;
      },
      onError: (err) => {
        setError(err);
        setStreaming(false);
        cancelRef.current = null;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant' && !last.content) {
            copy.pop();
          }
          return copy;
        });
      },
    });
  };

  const cancel = () => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
      setStreaming(false);
    }
  };

  const clear = () => {
    if (streaming) cancel();
    setMessages([]);
    setError(null);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 shadow-2xl hover:scale-105 transition-all flex items-center justify-center group"
          title="Open V-Advisor"
        >
          <Sparkles className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
          <span className="absolute right-full mr-3 whitespace-nowrap text-xs bg-stone-900 text-stone-200 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
            Ask V-Advisor
          </span>
        </button>
      )}

      {/* Side panel */}
      {open && (
        <div className="fixed inset-0 z-40 sm:inset-auto sm:right-0 sm:top-0 sm:bottom-0 sm:w-[440px] bg-[#0a0a14] border-l border-stone-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-stone-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-400/20 flex items-center justify-center">
                <Sparkles size={14} className="text-amber-300" />
              </div>
              <div>
                <div className="display text-sm text-white">V-Advisor</div>
                <div className="text-[10px] text-stone-500">
                  {picks?.length || 0} picks loaded · streaming on Haiku 4.5
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clear}
                  className="text-[10px] uppercase tracking-wider text-stone-500 hover:text-amber-300 px-2 py-1 rounded"
                  title="Clear chat"
                >
                  clear
                </button>
              )}
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="text-sm text-stone-300 leading-relaxed">
                  Ask me anything about your picks, financial concepts, or how to think about an investment decision. I have your loaded picks and market regime as context.
                </div>
                <div className="text-[10px] uppercase tracking-wider text-stone-500 pt-2">Quick prompts</div>
                <div className="space-y-1.5">
                  {QUICK_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => send(p.q)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg bg-stone-900/60 border border-stone-800 hover:border-amber-400/30 hover:bg-stone-900 transition text-stone-300"
                    >
                      {p.label} →
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <Message key={i} message={m} onTickerClick={onTickerClick} isLast={i === messages.length - 1 && streaming} />
            ))}

            {error && (
              <div className="text-xs px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-400/30 text-rose-200">
                {error.message || String(error)}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-stone-800 flex-shrink-0 bg-stone-950">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setEnableSearch(!enableSearch)}
                className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition ${
                  enableSearch
                    ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300'
                    : 'border-stone-800 text-stone-500 hover:border-stone-700'
                }`}
                title="When enabled, V-Advisor can search the web for fresh prices, news, filings"
              >
                <Globe size={10} />
                {enableSearch ? 'Web search ON' : 'Web search OFF'}
              </button>
              <span className="text-[10px] text-stone-600 ml-auto">
                {streaming ? 'Streaming...' : 'Press Enter to send'}
              </span>
            </div>
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask about your picks, valuation, insider activity..."
                rows={2}
                disabled={!apiKey}
                className="flex-1 resize-none bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-400/50 disabled:opacity-50"
              />
              {streaming ? (
                <button
                  onClick={cancel}
                  className="px-3 rounded-lg bg-rose-500/15 border border-rose-400/30 text-rose-300 hover:bg-rose-500/25 transition"
                  title="Stop"
                >
                  <Square size={14} />
                </button>
              ) : (
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || !apiKey}
                  className="px-3 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-200 hover:bg-amber-400/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Send"
                >
                  <Send size={14} />
                </button>
              )}
            </div>
            {!apiKey && (
              <div className="text-[10px] text-amber-400/80 mt-2">Add your API key in the main panel to use the advisor.</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Message({ message, onTickerClick, isLast }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
        isUser
          ? 'bg-amber-400/15 border border-amber-400/30 text-amber-100'
          : 'bg-stone-900 border border-stone-800 text-stone-100'
      }`}>
        {isLast && !message.content && (
          <Loader2 size={14} className="animate-spin text-amber-300" />
        )}
        <FormattedContent text={message.content} onTickerClick={onTickerClick} />
      </div>
    </div>
  );
}

// Minimal formatting: detect TICKER patterns ($XYZ or all-caps 2-5 letters), make them clickable,
// preserve paragraph breaks, light markdown for bold/italics.
function FormattedContent({ text, onTickerClick }) {
  if (!text) return null;
  // Strip Claude grounding citation tags ( etc.) before display.
  // Done at render time so partial tags during streaming are also hidden cleanly.
  const cleaned = stripCitations(text);
  if (!cleaned) return null;
  const paragraphs = cleaned.split(/\n\n+/);
  return (
    <div className="space-y-2 whitespace-pre-wrap break-words">
      {paragraphs.map((p, i) => (
        <p key={i}>{renderInline(p, onTickerClick)}</p>
      ))}
    </div>
  );
}

function renderInline(text, onTickerClick) {
  // Match $TICKER, **bold**, *italic*, and plain TICKER (3-5 caps surrounded by word boundary)
  const parts = [];
  const re = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\$[A-Z]{1,5}\b)|(\b[A-Z]{2,5}\b(?=[\s.,!?)]|$))/g;
  let lastIdx = 0;
  let m;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      parts.push(<strong key={key++} className="text-white font-medium">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('*')) {
      parts.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith('`')) {
      parts.push(<code key={key++} className="px-1 py-0.5 rounded bg-black/40 text-[12px] mono text-amber-200">{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith('$') || /^[A-Z]{2,5}$/.test(tok)) {
      const ticker = tok.startsWith('$') ? tok.slice(1) : tok;
      // Don't make every all-caps word clickable — restrict to common ticker length + simple heuristic
      if (ticker.length >= 2 && ticker.length <= 5 && onTickerClick) {
        parts.push(
          <button
            key={key++}
            onClick={() => onTickerClick(ticker)}
            className="mono text-amber-300 hover:text-amber-200 underline decoration-dotted underline-offset-2"
          >
            {tok}
          </button>
        );
      } else {
        parts.push(tok);
      }
    }
    lastIdx = m.index + tok.length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}
