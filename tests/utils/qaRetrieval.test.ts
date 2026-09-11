import { describe, it, expect } from "vitest";
import { retrieveRelevantQAs, tokenize } from "../../qaRetrieval";

describe("qaRetrieval", () => {
  const qas = [
    { id: "1", question: "What is your email address?", answer: "test@example.com" },
    { id: "2", question: "What is your phone number?", answer: "123-456-7890" },
    { id: "3", question: "Describe your experience with React.", answer: "I have 5 years of experience." },
    { id: "4", question: "How many years of experience?", answer: "5 years" },
  ];

  describe("tokenize", () => {
    it("lowercases and removes special characters", () => {
      expect(tokenize("Hello, World!")).toEqual(["hello", "world"]);
    });

    it("filters out stop words", () => {
      expect(tokenize("What is the name of your cat?")).toEqual(["name", "cat"]);
    });

    it("handles empty inputs", () => {
      expect(tokenize("")).toEqual([]);
      expect(tokenize(undefined as any)).toEqual([]);
    });

    it("filters out single character tokens", () => {
      expect(tokenize("a b c d dog")).toEqual(["dog"]);
    });
  });

  describe("retrieveRelevantQAs", () => {
    it("returns empty array for empty inputs", () => {
      expect(retrieveRelevantQAs("", qas)).toEqual([]);
      expect(retrieveRelevantQAs("phone", [])).toEqual([]);
    });

    it("retrieves the most relevant QA", () => {
      const results = retrieveRelevantQAs("Please provide your email address", qas);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("1");
    });

    it("sorts by relevance score", () => {
      const results = retrieveRelevantQAs("Describe your experience", qas);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("3");
    });

    it("limits to topN results", () => {
      const results = retrieveRelevantQAs("experience", qas, 1);
      expect(results.length).toBe(1);
      expect(["3", "4"]).toContain(results[0].id); // Both have "experience"
    });

    it("returns empty array if no overlap", () => {
      const results = retrieveRelevantQAs("What is your favorite color?", qas);
      expect(results).toEqual([]);
    });
  });
});
