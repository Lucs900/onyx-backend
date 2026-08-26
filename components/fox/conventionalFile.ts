import { formatDollars } from "@/components/products/scenario";
import { OCCUPANCY_BUBBLES, type FoxIntakeDraft } from "./types";

function factValue(draft: FoxIntakeDraft, field: string) {
  return (draft.facts?.[field]?.value || "").trim();
}

function holdsConventionalFile(draft: FoxIntakeDraft) {
  return draft.productIntent === "buy" || draft.productIntent === "refinance";
}

export const CONVENTIONAL_FILE_NOTE = "Suggested · not underwritten";
export const LIABILITIES_SOURCE = "credit_report_later";

export type FileAgencyAnswer = "yes" | "no" | "skipped";
export type FileCitizenship =
  | "us_citizen"
  | "permanent_resident"
  | "non_permanent"
  | "skipped";

export type FilePropertyObject = {
  address?: string;
  apn?: string;
  legalDescription?: string;
  propertyType?: "sfr" | "condo" | "two_to_four";
  yearBuilt?: string;
  taxes?: string;
  hoa?: string;
  occupancyStatus?: string;
};

export type FileAssetsObject = {
  checkingSavings?: string;
  retirement?: string;
  other?: string;
};

export type FileLiabilitiesObject = {
  source: typeof LIABILITIES_SOURCE;
  largeDebtsOffReport?: string;
};

export type FileDeclarationsObject = {
  citizenship?: FileCitizenship;
  outstandingJudgments?: FileAgencyAnswer;
  bankruptcy?: FileAgencyAnswer;
  foreclosure?: FileAgencyAnswer;
  lawsuit?: FileAgencyAnswer;
  alimonyChildSupport?: FileAgencyAnswer;
  borrowedDownPayment?: FileAgencyAnswer;
  intentToOccupy?: FileAgencyAnswer;
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
};

export type ConventionalSlotId =
  | "identity.name"
  | "loan.amounts"
  | "credit.stated"
  | "income.type"
  | "property.address"
  | "property.apn"
  | "property.legalDescription"
  | "property.propertyType"
  | "property.yearBuilt"
  | "property.taxes"
  | "property.hoa"
  | "property.occupancyStatus"
  | "assets.checkingSavings"
  | "assets.retirement"
  | "assets.other"
  | "liabilities.largeDebtsOffReport"
  | "declarations.citizenship"
  | "declarations.outstandingJudgments"
  | "declarations.bankruptcy"
  | "declarations.foreclosure"
  | "declarations.lawsuit"
  | "declarations.alimonyChildSupport"
  | "declarations.borrowedDownPayment"
  | "declarations.intentToOccupy"
  | "history.addressHistory"
  | "history.employmentHistory";

export const CONVENTIONAL_SLOT_IDS: ConventionalSlotId[] = [
  "identity.name",
  "loan.amounts",
  "credit.stated",
  "income.type",
  "property.address",
  "property.apn",
  "property.legalDescription",
  "property.propertyType",
  "property.yearBuilt",
  "property.taxes",
  "property.hoa",
  "property.occupancyStatus",
  "assets.checkingSavings",
  "assets.retirement",
  "assets.other",
  "liabilities.largeDebtsOffReport",
  "declarations.citizenship",
  "declarations.outstandingJudgments",
  "declarations.bankruptcy",
  "declarations.foreclosure",
  "declarations.lawsuit",
  "declarations.alimonyChildSupport",
  "declarations.borrowedDownPayment",
  "declarations.intentToOccupy",
  "history.addressHistory",
  "history.employmentHistory",
];

export const CONVENTIONAL_FILE_SLOT_TOTAL = CONVENTIONAL_SLOT_IDS.length;

function occupancyLabel(value?: string) {
  return OCCUPANCY_BUBBLES.find((item) => item.value === value)?.label ?? "";
}

