'use client';

import * as React from 'react';

interface ChartErrorBoundaryProps {
  children: React.ReactNode;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

export class ChartErrorBoundary extends React.Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ChartErrorBoundary] Chart rendering error:', error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-destructive/80 border-destructive/30 bg-destructive/5 rounded-md border p-4 text-sm">
          <p className="font-medium">Unable to render chart</p>
          <p className="text-muted-foreground mt-1 text-xs">
            The chart configuration produced invalid data. Try adjusting your
            query or asking the assistant to regenerate the chart.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
