import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  FileText,
  FileUp,
  Cpu,
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
  Briefcase,
  Link as LinkIcon,
  BookOpen,
  Zap,
  LogIn,
  ShieldCheck,
  Layers,
  CopyPlus,
  Edit2,
  Play,
  RotateCcw,
  Clock,
  ExternalLink,
  Square,
} from "lucide-react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
  db,
  handleFirestoreError,
  OperationType,
} from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  AVAILABLE_GEMINI_MODELS,
  PersonaProfile,
  UserProfileFields,
  CustomQA,
  BatchFormField,
  BatchFieldAnswer,
} from "../types";
import { GoogleDrivePicker } from "./GoogleDrivePicker";
import { PickedFileResult } from "../utils/googlePicker";

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
          answer:
            "Yes, I am a US citizen authorized to work for any employer without sponsorship.",
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
      coreSkills:
        "SOC2 Compliance, ISO 27001, Enterprise SLA, Cloud Infrastructure, Procurement",
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
  { id: "full_name", name: "full_name", type: "text", question: "Full Legal Name", placeholder: "e.g. John Doe", required: true },
  { id: "email_address", name: "email_address", type: "email", question: "Email Address", placeholder: "e.g. john@example.com", required: true },
  { id: "phone_number", name: "phone_number", type: "tel", question: "Phone Number", placeholder: "e.g. +1 555 123 4567", required: true },
  { id: "current_location", name: "current_location", type: "text", question: "Current Location / City & State", placeholder: "e.g. San Francisco, CA", required: true },
  { id: "job_title", name: "job_title", type: "text", question: "Current or Target Job Title", placeholder: "e.g. Senior Software Engineer" },
  { id: "total_experience", name: "total_experience", type: "text", question: "Total Years of Relevant Experience", placeholder: "e.g. 7 years" },
  { id: "work_auth", name: "work_auth", type: "select", question: "Are you authorized to work in the US without sponsorship?", options: ["Yes, US Citizen / Green Card", "Yes, eligible with existing visa", "No, require visa sponsorship"] },
  { id: "salary_expectation", name: "salary_expectation", type: "text", question: "Desired Annual Compensation / Salary Range", placeholder: "e.g. $160,000 - $185,000" },
  { id: "earliest_start_date", name: "earliest_start_date", type: "text", question: "Earliest Start Date / Notice Period", placeholder: "e.g. 2 weeks notice" },
  { id: "core_technologies", name: "core_technologies", type: "text", question: "List Your Top Core Technologies & Frameworks", placeholder: "e.g. TypeScript, React, Cloud Run, Python" },
  { id: "linkedin_profile", name: "linkedin_profile", type: "text", question: "LinkedIn Profile URL", placeholder: "https://linkedin.com/in/..." },
  { id: "why_join_us", name: "why_join_us", type: "textarea", question: "Briefly explain why your background is a strong fit for this position (2-3 sentences)", placeholder: "Share your passion and relevant achievements..." },
];

interface ContextHubProps {
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
}

/**
 * Returns a deep copy of the profiles array with the heavy `pdfFile.base64`
 * payload stripped out. This keeps persisted documents (Firestore + localStorage)
 * within their respective size limits (Firestore = 1MB hard cap,
 * localStorage = ~5-10MB). PDF metadata (name/size/mimeType) is preserved so
 * the UI can still render the attached-file chip on reload.
 */
function stripPdfBase64FromProfiles(profiles: PersonaProfile[]): PersonaProfile[] {
  return profiles.map((p) => {
    if (!p.pdfFile) return p;
    return {
      ...p,
      pdfFile: {
        name: p.pdfFile.name,
        size: p.pdfFile.size,
        mimeType: p.pdfFile.mimeType,
        base64: "", // stripped to respect storage limits
      },
    };
  });
}

