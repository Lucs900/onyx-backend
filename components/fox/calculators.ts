import {
  CLTV_FIELD,
  ESTIMATED_HOUSING_FIELD,
  ESTIMATED_NOT_FINAL,
  GIFT_FUNDS_FIELD,
  HOA_FROM_FILE_LABEL,
  LARGE_DEPOSIT_FIELD,
  LTV_FIELD,
  MI_APPLIES_FIELD,
  MI_APPLIES_LABEL,
  PI_SAMPLE_LINE,
  RESERVES_NOTE_FIELD,
  SAMPLE_INDICATIVE_NOT_LIVE,
  STATED_DTI_FIELD,
  STATED_NOT_FROM_CREDIT,
  SUBORDINATE_FIELD,
  assetNotes,
  formatRatioPercent,
  formatWholePercent,
  housingConfirmCopy,
  housingEstimate,
  ltvCltv,
  moneyShown,
  statedDti,
  type HousingEstimate,
  type LtvCltvResult,
  type StatedDtiNet,
} from "@/lib/calculators/conventional";
import { rentalMoneyShown } from "@/lib/income/rental";
import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";
import {
  FILE_NET_ROLE_FIELD,
  SUGGESTED_FILE_NET_FIELD,
  SUGGESTED_FILE_NET_NOTE,
} from "./otherReo";
import {
  maybeProposeRentalNet,
  PITIA_FROM_FILE_NOTE,
  PITIA_HOUSING_NOTE,
  RENTAL_GROSS_FIELD,
  RENTAL_NET_ROLE_FIELD,
  RENTAL_PITIA_FIELD,
  SUGGESTED_GROSS_NOTE,
  SUGGESTED_NET_NOTE,
  SUGGESTED_NET_RENTAL_FIELD,
  draftNettedRental,
  parseRentalMoney,
  workingGrossMonthly,
} from "./rentalIncome";

export {
  ESTIMATED_HOUSING_FIELD,
  ESTIMATED_NOT_FINAL,
  HIGH_STATED_DTI_CAUTION,
  PI_SAMPLE_LINE,
  SAMPLE_INDICATIVE_NOT_LIVE,
  STATED_DTI_ASK,
  STATED_NOT_FROM_CREDIT,
  housingConfirmCopy,
  qualifyingIncomeConfirmCopy,
} from "@/lib/calculators/conventional";

export const HOUSING_PAYMENT_LABEL = "Housing payment";

