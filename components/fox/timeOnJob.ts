import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";

export const STATED_TIME_ON_JOB_FIELD = "statedTimeOnJob";
export const HIRE_DATE_FIELD = "hire_date";
export const SUGGESTED_TIME_ON_JOB_NOTE = "Suggested · not underwritten";
export const TIME_ON_JOB_ASK =
  "How long have you been at this job, or in this line of work? A number is enough. Skip is fine.";
/** Locked as-of so hire-date math stays walker-stable. */
export const TIME_ON_JOB_AS_OF = "2026-08-24";

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

export function wantsTimeOnJobAsk(draft: FoxIntakeDraft) {
  const income = draft.incomeType.value;
  return income === "w2" || income === "both";
}

export function timeOnJobSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "time-on-job") return false;
  if (!wantsTimeOnJobAsk(draft)) return true;
  return Boolean(draft.timeOnJobAsked || draft.statedTimeOnJob != null);
}

export function isTimeOnJobConfirmPending(draft: FoxIntakeDraft) {
  return draft.pendingProposal?.field === STATED_TIME_ON_JOB_FIELD;
}

export function displayTimeOnJob(months: number) {
  const n = Math.max(0, Math.round(months));
  if (n < 24 && n % 12 !== 0) return `${n} month${n === 1 ? "" : "s"}`;
  if (n < 12) return `${n} month${n === 1 ? "" : "s"}`;
  const years = n % 12 === 0 ? n / 12 : Math.round(n / 12);
  return years === 1 ? "1 year" : `${years} years`;
}

export function monthsBetween(from: { year: number; month: number }, asOf = TIME_ON_JOB_AS_OF) {
  const [y, m] = asOf.split("-").map(Number);
  const months = (y - from.year) * 12 + (m - from.month);
  return months > 0 ? months : 0;
}

export function parseHireDate(text: string): { year: number; month: number; label: string } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    if (year < 1970 || year > 2026 || month < 1 || month > 12) return null;
    return { year, month, label: `${MONTH_NAMES[month - 1]} ${year}` };
  }
  const named = trimmed.match(
    /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})$/i,
  );
  if (named) {
    const key = named[1].slice(0, 3).toLowerCase();
    const month =
      ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(key) +
      1;
    const year = Number(named[2]);
    if (!month || year < 1970 || year > 2026) return null;
    return { year, month, label: `${MONTH_NAMES[month - 1]} ${year}` };
  }
  const yearOnly = trimmed.match(/^(?:since\s+)?(\d{4})$/i);
  if (yearOnly) {
    const year = Number(yearOnly[1]);
    if (year < 1970 || year > 2026) return null;
    return { year, month: 1, label: String(year) };
  }
  return null;
}

/** Composer: 3, 3 years, 18 months, 6 months, since 2021, about 2 years. */
export function parseTimeOnJobMonths(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const since = trimmed.match(/\bsince\s+(.+)$/i);
  if (since) {
    const hire = parseHireDate(since[1].trim()) ?? parseHireDate(since[1].replace(/[?.!]+$/g, "").trim());
    if (!hire) return null;
    const months = monthsBetween(hire);
    return months > 0 ? months : null;
  }
  const hire = parseHireDate(trimmed);
  if (hire && /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}-)/i.test(trimmed)) {
    const months = monthsBetween(hire);
    return months > 0 ? months : null;
  }
  const monthsMatch = trimmed.match(
    /\$?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*(months?|mos?\.?)\b/i,
  );
  if (monthsMatch) {
    const n = Number(monthsMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0 || n > 600) return null;
    return Math.round(n);
  }
  const yearsMatch = trimmed.match(
    /(?:about\s+)?\$?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*(years?|yrs?\.?)\b/i,
  );
  if (yearsMatch) {
    const n = Number(yearsMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0 || n > 50) return null;
    return Math.round(n * 12);
  }
  const bare = trimmed.match(/^(?:about\s+)?(\d{1,3}(?:,\d{3})+|\d+)$/i);
  if (!bare) return null;
  const n = Number(bare[1].replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0 || n > 600) return null;
  return Math.round(n);
}

