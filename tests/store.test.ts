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

  it('resolves email and userId aliases after a restart', () => {
    const store = new FileBackedContextStore(TEST_DATA_DIR);
    const ctx = makeContext('canon-tok', { email: 'a@b.com', userId: 'user-9' });
    store.set('canon-tok', ctx);
    store.set('user-9', ctx);
    store.set('a@b.com', ctx);

    const reloaded = new FileBackedContextStore(TEST_DATA_DIR);
    expect(reloaded.get('canon-tok')?.email).toBe('a@b.com');
    expect(reloaded.get('user-9')?.email).toBe('a@b.com');
    expect(reloaded.get('A@B.COM')?.email).toBe('a@b.com');
  });

  it('keeps distinct tokens separate even when sanitized names collide', () => {
    const store = new FileBackedContextStore(TEST_DATA_DIR);
    store.set('a/b', makeContext('a/b', { displayName: 'Slash' }));
    store.set('a_b', makeContext('a_b', { displayName: 'Under' }));

    expect(store.get('a/b')?.displayName).toBe('Slash');
    expect(store.get('a_b')?.displayName).toBe('Under');

    const reloaded = new FileBackedContextStore(TEST_DATA_DIR);
    expect(reloaded.get('a/b')?.displayName).toBe('Slash');
    expect(reloaded.get('a_b')?.displayName).toBe('Under');
  });

  it('remembers edits made via an alias after a restart (no rollback)', () => {
    const store = new FileBackedContextStore(TEST_DATA_DIR);
    const ctx = makeContext('canon', {
      email: 'x@y.com',
      profiles: [{ id: 'p1', profileFields: { customQAs: [] } }],
    });
    store.set('canon', ctx);
    store.set('x@y.com', ctx); // alias

    // Simulate /api/rememberAnswer: edit via the canonical token and persist.
    const edited = store.get('canon')!;
    edited.profiles![0].profileFields.customQAs.push({ id: 'qa1', question: 'Q', answer: 'A' });
    store.set('canon', edited);

    const reloaded = new FileBackedContextStore(TEST_DATA_DIR);
    const viaAlias = reloaded.get('x@y.com');
    expect(viaAlias?.profiles?.[0]?.profileFields?.customQAs).toHaveLength(1);
  });

  it('deleting an alias preserves the canonical context', () => {
    const store = new FileBackedContextStore(TEST_DATA_DIR);
    const ctx = makeContext('canon-delete-alias', { email: 'delete@example.com', userId: 'delete-user' });
    store.set('canon-delete-alias', ctx);
    store.set('delete@example.com', ctx);
    store.set('delete-user', ctx);

    store.delete('delete@example.com');

    expect(store.get('canon-delete-alias')).toBeDefined();
    expect(store.get('delete@example.com')).toBeUndefined();
    expect(store.get('delete-user')).toBeDefined();

    const reloaded = new FileBackedContextStore(TEST_DATA_DIR);
    expect(reloaded.get('canon-delete-alias')).toBeDefined();
    expect(reloaded.get('delete@example.com')).toBeUndefined();
    expect(reloaded.get('delete-user')).toBeDefined();
  });

  it('deleting the canonical token prunes all aliases', () => {
    const store = new FileBackedContextStore(TEST_DATA_DIR);
    const ctx = makeContext('canon-delete-all', { email: 'all@example.com', userId: 'all-user' });
    store.set('canon-delete-all', ctx);
    store.set('all@example.com', ctx);
    store.set('all-user', ctx);

    store.delete('canon-delete-all');

    expect(store.get('canon-delete-all')).toBeUndefined();
    expect(store.get('all@example.com')).toBeUndefined();
    expect(store.get('all-user')).toBeUndefined();

    const reloaded = new FileBackedContextStore(TEST_DATA_DIR);
    expect(reloaded.get('canon-delete-all')).toBeUndefined();
    expect(reloaded.get('all@example.com')).toBeUndefined();
    expect(reloaded.get('all-user')).toBeUndefined();
  });

  it('deleting a lowercase canonical token removes the canonical record', () => {
    const store = new FileBackedContextStore(TEST_DATA_DIR);
    store.set('Canon-Delete-Lower', makeContext('Canon-Delete-Lower'));

    store.delete('canon-delete-lower');

    expect(store.get('Canon-Delete-Lower')).toBeUndefined();
  });
});
