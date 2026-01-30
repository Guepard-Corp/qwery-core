//@ts-nocheck

import { LitElement, html, css } from 'https://esm.sh/lit@3.1.2';
import { when } from 'https://esm.sh/lit@3.1.2/directives/when.js';

export class EvalResultCard extends LitElement {
    static properties = {
        test: { type: Object },
        open: { type: Boolean },
        activeTab: { type: String }
    };

    constructor() {
        super();
        this.open = false;
        this.test = {};
        this.activeTab = 'test-results';
    }

    static styles = css`
        :host {
            display: block;
            background-color: var(--card-bg);
            border-radius: 8px;
            border: 1px solid var(--border-color);
            margin-bottom: 16px;
            overflow: hidden;
        }
        .test-header {
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            background-color: rgba(0, 0, 0, 0.1);
            transition: background-color 0.2s;
        }
        .test-header:hover {
            background-color: rgba(0, 0, 0, 0.2);
        }
        .test-title {
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-pass {
            background-color: rgba(34, 197, 94, 0.2);
            color: var(--success-color);
        }
        .status-fail {
            background-color: rgba(239, 68, 68, 0.2);
            color: var(--error-color);
        }
        .test-time {
            font-size: 0.875rem;
            opacity: 0.6;
            text-align: right;
        }
        .test-header-right {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 4px;
        }
        .meta-badges {
            display: flex;
            gap: 6px;
        }
        .meta-badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: 600;
            white-space: nowrap;
        }
        .badge-model {
            background-color: rgba(59, 130, 246, 0.2);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .badge-tokens {
            background-color: rgba(168, 85, 247, 0.2);
            color: #c084fc;
            border: 1px solid rgba(168, 85, 247, 0.3);
        }
        .badge-price {
            background-color: rgba(34, 197, 94, 0.2);
            color: #4ade80;
            border: 1px solid rgba(34, 197, 94, 0.3);
        }
        .test-details {
            border-top: 1px solid var(--border-color);
            display: none;
        }
        .test-details.open {
            display: block;
        }
        
        /* Tabs Styles */
        .tabs {
            display: flex;
            background-color: rgba(0, 0, 0, 0.2);
            border-bottom: 1px solid var(--border-color);
        }
        .tab {
            padding: 12px 20px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            opacity: 0.6;
            transition: all 0.2s;
            border-bottom: 2px solid transparent;
        }
        .tab:hover {
            opacity: 1;
            background-color: rgba(255, 255, 255, 0.03);
        }
        .tab.active {
            opacity: 1;
            color: var(--accent-color);
            border-bottom-color: var(--accent-color);
        }
        .tab-content {
            padding: 16px;
        }

        .detail-row {
            margin-bottom: 24px;
        }
        .detail-row:last-child {
            margin-bottom: 0;
        }
        .detail-label {
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--accent-color);
        }
        pre {
            background-color: #0f172a;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 0;
            font-family: 'Fira Code', monospace;
            font-size: 0.875rem;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .token-usage {
            display: flex;
            gap: 16px;
            margin-top: 8px;
            font-size: 0.875rem;
            opacity: 0.8;
            background: rgba(255, 255, 255, 0.05);
            padding: 8px 12px;
            border-radius: 4px;
            width: fit-content;
        }
        .diff-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        @media (max-width: 900px) {
            .diff-container {
                grid-template-columns: 1fr;
            }
        }
        .diff-column h4 {
            margin: 0 0 8px 0;
            font-size: 0.875rem;
            opacity: 0.7;
        }

        /* Lineage Styles */
        .message {
            margin-bottom: 16px;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }
        .message-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            opacity: 0.7;
        }
        .message-user {
            background-color: rgba(59, 130, 246, 0.05);
            border-left: 3px solid var(--accent-color);
        }
        .message-assistant {
            background-color: rgba(34, 197, 94, 0.05);
            border-left: 3px solid var(--success-color);
        }
    `;

