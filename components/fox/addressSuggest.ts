import { parsePlaceAddress, type PlaceAddress, type PlaceSuggestion } from "@/lib/places/address";
import type { FoxMessage } from "./types";

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

/** Places matches belong on the composer dropdown. Never paint them as thread chips. */
export function canPaintStreetSuggestChips(_message?: FoxMessage) {
  return false;
}

export function withStreetSuggestChips(messages: FoxMessage[], _suggestions?: PlaceSuggestion[]) {
  return dropStreetSuggestChips(messages);
}

/** Strip leftover street-suggest chips. Keep Skip on the address ask. */
export function dropStreetSuggestChips(messages: FoxMessage[]): FoxMessage[] {
  let changed = false;
  const next = messages.map((item) => {
    if (item.role !== "fox") return item;
    const actions = item.actions ?? [];
    const kept = actions.filter((action) => action.capture?.field !== "propose-place-address");
    if (kept.length === actions.length) return item;
    changed = true;
    return { ...item, actions: kept.length ? kept : undefined };
  });
  return changed ? next : messages;
}

export const withoutStreetSuggestChips = dropStreetSuggestChips;
