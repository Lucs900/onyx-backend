/**
 * After Use this / Skip, Fox must speak the next file-driven line with a live strip.
 * Years write, free-text restore, and contract Skip cannot leave an empty composer.
 * Skip on contract must not drop Looks right / Proceed. Do not reopen W-2 math or 1040 split.
 */
import assert from "node:assert/strict";
import { emptyDraft } from "../components/fox/store";
import { skipCurrentInvite, DOC_INVITE_COPY } from "../components/fox/fileWrite";
import { resolveProposal, writeQualifyingIncome, writeYearsInBusiness } from "../components/fox/completeness";
import { applyLooksRightMotion } from "../components/fox/motion";
import { deskStripActions, nextFoxAsk, workspaceReply } from "../components/fox/workspace";
import { QUALIFYING_INCOME_FIELD } from "../components/fox/qualifyingIncome";
import type { FoxIntakeDraft, FoxMessage } from "../components/fox/types";

function fact(field: string, value: string) {
  return { field, value, source: "document" as const, confirmed: true, confirmedAt: "2026-09-16T00:00:00.000Z" };
}

function incomeWritten(): FoxIntakeDraft {
  return writeYearsInBusiness(
    writeQualifyingIncome(
      {
        ...emptyDraft(),
        path: "acr",
        productIntent: "buy",
        workspaceFlow: true,
        occupancyAsked: true,
        occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
        timelineAsked: true,
        timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
        incomeAsked: true,
        incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
        creditAsked: true,
        creditBand: "760+",
        propertyValueAmount: 1_200_000,
        downPaymentAmount: 240_000,
        loanAmountValue: 960_000,
        valueAsked: true,
        amountAsked: true,
        propertyType: "house",
        propertyTypeAsked: true,
        propertyZip: "94123",
        propertyZipAsked: true,
        subjectAddress: "",
        yearsInBusinessAsked: true,
        monthlyDebtsAsked: true,
        taxReturnPacketSpoken: true,
        taxReturnPacketRead: "done",
        federalReturnSkipped: true,
        transcriptFollowUpSkipped: true,
        skippedClasses: ["government_id", "tax_return", "w2"],
        wageBox5Asked: true,
        documents: [
          {
            slot: "other",
            name: "2024 Tax Return Documents (SINGH SUNITA) - filed.pdf",
            type: "application/pdf",
            size: 2048,
            receivedAt: "2026-09-16T18:00:00.000Z",
            status: "extracted",
            extractClass: "tax_return",
          },
          {
            slot: "w2",
            name: "Sunita 2024 W-2.pdf",
            type: "application/pdf",
            size: 1024,
            receivedAt: "2026-09-16T18:05:00.000Z",
            status: "extracted",
            extractClass: "w2",
          },
        ],
        facts: {
          tax_year: fact("tax_year", "2024"),
          return_kind: fact("return_kind", "1040"),
          tax_return_name: fact("tax_return_name", "SUNITA SINGH"),
          household_wages: fact("household_wages", "91999.96"),
        },
      },
      "7667",
    ),
    "19",
  );
}

