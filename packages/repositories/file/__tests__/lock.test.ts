import { describe, expect, it } from 'vitest';
import { readLock, writeLock } from '../src/lock.js';

describe('lock', () => {
  const key = 'test-lock-key';

  describe('readLock', () => {
    it('acquires and releases via dispose', async () => {
      const lock = await readLock(key);
      lock[Symbol.dispose]();
    });

    it('allows multiple concurrent readers', async () => {
      const r1 = await readLock(key);
      const r2 = await readLock(key);
      r1[Symbol.dispose]();
      r2[Symbol.dispose]();
    });
  });

  describe('writeLock', () => {
    it('acquires and releases via dispose', async () => {
      const lock = await writeLock(key);
      lock[Symbol.dispose]();
    });

    it('excludes other writer while held', async () => {
      const w1 = await writeLock(key);
      let w2Acquired = false;
      const w2Promise = writeLock(key).then((w2) => {
        w2Acquired = true;
        w2[Symbol.dispose]();
      });
      await new Promise((r) => setTimeout(r, 20));
      expect(w2Acquired).toBe(false);
      w1[Symbol.dispose]();
      await w2Promise;
      expect(w2Acquired).toBe(true);
    });

    it('writer waits for readers to finish', async () => {
      const r1 = await readLock(key);
      let writerAcquired = false;
      const writerPromise = writeLock(key).then((w) => {
        writerAcquired = true;
        w[Symbol.dispose]();
      });
      await new Promise((r) => setTimeout(r, 10));
      expect(writerAcquired).toBe(false);
      r1[Symbol.dispose]();
      await writerPromise;
      expect(writerAcquired).toBe(true);
    });

    it('readers wait for writer to finish', async () => {
      const w = await writeLock(key);
      let readerAcquired = false;
      const readerPromise = readLock(key).then((r) => {
        readerAcquired = true;
        r[Symbol.dispose]();
      });
      await new Promise((r) => setTimeout(r, 10));
      expect(readerAcquired).toBe(false);
      w[Symbol.dispose]();
      await readerPromise;
      expect(readerAcquired).toBe(true);
    });
  });
});
