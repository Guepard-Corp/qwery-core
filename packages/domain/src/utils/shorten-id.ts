import Sqids from 'sqids';

const sqids = new Sqids({
  alphabet: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  minLength: 10,
});

/**
 * Convert UUID → SQID (short unique ID)
 * Generates a 10-character slug from the input ID
 */
export function shortenId(id: string): string {
  // Convert UUID string to bytes
  const encoder = new TextEncoder();
  const bytes = encoder.encode(id);

  // Create hash values from all bytes
  // Use simple hash algorithms that stay within safe integer range
  let hash1 = 0;
  let hash2 = 0;
  let hash3 = 0;

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]!; // Safe: loop guarantees i < bytes.length
    // Simple hash functions that distribute well
    hash1 = ((hash1 << 5) - hash1 + byte) | 0; // DJB2-like
    hash2 = (hash2 * 33 + byte) | 0; // Simple multiplicative
    hash3 = ((hash3 << 3) ^ (hash3 >> 28) ^ byte) | 0; // Bit rotation
  }

  // Ensure all values are positive and within safe integer range
  // Use modulo to keep within reasonable bounds for Sqids
  const MAX_SAFE = Number.MAX_SAFE_INTEGER;
  const numbers = [Math.abs(hash1) % MAX_SAFE, Math.abs(hash2) % MAX_SAFE, Math.abs(hash3) % MAX_SAFE];

  // Encode with minLength 10 - will return at least 10 characters (typically 14+)
  const encoded = sqids.encode(numbers);

  // Truncate to exactly 10 characters (sqids with minLength 10 always returns > 10)
  return encoded.slice(0, 10);
}
