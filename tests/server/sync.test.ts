import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { makeApp, inertFakeAi } from '../helpers';

describe('POST /api/syncProfile', () => {
  let app: any;
  beforeAll(async () => {
    app = await makeApp(inertFakeAi());
  });

  it('rejects a missing pairing token with 400', async () => {
    const res = await request(app).post('/api/syncProfile').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('stores context under the pairing token and returns a summary', async () => {
    const res = await request(app).post('/api/syncProfile').send({
      pairingToken: 'tok-sync-1',
      profiles: [{ id: 'p1', name: 'Persona A' }],
      activeProfileId: 'p1',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pairingToken).toBe('tok-sync-1');
    expect(res.body.profilesCount).toBe(1);
    expect(res.body.activeProfileId).toBe('p1');
  });

  it('derives context from the active profile when top-level fields are absent', async () => {
    const res = await request(app).post('/api/syncProfile').send({
      pairingToken: 'tok-sync-2',
      profiles: [
        {
          id: 'p2',
          name: 'Persona B',
          systemInstruction: 'Be concise',
          selectedModel: 'gemini-3.5-flash',
          profileFields: { fullName: 'Ada Lovelace' },
        },
      ],
      activeProfileId: 'p2',
    });

    const get = await request(app).get('/api/userContext/tok-sync-2');
    expect(get.status).toBe(200);
    expect(get.body.context.systemInstruction).toBe('Be concise');
    expect(get.body.context.selectedModel).toBe('gemini-3.5-flash');
    expect(get.body.context.userProfile.fullName).toBe('Ada Lovelace');
  });

  it('stores an alias under the lowercased email', async () => {
    await request(app).post('/api/syncProfile').send({
      pairingToken: 'tok-sync-3',
      email: 'TestUser@Example.com',
      profiles: [{ id: 'p3', name: 'Persona C' }],
      activeProfileId: 'p3',
    });

    const res = await request(app).get('/api/userContext/testuser@example.com');
    expect(res.status).toBe(200);
    expect(res.body.context.pairingToken).toBe('tok-sync-3');
  });
});

describe('GET /api/userContext/:token', () => {
  let app: any;
  beforeAll(async () => {
    app = await makeApp(inertFakeAi());
    await request(app).post('/api/syncProfile').send({
      pairingToken: 'local-user-profile',
      profiles: [{ id: 'p1', name: 'Persona' }],
      activeProfileId: 'p1',
    });
  });

  it('returns cached context for a known token', async () => {
    const res = await request(app).get('/api/userContext/local-user-profile');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.source).toBe('server_cache');
    expect(res.body.context.pairingToken).toBe('local-user-profile');
  });

  it('returns 404 for an unknown token with a helpful message', async () => {
    const res = await request(app).get('/api/userContext/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('No synced context found');
  });
});

describe('POST /api/userContext', () => {
  let app: any;
  beforeAll(async () => {
    app = await makeApp(inertFakeAi());
    await request(app).post('/api/syncProfile').send({
      pairingToken: 'post-token',
      profiles: [{ id: 'p1', name: 'Persona' }],
      activeProfileId: 'p1',
    });
  });

  it('rejects missing token with 400', async () => {
    const res = await request(app).post('/api/userContext').send({});
    expect(res.status).toBe(400);
  });

  it('resolves via body pairingToken', async () => {
    const res = await request(app).post('/api/userContext').send({ pairingToken: 'post-token' });
    expect(res.status).toBe(200);
    expect(res.body.context.pairingToken).toBe('post-token');
  });

  it('resolves via query token', async () => {
    const res = await request(app).post('/api/userContext?token=post-token').send({});
    expect(res.status).toBe(200);
    expect(res.body.context.pairingToken).toBe('post-token');
  });

  it('returns 404 for unknown token', async () => {
    const res = await request(app).post('/api/userContext').send({ pairingToken: 'nope' });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/purgeContext", () => {
  let app: any;
  beforeAll(async () => {
    app = await makeApp(inertFakeAi());
    await request(app).post("/api/syncProfile").send({
      pairingToken: "purge-tok",
      email: "PurgeUser@Example.com",
      userId: "purge-user-id",
      profiles: [{ id: "p1", name: "Persona" }],
      activeProfileId: "p1",
    });
  });

  it("rejects missing token with 400", async () => {
    const res = await request(app).post("/api/purgeContext").send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 for unknown token", async () => {
    const res = await request(app).post("/api/purgeContext").send({ pairingToken: "non-existent" });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("purges context and associated aliases successfully", async () => {
    const res = await request(app).post("/api/purgeContext").send({ pairingToken: "purge-tok" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("purged successfully");

    const getCanon = await request(app).get("/api/userContext/purge-tok");
    expect(getCanon.status).toBe(404);

    const getEmail = await request(app).get("/api/userContext/purgeuser@example.com");
    expect(getEmail.status).toBe(404);
  });

  it("purges context specified via query string", async () => {
    await request(app).post("/api/syncProfile").send({
      pairingToken: "query-purge-tok",
      profiles: [{ id: "p1", name: "Persona" }],
      activeProfileId: "p1",
    });

    const res = await request(app).post("/api/purgeContext?token=query-purge-tok").send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await request(app).get("/api/userContext/query-purge-tok");
    expect(check.status).toBe(404);
  });
});
