import {
  readScenario,
  writeScenario,
  type ExplorerScenario,
} from "@/components/products/scenario";
import { explorerCreditFromStated } from "./types";
import { parsePlaceAddress } from "@/lib/places/address";
import {
  CONFIRMED_STATUS,
  FOX_ACCOUNT_KEY,
  FOX_MESSAGES_KEY,
  FOX_PANEL_KEY,
  INTAKE_DRAFT_VERSION,
  INTAKE_STORAGE_KEY,
  type Capture,
  type DocSpeakRow,
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
import { applyStaffDeskSend, type StaffDeskInput } from "./processingHub";
import {
  mergeAccountMessages,
  staffDeskMessageFact,
} from "@/lib/account/core";
import { writeThreadAnswersToFile } from "./threadAnswers";
import {
  ACCOUNT_FILE_YOURS,
  SIGN_OUT_SAVE_FAILED,
  applyAccountCapture,
  applyAccountCreated,
  applyAccountLetterOpened,
  accountSaveAskOpen,
} from "./account";
import { FAILED_READ_NOTE, isUnreadNote } from "@/lib/docs/accept";
import {
  applyExtractedFields,
  hasLockedSuggestion,
  k1OrdinaryMissingFromExtract,
  scheduleECashFlowMissingFromExtract,
  looksLikeBankFields,
  looksLikeContractFields,
  looksLikeTaxReturnFields,
  packetReadPhase,
  isPurchaseContractConfirmPending,
  looksLikePaystubFields,
  preferFilenameClass,
  promoteExtractClass,
  factValue,
  resolveFactConflict,
  resolveReceivedSlot,
  nextDocInvite,
  skipCurrentInvite,
  skipUnreadDoc,
  retryUnreadDoc,
  writeUnreadNote,
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
  afterRefiLoanAmountWrite,
  beginFileEdit,
  clearLiveQuote,
  retryLiveQuote,
  parseLooseAmount,
  settleLtvConfirm,
  writePurchasePrice,
  changePendingProposal,
  settleResumeAfterCapture,
  persistGuidelineNote,
  withMatrixAfterAmount,
  workspacePrompt,
  deskLineAfterAccountConsume,
  withDeskLineAfterAccountConsume,
  withoutAccountResumeLeftovers,
} from "./workspace";
import { hasHelocLineAmount, skipHelocLine, withHelocToolQuote, writeFirstLien, writeHelocLine } from "./heloc";
import { changeEntityYears } from "./yearsFromEntity";
import {
  START_PATH_KEY,
  consumeHomepageFreshStart,
  homepageFreshEntryPending,
  writeStartPath,
} from "@/components/products/startPath";
import {
  applyStubEmployerSuggestion,
  canLooksRight,
  loanExceedsPurchasePrice,
  proposePublicSuggestion,
  proposeFundsPair,
  resolveProposal,
  skipYearsInBusiness,
  withComputedCompanion,
  withIncomeTypeYearsAsk,
  writeQualifyingIncome,
  writeYearsInBusiness,
} from "./completeness";
import {
  applyBothMonthlyReasonAnswer,
  applyPayFrequencyAnswer,
  applyRaiseWhenAnswer,
  applyRaiseYtdFarAnswer,
  parseExtractMoney,
  writeWageBox5,
  writeTypedStubMonthly,
  skipWageDocs,
  skipPriorStub,
  priorStubAskNeeded,
  skipWageBox5,
  skipWageFrequency,
  skipWageStub,
  acceptStubJob,
  writeWagePayFrequency,
  stubPeriodConfirmOpen,
  canSpeakStubExtract,
  maybeProposeStubExtract,
  isStubExtractProposal,
  isCoverReturnFields,
  applyOwnAllEntity,
  namedTwoK1WhoAskPending,
  selectK1WhoOnLoan,
  skipScheduleEUnread,
} from "./qualifyingIncome";
import {
  skipEstimatedHousing,
  syncCalculatorDraft,
  writeEstimatedHousing,
} from "./calculators";
import { parseSubjectLeaseAmount, proposeTypedLeaseRental, skipSubjectLease } from "./rentalIncome";
import {
  applyMortgageSubtract,
  parseMonthlyDebtAmount,
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
  skipPropertyType,
  skipPropertyZip,
  skipSubjectAddress,
  adoptReuseZip,
  proposeAddressAndAdoptZip,
  proposePlaceAddress,
  skipQuoteAddress,
  writeAddressAndAdoptZip,
  writePropertyType,
  writePropertyZip,
  writeSubjectAddress,
  keepPropertyZip,
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
  skipOtherK1Loan,
  writeOtherK1Loan,
  writeStatedHousehold,
} from "./household";
import {
  confirmWhoOnLoanName,
  isWhoOnLoan,
  proposeWhoOnLoanName,
  skipWhoOnLoan,
  skipWhoOnLoanName,
  withWhoOnLoanDue,
  writeWhoOnLoan,
} from "./whoOnLoan";
import {
  parseCoborrowerName,
  proposeCoborrowerName,
  skipCoborrowerName,
  writeCoborrowerName,
} from "./coborrowerName";
import {
  isBorrowerNameConfirmPending,
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
import {
  acceptPendingLiveCoupon,
  applyCouponChoice,
  dropResolvedAddressConfirmChips,
  keepPendingLiveCoupon,
  normalizeLiveQuoteRows,
  normalizePendingLiveCoupon,
  sealStoredFoxThread,
} from "./liveCoupon";

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function signedNumberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function trimString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeLiveQuote(value: unknown): FoxIntakeDraft["liveQuote"] {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const key = typeof raw.key === "string" ? raw.key.trim() : "";
  const rate = Number(raw.rate);
  const asOf = typeof raw.asOf === "string" ? raw.asOf : "";
  if (!key || !Number.isFinite(rate) || rate <= 0) return undefined;
  const principalAndInterest = numberOrUndefined(raw.principalAndInterest);
  const pts = signedNumberOrUndefined(raw.pts);
  const term = numberOrUndefined(raw.term);
  const interestOnly = numberOrUndefined(raw.interestOnly);
  return {
    key,
    rate,
    asOf,
    ...(principalAndInterest != null ? { principalAndInterest } : {}),
    ...(pts != null ? { pts } : {}),
    ...(term != null && term !== 30 ? { term } : {}),
    ...(interestOnly != null ? { interestOnly } : {}),
    ...(raw.kind === "heloc" ? { kind: "heloc" as const } : {}),
  };
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

function normalizeAssetAccounts(value: unknown): FoxIntakeDraft["assetAccounts"] {
  if (!Array.isArray(value)) return undefined;
  const rows: NonNullable<FoxIntakeDraft["assetAccounts"]> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as { institution?: unknown; last4?: unknown; balance?: unknown; type?: unknown };
    const institution = trimString(raw.institution);
    const last4 = trimString(raw.last4);
    const balance = trimString(raw.balance);
    const type = trimString(raw.type);
    if (!institution && !last4 && !balance) continue;
    rows.push({
      ...(institution ? { institution } : {}),
      ...(last4 ? { last4 } : {}),
      ...(balance ? { balance } : {}),
      ...(type ? { type } : {}),
    });
  }
  return rows.length ? rows : undefined;
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

function readFileId(raw: object): string | undefined {
  const rec = raw as Record<string, unknown>;
  const value = rec.fileId ?? rec.file_id;
  if (typeof value !== "string") return undefined;
  const id = value.trim();
  return id || undefined;
}

export function mintFileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `file_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureFileId(draft: FoxIntakeDraft): FoxIntakeDraft {
  const existing = draft.fileId?.trim();
  if (existing) {
    return existing === draft.fileId ? draft : { ...draft, fileId: existing };
  }
  return { ...draft, fileId: mintFileId() };
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
    docCapSpoken: false,
    docsStarted: false,
    docsHeld: false,
    priorYearSkipped: false,
    federalReturnSkipped: false,
    transcriptFollowUpSkipped: false,
    docSpeak: {},
    lastDocSpeakKey: "",
    secondBankStatementSkipped: false,
    yearsInBusinessAsked: false,
    awaitingYearsInBusiness: false,
    entityYearsAsked: false,
    pendingBusinessStart: null,
    awaitingMonthlyDebts: false,
    emailSkipped: false,
    wageDocsAsked: false,
    wageBox5Asked: false,
    wageFrequencyAsked: false,
    wageStubAsked: false,
    stubExtractAccepted: false,
    priorStubAsked: false,
    awaitingUnreadNote: false,
    awaitingPayFrequency: false,
    awaitingBothMonthlyReason: false,
    awaitingCoverWageGap: false,
    coverWageGapAsked: false,
    householdWagesAsked: false,
    otherK1LoanAsked: false,
    otherK1LoanAnswer: undefined,
    otherK1OnLoan: false,
    k1WhoChoice: undefined,
    incomeLedger: [],
    taxReturnPacketSpoken: false,
    taxReturnPacketCloseAsk: false,
    scheduleECashUnread: false,
    scheduleECashAsked: false,
    awaitingRaiseWhen: false,
    awaitingRaiseYtdFar: false,
    facts: {},
    pendingConflict: null,
    lastSpokenConflictKey: "",
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
    fileId: readFileId(raw),
    accountId: typeof raw.accountId === "string" && raw.accountId.trim() ? raw.accountId.trim() : undefined,
    accountAsk:
      raw.accountAsk === "offer" ||
      raw.accountAsk === "channel" ||
      raw.accountAsk === "email" ||
      raw.accountAsk === "phone" ||
      raw.accountAsk === "sent" ||
      raw.accountAsk === "code"
        ? raw.accountAsk
        : undefined,
    accountChannel: raw.accountChannel === "phone" || raw.accountChannel === "email" ? raw.accountChannel : undefined,
    accountSkipped: Boolean(raw.accountSkipped) || undefined,
    accountSaveAsk: Boolean(raw.accountSaveAsk) || undefined,
    guestProceeded: Boolean(raw.guestProceeded) || undefined,
    accountYoursSpoken: Boolean(raw.accountYoursSpoken) || undefined,
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
    refiPurposeAsked: Boolean(raw.refiPurposeAsked || raw.cashOut),
    overPriceConfirmed: Boolean(raw.overPriceConfirmed),
    overValueSkipped: Boolean(raw.overValueSkipped),
    ltvConfirm: raw.ltvConfirm === "loan" || raw.ltvConfirm === "value" ? raw.ltvConfirm : undefined,
    loanAmountValue: numberOrUndefined(raw.loanAmountValue),
    firstLienAmount: numberOrUndefined(raw.firstLienAmount),
    firstLienAsked: Boolean(raw.firstLienAsked || (Number(raw.firstLienAmount) > 0)),
    helocLineAsked: Boolean(raw.helocLineAsked),
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
    propertyZip:
      typeof raw.propertyZip === "string" && /^\d{5}$/.test(raw.propertyZip.trim())
        ? raw.propertyZip.trim()
        : undefined,
    propertyZipAsked: Boolean(
      raw.propertyZipAsked ||
        (typeof raw.propertyZip === "string" && /^\d{5}$/.test(raw.propertyZip.trim())),
    ),
    addressZipOffered:
      typeof raw.addressZipOffered === "string" && /^\d{5}$/.test(raw.addressZipOffered.trim())
        ? raw.addressZipOffered.trim()
        : undefined,
    subjectAddress:
      typeof raw.subjectAddress === "string" && raw.subjectAddress.trim()
        ? raw.subjectAddress.trim()
        : undefined,
    subjectAddressAsked: Boolean(
      raw.subjectAddressAsked ||
        (typeof raw.subjectAddress === "string" && raw.subjectAddress.trim()),
    ),
    lastPurchaseContractFields: normalizeLastPurchaseContractFields(raw.lastPurchaseContractFields),
    subjectStreet:
      typeof raw.subjectStreet === "string" && raw.subjectStreet.trim()
        ? raw.subjectStreet.trim()
        : undefined,
    subjectCity:
      typeof raw.subjectCity === "string" && raw.subjectCity.trim()
        ? raw.subjectCity.trim()
        : undefined,
    subjectState: raw.subjectState === "CA" ? "CA" : undefined,
    subjectCounty:
      typeof raw.subjectCounty === "string" && raw.subjectCounty.trim()
        ? raw.subjectCounty.trim()
        : undefined,
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
    whoOnLoan:
      raw.whoOnLoan === "just-me" || raw.whoOnLoan === "yes" || raw.whoOnLoan === "skip"
        ? raw.whoOnLoan
        : undefined,
    whoOnLoanAsked: Boolean(raw.whoOnLoanAsked || raw.whoOnLoan),
    whoOnLoanDue: Boolean(raw.whoOnLoanDue),
    whoOnLoanNameAsked: Boolean(raw.whoOnLoanNameAsked),
    pageOtherName:
      typeof raw.pageOtherName === "string" && raw.pageOtherName.trim()
        ? raw.pageOtherName.trim()
        : undefined,
    otherK1LoanAsked: Boolean(raw.otherK1LoanAsked),
    otherK1LoanAnswer:
      raw.otherK1LoanAnswer === "yes" || raw.otherK1LoanAnswer === "no" || raw.otherK1LoanAnswer === "skip"
        ? raw.otherK1LoanAnswer
        : undefined,
    otherK1OnLoan: Boolean(raw.otherK1OnLoan),
    k1WhoChoice:
      raw.k1WhoChoice === "primary" || raw.k1WhoChoice === "other" || raw.k1WhoChoice === "both"
        ? raw.k1WhoChoice
        : undefined,
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
    assetAccounts: normalizeAssetAccounts(raw.assetAccounts),
    pendingOtherReo: raw.pendingOtherReo ? true : null,
    fileExport: normalizeFileExport(raw.fileExport),
    docsOpen: Boolean(raw.docsOpen),
    docsStarted: Boolean(raw.docsStarted),
    docsHeld: Boolean(raw.docsHeld),
    docCapSpoken: Boolean(raw.docCapSpoken),
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
    liveQuoteKey: typeof raw.liveQuoteKey === "string" && raw.liveQuoteKey.trim()
      ? raw.liveQuoteKey.trim()
      : undefined,
    liveQuoteStatus:
      raw.liveQuoteStatus === "ready" || raw.liveQuoteStatus === "unavailable"
        ? raw.liveQuoteStatus
        : undefined,
    liveQuoteVendorReason:
      typeof raw.liveQuoteVendorReason === "string" && raw.liveQuoteVendorReason.trim()
        ? raw.liveQuoteVendorReason.trim().slice(0, 240)
        : undefined,
    liveQuote: normalizeLiveQuote(raw.liveQuote),
    liveQuoteRows: normalizeLiveQuoteRows(raw.liveQuoteRows),
    liveCouponSettled: Boolean(raw.liveCouponSettled),
    pendingLiveCoupon: normalizePendingLiveCoupon(raw.pendingLiveCoupon),
    documents: (raw.documents ?? []).map((doc) => ({
      ...doc,
      status: doc.status ?? "received",
      bytesRef: typeof doc.bytesRef === "string" ? doc.bytesRef : undefined,
      extractClass: doc.extractClass,
      party: doc.party === "coborrower" ? "coborrower" : doc.party === "borrower" ? "borrower" : undefined,
    })),
    facts: normalizeFacts(raw.facts),
    pendingWageExtract: normalizePendingWageExtract(raw.pendingWageExtract),
    pendingConflict: normalizeConflict(raw.pendingConflict),
    lastSpokenConflictKey: typeof raw.lastSpokenConflictKey === "string" ? raw.lastSpokenConflictKey : "",
    unresolvedConflict: Boolean(raw.unresolvedConflict),
    pendingProposal: normalizeProposal(raw.pendingProposal),
    pendingAddress: normalizePendingAddress(raw.pendingAddress),
    skippedClasses: Array.isArray(raw.skippedClasses)
      ? raw.skippedClasses.filter((item): item is ExtractClass => typeof item === "string")
      : [],
    skippedStillUseful: Array.isArray(raw.skippedStillUseful)
      ? raw.skippedStillUseful.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [],
    priorYearSkipped: Boolean(raw.priorYearSkipped),
    federalReturnSkipped: Boolean(raw.federalReturnSkipped),
    transcriptFollowUpSkipped: Boolean(raw.transcriptFollowUpSkipped),
    docSpeak: normalizeDocSpeak(raw.docSpeak),
    lastDocSpeakKey: typeof raw.lastDocSpeakKey === "string" ? raw.lastDocSpeakKey : "",
    secondBankStatementSkipped: Boolean(raw.secondBankStatementSkipped),
    yearsInBusinessAsked: Boolean(raw.yearsInBusinessAsked),
    awaitingYearsInBusiness: Boolean(raw.awaitingYearsInBusiness),
    entityYearsAsked: Boolean(raw.entityYearsAsked),
    pendingBusinessStart: normalizePendingBusinessStart(raw.pendingBusinessStart),
    awaitingMonthlyDebts: Boolean(raw.awaitingMonthlyDebts),
    wageDocsAsked: Boolean(raw.wageDocsAsked),
    wageBox5Asked: Boolean(raw.wageBox5Asked),
    wageFrequencyAsked: Boolean(raw.wageFrequencyAsked),
    wageStubAsked: Boolean(raw.wageStubAsked),
    stubExtractAccepted: Boolean(raw.stubExtractAccepted),
    priorStubAsked: Boolean(raw.priorStubAsked),
    awaitingUnreadNote: Boolean(raw.awaitingUnreadNote),
    awaitingPayFrequency: Boolean(raw.awaitingPayFrequency),
    awaitingBothMonthlyReason: Boolean(raw.awaitingBothMonthlyReason),
    awaitingCoverWageGap: Boolean(raw.awaitingCoverWageGap),
    coverWageGapAsked: Boolean(raw.coverWageGapAsked),
    householdWagesAsked: Boolean(raw.householdWagesAsked),
    pendingCoverWages:
      typeof raw.pendingCoverWages === "string" && raw.pendingCoverWages.trim()
        ? raw.pendingCoverWages.trim()
        : undefined,
    coverWageAnotherJob: Boolean(raw.coverWageAnotherJob),
    coverWageGap:
      raw.coverWageGap &&
      typeof raw.coverWageGap.coverAnnual === "number" &&
      typeof raw.coverWageGap.fileW2Annual === "number"
        ? {
            coverAnnual: raw.coverWageGap.coverAnnual,
            fileW2Annual: raw.coverWageGap.fileW2Annual,
          }
        : undefined,
    incomeLedger: Array.isArray(raw.incomeLedger)
      ? raw.incomeLedger.filter(
          (row): row is NonNullable<FoxIntakeDraft["incomeLedger"]>[number] =>
            Boolean(row && typeof row === "object" && typeof row.id === "string" && typeof row.kind === "string"),
        )
      : [],
    taxReturnPacketRead:
      raw.taxReturnPacketRead === "pending" ||
      raw.taxReturnPacketRead === "reading" ||
      raw.taxReturnPacketRead === "done"
        ? raw.taxReturnPacketRead
        : undefined,
    taxReturnPacketSpoken: Boolean(raw.taxReturnPacketSpoken),
    taxReturnPacketCloseAsk: Boolean(raw.taxReturnPacketCloseAsk),
    scheduleECashUnread: Boolean(raw.scheduleECashUnread),
    scheduleECashAsked: Boolean(raw.scheduleECashAsked),
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

function normalizeDocSpeak(value: FoxIntakeDraft["docSpeak"]): Record<string, DocSpeakRow> {
  if (!value || typeof value !== "object") return {};
  const next: Record<string, DocSpeakRow> = {};
  for (const [key, row] of Object.entries(value)) {
    if (!key || !row || typeof row !== "object") continue;
    next[key] = {
      received: Boolean(row.received),
      named: Boolean(row.named),
      offered: Boolean(row.offered),
      done: Boolean(row.done),
    };
  }
  return next;
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

function normalizePendingWageExtract(
  value: FoxIntakeDraft["pendingWageExtract"],
): FoxIntakeDraft["pendingWageExtract"] {
  if (!value || typeof value !== "object") return undefined;
  const box5 = Number(value.box5);
  const stub = Number(value.stub);
  const frequency = typeof value.frequency === "string" ? value.frequency.trim() : "";
  const employer = typeof value.employer === "string" ? value.employer.trim() : "";
  const employee = typeof value.employee === "string" ? value.employee.trim() : "";
  const monthly = Number(value.monthly);
  const next = {
    ...(Number.isFinite(box5) && box5 > 0 ? { box5 } : {}),
    ...(Number.isFinite(stub) && stub > 0 ? { stub } : {}),
    ...(frequency ? { frequency } : {}),
    ...(employer ? { employer } : {}),
    ...(employee ? { employee } : {}),
    ...(Number.isFinite(monthly) && monthly > 0 ? { monthly } : {}),
    ...(value.w2In ? { w2In: true } : {}),
    ...(value.stubIn ? { stubIn: true } : {}),
    ...(value.variablePay ? { variablePay: true } : {}),
  };
  if (!next.box5 && !next.stub && !next.frequency && !next.employer && !next.employee && !next.monthly && !next.w2In && !next.stubIn && !next.variablePay) {
    return undefined;
  }
  return next;
}

function normalizePendingBusinessStart(
  value: FoxIntakeDraft["pendingBusinessStart"],
): FoxIntakeDraft["pendingBusinessStart"] {
  if (!value || typeof value !== "object") return null;
  const date = typeof value.date === "string" ? value.date.trim() : "";
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const years = Number(value.years);
  const entity = typeof value.entity === "string" ? value.entity.trim() : "";
  if (!date || !label || !Number.isFinite(years) || years <= 0) return null;
  return { date, years: Math.round(years), label, ...(entity ? { entity } : {}) };
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

function normalizeLastPurchaseContractFields(value: FoxIntakeDraft["lastPurchaseContractFields"]) {
  if (!value || typeof value !== "object") return undefined;
  const next: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    const field = String(key ?? "").trim();
    const text = String(raw ?? "").trim();
    if (!field || !text) continue;
    next[field] = text;
  }
  return Object.keys(next).length ? next : undefined;
}

function normalizePendingAddress(value: FoxIntakeDraft["pendingAddress"]) {
  const place = parsePlaceAddress(value);
  if (!place) return undefined;
  return {
    line: place.line,
    street: place.street,
    city: place.city,
    state: "CA" as const,
    zip: place.zip,
    ...(place.county ? { county: place.county } : {}),
  };
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
    const session = window.sessionStorage.getItem(INTAKE_STORAGE_KEY);
    const local = window.localStorage.getItem(INTAKE_STORAGE_KEY);
    const raw = session || local;
    if (!raw) return emptyDraft();
    return normalize(JSON.parse(raw) as unknown);
  } catch {
    return emptyDraft();
  }
}

/** A new browser session must not keep an old Live as of. Same tab reuses sessionStorage. */
export function omitLiveQuoteForResume(draft: FoxIntakeDraft): FoxIntakeDraft {
  const next = { ...draft };
  delete next.liveQuote;
  delete next.liveQuoteKey;
  delete next.liveQuoteStatus;
  delete next.liveQuoteVendorReason;
  delete next.liveQuoteRows;
  delete next.liveCouponSettled;
  delete next.pendingLiveCoupon;
  return next;
}

function persist(draft: FoxIntakeDraft) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(draft));
    window.localStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(omitLiveQuoteForResume(draft)));
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
let accountResumePending = false;

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
  foxMessages = sealStoredFoxThread(
    dropResolvedAddressConfirmChips(migrateRestoredFoxMessages(messages), current),
  );
  messagesHydrated = true;
  persistMessages(foxMessages);
  return foxMessages;
}

function hydrateFoxMessages() {
  if (typeof window === "undefined") return foxMessages;
  if (consumeSignOutSentinel()) {
    wipeSignedOutBrowser();
    return foxMessages;
  }
  if (messagesHydrated) return foxMessages;
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
  if (draft.fileId?.trim()) return true;
  if (fileExists(draft) || workspaceSessionStarted(draft, messages)) return true;
  return Boolean(
    (draft.skippedClasses && draft.skippedClasses.length > 0) ||
      (draft.skippedStillUseful && draft.skippedStillUseful.length > 0) ||
      draft.documentsSkipped,
  );
}

function resumeWorkspaceEntry(path?: IntakePath | null, intent: ProductIntent | null = null) {
  markWorkspaceEntry(current.path ?? path);
  if (!current.fileId) {
    commit(ensureFileId({ ...current, workspaceFlow: true }));
  } else if (!current.workspaceFlow) {
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

const FILE_STORAGE_KEYS = [INTAKE_STORAGE_KEY, FOX_MESSAGES_KEY, START_PATH_KEY, FOX_PANEL_KEY];
const PREVIEW_STORAGE_KEYS = [...FILE_STORAGE_KEYS, FOX_ACCOUNT_KEY];
/** Browser keys Sign out clears. File on the account / Blob stays. */
export const SIGN_OUT_STORAGE_KEYS = [
  "onyx.foxIntake.draft",
  "onyx.fox.messages",
  "onyx.fox.account",
  "onyx.fox.panelOpen",
  "onyx.fox.sawLegal",
  "onyx.startPath",
  "onyx.homepageFresh",
] as const;
/** Account session is localStorage/sessionStorage only. No cookie is set. */
export const SIGN_OUT_COOKIE_NAMES: readonly string[] = [];
/** Survives a same-tab persist race so the next load is a clean guest desk. */
export const SIGN_OUT_SENTINEL_KEY = "onyx.fox.signedOut";

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

function clearFileWorkspaceStorage() {
  if (typeof window === "undefined") return;
  for (const key of FILE_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      // Private mode / quota.
    }
  }
}

/** Start over wipes this File to a browser-only sketch. Account record stays on the server. */
export function startOverWorkspace(path: IntakePath | null = null) {
  clearFileWorkspaceStorage();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(FOX_ACCOUNT_KEY);
      window.sessionStorage.removeItem(FOX_ACCOUNT_KEY);
    } catch {
      // Private mode / quota.
    }
  }
  foxMessages = [];
  messagesHydrated = true;
  hydrated = false;
  workspaceEntryKey = null;
  current = {
    ...emptyDraft(),
    facts: {},
    notes: [],
    documents: [],
    documentsSkipped: false,
    docCapSpoken: false,
    pendingProposal: null,
    pendingConflict: null,
    lastSpokenConflictKey: "",
    employmentHistory: [],
    conditions: [],
    skippedStillUseful: [],
    skippedClasses: [],
  };
  const next = resetWorkspaceForEntry(path, null);
  if (path) writeStartPath(path);
  return next;
}

export function markDocCapSpoken() {
  if (current.docCapSpoken) return current;
  commit({ ...current, docCapSpoken: true });
  return current;
}

/** Open a new File and mint file_id. Not a refresh / homepage resume. */
export function resetWorkspaceForEntry(
  path: IntakePath | null,
  intent: ProductIntent | null = null,
) {
  markWorkspaceEntry(path);
  current = ensureFileId({
    ...emptyDraft(),
    path: path ?? undefined,
    productIntent: intent ?? undefined,
    workspaceFlow: true,
    updatedAt: new Date().toISOString(),
  });
  clearFoxMessages();
  persist(current);
  emit();
  return current;
}

export function beginAccountResume() {
  accountResumePending = true;
  hydrated = true;
}

export function failAccountResume() {
  accountResumePending = false;
  resumedAccountEmail = "";
  hydrated = true;
  emit();
}

let resumedAccountEmail = "";

export function getResumedAccountEmail() {
  return resumedAccountEmail;
}

export function accountResumeIsPending() {
  return accountResumePending;
}

/** Resume this browser File. leftover ?fresh=1 must not wipe. */
export function continueWorkspaceFromEntry(
  path: IntakePath | null,
  intent: ProductIntent | null = null,
  entry?: { fresh?: boolean },
) {
  if (accountResumePending) return current;
  if (!hydrated) hydrateFoxDraft();
  hydrateFoxMessages();
  if (entry?.fresh || homepageFreshEntryPending()) {
    consumeHomepageFreshStart();
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
  if (consumeSignOutSentinel()) {
    wipeSignedOutBrowser();
    return current;
  }
  hydrateFoxMessages();
  if (hydrated) return current;
  if (workspaceEntryKey != null) {
    hydrated = true;
    return current;
  }
  current = readStored();
  if (!current.fileId && shouldResumeWorkspaceEntry(current, foxMessages)) {
    current = ensureFileId(current);
  }
  if (!current.scenario) {
    const scenario = readScenario();
    if (scenario) current = withScenario(current, scenario);
  }
  hydrated = true;
  persist(current);
  foxMessages = dropResolvedAddressConfirmChips(foxMessages, current);
  persistMessages(foxMessages);
  emit();
  return current;
}

export function getFoxDraft() {
  return current;
}

/** Test / replay helper. Composer ingest still goes through applyExtractWrite. */
export function loadIntakeDraft(next: FoxIntakeDraft) {
  return commit(next);
}

export function subscribeFoxDraft(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getServerDraft() {
  return emptyDraft();
}

function commit(next: FoxIntakeDraft) {
  current = { ...withHelocToolQuote(syncCalculatorDraft(next)), updatedAt: new Date().toISOString() };
  persist(current);
  emit();
  if (current.accountId || readAccountSession()) persistLinkedAccountFile();
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

export function setLiveQuoteResult(
  key: string,
  quote: FoxIntakeDraft["liveQuote"] | null,
  rows?: FoxIntakeDraft["liveQuoteRows"],
  reason?: string,
) {
  if (!key) return current;
  const vendorReason =
    typeof reason === "string" && reason.trim() ? reason.trim().slice(0, 240) : undefined;
  if (quote && current.liveQuote?.key === quote.key && current.liveQuoteStatus === "ready") {
    if (rows?.length && !current.liveQuoteRows?.length) {
      return commit({ ...current, liveQuoteRows: rows, liveQuoteVendorReason: undefined });
    }
    return current;
  }
  if (!quote && current.liveQuoteKey === key && current.liveQuoteStatus === "unavailable") {
    if (vendorReason && current.liveQuoteVendorReason !== vendorReason) {
      return commit({ ...current, liveQuoteVendorReason: vendorReason });
    }
    return current;
  }
  return commit({
    ...current,
    liveQuoteKey: key,
    liveQuoteStatus: quote ? "ready" : "unavailable",
    liveQuote: quote ?? undefined,
    liveQuoteRows: quote ? rows ?? current.liveQuoteRows : undefined,
    liveQuoteVendorReason: quote ? undefined : vendorReason,
    liveCouponSettled: quote ? false : current.liveCouponSettled,
    pendingLiveCoupon: quote ? undefined : current.pendingLiveCoupon,
  });
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

/** Homepage CTA: resume this browser File. Mint only when the browser is empty. */
export function beginWorkspaceFromHero(path: IntakePath) {
  if (!hydrated) hydrateFoxDraft();
  hydrateFoxMessages();
  if (shouldResumeWorkspaceEntry()) {
    return resumeWorkspaceEntry(current.path ?? path);
  }
  return resetWorkspaceForEntry(path, null);
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
    loanAmount: draft.loanAmountValue,
    propertyValue: draft.propertyValueAmount ?? scenario.propertyValue,
    downPayment: draft.downPaymentAmount,
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
  const party = input.party ?? (current.workingOnCoborrower ? "coborrower" : "borrower");
  const incomingBorrowerId =
    party !== "coborrower" && (input.extractClass === "government_id" || input.slot === "id");
  const skippedClasses = incomingBorrowerId
    ? (current.skippedClasses ?? []).filter((kind) => kind !== "government_id")
    : current.skippedClasses;
  const documents = [
    ...current.documents,
    {
      ...input,
      status: input.status ?? "received",
      note: input.note,
      party,
    },
  ];
  const keepPhase =
    current.workspaceFlow &&
    (current.sampleAccepted || current.phase === "confirmed" || Boolean(current.motion));
  const next = commit(
    restripeGatheringOrReady({
      ...current,
      documents,
      skippedClasses,
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

/** Period Use this already wrote this stub. A late empty page-read must not stamp unread. */
function paystubAlreadyWritten(draft: FoxIntakeDraft, doc?: ReceivedDoc) {
  if (!doc) return false;
  const isStub =
    doc.extractClass === "paystub" ||
    doc.slot === "paystubs" ||
    preferFilenameClass(doc.extractClass ?? "other", doc.name) === "paystub";
  if (!isStub) return false;
  if (doc.status !== "extracted" || isUnreadNote(doc.note)) return false;
  return Boolean(
    draft.stubExtractAccepted ||
      factValue(draft, "gross_period") ||
      factValue(draft, "paystub_amount"),
  );
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
  const filenameClass = preferFilenameClass("other", name);
  const extractedClass = promoteExtractClass(
    filenameClass === "government_id"
      ? "government_id"
      : looksLikePaystubFields(input.fields) && input.extractClass === "other"
        ? "paystub"
        : input.extractClass,
    input.fields,
  );
  const bankInvite = nextDocInvite(current) === "bank_statement";
  const idWageLocked =
    extractedClass === "government_id" || extractedClass === "paystub" || extractedClass === "w2";
  const lockedSuggestion = hasLockedSuggestion(extractedClass, input.fields);
  const emptyForClass =
    idWageLocked ||
    (extractedClass === "purchase_contract" && !looksLikeContractFields(input.fields)) ||
    ((bankInvite || extractedClass === "bank_statement") &&
      !looksLikeBankFields(input.fields) &&
      !looksLikeContractFields(input.fields)) ||
    (extractedClass === "tax_return" && !looksLikeTaxReturnFields(input.fields));
  const packetContinue = Boolean(packetReadPhase(input.fields));
  const unreadEmpty =
    !failed &&
    !lockedSuggestion &&
    !isCoverReturnFields(input.fields) &&
    emptyForClass &&
    !packetContinue;
  const k1Unread = !failed && k1OrdinaryMissingFromExtract(input.fields, name);
  const scheduleEUnread = !failed && scheduleECashFlowMissingFromExtract(input.fields);
  const box5Read = Boolean(
    String(input.fields?.medicare_wages ?? "").trim() || String(input.fields?.box5 ?? "").trim(),
  );
  const stubRead = Boolean(
    String(input.fields?.gross_period ?? "").trim() && String(input.fields?.pay_frequency ?? "").trim(),
  );
  const stubPeriodOpen = stubPeriodConfirmOpen(current);
  const stubCanSpeak = canSpeakStubExtract(current, input.fields);
  const silentStubReceive = stubPeriodOpen && !stubCanSpeak && !box5Read;
  const treatFailed =
    (Boolean(failed || unreadEmpty || k1Unread || scheduleEUnread) && !box5Read && !stubRead) ||
    silentStubReceive;
  const matchingDoc = current.documents.find(
    (doc) => doc.receivedAt === receivedAt && doc.name === name,
  );
  /** Period already wrote this stub. A late empty page-read is not unread. */
  if (treatFailed && paystubAlreadyWritten(current, matchingDoc)) {
    return {
      draft: current,
      writes: [],
      conflict: null,
      quietLines: [],
      extractClass: matchingDoc?.extractClass ?? "paystub",
    };
  }
  const displayClass =
    treatFailed || extractedClass === "other"
      ? preferFilenameClass(extractedClass, name)
      : extractedClass;
  const applyClass = stubPeriodOpen && stubCanSpeak ? "paystub" : extractedClass;
  let applied = treatFailed
    ? {
        draft: { ...current, looksRightHold: true },
        writes: [],
        conflict: null,
        quietLines: note && isUnreadNote(note) ? [note] : [FAILED_READ_NOTE],
      }
    : applyExtractedFields(current, { ...input, extractClass: applyClass });
  if (
    !treatFailed &&
    stubPeriodOpen &&
    stubCanSpeak &&
    !isStubExtractProposal(applied.draft.pendingProposal)
  ) {
    applied = {
      ...applied,
      draft: maybeProposeStubExtract(
        { ...applied.draft, pendingConflict: null, awaitingPayFrequency: false },
        Object.fromEntries(
          Object.entries(input.fields ?? {}).map(([key, value]) => [key, String(value ?? "")]),
        ),
        "paystub",
      ),
    };
  }
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
  if (
    current.workspaceFlow &&
    (isBorrowerNameConfirmPending(current) || isPurchaseContractConfirmPending(current) || nextDocInvite(current))
  ) {
    return commit(
      restripeGatheringOrReady(skipCurrentInvite({ ...current, docsHeld: false })),
    );
  }
  if (current.workspaceFlow && !current.sampleAccepted) {
    return current;
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
  persistLinkedAccountFile();
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

/** Mint file_id on an existing File only. Empty draft stays empty. */
export function ensureCurrentFileId() {
  if (current.fileId?.trim()) return current;
  if (!fileExists(current) && !workspaceSessionStarted(current, foxMessages)) return current;
  return commit(ensureFileId(current));
}

/** Desk Send: foxLine onto /start. Keeps in_queue. Silent notes stay off the thread. */
export function sendStaffDeskLine(input: StaffDeskInput) {
  const applied = applyStaffDeskSend(ensureFileId(current), input);
  if (applied.error || !applied.threadLine) {
    return { draft: current, threadLine: "", error: applied.error ?? "foxLine required" };
  }
  commit(applied.draft);
  appendFoxThreadLine(applied.threadLine, { facts: [staffDeskMessageFact()] });
  persistLinkedAccountFile();
  return { draft: current, threadLine: applied.threadLine };
}

type AccountSession = { token: string; fileId: string; accountId: string };

function readAccountSession(): AccountSession | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(FOX_ACCOUNT_KEY) || window.sessionStorage.getItem(FOX_ACCOUNT_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as AccountSession;
    if (!parsed?.token || !parsed.fileId) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeAccountSession(session: AccountSession | undefined) {
  if (typeof window === "undefined") return;
  try {
    if (!session) {
      window.localStorage.removeItem(FOX_ACCOUNT_KEY);
      window.sessionStorage.removeItem(FOX_ACCOUNT_KEY);
    } else {
      const raw = JSON.stringify(session);
      window.localStorage.setItem(FOX_ACCOUNT_KEY, raw);
      window.sessionStorage.setItem(FOX_ACCOUNT_KEY, raw);
    }
  } catch {
    // Preview storage can be blocked.
  }
  emit();
}

export function getAccountSession() {
  return readAccountSession();
}

export function getAccountSessionToken() {
  return readAccountSession()?.token || "";
}

/** Refresh /start without ?account= still rehydrates staff foxLine from the File. */
export function linkedAccountRefreshQuery(): { token?: string; fileId?: string } | undefined {
  if (typeof window === "undefined") return undefined;
  if (!hydrated) hydrateFoxDraft();
  const session = readAccountSession();
  if (session?.token) return { token: session.token };
  const fileId = current.fileId?.trim();
  return fileId ? { fileId } : undefined;
}

export function applyAccountResume(draft: FoxIntakeDraft, messages: FoxMessage[], session?: AccountSession) {
  accountResumePending = false;
  const filled = writeThreadAnswersToFile(draft, messages);
  const consumed = applyAccountLetterOpened({ ...filled, workspaceFlow: true });
  const desk = deskLineAfterAccountConsume(consumed);
  const spoken = withoutAccountResumeLeftovers(
    withDeskLineAfterAccountConsume(
      mergeAccountMessages(getFoxMessages(), messages, consumed),
      desk,
      consumed,
    ),
    consumed,
  );
  current = {
    ...ensureFileId(consumed),
    accountYoursSpoken: spoken.some((item) => item.role === "fox" && item.text.trim() === ACCOUNT_FILE_YOURS),
  };
  persist(current);
  persistMigratedMessages(spoken);
  if (session) writeAccountSession(session);
  hydrated = true;
  workspaceEntryKey = workspaceEntryToken(current.path);
  persistLinkedAccountFile();
  emit();
  return current;
}

export async function createLinkedAccount(input: { email?: string; phone?: string }) {
  const draft = ensureFileId(current);
  if (draft !== current) commit(draft);
  const response = await fetch("/api/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "create",
      email: input.email,
      phone: input.phone,
      draft,
      messages: getFoxMessages(),
    }),
  });
  if (!response.ok) return undefined;
  const snapshot = (await response.json()) as {
    fileId: string;
    accountId: string;
    magicLink: string;
    code?: string;
    sent?: boolean;
    sendReason?: string | null;
    sameFile?: boolean;
    draft: FoxIntakeDraft;
    messages: FoxMessage[];
  };
  if (!snapshot.sent) {
    commit({
      ...current,
      fileId: snapshot.fileId || current.fileId,
      accountAsk: input.phone ? "phone" : "email",
      accountSkipped: false,
      accountChannel: input.phone ? "phone" : "email",
    });
    return snapshot;
  }
  if (snapshot.sameFile) {
    return snapshot;
  }
  const token = new URL(snapshot.magicLink, "https://onyx.local").searchParams.get("account") || "";
  if (token) writeAccountSession({ token, fileId: snapshot.fileId, accountId: snapshot.accountId });
  commit(
    applyAccountCreated(current, {
      fileId: snapshot.fileId,
      accountId: snapshot.accountId,
      channel: input.phone ? "phone" : "email",
    }),
  );
  persistLinkedAccountFile();
  return snapshot;
}

export async function resumeAccountFromQuery(input: { token?: string; code?: string; fileId?: string }) {
  const query = input.token
    ? `account=${encodeURIComponent(input.token)}`
    : input.code
      ? `code=${encodeURIComponent(input.code)}`
      : input.fileId
        ? `file=${encodeURIComponent(input.fileId)}`
        : "";
  if (!query) return undefined;
  let path = `/api/account?${query}`;
  if (typeof window !== "undefined") {
    const secret = new URL(window.location.href).searchParams.get("x-vercel-protection-bypass");
    if (secret) {
      path += `&x-vercel-protection-bypass=${encodeURIComponent(secret)}`;
    }
  }
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    failAccountResume();
    return undefined;
  }
  const snapshot = (await response.json()) as {
    fileId: string;
    accountId: string;
    magicLink: string;
    code?: string;
    email?: string;
    draft: FoxIntakeDraft;
    messages: FoxMessage[];
  };
  const token = new URL(snapshot.magicLink, "https://onyx.local").searchParams.get("account") || "";
  const saved = String(snapshot.email ?? "").trim();
  resumedAccountEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(saved) ? saved : "";
  applyAccountResume(snapshot.draft, snapshot.messages, token
    ? { token, fileId: snapshot.fileId, accountId: snapshot.accountId }
    : undefined);
  return snapshot;
}

let persistAccountTimer: ReturnType<typeof setTimeout> | number | undefined;

function flushPersistLinkedAccount() {
  if (accountResumePending) return;
  const session = readAccountSession();
  if (!session?.token || typeof window === "undefined") return;
  if (persistAccountTimer) {
    window.clearTimeout(persistAccountTimer);
    persistAccountTimer = undefined;
  }
  void fetch("/api/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "persist",
      token: session.token,
      draft: current,
      messages: getFoxMessages(),
    }),
  }).catch(() => undefined);
}

export function persistLinkedAccountFile() {
  const session = readAccountSession();
  if (!session?.token || typeof window === "undefined") return;
  if (persistAccountTimer) window.clearTimeout(persistAccountTimer);
  persistAccountTimer = window.setTimeout(() => {
    persistAccountTimer = undefined;
    flushPersistLinkedAccount();
  }, 200);
}

/** Awaited persist for Sign out. Fire-and-forget flush must not be used to decide clear. */
export async function persistLinkedAccountFileNow(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const session = readAccountSession();
  if (!session?.token) return !current.accountId;
  if (persistAccountTimer) {
    window.clearTimeout(persistAccountTimer);
    persistAccountTimer = undefined;
  }
  try {
    const response = await fetch("/api/account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "persist",
        token: session.token,
        draft: current,
        messages: getFoxMessages(),
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function clearSignOutBrowserState() {
  if (typeof window === "undefined") return;
  for (const key of SIGN_OUT_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      // Private mode / quota.
    }
  }
}

function writeSignOutSentinel() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SIGN_OUT_SENTINEL_KEY, "1");
    window.localStorage.setItem(SIGN_OUT_SENTINEL_KEY, "1");
  } catch {
    // Private mode / quota.
  }
}

function consumeSignOutSentinel() {
  if (typeof window === "undefined") return false;
  try {
    const flagged =
      window.sessionStorage.getItem(SIGN_OUT_SENTINEL_KEY) === "1" ||
      window.localStorage.getItem(SIGN_OUT_SENTINEL_KEY) === "1";
    if (!flagged) return false;
    window.sessionStorage.removeItem(SIGN_OUT_SENTINEL_KEY);
    window.localStorage.removeItem(SIGN_OUT_SENTINEL_KEY);
    return true;
  } catch {
    return false;
  }
}

function wipeSignedOutBrowser() {
  clearSignOutBrowserState();
  foxMessages = [];
  messagesHydrated = true;
  hydrated = true;
  workspaceEntryKey = null;
  resumedAccountEmail = "";
  accountResumePending = false;
  current = {
    ...emptyDraft(),
    path: "acr",
    workspaceFlow: true,
  };
  writeAccountSession(undefined);
  persist(current);
  persistMessages([]);
}

/**
 * Sign out clears this browser. Persist first. Never delete the stored File.
 * Save fail keeps the local copy.
 */
export async function signOutLinkedAccount(): Promise<{
  ok: boolean;
  cleared: boolean;
  message?: string;
  fileId?: string;
}> {
  const session = readAccountSession();
  const fileId = session?.fileId || current.fileId;
  if (session?.token || current.accountId) {
    const saved = await persistLinkedAccountFileNow();
    if (!saved) {
      return {
        ok: false,
        cleared: false,
        message: SIGN_OUT_SAVE_FAILED,
        fileId,
      };
    }
  }
  writeSignOutSentinel();
  wipeSignedOutBrowser();
  return { ok: true, cleared: true, fileId };
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => flushPersistLinkedAccount());
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
    if (
      capture.field === "skip-docs" ||
      capture.field === "skip-unread-doc" ||
      capture.field === "skip-wage-docs" ||
      !hasUnreadReceivedDoc(current)
    ) {
      current = { ...current, looksRightHold: false };
    }
  }
  const result = applyCaptureBody(capture);
  const settled = settleResumeAfterCapture(before, capture, result);
  if (settled === result) return result;
  return commit(settled);
}

function applyCaptureBody(capture: Capture) {
  if (
    capture.field === "create-account" ||
    capture.field === "login-account" ||
    capture.field === "skip-account" ||
    capture.field === "save-this-file" ||
    capture.field === "account-channel" ||
    capture.field === "account-email" ||
    capture.field === "account-phone"
  ) {
    return commit(applyAccountCapture(current, capture));
  }
  if (capture.field === "fullName" || capture.field === "email" || capture.field === "phone" || capture.field === "preferredContact") {
    if (capture.field === "email" && current.workspaceFlow && (current.pendingFinish || current.sampleAccepted)) {
      const accountDoor =
        accountSaveAskOpen(current) ||
        current.accountAsk === "channel" ||
        current.accountAsk === "email" ||
        current.accountAsk === "offer";
      if (current.pendingFinish && looksLikeEmail(capture.value) && !accountDoor) {
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
    return commit(writeStatedMonthlyDebts(current, amount));
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
    return commit(writePropertyType(current, value));
  }
  if (capture.field === "propertyType") {
    const value = parsePropertyType(capture.value);
    if (!value) return current;
    return commit(writePropertyType(current, value));
  }
  if (capture.field === "skip-property-zip") {
    return commit(skipPropertyZip(current));
  }
  if (capture.field === "keep-property-zip") {
    return commit(keepPropertyZip(current));
  }
  if (capture.field === "propertyZip") {
    const next = writePropertyZip(current, capture.value);
    if (next === current) return current;
    return commit(next);
  }
  if (capture.field === "propose-rental-lease") {
    const rent = Number(String(capture.value).replace(/[$,]/g, ""));
    if (!Number.isFinite(rent) || rent <= 0) return current;
    const next = proposeTypedLeaseRental(current, `lease for ${rent} a month`);
    return next ? commit(next) : current;
  }
  if (capture.field === "skip-property-address") {
    return commit(skipQuoteAddress(current));
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
    return commit(proposeAddressAndAdoptZip(current, address));
  }
  if (capture.field === "propose-place-address") {
    const place = parsePlaceAddress(capture.value);
    if (!place) return current;
    return commit(proposePlaceAddress(current, place));
  }
  if (capture.field === "subjectAddress") {
    const address = parseVolunteeredAddress(capture.value) ?? capture.value.trim();
    if (!address) return current;
    return commit(writeAddressAndAdoptZip(current, address));
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
  if (capture.field === "change-entity-years") {
    return commit(changeEntityYears(current));
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
  if (capture.field === "skip-who-on-loan") {
    return commit(skipWhoOnLoan(current));
  }
  if (capture.field === "skip-who-on-loan-name") {
    return commit(skipWhoOnLoanName(current));
  }
  if (capture.field === "whoOnLoan") {
    if (!isWhoOnLoan(capture.value)) return current;
    return commit(writeWhoOnLoan(current, capture.value));
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
  if (capture.field === "k1-who") {
    const who =
      capture.value === "primary" || capture.value === "other" || capture.value === "both"
        ? capture.value
        : undefined;
    if (!who) return current;
    return commit(selectK1WhoOnLoan(current, who));
  }
  if (capture.field === "other-k1-loan") {
    if (namedTwoK1WhoAskPending(current)) {
      return current;
    }
    if (capture.value !== "yes" && capture.value !== "no") return current;
    return commit(writeOtherK1Loan(current, capture.value === "yes"));
  }
  if (capture.field === "skip-other-k1-loan") {
    return commit(skipOtherK1Loan(current));
  }
  if (capture.field === "skip-coborrower-name") {
    return commit(skipCoborrowerName(current));
  }
  if (capture.field === "propose-coborrower-name") {
    const name = parseCoborrowerName(capture.value) ?? capture.value.trim();
    if (!name) return current;
    return commit(
      current.whoOnLoan === "yes" ? proposeWhoOnLoanName(current, name) : proposeCoborrowerName(current, name),
    );
  }
  if (capture.field === "coborrowerName") {
    const name = parseCoborrowerName(capture.value) ?? capture.value.trim();
    if (!name) return current;
    return commit(
      current.whoOnLoan === "yes" ? confirmWhoOnLoanName(current, name) : writeCoborrowerName(current, name),
    );
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
  if (capture.field === "skip-income") {
    return commit({
      ...current,
      incomeAsked: true,
      correcting: current.correcting === "income" ? null : current.correcting,
      correctingLine: current.correctingLine === "income" ? null : current.correctingLine,
    });
  }
  if (capture.field === "incomeType") {
    const midFile = Boolean(current.correcting);
    commit(
      withWhoOnLoanDue(
      withIncomeTypeYearsAsk({
        ...current,
        incomeType: clientField("incomeType", capture.value),
        incomeAsked: true,
        correcting: null,
        correctingLine: null,
        sections: { ...current.sections, income: false },
        status: midFile ? current.status : undefined,
        confirmedAt: midFile ? current.confirmedAt : undefined,
      }),
      ),
    );
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
    if (priorStubAskNeeded(current)) {
      return commit(skipPriorStub(current));
    }
    if (
      isBorrowerNameConfirmPending(current) ||
      isPurchaseContractConfirmPending(current) ||
      (nextDocInvite(current) && !layer2Open(current))
    ) {
      return commit(restripeGatheringOrReady(skipCurrentInvite({ ...current, docsHeld: false })));
    }
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
  if (capture.field === "skip-wage-docs") {
    return commit(skipWageDocs(current));
  }
  if (capture.field === "skip-prior-stub") {
    return commit(skipPriorStub(current));
  }
  if (capture.field === "retry-unread-doc") {
    return commit(retryUnreadDoc(current));
  }
  if (capture.field === "note-unread-doc") {
    return commit({ ...current, awaitingUnreadNote: true });
  }
  if (capture.field === "skip-unread-doc") {
    return commit(skipUnreadDoc(current));
  }
  if (capture.field === "w2Box5") {
    const annual = parseExtractMoney(capture.value) ?? Number(String(capture.value).replace(/,/g, ""));
    return commit(writeWageBox5(current, Number.isFinite(annual) ? annual : 0));
  }
  if (capture.field === "skip-w2-box5") {
    return commit(skipWageBox5(current));
  }
  if (capture.field === "wagePayFrequency") {
    return commit(writeWagePayFrequency(current, capture.value));
  }
  if (capture.field === "skip-w2-pay-frequency") {
    return commit(skipWageFrequency(current));
  }
  if (capture.field === "paystubMonthly") {
    const monthly = parseExtractMoney(capture.value) ?? Number(String(capture.value).replace(/,/g, ""));
    return Number.isFinite(monthly) && monthly > 0 ? commit(writeTypedStubMonthly(current, monthly)) : current;
  }
  if (capture.field === "skip-paystub-monthly") {
    return commit(skipWageStub(current));
  }
  if (capture.field === "stubJob") {
    return capture.value === "same" || capture.value === "two"
      ? commit(acceptStubJob(current, capture.value))
      : current;
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
  if (capture.field === "couponChoice") {
    return commit(applyCouponChoice(current, capture.value));
  }
  if (capture.field === "retry-rateflow") {
    return commit({ ...current, ...retryLiveQuote() });
  }
  if (capture.field === "accept-live-coupon") {
    return commit(acceptPendingLiveCoupon(current));
  }
  if (capture.field === "keep-live-coupon") {
    return commit(keepPendingLiveCoupon(current));
  }
  if (capture.field === "skip-schedule-e-unread") {
    return commit(skipScheduleEUnread(current));
  }
  if (capture.field === "own-all-entity") {
    return commit(applyOwnAllEntity(current));
  }
  if (capture.field === "accept-proposal") {
    return commit(withWorkspaceScenario(resolveProposal(current, "accept")));
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
        docsOpen: false,
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
    if (
      current.workspaceFlow &&
      !current.sampleAccepted &&
      (!canLooksRight(current) || current.pendingProposal || current.pendingConflict || current.pendingAddress)
    ) {
      return current;
    }
    if (current.workspaceFlow && !current.sampleAccepted) {
      commit({
        ...applyLooksRightMotion(current),
        correcting: null,
      });
      return confirmDraft();
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
    return commit({ ...current, correcting: null, correctingLine: null });
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
    if (!loanExceedsPurchasePrice(current)) {
      return commit({ ...current, overPriceConfirmed: false });
    }
    return commit({
      ...applyEscalateMotion({ ...current, overPriceConfirmed: true }),
      loStatus: current.loStatus ?? "in review",
    });
  }
  if (capture.field === "keep-ltv-confirm") {
    return commit(settleLtvConfirm(current));
  }
  if (capture.field === "skip-over-value") {
    return commit({
      ...current,
      overValueSkipped: true,
      ltvConfirm: undefined,
      liveCouponSettled:
        current.liveQuoteStatus === "unavailable" ? true : current.liveCouponSettled,
      correcting: null,
      correctingLine: null,
    });
  }
  if (capture.field === "correct") {
    const field = capture.value as FoxPrompt;
    const edited = beginFileEdit(current, field, capture.line);
    return commit({
      ...edited,
      correctingLine: capture.line ?? edited.correctingLine ?? null,
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
    if (current.awaitingUnreadNote) {
      return commit(writeUnreadNote(current, capture.value));
    }
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
    return commit({ ...current, cashOut: true, refiPurposeAsked: true, correcting: null });
  }
  if (capture.field === "refiPurpose") {
    return commit({
      ...current,
      cashOut: capture.value === "cash-out",
      refiPurposeAsked: true,
      correcting: null,
    });
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
  if (capture.field === "firstLien") {
    const value = captureMoney(capture.value);
    if (value == null) return current;
    return commit(writeFirstLien({ ...current, pendingProposal: null }, value));
  }
  if (capture.field === "helocLine") {
    const value = captureMoney(capture.value);
    if (value == null) return current;
    return commit(writeHelocLine({ ...current, ...clearLiveQuote(), pendingProposal: null }, value));
  }
  if (capture.field === "skip-heloc-line") {
    return commit(skipHelocLine({ ...current, pendingProposal: null }));
  }
  if (capture.field === "loanAmount") {
    const [loanRaw, valueRaw] = capture.value.split(":");
    const loan = captureMoney(loanRaw);
    const value = valueRaw ? captureMoney(valueRaw) : undefined;
    const hasLoan = loan != null;
    const hasValue = value != null;
    if (current.productIntent === "heloc" && hasLoan) {
      return commit(writeHelocLine({ ...current, ...clearLiveQuote() }, loan));
    }
    return commit(
      withWorkspaceScenario(
        afterRefiLoanAmountWrite(
          current,
          withComputedCompanion(
          withMatrixAfterAmount({
            ...current,
            ...clearLiveQuote(),
            amountAsked: true,
            overValueSkipped: false,
            ltvConfirm: undefined,
            correcting: null,
            correctingLine: null,
            valueAsked: hasValue ? true : current.valueAsked,
            loanAmountValue: hasLoan ? loan : current.loanAmountValue,
            propertyValueAmount: hasValue ? value : current.propertyValueAmount,
          }),
          (current.downPaymentAmount != null && current.downPaymentAmount > 0) ||
          current.sampleAccepted ||
          Boolean(current.subjectAddress?.trim())
            ? "loan"
            : undefined,
          ),
        ),
      ),
    );
  }
  if (capture.field === "propertyValue") {
    const value = captureMoney(capture.value);
    if (value == null) return current;
    return commit(withWorkspaceScenario(writePurchasePrice(current, value)));
  }
  if (capture.field === "downPayment") {
    const value = captureMoney(capture.value);
    if (value == null) return current;
    return commit(
      withWorkspaceScenario(
        withComputedCompanion(
          {
            ...current,
            ...clearLiveQuote(),
            downAsked: true,
            correcting: null,
            correctingLine: null,
            downPaymentAmount: value,
          },
          (current.loanAmountValue != null && current.loanAmountValue > 0) ||
          current.sampleAccepted ||
          Boolean(current.subjectAddress?.trim())
            ? "down"
            : undefined,
        ),
      ),
    );
  }
  if (capture.field === "skip-down") {
    return commit({ ...current, downAsked: true, correcting: null, correctingLine: null });
  }
  if (capture.field === "skip-amount") {
    if (hasHelocLineAmount(current)) {
      return commit({
        ...current,
        amountAsked: true,
        helocLineAsked: true,
        correcting: null,
        correctingLine: null,
      });
    }
    if (current.productIntent === "heloc") {
      return commit(skipHelocLine({ ...current, pendingProposal: null }));
    }
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
      adoptReuseZip(
        withWorkspaceScenario({
          ...current,
          ...clearLiveQuote(),
          creditBand: capture.value,
          creditAsked: true,
          correcting: null,
        }),
      ),
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

function captureMoney(raw: string): number | undefined {
  const parsed = parseLooseAmount(raw);
  if (parsed != null && parsed > 0) return parsed;
  const n = Number(String(raw).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
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

