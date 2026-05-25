import { spawn } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getAppVersion } from './version';

/** Hard cap on a downloaded release tarball before it's written to disk. */
const MAX_DOWNLOAD_BYTES = 512 * 1024 * 1024;

// --- pure helpers (no I/O) --------------------------------------------------

/** Parses a `MAJOR.MINOR.PATCH` string, ignoring a leading `v` and any suffix. */
export function parseSemver(value: string): [number, number, number] | undefined {
  const match = value
    .trim()
    .replace(/^v/, '')
    .match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** True when `latest` is a strictly higher semver than `current`. */
export function isNewer(latest: string, current: string): boolean {
  const a = parseSemver(latest);
  const b = parseSemver(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

export type StageAction = 'up-to-date' | 'already-staged' | 'stage' | 'unknown';

/** Decides what to do for one artifact, given the three known versions. */
export function planStage(input: { current?: string; latest?: string; staged?: string }): StageAction {
  const { current, latest, staged } = input;
  if (!current || !latest) return 'unknown';
  if (!isNewer(latest, current)) return 'up-to-date';
  if (staged && !isNewer(latest, staged)) return 'already-staged';
  return 'stage';
}

/** The release os/arch triple (matches the install scripts), or undefined if unsupported. */
export function platformTriple(): { os: string; arch: string } | undefined {
  const os = process.platform === 'darwin' ? 'macos' : process.platform === 'linux' ? 'linux' : undefined;
  const arch = process.arch === 'arm64' ? 'aarch64' : process.arch === 'x64' ? 'x86_64' : undefined;
  if (!os || !arch) return undefined;
  return { os, arch };
}

/** GitHub release asset name, e.g. `qwery-macos-aarch64.tar.gz`. */
export function tarballName(app: string, triple: { os: string; arch: string }): string {
  return `${app}-${triple.os}-${triple.arch}.tar.gz`;
}

// --- artifact descriptors ---------------------------------------------------

interface ArtifactSpec {
  /** Staging slot + log name, e.g. "qwery" | "gfs". */
  app: string;
  /** GitHub `owner/repo` the releases live under. */
  repo: string;
  /** Resolves the running version (undefined ⇒ unknown ⇒ skip). */
  current(): Promise<string | undefined> | string | undefined;
  /** Lays the extracted tarball out under the staging slot; throws on a bad payload. */
  layout(extractDir: string, slotDir: string): void;
}

export interface UpdateOutcome {
  app: string;
  current?: string;
  latest?: string;
  action: StageAction | 'failed';
}

export interface UpdaterDeps {
  /** Install root; defaults to `~/.qwery`. */
  root?: string;
  fetchImpl?: typeof fetch;
  /** Extracts `archive` into `dest` (default: `tar -xzf`). Returns false on a bad archive. */
  extract?: (archive: string, dest: string) => Promise<boolean>;
  currentGfsVersion?: () => Promise<string | undefined>;
  logger?: { info?: (msg: string) => void; warn?: (msg: string) => void };
  /** Release-host bases, overridable for local e2e (default: public GitHub). */
  apiBase?: string;
  downloadBase?: string;
}

export interface Updater {
  /** Detects newer releases and stages them for next-launch apply (never throws). */
  checkAndStage(): Promise<UpdateOutcome[]>;
}

// --- implementation ---------------------------------------------------------

function defaultExtract(archive: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('tar', ['-xzf', archive, '-C', dest], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

/** Recursively finds the first entry named `name` under `dir`. */
function findEntry(dir: string, name: string): string | undefined {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.name === name) return full;
    if (entry.isDirectory()) {
      const nested = findEntry(full, name);
      if (nested) return nested;
    }
  }
  return undefined;
}

async function fetchLatestVersion(
  repo: string,
  fetchImpl: typeof fetch,
  apiBase: string,
): Promise<string | undefined> {
  try {
    const res = await fetchImpl(`${apiBase}/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'qwery-updater' },
    });
    if (!res.ok) return undefined;
    const body = (await res.json()) as { tag_name?: string };
    if (!body.tag_name) return undefined;
    return body.tag_name.replace(/^v/, '');
  } catch {
    return undefined;
  }
}

export function createUpdater(deps: UpdaterDeps = {}): Updater {
  const root = deps.root ?? join(homedir(), '.qwery');
  const fetchImpl = deps.fetchImpl ?? fetch;
  const extract = deps.extract ?? defaultExtract;
  const log = deps.logger;
  const apiBase = deps.apiBase ?? process.env.QWERY_UPDATE_API_BASE ?? 'https://api.github.com';
  const downloadBase = deps.downloadBase ?? process.env.QWERY_UPDATE_DL_BASE ?? 'https://github.com';

  const specs: ArtifactSpec[] = [
    {
      app: 'qwery',
      repo: 'Guepard-Corp/qwery-agent',
      current: () => getAppVersion(),
      // Tarball is `<app>-<os>-<arch>/{bin,lib}`; we stage only lib/ (ADR #37).
      layout(extractDir, slotDir) {
        const lib = findEntry(extractDir, 'lib');
        if (!lib || !statSync(lib).isDirectory()) throw new Error('qwery tarball has no lib/');
        if (!moveInto(lib, join(slotDir, 'lib'))) throw new Error('failed to stage qwery lib/');
      },
    },
    {
      app: 'gfs',
      repo: 'Guepard-Corp/gfs',
      current: () => deps.currentGfsVersion?.(),
      // Tarball ships the single `gfs` binary somewhere inside.
      layout(extractDir, slotDir) {
        const bin = findEntry(extractDir, 'gfs');
        if (!bin || !statSync(bin).isFile()) throw new Error('gfs tarball has no gfs binary');
        if (!moveInto(bin, join(slotDir, 'gfs'))) throw new Error('failed to stage gfs binary');
      },
    },
  ];

  function stagedVersion(app: string): string | undefined {
    const versionFile = join(root, 'staged', app, 'version');
    const ready = join(root, 'staged', app, '.ready');
    if (!existsSync(ready) || !existsSync(versionFile)) return undefined;
    try {
      return readFileSync(versionFile, 'utf-8').trim() || undefined;
    } catch {
      return undefined;
    }
  }

  async function stage(spec: ArtifactSpec, latest: string): Promise<void> {
    const triple = platformTriple();
    if (!triple) throw new Error('unsupported platform');
    const file = tarballName(spec.app, triple);
    const url = `${downloadBase}/${spec.repo}/releases/download/v${latest}/${file}`;

    const tmp = join(root, 'staged', `.tmp-${spec.app}`);
    const slot = join(root, 'staged', spec.app);
    rmSync(tmp, { recursive: true, force: true });
    rmSync(slot, { recursive: true, force: true });
    mkdirSync(join(tmp, 'extract'), { recursive: true });

    const res = await fetchImpl(url, { headers: { 'User-Agent': 'qwery-updater' } });
    if (!res.ok) throw new Error(`download ${res.status}`);
    // Bound the network data written to disk (release tarballs are well under this);
    // rejects a hostile/oversized response before it touches the filesystem.
    const declared = Number(res.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_DOWNLOAD_BYTES) {
      throw new Error(`download too large: ${declared} bytes`);
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > MAX_DOWNLOAD_BYTES) throw new Error('download exceeded size cap');
    const archive = join(tmp, file);
    writeFileSync(archive, bytes);

    if (!(await extract(archive, join(tmp, 'extract')))) {
      throw new Error('invalid archive'); // bad gzip / 404 HTML / truncated
    }

    mkdirSync(slot, { recursive: true });
    spec.layout(join(tmp, 'extract'), slot);
    writeFileSync(join(slot, 'version'), latest);
    writeFileSync(join(slot, '.ready'), ''); // marker written last — wrapper trusts it
    rmSync(tmp, { recursive: true, force: true });
  }

  return {
    /**
     * Checks both artifacts and stages any newer release for next-launch apply.
     * Never throws — failures degrade to a 'failed'/'unknown' outcome.
     */
    async checkAndStage(): Promise<UpdateOutcome[]> {
      const outcomes: UpdateOutcome[] = [];
      for (const spec of specs) {
        const current = (await spec.current()) ?? undefined;
        const latest = await fetchLatestVersion(spec.repo, fetchImpl, apiBase);
        const action = planStage({ current, latest, staged: stagedVersion(spec.app) });
        if (action !== 'stage') {
          outcomes.push({ app: spec.app, current, latest, action });
          continue;
        }
        try {
          await stage(spec, latest as string);
          log?.info?.(`updater: staged ${spec.app} ${latest} for next launch`);
          outcomes.push({ app: spec.app, current, latest, action: 'stage' });
        } catch (err) {
          log?.warn?.(`updater: staging ${spec.app} failed — ${(err as Error).message}`);
          outcomes.push({ app: spec.app, current, latest, action: 'failed' });
        }
      }
      return outcomes;
    },
  };
}

/** Moves `from`→`to` via rename, falling back to a recursive copy across filesystems. */
function moveInto(from: string, to: string): boolean {
  try {
    renameSync(from, to);
    return true;
  } catch {
    try {
      cpSync(from, to, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }
}
