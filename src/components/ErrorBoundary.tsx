import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <p className="text-6xl font-bold text-muted-foreground">500</p>
          <h1 className="text-xl font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={this.handleReset}
            className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
