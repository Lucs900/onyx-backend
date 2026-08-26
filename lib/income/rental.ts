/**
 * Rental suggest + NOO net cash flow (B3-3.8-01 internally only).
 * Suggested · not underwritten. Never call this qualifying income.
 * Gross is a working figure only. Persist signed net on Use this.
 * Do not apply 75% to Schedule E. Lease vacancy factor is the only 0.75.
 * Do not net principal-residence rent against subject PITIA.
 */

export const RENTAL_INTERNAL_CITES = ["B3-3.8-01", "B3-3.6-05"] as const;
export const LEASE_VACANCY_FACTOR = 0.75;
export const RENTAL_INCOME_FIELD = "rental_income";
export const RENTAL_GROSS_FIELD = "rental_gross_monthly";
export const RENTAL_PITIA_FIELD = "rental_pitia_used";
export const SUGGESTED_NET_RENTAL_FIELD = "suggested_net_rental";
export const RENTAL_NET_ROLE_FIELD = "rental_net_role";
export const SUGGESTED_RENTAL_NOTE = "Suggested rental income · not underwritten";
export const SUGGESTED_GROSS_NOTE = "Suggested rental (gross) · not underwritten";
export const SUGGESTED_NET_NOTE = "Suggested net rental · not underwritten";
export const PITIA_FROM_FILE_NOTE = "PITIA used to net · from File";
export const PITIA_HOUSING_NOTE = "Estimated housing · not final";
export const RENTAL_STILL_USEFUL = "A Schedule E or a current lease would help.";
export const RENTAL_UNSUPPORTED_CAUTION =
  "I don’t have a rental path for that yet. I’ll keep gathering.";
export const RENTAL_NEED_HOUSING =
  "I need the housing estimate confirmed before I can net this rental.";
export const RENTAL_NEED_STATEMENT = "I don’t have the payment on that rental yet.";
export const RENTAL_NET_COST_CAUTION =
  "This rental looks like a monthly cost. I’ll keep gathering.";

export type RentalMethod = "schedule_e" | "lease_75";
export type RentalNetRole = "income" | "liability" | "none" | "thin";
export type RentalPitiaSource = "estimated_housing" | "statement";
export type RentalThinReason = "housing" | "statement" | "primary";

export type ScheduleERentalInput = {
  rentalIncomeOrLoss?: number | null;
  months?: number | null;
  depreciation?: number | null;
  interest?: number | null;
  hoa?: number | null;
  taxes?: number | null;
  insurance?: number | null;
  /** Unclear non-recurring stays in (conservative). Do not subtract. */
  nonrecurring?: number | null;
};

export type LeaseRentalInput = {
  grossMonthlyRent: number;
  twoMonthsDeposits?: boolean;
};

export type RentalSuggestResult = {
  monthly: number;
  method: RentalMethod;
  thinner?: boolean;
};

export type RentalPropertyInput = {
  id: string;
  kind: "subject" | "reo";
  grossMonthly: number;
  method: RentalMethod;
  pitia?: number | null;
  pitiaSource?: RentalPitiaSource;
};

export type RentalPropertyNet = {
  id: string;
  kind: "subject" | "reo";
  grossMonthly: number;
  method: RentalMethod;
  pitia: number | null;
  pitiaSource?: RentalPitiaSource;
  net: number | null;
  complete: boolean;
  thinReason?: RentalThinReason;
};

export type RentalNetResult = {
  properties: RentalPropertyNet[];
  aggregateNet: number | null;
  role: RentalNetRole;
  completeCount: number;
  method: RentalMethod | "aggregate";
  subjectPitiaNetted: boolean;
  thinReason?: RentalThinReason;
};

const UNSUPPORTED_RENTAL =
  /\b(airbnb|vrbo|short[-\s]?term|str\b|8825|form\s*8825|schedule\s*f|sch\.?\s*f|boarder|room(er|mate) rent|subject adu|adu to qualify|ytd p&l|ytd pnl|profit and loss)\b/i;

export function rentalMoneyShown(value: number) {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded).toLocaleString("en-US");
  return rounded < 0 ? `−$${abs}` : `$${abs}`;
}

