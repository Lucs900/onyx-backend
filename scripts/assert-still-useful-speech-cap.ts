/**
 * After Looks right / before Proceed, Fox names 1–3 leftovers.
 * File notepad Still useful is that same 1–3 — not the longer remainder board.
 * After Proceed the spoken list does not grow. Status in_queue.
 * Extra papers may sit as Docs / Structure without landing on Still useful.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { withLinkedAccount } from "../components/fox/account";
import {
  applyLooksRightMotion,
  applyProceedMotion,
  afterLooksRightAskCopy,
  MOTION_COPY,
} from "../components/fox/motion";
import { nextFoxAsk } from "../components/fox/workspace";
import {
  labelListCopy,
  skipCurrentInvite,
  stillUsefulSection,
  stillUsefulSpokenItems,
  STILL_USEFUL_SPEECH_CAP,
} from "../components/fox/fileWrite";
import type { FoxIntakeDraft } from "../components/fox/types";

function fact(field: string, value: string) {
  return { field, value, source: "document" as const, confirmed: true, confirmedAt: "2026-09-16T00:00:00.000Z" };
}

function pricedBuy(income: "w2" | "self-employed" | "both"): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: income },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 1_200_000,
    downPaymentAmount: 240_000,
    loanAmountValue: 960_000,
    valueAsked: true,
    amountAsked: true,
    propertyType: "house",
    propertyTypeAsked: true,
    subjectAddress: "14 Oak Street, San Francisco, CA 94123",
    subjectAddressAsked: true,
    propertyZip: "94123",
    propertyZipAsked: true,
    yearsInBusinessAsked: true,
    monthlyDebtsAsked: true,
    wageDocsAsked: true,
    wageBox5Asked: true,
    wageFrequencyAsked: true,
    wageStubAsked: true,
    sampleAccepted: true,
    phase: "confirmed",
    facts: {
      property_address: fact("property_address", "14 Oak Street, San Francisco, CA 94123"),
    },
  };
}

function skipUntilFinish(draft: FoxIntakeDraft, budget = 12): FoxIntakeDraft {
  let next = draft;
  for (let i = 0; i < budget; i += 1) {
    const ask = nextFoxAsk(next);
    if (/I can send this to review/i.test(ask.text) && (ask.actions ?? []).some((item) => item.label === "Proceed")) {
      return next;
    }
    const skipped = skipCurrentInvite(next);
    if (skipped === next) break;
    next = skipped;
  }
  return next;
}

function spokenLabels(draft: FoxIntakeDraft) {
  return stillUsefulSpokenItems(draft).map((item) => item.label);
}

function remainderLabels(draft: FoxIntakeDraft) {
  return (stillUsefulSection(draft)?.items ?? []).map((item) => item.label);
}

function assertSpeechMatchesNotepad(draft: FoxIntakeDraft, label: string) {
  const spoken = spokenLabels(draft);
  const remainders = remainderLabels(draft);
  assert.ok(spoken.length >= 1 && spoken.length <= STILL_USEFUL_SPEECH_CAP, `${label} spoken ${spoken.length} — ${spoken.join(" · ")}`);
  assert.deepEqual(spoken, remainders.slice(0, STILL_USEFUL_SPEECH_CAP), `${label} spoken drifted from head — ${spoken.join(" · ")}`);
  assert.equal(
    afterLooksRightAskCopy(draft),
    `${MOTION_COPY.ready} Still useful: ${labelListCopy(spoken)} Skip is fine.`,
    `${label} Fox speech is not the notepad 1–3`,
  );
  const named = afterLooksRightAskCopy(draft).match(/Still useful:\s*(.+?)\s*Skip is fine/)?.[1] ?? "";
  const parts = named.replace(/\.$/, "").split(/, and |, | and /).map((item) => item.trim()).filter(Boolean);
  assert.ok(parts.length <= STILL_USEFUL_SPEECH_CAP, `${label} speech named ${parts.length} — ${named}`);
  assert.deepEqual(parts, spoken, `${label} parsed speech ≠ notepad — ${named} vs ${spoken.join(" · ")}`);
}

function assertProceedDoesNotGrow(before: FoxIntakeDraft, label: string) {
  const prior = spokenLabels(before);
  const proceeded = applyProceedMotion(withLinkedAccount({
    ...before,
    emailSkipped: true,
  }));
  assert.equal(proceeded.motion, "in_queue", `${label} Proceed motion`);
  assert.equal(proceeded.nextActor, "ONYX", `${label} Proceed next`);
  const after = spokenLabels(proceeded);
  assert.ok(after.length <= STILL_USEFUL_SPEECH_CAP, `${label} after Proceed grew past 3 — ${after.join(" · ")}`);
  assert.ok(after.length <= prior.length, `${label} after Proceed grew ${prior.length} → ${after.length} — ${after.join(" · ")}`);
  assert.deepEqual(after, prior.slice(0, after.length), `${label} after Proceed changed the spoken set — ${after.join(" · ")}`);
  const ask = nextFoxAsk(proceeded);
  assert.doesNotMatch(ask.text, /Still useful:/i, `${label} Proceed copy must stay the queue line`);
  return proceeded;
}

function main() {
  assert.equal(STILL_USEFUL_SPEECH_CAP, 3);

  const sunitaLooks = applyLooksRightMotion({
    ...pricedBuy("both"),
    documents: [
      {
        slot: "w2",
        name: "w2-2024.pdf",
        type: "application/pdf",
        size: 4000,
        receivedAt: "2026-09-16T00:00:00.000Z",
        status: "extracted",
        extractClass: "w2",
      },
    ],
    facts: {
      ...pricedBuy("both").facts,
      tax_year: fact("tax_year", "2025"),
    },
  });
  assert.equal(sunitaLooks.sampleAccepted, true, "Sunita Looks right");
  const sunitaFinish = skipUntilFinish(sunitaLooks);
  const sunitaRemainders = remainderLabels(sunitaFinish);
  const sunitaSpoken = spokenLabels(sunitaFinish);
  assert.ok(
    sunitaRemainders.length > STILL_USEFUL_SPEECH_CAP,
    `Sunita remainder board must be longer than speech — ${sunitaRemainders.join(" · ") || "(none)"}`,
  );
  assert.ok(sunitaSpoken.includes("Government ID"), `Sunita spoken missing ID — ${sunitaSpoken.join(" · ")}`);
  assert.equal(sunitaSpoken.length, 3, `Sunita spoken — ${sunitaSpoken.join(" · ")}`);
  const sunitaExtras = sunitaRemainders.slice(STILL_USEFUL_SPEECH_CAP);
  assert.ok(
    sunitaExtras.some((item) => /YTD P&L|Purchase contract|Bank statement/i.test(item)),
    `Sunita extras must remain off Still useful, not disappear — ${sunitaRemainders.join(" · ")}`,
  );
  assert.ok(
    sunitaSpoken.every((item) => !sunitaExtras.includes(item)),
    `Sunita notepad leaked past speech — ${sunitaSpoken.join(" · ")} vs ${sunitaExtras.join(" · ")}`,
  );
  assertSpeechMatchesNotepad(sunitaFinish, "Sunita both");
  assertProceedDoesNotGrow(sunitaFinish, "Sunita both");

  const thinLooks = applyLooksRightMotion(pricedBuy("self-employed"));
  const thinFinish = skipUntilFinish(thinLooks);
  const thinSpoken = spokenLabels(thinFinish);
  const thinRemainders = remainderLabels(thinFinish);
  assert.deepEqual(
    thinSpoken,
    ["Government ID", "Latest return", "Purchase contract"],
    `Thin SE spoken — ${thinSpoken.join(" · ")}`,
  );
  assert.ok(
    thinRemainders.length > STILL_USEFUL_SPEECH_CAP || thinRemainders.includes("Bank statement"),
    `Thin SE extras sit off the spoken block — ${thinRemainders.join(" · ")}`,
  );
  assert.ok(!thinSpoken.includes("Bank statement") && !thinSpoken.includes("YTD P&L"));
  assertSpeechMatchesNotepad(thinFinish, "Thin SE");
  assertProceedDoesNotGrow(thinFinish, "Thin SE");

  const wageLooks = applyLooksRightMotion(pricedBuy("w2"));
  const wageFinish = skipUntilFinish(wageLooks);
  const wageSpoken = spokenLabels(wageFinish);
  const wageRemainders = remainderLabels(wageFinish);
  assert.ok(wageSpoken.length <= STILL_USEFUL_SPEECH_CAP);
  assert.ok(wageRemainders.length > STILL_USEFUL_SPEECH_CAP, `W-2 remainder — ${wageRemainders.join(" · ")}`);
  assertSpeechMatchesNotepad(wageFinish, "W-2 buy");
  assertProceedDoesNotGrow(wageFinish, "W-2 buy");

  console.log(
    `assert-still-useful-speech-cap: speech ${sunitaSpoken.join(" · ")} == notepad; Proceed in_queue; list does not grow`,
  );
}

main();
