export type ContextType = "pdf" | "text" | "none";

export function getContextType(ctx: any): ContextType {
  if (ctx?.type === "pdf") return "pdf";
  if (ctx?.type === "text") return "text";
  return "none";
}

const EXCEPTION_HEADER_RE = /\b\w*(?:Error|Exception)\s*:/;
const TRACEBACK_RE = /\btraceback\b|\bstack\s*trace\b/i;
const STACK_FRAME_RE = /(?:\bat\s+\S+\s*\(.*:\d+:\d+\)|^\s*at\s+\S+)/m;
const FILE_PATH_RE =
  /(?:\/[\w.\-\\/]+\.(?:js|ts|mjs|cjs|py|java|go|rs|cpp|c|rb|php):\d+|\b[A-Z]:\\[^\n]+\.\w+:\d+|\/[\w/-]+\/[\w.-]+:\d+)/;
const FAILED_EXECUTE_RE = /\bfailed to execute\b/i;
const ENCODING_RE = /iso-8859-1/i;
const BASED_ON_ERROR_RE = /\bbased on\b.*\berror\b/i;
const ERROR_MESSAGE_RE = /\berror message\b/i;
// Retired phrasings kept as a small, exact-phrase fallback so the historical leak
// shape continues to be blanked without false positives on STAR/markdown/code samples.
const RETIRED_BASED_ON_RE = /\bbased on the error message and context\b/i;
const RETIRED_HEADING_RE = /#{1,6}\s+the\s+error\b/i;

const CODE_FENCE_RE = /```/;
const SOURCE_LIKE_FENCE_RE = /```(?:js|ts|jsx|tsx|py|java|go|rs|cpp|c|rb|php|json|sh|bash|html|css|yaml|yml|sql)\b/i;
const STACK_LIKE_IN_FENCE_RE = /(?:throw\s+new\s+\w*Error|at\s+\S+\s*\(.*:\d+:\d+\)|Traceback|\b\d+:\d+:\d+\b)/;
const MARKDOWN_ERROR_HEADING_RE = /^#{1,6}\s+.*error/im;
const PUNCTUATED_ERROR_HEADING_RE = /^#{1,6}\s+.*\bError\b/im;
const DIAGNOSTIC_HEADING_WORDS =
  /\b(?:error\s*analysis|stack\s*trace|traceback|root\s*cause|root\s*cause\s*analysis|failure\s*mode|exception\s*type|raised\s*an?\s*exception|thrown\s*an?\s*exception|threw\s*an?\s*exception|diagnosing\s*the|diagnostic\s*essay)\b/i;

export function looksLikeErrorLeak(text: string): { leaked: boolean; reason: string } {
  if (!text || typeof text !== "string") return { leaked: false, reason: "" };

  // Strong single-signal rules — high precision, no corroboration needed.
  if (EXCEPTION_HEADER_RE.test(text)) return { leaked: true, reason: "exception_header" };
  if (TRACEBACK_RE.test(text)) return { leaked: true, reason: "traceback" };
  if (STACK_FRAME_RE.test(text)) return { leaked: true, reason: "stack_frame" };
  if (FILE_PATH_RE.test(text)) return { leaked: true, reason: "file_path" };
  if (FAILED_EXECUTE_RE.test(text)) return { leaked: true, reason: "failed_execute" };
  if (ENCODING_RE.test(text)) return { leaked: true, reason: "encoding" };

  // Retired literal phrasings kept as exact-phrase fallbacks so the original
  // leak shape continues to be blanked. These are specific enough to avoid
  // false positives on STAR-format or "-## Error" headings.
  if (RETIRED_BASED_ON_RE.test(text)) return { leaked: true, reason: "based_on_error" };
  if (RETIRED_HEADING_RE.test(text)) return { leaked: true, reason: "markdown_error_heading" };

  // The looser "based on ... error" / "error message ... context" patterns need
  // additional diagnostic framing so STAR-format prose ("Based on the error, I
  // traced it...") is not blanked.
  if (BASED_ON_ERROR_RE.test(text) && DIAGNOSTIC_HEADING_WORDS.test(text))
    return { leaked: true, reason: "based_on_error" };
  if (ERROR_MESSAGE_RE.test(text) && /\bcontext\b/i.test(text) && DIAGNOSTIC_HEADING_WORDS.test(text))
    return { leaked: true, reason: "error_context" };

  // Markdown heading + "error" / "Error" alone fires too often on legitimate long-form
  // titles like "## Handling a Critical Production Error". Require a diagnostic cue
  // (analysis / root cause / stack trace / traceback / exception) in the surrounding
  // text, or a structural companion (stack frame / Exception header) before blanking.
  if (
    (MARKDOWN_ERROR_HEADING_RE.test(text) || PUNCTUATED_ERROR_HEADING_RE.test(text)) &&
    (DIAGNOSTIC_HEADING_WORDS.test(text) || STACK_FRAME_RE.test(text) || EXCEPTION_HEADER_RE.test(text))
  ) {
    return { leaked: true, reason: "markdown_error_heading" };
  }

  // Code fences happen all the time in code-sample answers. Only flag if the fenced
  // content looks like a stack trace / exception / debug log: throw new Error, stack
  // frame, Traceback, or a timestamped log line.
  if (CODE_FENCE_RE.test(text)) {
    const fenced = extractFences(text);
    for (const block of fenced) {
      if (STACK_LIKE_IN_FENCE_RE.test(block)) return { leaked: true, reason: "code_fence" };
    }
  }

  // Diagnostic-essay shape: long prose that mixes `Error:` with diagnostic framing.
  if (
    text.length > 250 &&
    /\bError\s*:/.test(text) &&
    /\b(?:based on|context|analysis)\b/i.test(text)
  ) {
    return { leaked: true, reason: "diagnostic_essay_shape" };
  }

  return { leaked: false, reason: "" };
}

function extractFences(text: string): string[] {
  const blocks: string[] = [];
  const re = /```([^\n]*)\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text)) !== null) blocks.push(`${m[1]}\n${m[2]}`);
  return blocks;
}

export function logLeak(opts: {
  endpoint: string;
  fieldId?: string;
  question: string;
  contextType: ContextType;
  model?: string;
  reason: string;
  raw: string;
}): void {
  const entry = {
    tag: "error_leak",
    ts: new Date().toISOString(),
    endpoint: opts.endpoint,
    fieldId: opts.fieldId ?? null,
    question: opts.question,
    contextType: opts.contextType,
    model: opts.model ?? null,
    reason: opts.reason,
    rawPreview: opts.raw.slice(0, 4000),
    rawLength: opts.raw.length,
    truncated: opts.raw.length > 4000,
  };
  console.warn(JSON.stringify(entry));
}