/** Retired gross-only confirm. Use rentalNetConfirmCopy. */
export function rentalConfirmCopy(method: RentalMethod, monthly: number): string {
  return (
    rentalNetConfirmCopy({
      net: monthly,
      method,
      completeCount: 1,
    }) ?? ""
  );
}

export function rentalNetConfirmCopy(opts: {
  net: number;
  method: RentalMethod | "aggregate";
  completeCount: number;
}): string | null {
  if (!Number.isFinite(opts.net)) return null;
  const shown = rentalMoneyShown(opts.net);
  if (!shown.includes("$")) return null;
  if (opts.completeCount >= 2) {
    return `Suggested net rental is ${shown} · not underwritten. I’m using all rental properties I can net. Use this?`;
  }
  const using = opts.method === "schedule_e" ? "Schedule E" : "75% of the lease";
  if (opts.net < 0) {
    return `Suggested net rental is ${shown} · not underwritten. That would count as a monthly liability. I’m using ${using} minus this property’s PITIA. Use this?`;
  }
  return `Suggested net rental is ${shown} · not underwritten. I’m using ${using} minus this property’s PITIA. Use this?`;
}

export function rentalNetRoleOf(net: number | null): RentalNetRole {
  if (net == null || !Number.isFinite(net)) return "thin";
  if (net > 0) return "income";
  if (net < 0) return "liability";
  return "none";
}

export function unsupportedRentalNamed(text?: string | null): boolean {
  if (!text) return false;
  return UNSUPPORTED_RENTAL.test(text);
}

/** Stated monthly lease / rent / tenant payment. No dollar → no invent. Not Schedule E. */
export function parseStatedMonthlyLease(
  text: string,
  opts?: { occupancy?: string | null },
): number | null {
  const trimmed = text.trim();
  if (!trimmed || unsupportedRentalNamed(trimmed)) return null;
  if (/\bschedule\s*e\b|\bsch\.?\s*e\b|\bform\s*8825\b|\b8825\b/i.test(trimmed)) return null;
  const occupancy = opts?.occupancy ?? "";
  const investment = occupancy === "investment";
  const leaseOrTenant = /\b(lease|tenant)\b/i.test(trimmed);
  const rentCue = /\brent\b/i.test(trimmed);
  if (!leaseOrTenant && !(investment && rentCue)) return null;
  const amounts: { value: number; index: number }[] = [];
  const money = /\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = money.exec(trimmed))) {
    const n = Number(match[1].replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 100 || n > 100_000) continue;
    const nearby = trimmed.slice(match.index, match.index + 28);
    if (n >= 1900 && n <= 2100 && !/\b(month|mo\b|rent|lease)\b/i.test(nearby)) continue;
    amounts.push({ value: n, index: match.index });
  }
  if (!amounts.length) return null;
  const monthly = amounts.find((item) =>
    /\b(a\s+month|\/\s*mo|monthly)\b/i.test(trimmed.slice(item.index, item.index + 28)),
  );
  return Math.round((monthly ?? amounts[0]).value);
}

/** 12-month average of rental income/loss; add back depreciation, interest, HOA, taxes, insurance. */
export function suggestScheduleERental(input: ScheduleERentalInput): RentalSuggestResult | null {
  if (input.rentalIncomeOrLoss == null || !Number.isFinite(input.rentalIncomeOrLoss)) return null;
  const months = input.months != null && input.months > 0 ? input.months : 12;
  const annual =
    input.rentalIncomeOrLoss +
    (input.depreciation ?? 0) +
    (input.interest ?? 0) +
    (input.hoa ?? 0) +
    (input.taxes ?? 0) +
    (input.insurance ?? 0);
  return {
    monthly: Math.round(annual / months),
    method: "schedule_e",
  };
}

/** suggested monthly = 0.75 * grossMonthlyRent. Thinner if no two months of deposits. */
export function suggestLeaseRental(input: LeaseRentalInput): RentalSuggestResult | null {
  if (!Number.isFinite(input.grossMonthlyRent) || input.grossMonthlyRent <= 0) return null;
  return {
    monthly: Math.round(input.grossMonthlyRent * LEASE_VACANCY_FACTOR),
    method: "lease_75",
    thinner: input.twoMonthsDeposits !== true,
  };
}

