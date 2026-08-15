export const CONTENT_CSS = `/* Gemini Form Autofill - Content Script Injected Styles */

.gemini-fab-container {
  position: fixed !important;
  bottom: 24px !important;
  right: 24px !important;
  z-index: 2147483640 !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
}

.gemini-fab {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%) !important;
  color: #ffffff !important;
  padding: 10px 18px !important;
  border-radius: 9999px !important;
  box-shadow: 0 4px 16px rgba(30, 64, 175, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.2) !important;
  cursor: pointer !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease !important;
  user-select: none !important;
}

.gemini-fab:hover {
  transform: translateY(-2px) scale(1.04) !important;
  box-shadow: 0 8px 24px rgba(30, 64, 175, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.35) !important;
}

.gemini-fab:active {
  transform: translateY(0) scale(0.98) !important;
}

.gemini-fab-icon {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.gemini-status-pill {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  background-color: #0f172a !important;
  color: #f8fafc !important;
  padding: 10px 16px !important;
  border-radius: 9999px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.3) !important;
  font-size: 12px !important;
  font-weight: 600 !important;
}

.gemini-spinner {
  width: 14px !important;
  height: 14px !important;
  border: 2px solid rgba(59, 130, 246, 0.3) !important;
  border-top-color: #60a5fa !important;
  border-radius: 50% !important;
  animation: gemini-spin 0.8s linear infinite !important;
}

@keyframes gemini-spin {
  to {
    transform: rotate(360deg);
  }
}

.gemini-highlight-active {
  outline: 2px solid #3b82f6 !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25) !important;
  transition: outline 0.2s, box-shadow 0.2s !important;
}

.gemini-highlight-success {
  outline: 2px solid #10b981 !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.3) !important;
  transition: outline 0.2s, box-shadow 0.2s !important;
}

.gemini-highlight-needs-review {
  outline: 2px solid #f59e0b !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.3) !important;
  transition: outline 0.2s, box-shadow 0.2s !important;
}

.gemini-page-toast {
  position: fixed !important;
  bottom: 80px !important;
  right: 24px !important;
  z-index: 2147483645 !important;
  padding: 12px 18px !important;
  border-radius: 12px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
  transition: opacity 0.3s, transform 0.3s !important;
}

.gemini-toast-success {
  background: linear-gradient(135deg, #065f46 0%, #047857 100%) !important;
  color: #ecfdf5 !important;
  border: 1px solid #10b981 !important;
}

.gemini-toast-error {
  background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%) !important;
  color: #fef2f2 !important;
  border: 1px solid #ef4444 !important;
}

.gemini-hidden {
  display: none !important;
}
`;
