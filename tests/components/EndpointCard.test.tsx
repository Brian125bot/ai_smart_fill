// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EndpointCard } from '../../src/components/EndpointCard';

describe('EndpointCard', () => {
  afterEach(() => vi.clearAllMocks());

  it('renders the endpoint URL and copies it', () => {
    render(<EndpointCard />);
    expect(screen.getByText('/answerQuestion')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Copy URL'));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('switches between curl, fetch and python snippets', () => {
    render(<EndpointCard />);
    expect(screen.getByText('cURL')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Python'));
    expect(screen.getByText(/import requests/)).toBeInTheDocument();
  });
});
