# Architecture

## Scope

The application is a local, single-user workspace made of three cooperating parts:

1. A React dashboard for persona and grounding configuration.
2. An Express server that proxies requests to Gemini and caches synced context in memory.
3. A Chromium Manifest V3 extension that detects fields and sends answers through the server.

There is no account system, durable database, hosted synchronization service, or server-side user isolation.

## Runtime Components

### Dashboard

The Vite-powered React application renders the dashboard tabs:

- Context & Profile Hub.
- Form Playground & API.
- Extension Source Files.
- Chrome Setup Guide.

The dashboard stores the selected model under `gemini_selected_model` and the saved profile payload under `gemini_dashboard_context_config` in browser `localStorage`.

### Express Server

`server.ts` exposes the HTTP API and starts the Vite middleware in development or serves `dist/` in production. `createApp()` accepts an injected Gemini client and an option to disable static serving, which keeps HTTP tests independent from the running server.

The server creates a lazy `GoogleGenAI` client from `GEMINI_API_KEY`. It accepts text and base64 PDF context, synthesizes profile fields into a grounding block, and returns either a single answer or structured batch answers.

The server cache uses a file-backed store (`store.ts`) that persists synced context to JSON files in the `data/` directory. `POST /api/syncProfile` writes to the store and the extension reads from it through `/api/userContext`. An in-memory map serves as a hot cache. The `data/` directory is gitignored.

The batch endpoint (`POST /batchAnswerForm`) classifies fields into short-form and long-form categories using `fieldClassifier.ts`. Short fields are processed in one batch prompt; long-form fields are processed individually with dedicated prompts optimized for detail and length. Q&A retrieval (`qaRetrieval.ts`) scores saved custom Q&As against each field's question and injects only the most relevant matches.

The `POST /api/rememberAnswer` endpoint saves accepted Q&A pairs back into a persona's bank for future retrieval.

Request validation is enforced with Zod schemas in `src/validation.ts`. The AI routes (`answerQuestion`, `batchAnswerForm`, `rememberAnswer`) use `.strict()` mode to reject unknown JSON keys; `syncProfile` allows extra keys for extension forward compatibility. `formatZodErrors()` produces the `details` array in `400` responses.

All routes are rate-limited with `express-rate-limit`: `/api/*` at 120 req/min and AI-generation routes at 30 req/min. CORS is mounted before the rate limiter so `429` responses carry the correct `Access-Control-Allow-Origin` header.

### Extension

The extension consists of:

- `manifest.json` for Manifest V3 configuration.
- `popup.html`, `popup.css`, and `popup.js` for local configuration.
- `background.js` as the service-worker API proxy.
- `content.js` for field discovery and answer application.
- `content.css` for the in-page controls and status UI.

The dashboard generates these files from `src/extensionSource.ts`. `src/utils/zipGenerator.ts` adds the three PNG icons at the extension root so their paths match `manifest.json`.

## Request Flow

### Dashboard Request

1. The user selects a persona and context in the dashboard.
2. The dashboard sends `/answerQuestion` or `/batchAnswerForm` to the same origin.
3. The Express route loads explicit context and profile data from the request.
4. If a pairing token is present, missing values can be filled from the in-memory cache.
5. The Gemini client receives text or multimodal contents and the selected model.
6. Transient failures retry up to three times per candidate model before moving through the fallback chain.
7. The server returns the answer and effective model, or a structured error.

### Extension Batch Autofill

1. The content script finds visible, enabled, non-readonly form controls.
2. It derives a question from labels, ARIA attributes, placeholders, names, IDs, or nearby text.
3. It assigns each detected field a unique temporary ID.
4. The service worker sends one batch request with fields, page context, profile data, and grounding context.
5. The server returns an answer object for each field.
6. The content script matches IDs, applies values, and dispatches `input` and `change` events.
7. A stop request prevents returned answers from being applied after the request completes.

## Runtime Modes

### Development

`npm run dev` runs `tsx server.ts`. The Express app uses Vite middleware so the dashboard and API share `http://localhost:3000`.

### Production Bundle

`npm run build` creates the Vite frontend output and bundles the server as `dist/server.cjs`. `npm start` runs the bundled server, serves the frontend from `dist/`, and uses the same API routes.

The server binds to `127.0.0.1` unless `HOST` is set. The port is currently fixed at `3000`.

## Data Boundaries

| Data                | Browser dashboard         | Server process                                                       | Extension                          |
| ------------------- | ------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| Selected model      | `localStorage`            | Request/cache value                                                  | `chrome.storage.local`             |
| Persona profiles    | `localStorage`            | In-memory synced copy                                                | `chrome.storage.local`             |
| PDF data            | `localStorage` when saved | In-memory base64 copy                                                | `chrome.storage.local` when synced |
| API key             | Never                     | `GEMINI_API_KEY` environment variable                                | Never                              |
| Pairing value       | Fixed local value         | Map key                                                              | `chrome.storage.local`             |
| Error-leak detector | N/A                       | `errorLeak.ts` (structurally flags leaked exception text in answers) | Applied to all generation output   |

The data boundary is intentionally simple for local use. It is not a substitute for encrypted storage, authentication, or multi-tenant isolation.
