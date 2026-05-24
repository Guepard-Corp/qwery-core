#!/usr/bin/env bun
import { execFileSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
/**
 * Builds a release tarball for the HOST platform (ADR #36).
 *
 * Output: `dist-release/qwery-<os>-<arch>.tar.gz` containing
 *   bin/qwery          — bash wrapper that points the dynamic loader at ../lib
 *   lib/qwery-bin      — `bun build --compile` single-file executable
 *   lib/libduckdb.*    — the DuckDB engine the embedded addon dlopen()s
 *
 * Cross-compilation of the DuckDB native addon is not possible, so each
 * platform's tarball is produced on its own native CI runner (ADR #23).
 */
import { Glob } from 'bun';

const ROOT = join(import.meta.dir, '..');
const ENTRY = join(ROOT, 'apps/cli/src/main.tsx');
const OUT_DIR = join(ROOT, 'dist-release');

// Every platform-specific binding the DuckDB loader `require()`s. We embed only
// the host's and mark the rest external so the bundler stops trying to resolve
// uninstalled platforms (the loader branches on process.platform at runtime).
const ALL_BINDINGS = [
  'linux-x64',
  'linux-x64-musl',
  'linux-arm64',
  'linux-arm64-musl',
  'darwin-x64',
  'darwin-arm64',
  'win32-x64',
  'win32-arm64',
];

const platform = process.platform;
const arch = process.arch;
if (platform !== 'darwin' && platform !== 'linux') {
  console.error(`Unsupported build platform: ${platform} (only darwin and linux are supported)`);
  process.exit(1);
}
if (arch !== 'arm64' && arch !== 'x64') {
  console.error(`Unsupported build arch: ${arch}`);
  process.exit(1);
}

const hostBinding = `${platform}-${arch}`; // e.g. darwin-arm64, linux-x64 (glibc)
const osName = platform === 'darwin' ? 'macos' : 'linux';
const archName = arch === 'arm64' ? 'aarch64' : 'x86_64';
const libExt = platform === 'darwin' ? 'dylib' : 'so';
const releaseName = `qwery-${osName}-${archName}`;
const stage = join(OUT_DIR, releaseName);

function findLibduckdb(): string {
  const glob = new Glob(`**/@duckdb/node-bindings-${hostBinding}/libduckdb.${libExt}`);
  const matches = [
    ...glob.scanSync({ cwd: join(ROOT, 'node_modules'), absolute: true, onlyFiles: true, dot: true }),
  ];
  const found = matches[0];
  if (!found) {
    console.error(
      `Could not find libduckdb.${libExt} for ${hostBinding} under node_modules — run "bun install" first.`,
    );
    process.exit(1);
  }
  return found;
}

console.log(`Building ${releaseName} (host binding: ${hostBinding})`);

rmSync(stage, { recursive: true, force: true });
mkdirSync(join(stage, 'bin'), { recursive: true });
mkdirSync(join(stage, 'lib'), { recursive: true });

const externals = ALL_BINDINGS.filter((b) => b !== hostBinding).map(
  (b) => `@duckdb/node-bindings-${b}/duckdb.node`,
);

// Bake the release version into the binary so it knows what it is at runtime
// (ADR #37); the in-app UpdateChecker compares it against the latest release.
const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')).version as string;

// ink statically imports `react-devtools-core` from its `./devtools.js`, gated at
// runtime by `if (process.env['DEV'] === 'true')`. `--compile` hoists that import
// and the single-file binary then crashes at startup with "Cannot find package
// 'react-devtools-core'" (the package is not installed). `--define` can't kill the
// branch — bun only rewrites the exact `process.env.DEV` syntax, not ink's bracket
// access — so we stub the module to an empty default instead. It is never used:
// the DEV guard stays false in a release build.
const stubReactDevtools: Bun.BunPlugin = {
  name: 'stub-react-devtools-core',
  setup(build) {
    build.onResolve({ filter: /^react-devtools-core(\/.*)?$/ }, () => ({
      path: 'react-devtools-core',
      namespace: 'stub',
    }));
    build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
      contents: 'export default {};',
      loader: 'js',
    }));
  },
};

const result = await Bun.build({
  entrypoints: [ENTRY],
  compile: { outfile: join(stage, 'lib', 'qwery-bin') },
  define: { 'process.env.QWERY_VERSION': JSON.stringify(version) },
  external: externals,
  plugins: [stubReactDevtools],
});
if (!result.success) {
  console.error('Build failed:');
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

cpSync(findLibduckdb(), join(stage, 'lib', `libduckdb.${libExt}`));

// Wrapper: the compiled binary extracts its embedded duckdb.node to a temp dir
// and dlopen()s `@rpath/libduckdb.*`; exporting the lib dir lets it resolve.
// It also applies any staged update before exec'ing the binary (ADR #37) — the
// only safe moment, since qwery cannot hot-swap its own running code.
const applyFn = readFileSync(join(import.meta.dir, 'wrapper-apply.sh'), 'utf-8');
const wrapper = `#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"

${applyFn}
( qwery_apply_staged_updates "$ROOT" ) || true

export DYLD_LIBRARY_PATH="$DIR/../lib:\${DYLD_LIBRARY_PATH:-}"
export LD_LIBRARY_PATH="$DIR/../lib:\${LD_LIBRARY_PATH:-}"
exec "$DIR/../lib/qwery-bin" "$@"
`;
const wrapperPath = join(stage, 'bin', 'qwery');
writeFileSync(wrapperPath, wrapper);
chmodSync(wrapperPath, 0o755);

execFileSync('tar', ['-czf', `${releaseName}.tar.gz`, '-C', OUT_DIR, releaseName], {
  cwd: OUT_DIR,
  stdio: 'inherit',
});

console.log(`\n✓ dist-release/${releaseName}.tar.gz`);
