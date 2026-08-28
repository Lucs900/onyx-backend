import {
  readScenario,
  writeScenario,
  type ExplorerScenario,
} from "@/components/products/scenario";
import { explorerCreditFromStated } from "./types";
import {
  CONFIRMED_STATUS,
  FOX_MESSAGES_KEY,
  INTAKE_DRAFT_VERSION,
  INTAKE_STORAGE_KEY,
  type Capture,
  type DocSlot,
  type DocStatus,
  type DraftField,
  type ExtractClass,
  type FactConflict,
  type FactProposal,
  type FileCondition,
  type FileEvent,
  type FoxIntakeDraft,
  type FoxMessage,
  type FoxPrompt,
  type IntakePath,
  type LoMark,
  type PreviewOutboxItem,
  type JumboPurpose,
  type ProductIntent,
  type ReceivedDoc,
  type SectionId,
  type WorkItem,
} from "./types";
import {
  applyEmailThenFinish,
  applyEscalateMotion,
  applyLooksRightMotion,
  applyNotYetMotion,
  applySkipEmailThenFinish,
  applyNudgeMotion,
  applyProceedMotion,
  applyReturnToFoxMotion,
  applyUploadMoreMotion,
  expireOpenReview,
  fileExists,
  isFileMotion,
  isFileNext,
  looksLikeEmail,
  parsePreviewSla,
  restripeGatheringOrReady,
} from "./motion";
import { FAILED_READ_NOTE, isUnreadNote } from "@/lib/docs/accept";
import {
  applyExtractedFields,
  hasLockedSuggestion,
  preferFilenameClass,
  promoteExtractClass,
  resolveFactConflict,
  resolveReceivedSlot,
  nextDocInvite,
  skipCurrentInvite,
  skipRemainingClasses,
  layer2Open,
  skipCurrentStillUseful,
  type ExtractApplyInput,
} from "./fileWrite";
import {
  applyProductChange,
  applyStarterSketch,
  migrateRestoredFoxMessages,
  normalizeProductIntent,
  openingProductAskOpen,
  productIntentFromText,
  productIntentLabel,
  purposeForIntent,
  slugForIntent,
  beginFileEdit,
  changePendingProposal,
  settleResumeAfterCapture,
  persistGuidelineNote,
  withMatrixAfterAmount,
  workspacePrompt,
} from "./workspace";
import {
  START_PATH_KEY,
  consumeHomepageFreshStart,
  homepageFreshEntryPending,
  markHomepageFreshStart,
  writeStartPath,
} from "@/components/products/startPath";
import {
  applyStubEmployerSuggestion,
  canLooksRight,
  sketchAssembled,
  impliedLoanAmount,
  lockedDownShare,
  proposePublicSuggestion,
  proposeFundsPair,
  resolveProposal,
  skipYearsInBusiness,
  withComputedCompanion,
  writeQualifyingIncome,
  writeYearsInBusiness,
} from "./completeness";
import { applyBothMonthlyReasonAnswer, applyPayFrequencyAnswer, applyRaiseWhenAnswer, applyRaiseYtdFarAnswer } from "./qualifyingIncome";
import {
  skipEstimatedHousing,
  syncCalculatorDraft,
  writeEstimatedHousing,
} from "./calculators";
import { parseSubjectLeaseAmount, proposeTypedLeaseRental, skipSubjectLease } from "./rentalIncome";
import {
  applyMortgageSubtract,
  parseMonthlyDebtAmount,
  proposeStatedMonthlyDebts,
  skipMonthlyDebts,
  subjectMortgagePayment,
  writeStatedMonthlyDebts,
} from "./monthlyDebts";
import {
  parseAvailableAssetsAmount,
  proposeStatedAvailableAssets,
  skipAvailableAssets,
  writeStatedAvailableAssets,
} from "./availableAssets";
import {
  isPropertyTypeValue,
  parsePropertyType,
  parseVolunteeredAddress,
  proposePropertyType,
  proposeSubjectAddress,
  skipPropertyType,
  skipSubjectAddress,
  writePropertyType,
  writeSubjectAddress,
} from "./propertyType";
import {
  parseTimeOnJobMonths,
  proposeStatedTimeOnJob,
  skipTimeOnJob,
  timeOnJobLabelFromSpoken,
  writeStatedTimeOnJob,
} from "./timeOnJob";
import {
  proposeStatedCurrentHousing,
  skipCurrentHousing,
  writeStatedCurrentHousing,
} from "./currentHousing";
import {
  isStatedDeclaration,
  parseDeclarationTiming,
  proposeStatedDeclaration,
  skipDeclarationTiming,
  skipDeclarations,
  writeDeclarationTiming,
  writeStatedDeclaration,
} from "./declarations";
import {
  isStatedHousehold,
  proposeStatedHousehold,
  skipHousehold,
  writeStatedHousehold,
} from "./household";
import {
  parseCoborrowerName,
  proposeCoborrowerName,
  skipCoborrowerName,
  writeCoborrowerName,
} from "./coborrowerName";
import {
  parseBorrowerName,
  proposeBorrowerName,
  skipBorrowerName,
  writeBorrowerName,
} from "./borrowerName";
import {
  applyTypedOtherPropertyRent,
  applyTypedOtherPropertyRental,
  decodeTypedOtherPropertyRental,
  isStatedOtherReo,
  proposeStatedOtherReo,
  skipOtherReo,
  writeStatedOtherReo,
} from "./otherReo";
import { isFileCitizenshipValue, skipCitizenship, writeCitizenship } from "./citizenship";
import { skipFormerHistory, writeFormerHistoryNote } from "./fileHistory";
import { markExported, type FileExportFormat } from "./staffExport";

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function signedNumberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function trimString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeHistoryEntries(value: unknown): { label?: string; from?: string; to?: string }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const entries: { label: string; from?: string; to?: string }[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as { label?: unknown; from?: unknown; to?: unknown };
    const label = trimString(raw.label);
    if (!label) continue;
    const from = trimString(raw.from);
    const to = trimString(raw.to);
    entries.push({
      label,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
  }
  return entries.length ? entries : undefined;
}

function normalizeOtherProperties(value: unknown): FoxIntakeDraft["otherProperties"] {
  if (!Array.isArray(value)) return undefined;
  const rows: NonNullable<FoxIntakeDraft["otherProperties"]> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as {
      id?: unknown;
      occupancy?: unknown;
      address?: unknown;
      unpaidPrincipal?: unknown;
      payment?: unknown;
      pitia?: unknown;
      leaseGross?: unknown;
    };
    const address = trimString(raw.address);
    const unpaidPrincipal = trimString(raw.unpaidPrincipal);
    const payment = trimString(raw.payment);
    const leaseGross = trimString(raw.leaseGross);
    if (!address && !unpaidPrincipal && !payment && !leaseGross) continue;
    rows.push({
      id: trimString(raw.id) || `reo-${rows.length + 1}`,
      ...(trimString(raw.occupancy) ? { occupancy: trimString(raw.occupancy) } : {}),
      ...(address ? { address } : {}),
      ...(unpaidPrincipal ? { unpaidPrincipal } : {}),
      ...(payment ? { payment } : {}),
      ...(trimString(raw.pitia) ? { pitia: trimString(raw.pitia) } : {}),
      ...(leaseGross ? { leaseGross } : {}),
    });
  }
  return rows.length ? rows : [];
}

function normalizeAgencyDeclarations(
  value: unknown,
): FoxIntakeDraft["agencyDeclarations"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const yesNo = (item: unknown): "yes" | "no" | "skipped" | undefined =>
    item === "yes" || item === "no" || item === "skipped" ? item : undefined;
  const citizenship =
    raw.citizenship === "us_citizen" ||
    raw.citizenship === "permanent_resident" ||
    raw.citizenship === "other" ||
    raw.citizenship === "skipped"
      ? raw.citizenship
      : raw.citizenship === "non_permanent"
        ? "other"
        : undefined;
  const next: NonNullable<FoxIntakeDraft["agencyDeclarations"]> = {
    ...(citizenship ? { citizenship } : {}),
    ...(yesNo(raw.outstandingJudgments) ? { outstandingJudgments: yesNo(raw.outstandingJudgments) } : {}),
    ...(yesNo(raw.bankruptcy) ? { bankruptcy: yesNo(raw.bankruptcy) } : {}),
    ...(yesNo(raw.foreclosure) ? { foreclosure: yesNo(raw.foreclosure) } : {}),
    ...(yesNo(raw.lawsuit) ? { lawsuit: yesNo(raw.lawsuit) } : {}),
    ...(yesNo(raw.priorForeclosureObligation)
      ? { priorForeclosureObligation: yesNo(raw.priorForeclosureObligation) }
      : {}),
    ...(yesNo(raw.delinquentFederalDebt) ? { delinquentFederalDebt: yesNo(raw.delinquentFederalDebt) } : {}),
    ...(yesNo(raw.alimonyChildSupport) ? { alimonyChildSupport: yesNo(raw.alimonyChildSupport) } : {}),
    ...(yesNo(raw.borrowedDownPayment) ? { borrowedDownPayment: yesNo(raw.borrowedDownPayment) } : {}),
    ...(yesNo(raw.comakerOnNote) ? { comakerOnNote: yesNo(raw.comakerOnNote) } : {}),
    ...(yesNo(raw.intentToOccupy) ? { intentToOccupy: yesNo(raw.intentToOccupy) } : {}),
    ...(yesNo(raw.priorPropertyOwnership) ? { priorPropertyOwnership: yesNo(raw.priorPropertyOwnership) } : {}),
  };
  return Object.keys(next).length ? next : undefined;
}

function emptyField(field: string, value = "", source: DraftField["source"] = "client"): DraftField {
  return { field, value, source, confirmed: false };
}

