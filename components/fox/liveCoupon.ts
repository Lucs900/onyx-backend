import { liveQuoteMatchesDraft, searchedKeyFor } from "@/lib/rateflow/fromDraft";
import {
  liveQuoteFromCouponRow,
  formatRatePercent,
  liveLoanNowCopy,
  pickLowerPaymentFromRows,
  pickNoCostFromRows,
  pointsFromRow,
  sameCouponNumbers,
  type SafeCouponRow,
} from "@/lib/rateflow/quote";
import {
  isPurchaseContractConfirmPending,
  nextDocInvite,
  needsPurchaseSplitAsk,
  canSpeakDocStamp,
  transcriptSpeakKey,
  LAST_YEAR_FEDERAL_RETURN_ASK,
  DOC_INVITE_COPY,
} from "./fileWrite";
import { ID_UNREAD_ASK, isBorrowerNameConfirmPending } from "./borrowerName";
import {
  isFundsPairProposal,
  isLooksRightAskText,
  isPurchaseLike,
  loanExceedsPurchasePrice,
  looksRightAskActions,
  yearsInBusinessSkipActions,
} from "./completeness";
import { isLookupWaitLine, isLookupWaitMessage } from "./lookupWait";
import {
  isMonthlyDebtsAskText,
  paintedMonthlyDebtsActions,
} from "./monthlyDebts";
import {
  addressOnFileCopy,
  fileAddressLine,
  isPropertyTypeAskText,
  isSubjectAddressConfirmPending,
  propertyTypeAskActions,
  shouldShowAddressUseThis,
} from "./propertyType";
import type { Capture, FoxAction, FoxIntakeDraft, FoxMessage } from "./types";

export const COUPON_UNRESOLVED = "Pricing when the file is ready";

export const LIVE_COUPON_FIELD = "liveCoupon";

export type CouponChoice = "this" | "lower" | "nocost" | "skip";

export type PendingLiveCoupon = {
  choice: "lower" | "nocost";
  rate: number;
  asOf: string;
  principalAndInterest?: number;
  pts?: number;
};

export function liveQuoteReady(draft: FoxIntakeDraft) {
  return Boolean(
    draft.liveQuoteStatus === "ready" &&
      draft.liveQuote &&
      liveQuoteMatchesDraft(draft, draft.liveQuote),
  );
}

export function shouldDeferNextAskForLiveCoupon(draft: FoxIntakeDraft) {
  if (draft.liveCouponSettled || draft.pendingLiveCoupon) return false;
  if (draft.liveQuoteStatus === "unavailable") return false;
  if (draft.liveQuote && draft.liveQuoteStatus === "ready") {
    return !draft.incomeAsked && !draft.incomeType.value;
  }
  return Boolean(searchedKeyFor(draft));
}

export function liveCouponActions(_draft?: FoxIntakeDraft): FoxAction[] {
  return [
    {
      id: "live-coupon-this",
      label: "This one",
      event: "bubble",
      capture: { field: "couponChoice", value: "this" },
    },
    {
      id: "live-coupon-lower",
      label: "Lower payment",
      event: "bubble",
      capture: { field: "couponChoice", value: "lower" },
    },
  ];
}

export function liveCouponConfirmActions(draft?: FoxIntakeDraft): FoxAction[] {
  const lead = draft?.liveQuote?.rate;
  const keep =
    typeof lead === "number" && Number.isFinite(lead) && lead > 0
      ? `Keep ${formatRatePercent(lead)}`
      : "Keep this one";
  return [
    {
      id: "accept-live-coupon",
      label: "Use the new line",
      event: "bubble",
      capture: { field: "accept-live-coupon" },
    },
    {
      id: "keep-live-coupon",
      label: keep,
      event: "bubble",
      capture: { field: "keep-live-coupon" },
    },
  ];
}

