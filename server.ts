import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Content, GenerateContentConfig } from "@google/genai";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createContextStore, SyncedUserContext, ContextStore } from "./store";
import { classifyField, FieldCategory, isLongForm } from "./fieldClassifier";
import { retrieveRelevantQAs, QAEntry } from "./qaRetrieval";
import { getContextType, looksLikeErrorLeak, logLeak } from "./errorLeak";
import { FALLBACK_MODEL_CHAIN } from "./src/types";
import {
  AnswerQuestionSchema,
  BatchAnswerFormSchema,
  SyncProfileSchema,
  RememberAnswerSchema,
  formatZodErrors,
  AnswerQuestionInput,
  BatchAnswerFormInput,
  SyncProfileInput,
  RememberAnswerInput,
  UserProfileFields,
  PersonaProfile,
  GeminiContext,
  BatchFormField,
} from "./src/validation";

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

type GenerationResult = { text: string; effectiveModel: string };

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message: unknown }).message;
    if (typeof msg === "string") return msg;
    return String(msg);
  }
  return String(err);
}

function isTransientError(err: unknown): boolean {
  const errMsg = errorMessage(err);
  const status = (err as { status?: number | string }).status;
  const code = (err as { code?: number | string }).code;
  const errStatus = status ?? code ?? "";
  return (
    errMsg.includes("503") ||
    errMsg.includes("high demand") ||
    errMsg.includes("UNAVAILABLE") ||
    errMsg.includes("429") ||
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errStatus === 503 ||
    errStatus === 429 ||
    errStatus === "UNAVAILABLE"
  );
}

export async function generateWithRetryAndFallback(
  ai: GoogleGenAI,
  requestedModel: string,
  contents: string | Content | Content[],
  config: GenerateContentConfig,
  backoffMs?: (attempt: number) => number
): Promise<GenerationResult> {
  const candidateModels = [
    requestedModel,
    ...FALLBACK_MODEL_CHAIN,
  ].filter((val, idx, arr) => arr.indexOf(val) === idx);

  let lastError: unknown = null;

  for (const modelToTry of candidateModels) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelToTry,
          contents,
          ...(Object.keys(config).length > 0 ? { config } : {}),
        });

        const text = response.text?.trim() ?? "";
        return { text, effectiveModel: modelToTry };
      } catch (err) {
        lastError = err;
        const errMsg = errorMessage(err);

        if (!isTransientError(err)) {
          console.warn(
            `[Gemini] Model ${modelToTry} encountered non-transient error: ${errMsg}. Trying next fallback candidate...`
          );
          break;
        }

        console.warn(
          `[Gemini] Attempt ${attempt}/3 for model ${modelToTry} hit transient error: ${errMsg}. Retrying...`
        );

        if (attempt < 3) {
          const delay = backoffMs
            ? backoffMs(attempt)
            : attempt * 400 + Math.floor(Math.random() * 200);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    console.warn(
      `[Gemini] Model ${modelToTry} is currently unavailable. Trying next fallback candidate...`
    );
  }

  throw (
    lastError ||
    new Error(
      "All Gemini models are temporarily experiencing high demand. Please retry in a moment."
    )
  );
}

export function synthesizeProfileContext(
  profile: UserProfileFields | null | undefined,
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
      ? retrieveRelevantQAs(question, profile.customQAs, 5)
      : profile.customQAs;

    if (relevant.length > 0) {
      lines.push("\nPreset Custom Q&A Reference:");
      relevant.forEach((qa: QAEntry, idx: number) => {
        if (qa.question && qa.answer) {
          lines.push(`Q${idx + 1}: ${qa.question}\nA: ${qa.answer}`);
        }
      });
    }
  }
  lines.push("------------------------------------------");
  return lines.join("\n");
}

export interface ResolvedGenerationContext {
  context: GeminiContext | null;
  systemInstruction: string;
  userProfile: UserProfileFields | null;
  requestedModel: string;
  cached?: SyncedUserContext;
}

export interface ResolveGenerationContextOptions {
  store: ContextStore;
  pairingToken?: string | null;
  userId?: string | null;
  context?: GeminiContext | null;
  systemInstruction?: string | null;
  userProfile?: UserProfileFields | null;
  model?: string | null;
}

