/**
 * Live extract entrypoint for fixture 09 / 19 / 20 / leftover D.
 * Cover is not unread at a bank invite. Contract Use this writes 94114.
 * Looks right after fixture 10 Use this does not ask citizenship.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { POST as extractRoute } from "../app/api/docs/extract/route";
import { classifyAndExtract } from "../lib/docs/extract";
import { FAILED_READ_NOTE } from "../lib/docs/accept";
import { readPdfTextLayer } from "../lib/docs/pdfText";
import {
  loudContractFromPrintedLines,
  loudCoverFromPrintedLines,
  loudWageFromPrintedLines,
} from "../lib/docs/printedSample";
import {
  applyExtractedFields,
  extractHintFromDraft,
  layer2AskCopy,
  layer2Plan,
  DOC_INVITE_COPY,
  nextCoverScheduleLabels,
  nextDocInvite,
  rejectIncomingFile,
  skipCurrentInvite,
  stillUsefulAskCopy,
  stillUsefulLabels,
} from "../components/fox/fileWrite";
import { applyCapture, applyExtractWrite, emptyDraft, loadIntakeDraft, receiveDocument } from "../components/fox/store";
import { canLooksRight, resolveProposal } from "../components/fox/completeness";
import { applyLooksRightMotion } from "../components/fox/motion";
import { CITIZENSHIP_ASK, citizenshipNeeded } from "../components/fox/citizenship";
import { skipFormerHistory } from "../components/fox/fileHistory";
import {
  isContractExtractAskText,
  isPurchaseContractInviteLine,
  nextFoxAsk,
  workspacePrompt,
  workspacePromptCopy,
  workspaceReply,
} from "../components/fox/workspace";
import { dropAbandonedAddressConfirm, paintedFoxActions } from "../components/fox/liveCoupon";
import { shouldShowAddressUseThis } from "../components/fox/propertyType";
import { searchedKeyFor } from "../lib/rateflow/fromDraft";
import type { ExtractClass, FoxIntakeDraft, FoxMessage } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on leftover fixtures");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on leftover fixtures");
  },
};

function load(name: string) {
  return new Uint8Array(readFileSync(join(root, "sample-docs", name)));
}

function seSketch(): FoxIntakeDraft {
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
    incomeType: { ...emptyDraft().incomeType, value: "self-employed" },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 850_000,
    downPaymentAmount: 170_000,
    loanAmountValue: 680_000,
    valueAsked: true,
    amountAsked: true,
    subjectAddress: "94123",
    propertyZip: "94123",
    propertyZipAsked: true,
    subjectAddressAsked: true,
    propertyType: "sfr",
    propertyTypeAsked: true,
    yearsInBusinessAsked: true,
    monthlyDebtsAsked: true,
    liveQuote: { key: "old|94123", rate: 6.125, asOf: "2026-09-05" },
    liveQuoteKey: "old|94123",
    liveQuoteStatus: "ready",
    facts: {
      present_address: {
        field: "present_address",
        value: "412 Filbert Street, San Francisco, CA 94123",
        source: "document",
        confirmed: true,
      },
      property_address: {
        field: "property_address",
        value: "94123",
        source: "client",
        confirmed: true,
      },
    },
  };
}

function afterTwoScheduleCs(): FoxIntakeDraft {
  return {
    ...seSketch(),
    skippedClasses: ["government_id"],
    facts: {
      ...seSketch().facts,
      qualifying_income: {
        field: "qualifying_income",
        value: "9125",
        source: "suggested",
        confirmed: true,
      },
      schedule_c_net_profit: {
        field: "schedule_c_net_profit",
        value: "88000",
        source: "document",
        confirmed: true,
      },
      return_kind: {
        field: "return_kind",
        value: "schedule_c",
        source: "document",
        confirmed: true,
      },
      tax_cashflows: {
        field: "tax_cashflows",
        value: JSON.stringify([
          {
            tax_year: "2024",
            return_kind: "schedule_c",
            schedule_c_net_profit: "88000",
            depreciation: "",
            depletion: "",
            business_use_of_home: "",
            nonrecurring_other_income: "",
            amortization: "",
            casualty_loss: "",
            mileage_depreciation: "",
            k1_ordinary_income: "",
            k1_distributions: "",
            schedule_e_rents_received: "",
            schedule_e_cash_expenses: "",
            schedule_e_part2_names: "",
            schedule_e_property_address: "",
            entity_ordinary_income: "",
            entity_8825_rental: "",
            entity_depreciation: "",
            entity_amortization: "",
            entity_te: "",
            entity_guaranteed_payments: "",
            ownership_percent: "",
            entity_taxable_income: "",
            entity_name: "",
          },
          {
            tax_year: "2025",
            return_kind: "schedule_c",
            schedule_c_net_profit: "108000",
            depreciation: "",
            depletion: "",
            business_use_of_home: "",
            nonrecurring_other_income: "",
            amortization: "",
            casualty_loss: "",
            mileage_depreciation: "",
            k1_ordinary_income: "",
            k1_distributions: "",
            schedule_e_rents_received: "",
            schedule_e_cash_expenses: "",
            schedule_e_part2_names: "",
            schedule_e_property_address: "",
            entity_ordinary_income: "",
            entity_8825_rental: "",
            entity_depreciation: "",
            entity_amortization: "",
            entity_te: "",
            entity_guaranteed_payments: "",
            ownership_percent: "",
            entity_taxable_income: "",
            entity_name: "",
          },
        ]),
        source: "extracted-unconfirmed",
        confirmed: true,
      },
    },
    documents: [
      {
        slot: "other",
        name: "10-1040-schedule-c-2024-hale-design.pdf",
        type: "application/pdf",
        size: 2048,
        receivedAt: "2026-09-05T16:00:00.000Z",
        status: "extracted",
        extractClass: "tax_return",
      },
      {
        slot: "other",
        name: "11-1040-schedule-c-2025-hale-design.pdf",
        type: "application/pdf",
        size: 2048,
        receivedAt: "2026-09-05T16:01:00.000Z",
        status: "extracted",
        extractClass: "tax_return",
      },
    ],
  };
}

async function routeExtract(name: string, hint?: ExtractClass | null) {
  const bytes = load(name);
  const form = new FormData();
  form.append("file", new File([Buffer.from(bytes)], name, { type: "application/pdf" }), name);
  form.append("name", name);
  form.append("type", "application/pdf");
  if (hint) form.append("hint", hint);
  const routed = await extractRoute(
    new Request("http://localhost/api/docs/extract", { method: "POST", body: form }),
  );
  return (await routed.json()) as {
    class?: string;
    failed?: boolean;
    note?: string;
    fields?: Record<string, string>;
    textLayerChars?: number;
  };
}

function writeLive(
  draft: FoxIntakeDraft,
  name: string,
  extractClass: ExtractClass,
  fields: Record<string, string>,
  at: string,
  failed?: boolean,
  note?: string,
) {
  loadIntakeDraft(draft);
  receiveDocument({
    slot: "other",
    name,
    type: "application/pdf",
    size: 2048,
    receivedAt: at,
  });
  return applyExtractWrite(
    at,
    name,
    { extractClass, confidence: 0.94, fields },
    failed ? FAILED_READ_NOTE : note,
    Boolean(failed),
  );
}

async function main() {
  const nineBytes = load("09-purchase-contract-clipper.pdf");
  const nineteenBytes = load("19-1040-cover-2024-jordan-hale.pdf");
  const twentyBytes = load("20-1040-cover-2025-jordan-hale.pdf");

  const layer09 = readPdfTextLayer(nineBytes) ?? [];
  const layer19 = readPdfTextLayer(nineteenBytes) ?? [];
  assert.ok(layer09.length, "fixture 09 must have a PDF text layer");
  assert.ok(layer19.length, "fixture 19 must have a PDF text layer");
  assert.ok((layer19.join("").replace(/\s+/g, "").length) >= 600, "fixture 19 must have usable text");

  const collapsed09 = [layer09.join(" ")];
  const collapsed19 = [layer19.join(" ")];
  const collapsedContract = loudContractFromPrintedLines(collapsed09);
  assert.equal(collapsedContract?.extractClass, "purchase_contract");
  assert.match(collapsedContract?.fields.property_address ?? "", /88 Clipper Street/i);
  assert.match(collapsedContract?.fields.property_address ?? "", /94114/);
  assert.equal(collapsedContract?.fields.purchase_price, "850000");
  assert.equal(collapsedContract?.fields.seller_credit, "5000");
  const collapsedCover = loudCoverFromPrintedLines(collapsed19);
  assert.equal(collapsedCover?.extractClass, "tax_return");
  assert.equal(collapsedCover?.fields.return_kind, "cover");
  assert.equal(collapsedCover?.fields.tax_year, "2024");
  assert.match(collapsedCover?.fields.cover_schedules ?? "", /schedule_c/);
  assert.match(collapsedCover?.fields.cover_schedules ?? "", /schedule_e/);
  assert.match(collapsedCover?.fields.cover_schedules ?? "", /k1/);
  assert.match(collapsedCover?.fields.cover_schedules ?? "", /schedule_f/);
  assert.equal(collapsedCover?.fields.schedule_c_net_profit, undefined);
  assert.equal(loudWageFromPrintedLines(layer19), null);
  assert.equal(loudWageFromPrintedLines(collapsed19), null);

  for (const hint of ["government_id", "bank_statement", "tax_return", "purchase_contract"] as const) {
    const routed09 = await routeExtract("09-purchase-contract-clipper.pdf", hint);
    assert.notEqual(routed09.failed, true, `09 unread under ${hint}`);
    assert.notEqual(routed09.note, FAILED_READ_NOTE, `09 failed-read under ${hint}`);
    assert.equal(routed09.class, "purchase_contract");
    assert.match(routed09.fields?.property_address ?? "", /88 Clipper Street/i);
    assert.match(routed09.fields?.property_address ?? "", /94114/);
    assert.equal(routed09.fields?.purchase_price, "850000");
  }

  for (const hint of ["government_id", "bank_statement", "tax_return"] as const) {
    const routed19 = await routeExtract("19-1040-cover-2024-jordan-hale.pdf", hint);
    assert.notEqual(routed19.failed, true, `19 unread under ${hint}`);
    assert.notEqual(routed19.note, FAILED_READ_NOTE, `19 failed-read under ${hint}`);
    assert.equal(routed19.class, "tax_return");
    assert.equal(routed19.fields?.return_kind, "cover");
    assert.equal(routed19.fields?.tax_year, "2024");
    assert.match(routed19.fields?.cover_schedules ?? "", /schedule_e/);
    assert.equal(routed19.fields?.schedule_c_net_profit, undefined);
    assert.equal(routed19.fields?.k1_ordinary_income, undefined);
    assert.doesNotMatch(routed19.fields?.property_address ?? "", /Filbert|94123/);
  }

  const routed20 = await routeExtract("20-1040-cover-2025-jordan-hale.pdf", "bank_statement");
  assert.notEqual(routed20.failed, true);
  assert.equal(routed20.fields?.return_kind, "cover");
  assert.equal(routed20.fields?.tax_year, "2025");

  const nine = await classifyAndExtract(nineBytes, "application/pdf", deadVision, "government_id", "09-purchase-contract-clipper.pdf");
  assert.notEqual(nine.failed, true);
  assert.equal(nine.extractClass, "purchase_contract");

  const contractAt = "2026-09-05T17:00:00.000Z";
  const startHint = extractHintFromDraft(seSketch(), "09-purchase-contract-clipper.pdf");
  assert.equal(startHint, "purchase_contract");
  const contractWrite = writeLive(
    seSketch(),
    "09-purchase-contract-clipper.pdf",
    "purchase_contract",
    nine.fields,
    contractAt,
  );
  assert.ok(!contractWrite.quietLines.some((line) => line === FAILED_READ_NOTE));
  assert.equal(canLooksRight(contractWrite.draft), false);
  assert.equal(contractWrite.draft.pendingProposal?.field, "property_address");
  assert.match(contractWrite.draft.pendingProposal?.value ?? "", /88 Clipper Street/i);
  const used = resolveProposal(contractWrite.draft, "accept");
  assert.match(used.subjectAddress ?? "", /88 Clipper Street/i);
  assert.match(used.subjectAddress ?? "", /94114/);
  assert.equal(used.propertyZip, "94114");
  assert.doesNotMatch(used.subjectAddress ?? "", /94123|Filbert/i);
  assert.match(used.facts?.present_address?.value ?? "", /Filbert/i);
  assert.match(used.facts?.present_address?.value ?? "", /94123/);
  assert.notEqual(used.propertyZip, "94123");
  assert.equal(used.liveQuote, undefined);
  assert.notEqual(searchedKeyFor(used), searchedKeyFor(seSketch()));
  assert.equal(used.looksRightHold, false);

  let inviteWalk = seSketch();
  assert.equal(nextDocInvite(inviteWalk), "government_id");
  inviteWalk = skipCurrentInvite(inviteWalk);
  assert.equal(nextDocInvite(inviteWalk), "tax_return");
  inviteWalk = skipCurrentInvite(inviteWalk);
  assert.equal(nextDocInvite(inviteWalk), "prior_year_return");
  inviteWalk = skipCurrentInvite(inviteWalk);
  assert.equal(nextDocInvite(inviteWalk), "bank_statement");
  inviteWalk = skipCurrentInvite(inviteWalk);
  assert.equal(nextDocInvite(inviteWalk), "purchase_contract");
  assert.equal(extractHintFromDraft(inviteWalk, "09-purchase-contract-clipper.pdf"), "purchase_contract");
  const inviteAsk = nextFoxAsk(inviteWalk);
  assert.equal(inviteAsk.text, DOC_INVITE_COPY.purchase_contract);
  assert.equal(isPurchaseContractInviteLine(inviteAsk.text), true);
  const inviteRoute = await routeExtract("09-purchase-contract-clipper.pdf", "purchase_contract");
  assert.notEqual(inviteRoute.failed, true);
  const inviteAt = "2026-09-05T17:04:00.000Z";
  const inviteWrite = writeLive(
    inviteWalk,
    "09-purchase-contract-clipper.pdf",
    (inviteRoute.class as ExtractClass) ?? "purchase_contract",
    inviteRoute.fields ?? {},
    inviteAt,
    inviteRoute.failed,
    inviteRoute.note,
  );
  assert.ok(!inviteWrite.quietLines.some((line) => line === FAILED_READ_NOTE));
  assert.equal(workspacePrompt(inviteWrite.draft), "confirm-proposal");
  assert.equal(canLooksRight(inviteWrite.draft), false);
  assert.equal(shouldShowAddressUseThis(inviteWrite.draft), true);
  const inviteConfirm = nextFoxAsk(inviteWrite.draft);
  assert.equal(isContractExtractAskText(inviteConfirm.text), true);
  assert.match(inviteConfirm.text, /88 Clipper Street/i);
  assert.match(inviteConfirm.text, /94114/);
  assert.ok((inviteConfirm.actions ?? []).some((item) => item.label === "Use this" || item.label === "Use document"));
  const inviteBubble: FoxMessage = {
    id: "contract-extract",
    role: "fox",
    text: inviteConfirm.text,
    actions: inviteConfirm.actions,
  };
  const kept = dropAbandonedAddressConfirm(
    [{ id: "invite", role: "fox", text: DOC_INVITE_COPY.purchase_contract, actions: inviteAsk.actions }, inviteBubble],
    inviteWrite.draft,
  );
  assert.ok(kept.some((item) => isContractExtractAskText(item.text)));
  assert.ok((paintedFoxActions(inviteBubble, inviteWrite.draft, true) ?? []).some((item) => item.label === "Use this"));
  const inviteUsed = resolveProposal(inviteWrite.draft, "accept");
  assert.match(inviteUsed.subjectAddress ?? "", /88 Clipper Street/i);
  assert.equal(inviteUsed.propertyZip, "94114");
  assert.match(inviteUsed.facts?.present_address?.value ?? "", /94123/);
  assert.equal(shouldShowAddressUseThis(inviteUsed), false);
  assert.notEqual(searchedKeyFor(inviteUsed), searchedKeyFor(inviteWalk));

  const afterCs = afterTwoScheduleCs();
  assert.equal(nextDocInvite(afterCs), "bank_statement");
  assert.equal(extractHintFromDraft(afterCs, "19-1040-cover-2024-jordan-hale.pdf"), "bank_statement");
  const nineteen = await routeExtract("19-1040-cover-2024-jordan-hale.pdf", "bank_statement");
  const coverAt = "2026-09-05T17:02:00.000Z";
  const coverWrite = writeLive(
    afterCs,
    "19-1040-cover-2024-jordan-hale.pdf",
    (nineteen.class as ExtractClass) ?? "tax_return",
    nineteen.fields ?? {},
    coverAt,
    nineteen.failed,
    nineteen.note,
  );
  assert.ok(!coverWrite.quietLines.some((line) => line === FAILED_READ_NOTE || /couldn’t read|unreadable|could not read/i.test(line)));
  assert.equal(coverWrite.draft.facts?.qualifying_income?.value, "9125");
  assert.notEqual(coverWrite.draft.pendingProposal?.field, "qualifying_income");
  assert.equal(coverWrite.draft.facts?.cover_schedules?.value, nineteen.fields?.cover_schedules);
  assert.equal(coverWrite.draft.facts?.return_kind?.value, "schedule_c");
  assert.ok(!coverWrite.draft.documents.some((doc) => /could not read/i.test(doc.note ?? "")));

  const mapped = nextCoverScheduleLabels(coverWrite.draft);
  assert.ok(!mapped.includes("Schedule C"));
  assert.ok(mapped.some((label) => label === "K-1"));
  assert.ok(mapped.some((label) => label === "Schedule E"));
  assert.ok(mapped.some((label) => label === "Schedule F"));

  const layer2 = layer2Plan(coverWrite.draft);
  const layer2Labels = layer2.map((item) => item.label);
  assert.ok(!layer2Labels.includes("Schedule C"));
  assert.ok(layer2Labels.includes("K-1"));
  assert.ok(layer2Labels.includes("Schedule E"));
  assert.ok(layer2Labels.includes("Schedule F"));
  assert.equal(layer2Labels[0] === "K-1" || layer2Labels[0] === "Schedule E" || layer2Labels[0] === "Schedule F", true);
  const usefulAsk = stillUsefulAskCopy(coverWrite.draft);
  assert.match(usefulAsk, /K-1|Schedule E|Schedule F/);
  assert.doesNotMatch(usefulAsk, /Schedule C/);
  const layer2Ask = layer2AskCopy(coverWrite.draft);
  assert.match(layer2Ask, /K-1|Schedule E|Schedule F/);
  const useful = stillUsefulLabels(coverWrite.draft);
  assert.ok(!useful.includes("Schedule C"));
  assert.ok(useful.some((label) => label === "K-1" || label === "Schedule E" || label === "Schedule F"));

  const midHint = extractHintFromDraft(coverWrite.draft, "09-purchase-contract-clipper.pdf");
  const midNine = await routeExtract("09-purchase-contract-clipper.pdf", midHint);
  assert.notEqual(midNine.failed, true);
  const midAt = "2026-09-05T17:03:00.000Z";
  const midWrite = writeLive(
    coverWrite.draft,
    "09-purchase-contract-clipper.pdf",
    (midNine.class as ExtractClass) ?? "purchase_contract",
    midNine.fields ?? {},
    midAt,
    midNine.failed,
    midNine.note,
  );
  assert.ok(!midWrite.quietLines.some((line) => line === FAILED_READ_NOTE));
  assert.equal(canLooksRight(midWrite.draft), false);
  const midAsk = workspacePromptCopy("confirm-proposal", midWrite.draft);
  assert.ok((midAsk.actions ?? []).some((item) => item.label === "Use this" || item.label === "Use document"));
  const midUsed = resolveProposal(midWrite.draft, "accept");
  assert.equal(midUsed.propertyZip, "94114");
  assert.match(midUsed.subjectAddress ?? "", /Clipper/i);
  assert.match(midUsed.facts?.present_address?.value ?? "", /94123/);

  const afterUse = { ...midUsed, pendingProposal: null, looksRightHold: false };
  const looks = applyLooksRightMotion(afterUse);
  assert.equal(citizenshipNeeded(looks), false);
  assert.notEqual(workspacePrompt(looks), "citizenship");
  assert.doesNotMatch(`${nextFoxAsk(looks).text} ${nextFoxAsk(looks).followUp ?? ""}`, /citizen|permanent resident/i);

  let leftoverD = seSketch();
  leftoverD = skipCurrentInvite(leftoverD);
  assert.equal(nextDocInvite(leftoverD), "tax_return");
  const ten = await routeExtract(
    "10-1040-schedule-c-2024-hale-design.pdf",
    extractHintFromDraft(leftoverD, "10-1040-schedule-c-2024-hale-design.pdf"),
  );
  assert.notEqual(ten.failed, true);
  const tenAt = "2026-09-05T18:00:00.000Z";
  const tenWrite = writeLive(
    leftoverD,
    "10-1040-schedule-c-2024-hale-design.pdf",
    (ten.class as ExtractClass) ?? "tax_return",
    ten.fields ?? {},
    tenAt,
    ten.failed,
    ten.note,
  );
  leftoverD = tenWrite.draft;
  assert.equal(leftoverD.pendingProposal?.field, "qualifying_income");
  assert.equal(leftoverD.pendingProposal?.value, "8292");
  assert.equal(workspacePrompt(leftoverD), "confirm-proposal");
  assert.equal(canLooksRight(leftoverD), false);
  const qiAsk = nextFoxAsk(leftoverD);
  assert.match(qiAsk.text, /\$8,292/);
  assert.ok((qiAsk.actions ?? []).some((item) => item.label === "Use this"));
  assert.ok(!(qiAsk.actions ?? []).some((item) => item.label === "Looks right"));
  const leftoverReview: FoxMessage = {
    id: "leftover-review",
    role: "fox",
    text: "The file looks like this. Looks right, or change a line.",
    actions: [
      { id: "looks-right", label: "Looks right", event: "bubble", capture: { field: "confirm-draft" } },
      { id: "needs-fix", label: "Needs a correction", event: "bubble", capture: { field: "needs-correction" } },
    ],
  };
  assert.ok(
    !(paintedFoxActions(leftoverReview, leftoverD, true) ?? []).some((item) => item.label === "Looks right"),
  );
  const looksWhileOpen = applyLooksRightMotion(leftoverD);
  assert.notEqual(looksWhileOpen.sampleAccepted, true);
  assert.equal(looksWhileOpen.pendingProposal?.field, "qualifying_income");
  assert.notEqual(workspacePrompt(looksWhileOpen), "citizenship");
  const replyWhileOpen = workspaceReply("Looks right", leftoverD);
  assert.notEqual(replyWhileOpen?.capture?.field, "confirm-draft");
  assert.doesNotMatch(`${replyWhileOpen?.text ?? ""} ${replyWhileOpen?.followUp ?? ""}`, /citizen|permanent resident/i);
  assert.notEqual(replyWhileOpen?.text, CITIZENSHIP_ASK);
  loadIntakeDraft(leftoverD);
  const blockedLooks = applyCapture({ field: "confirm-draft" });
  assert.notEqual(blockedLooks.sampleAccepted, true);
  assert.equal(blockedLooks.pendingProposal?.field, "qualifying_income");
  assert.notEqual(workspacePrompt(blockedLooks), "citizenship");

  leftoverD = resolveProposal(leftoverD, "accept");
  assert.equal(leftoverD.facts?.qualifying_income?.value, "8292");
  const looksAfterQi = applyLooksRightMotion(leftoverD);
  assert.notEqual(workspacePrompt(looksAfterQi), "citizenship");
  assert.doesNotMatch(
    `${nextFoxAsk(looksAfterQi).text} ${nextFoxAsk(looksAfterQi).followUp ?? ""}`,
    /citizen|permanent resident/i,
  );
  assert.ok(!(nextFoxAsk(looksAfterQi).actions ?? []).some((item) => /citizen|permanent resident/i.test(item.label)));

  leftoverD = skipCurrentInvite(leftoverD);
  leftoverD = skipCurrentInvite(leftoverD);
  leftoverD = skipCurrentInvite(leftoverD);
  leftoverD = skipFormerHistory(leftoverD);
  leftoverD = skipFormerHistory(leftoverD);
  const afterLooks = applyLooksRightMotion(leftoverD);
  assert.equal(afterLooks.sampleAccepted, true);
  assert.notEqual(workspacePrompt(afterLooks), "citizenship");
  assert.equal(citizenshipNeeded(afterLooks), false);
  const afterLooksAsk = nextFoxAsk(afterLooks);
  assert.doesNotMatch(`${afterLooksAsk.text} ${afterLooksAsk.followUp ?? ""}`, /citizen|permanent resident/i);
  assert.ok(!(afterLooksAsk.actions ?? []).some((item) => /citizen|permanent resident/i.test(item.label)));
  assert.notEqual(afterLooksAsk.text, CITIZENSHIP_ASK);
  assert.notEqual(afterLooksAsk.followUp, CITIZENSHIP_ASK);

  assert.equal(rejectIncomingFile(afterCs, "19-1040-cover-2024-jordan-hale.pdf", "application/pdf", 3114), null);
  const twentyWrite = applyExtractedFields(afterCs, {
    extractClass: "tax_return",
    confidence: 0.94,
    fields: routed20.fields ?? {},
  });
  assert.equal(twentyWrite.draft.facts?.qualifying_income?.value, "9125");

  const twentyBytesCheck = await classifyAndExtract(twentyBytes, "application/pdf", deadVision, "bank_statement");
  assert.equal(twentyBytesCheck.fields.return_kind, "cover");
  assert.notEqual(twentyBytesCheck.failed, true);

  console.log("assert-cover-contract-leftover: live route 09/19 · bank-invite cover · ZIP 94114");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
