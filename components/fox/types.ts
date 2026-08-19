import type { CreditRange, ExplorerScenario } from "@/components/products/scenario";

export const INTAKE_STORAGE_KEY = "onyx.foxIntake.draft";
export const FOX_PANEL_KEY = "onyx.fox.panelOpen";
export const FOX_LEGAL_KEY = "onyx.fox.sawLegal";

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

export type WorkspaceDraftStatus = "preparing" | "ready" | "with-originator";

export type SectionId =
  | "contact"
  | "scenario"
  | "occupancy"
  | "income"
  | "documents"
  | "notes";

export type LoMark = "needs items" | "in review" | "contacting client";

export type IncomeType = "w2" | "self-employed" | "both" | "other";

export type IntakePath = "acr" | "loan-only";

export type ProductIntent = "buy" | "refinance" | "heloc" | "jumbo" | "other";

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
  path?: IntakePath;
  productIntent?: ProductIntent;
  loanAmountValue?: number;
  propertyValueAmount?: number;
  amountAsked?: boolean;
  valueAsked?: boolean;
  creditBand?: CreditRange;
  creditAsked?: boolean;
  incomeAsked?: boolean;
  docsOpen?: boolean;
  originatorRequested?: boolean;
  termYears?: number;
  termAsked?: boolean;
  workspaceFlow?: boolean;
  workspaceDraftStatus?: WorkspaceDraftStatus;
  sampleAccepted?: boolean;
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

export type FoxStage =
  | "home"
  | "acr"
  | "explore"
  | "scenario"
  | "results"
  | "intake"
  | "start";

export type FoxPrompt =
  | "intent"
  | "product"
  | "amount"
  | "value"
  | "credit"
  | "term"
  | "preparing"
  | "basics-done"
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
  | "path-switch"
  | "done";

export type Capture =
  | { field: "fullName" | "email" | "phone" | "preferredContact"; value: string }
  | { field: "preferred-asked"; value: string }
  | { field: "incomeType"; value: string }
  | { field: "occupancy"; value: string }
  | { field: "timeline"; value: string }
  | { field: "path"; value: IntakePath }
  | { field: "productIntent"; value: ProductIntent }
  | { field: "loanAmount"; value: string }
  | { field: "propertyValue"; value: string }
  | { field: "creditRange"; value: string }
  | { field: "termYears"; value: string }
  | { field: "skip-amount" }
  | { field: "skip-value" }
  | { field: "skip-term" }
  | { field: "skip-docs" }
  | { field: "open-docs" }
  | { field: "confirm-draft" }
  | { field: "needs-correction" }
  | { field: "keep-path" }
  | { field: "what-acr" }
  | { field: "talk-originator" }
  | { field: "correct"; value: string }
  | { field: "note"; value: string };

export type FoxAction = {
  id: string;
  label: string;
  href?: string;
  event?: "prepare-draft" | "open-docs" | "bubble";
  capture?: Capture;
};

export type FoxMessageFact = {
  id: string;
  label: string;
  value: string;
  note?: string;
};

export type FoxMessage = {
  id: string;
  role: "fox" | "client" | "system";
  text: string;
  followUp?: string;
  facts?: FoxMessageFact[];
  actions?: FoxAction[];
  edit?: FoxPrompt;
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

export const PRODUCT_INTENT_BUBBLES = [
  { value: "buy", label: "Buy" },
  { value: "refinance", label: "Refinance" },
  { value: "heloc", label: "HELOC" },
  { value: "jumbo", label: "Jumbo" },
  { value: "other", label: "Other" },
] as const;

export const CREDIT_WORKSPACE_BUBBLES = [
  { value: "760+", label: "760+" },
  { value: "720-759", label: "720–759" },
  { value: "680-719", label: "680–719" },
  { value: "not-sure", label: "Not sure" },
] as const;

export const TERM_BUBBLES = [
  { value: "30", label: "30 year" },
  { value: "15", label: "15 year" },
  { value: "", label: "Skip for now" },
] as const;

export const AMOUNT_HELPER_BUBBLES = [
  { id: "not-sure", label: "Not sure" },
  { id: "skip", label: "Skip for now" },
] as const;
