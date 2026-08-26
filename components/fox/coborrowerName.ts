import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";
import { displayBorrowerName, parseBorrowerName } from "./borrowerName";

export const COBORROWER_NAME_FIELD = "coborrowerName";
export const COBORROWER_NAME_FACT = "coborrower_name";
export const SPOUSE_NAME_FACT = "spouse_name";
export const SUGGESTED_COBORROWER_NOTE = "Suggested · not underwritten";
export const COBORROWER_HANDOFF = "Now working on Borrower 2.";

export function extraBorrowerSlot(_draft?: FoxIntakeDraft): number {
  return 2;
}

export function borrowerSlotLabel(slot: number): string {
  return `Borrower ${slot}`;
}

export function fileHasMultipleBorrowers(draft: FoxIntakeDraft): boolean {
  return (
    draft.statedHousehold === "with_someone" ||
    draft.workingOnCoborrower === true ||
    Boolean(draft.coborrowerName?.trim()) ||
    draft.coborrowerNameAsked === true ||
    isCoborrowerNameConfirmPending(draft)
  );
}

export function primaryFileLabel(draft: FoxIntakeDraft): string {
  return fileHasMultipleBorrowers(draft) ? "Borrower 1" : "Borrower";
}

export function coborrowerFileLabel(draft: FoxIntakeDraft): string {
  return borrowerSlotLabel(extraBorrowerSlot(draft));
}

export function coborrowerHandOffCopy(draft: FoxIntakeDraft): string {
  return `Now working on ${borrowerSlotLabel(extraBorrowerSlot(draft))}.`;
}

export function coborrowerIdInviteCopy(draft: FoxIntakeDraft): string {
  return `First I need ${borrowerSlotLabel(extraBorrowerSlot(draft))}’s government ID, so this file has a name on it.`;
}

export function coborrowerExtractCopy(name: string, draft?: FoxIntakeDraft): string {
  return `I read ${displayBorrowerName(name)} on ${borrowerSlotLabel(extraBorrowerSlot(draft))}’s ID. Use that?`;
}

export function coborrowerTypedNameAsk(draft?: FoxIntakeDraft): string {
  return `What name should I put for ${borrowerSlotLabel(extraBorrowerSlot(draft))}?`;
}

export function coborrowerSpokenIdCopy(draft?: FoxIntakeDraft): string {
  return `Next is ${borrowerSlotLabel(extraBorrowerSlot(draft))}’s government ID.`;
}

export function coborrowerIncomeInviteCopy(
  kind: "paystub" | "w2" | "tax_return",
  draft?: FoxIntakeDraft,
): string {
  const whose = `${borrowerSlotLabel(extraBorrowerSlot(draft))}’s`;
  if (kind === "paystub") return `Now ${whose} most recent paystub.`;
  if (kind === "w2") return `Now ${whose} latest W-2.`;
  return `Now ${whose} latest personal tax return.`;
}

export const COBORROWER_NAME_ASK = coborrowerTypedNameAsk();
export const COBORROWER_CONFIRM_ASK = "The file already has a name for Borrower 2.";

export function coborrowerNameFromFile(draft: FoxIntakeDraft) {
  const raw = (
    draft.coborrowerName ||
    draft.facts?.[COBORROWER_NAME_FACT]?.value ||
    draft.facts?.[SPOUSE_NAME_FACT]?.value ||
    ""
  ).trim();
  return raw ? displayBorrowerName(raw) : "";
}

export function coborrowerNameOnFile(draft: FoxIntakeDraft) {
  return coborrowerNameFromFile(draft);
}

function isCoborrowerIdDoc(doc: FoxIntakeDraft["documents"][number]) {
  if (doc.party === "coborrower") return true;
  return false;
}

export function coborrowerIdSkipped(draft: FoxIntakeDraft) {
  return Boolean(draft.coborrowerIdSkipped);
}

export function coborrowerIdExtractFailed(draft: FoxIntakeDraft) {
  const idDocs = draft.documents.filter(isCoborrowerIdDoc);
  if (!idDocs.length) return false;
  const finished = idDocs.some(
    (doc) =>
      doc.status === "extracted" ||
      doc.status === "failed" ||
      doc.status === "needs better copy",
  );
  if (!finished) return false;
  if (isCoborrowerNameConfirmPending(draft)) return false;
  if (draft.coborrowerName || draft.facts?.[COBORROWER_NAME_FACT]?.value) return false;
  return true;
}

