import { formatDollars } from "@/components/products/scenario";
import { OCCUPANCY_BUBBLES, type FoxIntakeDraft, type OtherReoRow } from "./types";
import { otherReoRows } from "./otherReo";

function factValue(draft: FoxIntakeDraft, field: string) {
  return (draft.facts?.[field]?.value || "").trim();
}

function holdsConventionalFile(draft: FoxIntakeDraft) {
  return draft.productIntent === "buy" || draft.productIntent === "refinance";
}

export const CONVENTIONAL_FILE_NOTE = "Suggested · not underwritten";
export const LIABILITIES_SOURCE = "credit_report_later";

export type FileAgencyAnswer = "yes" | "no" | "skipped";
export type FileCitizenship = "us_citizen" | "permanent_resident" | "other" | "skipped";

export type FilePropertyObject = {
  address?: string;
  apn?: string;
  legalDescription?: string;
  propertyType?: "sfr" | "condo" | "two_to_four";
  yearBuilt?: string;
  units?: string;
  taxes?: string;
  hoa?: string;
  occupancyStatus?: string;
};

export type FileAssetsObject = {
  institution?: string;
  type?: string;
  suggestedBalance?: string;
  last4?: string;
};

export type FileLiabilitiesObject = {
  source: typeof LIABILITIES_SOURCE;
};

export type FileDeclarationsObject = {
  a_outstandingJudgments?: FileAgencyAnswer;
  b_bankruptcy?: FileAgencyAnswer;
  c_foreclosure?: FileAgencyAnswer;
  d_lawsuit?: FileAgencyAnswer;
  e_priorForeclosureObligation?: FileAgencyAnswer;
  f_delinquentFederalDebt?: FileAgencyAnswer;
  g_alimonyChildSupport?: FileAgencyAnswer;
  h_borrowedDownPayment?: FileAgencyAnswer;
  i_comakerOnNote?: FileAgencyAnswer;
  citizenship?: FileCitizenship;
  l_intentToOccupy?: FileAgencyAnswer;
  m_priorPropertyOwnership?: FileAgencyAnswer;
};

export type FileHistoryEntry = {
  label?: string;
  from?: string;
  to?: string;
};

export type FileHistoryObject = {
  addressHistory?: FileHistoryEntry[];
  employmentHistory?: FileHistoryEntry[];
};

export type ConventionalFileShape = {
  property: FilePropertyObject;
  assets: FileAssetsObject;
  liabilities: FileLiabilitiesObject;
  declarations: FileDeclarationsObject;
  history: FileHistoryObject;
  otherProperties: OtherReoRow[];
};

export type ConventionalSlotId =
  | "identity.name"
  | "loan.amounts"
  | "credit.stated"
  | "income.type"
  | "income.rental"
  | "property.address"
  | "property.apn"
  | "property.legalDescription"
  | "property.propertyType"
  | "property.yearBuilt"
  | "property.units"
  | "property.taxes"
  | "property.hoa"
  | "property.occupancyStatus"
  | "assets.institution"
  | "assets.type"
  | "assets.suggestedBalance"
  | "assets.last4"
  | "declarations.a_outstandingJudgments"
  | "declarations.b_bankruptcy"
  | "declarations.c_foreclosure"
  | "declarations.d_lawsuit"
  | "declarations.e_priorForeclosureObligation"
  | "declarations.f_delinquentFederalDebt"
  | "declarations.g_alimonyChildSupport"
  | "declarations.h_borrowedDownPayment"
  | "declarations.i_comakerOnNote"
  | "declarations.citizenship"
  | "declarations.l_intentToOccupy"
  | "declarations.m_priorPropertyOwnership"
  | "history.addressHistory"
  | "history.employmentHistory";

export const CONVENTIONAL_SLOT_IDS: ConventionalSlotId[] = [
  "identity.name",
  "loan.amounts",
  "credit.stated",
  "income.type",
  "income.rental",
  "property.address",
  "property.apn",
  "property.legalDescription",
  "property.propertyType",
  "property.yearBuilt",
  "property.units",
  "property.taxes",
  "property.hoa",
  "property.occupancyStatus",
  "assets.institution",
  "assets.type",
  "assets.suggestedBalance",
  "assets.last4",
  "declarations.a_outstandingJudgments",
  "declarations.b_bankruptcy",
  "declarations.c_foreclosure",
  "declarations.d_lawsuit",
  "declarations.e_priorForeclosureObligation",
  "declarations.f_delinquentFederalDebt",
  "declarations.g_alimonyChildSupport",
  "declarations.h_borrowedDownPayment",
  "declarations.i_comakerOnNote",
  "declarations.citizenship",
  "declarations.l_intentToOccupy",
  "declarations.m_priorPropertyOwnership",
  "history.addressHistory",
  "history.employmentHistory",
];

