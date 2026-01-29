import { describe, it, expect } from 'vitest';
import { LocalEncryptionVault } from '../src/local-encryption-vault';

describe('LocalEncryptionVault', () => {
    const encryptionKey = 'test-encryption-key-at-least-32-chars-long-12345';
    const vault = new LocalEncryptionVault(encryptionKey);

    it('should encrypt and decrypt a string', async () => {
        const plainText = 'my-secret-password';
        const protectedValue = await vault.protect(plainText);

        expect(protectedValue).toMatch(/^enc:/);
        expect(protectedValue).not.toBe(plainText);

        const revealedValue = await vault.reveal(protectedValue);
        expect(revealedValue).toBe(plainText);
    });

    it('should return the same value if not protected', async () => {
        const plainText = 'not-a-secret';
        const revealedValue = await vault.reveal(plainText);
        expect(revealedValue).toBe(plainText);
    });

    it('should identify protected values', () => {
        expect(vault.isProtected('enc:something')).toBe(true);
        expect(vault.isProtected('not-enc:something')).toBe(false);
    });

    it('should throw if encryption key is missing', () => {
        expect(() => new LocalEncryptionVault('')).toThrow();
    });
});
