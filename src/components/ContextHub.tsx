import React, { useState, useEffect } from "react";
import {
  Sparkles,
  FileText,
  Save,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Plus,
  Eye,
  Sliders,
  User as UserIcon,
  Zap,
  Layers,
  CopyPlus,
  Edit2,
} from "lucide-react";
import { PersonaProfile, BatchFormField, BatchFieldAnswer } from "../types";
import { ProfileSubTab } from "./ProfileSubTab";
import { InstructionsSubTab } from "./InstructionsSubTab";
import { DocumentsSubTab } from "./DocumentsSubTab";
import { PreviewSubTab } from "./PreviewSubTab";
import { BatchTesterSubTab } from "./BatchTesterSubTab";

const LOCAL_PAIRING_TOKEN = "local-user-profile";

const DEFAULT_PROFILES: PersonaProfile[] = [
  {
    id: "profile-cloud-lead",
    name: "Tech Lead & Cloud Architect",
    icon: "💼",
    isDefault: true,
    systemInstruction:
      "You are an intelligent, senior tech lead and cloud architect answering online job applications and technical questionnaires. Answer concisely, in first person as the applicant. Emphasize distributed systems, Google Cloud Run, high scalability, and AI engineering.",
    selectedModel: "gemini-3.7-flash",
    usePageContext: true,
    profileFields: {
      fullName: "Jane Doe",
      email: "jane.doe@example.com",
      phone: "+1 (555) 234-5678",
      location: "San Francisco, CA, USA",
      jobTitle: "Senior Full-Stack & Cloud Architect",
      yearsOfExperience: "8+ years",
      education: "M.S. in Computer Science, Stanford University (2018)",
      coreSkills:
        "TypeScript, React, Node.js, Google Cloud Run, Firebase, Gemini API, Python, PostgreSQL, Docker, Kubernetes",
      portfolioUrl: "https://janedoe.dev",
      linkedinUrl: "https://linkedin.com/in/janedoe",
      githubUrl: "https://github.com/janedoe-cloud",
      bioSummary:
        "Senior software architect with 8+ years experience designing resilient microservices on Google Cloud and leading LLM-powered automation workflows. Specialized in TypeScript, distributed systems, and modern AI pipelines.",
      customQAs: [
        {
          id: "qa-1",
          question: "Are you legally authorized to work in the United States?",
          answer: "Yes, I am a US citizen authorized to work for any employer without sponsorship.",
        },
        {
          id: "qa-2",
          question: "Do you require visa sponsorship now or in the future?",
          answer: "No, I do not require sponsorship.",
        },
        {
          id: "qa-3",
          question: "What is your desired salary range?",
          answer:
            "$175,000 - $205,000 USD (flexible depending on total compensation, equity, and remote benefits).",
        },
        {
          id: "qa-4",
          question: "What is your earliest possible start date or notice period?",
          answer: "2 weeks notice from formal offer acceptance.",
        },
        {
          id: "qa-5",
          question: "Are you open to hybrid or remote work?",
          answer: "Yes, I am fully equipped for remote work or hybrid in SF Bay Area.",
        },
      ],
    },
    pdfFile: null,
    textContext:
      "Jane Doe — Senior Cloud Architect. Key career achievements: Scaled multi-tenant Cloud Run microservices to 12M monthly active users with 99.99% uptime. Led development of automated Gemini GenAI workflows reducing customer support response latency by 85%.",
  },
  {
    id: "profile-ai-engineer",
    name: "AI / GenAI Specialist",
    icon: "🤖",
    isDefault: false,
    systemInstruction:
      "You are an AI/ML Engineer specializing in LLM application development, Gemini multimodal grounding, agentic systems, and prompt engineering. Answer technical application forms highlighting GenAI architecture, vector embeddings, and production model integration.",
    selectedModel: "gemini-3.7-flash",
    usePageContext: true,
    profileFields: {
      fullName: "Jane Doe",
      email: "jane.ai@example.com",
      phone: "+1 (555) 234-5678",
      location: "San Francisco, CA, USA",
      jobTitle: "Staff AI Application & GenAI Engineer",
      yearsOfExperience: "6+ years in AI/Software",
      education: "M.S. in CS (AI Specialization), Stanford University",
      coreSkills:
        "Gemini GenAI SDK, Multimodal RAG, Python, TypeScript, LangChain, PyTorch, Cloud Run, Vector Databases, FastAPIs",
      portfolioUrl: "https://janedoe.dev/ai",
      linkedinUrl: "https://linkedin.com/in/janedoe-ai",
      githubUrl: "https://github.com/janedoe-genai",
      bioSummary:
        "AI Application Engineer with 6+ years experience shipping production GenAI products powered by Gemini 3.7 models, multimodal PDF grounding, and agentic workflows.",
      customQAs: [
        {
          id: "qa-ai-1",
          question: "Describe your experience with Large Language Models and GenAI.",
          answer:
            "I have built production LLM systems utilizing Google's Gemini SDK, structured JSON outputs, function calling, multimodal document ingestion, and low-latency retrieval pipelines on Google Cloud.",
        },
        {
          id: "qa-ai-2",
          question: "What is your authorization status?",
          answer: "US Citizen, no sponsorship required.",
        },
      ],
    },
    pdfFile: null,
    textContext:
      "Specialized in Gemini 3.7 Flash reasoning, multimodal document grounding, structured outputs, and real-time streaming AI integrations.",
  },
  {
    id: "profile-vendor",
    name: "Corporate Vendor & Procurement",
    icon: "🏢",
    isDefault: false,
    systemInstruction:
      "You are a corporate vendor representative filling out procurement, vendor onboarding, and compliance forms. Answer with formal corporate clarity, exact billing coordinates, and tax compliance details.",
    selectedModel: "gemini-3.7-flash",
    usePageContext: true,
    profileFields: {
      fullName: "Jane Doe (Representative)",
      email: "procurement@acme-cloud-solutions.com",
      phone: "+1 (800) 555-0199",
      location: "100 Market St, Suite 400, San Francisco, CA 94105",
      jobTitle: "Director of Enterprise Solutions",
      yearsOfExperience: "10+ years corporate",
      education: "B.A. Business Administration",
      coreSkills: "SOC2 Compliance, ISO 27001, Enterprise SLA, Cloud Infrastructure, Procurement",
      portfolioUrl: "https://acme-cloud-solutions.com",
      linkedinUrl: "https://linkedin.com/company/acme-cloud-solutions",
      githubUrl: "https://github.com/acme-cloud-solutions",
      bioSummary:
        "ACME Cloud Solutions provides enterprise AI automation and cloud services with 99.99% SLA and SOC2 Type II compliance.",
      customQAs: [
        {
          id: "qa-v-1",
          question: "What is your standard payment term?",
          answer: "Net 30 via ACH or Wire Transfer.",
        },
        {
          id: "qa-v-2",
          question: "Do you maintain SOC2 Type II certification?",
          answer:
            "Yes, ACME Cloud Solutions holds active SOC2 Type II and ISO 27001 certifications.",
        },
      ],
    },
    pdfFile: null,
    textContext: "Corporate Vendor Onboarding Profile — ACME Cloud Solutions Inc.",
  },
];

