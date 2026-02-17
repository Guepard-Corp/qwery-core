import * as React from 'react';
import type { ColumnHeader, DatasourceResultSet } from '@qwery/domain/entities';
import { VegaChart } from './vega-chart';

const VEGA_LITE_SCHEMA = 'https://vega.github.io/schema/vega-lite/v5.json';
const MAX_ROWS = 2000;

type ColumnType = NonNullable<ColumnHeader['type']>;

const TEMPORAL_TYPES: ColumnType[] = ['date', 'datetime', 'timestamp'];
const QUANTITATIVE_TYPES: ColumnType[] = [
  'number',
  'integer',
  'decimal' as ColumnType,
];
const NOMINAL_TYPES: ColumnType[] = ['string'];

function isTemporal(col: ColumnHeader) {
  return col.type != null && (TEMPORAL_TYPES as string[]).includes(col.type);
}

function isQuantitative(col: ColumnHeader) {
  return (
    col.type != null && (QUANTITATIVE_TYPES as string[]).includes(col.type)
  );
}

function isNominal(col: ColumnHeader) {
  return col.type != null && (NOMINAL_TYPES as string[]).includes(col.type);
}

type VegaSpec = Record<string, unknown>;

function buildSpec(columns: ColumnHeader[]): VegaSpec | null {
  const temporalCol = columns.find(isTemporal);
  const nominalCol = columns.find(isNominal);
  const quantCols = columns.filter(isQuantitative);
  const firstQuant = quantCols[0];

  // Temporal X + Quantitative Y → line chart
  if (temporalCol && firstQuant) {
    return {
      $schema: VEGA_LITE_SCHEMA,
      mark: {
        type: 'line',
        point: { filled: true, size: 60 },
        strokeWidth: 2.5,
      },
      encoding: {
        x: {
          field: temporalCol.name,
          type: 'temporal',
          title: temporalCol.displayName,
          axis: { grid: true },
        },
        y: {
          field: firstQuant.name,
          type: 'quantitative',
          title: firstQuant.displayName,
          axis: { grid: true },
        },
      },
    };
  }

  // Nominal X + Quantitative Y → bar chart
  if (nominalCol && firstQuant) {
    return {
      $schema: VEGA_LITE_SCHEMA,
      mark: {
        type: 'bar',
        cornerRadiusEnd: 4,
      },
      encoding: {
        x: {
          field: nominalCol.name,
          type: 'nominal',
          title: nominalCol.displayName,
          sort: '-y',
          axis: { labelAngle: -35, labelLimit: 100 },
        },
        y: {
          field: firstQuant.name,
          type: 'quantitative',
          title: firstQuant.displayName,
        },
        ...(quantCols.length > 1
          ? {
              color: {
                field: nominalCol.name,
                type: 'nominal',
                legend: null,
                scale: {
                  range: [
                    '#14b8a6',
                    '#38bdf8',
                    '#c084fc',
                    '#2dd4bf',
                    '#a78bfa',
                  ],
                },
              },
            }
          : {}),
      },
    };
  }

  // Two quantitative columns → scatter plot
  const secondQuant = quantCols[1];
  if (firstQuant && secondQuant) {
    return {
      $schema: VEGA_LITE_SCHEMA,
      mark: {
        type: 'point',
        filled: true,
        size: 80,
        opacity: 0.85,
      },
      encoding: {
        x: {
          field: firstQuant.name,
          type: 'quantitative',
          title: firstQuant.displayName,
        },
        y: {
          field: secondQuant.name,
          type: 'quantitative',
          title: secondQuant.displayName,
        },
      },
    };
  }

  // Single quantitative column → bar chart by row index
  if (firstQuant) {
    const indexCol = columns.find((c) => !isQuantitative(c));
    return {
      $schema: VEGA_LITE_SCHEMA,
      transform: [{ window: [{ op: 'row_number', as: '__index__' }] }],
      mark: {
        type: 'bar',
        cornerRadiusEnd: 4,
      },
      encoding: {
        x: indexCol
          ? {
              field: indexCol.name,
              type: 'nominal',
              title: indexCol.displayName,
            }
          : { field: '__index__', type: 'ordinal', title: 'Row' },
        y: {
          field: firstQuant.name,
          type: 'quantitative',
          title: firstQuant.displayName,
        },
      },
    };
  }

  return null;
}

type ResultReportViewProps = {
  result: DatasourceResultSet;
  className?: string;
};

export function ResultReportView({ result, className }: ResultReportViewProps) {
  const { columns, rows } = result;

  const spec = React.useMemo(() => buildSpec(columns), [columns]);

  if (!spec) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        No suitable columns found for chart auto-detection.
        <br />
        Needs at least one numeric column.
      </div>
    );
  }

  const values = rows.slice(0, MAX_ROWS);

  const fullSpec: VegaSpec = {
    ...spec,
    data: { values },
    width: 'container',
    height: 340,
  };

  return (
    <div className={className}>
      <VegaChart specJson={JSON.stringify(fullSpec)} />
      {rows.length > MAX_ROWS && (
        <p className="text-muted-foreground mt-1 text-center text-xs">
          Showing first {MAX_ROWS.toLocaleString()} of{' '}
          {rows.length.toLocaleString()} rows
        </p>
      )}
    </div>
  );
}
