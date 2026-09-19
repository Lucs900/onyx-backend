import { NextResponse } from "next/server";
import {
  CA_BIAS,
  GOOGLE_AUTOCOMPLETE_URL,
  PLACES_TIMEOUT_MS,
  placesKeyValue,
  shouldSuggestStreets,
  suggestionsFromGoogleAutocomplete,
} from "@/lib/places/address";

export const runtime = "nodejs";
export const maxDuration = 10;
export const dynamic = "force-dynamic";

function empty() {
  return NextResponse.json({ suggestions: [] }, { status: 200 });
}

export async function POST(request: Request) {
  const key = placesKeyValue();
  if (!key) return empty();
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return empty();
  }
  const q = typeof (raw as { q?: unknown })?.q === "string" ? (raw as { q: string }).q : "";
  if (!shouldSuggestStreets(q)) return empty();

  const url = new URL(GOOGLE_AUTOCOMPLETE_URL);
  url.searchParams.set("input", q.replace(/\s+/g, " ").trim());
  url.searchParams.set("types", "address");
  url.searchParams.set("components", "country:us");
  url.searchParams.set("location", `${CA_BIAS.lat},${CA_BIAS.lng}`);
  url.searchParams.set("radius", String(CA_BIAS.radiusM));
  url.searchParams.set("key", key);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PLACES_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: ac.signal, cache: "no-store" });
    if (!response.ok) return empty();
    const payload: unknown = await response.json();
    return NextResponse.json({ suggestions: suggestionsFromGoogleAutocomplete(payload) });
  } catch {
    return empty();
  } finally {
    clearTimeout(timer);
  }
}
