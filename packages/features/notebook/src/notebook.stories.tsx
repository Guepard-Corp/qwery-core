import type { Meta, StoryObj } from '@storybook/react';
import type { ColumnHeader, DatasourceRow } from '@qwery/domain/entities';
import { NotebookUI } from './components/notebook-ui';

const meta: Meta<typeof NotebookUI> = {
  title: 'Qwery/Notebook',
  component: NotebookUI,
};

export default meta;
type Story = StoryObj<typeof NotebookUI>;

// SaaS product metrics — what a CEO would query for an investor report
const columns: ColumnHeader[] = [
  {
    name: 'month',
    displayName: 'Month',
    originalType: 'DATE',
    type: 'date',
  },
  {
    name: 'mrr',
    displayName: 'MRR (USD)',
    originalType: 'DECIMAL',
    type: 'decimal',
  },
  {
    name: 'new_users',
    displayName: 'New Users',
    originalType: 'INTEGER',
    type: 'integer',
  },
  {
    name: 'active_users',
    displayName: 'Active Users (MAU)',
    originalType: 'INTEGER',
    type: 'integer',
  },
  {
    name: 'engagement_score',
    displayName: 'Engagement Score',
    originalType: 'DECIMAL',
    type: 'decimal',
  },
  {
    name: 'churn_rate',
    displayName: 'Churn Rate (%)',
    originalType: 'DECIMAL',
    type: 'decimal',
  },
];

const rows: DatasourceRow[] = [
  {
    month: '2025-01-01',
    mrr: 58200,
    new_users: 156,
    active_users: 1240,
    engagement_score: 54.2,
    churn_rate: 5.1,
  },
  {
    month: '2025-02-01',
    mrr: 64100,
    new_users: 182,
    active_users: 1380,
    engagement_score: 56.8,
    churn_rate: 4.8,
  },
  {
    month: '2025-03-01',
    mrr: 71800,
    new_users: 214,
    active_users: 1540,
    engagement_score: 58.4,
    churn_rate: 4.6,
  },
  {
    month: '2025-04-01',
    mrr: 82400,
    new_users: 248,
    active_users: 1720,
    engagement_score: 59.8,
    churn_rate: 4.4,
  },
  {
    month: '2025-05-01',
    mrr: 94800,
    new_users: 286,
    active_users: 1980,
    engagement_score: 60.2,
    churn_rate: 4.3,
  },
  {
    month: '2025-06-01',
    mrr: 108900,
    new_users: 312,
    active_users: 2280,
    engagement_score: 61.4,
    churn_rate: 4.2,
  },
  {
    month: '2025-07-01',
    mrr: 124500,
    new_users: 342,
    active_users: 2840,
    engagement_score: 62.4,
    churn_rate: 4.2,
  },
  {
    month: '2025-08-01',
    mrr: 142800,
    new_users: 418,
    active_users: 3120,
    engagement_score: 65.1,
    churn_rate: 3.8,
  },
  {
    month: '2025-09-01',
    mrr: 168200,
    new_users: 521,
    active_users: 3510,
    engagement_score: 68.3,
    churn_rate: 3.5,
  },
  {
    month: '2025-10-01',
    mrr: 198400,
    new_users: 612,
    active_users: 3940,
    engagement_score: 71.2,
    churn_rate: 3.2,
  },
  {
    month: '2025-11-01',
    mrr: 235600,
    new_users: 734,
    active_users: 4410,
    engagement_score: 73.8,
    churn_rate: 2.9,
  },
  {
    month: '2025-12-01',
    mrr: 278900,
    new_users: 892,
    active_users: 4980,
    engagement_score: 76.4,
    churn_rate: 2.6,
  },
];

const sampleResult = {
  columns,
  rows,
  stat: {
    rowsAffected: 0,
    rowsRead: 12,
    rowsWritten: 0,
    queryDurationMs: 127,
  },
};

const initialCells = [
  {
    cellId: 1,
    cellType: 'query' as const,
    query: `-- Investor report: Full year 2025 product metrics
SELECT
  date_trunc('month', created_at) AS month,
  SUM(mrr) AS mrr,
  COUNT(DISTINCT new_signups) AS new_users,
  COUNT(DISTINCT active_user_id) AS active_users,
  AVG(engagement_score) AS engagement_score,
  AVG(churn_rate) * 100 AS churn_rate
FROM product_metrics
WHERE created_at >= '2025-01-01' AND created_at < '2026-01-01'
GROUP BY date_trunc('month', created_at)
ORDER BY month`,
    datasources: ['prod-db'],
    isActive: true,
    runMode: 'default' as const,
  },
  {
    cellId: 2,
    cellType: 'prompt' as const,
    query: '',
    datasources: ['prod-db'],
    isActive: false,
    runMode: 'default' as const,
  },
];

const datasources = [
  { id: 'prod-db', name: 'Production Database', provider: 'postgresql' },
];

const cellResults = new Map<number, typeof sampleResult>([[1, sampleResult]]);

