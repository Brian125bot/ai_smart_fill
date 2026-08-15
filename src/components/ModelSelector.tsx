import { useState } from "react";
import {
  AVAILABLE_GEMINI_MODELS,
} from "../types";
import {
  Cpu,
  Sparkles,
  Zap,
  Check,
  ChevronDown,
  Layers,
  SlidersHorizontal,
} from "lucide-react";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  compact?: boolean;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  compact = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(
    !AVAILABLE_GEMINI_MODELS.some((m) => m.id === selectedModel)
  );
  const [customModelInput, setCustomModelInput] = useState(
    !AVAILABLE_GEMINI_MODELS.some((m) => m.id === selectedModel)
      ? selectedModel
      : ""
  );

  const activeModelOption = AVAILABLE_GEMINI_MODELS.find(
    (m) => m.id === selectedModel
  );

  const handleSelect = (modelId: string) => {
    setIsCustomMode(false);
    onModelChange(modelId);
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (customModelInput.trim()) {
      setIsCustomMode(true);
      onModelChange(customModelInput.trim());
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Selector Trigger Button */}
      <div className="space-y-1.5">
        {!compact && (
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Active Gemini Model</span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono">
              3.0+ Architecture
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full p-2.5 rounded-xl border transition flex items-center justify-between text-left ${
            isOpen
              ? "bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20"
              : "bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center flex-shrink-0 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-100 truncate">
                  {isCustomMode
                    ? customModelInput || "Custom Model"
                    : activeModelOption?.name || selectedModel}
                </span>
                {activeModelOption && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${activeModelOption.badgeColor}`}
                  >
                    {activeModelOption.version}
                  </span>
                )}
                {isCustomMode && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium border bg-amber-500/20 text-amber-300 border-amber-500/40">
                    Custom
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {isCustomMode
                  ? "Custom Model Identifier"
                  : activeModelOption?.description || selectedModel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 pl-2">
            {activeModelOption && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                <Zap className="w-3 h-3 text-amber-400" />
                {activeModelOption.speed}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                isOpen ? "rotate-180 text-indigo-400" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {/* Dropdown Modal / List */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 z-50 p-2.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/80 max-h-[420px] overflow-y-auto space-y-2.5 backdrop-blur-xl">
            <div className="flex items-center justify-between px-2 pt-1 pb-1 border-b border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Select Gemini Model (3.0+)</span>
              </div>
              <span className="text-[10px] text-slate-500">
                {AVAILABLE_GEMINI_MODELS.length} Models Available
              </span>
            </div>

            {/* Model list */}
            <div className="space-y-1.5">
              {AVAILABLE_GEMINI_MODELS.map((model) => {
                const isSelected = !isCustomMode && selectedModel === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelect(model.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition flex items-start justify-between gap-3 ${
                      isSelected
                        ? "bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-500/40"
                        : "bg-slate-950/60 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-semibold ${
                            isSelected ? "text-indigo-200" : "text-slate-200"
                          }`}
                        >
                          {model.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${model.badgeColor}`}
                        >
                          {model.tag}
                        </span>
                        {model.isDefault && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {model.description}
                      </p>
                      <div className="flex items-center gap-3 pt-0.5 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Speed: {model.speed}</span>
                        </span>
                        <span>•</span>
                        <span>Context: {model.contextWindow}</span>
                        <span>•</span>
                        <code className="text-[9px] text-slate-400 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                          {model.id}
                        </code>
                      </div>
                    </div>

                    <div className="pt-1 flex-shrink-0">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Model Input */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                  <span>Custom / Preview Model</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  e.g. gemini-3.5-flash-preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCustomApply();
                    }
                  }}
                  placeholder="Enter custom Gemini model ID..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleCustomApply}
                  disabled={!customModelInput.trim()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
