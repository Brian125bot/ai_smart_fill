// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelSelector } from '../../src/components/ModelSelector';

describe('ModelSelector', () => {
  afterEach(() => vi.clearAllMocks());

  it('renders the currently selected model name', () => {
    render(<ModelSelector selectedModel="gemini-3.7-flash" onModelChange={() => {}} />);
    expect(screen.getByText('Gemini 3.7 Flash')).toBeInTheDocument();
  });

  it('calls onModelChange when a model is selected', () => {
    const onModelChange = vi.fn();
    render(<ModelSelector selectedModel="gemini-3.7-flash" onModelChange={onModelChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Gemini 3.7 Flash/ }));
    fireEvent.click(screen.getByText('Gemini 3.6 Flash'));
    expect(onModelChange).toHaveBeenCalledWith('gemini-3.6-flash');
  });

  it('applies a custom model identifier', () => {
    const onModelChange = vi.fn();
    render(<ModelSelector selectedModel="gemini-3.7-flash" onModelChange={onModelChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Gemini 3.7 Flash/ }));

    const input = screen.getByPlaceholderText('Enter custom Gemini model ID...');
    fireEvent.change(input, { target: { value: 'gemini-custom-99' } });
    fireEvent.click(screen.getByText('Apply'));
    expect(onModelChange).toHaveBeenCalledWith('gemini-custom-99');
  });
});
