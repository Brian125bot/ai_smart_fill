export const POPUP_JS = `// Gemini Form Autofill - Popup Script (Manifest V3)
document.addEventListener("DOMContentLoaded", async () => {
  const backendUrlInput = document.getElementById("backendUrl");
  const personaSelect = document.getElementById("personaSelect");
  const pairingTokenInput = document.getElementById("pairingToken");
  const syncFromDashboardBtn = document.getElementById("syncFromDashboardBtn");
  const syncStatusBadge = document.getElementById("syncStatusBadge");
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
  const stopAutofillBtn = document.getElementById("stopAutofillBtn");
  const statusBadge = document.getElementById("statusBadge");
  const toast = document.getElementById("popupToast");

  let currentProfiles = [];

  function sanitizeHeaderValue(val) {
    if (!val || typeof val !== "string") return "";
    return val.trim().replace(/[^\x20-\x7E]/g, "");
  }

  function updateSyncBadge(profile, docName, email, count) {
    if (email) {
      syncStatusBadge.innerHTML = '<strong style="color: #34d399;">✓ Synced:</strong> ' + email + ' (' + (count || 1) + ' Personas)';
    } else if (profile && profile.fullName) {
      syncStatusBadge.innerHTML = '<strong style="color: #34d399;">✓ Persona:</strong> ' + profile.fullName + ' (' + (profile.jobTitle || "Profile") + ')';
    } else if (docName) {
      syncStatusBadge.innerHTML = '<strong style="color: #34d399;">✓ Document Synced:</strong> ' + docName;
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

  // Real dashboard context sync function
  async function performDashboardSync(pairingVal, endpoint) {
    if (!pairingVal) {
      showToast("Please enter an Account UID or Pairing Key from Dashboard.", true);
      pairingTokenInput.focus();
      return;
    }

    let baseUrl = "";
    if (endpoint) {
      try {
        const u = new URL(endpoint);
        baseUrl = u.origin;
      } catch {
        baseUrl = "";
      }
    }
    if (!baseUrl) {
      baseUrl = window.location.origin.startsWith("http") ? window.location.origin : "http://localhost:3000";
    }

    const syncBtnText = document.getElementById("syncBtnText");
    if (syncBtnText) syncBtnText.textContent = "Syncing...";
      syncStatusBadge.innerHTML = '<span style="color: #60a5fa;">Fetching local dashboard persona & documents...</span>';

    try {
      const resp = await fetch(baseUrl + "/api/userContext/" + encodeURIComponent(pairingVal));
      const data = await resp.json();

      if (!resp.ok || !data.success || !data.context) {
        throw new Error(data.error || "No persona profiles synced for this Account UID yet. Save in Dashboard first!");
      }

      const ctx = data.context;
      currentProfiles = Array.isArray(ctx.profiles) && ctx.profiles.length > 0 ? ctx.profiles : [];

      const activeId = ctx.activeProfileId || (currentProfiles[0] ? currentProfiles[0].id : "default");
      renderPersonaDropdown(currentProfiles, activeId);

      const activeProfile = currentProfiles.find((p) => p.id === activeId) || currentProfiles[0] || null;

      // Update UI inputs
      if (ctx.systemInstruction) systemInstructionInput.value = ctx.systemInstruction;
      if (ctx.selectedModel) {
        const std = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.0-flash"];
        if (std.includes(ctx.selectedModel)) {
          modelSelect.value = ctx.selectedModel;
          customModelInput.classList.add("hidden");
        } else {
          modelSelect.value = "custom";
          customModelInput.value = ctx.selectedModel;
          customModelInput.classList.remove("hidden");
        }
      }

      if (ctx.pdfData && ctx.pdfName) {
        showPdfAttached(ctx.pdfName, ctx.pdfSize || 0);
      }

      // Save to chrome.storage.local
      const toSave = {
        pairingToken: pairingVal,
        syncedEmail: ctx.email || "",
        syncedName: ctx.displayName || "",
        syncedUserId: ctx.userId || pairingVal,
        profiles: currentProfiles,
        activeProfileId: activeId,
        userProfile: ctx.userProfile || (activeProfile ? activeProfile.profileFields : null),
        systemInstruction: ctx.systemInstruction || (activeProfile ? activeProfile.systemInstruction : ""),
        selectedModel: ctx.selectedModel || (activeProfile ? activeProfile.selectedModel : "gemini-3.7-flash"),
        pdfData: ctx.pdfData || (activeProfile?.pdfFile?.base64 || null),
        pdfName: ctx.pdfName || (activeProfile?.pdfFile?.name || null),
        pdfSize: ctx.pdfSize || (activeProfile?.pdfFile?.size || null),
        pdfMimeType: ctx.pdfMimeType || (activeProfile?.pdfFile?.mimeType || "application/pdf"),
        usePageContext: ctx.usePageContext !== false,
      };

      await new Promise((resolve) => chrome.storage.local.set(toSave, resolve));

      updateSyncBadge(toSave.userProfile, toSave.pdfName, ctx.email || ctx.displayName, currentProfiles.length);
      showToast("✓ Synced " + currentProfiles.length + " personas from Dashboard!");
      statusBadge.textContent = "Synced";
      statusBadge.className = "status-badge status-success";
      setTimeout(() => {
        statusBadge.textContent = "Ready";
        statusBadge.className = "status-badge status-idle";
      }, 2500);
    } catch (err) {
      console.error("Dashboard sync error:", err);
      syncStatusBadge.innerHTML = '<span style="color: #f87171;">Sync notice: ' + (err.message || err) + '</span>';
      showToast(err.message || "Sync failed", true);
    } finally {
      if (syncBtnText) syncBtnText.textContent = "Sync Dashboard";
    }
  }

  // 1. Load saved configuration from chrome.storage.local
  chrome.storage.local.get(
    [
      "backendUrl",
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
      "syncedEmail",
      "syncedName",
    ],
    (result) => {
      if (result.backendUrl) backendUrlInput.value = result.backendUrl;
      if (result.pairingToken) pairingTokenInput.value = result.pairingToken;

      currentProfiles = Array.isArray(result.profiles) ? result.profiles : [];
      if (currentProfiles.length > 0) {
        renderPersonaDropdown(currentProfiles, result.activeProfileId);
      }

      updateSyncBadge(result.userProfile, result.pdfName, result.syncedEmail || result.syncedName, currentProfiles.length);

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

      // If user is configured with pairingToken, perform seamless background sync
      if (result.pairingToken && result.backendUrl) {
        performDashboardSync(result.pairingToken, result.backendUrl);
      }
    }
  );

  // Persona switch handler
  personaSelect.addEventListener("change", () => {
    const selectedId = personaSelect.value;
    const found = currentProfiles.find((p) => p.id === selectedId);
    if (found) {
      if (found.systemInstruction) systemInstructionInput.value = found.systemInstruction;
      if (found.selectedModel) {
        const std = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.0-flash"];
        if (std.includes(found.selectedModel)) {
          modelSelect.value = found.selectedModel;
          customModelInput.classList.add("hidden");
        } else {
          modelSelect.value = "custom";
          customModelInput.value = found.selectedModel;
          customModelInput.classList.remove("hidden");
        }
      }
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
          selectedModel: found.selectedModel || "gemini-3.7-flash",
        });
      } else {
        clearPdf();
        chrome.storage.local.set({
          activeProfileId: selectedId,
          userProfile: found.profileFields,
          systemInstruction: found.systemInstruction,
          selectedModel: found.selectedModel || "gemini-3.7-flash",
        });
      }
      updateSyncBadge(found.profileFields, found.pdfFile?.name);
      showToast("Switched to persona: " + found.name);
    }
  });

  // Sync button handler
  syncFromDashboardBtn.addEventListener("click", async () => {
    const pairingVal = pairingTokenInput.value.trim();
    const endpoint = backendUrlInput.value.trim();
    await performDashboardSync(pairingVal, endpoint);
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

    if (Array.isArray(currentProfiles) && currentProfiles.length > 0) {
      const activeId = personaSelect ? personaSelect.value : null;
      const target = currentProfiles.find((p) => p.id === activeId) || currentProfiles[0];
      if (target) {
        target.pdfFile = null;
        chrome.storage.local.set({ profiles: currentProfiles });
      }
    }
  }

  // Robust PDF file processor supporting file picker and drag-and-drop
  function processPdfFile(file) {
    if (!file) return;

    const isPdf =
      (file.type && file.type.toLowerCase().includes("pdf")) ||
      (file.name && file.name.toLowerCase().endsWith(".pdf"));

    if (!isPdf) {
      showToast("Please select a valid PDF document (.pdf).", true);
      return;
    }

    // 25MB check
    if (file.size > 25 * 1024 * 1024) {
      showToast("PDF exceeds the 25MB limit. Please choose a smaller document.", true);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const resStr = String(reader.result || "");
        const base64Data = resStr.includes(",") ? resStr.split(",")[1] : resStr;
        const mimeType = file.type || "application/pdf";

        const toSave = {
          pdfData: base64Data,
          pdfName: file.name,
          pdfSize: file.size,
          pdfMimeType: mimeType,
        };

        // Also associate with active profile if multi-persona is active
        if (Array.isArray(currentProfiles) && currentProfiles.length > 0) {
          const activeId = personaSelect ? personaSelect.value : null;
          const target = currentProfiles.find((p) => p.id === activeId) || currentProfiles[0];
          if (target) {
            target.pdfFile = {
              name: file.name,
              size: file.size,
              mimeType: mimeType,
              base64: base64Data,
            };
            toSave.profiles = currentProfiles;
          }
        }

        chrome.storage.local.set(toSave, () => {
          showPdfAttached(file.name, file.size);
          updateSyncBadge(null, file.name);
          showToast("✓ PDF resume attached successfully!");
        });
      } catch (err) {
        console.error("PDF processing error:", err);
        showToast("Error attaching PDF: " + (err.message || err), true);
      }
    };

    reader.onerror = () => {
      showToast("Failed to read the selected PDF file.", true);
    };

    reader.readAsDataURL(file);
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

  // PDF Upload Click Handler
  pdfUploadBox.addEventListener("click", (e) => {
    if (e.target !== removePdfBtn && !removePdfBtn.contains(e.target)) {
      pdfFileInput.click();
    }
  });

  // PDF File Input Change Handler
  pdfFileInput.addEventListener("change", () => {
    const file = pdfFileInput.files && pdfFileInput.files[0];
    if (file) {
      processPdfFile(file);
    }
  });

  // PDF Drag & Drop Handlers
  pdfUploadBox.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    pdfUploadBox.classList.add("dragover");
  });

  pdfUploadBox.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
    pdfUploadBox.classList.add("dragover");
  });

  pdfUploadBox.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    pdfUploadBox.classList.remove("dragover");
  });

  pdfUploadBox.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    pdfUploadBox.classList.remove("dragover");
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processPdfFile(e.dataTransfer.files[0]);
    }
  });

  removePdfBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearPdf();
    showToast("PDF removed.");
  });

  // Save Settings Handler
  saveBtn.addEventListener("click", () => {
    const backendUrl = backendUrlInput.value.trim();
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

    triggerAutofillBtn.classList.add("hidden");
    if (stopAutofillBtn) stopAutofillBtn.classList.remove("hidden");
    statusBadge.textContent = "Filling...";
    statusBadge.className = "status-badge status-idle";

    try {
      await chrome.tabs.sendMessage(tab.id, { action: "triggerBatchAutofill" });
      showToast("⚡ Autofill started on active tab!");
    } catch (err) {
      triggerAutofillBtn.classList.remove("hidden");
      if (stopAutofillBtn) stopAutofillBtn.classList.add("hidden");
      statusBadge.textContent = "Ready";
      showToast("Could not trigger on this page. Try refreshing the tab.", true);
    }
  });

  // Stop Autofill Handler
  if (stopAutofillBtn) {
    stopAutofillBtn.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: "stopAutofill" });
        } catch (e) {}
      }
      try {
        await chrome.runtime.sendMessage({ action: "stopAutofill" });
      } catch (e) {}

      triggerAutofillBtn.classList.remove("hidden");
      stopAutofillBtn.classList.add("hidden");
      statusBadge.textContent = "Stopped";
      statusBadge.className = "status-badge status-error";
      showToast("⏹ Form filling stopped.");
      setTimeout(() => {
        statusBadge.textContent = "Ready";
        statusBadge.className = "status-badge status-idle";
      }, 2000);
    });
  }

  // Listen for completion / stop broadcasts
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "autofillFinished" || msg.action === "autofillStopped") {
      triggerAutofillBtn.classList.remove("hidden");
      if (stopAutofillBtn) stopAutofillBtn.classList.add("hidden");
      if (msg.action === "autofillStopped") {
        statusBadge.textContent = "Stopped";
        statusBadge.className = "status-badge status-error";
      } else {
        statusBadge.textContent = "Ready";
        statusBadge.className = "status-badge status-idle";
      }
    }
  });
});
`;
