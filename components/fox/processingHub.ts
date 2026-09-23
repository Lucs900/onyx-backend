/**
 * Processing hub v0 — 1008 analog on the same File as /start.
 * Send posts foxLine. Silent notes stay off the borrower thread.
 * Never credit pull, lock, AU, SSN, BNTouch, LO-will-contact, green approved.
 */
import { stillUsefulSpokenItems } from "./fileWrite";
import { HIGH_LTV_CAUTION, fileCompleteness, isHelocFile, showsAgencyCompleteness } from "./completeness";
import { withHelocToolQuote } from "./heloc";
import { accountSaveAskOpen } from "./account";
import {
  appendFileEvent,
  finishLineActions,
  inQueueEnding,
  motionOf,
  motionStatusCopy,
  nextActorOf,
  waitingOnOf,
} from "./motion";
import type {
  FileCondition,
  FileEvent,
  FoxIntakeDraft,
  FoxMessage,
  ReceivedDoc,
} from "./types";
import { CREDIT_STATED_NOTE } from "./types";
import { previewFacts, productIntentLabel } from "./workspace";

export const STAFF_HUB_PATH = "/staff/hub";
export const STAFF_W2_FOX_LINE = "I still need last year’s W-2 when you have it.";
export const SILENT_DESK_ERROR = "Send needs a foxLine the borrower can hear.";
export const COMPLETENESS_SIGNAL_COPY = "Completeness is a signal, not a blocker.";

export const HUB_EMPTY = "—";

export type HubRow = {
  id: string;
  label: string;
  value: string;
  note?: string;
  loud?: boolean;
};

export const HUB_LOUD_A_IDS = ["product", "purpose", "occupancy", "borrowers"] as const;
export const HUB_LOUD_B_IDS = ["home", "first-lien", "line", "ltv", "cltv", "rate", "io", "credit"] as const;
export const HUB_PAY_IDS = ["qualifying", "debts"] as const;
export const HUB_STATE_IDS = ["status", "next"] as const;

export type StaffDeskInput = {
  foxLine?: string;
  condition?: string;
  silentNote?: string;
};

export type ProcessingHubView = {
  fileId?: string;
  path: string;
  drawerOpen: false;
  loud: HubRow[];
  pay: HubRow[];
  state: {
    status: string;
    next: string;
    waitingOn: string;
    completeness: string;
    stillUseful: string[];
    docs: { name: string; status: string }[];
    quietFlags: string[];
    rows: HubRow[];
  };
};

export function staffHubPath(fileId?: string) {
  const id = fileId?.trim();
  return id ? `${STAFF_HUB_PATH}?file=${encodeURIComponent(id)}` : STAFF_HUB_PATH;
}

function factOf(facts: ReturnType<typeof previewFacts>, ...ids: string[]) {
  for (const id of ids) {
    const found = facts.find((item) => item.id === id);
    if (found) return found;
  }
  return undefined;
}

function cellValue(raw?: string) {
  const value = (raw ?? "").trim();
  return value && value !== HUB_EMPTY ? value : HUB_EMPTY;
}

function shellRow(
  id: string,
  label: string,
  raw?: string,
  note?: string,
  loud = false,
): HubRow {
  const value = cellValue(raw);
  return {
    id,
    label,
    value,
    note: value === HUB_EMPTY ? undefined : note,
    loud,
  };
}

function qiShell(facts: ReturnType<typeof previewFacts>): HubRow {
  const found = factOf(facts, "qualifying");
  const raw = (found?.value ?? "").trim();
  if (!raw || raw === HUB_EMPTY) return shellRow("qualifying", "QI");
  const [amount, ...rest] = raw.split(" · ");
  const method = rest.join(" · ").trim();
  const methodNote = /w-?2|stub|sch(?:edule)?\s*c|k-?1|rental|box 5|cover/i.test(method)
    ? method
    : /w-?2|stub|sch(?:edule)?\s*c|k-?1|rental|box 5|cover/i.test(found?.note ?? "")
      ? found?.note
      : method || undefined;
  return shellRow("qualifying", "QI", amount, methodNote);
}

function hubLiveDraft(draft: FoxIntakeDraft): FoxIntakeDraft {
  return isHelocFile(draft) ? withHelocToolQuote(draft) : draft;
}

function moneyFromText(raw?: string) {
  const match =
    raw?.match(/interest-only\s+\$([\d,]+)/i) ||
    raw?.match(/\bIO\s+\$([\d,]+)/i) ||
    raw?.match(/\$([\d,]+)(?:\/mo)?/i);
  if (!match) return "";
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? `$${Math.round(amount).toLocaleString("en-US")}` : "";
}

