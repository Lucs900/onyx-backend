import { liveQuoteMatchesDraft } from "@/lib/rateflow/fromDraft";
import {
  liveQuoteFromCouponRow,
  liveRateLine,
  liveRateSecondLine,
  pickLowerPaymentFromRows,
  pickNoCostFromRows,
  pointsFromRow,
  sameCouponNumbers,
  type SafeCouponRow,
} from "@/lib/rateflow/quote";
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
  if (!draft.liveQuote || draft.liveQuoteStatus !== "ready") return false;
  if (draft.liveCouponSettled || draft.pendingLiveCoupon) return false;
  return true;
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

function isKeptUseThis(action: FoxAction) {
  return (
    action.capture?.field === "accept-live-coupon" ||
    action.capture?.field === "keep-live-coupon" ||
    action.capture?.field === "couponChoice"
  );
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
  if (/That[\u2019']s \d/i.test(blob)) return true;
  if (/The (contract|ID) shows .+\d/i.test(blob)) return true;
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
  return /%\s*·\s*.*Live as of/i.test(text) || /Live as of .+\s*·\s*not a lock/i.test(text);
}

/** After File write, that confirm becomes “{line}. On the file.” — no Use this. */
export function dropResolvedAddressConfirmChips(
  messages: FoxMessage[],
  draft: FoxIntakeDraft,
): FoxMessage[] {
  const line = fileAddressLine(draft);
  return messages.map((message) => {
    if (isOnFileAddressLine(message, draft)) {
      return stripUseThisFromOnFileLine(message);
    }
    if (!line || !isAddressConfirmMessage(message, draft)) return message;
    return stripUseThisFromOnFileLine({
      ...message,
      text: addressOnFileCopy(line),
      followUp: isLiveRateSpeech(message.followUp) ? undefined : message.followUp,
    });
  });
}

/** Address Use this only while pendingAddress is set and File address is empty. */
export function isOnFileAddressLine(message: FoxMessage, draft?: FoxIntakeDraft) {
  if (message.role !== "fox") return false;
  const blob = foxBlob(message).replace(/\s+/g, " ").trim();
  if (/suggested monthly income/i.test(blob)) return false;
  if (/\bon the file\b/i.test(blob)) return true;
  const written = draft ? fileAddressLine(draft) : "";
  if (written && blob.includes(written) && /on the file/i.test(blob)) return true;
  return false;
}

function stripUseThisFromOnFileLine(message: FoxMessage): FoxMessage {
  const text = (message.text ?? "").replace(/\s*Use this\??\s*$/i, "").trim();
  const followUp = (message.followUp ?? "").replace(/\s*Use this\??\s*$/i, "").trim();
  return {
    ...message,
    text,
    followUp: followUp || undefined,
    actions: undefined,
  };
}

/** Visible chips on a bubble — this is the leftover score, not a DOM count. */
export function paintedFoxActions(
  message: FoxMessage,
  draft: FoxIntakeDraft,
  current = true,
): FoxAction[] | undefined {
  if (hideAddressUseThisOnBubble(message, draft)) return undefined;
  const shown = visibleFoxActions(message, draft);
  if (!shown?.length) return undefined;
  const next = shown.filter((action) => {
    if (action.label === "Use this" || action.label === "Change") {
      if (hideAddressUseThisOnBubble(message, draft)) return false;
      if (isAddressConfirmMessage(message, draft)) return shouldShowAddressUseThis(draft);
    }
    if (isAddressConfirmMessage(message, draft) && isAddressUseAction(action)) {
      return shouldShowAddressUseThis(draft);
    }
    return isKeptUseThis(action) ? true : current;
  });
  return next.length ? next : undefined;
}

function isAddressOnFileBubble(message: FoxMessage, draft: FoxIntakeDraft) {
  if (isOnFileAddressLine(message, draft)) return true;
  const written = fileAddressLine(draft);
  if (!written) return false;
  const blob = foxBlob(message);
  return blob.includes(written) && /\bon the file\b/i.test(blob);
}

function hideAddressUseThisOnBubble(message: FoxMessage, draft: FoxIntakeDraft) {
  if (isOnFileAddressLine(message, draft) || isAddressOnFileBubble(message, draft)) return true;
  return Boolean(fileAddressLine(draft) && isAddressConfirmMessage(message, draft) && !shouldShowAddressUseThis(draft));
}

export function visibleFoxActions(message: FoxMessage, draft: FoxIntakeDraft) {
  if (hideAddressUseThisOnBubble(message, draft)) return undefined;
  const actions = message.actions;
  if (!actions?.length) return undefined;
  const next = actions.filter((action) => {
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
  const second = liveRateSecondLine(quote);
  return {
    text: liveRateLine(quote),
    followUp: second,
    actions: liveCouponConfirmActions(),
  };
}

export function withLiveCouponChips(messages: FoxMessage[], draft: FoxIntakeDraft): FoxMessage[] {
  const held = dropResolvedAddressConfirmChips(messages, draft);
  if (!draft.liveQuote) return held;
  if (draft.liveCouponSettled && !draft.pendingLiveCoupon) return held;
  const chips = liveCouponActions(draft);
  let lastQuote = -1;
  for (let i = 0; i < held.length; i += 1) {
    if (held[i].id.startsWith("live-quote:")) lastQuote = i;
  }
  if (lastQuote < 0) return held;
  return held.map((item, index) => (index === lastQuote ? { ...item, actions: chips } : item));
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
