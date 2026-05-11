import { Component } from 'react';
import { AlertOctagon, RefreshCw, Bug } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log so devs can see in console
    // eslint-disable-next-line no-console
    console.error('V-Stock ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ error: null, errorInfo: null });
  };

  handleHardReset = () => {
    try {
      // Don't clear the API key — just transient state and caches
      localStorage.removeItem('vstock_regime_cache');
      localStorage.removeItem('vstock_prefs_v3');
      localStorage.removeItem('vstock_prefs_v4');
    } catch {}
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const msg = this.state.error?.message || String(this.state.error);
    const stack = this.state.error?.stack || '';

    return (
      <div className="min-h-screen w-full" style={{
        background: 'radial-gradient(ellipse at top, #1a1410 0%, #0a0908 50%, #050403 100%)',
        fontFamily: '"Manrope", system-ui, sans-serif',
        color: '#f5f1ea',
      }}>
        <div className="max-w-2xl mx-auto px-5 py-16">
          <div className="flex items-center gap-3 mb-8">
            <AlertOctagon className="w-6 h-6 text-rose-400" />
            <h1 className="display text-3xl text-stone-100">Something broke</h1>
          </div>

          <div className="p-5 rounded-xl border border-rose-900/40 bg-rose-950/20 mb-6">
            <div className="mono text-sm text-rose-200 mb-2 font-semibold">Error</div>
            <div className="mono text-xs text-rose-100/80 leading-relaxed break-words">{msg}</div>
          </div>

          <p className="text-sm text-stone-400 leading-relaxed mb-6">
            The app caught an unexpected error and prevented a black screen. Your API key and settings
            are safe in localStorage. Try one of these:
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-sm transition"
            >
              <RefreshCw className="w-4 h-4" /> Try to recover
            </button>
            <button
              onClick={this.handleHardReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-stone-700 text-stone-200 hover:bg-stone-800 text-sm transition"
            >
              <Bug className="w-4 h-4" /> Reset state & reload
            </button>
          </div>

          {stack && (
            <details className="mt-8">
              <summary className="cursor-pointer text-xs mono text-stone-500 hover:text-stone-300">
                Show stack trace (for debugging)
              </summary>
              <pre className="mt-3 p-4 rounded-lg bg-stone-950/80 border border-stone-800 overflow-x-auto mono text-[10px] text-stone-400 leading-relaxed whitespace-pre-wrap break-words">
                {stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
