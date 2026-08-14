// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContextHub } from '../../src/components/ContextHub';

describe('ContextHub', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('renders the header and default personas', () => {
    render(<ContextHub />);
    expect(screen.getByText('Context & Persona Profiles')).toBeInTheDocument();
    expect(screen.getAllByText('Tech Lead & Cloud Architect').length).toBeGreaterThan(0);
    expect(screen.getByText('Local Mode')).toBeInTheDocument();
  });

  it('saves config to localStorage and syncs to the backend', async () => {
    const fetchMock = vi.fn(async (..._args: any[]) => ({ ok: true, json: async () => ({ success: true }) }));
    vi.stubGlobal('fetch', fetchMock);

    render(<ContextHub onModelChange={() => {}} />);
    fireEvent.click(screen.getByText('Save & Sync Personas'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe('/api/syncProfile');

    const stored = localStorage.getItem('gemini_dashboard_context_config');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.pairingToken).toBeUndefined();
    expect(parsed.profiles.length).toBeGreaterThan(0);
  });

  it('switches the active persona', () => {
    render(<ContextHub />);
    fireEvent.click(screen.getByText('AI / GenAI Specialist'));
    // The AI persona now appears in both the carousel and the "Active Persona" indicator.
    expect(screen.getAllByText('AI / GenAI Specialist').length).toBeGreaterThan(1);
  });

  it('renders the AI instructions sub-tab', () => {
    render(<ContextHub />);
    fireEvent.click(screen.getByText('Persona AI Instructions & Model'));
    expect(screen.getByText(/System Instruction/)).toBeInTheDocument();
    expect(screen.getByText('Preferred Gemini Model Architecture')).toBeInTheDocument();
  });

  it('renders the documents sub-tab', () => {
    render(<ContextHub />);
    fireEvent.click(screen.getByText('Resume / PDF Document Grounding'));
    expect(screen.getByText(/Grounding Resume PDF/)).toBeInTheDocument();
    expect(screen.getByText('Or Paste Raw Text Knowledge Base')).toBeInTheDocument();
  });

  it('renders the context inspector sub-tab', () => {
    render(<ContextHub />);
    fireEvent.click(screen.getByText('Context Inspector'));
    expect(screen.getByText(/Assembled Context Inspector/)).toBeInTheDocument();
  });

  it('creates a new persona', () => {
    render(<ContextHub />);
    fireEvent.click(screen.getByText('New Persona'));
    expect(screen.getAllByText(/New Persona \d/).length).toBeGreaterThan(0);
  });

  it('adds a custom Q&A entry', () => {
    render(<ContextHub />);
    fireEvent.click(screen.getByText('Add Question'));
    expect(
      screen.getAllByPlaceholderText(/notice period or earliest start date/i).length
    ).toBeGreaterThan(0);
  });

  it('runs the live batch form tester', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        answers: [{ id: 'full_name', question: 'Full Legal Name', answer: 'Ada' }],
        timeMs: 123,
        modelUsed: 'gemini-3.7-flash',
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    render(<ContextHub />);
    fireEvent.click(screen.getByText(/Live Batch Form Autofill/));
    fireEvent.click(screen.getByText('Fill All 12 Fields in 1 Request'));

    await waitFor(() => expect(screen.getByDisplayValue('Ada')).toBeInTheDocument());
  });

  it('duplicates the active persona', () => {
    render(<ContextHub />);
    fireEvent.click(screen.getByText('Duplicate'));
    expect(screen.getAllByText(/\(Copy\)/).length).toBeGreaterThan(0);
  });

  it('renames the active persona', () => {
    render(<ContextHub />);
    fireEvent.click(screen.getByTitle('Rename Persona'));
    const input = screen.getByDisplayValue('Tech Lead & Cloud Architect');
    fireEvent.change(input, { target: { value: 'Renamed Persona' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getAllByText('Renamed Persona').length).toBeGreaterThan(0);
  });

  it('deletes a persona', () => {
    render(<ContextHub />);
    const before = screen.getAllByText(/Cloud Architect|GenAI Specialist|Vendor/).length;
    fireEvent.click(screen.getByTitle('Delete Persona'));
    // The default active persona (Tech Lead & Cloud Architect) is removed.
    expect(screen.queryByText('Tech Lead & Cloud Architect')).not.toBeInTheDocument();
    expect(before).toBeGreaterThan(0);
  });

  it('edits the raw text knowledge base', () => {
    render(<ContextHub />);
    fireEvent.click(screen.getByText('Resume / PDF Document Grounding'));
    const textarea = screen.getByPlaceholderText(
      /Paste additional notes, publications, or project summaries/
    );
    fireEvent.change(textarea, { target: { value: 'New context' } });
    expect(screen.getByDisplayValue('New context')).toBeInTheDocument();
  });
});
