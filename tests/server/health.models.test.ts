import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import { makeApp, inertFakeAi } from '../helpers';

describe('GET /api/health', () => {
  let app: any;
  const originalKey = process.env.GEMINI_API_KEY;

  beforeAll(async () => {
    app = await makeApp(inertFakeAi());
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it('returns ok with default model and supported models', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.model).toBe('gemini-3.7-flash');
    expect(Array.isArray(res.body.supportedModels)).toBe(true);
    expect(res.body.supportedModels).toContain('gemini-3.7-flash');
  });

  it('reports apiKeyConfigured true when GEMINI_API_KEY is set', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const res = await request(app).get('/api/health');
    expect(res.body.apiKeyConfigured).toBe(true);
  });

  it('reports apiKeyConfigured false when GEMINI_API_KEY is unset', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await request(app).get('/api/health');
    expect(res.body.apiKeyConfigured).toBe(false);
  });
});

describe('GET /api/models', () => {
  let app: any;

  beforeAll(async () => {
    app = await makeApp(inertFakeAi());
  });

  it('returns default model and model list with a default flag', async () => {
    const res = await request(app).get('/api/models');
    expect(res.status).toBe(200);
    expect(res.body.defaultModel).toBe('gemini-3.7-flash');
    expect(Array.isArray(res.body.models)).toBe(true);
    expect(res.body.models.length).toBeGreaterThanOrEqual(6);
    expect(res.body.models.some((m: any) => m.isDefault)).toBe(true);
  });
});
