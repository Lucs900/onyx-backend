import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";
import { propertyAddressSettled } from "./propertyType";

export const CITIZENSHIP_FIELD = "citizenship";
export const SUGGESTED_CITIZENSHIP_NOTE = "Suggested · not underwritten";
export const CITIZENSHIP_ASK =
  "For this file, US citizen, permanent resident, or other?";

export type FileCitizenshipValue = "us_citizen" | "permanent_resident" | "other";

export function isFileCitizenshipValue(value: string): value is FileCitizenshipValue {
  return value === "us_citizen" || value === "permanent_resident" || value === "other";
}

export function citizenshipLabel(value: FileCitizenshipValue) {
  if (value === "permanent_resident") return "Permanent resident";
  if (value === "other") return "Other";
  return "US citizen";
}

export function citizenshipSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "citizenship") return false;
  return Boolean(draft.citizenshipAsked || draft.agencyDeclarations?.citizenship);
}

export function citizenshipNeeded(draft: FoxIntakeDraft) {
  if (citizenshipSettled(draft)) return false;
  if (!propertyAddressSettled(draft)) return false;
  if (draft.sampleAccepted) return false;
  if (draft.motion === "in_queue" || draft.motion === "escalated") return false;
  return true;
}

export function parseCitizenship(text: string): FileCitizenshipValue | undefined {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  if (!lower) return undefined;
  if (/^(us(\s+citizen)?|citizen|u\.?s\.?\s*citizen|american)$/i.test(lower)) return "us_citizen";
  if (/\b(permanent resident|green card|lpr)\b/.test(lower)) return "permanent_resident";
  if (/^(other|neither)$/i.test(lower)) return "other";
  return undefined;
}

export function isSkipCitizenshipText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

export function skipCitizenship(draft: FoxIntakeDraft): FoxIntakeDraft {
  return {
    ...draft,
    citizenshipAsked: true,
    pendingProposal:
      draft.pendingProposal?.field === CITIZENSHIP_FIELD ? null : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
  };
}

export function writeCitizenship(draft: FoxIntakeDraft, value: FileCitizenshipValue): FoxIntakeDraft {
  const now = new Date().toISOString();
  return {
    ...draft,
    citizenshipAsked: true,
    agencyDeclarations: {
      ...(draft.agencyDeclarations ?? {}),
      citizenship: value,
    },
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [CITIZENSHIP_FIELD]: {
        field: CITIZENSHIP_FIELD,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function proposeCitizenship(draft: FoxIntakeDraft, value: FileCitizenshipValue): FoxIntakeDraft {
  const proposal: FactProposal = {
    field: CITIZENSHIP_FIELD,
    value,
    label: "Citizenship",
    kind: "computed",
    note: SUGGESTED_CITIZENSHIP_NOTE,
  };
  return { ...draft, pendingProposal: proposal };
}

export function citizenshipAskActions(): FoxAction[] {
  return [
    {
      id: "citizenship-us",
      label: "US citizen",
      event: "bubble",
      capture: { field: "citizenship", value: "us_citizen" },
    },
    {
      id: "citizenship-pr",
      label: "Permanent resident",
      event: "bubble",
      capture: { field: "citizenship", value: "permanent_resident" },
    },
    {
      id: "citizenship-other",
      label: "Other",
      event: "bubble",
      capture: { field: "citizenship", value: "other" },
    },
    {
      id: "skip-citizenship",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-citizenship" },
    },
  ];
}

export function citizenshipAskCopy(): { text: string; actions?: FoxAction[] } {
  return {
    text: CITIZENSHIP_ASK,
    actions: citizenshipAskActions(),
  };
}
