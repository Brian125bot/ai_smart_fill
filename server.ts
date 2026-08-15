import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createContextStore, SyncedUserContext, ContextStore } from "./store";
import { classifyField, FieldCategory, isLongForm } from "./fieldClassifier";
import { retrieveRelevantQAs, QAEntry } from "./qaRetrieval";

dotenv.config();

// ==========================================
// CONFIGURATION CONSTANTS & SUPPORTED MODELS
// ==========================================
export const DEFAULT_GEMINI_MODEL = "gemini-3.7-flash";

export interface GeminiModelInfo {
  id: string;
  name: string;
  category: "3.7" | "3.6" | "3.5" | "3.1" | "3.0" | "custom";
  description: string;
  speed: "Ultra-Fast" | "Fast" | "Balanced";
  isDefault?: boolean;
}

export const SUPPORTED_GEMINI_MODELS: GeminiModelInfo[] = [
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    category: "3.7",
    description: "Flagship hybrid reasoning & multimodal speed. Best for all-round form filling.",
    speed: "Fast",
    isDefault: true,
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    category: "3.6",
    description: "Next-gen low latency Flash model optimized for instant response times.",
    speed: "Ultra-Fast",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    category: "3.5",
    description: "Fast multimodal model for rapid document processing and text grounding.",
    speed: "Fast",
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    category: "3.5",
    description: "Ultra-compact high-throughput model with minimum response latency.",
    speed: "Ultra-Fast",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    category: "3.1",
    description: "Super lightweight, lowest latency model for rapid-fire simple form inputs.",
    speed: "Ultra-Fast",
  },
  {
    id: "gemini-3.0-flash",
    name: "Gemini 3.0 Flash",
    category: "3.0",
    description: "Proven high-speed generation for structured form inputs.",
    speed: "Fast",
  },
];

// Lazy-loaded Gemini AI client instance
let aiClient: GoogleGenAI | null = null;
export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ Warning: GEMINI_API_KEY is not set in environment.");
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || "" });
  }
  return aiClient;
}

// Helper function to execute Gemini requests with retry and automatic fallback for 503 / 429 errors
export async function generateWithRetryAndFallback(
  ai: GoogleGenAI,
  requestedModel: string,
  contents: any,
  config: Record<string, any>,
  backoffMs?: (attempt: number) => number
): Promise<{ text: string; effectiveModel: string }> {
  // Build a model candidate chain starting with requestedModel, then fallback alternatives
  const candidateModels = [
    requestedModel,
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.0-flash",
  ].filter((val, idx, arr) => arr.indexOf(val) === idx);

  let lastError: any = null;

  for (const modelToTry of candidateModels) {
    // Retry up to 3 times per model with exponential backoff (e.g. 500ms, 1200ms)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelToTry,
          contents,
          ...(Object.keys(config).length > 0 ? { config } : {}),
        });

        const text = response.text?.trim() ?? "";
        return { text, effectiveModel: modelToTry };
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || "";
        const errStatus = err?.status || err?.code || "";
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("NOT_FOUND") ||
          errMsg.includes("404") ||
          errMsg.toLowerCase().includes("not found") ||
          errStatus === 503 ||
          errStatus === 429 ||
          errStatus === 404 ||
          errStatus === "UNAVAILABLE" ||
          errStatus === "NOT_FOUND";

        if (!isTransient) {
          // Non-transient errors (e.g. invalid arguments) should not be retried blindly
          throw err;
        }

        console.warn(
          `[Gemini] Attempt ${attempt}/3 for model ${modelToTry} hit transient error: ${errMsg}. Retrying...`
        );

        if (attempt < 3) {
          // Jittered backoff: 400ms * attempt + random jitter
          const delay = backoffMs
            ? backoffMs(attempt)
            : attempt * 400 + Math.floor(Math.random() * 200);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    console.warn(`[Gemini] Model ${modelToTry} is currently unavailable. Trying next fallback candidate...`);
  }

  throw lastError || new Error("All Gemini models are temporarily experiencing high demand. Please retry in a moment.");
}

interface AnswerQuestionRequest {
  question: string;
  context?: {
    type: "text" | "pdf";
    data: string;
    mimeType?: string;
  } | null;
  systemInstruction?: string | null;
  model?: string | null;
  userId?: string | null;
  pairingToken?: string | null;
  userProfile?: Record<string, any> | null;
}

