/**
 * Hexagonal layer rules (ADR #12).
 *
 * Layers:
 *   - packages/domain        — bottom, depends on nothing in this repo
 *   - packages/application   — depends only on domain
 *   - packages/extension-sdk — public contract; depends only on domain
 *   - packages/adapters/*    — depend on domain (via ports)
 *   - packages/extensions/*  — depend on extension-sdk + domain (NOT on application or adapters)
 *   - apps/cli               — composition root, depends on everything
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'domain-must-not-import-others',
      severity: 'error',
      comment: 'Domain is the pure core — it must not import application, adapters, or apps.',
      from: { path: '^packages/domain/' },
      to: {
        path: ['^packages/application/', '^packages/adapters/', '^apps/'],
      },
    },
    {
      name: 'application-must-not-import-adapters-or-apps',
      severity: 'error',
      comment: 'Application orchestrates via ports — never via concrete adapters.',
      from: { path: '^packages/application/' },
      to: {
        path: ['^packages/adapters/', '^apps/'],
      },
    },
    {
      name: 'adapters-must-not-import-application-or-apps',
      severity: 'error',
      comment: 'Adapters implement domain ports — they must not depend on application or CLI.',
      from: { path: '^packages/adapters/' },
      to: {
        path: ['^packages/application/', '^apps/'],
      },
    },
    {
      name: 'adapters-must-not-cross-import',
      severity: 'error',
      comment: 'One adapter must not import another adapter directly.',
      from: { path: '^packages/adapters/([^/]+)/' },
      to: {
        path: '^packages/adapters/(?!$1)([^/]+)/',
      },
    },
    {
      name: 'extension-sdk-must-not-import-others',
      severity: 'error',
      comment: 'The public SDK depends only on domain — never on application, adapters, or extensions.',
      from: { path: '^packages/extension-sdk/' },
      to: {
        path: ['^packages/application/', '^packages/adapters/', '^packages/extensions/', '^apps/'],
      },
    },
    {
      name: 'extensions-must-only-import-sdk-and-domain',
      severity: 'error',
      comment:
        'Extensions implement against the SDK contract. They must not import host application or adapters.',
      from: { path: '^packages/extensions/' },
      to: {
        path: ['^packages/application/', '^packages/adapters/', '^apps/'],
      },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: ['(^|/)scripts/', '(^|/)tooling/', '\\.d\\.ts$', 'index\\.ts$'],
      },
      to: {},
    },
    {
      name: 'no-test-into-prod',
      severity: 'error',
      from: { pathNot: '\\.test\\.[jt]sx?$' },
      to: { path: '\\.test\\.[jt]sx?$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)dist/' },
    tsConfig: { fileName: 'tsconfig.base.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
