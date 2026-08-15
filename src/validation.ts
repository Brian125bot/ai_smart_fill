import { z } from "zod";

export const GeminiContextSchema = z.object({
  type: z.enum(["text", "pdf"]),
  data: z.string().min(1),
  mimeType: z.string().optional(),
});

export const UserProfileFieldsSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  jobTitle: z.string().optional(),
  yearsOfExperience: z.string().optional(),
  education: z.string().optional(),
  coreSkills: z.string().optional(),
  portfolioUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  bioSummary: z.string().optional(),
  customQAs: z
    .array(
      z.object({
        id: z.string().optional(),
        question: z.string(),
        answer: z.string(),
      })
    )
    .optional(),
});

export const PersonaProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  isDefault: z.boolean().optional(),
  systemInstruction: z.string().optional(),
  selectedModel: z.string().optional(),
  usePageContext: z.boolean().optional(),
  tone: z.enum(["professional", "conversational", "formal"]).optional(),
  lengthStrategy: z.enum(["concise", "balanced", "fill_limit"]).optional(),
  profileFields: UserProfileFieldsSchema.optional(),
  pdfFile: z
    .object({
      name: z.string(),
      size: z.number(),
      mimeType: z.string(),
      base64: z.string(),
    })
    .nullable()
    .optional(),
  textContext: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const AnswerQuestionSchema = z
  .object({
    question: z.string().trim().min(1),
    context: GeminiContextSchema.nullable().optional(),
    systemInstruction: z.string().nullable().optional(),
    model: z.string().nullable().optional(),
    userId: z.string().nullable().optional(),
    pairingToken: z.string().nullable().optional(),
    userProfile: UserProfileFieldsSchema.nullable().optional(),
  })
  .strict();

export const BatchFormFieldSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  type: z.string().optional(),
  question: z.string(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  maxLength: z.number().optional(),
  required: z.boolean().optional(),
  tagName: z.string().optional(),
  rows: z.number().optional(),
});

export const PageContextSchema = z.object({
  url: z.string().optional(),
  title: z.string().optional(),
  headings: z.array(z.string()).optional(),
});

export const BatchAnswerFormSchema = z
  .object({
    fields: z.array(BatchFormFieldSchema).min(1),
    pageContext: PageContextSchema.nullable().optional(),
    context: GeminiContextSchema.nullable().optional(),
    systemInstruction: z.string().nullable().optional(),
    model: z.string().nullable().optional(),
    userProfile: UserProfileFieldsSchema.nullable().optional(),
    activeProfileId: z.string().nullable().optional(),
    pairingToken: z.string().nullable().optional(),
    userId: z.string().nullable().optional(),
  })
  .strict();

export const SyncProfileSchema = z
  .object({
    pairingToken: z.string().optional(),
    userId: z.string().optional(),
    uid: z.string().optional(),
    email: z.string().optional(),
    displayName: z.string().optional(),
    profiles: z.array(PersonaProfileSchema).optional(),
    activeProfileId: z.string().optional(),
    systemInstruction: z.string().optional(),
    selectedModel: z.string().optional(),
    usePageContext: z.boolean().optional(),
    profileFields: UserProfileFieldsSchema.optional(),
    userProfile: UserProfileFieldsSchema.optional(),
    pdfData: z.string().nullable().optional(),
    pdfFilePath: z.string().nullable().optional(),
    pdfName: z.string().nullable().optional(),
    pdfSize: z.number().nullable().optional(),
    pdfMimeType: z.string().nullable().optional(),
    textContext: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      Boolean(data.pairingToken) ||
      Boolean(data.userId) ||
      Boolean(data.uid) ||
      Boolean(data.email),
    {
      message: "At least one identifier (pairingToken, userId, uid, or email) is required.",
    }
  );

export const RememberAnswerSchema = z
  .object({
    pairingToken: z.string().trim().min(1),
    question: z.string().trim().min(1),
    answer: z.string().trim().min(1),
    profileId: z.string().optional(),
  })
  .strict();

export function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}

export type AnswerQuestionInput = z.infer<typeof AnswerQuestionSchema>;
export type BatchAnswerFormInput = z.infer<typeof BatchAnswerFormSchema>;
export type SyncProfileInput = z.infer<typeof SyncProfileSchema>;
export type RememberAnswerInput = z.infer<typeof RememberAnswerSchema>;
export type UserProfileFields = z.infer<typeof UserProfileFieldsSchema>;
export type PersonaProfile = z.infer<typeof PersonaProfileSchema>;
export type GeminiContext = z.infer<typeof GeminiContextSchema>;
export type BatchFormField = z.infer<typeof BatchFormFieldSchema>;
export type PageContext = z.infer<typeof PageContextSchema>;
