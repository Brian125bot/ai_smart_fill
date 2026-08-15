import fs from "fs";
import path from "path";
import crypto from "crypto";
import { UserProfileFields, PersonaProfile } from "./src/validation";

export interface SyncedUserContext {
  userId?: string;
  pairingToken: string;
  email?: string;
  displayName?: string;
  profiles?: PersonaProfile[];
  activeProfileId?: string;
  systemInstruction?: string;
  selectedModel?: string;
  usePageContext?: boolean;
  userProfile?: UserProfileFields;
  /** @deprecated Legacy inline PDF storage. Use pdfFilePath instead. */
  pdfData?: string | null;
  pdfFilePath?: string | null;
  pdfName?: string | null;
  pdfSize?: number | null;
  pdfMimeType?: string | null;
  textContext?: string | null;
  updatedAt: string;
}

export interface ContextStore {
  get(token: string): SyncedUserContext | undefined;
  set(token: string, context: SyncedUserContext): boolean | Promise<boolean>;
  delete(token: string): boolean | Promise<boolean>;
  has(token: string): boolean;
  keys(): IterableIterator<string>;
  size(): number;
  savePdf(token: string, base64Data: string): Promise<string | null>;
  readPdf(token: string): Promise<Buffer | null>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const ALIASES_FILE = "aliases.json";

function safeName(token: string): string {
  return token.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

function hashToken(token: string): string {
  return crypto.createHash("sha1").update(token).digest("hex").slice(0, 8);
}

function canonicalFilename(token: string): string {
  return `${safeName(token)}_${hashToken(token)}.json`;
}

function pdfFilename(token: string): string {
  return `${safeName(token)}_${hashToken(token)}.pdf`;
}

export class FileBackedContextStore implements ContextStore {
  private cache = new Map<string, SyncedUserContext>();
  private aliases = new Map<string, string>();
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || DATA_DIR;
    this.loadFromDisk();
  }

  private ensureDirs(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    const pdfsDir = path.join(this.dataDir, "pdfs");
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }
  }

  private async ensureDirsAsync(): Promise<void> {
    try {
      await fs.promises.mkdir(path.join(this.dataDir, "pdfs"), { recursive: true });
    } catch {
      // Ignore if directory already exists
    }
  }

