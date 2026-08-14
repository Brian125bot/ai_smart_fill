// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InteractivePlayground } from '../../src/components/InteractivePlayground';

describe('InteractivePlayground', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders the playground title and form fields', () => {
    render(<InteractivePlayground />);
    expect(screen.getByText('Interactive Form Autofill Playground')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Legal Name/)).toBeInTheDocument();
  });

  it('fills a single field via the answerQuestion endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ answer: 'Jane Doe', model: 'gemini-3.7-flash' }),
      }))
    );

    render(<InteractivePlayground />);
    const autofillButtons = screen.getAllByText('Autofill');
    fireEvent.click(autofillButtons[0]);

    await waitFor(() => expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument());
  });

  it('switches the grounding context source', () => {
    render(<InteractivePlayground />);
    fireEvent.click(screen.getByText('No Context'));
    expect(screen.getByText('Plain Question Mode')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Page Text'));
    expect(screen.getByText('Simulated Web Page Text Context:')).toBeInTheDocument();
  });

  it('autofills the entire form sequentially', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ answer: 'VALUE', model: 'gemini-3.7-flash' }),
      }))
    );

    render(<InteractivePlayground />);
    fireEvent.click(screen.getByText('Autofill Entire Form with Gemini'));

    await waitFor(() => expect(screen.getAllByDisplayValue('VALUE').length).toBeGreaterThan(0));
  });
});
