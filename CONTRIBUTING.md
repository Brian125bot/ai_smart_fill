# Contributing

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Use a local Gemini key only when real model requests are needed. Do not commit `.env`, credentials, generated `dist/`, or coverage output.

## Before Submitting Changes

Run the checks relevant to the change:

```bash
npm run lint
npm test
npm run build
npm run test:coverage
```

The repository defines a CI workflow (`.github/workflows/ci.yml`) that runs typecheck, lint, test, and build with a 10-minute timeout. These are the source of truth before publishing changes.

## Test Placement

- Add API and server behavior tests under `tests/server/`.
- Add generated extension, popup, service-worker, content-script, or ZIP tests under `tests/extension/`.
- Add React interaction tests under `tests/components/`.
- Keep real Gemini calls in `tests/e2e/` and behind the `RUN_LIVE=1` opt-in.

## Extension Changes

The extension is generated from strings in `src/extensionSource.ts`. Update the corresponding source test whenever changing its manifest, file list, endpoint behavior, storage keys, or content-script behavior. Run the ZIP tests to confirm root-level icon placement.

## Documentation Changes

Update the README and the relevant file under `docs/` when changing routes, environment variables, storage behavior, extension installation, or supported models. Keep user-facing copy in `InstallationGuide.tsx` and generated popup copy aligned with the same local-only terminology.

## Architectural Constraints

Preserve the current local-only boundary unless a change explicitly adds and documents authentication, durable storage, user isolation, and a reviewed deployment model. Do not describe the pairing value as authentication.
