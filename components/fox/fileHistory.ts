import type { FoxAction, FoxIntakeDraft } from "./types";

export const FORMER_HISTORY_ASK =
  "Have you had another address or employer in the last two years? Skip is fine.";

export function tenureUnderTwoYears(draft: FoxIntakeDraft) {
  if (draft.statedTimeOnJob != null && draft.statedTimeOnJob > 0 && draft.statedTimeOnJob < 24) {
    return true;
  }
  const hireMonths = Number(draft.pendingHireDate?.months ?? 0);
  return hireMonths > 0 && hireMonths < 24;
}

export function hasFormerHistorySlot(draft: FoxIntakeDraft) {
  const addresses = (draft.addressHistory ?? []).filter((item) => (item.label ?? "").trim());
  const jobs = (draft.employmentHistory ?? []).filter((item) => (item.label ?? "").trim());
  return addresses.length >= 2 || jobs.length >= 2;
}

export function formerHistorySettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "former-history") return false;
  return Boolean(draft.formerHistoryAsked || hasFormerHistorySlot(draft));
}

export function formerHistoryNeeded(draft: FoxIntakeDraft) {
  if (!draft.sampleAccepted) return false;
  if (draft.motion === "in_queue" || draft.motion === "escalated") return false;
  if (!tenureUnderTwoYears(draft)) return false;
  return !formerHistorySettled(draft);
}

export function isSkipFormerHistoryText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later|no|none|just this)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

export function skipFormerHistory(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    formerHistoryAsked: true,
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

export function writeFormerHistoryNote(draft: FoxIntakeDraft, text: string): FoxIntakeDraft {
  const label = text.trim();
  if (!label) return skipFormerHistory(draft);
  const jobs = [...(draft.employmentHistory ?? [])];
  const addresses = [...(draft.addressHistory ?? [])];
  if (/\d/.test(label) && /[A-Za-z]/.test(label)) {
    addresses.push({ label, to: "former" });
  } else {
    jobs.push({ label, to: "former" });
  }
  return {
    ...draft,
    formerHistoryAsked: true,
    addressHistory: addresses,
    employmentHistory: jobs,
    correcting: null,
    correctingLine: null,
  };
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

export function formerHistoryAskCopy(): { text: string; actions?: FoxAction[] } {
  return {
    text: FORMER_HISTORY_ASK,
    actions: formerHistoryAskActions(),
  };
}
