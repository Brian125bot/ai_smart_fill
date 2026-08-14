import React, { useState, useEffect } from "react";
import { Lock, Sparkles, Shield, UserCheck, Layers, FileText, Zap } from "lucide-react";
import { auth, googleProvider, signInWithPopup, onAuthStateChanged, User } from "../lib/firebase";

interface ProtectedRouteProps {
  children: React.ReactNode;
  featureName?: string;
  featureDescription?: string;
}

export function ProtectedRoute({
  children,
  featureName = "this feature",
  featureDescription = "Sign in to access your persona profiles, document grounding context, and interactive playground.",
}: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Authentication error:", err);
      setError(err?.message || "Failed to complete Google Sign In. Please try again.");
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center backdrop-blur-sm flex flex-col items-center justify-center min-h-[360px]">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center animate-pulse">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center animate-spin">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
        </div>
        <h3 className="text-base font-semibold text-slate-200">Verifying Authentication...</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">Checking your secure Firebase session token</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-8 sm:p-12 text-center backdrop-blur-md shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-xl mx-auto flex flex-col items-center relative z-10">
          {/* Header Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 p-0.5 shadow-xl shadow-blue-500/20 mb-6 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-blue-400">
              <Lock className="w-7 h-7 text-blue-400 animate-pulse" />
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/60 mb-3">
            <Shield className="w-3.5 h-3.5" />
            Protected Feature
          </span>

          <h2 className="text-2xl font-bold text-slate-100 tracking-tight mb-2">
            Authentication Required for {featureName}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-8">
            {featureDescription}
          </p>

          {/* Value props preview grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left mb-8">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-semibold text-slate-200">Multi-Persona Profiles</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Manage distinct identities with unique system prompts and custom Q&As.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-semibold text-slate-200">PDF & Drive Grounding</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Attach resumes or documentation synced directly to your cloud account.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-semibold text-slate-200">Live Form Autofill</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Test sub-second batch autofill and extension pairing in real time.
              </p>
            </div>
          </div>

          {/* Error message if any */}
          {error && (
            <div className="w-full mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs text-left">
              {error}
            </div>
          )}

          {/* Primary Action Button */}
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full sm:w-auto min-w-[240px] px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {signingIn ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in with Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-500">
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secured via Firebase Authentication & Zero-Trust Cloud Sync</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
