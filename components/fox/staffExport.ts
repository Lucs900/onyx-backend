import type { FoxIntakeDraft } from "./types";
import {
  CREDIT_STATED_NOTE,
  INCOME_BUBBLES,
  OCCUPANCY_BUBBLES,
  PRODUCT_INTENT_BUBBLES,
} from "./types";
import { factValue } from "./fileWrite";
import { QUALIFYING_INCOME_FIELD, SUGGESTED_INCOME_NOTE } from "./qualifyingIncome";
import { SUGGESTED_DEBTS_NOTE } from "./monthlyDebts";
import { SUGGESTED_ASSETS_NOTE } from "./availableAssets";
import { SUGGESTED_PROPERTY_NOTE, propertyTypeLabel } from "./propertyType";
import { SUGGESTED_HOUSING_NOTE } from "./currentHousing";
import { SUGGESTED_DECLARATION_NOTE, declarationsLabel, isStatedDeclaration } from "./declarations";
import { SUGGESTED_HOUSEHOLD_NOTE, householdLabel, isStatedHousehold } from "./household";
import { SUGGESTED_BORROWER_NOTE } from "./borrowerName";
import { SUGGESTED_OTHER_REO_NOTE, otherReoLabel, isStatedOtherReo } from "./otherReo";
import { SUGGESTED_TIME_ON_JOB_NOTE, displayTimeOnJob } from "./timeOnJob";
import { appendFileEvent } from "./motion";

export const SUGGESTED_EXPORT_NOTE = "Suggested · not underwritten";

export type FileExportFormat = "mapped_json" | "fnma_32";
export type FileExportStatus = "not_ready" | "gaps" | "ready" | "exported";

export type FileExportGap = {
  key: string;
  why: string;
};

export type FileExportMappedFact = {
  value: string | number;
  note?: string;
};

export type FileExport = {
  format: FileExportFormat;
  status: FileExportStatus;
  gaps: FileExportGap[];
  mapped: Record<string, FileExportMappedFact>;
  downloadedAt?: string;
};

export const EXPORT_GAPS: FileExportGap[] = [
  { key: "ssn", why: "Never invented. Not on this File." },
  { key: "citizenship", why: "Not collected. Never invented." },
  { key: "present_mailing_address", why: "Present/mailing address is not on the sketch." },
  { key: "dob", why: "Date of birth is not on this File. Never invented." },
  { key: "employer_name", why: "Employer name was not extracted." },
  { key: "full_account_numbers", why: "Full account numbers are never stored." },
];

function bubbleLabel(
  bubbles: readonly { value: string; label: string }[],
  value?: string,
) {
  if (!value) return "";
  return bubbles.find((item) => item.value === value)?.label ?? value;
}

function moneyNumber(draft: FoxIntakeDraft) {
  return draft.propertyValueAmount ?? draft.loanAmountValue ?? draft.downPaymentAmount;
}

export function exportSketchReady(draft: FoxIntakeDraft) {
  return Boolean(draft.productIntent && draft.occupancyChoice.value && moneyNumber(draft) != null);
}

function mappedFact(value: string | number, note?: string): FileExportMappedFact {
  return note ? { value, note } : { value };
}

