import type { CreditRange, ExplorerScenario } from "@/components/products/scenario";
import type { SafeCouponRow } from "@/lib/rateflow/quote";

export const INTAKE_STORAGE_KEY = "onyx.foxIntake.draft";
export const INTAKE_DRAFT_VERSION = 2;
export const FOX_PANEL_KEY = "onyx.fox.panelOpen";
export const FOX_LEGAL_KEY = "onyx.fox.sawLegal";
export const FOX_MESSAGES_KEY = "onyx.fox.messages";

export const FOX_DISCLOSURE =
  "ONYX Fox can assist and prepare. It cannot approve, lock, or commit to lend.";
export const TRUST_LINE =
  "NMLS [OPEN] · CA DRE [OPEN] · We are a mortgage broker.";
export const DRAFT_NOTE = "A draft is not a commitment to lend.";
export const ESTIMATE_NOTE = "Estimates only, not a commitment to lend.";
export const CONFIRMED_STATUS = "Draft confirmed — pending licensed review";
export const ORIGINATOR_REQUEST = "Need a licensed originator?";
export const ORIGINATOR_REVIEW = "A licensed originator will review this.";

export type FieldSource = "client" | "scenario" | "extracted-unconfirmed" | "document" | "suggested" | "computed";

export type DraftField = {
  field: string;
  value: string;
  source: FieldSource;
  confirmed: boolean;
  confirmedAt?: string;
};

export type DocSlot = "paystubs" | "w2" | "bank" | "id" | "other";

export type ExtractClass =
  | "government_id"
  | "paystub"
  | "w2"
  | "tax_return"
  | "bank_statement"
  | "purchase_contract"
  | "mortgage_statement"
  | "other";

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
  bytesRef?: string;
  extractClass?: ExtractClass;
  party?: "borrower" | "coborrower";
};

export type ProposalKind = "document" | "public" | "computed";

export type CompletenessState = "sketch" | "documented" | "agency_partial";

export type CompletenessGroup = "identity" | "property" | "loan" | "income" | "credit";

export type FactConflict = {
  field: string;
  fileValue: string;
  documentValue: string;
  label: string;
  kind?: ProposalKind;
};

export type IncomeParts = {
  wage?: string;
  scheduleC?: string;
  k1?: string;
};

export type FactWrite = {
  field: string;
  value: string;
  label: string;
};

export type FactProposal = {
  field: string;
  value: string;
  label: string;
  kind: ProposalKind;
  note?: string;
  methodNote?: string;
  caution?: string;
  partialNotes?: string[];
  companion?: FactWrite;
  extras?: FactWrite[];
  parts?: IncomeParts;
  hireLabel?: string;
};

export type IntakePhase = "context" | "documents" | "draft" | "confirmed";

export type WorkspaceDraftStatus = "preparing" | "ready" | "with-originator";

/** Borrower-facing file motion. Originator assigned is a Structure fact, not this status. */
export type FileMotion =
  | "confirmed"
  | "gathering"
  | "ready"
  | "in_queue"
  | "needs_you"
  | "waiting_out"
  | "on_hold"
  | "escalated";

export type FileNext = "You" | "Fox" | "ONYX" | "Outside";

export type WaitingOn = "borrower" | "fox" | "onyx" | "outside";

export type WorkItemKind = "review" | "exception" | "processing";

export type WorkItemState = "open" | "nudged" | "done" | "blocked" | "returned" | "closed";

export type WorkItemResult = {
  summary: string;
  factsChanged: string[];
  next: FileMotion;
  foxLine: string;
};

export type WorkItem = {
  id: string;
  kind: WorkItemKind;
  state: WorkItemState;
  openedAt: string;
  nudgedAt?: string;
  returnedAt?: string;
  slaHours?: number;
  nudgeCount?: number;
  note?: string;
  needsDoc?: boolean;
  result?: WorkItemResult;
};

export type ConditionNeeded = "doc" | "fact" | "signature" | "decision" | "outside_event";

