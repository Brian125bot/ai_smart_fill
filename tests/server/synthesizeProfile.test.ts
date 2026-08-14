import { describe, it, expect } from 'vitest';
import { synthesizeProfileContext } from '../../server';

describe('synthesizeProfileContext', () => {
  it('returns empty string for null/undefined/empty profiles', () => {
    expect(synthesizeProfileContext(null)).toBe('');
    expect(synthesizeProfileContext(undefined)).toBe('');
    expect(synthesizeProfileContext({})).toBe('');
  });

  it('renders known fields into a grounding block', () => {
    const out = synthesizeProfileContext({
      fullName: 'Ada Lovelace',
      jobTitle: 'Engineer',
      email: 'ada@example.com',
      phone: '555',
      location: 'London',
      yearsOfExperience: '10',
      education: 'PhD',
      coreSkills: 'TS, Node',
      portfolioUrl: 'https://ada.dev',
      linkedinUrl: 'https://linkedin/ada',
      githubUrl: 'https://github/ada',
      bioSummary: 'Summary text',
    });
    expect(out).toContain('Name: Ada Lovelace');
    expect(out).toContain('Title / Role: Engineer');
    expect(out).toContain('Email: ada@example.com');
    expect(out).toContain('Phone: 555');
    expect(out).toContain('Summary: Summary text');
  });

  it('renders custom Q&A references', () => {
    const out = synthesizeProfileContext({
      fullName: 'Ada',
      customQAs: [
        { question: 'Authorized?', answer: 'Yes' },
        { question: '', answer: 'skipped' },
        { question: 'Salary?', answer: '' },
      ],
    });
    expect(out).toContain('Q1: Authorized?');
    expect(out).toContain('A: Yes');
    expect(out).not.toContain('skipped');
  });
});
