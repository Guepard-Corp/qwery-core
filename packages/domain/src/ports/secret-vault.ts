/**
 * Secret vault port — abstracts secret encryption/storage. Backed by the OS
 * keychain by default, with an encrypted file fallback (ADR #19).
 */
export interface ISecretVault {
  /** Store a secret value; returns a protected handle (e.g. `enc:...`). */
  protect(value: string, context: { keyName: string; datasourceId?: string }): Promise<string>;

  /** Retrieve the plaintext secret from a protected handle. */
  reveal(protectedValue: string): Promise<string>;

  /** True if `value` is a protected handle owned by this vault. */
  isProtected(value: string): boolean;
}
