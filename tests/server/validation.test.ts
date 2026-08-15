import { describe, it, expect } from "vitest";
import {
  AnswerQuestionSchema,
  BatchAnswerFormSchema,
  RememberAnswerSchema,
  SyncProfileSchema,
  PersonaProfileSchema,
  formatZodErrors,
} from "../../src/validation";

describe("AnswerQuestionSchema", () => {
  it("accepts a valid payload", () => {
    const result = AnswerQuestionSchema.safeParse({ question: "What is your name?" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty payload", () => {
    const result = AnswerQuestionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only question", () => {
    const result = AnswerQuestionSchema.safeParse({ question: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    const result = AnswerQuestionSchema.safeParse({
      question: "Q?",
      unexpectedField: "x",
    });
    expect(result.success).toBe(false);
  });
});

describe("BatchAnswerFormSchema", () => {
  it("accepts a valid payload", () => {
    const result = BatchAnswerFormSchema.safeParse({
      fields: [{ id: "f1", question: "Name?" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty fields array", () => {
    const result = BatchAnswerFormSchema.safeParse({ fields: [] });
    expect(result.success).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    const result = BatchAnswerFormSchema.safeParse({
      fields: [{ id: "f1", question: "Name?" }],
      extraField: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("RememberAnswerSchema", () => {
  it("accepts a valid payload", () => {
    const result = RememberAnswerSchema.safeParse({
      pairingToken: "tok",
      question: "Q?",
      answer: "A.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty payload", () => {
    const result = RememberAnswerSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only fields", () => {
    const result = RememberAnswerSchema.safeParse({
      pairingToken: "  ",
      question: "Q?",
      answer: "A.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing question or answer", () => {
    const result = RememberAnswerSchema.safeParse({
      pairingToken: "tok",
      question: "Q?",
    });
    expect(result.success).toBe(false);
  });
});

describe("SyncProfileSchema", () => {
  it("accepts a payload with pairingToken", () => {
    const result = SyncProfileSchema.safeParse({ pairingToken: "tok" });
    expect(result.success).toBe(true);
  });

  it("accepts a payload with email only", () => {
    const result = SyncProfileSchema.safeParse({ email: "a@b.com" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty payload (no identifier)", () => {
    const result = SyncProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("PersonaProfileSchema", () => {
  it("accepts a valid profile", () => {
    const result = PersonaProfileSchema.safeParse({ id: "p1", name: "Test" });
    expect(result.success).toBe(true);
  });

  it("rejects a profile without name", () => {
    const result = PersonaProfileSchema.safeParse({ id: "p1" });
    expect(result.success).toBe(false);
  });
});

describe("formatZodErrors", () => {
  it("returns an array of strings with path and message", () => {
    const parsed = AnswerQuestionSchema.safeParse({});
    if (!parsed.success) {
      const formatted = formatZodErrors(parsed.error);
      expect(Array.isArray(formatted)).toBe(true);
      expect(formatted.length).toBeGreaterThan(0);
      expect(typeof formatted[0]).toBe("string");
    } else {
      throw new Error("Expected parse to fail");
    }
  });
});