// Helper to synthesize structured user profile into a crisp AI grounding block
export function synthesizeProfileContext(
  profile: Record<string, any> | null | undefined,
  question?: string
): string {
  if (!profile || Object.keys(profile).length === 0) return "";
  const lines: string[] = ["--- APPLICANT / USER PROFILE GROUNDING ---"];
  if (profile.fullName) lines.push(`Name: ${profile.fullName}`);
  if (profile.jobTitle) lines.push(`Title / Role: ${profile.jobTitle}`);
  if (profile.email) lines.push(`Email: ${profile.email}`);
  if (profile.phone) lines.push(`Phone: ${profile.phone}`);
  if (profile.location) lines.push(`Location: ${profile.location}`);
  if (profile.yearsOfExperience) lines.push(`Experience: ${profile.yearsOfExperience}`);
  if (profile.education) lines.push(`Education: ${profile.education}`);
  if (profile.coreSkills) lines.push(`Core Skills: ${profile.coreSkills}`);
  if (profile.portfolioUrl) lines.push(`Portfolio: ${profile.portfolioUrl}`);
  if (profile.linkedinUrl) lines.push(`LinkedIn: ${profile.linkedinUrl}`);
  if (profile.githubUrl) lines.push(`GitHub: ${profile.githubUrl}`);
  if (profile.bioSummary) lines.push(`Summary: ${profile.bioSummary}`);

  if (Array.isArray(profile.customQAs) && profile.customQAs.length > 0) {
    const relevant = question
      ? retrieveRelevantQAs(question, profile.customQAs as QAEntry[], 5)
      : profile.customQAs;

    if (relevant.length > 0) {
      lines.push("\nPreset Custom Q&A Reference:");
      relevant.forEach((qa: any, idx: number) => {
        if (qa.question && qa.answer) {
          lines.push(`Q${idx + 1}: ${qa.question}\nA: ${qa.answer}`);
        }
      });
    }
  }
  lines.push("------------------------------------------");
  return lines.join("\n");
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best = values[0];
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

// Re-export for backward compatibility
export type { SyncedUserContext } from "./store";

export interface CreateAppOptions {
  aiClient?: GoogleGenAI;
  serveStatic?: boolean;
  contextStore?: ContextStore;
}

export async function createApp(options: CreateAppOptions = {}): Promise<express.Express> {
  const app = express();
  const ai = options.aiClient || getGeminiClient();
  const store = options.contextStore || createContextStore();

  // Increase payload limit for base64 PDF uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // CORS middleware to allow the Chrome extension and local web clients to access the API.
  // Reflects the origin only when it is a local/dev or browser-extension origin, so that
  // arbitrary third-party websites cannot read responses from this local proxy.
  //
  // When EXTENSION_ID is set, only that exact chrome-extension origin is accepted. When it
  // is unset (dev convenience) any chrome-extension:// origin is allowed. The IPv6 loopback
  // (::1) is permitted for localhost-first environments. No `*` fallback is emitted.
  const chromeExtensionOrigin = process.env.EXTENSION_ID
    ? `chrome-extension://${process.env.EXTENSION_ID}`
    : null;

  app.use((req, res, next) => {
    const origin = req.headers.origin || "";
    let isAllowed = false;
    if (!origin) {
      isAllowed = true; // same-origin or non-browser clients (no CORS needed)
    } else if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) {
      isAllowed = true;
    } else if (chromeExtensionOrigin && origin === chromeExtensionOrigin) {
      isAllowed = true;
    } else if (!chromeExtensionOrigin && /^chrome-extension:\/\//.test(origin)) {
      isAllowed = true; // dev fallback: extension id not configured
    } else if (/^moz-extension:\/\//.test(origin)) {
      isAllowed = true; // Firefox extension host
    }

    if (isAllowed && origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      model: DEFAULT_GEMINI_MODEL,
      supportedModels: SUPPORTED_GEMINI_MODELS.map((m) => m.id),
      appUrl: process.env.APP_URL || null,
      apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
      timestamp: new Date().toISOString(),
    });
  });

  // Get available models list endpoint
  app.get("/api/models", (_req: Request, res: Response) => {
    res.json({
      defaultModel: DEFAULT_GEMINI_MODEL,
      models: SUPPORTED_GEMINI_MODELS,
    });
  });

  // ==========================================
  // Dashboard & Extension Sync Endpoints
  // ==========================================

  // Save/publish dashboard user context to backend sync cache
  app.post("/api/syncProfile", (req: Request, res: Response): void => {
    try {
      const body = req.body;
      const pairingToken = (body.pairingToken || body.userId || body.uid || body.email || "").trim();

      if (!pairingToken) {
        res.status(400).json({
          success: false,
          error: "Missing pairingToken or userId identifier for synchronization.",
        });
        return;
      }

      const activeProfile = Array.isArray(body.profiles) && body.activeProfileId
        ? body.profiles.find((p: any) => p.id === body.activeProfileId) || body.profiles[0]
        : null;

      const syncedContext: SyncedUserContext = {
        userId: body.userId || body.uid || pairingToken,
        pairingToken: pairingToken,
        email: body.email || "",
        displayName: body.displayName || "",
        profiles: Array.isArray(body.profiles) ? body.profiles : [],
        activeProfileId: body.activeProfileId || (activeProfile ? activeProfile.id : "profile-default"),
        systemInstruction: body.systemInstruction || activeProfile?.systemInstruction || "",
        selectedModel: body.selectedModel || activeProfile?.selectedModel || DEFAULT_GEMINI_MODEL,
        usePageContext: typeof body.usePageContext === "boolean" ? body.usePageContext : true,
        userProfile: body.profileFields || body.userProfile || activeProfile?.profileFields || {},
        pdfData: body.pdfData || activeProfile?.pdfFile?.base64 || null,
        pdfName: body.pdfName || activeProfile?.pdfFile?.name || null,
        pdfSize: body.pdfSize || activeProfile?.pdfFile?.size || null,
        pdfMimeType: body.pdfMimeType || activeProfile?.pdfFile?.mimeType || "application/pdf",
        textContext: body.textContext || activeProfile?.textContext || null,
        updatedAt: new Date().toISOString(),
      };

      // Store in memory under pairingToken and userId and email if available
      store.set(pairingToken, syncedContext);
      if (body.userId && body.userId !== pairingToken) {
        store.set(body.userId, syncedContext);
      }
      if (body.email && body.email !== pairingToken) {
        store.set(body.email.toLowerCase().trim(), syncedContext);
      }

      res.status(200).json({
        success: true,
        message: "User context successfully synced with backend cache.",
        pairingToken: pairingToken,
        profilesCount: syncedContext.profiles?.length || 1,
        activeProfileId: syncedContext.activeProfileId,
        updatedAt: syncedContext.updatedAt,
      });
    } catch (err: any) {
      console.error("Error in /api/syncProfile:", err);
      res.status(500).json({
        success: false,
        error: err?.message || "Failed to sync profile context.",
      });
    }
  });

  // Retrieve user context by pairingToken / UID / email for the Chrome Extension
  app.get("/api/userContext/:token", (req: Request, res: Response): void => {
    try {
      const token = decodeURIComponent(req.params.token || "").trim();
      if (!token) {
        res.status(400).json({ success: false, error: "Pairing token parameter is required." });
        return;
      }

      const cached = store.get(token) || store.get(token.toLowerCase());
      if (cached) {
        res.status(200).json({
          success: true,
          source: "server_cache",
          context: cached,
        });
        return;
      }

      // If not in cache, respond gracefully
      res.status(404).json({
        success: false,
        error: `No synced context found for pairing token "${token}". Make sure to click "Save & Sync Context" on the web dashboard first.`,
      });
    } catch (err: any) {
      console.error("Error in /api/userContext:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch user context." });
    }
  });

  // POST endpoint for extension sync (also accepts token in body or query)
  app.post("/api/userContext", (req: Request, res: Response): void => {
    try {
      const token = (req.body?.pairingToken || req.body?.userId || req.body?.email || req.query?.token || "").toString().trim();
      if (!token) {
        res.status(400).json({ success: false, error: "Pairing token or userId is required." });
        return;
      }

      const cached = store.get(token) || store.get(token.toLowerCase());
      if (cached) {
        res.status(200).json({
          success: true,
          source: "server_cache",
          context: cached,
        });
        return;
      }

      res.status(404).json({
        success: false,
        error: `No synced context found for token "${token}". Please save your settings in the web dashboard first.`,
      });
    } catch (err: any) {
      console.error("Error in POST /api/userContext:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch user context." });
    }
  });

  // ==========================================
  // POST /answerQuestion Endpoint
  // ==========================================
  app.post("/answerQuestion", async (req: Request, res: Response): Promise<void> => {
    try {
      // 1. Validate request payload
      const body = req.body as AnswerQuestionRequest;
      if (!body || typeof body.question !== "string" || !body.question.trim()) {
        res.status(400).json({
          error: "Bad Request: 'question' is required and must be a non-empty string.",
        });
        return;
      }

      const question = body.question.trim();
      const pairingToken = (body.pairingToken || body.userId || "").trim();
      
      let context = body.context;
      let systemInstruction = body.systemInstruction;
      let userProfile = body.userProfile;
      let requestedModel =
        body.model && typeof body.model === "string" && body.model.trim()
          ? body.model.trim()
          : null;

      // Check server sync cache if pairingToken is supplied and context/profile is not explicitly in payload
      if (pairingToken) {
        const cached = store.get(pairingToken) || store.get(pairingToken.toLowerCase());
        if (cached) {
          if (!userProfile) userProfile = cached.userProfile;
          if (!systemInstruction) systemInstruction = cached.systemInstruction;
          if (!requestedModel) requestedModel = cached.selectedModel || null;
          if (!context && cached.pdfData) {
            context = {
              type: "pdf",
              data: cached.pdfData,
              mimeType: cached.pdfMimeType || "application/pdf",
            };
          } else if (!context && cached.textContext) {
            context = {
              type: "text",
              data: cached.textContext,
            };
          }
        }
      }

      if (!requestedModel) requestedModel = DEFAULT_GEMINI_MODEL;
      const profileContextStr = synthesizeProfileContext(userProfile, question);

      // 3. Build contents based on context type and profile grounding
      let contents: any;

      if (context && context.type === "pdf" && context.data) {
        // PDF Context: Native document understanding with inlineData + profile context
        const cleanBase64 = context.data.replace(/^data:[^;]+;base64,/, "");
        const mimeType = context.mimeType || "application/pdf";

        let promptText = "";
        if (profileContextStr) {
          promptText += `${profileContextStr}\n\n`;
        }
        promptText += `Based on the provided document and applicant profile, answer the following question accurately, concisely, and directly for a form field. Do not provide meta-analysis, code diagnoses, or error analysis essays. Output only the value for the field:\n\nQuestion: ${question}`;

        contents = {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
        };
      } else {
        // Text Context or Profile Grounding or Question only
        let promptText = "";
        if (profileContextStr) {
          promptText += `${profileContextStr}\n\n`;
        }
        if (context && context.type === "text" && context.data) {
          promptText += `Context:\n${context.data}\n\n`;
        }
        promptText += `Question:\n${question}`;
        contents = promptText;
      }

      // 4. Model configuration
      const config: Record<string, any> = {};
      if (
        systemInstruction &&
        typeof systemInstruction === "string" &&
        systemInstruction.trim().length > 0
      ) {
        config.systemInstruction = systemInstruction.trim();
      }

      // 5. Generate content using requested Gemini Model with robust retries & fallback
      let { text: answer, effectiveModel } = await generateWithRetryAndFallback(
        ai,
        requestedModel,
        contents,
        config
      );

      // Clean out any technical diagnostic essays
      const lower = (answer || "").toLowerCase();
      if (
        lower.includes("failed to execute 'fetch'") ||
        lower.includes("non iso-8859-1") ||
        lower.includes("based on the error message and context") ||
        lower.includes("### the error")
      ) {
        answer = "";
      }

      res.status(200).json({
        answer,
        model: effectiveModel,
      });
    } catch (error: any) {
      console.error("Error in /answerQuestion:", error);
      const errorMessage = error?.message || "Internal server error generating answer with Gemini.";
      res.status(500).json({
        error: errorMessage,
      });
    }
  });

  // Helper: build grounding prefix shared by batch and individual prompts
  function buildGroundingPrefix(
    userProfile: Record<string, any> | null | undefined,
    question: string,
    pageContext?: any,
    context?: any,
    systemInstruction?: string
  ): { promptPrefix: string; config: Record<string, any> } {
    const profileContextStr = synthesizeProfileContext(userProfile, question);
    let promptPrefix = "";
    if (profileContextStr) promptPrefix += `${profileContextStr}\n\n`;

    if (pageContext) {
      promptPrefix += `--- ACTIVE WEBPAGE CONTEXT ---\n`;
      if (pageContext.title) promptPrefix += `Page Title: ${pageContext.title}\n`;
      if (pageContext.url) promptPrefix += `URL: ${pageContext.url}\n`;
      if (Array.isArray(pageContext.headings) && pageContext.headings.length > 0) {
        promptPrefix += `Headings: ${pageContext.headings.slice(0, 5).join(" | ")}\n`;
      }
      promptPrefix += `------------------------------\n\n`;
    }

    if (context && context.type === "text" && context.data) {
      promptPrefix += `--- GROUNDING TEXT CONTEXT ---\n${context.data}\n------------------------------\n\n`;
    }

    const config: Record<string, any> = {};
    if (systemInstruction && typeof systemInstruction === "string" && systemInstruction.trim().length > 0) {
      config.systemInstruction = systemInstruction.trim();
    }

    return { promptPrefix, config };
  }

  // Helper: generate a single long-form answer
  async function generateLongFormAnswer(
    ai: GoogleGenAI,
    model: string,
    field: any,
    category: FieldCategory,
    groundingPrefix: string,
    context: any,
    config: Record<string, any>,
    tone: string = "professional",
    lengthStrategy: string = "balanced"
  ): Promise<any> {
    const maxLen = field.maxLength && field.maxLength > 0 ? field.maxLength : 1000;
    const ratio =
      lengthStrategy === "concise" ? 0.3 : lengthStrategy === "fill_limit" ? 0.9 : 0.7;
    const targetLen = Math.floor(maxLen * ratio);

    const toneLine =
      tone === "conversational"
        ? "- Write naturally and warmly, as you would in a personal statement or cover letter."
        : tone === "formal"
        ? "- Write in a formal, polished register appropriate for an official application."
        : "- Write in first person as the applicant, specifically and professionally.";

    let promptText = groundingPrefix;
    promptText += `You are answering a job application or professional form.\n\n`;
    promptText += `Field: ${field.question}\n`;
    if (field.name) promptText += `Field name: ${field.name}\n`;
    promptText += `Character limit: ${maxLen}\n`;
    const rangeLabel =
      lengthStrategy === "concise"
        ? "about 30%"
        : lengthStrategy === "fill_limit"
        ? "close to the full"
        : "roughly 60-75%";
    promptText += `Target length: aim for approximately ${targetLen} characters (${rangeLabel} of the limit).\n\n`;
    promptText += `Instructions:\n`;
    promptText += toneLine + "\n";
    promptText += `- Use concrete examples from the provided context when available.\n`;
    promptText += `- Do NOT exceed ${maxLen} characters.\n`;
    promptText += `- Do NOT include meta-commentary, code blocks, or markdown.\n`;
    promptText += `- Output ONLY the answer text, nothing else.`;

    let contents: any;
    if (context && context.type === "pdf" && context.data) {
      const cleanBase64 = context.data.replace(/^data:[^;]+;base64,/, "");
      const mimeType = context.mimeType || "application/pdf";
      contents = {
        parts: [
          { inlineData: { mimeType, data: cleanBase64 } },
          { text: promptText },
        ],
      };
    } else {
      contents = promptText;
    }

    const { text, effectiveModel } = await generateWithRetryAndFallback(ai, model, contents, config);

    // Enforce maxLength hard cap
    let answer = (text || "").trim();
    if (answer.length > maxLen) {
      answer = answer.slice(0, maxLen);
      // Try to cut at a sentence boundary
      const lastPeriod = answer.lastIndexOf(".");
      const lastNewline = answer.lastIndexOf("\n");
      const cutPoint = Math.max(lastPeriod, lastNewline);
      if (cutPoint > maxLen * 0.5) {
        answer = answer.slice(0, cutPoint + 1);
      }
    }

    return {
      id: field.id,
      question: field.question,
      answer,
      confidence: 0.85,
      reasoning: `Long-form answer generated for ${category} field.`,
      style: "long_form",
      model: effectiveModel,
    };
  }

  // Concurrency limiter for parallel promises (resilient: per-task errors are
  // captured as { __error } rather than aborting the whole batch).
  async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let index = 0;
    async function worker() {
      while (index < tasks.length) {
        const i = index++;
        try {
          results[i] = await tasks[i]();
        } catch (err: any) {
          results[i] = { __error: err?.message || String(err) } as unknown as T;
        }
      }
    }
    const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results;
  }

  // ==========================================
  // POST /batchAnswerForm Endpoint (Item 1: Batch Form Autofilling)
  // ==========================================
  app.post("/batchAnswerForm", async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    try {
      // 1. Validate request payload
      const body = req.body;
      if (!body || !Array.isArray(body.fields) || body.fields.length === 0) {
        res.status(400).json({
          success: false,
          error: "Bad Request: 'fields' must be a non-empty array of form fields.",
        });
        return;
      }

      const fields: Array<{
        id: string;
        name?: string;
        type?: string;
        question: string;
        placeholder?: string;
        options?: string[];
        maxLength?: number;
        tagName?: string;
        rows?: number;
      }> = body.fields;

      const pairingToken = (body.pairingToken || body.userId || "").trim();
      let context = body.context;
      let systemInstruction = body.systemInstruction;
      let userProfile = body.userProfile;
      let requestedModel =
        body.model && typeof body.model === "string" && body.model.trim()
          ? body.model.trim()
          : null;

      // Check server sync cache if pairingToken is supplied and context/profile is not explicitly in payload
      let cached: any;
      if (pairingToken) {
        cached = store.get(pairingToken) || store.get(pairingToken.toLowerCase());
        if (cached) {
          if (!userProfile) userProfile = cached.userProfile;
          if (!systemInstruction) systemInstruction = cached.systemInstruction;
          if (!requestedModel) requestedModel = cached.selectedModel || null;
          if (!context && cached.pdfData) {
            context = {
              type: "pdf",
              data: cached.pdfData,
              mimeType: cached.pdfMimeType || "application/pdf",
            };
          } else if (!context && cached.textContext) {
            context = {
              type: "text",
              data: cached.textContext,
            };
          }
        }
      }

      if (!requestedModel) requestedModel = DEFAULT_GEMINI_MODEL;
      const pageContext = body.pageContext;

      // Resolve persona tone / length strategy from the active synced profile.
      let personaTone = "professional";
      let personaLengthStrategy = "balanced";
      if (cached && Array.isArray(cached.profiles) && cached.profiles.length > 0) {
        const activeProfile =
          cached.profiles.find((p: any) => p.id === cached.activeProfileId) || cached.profiles[0];
        if (activeProfile) {
          if (activeProfile.tone) personaTone = activeProfile.tone;
          if (activeProfile.lengthStrategy) personaLengthStrategy = activeProfile.lengthStrategy;
        }
      }

      // 2. Classify fields
      const classified = fields.map((f) => ({
        field: f,
        category: classifyField(f),
      }));

      const shortFields = classified.filter((c) => !isLongForm(c.category));
      const longFields = classified.filter((c) => isLongForm(c.category));

      const allAnswers: any[] = [];
      let effectiveModel = requestedModel;

      // 3. Process short fields via batch prompt (existing logic)
      if (shortFields.length > 0) {
        const joinedQuestions = shortFields.map((c) => c.field.question).join(" ");
        const profileContextStr = synthesizeProfileContext(userProfile, joinedQuestions);
        let promptText = "";
        if (profileContextStr) promptText += `${profileContextStr}\n\n`;

        if (pageContext) {
          promptText += `--- ACTIVE WEBPAGE CONTEXT ---\n`;
          if (pageContext.title) promptText += `Page Title: ${pageContext.title}\n`;
          if (pageContext.url) promptText += `URL: ${pageContext.url}\n`;
          if (Array.isArray(pageContext.headings) && pageContext.headings.length > 0) {
            promptText += `Headings: ${pageContext.headings.slice(0, 5).join(" | ")}\n`;
          }
          promptText += `------------------------------\n\n`;
        }

        if (context && context.type === "text" && context.data) {
          promptText += `--- GROUNDING TEXT CONTEXT ---\n${context.data}\n------------------------------\n\n`;
        }

        const shortFieldData = shortFields.map((c) => c.field);
        promptText += `Task: Fill out all the following web form fields accurately, professionally, and directly in first-person based on the applicant profile, attached documents, and webpage context.

Here are the target form fields to answer:
${JSON.stringify(shortFieldData, null, 2)}

Requirements:
1. Return a valid JSON array of objects with the exact schema:
[
  {
    "id": "<matching field id>",
    "question": "<field question>",
    "answer": "<concise answer for this field>",
    "confidence": 0.95,
    "reasoning": "<short note on why this answer fits>"
  }
]
2. For select dropdowns or radio choices with 'options', the 'answer' MUST match one of the available options exactly or be the best logical choice.
3. For phone numbers, emails, addresses, names, and URLs, format them cleanly according to standard conventions.
4. Keep answers crisp and appropriate for form inputs. Do not wrap answers in conversational explanations.
5. Return ONLY the valid JSON array without backticks or markdown fences.`;

        let contents: any;
        if (context && context.type === "pdf" && context.data) {
          const cleanBase64 = context.data.replace(/^data:[^;]+;base64,/, "");
          const mimeType = context.mimeType || "application/pdf";
          contents = {
            parts: [
              { inlineData: { mimeType, data: cleanBase64 } },
              { text: promptText },
            ],
          };
        } else {
          contents = promptText;
        }

        const batchConfig: Record<string, any> = {
          responseMimeType: "application/json",
        };
        if (systemInstruction && typeof systemInstruction === "string" && systemInstruction.trim().length > 0) {
          batchConfig.systemInstruction = systemInstruction.trim();
        }

        const { text: rawOutput, effectiveModel: batchModel } = await generateWithRetryAndFallback(
          ai, requestedModel, contents, batchConfig
        );
        effectiveModel = batchModel;

        let parsedAnswers: any[] = [];
        try {
          const cleaned = rawOutput
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
          parsedAnswers = JSON.parse(cleaned);
          if (!Array.isArray(parsedAnswers) && typeof parsedAnswers === "object" && Array.isArray((parsedAnswers as any).answers)) {
            parsedAnswers = (parsedAnswers as any).answers;
          }

          // Valid JSON but neither an array nor { answers: [...] } is an unexpected
          // shape — surface it as an error rather than silently returning 0 answers.
          if (!Array.isArray(parsedAnswers)) {
            throw new Error(
              "Gemini returned unparseable structured output: " + (rawOutput || "").slice(0, 200)
            );
          }

          if (Array.isArray(parsedAnswers)) {
            parsedAnswers = parsedAnswers.map((ans) => {
              const val = typeof ans?.answer === "string" ? ans.answer : "";
              const lower = val.toLowerCase();
              if (
                lower.includes("failed to execute 'fetch'") ||
                lower.includes("non iso-8859-1") ||
                lower.includes("based on the error message and context") ||
                lower.includes("### the error")
              ) {
                return { ...ans, answer: "" };
              }
              return { ...ans, style: "short" };
            });
          }
        } catch (jsonErr) {
          console.warn("JSON parse error in /batchAnswerForm (short fields):", jsonErr);
          throw new Error(
            "Gemini returned unparseable structured output: " + (rawOutput || "").slice(0, 200)
          );
        }

        allAnswers.push(...parsedAnswers);
      }

      // 4. Process long-form fields via dedicated parallel calls (resilient + per-field scoring)
      if (longFields.length > 0) {
        const longTasks = longFields.map((c) => {
          const { promptPrefix, config: longConfig } = buildGroundingPrefix(
            userProfile, c.field.question, pageContext, context, systemInstruction
          );
          return () =>
            generateLongFormAnswer(
              ai,
              requestedModel,
              c.field,
              c.category,
              promptPrefix,
              context,
              longConfig,
              personaTone,
              personaLengthStrategy
            );
        });

        const longResults = await runWithConcurrency(longTasks, 3);
        longFields.forEach((c, i) => {
          const r = longResults[i] as any;
          if (r && r.__error) {
            allAnswers.push({
              id: c.field.id,
              question: c.field.question,
              answer: "",
              confidence: 0,
              reasoning: "Generation failed for this field.",
              style: "long_form",
              error: r.__error,
            });
          } else {
            allAnswers.push(r);
          }
        });
      }

      // 5. Sort answers back into original field order
      const fieldOrder = new Map(fields.map((f, i) => [f.id, i]));
      allAnswers.sort((a, b) => (fieldOrder.get(a.id) ?? 999) - (fieldOrder.get(b.id) ?? 999));

      const successful = allAnswers.filter((a) => !a.error);
      const timeMs = Date.now() - startTime;

      // Derive the model actually used when only long-form fields ran.
      if (shortFields.length === 0 && longFields.length > 0 && successful.length > 0) {
        const used = successful.map((a) => a?.model).filter(Boolean);
        if (used.length) effectiveModel = mostCommon(used);
      }

      if (allAnswers.length > 0 && successful.length === 0) {
        res.status(500).json({
          success: false,
          answers: allAnswers,
          error: "All fields failed to generate answers.",
        });
        return;
      }

      res.status(200).json({
        success: successful.length === allAnswers.length,
        answers: allAnswers,
        modelUsed: effectiveModel,
        timeMs,
      });
    } catch (error: any) {
      console.error("Error in /batchAnswerForm:", error);
      const errorMessage = error?.message || "Internal server error in batch form autofill.";
      res.status(500).json({
        success: false,
        answers: [],
        error: errorMessage,
      });
    }
  });

  // ==========================================
  // POST /api/rememberAnswer - Save accepted Q&A to persona bank
  // ==========================================
  app.post("/api/rememberAnswer", (req: Request, res: Response): void => {
    try {
      const { pairingToken, question, answer, profileId } = req.body;
      const token = (pairingToken || "").trim();

      if (!token) {
        res.status(400).json({ success: false, error: "pairingToken is required." });
        return;
      }
      const questionText = typeof question === "string" ? question.trim() : "";
      const answerText = typeof answer === "string" ? answer.trim() : "";
      if (!questionText || !answerText) {
        res.status(400).json({ success: false, error: "question and answer are required." });
        return;
      }

      const cached = store.get(token) || store.get(token.toLowerCase());
      if (!cached) {
        res.status(404).json({ success: false, error: `No context found for token "${token}".` });
        return;
      }

      // Find active profile and add Q&A
      const profiles = Array.isArray(cached.profiles) ? cached.profiles : [];
      let profile: any;
      if (profileId) {
        profile = profiles.find((p: any) => p.id === profileId) || null;
      } else {
        profile =
          profiles.find((p: any) => p.id === cached.activeProfileId) || profiles[0] || null;
      }

      if (!profile) {
        res.status(404).json({
          success: false,
          error: profileId
            ? "No persona profile matches the provided profileId."
            : "No active persona profile found.",
        });
        return;
      }

      if (!profile.profileFields || typeof profile.profileFields !== "object") {
        profile.profileFields = { customQAs: [] };
      }
      if (!Array.isArray(profile.profileFields.customQAs)) {
        profile.profileFields.customQAs = [];
      }

      // Dedupe by normalized question; update the existing entry if present.
      const normalized = questionText.toLowerCase();
      const existing = profile.profileFields.customQAs.find(
        (qa: any) => qa && qa.question && qa.question.trim().toLowerCase() === normalized
      );

      let savedQAId: string;
      if (existing) {
        existing.answer = answerText;
        savedQAId = existing.id;
      } else {
        savedQAId = `qa-remembered-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        profile.profileFields.customQAs.push({
          id: savedQAId,
          question: questionText,
          answer: answerText,
        });
      }

      profile.updatedAt = new Date().toISOString();
      cached.updatedAt = new Date().toISOString();

      store.set(token, cached);

      res.status(200).json({
        success: true,
        message: "Answer saved to Q&A bank.",
        qaId: savedQAId,
        totalQAs: profile.profileFields.customQAs.length,
      });
    } catch (err: any) {
      console.error("Error in /api/rememberAnswer:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to save answer." });
    }
  });

  // Vite middleware / static file serving (skipped when serveStatic is false, e.g. in tests)
  if (options.serveStatic !== false) {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  return app;
}

async function startServer() {
  const app = await createApp({ serveStatic: true });
  const PORT = 3000;
  const HOST = process.env.HOST || "127.0.0.1";
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

// Start the server only when this module is run directly (not when imported by tests).
const isMainModule =
  !!process.argv[1] &&
  ["server.ts", "server.js", "server.cjs"].some((suffix) => process.argv[1].endsWith(suffix));

if (isMainModule) {
  startServer();
}
