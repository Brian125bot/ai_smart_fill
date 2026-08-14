# GeminiFormAutofill Pro 🚀

A production-grade, secure Chrome Extension and full-stack web workspace designed for **AI-powered browser form filling, PDF document grounding, and smart field extractions**, powered by the Google GenAI SDK (Gemini 3.0+ architecture including Gemini 3.7 Flash, 3.6 Flash, 3.5 Flash, 3.5 Flash Lite, 3.1 Flash Lite, and 3.0 Flash). Intended for **local, single-user use**.

---

## ✨ Key Features

1. **Intelligent Form Autofill**: Instantly parse any online web form, input field, or textarea using advanced Gemini 3.7/3.6/3.5 models.
2. **PDF Resume & Document Grounding**: Upload resumes, CVs, or corporate guidelines (PDF/TXT) directly into the extension or web playground to ground autofill responses with real professional data.
3. **Multi-Model Gemini Selector**: Switch between Gemini 3.7 Flash, 3.6 Flash, 3.5 Flash, 3.5 Flash Lite, 3.1 Flash Lite, 3.0 Flash, or custom model identifiers with real-time speed indicators.
4. **Local Context Sync**: Save persona profiles and grounding documents to `localStorage` and an in-memory backend cache, then pair the Chrome Extension with the fixed pairing token `local-user-profile`.
5. **Ready-to-Deploy Chrome Extension (.ZIP)**: One-click packaging and download of the production-ready unpacked Chrome extension (`manifest.json`, background service worker, popup UI, content scripts).
6. **Robust Backend Resilience**: Full-stack Express server (`server.ts`) with automatic 503 high-demand exponential backoff retries and intelligent Flash model fallback.

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: React 18+, Vite, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express 5, TypeScript (`server.ts`).
- **AI Integration**: `@google/genai` SDK (`gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, etc.).
- **Persistence**: `localStorage` (browser) + in-memory server cache for extension pairing.
- **Extension Engine**: Manifest V3 Chrome Extension architecture with isolated content scripts and secure background RPC proxying.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or bun

### Installation & Development
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env` (copy from `.env.example`):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The application runs on port `3000`. Open `http://localhost:3000`.

### Production Build
To build and bundle the full-stack application and compile the server bundle to `dist/server.cjs`:
```bash
npm run build
```
Then run with `npm start`.

---

## 📂 Project Structure

```text
├── server.ts                 # Express backend API & Gemini proxy
├── package.json              # Project dependencies & scripts
├── tsconfig.json             # TypeScript configuration
├── src/
│   ├── App.tsx               # Main application layout & tabs
│   ├── main.tsx              # React entry point
│   ├── types.ts              # Global TypeScript interfaces & models
│   ├── components/           # UI modules (Header, Playground, EndpointCard, etc.)
│   └── utils/                # ZIP generator for Chrome extension package
└── assets/                   # Extension icons and promotional assets
```

---

## 🔒 Security & API Key Protection

- **Zero Client-Side API Key Exposure**: All Gemini API calls are proxied securely through server-side Express endpoints (`/api/*`), ensuring API keys never touch the browser.
- **Local-Only**: No authentication, Google Drive, or Firebase dependencies. Extension sync uses the fixed pairing token `local-user-profile`.
