export const BACKGROUND_JS = `// Gemini Form Autofill - Background Service Worker (Manifest V3)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "batchAnswerForm") {
    handleBatchAnswerForm(request)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === "answerQuestion") {
    handleAnswerQuestion(request)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "testEndpoint") {
    handleTestEndpoint(request)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

/**
 * Resolve a user-supplied backend URL to a specific endpoint path.
 * Handles bare origins, sibling endpoint swaps, and full URLs alike.
 */
function toEndpoint(base, path) {
  const trimmed = (base || "").trim();
  if (!trimmed) return "";
  if (trimmed.endsWith(path)) return trimmed;
  const sibling = path === "/batchAnswerForm" ? "/answerQuestion" : "/batchAnswerForm";
  if (trimmed.endsWith(sibling)) {
    return trimmed.slice(0, -sibling.length) + path;
  }
  try {
    const u = new URL(trimmed);
    u.pathname = path;
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch (e) {
    const lastSlash = trimmed.lastIndexOf("/");
    const origin = lastSlash > 8 ? trimmed.slice(0, lastSlash) : trimmed;
    return origin + path;
  }
}

/**
 * Item 1: High-Performance Batch Form Completion
 * Calls POST /batchAnswerForm with all fields in a single HTTP request.
 */
async function handleBatchAnswerForm(payload) {
  const storage = await chrome.storage.local.get([
    "backendUrl",
    "pairingToken",
    "userProfile",
    "selectedModel",
    "pdfData",
    "pdfMimeType",
    "systemInstruction",
  ]);

  let backendUrl = storage.backendUrl ? storage.backendUrl.trim() : "";
  const model = payload.model || storage.selectedModel || "gemini-3.7-flash";

  if (!backendUrl) {
    throw new Error("Backend Endpoint URL is not configured in the Gemini Extension popup.");
  }

  // Derive /batchAnswerForm URL if /answerQuestion was specified
  const batchUrl = toEndpoint(backendUrl, "/batchAnswerForm");

  const headers = {
    "Content-Type": "application/json",
  };

  let context = payload.context;
  if (!context && storage.pdfData) {
    context = {
      type: "pdf",
      data: storage.pdfData,
      mimeType: storage.pdfMimeType || "application/pdf",
    };
  }

  const requestBody = {
    fields: payload.fields,
    pageContext: payload.pageContext || null,
    model: model,
    context: context || null,
    systemInstruction: payload.systemInstruction || storage.systemInstruction || null,
    pairingToken: storage.pairingToken || null,
    userProfile: payload.userProfile || storage.userProfile || null,
  };

  const response = await fetch(batchUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  const responseData = await response.json().catch(() => null);

  if (!response.ok || !responseData || !responseData.success) {
    const errorMsg =
      responseData?.error ||
      "Batch fill failed with HTTP " + response.status + " (" + response.statusText + ")";
    throw new Error(errorMsg);
  }

  return {
    success: true,
    answers: responseData.answers || [],
    modelUsed: responseData.modelUsed || model,
    timeMs: responseData.timeMs || 0,
  };
}

/**
 * Single-question fallback handler
 */
async function handleAnswerQuestion(payload) {
  const storage = await chrome.storage.local.get([
    "backendUrl",
    "pairingToken",
    "userProfile",
    "selectedModel",
    "pdfData",
    "pdfMimeType",
    "systemInstruction",
  ]);
  const backendUrl = storage.backendUrl ? storage.backendUrl.trim() : "";
  const model = payload.model || storage.selectedModel || "gemini-3.7-flash";

  if (!backendUrl) {
    throw new Error("Backend Endpoint URL is not configured in the Gemini Extension popup.");
  }

  const singleUrl = toEndpoint(backendUrl, "/answerQuestion");

  const headers = {
    "Content-Type": "application/json",
  };

  let context = payload.context;
  if (!context && storage.pdfData) {
    context = {
      type: "pdf",
      data: storage.pdfData,
      mimeType: storage.pdfMimeType || "application/pdf",
    };
  }

  const requestBody = {
    question: payload.question,
    model: model,
    context: context || null,
    systemInstruction: payload.systemInstruction || storage.systemInstruction || null,
    pairingToken: storage.pairingToken || null,
    userProfile: payload.userProfile || storage.userProfile || null,
  };

  const response = await fetch(singleUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  const responseData = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      responseData?.error ||
      "Backend returned HTTP " + response.status + " (" + response.statusText + ")";
    throw new Error(errorMsg);
  }

  return {
    success: true,
    answer: responseData?.answer ?? "",
    model: responseData?.model ?? model,
  };
}

/**
 * Tests connection with a minimal test question.
 */
async function handleTestEndpoint(payload) {
  const { endpointUrl, model } = payload;
  const headers = {
    "Content-Type": "application/json",
  };

  const testUrl = toEndpoint(endpointUrl, "/answerQuestion");

  const response = await fetch(testUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      question: "Hello, reply with OK if you can read this.",
      model: model || "gemini-3.7-flash",
      context: null,
      systemInstruction: "Reply with only OK.",
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || ("HTTP " + response.status + " " + response.statusText));
  }

  return { success: true, data };
}
`;
