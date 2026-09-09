/**
 * Hunt: every drop also scans empty File slots this page is allowed to fill.
 * Suggest only. Confirm-before-write. Hunt speak, not UW speak.
 * Label Suggested · not underwritten.
 */
import type { ExtractClass, FactProposal, FoxAction, FoxIntakeDraft } from "./types";
import { SUGGESTED_PROPERTY_NOTE } from "./propertyType";
import { appendOtherReoRow } from "./otherReo";

export const HUNT_RENTALS_FIELD = "hunt_rentals";
export const HUNT_NOTE = "Suggested · not underwritten";

function normalizeStreet(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function streetsMatch(a: string, b: string) {
  const left = normalizeStreet(a);
  const right = normalizeStreet(b);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

/** Printed streets only. Unreadable invents nothing. */
export function parseHuntAddresses(raw?: string | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw ?? "").split(/\s*;\s*|\s*\n\s*|\s*\|\s*/)) {
    const line = part.replace(/\s+/g, " ").trim();
    if (line.length < 8) continue;
    if (!/[a-z]/i.test(line) || !/\d/.test(line)) continue;
    const key = normalizeStreet(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function speakAddressList(addresses: string[]) {
  if (addresses.length === 1) return addresses[0];
  if (addresses.length === 2) return `${addresses[0]} and ${addresses[1]}`;
  return `${addresses.slice(0, -1).join(", ")}, and ${addresses[addresses.length - 1]}`;
}

function countWord(n: number) {
  const words = ["", "one", "two", "three", "four", "five", "six", "seven", "eight"];
  return words[n] ?? String(n);
}

/** Sch E addresses. Ownership only — no value, liens, occupancy, or REO speak. */
export function huntRentalAskCopy(addresses: string[]): string {
  if (!addresses.length) return "";
  if (addresses.length === 1) {
    return `I see a rental on this return — ${addresses[0]}. Still yours?`;
  }
  return `I see ${countWord(addresses.length)} rentals on this return — ${speakAddressList(addresses)}. Still yours?`;
}

export function huntRentalActions(count: number): FoxAction[] {
  const allLabel = count === 1 ? "This one" : count === 2 ? "Both" : count === 3 ? "All three" : "These";
  const notLabel = count === 1 ? "Not this" : "Not these";
  return [
    { id: "hunt-rentals-all", label: allLabel, event: "bubble", capture: { field: "accept-proposal" } },
    { id: "hunt-rentals-not", label: notLabel, event: "bubble", capture: { field: "decline-proposal" } },
    { id: "hunt-rentals-skip", label: "Skip", event: "bubble", capture: { field: "decline-proposal" } },
  ];
}

export function isHuntRentalsProposal(proposal?: FactProposal | null): boolean {
  return proposal?.field === HUNT_RENTALS_FIELD;
}

export function isHuntResidenceProposal(proposal?: FactProposal | null): boolean {
  return proposal?.field === "present_address" && /Suggested · not underwritten/i.test(proposal.note ?? "");
}

function existingResidence(draft: FoxIntakeDraft) {
  return String(draft.facts?.present_address?.value ?? "").trim();
}

function existingRentalAddresses(draft: FoxIntakeDraft) {
  return (draft.otherProperties ?? [])
    .map((row) => String(row.address ?? "").trim())
    .filter(Boolean);
}

function subjectStreet(draft: FoxIntakeDraft) {
  return String(draft.subjectAddress || draft.facts?.property_address?.value || "").trim();
}

function isTranscriptOrCover(fields: Record<string, string>) {
  const kind = String(fields.return_kind ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return kind === "transcript" || kind.includes("returntranscript") || kind === "cover";
}

function huntResidenceProposal(
  draft: FoxIntakeDraft,
  fields: Record<string, string>,
): FactProposal | null {
  if (isTranscriptOrCover(fields)) return null;
  const street = String(fields.present_address ?? "").trim();
  if (!street || !/\d/.test(street) || !/[a-z]/i.test(street)) return null;
  const have = existingResidence(draft);
  if (have && streetsMatch(have, street)) return null;
  if (have && !streetsMatch(have, street)) return null;
  return {
    field: "present_address",
    value: street,
    label: "residence",
    kind: "computed",
    note: HUNT_NOTE,
  };
}

function huntRentalProposal(
  draft: FoxIntakeDraft,
  fields: Record<string, string>,
): FactProposal | null {
  const kind = String(fields.return_kind ?? "")
    .trim()
    .toLowerCase();
  const presentE = String(fields.schedule_e_present ?? "").trim().toLowerCase() === "yes";
  if (kind !== "schedule_e" && !presentE && !String(fields.schedule_e_property_address ?? "").trim()) {
    return null;
  }
  if (isTranscriptOrCover(fields) && kind !== "schedule_e") return null;
  const addresses = parseHuntAddresses(fields.schedule_e_property_address);
  if (!addresses.length) return null;
  const have = existingRentalAddresses(draft);
  const novel = addresses.filter((line) => !have.some((row) => streetsMatch(row, line)));
  if (!novel.length) return null;
  const rent =
    novel.length === 1 ? String(fields.schedule_e_rents_received ?? "").replace(/[^\d.]/g, "") : "";
  return {
    field: HUNT_RENTALS_FIELD,
    value: novel.join("; "),
    label: "rentals",
    kind: "computed",
    note: HUNT_NOTE,
    extras: [
      ...novel.map((line) => ({ field: "rental_address", value: line, label: "rental" })),
      ...(rent && Number(rent) > 0
        ? [{ field: "rental_rent", value: rent, label: "rent" }]
        : []),
    ],
  };
}

/** Empty File slots this page may fill. Same value, no question. Conflict once lives on File. */
export function maybeProposeHunt(
  draft: FoxIntakeDraft,
  extractClass: ExtractClass,
  fields: Record<string, string>,
): FoxIntakeDraft {
  if (draft.pendingProposal || draft.pendingConflict) return draft;
  if (extractClass !== "tax_return" && extractClass !== "other") return draft;
  const rentals = huntRentalProposal(draft, fields);
  if (rentals) {
    return { ...draft, pendingProposal: rentals };
  }
  const residence = huntResidenceProposal(draft, fields);
  if (!residence) return draft;
  const subject = subjectStreet(draft);
  if (subject && streetsMatch(subject, residence.value)) {
    // 1040 street → residence only. Never the purchase subject.
  }
  return { ...draft, pendingProposal: residence };
}

export function huntResidenceAskCopy(street: string) {
  return `I see ${street} on this return. Still your residence? ${SUGGESTED_PROPERTY_NOTE}.`;
}

export function acceptHuntRentals(draft: FoxIntakeDraft): FoxIntakeDraft {
  const proposal = draft.pendingProposal;
  if (!proposal || !isHuntRentalsProposal(proposal)) return { ...draft, pendingProposal: null };
  const extras = proposal.extras ?? [];
  const addresses = extras
    .filter((item) => item.field === "rental_address")
    .map((item) => item.value.trim())
    .filter(Boolean);
  const rent = extras.find((item) => item.field === "rental_rent")?.value ?? "";
  let next: FoxIntakeDraft = {
    ...draft,
    pendingProposal: null,
    statedOtherReo: draft.statedOtherReo === "none" ? "yes" : draft.statedOtherReo || "yes",
    otherReoAsked: true,
  };
  for (const address of addresses) {
    next = appendOtherReoRow(next, {
      address,
      ...(addresses.length === 1 && rent ? { leaseGross: rent } : {}),
    });
  }
  return next;
}

export function skipHunt(draft: FoxIntakeDraft): FoxIntakeDraft {
  return { ...draft, pendingProposal: null };
}