export type FileConditionStatus = "open" | "satisfied" | "waived" | "stalled";

export type FileCondition = {
  id: string;
  title: string;
  foxLine: string;
  waitingOn: Exclude<WaitingOn, "fox">;
  needed: ConditionNeeded;
  status: FileConditionStatus;
  stillUseful: boolean;
};

export type FileEventActor = "fox" | "borrower" | "onyx";

export type FileEventKind =
  | "looks-right"
  | "proceed"
  | "not-yet"
  | "upload-more"
  | "skip-docs"
  | "request-human"
  | "nudge"
  | "return-to-fox"
  | "email"
  | "staff-export";

export type FileEvent = {
  id: string;
  at: string;
  kind: FileEventKind;
  text: string;
  actor?: FileEventActor;
  summary?: string;
  facts?: string[];
};

export type PreviewOutboxItem = {
  to: string;
  subject: string;
  body: string;
  createdAt: string;
};

export type PendingFinish = "proceed" | "not-yet";

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

export type JumboPurpose = "buy" | "refinance";

export type GovProgram = "fha" | "va" | "usda";

export type NamedCreditEvent = "bankruptcy" | "foreclosure";

export type ProductOffer = "jumbo" | "heloc";

export type FileExportFormat = "mapped_json" | "fnma_32";
export type FileExportStatus = "not_ready" | "gaps" | "ready" | "exported";

export type FileExportGap = {
  key: string;
  why: string;
};

export type FileExportMark = {
  format: FileExportFormat;
  status: "exported";
  downloadedAt: string;
};

/** One other-property row. Subject is never stored here. */
export type OtherReoRow = {
  id: string;
  occupancy?: string;
  address?: string;
  unpaidPrincipal?: string;
  payment?: string;
  pitia?: string;
  leaseGross?: string;
};