export function emptyDraft(): FoxIntakeDraft {
  return {
    version: INTAKE_DRAFT_VERSION,
    phase: "context",
    contact: {
      fullName: emptyField("fullName"),
      email: emptyField("email"),
      phone: emptyField("phone"),
      preferredContact: emptyField("preferredContact"),
    },
    incomeType: emptyField("incomeType"),
    occupancyChoice: emptyField("occupancy"),
    timelineChoice: emptyField("timeline"),
    occupancyAsked: false,
    timelineAsked: false,
    looksRightHold: false,
    subjectLeaseAsked: false,
    preferredAsked: false,
    correcting: null,
    correctingLine: null,
    scenario: null,
    notes: [],
    documents: [],
    documentsSkipped: false,
    docsStarted: false,
    docsHeld: false,
    priorYearSkipped: false,
    yearsInBusinessAsked: false,
    awaitingYearsInBusiness: false,
    emailSkipped: false,
    awaitingPayFrequency: false,
    awaitingBothMonthlyReason: false,
    awaitingRaiseWhen: false,
    awaitingRaiseYtdFar: false,
    facts: {},
    pendingConflict: null,
    skippedClasses: [],
    skippedStillUseful: [],
    missingAskKey: "",
    sections: {
      contact: false,
      scenario: false,
      occupancy: false,
      income: false,
      documents: false,
      notes: false,
    },
    updatedAt: new Date().toISOString(),
  };
}

function normalize(value: unknown): FoxIntakeDraft {
  const base = emptyDraft();
  if (!value || typeof value !== "object") return base;
  const raw = value as Partial<FoxIntakeDraft>;
  if (
    typeof raw.version !== "number" ||
    raw.version < 1 ||
    raw.version > INTAKE_DRAFT_VERSION ||
    !raw.contact
  ) {
    return base;
  }
  return {
    ...base,
    ...raw,
    version: INTAKE_DRAFT_VERSION,
    contact: { ...base.contact, ...raw.contact },
    incomeType: raw.incomeType ?? base.incomeType,
    occupancyChoice: raw.occupancyChoice ?? base.occupancyChoice,
    timelineChoice: raw.timelineChoice ?? base.timelineChoice,
    occupancyAsked: Boolean(raw.occupancyAsked),
    timelineAsked: Boolean(raw.timelineAsked),
    looksRightHold: Boolean(raw.looksRightHold),
    subjectLeaseAsked: Boolean(raw.subjectLeaseAsked),
    preferredAsked: Boolean(raw.preferredAsked),
    correcting: raw.correcting ?? null,
    correctingLine: typeof raw.correctingLine === "string" && raw.correctingLine
      ? raw.correctingLine
      : null,
    resumeAfterEdit: typeof raw.resumeAfterEdit === "string"
      ? (raw.resumeAfterEdit as FoxPrompt)
      : undefined,
    path: raw.path === "acr" || raw.path === "loan-only" ? raw.path : undefined,
    productIntent: normalizeProductIntent(raw.productIntent),
    jumboPurpose: raw.jumboPurpose === "buy" || raw.jumboPurpose === "refinance"
      ? raw.jumboPurpose
      : undefined,
    jumboOffered: Boolean(raw.jumboOffered),
    helocOffered: Boolean(raw.helocOffered),
    pendingOffer: raw.pendingOffer === "jumbo" || raw.pendingOffer === "heloc"
      ? raw.pendingOffer
      : undefined,
    outOfState: Boolean(raw.outOfState),
    govProgram:
      raw.govProgram === "fha" || raw.govProgram === "va" || raw.govProgram === "usda"
        ? raw.govProgram
        : undefined,
    creditEvent:
      raw.creditEvent === "bankruptcy" || raw.creditEvent === "foreclosure"
        ? raw.creditEvent
        : undefined,
    cashOut: Boolean(raw.cashOut),
    overPriceConfirmed: Boolean(raw.overPriceConfirmed),
    loanAmountValue: numberOrUndefined(raw.loanAmountValue),
    propertyValueAmount: numberOrUndefined(raw.propertyValueAmount),
    downPaymentAmount: numberOrUndefined(raw.downPaymentAmount),
    amountAsked: Boolean(raw.amountAsked),
    valueAsked: Boolean(raw.valueAsked),
    downAsked: Boolean(raw.downAsked),
    amountPurposeLabel:
      typeof raw.amountPurposeLabel === "string" && raw.amountPurposeLabel.trim()
        ? raw.amountPurposeLabel.trim()
        : undefined,
    creditBand: typeof raw.creditBand === "string" && raw.creditBand.trim() ? raw.creditBand.trim() : undefined,
    creditAsked: Boolean(raw.creditAsked || raw.creditBand),
    incomeAsked: Boolean(raw.incomeAsked || raw.incomeType?.value),
    statedMonthlyDebts: numberOrUndefined(raw.statedMonthlyDebts),
    monthlyDebtsAsked: Boolean(raw.monthlyDebtsAsked || raw.statedMonthlyDebts != null),
    estimatedHousing: numberOrUndefined(raw.estimatedHousing),
    housingAsked: Boolean(raw.housingAsked || raw.estimatedHousing != null),
    statedDti: numberOrUndefined(raw.statedDti),
    rentalGrossMonthly: numberOrUndefined(raw.rentalGrossMonthly),
    rentalPitiaUsed: numberOrUndefined(raw.rentalPitiaUsed),
    suggestedNetRental: signedNumberOrUndefined(raw.suggestedNetRental),
    suggestedFileNet: signedNumberOrUndefined(raw.suggestedFileNet),
    fileNetRole:
      raw.fileNetRole === "income" ||
      raw.fileNetRole === "liability" ||
      raw.fileNetRole === "none" ||
      raw.fileNetRole === "thin"
        ? raw.fileNetRole
        : undefined,
    fileNetAsked: Boolean(raw.fileNetAsked) || undefined,
    skippedFileNet: signedNumberOrUndefined(raw.skippedFileNet),
    rentalNetRole:
      raw.rentalNetRole === "income" ||
      raw.rentalNetRole === "liability" ||
      raw.rentalNetRole === "none" ||
      raw.rentalNetRole === "thin"
        ? raw.rentalNetRole
        : undefined,
    rentalThinReason:
      raw.rentalThinReason === "housing" ||
      raw.rentalThinReason === "statement" ||
      raw.rentalThinReason === "primary"
        ? raw.rentalThinReason
        : undefined,
    subordinateBalance: numberOrUndefined(raw.subordinateBalance),
    hoaMonthly: numberOrUndefined(raw.hoaMonthly),
    miApplies: raw.miApplies === true ? true : raw.miApplies === false ? false : undefined,
    reservesNote:
      raw.reservesNote === "no_minimum_1unit_primary" || raw.reservesNote === "reserves_review"
        ? raw.reservesNote
        : undefined,
    largeDepositFlag: Boolean(raw.largeDepositFlag) || undefined,
    giftFundsNoted: Boolean(raw.giftFundsNoted) || undefined,
    debtMortgageAsked: Boolean(raw.debtMortgageAsked),
    pendingDebtMortgage: normalizePendingDebtMortgage(raw.pendingDebtMortgage),
    statedAvailableAssets: numberOrUndefined(raw.statedAvailableAssets),
    availableAssetsAsked: Boolean(raw.availableAssetsAsked || raw.statedAvailableAssets != null),
    bankStatementAsked: Boolean(
      raw.bankStatementAsked || raw.facts?.institution?.confirmed || raw.facts?.ending_balance?.confirmed,
    ),
    propertyType: isPropertyTypeValue(String(raw.propertyType ?? "")) ? raw.propertyType : undefined,
    propertyTypeAsked: Boolean(raw.propertyTypeAsked || raw.propertyType),
    subjectAddress:
      typeof raw.subjectAddress === "string" && raw.subjectAddress.trim()
        ? raw.subjectAddress.trim()
        : undefined,
    subjectAddressAsked: Boolean(
      raw.subjectAddressAsked ||
        (typeof raw.subjectAddress === "string" && raw.subjectAddress.trim()),
    ),
    statedTimeOnJob: numberOrUndefined(raw.statedTimeOnJob),
    statedTimeOnJobLabel:
      typeof raw.statedTimeOnJobLabel === "string" && raw.statedTimeOnJobLabel.trim()
        ? raw.statedTimeOnJobLabel.trim()
        : undefined,
    timeOnJobAsked: Boolean(raw.timeOnJobAsked || raw.statedTimeOnJob != null),
    pendingHireDate: normalizePendingHireDate(raw.pendingHireDate),
    statedCurrentHousing: numberOrUndefined(raw.statedCurrentHousing),
    currentHousingAsked: Boolean(raw.currentHousingAsked || raw.statedCurrentHousing != null),
    pendingCurrentHousing: normalizePendingCurrentHousing(raw.pendingCurrentHousing),
    statedDeclaration:
      raw.statedDeclaration === "none" || raw.statedDeclaration === "event"
        ? raw.statedDeclaration
        : undefined,
    declarationAsked: Boolean(raw.declarationAsked || raw.statedDeclaration),
    declarationNote:
      typeof raw.declarationNote === "string" && raw.declarationNote.trim()
        ? raw.declarationNote.trim()
        : undefined,
    declarationTiming:
      typeof raw.declarationTiming === "string" && raw.declarationTiming.trim()
        ? raw.declarationTiming.trim()
        : undefined,
    declarationTimingAsked: Boolean(raw.declarationTimingAsked || raw.declarationTiming),
    statedHousehold:
      raw.statedHousehold === "alone" || raw.statedHousehold === "with_someone"
        ? raw.statedHousehold
        : undefined,
    householdAsked: Boolean(raw.householdAsked || raw.statedHousehold),
    coborrowerName:
      typeof raw.coborrowerName === "string" && raw.coborrowerName.trim()
        ? raw.coborrowerName.trim()
        : undefined,
    coborrowerNameAsked: Boolean(raw.coborrowerNameAsked || raw.coborrowerName),
    workingOnCoborrower: Boolean(raw.workingOnCoborrower),
    coborrowerIdSkipped: Boolean(raw.coborrowerIdSkipped),
    borrowerName:
      typeof raw.borrowerName === "string" && raw.borrowerName.trim()
        ? raw.borrowerName.trim()
        : undefined,
    borrowerNameAsked: Boolean(raw.borrowerNameAsked || raw.borrowerName || raw.contact?.fullName?.value),
    statedOtherReo: raw.statedOtherReo === "none" || raw.statedOtherReo === "yes" ? raw.statedOtherReo : undefined,
    otherReoAsked: Boolean(raw.otherReoAsked || raw.statedOtherReo),
    propertyApn: trimString(raw.propertyApn),
    propertyLegalDescription: trimString(raw.propertyLegalDescription),
    propertyYearBuilt: trimString(raw.propertyYearBuilt),
    propertyUnits: trimString(raw.propertyUnits),
    propertyTaxes: trimString(raw.propertyTaxes),
    propertyHoa: trimString(raw.propertyHoa),
    citizenshipAsked: Boolean(raw.citizenshipAsked || raw.agencyDeclarations?.citizenship),
    formerHistoryAsked: Boolean(raw.formerHistoryAsked),
    formerEmploymentAsked: Boolean(raw.formerEmploymentAsked),
    formerAddressAsked: Boolean(raw.formerAddressAsked),
    otherProperties: normalizeOtherProperties(raw.otherProperties),
    largeDebtsOffReport: trimString(raw.largeDebtsOffReport),
    largeDebtsAsked: Boolean(raw.largeDebtsAsked || raw.largeDebtsOffReport),
    agencyDeclarations: normalizeAgencyDeclarations(raw.agencyDeclarations),
    addressHistory: normalizeHistoryEntries(raw.addressHistory),
    employmentHistory: normalizeHistoryEntries(raw.employmentHistory),
    pendingOtherReo: raw.pendingOtherReo ? true : null,
    fileExport: normalizeFileExport(raw.fileExport),
    docsOpen: Boolean(raw.docsOpen),
    docsStarted: Boolean(raw.docsStarted),
    docsHeld: Boolean(raw.docsHeld),
    originatorRequested: Boolean(raw.originatorRequested),
    motion: isFileMotion(raw.motion) ? raw.motion : undefined,
    nextActor: isFileNext(raw.nextActor) ? raw.nextActor : undefined,
    waitingOn:
      raw.waitingOn === "borrower" ||
      raw.waitingOn === "fox" ||
      raw.waitingOn === "onyx" ||
      raw.waitingOn === "outside"
        ? raw.waitingOn
        : undefined,
    conditions: normalizeConditions(raw.conditions),
    workItems: normalizeWorkItems(raw.workItems),
    events: normalizeEvents(raw.events),
    previewOutbox: normalizeOutbox(raw.previewOutbox),
    pendingFinish: raw.pendingFinish === "proceed" || raw.pendingFinish === "not-yet"
      ? raw.pendingFinish
      : undefined,
    emailCaptureAsked: Boolean(raw.emailCaptureAsked),
    emailSkipped: Boolean(raw.emailSkipped),
    reviewSlaMs:
      typeof raw.reviewSlaMs === "number" && raw.reviewSlaMs > 0 ? raw.reviewSlaMs : undefined,
    termYears: numberOrUndefined(raw.termYears),
    termAsked: Boolean(raw.termAsked),
    workspaceFlow: Boolean(raw.workspaceFlow),
    sampleAccepted: Boolean(raw.sampleAccepted),
    workspaceDraftStatus:
      raw.workspaceDraftStatus === "preparing" ||
      raw.workspaceDraftStatus === "ready" ||
      raw.workspaceDraftStatus === "with-originator"
        ? raw.workspaceDraftStatus
        : undefined,
    previewSample: Boolean(raw.previewSample),
    documents: (raw.documents ?? []).map((doc) => ({
      ...doc,
      status: doc.status ?? "received",
      bytesRef: typeof doc.bytesRef === "string" ? doc.bytesRef : undefined,
      extractClass: doc.extractClass,
      party: doc.party === "coborrower" ? "coborrower" : doc.party === "borrower" ? "borrower" : undefined,
    })),
    facts: normalizeFacts(raw.facts),
    pendingConflict: normalizeConflict(raw.pendingConflict),
    unresolvedConflict: Boolean(raw.unresolvedConflict),
    pendingProposal: normalizeProposal(raw.pendingProposal),
    skippedClasses: Array.isArray(raw.skippedClasses)
      ? raw.skippedClasses.filter((item): item is ExtractClass => typeof item === "string")
      : [],
    skippedStillUseful: Array.isArray(raw.skippedStillUseful)
      ? raw.skippedStillUseful.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [],
    priorYearSkipped: Boolean(raw.priorYearSkipped),
    yearsInBusinessAsked: Boolean(raw.yearsInBusinessAsked),
    awaitingYearsInBusiness: Boolean(raw.awaitingYearsInBusiness),
    awaitingPayFrequency: Boolean(raw.awaitingPayFrequency),
    awaitingBothMonthlyReason: Boolean(raw.awaitingBothMonthlyReason),
    awaitingRaiseWhen: Boolean(raw.awaitingRaiseWhen),
    awaitingRaiseYtdFar: Boolean(raw.awaitingRaiseYtdFar),
    raiseWhenRaw: typeof raw.raiseWhenRaw === "string" ? raw.raiseWhenRaw : undefined,
    bothMonthlyReason:
      raw.bothMonthlyReason === "raise" ||
      raw.bothMonthlyReason === "overtime-bonus" ||
      raw.bothMonthlyReason === "second-job" ||
      raw.bothMonthlyReason === "skip"
        ? raw.bothMonthlyReason
        : undefined,
    missingAskKey: typeof raw.missingAskKey === "string" ? raw.missingAskKey : "",
    sections: { ...base.sections, ...raw.sections },
  };
}

