import { describe, it, expect } from 'vitest';
import { EXTENSION_FILES } from '../../src/extensionSource';

describe('EXTENSION_FILES bundle', () => {
  it('contains the 7 expected files with correct paths', () => {
    const paths = EXTENSION_FILES.map((f) => f.path).sort();
    expect(paths).toEqual([
      'background.js',
      'content.css',
      'content.js',
      'manifest.json',
      'popup.css',
      'popup.html',
      'popup.js',
    ]);
  });

  it('contains no stale auth or cloud references', () => {
    const forbidden = [
      'Bearer',
      'Authorization',
      'AUTH_',
      'firebase',
      'Firebase',
      'googleapis',
      'GoogleDrive',
      'google.picker',
      'getAuth',
      'signInWithPopup',
    ];
    for (const file of EXTENSION_FILES) {
      for (const token of forbidden) {
        expect(file.content, `${file.path} must not contain "${token}"`).not.toContain(token);
      }
    }
  });
});
