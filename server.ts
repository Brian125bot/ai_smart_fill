import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

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
async function generateWithRetryAndFallback(
  ai: GoogleGenAI,
  requestedModel: string,
  contents: any,
  config: Record<string, any>
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
          errStatus === 503 ||
          errStatus === 429 ||
          errStatus === "UNAVAILABLE";

        if (!isTransient) {
          // Non-transient errors (e.g. invalid arguments) should not be retried blindly
          throw err;
        }

        console.warn(
          `[Gemini] Attempt ${attempt}/3 for model ${modelToTry} hit transient error: ${errMsg}. Retrying...`
        );

        if (attempt < 3) {
          // Jittered backoff: 400ms * attempt + random jitter
          const delay = attempt * 400 + Math.floor(Math.random() * 200);
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
function synthesizeProfileContext(profile: Record<string, any> | null | undefined): string {
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
    lines.push("\nPreset Custom Q&A Reference:");
    profile.customQAs.forEach((qa: any, idx: number) => {
      if (qa.question && qa.answer) {
        lines.push(`Q${idx + 1}: ${qa.question}\nA: ${qa.answer}`);
      }
    });
  }
  lines.push("------------------------------------------");
  return lines.join("\n");
}

const CONTEXT_GUARD_INSTRUCTION = [
  "Only use facts explicitly present in the applicant profile or configured dashboard context.",
  "The active webpage title, URL, headings, and field labels are routing metadata only, never applicant facts.",
  "Do not guess, invent, or copy unrelated webpage or document text.",
  "When the configured context does not support an answer, return an empty answer.",
].join(" ");

// In-memory cache for fast extension synchronization and context pairing
interface SyncedUserContext {
  userId?: string;
  pairingToken: string;
  email?: string;
  displayName?: string;
  profiles?: any[];
  activeProfileId?: string;
  systemInstruction?: string;
  selectedModel?: string;
  usePageContext?: boolean;
  userProfile?: Record<string, any>;
  pdfData?: string | null;
  pdfName?: string | null;
  pdfSize?: number | null;
  pdfMimeType?: string | null;
  textContext?: string | null;
  updatedAt: string;
}

const userContextStore = new Map<string, SyncedUserContext>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 PDF uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // CORS middleware to allow Chrome extension and web clients to access the API
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
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
      authRequired: Boolean(process.env.AUTH_BEARER_TOKEN),
      appUrl: process.env.APP_URL || null,
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
      userContextStore.set(pairingToken, syncedContext);
      if (body.userId && body.userId !== pairingToken) {
        userContextStore.set(body.userId, syncedContext);
      }
      if (body.email && body.email !== pairingToken) {
        userContextStore.set(body.email.toLowerCase().trim(), syncedContext);
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

      const cached = userContextStore.get(token) || userContextStore.get(token.toLowerCase());
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

      const cached = userContextStore.get(token) || userContextStore.get(token.toLowerCase());
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
      // 1. Bearer Token Authentication check
      const expectedToken = process.env.AUTH_BEARER_TOKEN?.trim();
      if (expectedToken) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          res.status(401).json({
            error: "Unauthorized: Missing or invalid Authorization Bearer header.",
          });
          return;
        }
        const token = authHeader.substring(7).trim();
        if (token !== expectedToken) {
          res.status(401).json({
            error: "Unauthorized: Invalid Bearer token.",
          });
          return;
        }
      }

      // 2. Validate request payload
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
        const cached = userContextStore.get(pairingToken) || userContextStore.get(pairingToken.toLowerCase());
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
      const profileContextStr = synthesizeProfileContext(userProfile);

      const ai = getGeminiClient();

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
        promptText += `Use only the provided applicant profile and document as authoritative sources for the answer. Match the question to the relevant information in those sources; do not copy unrelated document text, and do not infer or invent facts. If the sources do not contain a supported answer, return an empty string. Answer concisely and directly for this form field. Do not provide meta-analysis, code diagnoses, or error analysis essays. Output only the value for the field:\n\nQuestion: ${question}`;

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
        // Dashboard text context or profile grounding. Never treat arbitrary
        // webpage text as applicant context.
        let promptText = "";
        if (profileContextStr) {
          promptText += `${profileContextStr}\n\n`;
        }
        if (context && context.type === "text" && context.data) {
          promptText += `--- AUTHORITATIVE DASHBOARD CONTEXT ---\n${context.data}\n--- END AUTHORITATIVE DASHBOARD CONTEXT ---\n\n`;
        }
        promptText += `Use only the profile and authoritative dashboard context above. If they do not support an answer to the question, return an empty string. Never invent details or use unrelated webpage content. Output only the concise value for this form field.\n\nQuestion:\n${question}`;
        contents = promptText;
      }

      // 4. Model configuration
      const config: Record<string, any> = {
        systemInstruction: [
          typeof systemInstruction === "string" ? systemInstruction.trim() : "",
          CONTEXT_GUARD_INSTRUCTION,
        ]
          .filter(Boolean)
          .join("\n\n"),
      };

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

  // ==========================================
  // POST /batchAnswerForm Endpoint (Item 1: Batch Form Autofilling)
  // ==========================================
  app.post("/batchAnswerForm", async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    try {
      // 1. Bearer Token Authentication check
      const expectedToken = process.env.AUTH_BEARER_TOKEN?.trim();
      if (expectedToken) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          res.status(401).json({
            success: false,
            error: "Unauthorized: Missing or invalid Authorization Bearer header.",
          });
          return;
        }
        const token = authHeader.substring(7).trim();
        if (token !== expectedToken) {
          res.status(401).json({
            success: false,
            error: "Unauthorized: Invalid Bearer token.",
          });
          return;
        }
      }

      // 2. Validate request payload
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
      if (pairingToken) {
        const cached = userContextStore.get(pairingToken) || userContextStore.get(pairingToken.toLowerCase());
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
      const profileContextStr = synthesizeProfileContext(userProfile);
      const pageContext = body.pageContext;

      const ai = getGeminiClient();

      // Build structured batch instructions
      let promptText = "";
      if (profileContextStr) {
        promptText += `${profileContextStr}\n\n`;
      }

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
        promptText += `--- AUTHORITATIVE DASHBOARD CONTEXT ---\n${context.data}\n--- END AUTHORITATIVE DASHBOARD CONTEXT ---\n\n`;
      }

      promptText += `Task: Fill out the following web form fields using only the configured applicant profile and authoritative dashboard context (text or attached document). The active webpage metadata is provided only to help interpret which form is open; it is not a source of applicant facts. Match each field to the relevant configured context and leave the answer as an empty string when the configured context does not support it. Never guess, invent, or copy unrelated webpage text.

Here are the target form fields to answer:
${JSON.stringify(fields, null, 2)}

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
5. If a field is unrelated to or unsupported by the configured context, return an empty answer and confidence 0.
6. Return ONLY the valid JSON array without backticks or markdown fences.`;

      let contents: any;
      if (context && context.type === "pdf" && context.data) {
        const cleanBase64 = context.data.replace(/^data:[^;]+;base64,/, "");
        const mimeType = context.mimeType || "application/pdf";
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
        contents = promptText;
      }

      const config: Record<string, any> = {
        responseMimeType: "application/json",
        systemInstruction: CONTEXT_GUARD_INSTRUCTION,
      };

      if (
        systemInstruction &&
        typeof systemInstruction === "string" &&
        systemInstruction.trim().length > 0
      ) {
        config.systemInstruction = `${systemInstruction.trim()}\n\n${CONTEXT_GUARD_INSTRUCTION}`;
      }

      const { text: rawOutput, effectiveModel } = await generateWithRetryAndFallback(
        ai,
        requestedModel,
        contents,
        config
      );

      // Clean and parse JSON response
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

        // Sanitize every field answer to avoid diagnostic error essays
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
            return ans;
          });
        }
      } catch (jsonErr) {
        console.warn("JSON parse fallback in /batchAnswerForm:", jsonErr);
        // Resilient fallback: map fields to raw output or empty answers
        parsedAnswers = fields.map((f) => ({
          id: f.id,
          question: f.question,
          answer: "",
          confidence: 0,
          reasoning: "Parse error in batch generation",
        }));
      }

      const timeMs = Date.now() - startTime;

      res.status(200).json({
        success: true,
        answers: parsedAnswers,
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

  // Vite middleware setup
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