  private loadFromDisk(): void {
    try {
      this.ensureDirs();
      const files = fs
        .readdirSync(this.dataDir)
        .filter((f) => f.endsWith(".json") && f !== ALIASES_FILE);
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(this.dataDir, file), "utf-8");
          const ctx: SyncedUserContext = JSON.parse(raw);
          if (ctx && ctx.pairingToken) {
            if (ctx.pdfData) {
              try {
                const pdfsDir = path.join(this.dataDir, "pdfs");
                if (!fs.existsSync(pdfsDir)) {
                  fs.mkdirSync(pdfsDir, { recursive: true });
                }
                const filename = pdfFilename(ctx.pairingToken);
                const fullPath = path.join(pdfsDir, filename);
                const cleanBase64 = ctx.pdfData.replace(/^data:[^;]+;base64,/, "");
                const buffer = Buffer.from(cleanBase64, "base64");
                const tmpPath = `${fullPath}.tmp-${process.pid}-${Date.now()}`;
                fs.writeFileSync(tmpPath, buffer);
                fs.renameSync(tmpPath, fullPath);

                ctx.pdfFilePath = path.join("pdfs", filename);
                delete ctx.pdfData;
                this.writeJson(path.join(this.dataDir, file), ctx);
              } catch (migErr) {
                console.warn(
                  `[store] Failed to migrate legacy PDF for "${ctx.pairingToken}":`,
                  migErr instanceof Error ? migErr.message : migErr
                );
              }
            }
            this.cache.set(ctx.pairingToken, ctx);
            this.cache.set(ctx.pairingToken.toLowerCase(), ctx);
          }
        } catch (err) {
          console.warn(
            `[store] Skipping corrupt file "${file}":`,
            err instanceof Error ? err.message : err
          );
        }
      }
      try {
        const aliasPath = path.join(this.dataDir, ALIASES_FILE);
        if (fs.existsSync(aliasPath)) {
          const raw = fs.readFileSync(aliasPath, "utf-8");
          const parsed = JSON.parse(raw) as Record<string, string>;
          for (const [alias, canonical] of Object.entries(parsed)) {
            this.aliases.set(alias.toLowerCase(), canonical);
          }
        }
      } catch (err) {
        console.warn("[store] Failed to load alias map:", err instanceof Error ? err.message : err);
      }
    } catch (err) {
      console.warn(
        "[store] Failed to load from disk, starting empty:",
        err instanceof Error ? err.message : err
      );
    }
  }

  private writeJson(filePath: string, obj: unknown): boolean {
    try {
      this.ensureDirs();
      const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(obj, null, 2), "utf-8");
      fs.renameSync(tmpPath, filePath);
      return true;
    } catch (err) {
      console.error(
        `[store] Failed to write "${filePath}":`,
        err instanceof Error ? err.message : err
      );
      return false;
    }
  }

  async savePdf(token: string, base64Data: string): Promise<string | null> {
    try {
      if (!base64Data || typeof base64Data !== "string") {
        return null;
      }
      await this.ensureDirsAsync();
      const pdfsDir = path.join(this.dataDir, "pdfs");
      const filename = pdfFilename(token);
      const fullPath = path.join(pdfsDir, filename);
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      const tmpPath = `${fullPath}.tmp-${process.pid}-${Date.now()}`;
      await fs.promises.writeFile(tmpPath, buffer);
      await fs.promises.rename(tmpPath, fullPath);
      return path.join("pdfs", filename);
    } catch (err) {
      console.error(
        `[store] Failed to save PDF for token "${token}":`,
        err instanceof Error ? err.message : err
      );
      return null;
    }
  }

  async readPdf(token: string): Promise<Buffer | null> {
    try {
      const ctx = this.get(token);
      const relPath = ctx?.pdfFilePath || path.join("pdfs", pdfFilename(token));
      const fullPath = path.isAbsolute(relPath) ? relPath : path.join(this.dataDir, relPath);
      return await fs.promises.readFile(fullPath);
    } catch (err) {
      console.warn(
        `[store] Failed to read PDF for token "${token}":`,
        err instanceof Error ? err.message : err
      );
      return null;
    }
  }

  private persistAliases(): void {
    const aliasPath = path.join(this.dataDir, ALIASES_FILE);
    this.writeJson(aliasPath, Object.fromEntries(this.aliases));
  }

  private resolveAlias(token: string): SyncedUserContext | undefined {
    const canonical = this.aliases.get(token.toLowerCase());
    if (!canonical) return undefined;
    return this.cache.get(canonical) || this.cache.get(canonical.toLowerCase());
  }

  get(token: string): SyncedUserContext | undefined {
    return this.cache.get(token) || this.cache.get(token.toLowerCase()) || this.resolveAlias(token);
  }

  set(token: string, context: SyncedUserContext): boolean {
    const canonical = context.pairingToken;
    this.cache.set(canonical, context);
    this.cache.set(canonical.toLowerCase(), context);
    const wrote = this.writeJson(path.join(this.dataDir, canonicalFilename(canonical)), context);
    if (token.toLowerCase() !== canonical.toLowerCase()) {
      this.aliases.set(token.toLowerCase(), canonical);
      this.persistAliases();
    }
    return wrote;
  }

  async delete(token: string): Promise<boolean> {
    const lower = token.toLowerCase();
    const direct = this.cache.get(token) || this.cache.get(lower);
    const aliasTarget = this.aliases.get(lower);
    const isAlias = Boolean(
      aliasTarget && (!direct || direct.pairingToken.toLowerCase() !== lower)
    );

    if (isAlias) {
      this.aliases.delete(lower);
      this.persistAliases();
      return true;
    }

    const canonical = direct ? direct.pairingToken : token;

    if (canonical) {
      this.cache.delete(canonical);
      this.cache.delete(canonical.toLowerCase());
      for (const [alias, target] of this.aliases) {
        if (target.toLowerCase() === canonical.toLowerCase()) {
          this.aliases.delete(alias);
        }
      }

      let jsonDeleteSuccess = true;
      try {
        const filePath = path.join(this.dataDir, canonicalFilename(canonical));
        await fs.promises.unlink(filePath);
      } catch (err) {
        if ((err as { code?: string }).code !== "ENOENT") {
          console.error(
            `[store] Failed to delete "${canonicalFilename(canonical)}":`,
            err instanceof Error ? err.message : err
          );
          jsonDeleteSuccess = false;
        }
      }

      try {
        const relPath = direct?.pdfFilePath || path.join("pdfs", pdfFilename(canonical));
        const fullPdfPath = path.isAbsolute(relPath) ? relPath : path.join(this.dataDir, relPath);
        await fs.promises.unlink(fullPdfPath);
      } catch (err) {
        if ((err as { code?: string }).code !== "ENOENT") {
          console.warn(
            `[store] Failed to delete PDF for "${canonical}":`,
            err instanceof Error ? err.message : err
          );
        }
      }

      this.cache.delete(token);
      this.cache.delete(lower);
      this.persistAliases();
      return jsonDeleteSuccess;
    }

    this.cache.delete(token);
    this.cache.delete(lower);
    this.persistAliases();
    return true;
  }

  has(token: string): boolean {
    return !!this.get(token);
  }

  keys(): IterableIterator<string> {
    const distinct = new Set<string>();
    for (const ctx of this.cache.values()) distinct.add(ctx.pairingToken);
    return distinct.keys();
  }

  size(): number {
    const distinct = new Set<string>();
    for (const ctx of this.cache.values()) distinct.add(ctx.pairingToken);
    return distinct.size;
  }
}

export function createContextStore(dataDir?: string): ContextStore {
  return new FileBackedContextStore(dataDir);
}
