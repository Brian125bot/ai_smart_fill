// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Header } from '../../src/components/Header';

describe('Header', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders brand, badge and navigation tabs', () => {
    render(<Header onTabChange={() => {}} activeTab="context-hub" />);
    expect(screen.getByText('Gemini Form Autofill')).toBeInTheDocument();
    expect(screen.getByText('Context & Profile Hub')).toBeInTheDocument();
    expect(screen.getByText('Form Playground & API')).toBeInTheDocument();
    expect(screen.getByText('Chrome Setup Guide')).toBeInTheDocument();
  });

  it('calls onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<Header onTabChange={onTabChange} activeTab="context-hub" />);
    fireEvent.click(screen.getByText('Form Playground & API'));
    expect(onTabChange).toHaveBeenCalledWith('playground');
  });

  it('shows the active model name after fetching health', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          status: 'ok',
          model: 'gemini-3.7-flash',
          appUrl: null,
          apiKeyConfigured: true,
          timestamp: '',
        }),
      }))
    );
    render(
      <Header onTabChange={() => {}} activeTab="context-hub" selectedModel="gemini-3.7-flash" />
    );
    await waitFor(() => expect(screen.getByText('Gemini 3.7 Flash')).toBeInTheDocument());
  });
});
