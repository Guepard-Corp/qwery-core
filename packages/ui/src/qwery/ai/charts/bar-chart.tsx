'use client';

import { useContext, useMemo } from 'react';
import * as React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Label,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../../../shadcn/chart';
import {
  getColorsForBarLine,
  resolveChartKeys,
} from './chart-utils';
import { validateChartData } from './chart-data-validator';
import { ChartContext } from './chart-wrapper';

export interface BarChartConfig {
  chartType: 'bar';
  data: Array<Record<string, unknown>>;
  config: {
    colors: string[];
    labels?: Record<string, string>;
    xKey?: string;
    yKey?: string;
  };
}

export interface BarChartProps {
  chartConfig: BarChartConfig;
}

export function BarChart({ chartConfig }: BarChartProps) {
  const { data, config } = chartConfig;
  const { xKey = 'name', yKey = 'value', colors, labels } = config;
  const { showAxisLabels } = useContext(ChartContext);

  const { valid } = validateChartData(data);
  if (!valid) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm">
        No data available for chart
      </div>
    );
  }

  const resolvedKeys = useMemo(
    () =>
      resolveChartKeys(data, { xKey, yKey }, 'bar') as {
        xKey: string;
        yKey: string;
      },
    [data, xKey, yKey],
  );

  const actualXKey = resolvedKeys.xKey;
  const actualYKey = resolvedKeys.yKey;

  const chartColors = useMemo(() => {
    const colorsArray = getColorsForBarLine(colors);
    if (colorsArray.length === 0) {
      return ['#8884d8']; // Default blue color
    }
    return colorsArray;
  }, [colors]);

  const chartConfigForContainer = useMemo(() => {
    const configObj: Record<string, { label?: string; color?: string }> = {};
    if (actualYKey) {
      configObj[actualYKey] = {
        label:
          labels?.[actualYKey] || labels?.[yKey] || labels?.value || 'Value',
        color: chartColors[0],
      };
    }
    return configObj;
  }, [actualYKey, yKey, chartColors, labels]);

  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm">
        No data available for chart
      </div>
    );
  }

  // Get axis labels
  const xAxisLabel =
    labels?.[actualXKey] || labels?.[xKey] || labels?.name || actualXKey;
  const yAxisLabel =
    labels?.[actualYKey] || labels?.[yKey] || labels?.value || 'Value';

  // Recharts color usage:
  // - Bar component uses `fill` prop for bar color
  // - For single series, we use the first color from the config
  return (
    <ChartContainer config={chartConfigForContainer}>
      <RechartsBarChart data={data} key={`bar-${showAxisLabels}`}>
        <XAxis
          dataKey={actualXKey}
          tickLine={false}
          axisLine={showAxisLabels}
          tickMargin={8}
        >
          {showAxisLabels ? (
            <Label
              key="x-label"
              value={xAxisLabel}
              position="insideBottom"
              offset={-5}
              style={{ textAnchor: 'middle', fill: 'currentColor' }}
            />
          ) : null}
        </XAxis>
        <YAxis tickLine={false} axisLine={showAxisLabels} tickMargin={8}>
          {showAxisLabels ? (
            <Label
              key="y-label"
              value={yAxisLabel}
              angle={-90}
              position="insideLeft"
              style={{ textAnchor: 'middle', fill: 'currentColor' }}
            />
          ) : null}
        </YAxis>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Bar
          dataKey={actualYKey}
          fill={chartColors[0] || colors?.[0] || '#8884d8'}
        />
      </RechartsBarChart>
    </ChartContainer>
  );
}
