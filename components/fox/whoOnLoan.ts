import type { FoxAction, FoxIntakeDraft } from "./types";
import { displayBorrowerName, parseBorrowerName, spokenFirstName } from "./borrowerName";
import {
  COBORROWER_NAME_FIELD,
  coborrowerFileLabel,
  fileHasMultipleBorrowers,
  isCoborrowerNameConfirmPending,
  writeCoborrowerName,
} from "./coborrowerName";

function firstNameOnDraft(draft: FoxIntakeDraft): string {
  const full = (draft.borrowerName || draft.contact.fullName.value || String(draft.facts?.full_name?.value ?? "")).trim();
  if (!full) return "";
  const raw = (full.split(/\s+/)[0] ?? "").replace(/[.,]+$/g, "");
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export const WHO_ON_LOAN_FIELD = "whoOnLoan";
export const WHO_ON_LOAN_ASK = "Is anyone else on this loan?";
export const WHO_ON_LOAN_YES_ASK = "Who is the other person? First and last name.";
export const OTHER_BORROWER_STILL_USEFUL = "Other borrower";
export const SUGGESTED_BORROWERS_NOTE = "Suggested · not underwritten";

export type WhoOnLoan = "just-me" | "yes" | "skip";

export function isWhoOnLoan(value: string): value is WhoOnLoan {
  return value === "just-me" || value === "yes" || value === "skip";
}

export function whoOnLoanSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "who-on-loan") return false;
  return Boolean(draft.whoOnLoanAsked || draft.whoOnLoan);
}

export function hasFirstNameOnFile(draft: FoxIntakeDraft) {
  return Boolean(
    firstNameOnDraft(draft) ||
      draft.borrowerName?.trim() ||
      draft.contact.fullName.value?.trim(),
  );
}

function factName(draft: FoxIntakeDraft, field: string) {
  return String(draft.facts?.[field]?.value ?? "").trim();
}

