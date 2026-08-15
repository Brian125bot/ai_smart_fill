// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { CONTENT_JS } from '../../src/extensionSource';

function cssEscape(value: string) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c);
}

function makeChrome(store: Record<string, any> = {}) {
  const messageListeners: Array<(msg: any) => void> = [];
  return {
    storage: {
      local: {
        get: vi.fn(async () => store),
        set: vi.fn(async () => {}),
        remove: vi.fn(async () => {}),
      },
    },
    runtime: {
      onMessage: { addListener: (fn: any) => messageListeners.push(fn) },
      sendMessage: vi.fn(),
      _listeners: messageListeners,
    },
  };
}

function loadContent(chromeMock: any) {
  // Strip leading comment lines so `return (...)` can wrap the IIFE safely.
  const noComments = CONTENT_JS.replace(/^(\s*\/\/[^\n]*\n)+/, '');
  const idx = noComments.lastIndexOf('})();');
  const transformed =
    noComments.slice(0, idx) +
    'return { getFillableFields, extractQuestionForField, applyAnswerToField, startBatchFormAutofill }; })();';
  // Neutralize the injection guard so the IIFE always runs in tests.
  const cleaned = transformed
    .replace('if (window.__geminiAutofillInjected) return;', '')
    .replace('window.__geminiAutofillInjected = true;', '');
  const fn = new Function('chrome', 'return ' + cleaned);
  return fn(chromeMock);
}

