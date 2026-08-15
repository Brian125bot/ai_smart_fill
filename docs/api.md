# API Reference

The server listens on port `3000` by default. The dashboard uses the same origin in normal operation. The extension can call the server directly through its configured endpoint.

The JSON body limit is `50mb` for both JSON and URL-encoded requests. This accommodates base64 PDF context but does not make large document uploads efficient.

## CORS

The server reflects requests from:

- `http://localhost:<port>` and `http://127.0.0.1:<port>`.
- `chrome-extension://...` origins.
- `moz-extension://...` origins.

Requests without an `Origin` header receive `Access-Control-Allow-Origin: *`. Other origins are not reflected. No authentication header is required or supported by the current API.

## `GET /api/health`

Returns server and configuration status. A missing API key does not prevent the health route from responding.

```json
{
  "status": "ok",
  "model": "gemini-3.7-flash",
  "supportedModels": ["gemini-3.7-flash"],
  "appUrl": null,
  "apiKeyConfigured": true,
  "timestamp": "2026-08-14T00:00:00.000Z"
}
```

`apiKeyConfigured` reports whether a non-empty `GEMINI_API_KEY` is present. It does not validate the key against Gemini.

## `GET /api/models`

Returns the configured default model and metadata for each supported model.

```bash
curl http://localhost:3000/api/models
```

The current configured IDs are:

- `gemini-3.7-flash`
- `gemini-3.6-flash`
- `gemini-3.5-flash`
- `gemini-3.5-flash-lite`
- `gemini-3.1-flash-lite`
- `gemini-3.0-flash`

Custom model identifiers are accepted by the answering routes, but their availability depends on the configured Gemini API.

## `POST /api/syncProfile`

Stores dashboard context in the process-local cache. One of `pairingToken`, `userId`, `uid`, or `email` is required. The dashboard currently sends `pairingToken: "local-user-profile"`.

Example:

```bash
curl -X POST http://localhost:3000/api/syncProfile \
  -H 'Content-Type: application/json' \
  -d '{
    "pairingToken": "local-user-profile",
    "activeProfileId": "profile-default",
    "profiles": [],
    "selectedModel": "gemini-3.7-flash",
    "usePageContext": true,
    "profileFields": {},
    "textContext": "Applicant context"
  }'
```

The request may include `profiles`, `activeProfileId`, `profileFields`, `systemInstruction`, `selectedModel`, `usePageContext`, `pdfData`, `pdfName`, `pdfSize`, `pdfMimeType`, and `textContext`.

Success response:

```json
{
  "success": true,
  "message": "User context successfully synced with backend cache.",
  "pairingToken": "local-user-profile",
  "profilesCount": 1,
  "activeProfileId": "profile-default",
  "updatedAt": "2026-08-14T00:00:00.000Z"
}
```

Missing identifiers return `400`.

## `GET /api/userContext/:token`

Retrieves cached context using a URL-encoded pairing token, user ID, or email.

```bash
curl http://localhost:3000/api/userContext/local-user-profile
```

Success returns `{ "success": true, "source": "server_cache", "context": ... }`. An unknown token returns `404`. Synced context is stored in plaintext JSON files in `data/` and survives server restarts.

## `POST /api/userContext`

Retrieves the same cached context using `pairingToken`, `userId`, or `email` in the body, or `token` in the query string.

```bash
curl -X POST 'http://localhost:3000/api/userContext?token=local-user-profile'
```

Missing identifiers return `400`; unknown identifiers return `404`.


## `POST /api/purgeContext`

Deletes stored user context and all associated aliases from memory and disk.

Example:

```bash
curl -X POST http://localhost:3000/api/purgeContext \
  -H 'Content-Type: application/json' \
  -d '{
    "pairingToken": "local-user-profile"
  }'
```

Accepts `pairingToken`, `userId`, or `email` in the JSON body, or `token` in the query string.

Success response:

```json
{
  "success": true,
  "message": "User context purged successfully."
}
```

