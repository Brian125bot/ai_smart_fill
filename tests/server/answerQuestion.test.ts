import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { makeApp, makeFakeAi } from '../helpers';

describe('POST /answerQuestion', () => {
  it('rejects a missing or empty question with 400', async () => {
    const app = await makeApp();
    const missing = await request(app).post('/answerQuestion').send({});
    expect(missing.status).toBe(400);

    const blank = await request(app).post('/answerQuestion').send({ question: '   ' });
    expect(blank.status).toBe(400);
  });

  it('returns an answer and the effective model', async () => {
    const ai = makeFakeAi(() => ({ text: 'Jane Doe' }));
    const app = await makeApp(ai);
    const res = await request(app)
      .post('/answerQuestion')
      .send({ question: 'What is the full name?', model: 'gemini-3.6-flash' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('Jane Doe');
    expect(res.body.model).toBe('gemini-3.6-flash');
  });

  it('grounds the answer in text context', async () => {
    let captured: any;
    const ai = makeFakeAi((args) => {
      captured = args;
      return { text: 'answer' };
    });
    const app = await makeApp(ai);
    await request(app)
      .post('/answerQuestion')
      .send({ question: 'Q?', context: { type: 'text', data: 'GROUNDING TEXT' } });
    expect(captured.contents).toContain('Context:');
    expect(captured.contents).toContain('GROUNDING TEXT');
    expect(captured.contents).toContain('Question:');
  });

  it('sends PDF context as inlineData with the base64 prefix stripped', async () => {
    let captured: any;
    const ai = makeFakeAi((args) => {
      captured = args;
      return { text: 'answer' };
    });
    const app = await makeApp(ai);
    await request(app)
      .post('/answerQuestion')
      .send({
        question: 'Q?',
        context: { type: 'pdf', data: 'data:application/pdf;base64,ABC123', mimeType: 'application/pdf' },
      });
    expect(captured.contents.parts[0].inlineData.data).toBe('ABC123');
    expect(captured.contents.parts[0].inlineData.mimeType).toBe('application/pdf');
  });

  it('passes systemInstruction through to the model config', async () => {
    let captured: any;
    const ai = makeFakeAi((args) => {
      captured = args;
      return { text: 'answer' };
    });
    const app = await makeApp(ai);
    await request(app)
      .post('/answerQuestion')
      .send({ question: 'Q?', systemInstruction: 'Be concise' });
    expect(captured.config.systemInstruction).toBe('Be concise');
  });

  it('defaults to the default model when none is provided', async () => {
    let captured: any;
    const ai = makeFakeAi((args) => {
      captured = args;
      return { text: 'answer' };
    });
    const app = await makeApp(ai);
    await request(app).post('/answerQuestion').send({ question: 'Q?' });
    expect(captured.model).toBe('gemini-3.7-flash');
  });

  it('uses cached context/profile when a pairingToken is supplied', async () => {
    let captured: any;
    const ai = makeFakeAi((args) => {
      captured = args;
      return { text: 'answer' };
    });
    const app = await makeApp(ai);

    await request(app).post('/api/syncProfile').send({
      pairingToken: 'cached-token',
      systemInstruction: 'cached-instruction',
      selectedModel: 'gemini-3.5-flash',
      profileFields: { fullName: 'Grace Hopper' },
      profiles: [{ id: 'p1', name: 'P' }],
      activeProfileId: 'p1',
    });

    await request(app).post('/answerQuestion').send({ question: 'Name?', pairingToken: 'cached-token' });
    expect(captured.model).toBe('gemini-3.5-flash');
    expect(captured.config.systemInstruction).toBe('cached-instruction');
  });

  it('cleans diagnostic essay answers to an empty string', async () => {
    const ai = makeFakeAi(() => ({
      text: "Failed to execute 'fetch' on 'Window' — please check the network.",
    }));
    const app = await makeApp(ai);
    const res = await request(app).post('/answerQuestion').send({ question: 'Q?' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('');
  });
});
