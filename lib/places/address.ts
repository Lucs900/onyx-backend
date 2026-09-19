/**
 * California street places. Server and Fox share this.
 * Never log or return secrets.
 */

export const GOOGLE_PLACES_KEY_NAME = "GOOGLE_PLACES_API_KEY";
export const GOOGLE_AUTOCOMPLETE_URL =
  "https://maps.googleapis.com/maps/api/place/autocomplete/json";
export const GOOGLE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";
export const PLACES_TIMEOUT_MS = 8_000;
/** CA geographic center. Bias only. Still filter to CA. */
export const CA_BIAS = { lat: 36.7783, lng: -119.4179, radiusM: 450_000 };

export type PlaceSuggestion = {
  id: string;
  line: string;
};

export type PlaceAddress = {
  line: string;
  street: string;
  city: string;
  state: "CA";
  zip: string;
  county?: string;
};

export function placesKeyPresent() {
  const value = process.env[GOOGLE_PLACES_KEY_NAME];
  return typeof value === "string" && value.trim().length > 0;
}

export function placesKeyValue(): string | undefined {
  const value = process.env[GOOGLE_PLACES_KEY_NAME];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function isZipOnlyQuery(q: string) {
  return /^\d{5}(?:-\d{4})?$/.test(q.trim());
}

export function shouldSuggestStreets(q: string) {
  const raw = q.replace(/\s+/g, " ").trim();
  if (raw.length < 3) return false;
  if (isZipOnlyQuery(raw)) return false;
  if (/^(skip|skip for now|not yet|later|none|no)$/i.test(raw)) return false;
  return true;
}

export function isCaliforniaLine(line: string) {
  const raw = line.replace(/\s+/g, " ").trim();
  if (!raw) return false;
  if (/,\s*CA(?:\s+\d{5})?\b/.test(raw)) return true;
  const state = raw.match(/,\s*([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?\s*$/);
  return state?.[1] === "CA";
}

export function looksLikePlaceId(id: string) {
  return /^[A-Za-z0-9_-]{10,256}$/.test(id.trim());
}

function component(
  parts: { types?: string[]; long_name?: string; short_name?: string }[],
  type: string,
  which: "long_name" | "short_name" = "long_name",
): string {
  const row = parts.find((item) => (item.types ?? []).includes(type));
  return String(row?.[which] ?? "").replace(/\s+/g, " ").trim();
}

function countyName(raw: string) {
  const value = raw.replace(/\s+County$/i, "").trim();
  return value || undefined;
}

export function placeAddressFromGoogleDetails(payload: unknown): PlaceAddress | null {
  if (!payload || typeof payload !== "object") return null;
  const result = (payload as { result?: Record<string, unknown> }).result;
  if (!result || typeof result !== "object") return null;
  const parts = Array.isArray(result.address_components)
    ? (result.address_components as { types?: string[]; long_name?: string; short_name?: string }[])
    : [];
  const state = component(parts, "administrative_area_level_1", "short_name").toUpperCase();
  if (state !== "CA") return null;
  const streetNumber = component(parts, "street_number");
  const route = component(parts, "route", "short_name") || component(parts, "route");
  const street = [streetNumber, route].filter(Boolean).join(" ").trim();
  if (!street || !/^\d/.test(street)) return null;
  const city =
    component(parts, "locality") ||
    component(parts, "postal_town") ||
    component(parts, "sublocality_level_1") ||
    component(parts, "neighborhood");
  if (!city || city.length < 2 || city.length > 40 || /\d/.test(city)) return null;
  const zip = component(parts, "postal_code");
  if (!/^\d{5}$/.test(zip)) return null;
  const county = countyName(component(parts, "administrative_area_level_2"));
  const formatted = String(result.formatted_address ?? "").replace(/\s+/g, " ").trim();
  const line = isCaliforniaLine(formatted)
    ? formatted.replace(/,\s*USA$/i, "").trim()
    : `${street}, ${city}, CA ${zip}`;
  return {
    line,
    street,
    city,
    state: "CA",
    zip,
    ...(county ? { county } : {}),
  };
}

export function suggestionsFromGoogleAutocomplete(payload: unknown): PlaceSuggestion[] {
  if (!payload || typeof payload !== "object") return [];
  const rows = (payload as { predictions?: unknown }).predictions;
  if (!Array.isArray(rows)) return [];
  const out: PlaceSuggestion[] = [];
  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const raw = item as { place_id?: unknown; description?: unknown };
    const id = String(raw.place_id ?? "").trim();
    const line = String(raw.description ?? "").replace(/\s+/g, " ").trim().replace(/,\s*USA$/i, "");
    if (!looksLikePlaceId(id) || !isCaliforniaLine(line)) continue;
    out.push({ id, line });
    if (out.length >= 5) break;
  }
  return out;
}

export function parsePlaceAddress(input: unknown): PlaceAddress | null {
  const raw =
    typeof input === "string"
      ? (() => {
          try {
            return JSON.parse(input) as unknown;
          } catch {
            return null;
          }
        })()
      : input;
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const street = String(row.street ?? "").replace(/\s+/g, " ").trim();
  const city = String(row.city ?? "").replace(/\s+/g, " ").trim();
  const state = String(row.state ?? "").trim().toUpperCase();
  const zip = String(row.zip ?? "").trim();
  const line = String(row.line ?? "").replace(/\s+/g, " ").trim();
  const county = String(row.county ?? "").replace(/\s+/g, " ").trim();
  if (!street || !/^\d/.test(street)) return null;
  if (!city || city.length < 2 || /\d/.test(city)) return null;
  if (state !== "CA") return null;
  if (!/^\d{5}$/.test(zip)) return null;
  return {
    line: line || `${street}, ${city}, CA ${zip}`,
    street,
    city,
    state: "CA",
    zip,
    ...(county ? { county } : {}),
  };
}

export function encodePlaceAddress(place: PlaceAddress): string {
  return JSON.stringify(place);
}