describe('content.js', () => {
  beforeAll(() => {
    (globalThis as any).CSS = (globalThis as any).CSS || {};
    if (!(globalThis as any).CSS.escape) {
      (globalThis as any).CSS.escape = cssEscape;
    }
    // jsdom reports zero offset sizes; make elements appear visible.
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => 100,
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 20,
    });
  });

  beforeEach(() => {
    document.body.innerHTML = '';
    delete (globalThis as any).window.__geminiAutofillInjected;
    (window as any).__geminiAutofillInjected = undefined;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('getFillableFields', () => {
    it('returns visible, enabled fillable elements only', () => {
      const normal = document.createElement('input');
      normal.id = 'a';
      const disabled = document.createElement('input');
      disabled.id = 'b';
      disabled.disabled = true;
      const area = document.createElement('textarea');
      const select = document.createElement('select');
      document.body.append(normal, disabled, area, select);

      const chrome = makeChrome();
      const content = loadContent(chrome);
      const fields = content.getFillableFields();

      expect(fields).toHaveLength(3);
      expect(fields).toContain(normal);
      expect(fields).not.toContain(disabled);
      expect(fields).toContain(area);
      expect(fields).toContain(select);
    });
  });

  describe('extractQuestionForField', () => {
    it('uses a linked label first', () => {
      const label = document.createElement('label');
      label.setAttribute('for', 'fld1');
      label.innerText = 'Full Name';
      const input = document.createElement('input');
      input.id = 'fld1';
      document.body.append(label, input);

      const content = loadContent(makeChrome());
      expect(content.extractQuestionForField(input)).toBe('Full Name');
    });

    it('does not throw for CSS-invalid ids (CSS.escape regression)', () => {
      const input = document.createElement('input');
      input.id = 'user"email';
      input.name = 'user_email';
      document.body.append(input);

      const content = loadContent(makeChrome());
      // Must not throw; falls back to the name heuristic when the id is CSS-invalid.
      expect(() => content.extractQuestionForField(input)).not.toThrow();
      expect(content.extractQuestionForField(input)).toBe('user email');
    });

    it('falls back to placeholder then name', () => {
      const byPlaceholder = document.createElement('input');
      byPlaceholder.placeholder = 'Enter email';
      document.body.append(byPlaceholder);
      const content = loadContent(makeChrome());
      expect(content.extractQuestionForField(byPlaceholder)).toBe('Enter email');

      const byName = document.createElement('input');
      byName.name = 'phone_number';
      document.body.append(byName);
      expect(content.extractQuestionForField(byName)).toBe('phone number');
    });

    it('uses aria-label', () => {
      const input = document.createElement('input');
      input.setAttribute('aria-label', 'Phone');
      document.body.append(input);
      const content = loadContent(makeChrome());
      expect(content.extractQuestionForField(input)).toBe('Phone');
    });
  });

  describe('applyAnswerToField', () => {
    it('sets input value and dispatches input/change events', () => {
      const input = document.createElement('input');
      document.body.append(input);
      const inputEvent = vi.fn();
      const changeEvent = vi.fn();
      input.addEventListener('input', inputEvent);
      input.addEventListener('change', changeEvent);

      const content = loadContent(makeChrome());
      content.applyAnswerToField(input, 'hello');

      expect(input.value).toBe('hello');
      expect(inputEvent).toHaveBeenCalled();
      expect(changeEvent).toHaveBeenCalled();
    });

    it('sets textarea value without invoking the input-only setter', () => {
      const textarea = document.createElement('textarea');
      document.body.append(textarea);

      const content = loadContent(makeChrome());

      expect(() => content.applyAnswerToField(textarea, 'long-form answer')).not.toThrow();
      expect(textarea.value).toBe('long-form answer');
    });

    it('selects a matching option and leaves no-match selects unchanged, returning match status', () => {
      const select = document.createElement('select');
      for (const opt of ['Select...', 'No', 'Yes']) {
        const o = document.createElement('option');
        o.text = opt;
        select.add(o);
      }
      document.body.append(select);
      const content = loadContent(makeChrome());

      const resMatched = content.applyAnswerToField(select, 'Yes');
      expect(resMatched).toBe(true);
      expect(select.selectedIndex).toBe(2);

      const resUnmatched = content.applyAnswerToField(select, 'zzzz-not-an-option');
      expect(resUnmatched).toBe(false);
      expect(select.selectedIndex).toBe(2); // unchanged, no arbitrary fallback
    });
  });

  describe('startBatchFormAutofill', () => {
    it('assigns unique ids when fields share a name (regression)', async () => {
      const a = document.createElement('input');
      a.name = 'email';
      const b = document.createElement('input');
      b.name = 'email';
      document.body.append(a, b);

      const chrome = makeChrome({ backendUrl: 'http://localhost:3000', usePageContext: false });
      let sentFields: any[] = [];
      chrome.runtime.sendMessage = vi.fn(async (msg: any) => {
        sentFields = msg.fields;
        return { success: true, answers: [] };
      });

      const content = loadContent(chrome);
      await content.startBatchFormAutofill();

      const ids = sentFields.map((f: any) => f.id);
      expect(ids).toHaveLength(2);
      expect(new Set(ids).size).toBe(2);
      expect(a.dataset.geminiFieldId).not.toBe(b.dataset.geminiFieldId);
    });

    it('skips applying answers when stop was requested mid-flight (regression)', async () => {
      const input = document.createElement('input');
      input.id = 'name';
      document.body.append(input);

      const chrome = makeChrome({ backendUrl: 'http://localhost:3000', usePageContext: false });
      let resolveSend: (v: any) => void = () => {};
      let sendCalled = false;
      chrome.runtime.sendMessage = vi.fn(() => {
        sendCalled = true;
        return new Promise((resolve) => (resolveSend = resolve));
      });

      const content = loadContent(chrome);
      const run = content.startBatchFormAutofill();

      // Wait until the batch request is actually in flight.
      await vi.waitFor(() => expect(sendCalled).toBe(true));

      // Simulate the popup's stop message before the request completes.
      chrome.runtime._listeners.forEach((fn: any) => fn({ action: 'stopAutofill' }));
      resolveSend({ success: true, answers: [{ id: 'name', answer: 'SHOULD NOT APPLY' }] });

      await run;
      expect(input.value).toBe('');
    });

    it('does not increment filledCount for unmatched select fields and marks them needs-review', async () => {
      const input = document.createElement('input');
      input.id = 'name';
      const select = document.createElement('select');
      select.id = 'role';
      for (const opt of ['Select...', 'Developer', 'Designer']) {
        const o = document.createElement('option');
        o.text = opt;
        select.add(o);
      }
      document.body.append(input, select);

      const chrome = makeChrome({ backendUrl: 'http://localhost:3000', usePageContext: false });
      chrome.runtime.sendMessage = vi.fn(async () => {
        return {
          success: true,
          answers: [
            { id: 'name', answer: 'Alice' },
            { id: 'role', answer: 'Astronaut' },
          ],
        };
      });

      const content = loadContent(chrome);
      await content.startBatchFormAutofill();

      expect(input.value).toBe('Alice');
      expect(input.classList.contains('gemini-highlight-success')).toBe(true);

      expect(select.selectedIndex).toBe(0);
      expect(select.classList.contains('gemini-highlight-needs-review')).toBe(true);
      expect(select.classList.contains('gemini-highlight-success')).toBe(false);

      const toast = document.getElementById('gemini-autofill-page-toast');
      expect(toast?.textContent).toContain('Successfully batch filled 1 of 2 fields');
    });

    it('highlights server-withheld answers with needs-review and does not fill them', async () => {
      const normal = document.createElement('input');
      normal.id = 'name';
      const withheld = document.createElement('input');
      withheld.id = 'cover_letter';
      document.body.append(normal, withheld);

      const chrome = makeChrome({ backendUrl: 'http://localhost:3000', usePageContext: false });
      chrome.runtime.sendMessage = vi.fn(async () => ({
        success: true,
        answers: [
          { id: 'name', answer: 'Alice', style: 'short' },
          { id: 'cover_letter', answer: '', withheld: true },
        ],
      }));

      const content = loadContent(chrome);
      await content.startBatchFormAutofill();

      expect(normal.value).toBe('Alice');
      expect(normal.classList.contains('gemini-highlight-success')).toBe(true);

      expect(withheld.value).toBe('');
      expect(withheld.classList.contains('gemini-highlight-needs-review')).toBe(true);
      expect(withheld.classList.contains('gemini-highlight-success')).toBe(false);

      const toast = document.getElementById('gemini-autofill-page-toast');
      expect(toast?.textContent).toContain('Successfully batch filled 1 of 2 fields');
    });
  });
});
