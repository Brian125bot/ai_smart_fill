// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { POPUP_HTML, POPUP_JS } from '../../src/extensionSource';

function makePopupChrome(store: Record<string, any> = {}) {
  let saved: Record<string, any> | null = null;
  const chrome = {
    storage: {
      local: {
        get: (keys: any, cb: any) => cb(store),
        set: (obj: any, cb: any) => {
          saved = obj;
          cb && cb();
        },
        remove: (keys: any, cb: any) => cb && cb(),
      },
    },
    runtime: {
      onMessage: { addListener: () => {} },
      sendMessage: () => Promise.resolve({}),
    },
    tabs: { query: () => Promise.resolve([]), sendMessage: () => Promise.resolve({}) },
  };
  return { chrome, getSaved: () => saved };
}

function setupPopup(store: Record<string, any> = {}) {
  const bodyHtml = POPUP_HTML.replace(/^[\s\S]*?<body>/, '').replace(/<\/body>[\s\S]*$/, '');
  document.body.innerHTML = bodyHtml;
  const { chrome, getSaved } = makePopupChrome(store);
  new Function('chrome', POPUP_JS)(chrome);
  document.dispatchEvent(new Event('DOMContentLoaded'));
  return getSaved;
}

describe('popup.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('loads the saved backend URL into the input on startup', async () => {
    setupPopup({ backendUrl: 'http://localhost:3000/batchAnswerForm' });
    await new Promise((r) => setTimeout(r, 0));
    const input = document.getElementById('backendUrl') as HTMLInputElement;
    expect(input.value).toBe('http://localhost:3000/batchAnswerForm');
  });

  it('persists settings when Save Local is clicked', async () => {
    const getSaved = setupPopup();
    await new Promise((r) => setTimeout(r, 0));

    const input = document.getElementById('backendUrl') as HTMLInputElement;
    input.value = 'http://localhost:3000/answerQuestion';
    document.getElementById('saveBtn')!.click();

    const saved = getSaved();
    expect(saved).not.toBeNull();
    expect(saved!.backendUrl).toBe('http://localhost:3000/answerQuestion');
    expect(saved!.selectedModel).toBe('gemini-3.7-flash');
  });
});
