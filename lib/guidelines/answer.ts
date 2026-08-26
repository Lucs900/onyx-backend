/**
 * Fox answer path for new questions. Not a script catalog.
 * interpret question → hard rails → File → knowledge store → plain-language answer.
 * Restore the next workspace step at the call site.
 */

import {
  loanExceedsPrice,
  lookup,
  namedCondoIneligible,
  namedNewOrConvertedCondo,
  readinessFromFile,
  type FileFacts,
  type GuidelineAction,
} from "./conventional";
import { parseStatedMonthlyLease, unsupportedRentalNamed } from "@/lib/income/rental";

export type AnswerIntent = {
  topicId: string;
  filePatch?: Partial<FileFacts>;
};

export type StoreAnswer = {
  text: string;
  action: GuidelineAction;
  collect: string[];
  topicId: string;
};

export function asksWillIQualify(text: string) {
  const lower = text.toLowerCase();
  if (/\b(qualifying income|suggested qualifying)\b/i.test(lower)) return false;
  if (/(approv|lock|commit to lend)/i.test(lower)) return true;
  if (/\b(readiness|look ready|ready yet)\b/i.test(lower)) return true;
  if (/\b(will i|do i|can i|am i)\s+(qualif|approved|ready)\b/i.test(lower)) return true;
  return /\b(will i|do i|can i|am i).{0,24}qualif/i.test(lower);
}

export function asksCost(text: string) {
  return /\b(closing costs?|closing fees?|origination fee|lender fees?|fee quote|how much (will|does|do) (this|it|closing)|what (does|will) (this|it) cost|cost to close)\b/i.test(
    text,
  );
}

export function asksAcrBenefits(text: string) {
  const t = text.trim();
  if (
    /\b(acr benefits?|benefits? of acr|what('s| is) the reward|the reward|membership reward|membership)\b/i.test(t) ||
    (/\breward\b/i.test(t) && !/\b(prepared|sample|indicative)\b/i.test(t))
  ) {
    return true;
  }
  if (/\bwhat do i get\b/i.test(t)) return true;
  if (/\bif i start (a |the )?(relationship|desk|acr)\b/i.test(t)) return true;
  if (
    /\bstart (a |the |your )?relationship\b/i.test(t) &&
    (/\?$/.test(t.trim()) ||
      /^(why|what|how|when|who|where|can i|can you|could i|could you|do i|will i|am i|should i|is this|is there|are there)\b/i.test(
        t.trim(),
      ) ||
      /\b(get|benefit|worth|why)\b/i.test(t))
  ) {
    return true;
  }
  if (
    /\brelationship\b/i.test(t) &&
    /\b(what do i get|benefits?|reward|worth it|why (start|join)|what('s| is) in it)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

export function asksTimeline(text: string) {
  return /\b(close date|closing date|when do (i|we) close|how long (does|will) this take|what('s| is) the timeline)\b/i.test(
    text,
  );
}

export function asksPhone(text: string) {
  return /\b(on my phone|on the phone|from my phone|mobile|iphone|android)\b/i.test(text);
}

export function namesUnsupportedRental(text: string) {
  return unsupportedRentalNamed(text);
}

export function namesStatedMonthlyLease(text: string, occupancy?: string | null) {
  return parseStatedMonthlyLease(text, { occupancy }) != null;
}

export function namesNonWarrantableCondo(text: string) {
  return namedCondoIneligible(text);
}

export function namesNeedsReviewCondo(text: string) {
  return namedNewOrConvertedCondo(text);
}

/** Map a question to a store topic. New questions get a topic, not a workspace paragraph. */
export function interpretQuestion(text: string, _file?: FileFacts): AnswerIntent | null {
  if (asksWillIQualify(text)) {
    return { topicId: "language.will_i_qualify", filePatch: { askedWillIQualify: true } };
  }
  if (namesUnsupportedRental(text)) {
    return {
      topicId: "income.rental_thin",
      filePatch: { unsupportedRental: true, rentalNamed: true },
    };
  }
  if (namesStatedMonthlyLease(text, _file?.occupancy)) {
    return {
      topicId: "income.rental_lease",
      filePatch: { rentalNamed: true },
    };
  }
  if (namesNonWarrantableCondo(text)) {
    return {
      topicId: "condo.non_warrantable",
      filePatch: { condoIneligibleNamed: true, propertyType: "condo" },
    };
  }
  if (namesNeedsReviewCondo(text)) {
    return {
      topicId: "condo.needs_review",
      filePatch: { condoNewOrConverted: true, propertyType: "condo" },
    };
  }
  if (asksCost(text)) return { topicId: "language.cost" };
  if (asksAcrBenefits(text)) return { topicId: "language.acr_benefits" };
  if (asksTimeline(text)) return { topicId: "language.timeline" };
  if (asksPhone(text)) return { topicId: "language.phone" };
  return null;
}

/** File facts pick the topic when no question matched. Loan>price is one File-driven path. */
export function topicFromFile(file: FileFacts): string | null {
  if (loanExceedsPrice(file) && !file.commitmentRequired) return "flags.loan_over_price";
  return null;
}

function containsPhrase(haystack: string, phrase: string) {
  return haystack.toLowerCase().includes(phrase.toLowerCase());
}

/** Hard rails: no approve/lock/guaranteed, no invented fees/rates/matrix/county, no LO-will-contact.
 * will-I-qualify uses the three readiness shapes only. Never say you qualify / you are approved. */
export function applyHardRails(line: string, file: FileFacts, _neverSay: string[] = []): string {
  let out = line;
  if (loanExceedsPrice(file) && !file.commitmentRequired) {
    if (containsPhrase(out, "licensed originator is on this exception")) {
      out = lookup("flags.loan_over_price", { ...file, commitmentRequired: false }).borrowerLine;
    }
    if (containsPhrase(out, "a number under the purchase price works")) {
      out = lookup("flags.loan_over_price", { ...file, commitmentRequired: false }).borrowerLine;
    }
  }
  if (/\byou are approved\b/i.test(out) || /\bthis is locked\b/i.test(out) || /\bguaranteed\b/i.test(out)) {
    return readinessFromFile({ ...file, askedWillIQualify: true }).line;
  }
  const invented =
    /\bcounty limits?\b/i.test(out) ||
    /\bmatrix cells?\b/i.test(out) ||
    /\bLO will contact you\b/i.test(out) ||
    /\bwe’ll be in touch\b/i.test(out);
  if (invented) {
    return readinessFromFile({ ...file, askedWillIQualify: true }).line;
  }
  return out;
}

export function answerFromFile(topicId: string, file: FileFacts): StoreAnswer {
  const result = lookup(topicId, file);
  const text = applyHardRails(result.borrowerLine, file, result.topic.neverSay);
  return {
    text,
    action: result.action,
    collect: result.topic.collect,
    topicId,
  };
}

/** Question path: interpret → rails → File → store → plain-language answer. */
export function foxAnswer(text: string, file: FileFacts): StoreAnswer | null {
  const intent = interpretQuestion(text, file);
  if (!intent) return null;
  return answerFromFile(intent.topicId, { ...file, ...intent.filePatch });
}
