import fs from "fs";
import path from "path";

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

function tokenToFilename(token: string, dataDir: string): string {
  const safe = token.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  return path.join(dataDir, `${safe}.json`);
}

export class FileBackedContextStore implements ContextStore {
  private cache = new Map<string, SyncedUserContext>();
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
      const files = fs.readdirSync(this.dataDir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(this.dataDir, file), "utf-8");
          const ctx: SyncedUserContext = JSON.parse(raw);
          if (ctx && ctx.pairingToken) {
            this.cache.set(ctx.pairingToken, ctx);
          }
        } catch {
          // skip corrupt files
        }
      }
    } catch {
      // directory doesn't exist or can't be read; start empty
    }
  }

  private writeToFile(token: string, context: SyncedUserContext): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const filePath = tokenToFilename(token, this.dataDir);
      fs.writeFileSync(filePath, JSON.stringify(context, null, 2), "utf-8");
    } catch {
      // best-effort; don't crash on disk errors
    }
  }

  private deleteFile(token: string): void {
    try {
      const filePath = tokenToFilename(token, this.dataDir);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // best-effort
    }
  }

  get(token: string): SyncedUserContext | undefined {
    return this.cache.get(token) || this.cache.get(token.toLowerCase());
  }

  set(token: string, context: SyncedUserContext): void {
    this.cache.set(token, context);
    if (token.toLowerCase() !== token) {
      this.cache.set(token.toLowerCase(), context);
    }
    this.writeToFile(token, context);
  }

  delete(token: string): void {
    this.cache.delete(token);
    this.cache.delete(token.toLowerCase());
    this.deleteFile(token);
  }

  has(token: string): boolean {
    return this.cache.has(token) || this.cache.has(token.toLowerCase());
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  size(): number {
    return this.cache.size;
  }
}

export function createContextStore(dataDir?: string): ContextStore {
  return new FileBackedContextStore(dataDir);
}
