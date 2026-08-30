import { parsePlaceAddress, type PlaceAddress, type PlaceSuggestion } from "@/lib/places/address";
import { isLookupWaitLine, isLookupWaitMessage } from "./lookupWait";
import { propertyAddressSkipActions } from "./propertyType";
import type { FoxAction, FoxMessage } from "./types";

export function parseSafePlaceAddress(input: unknown): PlaceAddress | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const place = raw.ok === true && raw.place ? raw.place : input;
  return parsePlaceAddress(place);
}

export function parseSafeSuggestions(input: unknown): PlaceSuggestion[] {
  if (!input || typeof input !== "object") return [];
  const rows = (input as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(rows)) return [];
  const out: PlaceSuggestion[] = [];
  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const id = String((item as { id?: unknown }).id ?? "").trim();
    const line = String((item as { line?: unknown }).line ?? "").replace(/\s+/g, " ").trim();
    if (!id || !line) continue;
    out.push({ id, line });
  }
  return out;
}

export async function requestAddressSuggestions(q: string): Promise<PlaceSuggestion[]> {
  try {
    const response = await fetch("/api/address-suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q }),
      cache: "no-store",
    });
    if (!response.ok) return [];
    return parseSafeSuggestions(await response.json());
  } catch {
    return [];
  }
}

export async function requestPlaceAddress(id: string): Promise<PlaceAddress | null> {
  try {
    const response = await fetch("/api/address-place", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return parseSafePlaceAddress(await response.json());
  } catch {
    return null;
  }
}

export function streetSuggestActions(suggestions: PlaceSuggestion[]): FoxAction[] {
  return [
    ...suggestions.map((item) => ({
      id: `place-${item.id}`,
      label: item.line,
      event: "bubble" as const,
      capture: { field: "propose-place-address" as const, value: item.id },
    })),
    ...propertyAddressSkipActions(),
  ];
}

export function canPaintStreetSuggestChips(message: FoxMessage) {
  if (isLookupWaitMessage(message) || isLookupWaitLine(message.text)) return false;
  if (/\. Use this\?$/.test((message.text ?? "").trim())) return false;
  if ((message.actions ?? []).some((item) => item.capture?.field === "accept-proposal")) {
    return false;
  }
  if ((message.actions ?? []).some((item) => item.capture?.field === "couponChoice")) {
    return false;
  }
  return true;
}

function lastFoxIndex(messages: FoxMessage[]) {
  let lastFox = -1;
  for (let i = 0; i < messages.length; i += 1) {
    if (messages[i].role === "fox") lastFox = i;
  }
  return lastFox;
}

export function withStreetSuggestChips(
  messages: FoxMessage[],
  suggestions: PlaceSuggestion[],
): FoxMessage[] {
  if (!suggestions.length) return messages;
  const lastFox = lastFoxIndex(messages);
  if (lastFox < 0) return messages;
  const current = messages[lastFox];
  if (!canPaintStreetSuggestChips(current)) return messages;
  const chips = streetSuggestActions(suggestions);
  return messages.map((item, index) => (index === lastFox ? { ...item, actions: chips } : item));
}

/** Drop already-returned suggestion chips so a tap cannot re-paint them. Keep Skip. */
export function withoutStreetSuggestChips(messages: FoxMessage[]): FoxMessage[] {
  const lastFox = lastFoxIndex(messages);
  if (lastFox < 0) return messages;
  const current = messages[lastFox];
  const nextActions = (current.actions ?? []).filter(
    (item) => item.capture?.field !== "propose-place-address",
  );
  if (nextActions.length === (current.actions ?? []).length) return messages;
  return messages.map((item, index) =>
    index === lastFox
      ? { ...item, actions: nextActions.length ? nextActions : undefined }
      : item,
  );
}