function normalizeFacts(value: FoxIntakeDraft["facts"]): Record<string, DraftField> {
  if (!value || typeof value !== "object") return {};
  const next: Record<string, DraftField> = {};
  for (const [key, field] of Object.entries(value)) {
    if (!field || typeof field !== "object" || typeof field.value !== "string") continue;
    if (
      key === "date_of_birth" ||
      key === "dob" ||
      key === "ssn" ||
      key === "full_ssn" ||
      key === "social" ||
      key === "social_security"
    ) {
      continue;
    }
    next[key] = {
      field: field.field || key,
      value: field.value,
      source:
        field.source === "document" ||
        field.source === "scenario" ||
        field.source === "extracted-unconfirmed" ||
        field.source === "suggested" ||
        field.source === "computed"
          ? field.source
          : "client",
      confirmed: Boolean(field.confirmed),
      confirmedAt: field.confirmedAt,
    };
  }
  return next;
}

function normalizeWorkItems(value: FoxIntakeDraft["workItems"]): WorkItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is WorkItem => {
    if (!item || typeof item !== "object") return false;
    const kind = item.kind === "exception" || item.kind === "processing" ? item.kind : item.kind === "review" ? "review" : null;
    if (!kind || typeof item.id !== "string" || typeof item.openedAt !== "string") return false;
    item.kind = kind;
    if (item.state === "returned" || item.state === "closed") item.state = "done";
    return true;
  });
}

function normalizeConditions(value: FoxIntakeDraft["conditions"]): FileCondition[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is FileCondition => {
    if (!item || typeof item !== "object") return false;
    return Boolean(item.id && item.title && item.foxLine && item.waitingOn && item.needed && item.status);
  });
}

function normalizeEvents(value: FoxIntakeDraft["events"]): FileEvent[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is FileEvent => {
    if (!item || typeof item !== "object") return false;
    return typeof item.id === "string" && typeof item.kind === "string" && typeof item.text === "string";
  });
}

function normalizeOutbox(value: FoxIntakeDraft["previewOutbox"]): PreviewOutboxItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PreviewOutboxItem => {
    if (!item || typeof item !== "object") return false;
    return typeof item.to === "string" && typeof item.body === "string";
  });
}

function normalizeConflict(value: FoxIntakeDraft["pendingConflict"]): FactConflict | null {
  if (!value || typeof value !== "object") return null;
  if (!value.field || !value.fileValue || !value.documentValue) return null;
  return {
    field: value.field,
    fileValue: value.fileValue,
    documentValue: value.documentValue,
    label: value.label || value.field,
    kind: value.kind === "public" || value.kind === "computed" || value.kind === "document"
      ? value.kind
      : "document",
  };
}

function normalizePendingDebtMortgage(
  value: FoxIntakeDraft["pendingDebtMortgage"],
): FoxIntakeDraft["pendingDebtMortgage"] {
  if (!value || typeof value !== "object") return null;
  const included = Number(value.included);
  const mortgage = Number(value.mortgage);
  if (!Number.isFinite(included) || !Number.isFinite(mortgage) || included <= 0 || mortgage <= 0) {
    return null;
  }
  return { included: Math.round(included), mortgage: Math.round(mortgage) };
}

function normalizeFileExport(value: FoxIntakeDraft["fileExport"]): FoxIntakeDraft["fileExport"] {
  if (!value || typeof value !== "object") return null;
  if (value.format !== "mapped_json" && value.format !== "fnma_32") return null;
  if (typeof value.downloadedAt !== "string" || !value.downloadedAt) return null;
  return {
    format: value.format,
    status: "exported",
    downloadedAt: value.downloadedAt,
  };
}

function normalizePendingHireDate(
  value: FoxIntakeDraft["pendingHireDate"],
): FoxIntakeDraft["pendingHireDate"] {
  if (!value || typeof value !== "object") return null;
  const date = typeof value.date === "string" ? value.date.trim() : "";
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const months = Number(value.months);
  if (!date || !label || !Number.isFinite(months) || months <= 0) return null;
  return { date, months: Math.round(months), label };
}