export const CONVENTIONAL_FILE_SLOT_TOTAL = CONVENTIONAL_SLOT_IDS.length;

function occupancyLabel(value?: string) {
  return OCCUPANCY_BUBBLES.find((item) => item.value === value)?.label ?? "";
}

function filledText(value?: string | null) {
  return Boolean(value && String(value).trim());
}

function moneyLabel(raw?: string) {
  if (!raw?.trim()) return "";
  const n = Number(String(raw).replace(/[$,]/g, ""));
  if (Number.isFinite(n) && n > 0) return `$${formatDollars(n)}`;
  return raw.trim();
}

function dashJoin(parts: string[]) {
  return parts.filter(Boolean).join(" · ") || "—";
}

function citizenshipOf(stored: NonNullable<FoxIntakeDraft["agencyDeclarations"]>): FileCitizenship | undefined {
  if (stored.citizenship === "us_citizen" || stored.citizenship === "permanent_resident") {
    return stored.citizenship;
  }
  if (stored.citizenship === "other" || stored.citizenship === "skipped") return stored.citizenship;
  return undefined;
}

export function conventionalFileFromDraft(draft: FoxIntakeDraft): ConventionalFileShape {
  const occupancy = draft.occupancyChoice.value;
  const address = (draft.subjectAddress || factValue(draft, "property_address")).trim();
  const employer = factValue(draft, "employer_name").trim();
  const years = factValue(draft, "years_in_business").trim();
  const employmentHistory = [...(draft.employmentHistory ?? [])];
  if (!employmentHistory.length && employer) {
    employmentHistory.push({
      label: employer,
      from: draft.statedTimeOnJobLabel || undefined,
    });
  }
  if (
    !employmentHistory.length &&
    (draft.incomeType.value === "self-employed" || draft.incomeType.value === "both") &&
    years
  ) {
    employmentHistory.push({ label: "Self-employed", from: years });
  }

  const stored = draft.agencyDeclarations ?? {};
  const bankruptcy: FileAgencyAnswer | undefined =
    stored.bankruptcy ||
    (draft.statedDeclaration === "none"
      ? "no"
      : draft.creditEvent === "bankruptcy"
        ? "yes"
        : undefined);
  const foreclosure: FileAgencyAnswer | undefined =
    stored.foreclosure ||
    (draft.statedDeclaration === "none"
      ? "no"
      : draft.creditEvent === "foreclosure"
        ? "yes"
        : undefined);

  return {
    property: {
      address: address || undefined,
      apn: draft.propertyApn?.trim() || undefined,
      legalDescription: draft.propertyLegalDescription?.trim() || undefined,
      propertyType: draft.propertyType,
      yearBuilt: draft.propertyYearBuilt?.trim() || undefined,
      units: draft.propertyUnits?.trim() || undefined,
      taxes: draft.propertyTaxes?.trim() || undefined,
      hoa: draft.propertyHoa?.trim() || undefined,
      occupancyStatus: occupancy || undefined,
    },
    assets: {
      institution: factValue(draft, "institution") || undefined,
      type: factValue(draft, "account_type") || undefined,
      suggestedBalance: factValue(draft, "ending_balance") || undefined,
      last4: factValue(draft, "account_last4") || undefined,
    },
    liabilities: {
      source: LIABILITIES_SOURCE,
    },
    declarations: {
      a_outstandingJudgments: stored.outstandingJudgments,
      b_bankruptcy: bankruptcy,
      c_foreclosure: foreclosure,
      d_lawsuit: stored.lawsuit,
      e_priorForeclosureObligation: stored.priorForeclosureObligation,
      f_delinquentFederalDebt: stored.delinquentFederalDebt,
      g_alimonyChildSupport: stored.alimonyChildSupport,
      h_borrowedDownPayment: stored.borrowedDownPayment,
      i_comakerOnNote: stored.comakerOnNote,
      citizenship: citizenshipOf(stored),
      l_intentToOccupy: stored.intentToOccupy,
      m_priorPropertyOwnership: stored.priorPropertyOwnership,
    },
    history: {
      addressHistory: (draft.addressHistory ?? []).filter((item) => filledText(item.label)),
      employmentHistory: employmentHistory.filter((item) => filledText(item.label)),
    },
    otherProperties: otherReoRows(draft),
  };
}

