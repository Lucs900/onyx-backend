/**
 * Hub v0 dense 1008 staff grid. Shells always present. Empty = muted —.
 * Spine 4cc75b7 stays closed: same file_id, foxLine, finish chips, loud numbers.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyDraft, ensureFileId } from "../components/fox/store";
import { applyCouponChoice } from "../components/fox/liveCoupon";
import { skipCurrentInvite } from "../components/fox/fileWrite";
import { applyLooksRightMotion, applyProceedMotion, finishLineActions } from "../components/fox/motion";
import { withLinkedAccount } from "../components/fox/account";
import { skipMonthlyDebts } from "../components/fox/monthlyDebts";
import { skipWageDocs } from "../components/fox/qualifyingIncome";
import { writeWhoOnLoan } from "../components/fox/whoOnLoan";
import { withHelocToolQuote, writeFirstLien, writeHelocLine } from "../components/fox/heloc";
import { writePurchasePrice } from "../components/fox/workspace";
import {
  HUB_EMPTY,
  HUB_GRID_IDS,
  HUB_GRID_LABELS,
  HUB_LOUD_STRIP_IDS,
  HUB_PAY_IDS,
  HUB_STATE_IDS,
  applyStaffDeskSend,
  hubGridRows,
  hubHasForbidden,
  hubLoudRows,
  hubPayRows,
  hubQuietFlags,
  hubStateRows,
  processingHubView,
  staffDeskKeepsFinishChips,
  STAFF_W2_FOX_LINE,
} from "../components/fox/processingHub";
import type { FoxIntakeDraft } from "../components/fox/types";

function labels(actions: { label: string }[] | undefined) {
  return (actions ?? []).map((item) => item.label);
}

function houseHeloc(): FoxIntakeDraft {
  return {
    ...emptyDraft(),
    path: "acr",
    productIntent: "heloc",
    workspaceFlow: true,
    occupancyAsked: true,
    occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
    timelineAsked: true,
    timelineChoice: { ...emptyDraft().timelineChoice, value: "ready-now" },
    propertyType: "sfr",
    propertyTypeAsked: true,
    creditAsked: true,
    creditBand: "760+",
    propertyZip: "94123",
    propertyZipAsked: true,
    subjectCity: "San Francisco",
    subjectState: "CA",
  };
}

function main() {
  const empty = processingHubView(emptyDraft());
  assert.deepEqual(empty.grid.map((row) => row.label), [...HUB_GRID_LABELS]);
  assert.deepEqual(empty.grid.map((row) => row.id), [...HUB_GRID_IDS]);
  assert.ok(empty.grid.every((row) => row.value === HUB_EMPTY || row.id === "status" || row.id === "next"));
  assert.equal(empty.grid.length, 15);
  assert.ok(!empty.grid.some((row) => row.label === "DEBT" || row.id === "debts"));
  assert.deepEqual(empty.loud.map((row) => row.id), [...HUB_LOUD_STRIP_IDS]);
  assert.ok(empty.loud.every((row) => row.loud === true || row.value === HUB_EMPTY));
  assert.deepEqual(empty.pay.map((row) => row.label), ["QI"]);
  assert.deepEqual(empty.pay.map((row) => row.id), [...HUB_PAY_IDS]);
  assert.deepEqual(empty.state.rows.map((row) => row.label), ["Status", "Next"]);
  assert.deepEqual(empty.state.rows.map((row) => row.id), [...HUB_STATE_IDS]);
  assert.deepEqual(empty.state.quietFlags, []);
  assert.doesNotMatch(JSON.stringify(empty), /SSN|AU\b|lock desk|green approved/i);

  const quotedFile = writeHelocLine(writeFirstLien(writePurchasePrice(houseHeloc(), 500_000), 400_000), 50_000);
  const quotedHub = processingHubView(quotedFile);
  assert.match(quotedHub.loud.find((row) => row.id === "rate")?.value ?? "", /8\.80%/);
  assert.equal(quotedHub.loud.find((row) => row.id === "io")?.value, "$367");
  const staleRate = {
    ...quotedFile,
    liveQuote: {
      key: "heloc-stale-rate-only",
      rate: 8.8,
      asOf: "2026-09-22T00:00:00.000Z",
      kind: "heloc" as const,
    },
    liveQuoteKey: "heloc-stale-rate-only",
    liveQuoteStatus: "ready" as const,
  };
  assert.equal(hubLoudRows(staleRate).find((row) => row.id === "io")?.value, "$367");
  assert.ok(["preparing", "gathering"].includes(hubStateRows(quotedFile).find((row) => row.id === "status")?.value ?? ""));

  const filled = ensureFileId(
    applyProceedMotion(
      withLinkedAccount(
        applyLooksRightMotion(
          skipCurrentInvite(
            skipWageDocs(
              skipMonthlyDebts(
                writeWhoOnLoan(
                  {
                    ...applyCouponChoice(
                      withHelocToolQuote(
                        writeHelocLine(writeFirstLien(writePurchasePrice(houseHeloc(), 500_000), 400_000), 50_000),
                      ),
                      "this",
                    ),
                    incomeAsked: true,
                    incomeType: { ...emptyDraft().incomeType, value: "w2" },
                  },
                  "just-me",
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
  const hub = processingHubView(filled);
  assert.equal(hub.grid.length, 15);
  assert.deepEqual(hub.grid.map((row) => row.label), [...HUB_GRID_LABELS]);
  assert.equal(hub.loud.length, 8);
  assert.equal(hub.pay.length, 1);
  assert.equal(hub.state.rows.length, 2);
  const midFile = ensureFileId({
    ...writePurchasePrice(houseHeloc(), 500_000),
    motion: "gathering",
    nextActor: "You",
    waitingOn: "borrower",
  });
  const midHub = processingHubView(midFile);
  assert.equal(midHub.grid.find((row) => row.id === "home")?.value, "$500,000");
  assert.equal(midHub.grid.find((row) => row.id === "first-lien")?.value, HUB_EMPTY);
  assert.equal(midHub.grid.find((row) => row.id === "product")?.value, "HELOC");
  assert.equal(midHub.grid.find((row) => row.id === "occupancy")?.value, "Primary");
  assert.equal(midHub.grid.find((row) => row.id === "status")?.value, "gathering");
  assert.equal(hubGridRows(midFile).find((row) => row.label === "Lien")?.value, HUB_EMPTY);
  assert.equal(hubLoudRows(filled).find((row) => row.id === "home")?.value, "$500,000");
  assert.equal(hubLoudRows(filled).find((row) => row.id === "first-lien")?.value, "$400,000");
  assert.equal(hubLoudRows(filled).find((row) => row.id === "line")?.value, "$50,000");
  assert.match(hubLoudRows(filled).find((row) => row.id === "cltv")?.value ?? "", /90/);
  assert.match(hubLoudRows(filled).find((row) => row.id === "io")?.value ?? "", /\$367/);
  assert.equal(hubLoudRows(filled).find((row) => row.id === "credit")?.value, "760+");
  assert.equal(hub.grid.find((row) => row.id === "product")?.value, "HELOC");
  assert.equal(hub.grid.find((row) => row.id === "occupancy")?.value, "Primary");
  assert.equal(hub.grid.find((row) => row.id === "borrowers")?.value, "1");
  assert.ok(!hubQuietFlags(filled).includes("INV"));
  assert.ok(!hubQuietFlags(filled).includes("C/O"));
  const investment = hubQuietFlags({
    ...filled,
    occupancyChoice: { ...filled.occupancyChoice, value: "investment" },
    cashOut: true,
  });
  assert.ok(investment.includes("INV"));
  assert.ok(investment.includes("C/O"));

  const sent = applyStaffDeskSend(filled, { foxLine: STAFF_W2_FOX_LINE });
  assert.equal(sent.threadLine, STAFF_W2_FOX_LINE);
  assert.ok(staffDeskKeepsFinishChips(sent.draft));
  assert.deepEqual(labels(finishLineActions(sent.draft)).slice(0, 2), ["Ask Fox", "Upload more"]);
  assert.equal(labels(finishLineActions(sent.draft)).at(-1), "Request human");
  assert.equal(hubHasForbidden(JSON.stringify(hub)), false);
  const startWorkspace = readFileSync(new URL("../components/fox/StartWorkspace.tsx", import.meta.url), "utf8");
  assert.match(startWorkspace, /linkedAccountRefreshQuery/);
  assert.match(startWorkspace, /resumeAccountFromQuery/);
  assert.match(startWorkspace, /pageshow/);
  assert.doesNotMatch(startWorkspace, /Open \/start from hub required/);
  assert.doesNotMatch(startWorkspace, /Refresh must paint this staff line/);
  assert.equal(hubPayRows(emptyDraft()).length, 1);
  assert.equal(hubStateRows(emptyDraft()).length, 2);
  assert.equal(hubLoudRows(filled).length, 8);

  console.log(
    `assert-hub-dense-1008: 15 short labels; empty ${HUB_EMPTY}; loud strip $50,000 / $367 / 90%; flags true-only; desk Send keeps finish chips`,
  );
}

main();
