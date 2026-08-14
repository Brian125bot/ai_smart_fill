import { vi } from 'vitest';
import { createApp } from '../server';

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
export async function makeApp(aiClient: any = makeFakeAi()) {
  return createApp({ aiClient, serveStatic: false });
}

/** Convenience: a fixed fake client for endpoints that never call Gemini. */
export function inertFakeAi() {
  return makeFakeAi(() => ({ text: 'unused' }));
}
