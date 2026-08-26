/**
 * Fox adapter for rental suggest. Confirm-before-write.
 * Never persist a rental number the borrower did not confirm.
 * Do not call it qualifying income. income.suggest stays source of truth for W-2/1084.
 */

import type { ExtractClass, FactProposal, FoxIntakeDraft } from "./types";
import {
  RENTAL_INCOME_FIELD,
  RENTAL_STILL_USEFUL,
  RENTAL_UNSUPPORTED_CAUTION,
  SUGGESTED_RENTAL_NOTE,
  parseStatedMonthlyLease,
  rentalConfirmCopy,
  suggestLeaseRental,
  suggestScheduleERental,
  unsupportedRentalNamed,
  type RentalMethod,
  type RentalSuggestResult,
} from "@/lib/income/rental";

export {
  RENTAL_INCOME_FIELD,
  RENTAL_STILL_USEFUL,
  RENTAL_UNSUPPORTED_CAUTION,
  SUGGESTED_RENTAL_NOTE,
  parseStatedMonthlyLease,
  rentalConfirmCopy,
  unsupportedRentalNamed,
};

function parseMoney(value?: string | null): number | null {
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
  if (facts[RENTAL_INCOME_FIELD]?.confirmed && facts[RENTAL_INCOME_FIELD]?.value) return true;
  return (draft.documents ?? []).some((doc) => /lease/i.test(`${doc.name} ${doc.extractClass ?? ""}`));
}

export function rentalFromExtract(fields: Record<string, string>): RentalSuggestResult | null {
  const scheduleE = suggestScheduleERental({
    rentalIncomeOrLoss: parseMoney(
      fields.schedule_e_rental_income ?? fields.schedule_e_income ?? fields.rental_income_or_loss,
    ),
    months: parseMoney(fields.schedule_e_months),
    depreciation: parseMoney(fields.schedule_e_depreciation ?? fields.depreciation),
    interest: parseMoney(fields.schedule_e_interest ?? fields.mortgage_interest),
    hoa: parseMoney(fields.schedule_e_hoa ?? fields.hoa),
    taxes: parseMoney(fields.schedule_e_taxes ?? fields.real_estate_taxes),
    insurance: parseMoney(fields.schedule_e_insurance ?? fields.insurance),
  });
  if (scheduleE) return scheduleE;
  const rent = parseMoney(fields.gross_monthly_rent ?? fields.monthly_rent ?? fields.lease_rent);
  if (rent == null) return null;
  const deposits = parseMoney(fields.lease_deposits_months ?? fields.deposit_months);
  return suggestLeaseRental({
    grossMonthlyRent: rent,
    twoMonthsDeposits: deposits != null && deposits >= 2,
  });
}

export function rentalIncomeProposal(result: RentalSuggestResult): FactProposal {
  return {
    field: RENTAL_INCOME_FIELD,
    value: String(result.monthly),
    label: "Suggested rental income",
    kind: "computed",
    note: SUGGESTED_RENTAL_NOTE,
    methodNote: result.method,
  };
}

export function rentalConfirmAsk(method?: string, monthly?: number): string {
  const used: RentalMethod = method === "lease_75" ? "lease_75" : "schedule_e";
  return rentalConfirmCopy(used, monthly ?? 0);
}

export function isRentalIncomeField(field?: string | null): boolean {
  return field === RENTAL_INCOME_FIELD;
}

export function proposeTypedLeaseRental(draft: FoxIntakeDraft, text: string): FoxIntakeDraft | null {
  if (draft.pendingConflict) return null;
  if (draft.facts?.[RENTAL_INCOME_FIELD]?.confirmed) return null;
  if (draft.pendingProposal && draft.pendingProposal.field !== RENTAL_INCOME_FIELD) return null;
  if (draftHasUnsupportedRental(draft) || unsupportedRentalNamed(text)) return null;
  const rent = parseStatedMonthlyLease(text, { occupancy: draft.occupancyChoice.value });
  if (rent == null) return null;
  const computed = suggestLeaseRental({ grossMonthlyRent: rent });
  if (!computed) return null;
  return {
    ...draft,
    pendingProposal: rentalIncomeProposal(computed),
  };
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
  if (draft.facts?.[RENTAL_INCOME_FIELD]?.confirmed) return draft;
  if (draft.pendingProposal && draft.pendingProposal.field !== RENTAL_INCOME_FIELD) {
    return draft;
  }
  return {
    ...draft,
    pendingProposal: rentalIncomeProposal(computed),
  };
}
