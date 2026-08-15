import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface SyncedUserContext {
  userId?: string;
  pairingToken: string;
  email?: string;
  displayName?: string;
  profiles?: any[];
  activeProfileId?: string;
  systemInstruction?: string;
  selectedModel?: string;
  usePageContext?: boolean;
  userProfile?: Record<string, any>;
  pdfData?: string | null;
  pdfName?: string | null;
  pdfSize?: number | null;
  pdfMimeType?: string | null;
  textContext?: string | null;
  updatedAt: string;
}

export interface ContextStore {
  get(token: string): SyncedUserContext | undefined;
  set(token: string, context: SyncedUserContext): void;
  delete(token: string): void;
  has(token: string): boolean;
  keys(): IterableIterator<string>;
  size(): number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const ALIASES_FILE = "aliases.json";

function safeName(token: string): string {
  return token.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

// Stable hash so two distinct tokens that sanitize to the same name still get
// unique files (e.g. "a/b" and "a_b" must not overwrite each other).
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
      const files = fs.readdirSync(this.dataDir).filter((f) => f.endsWith(".json") && f !== ALIASES_FILE);
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(this.dataDir, file), "utf-8");
          const ctx: SyncedUserContext = JSON.parse(raw);
          if (ctx && ctx.pairingToken) {
            this.cache.set(ctx.pairingToken, ctx);
            this.cache.set(ctx.pairingToken.toLowerCase(), ctx);
          }
        } catch {
          // skip corrupt files
        }
      }
      // Load alias map (aliasToken -> canonicalToken)
      try {
        const aliasPath = path.join(this.dataDir, ALIASES_FILE);
        if (fs.existsSync(aliasPath)) {
          const raw = fs.readFileSync(aliasPath, "utf-8");
          const parsed = JSON.parse(raw) as Record<string, string>;
          for (const [alias, canonical] of Object.entries(parsed)) {
            this.aliases.set(alias.toLowerCase(), canonical);
          }
        }
      } catch {
        // ignore unreadable alias map
      }
    } catch {
      // directory doesn't exist or can't be read; start empty
    }
  }

  private writeJson(filePath: string, obj: unknown): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      // Atomic write: serialize to a temp file then rename into place.
      const tmpPath = `${filePath}.tmp-${process.pid}`;
      fs.writeFileSync(tmpPath, JSON.stringify(obj, null, 2), "utf-8");
      fs.renameSync(tmpPath, filePath);
    } catch {
      // best-effort; don't crash on disk errors
    }
  }

  private persistAliases(): void {
    try {
      const aliasPath = path.join(this.dataDir, ALIASES_FILE);
      this.writeJson(aliasPath, Object.fromEntries(this.aliases));
    } catch {
      // best-effort
    }
  }

  private registerAlias(token: string, canonical: string): void {
    if (token.toLowerCase() !== canonical.toLowerCase()) {
      this.aliases.set(token.toLowerCase(), canonical);
      this.persistAliases();
    }
  }

  private resolveAlias(token: string): SyncedUserContext | undefined {
    const canonical = this.aliases.get(token.toLowerCase());
    if (!canonical) return undefined;
    return this.cache.get(canonical) || this.cache.get(canonical.toLowerCase());
  }

  get(token: string): SyncedUserContext | undefined {
    return this.cache.get(token) || this.cache.get(token.toLowerCase()) || this.resolveAlias(token);
  }

  set(token: string, context: SyncedUserContext): void {
    const canonical = context.pairingToken;
    this.cache.set(canonical, context);
    this.cache.set(canonical.toLowerCase(), context);
    // Persist the canonical context once, under a name derived from the canonical token.
    this.writeJson(path.join(this.dataDir, canonicalFilename(canonical)), context);
    // Register the key used by the caller as an alias (covers email/userId/lowercase lookups).
    this.registerAlias(token, canonical);
  }

  delete(token: string): void {
    const lower = token.toLowerCase();
    const direct = this.cache.get(token) || this.cache.get(lower);
    const canonical = direct ? direct.pairingToken : this.aliases.get(lower) || null;

    if (canonical) {
      this.cache.delete(canonical);
      this.cache.delete(canonical.toLowerCase());
      this.aliases.delete(canonical.toLowerCase());
      try {
        const filePath = path.join(this.dataDir, canonicalFilename(canonical));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        // best-effort
      }
    }

    this.cache.delete(token);
    this.cache.delete(lower);
    this.aliases.delete(lower);
    this.persistAliases();
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
