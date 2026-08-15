# Changelog

## Unreleased

### Current State

- Consolidated the application as a local, single-user dashboard, Express Gemini proxy, and Chromium Manifest V3 extension.
- Removed the legacy Firebase, Google Drive, and protected-route integration from the active application.
- Added persona profiles, custom Q&A, text/PDF grounding, local dashboard synchronization, and batch form answering.
- Added server-side model retry and fallback behavior, health/model endpoints, and an in-memory pairing cache.
- Added generated extension packaging with root-level icons and endpoint derivation for both answering routes.
- Added server, extension, component, and gated live Gemini test coverage through Vitest.
- Added architecture, API, extension, development, security, and troubleshooting documentation.

### Important Limitations

- No authentication or authorization is provided.
- Synced context is process-local and is lost when the server restarts.
- Public or multi-user deployment is not supported by the current implementation.