export type FoxIntakeDraft = {
  version: number;
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
  /** After a document lands, Looks right waits for the next idle beat. */
  looksRightHold?: boolean;
  /** Investment subject lease/rent was asked or skipped. Empty skip does not invent rent. */
  subjectLeaseAsked?: boolean;
  preferredAsked: boolean;
  correcting: FoxPrompt | null;
  correctingLine?: string | null;
  /** After a notepad Edit, return here once that one field is answered or skipped. */
  resumeAfterEdit?: FoxPrompt;
  scenario: ExplorerScenario | null;
  path?: IntakePath;
  productIntent?: ProductIntent;
  jumboPurpose?: JumboPurpose;
  jumboOffered?: boolean;
  helocOffered?: boolean;
  pendingOffer?: ProductOffer;
  outOfState?: boolean;
  govProgram?: GovProgram;
  creditEvent?: NamedCreditEvent;
  cashOut?: boolean;
  overPriceConfirmed?: boolean;
  loanAmountValue?: number;
  propertyValueAmount?: number;
  downPaymentAmount?: number;
  amountAsked?: boolean;
  valueAsked?: boolean;
  downAsked?: boolean;
  amountPurposeLabel?: string;
  /** Stated chip band (760+ / 720–739) or typed 3-digit score. Stated only. */
  creditBand?: string;
  creditAsked?: boolean;
  incomeAsked?: boolean;
  statedMonthlyDebts?: number;
  monthlyDebtsAsked?: boolean;
  estimatedHousing?: number;
  housingAsked?: boolean;
  statedDti?: number;
  rentalGrossMonthly?: number;
  rentalPitiaUsed?: number;
  suggestedNetRental?: number;
  rentalNetRole?: "income" | "liability" | "none" | "thin";
  rentalThinReason?: "housing" | "statement" | "primary";
  subordinateBalance?: number;
  hoaMonthly?: number;
  miApplies?: boolean;
  reservesNote?: "no_minimum_1unit_primary" | "reserves_review";
  largeDepositFlag?: boolean;
  giftFundsNoted?: boolean;
  debtMortgageAsked?: boolean;
  pendingDebtMortgage?: {
    included: number;
    mortgage: number;
  } | null;
  statedAvailableAssets?: number;
  availableAssetsAsked?: boolean;
  /** Late-walk bank-statement line after citizenship was skipped or written. */
  bankStatementAsked?: boolean;
  propertyType?: "sfr" | "condo" | "two_to_four";
  propertyTypeAsked?: boolean;
  /** Five-digit ZIP for Rateflow. Never invent 94115. */
  propertyZip?: string;
  propertyZipAsked?: boolean;
  /** Address ZIP we already offered in “Use this?”. Ask that later ZIP once. */
  addressZipOffered?: string;
  subjectAddress?: string;
  subjectAddressAsked?: boolean;
  /** Places / typed street waiting for Use this. Not File. Not Rateflow. */
  pendingAddress?: {
    line: string;
    street: string;
    city: string;
    state: "CA";
    zip: string;
    county?: string;
  };
  /** Places street only. Never invent. */
  subjectStreet?: string;
  subjectCity?: string;
  subjectState?: "CA";
  subjectCounty?: string;
  statedTimeOnJob?: number;
  /** Exact borrower-typed label. Do not invent "years" until guidelines own that. */
  statedTimeOnJobLabel?: string;
  timeOnJobAsked?: boolean;
  pendingHireDate?: { date: string; months: number; label: string } | null;
  statedCurrentHousing?: number;
  currentHousingAsked?: boolean;
  pendingCurrentHousing?: {
    amount: number;
    extras?: { field: string; value: string; label: string }[];
  } | null;
  statedDeclaration?: "none" | "event";
  declarationAsked?: boolean;
  declarationNote?: string;
  /** Year/month or best given (2019, March 2021, about 4 years). */
  declarationTiming?: string;
  declarationTimingAsked?: boolean;
  statedHousehold?: "alone" | "with_someone";
  householdAsked?: boolean;
  coborrowerName?: string;
  coborrowerNameAsked?: boolean;
  workingOnCoborrower?: boolean;
  coborrowerIdSkipped?: boolean;
  borrowerName?: string;
  borrowerNameAsked?: boolean;
  statedOtherReo?: "none" | "yes";
  otherReoAsked?: boolean;
  otherProperties?: OtherReoRow[];
  /** Other-property File net. Subject rental is never included. */
  suggestedFileNet?: number;
  fileNetRole?: "income" | "liability" | "none" | "thin";
  fileNetAsked?: boolean;
  skippedFileNet?: number;
  citizenshipAsked?: boolean;
  formerHistoryAsked?: boolean;
  formerEmploymentAsked?: boolean;
  formerAddressAsked?: boolean;
  /** Title / profile enrichment only. Fox does not ask for these this gate. */
  propertyApn?: string;
  propertyLegalDescription?: string;
  propertyYearBuilt?: string;
  propertyUnits?: string;
  propertyTaxes?: string;
  propertyHoa?: string;
  /** Thin liability placeholder. Credit pull is the later source of truth. */
  largeDebtsOffReport?: string;
  largeDebtsAsked?: boolean;
  agencyDeclarations?: {
    citizenship?: "us_citizen" | "permanent_resident" | "other" | "skipped";
    outstandingJudgments?: "yes" | "no" | "skipped";
    bankruptcy?: "yes" | "no" | "skipped";
    foreclosure?: "yes" | "no" | "skipped";
    lawsuit?: "yes" | "no" | "skipped";
    priorForeclosureObligation?: "yes" | "no" | "skipped";
    delinquentFederalDebt?: "yes" | "no" | "skipped";
    alimonyChildSupport?: "yes" | "no" | "skipped";
    borrowedDownPayment?: "yes" | "no" | "skipped";
    comakerOnNote?: "yes" | "no" | "skipped";
    intentToOccupy?: "yes" | "no" | "skipped";
    priorPropertyOwnership?: "yes" | "no" | "skipped";
  };
  addressHistory?: { label?: string; from?: string; to?: string }[];
  employmentHistory?: { label?: string; from?: string; to?: string }[];
  pendingOtherReo?: boolean | null;
  fileExport?: FileExportMark | null;
  docsOpen?: boolean;
  originatorRequested?: boolean;
  motion?: FileMotion;
  nextActor?: FileNext;
  waitingOn?: WaitingOn;
  conditions?: FileCondition[];
  workItems?: WorkItem[];
  events?: FileEvent[];
  previewOutbox?: PreviewOutboxItem[];
  pendingFinish?: PendingFinish;
  emailCaptureAsked?: boolean;
  emailSkipped?: boolean;
  reviewSlaMs?: number;
  termYears?: number;
  termAsked?: boolean;
  workspaceFlow?: boolean;
  workspaceDraftStatus?: WorkspaceDraftStatus;
  sampleAccepted?: boolean;
  notes: string[];
  documents: ReceivedDoc[];
  documentsSkipped: boolean;
  docsStarted?: boolean;
  docsHeld?: boolean;
  priorYearSkipped?: boolean;
  yearsInBusinessAsked?: boolean;
  awaitingYearsInBusiness?: boolean;
  awaitingPayFrequency?: boolean;
  awaitingBothMonthlyReason?: boolean;
  bothMonthlyReason?: "raise" | "overtime-bonus" | "second-job" | "skip";
  awaitingRaiseWhen?: boolean;
  awaitingRaiseYtdFar?: boolean;
  raiseWhenRaw?: string;
  facts?: Record<string, DraftField>;
  pendingConflict?: FactConflict | null;
  unresolvedConflict?: boolean;
  pendingProposal?: FactProposal | null;
  skippedClasses?: ExtractClass[];
  skippedStillUseful?: string[];
  missingAskKey?: string;
  sections: Record<SectionId, boolean>;
  confirmedAt?: string;
  status?: typeof CONFIRMED_STATUS;
  loStatus?: LoMark;
  previewSample?: boolean;
  /** Last Rateflow search key. Reuse unless amounts, type, occupancy, or FICO change. */
  liveQuoteKey?: string;
  liveQuoteStatus?: "ready" | "unavailable";
  liveQuote?: {
    key: string;
    rate: number;
    asOf: string;
    principalAndInterest?: number;
    pts?: number;
    term?: number;
  };
  /** Same-search conventional 30 rows. Never shown as a rate table. */
  liveQuoteRows?: SafeCouponRow[];
  liveCouponSettled?: boolean;
  pendingLiveCoupon?: {
    choice: "lower" | "nocost";
    rate: number;
    asOf: string;
    principalAndInterest?: number;
    pts?: number;
  };
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
  | "debts"
  | "assets"
  | "property-type"
  | "property-zip"
  | "property-address"
  | "time-on-job"
  | "current-housing"
  | "declarations"
  | "declaration-timing"
  | "household"
  | "coborrower-name"
  | "borrower-name"
  | "other-reo"
  | "occupancy"
  | "timeline"
  | "documents"
  | "review"
  | "correct"
  | "path-switch"
  | "jumbo-purpose"
  | "offer-jumbo"
  | "offer-heloc"
  | "geo-stop"
  | "confirm-proposal"
  | "pay-frequency"
  | "both-monthly-reason"
  | "raise-when"
  | "raise-ytd-far"
  | "qualifying"
  | "years-in-business"
  | "over-price"
  | "housing"
  | "subject-lease"
  | "citizenship"
  | "former-history"
  | "done";

export type Capture =
  | { field: "fullName" | "email" | "phone" | "preferredContact"; value: string }
  | { field: "preferred-asked"; value: string }
  | { field: "incomeType"; value: string }
  | { field: "skip-monthly-debts" }
  | { field: "propose-monthly-debts"; value: string }
  | { field: "include-mortgage-debts"; value: string }
  | { field: "subtract-mortgage" }
  | { field: "statedMonthlyDebts"; value: string }
  | { field: "skip-housing" }
  | { field: "estimatedHousing"; value: string }
  | { field: "skip-available-assets" }
  | { field: "propose-available-assets"; value: string }
  | { field: "statedAvailableAssets"; value: string }
  | { field: "skip-property-type" }
  | { field: "propose-property-type"; value: string }
  | { field: "propertyType"; value: string }
  | { field: "skip-property-zip" }
  | { field: "keep-property-zip" }
  | { field: "propertyZip"; value: string }
  | { field: "propose-rental-lease"; value: string }
  | { field: "propose-subject-address"; value: string }
  | { field: "propose-place-address"; value: string }
  | { field: "subjectAddress"; value: string }
  | { field: "skip-property-address" }
  | { field: "change-property-address" }
  | { field: "skip-time-on-job" }
  | { field: "propose-time-on-job"; value: string }
  | { field: "statedTimeOnJob"; value: string }
  | { field: "skip-current-housing" }
  | { field: "propose-current-housing"; value: string }
  | { field: "statedCurrentHousing"; value: string }
  | { field: "skip-declarations" }
  | { field: "propose-declarations"; value: string }
  | { field: "statedDeclaration"; value: string }
  | { field: "skip-declaration-timing" }
  | { field: "declarationTiming"; value: string }
  | { field: "skip-household" }
  | { field: "propose-household"; value: string }
  | { field: "statedHousehold"; value: string }
  | { field: "skip-coborrower-name" }
  | { field: "propose-coborrower-name"; value: string }
  | { field: "coborrowerName"; value: string }
  | { field: "skip-borrower-name" }
  | { field: "propose-borrower-name"; value: string }
  | { field: "borrowerName"; value: string }
  | { field: "skip-other-reo" }
  | { field: "propose-other-reo"; value: string }
  | { field: "statedOtherReo"; value: string }
  | { field: "otherReoRent"; value: string }
  | { field: "otherReoRental"; value: string }
  | { field: "citizenship"; value: string }
  | { field: "skip-citizenship" }
  | { field: "formerHistory"; value: string }
  | { field: "skip-former-history" }
  | { field: "occupancy"; value: string }
  | { field: "timeline"; value: string }
  | { field: "path"; value: IntakePath }
  | { field: "productIntent"; value: ProductIntent }
  | { field: "starter"; value: ProductIntent; price?: string }
  | { field: "jumboPurpose"; value: JumboPurpose }
  | { field: "accept-jumbo" }
  | { field: "decline-jumbo" }
  | { field: "accept-heloc" }
  | { field: "decline-heloc" }
  | { field: "pending-offer"; value: ProductOffer }
  | { field: "out-of-state" }
  | { field: "in-state" }
  | { field: "govProgram"; value: GovProgram }
  | { field: "creditEvent"; value: NamedCreditEvent }
  | { field: "cashOut" }
  | { field: "loanAmount"; value: string }
  | { field: "propertyValue"; value: string }
  | { field: "downPayment"; value: string }
  | { field: "amountPurpose"; value: string }
  | { field: "creditRange"; value: string }
  | { field: "skip-credit" }
  | { field: "skip-timeline" }
  | { field: "skip-subject-lease" }
  | { field: "statedSubjectLease"; value: string }
  | { field: "termYears"; value: string }
  | { field: "skip-amount" }
  | { field: "skip-value" }
  | { field: "skip-down" }
  | { field: "skip-term" }
  | { field: "accept-proposal" }
  | { field: "change-proposal" }
  | { field: "decline-proposal" }
  | { field: "couponChoice"; value: "this" | "lower" | "nocost" | "skip" }
  | { field: "accept-live-coupon" }
  | { field: "keep-live-coupon" }
  | { field: "payFrequency"; value: string }
  | { field: "bothMonthlyReason"; value: string }
  | { field: "raiseWhen"; value: string }
  | { field: "yearsInBusiness"; value: string }
  | { field: "skip-years-in-business" }
  | { field: "qualifyingIncome"; value: string }
  | { field: "propose-funds"; value: string }
  | { field: "skip-docs" }
  | { field: "hold-docs" }
  | { field: "start-docs" }
  | { field: "open-docs" }
  | { field: "keep-file-fact" }
  | { field: "use-document-fact" }
  | { field: "keep-both-facts" }
  | { field: "confirm-draft" }
  | { field: "needs-correction" }
  | { field: "keep-path" }
  | { field: "keep-line" }
  | { field: "what-acr" }
  | { field: "what-happens-next" }
  | { field: "ask-fox" }
  | { field: "talk-originator" }
  | { field: "over-price-confirm" }
  | { field: "proceed" }
  | { field: "not-yet" }
  | { field: "skip-email" }
  | { field: "upload-more" }
  | { field: "correct"; value: string; line?: string }
  | { field: "note"; value: string };

export type FoxAction = {
  id: string;
  label: string;
  href?: string;
  event?: "prepare-draft" | "open-docs" | "bubble";
  capture?: Capture;
  quiet?: boolean;
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
  editLine?: string;
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

export const CREDIT_STATED_NOTE = "Stated · not a pull";

export const CREDIT_WORKSPACE_BUBBLES = [
  { value: "760+", label: "760+" },
  { value: "740-759", label: "740–759" },
  { value: "720-739", label: "720–739" },
  { value: "700-719", label: "700–719" },
  { value: "680-699", label: "680–699" },
  { value: "660-679", label: "660–679" },
  { value: "640-659", label: "640–659" },
  { value: "620-639", label: "620–639" },
] as const;

export function statedCreditLabel(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "not-sure") return "";
  const chip = CREDIT_WORKSPACE_BUBBLES.find((item) => item.value === raw);
  if (chip) return chip.label;
  if (/^\d{3}$/.test(raw)) return raw;
  return raw.replace(/-/g, "–");
}

/** Explorer/marketing bands only. File still shows the stated chip or typed score. */
export function explorerCreditFromStated(value?: string | null): CreditRange | undefined {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "not-sure") return undefined;
  if (raw === "760+") return "760+";
  if (raw === "740-759" || raw === "720-739" || raw === "720-759") return "720-759";
  if (raw === "700-719" || raw === "680-699" || raw === "680-719") return "680-719";
  if (raw === "660-679" || raw === "640-659" || raw === "640-679") return "640-679";
  if (raw === "620-639") return "below-640";
  const score = Number(raw);
  if (!Number.isFinite(score)) return undefined;
  if (score >= 760) return "760+";
  if (score >= 720) return "720-759";
  if (score >= 680) return "680-719";
  if (score >= 640) return "640-679";
  return "below-640";
}

export function isLowestStatedCredit(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  if (
    raw === "700-719" ||
    raw === "680-699" ||
    raw === "680-719" ||
    raw === "660-679" ||
    raw === "640-659" ||
    raw === "640-679" ||
    raw === "620-639" ||
    raw === "below-640"
  ) {
    return true;
  }
  const score = Number(raw);
  return Number.isFinite(score) && score < 720;
}

export const TERM_BUBBLES = [
  { value: "30", label: "30 year" },
  { value: "15", label: "15 year" },
  { value: "", label: "Skip for now" },
] as const;

export const AMOUNT_HELPER_BUBBLES = [
  { id: "not-sure", label: "Not sure" },
  { id: "skip", label: "Skip for now" },
] as const;

export const AMOUNT_PURPOSE_BUBBLES = [
  { value: "Purchase price", label: "Purchase price" },
  { value: "Loan amount", label: "Loan amount" },
  { value: "HELOC line", label: "HELOC line" },
] as const;

export const JUMBO_PURPOSE_BUBBLES = [
  { value: "buy", label: "Buy" },
  { value: "refinance", label: "Refinance" },
] as const;
