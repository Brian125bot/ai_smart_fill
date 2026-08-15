# Troubleshooting

## The dashboard does not load

Confirm that the server is running:

```bash
npm run dev
```

Then open `http://localhost:3000` rather than a file URL or a separate Vite-only preview URL.

## Health shows a missing API key

Check `.env` contains a non-empty `GEMINI_API_KEY`, then restart the server. Verify:

```bash
curl http://localhost:3000/api/health
```

`apiKeyConfigured: true` only means an environment value exists. It does not prove that the key is valid or has access to every configured model.

## The extension reports that the endpoint is not configured

Open the popup and set one of these URLs:

```text
http://localhost:3000/batchAnswerForm
http://localhost:3000/answerQuestion
```

Click **Save Local**. The service worker accepts either route and derives the other route automatically.

## Dashboard context does not sync

1. Open the dashboard's **Context & Profile Hub**.
2. Click **Save & Sync Personas**.
3. Confirm the server is running and `/api/syncProfile` returns success.
4. Enter `local-user-profile` in the extension pairing field.
5. Click **Sync Dashboard**.

Synced context is stored in `data/` and survives server restarts. If context is missing, save and sync in the dashboard again.

## The extension receives a CORS error

Use a local dashboard origin such as `http://localhost:3000` and configure the endpoint to that same server. The server reflects localhost, loopback, and extension origins only. A remote dashboard or arbitrary public origin is not supported by the current CORS policy.

## No fields are detected

The content script ignores hidden, disabled, readonly, password, file, submit, button, checkbox, radio, and image controls. Confirm the target fields are visible and editable, then reload the page so the content script runs again.

Single-page applications can replace fields after the script loads. Reload the tab or trigger the extension after the form has rendered.

## Answers are missing or fields remain unchanged

Check the browser extension service-worker console for the request error. Verify that:

- The backend endpoint is reachable.
- The selected model is available to the Gemini API key.
- The form field has a useful label, ARIA label, placeholder, name, or ID.
- A select answer exactly matches one of its available options.

The content script dispatches `input` and `change` events, but a site can still implement custom controls that require site-specific behavior.

## PDF upload fails

Confirm the file is a PDF and that the combined JSON request is below the `50mb` body limit. Base64 encoding makes a PDF larger than its file size. Remove stale PDF data from the dashboard or extension storage and retry with a smaller document.

## Gemini returns transient errors

The server retries `503`, `429`, and model-not-found style failures and then tries the configured fallback model chain. Non-transient errors return immediately. Check the server logs and `/api/models` when a model ID is rejected.

## The server returns 429 Too Many Requests

All routes are rate-limited. `/api/*` routes allow 120 requests per minute; AI-generation routes (`/answerQuestion`, `/batchAnswerForm`) allow 30 requests per minute. The response includes `Retry-After` indicating how many seconds to wait. Slow down your request rate or restart the server to reset the counters.

## The ZIP extension shows missing icons

Regenerate the ZIP from the dashboard and verify that `icon16.png`, `icon48.png`, and `icon128.png` are at the archive root beside `manifest.json`. Do not move them into an `icons/` directory unless the manifest paths are changed as well.