function normalizePendingCurrentHousing(
  value: FoxIntakeDraft["pendingCurrentHousing"],
): FoxIntakeDraft["pendingCurrentHousing"] {
  if (!value || typeof value !== "object") return null;
  const amount = Number(value.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const extras = Array.isArray(value.extras)
    ? value.extras
        .filter((item) => item && item.field && item.value)
        .map((item) => ({
          field: item.field,
          value: item.value,
          label: item.label || item.field,
        }))
    : undefined;
  return { amount: Math.round(amount), ...(extras?.length ? { extras } : {}) };
}

function normalizeProposal(value: FoxIntakeDraft["pendingProposal"]): FactProposal | null {
  if (!value || typeof value !== "object") return null;
  if (!value.field || !value.value) return null;
  if (value.kind !== "public" && value.kind !== "computed" && value.kind !== "document") return null;
  return {
    field: value.field,
    value: value.value,
    label: value.label || value.field,
    kind: value.kind,
    note: typeof value.note === "string" ? value.note : undefined,
    methodNote: typeof value.methodNote === "string" ? value.methodNote : undefined,
    caution: typeof value.caution === "string" ? value.caution : undefined,
    partialNotes: Array.isArray(value.partialNotes)
      ? value.partialNotes.filter((note): note is string => typeof note === "string")
      : undefined,
    companion:
      value.companion && value.companion.field && value.companion.value
        ? {
            field: value.companion.field,
            value: value.companion.value,
            label: value.companion.label || value.companion.field,
          }
        : undefined,
    extras: Array.isArray(value.extras)
      ? value.extras
          .filter((item) => item && item.field && item.value)
          .map((item) => ({
            field: item.field,
            value: item.value,
            label: item.label || item.field,
          }))
      : undefined,
    parts:
      value.parts && typeof value.parts === "object"
        ? {
            ...(typeof value.parts.wage === "string" ? { wage: value.parts.wage } : {}),
            ...(typeof value.parts.scheduleC === "string" ? { scheduleC: value.parts.scheduleC } : {}),
            ...(typeof value.parts.k1 === "string" ? { k1: value.parts.k1 } : {}),
          }
        : undefined,
    hireLabel: typeof value.hireLabel === "string" && value.hireLabel.trim() ? value.hireLabel : undefined,
  };
}

function readStored(): FoxIntakeDraft {
  if (typeof window === "undefined") return emptyDraft();
  try {
    const local = window.localStorage.getItem(INTAKE_STORAGE_KEY);
    const session = window.sessionStorage.getItem(INTAKE_STORAGE_KEY);
    const raw = local || session;
    if (!raw) return emptyDraft();
    return normalize(JSON.parse(raw) as unknown);
  } catch {
    return emptyDraft();
  }
}

function persist(draft: FoxIntakeDraft) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(draft);
  try {
    window.sessionStorage.setItem(INTAKE_STORAGE_KEY, raw);
    window.localStorage.setItem(INTAKE_STORAGE_KEY, raw);
  } catch {
    // Preview storage can be blocked; keep the in-memory copy.
  }
}

let current = emptyDraft();
let hydrated = false;
let foxMessages: FoxMessage[] = [];
let messagesHydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

let workspaceEntryKey: string | null = null;

function workspaceEntryToken(path?: IntakePath | null) {
  return path ?? "";
}

function isClosedDraft(draft: FoxIntakeDraft) {
  return (
    Boolean(draft.sampleAccepted) ||
    draft.phase === "confirmed" ||
    draft.workspaceDraftStatus === "with-originator"
  );
}

function readStoredMessages(): FoxMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      window.sessionStorage.getItem(FOX_MESSAGES_KEY) ||
      window.localStorage.getItem(FOX_MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is FoxMessage => {
      if (!item || typeof item !== "object") return false;
      const role = (item as FoxMessage).role;
      return role === "fox" || role === "client" || role === "system";
    });
  } catch {
    return [];
  }
}

function persistMessages(messages: FoxMessage[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(messages);
  try {
    window.sessionStorage.setItem(FOX_MESSAGES_KEY, raw);
    window.localStorage.setItem(FOX_MESSAGES_KEY, raw);
  } catch {
    // Preview storage can be blocked; keep the in-memory copy.
  }
}

function persistMigratedMessages(messages: FoxMessage[]) {
  foxMessages = migrateRestoredFoxMessages(messages);
  messagesHydrated = true;
  persistMessages(foxMessages);
  return foxMessages;
}

function hydrateFoxMessages() {
  if (messagesHydrated || typeof window === "undefined") return foxMessages;
  return persistMigratedMessages(readStoredMessages());
}

export function getFoxMessages() {
  hydrateFoxMessages();
  return foxMessages;
}

export function setFoxMessages(messages: FoxMessage[]) {
  return persistMigratedMessages(messages);
}

export function clearFoxMessages() {
  return setFoxMessages([]);
}

/** Client already talked, or product/intent is already on the draft. */
export function workspaceSessionStarted(
  draft: FoxIntakeDraft = current,
  messages: FoxMessage[] = getFoxMessages(),
) {
  if (isClosedDraft(draft)) return false;
  if (draft.productIntent) return true;
  if (draft.occupancyChoice.value || draft.timelineChoice.value) return true;
  if (draft.propertyValueAmount != null || draft.downPaymentAmount != null || draft.loanAmountValue != null) {
    return true;
  }
  if (draft.pendingProposal || draft.documents.length > 0) return true;
  return messages.some((message) => message.role === "client");
}

/** Same File is already past Looks right / finish-line. URL path is not a fresh start. */
export function shouldResumeWorkspaceEntry(
  draft: FoxIntakeDraft = current,
  messages: FoxMessage[] = getFoxMessages(),
) {
  if (fileExists(draft) || workspaceSessionStarted(draft, messages)) return true;
  return Boolean(
    (draft.skippedClasses && draft.skippedClasses.length > 0) ||
      (draft.skippedStillUseful && draft.skippedStillUseful.length > 0) ||
      draft.documentsSkipped,
  );
}

function resumeWorkspaceEntry(path?: IntakePath | null, intent: ProductIntent | null = null) {
  markWorkspaceEntry(current.path ?? path);
  if (!current.workspaceFlow) {
    commit({ ...current, workspaceFlow: true });
  }
  if (path && !current.path) setDraftPath(path);
  if (intent) {
    if (current.productIntent !== intent) {
      commit(withWorkspaceScenario(applyProductChange(current, intent)));
    }
    return current;
  }
  if (openingProductAskOpen(current, getFoxMessages()) && current.productIntent) {
    commit({ ...current, productIntent: undefined });
  }
  return current;
}

function markWorkspaceEntry(path?: IntakePath | null) {
  workspaceEntryKey = workspaceEntryToken(path);
  hydrated = true;
}

const PREVIEW_STORAGE_KEYS = [INTAKE_STORAGE_KEY, FOX_MESSAGES_KEY, START_PATH_KEY];

export function clearPreviewWorkspaceStorage() {
  if (typeof window === "undefined") return;
  for (const key of PREVIEW_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      // Private mode / quota.
    }
  }
}

/** Explicit Start over. Same wipe as homepage CTA, plus the three preview storage keys. */
export function startOverWorkspace(path: IntakePath | null = null) {
  clearPreviewWorkspaceStorage();
  foxMessages = [];
  messagesHydrated = true;
  hydrated = false;
  workspaceEntryKey = null;
  current = emptyDraft();
  const next = resetWorkspaceForEntry(path, null);
  if (path) writeStartPath(path);
  return next;
}

/** Wipe the prior file. Keep the new path and honor intent without a second reset. */
export function resetWorkspaceForEntry(
  path: IntakePath | null,
  intent: ProductIntent | null = null,
) {
  markWorkspaceEntry(path);
  current = {
    ...emptyDraft(),
    path: path ?? undefined,
    productIntent: intent ?? undefined,
    workspaceFlow: true,
    updatedAt: new Date().toISOString(),
  };
  clearFoxMessages();
  persist(current);
  emit();
  return current;
}

/** Keep a live homepage thread or an in-motion File. Fresh start is homepage CTA only. */
export function continueWorkspaceFromEntry(
  path: IntakePath | null,
  intent: ProductIntent | null = null,
  entry?: { fresh?: boolean },
) {
  if (!hydrated) hydrateFoxDraft();
  hydrateFoxMessages();
  const fresh = Boolean(entry?.fresh) || homepageFreshEntryPending();
  if (fresh) {
    consumeHomepageFreshStart();
    const next = startOverWorkspace(path);
    return intent ? setDraftProductIntent(intent) : next;
  }
  if (shouldResumeWorkspaceEntry()) {
    return resumeWorkspaceEntry(path, intent);
  }
  return resetWorkspaceForEntry(path, intent);
}

export function ensureWorkspaceDraft() {
  if (!hydrated) hydrateFoxDraft();
  hydrateFoxMessages();
  if (shouldResumeWorkspaceEntry()) {
    return resumeWorkspaceEntry(current.path);
  }
  if (!current.workspaceFlow) {
    commit({ ...current, workspaceFlow: true });
  }
  markWorkspaceEntry(current.path);
  return current;
}

export function hydrateFoxDraft() {
  if (typeof window === "undefined") return current;
  hydrateFoxMessages();
  if (hydrated) return current;
  if (workspaceEntryKey != null) {
    hydrated = true;
    return current;
  }
  current = readStored();
  if (!current.scenario) {
    const scenario = readScenario();
    if (scenario) current = withScenario(current, scenario);
  }
  hydrated = true;
  persist(current);
  emit();
  return current;
}

export function getFoxDraft() {
  return current;
}

