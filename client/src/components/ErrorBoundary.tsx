import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-lg border border-red-500/30 bg-red-950/20 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-300">
            Runtime error
          </p>
          <h1 className="mt-2 text-2xl font-bold">Sodash could not render</h1>
          <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-gray-950 p-4 text-sm text-red-100">
            {this.state.error.message}
          </pre>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
