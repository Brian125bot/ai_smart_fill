import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from "../utils/googleAuth";
import {
  openGooglePicker,
  fetchDriveFileContent,
  PickedFileResult,
} from "../utils/googlePicker";
import {
  FolderSearch,
  FileText,
  FileUp,
  FileCheck2,
  LogOut,
  Loader2,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface GoogleDrivePickerProps {
  selectedDriveFile: PickedFileResult | null;
  onFileSelected: (file: PickedFileResult | null) => void;
  onLog?: (msg: string) => void;
}

export function GoogleDrivePicker({
  selectedDriveFile,
  onFileSelected,
  onLog,
}: GoogleDrivePickerProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isOpeningPicker, setIsOpeningPicker] = useState(false);
  const [isFetchingFile, setIsFetchingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const log = (msg: string) => {
    if (onLog) onLog(msg);
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, authToken) => {
        setUser(authUser);
        setToken(authToken);
        setError(null);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      log("Signing in with Google to enable Google Picker & Drive access...");
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        log(`Signed in as ${result.user.email}. OAuth access token cached in-memory.`);
      }
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      const msg = err.message || "Google sign in was cancelled or failed.";
      setError(msg);
      log(`Google sign in failed: ${msg}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      onFileSelected(null);
      log("Signed out of Google account.");
    } catch (err: any) {
      console.error("Logout error:", err);
    }
  };

  const handleLaunchPicker = async () => {
    setError(null);
    let activeToken = token;
    if (!activeToken) {
      activeToken = await getAccessToken();
    }

    if (!activeToken) {
      setError("Please sign in with Google first to access your Google Drive.");
      return;
    }

    setIsOpeningPicker(true);
    log("Opening Google Picker modal to browse Google Drive...");

    try {
      await openGooglePicker({
        accessToken: activeToken,
        onPick: async (doc: any) => {
          setIsOpeningPicker(false);
          setIsFetchingFile(true);
          const fileId = doc.id;
          const fileName = doc.name;
          const mimeType = doc.mimeType;

          log(`Selected "${fileName}" from Google Drive (ID: ${fileId}, MIME: ${mimeType})`);

          try {
            const fetched = await fetchDriveFileContent(
              fileId,
              fileName,
              mimeType,
              activeToken!
            );
            onFileSelected(fetched);
            log(
              `✅ Successfully fetched "${fileName}" (${fetched.type.toUpperCase()}) from Google Drive for grounding!`
            );
          } catch (fetchErr: any) {
            console.error("Fetch Drive file error:", fetchErr);
            setError(`Failed to read file from Drive: ${fetchErr.message}`);
            log(`❌ Error reading "${fileName}": ${fetchErr.message}`);
          } finally {
            setIsFetchingFile(false);
          }
        },
        onCancel: () => {
          setIsOpeningPicker(false);
          log("Google Picker closed.");
        },
      });
    } catch (pickerErr: any) {
      console.error("Picker error:", pickerErr);
      setError(pickerErr.message || "Could not launch Google Picker.");
      setIsOpeningPicker(false);
      log(`Picker error: ${pickerErr.message}`);
    }
  };

  return (
    <div className="space-y-3">
      {/* Error alert */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-200 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Auth state container */}
      {!user ? (
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-indigo-400">
            <FolderSearch className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">
              Connect Google Drive & Google Picker
            </div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
              Sign in with your Google account to select PDF resumes, Google Docs, or text files directly from your Drive for context grounding.
            </p>
          </div>

          <div className="pt-1 flex justify-center">
            {/* Official Google Material Sign-In Button as mandated */}
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="gsi-material-button shadow-md"
              type="button"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: "block" }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isLoggingIn ? "Signing in..." : "Sign in with Google"}
                </span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* Signed In view */
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          {/* User info bar */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-7 h-7 rounded-full border border-slate-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.email ? user.email[0].toUpperCase() : "U"}
                </div>
              )}
              <div className="leading-tight">
                <div className="text-xs font-semibold text-slate-200">
                  {user.displayName || user.email}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {user.email}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-slate-800/50"
              title="Sign out of Google"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign out</span>
            </button>
          </div>

          {/* Active Picked File Card OR Action to Pick */}
          {selectedDriveFile ? (
            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-xs text-blue-200">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  <span className="truncate max-w-[200px]" title={selectedDriveFile.name}>
                    {selectedDriveFile.name}
                  </span>
                </div>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono border border-blue-700/50">
                  {selectedDriveFile.type === "pdf" ? "PDF Doc" : "Plain Text"}
                </span>
              </div>

              <div className="text-[11px] text-slate-300 flex items-center justify-between">
                <span>
                  {selectedDriveFile.sizeBytes
                    ? `${(selectedDriveFile.sizeBytes / 1024).toFixed(1)} KB`
                    : "Extracted document"}
                </span>
                <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Active Grounding Context</span>
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-blue-900/40">
                <button
                  onClick={handleLaunchPicker}
                  disabled={isOpeningPicker || isFetchingFile}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center justify-center gap-1.5"
                >
                  {isOpeningPicker || isFetchingFile ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  ) : (
                    <FolderSearch className="w-3.5 h-3.5 text-blue-400" />
                  )}
                  <span>Change File via Google Picker</span>
                </button>
                <button
                  onClick={() => onFileSelected(null)}
                  className="py-1.5 px-2.5 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800/40 transition"
                  title="Remove selected file"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={handleLaunchPicker}
                disabled={isOpeningPicker || isFetchingFile}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-blue-600/25 transition flex items-center justify-center gap-2"
              >
                {isOpeningPicker || isFetchingFile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {isFetchingFile ? "Fetching Document from Drive..." : "Launching Google Picker..."}
                    </span>
                  </>
                ) : (
                  <>
                    <FolderSearch className="w-4 h-4" />
                    <span>Open Google Picker to Choose File from Drive</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-400 text-center">
                Supports PDFs, Google Docs (exported to text), Google Sheets (CSV), and Markdown.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