export function isLowerPaymentText(text: string) {
  const lower = text.trim().toLowerCase().replace(/[’']/g, "'");
  if (/^lower payment$/.test(lower)) return true;
  if (/^(i('ll| will) pay a point|i want the lowest payment|lowest payment)$/.test(lower)) {
    return true;
  }
  return false;
}

export function isThisOneText(text: string) {
  return /^this one$/.test(text.trim().toLowerCase());
}

export function isNoCostText(text: string) {
  return /^no cost$/.test(text.trim().toLowerCase());
}

export function isCouponSkipText(text: string) {
  return /^(skip|skip for now)$/.test(text.trim().toLowerCase());
}

export function isKeepLeadConfirmText(text: string) {
  const lower = text.trim().toLowerCase();
  if (/^(keep this one|keep this)$/.test(lower)) return true;
  return /^keep\s+\d+(?:\.\d+)?%$/.test(lower);
}

export function couponChoiceFromText(text: string): CouponChoice | null {
  if (isThisOneText(text)) return "this";
  if (isLowerPaymentText(text)) return "lower";
  if (isNoCostText(text)) return "nocost";
  if (isCouponSkipText(text)) return "skip";
  return null;
}

export function couponRowForChoice(
  draft: FoxIntakeDraft,
  choice: "lower" | "nocost",
): SafeCouponRow | null {
  const rows = draft.liveQuoteRows ?? [];
  return choice === "lower" ? pickLowerPaymentFromRows(rows) : pickNoCostFromRows(rows);
}

export function applyCouponChoice(draft: FoxIntakeDraft, choice: CouponChoice): FoxIntakeDraft {
  if (choice === "this" || choice === "skip") {
    return { ...draft, liveCouponSettled: true, pendingLiveCoupon: undefined };
  }
  const row = couponRowForChoice(draft, choice);
  const lead = draft.liveQuote;
  if (!row || !lead) {
    return { ...draft, pendingLiveCoupon: undefined };
  }
  const next = liveQuoteFromCouponRow(row, lead.key, lead.asOf);
  if (sameCouponNumbers(lead, next)) {
    return { ...draft, liveCouponSettled: true, pendingLiveCoupon: undefined };
  }
  return {
    ...draft,
    liveCouponSettled: false,
    pendingLiveCoupon: {
      choice,
      rate: next.rate,
      asOf: lead.asOf,
      ...(next.principalAndInterest != null ? { principalAndInterest: next.principalAndInterest } : {}),
      ...(next.pts != null ? { pts: next.pts } : {}),
    },
  };
}

export function acceptPendingLiveCoupon(draft: FoxIntakeDraft): FoxIntakeDraft {
  const pending = draft.pendingLiveCoupon;
  const lead = draft.liveQuote;
  if (!pending || !lead) {
    return { ...draft, pendingLiveCoupon: undefined, liveCouponSettled: true };
  }
  return {
    ...draft,
    liveQuote: {
      ...lead,
      rate: pending.rate,
      asOf: pending.asOf || lead.asOf,
      ...(pending.principalAndInterest != null
        ? { principalAndInterest: pending.principalAndInterest }
        : {}),
      ...(pending.pts != null ? { pts: pending.pts } : { pts: undefined }),
    },
    pendingLiveCoupon: undefined,
    liveCouponSettled: true,
  };
}

export function keepPendingLiveCoupon(draft: FoxIntakeDraft): FoxIntakeDraft {
  return { ...draft, pendingLiveCoupon: undefined, liveCouponSettled: true };
}

export function couponChoiceUnresolved(draft: FoxIntakeDraft, choice: "lower" | "nocost") {
  const row = couponRowForChoice(draft, choice);
  return !row || !draft.liveQuote;
}

function foxBlob(message: FoxMessage) {
  return `${message.text}\n${message.followUp ?? ""}`;
}

/** Written-address line only — text, not follow-up / income / coupon blob. */
export function isOnFileAddressText(message: FoxMessage) {
  if (message.role !== "fox") return false;
  return /\bon the file\.?\s*$/i.test((message.text ?? "").trim());
}

function onFileFollowOnly(message: FoxMessage) {
  if (message.role !== "fox") return false;
  if (isOnFileAddressText(message)) return false;
  return /\bon the file\.?\s*$/i.test((message.followUp ?? "").trim()) && looksLikeStreetAddress(message.text);
}

/** After File write, that bubble is “On the file.” — three words, no street, no chips. */
export function sealOnFileAddressMessage(message: FoxMessage, _fileLine?: string): FoxMessage {
  return {
    ...message,
    text: addressOnFileCopy(),
    followUp: undefined,
    actions: undefined,
  };
}

function dropUseThisEchoUnderOnFile(messages: FoxMessage[]) {
  const next: FoxMessage[] = [];
  for (const item of messages) {
    const prev = next[next.length - 1];
    if (
      item.role === "client" &&
      /^use this\??$/i.test(item.text.trim()) &&
      prev &&
      isOnFileAddressText(prev)
    ) {
      continue;
    }
    next.push(item);
  }
  return next;
}

function isKeptUseThis(action: FoxAction) {
  return (
    action.capture?.field === "accept-live-coupon" ||
    action.capture?.field === "keep-live-coupon" ||
    action.capture?.field === "couponChoice"
  );
}

/** Looks right finished the sketch. The live line is one missing doc — leftover confirms are paint. */
export function looksRightDocAskOpen(draft: FoxIntakeDraft) {
  return Boolean(nextDocInvite(draft));
}

function isLeftoverConfirmChip(action: FoxAction) {
  const field = action.capture?.field;
  if (
    field === "accept-proposal" ||
    field === "decline-proposal" ||
    field === "change-proposal" ||
    field === "accept-live-coupon" ||
    field === "keep-live-coupon" ||
    field === "couponChoice"
  ) {
    return true;
  }
  return /^(Use this|Use the new line|Change|This one|Lower payment|No cost|Keep this one|Keep \d)/i.test(
    action.label,
  );
}

function isAfterLooksRightDocChip(action: FoxAction) {
  const field = action.capture?.field;
  return (
    (action.label === "Upload this" && (field === "open-docs" || action.event === "open-docs")) ||
    (action.label === "Skip" && field === "skip-docs")
  );
}

function isIdConfirmChip(action: FoxAction) {
  return (
    action.label === "Use this" ||
    (action.label === "Skip" && action.capture?.field === "skip-docs")
  );
}

function lastFoxIndex(messages: FoxMessage[]) {
  let last = -1;
  for (let i = 0; i < messages.length; i += 1) {
    if (messages[i].role === "fox") last = i;
  }
  return last;
}

/** Latest Fox turn index. Chips attach only here. */
export function liveFoxTurnIndex(messages: FoxMessage[]) {
  return lastFoxIndex(messages);
}

function isOverPriceChip(action: FoxAction) {
  const field = action.capture?.field;
  return (
    field === "over-price-confirm" ||
    action.id === "over-price-price" ||
    action.id === "over-price-down" ||
    action.id === "over-price-loan" ||
    action.id === "over-price-confirm"
  );
}

function isLooksRightChip(action: FoxAction) {
  return (
    action.label === "Looks right" ||
    action.label === "Needs a correction" ||
    action.capture?.field === "confirm-draft" ||
    action.capture?.field === "needs-correction"
  );
}

function isOpenUseThisConfirmChip(action: FoxAction) {
  const field = action.capture?.field;
  if (
    field === "accept-proposal" ||
    field === "change-proposal" ||
    field === "use-document-fact" ||
    field === "keep-file-fact" ||
    field === "keep-both-facts" ||
    field === "decline-proposal"
  ) {
    return true;
  }
  return /^(Use this|Use document|Change)$/i.test(action.label);
}

export function messageHasOpenUseThisConfirm(message: FoxMessage) {
  return (message.actions ?? []).some(isOpenUseThisConfirmChip);
}

export function threadHasOpenUseThisConfirm(messages: FoxMessage[]) {
  return messages.some((message) => message.role === "fox" && messageHasOpenUseThisConfirm(message));
}

/** Looks right never shares a thread with an open Use this / Use document / Change card. */
export function stripLooksRightWhileUseThisOpen(
  messages: FoxMessage[],
  draft: FoxIntakeDraft,
): FoxMessage[] {
  const open = Boolean(draft.pendingProposal || draft.pendingConflict || draft.pendingAddress);
  if (!open && !threadHasOpenUseThisConfirm(messages)) return messages;
  return messages.map((message) => {
    if (message.role !== "fox" || !message.actions?.length) return message;
    const next = message.actions.filter((action) => !isLooksRightChip(action));
    if (next.length === message.actions.length) return message;
    return { ...message, actions: next.length ? next : undefined };
  });
}

function isSkipDocChip(action: FoxAction) {
  return action.label === "Skip" && action.capture?.field === "skip-docs";
}

/** Filename · received. History text — never a chip row. */
export function isReceivedStatusLine(text?: string | null) {
  return /· received\.?$/i.test(String(text ?? "").trim());
}

export function isLastYearReturnAskText(text?: string | null) {
  const value = String(text ?? "").trim();
  if (!value) return false;
  if (value === LAST_YEAR_FEDERAL_RETURN_ASK) return true;
  return /^Last year.?s (?:tax return|federal return|Form 1040)\b/i.test(value);
}

/** 1040 + schedule ask parked as follow-up after a transcript. */
export function isTranscriptFollowUpAskText(text?: string | null) {
  const value = String(text ?? "").trim();
  if (!value) return false;
  return /^I need the (?:(?:19|20)\d{2} )?Form 1040\b/i.test(value);
}

function isLaterFoxAfterLastYearOffer(message: FoxMessage) {
  if (message.role !== "fox") return false;
  if (isTranscriptSignalAskText(message.text) || isTranscriptFollowUpAskText(message.text)) {
    return true;
  }
  return isTranscriptFollowUpAskText(message.followUp);
}

function historyOfferKey(text?: string | null) {
  if (isLastYearReturnAskText(text)) return "offer:last-year-return";
  if (isReceivedStatusLine(text)) return "offer:received";
  if (!isHistoryDocInviteText(text)) return null;
  return `offer:${String(text ?? "").trim()}`;
}

/** Older doc offers. History once a later Fox line exists. */
export function isHistoryDocInviteText(text?: string | null) {
  const value = String(text ?? "").trim();
  if (!value) return false;
  if (isLastYearReturnAskText(value) || isReceivedStatusLine(value)) return true;
  if (isTranscriptSignalAskText(value)) return false;
  if (Object.values(DOC_INVITE_COPY).some((line) => line === value)) return true;
  return (
    /^First I need a government ID/i.test(value) ||
    /^Next is a government ID/i.test(value) ||
    /^Next is your latest paystub\b/i.test(value) ||
    /^Next is this year.?s W-2\b/i.test(value) ||
    /^Drop last year.?s W-2\b/i.test(value) ||
    /^I need your (?:19|20)\d{2} federal tax return/i.test(value) ||
    /^I need the (?:19|20)\d{2} return\b/i.test(value) ||
    /^Two recent statements\b/i.test(value)
  );
}

/** One Upload this · one Skip. Extra copies on the same row die. */
export function oneDocChipSet(actions: FoxAction[] | undefined): FoxAction[] {
  if (!actions?.length) return [];
  const seen = new Set<string>();
  const next: FoxAction[] = [];
  for (const action of actions) {
    const key = `${action.label}:${action.capture?.field ?? action.event ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(action);
  }
  return next;
}

/** Leftover last-year-return / ID / W-2 offers after the live transcript die. */
export function withoutLeftoverDocInvitesAfterTranscript(messages: FoxMessage[]): FoxMessage[] {
  let lastTranscript = -1;
  for (let i = 0; i < messages.length; i += 1) {
    if (messages[i]?.role === "fox" && isTranscriptSignalAskText(messages[i]?.text)) {
      lastTranscript = i;
    }
  }
  if (lastTranscript < 0) return messages;
  return messages.filter((message, index) => {
    if (index <= lastTranscript) return true;
    if (message.role === "fox" && isHistoryDocInviteText(message.text)) return false;
    return true;
  });
}

/** One copy of each history offer. Old and new last-year copy are the same offer. */
export function withoutDuplicateHistoryInvite(messages: FoxMessage[]): FoxMessage[] {
  const seen = new Set<string>();
  return messages.filter((message) => {
    if (message.role !== "fox") return true;
    const key = historyOfferKey(message.text);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isFoxOfferLine(text?: string | null) {
  const value = String(text ?? "").trim();
  if (!value) return false;
  if (isTranscriptSignalAskText(value) || isTranscriptFollowUpAskText(value)) return true;
  return isHistoryDocInviteText(value);
}

/** Follow-up that is itself a later offer becomes its own Fox turn. Transcript block stays one turn. */
export function splitFoxFollowUpTurns(messages: FoxMessage[]): FoxMessage[] {
  const next: FoxMessage[] = [];
  for (const message of messages) {
    const later = String(message.followUp ?? "").trim();
    if (
      message.role !== "fox" ||
      !later ||
      isTranscriptSignalAskText(message.text) ||
      !isFoxOfferLine(message.text) ||
      !isFoxOfferLine(later)
    ) {
      next.push(message);
      continue;
    }
    next.push({ ...message, followUp: undefined, actions: undefined });
    const actions = oneDocChipSet(message.actions);
    next.push({
      id: `${message.id}:later`,
      role: "fox",
      text: later,
      followUp: undefined,
      actions: actions.length ? actions : undefined,
    });
  }
  return next;
}

export function splitLeftoverOfferWithLaterFollowUp(messages: FoxMessage[]): FoxMessage[] {
  return splitFoxFollowUpTurns(messages);
}

/** A reprinted last Fox line after a different later ask is leftover — move it back. */
export function promoteReprintedFoxAsk(messages: FoxMessage[]): FoxMessage[] {
  const last = lastFoxIndex(messages);
  if (last < 0) return messages;
  const lastMsg = messages[last];
  if (!lastMsg || lastMsg.role !== "fox") return messages;
  const key = lastMsg.text.trim();
  if (!key) return messages;
  const reprint = messages.some(
    (message, index) => index < last && message.role === "fox" && message.text.trim() === key,
  );
  if (!reprint) return messages;
  let later = -1;
  for (let i = 0; i < last; i += 1) {
    if (messages[i]?.role === "fox" && messages[i].text.trim() !== key) later = i;
  }
  if (later < 0) return messages;
  const leftover = { ...lastMsg, actions: undefined };
  const without = messages.filter((_, index) => index !== last);
  return [...without.slice(0, later), leftover, ...without.slice(later)];
}

export function promoteLaterFoxPastLeftoverOffers(messages: FoxMessage[]): FoxMessage[] {
  return promoteReprintedFoxAsk(messages);
}

/** History is speech. Chip actions are never stored on a message. */
export function withoutStoredChipActions(messages: FoxMessage[]): FoxMessage[] {
  return messages.map((message) =>
    message.actions?.length ? { ...message, actions: undefined } : message,
  );
}

/** Persist primitive: the thread is text. The live strip recomputes chips. */
export function sealStoredFoxThread(messages: FoxMessage[]): FoxMessage[] {
  return withoutStoredChipActions(withChipsOnlyOnLiveFoxTurn(freezeUsedFoxTurns(messages)));
}

/** Skip chips still live on a named history/offer line. Stored actions count — not only paint. */
export function leftoverSkipOnAskText(
  messages: FoxMessage[],
  draft: FoxIntakeDraft,
  match: (text: string) => boolean,
) {
  let count = 0;
  for (const message of messages) {
    if (!match(message.text ?? "")) continue;
    count += leftoverChipCount(message.actions, "skip");
  }
  const thread = dropResolvedAddressConfirmChips(messages, draft);
  for (let i = 0; i < thread.length; i += 1) {
    const message = thread[i];
    if (!match(message.text ?? "")) continue;
    count += leftoverChipCount(message.actions, "skip");
    count += leftoverChipCount(paintedFoxActions(message, draft, isLiveFoxTurn(thread, i)), "skip");
  }
  return count;
}

function leftoverChipCount(
  actions: FoxAction[] | undefined,
  kind: "use-this" | "looks-right" | "this-one" | "skip",
) {
  if (!actions?.length) return 0;
  return actions.filter((action) => {
    if (kind === "looks-right") return isLooksRightChip(action);
    if (kind === "this-one") return action.label === "This one";
    if (kind === "skip") return isSkipDocChip(action) || action.label === "Skip";
    return action.label === "Use this";
  }).length;
}

function leftoverUseThisPaint(text?: string | null) {
  return /\bUse this\??\b/i.test(String(text ?? ""));
}

function leftoverOnOlderTurns(
  messages: FoxMessage[],
  draft: FoxIntakeDraft,
  kind: "use-this" | "looks-right" | "this-one" | "skip",
) {
  const thread = freezeUsedFoxTurns(dropResolvedAddressConfirmChips(messages, draft));
  const last = lastFoxIndex(thread);
  let count = 0;
  for (let i = 0; i < thread.length; i += 1) {
    const message = thread[i];
    if (message.role !== "fox" || i === last) continue;
    count += leftoverChipCount(paintedFoxActions(message, draft, false), kind);
    count += leftoverChipCount(message.actions, kind);
    if (kind === "use-this" && leftoverUseThisPaint(message.text)) count += 1;
    if (kind === "use-this" && leftoverUseThisPaint(message.followUp)) count += 1;
  }
  return count;
}

/** Leftover Use this still live on older Fox turns after a used chip. */
export function leftoverUseThisOnOlderTurns(messages: FoxMessage[], draft: FoxIntakeDraft) {
  return leftoverOnOlderTurns(messages, draft, "use-this");
}

/** Leftover Looks right still live on older Fox turns after a used chip. */
export function leftoverLooksRightOnOlderTurns(messages: FoxMessage[], draft: FoxIntakeDraft) {
  return leftoverOnOlderTurns(messages, draft, "looks-right");
}

/** Leftover This one still live on older Fox turns after a used chip. */
export function leftoverThisOneOnOlderTurns(messages: FoxMessage[], draft: FoxIntakeDraft) {
  return leftoverOnOlderTurns(messages, draft, "this-one");
}

/** Leftover Skip still live on older Fox turns after a used chip. */
export function leftoverSkipOnOlderTurns(messages: FoxMessage[], draft: FoxIntakeDraft) {
  return leftoverOnOlderTurns(messages, draft, "skip");
}

/** Skip chips parked on a filename · received line. Those die. */
export function leftoverSkipOnReceivedLines(messages: FoxMessage[], draft: FoxIntakeDraft) {
  const thread = dropResolvedAddressConfirmChips(messages, draft);
  let count = 0;
  for (const message of thread) {
    if (!isReceivedStatusLine(message.text)) continue;
    count += leftoverChipCount(message.actions, "skip");
    count += leftoverChipCount(paintedFoxActions(message, draft, true), "skip");
  }
  return count;
}

/** One live chip row = one Skip on the composer strip. */
export function liveSkipChipRows(messages: FoxMessage[], draft: FoxIntakeDraft) {
  const thread = dropResolvedAddressConfirmChips(messages, draft);
  const last = lastFoxIndex(thread);
  if (last < 0) return 0;
  const message = thread[last]!;
  if (isReceivedStatusLine(message.text)) return 0;
  return leftoverChipCount(paintedFoxActions(message, draft, true), "skip") > 0 ? 1 : 0;
}

/** One drop = one received line. Extra copies are leftover paint. */
export function withoutDuplicateReceivedLine(messages: FoxMessage[]): FoxMessage[] {
  let keep = -1;
  for (let i = 0; i < messages.length; i += 1) {
    if (isReceivedStatusLine(messages[i]?.text)) {
      keep = i;
      break;
    }
  }
  if (keep < 0) return messages;
  return messages.filter((message, index) => {
    if (!isReceivedStatusLine(message.text)) return true;
    return index === keep;
  });
}

function sealReceivedStatusLine(message: FoxMessage): FoxMessage {
  if (!isReceivedStatusLine(message.text)) return message;
  if (message.role === "system" && !message.actions?.length && !message.followUp) return message;
  return {
    ...message,
    role: message.role === "client" ? message.role : "system",
    followUp: undefined,
    actions: undefined,
  };
}

function foxTurnHasLaterUsedReply(messages: FoxMessage[], index: number) {
  for (let i = index + 1; i < messages.length; i += 1) {
    const item = messages[i];
    if (item.role === "fox") return true;
    if (item.role !== "client") continue;
    if (/^(This one|Use this|Looks right|yes|Skip)$/i.test(item.text.trim())) return true;
  }
  return false;
}

/** Chips attach only to the latest unused Fox turn index. */
export function isLiveFoxTurn(messages: FoxMessage[], index: number) {
  if (index < 0 || messages[index]?.role !== "fox") return false;
  if (foxTurnHasLaterUsedReply(messages, index)) return false;
  return index === lastFoxIndex(messages);
}

/** Persist/render engine: Fox turns store no buttons. The strip owns chips. */
export function withChipsOnlyOnLiveFoxTurn(messages: FoxMessage[]): FoxMessage[] {
  return withoutStoredChipActions(messages);
}

/**
 * Chip verbs belong on the composer strip. History — including the live last
 * line — paints speech only. Engine/storage may still keep the cue so the
 * strip can match; FoxThread must never print it.
 */
export function historyBubbleSpeech(text?: string | null) {
  return String(text ?? "")
    .replace(/\s*Skip if you want to type it\.?/gi, "")
    .replace(/\s*Use this\?\s*$/i, "")
    .trim();
}

/** Used confirms are history — not a button. Drop the trailing Use this? so chips cannot fire. */
export function inertUsedConfirmText(text?: string | null) {
  return String(text ?? "")
    .replace(/\s*Use this\?\s*$/i, "")
    .trim();
}

/** After a chip is used, that Fox turn is inert text. Quick replies live only on the latest Fox line. */
export function freezeUsedFoxTurns(messages: FoxMessage[]): FoxMessage[] {
  const sealed = withoutDuplicateHistoryInvite(
    withoutLeftoverDocInvitesAfterTranscript(
      withoutDuplicateReceivedLine(
        promoteReprintedFoxAsk(splitFoxFollowUpTurns(messages)),
      ).map(sealReceivedStatusLine),
    ),
  );
  const current = lastFoxIndex(sealed);
  return sealed.map((message, index) => {
    if (isReceivedStatusLine(message.text)) return sealReceivedStatusLine(message);
    if (message.role !== "fox") {
      return message.actions?.length ? { ...message, actions: undefined } : message;
    }
    const used = index !== current || foxTurnHasLaterUsedReply(sealed, index);
    if (!used) {
      const actions = oneDocChipSet(message.actions);
      if (actions.length === (message.actions?.length ?? 0)) return message;
      return { ...message, actions: actions.length ? actions : undefined };
    }
    const text = inertUsedConfirmText(message.text);
    const followUp = message.followUp ? inertUsedConfirmText(message.followUp) : message.followUp;
    if (!message.actions?.length && text === message.text && followUp === message.followUp) {
      return message;
    }
    return { ...message, text, followUp, facts: message.facts, actions: undefined };
  });
}

/** ID / Upload this · Skip must not sit beside a live Use this confirm. */
export function shouldHoldDocInviteForOpenUseThis(
  lastText?: string | null,
  lastActions?: FoxAction[] | null,
  askText?: string | null,
) {
  return shouldHoldAskForOpenUseThis(lastText, lastActions, askText);
}

/** No new question while Use this is still live — value, ID, or anything else waits. */
export function shouldHoldAskForOpenUseThis(
  lastText?: string | null,
  lastActions?: FoxAction[] | null,
  askText?: string | null,
) {
  if (!isUseThisConfirmText(lastText)) return false;
  const ask = String(askText ?? "").trim();
  if (!ask) return false;
  return ask !== String(lastText ?? "").trim();
}

/** Leftover price / value / funds asks must not sit beside a live Use this confirm. */
export function isStructureAmountAskText(text?: string | null) {
  return /What’s the property value\?|What’s the purchase price\?|What’s the approximate loan or payoff amount\?|What’s the down payment/.test(
    String(text ?? ""),
  );
}

export function dropLeftoverAmountAsksForOpenUseThis(messages: FoxMessage[]): FoxMessage[] {
  return messages.filter(
    (message) => !(message.role === "fox" && isStructureAmountAskText(message.text)),
  );
}

/** After Looks right, older Fox turns are text. Chips live only on the latest ask. */
function dropLeftoverConfirmChipsOnLooksRightDocAsk(
  messages: FoxMessage[],
  draft: FoxIntakeDraft,
): FoxMessage[] {
  const frozen = freezeUsedFoxTurns(messages);
  if (!looksRightDocAskOpen(draft)) return frozen;
  const current = lastFoxIndex(frozen);
  return frozen.map((message, index) => {
    if (message.role !== "fox" || !message.actions?.length) return message;
    if (index !== current) {
      return { ...message, text: message.text, followUp: message.followUp, facts: message.facts, actions: undefined };
    }
    const keepIdUseThis =
      /The ID shows /i.test(foxBlob(message)) && isBorrowerNameConfirmPending(draft);
    const keepFundsPair =
      isFundsPairProposal(draft.pendingProposal) && isFundsPairConfirmText(message.text);
    const next = message.actions.filter((action) => {
      if (isPricingFailSpeech(message) && isPricingFailChip(action)) return true;
      if (
        keepFundsPair &&
        (action.capture?.field === "accept-proposal" || action.capture?.field === "change-proposal")
      ) {
        return true;
      }
      return keepIdUseThis ? isIdConfirmChip(action) : isAfterLooksRightDocChip(action);
    });
    if (next.length === message.actions.length) return message;
    return { ...message, actions: next.length ? next : undefined };
  });
}

/** Founder score: a street line painted as a thread chip / pill / answer row. */
export function isStreetSuggestChipLabel(label: string) {
  const raw = label.replace(/\s+/g, " ").trim();
  if (!raw) return false;
  if (/^(Skip|Use this|Change|Not yet)$/i.test(raw)) return false;
  return /^\d{1,6}\s+\S/.test(raw) && /,\s*CA\b/.test(raw);
}

/** Count street chips on the painted Fox thread. Composer list rows do not count. */
export function paintedStreetSuggestCount(messages: FoxMessage[], draft: FoxIntakeDraft) {
  let lastFox = -1;
  for (let i = 0; i < messages.length; i += 1) {
    if (messages[i].role === "fox") lastFox = i;
  }
  let count = 0;
  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    if (message.role !== "fox") continue;
    const painted = paintedFoxActions(message, draft, i === lastFox) ?? [];
    for (const action of painted) {
      if (action.capture?.field === "propose-place-address" || isStreetSuggestChipLabel(action.label)) {
        count += 1;
      }
    }
  }
  return count;
}

export function isAddressUseAction(action: FoxAction) {
  if (isKeptUseThis(action)) return false;
  const field = action.capture?.field;
  return (
    field === "accept-proposal" ||
    field === "change-proposal" ||
    field === "decline-proposal" ||
    field === "subjectAddress" ||
    action.id === "accept-proposal" ||
    action.id === "change-proposal" ||
    action.id === "decline-proposal" ||
    action.id === "accept-subject-address" ||
    action.label === "Use this" ||
    action.label === "Change"
  );
}

function isIdDocRow(doc: FoxIntakeDraft["documents"][number]) {
  if (doc.party === "coborrower") return false;
  if (doc.extractClass === "government_id" || doc.slot === "id") return true;
  return /(?:^|[^a-z0-9])(id|dl|license)(?:[^a-z0-9]|$)/i.test(doc.name ?? "");
}

/** Composer ID drop / confirm / unread. Invite alone keeps the earlier address On the file. */
export function isIdExtractPath(draft: FoxIntakeDraft) {
  if (isBorrowerNameConfirmPending(draft)) return true;
  return (draft.documents ?? []).some((doc) => {
    if (!isIdDocRow(doc)) return false;
    if (doc.status === "reading" || doc.status === "extracted" || doc.status === "received" || doc.status === "failed") {
      return true;
    }
    return /could not read|no text layer/i.test(doc.note ?? "");
  });
}

export function isIdExtractAskText(text?: string | null) {
  const value = String(text ?? "").trim();
  return (
    /The ID shows /i.test(value) ||
    value === ID_UNREAD_ASK ||
    /^I could not read this\.?$/i.test(value) ||
    /First I need a government ID/i.test(value) ||
    /Next is a government ID/i.test(value)
  );
}

/** Spoken confirm still waiting on Use this. Used chips freeze; only the latest Fox line keeps chips. */
export function isUseThisConfirmText(text?: string | null) {
  return /Use this\?$/.test(String(text ?? "").trim());
}

function isIdExtractThreadText(blob: string) {
  return isIdExtractAskText(blob);
}

export function dropOnFileAddressLines(messages: FoxMessage[]): FoxMessage[] {
  return messages.filter((message) => !isOnFileAddressLine(message));
}

/** Paperclip / composer drop of an ID: replace the invite. Never append On the file. */
export function applyIdExtractAsk(messages: FoxMessage[], ask: FoxMessage): FoxMessage[] {
  const cleaned = dropOnFileAddressLines(messages);
  const last = lastFoxIndex(cleaned);
  const lastMsg = last >= 0 ? cleaned[last] : undefined;
  const replace =
    lastMsg &&
    (isIdExtractThreadText(foxBlob(lastMsg)) ||
      isOnFileAddressLine(lastMsg) ||
      looksLikeStreetAddress(foxBlob(lastMsg)));
  if (replace && lastMsg) {
    return freezeUsedFoxTurns(
      cleaned.map((message, index) => (index === last ? { ...ask, id: lastMsg.id } : message)),
    );
  }
  // Freeze after append so a just-used Period / Box 5 Use this becomes text.
  return freezeUsedFoxTurns([...cleaned, ask]);
}

function isPricingFailSpeech(message: FoxMessage) {
  return message.id.startsWith("pricing-ready:") || message.text === "Pricing when the file is ready";
}

function isPricingFailChip(action: FoxAction) {
  return (
    action.capture?.field === "retry-rateflow" ||
    action.id === "pricing-ready-retry" ||
    action.id === "pricing-ready-skip"
  );
}

function isFundsPairConfirmText(text?: string) {
  if (!text) return false;
  return (
    / down · .+ loan\. Use this\?/i.test(text) ||
    /Loan amount would be .+\. Use this\?/i.test(text) ||
    /Down payment would be .+\. Use this\?/i.test(text)
  );
}

function looksLikeOtherProposalConfirm(blob: string) {
  if (isFundsPairConfirmText(blob)) return true;
  if (isIdExtractThreadText(blob)) return true;
  if (/That[\u2019']s a (single-family house|condo|2–4 unit)/i.test(blob)) return true;
  if (/Suggested qualifying income/i.test(blob)) return true;
  if (/qualifying income/i.test(blob)) return true;
  if (/\ba month\b/i.test(blob)) return true;
  if (/The ID shows /i.test(blob)) return true;
  if (
    /available funds|other debts|housing now|hire date|other real estate|bankruptcy|just you|more than one borrower/i.test(
      blob,
    )
  ) {
    return true;
  }
  return false;
}

function looksLikeStreetAddress(blob: string) {
  if (isIdExtractThreadText(blob)) return false;
  if (/The ID shows /i.test(blob)) return false;
  if (/That[\u2019']s \d/i.test(blob)) return true;
  if (/The contract shows .+\d/i.test(blob)) return true;
  if (/This address is \d{5}/i.test(blob)) return true;
  if (/,\s*CA\s+\d{5}\b/.test(blob)) return true;
  if (/\b\d{1,6}\s+\S.+(CA|California)\b/i.test(blob)) return true;
  return false;
}

function isAddressConfirmMessage(message: FoxMessage, draft: FoxIntakeDraft) {
  if (message.role !== "fox") return false;
  if (message.id.startsWith("live-quote:")) return false;
  const blob = foxBlob(message);
  if (/What’s the down payment or loan amount|Purchase is \$/.test(blob)) return false;
  if (isFundsPairConfirmText(blob)) return false;
  if (looksLikeOtherProposalConfirm(blob)) return false;
  const written = fileAddressLine(draft);
  if (written && blob.includes(written)) return true;
  if (looksLikeStreetAddress(blob)) return true;
  return false;
}

export function isLiveRateSpeech(text?: string) {
  if (!text) return false;
  return (
    /This loan right now:/i.test(text) ||
    /%\s*·\s*.*Live as of/i.test(text) ||
    /Live as of .+\s*·\s*not a lock/i.test(text)
  );
}

/** Change: leftover `{address}. Use this?` leaves the thread while File is still empty. */
export function dropAbandonedAddressConfirm(
  messages: FoxMessage[],
  draft: FoxIntakeDraft,
): FoxMessage[] {
  if (shouldShowAddressUseThis(draft) || fileAddressLine(draft)) return messages;
  return messages.filter((message) => {
    if (message.role !== "fox") return true;
    if (isOnFileAddressLine(message)) return true;
    if (!isAddressConfirmMessage(message, draft)) return true;
    return !/\. Use this\?$/.test((message.text ?? "").trim());
  });
}

function isPurchaseContractConfirmText(blob: string) {
  return /The contract shows /i.test(blob);
}

/** Contract Use this keeps the extract line. Do not rewrite it to “On the file.” */
function holdPurchaseContractConfirm(message: FoxMessage): FoxMessage {
  return {
    ...message,
    actions: undefined,
  };
}

/** Chat signal line only. Do not change this wording. */
export function isTranscriptSignalAskText(text?: string | null) {
  return /^Tax return transcript · (?:19|20)\d{2}$/i.test(String(text ?? "").trim());
}

/** One drop = one two-line transcript block. Prior copies are history, not live chips. */
export function withoutDuplicateTranscriptAsk(messages: FoxMessage[]): FoxMessage[] {
  let keep = -1;
  for (let i = 0; i < messages.length; i += 1) {
    if (messages[i]?.role === "fox" && isTranscriptSignalAskText(messages[i]?.text)) {
      keep = i;
    }
  }
  if (keep < 0) return messages;
  return messages.filter((message, index) => {
    if (message.role !== "fox" || !isTranscriptSignalAskText(message.text)) return true;
    return index === keep;
  });
}

/** Replace stacked transcript asks with one live block. Stale Skip chips die. */
export function applyTranscriptSignalAsk(
  messages: FoxMessage[],
  ask: FoxMessage,
  draft?: FoxIntakeDraft,
): FoxMessage[] {
  const key = draft ? transcriptSpeakKey(draft) : "";
  if (
    draft &&
    key &&
    !canSpeakDocStamp(draft, key, "named") &&
    !canSpeakDocStamp(draft, key, "offered")
  ) {
    return freezeUsedFoxTurns(withoutDuplicateTranscriptAsk(messages));
  }
  const prior = [...messages]
    .reverse()
    .find((message) => message.role === "fox" && isTranscriptSignalAskText(message.text));
  const others = messages.filter(
    (message) => !(message.role === "fox" && isTranscriptSignalAskText(message.text)),
  );
  return freezeUsedFoxTurns([...others, { ...ask, id: prior?.id ?? ask.id }]);
}

/** One “The contract shows …” bubble. Prompt-sync must not append a second copy. */
export function withoutDuplicateContractConfirm(messages: FoxMessage[]): FoxMessage[] {
  let seen = false;
  return messages.filter((message) => {
    if (message.role !== "fox" || !isPurchaseContractConfirmText(foxBlob(message))) return true;
    if (seen) return false;
    seen = true;
    return true;
  });
}

/** After File write, a Places confirm becomes “On the file.” — text only. */
export function dropResolvedAddressConfirmChips(
  messages: FoxMessage[],
  draft: FoxIntakeDraft,
): FoxMessage[] {
  if (needsPurchaseSplitAsk(draft)) {
    return dropLeftoverConfirmChipsOnLooksRightDocAsk(
      withoutDuplicateContractConfirm(messages),
      draft,
    );
  }
  if (isIdExtractPath(draft)) {
    return dropLeftoverConfirmChipsOnLooksRightDocAsk(
      freezeUsedFoxTurns(dropOnFileAddressLines(messages)),
      draft,
    );
  }
  const line = fileAddressLine(draft);
  const pendingContract = isPurchaseContractConfirmPending(draft);
  const sealed = messages.map((message) => {
    if (isIdExtractThreadText(foxBlob(message))) return message;
    if (isPurchaseContractConfirmText(foxBlob(message))) {
      return line && !pendingContract ? holdPurchaseContractConfirm(message) : message;
    }
    if (isOnFileAddressLine(message)) {
      return sealOnFileAddressMessage(message, line || undefined);
    }
    if (line && isAddressConfirmMessage(message, draft)) {
      return sealOnFileAddressMessage(message, line);
    }
    return message;
  });
  const afterAddress = line ? dropUseThisEchoUnderOnFile(sealed) : sealed;
  return dropLeftoverConfirmChipsOnLooksRightDocAsk(
    withoutDuplicateContractConfirm(afterAddress),
    draft,
  );
}

/** On the file wins from the spoken line. Follow-up / coupon / income cannot keep chips. */
export function isOnFileAddressLine(message: FoxMessage, _draft?: FoxIntakeDraft) {
  return isOnFileAddressText(message) || onFileFollowOnly(message);
}

/** Leftover Use this / rate chips still live on the latest Fox line after Looks right. */
export function leftoverConfirmChipsLiveOnLatest(
  messages: FoxMessage[],
  draft: FoxIntakeDraft,
): number {
  const thread = dropResolvedAddressConfirmChips(messages, draft);
  const last = lastFoxIndex(thread);
  if (last < 0) return 0;
  return (paintedFoxActions(thread[last]!, draft, true) ?? []).filter(isLeftoverConfirmChip).length;
}

/** Painted Use this buttons on an On the file line. This is the leftover score, not a DOM count. */
export function leftoverUseThisPaintedOnOnFile(
  messages: FoxMessage[],
  draft: FoxIntakeDraft,
): number {
  const thread = dropResolvedAddressConfirmChips(messages, draft);
  let count = 0;
  for (const message of thread) {
    if (!isOnFileAddressLine(message)) continue;
    const painted = paintedFoxActions(message, draft, true) ?? [];
    count += painted.filter((action) => action.label === "Use this").length;
    if (/\bUse this\b/i.test(`${message.text}\n${message.followUp ?? ""}`)) count += 1;
    if (message.actions?.some((action) => action.label === "Use this")) count += 1;
  }
  return count;
}

/** Invite-only rows stay Upload this · Skip. ID confirm keeps Use this on the same row. */
function isYearsInBusinessAskText(text: string) {
  return /^How long have you had /i.test(text.trim());
}

export function paintThreadActions(actions: FoxAction[]): FoxAction[] {
  const unique = oneDocChipSet(actions);
  if (unique.some((action) => action.capture?.field === "skip-years-in-business")) {
    return yearsInBusinessSkipActions();
  }
  if (unique.some((action) => action.capture?.field === "skip-monthly-debts")) {
    return paintedMonthlyDebtsActions(unique);
  }
  if (
    unique.some((action) => action.label === "Upload this") &&
    unique.some((action) => action.label === "Skip" && action.capture?.field === "skip-docs")
  ) {
    return unique.filter(
      (action) =>
        action.label === "Upload this" ||
        (action.label === "Skip" && action.capture?.field === "skip-docs"),
    );
  }
  return unique;
}

/** The only live chips. History bubbles never paint these. Prefer deskStripActions. */
export function liveComposerStripActions(
  messages: FoxMessage[],
  draft: FoxIntakeDraft,
): FoxAction[] {
  const thread = withoutDuplicateTranscriptAsk(messages);
  const live = lastFoxIndex(thread);
  if (live < 0 || !isLiveFoxTurn(thread, live)) return [];
  const message = thread[live]!;
  if (isReceivedStatusLine(message.text)) return [];
  const raw = (paintedFoxActions(message, draft, true) ?? []).filter(
    (action) =>
      action.capture?.field !== "propose-place-address" &&
      !isStreetSuggestChipLabel(action.label),
  );
  return paintThreadActions(raw);
}

/** Action source for the live composer strip. History bubbles never paint these. */
export function paintedFoxActions(
  message: FoxMessage,
  draft: FoxIntakeDraft,
  current = true,
): FoxAction[] | undefined {
  if (isReceivedStatusLine(message.text)) return undefined;
  if (isLookupWaitMessage(message) || isLookupWaitLine(message.text)) return undefined;
  if (isOnFileAddressLine(message) || hideAddressUseThisOnBubble(message, draft)) return undefined;
  if (!current) return undefined;
  if (isYearsInBusinessAskText(message.text)) return yearsInBusinessSkipActions();
  if (isMonthlyDebtsAskText(message.text)) return paintedMonthlyDebtsActions(message.actions);
  if (isPropertyTypeAskText(message.text)) return propertyTypeAskActions();
  if (isLooksRightAskText(message.text)) {
    if (
      draft.pendingProposal ||
      draft.pendingConflict ||
      draft.pendingAddress ||
      messageHasOpenUseThisConfirm(message)
    ) {
      return undefined;
    }
    return looksRightAskActions();
  }
  const shown = visibleFoxActions(message, draft);
  if (!shown?.length) return undefined;
  const idNameConfirm = /The ID shows /i.test(foxBlob(message));
  const streetConfirm = shouldShowAddressUseThis(draft) || isSubjectAddressConfirmPending(draft);
  const docAsk =
    !streetConfirm && (looksRightDocAskOpen(draft) || shown.some(isAfterLooksRightDocChip));
  const next = shown.filter((action) => {
    if (action.capture?.field === "propose-place-address" || isStreetSuggestChipLabel(action.label)) {
      return false;
    }
    if (idNameConfirm) {
      return isBorrowerNameConfirmPending(draft) && isIdConfirmChip(action);
    }
    if (
      isIdExtractAskText(message.text) &&
      (action.label === "Use this" || action.label === "Change")
    ) {
      return false;
    }
    if (
      (action.label === "Use this" || action.label === "Change") &&
      !isUseThisConfirmText(message.text) &&
      !isUseThisConfirmText(message.followUp)
    ) {
      return false;
    }
    if (
      current &&
      isFundsPairProposal(draft.pendingProposal) &&
      (action.capture?.field === "accept-proposal" || action.capture?.field === "change-proposal")
    ) {
      return true;
    }
    if (current && isPricingFailSpeech(message) && isPricingFailChip(action)) return true;
    if (
      (draft.pendingProposal ||
        draft.pendingConflict ||
        draft.pendingAddress ||
        messageHasOpenUseThisConfirm(message)) &&
      isLooksRightChip(action)
    ) {
      return false;
    }
    if (docAsk && isLeftoverConfirmChip(action)) return false;
    if (docAsk) return current && isAfterLooksRightDocChip(action);
    if (action.label === "Use this" || action.label === "Change") {
      if (isOnFileAddressLine(message) || hideAddressUseThisOnBubble(message, draft)) return false;
      if (isAddressConfirmMessage(message, draft)) return shouldShowAddressUseThis(draft);
    }
    if (isAddressConfirmMessage(message, draft) && isAddressUseAction(action)) {
      return shouldShowAddressUseThis(draft);
    }
    return isKeptUseThis(action) ? true : current;
  });
  return next.length ? next : undefined;
}

function hideAddressUseThisOnBubble(message: FoxMessage, draft: FoxIntakeDraft) {
  if (isOnFileAddressLine(message)) return true;
  return Boolean(fileAddressLine(draft) && isAddressConfirmMessage(message, draft) && !shouldShowAddressUseThis(draft));
}

export function visibleFoxActions(message: FoxMessage, draft: FoxIntakeDraft) {
  if (isReceivedStatusLine(message.text)) return undefined;
  if (isLookupWaitMessage(message) || isLookupWaitLine(message.text)) return undefined;
  if (isOnFileAddressLine(message) || hideAddressUseThisOnBubble(message, draft)) return undefined;
  const actions = message.actions;
  if (!actions?.length) return undefined;
  const next = actions.filter((action) => {
    if (action.capture?.field === "propose-place-address" || isStreetSuggestChipLabel(action.label)) {
      return false;
    }
    if (isOnFileAddressLine(message)) return false;
    if (
      (draft.pendingProposal ||
        draft.pendingConflict ||
        draft.pendingAddress ||
        messageHasOpenUseThisConfirm(message)) &&
      isLooksRightChip(action)
    ) {
      return false;
    }
    if (
      looksRightDocAskOpen(draft) &&
      (isLeftoverConfirmChip(action) || isLooksRightChip(action)) &&
      !isLooksRightAskText(message.text) &&
      !(/The ID shows /i.test(foxBlob(message)) && isBorrowerNameConfirmPending(draft)) &&
      !(
        isFundsPairProposal(draft.pendingProposal) &&
        (action.capture?.field === "accept-proposal" || action.capture?.field === "change-proposal")
      ) &&
      !(isPricingFailSpeech(message) && isPricingFailChip(action))
    ) {
      return false;
    }
    if (isOverPriceChip(action) && !loanExceedsPurchasePrice(draft)) {
      return false;
    }
    if (
      isPurchaseLike(draft) &&
      (action.label === "Not sure" || action.label === "Skip for now") &&
      (action.capture?.field === "skip-amount" || action.capture?.field === "skip-value")
    ) {
      return false;
    }
    if (
      (action.capture?.field === "creditRange" || action.capture?.field === "skip-credit") &&
      (isFundsPairProposal(draft.pendingProposal) ||
        draft.correcting === "value" ||
        draft.correcting === "amount")
    ) {
      return false;
    }
    if (hideAddressUseThisOnBubble(message, draft) && (action.label === "Use this" || action.label === "Change")) {
      return false;
    }
    if (isAddressConfirmMessage(message, draft) && (action.label === "Use this" || action.label === "Change")) {
      return shouldShowAddressUseThis(draft);
    }
    if (isKeptUseThis(action)) return true;
    if (isAddressUseAction(action) && isAddressConfirmMessage(message, draft)) {
      return shouldShowAddressUseThis(draft);
    }
    return true;
  });
  return next.length ? next : undefined;
}

export function liveCouponConfirmCopy(draft: FoxIntakeDraft): {
  text: string;
  followUp?: string;
  actions?: FoxAction[];
} {
  const pending = draft.pendingLiveCoupon;
  if (!pending) {
    return { text: COUPON_UNRESOLVED, actions: liveCouponActions(draft) };
  }
  const quote = {
    rate: pending.rate,
    asOf: pending.asOf,
    principalAndInterest: pending.principalAndInterest,
    pts: pending.pts,
  };
  return {
    text: liveLoanNowCopy(quote),
    actions: liveCouponConfirmActions(draft),
  };
}

export function withLiveCouponChips(messages: FoxMessage[], draft: FoxIntakeDraft): FoxMessage[] {
  const held = dropResolvedAddressConfirmChips(messages, draft);
  if (looksRightDocAskOpen(draft)) return held;
  if (!draft.liveQuote) return held;
  if (draft.liveCouponSettled && !draft.pendingLiveCoupon) return held;
  const chips = liveCouponActions(draft);
  let lastQuote = -1;
  for (let i = 0; i < held.length; i += 1) {
    if (held[i].id.startsWith("live-quote:")) lastQuote = i;
  }
  if (lastQuote < 0) return held;
  if (lastQuote !== lastFoxIndex(held)) return held;
  return held.map((item, index) => {
    if (index !== lastQuote) return item;
    if (isOnFileAddressLine(item)) return { ...item, actions: undefined };
    return { ...item, actions: chips };
  });
}

export function normalizeLiveQuoteRows(value: unknown): SafeCouponRow[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows: SafeCouponRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const rate = Number(raw.rate);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 25) continue;
    const pts = Number(raw.pts);
    const pi = Number(raw.principalAndInterest);
    const price = Number(raw.price);
    rows.push({
      rate,
      ...(Number.isFinite(pts) ? { pts } : {}),
      ...(Number.isFinite(pi) && pi > 0 ? { principalAndInterest: pi } : {}),
      ...(Number.isFinite(price) ? { price } : {}),
    });
  }
  return rows.length ? rows : undefined;
}

export function normalizePendingLiveCoupon(value: unknown): PendingLiveCoupon | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  if (raw.choice !== "lower" && raw.choice !== "nocost") return undefined;
  const rate = Number(raw.rate);
  const asOf = typeof raw.asOf === "string" ? raw.asOf : "";
  if (!Number.isFinite(rate) || rate <= 0 || !asOf) return undefined;
  const pts = Number(raw.pts);
  const pi = Number(raw.principalAndInterest);
  return {
    choice: raw.choice,
    rate,
    asOf,
    ...(Number.isFinite(pi) && pi > 0 ? { principalAndInterest: pi } : {}),
    ...(Number.isFinite(pts) ? { pts } : {}),
  };
}

export function couponCapture(choice: CouponChoice): Capture {
  return { field: "couponChoice", value: choice };
}

/** Points on a stored row. Credits stay negative. */
export function couponPtsShown(row: SafeCouponRow) {
  return pointsFromRow(row);
}