export function subscribeFoxDraft(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getServerDraft() {
  return emptyDraft();
}

function commit(next: FoxIntakeDraft) {
  current = { ...syncCalculatorDraft(next), updatedAt: new Date().toISOString() };
  persist(current);
  emit();
  return current;
}

function withScenario(draft: FoxIntakeDraft, scenario: ExplorerScenario): FoxIntakeDraft {
  return {
    ...draft,
    scenario,
    occupancyChoice: draft.occupancyChoice.value
      ? draft.occupancyChoice
      : emptyField("occupancy", scenario.occupancy, "scenario"),
    timelineChoice: draft.timelineChoice.value
      ? draft.timelineChoice
      : emptyField("timeline", scenario.timeline ?? "", "scenario"),
  };
}

export function setDraftScenario(scenario: ExplorerScenario | null) {
  if (!scenario) return current;
  return commit(withScenario(current, scenario));
}

export function setDraftPath(path: IntakePath | null) {
  if (!path) return current;
  if (current.path === path) return current;
  return commit({ ...current, path });
}

/** /start URL seed. Resume an operating File; do not treat path=acr|loan as a fresh CTA. */
export function applyWorkspaceEntry(
  path: IntakePath | null,
  intent: ProductIntent | null = null,
) {
  if (!hydrated) hydrateFoxDraft();
  hydrateFoxMessages();
  if (shouldResumeWorkspaceEntry()) {
    return resumeWorkspaceEntry(path, intent);
  }
  const key = workspaceEntryToken(path);
  if (hydrated && workspaceEntryKey === key && current.workspaceFlow) {
    if (intent && current.productIntent !== intent) {
      return setDraftProductIntent(intent);
    }
    return current;
  }
  return resetWorkspaceForEntry(path, intent);
}

/** Homepage CTA: always a new file. Return to Fox / refresh must not call this. */
export function beginWorkspaceFromHero(path: IntakePath) {
  markHomepageFreshStart();
  return startOverWorkspace(path);
}

function withProductIntent(draft: FoxIntakeDraft, intent: ProductIntent): FoxIntakeDraft {
  const scenario = draft.scenario
    ? {
        ...draft.scenario,
        purpose: purposeForIntent(intent, draft.jumboPurpose),
        productSlug: slugForIntent(intent),
        productName: productIntentLabel(intent),
      }
    : draft.scenario;
  return { ...draft, productIntent: intent, scenario };
}

export function setWorkspaceFlow(on = true) {
  if (current.workspaceFlow === on) return current;
  if (on && !current.workspaceDraftStatus && !current.documents.length) {
    return commit({ ...current, workspaceFlow: true, documentsSkipped: false });
  }
  return commit({ ...current, workspaceFlow: on });
}

let prepareTimer: number | undefined;

export function prepareWorkspaceDraft() {
  if (current.workspaceDraftStatus === "ready" || current.workspaceDraftStatus === "with-originator") {
    return current;
  }
  if (current.workspaceDraftStatus !== "preparing") {
    commit({
      ...current,
      phase: current.phase === "confirmed" ? current.phase : "draft",
      workspaceDraftStatus: "preparing",
      correcting: null,
    });
  }
  if (typeof window === "undefined") {
    return commit({ ...current, workspaceDraftStatus: "ready" });
  }
  window.clearTimeout(prepareTimer);
  prepareTimer = window.setTimeout(() => {
    if (current.workspaceDraftStatus !== "preparing") return;
    commit({ ...current, workspaceDraftStatus: "ready" });
  }, 700);
  return current;
}

export function setDraftProductIntent(intent: ProductIntent | null) {
  if (!intent) return current;
  if (current.productIntent === intent) return current;
  return commit(withProductIntent(current, intent));
}

function withWorkspaceScenario(draft: FoxIntakeDraft): FoxIntakeDraft {
  const scenario = draft.scenario;
  if (!scenario) return draft;
  const next: ExplorerScenario = {
    ...scenario,
    purpose: draft.productIntent
      ? purposeForIntent(draft.productIntent, draft.jumboPurpose)
      : scenario.purpose,
    productSlug: draft.productIntent ? slugForIntent(draft.productIntent) : scenario.productSlug,
    occupancy:
      (draft.occupancyChoice.value as ExplorerScenario["occupancy"]) || scenario.occupancy,
    timeline:
      (draft.timelineChoice.value as ExplorerScenario["timeline"]) || scenario.timeline,
    loanAmount: draft.loanAmountValue ?? scenario.loanAmount,
    propertyValue: draft.propertyValueAmount ?? scenario.propertyValue,
    downPayment: draft.downPaymentAmount ?? scenario.downPayment,
    creditRange: explorerCreditFromStated(draft.creditBand) ?? scenario.creditRange,
  };
  writeScenario(next);
  return { ...draft, scenario: next };
}

function clientField(field: string, value: string): DraftField {
  return { field, value, source: "client", confirmed: false };
}

export function setContactField(
  key: keyof FoxIntakeDraft["contact"],
  value: string,
) {
  return commit({
    ...current,
    phase: current.phase === "confirmed" ? "draft" : current.phase,
    contact: { ...current.contact, [key]: clientField(key, value) },
    sections: { ...current.sections, contact: false },
    status: undefined,
    confirmedAt: undefined,
  });
}

export function markPreferredAsked() {
  return commit({ ...current, preferredAsked: true });
}

export function addNote(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return current;
  return commit({
    ...persistGuidelineNote(current, trimmed),
    sections: { ...current.sections, notes: false },
  });
}

export function receiveDocument(input: Omit<ReceivedDoc, "status" | "note"> & { status?: DocStatus; note?: string }) {
  const documents = [
    ...current.documents,
    {
      ...input,
      status: input.status ?? "received",
      note: input.note,
      party: input.party ?? (current.workingOnCoborrower ? "coborrower" : "borrower"),
    },
  ];
  const keepPhase =
    current.workspaceFlow &&
    (current.sampleAccepted || current.phase === "confirmed" || Boolean(current.motion));
  const next = commit(
    restripeGatheringOrReady({
      ...current,
      documents,
      documentsSkipped: false,
      docsStarted: true,
      docsOpen: false,
      correcting: current.workspaceFlow ? null : current.correcting,
      phase: keepPhase
        ? current.phase
        : current.phase === "context"
          ? "documents"
          : current.phase,
      sections: { ...current.sections, documents: false },
    }),
  );
  if (next.workspaceFlow && next.sampleAccepted && next.phase !== "confirmed") {
    return confirmDraft();
  }
  return next;
}

export function setDocumentStatus(
  slot: DocSlot,
  status: DocStatus,
  note?: string,
  receivedAt?: string,
) {
  return patchReceivedDoc(
    (doc) => (receivedAt ? doc.receivedAt === receivedAt : doc.slot === slot),
    { status, note },
  );
}

export function patchReceivedDoc(
  match: (doc: ReceivedDoc) => boolean,
  patch: Partial<ReceivedDoc>,
) {
  return commit({
    ...current,
    documents: current.documents.map((doc) => (match(doc) ? { ...doc, ...patch } : doc)),
  });
}

export function applyExtractWrite(
  receivedAt: string,
  name: string,
  input: ExtractApplyInput,
  note?: string,
  failed?: boolean,
) {
  const match = current.documents.some((doc) => doc.receivedAt === receivedAt && doc.name === name);
  if (!match) {
    return { draft: current, writes: [], conflict: null, quietLines: [], extractClass: input.extractClass };
  }
  const extractedClass = promoteExtractClass(input.extractClass, input.fields);
  const unreadEmpty =
    !failed &&
    (extractedClass === "government_id" || extractedClass === "paystub" || extractedClass === "w2") &&
    !hasLockedSuggestion(extractedClass, input.fields);
  const treatFailed = Boolean(failed || unreadEmpty);
  const displayClass =
    treatFailed || extractedClass === "other"
      ? preferFilenameClass(extractedClass, name)
      : extractedClass;
  const applied = treatFailed
    ? {
        draft: { ...current, looksRightHold: true },
        writes: [],
        conflict: null,
        quietLines: note ? [note] : [FAILED_READ_NOTE],
      }
    : applyExtractedFields(current, { ...input, extractClass: extractedClass });
  const nextDocs = applied.draft.documents.map((doc) => {
    if (doc.receivedAt !== receivedAt || doc.name !== name) return doc;
    const slot = resolveReceivedSlot(doc.slot, name, displayClass);
    return {
      ...doc,
      slot,
      extractClass: displayClass,
      status: (treatFailed ? "received" : "extracted") as DocStatus,
      note: treatFailed ? (isUnreadNote(note) ? note : FAILED_READ_NOTE) : note,
    };
  });
  commit({
    ...applied.draft,
    documents: nextDocs,
    documentsSkipped: false,
    sections: { ...applied.draft.sections, documents: false },
  });
  return { ...applied, draft: current, extractClass: displayClass };
}

export function markMissingAsked(key: string) {
  return commit({ ...current, missingAskKey: key });
}

export function skipDocuments() {
  if (current.workspaceFlow && !current.sampleAccepted) {
    return commit(skipCurrentInvite({ ...current, docsHeld: false }));
  }
  const prepared =
    current.sampleAccepted ||
    current.phase === "confirmed" ||
    Boolean(current.motion);
  const skipped = skipRemainingClasses(current);
  return commit(
    restripeGatheringOrReady({
      ...skipped,
      phase: prepared && current.phase === "confirmed" ? "confirmed" : prepared ? current.phase : "draft",
      workspaceDraftStatus: prepared
        ? current.workspaceDraftStatus ?? "ready"
        : current.workspaceDraftStatus,
      sections: { ...current.sections, documents: false },
    }),
  );
}

export function advancePhase() {
  if (!hasRequiredContact(current)) {
    return commit({ ...current, phase: "context" });
  }
  if (!current.incomeType.value || !current.occupancyAsked) {
    return commit({ ...current, phase: "context" });
  }
  if (!current.documents.length && !current.documentsSkipped) {
    return commit({ ...current, phase: "documents" });
  }
  if (current.phase !== "confirmed") {
    return commit({ ...current, phase: "draft" });
  }
  return current;
}

export function confirmDraft() {
  const now = new Date().toISOString();
  const mark = (field: DraftField): DraftField =>
    field.value ? { ...field, confirmed: true, confirmedAt: now } : field;
  const sections = {
    contact: hasRequiredContact(current),
    scenario: Boolean(current.scenario),
    occupancy: Boolean(current.occupancyChoice.value || current.scenario),
    income: Boolean(current.incomeType.value),
    documents: Boolean(current.documents.length || current.documentsSkipped),
    notes: true,
  };
  return commit({
    ...current,
    phase: "confirmed",
    status: CONFIRMED_STATUS,
    workspaceDraftStatus: current.workspaceFlow
      ? current.workspaceDraftStatus ?? "ready"
      : current.workspaceDraftStatus,
    confirmedAt: now,
    loStatus: current.loStatus ?? "in review",
    correcting: null,
    contact: {
      fullName: mark(current.contact.fullName),
      email: mark(current.contact.email),
      phone: mark(current.contact.phone),
      preferredContact: mark(current.contact.preferredContact),
    },
    incomeType: mark(current.incomeType),
    occupancyChoice: mark(current.occupancyChoice),
    timelineChoice: mark(current.timelineChoice),
    sections,
  });
}

export function confirmSection(id: SectionId) {
  if (id) {
    const sections = { ...current.sections, [id]: true };
    const next = { ...current, sections, phase: "draft" as const };
    return commit(next);
  }
  return current;
}

export function editSection(id: SectionId) {
  return commit({
    ...current,
    phase: "draft",
    correcting: sectionToPrompt(id),
    sections: { ...current.sections, [id]: false },
    status: undefined,
    confirmedAt: undefined,
  });
}

export function setLoStatus(loStatus: LoMark) {
  return commit({ ...current, loStatus });
}

export function markFileExported(format: FileExportFormat) {
  return commit(markExported(current, format));
}

export const FOX_THREAD_LINE_EVENT = "onyx:fox-thread-line";

export function appendFoxThreadLine(
  text: string,
  extras: Partial<Pick<FoxMessage, "followUp" | "actions" | "facts">> = {},
) {
  const message: FoxMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "fox",
    text,
    ...extras,
  };
  persistMigratedMessages([...getFoxMessages(), message]);
  emit();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(FOX_THREAD_LINE_EVENT, { detail: message }));
  }
  return message;
}

