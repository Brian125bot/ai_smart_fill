# Repository Guidelines

## Project Structure & Module Organization

- This is a local, single-user React/Vite dashboard plus an Express/Gemini proxy. `server.ts` is the API/production entrypoint; `src/` contains the dashboard and generated Manifest V3 extension source.
- Root `store.ts`, `fieldClassifier.ts`, and `qaRetrieval.ts` implement persistence, field routing, and Q&A matching. Extension ZIP packaging is in `src/utils/zipGenerator.ts`.
- Put HTTP/Gemini tests in `tests/server/`, generated extension/popup/content/ZIP tests in `tests/extension/`, React tests in `tests/components/`, and real Gemini tests in `tests/e2e/`.
- `src/extensionSource.ts` generates the extension files as strings; update its corresponding extension tests when changing generated manifest, popup, worker, content-script, or endpoint behavior. Package and extension-manifest versions are independent.
- Runtime context files go under ignored `data/`; generated `dist/` and `coverage/` must not be committed.

## Build, Test, and Development Commands

- Setup: `npm install`, then `cp .env.example .env`; set `GEMINI_API_KEY` only for real requests.
- Development: `npm run dev` starts Express/Vite on port `3000`; `HOST` changes the bind address. `npm run build` creates the frontend and `dist/server.cjs`; `npm start` runs that bundle.
- Checks: run `npm run lint` (`tsc --noEmit`), `npm test`, `npm run build` for runtime/packaging changes, then `npm run test:coverage` before publishing.
- Focused test: `npx vitest run tests/server/batchAnswerForm.test.ts`; watch mode is `npm run test:watch`.
- Live Gemini tests are opt-in and may consume quota: `RUN_LIVE=1 npx vitest run tests/e2e/live.gemini.test.ts`.

## Testing & Runtime Quirks

- Vitest defaults to Node; component tests opt into jsdom. `tests/setup.ts` supplies React cleanup, clipboard, and canvas mocks.
- Server tests should use the injected/in-memory store helpers; do not let tests write real synced contexts into `data/`.
- Set `DISABLE_HMR=true` when agent edits should disable Vite HMR and file watching. Set `EXTENSION_ID` to restrict Chrome-extension CORS to one extension origin; otherwise the development fallback allows extension origins.
- Preserve the local-only boundary: `local-user-profile` is a cache key, not authentication, and the server is not a supported public deployment.

## Commit & Publish Workflow

- History uses concise prefixes such as `feat:`, `fix:`, `docs:`, and `refactor:`. Keep commits scoped and run the checks above before release tags.
- There is no CI workflow; local checks are the source of truth. Never commit `.env`, credentials, `data/`, `dist/`, or coverage output.
- The configured `origin` is HTTPS, but publishing uses SSH: `git push git@github.com:Brian125bot/ai_smart_fill.git main --tags`. Verify published refs with `git ls-remote git@github.com:Brian125bot/ai_smart_fill.git`; the local `origin/main` tracking ref may remain stale after an SSH push.
