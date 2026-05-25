import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import type { ISecretVault } from '@qwery/domain';

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * File-backed secret vault — encrypts values with AES-256-GCM under a master
 * key stored at `~/.qwery/.master.key` (auto-generated, 0600). ADR #19 calls
 * for OS Keychain first with this encrypted-file as a fallback; for MVP we
 * ship the fallback path only and upgrade to keyring later without changing
 * the port contract. Lives in the CLI composition root (ADR #35) and is
 * injected into the persistence adapter so adapters stay decoupled.
 */
export class FileSecretVault implements ISecretVault {
  private keyPromise: Promise<Buffer> | null = null;

  constructor(private readonly keyPath: string) {}

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
      throw new Error('FileSecretVault.reveal: malformed handle');
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

  private async getKey(): Promise<Buffer> {
    if (this.keyPromise === null) {
      this.keyPromise = this.loadOrCreateKey();
    }
    return this.keyPromise;
  }

  private async loadOrCreateKey(): Promise<Buffer> {
    try {
      const raw = await fs.readFile(this.keyPath);
      if (raw.length !== KEY_BYTES) {
        throw new Error(`FileSecretVault: master key at ${this.keyPath} has unexpected length`);
      }
      return raw;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      await fs.mkdir(path.dirname(this.keyPath), { recursive: true });
      const key = randomBytes(KEY_BYTES);
      await fs.writeFile(this.keyPath, key, { mode: 0o600 });
      return key;
    }
  }
}

export function defaultMasterKeyPath(): string {
  return process.env.QWERY_MASTER_KEY_PATH ?? path.join(homedir(), '.qwery', '.master.key');
}

export function createFileSecretVault(keyPath = defaultMasterKeyPath()): FileSecretVault {
  return new FileSecretVault(keyPath);
}
