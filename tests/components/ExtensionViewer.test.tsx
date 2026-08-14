// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExtensionViewer } from '../../src/components/ExtensionViewer';
import { downloadExtensionZip } from '../../src/utils/zipGenerator';

vi.mock('../../src/utils/zipGenerator', () => ({
  downloadExtensionZip: vi.fn(async () => {}),
}));

describe('ExtensionViewer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the extension source files', () => {
    render(<ExtensionViewer />);
    expect(screen.getAllByText('manifest.json').length).toBeGreaterThan(0);
    expect(screen.getAllByText('popup.js').length).toBeGreaterThan(0);
    expect(screen.getAllByText('content.js').length).toBeGreaterThan(0);
  });

  it('triggers a ZIP download', () => {
    render(<ExtensionViewer />);
    fireEvent.click(screen.getByText('Download Full Extension (.zip)'));
    expect(downloadExtensionZip).toHaveBeenCalled();
  });
});