const reportContent = `---
title: "2025 Investor Report"
author: "Acme SaaS"
date: "2026-02-15"
tags: ["investors", "annual", "metrics", "growth"]
summary: "Full year product and revenue metrics for Series A investors"
---

# 2025 Investor Report

## Executive Summary

Acme SaaS delivered strong performance in 2025. **MRR grew 379%** from $58K to $279K, while active users increased 302% to nearly 5,000. Engagement improved from 54.2 to 76.4, and churn dropped from 5.1% to 2.6%, demonstrating product-market fit and retention gains.

## Monthly Recurring Revenue

\`\`\`vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      {"month": "2025-01", "mrr": 58200},
      {"month": "2025-02", "mrr": 64100},
      {"month": "2025-03", "mrr": 71800},
      {"month": "2025-04", "mrr": 82400},
      {"month": "2025-05", "mrr": 94800},
      {"month": "2025-06", "mrr": 108900},
      {"month": "2025-07", "mrr": 124500},
      {"month": "2025-08", "mrr": 142800},
      {"month": "2025-09", "mrr": 168200},
      {"month": "2025-10", "mrr": 198400},
      {"month": "2025-11", "mrr": 235600},
      {"month": "2025-12", "mrr": 278900}
    ]
  },
  "mark": {"type": "line", "point": true},
  "encoding": {
    "x": {"field": "month", "type": "temporal", "title": "Month"},
    "y": {"field": "mrr", "type": "quantitative", "title": "MRR (USD)", "axis": {"format": "$,.0f"}}
  },
  "width": 600,
  "height": 300
}
\`\`\`

## User Growth

\`\`\`vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      {"month": "2025-01", "metric": "New Users", "count": 156},
      {"month": "2025-02", "metric": "New Users", "count": 182},
      {"month": "2025-03", "metric": "New Users", "count": 214},
      {"month": "2025-04", "metric": "New Users", "count": 248},
      {"month": "2025-05", "metric": "New Users", "count": 286},
      {"month": "2025-06", "metric": "New Users", "count": 312},
      {"month": "2025-07", "metric": "New Users", "count": 342},
      {"month": "2025-08", "metric": "New Users", "count": 418},
      {"month": "2025-09", "metric": "New Users", "count": 521},
      {"month": "2025-10", "metric": "New Users", "count": 612},
      {"month": "2025-11", "metric": "New Users", "count": 734},
      {"month": "2025-12", "metric": "New Users", "count": 892},
      {"month": "2025-01", "metric": "Active Users (MAU)", "count": 1240},
      {"month": "2025-02", "metric": "Active Users (MAU)", "count": 1380},
      {"month": "2025-03", "metric": "Active Users (MAU)", "count": 1540},
      {"month": "2025-04", "metric": "Active Users (MAU)", "count": 1720},
      {"month": "2025-05", "metric": "Active Users (MAU)", "count": 1980},
      {"month": "2025-06", "metric": "Active Users (MAU)", "count": 2280},
      {"month": "2025-07", "metric": "Active Users (MAU)", "count": 2840},
      {"month": "2025-08", "metric": "Active Users (MAU)", "count": 3120},
      {"month": "2025-09", "metric": "Active Users (MAU)", "count": 3510},
      {"month": "2025-10", "metric": "Active Users (MAU)", "count": 3940},
      {"month": "2025-11", "metric": "Active Users (MAU)", "count": 4410},
      {"month": "2025-12", "metric": "Active Users (MAU)", "count": 4980}
    ]
  },
  "mark": {"type": "line", "point": true},
  "encoding": {
    "x": {"field": "month", "type": "temporal", "title": "Month"},
    "y": {"field": "count", "type": "quantitative", "title": "Users"},
    "color": {"field": "metric", "type": "nominal", "title": ""}
  },
  "width": 600,
  "height": 300
}
\`\`\`

## Engagement & Retention

\`\`\`vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      {"month": "2025-01", "engagement_score": 54.2},
      {"month": "2025-02", "engagement_score": 56.8},
      {"month": "2025-03", "engagement_score": 58.4},
      {"month": "2025-04", "engagement_score": 59.8},
      {"month": "2025-05", "engagement_score": 60.2},
      {"month": "2025-06", "engagement_score": 61.4},
      {"month": "2025-07", "engagement_score": 62.4},
      {"month": "2025-08", "engagement_score": 65.1},
      {"month": "2025-09", "engagement_score": 68.3},
      {"month": "2025-10", "engagement_score": 71.2},
      {"month": "2025-11", "engagement_score": 73.8},
      {"month": "2025-12", "engagement_score": 76.4}
    ]
  },
  "mark": {"type": "area", "line": true, "opacity": 0.85},
  "encoding": {
    "x": {"field": "month", "type": "temporal", "title": "Month"},
    "y": {"field": "engagement_score", "type": "quantitative", "title": "Engagement Score", "scale": {"domain": [50, 85]}},
    "y2": {"datum": 50},
    "color": {"value": "#6366f1", "legend": null}
  },
  "width": 600,
  "height": 300
}
\`\`\`

Engagement improved from 54.2 to **76.4** over the year. Churn decreased from 5.1% to **2.6%**, below our 3% target.

## Key Takeaways

1. **Revenue acceleration** — MRR growth rate increased each month
2. **Efficient acquisition** — New user signups up 161% with improving activation
3. **Strong retention** — Churn below target; expansion revenue contributing
4. **Product engagement** — Score trending toward 80 target

---

*Report generated for Acme SaaS Board — February 2026*
`;

export const Default: Story = {
  render: () => (
    <div className="h-[800px] w-full max-w-4xl">
      <NotebookUI
        title="Investor Report — 2025"
        initialCells={initialCells}
        datasources={datasources}
        cellResults={cellResults}
        reportContent={reportContent}
        onRunQuery={(cellId, query, datasourceId) => {
          console.log('Run query', { cellId, query, datasourceId });
        }}
        onCellsChange={(cells) => {
          console.log('Cells changed', cells);
        }}
      />
    </div>
  ),
};