export function mappedFileFacts(draft: FoxIntakeDraft): Record<string, FileExportMappedFact> {
  const mapped: Record<string, FileExportMappedFact> = {};
  const product = bubbleLabel(PRODUCT_INTENT_BUBBLES, draft.productIntent);
  if (product) mapped.product = mappedFact(product);
  const occupancy = bubbleLabel(OCCUPANCY_BUBBLES, draft.occupancyChoice.value);
  if (occupancy) mapped.occupancy = mappedFact(occupancy);
  if (draft.propertyValueAmount != null) {
    mapped.purchasePrice = mappedFact(draft.propertyValueAmount);
  }
  if (draft.downPaymentAmount != null) {
    mapped.downPayment = mappedFact(draft.downPaymentAmount);
  }
  if (draft.loanAmountValue != null) {
    mapped.loanAmount = mappedFact(draft.loanAmountValue);
  }
  const income = bubbleLabel(INCOME_BUBBLES, draft.incomeType.value);
  if (income) mapped.incomeType = mappedFact(income);
  const qualifying = factValue(draft, QUALIFYING_INCOME_FIELD);
  if (qualifying) {
    mapped.qualifyingIncomeMonthly = mappedFact(qualifying, SUGGESTED_INCOME_NOTE);
  }
  const name = (draft.borrowerName || draft.contact.fullName.value || "").trim();
  if (name) mapped.borrowerName = mappedFact(name, SUGGESTED_BORROWER_NOTE);
  if (draft.statedMonthlyDebts != null) {
    mapped.statedMonthlyDebts = mappedFact(draft.statedMonthlyDebts, SUGGESTED_DEBTS_NOTE);
  }
  if (draft.statedAvailableAssets != null) {
    mapped.statedAvailableAssets = mappedFact(draft.statedAvailableAssets, SUGGESTED_ASSETS_NOTE);
  }
  if (draft.propertyType) {
    mapped.propertyType = mappedFact(propertyTypeLabel(draft.propertyType), SUGGESTED_PROPERTY_NOTE);
  }
  if (draft.statedCurrentHousing != null) {
    mapped.statedCurrentHousing = mappedFact(draft.statedCurrentHousing, SUGGESTED_HOUSING_NOTE);
  }
  if (draft.statedDeclaration && isStatedDeclaration(draft.statedDeclaration)) {
    mapped.statedDeclaration = mappedFact(
      declarationsLabel(draft.statedDeclaration),
      SUGGESTED_DECLARATION_NOTE,
    );
  }
  if (draft.statedHousehold && isStatedHousehold(draft.statedHousehold)) {
    mapped.statedHousehold = mappedFact(householdLabel(draft.statedHousehold), SUGGESTED_HOUSEHOLD_NOTE);
  }
  if (draft.statedOtherReo && isStatedOtherReo(draft.statedOtherReo)) {
    mapped.statedOtherReo = mappedFact(otherReoLabel(draft.statedOtherReo), SUGGESTED_OTHER_REO_NOTE);
  }
  const address = (draft.subjectAddress || factValue(draft, "property_address")).trim();
  if (address) mapped.subjectAddress = mappedFact(address, SUGGESTED_PROPERTY_NOTE);
  const employer = factValue(draft, "employer_name").trim();
  if (employer) mapped.employerName = mappedFact(employer, SUGGESTED_EXPORT_NOTE);
  if (draft.statedTimeOnJob != null) {
    mapped.statedTimeOnJob = mappedFact(displayTimeOnJob(draft.statedTimeOnJob), SUGGESTED_TIME_ON_JOB_NOTE);
  }
  if (draft.creditBand) {
    mapped.statedCreditBand = mappedFact(draft.creditBand, CREDIT_STATED_NOTE);
  }
  const dob = factValue(draft, "date_of_birth").trim();
  if (dob) mapped.dateOfBirth = mappedFact(dob, SUGGESTED_EXPORT_NOTE);
  return mapped;
}

export function exportGaps(draft: FoxIntakeDraft): FileExportGap[] {
  const gaps: FileExportGap[] = [];
  gaps.push(EXPORT_GAPS[0]);
  gaps.push(EXPORT_GAPS[1]);
  gaps.push(EXPORT_GAPS[2]);
  if (!factValue(draft, "date_of_birth").trim()) gaps.push(EXPORT_GAPS[3]);
  if (!factValue(draft, "employer_name").trim()) gaps.push(EXPORT_GAPS[4]);
  gaps.push(EXPORT_GAPS[5]);
  return gaps;
}

export function derivedExportStatus(draft: FoxIntakeDraft): Exclude<FileExportStatus, "exported"> {
  if (!exportSketchReady(draft)) return "not_ready";
  return exportGaps(draft).length ? "gaps" : "ready";
}

export function fileExportOf(
  draft: FoxIntakeDraft,
  format: FileExportFormat = draft.fileExport?.format ?? "mapped_json",
): FileExport {
  const derived = derivedExportStatus(draft);
  const downloaded = draft.fileExport?.downloadedAt;
  const status: FileExportStatus =
    derived === "not_ready" ? "not_ready" : downloaded ? "exported" : derived;
  return {
    format: downloaded ? draft.fileExport?.format ?? format : format,
    status,
    gaps: exportGaps(draft),
    mapped: mappedFileFacts(draft),
    downloadedAt: derived === "not_ready" ? undefined : downloaded,
  };
}

export function mappedJsonText(draft: FoxIntakeDraft) {
  const pack = fileExportOf(draft, "mapped_json");
  if (pack.status === "not_ready") {
    return `${JSON.stringify(
      {
        format: "mapped_json",
        status: "not_ready",
        incomplete: true,
        note: "Sketch too thin to export. Need product, occupancy, and a money number. Not a complete package.",
        gaps: pack.gaps,
        mapped: pack.mapped,
      },
      null,
      2,
    )}\n`;
  }
  return `${JSON.stringify(
    {
      format: "mapped_json",
      status: pack.status === "exported" ? "exported" : pack.status,
      incomplete: pack.gaps.length > 0,
      note: "Staff / LOS package. Not a DU submit. Suggested facts stay suggested.",
      gaps: pack.gaps,
      mapped: pack.mapped,
    },
    null,
    2,
  )}\n`;
}

function fnmaLine(record: string, field: string, value: string | number, note?: string) {
  const extra = note ? `|${note}` : "";
  return `${record}|${field}|${value}${extra}`;
}

