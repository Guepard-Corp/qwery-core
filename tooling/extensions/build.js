const fs = require('node:fs/promises');
const path = require('node:path');

const here = __dirname;

// Try to load esbuild from node_modules
let esbuild;
try {
  // Try to resolve esbuild - it might be in .pnpm or regular node_modules
  require.resolve('esbuild');
  esbuild = require('esbuild');
} catch (error) {
  // If esbuild is not available, we'll fall back to copying files
  console.warn(
    '[extensions-build] esbuild not found, will copy files without bundling. Install esbuild to enable bundling.',
  );
}

const extensionsRoot = path.resolve(
  here,
  '..',
  '..',
  'packages',
  'extensions',
);

const publicRoot = path.resolve(
  here,
  '..',
  '..',
  'apps',
  'web',
  'public',
  'extensions',
);

const extensionsLoaderSrc = path.resolve(
  here,
  '..',
  '..',
  'packages',
  'extensions-loader',
  'src',
);

async function main() {
  await fs.rm(publicRoot, { recursive: true, force: true });
  await fs.mkdir(publicRoot, { recursive: true });

  const registry = { datasources: [] };
  const entries = await safeReaddir(extensionsRoot);

  for (const entry of entries) {
    const pkgDir = path.join(extensionsRoot, entry);
    const pkgJsonPath = path.join(pkgDir, 'package.json');
    if (!(await fileExists(pkgJsonPath))) continue;

    const pkg = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
    const contributes = pkg.contributes ?? {};
    const drivers = contributes.drivers ?? [];
    const datasources = contributes.datasources ?? [];

    for (const ds of datasources) {
      const dsDrivers = (ds.drivers ?? [])
        .map((id) => drivers.find((d) => d.id === id))
        .filter(Boolean);

      const driverDescriptors = [];
      for (const driver of dsDrivers) {
        const entryFile =
          driver.entry ?? pkg.main ?? './dist/driver.js';
        const runtime = driver.runtime ?? 'node';

        let copiedEntry;
        if (runtime === 'browser') {
          const sourcePath = path.resolve(pkgDir, entryFile);
          if (await fileExists(sourcePath)) {
            const driverOutDir = path.join(publicRoot, driver.id);
            await fs.mkdir(driverOutDir, { recursive: true });
            const outputFileName = path.basename(entryFile);
            const dest = path.join(driverOutDir, outputFileName);

            // Bundle the extension with esbuild to include all dependencies
            if (esbuild) {
              try {
                const nodeModulesPath = path.resolve(
                  pkgDir,
                  '..',
                  '..',
                  '..',
                  'node_modules',
                );
                await esbuild.build({
                  entryPoints: [sourcePath],
                  bundle: true,
                  format: 'esm',
                  platform: 'browser',
                  target: 'es2020',
                  outfile: dest,
                  external: [
                    // Externalize UI packages - they're not needed in drivers
                    '@qwery/ui',
                    'react',
                    'react-dom',
                    // Bundle @qwery/extensions-sdk and @qwery/domain into the driver
                    // so it's self-contained and can be loaded from /public
                  ],
                  // Mark all node: imports as external - they're Node.js built-ins
                  // esbuild will handle this automatically for browser platform
                  // but we need to ensure they don't cause errors
                  alias: {
                    // Replace node: imports with empty modules for browser
                    'node:fs/promises': 'data:text/javascript,export default {}',
                    'node:path': 'data:text/javascript,export default {}',
                    'node:url': 'data:text/javascript,export default {}',
                  },
                  loader: {
                    // Handle WASM and data files as binary
                    '.wasm': 'file',
                    '.data': 'file',
                  },
                  banner: {
                    js: `
// This file is bundled for browser use
// All dependencies including @qwery/extensions-sdk and @qwery/domain are bundled
`,
                  },
                  resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
                  sourcemap: false,
                  minify: false,
                  treeShaking: true,
                  logLevel: 'silent',
                  nodePaths: [nodeModulesPath],
                  packages: 'bundle', // Bundle npm packages, but externalize workspace ones
                });

                // Copy PGlite WASM and data files if they exist
                // These are needed at runtime and can't be bundled
                if (pkg.name === '@qwery/extension-pglite') {
                  // Root node_modules (pnpm workspace root)
                  const rootNodeModules = path.resolve(
                    here,
                    '..',
                    '..',
                    'node_modules',
                  );

                  // Try multiple possible paths for pnpm workspace structure
                  const pnpmPaths = await findPGliteInPnpm(rootNodeModules);
                  const possiblePaths = [
                    path.join(rootNodeModules, '@electric-sql', 'pglite', 'dist'),
                    ...pnpmPaths,
                  ];

                  const pgliteFiles = ['pglite.wasm', 'pglite.data'];
                  let copied = false;
                  for (const pgliteDistPath of possiblePaths) {
                    const dataPath = path.join(pgliteDistPath, 'pglite.data');
                    if (await fileExists(dataPath)) {
                      for (const file of pgliteFiles) {
                        const sourceFile = path.join(pgliteDistPath, file);
                        if (await fileExists(sourceFile)) {
                          const destFile = path.join(driverOutDir, file);
                          await fs.copyFile(sourceFile, destFile);
                          console.log(
                            `[extensions-build] Copied ${file} for ${driver.id} from ${pgliteDistPath}`,
                          );
                          copied = true;
                        }
                      }
                      break; // Found and copied, no need to try other paths
                    }
                  }
                  if (!copied) {
                    console.warn(
                      `[extensions-build] Could not find PGlite files for ${driver.id}. Tried paths:`,
                      possiblePaths,
                    );
                  }
                }

                // Copy DuckDB WASM worker files if they exist
                // These are needed at runtime and can't be bundled
                if (pkg.name === '@qwery/extension-duckdb-wasm') {
                  const rootNodeModules = path.resolve(
                    here,
                    '..',
                    '..',
                    'node_modules',
                  );

                  // Try multiple possible paths for pnpm workspace structure
                  const duckdbPaths = await findDuckDBWasmInPnpm(rootNodeModules);
                  const possiblePaths = [
                    path.join(rootNodeModules, '@duckdb', 'duckdb-wasm', 'dist'),
                    ...duckdbPaths,
                  ];

                  // Copy worker files and WASM files that DuckDB WASM needs
                  const duckdbFiles = [
                    'duckdb-browser-eh.worker.js',
                    'duckdb-browser-mvp.worker.js',
                    'duckdb-browser-coi.worker.js',
                    'duckdb-browser-coi.pthread.worker.js',
                    'duckdb-browser.mjs',
                    'duckdb-eh.wasm',
                    'duckdb-mvp.wasm',
                    'duckdb-coi.wasm',
                  ];
                  let copied = false;
                  for (const duckdbDistPath of possiblePaths) {
                    const workerPath = path.join(duckdbDistPath, 'duckdb-browser-eh.worker.js');
                    if (await fileExists(workerPath)) {
                      for (const file of duckdbFiles) {
                        const sourceFile = path.join(duckdbDistPath, file);
                        if (await fileExists(sourceFile)) {
                          const destFile = path.join(driverOutDir, file);
                          await fs.copyFile(sourceFile, destFile);
                          console.log(
                            `[extensions-build] Copied ${file} for ${driver.id} from ${duckdbDistPath}`,
                          );
                          copied = true;
                        }
                      }
                      break; // Found and copied, no need to try other paths
                    }
                  }
                  if (!copied) {
                    console.warn(
                      `[extensions-build] Could not find DuckDB WASM files for ${driver.id}. Tried paths:`,
                      possiblePaths,
                    );
                  }
                }

                console.log(
                  `[extensions-build] Bundled browser driver ${driver.id} to ${dest}`,
                );
                copiedEntry = outputFileName;
              } catch (error) {
                console.error(
                  `[extensions-build] Failed to bundle browser driver ${driver.id}:`,
                  error.message,
                );
                // Fallback to copying the file as-is
                await fs.copyFile(sourcePath, dest);
                copiedEntry = outputFileName;
              }
            } else {
              // Fallback to copying the file as-is if esbuild is not available
              await fs.copyFile(sourcePath, dest);
              copiedEntry = outputFileName;
            }
          } else {
            console.warn(
              `[extensions-build] Missing entry for browser driver ${driver.id} at ${sourcePath}`,
            );
          }
        }

        driverDescriptors.push({
          id: driver.id,
          name: driver.name,
          description: driver.description,
          runtime,
          ...(copiedEntry ? { entry: copiedEntry } : {}),
        });
      }

      // Copy icon if present
      let iconPath;
      if (ds.icon) {
        const iconSourcePath = path.resolve(pkgDir, ds.icon);
        if (await fileExists(iconSourcePath)) {
          const iconDestDir = path.join(publicRoot, ds.id);
          await fs.mkdir(iconDestDir, { recursive: true });
          const iconDest = path.join(iconDestDir, path.basename(ds.icon));
          await fs.copyFile(iconSourcePath, iconDest);
          // Path relative to /extensions/ for browser access
          iconPath = `/extensions/${ds.id}/${path.basename(ds.icon)}`;
        } else {
          console.warn(
            `[extensions-build] Icon not found for datasource ${ds.id} at ${iconSourcePath}`,
          );
        }
      }

      registry.datasources.push({
        id: ds.id,
        name: ds.name,
        description: ds.description,
        scope: 'datasource',
        tags: ds.tags ?? [],
        icon: iconPath,
        schema: null,
        packageName: pkg.name,
        drivers: driverDescriptors,
        docsUrl: ds.docsUrl ?? null,
        supportsPreview: ds.supportsPreview === true,
      });

      // Check for src/schema.ts and bundle it if it exists
      const schemaSourcePath = path.resolve(pkgDir, 'src', 'schema.ts');
      if (await fileExists(schemaSourcePath)) {
        const schemaDestDir = path.join(publicRoot, ds.id);
        await fs.mkdir(schemaDestDir, { recursive: true });
        const schemaDest = path.join(schemaDestDir, 'schema.js');

        if (esbuild) {
          try {
            await esbuild.build({
              entryPoints: [schemaSourcePath],
              bundle: true,
              format: 'esm',
              platform: 'browser',
              target: 'es2020',
              outfile: schemaDest,
              external: [
                '@qwery/ui',
                'react',
                'react-dom',
              ],
              alias: {
                'node:fs/promises': 'data:text/javascript,export default {}',
                'node:path': 'data:text/javascript,export default {}',
                'node:url': 'data:text/javascript,export default {}',
              },
              banner: {
                js: `
// This file is bundled for browser use
// It contains the Zod schema definition for the extension
`,
              },
              sourcemap: false,
              minify: false,
              treeShaking: true,
              logLevel: 'silent',
            });
            console.log(
              `[extensions-build] Bundled schema for ${ds.id} to ${schemaDest}`,
            );
          } catch (error) {
            console.error(
              `[extensions-build] Failed to bundle schema for ${ds.id}:`,
              error.message,
            );
          }
        }
      }
    }
  }

  // Write registry.json to extensions-loader/src for SDK imports
  const extensionsLoaderRegistryPath = path.join(extensionsLoaderSrc, 'registry.json');
  await fs.writeFile(extensionsLoaderRegistryPath, JSON.stringify(registry, null, 2));
  console.log(`[extensions-build] Registry written to ${extensionsLoaderRegistryPath}`);

  // Also write to public for web app (datasources-loader.ts)
  const publicRegistryPath = path.join(publicRoot, 'registry.json');
  await fs.writeFile(publicRegistryPath, JSON.stringify(registry, null, 2));
  console.log(`[extensions-build] Registry written to ${publicRegistryPath}`);
}