function ioShell(draft: FoxIntakeDraft, facts: ReturnType<typeof previewFacts>): HubRow {
  const monthly = draft.liveQuote?.interestOnly;
  if (monthly != null && monthly > 0) {
    return shellRow("io", "IO", `$${Math.round(monthly).toLocaleString("en-US")}`, undefined, true);
  }
  const fromFact = moneyFromText([factOf(facts, "rate")?.value, factOf(facts, "rate")?.note].filter(Boolean).join(" "));
  if (fromFact) return shellRow("io", "IO", fromFact, undefined, true);
  if (draft.liveQuote?.principalAndInterest != null && draft.liveQuote.principalAndInterest > 0) {
    return shellRow("io", "IO", "P&I");
  }
  return shellRow("io", "IO");
}

function rateShell(facts: ReturnType<typeof previewFacts>, draft: FoxIntakeDraft): HubRow {
  const live = draft.liveQuote?.rate;
  if (typeof live === "number" && Number.isFinite(live) && live > 0) {
    return shellRow("rate", "RATE", `${(Math.round(live * 100) / 100).toFixed(2)}%`, undefined, true);
  }
  const found = factOf(facts, "rate");
  const match = found?.value?.match(/(\d+(?:\.\d+)?%)/);
  return shellRow("rate", "RATE", match?.[1] || found?.value, found?.note, true);
}

function hubStatusValue(draft: FoxIntakeDraft) {
  if (accountSaveAskOpen(draft)) return "preparing";
  const motion = motionStatusCopy(draft);
  if (motion === "gathering" || motion === "confirmed") return "preparing";
  return motion;
}

export function hubLoudRows(draft: FoxIntakeDraft): HubRow[] {
  draft = hubLiveDraft(draft);
  const facts = previewFacts(draft);
  const product = factOf(facts, "product")?.value || (draft.productIntent ? productIntentLabel(draft.productIntent) : "");
  const purpose = factOf(facts, "purpose")?.value;
  const occupancy = factOf(facts, "occupancy")?.value;
  const borrowers = factOf(facts, "borrowers")?.value;
  const value = factOf(facts, "home", "price")?.value;
  const first = factOf(facts, "first-lien")?.value || (!factOf(facts, "line") ? factOf(facts, "loan")?.value : "");
  const line = factOf(facts, "line")?.value || factOf(facts, "down")?.value;
  const ltv = factOf(facts, "ltv");
  const cltv = factOf(facts, "cltv");
  const credit = factOf(facts, "credit");
  return [
    shellRow("product", "PROD", product),
    shellRow("purpose", "PURP", purpose),
    shellRow("occupancy", "OCC", occupancy),
    shellRow("borrowers", "BORS", borrowers),
    shellRow("home", "VAL", value, undefined, true),
    shellRow("first-lien", "1ST", first, undefined, true),
    shellRow("line", "LINE", line, undefined, true),
    shellRow("ltv", "LTV", ltv?.value, ltv?.note, true),
    shellRow("cltv", "CLTV", cltv?.value, cltv?.note, true),
    rateShell(facts, draft),
    ioShell(draft, facts),
    shellRow("credit", "FICO", credit?.value, credit?.note),
  ];
}

export function hubLoudText(draft: FoxIntakeDraft) {
  return hubLoudRows(draft)
    .map((row) => [row.label, row.value, row.note].filter(Boolean).join(" "))
    .join(" · ");
}

export function hubPayRows(draft: FoxIntakeDraft): HubRow[] {
  draft = hubLiveDraft(draft);
  const facts = previewFacts(draft);
  return [qiShell(facts), shellRow("debts", "DEBT", factOf(facts, "debts")?.value, factOf(facts, "debts")?.note)];
}

export function hubStateRows(draft: FoxIntakeDraft): HubRow[] {
  return [
    shellRow("status", "STAT", hubStatusValue(draft), hubCompletenessWhisper(draft)),
    shellRow("next", "NEXT", String(nextActorOf(draft) ?? ""), String(waitingOnOf(draft) ?? "") !== String(nextActorOf(draft) ?? "") ? String(waitingOnOf(draft) ?? "") : undefined),
  ];
}

export function hubQuietFlags(draft: FoxIntakeDraft): string[] {
  const flags: string[] = [];
  const facts = previewFacts(draft);
  if (draft.occupancyChoice?.value === "investment") flags.push("INV");
  const caution = facts.find((item) => item.id === "caution");
  if (caution?.value === HIGH_LTV_CAUTION) flags.push("HI-MI");
  const purpose = facts.find((item) => item.id === "purpose")?.value ?? "";
  if (draft.cashOut || /cash-?out/i.test(purpose)) flags.push("C/O");
  const rentalReview =
    stillUsefulSpokenItems(draft).some((item) => /rental|lease|schedule e/i.test(item.label)) ||
    Boolean(facts.find((item) => item.id === "suggestedNetRental" || item.id === "suggestedFileNet")?.value);
  if (rentalReview) flags.push("RENT");
  return flags;
}

