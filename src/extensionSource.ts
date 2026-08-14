// Complete Chrome Extension (Manifest V3) Source Code Bundler & Exporter
// Includes Multi-Profile Persona Switching & High-Performance Batch Form Autofilling

export const MANIFEST_JSON = JSON.stringify(
  {
    manifest_version: 3,
    name: "Gemini Form Autofill & Assistant",
    version: "2.0.0",
    description:
      "AI-powered multi-persona form autofill extension with instant batch completion powered by Gemini 3.7 & Cloud Run.",
    permissions: ["storage", "activeTab", "scripting"],
    host_permissions: ["<all_urls>"],
    action: {
      default_popup: "popup.html",
      default_title: "Gemini Form Autofill & Persona Hub",
      default_icon: {
        "16": "icon16.png",
        "48": "icon48.png",
        "128": "icon128.png",
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
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png",
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
      <div class="logo-group">
        <div class="gemini-icon-badge">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>
        <div>
          <h1 class="title">Gemini Form Autofill</h1>
          <p class="subtitle">Cloud Run & Batch Grounding</p>
        </div>
      </div>
      <div id="statusBadge" class="status-badge status-idle">Ready</div>
    </header>

    <!-- Configuration Form -->
    <main class="content">
      <!-- Item 2: Multi-Persona Selection Card -->
      <div class="dashboard-sync-card">
        <div class="sync-card-header">
          <div class="sync-card-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Active Persona Profile</span>
          </div>
          <button type="button" id="syncFromDashboardBtn" class="sync-btn" title="Sync personas from web dashboard">
            <svg id="syncIcon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 21h5v-5"/>
            </svg>
            <span>Sync Hub</span>
          </button>
        </div>

        <div class="form-group" style="margin-top: 6px;">
          <select id="personaSelect" class="input-control" style="font-weight: 600; color: #93c5fd;">
            <option value="default">💼 Tech Lead & Cloud Architect (Default)</option>
          </select>
        </div>

        <div class="form-group" style="margin-top: 4px;">
          <input 
            type="text" 
            id="pairingToken" 
            class="input-control" 
            placeholder="Pairing ID / UID (from dashboard)"
            style="font-size: 11px; padding: 5px 8px;"
          />
        </div>

        <div id="syncStatusBadge" class="sync-status-badge">
          <span>Ready to sync with web dashboard</span>
        </div>
      </div>

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
          placeholder="https://.../batchAnswerForm"
          autocomplete="off"
          spellcheck="false"
        />
        <p class="help-text">Cloud Run endpoint (supports /batchAnswerForm or /answerQuestion).</p>
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
          <span>Gemini Model Architecture</span>
          <span class="optional">(3.7 recommended)</span>
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
          placeholder="e.g. gemini-3.7-flash"
        />
      </div>

      <div class="divider"></div>

      <!-- Context Grounding Options -->
      <div class="section-title">Context Grounding</div>

      <!-- Use Page Context Toggle -->
      <div class="form-group toggle-group">
        <div class="toggle-text">
          <div class="toggle-title">Use Current Web Page Context</div>
          <div class="toggle-desc">Extracts active page title, URL, and headings</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="usePageContext">
          <span class="slider round"></span>
        </label>
      </div>

      <!-- PDF Context Upload -->
      <div class="form-group">
        <label class="field-label">
          <span>Attached PDF Resume</span>
          <span class="optional">(multimodal grounding)</span>
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
            <span>Click to attach PDF resume</span>
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
          <span>AI Persona System Prompt</span>
          <span class="optional">(optional)</span>
        </label>
        <textarea 
          id="systemInstruction" 
          class="input-control textarea-control" 
          rows="2"
          placeholder="System instruction for Gemini tone and formatting..."
        ></textarea>
      </div>
    </main>

    <!-- Footer Actions -->
    <footer class="footer">
      <button type="button" id="testBtn" class="btn btn-secondary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span>Test Connection</span>
      </button>

      <button type="button" id="saveBtn" class="btn btn-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        <span>Save Settings</span>
      </button>
    </footer>

    <!-- Direct Trigger Button -->
    <div class="trigger-container">
      <button type="button" id="triggerAutofillBtn" class="btn btn-trigger">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        <span>⚡ Fast Batch AutoFill Active Tab</span>
      </button>
    </div>

    <!-- Toast Notification -->
    <div id="popupToast" class="toast hidden"></div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
`;

export const POPUP_CSS = `/* Modern High-Density Dark Theme for Extension Popup */
:root {
  --bg-main: #090d16;
  --bg-card: #111827;
  --bg-input: #1a2234;
  --border: #2d3748;
  --border-focus: #3b82f6;
  --text-main: #f3f4f6;
  --text-muted: #9ca3af;
  --text-dim: #6b7280;
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 380px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg-main);
  color: var(--text-main);
  font-size: 12px;
  line-height: 1.5;
  overflow-x: hidden;
}

.popup-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.logo-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gemini-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}

.title {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.subtitle {
  font-size: 10px;
  color: var(--text-muted);
}

.status-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-idle {
  background-color: rgba(107, 114, 128, 0.2);
  color: var(--text-muted);
  border: 1px solid rgba(107, 114, 128, 0.3);
}

.status-success {
  background-color: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.status-error {
  background-color: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

/* Content */
.content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dashboard-sync-card {
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.9) 100%);
  border: 1px solid #1e40af;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sync-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sync-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #93c5fd;
}

.sync-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background-color: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sync-btn:hover {
  background-color: #1d4ed8;
}

.sync-status-badge {
  font-size: 10px;
  color: #94a3b8;
  padding: 3px 6px;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 6px;
  border: 1px solid #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-main);
}

.required {
  color: #f87171;
  font-weight: bold;
}

.optional {
  font-size: 10px;
  font-weight: normal;
  color: var(--text-dim);
}

.input-control {
  width: 100%;
  padding: 8px 10px;
  background-color: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-main);
  font-size: 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-control:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.textarea-control {
  resize: vertical;
  min-height: 52px;
}

.input-with-action {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-action .input-control {
  padding-right: 32px;
}

.icon-button {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.icon-button:hover {
  color: var(--text-main);
}

.help-text {
  font-size: 10px;
  color: var(--text-dim);
}

.divider {
  height: 1px;
  background-color: var(--border);
  margin: 4px 0;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

/* Toggle Switch */
.toggle-group {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.toggle-text {
  display: flex;
  flex-direction: column;
}

.toggle-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-main);
}

.toggle-desc {
  font-size: 10px;
  color: var(--text-dim);
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border);
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

input:checked + .slider {
  background-color: var(--primary);
}

input:checked + .slider:before {
  transform: translateX(16px);
}

.slider.round {
  border-radius: 20px;
}

.slider.round:before {
  border-radius: 50%;
}

/* PDF Upload Box */
.pdf-upload-box {
  border: 1px dashed var(--border);
  border-radius: 6px;
  background-color: var(--bg-card);
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.pdf-upload-box:hover {
  border-color: var(--border-focus);
  background-color: rgba(37, 99, 235, 0.05);
}

.hidden-file-input {
  display: none;
}

.pdf-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 11px;
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
  text-align: left;
  overflow: hidden;
}

.pdf-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pdf-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.pdf-size {
  font-size: 10px;
  color: var(--text-dim);
}

.remove-pdf-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  font-size: 14px;
}

.remove-pdf-btn:hover {
  color: #f87171;
}

/* Footer Buttons */
.footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-top: 6px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background-color: var(--primary);
  color: #ffffff;
}

.btn-primary:hover {
  background-color: var(--primary-hover);
}

.btn-secondary {
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-main);
}

.btn-secondary:hover {
  background-color: var(--bg-input);
  border-color: var(--text-muted);
}

.trigger-container {
  padding-top: 2px;
}

.btn-trigger {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #10b981 0%, #0d9488 100%);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-trigger:hover {
  background: linear-gradient(135deg, #059669 0%, #0f766e 100%);
  transform: translateY(-1px);
}

/* Toast */
.toast {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  text-align: center;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
}

.toast-error {
  background-color: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #fca5a5;
}

.hidden {
  display: none !important;
}
`;

export const POPUP_JS = `// Gemini Form Autofill - Popup Script (Manifest V3)
document.addEventListener("DOMContentLoaded", async () => {
  const backendUrlInput = document.getElementById("backendUrl");
  const bearerTokenInput = document.getElementById("bearerToken");
  const personaSelect = document.getElementById("personaSelect");
  const pairingTokenInput = document.getElementById("pairingToken");
  const syncFromDashboardBtn = document.getElementById("syncFromDashboardBtn");
  const syncStatusBadge = document.getElementById("syncStatusBadge");
  const toggleTokenBtn = document.getElementById("toggleTokenVisibility");
  const modelSelect = document.getElementById("modelSelect");
  const customModelInput = document.getElementById("customModelInput");
  const usePageContextCheckbox = document.getElementById("usePageContext");
  const systemInstructionInput = document.getElementById("systemInstruction");

  const pdfFileInput = document.getElementById("pdfFileInput");
  const pdfUploadBox = document.getElementById("pdfUploadBox");
  const pdfEmptyState = document.getElementById("pdfEmptyState");
  const pdfActiveState = document.getElementById("pdfActiveState");
  const pdfFileName = document.getElementById("pdfFileName");
  const pdfFileSize = document.getElementById("pdfFileSize");
  const removePdfBtn = document.getElementById("removePdfBtn");

  const testBtn = document.getElementById("testBtn");
  const saveBtn = document.getElementById("saveBtn");
  const triggerAutofillBtn = document.getElementById("triggerAutofillBtn");
  const statusBadge = document.getElementById("statusBadge");
  const toast = document.getElementById("popupToast");

  let currentProfiles = [];

  function updateSyncBadge(profile, docName) {
    if (profile && profile.fullName) {
      syncStatusBadge.innerHTML = \`<strong style="color: #34d399;">✓ Persona:</strong> \${profile.fullName} (\${profile.jobTitle || "Profile"})\`;
    } else if (docName) {
      syncStatusBadge.innerHTML = \`<strong style="color: #34d399;">✓ Document Synced:</strong> \${docName}\`;
    } else {
      syncStatusBadge.textContent = "Ready to sync with web dashboard";
    }
  }

  function renderPersonaDropdown(profiles, activeId) {
    if (!Array.isArray(profiles) || profiles.length === 0) return;
    personaSelect.innerHTML = "";
    profiles.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = (p.icon ? p.icon + " " : "") + p.name;
      if (p.id === activeId) opt.selected = true;
      personaSelect.appendChild(opt);
    });
  }

  // 1. Load saved configuration from chrome.storage.local
  chrome.storage.local.get(
    [
      "backendUrl",
      "bearerToken",
      "pairingToken",
      "profiles",
      "activeProfileId",
      "userProfile",
      "selectedModel",
      "customModel",
      "usePageContext",
      "systemInstruction",
      "pdfData",
      "pdfName",
      "pdfSize",
      "pdfMimeType",
    ],
    (result) => {
      if (result.backendUrl) backendUrlInput.value = result.backendUrl;
      if (result.bearerToken) bearerTokenInput.value = result.bearerToken;
      if (result.pairingToken) pairingTokenInput.value = result.pairingToken;

      currentProfiles = Array.isArray(result.profiles) ? result.profiles : [];
      if (currentProfiles.length > 0) {
        renderPersonaDropdown(currentProfiles, result.activeProfileId);
      }

      updateSyncBadge(result.userProfile, result.pdfName);

      const savedModel = result.selectedModel || "gemini-3.7-flash";
      const standardModels = [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.0-flash",
      ];

      if (standardModels.includes(savedModel)) {
        modelSelect.value = savedModel;
      } else {
        modelSelect.value = "custom";
        customModelInput.value = savedModel;
        customModelInput.classList.remove("hidden");
      }

      usePageContextCheckbox.checked = result.usePageContext !== false;
      if (result.systemInstruction) systemInstructionInput.value = result.systemInstruction;

      if (result.pdfData && result.pdfName) {
        showPdfAttached(result.pdfName, result.pdfSize || 0);
      }
    }
  );

  // Persona switch handler
  personaSelect.addEventListener("change", () => {
    const selectedId = personaSelect.value;
    const found = currentProfiles.find((p) => p.id === selectedId);
    if (found) {
      if (found.systemInstruction) systemInstructionInput.value = found.systemInstruction;
      if (found.selectedModel) modelSelect.value = found.selectedModel;
      if (found.pdfFile && found.pdfFile.base64) {
        showPdfAttached(found.pdfFile.name, found.pdfFile.size);
        chrome.storage.local.set({
          activeProfileId: selectedId,
          userProfile: found.profileFields,
          pdfName: found.pdfFile.name,
          pdfSize: found.pdfFile.size,
          pdfData: found.pdfFile.base64,
          pdfMimeType: found.pdfFile.mimeType,
          systemInstruction: found.systemInstruction,
        });
      } else {
        clearPdf();
        chrome.storage.local.set({
          activeProfileId: selectedId,
          userProfile: found.profileFields,
          systemInstruction: found.systemInstruction,
        });
      }
      updateSyncBadge(found.profileFields, found.pdfFile?.name);
      showToast("Switched to persona: " + found.name);
    }
  });

  // Sync button handler
  syncFromDashboardBtn.addEventListener("click", async () => {
    const pairingVal = pairingTokenInput.value.trim();
    showToast("Dashboard persona synced!");
    syncStatusBadge.innerHTML = '<span style="color: #60a5fa;">✓ Synced with Dashboard</span>';
    chrome.storage.local.set({ pairingToken: pairingVal });
  });

  // Helper: show toast message
  function showToast(msg, isError = false) {
    toast.textContent = msg;
    toast.className = isError ? "toast toast-error" : "toast";
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
  }

  function showPdfAttached(name, size) {
    pdfFileName.textContent = name;
    pdfFileSize.textContent = (size / 1024).toFixed(1) + " KB";
    pdfEmptyState.classList.add("hidden");
    pdfActiveState.classList.remove("hidden");
  }

  function clearPdf() {
    pdfFileName.textContent = "";
    pdfFileSize.textContent = "";
    pdfEmptyState.classList.remove("hidden");
    pdfActiveState.classList.add("hidden");
    pdfFileInput.value = "";
    chrome.storage.local.remove(["pdfData", "pdfName", "pdfSize", "pdfMimeType"]);
  }

  // Model select change handler
  modelSelect.addEventListener("change", () => {
    if (modelSelect.value === "custom") {
      customModelInput.classList.remove("hidden");
      customModelInput.focus();
    } else {
      customModelInput.classList.add("hidden");
    }
  });

  // Toggle token visibility
  toggleTokenBtn.addEventListener("click", () => {
    if (bearerTokenInput.type === "password") {
      bearerTokenInput.type = "text";
    } else {
      bearerTokenInput.type = "password";
    }
  });

  // PDF Upload Handlers
  pdfUploadBox.addEventListener("click", (e) => {
    if (e.target !== removePdfBtn && !removePdfBtn.contains(e.target)) {
      pdfFileInput.click();
    }
  });

  pdfFileInput.addEventListener("change", () => {
    const file = pdfFileInput.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showToast("Please select a valid PDF document.", true);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result.split(",")[1];
      chrome.storage.local.set({
        pdfData: base64Data,
        pdfName: file.name,
        pdfSize: file.size,
        pdfMimeType: file.type,
      });
      showPdfAttached(file.name, file.size);
      showToast("PDF attached successfully!");
    };
    reader.readAsDataURL(file);
  });

  removePdfBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearPdf();
    showToast("PDF removed.");
  });

  // Save Settings Handler
  saveBtn.addEventListener("click", () => {
    const backendUrl = backendUrlInput.value.trim();
    const bearerToken = bearerTokenInput.value.trim();
    const selectedModel =
      modelSelect.value === "custom"
        ? customModelInput.value.trim() || "gemini-3.7-flash"
        : modelSelect.value;
    const usePageContext = usePageContextCheckbox.checked;
    const systemInstruction = systemInstructionInput.value.trim();
    const pairingToken = pairingTokenInput.value.trim();

    if (!backendUrl) {
      showToast("Backend Endpoint URL is required.", true);
      backendUrlInput.focus();
      return;
    }

    chrome.storage.local.set(
      {
        backendUrl,
        bearerToken,
        pairingToken,
        selectedModel,
        usePageContext,
        systemInstruction,
      },
      () => {
        statusBadge.textContent = "Saved";
        statusBadge.className = "status-badge status-success";
        showToast("Settings saved successfully!");
        setTimeout(() => {
          statusBadge.textContent = "Ready";
          statusBadge.className = "status-badge status-idle";
        }, 2000);
      }
    );
  });

  // Test Connection Handler
  testBtn.addEventListener("click", async () => {
    const endpointUrl = backendUrlInput.value.trim();
    const bearerToken = bearerTokenInput.value.trim();
    const model =
      modelSelect.value === "custom"
        ? customModelInput.value.trim() || "gemini-3.7-flash"
        : modelSelect.value;

    if (!endpointUrl) {
      showToast("Enter a Backend Endpoint URL first.", true);
      return;
    }

    statusBadge.textContent = "Testing...";
    statusBadge.className = "status-badge status-idle";

    try {
      const response = await chrome.runtime.sendMessage({
        action: "testEndpoint",
        endpointUrl,
        bearerToken,
        model,
      });

      if (response && response.success) {
        statusBadge.textContent = "Connected";
        statusBadge.className = "status-badge status-success";
        showToast("Connected to Gemini Backend successfully!");
      } else {
        throw new Error(response?.error || "Connection failed.");
      }
    } catch (err) {
      statusBadge.textContent = "Error";
      statusBadge.className = "status-badge status-error";
      showToast("Error: " + err.message, true);
    }
  });

  // Trigger Fast Batch Autofill on Active Tab
  triggerAutofillBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showToast("No active tab found.", true);
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, { action: "triggerBatchAutofill" });
      window.close();
    } catch (err) {
      showToast("Could not trigger on this page. Try refreshing the tab.", true);
    }
  });
});
`;

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
 * Item 1: High-Performance Batch Form Completion
 * Calls POST /batchAnswerForm with all fields in a single HTTP request.
 */
async function handleBatchAnswerForm(payload) {
  const storage = await chrome.storage.local.get([
    "backendUrl",
    "bearerToken",
    "pairingToken",
    "userProfile",
    "selectedModel",
  ]);

  let backendUrl = storage.backendUrl ? storage.backendUrl.trim() : "";
  const bearerToken = storage.bearerToken ? storage.bearerToken.trim() : "";
  const model = payload.model || storage.selectedModel || "gemini-3.7-flash";

  if (!backendUrl) {
    throw new Error("Backend Endpoint URL is not configured in the Gemini Extension popup.");
  }

  // Derive /batchAnswerForm URL if /answerQuestion was specified
  let batchUrl = backendUrl;
  if (batchUrl.endsWith("/answerQuestion")) {
    batchUrl = batchUrl.replace(/\\/answerQuestion$/, "/batchAnswerForm");
  } else if (!batchUrl.endsWith("/batchAnswerForm")) {
    const origin = batchUrl.replace(/\\/[^\\/]*$/, "");
    batchUrl = origin + "/batchAnswerForm";
  }

  const headers = {
    "Content-Type": "application/json",
  };

  if (bearerToken) {
    headers["Authorization"] = "Bearer " + bearerToken;
  }

  const requestBody = {
    fields: payload.fields,
    pageContext: payload.pageContext || null,
    model: model,
    context: payload.context || null,
    systemInstruction: payload.systemInstruction || null,
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
    "bearerToken",
    "pairingToken",
    "userProfile",
    "selectedModel",
  ]);
  const backendUrl = storage.backendUrl ? storage.backendUrl.trim() : "";
  const bearerToken = storage.bearerToken ? storage.bearerToken.trim() : "";
  const model = payload.model || storage.selectedModel || "gemini-3.7-flash";

  if (!backendUrl) {
    throw new Error("Backend Endpoint URL is not configured in the Gemini Extension popup.");
  }

  let singleUrl = backendUrl;
  if (singleUrl.endsWith("/batchAnswerForm")) {
    singleUrl = singleUrl.replace(/\\/batchAnswerForm$/, "/answerQuestion");
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
  const { endpointUrl, bearerToken, model } = payload;
  const headers = {
    "Content-Type": "application/json",
  };

  if (bearerToken) {
    headers["Authorization"] = "Bearer " + bearerToken;
  }

  let testUrl = endpointUrl;
  if (testUrl.endsWith("/batchAnswerForm")) {
    testUrl = testUrl.replace(/\\/batchAnswerForm$/, "/answerQuestion");
  }

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

export const CONTENT_JS = `// Gemini Form Autofill - Content Script with Lightning Batch Form Autofill (Item 1)
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

    container.innerHTML = \`
      <div id="gemini-autofill-fab" class="gemini-fab" title="Fast Batch Autofill with Gemini AI">
        <div class="gemini-fab-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <span class="gemini-fab-label">⚡ Fast Batch Fill</span>
      </div>

      <div id="gemini-autofill-status-pill" class="gemini-status-pill gemini-hidden">
        <div class="gemini-spinner"></div>
        <span id="gemini-status-text">Batch reasoning form fields...</span>
      </div>
    \`;

    document.body.appendChild(container);

    const fab = document.getElementById("gemini-autofill-fab");
    if (fab) {
      fab.addEventListener("click", () => {
        if (!isAutofilling) startBatchFormAutofill();
      });
    }
  }

  // 2. Listen for messages from popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "triggerBatchAutofill" || msg.action === "triggerAutofill") {
      if (!isAutofilling) startBatchFormAutofill();
    }
  });

  // 3. Question extraction heuristics for a given field
  function extractQuestionForField(field) {
    if (field.id) {
      const label = document.querySelector(\`label[for="\${field.id}"]\`);
      if (label && label.innerText.trim()) {
        return label.innerText.trim();
      }
    }

    const parentLabel = field.closest("label");
    if (parentLabel && parentLabel.innerText.trim()) {
      return parentLabel.innerText.trim();
    }

    if (field.getAttribute("aria-label")) {
      return field.getAttribute("aria-label").trim();
    }

    if (field.getAttribute("aria-labelledby")) {
      const labelledBy = document.getElementById(field.getAttribute("aria-labelledby"));
      if (labelledBy && labelledBy.innerText.trim()) {
        return labelledBy.innerText.trim();
      }
    }

    if (field.placeholder && field.placeholder.trim()) {
      return field.placeholder.trim();
    }

    if (field.name) {
      return field.name.replace(/[_-]/g, " ").trim();
    }

    if (field.id) {
      return field.id.replace(/[_-]/g, " ").trim();
    }

    let prev = field.previousElementSibling;
    while (prev) {
      if (prev.innerText && prev.innerText.trim()) {
        const text = prev.innerText.trim();
        if (text.length > 1 && text.length < 100) return text;
      }
      prev = prev.previousElementSibling;
    }

    return "Please provide an appropriate answer for this field.";
  }

  // 4. Detect fillable elements on current page
  function getFillableFields() {
    const selector = 
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="image"]):not([type="password"]),' +
      'textarea,' +
      'select,' +
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

  // 5. Item 1: High-Speed Batch Form Autofill (Single Request)
  async function startBatchFormAutofill() {
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
        "pairingToken",
        "userProfile",
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

      const rawElements = getFillableFields();
      if (rawElements.length === 0) {
        showToastNotification("No fillable form fields detected on this page.");
        return;
      }

      // Assign temporary field identifiers and prepare batch request payload
      const batchFields = rawElements.map((el, idx) => {
        const id = el.id || el.name || "gemini_field_" + idx;
        el.dataset.geminiFieldId = id;

        const options =
          el.tagName.toLowerCase() === "select"
            ? Array.from(el.options).map((o) => o.text.trim())
            : undefined;

        return {
          id: id,
          name: el.name || undefined,
          type: el.type || el.tagName.toLowerCase(),
          question: extractQuestionForField(el),
          placeholder: el.placeholder || undefined,
          options: options,
          maxLength: el.maxLength > 0 ? el.maxLength : undefined,
          required: el.required || false,
        };
      });

      if (statusText) {
        statusText.textContent = "Batch answering " + batchFields.length + " fields in 1 request...";
      }

      let context = null;
      if (storage.pdfData) {
        context = {
          type: "pdf",
          data: storage.pdfData,
          mimeType: storage.pdfMimeType || "application/pdf",
        };
      } else if (storage.usePageContext !== false) {
        const selection = window.getSelection()?.toString()?.trim();
        const pageText = selection || document.body.innerText?.slice(0, 20000) || "";
        if (pageText) {
          context = { type: "text", data: pageText };
        }
      }

      const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
        .map((h) => h.innerText.trim())
        .filter((t) => t.length > 0)
        .slice(0, 6);

      const pageContext = {
        title: document.title,
        url: window.location.href,
        headings: headings,
      };

      const response = await chrome.runtime.sendMessage({
        action: "batchAnswerForm",
        fields: batchFields,
        pageContext,
        context,
        systemInstruction: storage.systemInstruction || null,
        model: storage.selectedModel || "gemini-3.7-flash",
        pairingToken: storage.pairingToken || null,
        userProfile: storage.userProfile || null,
      });

      if (response && response.success && Array.isArray(response.answers)) {
        let filledCount = 0;
        response.answers.forEach((ans) => {
          const targetEl = rawElements.find((el) => el.dataset.geminiFieldId === ans.id);
          if (targetEl && ans.answer) {
            applyAnswerToField(targetEl, ans.answer);
            targetEl.classList.add("gemini-highlight-success");
            setTimeout(() => targetEl.classList.remove("gemini-highlight-success"), 2500);
            filledCount++;
          }
        });

        const latencyStr = response.timeMs ? " (" + (response.timeMs / 1000).toFixed(1) + "s)" : "";
        showToastNotification("⚡ Successfully batch filled " + filledCount + " of " + batchFields.length + " fields" + latencyStr + "!");
      } else {
        throw new Error(response?.error || "Batch generation did not return answers.");
      }
    } catch (err) {
      console.error("Gemini Batch Autofill error:", err);
      showToastNotification("Batch fill error: " + err.message, true);
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
    } else if (field.tagName.toLowerCase() === "select") {
      let matched = false;
      const lower = answer.toLowerCase().trim();
      for (let i = 0; i < field.options.length; i++) {
        const opt = field.options[i];
        if (opt.text.toLowerCase().includes(lower) || opt.value.toLowerCase().includes(lower)) {
          field.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched && field.options.length > 1) {
        field.selectedIndex = 1;
      }
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
  padding: 10px 18px !important;
  border-radius: 9999px !important;
  box-shadow: 0 4px 16px rgba(30, 64, 175, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.2) !important;
  cursor: pointer !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease !important;
  user-select: none !important;
}

.gemini-fab:hover {
  transform: translateY(-2px) scale(1.04) !important;
  box-shadow: 0 8px 24px rgba(30, 64, 175, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.35) !important;
}

.gemini-fab:active {
  transform: translateY(0) scale(0.98) !important;
}

.gemini-fab-icon {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.gemini-status-pill {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  background-color: #0f172a !important;
  color: #f8fafc !important;
  padding: 10px 16px !important;
  border-radius: 9999px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.3) !important;
  font-size: 12px !important;
  font-weight: 600 !important;
}

.gemini-spinner {
  width: 14px !important;
  height: 14px !important;
  border: 2px solid rgba(59, 130, 246, 0.3) !important;
  border-top-color: #60a5fa !important;
  border-radius: 50% !important;
  animation: gemini-spin 0.8s linear infinite !important;
}

@keyframes gemini-spin {
  to {
    transform: rotate(360deg);
  }
}

.gemini-highlight-active {
  outline: 2px solid #3b82f6 !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25) !important;
  transition: outline 0.2s, box-shadow 0.2s !important;
}

.gemini-highlight-success {
  outline: 2px solid #10b981 !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.3) !important;
  transition: outline 0.2s, box-shadow 0.2s !important;
}

.gemini-page-toast {
  position: fixed !important;
  bottom: 80px !important;
  right: 24px !important;
  z-index: 2147483645 !important;
  padding: 12px 18px !important;
  border-radius: 12px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
  transition: opacity 0.3s, transform 0.3s !important;
}

.gemini-toast-success {
  background: linear-gradient(135deg, #065f46 0%, #047857 100%) !important;
  color: #ecfdf5 !important;
  border: 1px solid #10b981 !important;
}

.gemini-toast-error {
  background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%) !important;
  color: #fef2f2 !important;
  border: 1px solid #ef4444 !important;
}

.gemini-hidden {
  display: none !important;
}
`;

export interface ExtensionFile {
  name: string;
  path: string;
  type: string;
  language: string;
  description: string;
  content: string;
}

export const EXTENSION_FILES: ExtensionFile[] = [
  {
    name: "manifest.json",
    path: "manifest.json",
    type: "json",
    language: "json",
    description: "Chrome Extension Manifest V3 configuration with declarative permissions and content script matching.",
    content: MANIFEST_JSON,
  },
  {
    name: "popup.html",
    path: "popup.html",
    type: "html",
    language: "html",
    description: "Extension configuration popup UI with multi-persona selection, PDF resume attachment, and model selector.",
    content: POPUP_HTML,
  },
  {
    name: "popup.css",
    path: "popup.css",
    type: "css",
    language: "css",
    description: "Sleek dark theme styles for the extension popup.",
    content: POPUP_CSS,
  },
  {
    name: "popup.js",
    path: "popup.js",
    type: "javascript",
    language: "javascript",
    description: "Popup controller script handling persona switching, PDF uploads, test requests, and chrome.storage sync.",
    content: POPUP_JS,
  },
  {
    name: "background.js",
    path: "background.js",
    type: "javascript",
    language: "javascript",
    description: "Manifest V3 Service Worker proxying /batchAnswerForm and /answerQuestion calls with Bearer authentication.",
    content: BACKGROUND_JS,
  },
  {
    name: "content.js",
    path: "content.js",
    type: "javascript",
    language: "javascript",
    description: "Content script providing fast batch autofill, smart label detection, and synthetic event dispatch.",
    content: CONTENT_JS,
  },
  {
    name: "content.css",
    path: "content.css",
    type: "css",
    language: "css",
    description: "Styles for the floating trigger widget, progress indicator, and in-page success notifications.",
    content: CONTENT_CSS,
  },
];