export async function resolveGenerationContext(
  options: ResolveGenerationContextOptions
): Promise<ResolvedGenerationContext> {
  const token = (options.pairingToken || options.userId || "").trim();
  let context: GeminiContext | null = options.context || null;
  let systemInstruction: string = options.systemInstruction || "";
  let userProfile: UserProfileFields | null = options.userProfile || null;
  let requestedModel: string =
    options.model && options.model.trim() ? options.model.trim() : "";

  let cached: SyncedUserContext | undefined;
  if (token) {
    cached = options.store.get(token) || options.store.get(token.toLowerCase());
    if (cached) {
      if (!userProfile) userProfile = cached.userProfile || null;
      if (!systemInstruction) systemInstruction = cached.systemInstruction || "";
      if (!requestedModel) requestedModel = cached.selectedModel || "";

      if (!context) {
        if (cached.pdfFilePath || cached.pdfData) {
          const pdfBuf = await options.store.readPdf(token);
          if (pdfBuf) {
            context = {
              type: "pdf",
              data: pdfBuf.toString("base64"),
              mimeType: cached.pdfMimeType || "application/pdf",
            };
          } else if (cached.pdfData) {
            context = {
              type: "pdf",
              data: cached.pdfData,
              mimeType: cached.pdfMimeType || "application/pdf",
            };
          } else {
            console.warn(
              `[server] Referenced PDF file "${cached.pdfFilePath}" for token "${token}" not found on disk. Gracefully degrading.`
            );
          }
        } else if (cached.textContext) {
          context = {
            type: "text",
            data: cached.textContext,
          };
        }
      }
    }
  }

  if (!requestedModel) {
    requestedModel = DEFAULT_GEMINI_MODEL;
  }

  return {
    context,
    systemInstruction,
    userProfile,
    requestedModel,
    cached,
  };
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

export type { SyncedUserContext } from "./store";

export interface CreateAppOptions {
  aiClient?: GoogleGenAI;
  serveStatic?: boolean;
  contextStore?: ContextStore;
}

interface LongFormResult {
  id: string;
  question: string;
  answer: string;
  confidence: number;
  reasoning: string;
  style: string;
  model: string;
  error?: string;
}

interface GroundingResult {
  promptPrefix: string;
  config: GenerateContentConfig;
}

export async function createApp(options: CreateAppOptions = {}): Promise<express.Express> {
  const app = express();
  const ai = options.aiClient || getGeminiClient();
  const store = options.contextStore || createContextStore();

  app.use(express.json({ limit: "50mb" }));

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please slow down." },
  });
  app.use("/api", apiLimiter);

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many AI generation requests. Please slow down." },
  });
  app.use("/answerQuestion", aiLimiter);
  app.use("/batchAnswerForm", aiLimiter);

  const chromeExtensionOrigin = process.env.EXTENSION_ID
    ? `chrome-extension://${process.env.EXTENSION_ID}`
    : null;

  app.use((req, res, next) => {
    const origin = req.headers.origin || "";
    let isAllowed = false;
    if (!origin) {
      isAllowed = true;
    } else if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) {
      isAllowed = true;
    } else if (chromeExtensionOrigin && origin === chromeExtensionOrigin) {
      isAllowed = true;
    } else if (!chromeExtensionOrigin && /^chrome-extension:\/\//.test(origin)) {
      isAllowed = true;
    } else if (/^moz-extension:\/\//.test(origin)) {
      isAllowed = true;
    }

    if (isAllowed && origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

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

  app.get("/api/models", (_req: Request, res: Response) => {
    res.json({
      defaultModel: DEFAULT_GEMINI_MODEL,
      models: SUPPORTED_GEMINI_MODELS,
    });
  });

  // ==========================================
  // Dashboard & Extension Sync Endpoints
  // ==========================================

  app.post("/api/syncProfile", async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = SyncProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "Invalid sync profile payload.",
          details: formatZodErrors(parsed.error),
        });
        return;
      }
      const body: SyncProfileInput = parsed.data;

      const pairingToken = (
        body.pairingToken ||
        body.userId ||
        body.uid ||
        body.email ||
        ""
      ).trim();

      if (!pairingToken) {
        res.status(400).json({
          success: false,
          error: "Missing pairingToken or userId identifier for synchronization.",
        });
        return;
      }

      const activeProfile =
        Array.isArray(body.profiles) && body.activeProfileId
          ? body.profiles.find((p) => p.id === body.activeProfileId) || body.profiles[0]
          : null;

      let pdfFilePath: string | null = body.pdfFilePath || null;
      const pdfBase64 = body.pdfData || activeProfile?.pdfFile?.base64;
      if (pdfBase64) {
        const savedPath = await store.savePdf(pairingToken, pdfBase64);
        if (savedPath) {
          pdfFilePath = savedPath;
        } else {
          res.status(500).json({
            success: false,
            error: "Failed to save PDF attachment.",
          });
          return;
        }
      }

      const syncedContext: SyncedUserContext = {
        userId: body.userId || body.uid || pairingToken,
        pairingToken,
        email: body.email || "",
        displayName: body.displayName || "",
        profiles: Array.isArray(body.profiles) ? body.profiles : [],
        activeProfileId:
          body.activeProfileId || (activeProfile ? activeProfile.id : "profile-default"),
        systemInstruction: body.systemInstruction || activeProfile?.systemInstruction || "",
        selectedModel: body.selectedModel || activeProfile?.selectedModel || DEFAULT_GEMINI_MODEL,
        usePageContext: typeof body.usePageContext === "boolean" ? body.usePageContext : true,
        userProfile: body.profileFields || body.userProfile || activeProfile?.profileFields || {},
        pdfFilePath,
        pdfName: body.pdfName || activeProfile?.pdfFile?.name || null,
        pdfSize: body.pdfSize || activeProfile?.pdfFile?.size || null,
        pdfMimeType: body.pdfMimeType || activeProfile?.pdfFile?.mimeType || "application/pdf",
        textContext: body.textContext || activeProfile?.textContext || null,
        updatedAt: new Date().toISOString(),
      };

      if (!store.set(pairingToken, syncedContext)) {
        res.status(500).json({
          success: false,
          error: "Failed to persist synced context to disk.",
        });
        return;
      }
      if (body.userId && body.userId !== pairingToken) {
        store.set(body.userId, syncedContext);
      }
      if (body.email && body.email !== pairingToken) {
        store.set(body.email.toLowerCase().trim(), syncedContext);
      }

      res.status(200).json({
        success: true,
        message: "User context successfully synced with backend cache.",
        pairingToken,
        profilesCount: syncedContext.profiles?.length || 1,
        activeProfileId: syncedContext.activeProfileId,
        updatedAt: syncedContext.updatedAt,
      });
    } catch (err) {
      console.error("Error in /api/syncProfile:", err);
      res.status(500).json({
        success: false,
        error: errorMessage(err) || "Failed to sync profile context.",
      });
    }
  });

  app.get("/api/userContext/:token", (req: Request, res: Response): void => {
    try {
      let token: string;
      try {
        token = decodeURIComponent(req.params.token || "").trim();
      } catch {
        res.status(400).json({ success: false, error: "Invalid pairing token encoding." });
        return;
      }
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

      res.status(404).json({
        success: false,
        error: `No synced context found for pairing token "${token}". Make sure to click "Save & Sync Context" on the web dashboard first.`,
      });
    } catch (err) {
      console.error("Error in /api/userContext:", err);
      res
        .status(500)
        .json({ success: false, error: errorMessage(err) || "Failed to fetch user context." });
    }
  });

  app.post("/api/userContext", (req: Request, res: Response): void => {
    try {
      const token = (
        req.body?.pairingToken ||
        req.body?.userId ||
        req.body?.email ||
        req.query?.token ||
        ""
      )
        .toString()
        .trim();
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
    } catch (err) {
      console.error("Error in POST /api/userContext:", err);
      res
        .status(500)
        .json({ success: false, error: errorMessage(err) || "Failed to fetch user context." });
    }
  });

  app.post("/api/purgeContext", async (req: Request, res: Response): Promise<void> => {
    try {
      const token = (
        req.body?.pairingToken ||
        req.body?.userId ||
        req.body?.email ||
        req.query?.token ||
        ""
      )
        .toString()
        .trim();

      if (!token) {
        res
          .status(400)
          .json({ success: false, error: "Pairing token, userId, or email is required." });
        return;
      }

      if (!store.has(token)) {
        res
          .status(404)
          .json({ success: false, error: `No synced context found for token "${token}".` });
        return;
      }

      const deleted = await store.delete(token);
      if (!deleted) {
        res.status(500).json({
          success: false,
          error: "Failed to delete persisted context from disk.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "User context purged successfully.",
      });
    } catch (err) {
      console.error("Error in POST /api/purgeContext:", err);
      res
        .status(500)
        .json({ success: false, error: errorMessage(err) || "Failed to purge user context." });
    }
  });

  // ==========================================
  // POST /answerQuestion Endpoint
  // ==========================================
  app.post("/answerQuestion", async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = AnswerQuestionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Bad Request: invalid payload.",
          details: formatZodErrors(parsed.error),
        });
        return;
      }
      const body: AnswerQuestionInput = parsed.data;

      const question = body.question.trim();

      const {
        context,
        systemInstruction,
        userProfile,
        requestedModel,
      } = await resolveGenerationContext({
        store,
        pairingToken: body.pairingToken,
        userId: body.userId,
        context: body.context,
        systemInstruction: body.systemInstruction,
        userProfile: body.userProfile,
        model: body.model,
      });

      const profileContextStr = synthesizeProfileContext(userProfile, question);

      let contents: string | Content;

      if (context && context.type === "pdf" && context.data) {
        const cleanBase64 = context.data.replace(/^data:[^;]+;base64,/, "");
        const mimeType = context.mimeType || "application/pdf";

        let promptText = "";
        if (profileContextStr) {
          promptText += `${profileContextStr}\n\n`;
        }
        promptText += `Based on the provided document and applicant profile, answer the following question accurately, concisely, and directly for a form field. Do not provide meta-analysis, code diagnoses, or error analysis essays. Output only the value for the field:\n\nQuestion: ${question}`;

        contents = {
          parts: [{ inlineData: { mimeType, data: cleanBase64 } }, { text: promptText }],
        };
      } else {
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

      const config: GenerateContentConfig = {};
      if (systemInstruction && systemInstruction.trim().length > 0) {
        config.systemInstruction = systemInstruction.trim();
      }

      let { text: answer, effectiveModel } = await generateWithRetryAndFallback(
        ai,
        requestedModel,
        contents,
        config
      );

      const leak = looksLikeErrorLeak(answer || "");
      let withheld = false;
      if (leak.leaked) {
        logLeak({
          endpoint: "/answerQuestion",
          question,
          contextType: getContextType(context),
          model: effectiveModel,
          reason: leak.reason,
          raw: answer || "",
        });
        answer = "";
        withheld = true;
      }

      const payload: { answer: string; model: string; withheld?: boolean } = {
        answer,
        model: effectiveModel,
      };
      if (withheld) payload.withheld = true;
      res.status(200).json(payload);
    } catch (error) {
      console.error("Error in /answerQuestion:", error);
      res.status(500).json({
        error: errorMessage(error) || "Internal server error generating answer with Gemini.",
      });
    }
  });

  function buildGroundingPrefix(
    userProfile: UserProfileFields | null | undefined,
    question: string,
    pageContext: { url?: string; title?: string; headings?: string[] } | null | undefined,
    context: GeminiContext | null | undefined,
    systemInstruction?: string | null
  ): GroundingResult {
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

    const config: GenerateContentConfig = {};
    if (systemInstruction && systemInstruction.trim().length > 0) {
      config.systemInstruction = systemInstruction.trim();
    }

    return { promptPrefix, config };
  }

  async function generateLongFormAnswer(
    ai: GoogleGenAI,
    model: string,
    field: BatchFormField,
    category: FieldCategory,
    groundingPrefix: string,
    context: GeminiContext | null | undefined,
    config: GenerateContentConfig,
    tone: string = "professional",
    lengthStrategy: string = "balanced"
  ): Promise<LongFormResult> {
    const maxLen = field.maxLength && field.maxLength > 0 ? field.maxLength : 1000;
    const ratio = lengthStrategy === "concise" ? 0.3 : lengthStrategy === "fill_limit" ? 0.9 : 0.7;
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

    let contents: string | Content;
    if (context && context.type === "pdf" && context.data) {
      const cleanBase64 = context.data.replace(/^data:[^;]+;base64,/, "");
      const mimeType = context.mimeType || "application/pdf";
      contents = {
        parts: [{ inlineData: { mimeType, data: cleanBase64 } }, { text: promptText }],
      };
    } else {
      contents = promptText;
    }

    const { text, effectiveModel } = await generateWithRetryAndFallback(
      ai,
      model,
      contents,
      config
    );

    let answer = (text || "").trim();
    if (answer.length > maxLen) {
      answer = answer.slice(0, maxLen);
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

  async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let index = 0;
    async function worker() {
      while (index < tasks.length) {
        const i = index++;
        try {
          results[i] = await tasks[i]();
        } catch (err) {
          results[i] = { __error: errorMessage(err) } as unknown as T;
        }
      }
    }
    const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results;
  }

  // ==========================================
  // POST /batchAnswerForm Endpoint
  // ==========================================
  app.post("/batchAnswerForm", async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    try {
      const parsed = BatchAnswerFormSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "Bad Request: invalid payload.",
          details: formatZodErrors(parsed.error),
        });
        return;
      }
      const body: BatchAnswerFormInput = parsed.data;
      const fields: BatchFormField[] = body.fields;

      const {
        context,
        systemInstruction,
        userProfile,
        requestedModel: initialRequestedModel,
        cached,
      } = await resolveGenerationContext({
        store,
        pairingToken: body.pairingToken,
        userId: body.userId,
        context: body.context,
        systemInstruction: body.systemInstruction,
        userProfile: body.userProfile,
        model: body.model,
      });

      let requestedModel = initialRequestedModel;
      const pageContext = body.pageContext;

      let personaTone = "professional";
      let personaLengthStrategy = "balanced";
      if (cached && Array.isArray(cached.profiles) && cached.profiles.length > 0) {
        const activeProfile =
          cached.profiles.find((p) => p.id === cached.activeProfileId) || cached.profiles[0];
        if (activeProfile) {
          if (activeProfile.tone) personaTone = activeProfile.tone;
          if (activeProfile.lengthStrategy) personaLengthStrategy = activeProfile.lengthStrategy;
        }
      }

      const classified = fields.map((f) => ({
        field: f,
        category: classifyField(f),
      }));

      const shortFields = classified.filter((c) => !isLongForm(c.category));
      const longFields = classified.filter((c) => isLongForm(c.category));

      interface BatchAnswer {
        id?: string;
        question?: string;
        answer: string;
        confidence?: number;
        reasoning?: string;
        style?: string;
        model?: string;
        error?: string;
        withheld?: boolean;
        __error?: string;
      }
      const allAnswers: BatchAnswer[] = [];
      let effectiveModel = requestedModel;

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

        let contents: string | Content;
        if (context && context.type === "pdf" && context.data) {
          const cleanBase64 = context.data.replace(/^data:[^;]+;base64,/, "");
          const mimeType = context.mimeType || "application/pdf";
          contents = {
            parts: [{ inlineData: { mimeType, data: cleanBase64 } }, { text: promptText }],
          };
        } else {
          contents = promptText;
        }

        const batchConfig: GenerateContentConfig = {
          responseMimeType: "application/json",
        };
        if (systemInstruction && systemInstruction.trim().length > 0) {
          batchConfig.systemInstruction = systemInstruction.trim();
        }

        const { text: rawOutput, effectiveModel: batchModel } = await generateWithRetryAndFallback(
          ai,
          requestedModel,
          contents,
          batchConfig
        );
        effectiveModel = batchModel;

        let parsedAnswers: BatchAnswer[] = [];
        try {
          const cleaned = rawOutput
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
          const parsed: unknown = JSON.parse(cleaned);
          if (
            !Array.isArray(parsed) &&
            typeof parsed === "object" &&
            parsed !== null &&
            Array.isArray((parsed as { answers?: unknown[] }).answers)
          ) {
            parsedAnswers = (parsed as { answers: BatchAnswer[] }).answers;
          } else if (Array.isArray(parsed)) {
            parsedAnswers = parsed as BatchAnswer[];
          } else {
            throw new Error(
              "Gemini returned unparseable structured output: " + (rawOutput || "").slice(0, 200)
            );
          }

          parsedAnswers = parsedAnswers.map((ans) => {
            const val = typeof ans?.answer === "string" ? ans.answer : "";
            const leak = looksLikeErrorLeak(val);
            if (leak.leaked) {
              logLeak({
                endpoint: "/batchAnswerForm",
                fieldId: ans?.id,
                question: ans?.question || "",
                contextType: getContextType(context),
                model: effectiveModel,
                reason: leak.reason,
                raw: val,
              });
              return { ...ans, answer: "", withheld: true };
            }
            return { ...ans, style: "short" };
          });
        } catch (jsonErr) {
          console.warn("JSON parse error in /batchAnswerForm (short fields):", jsonErr);
          throw new Error(
            "Gemini returned unparseable structured output: " + (rawOutput || "").slice(0, 200)
          );
        }

        allAnswers.push(...parsedAnswers);
      }

      if (longFields.length > 0) {
        const longTasks = longFields.map((c) => {
          const { promptPrefix, config: longConfig } = buildGroundingPrefix(
            userProfile,
            c.field.question,
            pageContext,
            context,
            systemInstruction
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
          const r = longResults[i] as LongFormResult & { __error?: string };
          if (r && r.__error) {
            allAnswers.push({
              id: c.field.id,
              question: c.field.question,
              answer: "",
              confidence: 0,
              reasoning: "Generation failed for this field.",
              style: "long_form",
              error: r.__error,
            } as LongFormResult & { __error?: string });
          } else {
            const leak = looksLikeErrorLeak(typeof r?.answer === "string" ? r.answer : "");
            if (leak.leaked) {
              logLeak({
                endpoint: "/batchAnswerForm#longForm",
                fieldId: c.field.id,
                question: c.field.question,
                contextType: getContextType(context),
                model: r?.model || effectiveModel,
                reason: leak.reason,
                raw: r.answer || "",
              });
              allAnswers.push({ ...r, answer: "", withheld: true } as LongFormResult & {
                __error?: string;
              });
            } else {
              allAnswers.push(r);
            }
          }
        });
      }

      const fieldOrder = new Map(fields.map((f, i) => [f.id, i]));
      allAnswers.sort((a, b) => (fieldOrder.get(a.id) ?? 999) - (fieldOrder.get(b.id) ?? 999));

      const successful = allAnswers.filter((a) => !a.error);
      const timeMs = Date.now() - startTime;

      if (shortFields.length === 0 && longFields.length > 0 && successful.length > 0) {
        const used = successful.map((a) => a?.model).filter((m): m is string => Boolean(m));
        if (used.length) effectiveModel = mostCommon(used);
      }

      if (allAnswers.length > 0 && successful.length === 0) {
        res.status(200).json({
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
    } catch (error) {
      console.error("Error in /batchAnswerForm:", error);
      res.status(500).json({
        success: false,
        answers: [],
        error: errorMessage(error) || "Internal server error in batch form autofill.",
      });
    }
  });

  // ==========================================
  // POST /api/rememberAnswer - Save accepted Q&A to persona bank
  // ==========================================
  app.post("/api/rememberAnswer", (req: Request, res: Response): void => {
    try {
      const parsed = RememberAnswerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "Invalid remember-answer payload.",
          details: formatZodErrors(parsed.error),
        });
        return;
      }
      const body: RememberAnswerInput = parsed.data;
      const token = body.pairingToken.trim();
      const questionText = body.question.trim();
      const answerText = body.answer.trim();

      const cached = store.get(token) || store.get(token.toLowerCase());
      if (!cached) {
        res.status(404).json({ success: false, error: `No context found for token "${token}".` });
        return;
      }

      const profiles = Array.isArray(cached.profiles) ? cached.profiles : [];
      let profile: PersonaProfile | undefined;
      if (body.profileId) {
        profile = profiles.find((p) => p.id === body.profileId);
      } else {
        profile = profiles.find((p) => p.id === cached.activeProfileId) || profiles[0];
      }

      if (!profile) {
        res.status(404).json({
          success: false,
          error: body.profileId
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

      const normalized = questionText.toLowerCase();
      const existing = profile.profileFields.customQAs.find(
        (qa) => qa && qa.question && qa.question.trim().toLowerCase() === normalized
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

      if (!store.set(token, cached)) {
        res.status(500).json({
          success: false,
          error: "Failed to persist answer to disk.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Answer saved to Q&A bank.",
        qaId: savedQAId,
        totalQAs: profile.profileFields.customQAs.length,
      });
    } catch (err) {
      console.error("Error in /api/rememberAnswer:", err);
      res
        .status(500)
        .json({ success: false, error: errorMessage(err) || "Failed to save answer." });
    }
  });

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

const isMainModule =
  !!process.argv[1] &&
  ["server.ts", "server.js", "server.cjs"].some((suffix) => process.argv[1].endsWith(suffix));

if (isMainModule) {
  startServer();
}
