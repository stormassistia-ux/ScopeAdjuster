import React from 'react';

interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ScopeAdjuster] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-[#0a0f1d] border-2 border-red-900/40 rounded-3xl p-10 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-red-500 tracking-tight">Something went wrong</h2>
            <p className="text-slate-400 font-bold text-sm">The application encountered an unexpected error.</p>
            {this.state.message && (
              <p className="text-xs text-slate-600 font-mono bg-[#0f172a] rounded-xl p-3 text-left break-all">
                {this.state.message}
              </p>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }
}
