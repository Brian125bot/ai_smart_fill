# Gemini Form Autofill

Gemini Form Autofill is a local dashboard, server-side Gemini proxy, and Chromium Manifest V3 extension for answering web forms with text, persona profiles, and PDF grounding.

> Scope: this repository is designed for local, single-user use. It does not provide user authentication, durable server storage, rate limiting, or a hosted multi-user deployment model.

## Features

- Detect visible, enabled inputs, textareas, selects, and contenteditable fields on the current page.
- Answer one question with `POST /answerQuestion` or answer a complete form with one `POST /batchAnswerForm` request.
- Ground answers with text context, PDF documents, page title/URL/headings, persona fields, custom Q&A, and system instructions.
- Maintain multiple persona profiles in the dashboard and switch the active profile before syncing it to the extension.
- Select one of the configured Gemini model IDs or provide a custom model identifier.
- Download a generated extension ZIP containing the Manifest V3 source files and root-level icons.
- Retry transient Gemini failures and move through the configured fallback model chain.

## Architecture

```text
Dashboard (React/Vite)
       |
       | localStorage + HTTP
       v
Express server (server.ts) ---- Gemini API
       ^
       | HTTP + pairing token
       |
Manifest V3 extension
  popup -> chrome.storage.local
  service worker -> API
  content script -> page fields
```

The dashboard stores its configuration in browser `localStorage`. `POST /api/syncProfile` copies the current profile data into an in-memory server cache so the extension can retrieve it. The cache is lost when the server restarts. The extension stores its endpoint, pairing token, profiles, model, and grounding data in `chrome.storage.local`.

See the detailed documentation:

- [Architecture](docs/architecture.md)
- [API reference](docs/api.md)
- [Extension guide](docs/extension.md)
- [Development and testing](docs/development.md)
- [Security and limitations](docs/security-and-limitations.md)
- [Troubleshooting](docs/troubleshooting.md)

## Technology Stack

- Frontend: React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4, Lucide React.
- Backend: Node.js, Express 4.21, TypeScript, and Vite middleware in development.
- AI integration: `@google/genai` with the model IDs listed by `GET /api/models`.
- Extension packaging: Manifest V3 source generated in `src/extensionSource.ts`, packaged with JSZip.
- Testing: Vitest 4, Testing Library, jsdom, Supertest, and V8 coverage.

## Prerequisites

- Node.js 18 or newer.
- npm. Bun is also compatible with the repository's `bun.lock`.
- A Gemini API key for real model requests.

## Setup

Install dependencies and create a local environment file:

```bash
npm install
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env`. Never commit `.env` or place a real key in documentation, source code, or the extension ZIP.

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`. The server binds to `127.0.0.1` by default. `HOST` can change the bind address; the application port is currently fixed at `3000`.

### Environment Variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | For real AI calls | None | Server-side Gemini credential. |
| `HOST` | No | `127.0.0.1` | Server bind address. |
| `APP_URL` | No | `null` | Optional application URL reported by `/api/health`. |

## Build and Run

Build the frontend and bundled production server:

```bash
npm run build
npm start
```

The production server serves the built frontend from `dist/` and listens on port `3000`. `npm run preview` is a Vite preview command and does not replace the Express server process.

## Dashboard Workflow

1. Open **Context & Profile Hub**.
2. Edit or create a persona with profile fields, custom Q&A, text context, PDF grounding, model, and system instruction.
3. Click **Save & Sync Personas**. This writes to `localStorage` and the server's in-memory cache under `local-user-profile`.
4. Use **Form Playground & API** to test a single answer or a batch form request.
5. Use **Extension Source Files** to inspect the generated files.
6. Use **Chrome Setup Guide** to download and load the unpacked extension.

The pairing value shown by **Copy Pair ID** is a cache lookup key, not an authentication credential. The dashboard currently uses the fixed value `local-user-profile`.

## Extension Installation

1. Download `gemini-form-autofill-extension.zip` from the dashboard.
2. Extract the archive into a dedicated directory.
3. Open `chrome://extensions` in Chrome or another Chromium browser.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose the directory containing `manifest.json`.
6. Open the extension popup and set the backend endpoint to `http://localhost:3000/batchAnswerForm`.
7. Enter the pairing value `local-user-profile`, click **Sync Dashboard**, and confirm the active persona.

The extension accepts either `/answerQuestion` or `/batchAnswerForm` as the configured endpoint and derives the sibling endpoint when needed. Batch autofill is the normal path; it sends all detected fields in one request.

## API Summary

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Server status, configured model list, URL, and API-key status. |
| `GET` | `/api/models` | Full supported-model metadata. |
| `POST` | `/api/syncProfile` | Store dashboard context in the in-memory pairing cache. |
| `GET` | `/api/userContext/:token` | Retrieve cached context by URL-encoded token. |
| `POST` | `/api/userContext` | Retrieve cached context by body or query token. |
| `POST` | `/answerQuestion` | Generate one concise answer. |
| `POST` | `/batchAnswerForm` | Generate structured answers for a non-empty field array. |

The AI routes intentionally do not use the `/api` prefix. Request and response schemas are documented in [docs/api.md](docs/api.md).

## Testing

```bash
npm run lint
npm run build
npm test
npm run test:watch
npm run test:coverage
```

The default suite uses mocked Gemini clients and skips live API tests. To run the gated live tests, provide a valid key and explicitly opt in:

```bash
RUN_LIVE=1 npx vitest run tests/e2e/live.gemini.test.ts
```

Live tests make real network requests and may consume API quota. Coverage thresholds are configured in `vitest.config.ts`; the server has the stricter threshold because it is the critical request path.

## Security and Limitations

- The Gemini API key is read only by the server and is not bundled into the extension.
- There is no authentication or authorization. Anyone who can reach the server and knows a pairing value can request the cached context.
- The profile cache is in memory and is cleared on restart.
- Profile data and PDF data are stored in browser storage and may be sent to Gemini as request context.
- The extension requests access to all URLs so it can inspect forms on arbitrary pages. Review this permission before using it with sensitive forms.
- CORS allows local web origins and browser-extension origins; this is not a substitute for authentication.
- The Express JSON and URL-encoded body limit is `50mb`, including base64 PDF payloads.
- Remote or public hosting is not supported by the current security and persistence model.

Read [docs/security-and-limitations.md](docs/security-and-limitations.md) before using the project with sensitive personal or application data.

## Project Structure

```text
├── server.ts                  # Express API, Gemini proxy, and production server
├── src/
│   ├── App.tsx                # Dashboard shell and tabs
│   ├── components/            # Dashboard, playground, extension, and guide UI
│   ├── extensionSource.ts     # Generated Manifest V3 source files
│   ├── types.ts               # Shared profile, request, and response types
│   └── utils/zipGenerator.ts  # ZIP and icon generation
├── tests/
│   ├── server/                # HTTP and Gemini fallback tests
│   ├── extension/             # Manifest, popup, content, background, ZIP tests
│   ├── components/            # Dashboard component tests
│   └── e2e/                   # Explicitly gated live Gemini tests
├── docs/                      # Architecture, API, extension, and workflow docs
├── package.json               # Scripts and dependencies
├── vitest.config.ts           # Test environments and coverage thresholds
└── .env.example               # Safe environment template
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the local development workflow and required checks.
