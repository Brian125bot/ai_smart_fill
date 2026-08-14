import { useState } from "react";
import { Header } from "./components/Header";
import { EndpointCard } from "./components/EndpointCard";
import { ContextHub } from "./components/ContextHub";
import { InteractivePlayground } from "./components/InteractivePlayground";
import { ExtensionViewer } from "./components/ExtensionViewer";
import { InstallationGuide } from "./components/InstallationGuide";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("context-hub");
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    try {
      return localStorage.getItem("gemini_selected_model") || "gemini-3.7-flash";
    } catch {
      return "gemini-3.7-flash";
    }
  });

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    try {
      localStorage.setItem("gemini_selected_model", modelId);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation & Status Bar */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedModel={selectedModel}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Always visible endpoint summary card */}
        <EndpointCard />

        {/* Tabbed Content Areas with Conditional Auth Protection */}
        {activeTab === "context-hub" && (
          <ProtectedRoute
            featureName="Context & Profile Hub"
            featureDescription="Sign in to customize your persona profiles, upload PDF resumes, manage Google Drive grounding, and synchronize settings with the extension."
          >
            <ContextHub
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />
          </ProtectedRoute>
        )}

        {activeTab === "playground" && (
          <ProtectedRoute
            featureName="Interactive Form Playground"
            featureDescription="Sign in to test single and batch form autofilling against real-time Gemini AI models and inspect reasoning outputs."
          >
            <InteractivePlayground
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />
          </ProtectedRoute>
        )}

        {activeTab === "extension-files" && <ExtensionViewer />}
        {activeTab === "install-guide" && <InstallationGuide />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Gemini Form Autofill Extension & Server-Side Backend</span>
          <span className="font-mono text-[11px]">Powered by Google Gemini 3.7 Flash & Google Cloud Run</span>
        </div>
      </footer>
    </div>
  );
}

