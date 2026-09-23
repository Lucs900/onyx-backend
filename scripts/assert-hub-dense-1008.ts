/**
 * Hub v0 dense 1008 staff grid. Shells always present. Empty = muted —.
 * Spine 4cc75b7 stays closed: same file_id, foxLine, finish chips, loud numbers.
 */
import assert from "node:assert/strict";
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
  HUB_LOUD_A_IDS,
  HUB_LOUD_B_IDS,
  HUB_PAY_IDS,
  HUB_STATE_IDS,
  applyStaffDeskSend,
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
  assert.deepEqual(
    empty.loud.map((row) => row.label),
    ["PROD", "PURP", "OCC", "BORS", "VAL", "1ST", "LINE", "LTV", "CLTV", "RATE", "IO", "FICO"],
  );
  assert.deepEqual(empty.loud.map((row) => row.id), [...HUB_LOUD_A_IDS, ...HUB_LOUD_B_IDS]);
  assert.ok(empty.loud.every((row) => row.value === HUB_EMPTY));
  assert.equal(empty.loud.length, 12);
  assert.deepEqual(empty.pay.map((row) => row.label), ["QI", "DEBT"]);
  assert.deepEqual(empty.pay.map((row) => row.id), [...HUB_PAY_IDS]);
  assert.ok(empty.pay.every((row) => row.value === HUB_EMPTY));
  assert.deepEqual(empty.state.rows.map((row) => row.label), ["STAT", "NEXT"]);
  assert.deepEqual(empty.state.rows.map((row) => row.id), [...HUB_STATE_IDS]);
  assert.deepEqual(empty.state.quietFlags, []);
  assert.doesNotMatch(JSON.stringify(empty), /SSN|AU\b|lock desk|green approved/i);

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
  assert.equal(hub.loud.length, 12);
  assert.equal(hub.pay.length, 2);
  assert.equal(hub.state.rows.length, 2);
  assert.equal(hubLoudRows(filled).find((row) => row.id === "home")?.value, "$500,000");
  assert.equal(hubLoudRows(filled).find((row) => row.id === "first-lien")?.value, "$400,000");
  assert.equal(hubLoudRows(filled).find((row) => row.id === "line")?.value, "$50,000");
  assert.match(hubLoudRows(filled).find((row) => row.id === "cltv")?.value ?? "", /90/);
  assert.match(hubLoudRows(filled).find((row) => row.id === "io")?.value ?? "", /\$367/);
  assert.equal(hubLoudRows(filled).find((row) => row.id === "credit")?.value, "760+");
  assert.equal(hub.loud.find((row) => row.id === "product")?.value, "HELOC");
  assert.equal(hub.loud.find((row) => row.id === "occupancy")?.value, "Primary");
  assert.equal(hub.loud.find((row) => row.id === "borrowers")?.value, "1");
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
  assert.equal(hubPayRows(emptyDraft()).length, 2);
  assert.equal(hubStateRows(emptyDraft()).length, 2);

  console.log(
    `assert-hub-dense-1008: 12+2+2 shells; empty ${HUB_EMPTY}; loud $50,000 / $367 / 90%; flags true-only; desk Send keeps finish chips`,
  );
}

main();
