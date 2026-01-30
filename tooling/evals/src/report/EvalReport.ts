//@ts-nocheck

import { LitElement, html, css } from 'https://esm.sh/lit@3.1.2';
import { when } from 'https://esm.sh/lit@3.1.2/directives/when.js';

function formatTimestamp(filename) {
    const match = filename.match(/eval-results-(.+)\.json/);
    if (!match) return filename;
    return match[1].replace(/-/g, ':').replace('T', ' ').split('.')[0];
}

export class EvalReport extends LitElement {
    static properties = {
        manifest: { type: Array },
        currentRunFile: { type: String },
        results: { type: Array },
        loading: { type: Boolean },
        view: { type: String }
    };

    constructor() {
        super();
        this.manifest = [];
        this.results = [];
        this.loading = true;
        this.currentRunFile = null;
        this.view = 'results'; // 'results' or 'insights'
    }

    async connectedCallback() {
        super.connectedCallback();
        await this.fetchManifest();
    }

    async fetchManifest() {
        try {
            const response = await fetch('manifest.json');
            this.manifest = await response.json();
            if (this.manifest.length > 0) {
                await this.loadRun(this.manifest[0]);
            }
        } catch (err) {
            console.error('Failed to load manifest:', err);
        } finally {
            this.loading = false;
        }
    }

    async loadRun(filename) {
        this.currentRunFile = filename;
        this.loading = true;
        try {
            const response = await fetch(filename);
            this.results = await response.json();
        } catch (err) {
            console.error('Failed to load run:', err);
            this.results = [];
        } finally {
            this.loading = false;
        }
    }

    static styles = css`
        :host {
            display: flex;
            height: 100vh;
            width: 100vw;
        }
        .sidebar {
            width: 300px;
            background-color: var(--sidebar-bg);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        .sidebar-header {
            padding: 24px 20px;
            border-bottom: 1px solid var(--border-color);
            font-size: 1.25rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(0, 0, 0, 0.1);
        }
        .run-list {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        .run-item {
            padding: 12px;
            margin-bottom: 8px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
        }
        .run-item:hover {
            background-color: var(--hover-bg);
        }
        .run-item.active {
            background-color: var(--accent-color);
            border-color: var(--accent-color);
        }
        .run-timestamp {
            font-size: 0.9rem;
            font-weight: 500;
        }
        .run-summary {
            font-size: 0.8rem;
            opacity: 0.8;
            margin-top: 4px;
            display: flex;
            gap: 10px;
        }
        .nav-section {
            padding: 10px;
            border-bottom: 1px solid var(--border-color);
        }
        .nav-item {
            padding: 12px;
            margin-bottom: 4px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
        }
        .nav-item:hover {
            background-color: var(--hover-bg);
        }
        .nav-item.active {
            background-color: var(--accent-color);
            color: white;
        }
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background-color: var(--bg-color);
        }
        .header {
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
            background-color: var(--sidebar-bg);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .content-scroll {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
        }
        .stat-card {
            background-color: var(--card-bg);
            padding: 20px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }
        .stat-label {
            font-size: 0.875rem;
            opacity: 0.7;
            margin-bottom: 8px;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
        }
        .empty-state {
            text-align: center;
            margin-top: 100px;
            opacity: 0.5;
        }
        .loading-overlay {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 300px;
            background: rgba(15, 23, 42, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            backdrop-filter: blur(2px);
        }
    `;

    render() {
        const total = this.results.length;
        const passed = this.results.filter((r) => r.passed).length;
        const failed = total - passed;
        const duration = this.results.reduce((acc, r) => acc + r.durationMs, 0);
        const totalPrice = this.results.reduce((acc, r) => acc + (r.costs?.totalUSD || 0), 0);

        return html`
            <div class="sidebar">
                <div class="sidebar-header">
                    <span>📊 Evals Report</span>
                </div>
                <div class="nav-section">
                    <div 
                        class="nav-item ${this.view === 'results' ? 'active' : ''}"
                        @click=${() => this.view = 'results'}
                    >
                        <span>📄 Results</span>
                    </div>
                    <div 
                        class="nav-item ${this.view === 'insights' ? 'active' : ''}"
                        @click=${() => this.view = 'insights'}
                    >
                        <span>📈 Insights</span>
                    </div>
                </div>
                <div class="run-list" style="${this.view === 'insights' ? 'display: none' : ''}">
                    <div style="padding: 10px; font-size: 0.75rem; opacity: 0.5; text-transform: uppercase; font-weight: bold;">
                        History
                    </div>
                    ${this.manifest.map(
            (filename, index) => html`
                            <div
                                class="run-item ${this.currentRunFile === filename
                    ? 'active'
                    : ''}"
                                @click=${() => { this.loadRun(filename); this.view = 'results'; }}
                            >
                                <div class="run-timestamp">
                                    ${formatTimestamp(filename)}
                                </div>
                                <div class="run-summary">
                                    Run #${this.manifest.length - index}
                                </div>
                            </div>
                        `,
        )}
                </div>
            </div>

            <div class="main-content">
                ${when(
            this.view === 'insights',
            () => html`<eval-insights .manifest=${this.manifest}></eval-insights>`,
            () => html`
                ${when(
                this.loading && !this.currentRunFile,
                () => html` <div class="empty-state">Loading manifest...</div> `,
                () => html`
                            <div class="header">
                                <h1 style="font-size: 1.25rem; margin: 0;">
                                    ${this.currentRunFile
                        ? formatTimestamp(this.currentRunFile)
                        : 'Select a run'}
                                </h1>
                            </div>
                            <div class="content-scroll">
                                ${when(
                            this.currentRunFile,
                            () => html`
                                        <div class="stats-grid">
                                            <div class="stat-card">
                                                <div class="stat-label">Total Tests</div>
                                                <div class="stat-value">${total}</div>
                                            </div>
                                            <div class="stat-card">
                                                <div class="stat-label">Passed</div>
                                                <div
                                                    class="stat-value"
                                                    style="color: var(--success-color)"
                                                >
                                                    ${passed}
                                                </div>
                                            </div>
                                            <div class="stat-card">
                                                <div class="stat-label">Failed</div>
                                                <div
                                                    class="stat-value"
                                                    style="color: var(--error-color)"
                                                >
                                                    ${failed}
                                                </div>
                                            </div>
                                            <div class="stat-card">
                                                <div class="stat-label">Duration</div>
                                                <div class="stat-value">
                                                    ${(duration / 1000).toFixed(2)}s
                                                </div>
                                            </div>
                                            <div class="stat-card">
                                                <div class="stat-label">Total Price</div>
                                                <div class="stat-value" style="color: #4ade80;">
                                                    $${totalPrice.toFixed(4)}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="test-list">
                                            ${this.results.map(
                                (test) => html`
                                                    <eval-result-card
                                                        .test=${test}
                                                    ></eval-result-card>
                                                `,
                            )}
                                        </div>
                                    `,
                            () => html`
                                        <div class="empty-state">
                                            Select a run from the sidebar to view details
                                        </div>
                                    `,
                        )}
                            </div>
                        `,
            )}
            `)}
                ${when(
                this.loading && this.currentRunFile,
                () => html`
                        <div class="loading-overlay">
                            <div>Loading run data...</div>
                        </div>
                    `,
            )}
            </div>
        `;
    }
}
customElements.define('eval-report', EvalReport);
