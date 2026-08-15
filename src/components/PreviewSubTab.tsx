import { Eye } from "lucide-react";
import { PersonaProfile } from "../types";

interface PreviewSubTabProps {
  activeProfile: PersonaProfile;
}

export function PreviewSubTab({ activeProfile }: PreviewSubTabProps) {
  const previewText = `--- ACTIVE PERSONA: ${activeProfile.name} (${activeProfile.id}) ---

--- SYSTEM INSTRUCTION ---
${activeProfile.systemInstruction}

--- USER STRUCTURED PROFILE ---
Full Name: ${activeProfile.profileFields.fullName || "N/A"}
Title: ${activeProfile.profileFields.jobTitle || "N/A"}
Email: ${activeProfile.profileFields.email || "N/A"} | Phone: ${activeProfile.profileFields.phone || "N/A"}
Location: ${activeProfile.profileFields.location || "N/A"}
Experience: ${activeProfile.profileFields.yearsOfExperience || "N/A"}
Education: ${activeProfile.profileFields.education || "N/A"}
Skills: ${activeProfile.profileFields.coreSkills || "N/A"}
Portfolio: ${activeProfile.profileFields.portfolioUrl || "N/A"} | LinkedIn: ${activeProfile.profileFields.linkedinUrl || "N/A"}
Bio: ${activeProfile.profileFields.bioSummary || "N/A"}

--- PRESET Q&A REPOSITORY ---
${(activeProfile.profileFields.customQAs || [])
  .map((qa, i) => `${i + 1}. Q: ${qa.question}\n   A: ${qa.answer}`)
  .join("\n\n")}

--- ATTACHED GROUNDING DOCUMENT ---
${
  activeProfile.pdfFile
    ? `[Document: ${activeProfile.pdfFile.name} (${(activeProfile.pdfFile.size / 1024).toFixed(
        1
      )} KB)]`
    : activeProfile.textContext
      ? `[Text Context: ${activeProfile.textContext.slice(0, 200)}...]`
      : "[None attached]"
}`;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400" />
              <span>Assembled Context Inspector ({activeProfile.name})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Full synthesized prompt payload sent during extension single-field and batch fills.
            </p>
          </div>
        </div>

        <pre className="p-5 rounded-2xl bg-slate-950 border border-slate-800/90 text-slate-300 font-mono text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap max-h-[500px]">
          {previewText}
        </pre>
      </div>
    </div>
  );
}