/** Keep the borrower's typed label. Do not invent "years". */
export function timeOnJobLabelFromSpoken(text: string, months: number): string {
  const trimmed = text.trim().replace(/[?.!]+$/g, "");
  return trimmed || String(Math.round(months));
}

export function isSkipTimeOnJobText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later|none|no|n\/a|na)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

export function skipTimeOnJob(draft: FoxIntakeDraft): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  delete facts[STATED_TIME_ON_JOB_FIELD];
  return {
    ...draft,
    statedTimeOnJob: undefined,
    statedTimeOnJobLabel: undefined,
    timeOnJobAsked: true,
    pendingHireDate: null,
    pendingProposal:
      draft.pendingProposal?.field === STATED_TIME_ON_JOB_FIELD ? null : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function writeStatedTimeOnJob(
  draft: FoxIntakeDraft,
  months: number,
  label?: string,
): FoxIntakeDraft {
  const now = new Date().toISOString();
  const rounded = Math.round(months);
  const spoken = (label ?? "").trim();
  const value = spoken || String(rounded);
  return {
    ...draft,
    statedTimeOnJob: rounded,
    statedTimeOnJobLabel: spoken || undefined,
    timeOnJobAsked: true,
    pendingHireDate: null,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [STATED_TIME_ON_JOB_FIELD]: {
        field: STATED_TIME_ON_JOB_FIELD,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function proposeStatedTimeOnJob(draft: FoxIntakeDraft, months: number): FoxIntakeDraft {
  const proposal: FactProposal = {
    field: STATED_TIME_ON_JOB_FIELD,
    value: String(Math.round(months)),
    label: "Time on job",
    kind: "computed",
    note: SUGGESTED_TIME_ON_JOB_NOTE,
  };
  return { ...draft, pendingProposal: proposal };
}

export function proposeExtractedTimeOnJob(
  draft: FoxIntakeDraft,
  months: number,
  hireLabel: string,
  extras: { field: string; value: string; label: string }[] = [],
): FoxIntakeDraft {
  return {
    ...draft,
    pendingHireDate: null,
    pendingProposal: {
      field: STATED_TIME_ON_JOB_FIELD,
      value: String(Math.round(months)),
      label: "Time on job",
      kind: "computed",
      note: SUGGESTED_TIME_ON_JOB_NOTE,
      hireLabel,
      extras,
    },
  };
}

export function timeOnJobConfirmCopy(months: number) {
  return `That’s about ${displayTimeOnJob(months)} at this job. ${SUGGESTED_TIME_ON_JOB_NOTE}. Use this?`;
}

export function hireDateConfirmCopy(hireLabel: string, months: number) {
  return `The paystub shows a hire date of ${hireLabel}. That’s about ${displayTimeOnJob(months)}. ${SUGGESTED_TIME_ON_JOB_NOTE}. Use this?`;
}

export function timeOnJobConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
  ];
}

export function timeOnJobSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-time-on-job",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-time-on-job" },
    },
    {
      id: "hold-time-on-job",
      label: "Not yet",
      event: "bubble",
      capture: { field: "skip-time-on-job" },
    },
  ];
}

export function timeOnJobAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  return {
    text: TIME_ON_JOB_ASK,
    actions: timeOnJobSkipActions(),
  };
}

export function timeOnJobConflictActions(): FoxAction[] {
  return [
    {
      id: "keep-file-fact",
      label: "Keep the typed one",
      event: "bubble",
      capture: { field: "keep-file-fact" },
    },
    {
      id: "use-document-fact",
      label: "Use document",
      event: "bubble",
      capture: { field: "use-document-fact" },
    },
  ];
}

export function hireDateSpokenYears(months: number) {
  const years = Math.round(months / 12);
  if (years >= 1) return years === 1 ? "1 year" : `${years} years`;
  return displayTimeOnJob(months);
}
