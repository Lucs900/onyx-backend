/**
 * Fox adapter for NOO net rental. Confirm-before-write on signed net only.
 * Gross is a working figure. Do not persist gross as qualifying.
 * Do not net principal-residence rent against subject PITIA.
 */

import type { ExtractClass, FactProposal, FoxIntakeDraft } from "./types";
import {
  PITIA_FROM_FILE_NOTE,
  PITIA_HOUSING_NOTE,
  RENTAL_GROSS_FIELD,
  RENTAL_INCOME_FIELD,
  RENTAL_NEED_HOUSING,
  RENTAL_NEED_STATEMENT,
  RENTAL_NET_COST_CAUTION,
  RENTAL_NET_ROLE_FIELD,
  RENTAL_PITIA_FIELD,
  RENTAL_STILL_USEFUL,
  RENTAL_UNSUPPORTED_CAUTION,
  SUGGESTED_GROSS_NOTE,
  SUGGESTED_NET_NOTE,
  SUGGESTED_NET_RENTAL_FIELD,
  SUGGESTED_RENTAL_NOTE,
  netRentalCashFlow,
  parseStatedMonthlyLease,
  rentalNetConfirmCopy,
  suggestLeaseRental,
  suggestScheduleERental,
  unsupportedRentalNamed,
  type RentalMethod,
  type RentalNetResult,
  type RentalPropertyInput,
  type RentalSuggestResult,
  type RentalThinReason,
} from "@/lib/income/rental";

export {
  PITIA_FROM_FILE_NOTE,
  PITIA_HOUSING_NOTE,
  RENTAL_GROSS_FIELD,
  RENTAL_INCOME_FIELD,
  RENTAL_NEED_HOUSING,
  RENTAL_NEED_STATEMENT,
  RENTAL_NET_COST_CAUTION,
  RENTAL_NET_ROLE_FIELD,
  RENTAL_PITIA_FIELD,
  RENTAL_STILL_USEFUL,
  RENTAL_UNSUPPORTED_CAUTION,
  SUGGESTED_GROSS_NOTE,
  SUGGESTED_NET_NOTE,
  SUGGESTED_NET_RENTAL_FIELD,
  SUGGESTED_RENTAL_NOTE,
  parseStatedMonthlyLease,
  rentalNetConfirmCopy,
  unsupportedRentalNamed,
};