export function returnToFox(
  input: Parameters<typeof applyReturnToFoxMotion>[1],
) {
  const applied = applyReturnToFoxMotion(current, input);
  if (applied.error || !applied.threadLine) {
    return { draft: current, threadLine: "", error: applied.error ?? "foxLine required" };
  }
  commit(applied.draft);
  appendFoxThreadLine(applied.threadLine);
  return { draft: current, threadLine: applied.threadLine };
}

export function nudgeReview(input: { force?: boolean; now?: Date } = {}) {
  const applied = applyNudgeMotion(current, input);
  if (!applied.threadLine) return { draft: current, threadLine: null as string | null };
  commit(applied.draft);
  appendFoxThreadLine(applied.threadLine);
  return { draft: current, threadLine: applied.threadLine };
}

export function sitExpireReview(now = new Date()) {
  return commit(expireOpenReview(current, now));
}

export function applyPublicSuggestion(field = "employer_name", value?: string) {
  const applied = value
    ? proposePublicSuggestion(current, field, value)
    : applyStubEmployerSuggestion(current);
  return commit(applied.draft);
}

export function applyPreviewMotionControls(input: {
  nudge?: string | null;
  sla?: string | null;
  suggest?: string | null;
}) {
  const sla = parsePreviewSla(input.sla);
  if (sla && current.reviewSlaMs !== sla) {
    commit({ ...current, reviewSlaMs: sla });
  }
  if (input.suggest === "employer" && !current.pendingProposal && !current.facts?.employer_name?.value) {
    applyPublicSuggestion("employer_name");
  }
  if (input.nudge === "now") {
    if (!openReviewOnFile(current)) return current;
    return nudgeReview({ force: true }).draft;
  }
  if (input.nudge === "expire") {
    sitExpireReview();
    return nudgeReview({ force: false }).draft;
  }
  return current;
}

function openReviewOnFile(draft: FoxIntakeDraft) {
  return (draft.workItems ?? []).some(
    (item) => item.kind === "review" && (item.state === "open" || item.state === "nudged"),
  );
}

function hasUnreadReceivedDoc(draft: FoxIntakeDraft) {
  return draft.documents.some(
    (doc) => isUnreadNote(doc.note) || doc.status === "failed" || doc.status === "needs better copy",
  );
}

export function applyCapture(capture: Capture) {
  const before = current;
  if (current.looksRightHold) {
    if (capture.field === "skip-docs" || !hasUnreadReceivedDoc(current)) {
      current = { ...current, looksRightHold: false };
    }
  }
  const result = applyCaptureBody(capture);
  const settled = settleResumeAfterCapture(before, capture, result);
  if (settled === result) return result;
  return commit(settled);
}

