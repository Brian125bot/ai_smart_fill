import React, { useState } from "react";
import { FileText, FileUp, Trash2 } from "lucide-react";
import { PersonaProfile } from "../types";

interface DocumentsSubTabProps {
  activeProfile: PersonaProfile;
  updateActiveProfile: (updater: (prev: PersonaProfile) => PersonaProfile) => void;
}

export function DocumentsSubTab({ activeProfile, updateActiveProfile }: DocumentsSubTabProps) {
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);

  const processPdfFileObject = (file: File) => {
    const isPdf =
      (file.type && file.type.toLowerCase().includes("pdf")) ||
      (file.name && file.name.toLowerCase().endsWith(".pdf"));

    if (!isPdf) {
      alert("Please select or drop a valid PDF document (.pdf).");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert("PDF exceeds the 25MB limit. Please choose a smaller document.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).replace(/^data:[^;]+;base64,/, "");
      updateActiveProfile((p) => ({
        ...p,
        pdfFile: {
          name: file.name,
          size: file.size,
          mimeType: file.type || "application/pdf",
          base64,
        },
      }));
    };
    reader.onerror = () => {
      alert("Failed to read PDF file.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processPdfFileObject(file);
    e.target.value = "";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Grounding Resume PDF ({activeProfile.name})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Gemini 3.7/3.5 models process PDF documents natively using multimodal document
                grounding.
              </p>
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingPdf(true);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingPdf(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingPdf(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingPdf(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                processPdfFileObject(file);
              }
            }}
            className={`border-2 border-dashed rounded-3xl p-6 text-center space-y-4 transition ${
              isDraggingPdf
                ? "border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/30"
                : "border-slate-800 hover:border-slate-700 bg-slate-950/60"
            }`}
          >
            {activeProfile.pdfFile ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">
                    {activeProfile.pdfFile.name}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {(activeProfile.pdfFile.size / 1024).toFixed(1)} KB •{" "}
                    {activeProfile.pdfFile.mimeType}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateActiveProfile((p) => ({ ...p, pdfFile: null }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Document</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center">
                  <FileUp className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-200">
                    Upload custom PDF resume for {activeProfile.name}
                  </p>
                  <p className="text-[11px] text-slate-400">PDF up to 25MB supported</p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <label className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer transition shadow-md shadow-blue-600/30">
                    <span>Browse Local PDF</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300">
              Or Paste Raw Text Knowledge Base
            </label>
            <textarea
              rows={4}
              value={activeProfile.textContext || ""}
              onChange={(e) => updateActiveProfile((p) => ({ ...p, textContext: e.target.value }))}
              placeholder="Paste additional notes, publications, or project summaries..."
              className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Document Grounding
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>
                <strong>Multimodal PDF Reading:</strong> Native reasoning across layout, dates,
                bullet points, and tables.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>
                <strong>Dedicated Per-Persona Files:</strong> You can attach different resumes for
                different roles.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
