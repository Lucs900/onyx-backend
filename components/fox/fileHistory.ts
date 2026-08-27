import type { FoxAction, FoxIntakeDraft } from "./types";
import { monthsBetween, parseHireDate } from "./timeOnJob";

export const WHERE_BEFORE_ASK = "Where did you live before this?";

export function whoBeforeAsk(employer: string) {
  const name = displayEmployerForAsk(employer);
  return name ? `Who before ${name}?` : "Who before this employer?";
}

/** Keep FORMER_HISTORY_ASK as the Harbor employment gap line for existing imports. */
export const FORMER_HISTORY_ASK = whoBeforeAsk("Harbor Steel");

function trimLabel(value?: string | null) {
  return (value ?? "").trim();
}

function historyRows(
  draft: FoxIntakeDraft,
  key: "addressHistory" | "employmentHistory",
) {
  return (draft[key] ?? []).filter((item) => trimLabel(item.label));
}

export function displayEmployerForAsk(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "";
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return trimmed.toLowerCase().replace(/\b([a-z])/g, (char) => char.toUpperCase());
  }
  return trimmed;
}

export function currentEmployerName(draft: FoxIntakeDraft) {
  const present = historyRows(draft, "employmentHistory").find((item) => item.to === "present");
  if (present?.label) return present.label.trim();
  const first = historyRows(draft, "employmentHistory")[0]?.label;
  if (first) return first.trim();
  return trimLabel(draft.facts?.employer_name?.value);
}

export function currentPresentAddress(draft: FoxIntakeDraft) {
  const present = historyRows(draft, "addressHistory").find((item) => item.to === "present");
  if (present?.label) return present.label.trim();
  const first = historyRows(draft, "addressHistory")[0]?.label;
  if (first) return first.trim();
  return trimLabel(draft.facts?.present_address?.value);
}

function yearsInBusinessMonths(draft: FoxIntakeDraft) {
  const raw = trimLabel(draft.facts?.years_in_business?.value);
  if (!raw) return 0;
  const n = Number(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 12);
}

function printedStartMonths(draft: FoxIntakeDraft) {
  const hireMonths = Number(draft.pendingHireDate?.months ?? 0);
  if (hireMonths > 0) return hireMonths;
  const fromLabels = historyRows(draft, "employmentHistory")
    .map((item) => trimLabel(item.from))
    .filter(Boolean);
  for (const label of fromLabels) {
    const hire = parseHireDate(label);
    if (!hire) continue;
    const months = monthsBetween(hire);
    if (months > 0) return months;
  }
  return 0;
}

export function employmentCoversTwoYears(draft: FoxIntakeDraft) {
  if (draft.statedTimeOnJob != null && draft.statedTimeOnJob >= 24) return true;
  if (printedStartMonths(draft) >= 24) return true;
  if (yearsInBusinessMonths(draft) >= 24) return true;
  return false;
}

export function addressCoversTwoYears(draft: FoxIntakeDraft) {
  for (const item of historyRows(draft, "addressHistory")) {
    const from = trimLabel(item.from);
    if (!from) continue;
    const hire = parseHireDate(from);
    if (!hire) continue;
    if (monthsBetween(hire) >= 24) return true;
  }
  return false;
}

export function hasFormerEmployment(draft: FoxIntakeDraft) {
  return historyRows(draft, "employmentHistory").some((item) => item.to === "former");
}

export function hasFormerAddress(draft: FoxIntakeDraft) {
  return historyRows(draft, "addressHistory").some((item) => item.to === "former");
}

export function sawResidencePaper(draft: FoxIntakeDraft) {
  return (draft.documents ?? []).some((doc) => {
    const cls = doc.extractClass;
    if (cls !== "government_id" && cls !== "bank_statement") return false;
    return doc.status === "extracted" || doc.status === "received" || doc.status === "reading";
  });
}

/** Use this / Skip on the differ ask writes qualifying income. History waits until that lands. */
export function qualifyingIncomeWritten(draft: FoxIntakeDraft) {
  return Boolean(trimLabel(draft.facts?.qualifying_income?.value));
}

function incomeConfirmStillOpen(draft: FoxIntakeDraft) {
  return Boolean(
    draft.awaitingPayFrequency ||
      draft.awaitingBothMonthlyReason ||
      draft.awaitingRaiseWhen ||
      draft.awaitingRaiseYtdFar ||
      draft.pendingProposal?.field === "qualifying_income",
  );
}

export function employmentGapNeeded(draft: FoxIntakeDraft) {
  if (draft.motion === "in_queue" || draft.motion === "escalated") return false;
  if (incomeConfirmStillOpen(draft)) return false;
  if (!qualifyingIncomeWritten(draft)) return false;
  if (draft.formerEmploymentAsked || draft.formerHistoryAsked) return false;
  if (draft.correcting === "former-history") return true;
  const employer = currentEmployerName(draft);
  if (!employer) return false;
  if (hasFormerEmployment(draft)) return false;
  if (employmentCoversTwoYears(draft)) return false;
  return true;
}

export function addressGapNeeded(draft: FoxIntakeDraft) {
  if (draft.motion === "in_queue" || draft.motion === "escalated") return false;
  if (incomeConfirmStillOpen(draft)) return false;
  if (!qualifyingIncomeWritten(draft)) return false;
  if (draft.formerAddressAsked || draft.formerHistoryAsked) return false;
  if (employmentGapNeeded(draft)) return false;
  if (hasFormerAddress(draft)) return false;
  if (addressCoversTwoYears(draft)) return false;
  if (!currentPresentAddress(draft) && !sawResidencePaper(draft)) return false;
  return true;
}