function applyCaptureBody(capture: Capture) {
  if (capture.field === "fullName" || capture.field === "email" || capture.field === "phone" || capture.field === "preferredContact") {
    if (capture.field === "email" && current.workspaceFlow && (current.pendingFinish || current.sampleAccepted)) {
      if (current.pendingFinish && looksLikeEmail(capture.value)) {
        return commit(applyEmailThenFinish(current, capture.value));
      }
      return commit({
        ...current,
        contact: { ...current.contact, email: clientField("email", capture.value) },
      });
    }
    setContactField(capture.field, capture.value);
    if (capture.field === "preferredContact") markPreferredAsked();
    return advancePhase();
  }
  if (capture.field === "preferred-asked") {
    if (capture.value) setContactField("preferredContact", capture.value);
    markPreferredAsked();
    return advancePhase();
  }
  if (capture.field === "skip-monthly-debts") {
    return commit(skipMonthlyDebts(current));
  }
  if (capture.field === "propose-monthly-debts") {
    const amount = parseMonthlyDebtAmount(capture.value);
    if (amount == null) return current;
    return commit(proposeStatedMonthlyDebts(current, amount));
  }
  if (capture.field === "include-mortgage-debts") {
    const included = parseMonthlyDebtAmount(capture.value);
    const mortgage = subjectMortgagePayment(current);
    if (included == null) return current;
    if (mortgage == null) {
      return commit({ ...current, debtMortgageAsked: true, pendingDebtMortgage: null });
    }
    return commit({
      ...current,
      debtMortgageAsked: true,
      pendingDebtMortgage: { included, mortgage },
    });
  }
  if (capture.field === "subtract-mortgage") {
    return commit(applyMortgageSubtract(current));
  }
  if (capture.field === "statedMonthlyDebts") {
    const amount = parseMonthlyDebtAmount(capture.value);
    if (amount == null) return current;
    return commit(writeStatedMonthlyDebts(current, amount));
  }
  if (capture.field === "skip-housing") {
    return commit(skipEstimatedHousing(current));
  }
  if (capture.field === "estimatedHousing") {
    const amount = Number(capture.value);
    if (!Number.isFinite(amount) || amount <= 0) return current;
    return commit(writeEstimatedHousing(current, amount));
  }
  if (capture.field === "skip-available-assets") {
    return commit(skipAvailableAssets(current));
  }
  if (capture.field === "propose-available-assets") {
    const amount = parseAvailableAssetsAmount(capture.value);
    if (amount == null) return current;
    return commit(proposeStatedAvailableAssets(current, amount));
  }
  if (capture.field === "statedAvailableAssets") {
    const amount = parseAvailableAssetsAmount(capture.value);
    if (amount == null) return current;
    return commit(writeStatedAvailableAssets(current, amount));
  }
  if (capture.field === "skip-property-type") {
    return commit(skipPropertyType(current));
  }
  if (capture.field === "propose-property-type") {
    const value = parsePropertyType(capture.value);
    if (!value) return current;
    return commit(proposePropertyType(current, value));
  }
  if (capture.field === "propertyType") {
    const value = parsePropertyType(capture.value);
    if (!value) return current;
    return commit(writePropertyType(current, value));
  }
  if (capture.field === "propose-rental-lease") {
    const rent = Number(String(capture.value).replace(/[$,]/g, ""));
    if (!Number.isFinite(rent) || rent <= 0) return current;
    const next = proposeTypedLeaseRental(current, `lease for ${rent} a month`);
    return next ? commit(next) : current;
  }
  if (capture.field === "skip-property-address") {
    return commit(skipSubjectAddress(current));
  }
  if (capture.field === "change-property-address") {
    return commit({
      ...current,
      correcting: "property-address",
      correctingLine: "property-address",
    });
  }
  if (capture.field === "propose-subject-address") {
    const address = parseVolunteeredAddress(capture.value) ?? capture.value.trim();
    if (!address) return current;
    return commit(proposeSubjectAddress(current, address));
  }
  if (capture.field === "subjectAddress") {
    const address = parseVolunteeredAddress(capture.value) ?? capture.value.trim();
    if (!address) return current;
    return commit(writeSubjectAddress(current, address));
  }
  if (capture.field === "skip-time-on-job") {
    return commit(skipTimeOnJob(current));
  }
  if (capture.field === "propose-time-on-job") {
    const months = Number(capture.value);
    if (!Number.isFinite(months) || months <= 0) return current;
    return commit(proposeStatedTimeOnJob(current, months));
  }
  if (capture.field === "statedTimeOnJob") {
    const months = parseTimeOnJobMonths(capture.value) ?? Number(capture.value);
    if (!Number.isFinite(months) || months <= 0) return current;
    return commit(writeStatedTimeOnJob(current, months, timeOnJobLabelFromSpoken(capture.value, months)));
  }
  if (capture.field === "change-proposal") {
    return commit(changePendingProposal(current));
  }
  if (capture.field === "skip-current-housing") {
    return commit(skipCurrentHousing(current));
  }
  if (capture.field === "propose-current-housing") {
    const amount = Number(capture.value);
    if (!Number.isFinite(amount) || amount <= 0) return current;
    return commit(proposeStatedCurrentHousing(current, amount));
  }
  if (capture.field === "statedCurrentHousing") {
    const amount = Number(capture.value);
    if (!Number.isFinite(amount) || amount <= 0) return current;
    return commit(writeStatedCurrentHousing(current, amount));
  }
  if (capture.field === "skip-declarations") {
    return commit(skipDeclarations(current));
  }
  if (capture.field === "propose-declarations") {
    if (!isStatedDeclaration(capture.value)) return current;
    return commit(proposeStatedDeclaration(current, capture.value));
  }
  if (capture.field === "statedDeclaration") {
    if (!isStatedDeclaration(capture.value)) return current;
    return commit(writeStatedDeclaration(current, capture.value));
  }
  if (capture.field === "skip-declaration-timing") {
    return commit(skipDeclarationTiming(current));
  }
  if (capture.field === "declarationTiming") {
    const timing = parseDeclarationTiming(capture.value) ?? capture.value.trim();
    if (!timing) return current;
    return commit(writeDeclarationTiming(current, timing));
  }
  if (capture.field === "skip-household") {
    return commit(skipHousehold(current));
  }
  if (capture.field === "propose-household") {
    if (!isStatedHousehold(capture.value)) return current;
    return commit(proposeStatedHousehold(current, capture.value));
  }
  if (capture.field === "statedHousehold") {
    if (!isStatedHousehold(capture.value)) return current;
    return commit(writeStatedHousehold(current, capture.value));
  }
  if (capture.field === "skip-coborrower-name") {
    return commit(skipCoborrowerName(current));
  }
  if (capture.field === "propose-coborrower-name") {
    const name = parseCoborrowerName(capture.value) ?? capture.value.trim();
    if (!name) return current;
    return commit(proposeCoborrowerName(current, name));
  }
  if (capture.field === "coborrowerName") {
    const name = parseCoborrowerName(capture.value) ?? capture.value.trim();
    if (!name) return current;
    return commit(writeCoborrowerName(current, name));
  }
  if (capture.field === "skip-borrower-name") {
    return commit(skipBorrowerName(current));
  }
  if (capture.field === "propose-borrower-name") {
    const name = parseBorrowerName(capture.value) ?? capture.value.trim();
    if (!name) return current;
    return commit(proposeBorrowerName(current, name));
  }
  if (capture.field === "borrowerName") {
    const name = parseBorrowerName(capture.value) ?? capture.value.trim();
    if (!name) return current;
    return commit(writeBorrowerName(current, name));
  }
  if (capture.field === "skip-other-reo") {
    return commit(skipOtherReo(current));
  }
  if (capture.field === "propose-other-reo") {
    if (!isStatedOtherReo(capture.value)) return current;
    return commit(proposeStatedOtherReo(current, capture.value));
  }
  if (capture.field === "statedOtherReo") {
    if (!isStatedOtherReo(capture.value)) return current;
    return commit(writeStatedOtherReo(current, capture.value));
  }
  if (capture.field === "otherReoRent") {
    const rent = Number(String(capture.value).replace(/[$,]/g, ""));
    if (!Number.isFinite(rent) || rent <= 0) return current;
    return commit(applyTypedOtherPropertyRent(current, rent));
  }
  if (capture.field === "otherReoRental") {
    const parsed = decodeTypedOtherPropertyRental(capture.value);
    if (!parsed) return current;
    return commit(applyTypedOtherPropertyRental(current, parsed));
  }
  if (capture.field === "skip-citizenship") {
    return commit(skipCitizenship(current));
  }
  if (capture.field === "citizenship") {
    if (!isFileCitizenshipValue(capture.value)) return current;
    return commit(writeCitizenship(current, capture.value));
  }
  if (capture.field === "skip-former-history") {
    return commit(skipFormerHistory(current));
  }
  if (capture.field === "formerHistory") {
    return commit(writeFormerHistoryNote(current, capture.value));
  }
  if (capture.field === "incomeType") {
    const midFile = Boolean(current.correcting);
    commit({
      ...current,
      incomeType: clientField("incomeType", capture.value),
      incomeAsked: true,
      correcting: null,
      correctingLine: null,
      sections: { ...current.sections, income: false },
      status: midFile ? current.status : undefined,
      confirmedAt: midFile ? current.confirmedAt : undefined,
    });
    return current.workspaceFlow ? current : advancePhase();
  }
  if (capture.field === "occupancy") {
    const midFile = Boolean(current.correcting);
    commit(
      withWorkspaceScenario({
        ...current,
        occupancyChoice: clientField("occupancy", capture.value),
        occupancyAsked: true,
        correcting: null,
        correctingLine: null,
        sections: { ...current.sections, occupancy: false },
        status: midFile ? current.status : undefined,
        confirmedAt: midFile ? current.confirmedAt : undefined,
      }),
    );
    return current.workspaceFlow ? current : advancePhase();
  }
  if (capture.field === "timeline") {
    commit(
      withWorkspaceScenario({
        ...current,
        timelineChoice: clientField("timeline", capture.value),
        timelineAsked: true,
        correcting: null,
      }),
    );
    return current.workspaceFlow ? current : advancePhase();
  }
  if (capture.field === "skip-timeline") {
    return commit({
      ...current,
      timelineAsked: true,
      correcting: null,
    });
  }
  if (capture.field === "skip-subject-lease") {
    return commit(skipSubjectLease(current));
  }
  if (capture.field === "statedSubjectLease") {
    const rent = parseSubjectLeaseAmount(capture.value, current.occupancyChoice.value);
    if (rent == null) return commit({ ...current, subjectLeaseAsked: true });
    const proposed = proposeTypedLeaseRental({ ...current, subjectLeaseAsked: true }, `lease ${rent} a month`);
    return commit(proposed ?? { ...current, subjectLeaseAsked: true });
  }
  if (capture.field === "skip-docs") {
    if (layer2Open(current)) {
      return commit(skipCurrentStillUseful(current));
    }
    skipDocuments();
    if (current.workspaceFlow) return current;
    return advancePhase();
  }
  if (capture.field === "hold-docs") {
    return commit({
      ...current,
      docsHeld: true,
      docsOpen: false,
      correcting: null,
    });
  }
  if (capture.field === "start-docs") {
    return commit({
      ...current,
      docsStarted: true,
      docsHeld: false,
      docsOpen: false,
      correcting: null,
    });
  }
  if (capture.field === "keep-file-fact") {
    return commit(resolveFactConflict(current, "file"));
  }
  if (capture.field === "use-document-fact") {
    return commit(resolveFactConflict(current, "document"));
  }
  if (capture.field === "keep-both-facts") {
    return commit(applyEscalateMotion(resolveFactConflict(current, "both")));
  }
  if (capture.field === "payFrequency") {
    return commit(applyPayFrequencyAnswer(current, capture.value));
  }
  if (capture.field === "bothMonthlyReason") {
    return commit(applyBothMonthlyReasonAnswer(current, capture.value));
  }
  if (capture.field === "raiseWhen") {
    return commit(
      current.awaitingRaiseYtdFar
        ? applyRaiseYtdFarAnswer(current, capture.value)
        : applyRaiseWhenAnswer(current, capture.value),
    );
  }
  if (capture.field === "accept-proposal") {
    return commit(resolveProposal(current, "accept"));
  }
  if (capture.field === "decline-proposal") {
    return commit(resolveProposal(current, "decline"));
  }
  if (capture.field === "yearsInBusiness") {
    return commit(writeYearsInBusiness(current, capture.value));
  }
  if (capture.field === "skip-years-in-business") {
    return commit(skipYearsInBusiness(current));
  }
  if (capture.field === "qualifyingIncome") {
    return commit(writeQualifyingIncome(current, capture.value));
  }
  if (capture.field === "open-docs") {
    if (current.workspaceFlow) {
      return commit({
        ...current,
        docsStarted: true,
        docsOpen: true,
        correcting: null,
      });
    }
    return commit({ ...current, phase: "documents" });
  }
  if (capture.field === "upload-more") {
    return commit(applyUploadMoreMotion(current));
  }
  if (capture.field === "proceed") {
    return commit(applyProceedMotion(current));
  }
  if (capture.field === "not-yet") {
    return commit(applyNotYetMotion(current));
  }
  if (capture.field === "skip-email") {
    return commit(applySkipEmailThenFinish(current));
  }
  if (capture.field === "confirm-draft") {
    if (current.workspaceFlow && !canLooksRight(current) && !current.sampleAccepted) {
      return current;
    }
    if (current.workspaceFlow && !current.sampleAccepted) {
      commit({
        ...applyLooksRightMotion(current),
        correcting: null,
      });
      const nextPrompt = workspacePrompt(current);
      if (nextPrompt === "done" || nextPrompt === "housing" || nextPrompt === "debts") {
        return confirmDraft();
      }
      return current;
    }
    return confirmDraft();
  }
  if (capture.field === "needs-correction") {
    return commit({
      ...current,
      phase: "draft",
      correcting: "correct",
      workspaceDraftStatus: current.workspaceFlow ? "ready" : current.workspaceDraftStatus,
      status: undefined,
      confirmedAt: undefined,
    });
  }
  if (capture.field === "keep-path") {
    return commit({ ...current, correcting: null });
  }
  if (capture.field === "keep-line") {
    let next: FoxIntakeDraft = { ...current, correcting: null, correctingLine: null };
    if (
      current.correcting === "correct" &&
      !current.sampleAccepted &&
      sketchAssembled(next) &&
      nextDocInvite(next)
    ) {
      for (let i = 0; i < 8 && nextDocInvite(next); i += 1) {
        next = { ...skipCurrentInvite(next), correcting: null, correctingLine: null };
      }
    }
    return commit(next);
  }
  if (capture.field === "what-acr" || capture.field === "what-happens-next" || capture.field === "ask-fox") {
    return current;
  }
  if (capture.field === "talk-originator") {
    return commit({
      ...applyEscalateMotion(current),
      loStatus: current.loStatus ?? "in review",
    });
  }
  if (capture.field === "over-price-confirm") {
    return commit({
      ...applyEscalateMotion({ ...current, overPriceConfirmed: true }),
      loStatus: current.loStatus ?? "in review",
    });
  }
  if (capture.field === "correct") {
    const field = capture.value as FoxPrompt;
    return commit({
      ...beginFileEdit(current, field),
      correctingLine: capture.line ?? null,
      sections: unsetForPrompt(current.sections, capture.value),
    });
  }
  if (capture.field === "propose-funds") {
    const [downRaw, loanRaw] = capture.value.split(":");
    const down = Number(downRaw);
    const loan = Number(loanRaw);
    if (!Number.isFinite(down) || !Number.isFinite(loan) || down <= 0 || loan <= 0) return current;
    return commit({
      ...proposeFundsPair(current, down, loan),
      correcting: null,
      correctingLine: null,
    });
  }
  if (capture.field === "note") {
    return addNote(capture.value);
  }
  if (capture.field === "path") {
    return commit({ ...current, path: capture.value, correcting: null });
  }
  if (capture.field === "productIntent") {
    const intent =
      normalizeProductIntent(capture.value) ?? productIntentFromText(capture.value);
    if (!intent) return current;
    return commit(withWorkspaceScenario(applyProductChange(current, intent)));
  }
  if (capture.field === "starter") {
    const price = capture.price ? Number(capture.price.replace(/,/g, "")) : null;
    return commit(
      withWorkspaceScenario(
        applyStarterSketch(current, capture.value, Number.isFinite(price) ? price : null),
      ),
    );
  }
  if (capture.field === "jumboPurpose") {
    return commit(
      withWorkspaceScenario({
        ...current,
        jumboPurpose: capture.value,
        correcting: null,
      }),
    );
  }
  if (capture.field === "accept-jumbo") {
    const purpose: JumboPurpose =
      current.productIntent === "refinance" || current.jumboPurpose === "refinance"
        ? "refinance"
        : "buy";
    return commit(
      withWorkspaceScenario(
        applyProductChange(
          {
            ...current,
            jumboPurpose: purpose,
            jumboOffered: true,
            pendingOffer: undefined,
            correcting: null,
          },
          "jumbo",
        ),
      ),
    );
  }
  if (capture.field === "decline-jumbo") {
    return commit({
      ...current,
      jumboOffered: true,
      pendingOffer: undefined,
      correcting: null,
    });
  }
  if (capture.field === "accept-heloc") {
    return commit(
      withWorkspaceScenario(
        applyProductChange(
          {
            ...current,
            helocOffered: true,
            pendingOffer: undefined,
            correcting: null,
          },
          "heloc",
        ),
      ),
    );
  }
  if (capture.field === "decline-heloc") {
    return commit({
      ...current,
      helocOffered: true,
      pendingOffer: undefined,
      correcting: null,
    });
  }
  if (capture.field === "pending-offer") {
    return commit({
      ...current,
      pendingOffer: capture.value,
      correcting: null,
    });
  }
  if (capture.field === "out-of-state") {
    return commit({ ...current, outOfState: true, correcting: null });
  }
  if (capture.field === "in-state") {
    return commit({ ...current, outOfState: false, correcting: null });
  }
  if (capture.field === "govProgram") {
    return commit({ ...current, govProgram: capture.value, correcting: null });
  }
  if (capture.field === "creditEvent") {
    return commit({ ...current, creditEvent: capture.value, correcting: null });
  }
  if (capture.field === "cashOut") {
    return commit({ ...current, cashOut: true, correcting: null });
  }
  if (capture.field === "amountPurpose") {
    const named = capture.value.trim();
    if (!named || /^(amount|numbers|rough amount)$/i.test(named)) return current;
    return commit({
      ...current,
      amountPurposeLabel: named,
      correcting: null,
    });
  }
  if (capture.field === "loanAmount") {
    const [loanRaw, valueRaw] = capture.value.split(":");
    const loan = Number(loanRaw.replace(/,/g, ""));
    const value = valueRaw ? Number(valueRaw.replace(/,/g, "")) : undefined;
    const hasLoan = Number.isFinite(loan) && loan > 0;
    const hasValue = value != null && Number.isFinite(value) && value > 0;
    return commit(
      withWorkspaceScenario(
        withComputedCompanion(
          withMatrixAfterAmount({
            ...current,
            amountAsked: true,
            correcting: null,
            correctingLine: null,
            valueAsked: hasValue ? true : current.valueAsked,
            loanAmountValue: hasLoan ? loan : current.loanAmountValue,
            propertyValueAmount: hasValue ? value : current.propertyValueAmount,
          }),
          current.downPaymentAmount != null && current.downPaymentAmount > 0 ? "loan" : undefined,
        ),
      ),
    );
  }
  if (capture.field === "propertyValue") {
    const value = Number(capture.value.replace(/,/g, ""));
    const nextPrice = Number.isFinite(value) && value > 0 ? value : current.propertyValueAmount;
    const share = lockedDownShare(current);
    const next = {
      ...current,
      valueAsked: true,
      correcting: null,
      correctingLine: null,
      propertyValueAmount: nextPrice,
    };
    if (
      share != null &&
      nextPrice != null &&
      nextPrice > 0 &&
      nextPrice !== current.propertyValueAmount
    ) {
      const down = Math.round(nextPrice * share);
      const loan = impliedLoanAmount(nextPrice, down);
      if (loan != null) {
        return commit(withWorkspaceScenario(proposeFundsPair(next, down, loan)));
      }
    }
    return commit(
      withWorkspaceScenario(withComputedCompanion(withMatrixAfterAmount(next))),
    );
  }
  if (capture.field === "downPayment") {
    const value = Number(capture.value.replace(/,/g, ""));
    return commit(
      withWorkspaceScenario(
        withComputedCompanion(
          {
            ...current,
            downAsked: true,
            correcting: null,
            correctingLine: null,
            downPaymentAmount:
              Number.isFinite(value) && value > 0 ? value : current.downPaymentAmount,
          },
          current.loanAmountValue != null && current.loanAmountValue > 0 ? "down" : undefined,
        ),
      ),
    );
  }
  if (capture.field === "skip-down") {
    return commit({ ...current, downAsked: true, correcting: null, correctingLine: null });
  }
  if (capture.field === "skip-amount") {
    return commit({
      ...current,
      amountAsked: true,
      correcting: null,
      correctingLine: null,
      loanAmountValue: undefined,
      scenario: current.scenario
        ? { ...current.scenario, loanAmount: undefined }
        : current.scenario,
    });
  }
  if (capture.field === "skip-value") {
    return commit({
      ...current,
      valueAsked: true,
      correcting: null,
      propertyValueAmount: undefined,
    });
  }
  if (capture.field === "skip-credit") {
    return commit(
      withWorkspaceScenario({
        ...current,
        creditBand: undefined,
        creditAsked: true,
        correcting: null,
      }),
    );
  }
  if (capture.field === "creditRange") {
    return commit(
      withWorkspaceScenario({
        ...current,
        creditBand: capture.value,
        creditAsked: true,
        correcting: null,
      }),
    );
  }
  if (capture.field === "termYears") {
    const years = Number(capture.value);
    return commit({
      ...current,
      termYears: Number.isFinite(years) && years > 0 ? years : undefined,
      termAsked: true,
      correcting: null,
    });
  }
  if (capture.field === "skip-term") {
    return commit({ ...current, termAsked: true, termYears: undefined, correcting: null });
  }
  return current;
}

