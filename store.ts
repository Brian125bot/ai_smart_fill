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
  pdfData?: string | null;
  pdfName?: string | null;
  pdfSize?: number | null;
  pdfMimeType?: string | null;
  textContext?: string | null;
  updatedAt: string;
}

export interface ContextStore {
  get(token: string): SyncedUserContext | undefined;
  set(token: string, context: SyncedUserContext): boolean;
  delete(token: string): boolean;
  has(token: string): boolean;
  keys(): IterableIterator<string>;
  size(): number;
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

export class FileBackedContextStore implements ContextStore {
  private cache = new Map<string, SyncedUserContext>();
  private aliases = new Map<string, string>();
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || DATA_DIR;
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        return;
      }
      const files = fs
        .readdirSync(this.dataDir)
        .filter((f) => f.endsWith(".json") && f !== ALIASES_FILE);
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(this.dataDir, file), "utf-8");
          const ctx: SyncedUserContext = JSON.parse(raw);
          if (ctx && ctx.pairingToken) {
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
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const tmpPath = `${filePath}.tmp-${process.pid}`;
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

  delete(token: string): boolean {
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
      try {
        const filePath = path.join(this.dataDir, canonicalFilename(canonical));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (err) {
        console.error(
          `[store] Failed to delete "${canonicalFilename(canonical)}":`,
          err instanceof Error ? err.message : err
        );
        return false;
      }
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
