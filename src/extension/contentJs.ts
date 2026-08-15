export const CONTENT_JS = `// Gemini Form Autofill - Content Script with Lightning Batch Form Autofill (Item 1)
(function () {
  if (window.__geminiAutofillInjected) return;
  window.__geminiAutofillInjected = true;

  let isAutofilling = false;
  let stopRequested = false;

  // 1. Create Floating Trigger Widget
  function createFloatingTrigger() {
    if (document.getElementById("gemini-autofill-fab-container")) return;

    const container = document.createElement("div");
    container.id = "gemini-autofill-fab-container";
    container.className = "gemini-fab-container";

    container.innerHTML =
      '<div id="gemini-autofill-fab" class="gemini-fab" title="Fast Batch Autofill with Gemini AI">' +
      '  <div class="gemini-fab-icon">' +
      '    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
      '      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' +
      '    </svg>' +
      '  </div>' +
      '  <span class="gemini-fab-label">⚡ Fast Batch Fill</span>' +
      '</div>' +
      '<div id="gemini-autofill-status-pill" class="gemini-status-pill gemini-hidden">' +
      '  <div class="gemini-spinner"></div>' +
      '  <span id="gemini-status-text">Batch reasoning form fields...</span>' +
      '</div>';

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
    } else if (msg.action === "stopAutofill") {
      stopRequested = true;
    }
  });

  // 3. Question extraction heuristics for a given field
  function extractQuestionForField(field) {
    if (field.id) {
      try {
        const escapedId = CSS.escape ? CSS.escape(field.id) : field.id;
        const label = document.querySelector('label[for="' + escapedId + '"]');
        if (label && label.innerText.trim()) {
          return label.innerText.trim();
        }
      } catch (e) {
        // Invalid id for a CSS selector; fall through to other heuristics
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
    stopRequested = false;
    const fab = document.getElementById("gemini-autofill-fab");
    const statusPill = document.getElementById("gemini-autofill-status-pill");
    const statusText = document.getElementById("gemini-status-text");

    if (fab) fab.classList.add("gemini-hidden");
    if (statusPill) statusPill.classList.remove("gemini-hidden");

    try {
      const storage = await chrome.storage.local.get([
        "backendUrl",
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
      const usedIds = new Set();
      const batchFields = rawElements.map((el, idx) => {
        let id = el.id || el.name || "gemini_field_" + idx;
        if (usedIds.has(id)) {
          let uniqueId = id + "_" + idx;
          let counter = idx;
          while (usedIds.has(uniqueId)) {
            counter++;
            uniqueId = id + "_" + counter;
          }
          id = uniqueId;
        }
        usedIds.add(id);
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
          // Only report maxLength when the attribute is explicitly set. The DOM IDL
          // default (input.maxLength === 524288, textarea.maxLength === -1 when no
          // maxlength attribute is present) would otherwise route nearly every plain
          // input to the long-form pipeline. Send undefined when the attribute is absent
          // so the classifier relies on type/tagName/keyword signals.
          maxLength: el.hasAttribute("maxlength") ? el.maxLength : undefined,
          required: el.required || false,
          tagName: el.tagName.toLowerCase(),
          rows: el.rows || undefined,
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
        const selection = window.getSelection() ? window.getSelection().toString().trim() : "";
        const pageText = selection || (document.body.innerText ? document.body.innerText.slice(0, 20000) : "");
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

      if (stopRequested) {
        showToastNotification("⏹ Autofill stopped before answers were applied.");
        return;
      }

      if (response && response.success && Array.isArray(response.answers)) {
        let filledCount = 0;
        response.answers.forEach((ans) => {
          const targetEl = rawElements.find((el) => el.dataset.geminiFieldId === ans.id);
          if (targetEl && ans.answer) {
            const filled = applyAnswerToField(targetEl, ans.answer);
            if (filled) {
              targetEl.classList.add("gemini-highlight-success");
              setTimeout(() => targetEl.classList.remove("gemini-highlight-success"), 2500);
              filledCount++;
            } else {
              targetEl.classList.add("gemini-highlight-needs-review");
              setTimeout(() => targetEl.classList.remove("gemini-highlight-needs-review"), 2500);
            }
          } else if (targetEl && ans.withheld) {
            targetEl.classList.add("gemini-highlight-needs-review");
            setTimeout(() => targetEl.classList.remove("gemini-highlight-needs-review"), 2500);
          }
        });

        const latencyStr = response.timeMs ? " (" + (response.timeMs / 1000).toFixed(1) + "s)" : "";
        showToastNotification("⚡ Successfully batch filled " + filledCount + " of " + batchFields.length + " fields" + latencyStr + "!");
      } else {
        throw new Error(response && response.error ? response.error : "Batch generation did not return answers.");
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
      const lower = answer.toLowerCase().trim();
      let matched = false;
      for (let i = 0; i < field.options.length; i++) {
        const opt = field.options[i];
        if (opt.text.toLowerCase().includes(lower) || opt.value.toLowerCase().includes(lower)) {
          field.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) return false;
    } else {
      // Use native value setter to trigger React/Vue controlled component updates
      // The input and textarea setters validate their receiver type. Selecting
      // the input setter for a textarea throws "Illegal invocation".
      const valuePrototype =
        field.tagName.toLowerCase() === "textarea"
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(valuePrototype, "value")?.set;

      if (nativeSetter) {
        nativeSetter.call(field, answer);
      } else {
        field.value = answer;
      }
    }

    field.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    field.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    return true;
  }

  // 7. Toast Notifications in Page
  function showToastNotification(message, isError) {
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
