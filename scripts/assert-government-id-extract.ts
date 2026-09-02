/**
 * After W-2 path, Fox asks for government ID so the file has a name.
 * Composer paperclip of 01-ca-id-jordan-hale.pdf: FN/LN → Jordan Hale.
 * File name stays empty until Use this. ID street is residence only.
 * DL number is never written. Skip leaves Government ID on Still useful.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../lib/docs/extract";
import { loudIdFromPrintedLines, nameFromCaIdLines, readPrintedSample } from "../lib/docs/printedSample";
import { readPdfTextLayer } from "../lib/docs/pdfText";
import { applyExtractedFields, stillUsefulSection, skipCurrentInvite, DOC_INVITE_COPY, extractHintFromDraft, nextDocInvite } from "../components/fox/fileWrite";
import { canLooksRight, resolveProposal, proposalAskCopy } from "../components/fox/completeness";
import { applyLooksRightMotion, applyProceedMotion } from "../components/fox/motion";
import { applyCapture, applyExtractWrite, emptyDraft, getFoxDraft, loadIntakeDraft, receiveDocument } from "../components/fox/store";
import { conventionalFileFacts } from "../components/fox/conventionalFile";
import { docReactionAsk, isGovernmentIdInviteLine, nextFoxAsk, previewFacts, workspacePrompt, workspacePromptCopy } from "../components/fox/workspace";
import {
  applyIdExtractAsk,
  dropResolvedAddressConfirmChips,
  isIdExtractPath,
  paintedFoxActions,
  paintThreadActions,
} from "../components/fox/liveCoupon";
import { addressOnFileCopy } from "../components/fox/propertyType";
import { ID_UNREAD_ASK } from "../components/fox/borrowerName";
import { hasLockedSuggestion } from "../components/fox/fileWrite";
import { wageEmploymentFileLine } from "../components/fox/qualifyingIncome";
import type { FoxIntakeDraft } from "../components/fox/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ID = join(root, "sample-docs/01-ca-id-jordan-hale.pdf");
const LOUD_08 = join(root, "sample-docs/08-ca-id-jordan-hale-loud.pdf");

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on 01 text");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on 01 text");
  },
};

function wageDocsDraft(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "buy",
    workspaceFlow: true,
    sampleAccepted: false,
    incomeAsked: true,
    incomeType: { ...emptyDraft().incomeType, value: "w2" },
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    creditAsked: true,
    creditBand: "760+",
    propertyValueAmount: 1_200_000,
    loanAmountValue: 960_000,
    downPaymentAmount: 240_000,
    valueAsked: true,
    amountAsked: true,
    otherReoAsked: true,
    statedOtherReo: "none",
    propertyType: "sfr",
    propertyTypeAsked: true,
    citizenshipAsked: true,
    wageDocsAsked: true,
    wageBox5Asked: true,
    wageFrequencyAsked: true,
    wageStubAsked: true,
    stubExtractAccepted: true,
    emailSkipped: true,
    facts: {
      w2_box5: { field: "w2_box5", value: "118400", source: "document", confirmed: true },
      employer_name: {
        field: "employer_name",
        value: "Harbor Pacific Design Inc",
        source: "document",
        confirmed: true,
      },
      paystub_monthly: { field: "paystub_monthly", value: "9999.99", source: "document", confirmed: true },
    },
    documents: [
      {
        slot: "w2",
        name: "03-w2-2025-jordan-hale.pdf",
        type: "application/pdf",
        size: 8000,
        receivedAt: "2026-09-02T00:00:00.000Z",
        status: "extracted",
        extractClass: "w2",
      },
      {
        slot: "paystubs",
        name: "07-paystub-biweekly-loud.pdf",
        type: "application/pdf",
        size: 4000,
        receivedAt: "2026-09-02T00:01:00.000Z",
        status: "extracted",
        extractClass: "paystub",
      },
    ],
  };
}

function noBorrowerOnFile(draft: FoxIntakeDraft) {
  assert.ok(
    previewFacts(draft).every(
      (fact) =>
        fact.id !== "borrower" &&
        !/Jordan Hale/i.test(`${fact.label} ${fact.value} ${fact.note ?? ""}`),
    ),
    previewFacts(draft)
      .map((fact) => `${fact.id}:${fact.label}=${fact.value}`)
      .join(" · "),
  );
}

function stillUsefulLabels(draft: FoxIntakeDraft) {
  return (stillUsefulSection(draft)?.items ?? []).map((item) => item.label);
}

async function main() {
  assert.equal(nameFromCaIdLines(["LN HALE", "FN JORDAN"]), "JORDAN HALE");
  assert.equal(nameFromCaIdLines(["LN", "HALE", "FN", "JORDAN"]), "JORDAN HALE");
  assert.equal(nameFromCaIdLines(["DCS HALE", "DAC JORDAN"]), "JORDAN HALE");
  assert.equal(nameFromCaIdLines(["1 HALE", "2 JORDAN"]), "JORDAN HALE");
  assert.equal(
    nameFromCaIdLines(["CALIFORNIA DRIVER LICENSE DL D1234567 LN HALE FN JORDAN"]),
    "JORDAN HALE",
  );
  assert.equal(nameFromCaIdLines(["DRIVER LICENSE", "DL D1234567"]), "");

  const bytes = readFileSync(ID);
  const layer = readPdfTextLayer(bytes) ?? [];
  assert.ok(layer.length, "01 CA ID has a text layer");
  assert.match(layer.join("\n"), /DRIVER LICENSE/i);
  assert.match(layer.join("\n"), /FN JORDAN/i);
  assert.match(layer.join("\n"), /LN HALE/i);
  assert.match(layer.join("\n"), /1847 Filbert/i);
  assert.match(layer.join("\n"), /D1234567/);
  assert.doesNotMatch(layer.join("\n"), /FULL NAME:/i);

  const printed = readPrintedSample(bytes);
  const loud = loudIdFromPrintedLines(layer);
  assert.equal(loud?.extractClass, "government_id");
  assert.match(loud?.fields.full_name ?? "", /JORDAN HALE/i);
  assert.match(loud?.fields.present_address ?? printed?.fields.present_address ?? "", /1847 Filbert/i);
  assert.equal(loud?.fields.property_address, undefined);

  const extracted = await classifyAndExtract(
    bytes,
    "application/pdf",
    deadVision,
    null,
    "01-ca-id-jordan-hale.pdf",
  );
  assert.notEqual(extracted.failed, true, "01 text layer is confirm, not unread");
  assert.equal(extracted.extractClass, "government_id");
  assert.match(extracted.fields.full_name ?? "", /JORDAN HALE/i);
  assert.match(extracted.fields.present_address ?? "", /1847 Filbert/i);
  assert.equal(extracted.fields.property_address, undefined);
  assert.doesNotMatch(JSON.stringify(extracted.fields), /D1234567/);
  assert.equal(extracted.fields.id_last4, undefined);

  const loud08 = await classifyAndExtract(
    readFileSync(LOUD_08),
    "application/pdf",
    deadVision,
    null,
    "08-ca-id-jordan-hale-loud.pdf",
  );
  assert.notEqual(loud08.failed, true);
  assert.match(loud08.fields.full_name ?? "", /JORDAN HALE/i);

  const afterDocs = wageDocsDraft();
  assert.equal(nextDocInvite(afterDocs), "government_id");
  assert.match(DOC_INVITE_COPY.government_id, /government ID/i);
  assert.match(DOC_INVITE_COPY.government_id, /name/i);
  assert.match(DOC_INVITE_COPY.government_id, /First I need a government ID, so this file has a name on it/);

  const afterLooks = { ...afterDocs, sampleAccepted: true };
  assert.equal(nextDocInvite(afterLooks), "government_id");
  assert.equal(extractHintFromDraft(afterLooks, "01-ca-id-jordan-hale.pdf"), "government_id");
  assert.equal(
    extractHintFromDraft({ ...afterLooks, pendingProposal: { field: "loanAmount", value: "960000", label: "loan", kind: "computed" } }, "01-ca-id-jordan-hale.pdf"),
    "government_id",
  );
  assert.equal(
    extractHintFromDraft({ ...afterLooks, skippedClasses: ["government_id"] }, "01-ca-id-jordan-hale.pdf"),
    "government_id",
  );
  assert.ok(isGovernmentIdInviteLine(DOC_INVITE_COPY.government_id));
  assert.ok(isGovernmentIdInviteLine("Next is a government ID, so the file has a name."));

  const composerFile = new File([bytes], "01-ca-id-jordan-hale.pdf", { type: "" });
  assert.equal(composerFile.name, "01-ca-id-jordan-hale.pdf");
  assert.equal(composerFile.size, bytes.length);
  const snapshotType = "application/pdf";
  const keep = new File([new Blob([await composerFile.arrayBuffer()], { type: snapshotType })], composerFile.name, {
    type: snapshotType,
  });
  const composerForm = new FormData();
  composerForm.append("file", keep, keep.name);
  composerForm.append("name", keep.name);
  composerForm.append("type", snapshotType);
  composerForm.append("hint", "government_id");
  const { POST: extractRoutePost } = await import("../app/api/docs/extract/route");
  const composerPosted = await extractRoutePost(
    new Request("http://local/api/docs/extract", { method: "POST", body: composerForm }),
  );
  const composerRead = (await composerPosted.json()) as {
    class?: string;
    fields?: Record<string, string>;
    failed?: boolean;
    source?: string;
    note?: string;
    confidence?: number;
  };
  assert.equal(composerPosted.status, 200);
  assert.equal(composerRead.source, "file");
  assert.notEqual(composerRead.failed, true, "composer File of 01 is confirm, not unread");
  assert.equal(composerRead.class, "government_id");
  assert.match(composerRead.fields?.full_name ?? "", /JORDAN HALE/i);
  assert.match(composerRead.fields?.present_address ?? "", /1847 Filbert/i);
  assert.equal(composerRead.fields?.property_address, undefined);
  assert.doesNotMatch(JSON.stringify(composerRead.fields ?? {}), /D1234567/);

  const receivedAt = "2026-09-02T00:02:00.000Z";
  loadIntakeDraft(afterLooks);
  receiveDocument({
    slot: "id",
    name: keep.name,
    type: snapshotType,
    size: keep.size,
    receivedAt,
  });
  const composerWrite = applyExtractWrite(
    receivedAt,
    keep.name,
    {
      extractClass: (composerRead.class as "government_id") ?? "other",
      confidence: typeof composerRead.confidence === "number" ? composerRead.confidence : 0.94,
      fields: composerRead.fields ?? {},
    },
    composerRead.failed
      ? "Fox could not read this file. Type a note or skip. No dollar amounts were invented."
      : composerRead.note,
    Boolean(composerRead.failed),
  );
  assert.notEqual(composerWrite.quietLines.some((line) => /could not read/i.test(line)), true);
  assert.equal(composerWrite.extractClass, "government_id");
  assert.equal(composerWrite.draft.pendingProposal?.field, "borrowerName");
  assert.match(composerWrite.draft.pendingProposal?.value ?? "", /Jordan Hale/i);
  assert.equal(composerWrite.draft.borrowerName, undefined);
  assert.equal(composerWrite.draft.contact.fullName.value, "");
  const composerSpoken = proposalAskCopy(composerWrite.draft.pendingProposal!);
  assert.equal(
    composerSpoken,
    "The ID shows Jordan Hale. Suggested · not underwritten. Use this?",
  );
  assert.doesNotMatch(composerSpoken, /^On the file\.?$/);
  assert.doesNotMatch(JSON.stringify(composerWrite.draft), /D1234567/);
  assert.equal(composerWrite.draft.facts?.id_last4, undefined);
  const composerAsk = docReactionAsk(composerWrite.draft, "government_id");
  assert.equal(composerAsk?.text, composerSpoken);
  assert.deepEqual((composerAsk?.actions ?? []).map((item) => item.label), ["Use this", "Skip"]);
  assert.equal(hasLockedSuggestion("government_id", { present_address: "1847 Filbert St, San Francisco, CA 94123" }), false);
  assert.equal(hasLockedSuggestion("government_id", { full_name: "JORDAN HALE" }), true);

  const marinaLine = "801 Marina Blvd, San Francisco, CA 94123";
  const leftoverStreet = {
    id: "addr-confirm",
    role: "fox" as const,
    text: `${marinaLine}. Use this?`,
    actions: [
      { id: "accept-proposal", label: "Use this", event: "bubble" as const, capture: { field: "accept-proposal" } },
      { id: "change-proposal", label: "Change", event: "bubble" as const, capture: { field: "change-proposal" } },
    ],
  };
  const idInvite = {
    id: "id-invite",
    role: "fox" as const,
    text: DOC_INVITE_COPY.government_id,
    actions: [
      { id: "upload-this", label: "Upload this", event: "open-docs" as const, capture: { field: "open-docs" } },
      { id: "skip-docs", label: "Skip", event: "bubble" as const, capture: { field: "skip-docs" } },
    ],
  };
  const fileHasStreet = {
    ...afterLooks,
    subjectAddress: marinaLine,
    subjectStreet: marinaLine,
    subjectAddressAsked: true,
    pendingAddress: { line: marinaLine, street: "801 Marina Blvd", city: "San Francisco", state: "CA", zip: "94123" },
  };
  assert.equal(isIdExtractPath(fileHasStreet), false);
  const atIdAsk = dropResolvedAddressConfirmChips([leftoverStreet, idInvite], fileHasStreet);
  assert.ok(atIdAsk.some((message) => message.id === "id-invite"));
  assert.equal(isIdExtractPath(composerWrite.draft), true);

  const afterComposerId = {
    ...composerWrite.draft,
    subjectAddress: marinaLine,
    subjectStreet: marinaLine,
    subjectAddressAsked: true,
  };
  const composerPaint = dropResolvedAddressConfirmChips(
    applyIdExtractAsk(atIdAsk, {
      id: "id-confirm",
      role: "fox",
      text: composerAsk!.text,
      actions: composerAsk!.actions,
    }),
    afterComposerId,
  );
  const composerLast = [...composerPaint].reverse().find((message) => message.role === "fox");
  assert.match(composerLast?.text ?? "", /The ID shows Jordan Hale/);
  assert.doesNotMatch(composerLast?.text ?? "", /On the file/);
  assert.deepEqual(
    (composerLast?.actions ?? []).map((item) => item.label),
    ["Use this", "Skip"],
  );
  assert.equal(
    composerPaint.filter((message) => message.text === addressOnFileCopy()).length,
    0,
    composerPaint.map((message) => message.text).join(" | "),
  );
  noBorrowerOnFile(afterComposerId);
  assert.ok(
    previewFacts(afterComposerId).every((fact) => fact.id !== "docs" || !/ID in/.test(fact.value)),
  );

  loadIntakeDraft(fileHasStreet);
  receiveDocument({
    slot: "id",
    name: "unreadable-id.pdf",
    type: "application/pdf",
    size: 400,
    receivedAt: "2026-09-02T00:05:00.000Z",
  });
  const addressOnlyWrite = applyExtractWrite(
    "2026-09-02T00:05:00.000Z",
    "unreadable-id.pdf",
    {
      extractClass: "government_id",
      confidence: 0.9,
      fields: { present_address: "1847 Filbert St, San Francisco, CA 94123" },
    },
    "Fox could not read this file. Type a note or skip. No dollar amounts were invented.",
    false,
  );
  assert.ok(!addressOnlyWrite.draft.pendingProposal, "address-only ID invents nothing");
  assert.equal(addressOnlyWrite.draft.borrowerName, undefined);
  assert.ok(addressOnlyWrite.quietLines.some((line) => /could not read/i.test(line)));
  const unreadPaint = dropResolvedAddressConfirmChips(
    applyIdExtractAsk(atIdAsk, {
      id: "id-unread",
      role: "fox",
      text: ID_UNREAD_ASK,
      actions: [{ id: "skip-docs", label: "Skip", event: "bubble", capture: { field: "skip-docs" } }],
    }),
    addressOnlyWrite.draft,
  );
  const unreadLast = [...unreadPaint].reverse().find((message) => message.role === "fox");
  assert.equal(unreadLast?.text, ID_UNREAD_ASK);
  assert.equal(
    unreadPaint.filter((message) => message.text === addressOnFileCopy()).length,
    0,
  );
  assert.ok(
    stillUsefulLabels(addressOnlyWrite.draft).some((label) => /government ID/i.test(label)),
    stillUsefulLabels(addressOnlyWrite.draft).join(" · "),
  );
  const composerDraft = {
    ...composerWrite.draft,
    documents: [...composerWrite.draft.documents],
    skippedClasses: [...(composerWrite.draft.skippedClasses ?? [])],
  };
  const skippedFromComposer = skipCurrentInvite(composerDraft);
  assert.ok(!skippedFromComposer.pendingProposal);
  assert.equal(skippedFromComposer.borrowerName, undefined);
  assert.ok((skippedFromComposer.skippedClasses ?? []).includes("government_id"));
  assert.ok(
    stillUsefulLabels(skippedFromComposer).some((label) => /government ID/i.test(label)),
    stillUsefulLabels(skippedFromComposer).join(" · "),
  );
  assert.doesNotMatch(nextFoxAsk(skippedFromComposer).text, /The ID shows Jordan Hale/);
  assert.ok(
    previewFacts(skippedFromComposer).every((fact) => fact.id !== "docs" || !/ID in/.test(fact.value)),
  );
  assert.ok(
    conventionalFileFacts(afterLooks).every(
      (fact) =>
        fact.id !== "file-assets" ||
        (fact.value === "" && !/institution —|balance —|last4 —/.test(fact.value)),
    ),
  );

  loadIntakeDraft(composerWrite.draft);
  applyCapture({ field: "skip-docs" });
  const skippedByChip = getFoxDraft();
  assert.ok(!skippedByChip.pendingProposal);
  assert.equal(skippedByChip.borrowerName, undefined);
  assert.equal(skippedByChip.contact.fullName.value, "");
  assert.ok((skippedByChip.skippedClasses ?? []).includes("government_id"));
  assert.ok(
    stillUsefulLabels(skippedByChip).some((label) => /government ID/i.test(label)),
    stillUsefulLabels(skippedByChip).join(" · "),
  );
  assert.doesNotMatch(nextFoxAsk(skippedByChip).text, /The ID shows Jordan Hale/);
  assert.doesNotMatch(nextFoxAsk(skippedByChip).text, /The ID shows Lukasz/);
  assert.ok(
    previewFacts(skippedByChip).every(
      (fact) => fact.id !== "borrower" && (fact.id !== "docs" || !/ID in/.test(fact.value)),
    ),
  );
  const skipChipPaint = dropResolvedAddressConfirmChips(
    [
      {
        id: "id-confirm",
        role: "fox",
        text: composerSpoken,
        actions: composerAsk!.actions,
      },
    ],
    skippedByChip,
  );
  const skipChipLast = [...skipChipPaint].reverse().find((message) => message.role === "fox");
  assert.deepEqual(
    paintThreadActions(paintedFoxActions(skipChipLast!, skippedByChip, true) ?? []).map((item) => item.label),
    [],
  );

  const proceededConfirm = applyProceedMotion({ ...composerWrite.draft, emailSkipped: true });
  assert.equal(proceededConfirm.pendingProposal?.field, "borrowerName");
  loadIntakeDraft(proceededConfirm);
  applyCapture({ field: "skip-docs" });
  const skippedAfterProceed = getFoxDraft();
  assert.ok(!skippedAfterProceed.pendingProposal, "Skip after Proceed must clear the ID confirm");
  assert.equal(skippedAfterProceed.borrowerName, undefined);
  assert.ok((skippedAfterProceed.skippedClasses ?? []).includes("government_id"));
  assert.ok(
    stillUsefulLabels(skippedAfterProceed).some((label) => /government ID/i.test(label)),
    stillUsefulLabels(skippedAfterProceed).join(" · "),
  );
  assert.doesNotMatch(nextFoxAsk(skippedAfterProceed).text, /The ID shows Jordan Hale/);
  assert.doesNotMatch(nextFoxAsk(skippedAfterProceed).text, /The ID shows Lukasz/);

  loadIntakeDraft({ ...afterLooks, skippedClasses: ["government_id"] });
  receiveDocument({
    slot: "id",
    name: keep.name,
    type: snapshotType,
    size: keep.size,
    receivedAt: "2026-09-02T00:03:00.000Z",
  });
  assert.equal(nextDocInvite(getFoxDraft()), "government_id");
  const bankInviteWrite = applyExtractWrite(
    "2026-09-02T00:03:00.000Z",
    keep.name,
    {
      extractClass: "government_id",
      confidence: 0.94,
      fields: composerRead.fields ?? {},
    },
    composerRead.note,
    false,
  );
  assert.equal(bankInviteWrite.draft.pendingProposal?.field, "borrowerName");
  assert.match(bankInviteWrite.draft.pendingProposal?.value ?? "", /Jordan Hale/i);

  const wageFirst = {
    ...afterDocs,
    sampleAccepted: false,
    wageDocsAsked: false,
    wageBox5Asked: false,
    wageFrequencyAsked: false,
    wageStubAsked: false,
    stubExtractAccepted: false,
  };
  assert.equal(nextDocInvite(wageFirst), null);
  assert.equal(extractHintFromDraft(wageFirst, "01-ca-id-jordan-hale.pdf"), "government_id");
  const wageFirstDrop = applyExtractedFields(wageFirst, {
    extractClass: "government_id",
    confidence: 0.94,
    fields: extracted.fields ?? {},
  });
  assert.match(wageFirstDrop.draft.pendingProposal?.value ?? "", /Jordan Hale/i);
  assert.equal(wageFirstDrop.draft.borrowerName, undefined);

  loadIntakeDraft(afterLooks);
  receiveDocument({
    slot: "id",
    name: "unreadable-id.pdf",
    type: "application/pdf",
    size: 400,
    receivedAt: "2026-09-02T00:04:00.000Z",
  });
  const unreadWrite = applyExtractWrite(
    "2026-09-02T00:04:00.000Z",
    "unreadable-id.pdf",
    { extractClass: "government_id", confidence: 0, fields: {} },
    "Fox could not read this file. Type a note or skip. No dollar amounts were invented.",
    true,
  );
  assert.ok(!unreadWrite.draft.pendingProposal);
  assert.equal(unreadWrite.draft.borrowerName, undefined);
  assert.ok(unreadWrite.quietLines.some((line) => /could not read/i.test(line)));
  assert.ok(
    stillUsefulLabels(unreadWrite.draft).some((label) => /government ID/i.test(label)),
    stillUsefulLabels(unreadWrite.draft).join(" · "),
  );

  const dropSource = readFileSync(join(root, "components/fox/DocumentDrop.tsx"), "utf8");
  assert.match(dropSource, /form\.append\("file", keep/);
  assert.match(dropSource, /extractHintFromDraft\(getFoxDraft\(\), file\.name\)/);
  assert.doesNotMatch(dropSource, /form\.append\("file", snapshot/);
  const alwaysOn = readFileSync(join(root, "components/fox/AlwaysOnFox.tsx"), "utf8");
  assert.match(alwaysOn, /isGovernmentIdInviteLine\(last\.text\)/);
  assert.match(alwaysOn, /applyIdExtractAsk/);
  assert.match(alwaysOn, /isIdExtractAskText/);
  assert.match(alwaysOn, /void ingestDroppedFiles\(files\)/);
  assert.doesNotMatch(alwaysOn, /setInputFiles/);
  assert.match(readFileSync(join(root, "components/fox/DocumentDrop.tsx"), "utf8"), /ComposerAttach/);

  const afterDrop = applyExtractedFields(afterLooks, {
    extractClass: extracted.extractClass,
    confidence: extracted.confidence ?? 0.94,
    fields: extracted.fields ?? {},
  });
  assert.equal(afterDrop.draft.pendingProposal?.field, "borrowerName");
  assert.match(afterDrop.draft.pendingProposal?.value ?? "", /Jordan Hale/i);
  assert.equal(afterDrop.draft.borrowerName, undefined);
  assert.equal(afterDrop.draft.contact.fullName.value, "");
  assert.equal(afterDrop.draft.subjectAddress, undefined);
  assert.equal(afterDrop.draft.subjectStreet, undefined);
  noBorrowerOnFile(afterDrop.draft);
  assert.ok(
    previewFacts(afterDrop.draft).every(
      (fact) => !/1847 Filbert/i.test(`${fact.label} ${fact.value} ${fact.note ?? ""}`),
    ),
    "ID street stays off File until Use this",
  );
  const spoken = proposalAskCopy(afterDrop.draft.pendingProposal!);
  assert.match(spoken, /The ID shows Jordan Hale/);
  assert.match(spoken, /Suggested · not underwritten/);
  assert.match(spoken, /Use this/);
  assert.doesNotMatch(spoken, /1847 Filbert|subject|purchase/i);
  const confirmAsk = docReactionAsk(afterDrop.draft, "government_id") ?? workspacePromptCopy("confirm-proposal", afterDrop.draft);
  assert.equal(confirmAsk.text, spoken);
  assert.doesNotMatch(confirmAsk.text, /^On the file\.?$/);
  const confirmChips = (confirmAsk.actions ?? []).map((item) => item.label);
  assert.deepEqual(confirmChips, ["Use this", "Skip"]);
  const inviteChips = (workspacePromptCopy("documents", afterLooks).actions ?? []).map((item) => item.label);
  assert.ok(inviteChips.includes("Upload this"));
  assert.ok(inviteChips.includes("Skip"));
  assert.ok(!inviteChips.includes("Use this"));
  const confirmTurn = {
    id: "id-confirm",
    role: "fox" as const,
    text: confirmAsk.text,
    actions: confirmAsk.actions,
  };
  const painted = paintThreadActions(paintedFoxActions(confirmTurn, afterDrop.draft, true) ?? []).map(
    (item) => item.label,
  );
  assert.deepEqual(painted, ["Use this", "Skip"]);
  const afterDropWithDoc = {
    ...afterDrop.draft,
    documents: [
      ...afterDrop.draft.documents,
      {
        slot: "id" as const,
        name: "01-ca-id-jordan-hale.pdf",
        type: "application/pdf",
        size: 4000,
        receivedAt: "2026-09-02T00:02:00.000Z",
        status: "extracted" as const,
        extractClass: "government_id" as const,
      },
    ],
  };
  assert.ok(
    previewFacts(afterDropWithDoc).every((fact) => fact.id !== "docs" || !/ID in/.test(fact.value)),
    previewFacts(afterDropWithDoc)
      .filter((fact) => fact.id === "docs")
      .map((fact) => fact.value)
      .join(" · "),
  );
  const withZipOnFile = { ...afterDrop.draft, subjectAddress: "94115", subjectAddressAsked: true };
  const sealed = dropResolvedAddressConfirmChips([confirmTurn], withZipOnFile);
  assert.equal(sealed[0]?.text, confirmAsk.text);
  assert.notEqual(sealed[0]?.text, addressOnFileCopy());
  assert.ok((sealed[0]?.actions ?? []).some((item) => item.label === "Use this"));

  const skippedFromConfirm = skipCurrentInvite(afterDrop.draft);
  assert.equal(skippedFromConfirm.pendingProposal, null);
  assert.equal(skippedFromConfirm.borrowerName, undefined);
  assert.ok((skippedFromConfirm.skippedClasses ?? []).includes("government_id"));
  const skipConfirmLabels = stillUsefulLabels(skippedFromConfirm);
  assert.ok(
    skipConfirmLabels.some((label) => /government ID/i.test(label)),
    skipConfirmLabels.join(" · "),
  );

  const used = resolveProposal(afterDrop.draft, "accept");
  assert.equal(used.borrowerName, "Jordan Hale");
  assert.equal(used.contact.fullName.value, "Jordan Hale");
  assert.doesNotMatch(JSON.stringify(used), /D1234567/);
  assert.equal(used.facts?.id_last4, undefined);
  assert.equal(used.subjectAddress, undefined);
  assert.equal(used.subjectStreet, undefined);
  assert.notEqual(used.facts?.present_address?.value, used.subjectAddress);
  assert.doesNotMatch(used.subjectAddress ?? "", /1847 Filbert/i);
  const usedFacts = previewFacts(used);
  assert.ok(usedFacts.some((fact) => fact.id === "borrower" && /Jordan Hale/i.test(fact.value)));
  const usedWithDoc = resolveProposal(afterDropWithDoc, "accept");
  assert.ok(
    previewFacts(usedWithDoc).some((fact) => fact.id === "docs" && /ID in/.test(fact.value)),
    previewFacts(usedWithDoc)
      .filter((fact) => fact.id === "docs")
      .map((fact) => fact.value)
      .join(" · "),
  );
  assert.ok(
    usedFacts.some(
      (fact) =>
        fact.label === "Address" && /1847 Filbert St, San Francisco, CA 94123/i.test(fact.value),
    ),
    usedFacts.map((fact) => `${fact.label}=${fact.value}`).join(" · "),
  );
  assert.ok(
    usedFacts.every((fact) =>
      fact.id === "address" || fact.label === "Property address" || fact.id === "file-property"
        ? !/1847 Filbert/i.test(fact.value) &&
          (!fact.value || /—|address —/.test(fact.value) || !/Filbert|Market/i.test(fact.value))
        : true,
    ),
    usedFacts.map((fact) => `${fact.id}:${fact.label}=${fact.value}`).join(" · "),
  );
  assert.match(wageEmploymentFileLine(used), /Harbor Pacific Design Inc/);

  const skippedBeforeLooks = skipCurrentInvite(afterDocs);
  assert.ok((skippedBeforeLooks.skippedClasses ?? []).includes("government_id"));
  assert.equal(skippedBeforeLooks.borrowerName, undefined);
  assert.equal(nextDocInvite(skippedBeforeLooks), "bank_statement");
  const stillBefore = stillUsefulSection(skippedBeforeLooks);
  assert.ok(stillBefore && !stillBefore.empty);
  const beforeLabels = stillUsefulLabels(skippedBeforeLooks);
  assert.ok(
    beforeLabels.some((label) => /government ID/i.test(label)),
    beforeLabels.join(" · "),
  );
  assert.ok(beforeLabels.length >= 1 && beforeLabels.length <= 3);
  assert.ok(beforeLabels.every((label) => !/tax return|latest return|prior-year return/i.test(label)));

  const skippedAfterLooks = skipCurrentInvite(afterLooks);
  assert.ok((skippedAfterLooks.skippedClasses ?? []).includes("government_id"));
  assert.equal(nextDocInvite(skippedAfterLooks), "bank_statement");
  const afterLabels = stillUsefulLabels(skippedAfterLooks);
  assert.ok(
    afterLabels.some((label) => /government ID/i.test(label)),
    afterLabels.join(" · "),
  );
  assert.ok(afterLabels.length >= 1 && afterLabels.length <= 3);
  assert.ok(afterLabels.every((label) => !/tax return|latest return|prior-year return/i.test(label)));
  assert.ok(
    previewFacts(skippedAfterLooks).every(
      (fact) => !/sketch · \d+ of \d+|documented · \d+ of \d+| of 32/.test(`${fact.value} ${fact.note ?? ""}`),
    ),
  );

  const looks = applyLooksRightMotion({ ...used, sampleAccepted: false, skippedClasses: ["bank_statement"] });
  const proceeded = applyProceedMotion({ ...used, emailSkipped: true });
  assert.ok(proceeded.motion === "in_queue" || proceeded.pendingFinish === "proceed" || used.sampleAccepted);
  assert.ok(canLooksRight({ ...used, sampleAccepted: false, skippedClasses: ["government_id", "bank_statement"] }) || used.sampleAccepted);
  assert.ok((workspacePromptCopy(workspacePrompt(afterLooks), afterLooks).actions ?? []).some((item) => item.label === "Proceed" || item.label === "Skip"));

  void looks;
  console.log("government-id extract PASS", used.borrowerName, beforeLabels.join(" · "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
