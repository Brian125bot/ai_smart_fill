import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { makeApp, makeFakeAi } from "../helpers";

describe("errorLeak integration tests", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sanitizes AI responses in /batchAnswerForm (long-form) to not leak stack traces or system paths", async () => {
    const leakText = "Traceback (most recent call last):\n  File \"x.py\", line 1";
    const ai = makeFakeAi(() => ({ text: leakText }));
    const app = await makeApp(ai);

    const res = await request(app)
      .post("/batchAnswerForm")
      .send({ fields: [{ id: "f1", question: "Describe a failure", tagName: "textarea", maxLength: 500 }] });

    expect(res.status).toBe(200);
    const ans = res.body.answers[0];
    expect(ans.answer).toBe("");
    expect(ans.withheld).toBe(true);
    expect(ans.answer).not.toContain("Traceback");
  });

  it("does not leak internal details in 400 input validation errors from Zod", async () => {
    const app = await makeApp();
    const res = await request(app)
      .post("/answerQuestion")
      .send({ question: 12345 });

    expect(res.status).toBe(400);
    const responseError = res.body.error || "";
    expect(responseError).not.toContain("node_modules/zod");
    expect(responseError).not.toContain("/app/src/");
  });

  it("does not leak internal stack traces on 500 error when AI fails", async () => {
    const ai = makeFakeAi(() => {
      // Mock an error thrown from inside a module
      const err = new Error("Failed to generate");
      err.stack = "Error: Failed to generate\n    at generate (/usr/src/app/node_modules/ai/index.js:10:5)";
      throw err;
    });
    const app = await makeApp(ai);

    const res = await request(app)
      .post("/answerQuestion")
      .send({ question: "Hello" });

    expect(res.status).toBe(500);
    const responseError = res.body.error || "";
    // server.ts uses `errorMessage(error)` which returns `error.message` ("Failed to generate").
    // It does NOT return the stack trace, so this assertion will pass naturally without changing server.ts!
    expect(responseError).not.toContain("/usr/src/app/");
    expect(responseError).not.toContain("node_modules/ai");
  });
});
