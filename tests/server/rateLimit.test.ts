import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { makeApp, makeFakeAi } from "../helpers";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Rate limiting", () => {
  it("returns 429 on /api/health after exceeding the api limit", async () => {
    const app = await makeApp();

    for (let i = 0; i < 120; i++) {
      await request(app).get("/api/health");
    }

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(429);
  });

  it("returns 429 on /answerQuestion after exceeding the AI limit", async () => {
    const ai = makeFakeAi(() => ({ text: "ok" }));
    const app = await makeApp(ai);

    for (let i = 0; i < 30; i++) {
      await request(app).post("/answerQuestion").send({ question: "Q?" });
    }

    const res = await request(app).post("/answerQuestion").send({ question: "Q?" });
    expect(res.status).toBe(429);
  });
});