export function ContextHub({ selectedModel, onModelChange }: ContextHubProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<
    "profile" | "instructions" | "documents" | "batch-tester" | "preview"
  >("profile");

  // Multi-Profile State (Item 2)
  const [profiles, setProfiles] = useState<PersonaProfile[]>(DEFAULT_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>("profile-cloud-lead");
  const [renamingProfileId, setRenamingProfileId] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState<string>("");

  // Unique per-browser pairing token for unauthenticated (local draft) users.
  // Previously every signed-out user shared the literal "local-user-profile"
  // token, so they could read each other's synced context. We now generate a
  // stable random token per browser and persist it in localStorage so the
  // Chrome extension can still re-pair with the same dashboard later.
  const [localPairingToken] = useState<string>(() => {
    try {
      const existing = localStorage.getItem("gemini_local_pairing_token");
      if (existing) return existing;
      const token = `local-${crypto.randomUUID()}`;
      localStorage.setItem("gemini_local_pairing_token", token);
      return token;
    } catch {
      // Fallback if localStorage / crypto is unavailable (SSR / privacy mode)
      return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  });

  // Batch Form Testing State (Item 1)
  const [batchFormValues, setBatchFormValues] = useState<Record<string, string>>({});
  const [batchAnswersMetadata, setBatchAnswersMetadata] = useState<Record<string, BatchFieldAnswer>>({});
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchLatency, setBatchLatency] = useState<number | null>(null);
  const [batchModelUsed, setBatchModelUsed] = useState<string | null>(null);
  const batchAbortControllerRef = useRef<AbortController | null>(null);

  // Active Profile Pointer
  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) || profiles[0] || DEFAULT_PROFILES[0];

  const backendUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/answerQuestion`
      : "https://gemini-form-autofill-extension-backend-365757207239.us-west1.run.app/answerQuestion";

  const batchBackendUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/batchAnswerForm`
      : "https://gemini-form-autofill-extension-backend-365757207239.us-west1.run.app/batchAnswerForm";

  // Load configuration from Firebase Firestore or LocalStorage
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLoadingConfig(true);
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.profiles) && data.profiles.length > 0) {
              setProfiles(data.profiles);
              if (data.activeProfileId) {
                setActiveProfileId(data.activeProfileId);
              }
            } else if (data.profileFields) {
              // Backward compatibility with single profile
              const singleProfile: PersonaProfile = {
                id: "profile-default",
                name: "Main Profile",
                icon: "💼",
                isDefault: true,
                systemInstruction:
                  data.systemInstruction || DEFAULT_PROFILES[0].systemInstruction,
                selectedModel: data.selectedModel || "gemini-3.7-flash",
                usePageContext:
                  typeof data.usePageContext === "boolean"
                    ? data.usePageContext
                    : true,
                profileFields: data.profileFields,
                pdfFile:
                  data.pdfData && data.pdfName
                    ? {
                        name: data.pdfName,
                        size: data.pdfSize || 0,
                        mimeType: data.pdfMimeType || "application/pdf",
                        base64: data.pdfData,
                      }
                    : null,
                textContext: data.textContext || "",
              };
              setProfiles([singleProfile, ...DEFAULT_PROFILES.slice(1)]);
            }
          }
        } catch (err) {
          console.warn("Cloud config load failed, using local storage:", err);
        } finally {
          setLoadingConfig(false);
        }
      } else {
        // Fallback to localStorage
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
        setLoadingConfig(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Update a field on the currently active profile
  const updateActiveProfile = (updater: (prev: PersonaProfile) => PersonaProfile) => {
    setProfiles((prevList) =>
      prevList.map((p) => (p.id === activeProfileId ? updater(p) : p))
    );
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      // Compute the pairing token. Authenticated users use their Firebase UID;
      // unauthenticated users use a unique per-browser token so they no longer
      // share the same "local-user-profile" namespace (security fix #5).
      const pairingToken = user ? user.uid : localPairingToken;

      // ---- Fix #1: Firestore 1MB document limit & localStorage 5-10MB limit ----
      // A 25MB PDF encodes to ~33MB of base64 text, which blows past both the
      // Firestore 1MB hard document limit and the browser localStorage quota.
      // We therefore strip the raw `base64` payload from anything persisted to
      // Firestore / localStorage. The heavy PDF bytes are sent only to the
      // backend in-memory cache (which has a 50mb express body limit) and kept
      // in-memory for the current session. Metadata (name/size/mimeType) is
      // still persisted so the UI can show the attached document on reload.
      const profilesForPersistence = stripPdfBase64FromProfiles(profiles);
      const activePdfMeta = activeProfile.pdfFile
        ? {
            pdfName: activeProfile.pdfFile.name,
            pdfSize: activeProfile.pdfFile.size,
            pdfMimeType: activeProfile.pdfFile.mimeType,
          }
        : { pdfName: null, pdfSize: null, pdfMimeType: null };

      // 1. Save to local storage for instant extension retrieval.
      // NOTE: base64 is intentionally omitted to stay within the 5-10MB quota.
      const payload = {
        activeProfileId,
        profiles: profilesForPersistence,
        pairingToken,
        // Also provide top-level aliases for the active profile
        systemInstruction: activeProfile.systemInstruction,
        selectedModel: activeProfile.selectedModel,
        usePageContext: activeProfile.usePageContext,
        profileFields: activeProfile.profileFields,
        textContext: activeProfile.textContext,
        pdfFile: activeProfile.pdfFile
          ? {
              name: activeProfile.pdfFile.name,
              size: activeProfile.pdfFile.size,
              mimeType: activeProfile.pdfFile.mimeType,
              // base64 deliberately omitted for localStorage
            }
          : null,
      };
      localStorage.setItem("gemini_dashboard_context_config", JSON.stringify(payload));

      // 2. Sync to Firestore if authenticated.
      // Firestore enforces a hard 1MB document limit, so the full base64 PDF
      // is NEVER written here — only metadata. The in-memory backend cache
      // (step 3) holds the bytes for the live extension session.
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(
          userDocRef,
          {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            activeProfileId,
            profiles: profilesForPersistence,
            // Mirror current active profile at top level for backward compat
            systemInstruction: activeProfile.systemInstruction,
            selectedModel: activeProfile.selectedModel,
            usePageContext: activeProfile.usePageContext,
            profileFields: activeProfile.profileFields,
            textContext: activeProfile.textContext || "",
            pdfName: activePdfMeta.pdfName,
            pdfSize: activePdfMeta.pdfSize,
            pdfMimeType: activePdfMeta.pdfMimeType,
            pdfData: null, // never store multi-MB base64 in a Firestore doc
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      // 3. Sync to backend API cache for instant Chrome Extension pairing & autofill.
      // The backend allows large bodies (50mb) and keeps data in memory, so it
      // is the only sink that receives the full base64 PDF for this session.
      try {
        await fetch("/api/syncProfile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pairingToken,
            userId: user?.uid || null,
            email: user?.email || null,
            displayName: user?.displayName || null,
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
      if (user) {
        try {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        } catch {
          // Handled
        }
      }
    } finally {
      setSaving(false);
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
    // Reset file input value so the same file can be re-selected if needed
    e.target.value = "";
  };

  const handleDrivePicked = (file: PickedFileResult | null) => {
    if (!file) return;
    if (file.type === "pdf") {
      updateActiveProfile((p) => ({
        ...p,
        pdfFile: {
          name: file.name,
          size: file.sizeBytes || 0,
          mimeType: file.mimeType || "application/pdf",
          base64: file.data.replace(/^data:[^;]+;base64,/, ""),
        },
      }));
    } else if (file.data) {
      updateActiveProfile((p) => ({
        ...p,
        textContext: file.data,
      }));
    }
  };

  const handleAddCustomQA = () => {
    const newQA: CustomQA = {
      id: `qa-${Date.now()}`,
      question: "",
      answer: "",
    };
    updateActiveProfile((p) => ({
      ...p,
      profileFields: {
        ...p.profileFields,
        customQAs: [...(p.profileFields.customQAs || []), newQA],
      },
    }));
  };

  const handleUpdateCustomQA = (
    id: string,
    field: "question" | "answer",
    val: string
  ) => {
    updateActiveProfile((p) => ({
      ...p,
      profileFields: {
        ...p.profileFields,
        customQAs: (p.profileFields.customQAs || []).map((item) =>
          item.id === id ? { ...item, [field]: val } : item
        ),
      },
    }));
  };

  const handleDeleteCustomQA = (id: string) => {
    updateActiveProfile((p) => ({
      ...p,
      profileFields: {
        ...p.profileFields,
        customQAs: (p.profileFields.customQAs || []).filter((item) => item.id !== id),
      },
    }));
  };

  const handleCopyPairingToken = () => {
    const token = user ? user.uid : localPairingToken;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Wrap the Google sign-in popup in a loading state so the button shows a
  // spinner and is disabled during the OAuth flow. Previously `authLoading`
  // was declared but never toggled, leaving the button clickable mid-sign-in.
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Sign-in error:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(batchBackendUrl);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  // Item 1: Run full batch fill on sample form with abort/stop support
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
          fields: SAMPLE_BATCH_FORM,
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
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Batch fill test cancelled by user.");
      } else {
        console.error("Batch autofill test error:", err);
        alert(err.message || "Failed to execute batch test");
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
                <ShieldCheck className="w-3.5 h-3.5" />
                {user ? "Cloud Synced" : "Local Draft"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span>{profiles.length} Personas</span>
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Create targeted applicant personas with custom resumes, system prompts, and Q&As.
              The Chrome Extension supports 1-click persona switching and <strong>sub-second batch form autofilling</strong>.
            </p>
          </div>

          {/* User Auth & Save Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-2xl">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-10 h-10 rounded-xl border border-slate-600 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    {user.email?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="text-left pr-2">
                  <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                    {user.displayName || user.email?.split("@")[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    UID: {user.uid.slice(0, 8)}...
                  </div>
                </div>
                <button
                  onClick={handleCopyPairingToken}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 text-xs font-medium transition"
                  title="Copy Pairing Token for Chrome Extension"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedToken ? "Copied" : "Pair ID"}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium shadow-md transition disabled:opacity-50"
              >
                {authLoading ? (
                  <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 text-blue-400" />
                )}
                <span>{authLoading ? "Signing in..." : "Sign in with Google to Sync Cloud"}</span>
              </button>
            )}

            {/* Save Button */}
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
              <span>{saving ? "Saving..." : savedRecently ? "Saved All Profiles!" : "Save & Sync Personas"}</span>
            </button>
          </div>
        </div>

        {/* Item 2: Multi-Persona Switching Bar */}
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
              {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
          {activeProfile.pdfFile && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
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

      {/* Sub Tab: Live Batch Form Autofill Tester (Item 1) */}
      {activeSubTab === "batch-tester" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-800/40 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span>Item 1: High-Speed Batch Form Autofilling Demo</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Instead of making 12 sequential API calls taking 20+ seconds, the extension makes <strong>a single request</strong> to <code className="text-emerald-400 font-mono">/batchAnswerForm</code>. All fields are resolved coherently with Gemini Structured Outputs.
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

          {/* Form Fields Simulation Grid */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Interactive Application Form (12 Fields)</span>
              <span className="text-[11px] text-blue-400 font-normal">
                Using Persona: <strong>{activeProfile.name}</strong>
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SAMPLE_BATCH_FORM.map((field) => {
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
                      <p className="text-[10px] text-slate-400 mt-1 italic">
                        ↳ {meta.reasoning}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab: Structured Profile & Q&A */}
      {activeSubTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Personal & Career Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-blue-400" />
                  <span>Personal Coordinates ({activeProfile.name})</span>
                </h3>
                <span className="text-[11px] text-slate-400">Used for basic form fields</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={activeProfile.profileFields.fullName || ""}
                    onChange={(e) =>
                      updateActiveProfile((p) => ({
                        ...p,
                        profileFields: { ...p.profileFields, fullName: e.target.value },
                      }))
                    }
                    placeholder="e.g. Jane Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Target / Current Job Title
                  </label>
                  <input
                    type="text"
                    value={activeProfile.profileFields.jobTitle || ""}
                    onChange={(e) =>
                      updateActiveProfile((p) => ({
                        ...p,
                        profileFields: { ...p.profileFields, jobTitle: e.target.value },
                      }))
                    }
                    placeholder="e.g. Senior Cloud Engineer"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={activeProfile.profileFields.email || ""}
                    onChange={(e) =>
                      updateActiveProfile((p) => ({
                        ...p,
                        profileFields: { ...p.profileFields, email: e.target.value },
                      }))
                    }
                    placeholder="e.g. jane@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={activeProfile.profileFields.phone || ""}
                    onChange={(e) =>
                      updateActiveProfile((p) => ({
                        ...p,
                        profileFields: { ...p.profileFields, phone: e.target.value },
                      }))
                    }
                    placeholder="e.g. +1 (555) 019-2834"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Location / Current Address
                  </label>
                  <input
                    type="text"
                    value={activeProfile.profileFields.location || ""}
                    onChange={(e) =>
                      updateActiveProfile((p) => ({
                        ...p,
                        profileFields: { ...p.profileFields, location: e.target.value },
                      }))
                    }
                    placeholder="e.g. San Francisco, CA, United States"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Career & Qualifications */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <span>Career & Academic History</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Years of Experience
                  </label>
                  <input
                    type="text"
                    value={activeProfile.profileFields.yearsOfExperience || ""}
                    onChange={(e) =>
                      updateActiveProfile((p) => ({
                        ...p,
                        profileFields: {
                          ...p.profileFields,
                          yearsOfExperience: e.target.value,
                        },
                      }))
                    }
                    placeholder="e.g. 8+ years"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Education & Degrees
                  </label>
                  <input
                    type="text"
                    value={activeProfile.profileFields.education || ""}
                    onChange={(e) =>
                      updateActiveProfile((p) => ({
                        ...p,
                        profileFields: { ...p.profileFields, education: e.target.value },
                      }))
                    }
                    placeholder="e.g. M.S. in Computer Science"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Core Skills & Key Technologies
                  </label>
                  <input
                    type="text"
                    value={activeProfile.profileFields.coreSkills || ""}
                    onChange={(e) =>
                      updateActiveProfile((p) => ({
                        ...p,
                        profileFields: { ...p.profileFields, coreSkills: e.target.value },
                      }))
                    }
                    placeholder="e.g. TypeScript, React, Cloud Run, Python, SQL, Docker"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Executive Summary / Bio
                  </label>
                  <textarea
                    rows={3}
                    value={activeProfile.profileFields.bioSummary || ""}
                    onChange={(e) =>
                      updateActiveProfile((p) => ({
                        ...p,
                        profileFields: { ...p.profileFields, bioSummary: e.target.value },
                      }))
                    }
                    placeholder="Brief 2-3 sentence overview of this persona..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Custom Q&A Repository */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <span>Persona Q&A Repository</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pre-saved answers for work authorization, salary, start date, relocation, etc.
                  </p>
                </div>
                <button
                  onClick={handleAddCustomQA}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>

              <div className="space-y-3">
                {(activeProfile.profileFields.customQAs || []).map((qa, index) => (
                  <div
                    key={qa.id || index}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={qa.question}
                        onChange={(e) => handleUpdateCustomQA(qa.id, "question", e.target.value)}
                        placeholder="e.g. What is your notice period or earliest start date?"
                        className="flex-1 bg-transparent border-b border-slate-800 focus:border-purple-500 text-slate-200 text-xs font-medium pb-1 focus:outline-none"
                      />
                      <button
                        onClick={() => handleDeleteCustomQA(qa.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={qa.answer}
                      onChange={(e) => handleUpdateCustomQA(qa.id, "answer", e.target.value)}
                      placeholder="Your preferred answer for this question..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800/80 text-slate-200 text-xs focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Web Presence & Quick Summary Card */}
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-cyan-400" />
                <span>Web Presence</span>
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    LinkedIn Profile URL
                  </label>
                  <input
                    type="url"
                    value={activeProfile.profileFields.linkedinUrl || ""}
                    onChange={(e) =>
                      updateActiveProfile((p) => ({
                        ...p,
                        profileFields: { ...p.profileFields, linkedinUrl: e.target.value },
                      }))
                    }
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    GitHub / Code Repository
                  </label>
                  <input
                    type="url"
                    value={activeProfile.profileFields.githubUrl || ""}
                    onChange={(e) =>
                      updateActiveProfile((p) => ({
                        ...p,
                        profileFields: { ...p.profileFields, githubUrl: e.target.value },
                      }))
                    }
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Portfolio / Website
                  </label>
                  <input
                    type="url"
                    value={activeProfile.profileFields.portfolioUrl || ""}
                    onChange={(e) =>
                      updateActiveProfile((p) => ({
                        ...p,
                        profileFields: { ...p.profileFields, portfolioUrl: e.target.value },
                      }))
                    }
                    placeholder="https://yourportfolio.dev"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Information Card */}
            <div className="p-5 rounded-3xl bg-blue-950/30 border border-blue-900/50 space-y-3">
              <div className="flex items-center gap-2 text-blue-300 font-semibold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Multi-Profile Architecture</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                When you click "AutoFill Form" or "Batch Fill" in Chrome, the extension automatically injects the active persona profile (<strong className="text-white">{activeProfile.name}</strong>).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab: AI Persona & Instructions */}
      {activeSubTab === "instructions" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>System Instruction ({activeProfile.name})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Governs tone, technical emphasis, and phrasing when answering forms.
                  </p>
                </div>
              </div>

              <textarea
                rows={6}
                value={activeProfile.systemInstruction}
                onChange={(e) =>
                  updateActiveProfile((p) => ({ ...p, systemInstruction: e.target.value }))
                }
                className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
                placeholder="Enter system prompt for Gemini..."
              />
            </div>

            {/* Model & Behavior Settings */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span>Preferred Gemini Model Architecture</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_GEMINI_MODELS.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      updateActiveProfile((p) => ({ ...p, selectedModel: m.id }));
                      // Fix #9: propagate the model selection to the parent
                      // header immediately so the displayed model is not stale
                      // until the user manually clicks "Save & Sync".
                      if (onModelChange) onModelChange(m.id);
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      activeProfile.selectedModel === m.id
                        ? "bg-blue-600/15 border-blue-500 ring-1 ring-blue-500"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-white">{m.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${m.badgeColor}`}>
                        {m.speed}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {m.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Persona Tips
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Use <strong>first-person ("I am...", "My experience...")</strong> for job applications.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Gemini 3.7 Flash supports batch reasoning for 20+ fields in under 1.5 seconds.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab: Master Grounding Document */}
      {activeSubTab === "documents" && (
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
                    Gemini 3.7/3.5 models process PDF documents natively using multimodal document grounding.
                  </p>
                </div>
              </div>

              {/* PDF Drop / Upload Zone */}
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
                        onClick={() =>
                          updateActiveProfile((p) => ({ ...p, pdfFile: null }))
                        }
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
                      <GoogleDrivePicker
                        selectedDriveFile={null}
                        onFileSelected={handleDrivePicked}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Text Fallback */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300">
                  Or Paste Raw Text Knowledge Base
                </label>
                <textarea
                  rows={4}
                  value={activeProfile.textContext || ""}
                  onChange={(e) =>
                    updateActiveProfile((p) => ({ ...p, textContext: e.target.value }))
                  }
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
                  <span><strong>Multimodal PDF Reading:</strong> Native reasoning across layout, dates, bullet points, and tables.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span><strong>Dedicated Per-Persona Files:</strong> You can attach different resumes for different roles.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab: Preview & Inspector */}
      {activeSubTab === "preview" && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span>Assembled Context Inspector ({activeProfile.name})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full synthesized prompt payload sent during extension single-field and batch fills.
                </p>
              </div>
            </div>

            <pre className="p-5 rounded-2xl bg-slate-950 border border-slate-800/90 text-slate-300 font-mono text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap max-h-[500px]">
{`--- ACTIVE PERSONA: ${activeProfile.name} (${activeProfile.id}) ---

--- SYSTEM INSTRUCTION ---
${activeProfile.systemInstruction}

--- USER STRUCTURED PROFILE ---
Full Name: ${activeProfile.profileFields.fullName || "N/A"}
Title: ${activeProfile.profileFields.jobTitle || "N/A"}
Email: ${activeProfile.profileFields.email || "N/A"} | Phone: ${activeProfile.profileFields.phone || "N/A"}
Location: ${activeProfile.profileFields.location || "N/A"}
Experience: ${activeProfile.profileFields.yearsOfExperience || "N/A"}
Education: ${activeProfile.profileFields.education || "N/A"}
Skills: ${activeProfile.profileFields.coreSkills || "N/A"}
Portfolio: ${activeProfile.profileFields.portfolioUrl || "N/A"} | LinkedIn: ${activeProfile.profileFields.linkedinUrl || "N/A"}
Bio: ${activeProfile.profileFields.bioSummary || "N/A"}

--- PRESET Q&A REPOSITORY ---
${(activeProfile.profileFields.customQAs || [])
  .map((qa, i) => `${i + 1}. Q: ${qa.question}\n   A: ${qa.answer}`)
  .join("\n\n")}

--- ATTACHED GROUNDING DOCUMENT ---
${
  activeProfile.pdfFile
    ? `[Document: ${activeProfile.pdfFile.name} (${(
        activeProfile.pdfFile.size / 1024
      ).toFixed(1)} KB)]`
    : activeProfile.textContext
    ? `[Text Context: ${activeProfile.textContext.slice(0, 200)}...]`
    : "[None attached]"
}`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