export function namesMatch(left: string, right: string) {
  const a = displayBorrowerName(left);
  const b = displayBorrowerName(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const first = (value: string) => value.split(/\s+/)[0] ?? "";
  return Boolean(first(a) && first(a) === first(b) && (a.startsWith(b) || b.startsWith(a)));
}

export function primaryNameOnFile(draft: FoxIntakeDraft) {
  return (
    (draft.borrowerName || draft.contact.fullName.value || factName(draft, "full_name") || firstNameOnDraft(draft)).trim()
  );
}

export function pageOtherNameOnFile(draft: FoxIntakeDraft) {
  const raw =
    draft.pageOtherName ||
    factName(draft, "spouse_name") ||
    factName(draft, "coborrower_name") ||
    factName(draft, "coborrowerName");
  const shown = raw ? displayBorrowerName(raw) : "";
  if (!shown) return "";
  const primary = primaryNameOnFile(draft);
  if (primary && namesMatch(shown, primary)) return "";
  return shown;
}

export function secondNameOnPage(draft: FoxIntakeDraft) {
  if (pageOtherNameOnFile(draft)) return true;
  const pending =
    draft.pendingWageExtract?.employee ||
    (draft.pendingProposal?.field === "full_name" || draft.pendingProposal?.field === "employee_name"
      ? draft.pendingProposal.value
      : "") ||
    (draft.pendingProposal?.extras ?? []).find(
      (item) => item.field === "full_name" || item.field === "employee_name" || item.field === "spouse_name",
    )?.value;
  const shown = String(pending ?? "").trim();
  if (!shown) return false;
  const primary = primaryNameOnFile(draft);
  if (!primary) return false;
  return !namesMatch(shown, primary);
}

export function whoOnLoanAskNeeded(draft: FoxIntakeDraft) {
  if (draft.sampleAccepted || draft.pendingFinish) return false;
  if (whoOnLoanSettled(draft)) return false;
  if (draft.correcting === "who-on-loan") return true;
  const named = hasFirstNameOnFile(draft);
  const typed = Boolean(draft.incomeType.value || draft.incomeAsked);
  if (!named && !typed) return false;
  if (secondNameOnPage(draft)) return true;
  if (draft.whoOnLoanDue) return true;
  return Boolean(
    draft.incomeType.value &&
      draft.liveQuoteStatus === "unavailable" &&
      !draft.liveCouponSettled,
  );
}

export function whoOnLoanNameAskNeeded(draft: FoxIntakeDraft) {
  if (draft.sampleAccepted || draft.pendingFinish) return false;
  if (draft.whoOnLoan !== "yes") return false;
  if (draft.coborrowerName?.trim()) return false;
  if (draft.whoOnLoanNameAsked) return false;
  if (isCoborrowerNameConfirmPending(draft)) return false;
  return true;
}

export function borrowersFileValue(draft: FoxIntakeDraft) {
  const named = (draft.coborrowerName || "").trim();
  if (named) return "2";
  if (draft.whoOnLoan === "yes" && !draft.whoOnLoanNameAsked) return "2 unnamed";
  return "1";
}

/** Page name → that borrower only. Unmatched stays unset so a first paper can still write. */
export function paperBorrowerParty(
  draft: FoxIntakeDraft,
  name: string,
): "borrower" | "coborrower" | undefined {
  const shown = displayBorrowerName(name);
  if (!shown) return undefined;
  const coborrower = (draft.coborrowerName || "").trim();
  if (coborrower && namesMatch(shown, coborrower)) return "coborrower";
  const primary = primaryNameOnFile(draft);
  if (primary && namesMatch(shown, primary)) return "borrower";
  return undefined;
}

export function jointWhoseFirstNames(draft: FoxIntakeDraft): string[] {
  const names: string[] = [];
  const primary = spokenFirstName(primaryNameOnFile(draft));
  const coborrower = spokenFirstName(draft.coborrowerName || "");
  if (primary) names.push(primary);
  if (coborrower && coborrower.toLowerCase() !== primary.toLowerCase()) names.push(coborrower);
  return names;
}

/** Joint file names whose W-2. Bare Drop last year’s W-2 is for one borrower. */
export function jointWageDocsAskCopy(draft: FoxIntakeDraft): string | null {
  if (!fileHasMultipleBorrowers(draft)) return null;
  const names = jointWhoseFirstNames(draft);
  if (!names.length) return null;
  const whose = names.length === 1 ? `${names[0]}’s` : `${names[0]}’s or ${names[1]}’s`;
  return `Last year’s W-2 — ${whose}. Drop either. Skip is fine.`;
}

export function isJointWageDocsAskText(text?: string | null) {
  const value = String(text ?? "").trim();
  return /^Last year’s W-2 — .+\. Drop either\. Skip is fine\.$/.test(value);
}

export function withWhoOnLoanDue(draft: FoxIntakeDraft): FoxIntakeDraft {
  if (draft.sampleAccepted) return draft;
  if (whoOnLoanSettled(draft)) return draft;
  if (!(hasFirstNameOnFile(draft) || draft.incomeType.value)) return draft;
  return { ...draft, whoOnLoanDue: true };
}

export function notePageOtherName(draft: FoxIntakeDraft, name: string): FoxIntakeDraft {
  const shown = displayBorrowerName(name);
  if (!shown) return draft;
  const primary = primaryNameOnFile(draft);
  if (!primary) return draft;
  if (namesMatch(shown, primary)) return draft;
  if (draft.pageOtherName && namesMatch(draft.pageOtherName, shown)) return draft;
  return { ...draft, pageOtherName: shown };
}

export function parseWhoOnLoan(text: string, opts?: { allowBare?: boolean }): WhoOnLoan | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase().replace(/[?.!]+$/g, "");
  if (
    /^(just me|just-me|on my own|by myself|myself|alone|only me|buying alone|solo|me only)$/i.test(lower) ||
    /\b(just me|on my own|by myself|buying alone|only me)\b/.test(lower)
  ) {
    return "just-me";
  }
  if (
    /^(skip|skip for now|later|not yet)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  ) {
    return "skip";
  }
  if (
    /with someone/.test(lower) ||
    /\bme and my (spouse|partner|wife|husband|fiancé|fiance)\b/.test(lower) ||
    /\bwith my (spouse|partner|wife|husband|fiancé|fiance)\b/.test(lower) ||
    /\b(my spouse|my partner|co-?borrower|both of us|another borrower|someone else)\b/.test(lower)
  ) {
    return "yes";
  }
  if (opts?.allowBare && /^(yes|yeah|yep|y)$/i.test(lower)) return "yes";
  if (opts?.allowBare && /^(no|none|nope)$/i.test(lower)) return "just-me";
  return undefined;
}

export function isSkipWhoOnLoanText(text: string) {
  return parseWhoOnLoan(text) === "skip";
}

export function writeWhoOnLoan(draft: FoxIntakeDraft, value: WhoOnLoan): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  facts[WHO_ON_LOAN_FIELD] = {
    field: WHO_ON_LOAN_FIELD,
    value,
    source: "suggested",
    confirmed: true,
    confirmedAt: new Date().toISOString(),
  };
  if (value === "just-me") {
    return {
      ...draft,
      whoOnLoan: value,
      whoOnLoanAsked: true,
      whoOnLoanDue: false,
      whoOnLoanNameAsked: undefined,
      statedHousehold: "alone",
      householdAsked: true,
      workingOnCoborrower: undefined,
      coborrowerName: undefined,
      coborrowerNameAsked: undefined,
      pendingProposal: null,
      pendingConflict: null,
      correcting: null,
      correctingLine: null,
      facts,
    };
  }
  if (value === "skip") {
    return {
      ...draft,
      whoOnLoan: value,
      whoOnLoanAsked: true,
      whoOnLoanDue: false,
      whoOnLoanNameAsked: undefined,
      householdAsked: true,
      workingOnCoborrower: undefined,
      pendingProposal: null,
      pendingConflict: null,
      correcting: null,
      correctingLine: null,
      facts,
    };
  }
  return {
    ...draft,
    whoOnLoan: value,
    whoOnLoanAsked: true,
    whoOnLoanDue: false,
    whoOnLoanNameAsked: false,
    workingOnCoborrower: undefined,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function skipWhoOnLoan(draft: FoxIntakeDraft): FoxIntakeDraft {
  return writeWhoOnLoan(draft, "skip");
}

export function skipWhoOnLoanName(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    whoOnLoan: draft.whoOnLoan ?? "yes",
    whoOnLoanAsked: true,
    whoOnLoanNameAsked: true,
    workingOnCoborrower: undefined,
    coborrowerName: undefined,
    coborrowerNameAsked: undefined,
    pendingProposal: isCoborrowerNameConfirmPending(draft) ? null : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
  };
}

