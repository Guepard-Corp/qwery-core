import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { randomBytes } from 'node:crypto';
import { existsSync, promises as fs, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSecretVault, type MasterKeyring } from '../secret-vault';

const KEY_BYTES = 32;

/** In-memory keyring for deterministic tests (no OS calls). */
class MemKeyring implements MasterKeyring {
  store: Buffer | null = null;
  async get() {
    return this.store;
  }
  async set(key: Buffer) {
    this.store = Buffer.from(key);
  }
}

/** A keyring whose writes always fail (e.g. headless Linux, no D-Bus). */
const failingKeyring: MasterKeyring = {
  async get() {
    return null;
  },
  async set() {
    throw new Error('no secret service');
  },
};

let dir: string;
let keyPath: string;

beforeEach(() => {
  dir = path.join(tmpdir(), `qwery-vault-${randomBytes(6).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  keyPath = path.join(dir, '.master.key');
});

afterEach(() => {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
});

describe('SecretVault — crypto round-trip', () => {
  test('protect then reveal returns the original value (file fallback)', async () => {
    const vault = createSecretVault({ keyPath, keyring: null });
    const handle = await vault.protect('hunter2', { keyName: 'pg.password' });
    expect(vault.isProtected(handle)).toBe(true);
    expect(await vault.reveal(handle)).toBe('hunter2');
    // No keyring → key persisted to the file.
    expect(existsSync(keyPath)).toBe(true);
  });

  test('round-trips with a keyring and writes no key file', async () => {
    const keyring = new MemKeyring();
    const vault = createSecretVault({ keyPath, keyring });
    const handle = await vault.protect('s3cr3t', { keyName: 'k' });
    expect(await vault.reveal(handle)).toBe('s3cr3t');
    expect(keyring.store?.length).toBe(KEY_BYTES);
    expect(existsSync(keyPath)).toBe(false); // never touched disk
  });
});

describe('SecretVault — master key migration', () => {
  test('imports a legacy file key into the keyring, deletes the file, still decrypts', async () => {
    // Encrypt with a file-only vault first.
    const fileVault = createSecretVault({ keyPath, keyring: null });
    const handle = await fileVault.protect('legacy-secret', { keyName: 'k' });
    expect(existsSync(keyPath)).toBe(true);
    const onDisk = await fs.readFile(keyPath);

    // New run with a keyring: migrate.
    const keyring = new MemKeyring();
    const migrated = createSecretVault({ keyPath, keyring });
    expect(await migrated.reveal(handle)).toBe('legacy-secret'); // same key still works
    expect(keyring.store?.equals(onDisk)).toBe(true); // exact key imported
    expect(existsSync(keyPath)).toBe(false); // plaintext file removed
  });

  test('keeps the file when the keyring write fails (never loses the key)', async () => {
    const fileVault = createSecretVault({ keyPath, keyring: null });
    const handle = await fileVault.protect('keep-me', { keyName: 'k' });

    const stillFile = createSecretVault({ keyPath, keyring: failingKeyring });
    expect(await stillFile.reveal(handle)).toBe('keep-me');
    expect(existsSync(keyPath)).toBe(true); // file preserved on failed migration
  });

  test('prefers an existing keyring key over a stray file', async () => {
    const keyring = new MemKeyring();
    const known = randomBytes(KEY_BYTES);
    keyring.store = Buffer.from(known);
    // A stray (different) file key must be ignored.
    writeFileSync(keyPath, randomBytes(KEY_BYTES));

    const vault = createSecretVault({ keyPath, keyring });
    const handle = await vault.protect('via-keyring', { keyName: 'k' });

    // A second vault that only has the keyring key must decrypt it.
    const verifier = createSecretVault({ keyPath: path.join(dir, 'absent.key'), keyring });
    expect(await verifier.reveal(handle)).toBe('via-keyring');
  });
});
