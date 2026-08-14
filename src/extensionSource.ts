export interface ExtensionFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const MANIFEST_JSON = JSON.stringify(
  {
    manifest_version: 3,
    name: "Gemini Form Autofill",
    version: "1.0.0",
    description:
      "Autofill form fields using Gemini AI grounded in current page text or uploaded PDF documents.",
    permissions: ["activeTab", "scripting", "storage"],
    host_permissions: ["<all_urls>"],
    action: {
      default_popup: "popup.html",
      default_title: "Gemini Form Autofill Settings",
      default_icon: {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png",
      },
    },
    background: {
      service_worker: "background.js",
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["content.js"],
        css: ["content.css"],
        run_at: "document_idle",
      },
    ],
    icons: {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
  },
  null,
  2
);

export const POPUP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gemini Form Autofill</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <!-- Header -->
    <header class="header">
      <div class="brand">
        <div class="brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            <path d="M5 3v4"/>
            <path d="M19 17v4"/>
            <path d="M3 5h4"/>
            <path d="M17 19h4"/>
          </svg>
        </div>
        <div>
          <h1 class="title">Gemini Form Autofill</h1>
          <p class="subtitle">Cloud Run & Gemini Grounding</p>
        </div>
      </div>
      <div id="statusBadge" class="status-badge status-idle">Ready</div>
    </header>

    <!-- Configuration Form -->
    <main class="content">
      <!-- Backend Endpoint -->
      <div class="form-group">
        <label for="backendUrl" class="field-label">
          <span>Backend Endpoint URL</span>
          <span class="required">*</span>
        </label>
        <input 
          type="url" 
          id="backendUrl" 
          class="input-control" 
          placeholder="https://your-cloud-run-app.run.app/answerQuestion"
          autocomplete="off"
          spellcheck="false"
        />
        <p class="help-text">The Cloud Run service POST /answerQuestion URL.</p>
      </div>

      <!-- Bearer Token -->
      <div class="form-group">
        <label for="bearerToken" class="field-label">
          <span>Bearer Token</span>
          <span class="optional">(if auth enabled)</span>
        </label>
        <div class="input-with-action">
          <input 
            type="password" 
            id="bearerToken" 
            class="input-control" 
            placeholder="Static AUTH_BEARER_TOKEN"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" id="toggleTokenVisibility" class="icon-button" title="Toggle visibility">
            <svg id="eyeIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <p class="help-text">Sent in Authorization: Bearer header.</p>
      </div>

      <!-- Gemini Model Selection -->
      <div class="form-group">
        <label for="modelSelect" class="field-label">
          <span>Gemini Model</span>
          <span class="optional">(3.0+ architecture)</span>
        </label>
        <select id="modelSelect" class="input-control">
          <option value="gemini-3.7-flash">Gemini 3.7 Flash (Default - Fast & Smart)</option>
          <option value="gemini-3.6-flash">Gemini 3.6 Flash (Next-Gen Ultra-Fast)</option>
          <option value="gemini-3.5-flash">Gemini 3.5 Flash (Multimodal Fast)</option>
          <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Ultra-Light 3.5)</option>
          <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ultra-Light 3.1)</option>
          <option value="gemini-3.0-flash">Gemini 3.0 Flash (High Throughput)</option>
          <option value="custom">Custom Model Identifier...</option>
        </select>
        <input 
          type="text" 
          id="customModelInput" 
          class="input-control hidden" 
          style="margin-top: 4px;"
          placeholder="e.g. gemini-3.5-flash-preview"
        />
        <p class="help-text">Select which Gemini 3.0+ model powers autofill.</p>
      </div>

      <div class="divider"></div>

      <!-- Context Grounding Options -->
      <div class="section-title">Context Grounding</div>

      <!-- Use Page Context Toggle -->
      <div class="form-group toggle-group">
        <div class="toggle-text">
          <div class="toggle-title">Use Current Web Page as Context</div>
          <div class="toggle-desc">Extracts visible page text or current text selection</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="usePageContext">
          <span class="slider round"></span>
        </label>
      </div>

      <!-- PDF Context Upload -->
      <div class="form-group">
        <label class="field-label">
          <span>Attach PDF Context</span>
          <span class="optional">(takes precedence)</span>
        </label>
        
        <div id="pdfUploadBox" class="pdf-upload-box">
          <input type="file" id="pdfFileInput" accept="application/pdf" class="hidden-file-input">
          <div id="pdfEmptyState" class="pdf-empty-state">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <span>Click to upload PDF context</span>
          </div>
          <div id="pdfActiveState" class="pdf-active-state hidden">
            <div class="pdf-file-info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div class="pdf-details">
                <span id="pdfFileName" class="pdf-name">document.pdf</span>
                <span id="pdfFileSize" class="pdf-size">0 KB</span>
              </div>
            </div>
            <button type="button" id="removePdfBtn" class="remove-pdf-btn" title="Remove PDF">✕</button>
          </div>
        </div>
      </div>

      <!-- System Instruction -->
      <div class="form-group">
        <label for="systemInstruction" class="field-label">
          <span>System Instruction</span>
          <span class="optional">(optional)</span>
        </label>
        <textarea 
          id="systemInstruction" 
          class="textarea-control" 
          rows="2" 
          placeholder="e.g., Answer concisely. Format dates as YYYY-MM-DD. Be professional."
        ></textarea>
      </div>

      <!-- Test Connection & Trigger Actions -->
      <div class="actions">
        <button type="button" id="testConnectionBtn" class="btn btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <span>Test Connection</span>
        </button>
        <button type="button" id="fillNowBtn" class="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <span>Autofill Current Tab</span>
        </button>
      </div>

      <!-- Notification Toast -->
      <div id="popupToast" class="toast hidden"></div>
    </main>
  </div>

  <script src="popup.js"></script>
