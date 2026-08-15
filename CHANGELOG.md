# Changelog

## 1.0.0

### Open-Ended Answer Engine

- Added field classification: short-form, long-form, select, email, phone, numeric.
- Added dedicated long-form prompt branch for textareas, cover letters, and descriptions with configurable tone and length strategy.
- Added two-pass batch orchestration: short fields in one batch, long-form fields in parallel dedicated calls (max 3 concurrent).
- Added Q&A retrieval scoring: saved custom Q&As are scored against each field's question and only the most relevant matches are injected into prompts.
- Added `POST /api/rememberAnswer` endpoint to save accepted Q&A pairs back into a persona's bank.
- Added per-persona tone (professional/conversational/formal) and length strategy (concise/balanced/fill_limit) settings.
- Added `tagName` and `rows` to batch field requests for improved server-side classification.

### Persistence

- Added file-backed context store (`store.ts`) that persists synced profiles to JSON files in `data/`.
- In-memory map serves as hot cache; files survive server restarts.
- `data/` directory is gitignored.

### Extension Improvements

- Updated content script to use native value setter for React/Vue controlled component compatibility.
- Updated content script to send `tagName` and `rows` in batch requests.
- Long-form answers include `style: "long_form"` and model metadata.

### Test Coverage

- Added `tests/store.test.ts` for file-backed persistence store.
- Added `tests/fieldClassifier.test.ts` for field classification.
- Added `tests/qaRetrieval.test.ts` for Q&A retrieval scoring.
- Added `tests/server/rememberAnswer.test.ts` for the rememberAnswer endpoint.

### Previous State

- Consolidated as a local, single-user dashboard, Express Gemini proxy, and Chromium Manifest V3 extension.
- Removed legacy Firebase, Google Drive, and protected-route integration.
- Added persona profiles, custom Q&A, text/PDF grounding, local dashboard synchronization, and batch form answering.
- Added server-side model retry and fallback behavior.
- Added generated extension packaging with root-level icons.
- Added architecture, API, extension, development, security, and troubleshooting documentation.

### Important Limitations

- No authentication or authorization is provided.
- Synced context is now file-backed but still local; no remote sync.
- Public or multi-user deployment is not supported by the current implementation.
- Rich-text formatted insertion (ProseMirror/Quill/Lexical) is not supported.
- Embedding-based Q&A retrieval is not included; token-overlap scoring is used instead.
