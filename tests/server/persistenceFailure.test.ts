import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../../server";
import { makeFakeAi } from "../helpers";
import type { ContextStore, SyncedUserContext } from "../../store";

class FailingStore implements ContextStore {
  private cache = new Map<string, SyncedUserContext>();
  private failSet = true;
  private failDelete = true;

  setFailSet(value: boolean) {
    this.failSet = value;
  }
  setFailDelete(value: boolean) {
    this.failDelete = value;
  }

  get(token: string): SyncedUserContext | undefined {
    return this.cache.get(token);
  }
  set(token: string, context: SyncedUserContext): boolean {
    if (this.failSet) return false;
    this.cache.set(token, context);
    return true;
  }
  delete(token: string): boolean {
    if (this.failDelete) return false;
    this.cache.delete(token);
    return true;
  }
  has(token: string): boolean {
    return this.cache.has(token);
  }
  keys(): IterableIterator<string> {
    return this.cache.keys();
  }
  size(): number {
    return this.cache.size;
  }
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Persistence failure propagation", () => {
  it("returns 500 when store.set() fails in syncProfile", async () => {
    const store = new FailingStore();
    store.setFailSet(true);
    const app = await createApp({
      serveStatic: false,
      contextStore: store,
      aiClient: makeFakeAi(),
    });

    const res = await request(app)
      .post("/api/syncProfile")
      .send({ pairingToken: "tok", profiles: [{ id: "p1", name: "P1" }] });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it("returns 500 when store.delete() fails in purgeContext", async () => {
    const store = new FailingStore();
    store.setFailSet(false);
    store.set("tok", { pairingToken: "tok", updatedAt: new Date().toISOString() });
    store.setFailDelete(true);
    const app = await createApp({
      serveStatic: false,
      contextStore: store,
      aiClient: makeFakeAi(),
    });

    const res = await request(app)
      .post("/api/purgeContext")
      .send({ pairingToken: "tok" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it("returns 500 when store.set() fails in rememberAnswer", async () => {
    const store = new FailingStore();
    store.setFailSet(false);
    store.set("tok", {
      pairingToken: "tok",
      updatedAt: new Date().toISOString(),
      activeProfileId: "p1",
      profiles: [{ id: "p1", name: "P1", profileFields: { customQAs: [] } }],
    });
    store.setFailSet(true);
    const app = await createApp({
      serveStatic: false,
      contextStore: store,
      aiClient: makeFakeAi(),
    });

    const res = await request(app)
      .post("/api/rememberAnswer")
      .send({ pairingToken: "tok", question: "Q?", answer: "A." });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