export function parseOtherBorrowerName(text: string): string | null {
  const name = parseBorrowerName(text);
  if (!name) return null;
  if (name.split(/\s+/).length < 2) return null;
  return name;
}

export function whoOnLoanNameConfirmCopy(name: string) {
  return `I’ll use ${displayBorrowerName(name)} as the other borrower. ${SUGGESTED_BORROWERS_NOTE}. Use this?`;
}

export function proposeWhoOnLoanName(draft: FoxIntakeDraft, name: string): FoxIntakeDraft {
  const value = parseOtherBorrowerName(name);
  if (!value) return draft;
  return {
    ...draft,
    whoOnLoan: draft.whoOnLoan ?? "yes",
    whoOnLoanAsked: true,
    whoOnLoanDue: false,
    pendingProposal: {
      field: COBORROWER_NAME_FIELD,
      value,
      label: coborrowerFileLabel(draft),
      kind: "computed",
      note: SUGGESTED_BORROWERS_NOTE,
    },
  };
}

export function confirmWhoOnLoanName(draft: FoxIntakeDraft, name: string): FoxIntakeDraft {
  const value = parseOtherBorrowerName(name) ?? displayBorrowerName(name);
  if (!value) return draft;
  const next = writeCoborrowerName(
    {
      ...draft,
      whoOnLoan: draft.whoOnLoan ?? "yes",
      whoOnLoanAsked: true,
      whoOnLoanDue: false,
      whoOnLoanNameAsked: true,
      statedHousehold: "with_someone",
      householdAsked: true,
      workingOnCoborrower: false,
    },
    value,
  );
  return { ...next, workingOnCoborrower: false };
}

export function writeWhoOnLoanName(draft: FoxIntakeDraft, name: string): FoxIntakeDraft {
  const value = parseBorrowerName(name) ?? displayBorrowerName(name);
  if (!value) return draft;
  const next = writeCoborrowerName(
    {
      ...draft,
      whoOnLoan: draft.whoOnLoan ?? "yes",
      whoOnLoanAsked: true,
      whoOnLoanDue: false,
      whoOnLoanNameAsked: true,
      statedHousehold: "with_someone",
      householdAsked: true,
      workingOnCoborrower: true,
    },
    value,
  );
  return { ...next, workingOnCoborrower: true };
}

export function maybeWriteCoborrowerFromPaper(draft: FoxIntakeDraft, name: string): FoxIntakeDraft {
  const shown = parseBorrowerName(name) ?? displayBorrowerName(name);
  if (!shown) return draft;
  if (draft.whoOnLoan === "just-me") return notePageOtherName(draft, shown);
  if (draft.whoOnLoan !== "yes") return notePageOtherName(draft, shown);
  if (draft.coborrowerName?.trim()) return draft;
  return writeWhoOnLoanName(draft, shown);
}

export function otherBorrowerStillUsefulNeeded(draft: FoxIntakeDraft) {
  if (draft.whoOnLoan !== "skip") return false;
  if (draft.coborrowerName?.trim()) return false;
  return secondNameOnPage(draft) || Boolean(pageOtherNameOnFile(draft));
}

export function whoOnLoanAskActions(): FoxAction[] {
  return [
    {
      id: "who-on-loan-yes",
      label: "Yes",
      event: "bubble",
      capture: { field: "whoOnLoan", value: "yes" },
    },
    {
      id: "who-on-loan-just-me",
      label: "Just me",
      event: "bubble",
      capture: { field: "whoOnLoan", value: "just-me" },
    },
    {
      id: "skip-who-on-loan",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-who-on-loan" },
    },
  ];
}

export function whoOnLoanNameSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-who-on-loan-name",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-who-on-loan-name" },
    },
  ];
}

export function whoOnLoanAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  if (whoOnLoanNameAskNeeded(draft)) {
    return {
      text: WHO_ON_LOAN_YES_ASK,
      actions: whoOnLoanNameSkipActions(),
    };
  }
  return {
    text: WHO_ON_LOAN_ASK,
    actions: whoOnLoanAskActions(),
  };
}
