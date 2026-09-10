// Shared onboarding types used by client components and server actions.

export type EntityType = "SCHOOL" | "ORGANIZATION" | "EVENT";

export type AttendanceMethod = "MOBILE" | "WEB" | "QR_CODE" | "API";

export interface OnboardingData {
  // Step 1
  entityType?: EntityType;
  // Step 2
  name?: string;
  subtype?: string;
  sizeRange?: string;
  location?: string;
  // Step 3
  attendanceMethods?: AttendanceMethod[];
}

export interface OnboardingState {
  currentStep: number;
  data: OnboardingData;
  completed: boolean;
}

// ─── Terminology helpers ───────────────────────────────────────────────────────

export function getTerminology(entityType: EntityType | undefined) {
  switch (entityType) {
    case "SCHOOL":
      return {
        entityLabel: "School",
        nameLabel: "School name",
        namePlaceholder: "e.g. Riverside Academy",
        typeLabel: "School type",
        sizeLabel: "Number of students",
        typeOptions: [
          { value: "primary", label: "Primary" },
          { value: "secondary", label: "Secondary" },
          { value: "higher-institution", label: "Higher Institution" },
          { value: "other", label: "Other" },
        ],
        sizeOptions: [
          { value: "1-50", label: "Less than 50" },
          { value: "50-200", label: "50 – 200" },
          { value: "200-500", label: "200 – 500" },
          { value: "500+", label: "More than 500" },
        ],
        aboutHeading: "Tell us about your school.",
        methodsHeading: "How will your school take attendance?",
      };
    case "EVENT":
      return {
        entityLabel: "Event",
        nameLabel: "Event name",
        namePlaceholder: "e.g. Tech Summit 2026",
        typeLabel: "Event type",
        sizeLabel: "Expected attendees",
        typeOptions: [
          { value: "conference", label: "Conference" },
          { value: "workshop", label: "Workshop" },
          { value: "seminar", label: "Seminar" },
          { value: "other", label: "Other" },
        ],
        sizeOptions: [
          { value: "1-50", label: "Less than 50" },
          { value: "50-200", label: "50 – 200" },
          { value: "200-1000", label: "200 – 1,000" },
          { value: "1000+", label: "More than 1,000" },
        ],
        aboutHeading: "Tell us about your event.",
        methodsHeading: "How will attendees check in?",
      };
    default:
      // ORGANIZATION or undefined
      return {
        entityLabel: "Organization",
        nameLabel: "Organization name",
        namePlaceholder: "e.g. Acme Corp",
        typeLabel: "Organization type",
        sizeLabel: "Number of people",
        typeOptions: [
          { value: "company", label: "Company" },
          { value: "ngo", label: "NGO / Non-profit" },
          { value: "community", label: "Community" },
          { value: "other", label: "Other" },
        ],
        sizeOptions: [
          { value: "1-50", label: "Less than 50" },
          { value: "50-200", label: "50 – 200" },
          { value: "200-500", label: "200 – 500" },
          { value: "500+", label: "More than 500" },
        ],
        aboutHeading: "Tell us about your organization.",
        methodsHeading: "How will your organization take attendance?",
      };
  }
}
