import { vi } from 'vitest';
import { createApp } from '../server';
import type { ContextStore, SyncedUserContext } from '../store';

export interface FakeGenArgs {
  model: string;
  contents: any;
  config?: Record<string, any>;
}

/**
 * Builds a fake GoogleGenAI-shaped client whose `models.generateContent` is a mock.
 * `handler` receives the resolved args and may return `{ text }` or throw.
 */
export function makeFakeAi(
  handler?: (args: FakeGenArgs) => { text?: string } | Promise<{ text?: string }>
) {
  const generateContent = vi.fn(async (args: FakeGenArgs) => {
    if (handler) return handler(args);
    return { text: 'ok' };
  });
  return {
    models: { generateContent },
  } as any;
}

/** Builds the Express app without static serving and with an injected (fake) Gemini client. */
export async function makeApp(aiClient: any = makeFakeAi(), contextStore: ContextStore = new InMemoryContextStore()) {
  return createApp({ aiClient, serveStatic: false, contextStore });
}

/** Convenience: a fixed fake client for endpoints that never call Gemini. */
export function inertFakeAi() {
  return makeFakeAi(() => ({ text: 'unused' }));
}

/**
 * In-memory ContextStore used by default in tests so the suite never touches
 * the real ./data directory (which could overwrite a developer's synced profile
 * or leak state between runs). Mirrors the read/write semantics of
 * FileBackedContextStore but keeps everything in a Map.
 */
export class InMemoryContextStore implements ContextStore {
  private cache = new Map<string, SyncedUserContext>();

  get(token: string): SyncedUserContext | undefined {
    return this.cache.get(token) || this.cache.get(token.toLowerCase());
  }

  set(token: string, context: SyncedUserContext): void {
    this.cache.set(token, context);
    if (token.toLowerCase() !== token) {
      this.cache.set(token.toLowerCase(), context);
    }
  }

  delete(token: string): void {
    this.cache.delete(token);
    this.cache.delete(token.toLowerCase());
  }

  has(token: string): boolean {
    return this.cache.has(token) || this.cache.has(token.toLowerCase());
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  size(): number {
    return this.cache.size;
  }
}
