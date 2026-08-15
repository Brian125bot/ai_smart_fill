import React from "react";
import {
  User as UserIcon,
  Briefcase,
  Link as LinkIcon,
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import { PersonaProfile, CustomQA } from "../types";

interface ProfileSubTabProps {
  activeProfile: PersonaProfile;
  updateActiveProfile: (updater: (prev: PersonaProfile) => PersonaProfile) => void;
}

export function ProfileSubTab({ activeProfile, updateActiveProfile }: ProfileSubTabProps) {
  const handleAddCustomQA = () => {
    const newQA: CustomQA = {
      id: `qa-${Date.now()}`,
      question: "",
      answer: "",
    };
    updateActiveProfile((p) => ({
      ...p,
      profileFields: {
        ...p.profileFields,
        customQAs: [...(p.profileFields.customQAs || []), newQA],
      },
    }));
  };

  const handleUpdateCustomQA = (id: string, field: "question" | "answer", val: string) => {
    updateActiveProfile((p) => ({
      ...p,
      profileFields: {
        ...p.profileFields,
        customQAs: (p.profileFields.customQAs || []).map((item) =>
          item.id === id ? { ...item, [field]: val } : item
        ),
      },
    }));
  };

  const handleDeleteCustomQA = (id: string) => {
    updateActiveProfile((p) => ({
      ...p,
      profileFields: {
        ...p.profileFields,
        customQAs: (p.profileFields.customQAs || []).filter((item) => item.id !== id),
      },
    }));
  };

  const inputClasses =
    "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-blue-400" />
              <span>Personal Coordinates ({activeProfile.name})</span>
            </h3>
            <span className="text-[11px] text-slate-400">Used for basic form fields</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={activeProfile.profileFields.fullName || ""}
                onChange={(e) =>
                  updateActiveProfile((p) => ({
                    ...p,
                    profileFields: { ...p.profileFields, fullName: e.target.value },
                  }))
                }
                placeholder="e.g. Jane Doe"
                className={inputClasses}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Target / Current Job Title
              </label>
              <input
                type="text"
                value={activeProfile.profileFields.jobTitle || ""}
                onChange={(e) =>
                  updateActiveProfile((p) => ({
                    ...p,
                    profileFields: { ...p.profileFields, jobTitle: e.target.value },
                  }))
                }
                placeholder="e.g. Senior Cloud Engineer"
                className={inputClasses}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={activeProfile.profileFields.email || ""}
                onChange={(e) =>
                  updateActiveProfile((p) => ({
                    ...p,
                    profileFields: { ...p.profileFields, email: e.target.value },
                  }))
                }
                placeholder="e.g. jane@example.com"
                className={inputClasses}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                value={activeProfile.profileFields.phone || ""}
                onChange={(e) =>
                  updateActiveProfile((p) => ({
                    ...p,
                    profileFields: { ...p.profileFields, phone: e.target.value },
                  }))
                }
                placeholder="e.g. +1 (555) 019-2834"
                className={inputClasses}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Location / Current Address
              </label>
              <input
                type="text"
                value={activeProfile.profileFields.location || ""}
                onChange={(e) =>
                  updateActiveProfile((p) => ({
                    ...p,
                    profileFields: { ...p.profileFields, location: e.target.value },
                  }))
                }
                placeholder="e.g. San Francisco, CA, United States"
                className={inputClasses}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>Career & Academic History</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Years of Experience
              </label>
              <input
                type="text"
                value={activeProfile.profileFields.yearsOfExperience || ""}
                onChange={(e) =>
                  updateActiveProfile((p) => ({
                    ...p,
                    profileFields: { ...p.profileFields, yearsOfExperience: e.target.value },
                  }))
                }
                placeholder="e.g. 8+ years"
                className={inputClasses}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Education & Degrees
              </label>
              <input
                type="text"
                value={activeProfile.profileFields.education || ""}
                onChange={(e) =>
                  updateActiveProfile((p) => ({
                    ...p,
                    profileFields: { ...p.profileFields, education: e.target.value },
                  }))
                }
                placeholder="e.g. M.S. in Computer Science"
                className={inputClasses}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Core Skills & Key Technologies
              </label>
              <input
                type="text"
                value={activeProfile.profileFields.coreSkills || ""}
                onChange={(e) =>
                  updateActiveProfile((p) => ({
                    ...p,
                    profileFields: { ...p.profileFields, coreSkills: e.target.value },
                  }))
                }
                placeholder="e.g. TypeScript, React, Cloud Run, Python, SQL, Docker"
                className={inputClasses}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Executive Summary / Bio
              </label>
              <textarea
                rows={3}
                value={activeProfile.profileFields.bioSummary || ""}
                onChange={(e) =>
                  updateActiveProfile((p) => ({
                    ...p,
                    profileFields: { ...p.profileFields, bioSummary: e.target.value },
                  }))
                }
                placeholder="Brief 2-3 sentence overview of this persona..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>Persona Q&A Repository</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pre-saved answers for work authorization, salary, start date, relocation, etc.
              </p>
            </div>
            <button
              onClick={handleAddCustomQA}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          </div>

          <div className="space-y-3">
            {(activeProfile.profileFields.customQAs || []).map((qa, index) => (
              <div
                key={qa.id || index}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={qa.question}
                    onChange={(e) => handleUpdateCustomQA(qa.id, "question", e.target.value)}
                    placeholder="e.g. What is your notice period or earliest start date?"
                    className="flex-1 bg-transparent border-b border-slate-800 focus:border-purple-500 text-slate-200 text-xs font-medium pb-1 focus:outline-none"
                  />
                  <button
                    onClick={() => handleDeleteCustomQA(qa.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition"
                    title="Delete question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={qa.answer}
                  onChange={(e) => handleUpdateCustomQA(qa.id, "answer", e.target.value)}
                  placeholder="Your preferred answer for this question..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800/80 text-slate-200 text-xs focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-cyan-400" />
            <span>Web Presence</span>
          </h3>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={activeProfile.profileFields.linkedinUrl || ""}
                onChange={(e) =>
                  updateActiveProfile((p) => ({
                    ...p,
                    profileFields: { ...p.profileFields, linkedinUrl: e.target.value },
                  }))
                }
                placeholder="https://linkedin.com/in/..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                GitHub / Code Repository
              </label>
              <input
                type="url"
                value={activeProfile.profileFields.githubUrl || ""}
                onChange={(e) =>
                  updateActiveProfile((p) => ({
                    ...p,
                    profileFields: { ...p.profileFields, githubUrl: e.target.value },
                  }))
                }
                placeholder="https://github.com/..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Portfolio / Website
              </label>
              <input
                type="url"
                value={activeProfile.profileFields.portfolioUrl || ""}
                onChange={(e) =>
                  updateActiveProfile((p) => ({
                    ...p,
                    profileFields: { ...p.profileFields, portfolioUrl: e.target.value },
                  }))
                }
                placeholder="https://yourportfolio.dev"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-blue-950/30 border border-blue-900/50 space-y-3">
          <div className="flex items-center gap-2 text-blue-300 font-semibold text-xs">
            <Sparkles className="w-4 h-4" />
            <span>Multi-Profile Architecture</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            When you click "AutoFill Form" or "Batch Fill" in Chrome, the extension automatically
            injects the active persona profile (
            <strong className="text-white">{activeProfile.name}</strong>).
          </p>
        </div>
      </div>
    </div>
  );
}
