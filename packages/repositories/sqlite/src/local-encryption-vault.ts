import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import { ISecretVault } from '@qwery/domain/repositories';

export class LocalEncryptionVault implements ISecretVault {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(encryptionKey: string) {
    if (!encryptionKey) {
      throw new Error('Encryption key is required');
    }
    // Deriving a 32-byte key from the provided string
    this.key = scryptSync(encryptionKey, 'qwery-salt', 32);
  }

  async protect(value: string): Promise<string> {
    if (!value) return value;

    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    // Format: enc:iv:authTag:encrypted
    return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  async reveal(protectedValue: string): Promise<string> {
    if (!this.isProtected(protectedValue)) {
      return protectedValue;
    }

    try {
      const parts = protectedValue.substring(4).split(':');
      if (parts.length !== 3) {
        return protectedValue;
      }

      const [ivHex, authTagHex, encryptedHex] = parts;
      if (!ivHex || !authTagHex || !encryptedHex) {
        return protectedValue;
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt secret:', error);
      return protectedValue;
    }
  }

  isProtected(value: string): boolean {
    return typeof value === 'string' && value.startsWith('enc:');
  }
}