function hubCompletenessWhisper(draft: FoxIntakeDraft) {
  const map = fileCompleteness(draft);
  if (map) return `${map.state === "documented" ? "documented" : "sketch"} · ${map.filled} of ${map.total}`;
  return COMPLETENESS_SIGNAL_COPY;
}

export function hubDocs(draft: FoxIntakeDraft): { name: string; status: string }[] {
  return (draft.documents ?? [])
    .filter((doc: ReceivedDoc) => doc.name?.trim())
    .map((doc) => ({
      name: doc.name,
      status: [doc.status, doc.extractClass].filter(Boolean).join(" · "),
    }));
}

export function hubCompletenessSignal(draft: FoxIntakeDraft) {
  if (!showsAgencyCompleteness(draft)) return COMPLETENESS_SIGNAL_COPY;
  return fileCompleteness(draft)?.copy || COMPLETENESS_SIGNAL_COPY;
}

export function processingHubView(draft: FoxIntakeDraft): ProcessingHubView {
  draft = hubLiveDraft(draft);
  return {
    fileId: draft.fileId?.trim() || undefined,
    path: staffHubPath(draft.fileId),
    drawerOpen: false,
    loud: hubLoudRows(draft),
    pay: hubPayRows(draft),
    state: {
      status: hubStatusValue(draft),
      next: nextActorOf(draft),
      waitingOn: waitingOnOf(draft),
      completeness: hubCompletenessSignal(draft),
      stillUseful: stillUsefulSpokenItems(draft)
        .slice(0, 3)
        .map((item) => item.label),
      docs: hubDocs(draft),
      quietFlags: hubQuietFlags(draft),
      rows: hubStateRows(draft),
    },
  };
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function staffCondition(title: string, foxLine: string): FileCondition {
  return {
    id: newId("cond"),
    title,
    foxLine,
    waitingOn: "onyx",
    needed: "doc",
    status: "open",
    stillUseful: false,
  };
}

/** Keep in_queue. Do not close the review WorkItem. Silent notes stay off the thread. */
export function applyStaffDeskSend(
  draft: FoxIntakeDraft,
  input: StaffDeskInput,
  now = new Date(),
): { draft: FoxIntakeDraft; threadLine: string; error?: string } {
  const foxLine = (input.foxLine ?? "").trim();
  if (!foxLine) {
    return { draft, threadLine: "", error: SILENT_DESK_ERROR };
  }
  const at = now.toISOString();
  let next = draft;
  const title = (input.condition ?? "").trim();
  if (title) {
    next = {
      ...next,
      conditions: [...(next.conditions ?? []), staffCondition(title, foxLine)],
    };
  }
  next = appendFileEvent(next, "staff-desk", foxLine, at, {
    actor: "onyx",
    summary: foxLine,
  });
  const silent = (input.silentNote ?? "").trim();
  if (silent) {
    next = appendFileEvent(next, "staff-note", silent, at, {
      actor: "onyx",
      summary: silent,
    });
  }
  return { draft: next, threadLine: foxLine };
}

export function staffDeskKeepsFinishChips(draft: FoxIntakeDraft) {
  return (
    inQueueEnding(draft) &&
    motionOf(draft) === "in_queue" &&
    finishLineActions(draft).some((item) => item.label === "Ask Fox") &&
    finishLineActions(draft).some((item) => item.label === "Upload more") &&
    finishLineActions(draft).some((item) => item.label === "Request human")
  );
}

export function nextBorrowerLine(messages: FoxMessage[], threadLine: string): FoxMessage {
  return {
    id: `staff-${Date.now()}`,
    role: "fox",
    text: threadLine,
  };
}

export function hubHasForbidden(text: string) {
  return (
    /credit pull/i.test(text) ||
    /\bSSN\b/.test(text) ||
    /BNTouch/i.test(text) ||
    /LO will contact you/i.test(text) ||
    /green approved/i.test(text) ||
    /Desktop Underwriter/i.test(text) ||
    /\bDU says\b/i.test(text)
  );
}

export function staffNoteEvents(draft: FoxIntakeDraft): FileEvent[] {
  return (draft.events ?? []).filter((item) => item.kind === "staff-note");
}

export { CREDIT_STATED_NOTE };
