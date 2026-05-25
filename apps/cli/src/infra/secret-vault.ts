import { spawn } from 'node:child_process';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { existsSync, promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import type { ISecretVault } from '@qwery/domain';

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

const KEYRING_SERVICE = 'qwery';
const KEYRING_ACCOUNT = 'master-key';
const KEYRING_TIMEOUT_MS = 5_000;

/**
 * Stores the 32-byte AES master key out of reach of the `bash` tool. Backed by
 * the OS keyring (macOS `security`, Linux `secret-tool`) so the key is never a
 * plaintext file on disk — the encrypted-file path remains only as a fallback
 * where no keyring is reachable (ADR #19).
 */
export interface MasterKeyring {
  get(): Promise<Buffer | null>;
  set(key: Buffer): Promise<void>;
}

/** Spawn a keyring CLI with a timeout so a prompt or hang never freezes the app. */
function runCmd(bin: string, args: string[], stdin?: Buffer): Promise<{ code: number; stdout: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(bin, args);
    let out = '';
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      child.kill('SIGKILL');
      reject(new Error(`${bin} timed out`));
    }, KEYRING_TIMEOUT_MS);
    child.stdout.on('data', (c: Buffer) => {
      out += c.toString('utf-8');
    });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ code: code ?? 0, stdout: out });
    });
    if (stdin !== undefined) child.stdin.write(stdin);
    child.stdin.end();
  });
}

/** macOS login keychain via the `security` CLI. */
class MacSecurityKeyring implements MasterKeyring {
  async get(): Promise<Buffer | null> {
    try {
      const { code, stdout } = await runCmd('security', [
        'find-generic-password',
        '-a',
        KEYRING_ACCOUNT,
        '-s',
        KEYRING_SERVICE,
        '-w',
      ]);
      if (code !== 0) return null;
      const key = Buffer.from(stdout.trim(), 'base64');
      return key.length === KEY_BYTES ? key : null;
    } catch {
      return null;
    }
  }

  async set(key: Buffer): Promise<void> {
    // `-w <value>` passes the key as argv (brief `ps` visibility); acceptable
    // vs. a persistent plaintext file. `security` has no stdin password input.
    const { code } = await runCmd('security', [
      'add-generic-password',
      '-U',
      '-a',
      KEYRING_ACCOUNT,
      '-s',
      KEYRING_SERVICE,
      '-w',
      key.toString('base64'),
    ]);
    if (code !== 0) throw new Error('security add-generic-password failed');
  }
}

/** Linux secret service (libsecret) via the `secret-tool` CLI. */
class SecretToolKeyring implements MasterKeyring {
  async get(): Promise<Buffer | null> {
    try {
      const { code, stdout } = await runCmd('secret-tool', [
        'lookup',
        'service',
        KEYRING_SERVICE,
        'account',
        KEYRING_ACCOUNT,
      ]);
      if (code !== 0) return null;
      const key = Buffer.from(stdout.trim(), 'base64');
      return key.length === KEY_BYTES ? key : null;
    } catch {
      return null;
    }
  }

  async set(key: Buffer): Promise<void> {
    // secret-tool reads the secret from stdin — no argv exposure.
    const { code } = await runCmd(
      'secret-tool',
      ['store', '--label=qwery master key', 'service', KEYRING_SERVICE, 'account', KEYRING_ACCOUNT],
      Buffer.from(key.toString('base64')),
    );
    if (code !== 0) throw new Error('secret-tool store failed');
  }
}

/** The platform keyring, or null where none applies (real usability is verified at write time). */
export function detectKeyring(): MasterKeyring | null {
  if (process.platform === 'darwin' && existsSync('/usr/bin/security')) return new MacSecurityKeyring();
  if (process.platform === 'linux') return new SecretToolKeyring();
  return null;
}

async function saveAndVerify(keyring: MasterKeyring, key: Buffer): Promise<boolean> {
  try {
    await keyring.set(key);
    const back = await keyring.get();
    return back !== null && back.equals(key);
  } catch {
    return false;
  }
}

/**
 * Resolve the master key with a safe migration path:
 *   1. keyring already holds it → use it;
 *   2. legacy `~/.qwery/.master.key` present → if the keyring write+readback
 *      succeeds, import the SAME key (existing ciphertext still decrypts) then
 *      delete the file; otherwise keep using the file;
 *   3. nothing yet → generate one, store it in the keyring (verified) or, failing
 *      that, fall back to a 0600 file.
 * The file is only removed once the key is provably in the keyring, so a key is
 * never lost.
 */
async function resolveMasterKey(keyring: MasterKeyring | null, keyPath: string): Promise<Buffer> {
  if (keyring) {
    const existing = await keyring.get();
    if (existing) return existing;
  }

  let fileKey: Buffer | null = null;
  try {
    const raw = await fs.readFile(keyPath);
    if (raw.length !== KEY_BYTES) throw new Error(`master key at ${keyPath} has unexpected length`);
    fileKey = raw;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  if (fileKey) {
    if (keyring && (await saveAndVerify(keyring, fileKey))) {
      await fs.rm(keyPath, { force: true });
    }
    return fileKey;
  }

  const key = randomBytes(KEY_BYTES);
  if (keyring && (await saveAndVerify(keyring, key))) return key;
  await fs.mkdir(path.dirname(keyPath), { recursive: true });
  await fs.writeFile(keyPath, key, { mode: 0o600 });
  return key;
}

/**
 * AES-256-GCM secret vault. Lives in the CLI composition root (ADR #35) and is
 * injected into the persistence adapter so adapters stay decoupled. The key is
 * resolved lazily on first use via the injected resolver.
 */
export class SecretVault implements ISecretVault {
  private keyPromise: Promise<Buffer> | null = null;

  constructor(private readonly resolveKey: () => Promise<Buffer>) {}

  async protect(value: string, _context: { keyName: string; datasourceId?: string }): Promise<string> {
    const key = await this.getKey();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGO, key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString('base64url')}:${ciphertext.toString('base64url')}:${tag.toString('base64url')}`;
  }

  async reveal(protectedValue: string): Promise<string> {
    if (!this.isProtected(protectedValue)) return protectedValue;
    const body = protectedValue.slice(PREFIX.length);
    const [ivPart, ctPart, tagPart] = body.split(':');
    if (!ivPart || !ctPart || !tagPart) {
      throw new Error('SecretVault.reveal: malformed handle');
    }
    const key = await this.getKey();
    const iv = Buffer.from(ivPart, 'base64url');
    const ciphertext = Buffer.from(ctPart, 'base64url');
    const tag = Buffer.from(tagPart, 'base64url');
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  }

  isProtected(value: string): boolean {
    return typeof value === 'string' && value.startsWith(PREFIX);
  }

  private getKey(): Promise<Buffer> {
    if (this.keyPromise === null) this.keyPromise = this.resolveKey();
    return this.keyPromise;
  }
}

export function defaultMasterKeyPath(): string {
  return process.env.QWERY_MASTER_KEY_PATH ?? path.join(homedir(), '.qwery', '.master.key');
}

export interface CreateSecretVaultOptions {
  keyPath?: string;
  /** Injected keyring. `undefined` = auto-detect the platform keyring; `null` = force the file fallback. */
  keyring?: MasterKeyring | null;
}

export function createSecretVault(opts: CreateSecretVaultOptions = {}): SecretVault {
  const keyPath = opts.keyPath ?? defaultMasterKeyPath();
  const keyring = opts.keyring === undefined ? detectKeyring() : opts.keyring;
  return new SecretVault(() => resolveMasterKey(keyring, keyPath));
}
