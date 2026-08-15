import { describe, it, expect } from 'vitest';
import { classifyField } from '../fieldClassifier';

describe('classifyField', () => {
  it('classifies email type fields as email', () => {
    expect(classifyField({ type: 'email' })).toBe('email');
    expect(classifyField({ question: 'What is your email?' })).toBe('email');
  });

  it('classifies tel type fields as phone', () => {
    expect(classifyField({ type: 'tel' })).toBe('phone');
    expect(classifyField({ question: 'Phone number' })).toBe('phone');
  });

  it('classifies number type fields as numeric', () => {
    expect(classifyField({ type: 'number' })).toBe('numeric');
    expect(classifyField({ question: 'Years of experience?' })).toBe('numeric');
  });

  it('classifies select fields', () => {
    expect(classifyField({ tagName: 'select', options: ['A', 'B'] })).toBe('select');
    expect(classifyField({ options: ['Yes', 'No'] })).toBe('select');
  });

  it('classifies textarea with large maxLength as long_form', () => {
    expect(classifyField({ tagName: 'textarea', maxLength: 500 })).toBe('long_form');
    expect(classifyField({ tagName: 'textarea', maxLength: -1 })).toBe('long_form');
  });

  it('classifies textarea with small maxLength as short_text', () => {
    expect(classifyField({ tagName: 'textarea', maxLength: 50 })).toBe('short_text');
  });

  it('classifies long questions (>80 chars) as long_form', () => {
    const question = 'Describe your experience working with distributed systems and how you have handled scaling challenges in production environments.';
    expect(classifyField({ question })).toBe('long_form');
  });

  it('classifies keyword-triggered questions as long_form', () => {
    expect(classifyField({ question: 'Describe your leadership style' })).toBe('long_form');
    expect(classifyField({ question: 'Tell us about a challenge you overcame' })).toBe('long_form');
    expect(classifyField({ question: 'Why do you want to work here?' })).toBe('long_form');
    expect(classifyField({ question: 'Explain your experience with TypeScript' })).toBe('long_form');
  });

  it('classifies short text inputs as short_text by default', () => {
    expect(classifyField({ type: 'text', question: 'First name' })).toBe('short_text');
    expect(classifyField({ type: 'text', question: 'City' })).toBe('short_text');
  });

  it('classifies contenteditable with large maxLength as long_form', () => {
    expect(classifyField({ tagName: 'div', maxLength: 2000 })).toBe('long_form');
  });

  it('classifies salary question as numeric', () => {
    expect(classifyField({ question: 'What is your expected salary?' })).toBe('numeric');
    expect(classifyField({ question: 'Compensation expectations?' })).toBe('numeric');
  });

  it('classifies cover letter question as long_form', () => {
    expect(classifyField({ question: 'Write a cover letter explaining your fit for this role' })).toBe('long_form');
  });

  // --- Real-browser contract: payload sends maxLength: undefined when no attribute is set ---
  // jsdom cannot reproduce the DOM IDL default (input.maxLength === 524288), so we test the
  // contract between the content script (which now sends `undefined` when there is no
  // `maxlength` attribute) and the classifier.

  it('classifies a plain input with no maxLength as short_text (not long_form)', () => {
    expect(classifyField({ tagName: 'input', type: 'text', maxLength: undefined, question: 'First name' })).toBe('short_text');
    expect(classifyField({ tagName: 'input', maxLength: undefined, question: 'Employer' })).toBe('short_text');
  });

  it('classifies a textarea with no maxLength and rows >= 3 as long_form', () => {
    expect(classifyField({ tagName: 'textarea', maxLength: undefined, rows: 8, question: 'Experience' })).toBe('long_form');
  });

  it('classifies a single-row textarea with no maxLength and no keyword as short_text', () => {
    expect(classifyField({ tagName: 'textarea', maxLength: undefined, rows: 1, question: 'Nickname' })).toBe('short_text');
  });

  it('classifies a contenteditable div with no maxLength falling back to keywords', () => {
    expect(classifyField({ tagName: 'div', maxLength: undefined, question: 'Tell us about yourself' })).toBe('long_form');
    expect(classifyField({ tagName: 'div', maxLength: undefined, question: 'Notes' })).toBe('short_text');
  });

  it('checks semantic short hints before using rows as a long-form fallback', () => {
    expect(classifyField({ tagName: 'textarea', maxLength: undefined, rows: 6, question: 'Coupon code' })).toBe('short_text');
    expect(classifyField({ tagName: 'textarea', maxLength: undefined, rows: 6, question: 'Describe your experience' })).toBe('long_form');
    expect(classifyField({ tagName: 'textarea', maxLength: undefined, rows: 6, question: 'Experience' })).toBe('long_form');
  });
});