function moneyFact(draft: FoxIntakeDraft, field: string): number | null {
  const raw = draft.facts?.[field]?.value;
  if (!raw) return null;
  const n = Number(String(raw).replace(/[$,]/g, "").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : null;
}

function writeFact(
  draft: FoxIntakeDraft,
  field: string,
  value: string,
  source: "computed" | "suggested" | "client" = "computed",
): FoxIntakeDraft {
  const now = new Date().toISOString();
  return {
    ...draft,
    facts: {
      ...(draft.facts ?? {}),
      [field]: {
        field,
        value,
        source,
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function calculatorPurpose(draft: FoxIntakeDraft): "purchase" | "refi" {
  return draft.productIntent === "buy" ? "purchase" : "refi";
}

export function calculatorLoan(draft: FoxIntakeDraft): number | null {
  if (draft.loanAmountValue != null && draft.loanAmountValue > 0) return draft.loanAmountValue;
  if (
    calculatorPurpose(draft) === "purchase" &&
    draft.propertyValueAmount != null &&
    draft.downPaymentAmount != null
  ) {
    const implied = Math.round(draft.propertyValueAmount - draft.downPaymentAmount);
    return implied > 0 ? implied : null;
  }
  return null;
}

export function calculatorValue(draft: FoxIntakeDraft): number | null {
  return draft.propertyValueAmount != null && draft.propertyValueAmount > 0
    ? draft.propertyValueAmount
    : null;
}

export function calculatorSubordinate(draft: FoxIntakeDraft): number | null {
  if (draft.subordinateBalance != null && draft.subordinateBalance > 0) return draft.subordinateBalance;
  const fromFact = moneyFact(draft, SUBORDINATE_FIELD);
  return fromFact != null && fromFact > 0 ? fromFact : null;
}

export function calculatorHoaMonthly(draft: FoxIntakeDraft): number | null {
  if (draft.hoaMonthly != null && draft.hoaMonthly > 0) return draft.hoaMonthly;
  const fromFact =
    moneyFact(draft, "hoa_monthly") ?? moneyFact(draft, "hoa") ?? moneyFact(draft, "hoa_dues");
  return fromFact != null && fromFact > 0 ? fromFact : null;
}

export function qualifyingIncomeMonthly(draft: FoxIntakeDraft): number | null {
  return moneyFact(draft, "qualifying_income");
}

export function draftLtvCltv(draft: FoxIntakeDraft): LtvCltvResult | null {
  return ltvCltv({
    purpose: calculatorPurpose(draft),
    loanAmount: calculatorLoan(draft),
    purchasePrice: calculatorPurpose(draft) === "purchase" ? calculatorValue(draft) : null,
    propertyValue: calculatorValue(draft),
    subordinateBalance: calculatorSubordinate(draft),
  });
}

export function draftHousingEstimate(draft: FoxIntakeDraft): HousingEstimate | null {
  return housingEstimate({
    purpose: calculatorPurpose(draft),
    loanAmount: calculatorLoan(draft),
    purchasePrice: calculatorPurpose(draft) === "purchase" ? calculatorValue(draft) : null,
    propertyValue: calculatorValue(draft),
    hoaMonthly: calculatorHoaMonthly(draft),
  });
}

export function housingSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "housing") return false;
  return Boolean(draft.housingAsked || draft.estimatedHousing != null);
}

export function housingConfirmNeeded(draft: FoxIntakeDraft) {
  if (!draft.propertyType) return false;
  return Boolean(draftHousingEstimate(draft) && !housingSettled(draft));
}

export function statedDtiReady(draft: FoxIntakeDraft) {
  return (
    draft.estimatedHousing != null &&
    draft.estimatedHousing > 0 &&
    qualifyingIncomeMonthly(draft) != null &&
    draft.statedMonthlyDebts != null
  );
}

export function statedDtiAskNeeded(draft: FoxIntakeDraft) {
  return Boolean(
    draft.estimatedHousing != null &&
      qualifyingIncomeMonthly(draft) != null &&
      !draft.monthlyDebtsAsked &&
      draft.statedMonthlyDebts == null,
  );
}

export function giftNamedOnDraft(draft: FoxIntakeDraft) {
  const text = [
    ...(draft.notes ?? []),
    ...Object.values(draft.facts ?? {}).map((fact) => `${fact.field} ${fact.value}`),
  ].join(" ");
  return /\bgift(s| funds?)?\b/i.test(text);
}

export function extractedDepositAmount(draft: FoxIntakeDraft): number | null {
  return (
    moneyFact(draft, "extracted_deposit") ??
    moneyFact(draft, "large_deposit") ??
    moneyFact(draft, "deposit")
  );
}

export function persistLtvCltv(draft: FoxIntakeDraft): FoxIntakeDraft {
  const ratios = draftLtvCltv(draft);
  if (!ratios) return draft;
  let next = writeFact(draft, LTV_FIELD, String(ratios.ltv));
  next = writeFact(next, CLTV_FIELD, String(ratios.cltv));
  if (ratios.subordinateBalance > 0) {
    next = {
      ...writeFact(next, SUBORDINATE_FIELD, String(ratios.subordinateBalance), "client"),
      subordinateBalance: ratios.subordinateBalance,
    };
  }
  const housing = draftHousingEstimate(next);
  if (housing) {
    next = writeFact(next, MI_APPLIES_FIELD, housing.miApplies ? "true" : "false");
    next = { ...next, miApplies: housing.miApplies };
  }
  return next;
}

export function persistAssetNotes(draft: FoxIntakeDraft): FoxIntakeDraft {
  const notes = assetNotes({
    occupancy: draft.occupancyChoice.value,
    propertyType: draft.propertyType,
    qualifyingIncome: qualifyingIncomeMonthly(draft),
    extractedDeposit: extractedDepositAmount(draft),
    giftNamed: giftNamedOnDraft(draft),
  });
  let next = writeFact(draft, RESERVES_NOTE_FIELD, notes.reservesNote);
  if (notes.largeDepositFlag) next = writeFact(next, LARGE_DEPOSIT_FIELD, "true");
  if (notes.giftFundsNoted) next = writeFact(next, GIFT_FUNDS_FIELD, "true");
  return {
    ...next,
    reservesNote: notes.reservesNote,
    largeDepositFlag: notes.largeDepositFlag || undefined,
    giftFundsNoted: notes.giftFundsNoted || undefined,
  };
}

export function draftRentalDtiNet(draft: FoxIntakeDraft): StatedDtiNet | null {
  const amount =
    draft.suggestedNetRental ??
    parseRentalMoney(draft.facts?.[SUGGESTED_NET_RENTAL_FIELD]?.value);
  if (amount == null || !draft.facts?.[SUGGESTED_NET_RENTAL_FIELD]?.confirmed) return null;
  const role = draft.rentalNetRole ?? draft.facts?.[RENTAL_NET_ROLE_FIELD]?.value;
  return {
    amount,
    role: role === "income" || role === "liability" || role === "none" || role === "thin" ? role : undefined,
    subjectPitiaNetted: draft.facts?.rental_pitia_source?.value === "estimated_housing",
  };
}

export function persistStatedDti(draft: FoxIntakeDraft): FoxIntakeDraft {
  const ratio = statedDti(
    draft.estimatedHousing,
    draft.statedMonthlyDebts,
    qualifyingIncomeMonthly(draft),
    draftRentalDtiNet(draft),
  );
  if (ratio == null) return draft;
  return {
    ...writeFact(draft, STATED_DTI_FIELD, String(ratio)),
    statedDti: ratio,
  };
}

export function syncCalculatorDraft(draft: FoxIntakeDraft): FoxIntakeDraft {
  let next = persistLtvCltv(draft);
  next = persistAssetNotes(next);
  if (statedDtiReady(next)) next = persistStatedDti(next);
  return next;
}

export function writeEstimatedHousing(draft: FoxIntakeDraft, total: number): FoxIntakeDraft {
  const now = new Date().toISOString();
  const synced = syncCalculatorDraft({
    ...draft,
    estimatedHousing: Math.round(total),
    housingAsked: true,
    pendingProposal: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [ESTIMATED_HOUSING_FIELD]: {
        field: ESTIMATED_HOUSING_FIELD,
        value: String(Math.round(total)),
        source: "computed",
        confirmed: true,
        confirmedAt: now,
      },
    },
  });
  return maybeProposeRentalNet(synced);
}

export function skipEstimatedHousing(draft: FoxIntakeDraft): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  delete facts[ESTIMATED_HOUSING_FIELD];
  delete facts[STATED_DTI_FIELD];
  return {
    ...draft,
    estimatedHousing: undefined,
    statedDti: undefined,
    housingAsked: true,
    pendingProposal: null,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function proposeEstimatedHousing(draft: FoxIntakeDraft): FoxIntakeDraft {
  const estimate = draftHousingEstimate(draft);
  if (!estimate) return draft;
  const proposal: FactProposal = {
    field: ESTIMATED_HOUSING_FIELD,
    value: String(estimate.estimatedHousing),
    label: HOUSING_PAYMENT_LABEL,
    kind: "computed",
    note: ESTIMATED_NOT_FINAL,
  };
  return { ...draft, pendingProposal: proposal };
}

export function housingConfirmActions(total: number): FoxAction[] {
  return [
    {
      id: "use-housing",
      label: "Use this",
      event: "bubble",
      capture: { field: "estimatedHousing", value: String(Math.round(total)) },
    },
    { id: "change-housing", label: "Change", event: "bubble", capture: { field: "needs-correction" } },
    { id: "skip-housing", label: "Skip", event: "bubble", capture: { field: "skip-housing" } },
  ];
}

export function housingAskCopy(draft: FoxIntakeDraft): { text: string; followUp?: string; actions?: FoxAction[] } {
  const estimate = draftHousingEstimate(draft);
  if (!estimate) return { text: "I can keep gathering." };
  return {
    text: housingConfirmCopy(estimate.estimatedHousing),
    followUp: PI_SAMPLE_LINE,
    actions: housingConfirmActions(estimate.estimatedHousing),
  };
}

export function calculatorStructureFacts(draft: FoxIntakeDraft): {
  id: string;
  label: string;
  value: string;
  note?: string;
}[] {
  const facts: { id: string; label: string; value: string; note?: string }[] = [];
  const ratios = draftLtvCltv(draft);
  if (ratios) {
    facts.push({
      id: "ltv",
      label: "LTV",
      value: formatRatioPercent(ratios.ltv),
      note: ESTIMATED_NOT_FINAL,
    });
    facts.push({
      id: "cltv",
      label: "CLTV",
      value: formatRatioPercent(ratios.cltv),
      note: ESTIMATED_NOT_FINAL,
    });
    if (ratios.subordinateBalance > 0) {
      facts.push({
        id: "subordinate",
        label: "Other loans on this property",
        value: moneyShown(ratios.subordinateBalance),
        note: STATED_NOT_FROM_CREDIT,
      });
    }
  }
  const estimate = draftHousingEstimate(draft);
  const housingTotal =
    draft.estimatedHousing ?? (draft.propertyType && estimate ? estimate.estimatedHousing : null);
  if (draft.propertyType && estimate && housingTotal != null) {
    facts.push({
      id: "pi",
      label: "P&I",
      value: moneyShown(estimate.principalAndInterest),
      note: `${SAMPLE_INDICATIVE_NOT_LIVE} · ${ESTIMATED_NOT_FINAL}`,
    });
    facts.push({
      id: "taxes",
      label: "Property taxes",
      value: moneyShown(estimate.taxes),
      note: ESTIMATED_NOT_FINAL,
    });
    facts.push({
      id: "hoi",
      label: "Homeowners insurance",
      value: moneyShown(estimate.hoi),
      note: ESTIMATED_NOT_FINAL,
    });
    if (estimate.miApplies) {
      facts.push({
        id: "mi",
        label: "MI",
        value: "applies, amount waits",
        note: MI_APPLIES_LABEL,
      });
    }
    if (estimate.hoa > 0) {
      facts.push({
        id: "hoa",
        label: "HOA",
        value: moneyShown(estimate.hoa),
        note: HOA_FROM_FILE_LABEL,
      });
    }
    facts.push({
      id: "housing",
      label: HOUSING_PAYMENT_LABEL,
      value: moneyShown(housingTotal),
      note: ESTIMATED_NOT_FINAL,
    });
  } else if (estimate?.miApplies) {
    facts.push({
      id: "mi",
      label: "MI",
      value: "applies, amount waits",
      note: MI_APPLIES_LABEL,
    });
  }
  if (draft.statedMonthlyDebts != null) {
    const existing = facts.some((fact) => fact.id === "debts");
    if (!existing) {
      facts.push({
        id: "debts-stated",
        label: "Monthly debts",
        value: moneyShown(draft.statedMonthlyDebts),
        note: STATED_NOT_FROM_CREDIT,
      });
    }
  }
  const gross = workingGrossMonthly(draft);
  if (gross != null) {
    facts.push({
      id: "rentalGrossMonthly",
      label: "Suggested rental (gross)",
      value: moneyShown(gross),
      note: SUGGESTED_GROSS_NOTE,
    });
  }
  const pitia =
    draft.rentalPitiaUsed ??
    parseRentalMoney(draft.facts?.[RENTAL_PITIA_FIELD]?.value) ??
    (draftNettedRental(draft) && draft.estimatedHousing != null ? draft.estimatedHousing : null);
  if (pitia != null && pitia > 0 && (draftNettedRental(draft) || draft.facts?.[RENTAL_PITIA_FIELD]?.value)) {
    const fromHousing = draft.facts?.rental_pitia_source?.value === "estimated_housing";
    facts.push({
      id: "rentalPitiaUsed",
      label: "PITIA used to net",
      value: moneyShown(pitia),
      note: fromHousing ? PITIA_HOUSING_NOTE : PITIA_FROM_FILE_NOTE,
    });
  }
  const net =
    draft.suggestedNetRental ??
    parseRentalMoney(draft.facts?.[SUGGESTED_NET_RENTAL_FIELD]?.value);
  if (draftNettedRental(draft) && net != null) {
    facts.push({
      id: "suggestedNetRental",
      label: "Suggested net rental",
      value: rentalMoneyShown(net),
      note: SUGGESTED_NET_NOTE,
    });
    const role = draft.rentalNetRole ?? draft.facts?.[RENTAL_NET_ROLE_FIELD]?.value;
    if (role) {
      facts.push({
        id: "rentalNetRole",
        label: "Rental net role",
        value: role,
      });
    }
  }
  const fileNet =
    draft.suggestedFileNet ?? parseRentalMoney(draft.facts?.[SUGGESTED_FILE_NET_FIELD]?.value);
  if (draft.facts?.[SUGGESTED_FILE_NET_FIELD]?.confirmed && fileNet != null) {
    facts.push({
      id: "suggestedFileNet",
      label: "File net",
      value: rentalMoneyShown(fileNet),
      note: SUGGESTED_FILE_NET_NOTE,
    });
    const fileRole = draft.fileNetRole ?? draft.facts?.[FILE_NET_ROLE_FIELD]?.value;
    if (fileRole) {
      facts.push({
        id: "fileNetRole",
        label: "File net role",
        value: fileRole,
      });
    }
  }
  const dti =
    draft.statedDti ??
    statedDti(
      draft.estimatedHousing,
      draft.statedMonthlyDebts,
      qualifyingIncomeMonthly(draft),
      draftRentalDtiNet(draft),
    );
  if (dti != null) {
    facts.push({
      id: "stated-dti",
      label: "Stated DTI",
      value: formatWholePercent(dti),
      note: STATED_NOT_FROM_CREDIT,
    });
  }
  return facts;
}
