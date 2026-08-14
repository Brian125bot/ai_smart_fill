import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { makeApp, inertFakeAi } from '../helpers';

describe('CORS middleware', () => {
  let app: any;
  beforeAll(async () => {
    app = await makeApp(inertFakeAi());
  });

  it('reflects an allowed localhost origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('reflects a chrome-extension origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'chrome-extension://abc123');
    expect(res.headers['access-control-allow-origin']).toBe('chrome-extension://abc123');
  });

  it('does not reflect a disallowed origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('falls back to * when no origin is present', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('answers preflight OPTIONS with 204', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBe(204);
  });
});