function slotFilled(draft: FoxIntakeDraft, id: ConventionalSlotId, file: ConventionalFileShape) {
  if (id === "identity.name") {
    return Boolean(
      draft.borrowerName?.trim() ||
        draft.contact.fullName.value.trim() ||
        factValue(draft, "full_name"),
    );
  }
  if (id === "loan.amounts") {
    const price = draft.propertyValueAmount;
    const loan = draft.loanAmountValue;
    const down = draft.downPaymentAmount;
    if (draft.productIntent === "refinance") return Boolean(loan && price);
    return Boolean(price && (loan || down));
  }
  if (id === "credit.stated") {
    return Boolean(draft.creditBand && draft.creditBand !== "not-sure");
  }
  if (id === "income.type") return Boolean(draft.incomeType.value);
  if (id === "income.rental") {
    return Boolean(
      (draft.facts?.suggested_net_rental?.confirmed && draft.facts?.suggested_net_rental?.value) ||
        (draft.facts?.rental_income?.confirmed && draft.facts?.rental_income?.value),
    );
  }
  if (id === "property.address") return filledText(file.property.address);
  if (id === "property.apn") return filledText(file.property.apn);
  if (id === "property.legalDescription") return filledText(file.property.legalDescription);
  if (id === "property.propertyType") return Boolean(file.property.propertyType);
  if (id === "property.yearBuilt") return filledText(file.property.yearBuilt);
  if (id === "property.units") return filledText(file.property.units);
  if (id === "property.taxes") return filledText(file.property.taxes);
  if (id === "property.hoa") return filledText(file.property.hoa);
  if (id === "property.occupancyStatus") return Boolean(file.property.occupancyStatus);
  if (id === "assets.institution") return filledText(file.assets.institution);
  if (id === "assets.type") return filledText(file.assets.type);
  if (id === "assets.suggestedBalance") return filledText(file.assets.suggestedBalance);
  if (id === "assets.last4") return filledText(file.assets.last4);
  if (id === "declarations.a_outstandingJudgments") return Boolean(file.declarations.a_outstandingJudgments);
  if (id === "declarations.b_bankruptcy") return Boolean(file.declarations.b_bankruptcy);
  if (id === "declarations.c_foreclosure") return Boolean(file.declarations.c_foreclosure);
  if (id === "declarations.d_lawsuit") return Boolean(file.declarations.d_lawsuit);
  if (id === "declarations.e_priorForeclosureObligation") {
    return Boolean(file.declarations.e_priorForeclosureObligation);
  }
  if (id === "declarations.f_delinquentFederalDebt") return Boolean(file.declarations.f_delinquentFederalDebt);
  if (id === "declarations.g_alimonyChildSupport") return Boolean(file.declarations.g_alimonyChildSupport);
  if (id === "declarations.h_borrowedDownPayment") return Boolean(file.declarations.h_borrowedDownPayment);
  if (id === "declarations.i_comakerOnNote") return Boolean(file.declarations.i_comakerOnNote);
  if (id === "declarations.citizenship") return Boolean(file.declarations.citizenship);
  if (id === "declarations.l_intentToOccupy") return Boolean(file.declarations.l_intentToOccupy);
  if (id === "declarations.m_priorPropertyOwnership") return Boolean(file.declarations.m_priorPropertyOwnership);
  if (id === "history.addressHistory") return Boolean(file.history.addressHistory?.length);
  return Boolean(file.history.employmentHistory?.length);
}

export function conventionalSlotStates(draft: FoxIntakeDraft) {
  const file = conventionalFileFromDraft(draft);
  return CONVENTIONAL_SLOT_IDS.map((id) => ({
    id,
    filled: slotFilled(draft, id, file),
  }));
}

export function conventionalSlotCount(draft: FoxIntakeDraft) {
  const slots = conventionalSlotStates(draft);
  return {
    filled: slots.filter((item) => item.filled).length,
    total: slots.length,
    slots,
  };
}

export function conventionalSlotReport(draft: FoxIntakeDraft) {
  const slots = conventionalSlotStates(draft);
  return {
    present: slots.filter((item) => item.filled).map((item) => item.id),
    empty: slots.filter((item) => !item.filled).map((item) => item.id),
  };
}

