import React from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CRITICAL REACT UNHANDLED ERROR CAUGHT BY BOUNDARY:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearStorageAndReload = () => {
    try {
      localStorage.removeItem('explore_ai_hardware_profile');
      localStorage.removeItem('explore_ai_settings');
      localStorage.removeItem('explore_ai_conversations');
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
    window.location.hash = 'usbflash';
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.hash = 'usbflash';
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col items-center justify-center p-6 select-none font-sans">
          <div className="max-w-xl w-full bg-slate-900/90 border border-rose-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-rose-950/20 backdrop-blur-md">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Application Recovery Console</h2>
                <p className="text-xs text-rose-300">An unexpected runtime exception was prevented from crashing the page.</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 font-mono text-xs text-rose-300/90 mb-6 overflow-x-auto max-h-48 whitespace-pre-wrap">
              {this.state.error?.toString() || 'Unknown runtime error'}
              {this.state.errorInfo?.componentStack && (
                <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-800 pt-2">
                  {this.state.errorInfo.componentStack.slice(0, 400)}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              If this error was caused by outdated local settings or an interrupted connection, resetting the local cache will restore safe factory presets without affecting your ESP32 hardware.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 min-w-[140px] px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-cyan-900/30 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearStorageAndReload}
                className="flex-1 min-w-[140px] px-4 py-2.5 bg-rose-900/40 hover:bg-rose-900/60 active:bg-rose-900/80 text-rose-200 border border-rose-700/50 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                title="Clears cached hardware profiles and settings then reloads"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset Cache &amp; Reload</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Default View</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
