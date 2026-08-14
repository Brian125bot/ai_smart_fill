import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BACKGROUND_JS } from '../../src/extensionSource';

function loadBackground(chromeMock: any, fetchMock: any) {
  const code =
    BACKGROUND_JS +
    '\n;globalThis.__bg = { toEndpoint, handleBatchAnswerForm, handleAnswerQuestion, handleTestEndpoint };';
  const fn = new Function('chrome', 'fetch', code);
  fn(chromeMock, fetchMock);
  return (globalThis as any).__bg;
}

function makeChrome(store: Record<string, any> = {}) {
  return {
    storage: {
      local: { get: vi.fn(async () => store) },
    },
    runtime: {
      onMessage: { addListener: vi.fn() },
    },
  };
}

describe('background.js toEndpoint', () => {
  let bg: any;
  beforeEach(() => {
    delete (globalThis as any).__bg;
    bg = loadBackground(makeChrome(), vi.fn());
  });
  afterEach(() => {
    delete (globalThis as any).__bg;
  });

  it('resolves a bare origin to the batch endpoint', () => {
    expect(bg.toEndpoint('http://localhost:3000', '/batchAnswerForm')).toBe(
      'http://localhost:3000/batchAnswerForm'
    );
  });

  it('swaps /answerQuestion for /batchAnswerForm', () => {
    expect(bg.toEndpoint('http://localhost:3000/answerQuestion', '/batchAnswerForm')).toBe(
      'http://localhost:3000/batchAnswerForm'
    );
  });

  it('keeps an already-correct batch endpoint unchanged', () => {
    expect(bg.toEndpoint('http://localhost:3000/batchAnswerForm', '/batchAnswerForm')).toBe(
      'http://localhost:3000/batchAnswerForm'
    );
  });

  it('swaps /batchAnswerForm for /answerQuestion', () => {
    expect(bg.toEndpoint('http://localhost:3000/batchAnswerForm', '/answerQuestion')).toBe(
      'http://localhost:3000/answerQuestion'
    );
  });

  it('returns an empty string for an empty base', () => {
    expect(bg.toEndpoint('', '/batchAnswerForm')).toBe('');
  });
});

describe('background.js handleBatchAnswerForm', () => {
  let fetchMock: any;
  let bg: any;

  beforeEach(() => {
    delete (globalThis as any).__bg;
    fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ success: true, answers: [] }),
    }));
    const store = {
      backendUrl: 'http://localhost:3000/answerQuestion',
      pairingToken: 'local-user-profile',
      selectedModel: 'gemini-3.6-flash',
      pdfData: 'BASE64PDF',
      pdfMimeType: 'application/pdf',
      systemInstruction: 'sys',
    };
    bg = loadBackground(makeChrome(store), fetchMock);
  });

  afterEach(() => {
    delete (globalThis as any).__bg;
  });

  it('POSTs to the derived batch URL with pairingToken, model, pdf context and headers', async () => {
    await bg.handleBatchAnswerForm({
      fields: [{ id: 'a', question: 'q' }],
      pageContext: { title: 'T' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/batchAnswerForm');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.pairingToken).toBe('local-user-profile');
    expect(body.model).toBe('gemini-3.6-flash');
    expect(body.context.type).toBe('pdf');
    expect(body.context.data).toBe('BASE64PDF');
    expect(body.systemInstruction).toBe('sys');
    expect(body.fields).toHaveLength(1);
  });
});

describe('background.js handleAnswerQuestion', () => {
  it('POSTs a single question to the answer endpoint', async () => {
    delete (globalThis as any).__bg;
    const fetchMock = vi.fn(async (..._args: any[]) => ({
      ok: true,
      json: async () => ({ answer: 'Ada', model: 'gemini-3.7-flash' }),
    }));
    const store = { backendUrl: 'http://localhost:3000/batchAnswerForm', pairingToken: 'tok' };
    const bg = loadBackground(makeChrome(store), fetchMock);

    const res = await bg.handleAnswerQuestion({ question: 'Name?' });
    expect(res.answer).toBe('Ada');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/answerQuestion');
  });
});
