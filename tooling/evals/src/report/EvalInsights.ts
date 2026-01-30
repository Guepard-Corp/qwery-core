//@ts-nocheck
import { LitElement, html, css } from 'https://esm.sh/lit@3.1.2';

export class EvalInsights extends LitElement {
    static properties = {
        manifest: { type: Array },
        data: { type: Array },
        loading: { type: Boolean }
    };

    constructor() {
        super();
        this.manifest = [];
        this.data = [];
        this.loading = true;
    }

    async connectedCallback() {
        super.connectedCallback();
        await this.fetchAllData();
    }

    async fetchAllData() {
        this.loading = true;
        try {
            const results = await Promise.all(
                this.manifest.map(async (filename) => {
                    const response = await fetch(filename);
                    const runs = await response.json();
                    return {
                        filename,
                        timestamp: this.parseTimestamp(filename),
                        runs
                    };
                })
            );
            // Sort by timestamp
            this.data = results.sort((a, b) => a.timestamp - b.timestamp);
            this.updateComplete.then(() => {
                this.renderCharts();
            });
        } catch (err) {
            console.error('Failed to fetch historical data:', err);
        } finally {
            this.loading = false;
        }
    }

    parseTimestamp(filename) {
        const match = filename.match(/eval-results-(.+)\.json/);
        if (!match) return new Date(0);
        // Filename format is YYYY-MM-DDTHH-mm-ss-SSSZ
        // We need YYYY-MM-DDTHH:mm:ss.SSSZ
        const parts = match[1].split('-');
        if (parts.length < 6) return new Date(0);

        // parts: [YYYY, MM, DD, HH, mm, ss, SSSZ]
        // Note: the T is attached to the DD part usually if split by - 
        // Wait, let's be more precise:
        const timestamp = match[1];
        const iso = timestamp
            .replace(/T(\d{2})-(\d{2})-(\d{2})/, "T$1:$2:$3")
            .replace(/:(\d{2})-(\d{3}Z)$/, ":$1.$2");

        return new Date(iso);
    }

    formatDate(date) {
        return date.toLocaleString();
    }

    renderCharts() {
        this.renderPassRateChart();
        this.renderStabilityChart();
        this.renderModelCostChart();
    }

