import JSZip from "jszip";
import { EXTENSION_FILES } from "../extensionSource";

/**
 * Generates canvas icon data for the extension icons (16px, 48px, 128px)
 */
function createIconBlob(size: number): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(new Blob([]));
      return;
    }

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#2563eb");
    grad.addColorStop(1, "#7c3aed");

    const radius = Math.max(2, Math.floor(size * 0.22));
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, radius);
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw central star / sparkle symbol
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size * 0.38;
    const innerR = size * 0.15;

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    canvas.toBlob((blob) => {
      resolve(blob || new Blob([]));
    }, "image/png");
  });
}

/**
 * Builds the complete Chrome extension ZIP package (without triggering a download).
 * Icons are placed at the extension root to match manifest.json references.
 */
export async function buildExtensionZip(): Promise<JSZip> {
  const zip = new JSZip();

  // Add source files
  for (const file of EXTENSION_FILES) {
    zip.file(file.path, file.content);
  }

  // Generate and add icons at the extension root (manifest.json references them there)
  const iconSizes = [16, 48, 128];
  for (const size of iconSizes) {
    const iconBlob = await createIconBlob(size);
    zip.file(`icon${size}.png`, iconBlob);
  }

  return zip;
}

/**
 * Creates and triggers download of the complete Chrome extension ZIP package
 */
export async function downloadExtensionZip(): Promise<void> {
  const zip = await buildExtensionZip();

  // Generate ZIP blob and trigger browser download
  const content = await zip.generateAsync({ type: "blob" });
  const downloadUrl = URL.createObjectURL(content);

  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = "gemini-form-autofill-extension.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