const SAMPLE_BATCH_FORM: BatchFormField[] = [
  {
    id: "full_name",
    name: "full_name",
    type: "text",
    question: "Full Legal Name",
    placeholder: "e.g. John Doe",
    required: true,
  },
  {
    id: "email_address",
    name: "email_address",
    type: "email",
    question: "Email Address",
    placeholder: "e.g. john@example.com",
    required: true,
  },
  {
    id: "phone_number",
    name: "phone_number",
    type: "tel",
    question: "Phone Number",
    placeholder: "e.g. +1 555 123 4567",
    required: true,
  },
  {
    id: "current_location",
    name: "current_location",
    type: "text",
    question: "Current Location / City & State",
    placeholder: "e.g. San Francisco, CA",
    required: true,
  },
  {
    id: "job_title",
    name: "job_title",
    type: "text",
    question: "Current or Target Job Title",
    placeholder: "e.g. Senior Software Engineer",
  },
  {
    id: "total_experience",
    name: "total_experience",
    type: "text",
    question: "Total Years of Relevant Experience",
    placeholder: "e.g. 7 years",
  },
  {
    id: "work_auth",
    name: "work_auth",
    type: "select",
    question: "Are you authorized to work in the US without sponsorship?",
    options: [
      "Yes, US Citizen / Green Card",
      "Yes, eligible with existing visa",
      "No, require visa sponsorship",
    ],
  },
  {
    id: "salary_expectation",
    name: "salary_expectation",
    type: "text",
    question: "Desired Annual Compensation / Salary Range",
    placeholder: "e.g. $160,000 - $185,000",
  },
  {
    id: "earliest_start_date",
    name: "earliest_start_date",
    type: "text",
    question: "Earliest Start Date / Notice Period",
    placeholder: "e.g. 2 weeks notice",
  },
  {
    id: "core_technologies",
    name: "core_technologies",
    type: "text",
    question: "List Your Top Core Technologies & Frameworks",
    placeholder: "e.g. TypeScript, React, Cloud Run, Python",
  },
  {
    id: "linkedin_profile",
    name: "linkedin_profile",
    type: "text",
    question: "LinkedIn Profile URL",
    placeholder: "https://linkedin.com/in/...",
  },
  {
    id: "why_join_us",
    name: "why_join_us",
    type: "textarea",
    question:
      "Briefly explain why your background is a strong fit for this position (2-3 sentences)",
    placeholder: "Share your passion and relevant achievements...",
  },
];

