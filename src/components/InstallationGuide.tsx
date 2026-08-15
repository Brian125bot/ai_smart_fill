import { useState } from "react";
import { downloadExtensionZip } from "../utils/zipGenerator";
import {
  Download,
  FolderArchive,
  Chrome,
  Sliders,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

export function InstallationGuide() {
  const [downloading, setDownloading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const productionUrl = "http://localhost:3000/answerQuestion";
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : productionUrl.replace("/answerQuestion", "");
  const endpointUrl = `${currentOrigin}/answerQuestion`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadExtensionZip();
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400">
          <Chrome className="w-8 h-8" />
        </div>
        <h3 className="text-slate-100 font-semibold text-xl">
          How to Install & Load the Extension in Chrome
        </h3>
        <p className="text-xs text-slate-400 max-w-xl mx-auto">
           Follow these 5 simple steps to unpack and run your custom Gemini Form Autofill extension in Google Chrome, Brave, Edge, or any Chromium browser.
        </p>

        <div className="pt-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-semibold shadow-xl shadow-blue-600/30 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? "Packaging Extension..." : "Download Extension Package (.zip)"}</span>
          </button>
        </div>
      </div>

      {/* Step by step cards */}
      <div className="space-y-4">
        {/* Step 1 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex gap-4 items-start">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
            1
          </div>
          <div className="space-y-2 flex-1">
            <h4 className="text-slate-200 font-semibold text-sm flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-blue-400" />
              <span>Download and Extract the ZIP File</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Click the download button above to get <code className="text-blue-300 font-mono">gemini-form-autofill-extension.zip</code>. Unzip or extract the archive into a dedicated folder on your computer (e.g. <code className="text-slate-300 font-mono">~/Documents/gemini-extension</code>).
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex gap-4 items-start">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
            2
          </div>
          <div className="space-y-2 flex-1">
            <h4 className="text-slate-200 font-semibold text-sm flex items-center gap-2">
              <Chrome className="w-4 h-4 text-indigo-400" />
              <span>Open Chrome Extensions and Enable "Developer Mode"</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              In Google Chrome, navigate to <code className="text-indigo-300 font-mono">chrome://extensions</code> in your address bar. In the top-right corner of the Extensions page, toggle on <strong>"Developer mode"</strong>.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 font-mono">
              chrome://extensions &rarr; Developer mode [ON]
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex gap-4 items-start">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
            3
          </div>
          <div className="space-y-2 flex-1">
            <h4 className="text-slate-200 font-semibold text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Click "Load unpacked" and Select the Extracted Directory</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Click the <strong>"Load unpacked"</strong> button in the top-left toolbar and choose the folder containing <code className="text-purple-300 font-mono">manifest.json</code>. The <strong>Gemini Form Autofill</strong> extension icon will appear in your Chrome toolbar!
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex gap-4 items-start">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
            4
          </div>
          <div className="space-y-2 flex-1">
            <h4 className="text-slate-200 font-semibold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Configure Endpoint URL & Start Autofilling!</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Click the extension icon in Chrome. Paste your backend endpoint URL into the configuration box:
            </p>

            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <code className="text-xs font-mono text-emerald-300 px-2 truncate flex-1">
                {endpointUrl}
              </code>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? "Copied" : "Copy URL"}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed pt-1">
               Paste the <strong>local pairing ID</strong> copied from the <strong>Context & Profile Hub</strong>. The current dashboard value is <code className="text-blue-300 font-mono">local-user-profile</code>; it identifies the server cache entry and is not an authentication credential.
            </p>
          </div>
        </div>

        {/* Step 5 - Context Hub */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex gap-4 items-start">
          <div className="w-8 h-8 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
            5
          </div>
          <div className="space-y-2 flex-1">
            <h4 className="text-slate-200 font-semibold text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Configure Context on the Dashboard</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
               Use the <strong>"Context & Profile Hub"</strong> tab to manage your resume PDF, personal coordinates (LinkedIn, GitHub, contact info), and custom Q&As. Click <strong>"Save & Sync Personas"</strong> before clicking <strong>"Sync Dashboard"</strong> in the extension popup.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ & Troubleshooting */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h4 className="text-slate-200 font-semibold text-xs uppercase tracking-wider flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-400" />
          <span>Troubleshooting & Tips</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            <div className="font-semibold text-slate-200">Do I need an API key or token?</div>
            <p className="text-[11px] text-slate-400">
               The server needs <code className="text-blue-300 font-mono">GEMINI_API_KEY</code> in your <code className="text-blue-300 font-mono">.env</code> file for real Gemini requests, but the key is never placed in the extension. Enter the local pairing ID when you want the extension to load dashboard context; it is a cache lookup value, not authentication.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            <div className="font-semibold text-slate-200">How does PDF grounding work?</div>
            <p className="text-[11px] text-slate-400">
              Attach any PDF in the extension popup. The extension encodes it as base64 and Gemini reads it natively using document multimodal comprehension.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            <div className="font-semibold text-slate-200">Does it work on dynamic single-page forms?</div>
            <p className="text-[11px] text-slate-400">
              Yes! After setting field values, the content script dispatches synthetic <code className="text-indigo-300 font-mono">input</code> and <code className="text-indigo-300 font-mono">change</code> events so React, Angular, and Vue form state bindings update seamlessly.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            <div className="font-semibold text-slate-200">How are questions recognized?</div>
            <p className="text-[11px] text-slate-400">
              The content script uses a 5-tier heuristic: linked &lt;label&gt;, aria-label/aria-labelledby, placeholder, normalized name/id attributes, and preceding heading/text nodes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
