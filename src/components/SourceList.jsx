import { ExternalLink, ShieldCheck, FileText, Globe } from 'lucide-react';

// Map domain → trust tier label + style
const TRUSTED_PRIMARY = ['sec.gov', 'edgar.sec.gov'];
const TRUSTED_NEWS = ['reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com', 'barrons.com', 'cnbc.com'];
const TRUSTED_FUNDAMENTALS = ['stockanalysis.com', 'macrotrends.net', 'finviz.com', 'simplywall.st'];
const TRUSTED_INSIDER = ['openinsider.com'];
const TRUSTED_INSTITUTIONAL = ['whalewisdom.com', 'dataroma.com', 'hedgefollow.com'];
const TRUSTED_DARKPOOL = ['chartexchange.com', 'squeezemetrics.com', 'unusualwhales.com', 'ortex.com'];

function hostOf(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function categorize(url) {
  const h = hostOf(url).toLowerCase();
  if (TRUSTED_PRIMARY.some((d) => h.includes(d))) return { tier: 'primary', label: 'SEC' };
  if (TRUSTED_NEWS.some((d) => h.includes(d))) return { tier: 'news', label: 'News' };
  if (TRUSTED_FUNDAMENTALS.some((d) => h.includes(d))) return { tier: 'fundamentals', label: 'Data' };
  if (TRUSTED_INSIDER.some((d) => h.includes(d))) return { tier: 'insider', label: 'Insider' };
  if (TRUSTED_INSTITUTIONAL.some((d) => h.includes(d))) return { tier: 'institutional', label: '13F' };
  if (TRUSTED_DARKPOOL.some((d) => h.includes(d))) return { tier: 'darkpool', label: 'Flow' };
  return { tier: 'other', label: '' };
}

const TIER_STYLES = {
  primary:       'bg-emerald-500/15 border-emerald-400/40 text-emerald-200',
  news:          'bg-sky-500/10 border-sky-400/30 text-sky-200',
  fundamentals:  'bg-cyan-500/10 border-cyan-400/30 text-cyan-200',
  insider:       'bg-violet-500/15 border-violet-400/30 text-violet-200',
  institutional: 'bg-amber-500/10 border-amber-400/30 text-amber-200',
  darkpool:      'bg-fuchsia-500/10 border-fuchsia-400/30 text-fuchsia-200',
  other:         'bg-stone-500/10 border-stone-400/20 text-stone-300',
};

export default function SourceList({ sources = [], compact = false, label = 'Sources' }) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return (
      <div className="text-[10px] text-stone-500 italic">
        No sources returned. Verify findings independently at sec.gov/edgar.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-stone-500">{label}:</span>
        {sources.map((url, i) => {
          const host = hostOf(url);
          const cat = categorize(url);
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-[10px] px-1.5 py-0.5 rounded border transition hover:scale-105 inline-flex items-center gap-1 ${TIER_STYLES[cat.tier]}`}
              title={url}
            >
              {host}
              <ExternalLink size={8} />
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={12} className="text-emerald-300/70" />
        <span className="text-[10px] uppercase tracking-wider text-stone-400">{label}</span>
        <span className="text-[9px] text-stone-600 mono">({sources.length})</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-1.5">
        {sources.map((url, i) => {
          const host = hostOf(url);
          const cat = categorize(url);
          const Icon = cat.tier === 'primary' ? ShieldCheck : cat.tier === 'news' ? FileText : Globe;
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group text-xs px-2.5 py-1.5 rounded-lg border transition flex items-center gap-2 ${TIER_STYLES[cat.tier]} hover:bg-opacity-30`}
              title={url}
            >
              <Icon size={11} className="opacity-70 flex-shrink-0" />
              <span className="flex-1 truncate font-medium">{host}</span>
              {cat.label && <span className="text-[9px] uppercase opacity-70">{cat.label}</span>}
              <ExternalLink size={9} className="opacity-50 group-hover:opacity-100 flex-shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