</body>
</html>
`;

export const POPUP_CSS = `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: #0f172a;
  color: #f1f5f9;
  width: 360px;
  min-height: 480px;
  font-size: 13px;
  line-height: 1.4;
}

.popup-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid #334155;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: #f8fafc;
}

.subtitle {
  font-size: 11px;
  color: #94a3b8;
}

.status-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 12px;
  text-transform: capitalize;
}

.status-idle {
  background-color: #1e293b;
  color: #94a3b8;
  border: 1px solid #334155;
}

.status-success {
  background-color: #064e3b;
  color: #34d399;
  border: 1px solid #059669;
}

.status-error {
  background-color: #7f1d1d;
  color: #f87171;
  border: 1px solid #dc2626;
}

.status-loading {
  background-color: #1e3a8a;
  color: #60a5fa;
  border: 1px solid #2563eb;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  color: #cbd5e1;
}

.required {
  color: #f43f5e;
  margin-left: 2px;
}

.optional {
  font-size: 10px;
  color: #64748b;
  font-weight: normal;
}

.input-control, .textarea-control {
  width: 100%;
  padding: 8px 10px;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f8fafc;
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input-control:focus, .textarea-control:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
}

.textarea-control {
  resize: vertical;
  min-height: 52px;
  font-family: inherit;
}

.input-with-action {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-action .input-control {
  padding-right: 36px;
}

.icon-button {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.icon-button:hover {
  color: #f1f5f9;
  background-color: #334155;
}

.help-text {
  font-size: 10px;
  color: #64748b;
  margin-top: 2px;
}

.divider {
  height: 1px;
  background-color: #334155;
  margin: 4px 0;
}

.section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #94a3b8;
  font-weight: 600;
}

.toggle-group {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  background-color: #1e293b;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #334155;
}

.toggle-title {
  font-size: 12px;
  font-weight: 500;
  color: #e2e8f0;
}

.toggle-desc {
  font-size: 10px;
  color: #64748b;
}

.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #475569;
  transition: 0.2s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
}

