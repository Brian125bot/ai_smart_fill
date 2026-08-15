import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server';
import { FileBackedContextStore } from '../../store';
import path from 'path';

const TEST_DATA_DIR = path.join(process.cwd(), 'data', 'test-remember');

function makeStore() {
  return new FileBackedContextStore(TEST_DATA_DIR);
}

describe('POST /api/rememberAnswer', () => {
  let store: FileBackedContextStore;

  beforeEach(() => {
    store = makeStore();
  });

  it('saves a Q&A to the active profile customQAs', async () => {
    store.set('tok-remember', {
      pairingToken: 'tok-remember',
      updatedAt: new Date().toISOString(),
      activeProfileId: 'p1',
      profiles: [{
        id: 'p1',
        name: 'Test Persona',
        profileFields: {
          customQAs: [{ id: 'qa-existing', question: 'Existing?', answer: 'Yes' }],
        },
      }],
    });

    const app = await createApp({ serveStatic: false, contextStore: store });
    const res = await request(app)
      .post('/api/rememberAnswer')
      .send({
        pairingToken: 'tok-remember',
        question: 'What is your leadership style?',
        answer: 'Collaborative and data-driven.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalQAs).toBe(2);

    // Verify it was saved
    const cached = store.get('tok-remember');
    const qas = cached?.profiles?.[0]?.profileFields?.customQAs;
    expect(qas).toHaveLength(2);
    expect(qas![1].question).toBe('What is your leadership style?');
    expect(qas![1].answer).toBe('Collaborative and data-driven.');
  });

  it('creates customQAs array if it does not exist', async () => {
    store.set('tok-new', {
      pairingToken: 'tok-new',
      updatedAt: new Date().toISOString(),
      activeProfileId: 'p1',
      profiles: [{
        id: 'p1',
        name: 'Test',
        profileFields: {},
      }],
    });

    const app = await createApp({ serveStatic: false, contextStore: store });
    const res = await request(app)
      .post('/api/rememberAnswer')
      .send({
        pairingToken: 'tok-new',
        question: 'Q?',
        answer: 'A.',
      });

    expect(res.status).toBe(200);
    expect(res.body.totalQAs).toBe(1);
  });

  it('returns 400 for missing pairingToken', async () => {
    const app = await createApp({ serveStatic: false, contextStore: store });
    const res = await request(app)
      .post('/api/rememberAnswer')
      .send({ question: 'Q?', answer: 'A.' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('pairingToken');
  });

  it('returns 400 for missing question or answer', async () => {
    store.set('tok', { pairingToken: 'tok', updatedAt: new Date().toISOString() });
    const app = await createApp({ serveStatic: false, contextStore: store });

    const res = await request(app)
      .post('/api/rememberAnswer')
      .send({ pairingToken: 'tok', question: 'Q?' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('answer');
  });

  it('returns 404 for unknown token', async () => {
    const app = await createApp({ serveStatic: false, contextStore: store });
    const res = await request(app)
      .post('/api/rememberAnswer')
      .send({ pairingToken: 'unknown', question: 'Q?', answer: 'A.' });

    expect(res.status).toBe(404);
  });
});
