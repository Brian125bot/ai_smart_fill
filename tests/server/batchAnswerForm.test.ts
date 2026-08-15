import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp, makeFakeAi } from '../helpers';

const FIELDS = [
  { id: 'full_name', question: 'Full name?' },
  { id: 'email', question: 'Email?' },
];

describe('POST /batchAnswerForm', () => {
  it('rejects empty or missing fields with 400', async () => {
    const app = await makeApp();
    const missing = await request(app).post('/batchAnswerForm').send({});
    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);

    const empty = await request(app).post('/batchAnswerForm').send({ fields: [] });
    expect(empty.status).toBe(400);
  });

  it('parses a valid JSON array response', async () => {
    const ai = makeFakeAi(() => ({
      text: JSON.stringify([
        { id: 'full_name', question: 'Full name?', answer: 'Ada', confidence: 0.9, reasoning: 'r' },
      ]),
    }));
    const app = await makeApp(ai);
    const res = await request(app).post('/batchAnswerForm').send({ fields: FIELDS });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.answers[0].answer).toBe('Ada');
    expect(res.body.modelUsed).toBe('gemini-3.7-flash');
  });

  it('strips markdown fences before parsing', async () => {
    const ai = makeFakeAi(() => ({
      text: '```json\n[{ "id": "full_name", "answer": "Ada" }]\n```',
    }));
    const app = await makeApp(ai);
    const res = await request(app).post('/batchAnswerForm').send({ fields: FIELDS });
    expect(res.status).toBe(200);
    expect(res.body.answers[0].answer).toBe('Ada');
  });

  it('unwraps a { answers: [...] } object', async () => {
    const ai = makeFakeAi(() => ({
      text: JSON.stringify({ answers: [{ id: 'full_name', answer: 'Grace' }] }),
    }));
    const app = await makeApp(ai);
    const res = await request(app).post('/batchAnswerForm').send({ fields: FIELDS });
    expect(res.status).toBe(200);
    expect(res.body.answers[0].answer).toBe('Grace');
  });

  it('returns 500 when Gemini output cannot be parsed', async () => {
    const ai = makeFakeAi(() => ({ text: 'this is not json at all' }));
    const app = await makeApp(ai);
    const res = await request(app).post('/batchAnswerForm').send({ fields: FIELDS });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('unparseable');
  });

  it('sanitizes diagnostic essay answers to empty string', async () => {
    const ai = makeFakeAi(() => ({
      text: JSON.stringify([{ id: 'full_name', answer: "Failed to execute 'fetch'" }]),
    }));
    const app = await makeApp(ai);
    const res = await request(app).post('/batchAnswerForm').send({ fields: FIELDS });
    expect(res.status).toBe(200);
    expect(res.body.answers[0].answer).toBe('');
  });

  it('includes pageContext in the prompt', async () => {
    let captured: any;
    const ai = makeFakeAi((args) => {
      captured = args;
      return { text: '[]' };
    });
    const app = await makeApp(ai);
    await request(app).post('/batchAnswerForm').send({
      fields: FIELDS,
      pageContext: { title: 'TechCorp', url: 'https://x.test', headings: ['Apply'] },
    });
    expect(captured.contents).toContain('Page Title: TechCorp');
    expect(captured.contents).toContain('URL: https://x.test');
  });

  it('sends PDF context as inlineData', async () => {
    let captured: any;
    const ai = makeFakeAi((args) => {
      captured = args;
      return { text: '[]' };
    });
    const app = await makeApp(ai);
    await request(app).post('/batchAnswerForm').send({
      fields: FIELDS,
      context: { type: 'pdf', data: 'data:application/pdf;base64,XYZ', mimeType: 'application/pdf' },
    });
    expect(captured.contents.parts[0].inlineData.data).toBe('XYZ');
  });

  it('classifies fields and routes long-form to dedicated prompts', async () => {
    const callLog: string[] = [];
    const ai = makeFakeAi((args) => {
      const text = typeof args.contents === 'string' ? args.contents : args.contents?.parts?.[1]?.text || '';
      if (text.includes('Full name?') && text.includes('Task:')) {
        callLog.push('batch');
        return { text: JSON.stringify([{ id: 'full_name', question: 'Full name?', answer: 'Ada' }]) };
      }
      if (text.includes('Describe your experience') && text.includes('Character limit:')) {
        callLog.push('long_form');
        return { text: 'I have 5+ years of experience with TypeScript and React.' };
      }
      return { text: '[]' };
    });
    const app = await makeApp(ai);
    const res = await request(app).post('/batchAnswerForm').send({
      fields: [
        { id: 'full_name', question: 'Full name?', tagName: 'input' },
        { id: 'experience', question: 'Describe your experience with distributed systems', maxLength: 2000, tagName: 'textarea', rows: 8 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(callLog).toContain('batch');
    expect(callLog).toContain('long_form');
    expect(res.body.answers).toHaveLength(2);
  });

  it('returns long-form answers with style metadata', async () => {
    const ai = makeFakeAi((args) => {
      const text = typeof args.contents === 'string' ? args.contents : args.contents?.parts?.[1]?.text || '';
      if (text.includes('Describe your leadership')) {
        return { text: 'I lead with a collaborative approach.' };
      }
      return { text: JSON.stringify([]) };
    });
    const app = await makeApp(ai);
    const res = await request(app).post('/batchAnswerForm').send({
      fields: [
        { id: 'leadership', question: 'Describe your leadership style', maxLength: 500, tagName: 'textarea' },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.answers[0].style).toBe('long_form');
    expect(res.body.answers[0].answer.length).toBeLessThanOrEqual(500);
  });
});