.slider.round {
  border-radius: 20px;
}

.slider.round:before {
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #3b82f6;
}

input:checked + .slider:before {
  transform: translateX(16px);
}

.pdf-upload-box {
  background-color: #1e293b;
  border: 1px dashed #475569;
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.pdf-upload-box:hover {
  border-color: #60a5fa;
}

.hidden-file-input {
  display: none;
}

.pdf-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #94a3b8;
  font-size: 12px;
}

.pdf-active-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pdf-file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.pdf-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pdf-name {
  font-size: 12px;
  color: #f1f5f9;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.pdf-size {
  font-size: 10px;
  color: #64748b;
}

.remove-pdf-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.remove-pdf-btn:hover {
  color: #f87171;
  background-color: #334155;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 8px;
  margin-top: 4px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #334155;
  color: #f1f5f9;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #475569;
}

.btn-primary {
  background-color: #2563eb;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.toast {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  text-align: center;
  animation: fadeIn 0.2s ease-in-out;
}

.toast.success {
  background-color: #064e3b;
  color: #34d399;
  border: 1px solid #059669;
}

.toast.error {
  background-color: #7f1d1d;
  color: #f87171;
  border: 1px solid #dc2626;
}

.hidden {
  display: none !important;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

export const POPUP_JS = `// Gemini Form Autofill - Popup Script
document.addEventListener("DOMContentLoaded", async () => {
  const backendUrlInput = document.getElementById("backendUrl");
  const bearerTokenInput = document.getElementById("bearerToken");
  const toggleTokenBtn = document.getElementById("toggleTokenVisibility");
  const modelSelect = document.getElementById("modelSelect");
  const customModelInput = document.getElementById("customModelInput");
  const usePageContextCheckbox = document.getElementById("usePageContext");
  const systemInstructionInput = document.getElementById("systemInstruction");
  
  const pdfUploadBox = document.getElementById("pdfUploadBox");
  const pdfFileInput = document.getElementById("pdfFileInput");
  const pdfEmptyState = document.getElementById("pdfEmptyState");
  const pdfActiveState = document.getElementById("pdfActiveState");
  const pdfFileName = document.getElementById("pdfFileName");
  const pdfFileSize = document.getElementById("pdfFileSize");
  const removePdfBtn = document.getElementById("removePdfBtn");

  const testConnectionBtn = document.getElementById("testConnectionBtn");
  const fillNowBtn = document.getElementById("fillNowBtn");
  const statusBadge = document.getElementById("statusBadge");
  const toast = document.getElementById("popupToast");

  // 1. Load saved configuration from chrome.storage.local
  chrome.storage.local.get(
    ["backendUrl", "bearerToken", "selectedModel", "customModel", "usePageContext", "systemInstruction", "pdfData", "pdfName", "pdfSize", "pdfMimeType"],
    (result) => {
      if (result.backendUrl) backendUrlInput.value = result.backendUrl;
      if (result.bearerToken) bearerTokenInput.value = result.bearerToken;
      
      const savedModel = result.selectedModel || "gemini-3.7-flash";
      const standardModels = [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.0-flash"
      ];
      if (standardModels.includes(savedModel)) {
        modelSelect.value = savedModel;
        customModelInput.classList.add("hidden");
      } else {
        modelSelect.value = "custom";
        customModelInput.value = savedModel;
        customModelInput.classList.remove("hidden");
      }

      if (typeof result.usePageContext === "boolean") {
        usePageContextCheckbox.checked = result.usePageContext;
      } else {
        usePageContextCheckbox.checked = true; // default true
      }
      if (result.systemInstruction) systemInstructionInput.value = result.systemInstruction;

      if (result.pdfData && result.pdfName) {
        showActivePdf(result.pdfName, result.pdfSize || 0);
      }
    }
  );

  // Helper: show toast message
  function showToast(msg, isError = false) {
    toast.textContent = msg;
    toast.className = isError ? "toast error" : "toast success";
    toast.classList.remove("hidden");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 3500);
  }

  // 2. Auto-save text inputs on change
  function saveSettings() {
    let effectiveModel = modelSelect.value;
    if (effectiveModel === "custom") {
      effectiveModel = customModelInput.value.trim() || "gemini-3.7-flash";
    }

    chrome.storage.local.set({
      backendUrl: backendUrlInput.value.trim(),
      bearerToken: bearerTokenInput.value.trim(),
      selectedModel: effectiveModel,
      customModel: customModelInput.value.trim(),
      usePageContext: usePageContextCheckbox.checked,
      systemInstruction: systemInstructionInput.value.trim()
    });
  }

  backendUrlInput.addEventListener("input", saveSettings);
  bearerTokenInput.addEventListener("input", saveSettings);
  modelSelect.addEventListener("change", () => {
    if (modelSelect.value === "custom") {
      customModelInput.classList.remove("hidden");
      customModelInput.focus();
    } else {
      customModelInput.classList.add("hidden");
    }
    saveSettings();
  });
  customModelInput.addEventListener("input", saveSettings);
  usePageContextCheckbox.addEventListener("change", saveSettings);
  systemInstructionInput.addEventListener("input", saveSettings);

  // Toggle bearer token visibility
  toggleTokenBtn.addEventListener("click", () => {
    if (bearerTokenInput.type === "password") {
      bearerTokenInput.type = "text";
    } else {
      bearerTokenInput.type = "password";
    }
  });

  // 3. PDF Upload Handling
  pdfUploadBox.addEventListener("click", (e) => {
    if (e.target !== removePdfBtn && !removePdfBtn.contains(e.target)) {
      pdfFileInput.click();
    }
  });

  function showActivePdf(name, sizeInBytes) {
    pdfEmptyState.classList.add("hidden");
    pdfActiveState.classList.remove("hidden");
    pdfFileName.textContent = name;
    const kb = (sizeInBytes / 1024).toFixed(1);
    pdfFileSize.textContent = kb + " KB";
  }

  function clearPdf() {
    chrome.storage.local.remove(["pdfData", "pdfName", "pdfSize", "pdfMimeType"], () => {
      pdfFileInput.value = "";
      pdfEmptyState.classList.remove("hidden");
      pdfActiveState.classList.add("hidden");
      showToast("PDF context removed");
    });
  }

  removePdfBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearPdf();
  });

  pdfFileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      showToast("Please select a valid PDF document.", true);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result;
      chrome.storage.local.set({
        pdfData: base64Data,
        pdfName: file.name,
        pdfSize: file.size,
        pdfMimeType: "application/pdf"
      }, () => {
        showActivePdf(file.name, file.size);
        showToast("PDF attached as active context!");
      });
    };
    reader.onerror = () => {
      showToast("Failed to read PDF file.", true);
    };
    reader.readAsDataURL(file);
  });

  // 4. Test Connection
  testConnectionBtn.addEventListener("click", async () => {
    const url = backendUrlInput.value.trim();
    if (!url) {
      showToast("Please enter a backend endpoint URL first.", true);
      backendUrlInput.focus();
      return;
    }

    statusBadge.textContent = "Testing...";
    statusBadge.className = "status-badge status-loading";
    testConnectionBtn.disabled = true;

    try {
      let effectiveModel = modelSelect.value;
      if (effectiveModel === "custom") {
        effectiveModel = customModelInput.value.trim() || "gemini-3.7-flash";
      }

      const response = await chrome.runtime.sendMessage({
        action: "testEndpoint",
        endpointUrl: url,
        bearerToken: bearerTokenInput.value.trim(),
        model: effectiveModel
      });

      if (response && response.success) {
        statusBadge.textContent = "Online";
        statusBadge.className = "status-badge status-success";
        showToast("Connected successfully to Gemini backend (" + (response.data?.model || effectiveModel) + ")!");
      } else {
        throw new Error(response?.error || "Connection failed.");
      }
    } catch (err) {
      statusBadge.textContent = "Error";
      statusBadge.className = "status-badge status-error";
      showToast(err.message || "Failed to reach backend endpoint", true);
    } finally {
      testConnectionBtn.disabled = false;
    }
  });

  // 5. Trigger Autofill on current tab
  fillNowBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showToast("No active tab found.", true);
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, { action: "triggerAutofill" });
      window.close();
    } catch (err) {
      showToast("Could not trigger on this page. Try refreshing the tab.", true);
    }
  });
});
`;

export const BACKGROUND_JS = `// Gemini Form Autofill - Background Service Worker (Manifest V3)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "answerQuestion") {
    handleAnswerQuestion(request)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === "testEndpoint") {
    handleTestEndpoint(request)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

/**
 * Calls the backend POST /answerQuestion endpoint with the question,
 * optional model, optional context (text or PDF), optional system instruction, and Bearer token.
 */
async function handleAnswerQuestion(payload) {
  const storage = await chrome.storage.local.get(["backendUrl", "bearerToken", "selectedModel"]);
  const backendUrl = storage.backendUrl ? storage.backendUrl.trim() : "";
  const bearerToken = storage.bearerToken ? storage.bearerToken.trim() : "";
  const model = payload.model || storage.selectedModel || "gemini-3.7-flash";

  if (!backendUrl) {
    throw new Error("Backend Endpoint URL is not configured in the Gemini Extension popup.");
  }

  const headers = {
    "Content-Type": "application/json",
  };

  if (bearerToken) {
    headers["Authorization"] = "Bearer " + bearerToken;
  }

  const requestBody = {
    question: payload.question,
    model: model,
    context: payload.context || null,
    systemInstruction: payload.systemInstruction || null,
  };

  const response = await fetch(backendUrl, {
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
 * Tests connection with a minimal test question to verify endpoint and Bearer auth.
 */
async function handleTestEndpoint(payload) {
  const { endpointUrl, bearerToken, model } = payload;
  const headers = {
    "Content-Type": "application/json",
  };

  if (bearerToken) {
    headers["Authorization"] = "Bearer " + bearerToken;
  }

  const response = await fetch(endpointUrl, {
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

export const CONTENT_JS = `// Gemini Form Autofill - Content Script
(function () {
  if (window.__geminiAutofillInjected) return;
  window.__geminiAutofillInjected = true;

  let isAutofilling = false;

  // 1. Create Floating Trigger Widget
  function createFloatingTrigger() {
    if (document.getElementById("gemini-autofill-fab-container")) return;

    const container = document.createElement("div");
    container.id = "gemini-autofill-fab-container";
    container.className = "gemini-fab-container";

    container.innerHTML = 
      '<div id="gemini-autofill-fab" class="gemini-fab" title="Fill form with Gemini AI">' +
        '<div class="gemini-fab-icon">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>' +
          '</svg>' +
        '</div>' +
        '<span class="gemini-fab-label">AutoFill Form</span>' +
      '</div>' +
      '<div id="gemini-autofill-status-pill" class="gemini-status-pill gemini-hidden">' +
        '<span class="gemini-spinner"></span>' +
        '<span id="gemini-status-text">Scanning form...</span>' +
      '</div>';

    document.body.appendChild(container);

    const fab = document.getElementById("gemini-autofill-fab");
    fab.addEventListener("click", () => {
      if (!isAutofilling) {
        startFormAutofill();
      }
    });
  }

  // 2. Listen to popup triggers
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "triggerAutofill") {
      startFormAutofill();
      sendResponse({ status: "started" });
    }
  });

  // 3. Question Extraction with Priority Order
  // Priority: 1. Linked <label> -> 2. aria-label/aria-labelledby -> 3. placeholder -> 4. name/id -> 5. nearest text node
  function extractQuestionForField(element) {
    // 1. Linked <label> via for="id" or parent <label>
    if (element.id) {
      try {
        const labelFor = document.querySelector('label[for="' + CSS.escape(element.id) + '"]');
        if (labelFor && labelFor.innerText && labelFor.innerText.trim()) {
          return cleanQuestionText(labelFor.innerText);
        }
      } catch (e) {
        // CSS.escape fallback
      }
    }
    const parentLabel = element.closest("label");
    if (parentLabel && parentLabel.innerText && parentLabel.innerText.trim()) {
      const clone = parentLabel.cloneNode(true);
      const innerInput = clone.querySelector("input, textarea, select");
      if (innerInput) innerInput.remove();
      if (clone.innerText && clone.innerText.trim()) {
        return cleanQuestionText(clone.innerText);
      }
    }

    // 2. aria-label or aria-labelledby
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.trim()) {
      return cleanQuestionText(ariaLabel);
    }
    const ariaLabelledby = element.getAttribute("aria-labelledby");
    if (ariaLabelledby) {
      const ids = ariaLabelledby.split(/\\s+/);
      const texts = ids
        .map((id) => document.getElementById(id)?.innerText?.trim())
        .filter(Boolean);
      if (texts.length > 0) {
        return cleanQuestionText(texts.join(" "));
      }
    }

    // 3. placeholder
    const placeholder = element.getAttribute("placeholder");
    if (placeholder && placeholder.trim()) {
      return cleanQuestionText(placeholder);
    }

    // 4. name, title, or id
    const titleAttr = element.getAttribute("title");
    if (titleAttr && titleAttr.trim()) {
      return cleanQuestionText(titleAttr);
    }
    const nameAttr = element.getAttribute("name");
    if (nameAttr && nameAttr.trim()) {
      return humanizeIdentifier(nameAttr);
    }
    if (element.id && element.id.trim()) {
      return humanizeIdentifier(element.id);
    }

    // 5. Nearest preceding text node or heading / sibling label
    const nearestText = findPrecedingText(element);
    if (nearestText) {
      return cleanQuestionText(nearestText);
    }

    return "Answer this form field accurately:";
  }

  function cleanQuestionText(text) {
    return text
      .replace(/[\\r\\n]+/g, " ")
      .replace(/[*:]+$/g, "")
      .replace(/\\s+/g, " ")
      .trim();
  }

  function humanizeIdentifier(str) {
    return str
      .replace(/[_-]+/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .trim();
  }

  function findPrecedingText(el) {
    let prev = el.previousElementSibling;
    while (prev) {
      if (prev.matches("label, h1, h2, h3, h4, h5, h6, p, span, div") && prev.innerText && prev.innerText.trim()) {
        const t = prev.innerText.trim();
        if (t.length > 1 && t.length < 150) return t;
      }
      prev = prev.previousElementSibling;
    }

    const parent = el.parentElement;
    if (parent) {
      let parentPrev = parent.previousElementSibling;
      while (parentPrev) {
        if (parentPrev.innerText && parentPrev.innerText.trim()) {
          const t = parentPrev.innerText.trim();
          if (t.length > 1 && t.length < 150) return t;
        }
        parentPrev = parentPrev.previousElementSibling;
      }
    }

    return null;
  }

  // 4. Detect fillable elements
  function getFillableFields() {
    const selector = 
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="image"]),' +
      'textarea,' +
      '[contenteditable="true"]';

    const elements = Array.from(document.querySelectorAll(selector));

    return elements.filter((el) => {
      const style = window.getComputedStyle(el);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0" ||
        el.offsetWidth === 0 ||
        el.offsetHeight === 0
      ) {
        return false;
      }
      if (el.disabled || el.readOnly) return false;
      return true;
    });
  }

  // 5. Main Autofill Routine
  async function startFormAutofill() {
    isAutofilling = true;
    const fab = document.getElementById("gemini-autofill-fab");
    const statusPill = document.getElementById("gemini-autofill-status-pill");
    const statusText = document.getElementById("gemini-status-text");

    if (fab) fab.classList.add("gemini-hidden");
    if (statusPill) statusPill.classList.remove("gemini-hidden");

    try {
      const storage = await chrome.storage.local.get([
        "backendUrl",
        "bearerToken",
        "selectedModel",
        "usePageContext",
        "systemInstruction",
        "pdfData",
        "pdfMimeType",
      ]);

      if (!storage.backendUrl) {
        showToastNotification("Please open the Gemini extension popup and set your Backend Endpoint URL.", true);
        return;
      }

      let context = null;

      // Priority 1: PDF context
      if (storage.pdfData) {
        context = {
          type: "pdf",
          data: storage.pdfData,
          mimeType: storage.pdfMimeType || "application/pdf",
        };
      }
      // Priority 2: Page text
      else if (storage.usePageContext !== false) {
        const selection = window.getSelection()?.toString()?.trim();
        const pageText = selection || document.body.innerText?.slice(0, 30000) || "";
        if (pageText) {
          context = {
            type: "text",
            data: pageText,
          };
        }
      }

      const systemInstruction = storage.systemInstruction || null;
      const model = storage.selectedModel || "gemini-3.7-flash";

      const fields = getFillableFields();
      if (fields.length === 0) {
        showToastNotification("No fillable form fields found on this page.");
        return;
      }

      let filledCount = 0;

      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const question = extractQuestionForField(field);

        if (statusText) {
          statusText.textContent = "Filling field " + (i + 1) + " of " + fields.length + " (" + model + ")...";
        }

        field.classList.add("gemini-highlight-active");
        field.scrollIntoView({ behavior: "smooth", block: "nearest" });

        try {
          const response = await chrome.runtime.sendMessage({
            action: "answerQuestion",
            question,
            model,
            context,
            systemInstruction,
          });

          if (response && response.success && response.answer) {
            applyAnswerToField(field, response.answer);
            field.classList.remove("gemini-highlight-active");
            field.classList.add("gemini-highlight-success");
            setTimeout(() => field.classList.remove("gemini-highlight-success"), 1500);
            filledCount++;
          } else {
            field.classList.remove("gemini-highlight-active");
          }
        } catch (fieldErr) {
          console.error("Error answering field:", fieldErr);
          field.classList.remove("gemini-highlight-active");
        }
      }

      showToastNotification("Successfully autofilled " + filledCount + " of " + fields.length + " fields!");
    } catch (err) {
      console.error("Gemini Autofill fatal error:", err);
      showToastNotification("Autofill failed: " + err.message, true);
    } finally {
      isAutofilling = false;
      if (statusPill) statusPill.classList.add("gemini-hidden");
      if (fab) fab.classList.remove("gemini-hidden");
    }
  }

  // 6. Value Application & Synthetic Event Dispatch
  function applyAnswerToField(field, answer) {
    if (field.isContentEditable) {
      field.innerText = answer;
    } else {
      field.value = answer;
    }

    field.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    field.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  }

  // 7. Toast Notifications in Page
  function showToastNotification(message, isError = false) {
    let toast = document.getElementById("gemini-autofill-page-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "gemini-autofill-page-toast";
      document.body.appendChild(toast);
    }

    toast.className = isError ? "gemini-page-toast gemini-toast-error" : "gemini-page-toast gemini-toast-success";
    toast.textContent = message;
    toast.classList.remove("gemini-hidden");

    setTimeout(() => {
      toast.classList.add("gemini-hidden");
    }, 4500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createFloatingTrigger);
  } else {
    createFloatingTrigger();
  }
})();
`;

export const CONTENT_CSS = `/* Gemini Form Autofill - Content Script Injected Styles */

