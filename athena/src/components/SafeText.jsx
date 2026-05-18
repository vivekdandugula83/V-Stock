import { stripCitations } from '../lib/agent.js';

/**
 * Render text that came from the model with citation tags stripped at display time.
 * Acts as the final defense — even if data-level stripping misses a variant or stale
 * cached data has unstripped tags, nothing reaches the screen.
 *
 * Use anywhere a model-generated string is rendered as text.
 */
export default function SafeText({ children, text, as = 'span', className = '' }) {
  const raw = text != null ? text : children;
  if (raw == null || raw === '') return null;
  const cleaned = typeof raw === 'string' ? stripCitations(raw) : raw;
  const Tag = as;
  return <Tag className={className}>{cleaned}</Tag>;
}

// Helper for inline usage where you just need the cleaned string
export function safeStr(text) {
  if (text == null) return '';
  return typeof text === 'string' ? stripCitations(text) : String(text);
}
