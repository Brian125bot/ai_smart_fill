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

  it('does not emit an Access-Control-Allow-Origin header when no origin is present', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('reflects an IPv6 loopback origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://[::1]:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://[::1]:5173');
  });

  it('restricts chrome-extension origin to the configured EXTENSION_ID', async () => {
    const previous = process.env.EXTENSION_ID;
    process.env.EXTENSION_ID = 'abc123';
    try {
      const restrictedApp = await makeApp(inertFakeAi());
      const allowed = await request(restrictedApp).get('/api/health').set('Origin', 'chrome-extension://abc123');
      expect(allowed.headers['access-control-allow-origin']).toBe('chrome-extension://abc123');

      const denied = await request(restrictedApp).get('/api/health').set('Origin', 'chrome-extension://other');
      expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.EXTENSION_ID;
      else process.env.EXTENSION_ID = previous;
    }
  });

  it('answers preflight OPTIONS with 204', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBe(204);
  });
});
