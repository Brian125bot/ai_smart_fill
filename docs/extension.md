# Extension Guide

The dashboard generates a Chromium Manifest V3 extension package in the browser. The package is intended to be loaded unpacked for local use.

## Package Contents

The ZIP contains these seven source files:

| File | Role |
| --- | --- |
| `manifest.json` | Manifest V3 metadata, permissions, service worker, and content-script declarations. |
| `popup.html` | Popup configuration markup. |
| `popup.css` | Popup styling. |
| `popup.js` | Popup settings, persona sync, PDF upload, and test actions. |
| `background.js` | Service-worker proxy for answering requests. |
| `content.js` | Field detection, batch requests, and value application. |
| `content.css` | Floating autofill controls and status styling. |

The ZIP generator also creates `icon16.png`, `icon48.png`, and `icon128.png` at the archive root. These paths match the manifest references.

## Permissions

The manifest requests:

- `storage` and `unlimitedStorage` for local configuration, profiles, and optional PDF data.
- `activeTab` and `scripting` for interaction with the active page.
- `<all_urls>` host permission so the content script can inspect forms on arbitrary sites.

Review the all-sites permission before using the extension with sensitive or regulated forms.

## Installation

1. Use the dashboard's ZIP download button.
2. Extract `gemini-form-autofill-extension.zip`.
3. Open `chrome://extensions` in Chrome, Edge, Brave, or another Chromium browser.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the extracted directory containing `manifest.json`.
6. Pin and open the extension popup.

Firefox compatibility is not guaranteed. The implementation uses Chrome extension APIs and is tested as a Chromium Manifest V3 extension.

## Popup Configuration

Set the backend endpoint to one of these values:

```text
http://localhost:3000/batchAnswerForm
http://localhost:3000/answerQuestion
```

The service worker derives the sibling endpoint automatically. Use `/batchAnswerForm` for normal page autofill.

The dashboard's **Copy Pair ID** button copies `local-user-profile`. Enter that value in the popup and click **Sync Dashboard** after saving the dashboard context. This value identifies the in-memory cache entry; it is not authentication.

The popup also supports:

- Selecting a configured or custom Gemini model.
- Enabling or disabling page-context extraction.
- Attaching a PDF for multimodal grounding.
- Editing the system instruction.
- Testing the endpoint.
- Saving settings to `chrome.storage.local`.

## Autofill Flow

The content script filters out hidden, disabled, readonly, submit, button, checkbox, radio, file, image, and password controls. It keeps visible text inputs, textareas, selects, and contenteditable elements.

Question extraction prefers, in order:

1. A linked `<label>`.
2. `aria-label` or `aria-labelledby`.
3. Placeholder text.
4. Name or ID attributes.
5. Nearby headings or text nodes.

The script assigns unique temporary IDs when fields share a name or ID. It sends all fields in one batch request, then applies returned answers and dispatches `input` and `change` events so common React, Vue, and Angular bindings can observe the updates.

For value application, the content script uses the native `HTMLInputElement.prototype.value` setter (and the equivalent for textareas) when available. This ensures compatibility with React and Vue controlled components that monitor the native setter. For contenteditable elements, it sets `innerText` directly.

The server classifies each field as short-form or long-form. Short fields are answered in a single batch prompt. Long-form fields (textareas, cover letters, descriptions) are answered individually with dedicated prompts optimized for detail, processed in parallel. Answers for long-form fields respect the persona's configured length strategy and tone.

The stop control cancels application of returned answers when a request is already in flight. It does not cancel an HTTP request already sent to the server.

## Stored Extension Data

The extension uses `chrome.storage.local` for endpoint, pairing, profile, model, instruction, page-context, and PDF settings. The exact stored keys include `backendUrl`, `pairingToken`, `profiles`, `activeProfileId`, `userProfile`, `selectedModel`, `systemInstruction`, `usePageContext`, `pdfData`, `pdfName`, `pdfSize`, and `pdfMimeType`.

Remove the extension or clear its storage to remove locally stored configuration. PDF and profile data are not encrypted by the extension.

## Source and Packaging

Generated source is defined in `src/extensionSource.ts` and exposed in the dashboard's **Extension Source Files** tab. `buildExtensionZip()` creates the archive without triggering a download, which allows packaging tests to inspect its contents. `downloadExtensionZip()` creates the browser download.
