import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { looksLikeErrorLeak, getContextType, logLeak } from '../errorLeak';

describe('getContextType', () => {
  it('returns "pdf" when context.type === "pdf"', () => {
    expect(getContextType({ type: 'pdf', data: 'x' })).toBe('pdf');
  });
  it('returns "text" when context.type === "text"', () => {
    expect(getContextType({ type: 'text', data: 'x' })).toBe('text');
  });
  it('returns "none" for null, undefined, or unknown types', () => {
    expect(getContextType(null)).toBe('none');
    expect(getContextType(undefined)).toBe('none');
    expect(getContextType({})).toBe('none');
    expect(getContextType({ type: 'image' })).toBe('none');
  });
});

describe('looksLikeErrorLeak — retired four-phrase leak set', () => {
  // These four are the original hardcoded substring checks. They must still trip
  // even after the structural refactor so historical leaks continue to be blanked.
  it('flags "Failed to execute \'fetch\'" phrasing', () => {
    const r = looksLikeErrorLeak("Failed to execute 'fetch' on 'Window' — please check the network.");
    expect(r.leaked).toBe(true);
    expect(r.reason).toBe('failed_execute');
  });

  it('flags "non iso-8859-1" phrasing', () => {
    const r = looksLikeErrorLeak('non iso-8859-1 code point');
    expect(r.leaked).toBe(true);
    expect(r.reason).toBe('encoding');
  });

  it('flags the exact "based on the error message and context" retired phrasing', () => {
    const r = looksLikeErrorLeak(
      'Based on the error message and context, here is the analysis of what went wrong.'
    );
    expect(r.leaked).toBe(true);
    expect(r.reason).toBe('based_on_error');
  });

  it('flags the "### the error" retired heading phrasing', () => {
    const r = looksLikeErrorLeak('### The Error\nSomething went wrong with the request.');
    expect(r.leaked).toBe(true);
    expect(r.reason).toBe('markdown_error_heading');
  });
});

describe('looksLikeErrorLeak — structural cues', () => {
  it('flags V8 exception headers like TypeError:', () => {
    const r = looksLikeErrorLeak('TypeError: fetch failed\n at fetch (app.js:10:5)');
    expect(r.leaked).toBe(true);
    expect(r.reason).toBe('exception_header');
  });

  it('flags V8 stack frames (at NAME (file:line:col))', () => {
    const r = looksLikeErrorLeak('    at fetch (https://example.com/bundle.js:42:11)');
    expect(r.leaked).toBe(true);
    expect(r.reason).toBe('stack_frame');
  });

  it('flags Python traceback', () => {
    const r = looksLikeErrorLeak('Traceback (most recent call last):\n  File "x.py", line 1');
    expect(r.leaked).toBe(true);
    expect(r.reason).toBe('traceback');
  });

  it('flags file paths with line numbers (e.g. /usr/src/app/server.ts:42:11)', () => {
    const r = looksLikeErrorLeak('Failure at /usr/src/app/server.ts:42:11');
    expect(r.leaked).toBe(true);
    expect(r.reason).toBe('file_path');
  });

  it('flags Windows-style file paths with line numbers', () => {
    const r = looksLikeErrorLeak('at C:\\Users\\dev\\app\\src\\server.ts:42');
    expect(r.leaked).toBe(true);
  });

  it('flags code fences containing throw new Error', () => {
    const r = looksLikeErrorLeak('Here is the trace:\n\n```\nthrow new Error("boom")\n```');
    expect(r.leaked).toBe(true);
    expect(r.reason).toBe('code_fence');
  });

  it('flags code fences containing Traceback', () => {
    const r = looksLikeErrorLeak('```\nTraceback (most recent call last):\n  File "x.py", line 1\n```');
    expect(r.leaked).toBe(true);
    // Traceback inside a fence is still flagged — either by the strong single-signal
    // `traceback` rule or by `code_fence` if the traceback were stripped. Either is correct.
    expect(['code_fence', 'traceback']).toContain(r.reason);
  });

  it('flags code fences containing a stack frame', () => {
    const r = looksLikeErrorLeak('```js\n    at foo (bundle.js:1:1)\n```');
    expect(r.leaked).toBe(true);
    // Strong single-signal `stack_frame` may fire before `code_fence`. Either is correct.
    expect(['code_fence', 'stack_frame']).toContain(r.reason);
  });

  it('flags long diagnostic essays that mix Error: with framing words', () => {
    const long = 'a'.repeat(260) + ' Error: something failed. Based on the context, the analysis is ...';
    const r = looksLikeErrorLeak(long);
    expect(r.leaked).toBe(true);
  });
});

