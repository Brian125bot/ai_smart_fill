import { useState, useEffect } from "react";
import { Sparkles, Download, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { downloadExtensionZip } from "../utils/zipGenerator";
import { AVAILABLE_GEMINI_MODELS } from "../types";

interface HealthData {
  status: string;
  model: string;
  appUrl: string | null;
  apiKeyConfigured?: boolean;
  timestamp: string;
}

interface HeaderProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
  selectedModel?: string;
}

export function Header({ onTabChange, activeTab, selectedModel }: HeaderProps) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const currentModelId = selectedModel || health?.model || "gemini-3.7-flash";
  const modelMeta = AVAILABLE_GEMINI_MODELS.find((m) => m.id === currentModelId);
  const displayModelName = modelMeta ? modelMeta.name : currentModelId;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadExtensionZip();
    } catch (e) {
      console.error("Download failed:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-slate-100 text-lg leading-tight tracking-tight">
                  Gemini Form Autofill
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/60">
                  Manifest V3
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Server-Side Gemini API & Chrome Extension Suite
              </p>
            </div>
          </div>

          {/* Mobile Download button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-md shadow-blue-600/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? "Zipping..." : ".ZIP"}</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => onTabChange("context-hub")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "context-hub"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Context & Profile Hub</span>
          </button>
          <button
            onClick={() => onTabChange("playground")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "playground"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            Form Playground & API
          </button>
          <button
            onClick={() => onTabChange("extension-files")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "extension-files"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            Extension Source Files
          </button>
          <button
            onClick={() => onTabChange("install-guide")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "install-guide"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            Chrome Setup Guide
          </button>
        </nav>

        {/* Backend Status & Download CTA */}
        <div className="hidden md:flex items-center gap-3">
          {/* Active Model & Health Pill */}
          <div
            onClick={fetchHealth}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs cursor-pointer hover:bg-slate-800 transition"
            title="Active Gemini Model • Click to refresh server status"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            ) : health?.status === "ok" && health.apiKeyConfigured !== false ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            )}
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-slate-200 font-semibold">{displayModelName}</span>
              {modelMeta && (
                <span className={`text-[9px] px-1 py-0.2 rounded border font-sans ${modelMeta.badgeColor}`}>
                  {modelMeta.version}
                </span>
              )}
            </div>
          </div>

          {/* Download Zip CTA */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? "Packaging..." : ".ZIP"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