export function fnma32Text(draft: FoxIntakeDraft) {
  const pack = fileExportOf(draft, "fnma_32");
  if (pack.status === "not_ready") {
    return [
      "ONYX FNMA 3.2 fail-closed",
      "Label: not_ready",
      "Sketch too thin. No complete download.",
      "Not a DU submit. Empty SSN / DOB / citizenship omitted.",
      "",
    ].join("\n");
  }
  const lines = [
    "ONYX FNMA 3.2 fail-closed",
    pack.gaps.length ? "Label: incomplete" : "Label: populated segments only",
    "Not a DU submit. Empty SSN / DOB / citizenship omitted.",
    `Omitted: ${pack.gaps.map((item) => item.key).join(", ")}`,
    "",
  ];
  const mapped = pack.mapped;
  if (mapped.product) lines.push(fnmaLine("01A", "Purpose", mapped.product.value));
  if (mapped.loanAmount) lines.push(fnmaLine("01A", "LoanAmount", mapped.loanAmount.value));
  if (mapped.purchasePrice) lines.push(fnmaLine("01A", "PurchasePrice", mapped.purchasePrice.value));
  if (mapped.downPayment) lines.push(fnmaLine("01A", "DownPayment", mapped.downPayment.value));
  if (mapped.occupancy) lines.push(fnmaLine("02A", "Occupancy", mapped.occupancy.value));
  if (mapped.propertyType) {
    lines.push(fnmaLine("02A", "PropertyType", mapped.propertyType.value, mapped.propertyType.note));
  }
  if (mapped.subjectAddress) {
    lines.push(fnmaLine("02A", "SubjectProperty", mapped.subjectAddress.value, mapped.subjectAddress.note));
  }
  if (mapped.borrowerName) {
    lines.push(fnmaLine("03A", "Name", mapped.borrowerName.value, mapped.borrowerName.note));
  }
  if (mapped.dateOfBirth) {
    lines.push(fnmaLine("03A", "DateOfBirth", mapped.dateOfBirth.value, mapped.dateOfBirth.note));
  }
  if (mapped.employerName) {
    lines.push(fnmaLine("04A", "EmployerName", mapped.employerName.value, mapped.employerName.note));
  }
  if (mapped.incomeType) lines.push(fnmaLine("05A", "IncomeType", mapped.incomeType.value));
  if (mapped.qualifyingIncomeMonthly) {
    lines.push(
      fnmaLine(
        "05A",
        "QualifyingIncomeMonthly",
        mapped.qualifyingIncomeMonthly.value,
        mapped.qualifyingIncomeMonthly.note,
      ),
    );
  }
  if (mapped.statedMonthlyDebts) {
    lines.push(
      fnmaLine("06C", "StatedMonthlyDebts", mapped.statedMonthlyDebts.value, mapped.statedMonthlyDebts.note),
    );
  }
  if (mapped.statedAvailableAssets) {
    lines.push(
      fnmaLine(
        "06A",
        "StatedAvailableAssets",
        mapped.statedAvailableAssets.value,
        mapped.statedAvailableAssets.note,
      ),
    );
  }
  if (mapped.statedOtherReo) {
    lines.push(fnmaLine("06G", "OtherREO", mapped.statedOtherReo.value, mapped.statedOtherReo.note));
  }
  if (mapped.statedCurrentHousing) {
    lines.push(
      fnmaLine("07A", "CurrentHousing", mapped.statedCurrentHousing.value, mapped.statedCurrentHousing.note),
    );
  }
  if (mapped.statedDeclaration) {
    lines.push(fnmaLine("08A", "Declarations", mapped.statedDeclaration.value, mapped.statedDeclaration.note));
  }
  if (mapped.statedHousehold) {
    lines.push(fnmaLine("03A", "Household", mapped.statedHousehold.value, mapped.statedHousehold.note));
  }
  if (mapped.statedCreditBand) {
    lines.push(fnmaLine("10B", "StatedCredit", mapped.statedCreditBand.value, mapped.statedCreditBand.note));
  }
  lines.push("");
  return lines.join("\n");
}

export function markExported(draft: FoxIntakeDraft, format: FileExportFormat): FoxIntakeDraft {
  if (!exportSketchReady(draft)) return draft;
  const downloadedAt = new Date().toISOString();
  return appendFileEvent(
    {
      ...draft,
      fileExport: {
        format,
        status: "exported",
        downloadedAt,
      },
    },
    "staff-export",
    `Staff downloaded ${format}. Not a DU submit.`,
    downloadedAt,
    { actor: "onyx" },
  );
}

export function asksStaffExport(text: string) {
  const lower = text.toLowerCase();
  return (
    /did you send (my )?(file|application)/.test(lower) ||
    /sent (my )?(file|application)/.test(lower) ||
    /was (my )?(file|application) sent/.test(lower) ||
    /desktop underwriter/.test(lower) ||
    /\bdu (say|says|submit|submitted)\b/.test(lower) ||
    /download (my |the )?(application|1003)/.test(lower) ||
    /\b1003\b/.test(lower) ||
    /exported to fannie/.test(lower) ||
    /fnma export/.test(lower) ||
    /in underwriting/.test(lower)
  );
}

export const STAFF_EXPORT_BORROWER_COPY =
  "No. This file is still on the desk. Staff can package it for LOS. Nothing was submitted to Desktop Underwriter.";
