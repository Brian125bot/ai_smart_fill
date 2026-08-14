// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';

describe('App', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders the dashboard and switches between tabs', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ status: 'ok', model: 'gemini-3.7-flash', apiKeyConfigured: true, supportedModels: [] }),
      }))
    );

    render(<App />);

    // Default tab is the context hub.
    expect(screen.getAllByText('Context & Persona Profiles').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Form Playground & API'));
    expect(screen.getByText('Interactive Form Autofill Playground')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Chrome Setup Guide'));
    expect(screen.getByText(/How to Install & Load the Extension/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Extension Source Files'));
    expect(screen.getByText(/Manifest V3 Chrome Extension Source Package/)).toBeInTheDocument();
  });
});
