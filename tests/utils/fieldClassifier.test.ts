import { describe, it, expect } from "vitest";
import { classifyField, isLongForm } from "../../fieldClassifier";

describe("fieldClassifier", () => {
  describe("classifyField", () => {
    it("classifies explicit types correctly", () => {
      expect(classifyField({ type: "email" })).toBe("email");
      expect(classifyField({ type: "tel" })).toBe("phone");
      expect(classifyField({ type: "number" })).toBe("numeric");
    });

    it("classifies select tags correctly", () => {
      expect(classifyField({ tagName: "select" })).toBe("select");
      expect(classifyField({ options: ["yes", "no"] })).toBe("select");
    });

    it("detects long_form fields via explicit maxLength on textareas", () => {
      expect(classifyField({ tagName: "textarea", maxLength: 201 })).toBe("long_form");
      expect(classifyField({ tagName: "textarea", maxLength: -1 })).toBe("long_form");
    });

    it("detects short_text via explicit short maxLength on textareas", () => {
      expect(classifyField({ tagName: "textarea", maxLength: 100 })).toBe("short_text");
    });

    it("falls back to keyword-based detection for missing structural hints", () => {
      expect(classifyField({ question: "Enter your e-mail address" })).toBe("email");
      expect(classifyField({ name: "mobile" })).toBe("phone");
      expect(classifyField({ placeholder: "Age" })).toBe("numeric");
    });

    it("detects long_form fields via long questions", () => {
      const longQuestion = "a".repeat(81);
      expect(classifyField({ question: longQuestion })).toBe("long_form");
    });

    it("detects long_form fields via keywords", () => {
      expect(classifyField({ question: "Tell us about your experience" })).toBe("long_form");
      expect(classifyField({ placeholder: "Summary of your background" })).toBe("long_form");
    });

    it("detects short hints (e.g. zip) taking precedence over multiline default", () => {
      expect(classifyField({ tagName: "textarea", rows: 5, name: "zip" })).toBe("short_text");
    });

    it("detects long_form via row count for textarea", () => {
      expect(classifyField({ tagName: "textarea", rows: 3 })).toBe("long_form");
    });

    it("detects long_form via row count for contenteditable div", () => {
      expect(classifyField({ tagName: "div", rows: 5 })).toBe("long_form");
    });

    it("detects long_form via large maxLength on regular input", () => {
      expect(classifyField({ tagName: "input", maxLength: 400 })).toBe("long_form");
    });

    it("defaults to short_text for empty or malformed inputs", () => {
      expect(classifyField({})).toBe("short_text");
      expect(classifyField({ type: "unknown" })).toBe("short_text");
    });
  });

  describe("isLongForm", () => {
    it("returns true for long_form", () => {
      expect(isLongForm("long_form")).toBe(true);
    });

    it("returns false for other categories", () => {
      expect(isLongForm("short_text")).toBe(false);
      expect(isLongForm("email")).toBe(false);
      expect(isLongForm("select")).toBe(false);
    });
  });
});