function intentToOccupyFromOccupancy(value?: string): FileAgencyAnswer | undefined {
  if (value === "primary") return "yes";
  if (value === "second-home" || value === "investment") return "no";
  return undefined;
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

export function conventionalFileFromDraft(draft: FoxIntakeDraft): ConventionalFileShape {
  const occupancy = draft.occupancyChoice.value;
  const address = (draft.subjectAddress || factValue(draft, "property_address")).trim();
  const checking =
    draft.assetsCheckingSavings?.trim() ||
    factValue(draft, "ending_balance").trim();
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
      taxes: draft.propertyTaxes?.trim() || undefined,
      hoa: draft.propertyHoa?.trim() || undefined,
      occupancyStatus: occupancy || undefined,
    },
    assets: {
      checkingSavings: checking || undefined,
      retirement: draft.assetsRetirement?.trim() || undefined,
      other: draft.assetsOther?.trim() || undefined,
    },
    liabilities: {
      source: LIABILITIES_SOURCE,
      largeDebtsOffReport: draft.largeDebtsOffReport?.trim() || undefined,
    },
    declarations: {
      citizenship: stored.citizenship,
      outstandingJudgments: stored.outstandingJudgments,
      bankruptcy,
      foreclosure,
      lawsuit: stored.lawsuit,
      alimonyChildSupport: stored.alimonyChildSupport,
      borrowedDownPayment: stored.borrowedDownPayment,
      intentToOccupy: stored.intentToOccupy || intentToOccupyFromOccupancy(occupancy),
    },
    history: {
      addressHistory: (draft.addressHistory ?? []).filter((item) => filledText(item.label)),
      employmentHistory: employmentHistory.filter((item) => filledText(item.label)),
    },
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
  if (id === "property.address") return filledText(file.property.address);
  if (id === "property.apn") return filledText(file.property.apn);
  if (id === "property.legalDescription") return filledText(file.property.legalDescription);
  if (id === "property.propertyType") return Boolean(file.property.propertyType);
  if (id === "property.yearBuilt") return filledText(file.property.yearBuilt);
  if (id === "property.taxes") return filledText(file.property.taxes);
  if (id === "property.hoa") return filledText(file.property.hoa);
  if (id === "property.occupancyStatus") return Boolean(file.property.occupancyStatus);
  if (id === "assets.checkingSavings") return filledText(file.assets.checkingSavings);
  if (id === "assets.retirement") return filledText(file.assets.retirement);
  if (id === "assets.other") return filledText(file.assets.other);
  if (id === "liabilities.largeDebtsOffReport") return filledText(file.liabilities.largeDebtsOffReport);
  if (id === "declarations.citizenship") return Boolean(file.declarations.citizenship);
  if (id === "declarations.outstandingJudgments") return Boolean(file.declarations.outstandingJudgments);
  if (id === "declarations.bankruptcy") return Boolean(file.declarations.bankruptcy);
  if (id === "declarations.foreclosure") return Boolean(file.declarations.foreclosure);
  if (id === "declarations.lawsuit") return Boolean(file.declarations.lawsuit);
  if (id === "declarations.alimonyChildSupport") return Boolean(file.declarations.alimonyChildSupport);
  if (id === "declarations.borrowedDownPayment") return Boolean(file.declarations.borrowedDownPayment);
  if (id === "declarations.intentToOccupy") return Boolean(file.declarations.intentToOccupy);
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
  if (value === "non_permanent") return "non-permanent";
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
  const checking = moneyLabel(file.assets.checkingSavings) || "checking/savings —";
  const retirement = moneyLabel(file.assets.retirement) || "retirement —";
  const other = moneyLabel(file.assets.other) || "other —";
  const declarationBits = [
    declarationSpoken(file.declarations.intentToOccupy)
      ? `occupy ${declarationSpoken(file.declarations.intentToOccupy)}`
      : "",
    declarationSpoken(file.declarations.bankruptcy)
      ? `BK ${declarationSpoken(file.declarations.bankruptcy)}`
      : "",
    declarationSpoken(file.declarations.foreclosure)
      ? `FC ${declarationSpoken(file.declarations.foreclosure)}`
      : "",
    declarationSpoken(file.declarations.citizenship),
  ];
  const work = file.history.employmentHistory?.[0]?.label;
  const lived = file.history.addressHistory?.[0]?.label;
  return [
    {
      id: "file-property",
      label: "Property",
      value: dashJoin([occupancy || "occupancy —", address.startsWith("address") ? address : address, type]),
      note: "APN, legal, year built, taxes, HOA wait for a title profile",
    },
    {
      id: "file-assets",
      label: "Assets",
      value: dashJoin([checking, retirement, other]),
      note: "From statements · not a form",
    },
    {
      id: "file-liabilities",
      label: "Liabilities",
      value: file.liabilities.largeDebtsOffReport?.trim() || "Credit report later",
      note: "Not a worksheet. Credit pull is the later source.",
    },
    {
      id: "file-declarations",
      label: "Declarations",
      value: dashJoin(declarationBits) || "—",
      note: "Agency set · late · not a 1003",
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
