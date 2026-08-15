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
           <p class="subtitle">Local Dashboard Sync & Persona Grounding</p>
        </div>
      </div>
      <div id="statusBadge" class="status-badge status-idle">Ready</div>
    </header>

    <!-- Main Content -->
    <main class="content">
      <!-- Item: Dashboard Authentication & Persona Sync Card -->
      <div class="dashboard-sync-card">
        <div class="sync-card-header">
          <div class="sync-card-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
             <span>Dashboard Context Sync</span>
          </div>
          <button type="button" id="syncFromDashboardBtn" class="sync-btn" title="Fetch latest personas, Q&As, and PDF from Dashboard">
            <svg id="syncIcon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 21h5v-5"/>
            </svg>
            <span id="syncBtnText">Sync Dashboard</span>
          </button>
        </div>

        <!-- Token / UID input -->
        <div class="form-group" style="margin-top: 4px;">
          <input 
            type="text" 
            id="pairingToken" 
            class="input-control" 
            placeholder="Account UID / Email / Pairing Key (from Dashboard)"
            style="font-size: 11px; padding: 6px 9px;"
          />
        </div>

        <!-- Persona selection dropdown -->
        <div class="form-group" style="margin-top: 2px;">
          <label class="field-label" style="font-size: 10px; color: #94a3b8;">Active Persona Grounding</label>
          <select id="personaSelect" class="input-control" style="font-weight: 600; color: #93c5fd; font-size: 11px;">
            <option value="default">💼 Tech Lead & Cloud Architect (Default)</option>
          </select>
        </div>

        <!-- Real-time Synced Context Badge -->
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
        <p class="help-text">Dashboard / local server endpoint (e.g. http://localhost:3000/batchAnswerForm).</p>
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
        <span>Test API</span>
      </button>

      <button type="button" id="saveBtn" class="btn btn-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        <span>Save Local</span>
      </button>
    </footer>

    <!-- Direct Trigger & Stop Buttons -->
    <div class="trigger-container">
      <button type="button" id="triggerAutofillBtn" class="btn btn-trigger">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        <span>⚡ Fast Batch AutoFill Active Tab</span>
      </button>

      <button type="button" id="stopAutofillBtn" class="btn btn-stop hidden">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <rect width="18" height="18" x="3" y="3" rx="2"/>
        </svg>
        <span>⏹ Stop Autofilling</span>
      </button>
    </div>

    <!-- Toast Notification -->
    <div id="popupToast" class="toast hidden"></div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
`;