describe('looksLikeErrorLeak — legitimate long-form answers must NOT trigger', () => {
  it('does not flag STAR-format "describe a failure" answer with "Based on the error, I traced it..."', () => {
    const star = [
      'At my previous role, I had to handle a critical production failure.',
      'Based on the error, I traced it to a memory leak in the cache layer.',
      'I worked with the team to deploy a fix within 4 hours, preventing ongoing customer impact.',
    ].join(' ');
    const r = looksLikeErrorLeak(star);
    expect(r).toEqual({ leaked: false, reason: '' });
  });

  it('does not flag a STAR-format answer that mentions TypeError', () => {
    const star =
      'When I encountered a TypeError in our payment service, I worked with the team to debug it. ' +
      'We traced the issue to a race condition and shipped a fix within 2 hours.';
    const r = looksLikeErrorLeak(star);
    expect(r).toEqual({ leaked: false, reason: '' });
  });

  it('does not flag a markdown-headed long-form answer about handling an error', () => {
    const text = [
      '## Handling a Critical Production Error',
      '',
      'In 2022, I led the response to a major outage. I coordinated across three teams and restored',
      'service within 90 minutes while documenting the post-mortem for future prevention.',
    ].join('\n');
    const r = looksLikeErrorLeak(text);
    expect(r).toEqual({ leaked: false, reason: '' });
  });

  it('does not flag a legitimate Python code sample in a code fence', () => {
    const text = [
      'Here is a sample Python function:',
      '',
      '```python',
      'def greet(name):',
      '    return f"Hello, {name}"',
      '',
      'print(greet("World"))',
      '```',
      '',
      'This demonstrates basic string formatting.',
    ].join('\n');
    const r = looksLikeErrorLeak(text);
    expect(r).toEqual({ leaked: false, reason: '' });
  });

  it('does not flag a legitimate JavaScript code sample in a code fence', () => {
    const text = [
      'Example:',
      '```js',
      'function add(a, b) {',
      '  return a + b;',
      '}',
      '```',
    ].join('\n');
    const r = looksLikeErrorLeak(text);
    expect(r).toEqual({ leaked: false, reason: '' });
  });

  it('does not flag a code fence with a comment that mentions "error"', () => {
    const text = [
      '```js',
      '// Handle the error gracefully',
      'try {',
      '  doThing();',
      '} catch (e) {',
      '  log(e);',
      '}',
      '```',
    ].join('\n');
    const r = looksLikeErrorLeak(text);
    expect(r).toEqual({ leaked: false, reason: '' });
  });

  it('does not flag a behavioral long-form answer that mentions "root cause"', () => {
    const text =
      'In my last role, I identified a root cause of a customer churn spike by analyzing support tickets. ' +
      'I presented findings to leadership and we shipped a self-serve onboarding flow that cut churn by 18%.';
    const r = looksLikeErrorLeak(text);
    expect(r).toEqual({ leaked: false, reason: '' });
  });

  it('does not flag a behavioral answer that apologizes for an error', () => {
    const text =
      'I apologize for the error in my last submission. The corrected answer is 42, not 24.';
    const r = looksLikeErrorLeak(text);
    expect(r).toEqual({ leaked: false, reason: '' });
  });

  it('does not flag short-form answers (name, email, phone)', () => {
    expect(looksLikeErrorLeak('Ada Lovelace')).toEqual({ leaked: false, reason: '' });
    expect(looksLikeErrorLeak('ada@example.com')).toEqual({ leaked: false, reason: '' });
    expect(looksLikeErrorLeak('+1 555 123 4567')).toEqual({ leaked: false, reason: '' });
  });

  it('does not flag empty or non-string input', () => {
    expect(looksLikeErrorLeak('')).toEqual({ leaked: false, reason: '' });
    expect(looksLikeErrorLeak(null as unknown as string)).toEqual({ leaked: false, reason: '' });
    expect(looksLikeErrorLeak(undefined as unknown as string)).toEqual({ leaked: false, reason: '' });
  });
});

describe('logLeak', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('emits a structured JSON log entry with tag, endpoint, fieldId, contextType, reason, and raw preview', () => {
    logLeak({
      endpoint: '/answerQuestion',
      question: 'What is your name?',
      contextType: 'pdf',
      model: 'gemini-3.7-flash',
      reason: 'exception_header',
      raw: 'TypeError: something failed',
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(entry.tag).toBe('error_leak');
    expect(entry.endpoint).toBe('/answerQuestion');
    expect(entry.fieldId).toBeNull();
    expect(entry.question).toBe('What is your name?');
    expect(entry.contextType).toBe('pdf');
    expect(entry.model).toBe('gemini-3.7-flash');
    expect(entry.reason).toBe('exception_header');
    expect(entry.rawPreview).toBe('TypeError: something failed');
    expect(entry.rawLength).toBe(27);
    expect(entry.truncated).toBe(false);
  });

  it('truncates the raw preview to 4000 chars and flags truncation', () => {
    const big = 'x'.repeat(5000);
    logLeak({
      endpoint: '/batchAnswerForm',
      fieldId: 'f1',
      question: 'Q?',
      contextType: 'none',
      reason: 'code_fence',
      raw: big,
    });
    const entry = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(entry.rawPreview).toHaveLength(4000);
    expect(entry.rawLength).toBe(5000);
    expect(entry.truncated).toBe(true);
    expect(entry.fieldId).toBe('f1');
  });
});