/** CA conventional 1-unit primary W-2. No coborrower, no other-REO yes, no rental. */
export function isSimplePrimaryW2File(draft: FoxIntakeDraft) {
  if (draft.productIntent !== "buy" && draft.productIntent !== "refinance") return false;
  if (draft.occupancyChoice.value !== "primary") return false;
  if (draft.incomeType.value !== "w2") return false;
  if (draft.statedHousehold === "with_someone" || Boolean(draft.coborrowerName?.trim())) return false;
  if (draft.statedOtherReo === "yes") return false;
  if (draft.propertyType === "two_to_four") return false;
  if (draft.suggestedNetRental != null) return false;
  if (factValue(draft, "suggested_net_rental") || factValue(draft, "rental_income")) return false;
  if (draft.giftFundsNoted) return false;
  return true;
}

/** Reserves, large deposits, gift, or investment — not a full schedule on a simple primary W-2. */
export function assetsMatter(draft: FoxIntakeDraft) {
  if (isSimplePrimaryW2File(draft) && !draft.largeDepositFlag && draft.reservesNote !== "reserves_review") {
    return false;
  }
  const occupancy = draft.occupancyChoice.value;
  if (occupancy === "investment" || occupancy === "second-home") return true;
  if (draft.giftFundsNoted || draft.largeDepositFlag) return true;
  if (draft.reservesNote === "reserves_review") return true;
  if (draft.propertyType === "two_to_four") return true;
  return false;
}

export function conventionalCompletenessCopy(word: "sketch" | "documented", draft: FoxIntakeDraft) {
  const { filled, total } = conventionalSlotCount(draft);
  return `${word} · ${filled} of ${total}`;
}

function propertyTypeSpoken(value?: FilePropertyObject["propertyType"]) {
  if (value === "sfr") return "House";
  if (value === "condo") return "Condo";
  if (value === "two_to_four") return "2–4";
  return "";
}

function declarationSpoken(value?: FileAgencyAnswer | FileCitizenship) {
  if (!value || value === "skipped") return "";
  if (value === "us_citizen") return "US citizen";
  if (value === "permanent_resident") return "permanent resident";
  if (value === "other") return "other";
  return value;
}

export function conventionalFileFacts(draft: FoxIntakeDraft): {
  id: string;
  label: string;
  value: string;
  note?: string;
}[] {
  if (!holdsConventionalFile(draft)) return [];
  const file = conventionalFileFromDraft(draft);
  const occupancy = occupancyLabel(file.property.occupancyStatus);
  const address = file.property.address || "address —";
  const type = propertyTypeSpoken(file.property.propertyType) || "type —";
  const institution = file.assets.institution || "institution —";
  const accountType = file.assets.type || "type —";
  const balance = moneyLabel(file.assets.suggestedBalance) || "balance —";
  const last4 = file.assets.last4 ? `last4 ${file.assets.last4}` : "last4 —";
  const declarationBits = [
    declarationSpoken(file.declarations.b_bankruptcy)
      ? `BK ${declarationSpoken(file.declarations.b_bankruptcy)}`
      : "",
    declarationSpoken(file.declarations.c_foreclosure)
      ? `FC ${declarationSpoken(file.declarations.c_foreclosure)}`
      : "",
    declarationSpoken(file.declarations.citizenship),
  ];
  const work = file.history.employmentHistory?.[0]?.label;
  const lived = file.history.addressHistory?.[0]?.label;
  return [
    {
      id: "file-property",
      label: "Property",
      value: dashJoin([
        occupancy || "occupancy —",
        address,
        type,
        file.otherProperties.length ? `${file.otherProperties.length} other propert${file.otherProperties.length === 1 ? "y" : "ies"}` : "",
      ]),
      note: "APN, legal, year built, taxes, HOA wait for a title profile",
    },
    {
      id: "file-assets",
      label: "Assets",
      value: dashJoin([institution, accountType, balance, last4]),
      note: "From statements · institution / type / balance / last4 · not a form",
    },
    {
      id: "file-liabilities",
      label: "Liabilities",
      value: "Credit report later",
      note: "Placeholder. Empty until a credit pull.",
    },
    {
      id: "file-declarations",
      label: "Declarations",
      value: dashJoin(declarationBits) || "—",
      note: "a–m holdable · late · not a first-session ask",
    },
    {
      id: "file-history",
      label: "History",
      value: dashJoin([
        lived ? `address ${lived}` : "address —",
        work ? `employment ${work}` : "employment —",
      ]),
      note: "2-year slots · extract first",
    },
  ];
}
