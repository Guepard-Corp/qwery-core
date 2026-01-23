import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

interface Props {
  onError?: (error: Error, info: ErrorInfo) => void;
  fallback: ReactNode;
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props> {
  readonly state = { hasError: false, error: null };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
