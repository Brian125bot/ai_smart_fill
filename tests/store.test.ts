import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FileBackedContextStore, SyncedUserContext } from '../store';

const TEST_DATA_DIR = path.join(process.cwd(), 'data', 'test-store');

function cleanup() {
  try {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  } catch {
    // ignore
  }
}

function makeContext(token: string, overrides?: Partial<SyncedUserContext>): SyncedUserContext {
  return {
    pairingToken: token,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('FileBackedContextStore', () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it('stores and retrieves a context by exact token', () => {
    const store = new FileBackedContextStore(TEST_DATA_DIR);
    store.set('tok-1', makeContext('tok-1', { userId: 'user-1' }));
    const result = store.get('tok-1');
    expect(result?.userId).toBe('user-1');
  });

  it('retrieves by lowercase fallback', () => {
    const store = new FileBackedContextStore(TEST_DATA_DIR);
    store.set('Tok-Upper', makeContext('Tok-Upper'));
    const result = store.get('tok-upper');
    expect(result?.pairingToken).toBe('Tok-Upper');
  });

  it('persists to disk and reloads on construction', () => {
    let store = new FileBackedContextStore(TEST_DATA_DIR);
    store.set('persist-me', makeContext('persist-me', { email: 'test@example.com' }));

    // New store should load from disk
    store = new FileBackedContextStore(TEST_DATA_DIR);
    const result = store.get('persist-me');
    expect(result?.email).toBe('test@example.com');
  });

  it('deletes a token from memory and disk', () => {
    const store = new FileBackedContextStore(TEST_DATA_DIR);
    store.set('del-me', makeContext('del-me'));
    expect(store.has('del-me')).toBe(true);

    store.delete('del-me');
    expect(store.has('del-me')).toBe(false);
    expect(store.get('del-me')).toBeUndefined();
  });

  it('handles has() for existing and missing tokens', () => {
    const store = new FileBackedContextStore(TEST_DATA_DIR);
    store.set('exists', makeContext('exists'));
    expect(store.has('exists')).toBe(true);
    expect(store.has('nope')).toBe(false);
  });

  it('reports size correctly', () => {
    const store = new FileBackedContextStore(TEST_DATA_DIR);
    expect(store.size()).toBe(0);
    store.set('a', makeContext('a'));
    store.set('b', makeContext('b'));
    expect(store.size()).toBe(2);
  });

  it('overwrites an existing token', () => {
    const store = new FileBackedContextStore(TEST_DATA_DIR);
    store.set('overwrite', makeContext('overwrite', { userId: 'v1' }));
    store.set('overwrite', makeContext('overwrite', { userId: 'v2' }));
    expect(store.get('overwrite')?.userId).toBe('v2');
  });

  it('handles missing data directory gracefully', () => {
    const uniqueDir = `/tmp/nonexistent-dir-${Date.now()}`;
    const store = new FileBackedContextStore(uniqueDir);
    expect(store.size()).toBe(0);
    store.set('x', makeContext('x'));
    expect(store.has('x')).toBe(true);
    // cleanup
    try { fs.rmSync(uniqueDir, { recursive: true, force: true }); } catch {}
  });
});
