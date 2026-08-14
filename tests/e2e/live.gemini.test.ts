import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server';

const RUN_LIVE = process.env.RUN_LIVE === '1';

// Gated: only runs when RUN_LIVE=1 (requires a real GEMINI_API_KEY).
// Validates that the configured model IDs actually resolve against the real API.
describe.skipIf(!RUN_LIVE)('live Gemini integration', () => {
  it('answers a simple question with a non-empty result', async () => {
    const app = await createApp({ serveStatic: false });
    const res = await request(app)
      .post('/answerQuestion')
      .send({
        question: 'Reply with the single word OK',
        systemInstruction: 'Reply with only the word OK.',
      });
    expect(res.status).toBe(200);
    expect(typeof res.body.answer).toBe('string');
    expect(res.body.answer.length).toBeGreaterThan(0);
  }, 30000);

  it('fills a batch form with parseable JSON', async () => {
    const app = await createApp({ serveStatic: false });
    const res = await request(app)
      .post('/batchAnswerForm')
      .send({ fields: [{ id: 'name', question: 'What is a common first name?' }] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.answers)).toBe(true);
    expect(res.body.answers[0].answer.length).toBeGreaterThan(0);
  }, 30000);
});