.gemini-fab-container {
  position: fixed !important;
  bottom: 24px !important;
  right: 24px !important;
  z-index: 2147483640 !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
}

.gemini-fab {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%) !important;
  color: #ffffff !important;
  padding: 10px 16px !important;
  border-radius: 9999px !important;
  box-shadow: 0 4px 14px rgba(30, 64, 175, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15) !important;
  cursor: pointer !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease !important;
  user-select: none !important;
}

.gemini-fab:hover {
  transform: translateY(-2px) scale(1.03) !important;
  box-shadow: 0 8px 20px rgba(30, 64, 175, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.3) !important;
}

.gemini-fab:active {
  transform: translateY(0) scale(0.98) !important;
}

.gemini-fab-icon {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  animation: gemini-spin-subtle 4s ease-in-out infinite alternate !important;
}

.gemini-status-pill {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  background: #0f172a !important;
  color: #f8fafc !important;
  padding: 10px 18px !important;
  border-radius: 9999px !important;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4), 0 0 0 1px #334155 !important;
  font-size: 13px !important;
  font-weight: 500 !important;
}

.gemini-spinner {
  width: 14px !important;
  height: 14px !important;
  border: 2px solid rgba(255, 255, 255, 0.2) !important;
  border-top-color: #38bdf8 !important;
  border-radius: 50% !important;
  animation: gemini-spin 0.8s linear infinite !important;
}