export function coborrowerIdOutstanding(draft: FoxIntakeDraft) {
  if (draft.statedHousehold !== "with_someone" || !draft.householdAsked) return false;
  if (coborrowerIdSkipped(draft)) return false;
  if (coborrowerIdExtractFailed(draft)) return false;
  return !draft.documents.some(
    (doc) =>
      isCoborrowerIdDoc(doc) &&
      (doc.status === "extracted" || doc.status === "failed" || doc.status === "needs better copy"),
  );
}

export function coborrowerNameSettled(draft: FoxIntakeDraft) {
  if (draft.statedHousehold !== "with_someone" || !draft.householdAsked) return true;
  if (coborrowerIdOutstanding(draft)) return true;
  if (draft.correcting === "coborrower-name") return false;
  return Boolean(draft.coborrowerNameAsked || draft.coborrowerName || isCoborrowerNameConfirmPending(draft));
}

export function isCoborrowerNameConfirmPending(draft: FoxIntakeDraft) {
  const field = draft.pendingProposal?.field;
  return field === COBORROWER_NAME_FIELD || field === COBORROWER_NAME_FACT || field === SPOUSE_NAME_FACT;
}

export function isCoborrowerNameField(field: string) {
  return field === COBORROWER_NAME_FIELD || field === COBORROWER_NAME_FACT || field === SPOUSE_NAME_FACT;
}

export function isSkipCoborrowerNameText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

export function parseCoborrowerName(text: string): string | null {
  return parseBorrowerName(text);
}

export function skipCoborrowerName(draft: FoxIntakeDraft): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  delete facts[COBORROWER_NAME_FIELD];
  return {
    ...draft,
    coborrowerName: undefined,
    coborrowerNameAsked: true,
    pendingProposal: isCoborrowerNameConfirmPending(draft) ? null : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function writeCoborrowerName(draft: FoxIntakeDraft, name: string): FoxIntakeDraft {
  const now = new Date().toISOString();
  const value = displayBorrowerName(name);
  return {
    ...draft,
    coborrowerName: value,
    coborrowerNameAsked: true,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [COBORROWER_NAME_FIELD]: {
        field: COBORROWER_NAME_FIELD,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
      [COBORROWER_NAME_FACT]: {
        field: COBORROWER_NAME_FACT,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function proposeCoborrowerName(draft: FoxIntakeDraft, name: string): FoxIntakeDraft {
  const value = displayBorrowerName(name);
  const proposal: FactProposal = {
    field: COBORROWER_NAME_FIELD,
    value,
    label: coborrowerFileLabel(draft),
    kind: "document",
    note: SUGGESTED_COBORROWER_NOTE,
  };
  return { ...draft, pendingProposal: proposal };
}

export function proposeExtractedCoborrowerName(
  draft: FoxIntakeDraft,
  name: string,
  extras: { field: string; value: string; label: string }[] = [],
): FoxIntakeDraft {
  const value = displayBorrowerName(name);
  return {
    ...draft,
    pendingProposal: {
      field: COBORROWER_NAME_FIELD,
      value,
      label: coborrowerFileLabel(draft),
      kind: "document",
      note: SUGGESTED_COBORROWER_NOTE,
      extras,
    },
  };
}

export function skipCoborrowerId(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    coborrowerIdSkipped: true,
    docsOpen: false,
    correcting: null,
  };
}

export function coborrowerNameConfirmCopy(name: string, draft?: FoxIntakeDraft) {
  return `The file already has ${displayBorrowerName(name)}. ${SUGGESTED_COBORROWER_NOTE}. Use this for ${coborrowerFileLabel(draft ?? ({} as FoxIntakeDraft))}?`;
}

export function coborrowerNameConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "change-proposal", label: "Change", event: "bubble", capture: { field: "change-proposal" } },
  ];
}

export function coborrowerNameSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-coborrower-name",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-coborrower-name" },
    },
    {
      id: "hold-coborrower-name",
      label: "Not yet",
      event: "bubble",
      capture: { field: "skip-coborrower-name" },
    },
  ];
}

export function coborrowerNameAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  const fromFile = coborrowerNameFromFile(draft);
  if (fromFile && !draft.coborrowerName && !draft.coborrowerNameAsked && draft.correcting !== "coborrower-name") {
    return {
      text: coborrowerNameConfirmCopy(fromFile, draft),
      actions: [
        {
          id: "use-coborrower-name",
          label: "Use this",
          event: "bubble",
          capture: { field: "coborrowerName", value: fromFile },
        },
        {
          id: "change-coborrower-name",
          label: "Change",
          event: "bubble",
          capture: { field: "correct", value: "coborrower-name" },
        },
      ],
    };
  }
  return {
    text: coborrowerTypedNameAsk(draft),
    actions: coborrowerNameSkipActions(),
  };
}
