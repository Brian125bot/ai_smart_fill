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
  private aliases = new Map<string, string>();

  get(token: string): SyncedUserContext | undefined {
    const lower = token.toLowerCase();
    const direct = this.cache.get(token) || this.cache.get(lower);
    if (direct) return direct;
    const canonical = this.aliases.get(lower);
    if (!canonical) return undefined;
    return this.cache.get(canonical) || this.cache.get(canonical.toLowerCase());
  }

  set(token: string, context: SyncedUserContext): void {
    const canonical = context.pairingToken;
    this.cache.set(canonical, context);
    this.cache.set(canonical.toLowerCase(), context);
    if (token.toLowerCase() !== canonical.toLowerCase()) {
      this.aliases.set(token.toLowerCase(), canonical);
    }
  }

  delete(token: string): void {
    const lower = token.toLowerCase();
    const direct = this.cache.get(token) || this.cache.get(lower);
    const aliasTarget = this.aliases.get(lower);
    const isAlias = Boolean(aliasTarget && (!direct || direct.pairingToken.toLowerCase() !== lower));

    if (isAlias) {
      this.aliases.delete(lower);
      return;
    }

    const canonical = direct ? direct.pairingToken : token;

    if (canonical) {
      this.cache.delete(canonical);
      this.cache.delete(canonical.toLowerCase());
      for (const [alias, target] of this.aliases) {
        if (target.toLowerCase() === canonical.toLowerCase()) {
          this.aliases.delete(alias);
        }
      }
    }

    this.cache.delete(token);
    this.cache.delete(lower);
  }

  has(token: string): boolean {
    return !!this.get(token);
  }

  keys(): IterableIterator<string> {
    const distinct = new Set<string>();
    for (const ctx of this.cache.values()) distinct.add(ctx.pairingToken);
    return distinct.keys();
  }

  size(): number {
    const distinct = new Set<string>();
    for (const ctx of this.cache.values()) distinct.add(ctx.pairingToken);
    return distinct.size;
  }
}