export function historyGapNeeded(draft: FoxIntakeDraft) {
  return employmentGapNeeded(draft) || addressGapNeeded(draft);
}

export function historyGapKind(draft: FoxIntakeDraft): "employment" | "address" | null {
  if (employmentGapNeeded(draft)) return "employment";
  if (addressGapNeeded(draft)) return "address";
  return null;
}

export function hasFormerHistorySlot(draft: FoxIntakeDraft) {
  return hasFormerAddress(draft) || hasFormerEmployment(draft);
}

export function formerHistorySettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "former-history") return false;
  return !historyGapNeeded(draft);
}

export function formerHistoryNeeded(draft: FoxIntakeDraft) {
  return historyGapNeeded(draft);
}

export function isSkipFormerHistoryText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later|no|none|just this)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

export function skipFormerHistory(draft: FoxIntakeDraft): FoxIntakeDraft {
  const kind = historyGapKind(draft);
  return {
    ...draft,
    formerEmploymentAsked: Boolean(draft.formerEmploymentAsked || kind === "employment" || !kind),
    formerAddressAsked: Boolean(draft.formerAddressAsked || kind === "address" || !kind),
    formerHistoryAsked: kind ? draft.formerHistoryAsked : true,
    correcting: null,
    correctingLine: null,
  };
}

export function writePresentAddressHistory(draft: FoxIntakeDraft, address: string): FoxIntakeDraft {
  const label = address.trim();
  if (!label) return draft;
  const existing = draft.addressHistory ?? [];
  if (existing.some((item) => (item.label ?? "").trim().toLowerCase() === label.toLowerCase())) {
    return draft;
  }
  return {
    ...draft,
    addressHistory: [{ label, to: "present" }, ...existing],
  };
}

export function writeCurrentEmploymentHistory(draft: FoxIntakeDraft, employer: string): FoxIntakeDraft {
  const label = employer.trim();
  if (!label) return draft;
  const existing = draft.employmentHistory ?? [];
  if (existing.some((item) => (item.label ?? "").trim().toLowerCase() === label.toLowerCase())) {
    return draft;
  }
  return {
    ...draft,
    employmentHistory: [{ label, to: "present" }, ...existing],
  };
}

export function writeCurrentEmploymentStart(draft: FoxIntakeDraft, fromLabel: string): FoxIntakeDraft {
  const from = fromLabel.trim();
  if (!from) return draft;
  const hire = parseHireDate(from);
  if (!hire) return draft;
  const jobs = [...(draft.employmentHistory ?? [])];
  const index = jobs.findIndex((item) => item.to === "present" || !item.to);
  if (index < 0) return draft;
  jobs[index] = { ...jobs[index], from: hire.label };
  return { ...draft, employmentHistory: jobs };
}

export function writeFormerEmployer(draft: FoxIntakeDraft, text: string): FoxIntakeDraft {
  const label = text.trim();
  if (!label) return skipFormerHistory(draft);
  const jobs = [...(draft.employmentHistory ?? [])];
  if (!jobs.some((item) => (item.label ?? "").trim().toLowerCase() === label.toLowerCase())) {
    jobs.push({ label, to: "former" });
  }
  return {
    ...draft,
    formerEmploymentAsked: true,
    employmentHistory: jobs,
    correcting: null,
    correctingLine: null,
  };
}

export function writeFormerAddress(draft: FoxIntakeDraft, text: string): FoxIntakeDraft {
  const label = text.trim();
  if (!label) return skipFormerHistory(draft);
  const addresses = [...(draft.addressHistory ?? [])];
  if (!addresses.some((item) => (item.label ?? "").trim().toLowerCase() === label.toLowerCase())) {
    addresses.push({ label, to: "former" });
  }
  return {
    ...draft,
    formerAddressAsked: true,
    addressHistory: addresses,
    correcting: null,
    correctingLine: null,
  };
}

export function writeFormerHistoryNote(draft: FoxIntakeDraft, text: string): FoxIntakeDraft {
  const kind = historyGapKind(draft);
  if (kind === "address") return writeFormerAddress(draft, text);
  if (kind === "employment") return writeFormerEmployer(draft, text);
  const label = text.trim();
  if (!label) return skipFormerHistory(draft);
  if (/\d/.test(label) && /[A-Za-z]/.test(label)) return writeFormerAddress(draft, label);
  return writeFormerEmployer(draft, label);
}

export function formerHistoryAskActions(): FoxAction[] {
  return [
    {
      id: "skip-former-history",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-former-history" },
    },
    {
      id: "hold-former-history",
      label: "Not yet",
      event: "bubble",
      capture: { field: "skip-former-history" },
    },
  ];
}

export function formerHistoryAskCopy(draft?: FoxIntakeDraft): { text: string; actions?: FoxAction[] } {
  const kind = draft ? historyGapKind(draft) : "employment";
  if (kind === "address") {
    return { text: WHERE_BEFORE_ASK, actions: formerHistoryAskActions() };
  }
  return {
    text: whoBeforeAsk(draft ? currentEmployerName(draft) : "Harbor Steel"),
    actions: formerHistoryAskActions(),
  };
}

export function formatHistoryRow(entry: { label?: string; from?: string; to?: string }) {
  const label = trimLabel(entry.label);
  if (!label) return "";
  const from = trimLabel(entry.from);
  const to = trimLabel(entry.to);
  const hire = from ? parseHireDate(from) : null;
  if (hire && to === "present") return `${label} · ${hire.label}–present`;
  if (hire && to) return `${label} · ${hire.label}–${to}`;
  if (hire) return `${label} · ${hire.label}`;
  return label;
}
