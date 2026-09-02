import { propertyAddressSkipActions } from "./propertyType";
import type { FoxAction, FoxMessage } from "./types";

export const PLACES_WAIT_LINE = "Looking that up";
export const RATEFLOW_WAIT_LINE = "Getting a live line";

export type LookupWait = "places" | "rateflow";

export function isLookupWaitLine(text?: string) {
  return text === PLACES_WAIT_LINE || text === RATEFLOW_WAIT_LINE;
}

export function isLookupWaitMessage(message: FoxMessage) {
  return message.role === "fox" && (message.id.startsWith("wait:") || isLookupWaitLine(message.text));
}

export function withoutWaitLines(messages: FoxMessage[]): FoxMessage[] {
  return messages.filter((item) => !isLookupWaitMessage(item));
}

export function placesWaitActions(): FoxAction[] {
  return propertyAddressSkipActions();
}

export function rateflowWaitActions(): FoxAction[] {
  return [
    {
      id: "live-coupon-skip",
      label: "Skip",
      event: "bubble",
      capture: { field: "couponChoice", value: "skip" },
    },
  ];
}

export function waitLineFor(kind: LookupWait) {
  return kind === "places" ? PLACES_WAIT_LINE : RATEFLOW_WAIT_LINE;
}

export function waitActionsFor(kind: LookupWait): FoxAction[] {
  return kind === "places" ? placesWaitActions() : rateflowWaitActions();
}

const LIVE_LINE_INCOME_ASK = "How is income earned?";

/** One status line in the thread. Replaces any prior wait. Never glued onto a result bubble. */
export function withWaitLine(messages: FoxMessage[], kind: LookupWait): FoxMessage[] {
  const held = withoutWaitLines(messages).filter(
    (item) => kind !== "rateflow" || item.role !== "fox" || item.text !== LIVE_LINE_INCOME_ASK,
  );
  return [
    ...held,
    {
      id: `wait:${kind}`,
      role: "fox",
      text: waitLineFor(kind),
      actions: waitActionsFor(kind),
    },
  ];
}
