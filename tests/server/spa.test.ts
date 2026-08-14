import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('SPA static serving (production)', () => {
  let app: any;
  let tmpDir: string;
  const prevCwd = process.cwd();
  const prevNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autofill-dist-'));
    const distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir);
    fs.writeFileSync(path.join(distDir, 'index.html'), '<html><body>HELLO_APP</body></html>');
    process.chdir(tmpDir);
    process.env.NODE_ENV = 'production';
    app = await createApp({ aiClient: {} as any, serveStatic: true });
  });

  afterAll(() => {
    process.env.NODE_ENV = prevNodeEnv;
    process.chdir(prevCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('serves index.html at the root', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('HELLO_APP');
  });

  it('falls back to index.html for unknown SPA routes', async () => {
    const res = await request(app).get('/some/deep/route');
    expect(res.status).toBe(200);
    expect(res.text).toContain('HELLO_APP');
  });
});
