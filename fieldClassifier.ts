export type FieldCategory = "short_text" | "long_form" | "select" | "email" | "phone" | "numeric";

export interface FieldClassificationInput {
  type?: string;
  tagName?: string;
  maxLength?: number;
  rows?: number;
  question?: string;
  placeholder?: string;
  name?: string;
  options?: string[];
}

const LONG_FORM_KEYWORDS = [
  "describe",
  "explain",
  "tell us",
  "tell me",
  "elaborate",
  "discuss",
  "why",
  "how did",
  "how have",
  "how would",
  "motivation",
  "motivated",
  "passion",
  "passionate",
  "experience with",
  "experience in",
  "cover letter",
  "personal statement",
  "additional information",
  "anything else",
  "other information",
  "summary",
  "bio",
  "about yourself",
  "about you",
  "your background",
  "yourself",
  "goals",
  "achievement",
  "accomplishment",
  "challenge",
  "failure",
  "strength",
  "weakness",
  "interest",
  "hobby",
  "leadership",
  "teamwork",
  "problem",
  "solution",
  "project",
  "contribution",
];

const EMAIL_PATTERNS = /email|e-mail|@/i;
const PHONE_PATTERNS = /\bphone\b|\btel\b|\bmobile\b|\bfax\b/i;
const NUMERIC_PATTERNS = /years|age|number of|quantity|count|salary|compensation|gpa|grade/i;
const SHORT_FORM_PATTERNS =
  /\bcoupon\b|\bpromo(?:tion)?\s+code\b|\bzip\b|\bpostal\b|\bnickname\b|\b(?:verification|access|reference)\s+code\b/i;

function normalize(text: string): string {
  return (text || "").toLowerCase().trim();
}

export function classifyField(field: FieldClassificationInput): FieldCategory {
  const type = normalize(field.type || "");
  const question = normalize(field.question || "");
  const placeholder = normalize(field.placeholder || "");
  const name = normalize(field.name || "");
  const tagName = (field.tagName || "input").toLowerCase();

  // Explicit types
  if (type === "email") return "email";
  if (type === "tel") return "phone";
  if (type === "number") return "numeric";

  // Select fields
  if (tagName === "select" || (Array.isArray(field.options) && field.options.length > 0)) {
    return "select";
  }

  // Textarea / contenteditable with substantial maxLength → long_form
  if (
    (tagName === "textarea" || tagName === "div") &&
    (field.maxLength === -1 || (field.maxLength && field.maxLength > 200))
  ) {
    return "long_form";
  }

  // Textarea with short explicit maxLength → short_text
  if (tagName === "textarea" && field.maxLength && field.maxLength > 0 && field.maxLength <= 200) {
    return "short_text";
  }

  // Keyword-based detection from question/placeholder/name
  const text = `${question} ${placeholder} ${name}`;

  if (EMAIL_PATTERNS.test(text)) return "email";
  if (PHONE_PATTERNS.test(text)) return "phone";
  if (NUMERIC_PATTERNS.test(text)) return "numeric";

  // Long-form heuristic: question length or keyword match
  if (question.length > 80) return "long_form";
  for (const kw of LONG_FORM_KEYWORDS) {
    if (text.includes(kw)) return "long_form";
  }

  // Short semantic hints take precedence over the multiline fallback. Some
  // sites render coupon codes, ZIPs, or nicknames as tall textareas.
  if (SHORT_FORM_PATTERNS.test(text)) return "short_text";

  // Textarea (or contenteditable div) with no explicit maxLength: use rows as
  // a final signal after semantic hints have had a chance to classify the field.
  if ((tagName === "textarea" || tagName === "div") && field.maxLength === undefined) {
    const rows = field.rows && field.rows > 0 ? field.rows : 0;
    if (rows >= 3) return "long_form";
  }

  // Large maxLength input
  if (field.maxLength && field.maxLength > 300) return "long_form";

  return "short_text";
}

export function isLongForm(category: FieldCategory): boolean {
  return category === "long_form";
}
