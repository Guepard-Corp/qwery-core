export interface ISecretVault {
  /**
   * Encrypts or stores a secret value.
   * Returns a protected string (e.g., "enc:..." or "vault:...")
   */
  protect(
    value: string,
    context: { keyName: string; datasourceId?: string },
  ): Promise<string>;

  /**
   * Decrypts or retrieves a secret value from its protected form.
   */
  reveal(protectedValue: string): Promise<string>;

  /**
   * Helper to identify if a value is protected by this vault.
   */
  isProtected(value: string): boolean;
}
