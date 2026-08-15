import React, { useRef } from "react";
import { Zap, CheckCircle2, Clock, Play, RotateCcw, Square } from "lucide-react";
import { PersonaProfile, BatchFormField, BatchFieldAnswer } from "../types";

interface BatchTesterSubTabProps {
  activeProfile: PersonaProfile;
  batchFormValues: Record<string, string>;
  setBatchFormValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  batchAnswersMetadata: Record<string, BatchFieldAnswer>;
  setBatchAnswersMetadata: React.Dispatch<React.SetStateAction<Record<string, BatchFieldAnswer>>>;
  batchLoading: boolean;
  setBatchLoading: React.Dispatch<React.SetStateAction<boolean>>;
  batchLatency: number | null;
  setBatchLatency: React.Dispatch<React.SetStateAction<number | null>>;
  batchModelUsed: string | null;
  setBatchModelUsed: React.Dispatch<React.SetStateAction<string | null>>;
  sampleBatchForm: BatchFormField[];
}

export function BatchTesterSubTab({
  activeProfile,
  batchFormValues,
  setBatchFormValues,
  batchAnswersMetadata,
  setBatchAnswersMetadata,
  batchLoading,
  setBatchLoading,
  batchLatency,
  setBatchLatency,
  batchModelUsed,
  setBatchModelUsed,
  sampleBatchForm,
}: BatchTesterSubTabProps) {
  const batchAbortControllerRef = useRef<AbortController | null>(null);

  const handleExecuteBatchTest = async () => {
    if (batchAbortControllerRef.current) {
      batchAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    batchAbortControllerRef.current = controller;

    setBatchLoading(true);
    setBatchLatency(null);
    try {
      const response = await fetch("/batchAnswerForm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          fields: sampleBatchForm,
          pageContext: {
            title: "Senior Engineering Application — TechCorp Careers",
            url: "https://techcorp.example.com/apply/senior-cloud-engineer",
            headings: ["Senior Engineering Role", "Personal Information", "Qualifications"],
          },
          context: activeProfile.pdfFile
            ? {
                type: "pdf",
                data: activeProfile.pdfFile.base64,
                mimeType: activeProfile.pdfFile.mimeType,
              }
            : activeProfile.textContext
              ? {
                  type: "text",
                  data: activeProfile.textContext,
                }
              : null,
          systemInstruction: activeProfile.systemInstruction,
          model: activeProfile.selectedModel,
          userProfile: activeProfile.profileFields,
        }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.answers)) {
        const valMap: Record<string, string> = {};
        const metaMap: Record<string, BatchFieldAnswer> = {};
        data.answers.forEach((ans: BatchFieldAnswer) => {
          valMap[ans.id] = ans.answer;
          metaMap[ans.id] = ans;
        });
        setBatchFormValues(valMap);
        setBatchAnswersMetadata(metaMap);
        setBatchLatency(data.timeMs || 0);
        setBatchModelUsed(data.modelUsed || activeProfile.selectedModel);
      } else {
        alert(data.error || "Batch generation failed");
      }
    } catch (err) {
      const error = err as Error;
      if (error.name === "AbortError") {
        console.log("Batch fill test cancelled by user.");
      } else {
        console.error("Batch autofill test error:", err);
        alert(error.message || "Failed to execute batch test");
      }
    } finally {
      batchAbortControllerRef.current = null;
      setBatchLoading(false);
    }
  };

  const handleStopBatchTest = () => {
    if (batchAbortControllerRef.current) {
      batchAbortControllerRef.current.abort();
      batchAbortControllerRef.current = null;
    }
    setBatchLoading(false);
  };

  const handleResetBatchForm = () => {
    if (batchAbortControllerRef.current) {
      batchAbortControllerRef.current.abort();
      batchAbortControllerRef.current = null;
    }
    setBatchFormValues({});
    setBatchAnswersMetadata({});
    setBatchLatency(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-800/40 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>Item 1: High-Speed Batch Form Autofilling Demo</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Instead of making 12 sequential API calls taking 20+ seconds, the extension makes{" "}
              <strong>a single request</strong> to{" "}
              <code className="text-emerald-400 font-mono">/batchAnswerForm</code>. All fields are
              resolved coherently with Gemini Structured Outputs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetBatchForm}
              disabled={batchLoading || Object.keys(batchFormValues).length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Form</span>
            </button>

            {batchLoading ? (
              <button
                onClick={handleStopBatchTest}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Autofill</span>
              </button>
            ) : (
              <button
                onClick={handleExecuteBatchTest}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Fill All 12 Fields in 1 Request</span>
              </button>
            )}
          </div>
        </div>

        {batchLatency !== null && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>All 12 fields filled in a single round-trip!</span>
            </div>
            <div className="flex items-center gap-4 text-slate-300 font-mono text-[11px]">
              <span className="flex items-center gap-1 text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                Latency: {batchLatency} ms
              </span>
              <span className="text-blue-300">Model: {batchModelUsed}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Interactive Application Form (12 Fields)</span>
          <span className="text-[11px] text-blue-400 font-normal">
            Using Persona: <strong>{activeProfile.name}</strong>
          </span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sampleBatchForm.map((field) => {
            const filledVal = batchFormValues[field.id] || "";
            const meta = batchAnswersMetadata[field.id];

            return (
              <div
                key={field.id}
                className={`p-4 rounded-2xl border transition-all ${
                  filledVal
                    ? "bg-slate-950/90 border-emerald-500/40 ring-1 ring-emerald-500/20"
                    : "bg-slate-950 border-slate-800"
                } ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200">
                    {field.question}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {meta && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Confidence: {Math.round((meta.confidence || 0.95) * 100)}%
                    </span>
                  )}
                </div>

                {field.type === "textarea" ? (
                  <textarea
                    rows={3}
                    value={filledVal}
                    onChange={(e) =>
                      setBatchFormValues({ ...batchFormValues, [field.id]: e.target.value })
                    }
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                  />
                ) : field.type === "select" ? (
                  <select
                    value={filledVal}
                    onChange={(e) =>
                      setBatchFormValues({ ...batchFormValues, [field.id]: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select an option...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={filledVal}
                    onChange={(e) =>
                      setBatchFormValues({ ...batchFormValues, [field.id]: e.target.value })
                    }
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                )}

                {meta?.reasoning && (
                  <p className="text-[10px] text-slate-400 mt-1 italic">↳ {meta.reasoning}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
