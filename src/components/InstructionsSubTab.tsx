import { Sparkles, Cpu, Sliders } from "lucide-react";
import {
  AVAILABLE_GEMINI_MODELS,
  PersonaProfile,
  AnswerTone,
  AnswerLengthStrategy,
} from "../types";

interface InstructionsSubTabProps {
  activeProfile: PersonaProfile;
  updateActiveProfile: (updater: (prev: PersonaProfile) => PersonaProfile) => void;
}

export function InstructionsSubTab({
  activeProfile,
  updateActiveProfile,
}: InstructionsSubTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>System Instruction ({activeProfile.name})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Governs tone, technical emphasis, and phrasing when answering forms.
              </p>
            </div>
          </div>

          <textarea
            rows={6}
            value={activeProfile.systemInstruction}
            onChange={(e) =>
              updateActiveProfile((p) => ({ ...p, systemInstruction: e.target.value }))
            }
            className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
            placeholder="Enter system prompt for Gemini..."
          />
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>Preferred Gemini Model Architecture</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {AVAILABLE_GEMINI_MODELS.map((m) => (
              <div
                key={m.id}
                onClick={() => updateActiveProfile((p) => ({ ...p, selectedModel: m.id }))}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  activeProfile.selectedModel === m.id
                    ? "bg-blue-600/15 border-blue-500 ring-1 ring-blue-500"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-white">{m.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${m.badgeColor}`}>
                    {m.speed}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {m.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Answer Style</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Tone</label>
              <select
                value={activeProfile.tone || "professional"}
                onChange={(e) =>
                  updateActiveProfile((p) => ({ ...p, tone: e.target.value as AnswerTone }))
                }
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="professional">Professional</option>
                <option value="conversational">Conversational</option>
                <option value="formal">Formal</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Length Strategy
                <span className="text-slate-500 font-normal ml-1">(for open-ended questions)</span>
              </label>
              <select
                value={activeProfile.lengthStrategy || "balanced"}
                onChange={(e) =>
                  updateActiveProfile((p) => ({
                    ...p,
                    lengthStrategy: e.target.value as AnswerLengthStrategy,
                  }))
                }
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="concise">Concise (~30% of limit)</option>
                <option value="balanced">Balanced (~60-75% of limit)</option>
                <option value="fill_limit">Fill Limit (~90% of limit)</option>
              </select>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Tone and length apply to long-form fields (textareas, cover letters, descriptions).
            Short fields always use concise answers.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Persona Tips
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>
                Use <strong>first-person ("I am...", "My experience...")</strong> for job
                applications.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>
                Gemini 3.7 Flash supports batch reasoning for 20+ fields in under 1.5 seconds.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
