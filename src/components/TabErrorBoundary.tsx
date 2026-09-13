import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface TabErrorBoundaryProps {
  tabName?: string;
  children: ReactNode;
}

interface TabErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class TabErrorBoundary extends Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  override state: TabErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Tab rendering error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto my-8 rounded-2xl border border-rose-200 bg-[#fdfbf7] p-6 shadow-sm text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#1c1917]">
              Unable to render {this.props.tabName || "this view"}
            </h3>
            <p className="text-xs text-[#70685c]">
              An unexpected calculation or rendering exception occurred.
            </p>
          </div>
          {this.state.error?.message && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-left font-mono text-xs text-rose-800 break-words">
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 rounded-lg bg-[#24211e] px-4 py-2 text-xs font-semibold text-[#f7f4ef] hover:bg-[#38332e] cursor-pointer shadow-xs transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