export function parseRentalMoney(value?: string | null): number | null {
  let cleaned = String(value ?? "")
    .replace(/[$,]/g, "")
    .replace(/\s/g, "")
    .replace(/[–—−]/g, "-");
  if (!cleaned || /[a-z]/i.test(cleaned)) return null;
  const paren = cleaned.match(/^\((.+)\)$/);
  if (paren) cleaned = `-${paren[1]}`;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function draftText(draft: FoxIntakeDraft): string {
  const notes = (draft.notes ?? []).join(" ");
  const facts = Object.values(draft.facts ?? {})
    .map((fact) => fact.value)
    .join(" ");
  return `${notes} ${facts} ${draft.incomeType.value}`;
}

export function draftHasUnsupportedRental(draft: FoxIntakeDraft): boolean {
  return unsupportedRentalNamed(draftText(draft));
}

export function draftRentalNamed(draft: FoxIntakeDraft): boolean {
  if (draft.occupancyChoice.value === "investment") return true;
  if (draftHasUnsupportedRental(draft)) return true;
  return /\b(rental|schedule\s*e|lease)\b/i.test(draftText(draft));
}

export function draftHasScheduleE(draft: FoxIntakeDraft): boolean {
  const facts = draft.facts ?? {};
  if (facts.schedule_e_rental_income?.value || facts.schedule_e?.value) return true;
  return (draft.documents ?? []).some((doc) =>
    /schedule\s*e|\bsche\b/i.test(`${doc.name} ${doc.extractClass ?? ""}`),
  );
}

export function draftHasLease(draft: FoxIntakeDraft): boolean {
  const facts = draft.facts ?? {};
  if (facts.gross_monthly_rent?.value || facts.lease?.value) return true;
  if (facts[RENTAL_GROSS_FIELD]?.value || draft.rentalGrossMonthly != null) return true;
  if (facts[SUGGESTED_NET_RENTAL_FIELD]?.confirmed && facts[SUGGESTED_NET_RENTAL_FIELD]?.value) {
    return true;
  }
  if (facts[RENTAL_INCOME_FIELD]?.confirmed && facts[RENTAL_INCOME_FIELD]?.value) return true;
  return (draft.documents ?? []).some((doc) => /lease/i.test(`${doc.name} ${doc.extractClass ?? ""}`));
}

export function draftNettedRental(draft: FoxIntakeDraft): boolean {
  return Boolean(factsNet(draft) != null && draft.facts?.[SUGGESTED_NET_RENTAL_FIELD]?.confirmed);
}

function factsNet(draft: FoxIntakeDraft): number | null {
  if (draft.suggestedNetRental != null && Number.isFinite(draft.suggestedNetRental)) {
    return Math.round(draft.suggestedNetRental);
  }
  return parseRentalMoney(draft.facts?.[SUGGESTED_NET_RENTAL_FIELD]?.value);
}

export function subjectHousingConfirmed(draft: FoxIntakeDraft): boolean {
  return draft.estimatedHousing != null && draft.estimatedHousing > 0;
}

export function subjectHousingSkipped(draft: FoxIntakeDraft): boolean {
  return Boolean(draft.housingAsked && (draft.estimatedHousing == null || draft.estimatedHousing <= 0));
}

function primaryResidenceBlocksSubjectNet(draft: FoxIntakeDraft): boolean {
  const occupancy = draft.occupancyChoice.value;
  if (occupancy === "investment") return false;
  return occupancy === "primary" || occupancy === "primary-residence" || occupancy === "second" || occupancy === "second-home";
}

function twoToFourPrimary(draft: FoxIntakeDraft): boolean {
  return (
    (draft.occupancyChoice.value === "primary" || draft.occupancyChoice.value === "primary-residence") &&
    draft.propertyType === "two_to_four"
  );
}

export function statementPitia(draft: FoxIntakeDraft): number | null {
  const facts = draft.facts ?? {};
  const candidates = [facts.current_pi, facts.reo_pitia, facts.current_principal_interest];
  for (const fact of candidates) {
    if (!fact?.confirmed) continue;
    const amount = parseRentalMoney(fact.value);
    if (amount != null && amount > 0) return Math.round(amount);
  }
  return null;
}

export function workingGrossMonthly(draft: FoxIntakeDraft): number | null {
  if (draft.rentalGrossMonthly != null && draft.rentalGrossMonthly > 0) {
    return Math.round(draft.rentalGrossMonthly);
  }
  return parseRentalMoney(draft.facts?.[RENTAL_GROSS_FIELD]?.value);
}

export function workingGrossMethod(draft: FoxIntakeDraft): RentalMethod {
  if (draft.pendingProposal?.methodNote === "schedule_e") return "schedule_e";
  if (draft.facts?.rental_gross_method?.value === "schedule_e") return "schedule_e";
  return "lease_75";
}

export function rentalFromExtract(fields: Record<string, string>): RentalSuggestResult | null {
  const scheduleE = suggestScheduleERental({
    rentalIncomeOrLoss: parseRentalMoney(
      fields.schedule_e_rental_income ?? fields.schedule_e_income ?? fields.rental_income_or_loss,
    ),
    months: parseRentalMoney(fields.schedule_e_months),
    depreciation: parseRentalMoney(fields.schedule_e_depreciation ?? fields.depreciation),
    interest: parseRentalMoney(fields.schedule_e_interest ?? fields.mortgage_interest),
    hoa: parseRentalMoney(fields.schedule_e_hoa ?? fields.hoa),
    taxes: parseRentalMoney(fields.schedule_e_taxes ?? fields.real_estate_taxes),
    insurance: parseRentalMoney(fields.schedule_e_insurance ?? fields.insurance),
  });
  if (scheduleE) return scheduleE;
  const rent = parseRentalMoney(fields.gross_monthly_rent ?? fields.monthly_rent ?? fields.lease_rent);
  if (rent == null) return null;
  const deposits = parseRentalMoney(fields.lease_deposits_months ?? fields.deposit_months);
  return suggestLeaseRental({
    grossMonthlyRent: rent,
    twoMonthsDeposits: deposits != null && deposits >= 2,
  });
}

function withWorkingGross(
  draft: FoxIntakeDraft,
  monthly: number,
  method: RentalMethod,
): FoxIntakeDraft {
  const now = new Date().toISOString();
  return {
    ...draft,
    rentalGrossMonthly: monthly,
    rentalThinReason: undefined,
    facts: {
      ...(draft.facts ?? {}),
      [RENTAL_GROSS_FIELD]: {
        field: RENTAL_GROSS_FIELD,
        value: String(monthly),
        source: "suggested",
        confirmed: false,
        confirmedAt: now,
      },
      rental_gross_method: {
        field: "rental_gross_method",
        value: method,
        source: "suggested",
        confirmed: false,
        confirmedAt: now,
      },
    },
  };
}

export function draftRentalProperties(draft: FoxIntakeDraft): RentalPropertyInput[] {
  const gross = workingGrossMonthly(draft);
  if (gross == null || gross <= 0) return [];
  const method = workingGrossMethod(draft);
  const properties: RentalPropertyInput[] = [];
  const investment = draft.occupancyChoice.value === "investment";
  if (twoToFourPrimary(draft)) return [];
  if (investment) {
    properties.push({
      id: "subject",
      kind: "subject",
      grossMonthly: gross,
      method,
      pitia: subjectHousingConfirmed(draft) ? draft.estimatedHousing : null,
      pitiaSource: "estimated_housing",
    });
    const reoGross = parseRentalMoney(draft.facts?.reo_gross_monthly?.value);
    if (draft.statedOtherReo === "yes" && reoGross != null && reoGross > 0) {
      properties.push({
        id: "reo",
        kind: "reo",
        grossMonthly: reoGross,
        method: "lease_75",
        pitia: statementPitia(draft),
        pitiaSource: "statement",
      });
    }
    return properties;
  }
  properties.push({
    id: "reo",
    kind: "reo",
    grossMonthly: gross,
    method,
    pitia: statementPitia(draft),
    pitiaSource: "statement",
  });
  return properties;
}

export function draftRentalNet(draft: FoxIntakeDraft): RentalNetResult | null {
  const properties = draftRentalProperties(draft);
  if (!properties.length) return null;
  return netRentalCashFlow(properties);
}

export function draftNeedsReoStatement(draft: FoxIntakeDraft): boolean {
  const result = draftRentalNet(draft);
  return Boolean(result?.thinReason === "statement" || result?.properties.some((item) => item.thinReason === "statement"));
}

export function rentalNetProposal(result: RentalNetResult): FactProposal | null {
  if (result.aggregateNet == null || result.completeCount < 1) return null;
  const copy = rentalNetConfirmCopy({
    net: result.aggregateNet,
    method: result.method,
    completeCount: result.completeCount,
  });
  if (!copy) return null;
  const pitia = result.properties
    .filter((item) => item.complete && item.pitia != null)
    .reduce((sum, item) => sum + (item.pitia ?? 0), 0);
  const gross = result.properties
    .filter((item) => item.complete)
    .reduce((sum, item) => sum + item.grossMonthly, 0);
  const pitiaSource = result.subjectPitiaNetted ? "estimated_housing" : "statement";
  return {
    field: SUGGESTED_NET_RENTAL_FIELD,
    value: String(result.aggregateNet),
    label: "Suggested net rental",
    kind: "computed",
    note: SUGGESTED_NET_NOTE,
    methodNote: result.method === "aggregate" ? "aggregate" : result.method,
    extras: [
      { field: RENTAL_GROSS_FIELD, value: String(gross), label: "Suggested rental (gross)" },
      { field: RENTAL_PITIA_FIELD, value: String(pitia), label: "PITIA used to net" },
      { field: RENTAL_NET_ROLE_FIELD, value: result.role, label: "Rental net role" },
      {
        field: "rental_pitia_source",
        value: pitiaSource,
        label: pitiaSource === "estimated_housing" ? PITIA_HOUSING_NOTE : PITIA_FROM_FILE_NOTE,
      },
      { field: "rental_complete_count", value: String(result.completeCount), label: "Netted properties" },
    ],
  };
}

export function rentalConfirmAsk(
  method?: string,
  monthly?: number,
  completeCount = 1,
): string {
  const used: RentalMethod | "aggregate" =
    method === "aggregate" ? "aggregate" : method === "schedule_e" ? "schedule_e" : "lease_75";
  return (
    rentalNetConfirmCopy({
      net: monthly ?? 0,
      method: used,
      completeCount,
    }) ?? ""
  );
}

export function isRentalIncomeField(field?: string | null): boolean {
  return field === SUGGESTED_NET_RENTAL_FIELD || field === RENTAL_INCOME_FIELD;
}

export function rentalThinCopy(reason?: RentalThinReason | null): string | null {
  if (reason === "housing") return RENTAL_NEED_HOUSING;
  if (reason === "statement") return RENTAL_NEED_STATEMENT;
  return null;
}

function attachRentalNet(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (draft.facts?.[SUGGESTED_NET_RENTAL_FIELD]?.confirmed) return { ...draft, rentalThinReason: undefined };
  if (twoToFourPrimary(draft)) {
    return { ...draft, pendingProposal: draft.pendingProposal, rentalThinReason: "primary" };
  }
  const result = draftRentalNet(draft);
  if (!result) return { ...draft, rentalThinReason: undefined };
  const proposal = rentalNetProposal(result);
  if (proposal) {
    return { ...draft, pendingProposal: proposal, rentalThinReason: undefined };
  }
  const thin = result.thinReason ?? (primaryResidenceBlocksSubjectNet(draft) ? "statement" : "housing");
  if (thin === "primary") return { ...draft, rentalThinReason: "primary" };
  return { ...draft, pendingProposal: null, rentalThinReason: thin };
}

export function maybeProposeRentalNet(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (draft.pendingConflict) return draft;
  if (draft.pendingProposal && !isRentalIncomeField(draft.pendingProposal.field)) return draft;
  if (!workingGrossMonthly(draft)) return draft;
  return attachRentalNet(draft);
}

export function proposeTypedLeaseRental(draft: FoxIntakeDraft, text: string): FoxIntakeDraft | null {
  if (draft.pendingConflict) return null;
  if (draft.facts?.[SUGGESTED_NET_RENTAL_FIELD]?.confirmed) return null;
  if (draft.pendingProposal && !isRentalIncomeField(draft.pendingProposal.field)) return null;
  if (draftHasUnsupportedRental(draft) || unsupportedRentalNamed(text)) return null;
  if (twoToFourPrimary(draft)) return null;
  const rent = parseStatedMonthlyLease(text, { occupancy: draft.occupancyChoice.value });
  if (rent == null) return null;
  const computed = suggestLeaseRental({ grossMonthlyRent: rent });
  if (!computed) return null;
  return attachRentalNet(withWorkingGross(draft, computed.monthly, computed.method));
}

export function applyRentalIncomeFromExtract(
  draft: FoxIntakeDraft,
  _extractClass: ExtractClass,
  fields: Record<string, string>,
): FoxIntakeDraft {
  if (draftHasUnsupportedRental(draft) || unsupportedRentalNamed(Object.values(fields).join(" "))) {
    return draft;
  }
  const computed = rentalFromExtract(fields);
  if (!computed) return draft;
  if (draft.pendingConflict) return draft;
  if (draft.facts?.[SUGGESTED_NET_RENTAL_FIELD]?.confirmed) return draft;
  if (draft.pendingProposal && !isRentalIncomeField(draft.pendingProposal.field)) {
    return draft;
  }
  if (twoToFourPrimary(draft)) return draft;
  return attachRentalNet(withWorkingGross(draft, computed.monthly, computed.method));
}
