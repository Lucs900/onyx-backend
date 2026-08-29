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

export function liveCouponActions(draft?: FoxIntakeDraft): FoxAction[] {
  const hideNoCost =
    draft != null &&
    sameCouponNumbers(draft.liveQuote ?? null, pickNoCostFromRows(draft.liveQuoteRows ?? []));
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
    ...(hideNoCost
      ? []
      : [
          {
            id: "live-coupon-nocost" as const,
            label: "No cost",
            event: "bubble" as const,
            capture: { field: "couponChoice" as const, value: "nocost" },
          },
        ]),
    {
      id: "live-coupon-skip",
      label: "Skip",
      event: "bubble",
      capture: { field: "couponChoice", value: "skip" },
    },
  ];
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
  if (!draft.liveQuote) return messages;
  if (draft.liveCouponSettled && !draft.pendingLiveCoupon) return messages;
  const chips = liveCouponActions(draft);
  let lastQuote = -1;
  for (let i = 0; i < messages.length; i += 1) {
    if (messages[i].id.startsWith("live-quote:")) lastQuote = i;
  }
  if (lastQuote < 0) return messages;
  const current = messages[lastQuote];
  const has = (current.actions ?? []).some((item) => item.capture?.field === "couponChoice");
  if (has) return messages;
  return messages.map((item, index) => (index === lastQuote ? { ...item, actions: chips } : item));
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