Missing identifiers return `400`. Unknown tokens return `404`.

## `POST /answerQuestion`

Generates one concise form-field answer. `question` is required and must be a non-empty string.

Request shape:

```json
{
  "question": "Summarize your experience with TypeScript.",
  "model": "gemini-3.7-flash",
  "systemInstruction": "Answer in first person and keep it concise.",
  "pairingToken": "local-user-profile",
  "userProfile": {
    "fullName": "Example Applicant",
    "coreSkills": "TypeScript, React, Node.js"
  },
  "context": {
    "type": "text",
    "data": "Additional applicant context"
  }
}
```

`context.type` can be `text` or `pdf`. PDF context uses base64 `data` and can include `mimeType`, normally `application/pdf`.

Success response:

```json
{
  "answer": "I have used TypeScript...",
  "model": "gemini-3.7-flash"
}
```

Invalid questions return `400`. Gemini or server failures return `500` with an `error` string.

## `POST /batchAnswerForm`

Generates structured answers for all fields. The server classifies each field into short-form or long-form and processes them with appropriate strategies.

**Short-form fields** (name, email, phone, select, short text) are answered in a single batch request. **Long-form fields** (textareas, cover letters, descriptions) are answered individually with dedicated prompts optimized for detail and length, processed in parallel (max 3 concurrent).

Each field may include `id`, `name`, `type`, `question`, `placeholder`, `options`, `maxLength`, `required`, `tagName`, and `rows`. The `tagName` and `rows` fields help the server classify fields more accurately.

Request shape:

```json
{
  "fields": [
    {
      "id": "full-name",
      "name": "full_name",
      "type": "text",
      "question": "What is your full name?",
      "required": true,
      "tagName": "input"
    },
    {
      "id": "cover-letter",
      "type": "text",
      "question": "Write a cover letter explaining your fit for this role",
      "maxLength": 2000,
      "tagName": "textarea",
      "rows": 8
    }
  ],
  "pageContext": {
    "title": "Example application",
    "url": "https://example.test/apply",
    "headings": ["Personal information"]
  },
  "context": {
    "type": "text",
    "data": "Applicant grounding text"
  },
  "model": "gemini-3.7-flash",
  "systemInstruction": "Answer directly.",
  "pairingToken": "local-user-profile",
  "userProfile": {}
}
```

Success response:

```json
{
  "success": true,
  "answers": [
    {
      "id": "full-name",
      "question": "What is your full name?",
      "answer": "Example Applicant",
      "confidence": 0.95,
      "reasoning": "Matches the profile name."
    }
  ],
  "modelUsed": "gemini-3.7-flash",
  "timeMs": 842
}
```

Invalid fields return `400`. If Gemini returns unparseable structured output or another generation error, the route returns `500` with `success: false`, `answers: []`, and an `error` message.

Long-form answers include a `style: "long_form"` field and may include a `model` field indicating which model generated that specific answer.

## `POST /api/rememberAnswer`

Saves an accepted question-answer pair back into a persona's Q&A bank. This is used by the extension's review mode to build up reusable answers over time.

Request shape:

```json
{
  "pairingToken": "local-user-profile",
  "question": "Describe your experience with TypeScript.",
  "answer": "I have 5+ years of experience with TypeScript...",
  "profileId": "profile-cloud-lead"
}
```

`profileId` is optional; if omitted, the active profile is used. Success response:

```json
{
  "success": true,
  "message": "Answer saved to Q&A bank.",
  "qaId": "qa-remembered-1692000000000",
  "totalQAs": 7
}
```

The saved Q&A is available for future Q&A retrieval scoring. Returns `400` for missing fields or `404` for unknown tokens/profiles.

## Model Fallback Behavior

The requested model is attempted first. Transient `503`, `429`, `404`, `NOT_FOUND`, and equivalent high-demand errors are retried up to three times per candidate. The server then moves through the configured Flash model list and returns the effective model used. Non-transient errors are not retried blindly.
