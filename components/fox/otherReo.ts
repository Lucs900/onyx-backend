import type { FactProposal, FoxAction, FoxIntakeDraft } from "./types";

export const STATED_OTHER_REO_FIELD = "statedOtherReo";
export const SUGGESTED_OTHER_REO_NOTE = "Suggested · not underwritten";
export const OTHER_REO_ASK = "Do you own any other real estate besides this one? Skip is fine.";

export type StatedOtherReo = "none" | "yes";

export function isStatedOtherReo(value: string): value is StatedOtherReo {
  return value === "none" || value === "yes";
}

export function otherReoLabel(value: StatedOtherReo) {
  return value === "yes" ? "Yes" : "None";
}

export function otherReoSettled(draft: FoxIntakeDraft) {
  if (draft.correcting === "other-reo") return false;
  return Boolean(draft.otherReoAsked || draft.statedOtherReo);
}

export function isOtherReoConfirmPending(draft: FoxIntakeDraft) {
  return draft.pendingProposal?.field === STATED_OTHER_REO_FIELD;
}

/** no / just this / I have a rental. No address, value, rent, or HOA. */
export function parseOtherReo(
  text: string,
  opts?: { allowBare?: boolean },
): StatedOtherReo | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase().replace(/[?.!]+$/g, "");
  if (
    /^(just this|only this|just this one|only this one)$/i.test(lower) ||
    /\bjust this\b/.test(lower) ||
    /\bonly this (one|house|home|property)\b/.test(lower) ||
    /\bno other (real estate|propert(?:y|ies)|home|house)\b/.test(lower)
  ) {
    return "none";
  }
  if (opts?.allowBare && /^(no|none|nope|n\/a|na|neither|nothing)$/i.test(lower)) {
    return "none";
  }
  if (
    /i have a rental/.test(lower) ||
    /\b(rental|investment property|another (home|house|property)|other (real estate|propert(?:y|ies))|second (home|house|property))\b/.test(
      lower,
    )
  ) {
    return "yes";
  }
  if (opts?.allowBare && /^(yes|yeah|yep|y)$/i.test(lower)) return "yes";
  return undefined;
}

export function isSkipOtherReoText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[?.!]+$/g, "");
  return (
    /^(skip|skip for now|not yet|later)$/i.test(lower) ||
    /^(i )?(don'?t|do not) (have|know)/i.test(lower)
  );
}

export function skipOtherReo(draft: FoxIntakeDraft): FoxIntakeDraft {
  const facts = { ...(draft.facts ?? {}) };
  delete facts[STATED_OTHER_REO_FIELD];
  return {
    ...draft,
    statedOtherReo: undefined,
    otherReoAsked: true,
    pendingOtherReo: null,
    pendingProposal:
      draft.pendingProposal?.field === STATED_OTHER_REO_FIELD ? null : draft.pendingProposal,
    correcting: null,
    correctingLine: null,
    facts,
  };
}

export function writeStatedOtherReo(draft: FoxIntakeDraft, value: StatedOtherReo): FoxIntakeDraft {
  const now = new Date().toISOString();
  return {
    ...draft,
    statedOtherReo: value,
    otherReoAsked: true,
    pendingOtherReo: null,
    pendingProposal: null,
    pendingConflict: null,
    correcting: null,
    correctingLine: null,
    facts: {
      ...(draft.facts ?? {}),
      [STATED_OTHER_REO_FIELD]: {
        field: STATED_OTHER_REO_FIELD,
        value,
        source: "suggested",
        confirmed: true,
        confirmedAt: now,
      },
    },
  };
}

export function proposeStatedOtherReo(draft: FoxIntakeDraft, value: StatedOtherReo): FoxIntakeDraft {
  const proposal: FactProposal = {
    field: STATED_OTHER_REO_FIELD,
    value,
    label: "Other real estate",
    kind: "computed",
    note: SUGGESTED_OTHER_REO_NOTE,
  };
  return { ...draft, pendingProposal: proposal };
}

export function proposeExtractedOtherReo(draft: FoxIntakeDraft): FoxIntakeDraft {
  return proposeStatedOtherReo(draft, "yes");
}

export function otherReoConfirmCopy(value: StatedOtherReo) {
  if (value === "yes") {
    return `I’ll note other real estate. ${SUGGESTED_OTHER_REO_NOTE}. Use this?`;
  }
  return `No other real estate on the file. ${SUGGESTED_OTHER_REO_NOTE}. Use this?`;
}

export function otherReoConfirmActions(): FoxAction[] {
  return [
    { id: "accept-proposal", label: "Use this", event: "bubble", capture: { field: "accept-proposal" } },
    { id: "decline-proposal", label: "Leave blank", event: "bubble", capture: { field: "decline-proposal" } },
  ];
}

export function otherReoSkipActions(): FoxAction[] {
  return [
    {
      id: "skip-other-reo",
      label: "Skip",
      event: "bubble",
      capture: { field: "skip-other-reo" },
    },
    {
      id: "hold-other-reo",
      label: "Not yet",
      event: "bubble",
      capture: { field: "skip-other-reo" },
    },
  ];
}

export function otherReoAskActions(): FoxAction[] {
  return [
    {
      id: "other-reo-none",
      label: "None",
      event: "bubble",
      capture: { field: "propose-other-reo", value: "none" },
    },
    {
      id: "other-reo-yes",
      label: "Yes",
      event: "bubble",
      capture: { field: "propose-other-reo", value: "yes" },
    },
    ...otherReoSkipActions(),
  ];
}

export function otherReoAskCopy(draft: FoxIntakeDraft): {
  text: string;
  actions?: FoxAction[];
} {
  const prior = draft.statedOtherReo;
  if (prior && draft.correcting === "other-reo") {
    return {
      text: `Other real estate in the file is ${otherReoLabel(prior)}. Still right?`,
      actions: [
        { id: "keep-line", label: "Keep this", event: "bubble", capture: { field: "keep-line" } },
        ...otherReoAskActions(),
      ],
    };
  }
  return {
    text: OTHER_REO_ASK,
    actions: otherReoAskActions(),
  };
}
