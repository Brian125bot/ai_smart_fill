import { MANIFEST_JSON } from "./extension/manifest.json";
import { POPUP_HTML } from "./extension/popupHtml";
import { POPUP_CSS } from "./extension/popupCss";
import { POPUP_JS } from "./extension/popupJs";
import { BACKGROUND_JS } from "./extension/backgroundJs";
import { CONTENT_JS } from "./extension/contentJs";
import { CONTENT_CSS } from "./extension/contentCss";

export { MANIFEST_JSON, POPUP_HTML, POPUP_CSS, POPUP_JS, BACKGROUND_JS, CONTENT_JS, CONTENT_CSS };

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
    description:
      "Generated Chromium Manifest V3 configuration with permissions and content script matching.",
    content: MANIFEST_JSON,
  },
  {
    name: "popup.html",
    path: "popup.html",
    type: "html",
    language: "html",
    description:
      "Extension configuration popup UI with multi-persona selection, PDF resume attachment, and model selector.",
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
    description:
      "Popup controller script handling persona switching, PDF uploads, test requests, and chrome.storage sync.",
    content: POPUP_JS,
  },
  {
    name: "background.js",
    path: "background.js",
    type: "javascript",
    language: "javascript",
    description:
      "Manifest V3 Service Worker proxying /batchAnswerForm and /answerQuestion calls to the local backend.",
    content: BACKGROUND_JS,
  },
  {
    name: "content.js",
    path: "content.js",
    type: "javascript",
    language: "javascript",
    description:
      "Content script providing fast batch autofill, smart label detection, and synthetic event dispatch.",
    content: CONTENT_JS,
  },
  {
    name: "content.css",
    path: "content.css",
    type: "css",
    language: "css",
    description:
      "Styles for the floating trigger widget, progress indicator, and in-page success notifications.",
    content: CONTENT_CSS,
  },
];
