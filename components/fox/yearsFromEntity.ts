import type { FactConflict, FactProposal, FoxAction, FoxIntakeDraft } from "./types";

export const YEARS_FROM_ENTITY_FIELD = "years_in_business";
export const YEARS_FROM_ENTITY_AS_OF = "2026-09-16";
export const BUSINESS_STARTED_FIELD = "business_started";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type PendingBusinessStart = {
  date: string;
  years: number;
  label: string;
  entity?: string;
};

export function parseBusinessStartDate(text: string): { iso: string; label: string; year: number; month: number; day: number } | null {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return null;
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return dated(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const numeric = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (numeric) {
    let year = Number(numeric[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return dated(year, Number(numeric[1]), Number(numeric[2]));
  }
  const named = trimmed.match(
    /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i,
  );
  if (named) {
    const key = named[1].slice(0, 3).toLowerCase();
    const month =
      ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(key) + 1;
    return dated(Number(named[3]), month, Number(named[2]));
  }
  return null;
}

function dated(year: number, month: number, day: number) {
  if (year < 1900 || year > 2026 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return {
    iso,
    label: `${MONTH_NAMES[month - 1]} ${day}, ${year}`,
    year,
    month,
    day,
  };
}

/** Whole years from the printed start to the locked as-of. Parass 05-25-2007 → 19 on 2026-09-16. */
export function wholeYearsSince(
  start: { year: number; month: number; day: number },
  asOf = YEARS_FROM_ENTITY_AS_OF,
) {
  const [year, month, day] = asOf.split("-").map(Number);
  if (!year || !month || !day) return 0;
  let n = year - start.year;
  if (month < start.month || (month === start.month && day < start.day)) n -= 1;
  return n > 0 ? n : 0;
}

export function fileYearsInBusiness(draft: FoxIntakeDraft): number | null {
  const raw = String(draft.facts?.[YEARS_FROM_ENTITY_FIELD]?.value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 80) return null;
  return n;
}

export function yearsMatchWithinOne(file: number, fromReturn: number) {
  return Math.abs(file - fromReturn) <= 1;
}

export function looksRightSealed(draft: FoxIntakeDraft) {
  return Boolean(
    draft.sampleAccepted ||
      draft.motion === "in_queue" ||
      draft.motion === "ready" ||
      draft.motion === "escalated",
  );
}

export function isEntityReturnKind(kind?: string | null) {
  const raw = String(kind ?? "").trim().toLowerCase();
  return raw === "1065" || raw === "1120s" || raw === "1120-s";
}

export function businessStartFromFields(fields: Record<string, string> | null | undefined) {
  if (!fields) return null;
  const raw =
    String(fields.business_started ?? "").trim() ||
    String(fields.date_business_started ?? "").trim() ||
    String(fields.date_incorporated ?? "").trim();
  const parsed = parseBusinessStartDate(raw);
  if (!parsed) return null;
  const years = wholeYearsSince(parsed);
  if (years <= 0) return null;
  return {
    date: parsed.iso,
    years,
    label: parsed.label,
    entity: String(fields.entity_name ?? "").trim() || undefined,
  } satisfies PendingBusinessStart;
}

export function holdPendingBusinessStart(
  draft: FoxIntakeDraft,
  fields: Record<string, string>,
): FoxIntakeDraft {
  if (!isEntityReturnKind(fields.return_kind)) return draft;
  if (draft.entityYearsAsked || looksRightSealed(draft)) {
    return { ...draft, pendingBusinessStart: null };
  }
  const pending = businessStartFromFields(fields);
  if (!pending) return draft;
  const file = fileYearsInBusiness(draft);
  if (file != null && yearsMatchWithinOne(file, pending.years)) {
    return { ...draft, pendingBusinessStart: null };
  }
  return { ...draft, pendingBusinessStart: pending };
}

export function isEntityYearsProposal(proposal?: FactProposal | null) {
  return proposal?.field === YEARS_FROM_ENTITY_FIELD && Boolean(proposal.hireLabel || proposal.methodNote === "entity-return-years");
}

export function isEntityYearsConflict(conflict?: FactConflict | null) {
  return conflict?.field === YEARS_FROM_ENTITY_FIELD;
}

export function entityYearsConfirmCopy(pending: PendingBusinessStart) {
  const entity = pending.entity?.trim() || "the business";
  return `The return shows ${entity} started ${pending.label} — ${pending.years} years.`;
}

export function entityYearsConflictCopy(conflict: FactConflict, pending?: PendingBusinessStart | null) {
  const label = pending?.label || conflict.label || "that date";
  const years = pending?.years || Number(conflict.documentValue) || 0;
  return `The return shows started ${label} — ${years} years. The file still has ${conflict.fileValue}.`;
}

export function entityYearsConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
    { id: "skip-years-in-business", label: "Skip", event: "bubble", capture: { field: "skip-years-in-business" } },
  ];
}

export function entityYearsConflictActions(conflict: FactConflict): FoxAction[] {
  const n = Number(conflict.documentValue);
  const keep = String(conflict.fileValue ?? "").trim() || "file";
  return [
    {
      id: "use-document-fact",
      label: Number.isFinite(n) && n > 0 ? `Use ${n} years` : "Use document",
      event: "bubble",
      capture: { field: "use-document-fact" },
    },
    {
      id: "keep-file-fact",
      label: `Keep ${keep}`,
      event: "bubble",
      capture: { field: "keep-file-fact" },
    },
    {
      id: "change-entity-years",
      label: "Change",
      event: "bubble",
      capture: { field: "change-entity-years" },
    },
  ];
}

export function proposeEntityYears(draft: FoxIntakeDraft, pending: PendingBusinessStart): FoxIntakeDraft {
  const proposal: FactProposal = {
    field: YEARS_FROM_ENTITY_FIELD,
    value: String(pending.years),
    label: "Years in business",
    kind: "computed",
    methodNote: "entity-return-years",
    hireLabel: pending.label,
    extras: [
      { field: BUSINESS_STARTED_FIELD, value: pending.date, label: "started" },
      ...(pending.entity ? [{ field: "entity_name", value: pending.entity, label: "entity" }] : []),
    ],
  };
  return {
    ...draft,
    pendingProposal: proposal,
    pendingBusinessStart: pending,
    entityYearsAsked: true,
    awaitingYearsInBusiness: false,
  };
}

export function flushPendingBusinessStart(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (looksRightSealed(draft)) {
    return { ...draft, pendingBusinessStart: null };
  }
  if (draft.pendingProposal || draft.pendingConflict) return draft;
  if (draft.entityYearsAsked) {
    return { ...draft, pendingBusinessStart: null };
  }
  const pending = draft.pendingBusinessStart;
  if (!pending) return draft;
  const file = fileYearsInBusiness(draft);
  if (file != null && yearsMatchWithinOne(file, pending.years)) {
    return { ...draft, pendingBusinessStart: null };
  }
  if (file == null) {
    return proposeEntityYears({ ...draft, pendingBusinessStart: pending }, pending);
  }
  return {
    ...draft,
    pendingBusinessStart: pending,
    entityYearsAsked: true,
    awaitingYearsInBusiness: false,
    pendingConflict: {
      field: YEARS_FROM_ENTITY_FIELD,
      fileValue: String(file),
      documentValue: String(pending.years),
      label: pending.label,
      kind: "document",
    },
  };
}

export function writeEntityYears(draft: FoxIntakeDraft, years: string): FoxIntakeDraft {
  const now = new Date().toISOString();
  return {
    ...draft,
    awaitingYearsInBusiness: false,
    yearsInBusinessAsked: true,
    entityYearsAsked: true,
    pendingBusinessStart: null,
    pendingProposal: isEntityYearsProposal(draft.pendingProposal) ? null : draft.pendingProposal,
    pendingConflict: isEntityYearsConflict(draft.pendingConflict) ? null : draft.pendingConflict,
    facts: {
      ...(draft.facts ?? {}),
      [YEARS_FROM_ENTITY_FIELD]: {
        field: YEARS_FROM_ENTITY_FIELD,
        value: years,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function changeEntityYears(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    pendingProposal: null,
    pendingConflict: isEntityYearsConflict(draft.pendingConflict) ? null : draft.pendingConflict,
    pendingBusinessStart: null,
    entityYearsAsked: true,
    yearsInBusinessAsked: true,
    awaitingYearsInBusiness: true,
    correcting: "years-in-business",
    correctingLine: null,
  };
}