    renderTestResults() {
        const { test } = this;
        return html`
            ${when(
            test.error,
            () => html`
                    <div class="detail-row">
                        <div class="detail-label" style="color: var(--error-color)">
                            Error
                        </div>
                        <pre style="color: var(--error-color)">${test.error}</pre>
                    </div>
                `,
        )}

            ${when(
            test.objectEval,
            () => html`
                    <div class="detail-row">
                        <div class="detail-label">Prompt</div>
                        <pre>${test.objectEval.prompt}</pre>
                    </div>
                    <div class="detail-row">
                        <div class="diff-container">
                            <div class="diff-column">
                                <div class="detail-label">Expected Response</div>
                                <pre>${JSON.stringify(test.objectEval.response, null, 2)}</pre>
                            </div>
                            <div class="diff-column">
                                <div class="detail-label">Actual Response</div>
                                <pre>${JSON.stringify(test.objectEval.actual || {}, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                `,
        )}
        `;
    }

    renderCosts() {
        const { test } = this;
        if (!test.usage && !test.costs) {
            return html`<div class="empty-state">No cost data available for this test.</div>`;
        }
        return html`
            <div class="detail-row">
                <div class="detail-label">Token Consumption</div>
                <div class="token-usage">
                    <span>Input: ${test.usage?.inputTokens || 0}</span>
                    <span>•</span>
                    <span>Output: ${test.usage?.outputTokens || 0}</span>
                    <span>•</span>
                    <span>Total: ${test.usage?.totalTokens || 0}</span>
                </div>
            </div>
            ${when(test.costs, () => html`
                <div class="detail-row">
                    <div class="detail-label">Estimated Prices (USD)</div>
                    <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                        <div class="stat-card" style="padding: 12px;">
                            <div class="stat-label" style="font-size: 0.7rem;">Input Cost</div>
                            <div class="stat-value" style="font-size: 1.1rem;">$${test.costs.inputUSD.toFixed(6)}</div>
                        </div>
                        <div class="stat-card" style="padding: 12px;">
                            <div class="stat-label" style="font-size: 0.7rem;">Output Cost</div>
                            <div class="stat-value" style="font-size: 1.1rem;">$${test.costs.outputUSD.toFixed(6)}</div>
                        </div>
                        <div class="stat-card" style="padding: 12px; border-color: var(--success-color);">
                            <div class="stat-label" style="font-size: 0.7rem;">Total Price</div>
                            <div class="stat-value" style="font-size: 1.1rem; color: var(--success-color);">$${test.costs.totalUSD.toFixed(6)}</div>
                        </div>
                    </div>
                </div>
            `)}
        `;
    }

    renderLineage() {
        // Placeholder UI as requested
        return html`
            <div class="detail-row">
                <div class="detail-label">Conversation Trace</div>
                <div class="message message-user">
                    <div class="message-header">
                        <span>User</span>
                        <span>Now</span>
                    </div>
                    <div class="message-content">Show me the inventory for the North region.</div>
                </div>
                <div class="message message-assistant">
                    <div class="message-header">
                        <span>Assistant</span>
                        <span>+450ms</span>
                    </div>
                    <div class="message-content">Fetching data for North region... Found 154 items.</div>
                </div>
                <div class="message message-user">
                    <div class="message-header">
                        <span>User</span>
                        <span>+1.2s</span>
                    </div>
                    <div class="message-content">Filter by category 'Electronics'.</div>
                </div>
                <div class="message message-assistant">
                    <div class="message-header">
                        <span>Assistant</span>
                        <span>+800ms</span>
                    </div>
                    <div class="message-content">Filtering by 'Electronics'... 42 items match your query.</div>
                </div>
                <p style="font-size: 0.8rem; opacity: 0.5; font-style: italic;">Note: Real lineage data extraction is coming soon.</p>
            </div>
        `;
    }

    render() {
        const { test, open, activeTab } = this;
        const statusClass = test.passed ? 'status-pass' : 'status-fail';
        const statusText = test.passed ? 'PASS' : 'FAIL';

        return html`
            <div class="test-header" @click=${() => (this.open = !this.open)}>
                <div class="test-title">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <span>${test.suite} > ${test.name}</span>
                </div>
                <div class="test-header-right">
                    <div class="test-time">${test.durationMs}ms</div>
                    <div class="meta-badges">
                        ${when(
            test.costs,
            () => html`<span class="meta-badge badge-price">$${test.costs.totalUSD.toFixed(4)}</span>`,
        )}
                        ${when(
            test.model,
            () => html`<span class="meta-badge badge-model">${test.model}</span>`,
        )}
                        ${when(
            test.usage,
            () => html`<span class="meta-badge badge-tokens">${test.usage.totalTokens} tokens</span>`,
        )}
                    </div>
                </div>
            </div>
            <div class="test-details ${open ? 'open' : ''}">
                <div class="tabs">
                    <div class="tab ${activeTab === 'test-results' ? 'active' : ''}" 
                         @click=${(e) => { e.stopPropagation(); this.activeTab = 'test-results'; }}>Test Results</div>
                    <div class="tab ${activeTab === 'costs' ? 'active' : ''}" 
                         @click=${(e) => { e.stopPropagation(); this.activeTab = 'costs'; }}>Costs</div>
                    <div class="tab ${activeTab === 'lineage' ? 'active' : ''}" 
                         @click=${(e) => { e.stopPropagation(); this.activeTab = 'lineage'; }}>Lineage</div>
                </div>
                <div class="tab-content">
                    ${activeTab === 'test-results' ? this.renderTestResults() : ''}
                    ${activeTab === 'costs' ? this.renderCosts() : ''}
                    ${activeTab === 'lineage' ? this.renderLineage() : ''}
                </div>
            </div>
        `;
    }
}
customElements.define('eval-result-card', EvalResultCard);
