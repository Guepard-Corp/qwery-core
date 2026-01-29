'use client';

import * as React from 'react';
import { cn } from '../../../lib/utils';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Sparkles,
  Check,
} from 'lucide-react';

export type ChartType = 'bar' | 'line' | 'pie';

export interface ChartTypeSelection {
  chartType: ChartType;
  reasoningText: string;
}

export interface ChartTypeCard {
  type: ChartType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const CHART_TYPE_CARDS: ChartTypeCard[] = [
  {
    type: 'bar',
    label: 'Bar Chart',
    description: 'Best for comparing categories',
    icon: BarChart3,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    type: 'line',
    label: 'Line Chart',
    description: 'Best for trends over time',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    type: 'pie',
    label: 'Pie Chart',
    description: 'Best for part-to-whole',
    icon: PieChartIcon,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
];

export interface ChartTypeSelectorProps {
  selection: ChartTypeSelection;
  className?: string;
}

/**
 * Displays chart type selection with cards showing all supported types
 * Highlights the selected chart type with a premium UI
 */
export function ChartTypeSelector({
  selection,
  className,
}: ChartTypeSelectorProps) {
  const selectedType = selection.chartType;

  return (
    <div className={cn('space-y-4', className)}>
      {/* AI Reasoning Section */}
      <div className="bg-muted/30 relative overflow-hidden rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <div className="bg-background flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-sm">
            <Sparkles className="text-primary size-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-foreground text-sm font-medium">
              AI Recommendation
            </h4>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {selection.reasoningText}
            </p>
          </div>
        </div>
      </div>
      {/* Chart Type Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CHART_TYPE_CARDS.map((card) => {
          const isSelected = card.type === selectedType;
          const Icon = card.icon;

          return (
            <div
              key={card.type}
              className={cn(
                'group relative flex flex-col rounded-xl border p-4 transition-all duration-200',
                isSelected
                  ? 'border-primary bg-background ring-primary ring-1'
                  : 'border-border bg-card/50 hover:border-sidebar-accent hover:bg-sidebar-accent/50',
              )}
            >
              {/* Card Header & Icon */}
              <div className="mb-3 flex items-start justify-between">
                <div
                  className={cn(
                    'flex size-10 items-center justify-center rounded-lg transition-colors duration-200',
                    isSelected ? card.bgColor : 'bg-muted',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      isSelected ? card.color : 'text-muted-foreground',
                    )}
                  />
                </div>
                {isSelected && (
                  <div className="bg-primary animate-in fade-in zoom-in flex size-5 items-center justify-center rounded-full shadow-sm duration-300">
                    <Check className="text-primary-foreground size-3 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className="space-y-1">
                <h5
                  className={cn(
                    'text-sm font-medium tracking-tight transition-colors',
                    isSelected ? 'text-foreground' : 'text-foreground/80',
                  )}
                >
                  {card.label}
                </h5>
                <p className="text-muted-foreground line-clamp-2 text-xs">
                  {card.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
