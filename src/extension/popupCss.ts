export const POPUP_CSS = `/* Modern High-Density Dark Theme for Extension Popup */
:root {
  --bg-main: #090d16;
  --bg-card: #111827;
  --bg-input: #1a2234;
  --border: #2d3748;
  --border-focus: #3b82f6;
  --text-main: #f3f4f6;
  --text-muted: #9ca3af;
  --text-dim: #6b7280;
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 380px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg-main);
  color: var(--text-main);
  font-size: 12px;
  line-height: 1.5;
  overflow-x: hidden;
}

.popup-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.logo-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gemini-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}

.title {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.subtitle {
  font-size: 10px;
  color: var(--text-muted);
}

.status-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-idle {
  background-color: rgba(107, 114, 128, 0.2);
  color: var(--text-muted);
  border: 1px solid rgba(107, 114, 128, 0.3);
}

.status-success {
  background-color: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.status-error {
  background-color: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

/* Content */
.content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dashboard-sync-card {
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.9) 100%);
  border: 1px solid #1e40af;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sync-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sync-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #93c5fd;
}

.sync-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background-color: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sync-btn:hover {
  background-color: #1d4ed8;
}

.sync-status-badge {
  font-size: 10px;
  color: #94a3b8;
  padding: 3px 6px;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 6px;
  border: 1px solid #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-main);
}

.required {
  color: #f87171;
  font-weight: bold;
}

.optional {
  font-size: 10px;
  font-weight: normal;
  color: var(--text-dim);
}

.input-control {
  width: 100%;
  padding: 8px 10px;
  background-color: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-main);
  font-size: 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-control:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.textarea-control {
  resize: vertical;
  min-height: 52px;
}

.input-with-action {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-action .input-control {
  padding-right: 32px;
}

.icon-button {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.icon-button:hover {
  color: var(--text-main);
}

.help-text {
  font-size: 10px;
  color: var(--text-dim);
}

.divider {
  height: 1px;
  background-color: var(--border);
  margin: 4px 0;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

/* Toggle Switch */
.toggle-group {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.toggle-text {
  display: flex;
  flex-direction: column;
}

.toggle-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-main);
}

.toggle-desc {
  font-size: 10px;
  color: var(--text-dim);
}

.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border);
  transition: 0.2s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
}

input:checked + .slider {
  background-color: var(--primary);
}

input:checked + .slider:before {
  transform: translateX(16px);
}

.slider.round {
  border-radius: 20px;
}

.slider.round:before {
  border-radius: 50%;
}

/* PDF Upload Box */
.pdf-upload-box {
  border: 1px dashed var(--border);
  border-radius: 6px;
  background-color: var(--bg-card);
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s, transform 0.15s ease;
}

.pdf-upload-box:hover {
  border-color: var(--border-focus);
  background-color: rgba(37, 99, 235, 0.05);
}

.pdf-upload-box.dragover {
  border-color: #3b82f6;
  background-color: rgba(59, 130, 246, 0.15);
  transform: scale(1.01);
}

.hidden-file-input {
  display: none;
}

.pdf-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 11px;
}

.pdf-active-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pdf-file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  overflow: hidden;
}

.pdf-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pdf-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.pdf-size {
  font-size: 10px;
  color: var(--text-dim);
}

.remove-pdf-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  font-size: 14px;
}

.remove-pdf-btn:hover {
  color: #f87171;
}

/* Footer Buttons */
.footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-top: 6px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background-color: var(--primary);
  color: #ffffff;
}

.btn-primary:hover {
  background-color: var(--primary-hover);
}

.btn-secondary {
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-main);
}

.btn-secondary:hover {
  background-color: var(--bg-input);
  border-color: var(--text-muted);
}

.trigger-container {
  padding-top: 2px;
}

.btn-trigger {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #10b981 0%, #0d9488 100%);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-trigger:hover {
  background: linear-gradient(135deg, #059669 0%, #0f766e 100%);
  transform: translateY(-1px);
}

.btn-stop {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-stop:hover {
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
  transform: translateY(-1px);
}

.btn-stop:active {
  transform: translateY(0);
}

/* Toast */
.toast {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  text-align: center;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
}

.toast-error {
  background-color: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #fca5a5;
}

.hidden {
  display: none !important;
}
`;