async function findPGliteInPnpm(nodeModulesPath) {
  const paths = [];
  try {
    const pnpmPath = path.join(nodeModulesPath, '.pnpm');
    let stat;
    try {
      stat = await fs.stat(pnpmPath);
    } catch {
      return paths;
    }
    if (!stat.isDirectory()) {
      return paths;
    }
    const entries = await fs.readdir(pnpmPath);
    for (const entry of entries) {
      if (entry.startsWith('@electric-sql+pglite@')) {
        const pglitePath = path.join(
          pnpmPath,
          entry,
          'node_modules',
          '@electric-sql',
          'pglite',
          'dist',
        );
        try {
          const distStat = await fs.stat(pglitePath);
          if (distStat.isDirectory()) {
            const dataPath = path.join(pglitePath, 'pglite.data');
            if (await fileExists(dataPath)) {
              paths.push(pglitePath);
            }
          }
        } catch {
          // Skip this path
        }
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return paths;
}

async function findDuckDBWasmInPnpm(nodeModulesPath) {
  const paths = [];
  try {
    const pnpmPath = path.join(nodeModulesPath, '.pnpm');
    let stat;
    try {
      stat = await fs.stat(pnpmPath);
    } catch {
      return paths;
    }
    if (!stat.isDirectory()) {
      return paths;
    }
    const entries = await fs.readdir(pnpmPath);
    for (const entry of entries) {
      if (entry.startsWith('@duckdb+duckdb-wasm@')) {
        const duckdbPath = path.join(
          pnpmPath,
          entry,
          'node_modules',
          '@duckdb',
          'duckdb-wasm',
          'dist',
        );
        try {
          const distStat = await fs.stat(duckdbPath);
          if (distStat.isDirectory()) {
            const workerPath = path.join(duckdbPath, 'duckdb-browser-eh.worker.js');
            if (await fileExists(workerPath)) {
              paths.push(duckdbPath);
            }
          }
        } catch {
          // Skip this path
        }
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return paths;
}

async function safeReaddir(target) {
  try {
    return await fs.readdir(target);
  } catch (error) {
    console.warn(`[extensions-build] Unable to read ${target}`, error);
    return [];
  }
}

async function fileExists(target) {
  try {
    const stat = await fs.stat(target);
    return stat.isFile();
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error('[extensions-build] failed', error);
  process.exit(1);
});

