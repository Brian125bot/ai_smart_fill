# GeminiFormAutofill Pro

A Chrome Extension builder and full-stack web playground for AI-powered browser form filling, PDF document grounding, and smart field extraction — powered by Google Gemini.

## Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Lucide Icons, Motion
- **Backend**: Node.js, Express 4, TypeScript (`server.ts`)
- **AI**: `@google/genai` SDK (Gemini 3.7 Flash and family)
- **Auth/DB**: Firebase Authentication + Firestore

## Key files

- `server.ts` — Express backend; proxies all Gemini API calls securely
- `src/App.tsx` — Main app layout and tab routing
- `src/components/` — UI modules (Header, Playground, EndpointCard, etc.)
- `src/lib/firebase.ts` — Firebase client config
- `src/utils/` — ZIP generator for Chrome extension packaging
- `src/extensionSource.ts` — Extension source files (manifest, content scripts, background worker)
- `firestore.rules` — Firestore security rules

## Running locally

```bash
npm install
npm run dev        # starts Express + Vite on port 3000
```

## Environment variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key — required for all Gemini calls |
| `AUTH_BEARER_TOKEN` | Static bearer token for `/answerQuestion` endpoint (used by the extension) |
| `APP_URL` | Deployed URL of this app (used for self-referential links) |

Firebase config is read from `src/lib/firebase.ts` — update the `firebaseConfig` object there with your project's values.

## User preferences

<!-- Agent: record confirmed preferences here -->
