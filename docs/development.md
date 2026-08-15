# Development and Testing

## Install

```bash
npm install
cp .env.example .env
```

Set `GEMINI_API_KEY` only when running real Gemini requests. Unit and component tests use injected or mocked clients and do not need a live key.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Express server with Vite development middleware on port 3000. |
| `npm run build` | Build the Vite frontend and bundle `server.ts` into `dist/server.cjs`. |
| `npm start` | Run the production server bundle and serve `dist/`. |
| `npm run preview` | Preview the Vite frontend separately. |
| `npm run lint` | Run TypeScript checking with `tsc --noEmit`. |
| `npm test` | Run the default Vitest suite. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:coverage` | Run Vitest with V8 text and HTML coverage reports. |
| `npm run clean` | Remove build output and a legacy `server.js` path if present. |

## Test Layout

- `tests/server/` covers routes, validation, CORS, static fallback, profile synthesis, Gemini retry/fallback behavior, and the rememberAnswer endpoint.
- `tests/extension/` covers generated manifest/source files, popup behavior, service-worker requests, content-script field handling, and ZIP contents.
- `tests/components/` covers dashboard tabs, model selection, persona operations, playground requests, and installation/download UI.
- `tests/store.test.ts` covers the file-backed persistence store.
- `tests/fieldClassifier.test.ts` covers field classification for short-form vs long-form routing.
- `tests/qaRetrieval.test.ts` covers Q&A relevance scoring and retrieval.
- `tests/e2e/live.gemini.test.ts` contains explicit live API checks and is skipped by default.
- `tests/setup.ts` provides jsdom cleanup, clipboard mocks, and canvas stubs for ZIP icon generation.

Vitest uses the Node environment by default. Component tests opt into jsdom with file-level environment annotations. `vitest.config.ts` covers `server.ts`, `store.ts`, `fieldClassifier.ts`, `qaRetrieval.ts`, and `src/**` with appropriate exclusions.

## Live Gemini Tests

Run the live tests only when a valid key is available:

```bash
RUN_LIVE=1 npx vitest run tests/e2e/live.gemini.test.ts
```

These tests make real network requests, validate the configured model IDs, and may consume API quota. Keep them out of normal pre-commit checks.

## Coverage Policy

The critical server path has these minimum thresholds:

```text
lines: 80, functions: 80, statements: 80, branches: 70
```

The current `src/**` threshold is:

```text
lines: 60, functions: 40, statements: 60, branches: 58
```

The UI threshold is intentionally lower because `ContextHub.tsx` contains a large set of interactive profile, document, and batch-testing branches. Raise it when additional focused interaction coverage is added.

## Change Workflow

1. Make the smallest change that preserves the local-only architecture.
2. Update or add the nearest unit/component test.
3. Update generated extension tests when changing `src/extensionSource.ts`.
4. Run `npm run lint`.
5. Run `npm test`.
6. Run `npm run build` for runtime or packaging changes.
7. Run `npm run test:coverage` before publishing a substantial change.

Do not commit `.env`, generated `dist/`, coverage output, or real API credentials.