interface ContextHubProps {
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
}

export function ContextHub({ selectedModel, onModelChange }: ContextHubProps) {
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgedRecently, setPurgedRecently] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<
    "profile" | "instructions" | "documents" | "batch-tester" | "preview"
  >("profile");

  const [profiles, setProfiles] = useState<PersonaProfile[]>(DEFAULT_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>("profile-cloud-lead");
  const [renamingProfileId, setRenamingProfileId] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState<string>("");

  const [batchFormValues, setBatchFormValues] = useState<Record<string, string>>({});
  const [batchAnswersMetadata, setBatchAnswersMetadata] = useState<
    Record<string, BatchFieldAnswer>
  >({});
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchLatency, setBatchLatency] = useState<number | null>(null);
  const [batchModelUsed, setBatchModelUsed] = useState<string | null>(null);

  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) || profiles[0] || DEFAULT_PROFILES[0];

  const batchBackendUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/batchAnswerForm`
      : "http://localhost:3000/batchAnswerForm";

  useEffect(() => {
    try {
      const localStored = localStorage.getItem("gemini_dashboard_context_config");
      if (localStored) {
        const parsed = JSON.parse(localStored);
        if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
          setProfiles(parsed.profiles);
          if (parsed.activeProfileId) setActiveProfileId(parsed.activeProfileId);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const updateActiveProfile = (updater: (prev: PersonaProfile) => PersonaProfile) => {
    setProfiles((prevList) => prevList.map((p) => (p.id === activeProfileId ? updater(p) : p)));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const payload = {
        activeProfileId,
        profiles,
        systemInstruction: activeProfile.systemInstruction,
        selectedModel: activeProfile.selectedModel,
        usePageContext: activeProfile.usePageContext,
        profileFields: activeProfile.profileFields,
        textContext: activeProfile.textContext,
        pdfFile: activeProfile.pdfFile,
      };
      localStorage.setItem("gemini_dashboard_context_config", JSON.stringify(payload));

      try {
        await fetch("/api/syncProfile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pairingToken: LOCAL_PAIRING_TOKEN,
            userId: null,
            email: null,
            displayName: null,
            profiles,
            activeProfileId,
            profileFields: activeProfile.profileFields,
            systemInstruction: activeProfile.systemInstruction,
            selectedModel: activeProfile.selectedModel,
            usePageContext: activeProfile.usePageContext,
            pdfData: activeProfile.pdfFile?.base64 || null,
            pdfName: activeProfile.pdfFile?.name || null,
            pdfSize: activeProfile.pdfFile?.size || null,
            pdfMimeType: activeProfile.pdfFile?.mimeType || null,
            textContext: activeProfile.textContext || null,
          }),
        });
      } catch (syncErr) {
        console.warn("Backend cache sync notice:", syncErr);
      }

      if (onModelChange) {
        onModelChange(activeProfile.selectedModel);
      }

      setSavedRecently(true);
      setTimeout(() => setSavedRecently(false), 3000);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handlePurgeContext = async () => {
    if (
      !window.confirm(
        "This will permanently delete all synced context data from the server. Continue?"
      )
    )
      return;
    setPurging(true);
    try {
      const res = await fetch("/api/purgeContext", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingToken: LOCAL_PAIRING_TOKEN }),
      });
      const data = await res.json();
      if (data.success) {
        setPurgedRecently(true);
        setTimeout(() => setPurgedRecently(false), 3000);
      } else {
        alert(data.error || "Failed to clear synced data.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || "Failed to clear synced data.");
    } finally {
      setPurging(false);
    }
  };

  const handleCreateProfile = () => {
    const newId = `profile-${Date.now()}`;
    const newProf: PersonaProfile = {
      id: newId,
      name: `New Persona ${profiles.length + 1}`,
      icon: "✨",
      systemInstruction: DEFAULT_PROFILES[0].systemInstruction,
      selectedModel: selectedModel || "gemini-3.7-flash",
      usePageContext: true,
      profileFields: {
        ...activeProfile.profileFields,
        jobTitle: "Specialist / Consultant",
      },
      pdfFile: null,
      textContext: "",
    };
    setProfiles((prev) => [...prev, newProf]);
    setActiveProfileId(newId);
  };

  const handleDuplicateProfile = () => {
    const newId = `profile-${Date.now()}`;
    const duplicated: PersonaProfile = {
      ...JSON.parse(JSON.stringify(activeProfile)),
      id: newId,
      name: `${activeProfile.name} (Copy)`,
      icon: activeProfile.icon || "📋",
      isDefault: false,
    };
    setProfiles((prev) => [...prev, duplicated]);
    setActiveProfileId(newId);
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) {
      alert("You must keep at least one profile.");
      return;
    }
    const remaining = profiles.filter((p) => p.id !== id);
    setProfiles(remaining);
    if (activeProfileId === id) {
      setActiveProfileId(remaining[0].id);
    }
  };

  const handleSaveRename = (id: string) => {
    if (newProfileName.trim()) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: newProfileName.trim() } : p))
      );
    }
    setRenamingProfileId(null);
  };

  const handleCopyPairingToken = () => {
    navigator.clipboard.writeText(LOCAL_PAIRING_TOKEN);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(batchBackendUrl);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Multi-Profile Switcher */}
      <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-slate-900 border border-blue-800/40 rounded-3xl p-6 sm:p-8 shadow-xl shadow-blue-950/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300">
                <Sliders className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Context & Persona Profiles
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                Local Mode
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span>{profiles.length} Personas</span>
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Create targeted applicant personas with custom resumes, system prompts, and Q&As. The
              Chrome Extension supports 1-click persona switching and{" "}
              <strong>single-request batch form autofilling</strong>.
            </p>
          </div>

          {/* Save Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleCopyPairingToken}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium shadow-md transition"
              title="Copy Pairing Token for Chrome Extension"
            >
              {copiedToken ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-blue-400" />
              )}
              <span>{copiedToken ? "Copied" : "Copy Pair ID"}</span>
            </button>

            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : savedRecently ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {saving
                  ? "Saving..."
                  : savedRecently
                    ? "Saved All Profiles!"
                    : "Save & Sync Personas"}
              </span>
            </button>

            <button
              onClick={handlePurgeContext}
              disabled={purging}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 text-red-300 text-xs font-medium shadow-md transition disabled:opacity-50"
              title="Delete all synced context data from the server"
            >
              {purging ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : purgedRecently ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>
                {purging ? "Clearing..." : purgedRecently ? "Cleared!" : "Clear Synced Data"}
              </span>
            </button>
          </div>
        </div>

        {/* Multi-Persona Switching Bar */}
        <div className="mt-6 pt-5 border-t border-blue-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Active Persona:</span>
              <strong className="text-white bg-blue-500/20 px-2 py-0.5 rounded-lg border border-blue-400/30">
                {activeProfile.name}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Persona</span>
              </button>
              <button
                onClick={handleDuplicateProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition"
                title="Duplicate Current Persona"
              >
                <CopyPlus className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>
            </div>
          </div>

          {/* Persona Pills Carousel */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            {profiles.map((prof) => {
              const isActive = prof.id === activeProfileId;
              const isRenaming = renamingProfileId === prof.id;

              return (
                <div
                  key={prof.id}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all cursor-pointer select-none whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30"
                      : "bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                  onClick={() => !isRenaming && setActiveProfileId(prof.id)}
                >
                  <span className="text-sm">{prof.icon || "💼"}</span>
                  {isRenaming ? (
                    <input
                      type="text"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      onBlur={() => handleSaveRename(prof.id)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveRename(prof.id)}
                      autoFocus
                      className="px-2 py-0.5 rounded bg-slate-900 text-white text-xs border border-blue-400 focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs font-semibold">{prof.name}</span>
                  )}

                  {isActive && (
                    <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-white/20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingProfileId(prof.id);
                          setNewProfileName(prof.name);
                        }}
                        className="p-1 hover:text-white/80 rounded transition"
                        title="Rename Persona"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {profiles.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProfile(prof.id);
                          }}
                          className="p-1 hover:text-red-200 rounded transition"
                          title="Delete Persona"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Connection Bar */}
        <div className="mt-4 pt-4 border-t border-blue-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-400 font-mono">Batch Endpoint:</span>
            <code className="px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800 text-emerald-400 font-mono text-[11px] truncate max-w-xs sm:max-w-md">
              {batchBackendUrl}
            </code>
            <button
              onClick={handleCopyEndpoint}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              title="Copy Batch Backend URL"
            >
              {copiedEndpoint ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="text-slate-400 text-[11px] flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Switching personas instantly swaps the grounding prompt for the extension!</span>
          </div>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("profile")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeSubTab === "profile"
              ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <UserIcon className="w-4 h-4 text-blue-400" />
          <span>Profile & Q&A Repository</span>
        </button>

        <button
          onClick={() => setActiveSubTab("instructions")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeSubTab === "instructions"
              ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Persona AI Instructions & Model</span>
        </button>

        <button
          onClick={() => setActiveSubTab("documents")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeSubTab === "documents"
              ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Resume / PDF Document Grounding</span>
          {activeProfile.pdfFile && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
        </button>

        <button
          onClick={() => setActiveSubTab("batch-tester")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeSubTab === "batch-tester"
              ? "bg-blue-600/30 text-blue-200 border border-blue-500/50 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>⚡ Live Batch Form Autofill (Item 1)</span>
        </button>

        <button
          onClick={() => setActiveSubTab("preview")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeSubTab === "preview"
              ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
          }`}
        >
          <Eye className="w-4 h-4 text-purple-400" />
          <span>Context Inspector</span>
        </button>
      </div>

      {/* Sub-Tab Content */}
      {activeSubTab === "batch-tester" && (
        <BatchTesterSubTab
          activeProfile={activeProfile}
          batchFormValues={batchFormValues}
          setBatchFormValues={setBatchFormValues}
          batchAnswersMetadata={batchAnswersMetadata}
          setBatchAnswersMetadata={setBatchAnswersMetadata}
          batchLoading={batchLoading}
          setBatchLoading={setBatchLoading}
          batchLatency={batchLatency}
          setBatchLatency={setBatchLatency}
          batchModelUsed={batchModelUsed}
          setBatchModelUsed={setBatchModelUsed}
          sampleBatchForm={SAMPLE_BATCH_FORM}
        />
      )}

      {activeSubTab === "profile" && (
        <ProfileSubTab activeProfile={activeProfile} updateActiveProfile={updateActiveProfile} />
      )}

      {activeSubTab === "instructions" && (
        <InstructionsSubTab
          activeProfile={activeProfile}
          updateActiveProfile={updateActiveProfile}
        />
      )}

      {activeSubTab === "documents" && (
        <DocumentsSubTab activeProfile={activeProfile} updateActiveProfile={updateActiveProfile} />
      )}

      {activeSubTab === "preview" && <PreviewSubTab activeProfile={activeProfile} />}
    </div>
  );
}
