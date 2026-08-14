import { useState, useEffect } from "react";
import { Sparkles, Download, CheckCircle2, AlertCircle, RefreshCw, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { downloadExtensionZip } from "../utils/zipGenerator";
import { AVAILABLE_GEMINI_MODELS } from "../types";
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

interface HealthData {
  status: string;
  model: string;
  authRequired: boolean;
  appUrl: string | null;
  timestamp: string;
}

interface HeaderProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
  selectedModel?: string;
}

export function Header({ onTabChange, activeTab, selectedModel }: HeaderProps) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync user doc to Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || '',
          photoURL: currentUser.photoURL || '',
          createdAt: serverTimestamp(),
        }, { merge: true }).catch((err) => {
          try {
            handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
          } catch {
            // Suppress unhandled promise rejection in console
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Sign-in error:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Sign-out error:", err);
    }
  };

  const currentModelId = selectedModel || health?.model || "gemini-3.7-flash";
  const modelMeta = AVAILABLE_GEMINI_MODELS.find((m) => m.id === currentModelId);
  const displayModelName = modelMeta ? modelMeta.name : currentModelId;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadExtensionZip();
    } catch (e) {
      console.error("Download failed:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-slate-100 text-lg leading-tight tracking-tight">
                  Gemini Form Autofill
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/60">
                  Manifest V3
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Server-Side Gemini API & Chrome Extension Suite
              </p>
            </div>
          </div>

          {/* Mobile Download button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-md shadow-blue-600/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? "Zipping..." : ".ZIP"}</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => onTabChange("playground")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "playground"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            Form Playground & API
          </button>
          <button
            onClick={() => onTabChange("extension-files")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "extension-files"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            Extension Source Files
          </button>
          <button
            onClick={() => onTabChange("install-guide")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "install-guide"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            Chrome Setup Guide
          </button>
        </nav>

        {/* Backend Status & Download CTA */}
        <div className="hidden md:flex items-center gap-3">
          {/* Active Model & Health Pill */}
          <div
            onClick={fetchHealth}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs cursor-pointer hover:bg-slate-800 transition"
            title="Active Gemini Model • Click to refresh server status"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            ) : health?.status === "ok" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            )}
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-slate-200 font-semibold">{displayModelName}</span>
              {modelMeta && (
                <span className={`text-[9px] px-1 py-0.2 rounded border font-sans ${modelMeta.badgeColor}`}>
                  {modelMeta.version}
                </span>
              )}
            </div>
            {health?.authRequired && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Bearer Auth
              </span>
            )}
          </div>

          {/* Download Zip CTA */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? "Packaging..." : ".ZIP"}</span>
          </button>

          {/* Firebase Auth Google Sign In / User Profile */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-7 h-7 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {user.email?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <div className="hidden lg:block text-left text-xs">
                <div className="text-slate-200 font-medium truncate max-w-[100px]">
                  {user.displayName || user.email?.split("@")[0]}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">Synced</div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 hover:text-white text-xs font-medium transition shadow-sm disabled:opacity-50"
              title="Sign in with Google via Firebase Auth"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-400" />
              <span>{authLoading ? "Signing in..." : "Google Sign In"}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