function sectionToPrompt(id: SectionId): FoxPrompt {
  if (id === "contact") return "name";
  if (id === "income") return "income";
  if (id === "occupancy") return "occupancy";
  if (id === "documents") return "documents";
  return "review";
}

function unsetForPrompt(
  sections: FoxIntakeDraft["sections"],
  prompt: string,
): FoxIntakeDraft["sections"] {
  if (prompt === "name" || prompt === "email" || prompt === "phone") {
    return { ...sections, contact: false };
  }
  if (prompt === "income") return { ...sections, income: false };
  if (prompt === "occupancy") return { ...sections, occupancy: false };
  if (prompt === "documents") return { ...sections, documents: false };
  return sections;
}

export function hasRequiredContact(draft: FoxIntakeDraft) {
  return Boolean(
    draft.contact.fullName.value &&
      draft.contact.email.value &&
      draft.contact.phone.value,
  );
}

export function allKeySectionsConfirmed(draft: FoxIntakeDraft) {
  return (
    draft.sections.contact &&
    draft.sections.occupancy &&
    draft.sections.income &&
    draft.sections.documents &&
    draft.sections.notes
  );
}

export function documentForSlot(draft: FoxIntakeDraft, slot: DocSlot) {
  return draft.documents.find((doc) => doc.slot === slot);
}

export function contactComplete(draft: FoxIntakeDraft) {
  return hasRequiredContact(draft);
}

export function questionsComplete(draft: FoxIntakeDraft) {
  return (
    hasRequiredContact(draft) &&
    Boolean(draft.incomeType.value) &&
    draft.occupancyAsked
  );
}

export function canConfirmDraft(draft: FoxIntakeDraft) {
  return (
    questionsComplete(draft) &&
    (draft.documents.length > 0 || draft.documentsSkipped)
  );
}