export const SUGGESTED_FILE_NET_FIELD = "suggestedFileNet";
export const FILE_NET_ROLE_FIELD = "fileNetRole";
export const SUGGESTED_FILE_NET_NOTE = "Suggested · not underwritten";
export const FILE_NET_METHOD =
  "75% of rent minus that property’s PITI, then one net across other properties";

export type OtherPropertyFileRowInput = {
  id: string;
  rent?: number | null;
  piti?: number | null;
};

export type OtherPropertyFileRowNet = {
  id: string;
  rent: number | null;
  piti: number | null;
  net: number | null;
  complete: boolean;
  thin: boolean;
};

export type OtherPropertyFileNet = {
  rows: OtherPropertyFileRowNet[];
  fileNet: number | null;
  role: RentalNetRole;
  completeCount: number;
};

/** Other-property File net only. Subject is never included. */
export function netOtherPropertyFile(rows: OtherPropertyFileRowInput[]): OtherPropertyFileNet {
  const computed: OtherPropertyFileRowNet[] = rows.map((item) => {
    const rent =
      item.rent != null && Number.isFinite(item.rent) && item.rent > 0 ? Math.round(item.rent) : null;
    const piti =
      item.piti != null && Number.isFinite(item.piti) && item.piti > 0 ? Math.round(item.piti) : null;
    if (rent == null) {
      return { id: item.id, rent: null, piti, net: null, complete: false, thin: true };
    }
    if (piti == null) {
      return { id: item.id, rent, piti: null, net: null, complete: false, thin: true };
    }
    return {
      id: item.id,
      rent,
      piti,
      net: Math.round(rent * LEASE_VACANCY_FACTOR) - piti,
      complete: true,
      thin: false,
    };
  });
  const complete = computed.filter((item) => item.complete && item.net != null);
  const fileNet = complete.length
    ? complete.reduce((sum, item) => sum + (item.net ?? 0), 0)
    : null;
  return {
    rows: computed,
    fileNet,
    role: rentalNetRoleOf(fileNet),
    completeCount: complete.length,
  };
}

export function fileNetConfirmCopy(net: number): string | null {
  if (!Number.isFinite(net)) return null;
  const shown = rentalMoneyShown(net);
  if (!shown.includes("$")) return null;
  const liability = net < 0 ? " That would count as a monthly liability." : "";
  return `Suggested File net is ${shown} · not underwritten.${liability} I’m using ${FILE_NET_METHOD}. Use this?`;
}

/** NOO only. net_i = grossMonthly_i - pitia_i. Aggregate complete properties only. */
export function netRentalCashFlow(properties: RentalPropertyInput[]): RentalNetResult {
  const rows: RentalPropertyNet[] = properties.map((item) => {
    const pitia =
      item.pitia != null && Number.isFinite(item.pitia) && item.pitia > 0 ? Math.round(item.pitia) : null;
    const gross = Math.round(item.grossMonthly);
    if (pitia == null) {
      return {
        id: item.id,
        kind: item.kind,
        grossMonthly: gross,
        method: item.method,
        pitia: null,
        pitiaSource: item.pitiaSource,
        net: null,
        complete: false,
        thinReason: item.kind === "subject" ? "housing" : "statement",
      };
    }
    return {
      id: item.id,
      kind: item.kind,
      grossMonthly: gross,
      method: item.method,
      pitia,
      pitiaSource: item.pitiaSource,
      net: gross - pitia,
      complete: true,
    };
  });
  const complete = rows.filter((item) => item.complete && item.net != null);
  const aggregateNet = complete.length
    ? complete.reduce((sum, item) => sum + (item.net ?? 0), 0)
    : null;
  const role = rentalNetRoleOf(aggregateNet);
  const method =
    complete.length >= 2 ? "aggregate" : (complete[0]?.method ?? rows[0]?.method ?? "lease_75");
  const thinReason = role === "thin" ? rows.find((item) => item.thinReason)?.thinReason : undefined;
  return {
    properties: rows,
    aggregateNet,
    role,
    completeCount: complete.length,
    method,
    subjectPitiaNetted: complete.some(
      (item) => item.kind === "subject" && item.pitiaSource === "estimated_housing",
    ),
    thinReason,
  };
}
