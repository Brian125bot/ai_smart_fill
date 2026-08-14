export interface GeminiModelOption {
  id: string;
  name: string;
  version: string;
  tag: string;
  category: "3.7" | "3.6" | "3.5" | "3.1" | "3.0" | "custom";
  description: string;
  speed: "Ultra-Fast" | "Fast" | "Balanced";
  contextWindow: string;
  isDefault?: boolean;
  badgeColor: string;
}

export const AVAILABLE_GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    version: "v3.7",
    tag: "Recommended",
    category: "3.7",
    description: "Flagship hybrid reasoning with ultra-fast latency. Excellent for real-time form autofill and document grounding.",
    speed: "Fast",
    contextWindow: "1M tokens",
    isDefault: true,
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    version: "v3.6",
    tag: "Next-Gen Fast",
    category: "3.6",
    description: "High-speed 3.6 generation model tuned for minimal overhead and rapid JSON/field extractions.",
    speed: "Ultra-Fast",
    contextWindow: "1M tokens",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    version: "v3.5",
    tag: "Multimodal",
    category: "3.5",
    description: "Solid 3.5 multimodal engine for fast PDF grounding and contextual comprehension.",
    speed: "Fast",
    contextWindow: "1M tokens",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    version: "v3.5",
    tag: "Ultra-Light 3.5",
    category: "3.5",
    description: "Extremely cost-effective, lowest-latency 3.5 model tuned for real-time form filling and field parsing.",
    speed: "Ultra-Fast",
    contextWindow: "1M tokens",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    version: "v3.1",
    tag: "Ultra-Light 3.1",
    category: "3.1",
    description: "Super lightweight, high-throughput model with minimum response latency for high-frequency form inputs.",
    speed: "Ultra-Fast",
    contextWindow: "1M tokens",
    badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/40",
  },
  {
    id: "gemini-3.0-flash",
    name: "Gemini 3.0 Flash",
    version: "v3.0",
    tag: "High Throughput",
    category: "3.0",
    description: "Baseline 3.0 generation for consistent form filling with minimal token consumption.",
    speed: "Fast",
    contextWindow: "1M tokens",
    badgeColor: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  },
];
