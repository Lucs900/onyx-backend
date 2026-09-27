import { NextResponse } from "next/server";
import {
  GOOGLE_DETAILS_URL,
  PLACES_TIMEOUT_MS,
  looksLikePlaceId,
  placeAddressFromGoogleDetails,
  placesKeyValue,
} from "@/lib/places/address";

export const runtime = "nodejs";
export const maxDuration = 10;
export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json({ ok: false }, { status: 200 });
}

export async function POST(request: Request) {
  const key = placesKeyValue();
  if (!key) return unavailable();
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return unavailable();
  }
  const id = typeof (raw as { id?: unknown })?.id === "string" ? (raw as { id: string }).id.trim() : "";
  if (!looksLikePlaceId(id)) return unavailable();

  const url = new URL(GOOGLE_DETAILS_URL);
  url.searchParams.set("place_id", id);
  url.searchParams.set("fields", "address_component,formatted_address");
  url.searchParams.set("key", key);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PLACES_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: ac.signal, cache: "no-store" });
    if (!response.ok) return unavailable();
    const payload: unknown = await response.json();
    const place = placeAddressFromGoogleDetails(payload);
    if (!place) return unavailable();
    return NextResponse.json({ ok: true, place });
  } catch {
    return unavailable();
  } finally {
    clearTimeout(timer);
  }
}
