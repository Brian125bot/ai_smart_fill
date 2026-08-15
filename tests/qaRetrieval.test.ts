import { describe, it, expect } from 'vitest';
import { retrieveRelevantQAs, tokenize } from '../qaRetrieval';

describe('tokenize', () => {
  it('splits and lowercases text', () => {
    const tokens = tokenize('Hello World');
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
  });

  it('removes stop words', () => {
    const tokens = tokenize('What is the best approach?');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('is');
  });

  it('removes punctuation', () => {
    const tokens = tokenize('hello-world! test@example.com');
    expect(tokens).not.toContain('hello-world!');
    expect(tokens).toContain('hello');
  });
});

describe('retrieveRelevantQAs', () => {
  const qas = [
    { question: 'What is your experience with TypeScript?', answer: '5+ years...' },
    { question: 'Describe your leadership style.', answer: 'Collaborative...' },
    { question: 'Why do you want to work here?', answer: 'Great culture...' },
    { question: 'What is your salary expectation?', answer: '$150k' },
    { question: 'Tell us about a challenging project.', answer: 'Led migration...' },
  ];

  it('returns empty for empty Q&A bank', () => {
    expect(retrieveRelevantQAs('test', [])).toEqual([]);
  });

  it('returns empty for empty question', () => {
    expect(retrieveRelevantQAs('', qas)).toEqual([]);
  });

  it('returns matching QAs for relevant question', () => {
    const result = retrieveRelevantQAs('Tell me about your TypeScript experience', qas, 3);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].question).toContain('TypeScript');
  });

  it('respects topN limit', () => {
    const result = retrieveRelevantQAs('experience leadership salary challenge', qas, 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('ranks more relevant results higher', () => {
    const result = retrieveRelevantQAs('leadership management style', qas, 3);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].question).toContain('leadership');
  });

  it('returns empty when no overlap', () => {
    const result = retrieveRelevantQAs('quantum physics relativity', qas, 3);
    expect(result.length).toBe(0);
  });
});
