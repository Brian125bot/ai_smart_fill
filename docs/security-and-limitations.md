# Security and Limitations

This project is intended for a local, single-user environment. The controls below reduce accidental exposure but do not turn the application into an authenticated or multi-tenant service.

## API Key Handling

- `GEMINI_API_KEY` is read by `server.ts` from the environment.
- The key is not sent to the dashboard or embedded in generated extension files.
- `.env` is ignored by Git; only `.env.example` belongs in the repository.
- Rotate a key immediately if it is ever committed, pasted into an issue, or shared outside the trusted machine.

## No Authentication

The server has no login, session, authorization, or bearer-token validation. `local-user-profile` is a pairing/cache key, not a secret. Anyone who can reach the server and knows a valid cache key can retrieve the associated context and ask the server to send it to Gemini.

Keep the default loopback binding and do not expose this server publicly without adding authentication, authorization, durable isolation, and a reviewed deployment configuration.

## Storage and Privacy

- Dashboard profiles and selected model settings are stored in browser `localStorage`.
- Extension configuration and optional PDF data are stored in `chrome.storage.local`.
- Synced profile and document data are copied into the server process memory.
- Profile and PDF context can be sent to Gemini as part of an answering request.
- None of these stores are encrypted by this project.
- Synced profile data is saved to plaintext JSON files in `data/` and survives server restarts. Use `POST /api/purgeContext` to clear stored context.

Avoid using the current implementation with secrets, regulated data, or forms that require a stronger privacy boundary than local browser and process storage.

## Browser Permissions

The extension uses `<all_urls>` so it can inspect and fill forms on arbitrary sites. The content script can read visible field labels, page text, headings, and the current URL when page-context extraction is enabled. Review the extension source before installing it in a profile that visits sensitive sites.

## Network Controls

CORS reflects local web origins and browser-extension origins. This limits ordinary browser reads from unrelated websites, but CORS is not authentication and does not protect a directly reachable server from non-browser clients. CORS is applied before the rate limiter so that rate-limit (`429`) responses carry the correct CORS headers.

The server accepts JSON bodies up to `50mb`. Base64 PDF data increases payload size and remains in browser, process, and request memory during processing.

## Model and Answer Safety

Gemini output is generated text and can be incomplete, incorrect, or inappropriate for a form. Review autofilled values before submission. The extension makes no claim that a selected answer is legally, professionally, or factually correct.

## Deployment Boundary

The current repository does not provide a supported public deployment. Hosting it remotely would require, at minimum, authentication, per-user storage isolation, secret management, request limits, logging policy, secure CORS configuration, and a documented data-retention policy.

For local use, all routes are rate-limited: `/api/*` at 120 req/min and AI-generation routes at 30 req/min. This is a minimal abuse-prevention measure for single-user use, not a multi-tenant rate-limiting system.
