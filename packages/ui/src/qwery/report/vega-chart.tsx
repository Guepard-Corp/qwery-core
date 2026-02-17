import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import embed from 'vega-embed';
import { ClientOnly } from '../client-only';

type VegaLiteSpec = Record<string, unknown>;

/** Dark dashboard theme — polished, minimal, high contrast */
const CHART_THEME = {
  background: '#1e1e1e',
  view: { stroke: null },
  font: 'system-ui, -apple-system, sans-serif',
  fontSize: 11,
  padding: 16,
  axis: {
    domain: false,
    domainColor: '#525252',
    grid: true,
    gridColor: '#404040',
    gridOpacity: 0.8,
    labelColor: '#e5e5e5',
    labelFontSize: 11,
    labelFontWeight: 500,
    titleColor: '#fafafa',
    titleFontSize: 12,
    titleFontWeight: 600,
    tickColor: '#525252',
    tickSize: 4,
  },
  axisX: {
    labelAngle: 0,
    labelPadding: 8,
  },
  axisY: {
    labelAlign: 'left',
    labelPadding: 8,
  },
  legend: {
    labelColor: '#e5e5e5',
    labelFontSize: 11,
    titleColor: '#fafafa',
    titleFontSize: 12,
    titleFontWeight: 600,
    symbolSize: 100,
    symbolStrokeWidth: 2,
  },
  legendDiscrete: {
    symbolType: 'circle',
  },
  title: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: 600,
  },
  mark: {
    point: {
      size: 60,
      filled: true,
    },
    line: {
      strokeWidth: 2.5,
    },
    bar: {
      cornerRadiusEnd: 4,
    },
  },
  range: {
    category: [
      '#14b8a6', // teal — primary / total
      '#38bdf8', // light blue — input / minor
      '#c084fc', // light purple — output / minor
      '#2dd4bf', // emerald-teal
      '#0ea5e9', // sky
      '#a78bfa', // violet
      '#f472b6', // pink
      '#34d399', // green-teal
    ],
    ordinal: ['#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'],
  },
};

type VegaChartInnerProps = {
  spec: VegaLiteSpec;
};

function VegaChartInner({ spec }: VegaChartInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let finalize: (() => void) | undefined;

    const specWithTheme = {
      ...spec,
      config: { ...CHART_THEME, ...((spec.config ?? {}) as object) },
    };

    embed(container, specWithTheme as Parameters<typeof embed>[1], {
      actions: false,
      renderer: 'svg',
    })
      .then((result) => {
        finalize = () => result.finalize();
        setError(null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      });

    return () => {
      finalize?.();
    };
  }, [spec]);

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-xl border p-4 text-sm">
        <span className="font-medium">Chart error:</span> {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 min-h-[200px] rounded-lg bg-[#1e1e1e] p-4"
    />
  );
}

type VegaChartProps = {
  specJson: string;
};

export function VegaChart({ specJson }: VegaChartProps) {
  let spec: VegaLiteSpec | null = null;
  let parseError: string | null = null;

  try {
    spec = JSON.parse(specJson) as VegaLiteSpec;
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err);
  }

  if (parseError || spec === null) {
    return (
      <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-xl border p-4 text-sm">
        <span className="font-medium">Invalid chart spec:</span> {parseError}
      </div>
    );
  }

  return (
    <ClientOnly
      fallback={
        <div className="my-6 flex h-48 items-center justify-center rounded-lg bg-[#1e1e1e]">
          <div className="h-8 w-8 animate-pulse rounded-full bg-white/20" />
        </div>
      }
    >
      <VegaChartInner spec={spec} />
    </ClientOnly>
  );
}
