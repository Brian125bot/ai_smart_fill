import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateWithRetryAndFallback } from '../../server';

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

function fakeAi(behavior: (model: string, callIndex: number) => { text?: string; error?: any }) {
  let calls = 0;
  const generateContent = vi.fn(async ({ model }: any) => {
    const r = behavior(model, calls++);
    if (r.error) throw r.error;
    return { text: r.text ?? '' };
  });
  return { models: { generateContent } };
}

const ZERO_BACKOFF = () => 0;

describe('generateWithRetryAndFallback', () => {
  it('returns the answer on the first model', async () => {
    const ai = fakeAi(() => ({ text: 'ok' }));
    const res = await generateWithRetryAndFallback(ai as any, 'gemini-3.7-flash', 'prompt', {}, ZERO_BACKOFF);
    expect(res.text).toBe('ok');
    expect(res.effectiveModel).toBe('gemini-3.7-flash');
    expect(ai.models.generateContent).toHaveBeenCalledTimes(1);
  });

  it('retries on a transient 503 then succeeds', async () => {
    const ai = fakeAi((_m, i) => (i === 0 ? { error: { message: '503 UNAVAILABLE' } } : { text: 'recovered' }));
    const res = await generateWithRetryAndFallback(ai as any, 'gemini-3.7-flash', 'p', {}, ZERO_BACKOFF);
    expect(res.text).toBe('recovered');
    expect(ai.models.generateContent).toHaveBeenCalledTimes(2);
  });

  it('retries on 429', async () => {
    const ai = fakeAi((_m, i) => (i === 0 ? { error: { message: '429 too many' } } : { text: 'ok' }));
    const res = await generateWithRetryAndFallback(ai as any, 'gemini-3.7-flash', 'p', {}, ZERO_BACKOFF);
    expect(res.text).toBe('ok');
  });

  it('throws immediately on a non-transient error (no retry)', async () => {
    const ai = fakeAi(() => ({ error: { message: '400 INVALID_ARGUMENT: bad request' } }));
    await expect(
      generateWithRetryAndFallback(ai as any, 'gemini-3.7-flash', 'p', {}, ZERO_BACKOFF)
    ).rejects.toThrow('INVALID_ARGUMENT');
    expect(ai.models.generateContent).toHaveBeenCalledTimes(1);
  });

  it('falls through to the next model on NOT_FOUND (regression)', async () => {
    const ai = fakeAi((model) =>
      model === 'gemini-3.7-flash' ? { text: 'fell-back' } : { error: { message: '404 NOT_FOUND model' } }
    );
    const res = await generateWithRetryAndFallback(ai as any, 'gemini-custom', 'p', {}, ZERO_BACKOFF);
    expect(res.effectiveModel).toBe('gemini-3.7-flash');
    expect(res.text).toBe('fell-back');
  });

  it('throws the last error after exhausting all models', async () => {
    const ai = fakeAi(() => ({ error: { message: '503 exhausted' } }));
    await expect(
      generateWithRetryAndFallback(ai as any, 'gemini-3.7-flash', 'p', {}, ZERO_BACKOFF)
    ).rejects.toThrow('503 exhausted');
  });

  it('deduplicates the requested model from the fallback chain', async () => {
    const ai = fakeAi(() => ({ error: { message: '503 nope' } }));
    await expect(
      generateWithRetryAndFallback(ai as any, 'gemini-3.7-flash', 'p', {}, ZERO_BACKOFF)
    ).rejects.toThrow();
    // 6 unique models * 3 attempts each
    expect(ai.models.generateContent).toHaveBeenCalledTimes(18);
  });
});
