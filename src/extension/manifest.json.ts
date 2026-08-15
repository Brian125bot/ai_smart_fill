export const MANIFEST_JSON = JSON.stringify(
  {
    manifest_version: 3,
    name: "Gemini Form Autofill & Assistant",
    version: "1.0.0",
    description:
      "AI-powered multi-persona form autofill extension with instant batch completion powered by Gemini 3.7 via a local server proxy.",
    permissions: ["storage", "unlimitedStorage", "activeTab", "scripting"],
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
