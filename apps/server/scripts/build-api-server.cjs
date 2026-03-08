const { spawnSync } = require('child_process');
const path = require('path');

const PLATFORM_TRIPLE = {
  darwin: process.arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin',
  win32: 'x86_64-pc-windows-msvc',
  linux: process.arch === 'arm64' ? 'aarch64-unknown-linux-gnu' : 'x86_64-unknown-linux-gnu',
};
const triple = PLATFORM_TRIPLE[process.platform] || 'aarch64-apple-darwin';
const outDir = path.resolve(__dirname, '../../desktop/src-tauri/binaries');
const outfile = path.join(outDir, `api-server-${triple}`);

const result = spawnSync(
  'bun',
  ['build', './src/index.ts', '--target', 'node', '--outfile', outfile],
  { stdio: 'inherit', cwd: path.resolve(__dirname, '..'), shell: true }
);
process.exit(result.status ?? 1);
