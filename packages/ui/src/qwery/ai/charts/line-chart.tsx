'use client';

import { useContext, useMemo } from 'react';
import * as React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Label,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../../../shadcn/chart';
import { getColorsForBarLine, resolveChartKeys } from './chart-utils';
import { validateChartData } from './chart-data-validator';
import { ChartContext } from './chart-wrapper';

export interface LineChartConfig {
  chartType: 'line';
  data: Array<Record<string, unknown>>;
  config: {
    colors: string[];
    labels?: Record<string, string>;
    xKey?: string;
    yKey?: string;
  };
}

export interface LineChartProps {
  chartConfig: LineChartConfig;
}

export function LineChart({ chartConfig }: LineChartProps) {
  const { data, config } = chartConfig;
  const { xKey = 'name', yKey = 'value', colors, labels } = config;
  const { showAxisLabels } = useContext(ChartContext);

  const { valid } = validateChartData(data);

  const resolvedKeys = useMemo(
    () =>
      resolveChartKeys(data, { xKey, yKey }, 'line') as {
        xKey: string;
        yKey: string;
      },
    [data, xKey, yKey],
  );

  const actualXKey = resolvedKeys.xKey;
  const actualYKey = resolvedKeys.yKey;
  const chartColors = useMemo(() => getColorsForBarLine(colors), [colors]);

  const chartConfigForContainer = useMemo(() => {
    const configObj: Record<string, { label?: string; color?: string }> = {};
    if (actualYKey) {
      configObj[actualYKey] = {
        label: labels?.[actualYKey] || actualYKey,
        color: chartColors[0],
      };
    }
    return configObj;
  }, [actualYKey, chartColors, labels]);

  if (!valid) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm">
        No data available for chart
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm">
        No data available for chart
      </div>
    );
  }

  // Get axis labels
  const xAxisLabel = labels?.[actualXKey] || labels?.name || actualXKey;
  const yAxisLabel = labels?.[actualYKey] || labels?.value || 'Value';

  return (
    <ChartContainer config={chartConfigForContainer}>
      <RechartsLineChart data={data} key={`line-${showAxisLabels}`}>
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
        <Line
          type="monotone"
          dataKey={actualYKey}
          stroke={chartColors[0] || colors[0]}
          strokeWidth={2}
          dot={false}
        />
      </RechartsLineChart>
    </ChartContainer>
  );
}
