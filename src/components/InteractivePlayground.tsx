import React, { useState, useRef } from "react";
import {
  Sparkles,
  FileText,
  FileUp,
  Globe,
  FolderSearch,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Loader2,
  Settings2,
  Trash2,
  Eye,
  Info,
  Cpu,
  Zap,
  Square,
} from "lucide-react";
import { GoogleDrivePicker } from "./GoogleDrivePicker";
import { PickedFileResult } from "../utils/googlePicker";
import { ModelSelector } from "./ModelSelector";
import { AVAILABLE_GEMINI_MODELS } from "../types";

interface FormValues {
  fullName: string;
  email: string;
  phone: string;
  experienceYears: string;
  education: string;
  coreSkills: string;
  coverLetterSummary: string;
  portfolioOrGithub: string;
}

const SAMPLE_RESUME_TEXT = `JANE DOE
Senior Full-Stack Cloud Engineer & AI Specialist
Email: jane.doe@example.com | Phone: (555) 234-5678 | Portfolio: github.com/janedoe-cloud

PROFESSIONAL SUMMARY:
Accomplished software engineer with 7+ years of experience architecting distributed cloud applications on Google Cloud Run, TypeScript, React, and Gemini AI APIs. Proven track record of boosting system performance by 45% and reducing infrastructure costs.

EXPERIENCE:
- Senior Cloud Engineer @ CloudScale Technologies (2021 - Present):
  * Engineered serverless microservices handling 10M+ daily requests using Node.js and Google Cloud Run.
  * Spearheaded integration of LLM-powered automation workflows using Gemini API and vector embeddings.
- Full Stack Developer @ NexaByte Systems (2018 - 2021):
  * Developed customer-facing React web apps and GraphQL APIs.

EDUCATION:
- Master of Science in Computer Science, Stanford University (2018)
- Bachelor of Science in Software Engineering, UC Berkeley (2016)

SKILLS:
- Languages: TypeScript, JavaScript, Python, Go, SQL, HTML5/CSS3
- Frameworks & Cloud: React, Node.js, Express, Google Cloud Platform (Cloud Run, Firestore), Vite, Tailwind CSS
- AI/ML: Google GenAI SDK, Gemini 3.7 Flash, Vector Retrieval Grounding`;

interface InteractivePlaygroundProps {
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
}

