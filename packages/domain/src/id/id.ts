import { z } from 'zod/v3';

const PREFIXES = {
  project: 'prj',
  organization: 'org',
  user: 'usr',
  datasource: 'dts',
  notebook: 'nbk',
  conversation: 'conv',
  message: 'msg',
  usage: 'usg',
} as const;

export type IdPrefix = keyof typeof PREFIXES;

const LENGTH = 26;

let lastTimestamp = 0;
let counter = 0;

function randomBase62(length: number): string {
  const chars =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = new Uint8Array(length);
  const crypto = globalThis.crypto;
  if (!crypto?.getRandomValues) {
    throw new Error('crypto.getRandomValues is not available');
  }
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i]! % 62];
  }
  return result;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const Id = {
  schema(prefix: IdPrefix) {
    return z.string().startsWith(`${PREFIXES[prefix]}_`);
  },

  create(prefix: IdPrefix, descending = false, timestamp?: number): string {
    const nowMs = timestamp ?? Date.now();
    const currentTimestamp = Math.floor(nowMs / 1000);

    if (currentTimestamp !== lastTimestamp) {
      lastTimestamp = currentTimestamp;
      counter = 0;
    }
    counter += 1;

    let now = BigInt(currentTimestamp) * BigInt(0x1000) + BigInt(counter);
    now = descending ? ~now : now;

    const timeBytes = new Uint8Array(6);
    for (let i = 0; i < 6; i++) {
      timeBytes[i] = Number((now >> BigInt(40 - 8 * i)) & BigInt(0xff));
    }

    return (
      PREFIXES[prefix] + '_' + bytesToHex(timeBytes) + randomBase62(LENGTH - 12)
    );
  },

  /** Extract timestamp (seconds since epoch) from an ascending ID. Does not work with descending IDs. */
  timestamp(id: string): number {
    const prefixPart = id.split('_')[0] ?? '';
    const hex = id.slice(prefixPart.length + 1, prefixPart.length + 13);
    const encoded = BigInt('0x' + hex);
    return Number(encoded / BigInt(0x1000));
  },
};
