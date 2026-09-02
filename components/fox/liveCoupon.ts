import { liveQuoteMatchesDraft, searchedKeyFor } from "@/lib/rateflow/fromDraft";
import {
  liveQuoteFromCouponRow,
  liveLoanNowCopy,
  pickLowerPaymentFromRows,
  pickNoCostFromRows,
  pointsFromRow,
  sameCouponNumbers,
  type SafeCouponRow,
} from "@/lib/rateflow/quote";
import { nextDocInvite } from "./fileWrite";
import { isFundsPairProposal, loanExceedsPurchasePrice } from "./completeness";
import { addressOnFileCopy, fileAddressLine, shouldShowAddressUseThis } from "./propertyType";
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
  if (draft.liveQuote && draft.liveQuoteStatus === "ready") return true;
  if (draft.liveQuoteStatus === "unavailable") return false;
  return Boolean(searchedKeyFor(draft));
}

function hideNoCostChip(draft?: FoxIntakeDraft) {
  if (!draft?.liveQuote) return false;
  const pts = draft.liveQuote.pts;
  if (typeof pts === "number" && Number.isFinite(pts) && pts <= 0) return true;
  return sameCouponNumbers(draft.liveQuote, pickNoCostFromRows(draft.liveQuoteRows ?? []));
}

export function liveCouponActions(draft?: FoxIntakeDraft): FoxAction[] {
  const hideNoCost = hideNoCostChip(draft);
  const chips: FoxAction[] = [
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
  if (!hideNoCost) {
    chips.push({
      id: "live-coupon-nocost",
      label: "No cost",
      event: "bubble",
      capture: { field: "couponChoice", value: "nocost" },
    });
  }
  chips.push({
    id: "live-coupon-skip",
    label: "Skip",
    event: "bubble",
    capture: { field: "couponChoice", value: "skip" },
  });
  return chips;
}

export function liveCouponConfirmActions(): FoxAction[] {
  return [
    {
      id: "accept-live-coupon",
      label: "Use this",
      event: "bubble",
      capture: { field: "accept-live-coupon" },
    },
    {
      id: "keep-live-coupon",
      label: "Keep this one",
      event: "bubble",
      capture: { field: "keep-live-coupon" },
    },
    {
      id: "skip-live-coupon",
      label: "Skip",
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
  return /^(keep this one|keep this)$/.test(text.trim().toLowerCase());
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
  return /^(Use this|Change|This one|Lower payment|No cost)$/i.test(action.label);
}

function isAfterLooksRightDocChip(action: FoxAction) {
  const field = action.capture?.field;
  return (
    (action.label === "Upload this" && (field === "open-docs" || action.event === "open-docs")) ||
    (action.label === "Skip" && field === "skip-docs")
  );
}

function lastFoxIndex(messages: FoxMessage[]) {
  let last = -1;
  for (let i = 0; i < messages.length; i += 1) {
    if (messages[i].role === "fox") last = i;
  }
  return last;
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

function leftoverChipCount(actions: FoxAction[] | undefined, kind: "use-this" | "looks-right" | "this-one") {
  if (!actions?.length) return 0;
  return actions.filter((action) => {
    if (kind === "looks-right") return isLooksRightChip(action);
    if (kind === "this-one") return action.label === "This one";
    return action.label === "Use this";
  }).length;
}

function leftoverOnOlderTurns(
  messages: FoxMessage[],
  draft: FoxIntakeDraft,
  kind: "use-this" | "looks-right" | "this-one",
) {
  const thread = dropResolvedAddressConfirmChips(messages, draft);
  const last = lastFoxIndex(thread);
  let count = 0;
  for (let i = 0; i < thread.length; i += 1) {
    const message = thread[i];
    if (message.role !== "fox" || i === last) continue;
    count += leftoverChipCount(paintedFoxActions(message, draft, false), kind);
    count += leftoverChipCount(message.actions, kind);
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

/** After a chip is used, that Fox turn is text. Quick replies live only on the latest Fox line. */
export function freezeUsedFoxTurns(messages: FoxMessage[]): FoxMessage[] {
  const current = lastFoxIndex(messages);
  return messages.map((message, index) => {
    if (message.role !== "fox" || index === current || !message.actions?.length) return message;
    return { ...message, text: message.text, followUp: message.followUp, facts: message.facts, actions: undefined };
  });
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
    const next = message.actions.filter(isAfterLooksRightDocChip);
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

function looksLikeOtherProposalConfirm(blob: string) {
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

/** After File write, that confirm becomes “On the file.” — text only. */
export function dropResolvedAddressConfirmChips(
  messages: FoxMessage[],
  draft: FoxIntakeDraft,
): FoxMessage[] {
  const line = fileAddressLine(draft);
  const sealed = messages.map((message) => {
    if (isOnFileAddressLine(message)) {
      return sealOnFileAddressMessage(message, line || undefined);
    }
    if (line && isAddressConfirmMessage(message, draft)) {
      return sealOnFileAddressMessage(message, line);
    }
    return message;
  });
  const afterAddress = line ? dropUseThisEchoUnderOnFile(sealed) : sealed;
  return dropLeftoverConfirmChipsOnLooksRightDocAsk(afterAddress, draft);
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

/** Visible chips on a bubble — leftover score is the painted button, not a DOM count. */
export function paintedFoxActions(
  message: FoxMessage,
  draft: FoxIntakeDraft,
  current = true,
): FoxAction[] | undefined {
  if (isOnFileAddressLine(message) || hideAddressUseThisOnBubble(message, draft)) return undefined;
  if (!current) return undefined;
  const shown = visibleFoxActions(message, draft);
  if (!shown?.length) return undefined;
  const idNameConfirm = /The ID shows /i.test(foxBlob(message));
  const docAsk = looksRightDocAskOpen(draft) || shown.some(isAfterLooksRightDocChip);
  const next = shown.filter((action) => {
    if (action.capture?.field === "propose-place-address" || isStreetSuggestChipLabel(action.label)) {
      return false;
    }
    if (idNameConfirm) {
      return (
        isAfterLooksRightDocChip(action) ||
        action.label === "Use this" ||
        action.label === "Change" ||
        isKeptUseThis(action)
      );
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
  if (isOnFileAddressLine(message) || hideAddressUseThisOnBubble(message, draft)) return undefined;
  const actions = message.actions;
  if (!actions?.length) return undefined;
  const next = actions.filter((action) => {
    if (action.capture?.field === "propose-place-address" || isStreetSuggestChipLabel(action.label)) {
      return false;
    }
    if (isOnFileAddressLine(message)) return false;
    if (looksRightDocAskOpen(draft) && (isLeftoverConfirmChip(action) || isLooksRightChip(action))) {
      return false;
    }
    if (isOverPriceChip(action) && !loanExceedsPurchasePrice(draft)) {
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
    actions: liveCouponConfirmActions(),
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
