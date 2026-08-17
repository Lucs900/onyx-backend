import type { ExplorerScenario } from "@/components/products/scenario";

export const INTAKE_STORAGE_KEY = "onyx.foxIntake.draft";
export const FOX_PANEL_KEY = "onyx.fox.panelOpen";

export const FOX_DISCLOSURE =
  "Fox can assist and prepare. Fox cannot approve, lock, or commit to lend.";
export const TRUST_LINE =
  "NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.";
export const DRAFT_NOTE = "A draft is not a commitment to lend.";
export const ESTIMATE_NOTE = "Estimates only, not a commitment to lend.";
export const CONFIRMED_STATUS =
  "Application draft confirmed — pending licensed review";
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

export type ReceivedDoc = {
  slot: DocSlot;
  name: string;
  type: string;
  size: number;
  receivedAt: string;
};

export type IntakePhase = "context" | "documents" | "draft" | "confirmed";

export type SectionId =
  | "contact"
  | "scenario"
  | "occupancy"
  | "documents"
  | "notes";

export type LoMark = "needs items" | "in review" | "contacting client";

export type FoxIntakeDraft = {
  version: 1;
  phase: IntakePhase;
  contact: {
    fullName: DraftField;
    email: DraftField;
    phone: DraftField;
    preferredContact: DraftField;
  };
  scenario: ExplorerScenario | null;
  notes: string[];
  documents: ReceivedDoc[];
  documentsSkipped: boolean;
  preferredAsked: boolean;
  sections: Record<SectionId, boolean>;
  confirmedAt?: string;
  status?: typeof CONFIRMED_STATUS;
  loStatus?: LoMark;
  updatedAt: string;
};

export type FoxStage = "explore" | "scenario" | "results" | "intake";

export type FoxPrompt =
  | "name"
  | "email"
  | "phone"
  | "preferred"
  | "documents"
  | "review"
  | "done";

export type FoxAction = {
  id: string;
  label: string;
  href?: string;
  event?: "prepare-draft" | "skip-docs" | "open-docs" | "skip-preferred";
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
