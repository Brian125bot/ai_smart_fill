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
const CODE_FENCE_RE = /```/;
const MARKDOWN_ERROR_HEADING_RE = /^#{1,6}\s+.*error/im;
const FAILED_EXECUTE_RE = /\bfailed to execute\b/i;
const ENCODING_RE = /iso-8859-1/i;
const BASED_ON_ERROR_RE = /\bbased on\b.*\berror\b/i;
const ERROR_MESSAGE_RE = /\berror message\b/i;

export function looksLikeErrorLeak(text: string): { leaked: boolean; reason: string } {
  if (!text || typeof text !== "string") return { leaked: false, reason: "" };
  if (EXCEPTION_HEADER_RE.test(text)) return { leaked: true, reason: "exception_header" };
  if (TRACEBACK_RE.test(text)) return { leaked: true, reason: "traceback" };
  if (STACK_FRAME_RE.test(text)) return { leaked: true, reason: "stack_frame" };
  if (FILE_PATH_RE.test(text)) return { leaked: true, reason: "file_path" };
  if (CODE_FENCE_RE.test(text)) return { leaked: true, reason: "code_fence" };
  if (MARKDOWN_ERROR_HEADING_RE.test(text)) return { leaked: true, reason: "markdown_error_heading" };
  if (FAILED_EXECUTE_RE.test(text)) return { leaked: true, reason: "failed_execute" };
  if (ENCODING_RE.test(text)) return { leaked: true, reason: "encoding" };
  if (BASED_ON_ERROR_RE.test(text)) return { leaked: true, reason: "based_on_error" };
  if (ERROR_MESSAGE_RE.test(text) && /\bcontext\b/i.test(text)) return { leaked: true, reason: "error_context" };
  if (
    text.length > 250 &&
    /\bError\s*:/.test(text) &&
    /\b(?:based on|context|analysis)\b/i.test(text)
  )
    return { leaked: true, reason: "diagnostic_essay_shape" };
  return { leaked: false, reason: "" };
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
