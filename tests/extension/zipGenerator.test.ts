// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildExtensionZip } from '../../src/utils/zipGenerator';

describe('buildExtensionZip', () => {
  it('includes all source files and icons', async () => {
    const zip = await buildExtensionZip();
    const names = Object.keys(zip.files);
    expect(names).toContain('manifest.json');
    expect(names).toContain('popup.html');
    expect(names).toContain('popup.js');
    expect(names).toContain('popup.css');
    expect(names).toContain('background.js');
    expect(names).toContain('content.js');
    expect(names).toContain('content.css');
    expect(names).toContain('icon16.png');
    expect(names).toContain('icon48.png');
    expect(names).toContain('icon128.png');
  });

  it('places icons at the root, not in an icons/ subfolder (regression)', async () => {
    const zip = await buildExtensionZip();
    const names = Object.keys(zip.files);
    expect(names.some((n) => n.startsWith('icons/'))).toBe(false);
  });
});
