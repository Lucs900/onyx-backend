import type { ExplorerScenario } from "@/components/products/scenario";

export const INTAKE_STORAGE_KEY = "onyx.foxIntake.draft";
export const FOX_PANEL_KEY = "onyx.fox.panelOpen";

export const FOX_DISCLOSURE =
  "ONYX Fox can assist and prepare. It cannot approve, lock, or commit to lend.";
export const TRUST_LINE =
  "NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.";
export const DRAFT_NOTE = "A draft is not a commitment to lend.";
export const ESTIMATE_NOTE = "Estimates only, not a commitment to lend.";
export const CONFIRMED_STATUS = "Draft confirmed — pending licensed review";
export const ORIGINATOR_REQUEST = "Need a licensed originator?";
export const ORIGINATOR_REVIEW = "A licensed originator will review this.";

export type FieldSource = "client" | "scenario" | "extracted-unconfirmed";

export type DraftField = {
  field: string;
  value: string;
  source: FieldSource;
  confirmed: boolean;
  confirmedAt?: string;
};

export type DocSlot = "paystubs" | "w2" | "bank" | "id" | "other";

export type DocStatus =
  | "received"
  | "reading"
  | "extracted"
  | "needs better copy"
  | "failed";

export type ReceivedDoc = {
  slot: DocSlot;
  name: string;
  type: string;
  size: number;
  receivedAt: string;
  status: DocStatus;
  note?: string;
};

export type IntakePhase = "context" | "documents" | "draft" | "confirmed";

export type SectionId =
  | "contact"
  | "scenario"
  | "occupancy"
  | "income"
  | "documents"
  | "notes";

export type LoMark = "needs items" | "in review" | "contacting client";

export type IncomeType = "w2" | "self-employed" | "both" | "other";

export type FoxIntakeDraft = {
  version: 1;
  phase: IntakePhase;
  contact: {
    fullName: DraftField;
    email: DraftField;
    phone: DraftField;
    preferredContact: DraftField;
  };
  incomeType: DraftField;
  occupancyChoice: DraftField;
  timelineChoice: DraftField;
  occupancyAsked: boolean;
  timelineAsked: boolean;
  preferredAsked: boolean;
  correcting: FoxPrompt | null;
  scenario: ExplorerScenario | null;
  notes: string[];
  documents: ReceivedDoc[];
  documentsSkipped: boolean;
  sections: Record<SectionId, boolean>;
  confirmedAt?: string;
  status?: typeof CONFIRMED_STATUS;
  loStatus?: LoMark;
  previewSample?: boolean;
  updatedAt: string;
};

export type FoxStage = "explore" | "scenario" | "results" | "intake";

export type FoxPrompt =
  | "name"
  | "email"
  | "phone"
  | "preferred"
  | "income"
  | "occupancy"
  | "timeline"
  | "documents"
  | "review"
  | "correct"
  | "done";

export type Capture =
  | { field: "fullName" | "email" | "phone" | "preferredContact"; value: string }
  | { field: "preferred-asked"; value: string }
  | { field: "incomeType"; value: string }
  | { field: "occupancy"; value: string }
  | { field: "timeline"; value: string }
  | { field: "skip-docs" }
  | { field: "open-docs" }
  | { field: "confirm-draft" }
  | { field: "needs-correction" }
  | { field: "correct"; value: string }
  | { field: "note"; value: string };

export type FoxAction = {
  id: string;
  label: string;
  href?: string;
  event?: "prepare-draft" | "open-docs" | "bubble";
  capture?: Capture;
};

export type FoxMessage = {
  id: string;
  role: "fox" | "client";
  text: string;
  actions?: FoxAction[];
};

export const DOC_SLOTS: { id: DocSlot; label: string }[] = [
  { id: "paystubs", label: "Paystubs" },
  { id: "w2", label: "W-2" },
  { id: "bank", label: "Bank statements" },
  { id: "id", label: "ID" },
  { id: "other", label: "Other" },
];

export const INCOME_BUBBLES: { value: IncomeType; label: string }[] = [
  { value: "w2", label: "W-2" },
  { value: "self-employed", label: "Self-employed" },
  { value: "both", label: "Both" },
  { value: "other", label: "Other" },
];

export const OCCUPANCY_BUBBLES = [
  { value: "primary", label: "Primary" },
  { value: "second-home", label: "Second home" },
  { value: "investment", label: "Investment" },
] as const;

export const TIMELINE_BUBBLES = [
  { value: "ready-now", label: "Ready now" },
  { value: "30-90", label: "30–90 days" },
  { value: "exploring", label: "Just exploring" },
] as const;
