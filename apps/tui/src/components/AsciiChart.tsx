import { TextAttributes } from '@opentui/core';
import type { ChartConfig } from '../types/chart.ts';
import { useStyles } from '../theme/index.ts';

const BAR_CHAR = '█';
const BAR_MAX_WIDTH = 24;

function getNumeric(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number.parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function getLabel(record: Record<string, unknown>, key: string): string {
  const v = record[key];
  if (v === null || v === undefined) return '';
  return String(v).slice(0, 16);
}

export function AsciiChart({ config }: { config: ChartConfig }) {
  const { colors } = useStyles();
  const { chartType, title, data, config: cfg } = config;
  const xKey = cfg.xKey ?? 'name';
  const yKey = cfg.yKey ?? 'value';
  const nameKey = cfg.nameKey ?? xKey;
  const valueKey = cfg.valueKey ?? yKey;

  if (!data || data.length === 0) {
    return (
      <box flexDirection="column">
        <text fg={colors.dimGray}>No data for chart</text>
      </box>
    );
  }

  if (chartType === 'bar') {
    const values = data.map((d) => getNumeric(d[valueKey] ?? d[yKey]));
    const maxVal = Math.max(...values, 1);
    const rows = data.map((d, i) => {
      const label = getLabel(d, nameKey) || getLabel(d, xKey);
      const val = values[i] ?? 0;
      const width = Math.round((val / maxVal) * BAR_MAX_WIDTH);
      const bar = BAR_CHAR.repeat(width);
      return { label: label.padEnd(14).slice(0, 14), bar, val };
    });
    return (
      <box flexDirection="column">
        {title ? (
          <box marginBottom={1}>
            <text fg={colors.cyan} attributes={TextAttributes.BOLD}>
              {title}
            </text>
          </box>
        ) : null}
        {rows.map((r, i) => (
          <box key={i} flexDirection="row">
            <text fg={colors.white}>{r.label}</text>
            <text> </text>
            <text fg={colors.green}>{r.bar}</text>
            <text fg={colors.dimGray}> {r.val}</text>
          </box>
        ))}
      </box>
    );
  }

  if (chartType === 'line') {
    const values = data.map((d) => getNumeric(d[valueKey] ?? d[yKey]));
    const maxVal = Math.max(...values, 1);
    const height = 8;
    const width = Math.min(data.length, 40);
    const step = data.length <= width ? 1 : data.length / width;
    const points: number[] = [];
    for (let i = 0; i < width; i++) {
      const idx = Math.min(Math.floor(i * step), data.length - 1);
      points.push(Math.round(((values[idx] ?? 0) / maxVal) * (height - 1)));
    }
    const lines: string[] = [];
    for (let y = height - 1; y >= 0; y--) {
      let line = '';
      for (let x = 0; x < width; x++) {
        line += points[x] === y ? '*' : ' ';
      }
      lines.push(line);
    }
    const yAxis = String(maxVal).slice(0, 6);
    return (
      <box flexDirection="column">
        {title ? (
          <box marginBottom={1}>
            <text fg={colors.cyan}>{title}</text>
          </box>
        ) : null}
        {lines.map((line, i) => (
          <box key={i} flexDirection="row">
            <text fg={i === 0 ? colors.dimGray : colors.green}>
              {i === 0 ? yAxis : ' '.repeat(yAxis.length)}
            </text>
            <text> </text>
            <text fg={colors.green}>{line}</text>
          </box>
        ))}
        <box flexDirection="row">
          <text fg={colors.dimGray}>{'0'.padStart(yAxis.length)}</text>
          <text> </text>
          <text fg={colors.dimGray}>{'─'.repeat(width)}</text>
        </box>
      </box>
    );
  }

  if (chartType === 'pie') {
    const values = data.map((d) => getNumeric(d[valueKey] ?? d[yKey]));
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const rows = data.map((d, i) => {
      const label = getLabel(d, nameKey) || getLabel(d, xKey);
      const val = values[i] ?? 0;
      const pct = Math.round((val / total) * 100);
      const barLen = Math.round((pct / 100) * 12);
      const bar = BAR_CHAR.repeat(barLen);
      return { label: label.slice(0, 12), pct, bar };
    });
    return (
      <box flexDirection="column">
        {title ? (
          <box marginBottom={1}>
            <text fg={colors.cyan}>{title}</text>
          </box>
        ) : null}
        {rows.map((r, i) => (
          <box key={i} flexDirection="row">
            <text fg={colors.white}>{r.label.padEnd(12)}</text>
            <text fg={colors.dimGray}> {r.pct}% </text>
            <text fg={colors.green}>{r.bar}</text>
          </box>
        ))}
      </box>
    );
  }

  return (
    <box flexDirection="column">
      <text fg={colors.dimGray}>Unsupported chart type</text>
    </box>
  );
}