function foxLine(text: string, draft: FoxIntakeDraft): FoxMessage[] {
  return [{ id: "live", role: "fox", text }];
}

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function main() {
  const afterYears = incomeWritten();
  assert.equal(afterYears.facts?.[QUALIFYING_INCOME_FIELD]?.value, "7667");
  assert.equal(afterYears.facts?.years_in_business?.value, "19");
  const yearsAsk = nextFoxAsk(afterYears);
  assert.ok(yearsAsk.text.trim(), "after years Use this Fox must speak");
  assert.ok((yearsAsk.actions ?? []).length > 0, "after years Use this must have chips");
  assert.doesNotMatch(yearsAsk.text, /Form 1040, all pages/);
  assert.ok(
    deskStripActions(foxLine(yearsAsk.text, afterYears), afterYears).some((item) => item.label === "Skip"),
    `spoken years-next line owns a live Skip — ${yearsAsk.text}`,
  );

  const usedYears = resolveProposal(
    {
      ...afterYears,
      pendingProposal: {
        field: "years_in_business",
        value: "19",
        label: "Years in business",
        kind: "computed",
        methodNote: "entity-return-years",
        hireLabel: "May 25, 2007",
      },
    },
    "accept",
  );
  assert.equal(usedYears.facts?.years_in_business?.value, "19");
  const usedAsk = nextFoxAsk(usedYears);
  assert.ok(usedAsk.text.trim(), "Use this years cannot leave an empty composer");
  assert.ok((usedAsk.actions ?? []).length > 0, "Use this years must emit chips");

  const whatElse = workspaceReply("what else do you need", afterYears);
  assert.ok(whatElse?.text.trim(), "what else restore must speak");
  assert.ok(/purchase contract is the property on paper/i.test(whatElse?.text ?? ""), whatElse?.text);
  assert.ok(
    (whatElse?.actions ?? []).some((item) => item.label === "Skip"),
    `what else restore must keep Skip — ${labels(whatElse?.actions).join(" · ")}`,
  );
  assert.ok(
    deskStripActions(foxLine(whatElse!.text, afterYears), afterYears).some((item) => item.label === "Skip"),
    "prefixed contract line still has a live strip",
  );

  const typedSkip = workspaceReply("Skip", afterYears);
  assert.ok(typedSkip?.text.trim(), "typed Skip on contract must emit a next line");
  assert.ok((typedSkip?.actions ?? []).length > 0, "typed Skip must keep chips");
  assert.doesNotMatch(typedSkip?.text ?? "", /purchase contract is the property on paper/i);

  const skipped = skipCurrentInvite(afterYears);
  assert.ok((skipped.skippedClasses ?? []).includes("purchase_contract"), "transcript done must not no-op contract Skip");
  const afterSkip = nextFoxAsk(skipped);
  assert.ok(afterSkip.text.trim(), "chip Skip on contract must speak the next line");
  assert.ok((afterSkip.actions ?? []).length > 0, "chip Skip on contract must keep a live strip");
  assert.match(afterSkip.text, /these numbers look right/i);
  assert.deepEqual(labels(afterSkip.actions), ["Looks right", "Needs a correction"]);
  assert.deepEqual(
    labels(deskStripActions(foxLine(afterSkip.text, skipped), skipped)),
    ["Looks right", "Needs a correction"],
    "Looks right in history still owns Looks right · Needs a correction",
  );

  const leftoverAddress = {
    ...skipped,
    pendingAddress: { line: "94123", zip: "94123", city: "San Francisco", state: "CA" },
  };
  assert.deepEqual(
    labels(deskStripActions(foxLine(afterSkip.text, leftoverAddress), leftoverAddress)),
    ["Looks right", "Needs a correction"],
    "leftover pendingAddress cannot drop the Looks right strip",
  );

  const afterLooks = applyLooksRightMotion(skipped);
  assert.equal(afterLooks.sampleAccepted, true);
  const ready = {
    ...afterLooks,
    skippedClasses: [
      ...new Set([
        ...(afterLooks.skippedClasses ?? []),
        "government_id" as const,
        "bank_statement" as const,
        "second_bank_statement" as const,
      ]),
    ],
    secondBankStatementSkipped: true,
    documentsSkipped: true,
  };
  const proceedAsk = nextFoxAsk(ready);
  assert.match(proceedAsk.text, /i can send this to review/i);
  assert.ok(
    labels(proceedAsk.actions).includes("Proceed") ||
      deskStripActions(foxLine(proceedAsk.text, ready), ready).some((item) => item.label === "Proceed"),
    "Proceed strip stays after contract Skip + Looks right",
  );

  assert.equal(DOC_INVITE_COPY.purchase_contract.includes("Skip is fine"), true);
  console.log("assert-empty-composer-after-write: Use this/Skip emit next line + live strip");
}

main();