export function InteractivePlayground({
  selectedModel: externalSelectedModel,
  onModelChange: externalOnModelChange,
}: InteractivePlaygroundProps = {}) {
  // Model state
  const [internalSelectedModel, setInternalSelectedModel] = useState<string>(() => {
    try {
      return localStorage.getItem("gemini_selected_model") || "gemini-3.7-flash";
    } catch {
      return "gemini-3.7-flash";
    }
  });

  const selectedModel = externalSelectedModel || internalSelectedModel;

  const handleModelChange = (modelId: string) => {
    if (externalOnModelChange) {
      externalOnModelChange(modelId);
    } else {
      setInternalSelectedModel(modelId);
    }
    try {
      localStorage.setItem("gemini_selected_model", modelId);
    } catch {
      // ignore
    }
    const modelMeta = AVAILABLE_GEMINI_MODELS.find((m) => m.id === modelId);
    addLog(`Switched active Gemini model to ${modelMeta ? modelMeta.name : modelId}`);
  };

  // Context state
  const [contextType, setContextType] = useState<"none" | "text" | "pdf" | "drive">("drive");
  const [textContext, setTextContext] = useState<string>(SAMPLE_RESUME_TEXT);
  const [pdfFile, setPdfFile] = useState<{ name: string; size: number; base64: string } | null>(null);
  const [driveFile, setDriveFile] = useState<PickedFileResult | null>(null);
  const [systemInstruction, setSystemInstruction] = useState<string>(
    "You are an assistant answering a job application form based on the applicant's background. Answer concisely, in first person as the applicant. Do not include conversational filler."
  );
  const [bearerToken, setBearerToken] = useState<string>("");

  // Form Fields State
  const [formData, setFormData] = useState<FormValues>({
    fullName: "",
    email: "",
    phone: "",
    experienceYears: "",
    education: "",
    coreSkills: "",
    coverLetterSummary: "",
    portfolioOrGithub: "",
  });

  // UI status
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isFillingAll, setIsFillingAll] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [eventLogs, setEventLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fix #7: Abort controller for the "Fill all" routine. Previously once
  // `fillAllFields` started there was no way to cancel a long-running fill;
  // the user was stuck until all 8 sequential requests resolved. Now a stop
  // button aborts the in-flight request immediately.
  const fillAllAbortRef = useRef<AbortController | null>(null);

  const addLog = (msg: string) => {
    setEventLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 19),
    ]);
  };

  // PDF File Upload Handler
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setErrorMsg("Please upload a valid PDF document.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).replace(/^data:[^;]+;base64,/, "");
      setPdfFile({
        name: file.name,
        size: file.size,
        base64,
      });
      setContextType("pdf");
      setErrorMsg(null);
      addLog(`Attached PDF context: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read PDF file.");
    };
    reader.readAsDataURL(file);
  };

  // Call the /answerQuestion endpoint
  const queryGemini = async (question: string): Promise<{ answer: string; model: string }> => {
    let contextPayload: any = null;

    if (contextType === "drive" && driveFile) {
      if (driveFile.type === "pdf") {
        const cleanBase64 = driveFile.data.replace(/^data:[^;]+;base64,/, "");
        contextPayload = {
          type: "pdf",
          data: cleanBase64,
          mimeType: "application/pdf",
        };
      } else {
        contextPayload = {
          type: "text",
          data: driveFile.data,
        };
      }
    } else if (contextType === "text" && textContext.trim()) {
      contextPayload = {
        type: "text",
        data: textContext.trim(),
      };
    } else if (contextType === "pdf" && pdfFile) {
      contextPayload = {
        type: "pdf",
        data: pdfFile.base64,
        mimeType: "application/pdf",
      };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (bearerToken.trim()) {
      headers["Authorization"] = `Bearer ${bearerToken.trim()}`;
    }

    // Fix #10: Pull the pairing token (and profile fields) out of the synced
    // dashboard config so the server can fall back to its in-memory cache of
    // synced context/profile/PDF. Previously the playground only sent
    // `userProfile` from localStorage, so the server could never match a
    // `pairingToken` and the playground could not use synced dashboard
    // context — only whatever happened to be in localStorage.
    let userProfile = null;
    let pairingToken: string | null = null;
    let storedSystemInstruction: string | null = null;
    try {
      const storedConfig = localStorage.getItem("gemini_dashboard_context_config");
      if (storedConfig) {
        const parsed = JSON.parse(storedConfig);
        userProfile = parsed.profileFields || null;
        pairingToken = parsed.pairingToken || null;
        storedSystemInstruction = parsed.systemInstruction || null;
      }
    } catch {
      // ignore
    }

    const response = await fetch("/answerQuestion", {
      method: "POST",
      headers,
      body: JSON.stringify({
        question,
        context: contextPayload,
        systemInstruction: systemInstruction.trim() || storedSystemInstruction || null,
        model: selectedModel,
        userProfile,
        pairingToken,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: Failed to get answer`);
    }

    return {
      answer: data.answer || "",
      model: data.model || selectedModel,
    };
  };

  // Fill single field
  const fillSingleField = async (
    fieldKey: keyof FormValues,
    questionPrompt: string
  ) => {
    setActiveField(fieldKey);
    setErrorMsg(null);
    try {
      addLog(`Querying [${selectedModel}] for: "${questionPrompt}"...`);
      const res = await queryGemini(questionPrompt);
      
      setFormData((prev) => ({ ...prev, [fieldKey]: res.answer }));
      addLog(`✅ Filled "${fieldKey}" using ${res.model} -> Dispatched synthetic events.`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to fill field");
      addLog(`❌ Error on "${fieldKey}": ${err.message}`);
    } finally {
      setActiveField(null);
    }
  };

  // Fill all fields via the single batch endpoint instead of 8 sequential
  // calls. The batch endpoint (/batchAnswerForm) resolves every field in one
  // round-trip using Gemini structured outputs, which is ~8x faster than the
  // previous sequential loop and also lets us abort the whole routine with a
  // single AbortController.
  const fillAllFields = async () => {
    // Abort any prior in-flight batch request before starting a new one.
    if (fillAllAbortRef.current) {
      fillAllAbortRef.current.abort();
    }
    const controller = new AbortController();
    fillAllAbortRef.current = controller;

    setIsFillingAll(true);
    setErrorMsg(null);
    setEventLogs([]);
    setProgressText("Sending single batch request to /batchAnswerForm...");

    const fieldsToFill: { key: keyof FormValues; id: string; prompt: string; label: string }[] = [
      { key: "fullName", id: "fullName", prompt: "What is the applicant's full legal name?", label: "Full Name" },
      { key: "email", id: "email", prompt: "What is the applicant's email address?", label: "Email Address" },
      { key: "phone", id: "phone", prompt: "What is the applicant's contact phone number?", label: "Phone Number" },
      { key: "experienceYears", id: "experienceYears", prompt: "How many years of relevant software engineering experience does the candidate have?", label: "Years of Experience" },
      { key: "education", id: "education", prompt: "What is the candidate's highest educational degree and university?", label: "Education" },
      { key: "coreSkills", id: "coreSkills", prompt: "List the candidate's primary core technical skills and programming languages.", label: "Core Skills" },
      { key: "coverLetterSummary", id: "coverLetterSummary", prompt: "Write a brief 2-3 sentence introductory statement highlighting why the applicant is a great fit for a Senior Cloud/AI role.", label: "Brief Summary" },
      { key: "portfolioOrGithub", id: "portfolioOrGithub", prompt: "What is the applicant's GitHub or portfolio URL?", label: "Portfolio / GitHub" },
    ];

    addLog(`🚀 Starting batch autofill via [${selectedModel}] for ${fieldsToFill.length} fields in a single request...`);

    // Build the context payload the same way queryGemini does, so the batch
    // path stays consistent with the single-field path.
    let contextPayload: any = null;
    if (contextType === "drive" && driveFile) {
      if (driveFile.type === "pdf") {
        contextPayload = {
          type: "pdf",
          data: driveFile.data.replace(/^data:[^;]+;base64,/, ""),
          mimeType: "application/pdf",
        };
      } else {
        contextPayload = { type: "text", data: driveFile.data };
      }
    } else if (contextType === "text" && textContext.trim()) {
      contextPayload = { type: "text", data: textContext.trim() };
    } else if (contextType === "pdf" && pdfFile) {
      contextPayload = { type: "pdf", data: pdfFile.base64, mimeType: "application/pdf" };
    }

    // Reuse the synced dashboard config so the server can fall back to its
    // in-memory cache of context/profile/PDF (fix #10 parity).
    let userProfile = null;
    let pairingToken: string | null = null;
    let storedSystemInstruction: string | null = null;
    try {
      const storedConfig = localStorage.getItem("gemini_dashboard_context_config");
      if (storedConfig) {
        const parsed = JSON.parse(storedConfig);
        userProfile = parsed.profileFields || null;
        pairingToken = parsed.pairingToken || null;
        storedSystemInstruction = parsed.systemInstruction || null;
      }
    } catch {
      // ignore
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (bearerToken.trim()) {
      headers["Authorization"] = `Bearer ${bearerToken.trim()}`;
    }

    try {
      const response = await fetch("/batchAnswerForm", {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          fields: fieldsToFill.map(({ id, prompt }) => ({
            id,
            type: "text",
            question: prompt,
          })),
          context: contextPayload,
          systemInstruction: systemInstruction.trim() || storedSystemInstruction || null,
          model: selectedModel,
          userProfile,
          pairingToken,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}: Batch autofill failed`);
      }

      const answers: Array<{ id: string; answer: string }> = Array.isArray(data.answers)
        ? data.answers
        : [];

      // Map batch answers back onto the form and log each field.
      const updates: Partial<FormValues> = {};
      answers.forEach((ans, idx) => {
        const matchField = fieldsToFill.find((f) => f.id === ans.id);
        const key = matchField?.key ?? (fieldsToFill[idx]?.key as keyof FormValues);
        if (!key) return;
        updates[key] = ans.answer || "";
        setActiveField(key);
        addLog(`✅ [${idx + 1}/${fieldsToFill.length}] ${matchField?.label || key} (${data.modelUsed || selectedModel}): "${(ans.answer || "").slice(0, 36)}..."`);
      });

      setFormData((prev) => ({ ...prev, ...updates }));
      setProgressText("");
      setActiveField(null);
      addLog(`🎉 Completed batch autofill in a single round-trip using ${data.modelUsed || selectedModel}!`);
    } catch (err: any) {
      if (err.name === "AbortError") {
        addLog("⏹ Batch autofill cancelled by user.");
        setProgressText("");
      } else {
        setErrorMsg(err.message || "Failed to execute batch autofill");
        addLog(`❌ Batch autofill error: ${err.message}`);
      }
    } finally {
      fillAllAbortRef.current = null;
      setIsFillingAll(false);
      setActiveField(null);
      setProgressText("");
    }
  };

  // Fix #7: Stop an in-flight batch autofill immediately.
  const handleStopFillAll = () => {
    if (fillAllAbortRef.current) {
      fillAllAbortRef.current.abort();
      fillAllAbortRef.current = null;
    }
    setIsFillingAll(false);
    setProgressText("");
    setActiveField(null);
    addLog("⏹ Autofill stop requested.");
  };

  const handleClearForm = () => {
    // Cancel any in-flight autofill before clearing.
    if (fillAllAbortRef.current) {
      fillAllAbortRef.current.abort();
      fillAllAbortRef.current = null;
    }
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      experienceYears: "",
      education: "",
      coreSkills: "",
      coverLetterSummary: "",
      portfolioOrGithub: "",
    });
    setEventLogs([]);
    setErrorMsg(null);
    addLog("Cleared form fields.");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Playground Description */}
      <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-900/40 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="text-slate-100 font-semibold text-base">
                Interactive Form Autofill Playground
              </h3>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Test how the backend service and extension content script identify form questions, ground answers in your supplied context (page text or PDF document), and populate inputs with synthetic event triggers.
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearForm}
              disabled={isFillingAll}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700 disabled:opacity-40"
            >
              Reset Form
            </button>
            {isFillingAll ? (
              // Fix #7: Stop button to abort a long-running batch autofill.
              <button
                onClick={handleStopFillAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{progressText || "Stop Autofill"}</span>
              </button>
            ) : (
              <button
                onClick={fillAllFields}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Batch Autofill Form with Gemini</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Form on Left (60%), Context & Control on Right (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Live Interactive Web Form */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-slate-200 font-semibold text-sm">Sample Job Application Form</h4>
                <p className="text-[11px] text-slate-400">
                  Simulates standard enterprise input elements, textareas, and contenteditables.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                8 Fillable Fields
              </span>
            </div>

            {/* Field: Full Name */}
            <div className={`p-3 rounded-xl border transition-all ${
              activeField === "fullName"
                ? "bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/30"
                : "bg-slate-950/50 border-slate-800/80"
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="input-fullname" className="text-xs font-medium text-slate-300">
                  Full Legal Name <span className="text-rose-400">*</span>
                </label>
                <button
                  onClick={() => fillSingleField("fullName", "What is the applicant's full name?")}
                  disabled={isFillingAll || activeField === "fullName"}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Autofill</span>
                </button>
              </div>
              <input
                id="input-fullname"
                type="text"
                name="full_name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Jane Doe"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Fields: Email & Phone Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-3 rounded-xl border transition-all ${
                activeField === "email"
                  ? "bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/30"
                  : "bg-slate-950/50 border-slate-800/80"
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="input-email" className="text-xs font-medium text-slate-300">
                    Email Address
                  </label>
                  <button
                    onClick={() => fillSingleField("email", "What is the candidate's email address?")}
                    disabled={isFillingAll || activeField === "email"}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Autofill</span>
                  </button>
                </div>
                <input
                  id="input-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jane@example.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className={`p-3 rounded-xl border transition-all ${
                activeField === "phone"
                  ? "bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/30"
                  : "bg-slate-950/50 border-slate-800/80"
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="input-phone" className="text-xs font-medium text-slate-300">
                    Phone Number
                  </label>
                  <button
                    onClick={() => fillSingleField("phone", "What is the applicant's phone number?")}
                    disabled={isFillingAll || activeField === "phone"}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Autofill</span>
                  </button>
                </div>
                <input
                  id="input-phone"
                  type="tel"
                  name="phone_number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 000-0000"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Field: Experience & Education Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-3 rounded-xl border transition-all ${
                activeField === "experienceYears"
                  ? "bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/30"
                  : "bg-slate-950/50 border-slate-800/80"
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="input-experience" className="text-xs font-medium text-slate-300">
                    Years of Experience
                  </label>
                  <button
                    onClick={() => fillSingleField("experienceYears", "How many years of relevant software engineering experience?")}
                    disabled={isFillingAll || activeField === "experienceYears"}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Autofill</span>
                  </button>
                </div>
                <input
                  id="input-experience"
                  type="text"
                  placeholder="e.g. 7 years"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className={`p-3 rounded-xl border transition-all ${
                activeField === "education"
                  ? "bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/30"
                  : "bg-slate-950/50 border-slate-800/80"
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="input-education" className="text-xs font-medium text-slate-300">
                    Education & Degrees
                  </label>
                  <button
                    onClick={() => fillSingleField("education", "What is the candidate's highest educational degree and university?")}
                    disabled={isFillingAll || activeField === "education"}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Autofill</span>
                  </button>
                </div>
                <input
                  id="input-education"
                  type="text"
                  placeholder="Degree and institution"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Field: Core Skills */}
            <div className={`p-3 rounded-xl border transition-all ${
              activeField === "coreSkills"
                ? "bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/30"
                : "bg-slate-950/50 border-slate-800/80"
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="input-skills" className="text-xs font-medium text-slate-300">
                  Primary Technical Skills
                </label>
                <button
                  onClick={() => fillSingleField("coreSkills", "List the candidate's core technical skills concisely.")}
                  disabled={isFillingAll || activeField === "coreSkills"}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Autofill</span>
                </button>
              </div>
              <input
                id="input-skills"
                type="text"
                value={formData.coreSkills}
                onChange={(e) => setFormData({ ...formData, coreSkills: e.target.value })}
                placeholder="TypeScript, React, Cloud Run, Gemini API..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Field: Cover Letter Summary (Textarea) */}
            <div className={`p-3 rounded-xl border transition-all ${
              activeField === "coverLetterSummary"
                ? "bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/30"
                : "bg-slate-950/50 border-slate-800/80"
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="input-coverletter" className="text-xs font-medium text-slate-300">
                  Professional Summary / Why are you a good fit?
                </label>
                <button
                  onClick={() => fillSingleField("coverLetterSummary", "Provide a 2-3 sentence elevator pitch summary of why the candidate is qualified for a senior engineering role.")}
                  disabled={isFillingAll || activeField === "coverLetterSummary"}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Autofill</span>
                </button>
              </div>
              <textarea
                id="input-coverletter"
                rows={3}
                value={formData.coverLetterSummary}
                onChange={(e) => setFormData({ ...formData, coverLetterSummary: e.target.value })}
                placeholder="Brief paragraph summarizing your background and achievements..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
              />
            </div>

            {/* Field: Portfolio / GitHub */}
            <div className={`p-3 rounded-xl border transition-all ${
              activeField === "portfolioOrGithub"
                ? "bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/30"
                : "bg-slate-950/50 border-slate-800/80"
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="input-portfolio" className="text-xs font-medium text-slate-300">
                  Portfolio / GitHub Link
                </label>
                <button
                  onClick={() => fillSingleField("portfolioOrGithub", "What is the applicant's GitHub or portfolio profile URL?")}
                  disabled={isFillingAll || activeField === "portfolioOrGithub"}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Autofill</span>
                </button>
              </div>
              <input
                id="input-portfolio"
                type="text"
                value={formData.portfolioOrGithub}
                onChange={(e) => setFormData({ ...formData, portfolioOrGithub: e.target.value })}
                placeholder="https://github.com/username"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Model Selection, Context Grounding & Execution Logs */}
        <div className="lg:col-span-5 space-y-4">
          {/* Model Selector Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />
          </div>

          {/* Grounding Source Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-400" />
                <h4 className="text-slate-200 font-semibold text-xs">Grounding Context Source</h4>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Active: {contextType}
              </span>
            </div>

            {/* Mode selection buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setContextType("drive")}
                className={`py-2 px-1.5 rounded-lg flex flex-col items-center gap-1 transition ${
                  contextType === "drive"
                    ? "bg-blue-600 text-white font-medium shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <FolderSearch className="w-3.5 h-3.5" />
                <span className="text-[11px] truncate">Google Picker</span>
              </button>
              <button
                onClick={() => setContextType("text")}
                className={`py-2 px-1.5 rounded-lg flex flex-col items-center gap-1 transition ${
                  contextType === "text"
                    ? "bg-blue-600 text-white font-medium shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[11px] truncate">Page Text</span>
              </button>
              <button
                onClick={() => setContextType("pdf")}
                className={`py-2 px-1.5 rounded-lg flex flex-col items-center gap-1 transition ${
                  contextType === "pdf"
                    ? "bg-blue-600 text-white font-medium shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                <span className="text-[11px] truncate">Attach PDF</span>
              </button>
              <button
                onClick={() => setContextType("none")}
                className={`py-2 px-1.5 rounded-lg flex flex-col items-center gap-1 transition ${
                  contextType === "none"
                    ? "bg-blue-600 text-white font-medium shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="text-[11px] truncate">No Context</span>
              </button>
            </div>

            {/* Context Content Editors */}
            {contextType === "drive" && (
              <GoogleDrivePicker
                selectedDriveFile={driveFile}
                onFileSelected={(file) => {
                  setDriveFile(file);
                  if (file) {
                    setErrorMsg(null);
                  }
                }}
                onLog={addLog}
              />
            )}

            {contextType === "text" && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Simulated Web Page Text Context:</span>
                  <button
                    onClick={() => setTextContext(SAMPLE_RESUME_TEXT)}
                    className="text-blue-400 hover:underline"
                  >
                    Reset Sample
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={textContext}
                  onChange={(e) => setTextContext(e.target.value)}
                  placeholder="Paste context text from resume, webpage, or documentation..."
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] focus:outline-none focus:border-blue-500 resize-y"
                />
              </div>
            )}

            {contextType === "pdf" && (
              <div className="space-y-2">
                <label className="block p-4 border border-dashed border-slate-700 hover:border-blue-500 rounded-xl bg-slate-950/60 cursor-pointer text-center transition">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                  {pdfFile ? (
                    <div className="space-y-1">
                      <FileUp className="w-6 h-6 text-emerald-400 mx-auto" />
                      <div className="text-xs font-semibold text-slate-200">{pdfFile.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {(pdfFile.size / 1024).toFixed(1)} KB — Base64 ready for Gemini PDF understanding
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-slate-400">
                      <FileUp className="w-6 h-6 text-blue-400 mx-auto" />
                      <div className="text-xs font-medium text-slate-300">
                        Click or drag PDF here to upload
                      </div>
                      <div className="text-[10px]">
                        Processed via Gemini's native PDF understanding inlineData
                      </div>
                    </div>
                  )}
                </label>

                {pdfFile && (
                  <button
                    onClick={() => setPdfFile(null)}
                    className="w-full py-1.5 text-xs text-rose-400 hover:bg-rose-950/30 rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove PDF</span>
                  </button>
                )}
              </div>
            )}

            {contextType === "none" && (
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">Plain Question Mode</div>
                <p className="text-[11px]">
                  No document or page context will be supplied. Gemini will respond using standard model intelligence.
                </p>
              </div>
            )}

            {/* System Instruction */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <label className="text-[11px] font-medium text-slate-400">
                System Instruction (Optional):
              </label>
              <textarea
                rows={2}
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                placeholder="Customize tone, persona, or output style..."
                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px] focus:outline-none focus:border-blue-500 resize-y"
              />
            </div>

            {/* Optional Bearer Token Input for testing auth */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Bearer Token (If AUTH_BEARER_TOKEN set):</span>
              </div>
              <input
                type="password"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="Optional static Bearer token"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px] focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Activity / Event Logger */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-slate-200 font-semibold text-xs">Runtime Event Stream</h4>
              <span className="text-[10px] text-slate-500">Synthetic Dispatch Log</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-300 h-44 overflow-y-auto space-y-1">
              {eventLogs.length === 0 ? (
                <div className="text-slate-600 italic">
                  Ready. Click "Autofill" or fill individual fields to watch API responses and event dispatches.
                </div>
              ) : (
                eventLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`leading-tight ${
                      log.includes("✅") || log.includes("🎉")
                        ? "text-emerald-400"
                        : log.includes("❌") || log.includes("Error")
                        ? "text-rose-400"
                        : "text-slate-300"
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
