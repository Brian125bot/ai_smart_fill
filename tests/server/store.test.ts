import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import { FileBackedContextStore, SyncedUserContext } from "../../store";

const TEST_DATA_DIR = path.join(process.cwd(), "data", "test-store-async");

function cleanupDir(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("FileBackedContextStore async PDF operations", () => {
  let store: FileBackedContextStore;

  beforeEach(() => {
    cleanupDir(TEST_DATA_DIR);
    store = new FileBackedContextStore(TEST_DATA_DIR);
  });

  afterEach(() => {
    cleanupDir(TEST_DATA_DIR);
  });

  it("savePdf creates a file in pdfs/ and returns the relative path", async () => {
    const pdfBase64 = "data:application/pdf;base64,JVBERi0xLjQKJVRlc3QgUERG";
    const pdfPath = await store.savePdf("token-123", pdfBase64);

    expect(pdfPath).toBeTruthy();
    expect(pdfPath).toContain("pdfs");

    const fullPath = path.join(TEST_DATA_DIR, pdfPath!);
    expect(fs.existsSync(fullPath)).toBe(true);

    const content = fs.readFileSync(fullPath);
    expect(content.toString("base64")).toBe("JVBERi0xLjQKJVRlc3QgUERG");
  });

  it("readPdf reads a valid saved PDF file asynchronously", async () => {
    const pdfBase64 = "data:application/pdf;base64,JVBERi0xLjQKJVRlc3QgUERG";
    const pdfPath = await store.savePdf("token-123", pdfBase64);

    const context: SyncedUserContext = {
      pairingToken: "token-123",
      pdfFilePath: pdfPath,
      pdfMimeType: "application/pdf",
      updatedAt: new Date().toISOString(),
    };
    store.set("token-123", context);

    const buffer = await store.readPdf("token-123");
    expect(buffer).not.toBeNull();
    expect(buffer!.toString("base64")).toBe("JVBERi0xLjQKJVRlc3QgUERG");
  });

  it("readPdf returns null gracefully when PDF file is missing", async () => {
    const context: SyncedUserContext = {
      pairingToken: "token-missing",
      pdfFilePath: "pdfs/nonexistent.pdf",
      updatedAt: new Date().toISOString(),
    };
    store.set("token-missing", context);

    const buffer = await store.readPdf("token-missing");
    expect(buffer).toBeNull();
  });

  it("migrates legacy context containing pdfData on disk", () => {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    const legacyCtx = {
      pairingToken: "legacy-token",
      pdfData: "data:application/pdf;base64,SGVsbG8gTGVnYWN5IFBERg==",
      pdfMimeType: "application/pdf",
      updatedAt: new Date().toISOString(),
    };

    const fileName = "legacy_token_12345678.json";
    fs.writeFileSync(
      path.join(TEST_DATA_DIR, fileName),
      JSON.stringify(legacyCtx)
    );

    // Initializing new store loads from disk and migrates
    const newStore = new FileBackedContextStore(TEST_DATA_DIR);
    const loaded = newStore.get("legacy-token");

    expect(loaded).toBeDefined();
    expect(loaded?.pdfData).toBeUndefined();
    expect(loaded?.pdfFilePath).toBeTruthy();
    expect(loaded?.pdfFilePath).toContain("pdfs");

    const pdfFullPath = path.join(TEST_DATA_DIR, loaded!.pdfFilePath!);
    expect(fs.existsSync(pdfFullPath)).toBe(true);
  });

  it("delete removes both JSON context file and associated PDF file", async () => {
    const pdfPath = await store.savePdf("token-del", "SGVsbG8=");
    store.set("token-del", {
      pairingToken: "token-del",
      pdfFilePath: pdfPath,
      updatedAt: new Date().toISOString(),
    });

    const fullPdfPath = path.join(TEST_DATA_DIR, pdfPath!);
    expect(fs.existsSync(fullPdfPath)).toBe(true);

    const success = await store.delete("token-del");
    expect(success).toBe(true);
    expect(store.get("token-del")).toBeUndefined();
    expect(fs.existsSync(fullPdfPath)).toBe(false);
  });

  it("delete succeeds even if PDF file deletion fails or file is absent", async () => {
    store.set("token-nopdf", {
      pairingToken: "token-nopdf",
      pdfFilePath: "pdfs/already-deleted.pdf",
      updatedAt: new Date().toISOString(),
    });

    const success = await store.delete("token-nopdf");
    expect(success).toBe(true);
    expect(store.get("token-nopdf")).toBeUndefined();
  });
});
