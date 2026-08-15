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
  if ((tagName === "textarea" || tagName === "div") && (field.maxLength === -1 || (field.maxLength && field.maxLength > 200))) {
    return "long_form";
  }

  // Textarea with short explicit maxLength → short_text
  if (tagName === "textarea" && field.maxLength && field.maxLength > 0 && field.maxLength <= 200) {
    return "short_text";
  }

  // Textarea (or contenteditable div) with no explicit maxLength: use rows and
  // keyword signals. A multiline field (rows >= 3) and no short maxLength is
  // almost always a free-text essay, so treat it as long_form; single-row or
  // unspecified-row textareas fall through to keyword/length heuristics below.
  if ((tagName === "textarea" || tagName === "div") && field.maxLength === undefined) {
    const rows = field.rows && field.rows > 0 ? field.rows : 0;
    if (rows >= 3) return "long_form";
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

  // Large maxLength input
  if (field.maxLength && field.maxLength > 300) return "long_form";

  return "short_text";
}

export function isLongForm(category: FieldCategory): boolean {
  return category === "long_form";
}
