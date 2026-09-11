import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createContextStore } from "../../store";
import fs from "fs";
import path from "path";

describe("FileBackedContextStore", () => {
  const TEST_DATA_DIR = path.join(process.cwd(), "test_data");

  beforeEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  it("initializes and sets/gets items", () => {
    const store = createContextStore(TEST_DATA_DIR);
    const ctx = { pairingToken: "token1", updatedAt: new Date().toISOString() };
    store.set("token1", ctx);

    expect(store.has("token1")).toBe(true);
    expect(store.get("token1")).toEqual(ctx);
    expect(store.size()).toBe(1);
    expect(Array.from(store.keys())).toEqual(["token1"]);
  });

  it("handles aliases correctly", () => {
    const store = createContextStore(TEST_DATA_DIR);
    const ctx = { pairingToken: "canonicalToken", updatedAt: new Date().toISOString() };
    store.set("canonicalToken", ctx);

    // Setting with alias
    store.set("aliasToken", ctx);

    expect(store.get("aliasToken")?.pairingToken).toBe("canonicalToken");
    expect(store.get("canonicalToken")?.pairingToken).toBe("canonicalToken");
  });

  it("deletes items and removes them from disk", async () => {
    const store = createContextStore(TEST_DATA_DIR);
    const ctx = { pairingToken: "tokenToDelete", updatedAt: new Date().toISOString() };
    store.set("tokenToDelete", ctx);

    expect(store.has("tokenToDelete")).toBe(true);

    const deleted = await store.delete("tokenToDelete");
    expect(deleted).toBe(true);
    expect(store.has("tokenToDelete")).toBe(false);

    // Check disk
    const files = fs.readdirSync(TEST_DATA_DIR).filter(f => f.endsWith(".json") && f !== "aliases.json");
    expect(files.length).toBe(0);
  });

  it("handles loading from disk", () => {
    const store1 = createContextStore(TEST_DATA_DIR);
    const ctx = { pairingToken: "tokenDisk", updatedAt: new Date().toISOString() };
    store1.set("tokenDisk", ctx);

    // Create a new store instance to load from disk
    const store2 = createContextStore(TEST_DATA_DIR);
    expect(store2.has("tokenDisk")).toBe(true);
    expect(store2.get("tokenDisk")?.pairingToken).toBe("tokenDisk");
  });

  it("saves and reads PDFs", async () => {
    const store = createContextStore(TEST_DATA_DIR);
    const ctx = { pairingToken: "pdfToken", updatedAt: new Date().toISOString() };
    store.set("pdfToken", ctx);

    const base64Data = "data:application/pdf;base64,SGVsbG8gV29ybGQ="; // "Hello World"
    const savedPath = await store.savePdf("pdfToken", base64Data);
    expect(savedPath).toBeTruthy();

    if (savedPath) {
      // Update ctx with pdfPath manually since savePdf does not do it implicitly
      ctx.pdfFilePath = savedPath;
      store.set("pdfToken", ctx);

      const buffer = await store.readPdf("pdfToken");
      expect(buffer).not.toBeNull();
      expect(buffer?.toString()).toBe("Hello World");
    }
  });

  it("handles graceful degradation on load of corrupt files", () => {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(TEST_DATA_DIR, "corrupt.json"), "{ invalid json");

    const store = createContextStore(TEST_DATA_DIR);
    // Should not throw
    expect(store.size()).toBe(0);
  });
});
