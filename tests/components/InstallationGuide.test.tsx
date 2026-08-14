// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstallationGuide } from '../../src/components/InstallationGuide';
import { downloadExtensionZip } from '../../src/utils/zipGenerator';

vi.mock('../../src/utils/zipGenerator', () => ({
  downloadExtensionZip: vi.fn(async () => {}),
}));

describe('InstallationGuide', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the installation steps', () => {
    render(<InstallationGuide />);
    expect(screen.getByText(/How to Install & Load the Extension/)).toBeInTheDocument();
    expect(screen.getAllByText(/chrome:\/\/extensions/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Load unpacked/).length).toBeGreaterThan(0);
  });

  it('triggers a ZIP download', () => {
    render(<InstallationGuide />);
    fireEvent.click(screen.getByText('Download Extension Package (.zip)'));
    expect(downloadExtensionZip).toHaveBeenCalled();
  });
});