    renderPassRateChart() {
        const ctx = this.shadowRoot.getElementById('passRateChart');
        if (!ctx) return;

        // Group by model
        const models = [...new Set(this.data.flatMap(d => d.runs.map(r => r.model).filter(Boolean)))];

        const datasets = models.map((model, index) => {
            return {
                label: model,
                data: this.data.map(d => {
                    const modelRuns = d.runs.filter(r => r.model === model);
                    if (modelRuns.length === 0) return null;
                    const passed = modelRuns.filter(r => r.passed).length;
                    return (passed / modelRuns.length) * 100;
                }),
                borderColor: this.getModelColor(model, index, models.length),
                backgroundColor: this.getModelColor(model, index, models.length),
                tension: 0.1,
                fill: false
            };
        });

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.data.map(d => this.formatDate(d.timestamp)),
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Pass Rate (%)',
                            color: '#f8fafc'
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#f8fafc' }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#f8fafc' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#f8fafc' }
                    }
                }
            }
        });
    }

    renderStabilityChart() {
        const ctx = this.shadowRoot.getElementById('stabilityChart');
        if (!ctx) return;

        // Group by test name (suite > name)
        const testNames = [...new Set(this.data.flatMap(d => d.runs.map(r => `${r.suite} > ${r.name}`)))];

        // Calculate average failure rate for each test case over all runs where it appeared
        const stabilityData = testNames.map(name => {
            let total = 0;
            let failed = 0;
            this.data.forEach(d => {
                const test = d.runs.find(r => `${r.suite} > ${r.name}` === name);
                if (test) {
                    total++;
                    if (!test.passed) failed++;
                }
            });
            return {
                name: name.split('>').pop().trim(), // Shorten for labels
                fullName: name,
                failureRate: (failed / total) * 100
            };
        }).sort((a, b) => b.failureRate - a.failureRate).slice(0, 10); // Show top 10 most unstable

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: stabilityData.map(d => d.name),
                datasets: [{
                    label: 'Failure Rate (%)',
                    data: stabilityData.map(d => d.failureRate),
                    backgroundColor: 'rgba(239, 68, 68, 0.5)',
                    borderColor: '#ef4444',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Failure Rate (%)', color: '#f8fafc' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#f8fafc' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#f8fafc', font: { size: 10 } }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#f8fafc' } },
                    tooltip: {
                        callbacks: {
                            title: (items) => stabilityData[items[0].dataIndex].fullName
                        }
                    }
                }
            }
        });
    }

    renderModelCostChart() {
        const ctx = this.shadowRoot.getElementById('modelCostChart');
        if (!ctx) return;

        // Group data by model and test name
        const models = [...new Set(this.data.flatMap(d => d.runs.map(r => r.model).filter(Boolean)))];
        const testNames = [...new Set(this.data.flatMap(d => d.runs.map(r => `${r.suite} > ${r.name}`)))];

        const datasets = testNames.map((testName, index) => {
            return {
                label: testName.split('>').pop().trim(),
                data: models.map(model => {
                    let totalCost = 0;
                    let count = 0;
                    this.data.forEach(d => {
                        const run = d.runs.find(r => r.model === model && `${r.suite} > ${r.name}` === testName);
                        if (run && run.costs) {
                            totalCost += run.costs.totalUSD;
                        }
                    });
                    // Average over total number of manifest entries (total executions)
                    return totalCost / this.manifest.length;
                }),
                backgroundColor: this.getTestColor(testName, index, testNames.length),
                stack: 'Stack 0',
            };
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: models,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Avg Cost per Execution ($)',
                            color: '#f8fafc'
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#f8fafc' }
                    },
                    x: {
                        stacked: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#f8fafc' }
                    }
                },
                plugins: {
                    legend: {
                        display: testNames.length < 15, // Hide legend if too many tests to avoid clutter
                        position: 'bottom',
                        labels: { color: '#f8fafc', font: { size: 10 } }
                    },
                    tooltip: {
                        callbacks: {
                            afterTitle: (items) => `Model: ${items[0].label}`
                        }
                    }
                }
            }
        });
    }

    getTestColor(name, index, total) {
        return this.getModelColor(name, index, total);
    }

    getModelColor(model, index, total) {
        const palette = [
            '#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#ec4899',
            '#06b6d4', '#f97316', '#8b5cf6', '#10b981', '#6366f1', '#f43f5e',
            '#2dd4bf', '#fb7185', '#fbbf24', '#818cf8', '#34d399', '#f472b6'
        ];

        // Use palette if within range, otherwise fallback to HSL generation
        if (index < palette.length) {
            return palette[index];
        }

        const hue = (index * 137.508) % 360; // Use golden angle for better distribution
        return `hsl(${hue}, 70%, 60%)`;
    }

    static styles = css`
        :host {
            display: block;
            padding: 24px;
            height: 100%;
            overflow-y: auto;
        }
        .insights-header {
            margin-bottom: 32px;
        }
        .charts-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 32px;
            margin-bottom: 32px;
        }
        .chart-container {
            background-color: var(--card-bg);
            padding: 24px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            height: 400px;
        }
        .chart-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 16px;
            color: var(--text-color);
        }
        .loading {
            text-align: center;
            padding: 48px;
            opacity: 0.5;
        }
    `;

    render() {
        if (this.loading) {
            return html`<div class="loading">Analyzing historical data...</div>`;
        }

        return html`
            <div class="insights-header">
                <h1 style="margin: 0; font-size: 1.5rem;">Quality Evolution Insights</h1>
                <p style="opacity: 0.7; margin-top: 8px;">Trends across ${this.manifest.length} evaluation runs</p>
            </div>

            <div class="charts-grid">
                <div class="chart-container">
                    <div class="chart-title">Pass Rate by Model Over Time</div>
                    <canvas id="passRateChart"></canvas>
                </div>
                <div class="chart-container">
                    <div class="chart-title">Most Unstable Test Cases (Failure Rate %)</div>
                    <canvas id="stabilityChart"></canvas>
                </div>
                <div class="chart-container">
                    <div class="chart-title">Avg Costs by Models (Stacked by Test Cases)</div>
                    <canvas id="modelCostChart"></canvas>
                </div>
            </div>
        `;
    }
}
customElements.define('eval-insights', EvalInsights);
