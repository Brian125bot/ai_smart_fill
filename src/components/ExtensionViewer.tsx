import { useState } from "react";
import { EXTENSION_FILES, ExtensionFile } from "../extensionSource";
import { downloadExtensionZip } from "../utils/zipGenerator";
import {
  FileCode,
  Download,
  Copy,
  Check,
  Layers,
  Sparkles,
  ShieldCheck,
  Cpu,
  Workflow,
} from "lucide-react";

export function ExtensionViewer() {
  const [selectedFile, setSelectedFile] = useState<ExtensionFile>(EXTENSION_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  return (
    <div className="space-y-6">
      {/* Top Description & Architecture Pillars */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-slate-100 font-semibold text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <span>Manifest V3 Chrome Extension Source Package</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
               Inspect the exact generated source code for all extension files. You can copy any individual file or download the ZIP archive to load unpacked into Chrome.
            </p>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? "Packaging ZIP..." : "Download Full Extension (.zip)"}</span>
          </button>
        </div>

        {/* Feature badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="font-semibold text-blue-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
               <span>Server-Side API Key</span>
            </div>
            <p className="text-[11px] text-slate-400">
               The Gemini API key is not embedded in the extension. Profile and document context can still be sent through the local server to Gemini.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Question Heuristics</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Smart priority extraction: 1. Linked &lt;label&gt; &rarr; 2. aria-label &rarr; 3. placeholder &rarr; 4. name/id &rarr; 5. preceding text nodes.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
              <Workflow className="w-4 h-4 text-emerald-400" />
              <span>Native PDF & Grounding</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Popup converts attached PDFs to base64 for Gemini inlineData document comprehension. Supports current page text or custom system instructions.
            </p>
          </div>
        </div>
      </div>

      {/* Code Explorer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* File Tree Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            Extension Files ({EXTENSION_FILES.length})
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 space-y-1 shadow-md">
            {EXTENSION_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left p-3 rounded-xl transition flex flex-col gap-1 ${
                    isSelected
                      ? "bg-blue-600/15 border border-blue-500/40 text-blue-200 shadow-sm"
                      : "hover:bg-slate-800/60 text-slate-300 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                      <FileCode
                        className={`w-4 h-4 ${
                          isSelected ? "text-blue-400" : "text-slate-500"
                        }`}
                      />
                      <span>{file.name}</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-950/80 text-slate-400 border border-slate-800">
                      {file.language}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {file.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Code Content Panel */}
        <div className="lg:col-span-8 space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-slate-200">
                {selectedFile.path}
              </span>
              <span className="text-[11px] text-slate-400">— {selectedFile.description}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition border border-slate-700 shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied Code" : "Copy File"}</span>
            </button>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl">
            {/* Window bar */}
            <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-[11px] text-slate-300">{selectedFile.path}</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500">
                {selectedFile.content.split("\n").length} lines
              </span>
            </div>

            {/* Code Body */}
            <pre className="p-4 text-slate-200 font-mono text-xs leading-relaxed overflow-x-auto max-h-[580px] overflow-y-auto selection:bg-blue-600 selection:text-white">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