.gemini-highlight-active {
  outline: 3px solid #3b82f6 !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.4) !important;
  transition: outline 0.15s ease, box-shadow 0.15s ease !important;
}

.gemini-highlight-success {
  outline: 3px solid #10b981 !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.4) !important;
  transition: outline 0.2s ease, box-shadow 0.2s ease !important;
}

.gemini-page-toast {
  position: fixed !important;
  top: 24px !important;
  right: 24px !important;
  z-index: 2147483647 !important;
  padding: 12px 20px !important;
  border-radius: 8px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25) !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  animation: gemini-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.gemini-toast-success {
  background-color: #064e3b !important;
  color: #6ee7b7 !important;
  border: 1px solid #059669 !important;
}

.gemini-toast-error {
  background-color: #7f1d1d !important;
  color: #fca5a5 !important;
  border: 1px solid #dc2626 !important;
}

.gemini-hidden {
  display: none !important;
}

@keyframes gemini-spin {
  to { transform: rotate(360deg); }
}

@keyframes gemini-spin-subtle {
  0% { transform: rotate(0deg) scale(1); }
  100% { transform: rotate(20deg) scale(1.1); }
}

@keyframes gemini-slide-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

export const EXTENSION_FILES: ExtensionFile[] = [
  {
    name: "manifest.json",
    path: "manifest.json",
    language: "json",
    description: "Manifest V3 configuration with activeTab, scripting, storage permissions, service worker, and content scripts.",
    content: MANIFEST_JSON,
  },
  {
    name: "popup.html",
    path: "popup.html",
    language: "html",
    description: "Extension popup interface with endpoint configuration, bearer token, page context toggle, and PDF uploader.",
    content: POPUP_HTML,
  },
  {
    name: "popup.css",
    path: "popup.css",
    language: "css",
    description: "Styling for the popup UI.",
    content: POPUP_CSS,
  },
  {
    name: "popup.js",
    path: "popup.js",
    language: "javascript",
    description: "Handles user inputs, PDF base64 conversion with FileReader, storage persistence, and connection testing.",
    content: POPUP_JS,
  },
  {
    name: "background.js",
    path: "background.js",
    language: "javascript",
    description: "Manifest V3 service worker: proxies secure POST /answerQuestion requests with Authorization Bearer header.",
    content: BACKGROUND_JS,
  },
  {
    name: "content.js",
    path: "content.js",
    language: "javascript",
    description: "Content script: question extraction heuristics, floating trigger button, autofill loop, and synthetic event dispatch.",
    content: CONTENT_JS,
  },
  {
    name: "content.css",
    path: "content.css",
    language: "css",
    description: "Styles for in-page floating trigger button, active field highlighting, and status pill.",
    content: CONTENT_CSS,
  },
];
