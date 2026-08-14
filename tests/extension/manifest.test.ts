import { describe, it, expect } from 'vitest';
import { MANIFEST_JSON } from '../../src/extensionSource';

describe('Chrome extension manifest.json', () => {
  const manifest = JSON.parse(MANIFEST_JSON);

  it('is a Manifest V3 extension', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBeTruthy();
    expect(manifest.version).toBeTruthy();
  });

  it('declares the expected permissions', () => {
    expect(manifest.permissions).toEqual(
      expect.arrayContaining(['storage', 'unlimitedStorage', 'activeTab', 'scripting'])
    );
    expect(manifest.host_permissions).toContain('<all_urls>');
  });

  it('configures the background service worker', () => {
    expect(manifest.background.service_worker).toBe('background.js');
  });

  it('configures the content script on all URLs', () => {
    const cs = manifest.content_scripts[0];
    expect(cs.matches).toContain('<all_urls>');
    expect(cs.js).toContain('content.js');
    expect(cs.css).toContain('content.css');
    expect(cs.run_at).toBe('document_idle');
  });

  it('references icons at the extension root (regression)', () => {
    expect(manifest.action.default_icon['16']).toBe('icon16.png');
    expect(manifest.action.default_icon['48']).toBe('icon48.png');
    expect(manifest.action.default_icon['128']).toBe('icon128.png');
    expect(manifest.icons['16']).toBe('icon16.png');
    expect(manifest.icons['48']).toBe('icon48.png');
    expect(manifest.icons['128']).toBe('icon128.png');
    // Icons must live at the root, not in a subfolder.
    for (const path of Object.values(manifest.icons) as string[]) {
      expect(path).not.toContain('/');
    }
  });
});
