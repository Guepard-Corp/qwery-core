import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export interface ContributesDriver {
  id: string;
  name: string;
  description?: string;
  runtime?: string;
  entry?: string;
}

export interface ContributesDatasource {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  schema?: unknown;
  docsUrl?: string | null;
  supportsPreview?: boolean;
  tags?: string[];
  drivers?: string[];
}

interface PackageContributes {
  drivers?: ContributesDriver[];
  datasources?: ContributesDatasource[];
}

export interface DiscoveredExtension {
  extDir: string;
  pkg: { contributes?: PackageContributes };
  datasources: ContributesDatasource[];
  drivers: ContributesDriver[];
}

export function getDefaultExtensionPaths(): string[] {
  const envPath = process.env.QWERY_EXTENSIONS_PATH?.trim();
  if (envPath) {
    return envPath
      .split(/[,;]/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  const home = os.homedir();
  const userPath = path.join(home, '.qwery', 'extensions');
  const paths: string[] = [];

  const platform = typeof process !== 'undefined' ? process.platform : '';
  switch (platform) {
    case 'darwin':
      paths.push('/Applications/Qwery.app/Contents/Resources/extensions');
      break;
    case 'win32': {
      const programFiles = process.env.PROGRAMFILES ?? 'C:\\Program Files';
      /* istanbul ignore next -- fallback when PROGRAMFILES(X86) unset -- @preserve */
      const programFilesX86 =
        process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)';
      const localAppData =
        process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
      paths.push(
        path.join(programFiles, 'Qwery', 'resources', 'extensions'),
        path.join(programFilesX86, 'Qwery', 'resources', 'extensions'),
        path.join(localAppData, 'Programs', 'Qwery', 'resources', 'extensions'),
      );
      break;
    }
    case 'linux': {
      paths.push('/usr/lib/qwery/extensions');
      const appDir = process.env.APPDIR;
      if (appDir) {
        paths.push(path.join(appDir, 'usr', 'lib', 'qwery', 'extensions'));
      }
      paths.push(
        path.join(
          path.dirname(process.execPath),
          '..',
          'lib',
          'qwery',
          'extensions',
        ),
      );
      break;
    }
    default:
      break;
  }

  paths.push(userPath);
  return paths;
}

export function discoverExtensionsFromFolders(
  basePaths?: string[],
): DiscoveredExtension[] {
  const paths = basePaths ?? getDefaultExtensionPaths();
  const seen = new Set<string>();
  const results: DiscoveredExtension[] = [];

  for (const basePath of paths) {
    try {
      if (!fs.existsSync(basePath) || !fs.statSync(basePath).isDirectory()) {
        continue;
      }

      const entries = fs.readdirSync(basePath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const extDir = path.join(basePath, entry.name);
        const pkgPath = path.join(extDir, 'package.json');
        if (!fs.existsSync(pkgPath)) continue;

        let pkg: { contributes?: PackageContributes };
        try {
          pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
            contributes?: PackageContributes;
          };
        } catch {
          continue;
        }

        const contributes = pkg.contributes ?? {};
        const drivers = contributes.drivers ?? [];
        const datasources = contributes.datasources ?? [];

        /* istanbul ignore next -- skip packages without datasources -- @preserve */
        if (datasources.length === 0) continue;

        const unseenDatasources = datasources.filter((ds) => {
          /* istanbul ignore next -- filter duplicate datasource ids -- @preserve */
          if (seen.has(ds.id)) return false;
          seen.add(ds.id);
          return true;
        });
        /* istanbul ignore next -- skip when all datasources are duplicates -- @preserve */
        if (unseenDatasources.length === 0) continue;

        results.push({
          extDir,
          pkg,
          datasources: unseenDatasources,
          drivers,
        });
      }
    } catch {
      // skip if readdir or stat fails
    }
  }

  return results;
}

export function resolveDriverEntryPath(
  extDir: string,
  entry: string | undefined,
  pkgMain: string | undefined,
  pkg?: { exports?: { '.'?: { bun?: string } } },
): string {
  let relative = entry ?? pkgMain ?? './dist/driver.js';
  const absolute = path.resolve(extDir, relative.replace(/^\.\//, ''));
  return pathToFileURL(absolute).href;
}

export function resolveSchemaPath(extDir: string): string {
  const schemaPath = path.join(extDir, 'dist', 'schema.js');
  return pathToFileURL(schemaPath).href;
}
