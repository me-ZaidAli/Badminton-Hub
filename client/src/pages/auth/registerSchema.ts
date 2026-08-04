import { z } from "zod";

export const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  nickname: z.string().optional(),
  showPublicName: z.boolean().default(false),
  username: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phoneCountryCode: z.string().default("+44__0"),
  phoneNumber: z.string().optional().refine(
    (val) => {
      if (!val || val.trim() === "") return true;
      if (!/^[\d\s\-().]+$/.test(val)) return false;
      const digits = val.replace(/\D/g, "");
      return digits.length >= 5 && digits.length <= 15;
    },
    { message: "Please enter a valid phone number (5–15 digits, digits and spaces only)" }
  ).refine(
    (val) => {
      if (!val || val.trim() === "") return true;
      return !val.trimStart().startsWith("0");
    },
    { message: "Do not include a leading zero — the country code covers it" }
  ),
  dateOfBirth: z.string().optional(),
  isJunior: z.boolean().default(false),
  parentGuardianName: z.string().optional(),
  parentGuardianEmail: z.string().optional(),
  acquisitionSource: z.string().min(1, "Please tell us how you heard about us"),
  acquisitionSourceOther: z.string().optional(),
  isTrialPlayer: z.boolean().default(false),
  trialClubId: z.string().optional(),
  selfAssessedLevel: z.string().optional(),
  trialExperience: z.string().optional(),
  preferredDays: z.array(z.string()).default([]),
  joinClubIds: z.array(z.number()).default([]),
  confirmAccurate: z.boolean().refine(val => val === true, { message: "You must confirm your information is accurate" }),
  acceptTerms: z.boolean().refine(val => val === true, { message: "You must agree to the Terms & Conditions" }),
  acceptPrivacy: z.boolean().refine(val => val === true, { message: "You must agree to the Privacy Policy" }),
  parentalConsent: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.isTrialPlayer) {
      return !!data.trialClubId && data.trialClubId.length > 0;
    }
    return true;
  },
  { message: "Please select a club for your trial", path: ["trialClubId"] }
).refine(
  (data) => {
    if (data.isTrialPlayer) {
      return !!data.selfAssessedLevel && data.selfAssessedLevel.length > 0;
    }
    return true;
  },
  { message: "Please select your skill level", path: ["selfAssessedLevel"] }
).refine(
  (data) => {
    if (data.isJunior) {
      return !!data.parentGuardianName && data.parentGuardianName.length >= 2;
    }
    return true;
  },
  { message: "Parent/guardian name is required for junior accounts", path: ["parentGuardianName"] }
).refine(
  (data) => {
    if (data.isJunior) {
      return !!data.parentGuardianEmail && data.parentGuardianEmail.includes("@");
    }
    return true;
  },
  { message: "A valid parent/guardian email is required for junior accounts", path: ["parentGuardianEmail"] }
).refine(
  (data) => {
    if (data.isJunior) {
      return data.parentalConsent === true;
    }
    return true;
  },
  { message: "Parental consent is required for junior accounts", path: ["parentalConsent"] }
).refine(
  (data) => {
    if (data.acquisitionSource === "OTHER") {
      return !!data.acquisitionSourceOther && data.acquisitionSourceOther.trim().length > 0;
    }
    return true;
  },
  { message: "Please tell us how you heard about us", path: ["acquisitionSourceOther"] }
);

export type RegisterFormValues = z.infer<typeof formSchema>;
