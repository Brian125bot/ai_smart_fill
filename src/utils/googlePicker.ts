declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

export interface PickedFileResult {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  type: "pdf" | "text";
  data: string; // Base64 data URL for PDF, or string text for plain text
  description?: string;
  url?: string;
}

let isGapiLoading = false;
let gapiLoadedPromise: Promise<void> | null = null;

/**
 * Loads the Google API client script and initializes the 'picker' module.
 */
export function loadGooglePickerApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (window.google?.picker && window.gapi) {
    return Promise.resolve();
  }

  if (gapiLoadedPromise) {
    return gapiLoadedPromise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const checkGapi = () => {
      if (window.gapi) {
        window.gapi.load("picker", {
          callback: () => {
            resolve();
          },
          onerror: () => {
            reject(new Error("Failed to load Google Picker library."));
          },
        });
      } else {
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/api.js";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          window.gapi.load("picker", {
            callback: () => {
              resolve();
            },
            onerror: () => {
              reject(new Error("Failed to load Google Picker library after script injection."));
            },
          });
        };
        script.onerror = () => reject(new Error("Failed to load https://apis.google.com/js/api.js"));
        document.head.appendChild(script);
      }
    };

    checkGapi();
  });

  gapiLoadedPromise = promise;

  // If loading fails, clear the cached promise so callers can retry later.
  // Without this, every subsequent call returns the same rejected promise
  // permanently and the user can never recover without reloading the page.
  promise.catch(() => {
    // Only clear if this same promise is still cached (i.e. no fresh
    // successful load has replaced it). This keeps the door open for retry.
    if (gapiLoadedPromise === promise) {
      gapiLoadedPromise = null;
    }
  });

  return promise;
}

export interface OpenPickerOptions {
  accessToken: string;
  onPick: (doc: any) => void;
  onCancel?: () => void;
}

/**
 * Opens Google Picker dialog using OAuth Access Token
 */
export async function openGooglePicker({
  accessToken,
  onPick,
  onCancel,
}: OpenPickerOptions): Promise<void> {
  await loadGooglePickerApi();

  if (!window.google?.picker) {
    throw new Error("Google Picker API is not available.");
  }

  const pickerOrigin =
    window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
      ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
      : window.location.origin;

  const docsView = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(false);

  const pdfView = new window.google.picker.DocsView(window.google.picker.ViewId.PDFS);

  const picker = new window.google.picker.PickerBuilder()
    .addView(docsView)
    .addView(pdfView)
    .setOAuthToken(accessToken)
    .setCallback((data: any) => {
      if (data.action === window.google.picker.Action.PICKED) {
        const doc = data.docs && data.docs[0];
        if (doc) {
          onPick(doc);
        }
      } else if (data.action === window.google.picker.Action.CANCEL) {
        if (onCancel) onCancel();
      }
    })
    .setOrigin(pickerOrigin)
    .setTitle("Select a Document or PDF for Grounding")
    .build();

  picker.setVisible(true);
}

/**
 * Fetches or exports the chosen Google Drive file to text or base64 PDF
 */
export async function fetchDriveFileContent(
  fileId: string,
  fileName: string,
  mimeType: string,
  accessToken: string
): Promise<PickedFileResult> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Case 1: Google Doc -> Export to Plain Text
  if (mimeType === "application/vnd.google-apps.document") {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    const res = await fetch(exportUrl, { headers });
    if (!res.ok) {
      throw new Error(`Failed to export Google Doc (HTTP ${res.status}): ${res.statusText}`);
    }
    const text = await res.text();
    return {
      id: fileId,
      name: fileName,
      mimeType: "text/plain",
      type: "text",
      data: text,
      sizeBytes: new Blob([text]).size,
    };
  }

  // Case 2: Google Sheets -> Export to CSV
  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
    const res = await fetch(exportUrl, { headers });
    if (!res.ok) {
      throw new Error(`Failed to export Google Sheet (HTTP ${res.status}): ${res.statusText}`);
    }
    const text = await res.text();
    return {
      id: fileId,
      name: fileName + ".csv",
      mimeType: "text/csv",
      type: "text",
      data: text,
      sizeBytes: new Blob([text]).size,
    };
  }

  // Case 3: Binary PDF Document -> Download and convert to Base64 Data URL for Gemini
  if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(downloadUrl, { headers });
    if (!res.ok) {
      throw new Error(`Failed to download PDF (HTTP ${res.status}): ${res.statusText}`);
    }
    const blob = await res.blob();
    const base64Data = await blobToBase64(blob);

    return {
      id: fileId,
      name: fileName,
      mimeType: "application/pdf",
      type: "pdf",
      data: base64Data,
      sizeBytes: blob.size,
    };
  }

  // Case 4: Text, Markdown, CSV, JSON -> Fetch as text
  if (
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("markdown") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md") ||
    fileName.endsWith(".json")
  ) {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(downloadUrl, { headers });
    if (!res.ok) {
      throw new Error(`Failed to download text file (HTTP ${res.status}): ${res.statusText}`);
    }
    const text = await res.text();
    return {
      id: fileId,
      name: fileName,
      mimeType: mimeType || "text/plain",
      type: "text",
      data: text,
      sizeBytes: new Blob([text]).size,
    };
  }

  // Case 5: Default binary fallback -> Convert to base64 PDF/Data URL
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, { headers });
  if (!res.ok) {
    throw new Error(`Failed to download file (HTTP ${res.status}): ${res.statusText}`);
  }
  const blob = await res.blob();
  const base64Data = await blobToBase64(blob);

  return {
    id: fileId,
    name: fileName,
    mimeType: mimeType || blob.type || "application/octet-stream",
    type: "pdf",
    data: base64Data,
    sizeBytes: blob.size,
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
