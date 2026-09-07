/**
 * Spine walker — sixteen locked preview cases. Hard Start over each case
 * on one preview session so Vercel SSO does not eat later gotos. Do not
 * reload or goto after the first desk — later navigations hit SSO.
 * Composer-drop extract fulfills leftover-proven local classifyAndExtract
 * so Harbor fixtures settle to Use this, not Upload again.
 * Assert only. Does not invent product behavior.
 * Case 9 is harbor-both-cover-contract. Combined 09-at-price + House-turn
 * Credit (cases 10–11) is the FICO gate. Cases 14–16 are SE cover income
 * (20 → $9,000 · 20 then 11 upgrades · 20 then 19 does not hang).
 * Lukasz Harbor leftovers run from scripts/assert-spine-walker.sh before
 * Playwright. CI fail = red.
 *
 * Run: bash scripts/assert-spine-walker.sh
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAndExtract } from "../../lib/docs/extract";
import type { ExtractClass } from "../../components/fox/types";

const PREVIEW_URL =
  process.env.SPINE_WALKER_URL ??
  "https://onyx-backend-git-cursor-live-rateflow-preview-bc93-onyx-direct.vercel.app/start?path=acr";

const SAMPLE_DOCS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "sample-docs");
const HARBOR_CONTRACT_PDF = join(SAMPLE_DOCS, "09-purchase-contract-88-clipper.pdf");
const HARBOR_DROPS = [
  "03-w2-2025-jordan-hale.pdf",
  "07-paystub-biweekly-loud.pdf",
  "01-ca-id-jordan-hale.pdf",
  "10-1040-schedule-c-2024-hale-design.pdf",
  "19-1040-cover-2024-jordan-hale.pdf",
  "05-bank-statement-pacific-coast-jul-2026.pdf",
  "09-purchase-contract-88-clipper.pdf",
] as const;

const CURRENT = ".fox-bubble--fox.is-current";
const CHIP = ".fox-bubble--fox.is-current button.fox-chip, .fox-bubble--fox.is-current a.fox-chip";
const START_OVER = "button.fox-bar__start-over";
const INPUT = "input.fox-bar__input";
const SEND = "button.fox-bar__send";

class BeatFail extends Error {
  constructor(public beat: string) {
    super(beat);
  }
}

type CaseResult = { n: number; title: string; ok: boolean; beat?: string };

/** Last composer-drop sample. Extract POSTs fulfill leftover-proven local classifyAndExtract. */
let lastDroppedSample: string | null = null;
/** First desk is the only goto. Later Start over must stay on this page. */
let previewDeskOpen = false;

function protectionHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const oidc = process.env.VERCEL_OIDC_TOKEN?.trim();
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (oidc) {
    headers["x-vercel-trusted-oidc-idp-token"] = oidc;
  }
  if (bypass) {
    headers["x-vercel-protection-bypass"] = bypass;
    headers["x-vercel-set-bypass-cookie"] = "true";
  }
  return headers;
}

function startUrl(): string {
  return PREVIEW_URL;
}

function previewAuthKind(): "oidc" | "bypass" | "none" {
  if (process.env.VERCEL_OIDC_TOKEN?.trim()) return "oidc";
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()) return "bypass";
  return "none";
}

async function currentText(page: Page): Promise<string> {
  const loc = page.locator(CURRENT).last();
  if ((await loc.count()) === 0) return "";
  return ((await loc.innerText()) ?? "").replace(/\s+/g, " ").trim();
}

async function currentChips(page: Page): Promise<string[]> {
  return page.locator(CHIP).allTextContents().then((items) =>
    items.map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean),
  );
}

async function waitCurrent(
  page: Page,
  test: (text: string, chips: string[]) => boolean,
  timeout = 20_000,
): Promise<{ text: string; chips: string[] }> {
  const started = Date.now();
  let last = "";
  while (Date.now() - started < timeout) {
    const text = await currentText(page);
    const chips = await currentChips(page);
    last = `${text} | chips: ${chips.join(" · ")}`;
    if (test(text, chips)) return { text, chips };
    await page.waitForTimeout(150);
  }
  throw new BeatFail(`waited for next Fox beat — last: ${last || "(empty thread)"}`);
}

async function waitAsk(page: Page, needle: RegExp, timeout = 20_000) {
  return waitCurrent(page, (text) => needle.test(text), timeout);
}

function hasChip(chips: string[], label: string | RegExp) {
  return chips.some((chip) =>
    typeof label === "string" ? chip === label : label.test(chip),
  );
}

async function clickChip(page: Page, label: string | RegExp) {
  const chip =
    typeof label === "string"
      ? page.locator(".fox-bubble--fox.is-current").getByRole("button", { name: label, exact: true })
      : page.locator(CHIP).filter({ hasText: label });
  if ((await chip.count()) === 0) {
    const chips = await currentChips(page);
    throw new BeatFail(`no chip ${String(label)} — chips: ${chips.join(" · ") || "(none)"}`);
  }
  let last = await currentText(page);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const before = await currentText(page);
    await chip.first().click();
    try {
      const next = await waitCurrent(page, (text) => text !== before, 4_000);
      return next;
    } catch {
      last = await currentText(page);
    }
  }
  throw new BeatFail(`chip ${String(label)} did not advance Fox — ${last}`);
}

function escapeRe(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function dismissPlaces(page: Page) {
  const list = page.locator("ul.fox-bar__suggest");
  if (await list.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(120);
  }
}

async function typeSend(page: Page, value: string) {
  const before = await currentText(page);
  const input = page.locator(INPUT);
  await input.waitFor({ state: "visible", timeout: 10_000 });
  await input.click();
  await input.fill("");
  await input.pressSequentially(value, { delay: 15 });
  await dismissPlaces(page);
  const send = page.locator(SEND);
  await send.waitFor({ state: "visible", timeout: 5_000 });
  if (await send.isDisabled()) {
    await input.press("Enter");
  } else {
    await send.click();
  }
  await waitCurrent(page, (text) => text !== before, 15_000);
}

async function sendZip(page: Page, zip: string, expect: "geo" | "price") {
  await typeSend(page, zip);
  if (expect === "geo") {
    await waitAsk(page, /California only/i, 20_000);
    return;
  }
  await waitCurrent(
    page,
    (text, chips) =>
      /Getting a live line|How is income earned|Pricing when the file is ready|Not a lock/i.test(text) ||
      hasChip(chips, "This one"),
    45_000,
  );
}

async function structureRows(page: Page): Promise<{ label: string; value: string; note: string }[]> {
  const read = (root: string) =>
    page.evaluate((sel) => {
      const box = document.querySelector(sel);
      if (!box) return [] as { label: string; value: string; note: string }[];
      return [...box.querySelectorAll(":scope > .file-preview__row")]
        .map((row) => {
          const label = (row.querySelector(".file-preview__label")?.textContent ?? "")
            .replace(/\s+/g, " ")
            .trim();
          const value = (row.querySelector(".file-preview__value > span")?.textContent ?? "")
            .replace(/\s+/g, " ")
            .trim();
          const note = (row.querySelector(".file-preview__value small")?.textContent ?? "")
            .replace(/\s+/g, " ")
            .trim();
          return { label, value, note };
        })
        .filter((row) => row.label);
    }, root);

  let out = await read(".file-preview__desktop > .file-preview__rows");
  if (out.length === 0) {
    const fileChip = page.locator("button.fox-file-chip");
    if ((await fileChip.count()) > 0) {
      await fileChip.first().click();
      await page.locator(".file-sheet").waitFor({ state: "visible", timeout: 5_000 });
    }
    out = await read(".file-sheet__panel > .file-preview__rows");
    const close = page.locator(".file-sheet__close");
    if ((await close.count()) > 0 && (await close.isVisible().catch(() => false))) {
      await close.click();
    }
  }
  return out;
}

async function structureMap(page: Page): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const row of await structureRows(page)) out[row.label] = row.value;
  return out;
}

function moneyOf(map: Record<string, string>, label: string) {
  return (map[label] ?? "").replace(/\s+/g, " ").trim();
}

function assertCopyChips(text: string, chips: string[]) {
  const lower = text.toLowerCase();
  if (/skip is fine/.test(lower) && !hasChip(chips, "Skip")) {
    throw new BeatFail(`copy/chips disagree — “Skip is fine” but chips: ${chips.join(" · ") || "(none)"}`);
  }
  if (/use this\?/.test(lower) && !hasChip(chips, "Use this")) {
    throw new BeatFail(`copy/chips disagree — Use this? but chips: ${chips.join(" · ") || "(none)"}`);
  }
  if (/loan is larger than the purchase price/.test(lower)) {
    const need = ["Purchase price", "Down payment", "Loan amount"];
    const missing = need.filter((label) => !hasChip(chips, label));
    const thatsRight = hasChip(chips, /That['’]s right/);
    if (missing.length || !thatsRight) {
      throw new BeatFail(
        `copy/chips disagree — conflict copy vs chips: ${chips.join(" · ") || "(none)"}`,
      );
    }
  }
  const moneyAsk =
    /what.?s the purchase price|down payment or loan amount|what.?s the down payment\b|what.?s the loan amount/i.test(
      text,
    ) && !/loan is larger/.test(lower);
  if (moneyAsk && (hasChip(chips, "Not sure") || hasChip(chips, "Skip for now"))) {
    throw new BeatFail(`copy/chips disagree — money ask painted ${chips.join(" · ")}`);
  }
  if (/how is income earned/i.test(text) && chips.some((chip) => /zip|california only/i.test(chip))) {
    throw new BeatFail(`copy/chips disagree — income ask with ZIP chips: ${chips.join(" · ")}`);
  }
}

function startOverButton(page: Page) {
  return page.getByRole("button", { name: /^Start over$/i }).or(page.locator(START_OVER));
}

async function pageBlob(page: Page) {
  const url = page.url();
  const body = ((await page.locator("body").innerText().catch(() => "")) ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  return `url ${url} — ${body || "(empty)"}`;
}

async function assertGate(page: Page) {
  const url = page.url();
  const body = ((await page.locator("body").innerText().catch(() => "")) ?? "").slice(0, 800);
  if (
    /vercel\.com\/sso|sso-api|vercel\.com\/login/i.test(url) ||
    /Login to Vercel|Sign in to continue to Vercel|Deployment Protection|Authentication Required/i.test(
      body,
    )
  ) {
    throw new BeatFail(
      "Vercel SSO / Deployment Protection — set VERCEL_AUTOMATION_BYPASS_SECRET or VERCEL_OIDC_TOKEN",
    );
  }
}

async function waitStartOverVisible(page: Page, timeout = 20_000) {
  const fox = page.locator("#fox-panel, .fox-bar__head, .start-workspace__fox, .fox-stage--workspace");
  await fox.first().waitFor({ state: "visible", timeout }).catch(() => null);
  try {
    await startOverButton(page).waitFor({ state: "visible", timeout });
  } catch {
    throw new BeatFail(`Start over timeout — ${await pageBlob(page)}`);
  }
}

async function openStartDesk(page: Page) {
  await page.goto(startUrl(), { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(400);
  await assertGate(page);
  try {
    await waitStartOverVisible(page, 20_000);
  } catch {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    await assertGate(page);
    await waitStartOverVisible(page, 15_000);
  }
}

async function probeAccess(page: Page) {
  await openStartDesk(page);
  previewDeskOpen = true;
}

async function waitBuyChip(page: Page) {
  await page.locator(".fox-bubble--fox.is-current").getByRole("button", { name: "Buy", exact: true }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
}

async function hardStartOver(page: Page) {
  if (!previewDeskOpen) {
    await openStartDesk(page);
    previewDeskOpen = true;
  } else {
    await assertGate(page);
  }
  await page.locator(".fox-bubble--fox.is-current").waitFor({ state: "visible", timeout: 15_000 }).catch(() => null);
  await page
    .locator("button.fox-file-chip, .file-preview, .fox-bar__head, .start-workspace__fox")
    .first()
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => null);
  await waitStartOverVisible(page, 20_000);
  await startOverButton(page).click({ timeout: 15_000 });
  await page.waitForTimeout(400);
  try {
    await waitBuyChip(page);
  } catch {
    throw new BeatFail(`Start over did not restore Buy — ${await pageBlob(page)}`);
  }
}

async function walkBuyPrimary(page: Page) {
  await clickChip(page, "Buy");
  await waitAsk(page, /How will the property be used/i);
  const occ = await currentChips(page);
  assertCopyChips(await currentText(page), occ);
  await clickChip(page, "Primary");
  await waitAsk(page, /purchase price/i);
  assertCopyChips(await currentText(page), await currentChips(page));
}

async function writePrice(page: Page, dollars: string) {
  await waitAsk(page, /purchase price/i);
  assertCopyChips(await currentText(page), await currentChips(page));
  await typeSend(page, dollars);
}

async function acceptFundsTwenty(page: Page, expected = /\$100,000 down · \$400,000 loan/i) {
  await waitAsk(page, expected);
  const { text, chips } = { text: await currentText(page), chips: await currentChips(page) };
  assertCopyChips(text, chips);
  if (!hasChip(chips, "Use this")) {
    throw new BeatFail(`20 did not offer Use this — ${text} | ${chips.join(" · ")}`);
  }
  await clickChip(page, "Use this");
}

async function acceptOfferedFunds(page: Page) {
  await waitAsk(page, /down · .+ loan\. Use this\?/i);
  assertCopyChips(await currentText(page), await currentChips(page));
  await clickChip(page, "Use this");
}

async function assertFundsWrite(page: Page, price = "$500,000") {
  await page.waitForTimeout(300);
  const map = await structureMap(page);
  const down = moneyOf(map, "Down payment");
  const loan = moneyOf(map, "Loan amount");
  const shownPrice = moneyOf(map, "Purchase price");
  if (shownPrice && shownPrice !== "—" && shownPrice !== price) {
    throw new BeatFail(`Structure/chat disagree — Purchase price ${shownPrice}, chat wrote ${price}`);
  }
  if (down !== "$100,000") {
    throw new BeatFail(`Structure/chat disagree — Down payment ${down || "(missing)"}, chat Use this $100,000`);
  }
  if (loan !== "$400,000") {
    throw new BeatFail(`Structure/chat disagree — Loan amount ${loan || "(missing)"}, chat Use this $400,000`);
  }
  if (loan === "$1,000,000" || down === "$1,000,000") {
    throw new BeatFail(`write did not kill the old number — Down ${down} Loan ${loan}`);
  }
}

async function walkHouseCredit(page: Page) {
  await waitAsk(page, /House, condo, or 2–4|What kind of home/i);
  assertCopyChips(await currentText(page), await currentChips(page));
  await clickChip(page, "House");
  await waitAsk(page, /estimated FICO|credit/i);
  await clickChip(page, "760+");
}

async function walkToQuotedIncome(page: Page, zip = "94123", allowPricingSkip = false) {
  await walkBuyPrimary(page);
  await writePrice(page, "850000");
  await waitAsk(page, /down payment or loan amount/i);
  await typeSend(page, "20");
  await acceptOfferedFunds(page);
  await walkHouseCredit(page);
  await waitAsk(page, /address or ZIP/i);
  await sendZip(page, zip, "price");
  await settleQuoteToIncome(page, allowPricingSkip, zip);
}

async function settleQuoteToIncome(page: Page, allowPricingSkip = false, zip = "94123") {
  await waitCurrent(
    page,
    (text, chips) =>
      /How is income earned|Getting a live line|This one|Pricing when the file is ready|Not a lock/i.test(text) ||
      hasChip(chips, "This one"),
    45_000,
  );
  let leftZip = false;
  let resentZip = false;
  let retriedRate = false;
  const started = Date.now();
  while (Date.now() - started < 90_000) {
    const text = await currentText(page);
    const chips = await currentChips(page);
    if (!text.trim()) {
      await page.waitForTimeout(150);
      continue;
    }
    const onZip =
      /(?:California only|address or ZIP of the home|What ZIP is the property)/i.test(text) &&
      !/How is income earned|Getting a live line|Not a lock/i.test(text);
    if (!onZip) leftZip = true;
    if (leftZip && onZip) {
      if (!resentZip) {
        resentZip = true;
        leftZip = false;
        await typeSend(page, zip);
        continue;
      }
      throw new BeatFail(
        `94123 wait ended on ZIP, not income — ${text} | ${chips.join(" · ")}`,
      );
    }
    if (/How is income earned/i.test(text)) {
      assertCopyChips(text, chips);
      return;
    }
    if (hasChip(chips, "This one")) {
      await clickChip(page, "This one");
      await waitAsk(page, /How is income earned/i, 20_000);
      assertCopyChips(await currentText(page), await currentChips(page));
      return;
    }
    if (/Pricing when the file is ready/i.test(text)) {
      if (hasChip(chips, "Try again") && !retriedRate) {
        retriedRate = true;
        await clickChip(page, "Try again");
        continue;
      }
      if (!allowPricingSkip) {
        throw new BeatFail(`94123 did not price — ${text} | ${chips.join(" · ")}`);
      }
      if (hasChip(chips, "Skip")) {
        await page
          .locator(".fox-bubble--fox.is-current")
          .getByRole("button", { name: "Skip", exact: true })
          .click();
      } else {
        await typeSend(page, "Skip");
      }
      await waitAsk(page, /How is income earned/i, 20_000);
      return;
    }
    await page.waitForTimeout(250);
  }
  throw new BeatFail(`94123 did not price through to income — ${await currentText(page)}`);
}

async function walkToDebts(page: Page) {
  await walkToQuotedIncome(page, "94123", true);
  await clickChip(page, "W-2");
  await waitCurrent(
    page,
    (text, chips) =>
      /other monthly debts/i.test(text) ||
      /Drop last year.?s W-2|government ID|How is income earned/i.test(text) ||
      hasChip(chips, "Skip"),
    20_000,
  );
  if (/How is income earned/i.test(await currentText(page))) {
    throw new BeatFail(`W-2 did not leave the income ask — ${await currentText(page)}`);
  }
  if (!/other monthly debts/i.test(await currentText(page))) {
    // Years leftover is SE-only; W-2 should hit debts next. If wage docs arrived first, still fail the order.
    throw new BeatFail(`after W-2 expected debts ask — ${await currentText(page)} | ${(await currentChips(page)).join(" · ")}`);
  }
}

async function skipWageAndIdToBank(page: Page) {
  const started = Date.now();
  while (Date.now() - started < 40_000) {
    const text = await currentText(page);
    const chips = await currentChips(page);
    assertCopyChips(text, chips);
    if (/Two recent statements|second recent statement/i.test(text)) return;
    if (/other monthly debts/i.test(text) && hasChip(chips, "Skip")) {
      await clickChip(page, "Skip");
      await page.waitForTimeout(250);
      continue;
    }
    if (/Drop last year.?s W-2|paystub/i.test(text) && hasChip(chips, "Skip")) {
      await clickChip(page, "Skip");
      await page.waitForTimeout(250);
      continue;
    }
    if (/government ID/i.test(text) && hasChip(chips, "Skip")) {
      await clickChip(page, "Skip");
      await page.waitForTimeout(250);
      continue;
    }
    if (hasChip(chips, "Skip") && /Box 5|pay frequency|monthly from the stub/i.test(text)) {
      await clickChip(page, "Skip");
      await page.waitForTimeout(250);
      continue;
    }
    await page.waitForTimeout(200);
  }
  throw new BeatFail(`did not reach statements — ${await currentText(page)} | ${(await currentChips(page)).join(" · ")}`);
}

async function case1(page: Page) {
  await hardStartOver(page);
  await walkBuyPrimary(page);
  await writePrice(page, "500000");
  await waitAsk(page, /down payment or loan amount/i);
  assertCopyChips(await currentText(page), await currentChips(page));
  await typeSend(page, "20");
  await acceptFundsTwenty(page);
  await waitCurrent(page, (text, chips) => !hasChip(chips, "Use this") || /kind of home|House, condo/i.test(text));
  const after = await currentChips(page);
  if (hasChip(after, "Use this") && /\$100,000 down · \$400,000 loan/i.test(await currentText(page))) {
    throw new BeatFail("Use this offered a second time after the funds write");
  }
  await assertFundsWrite(page);
}

async function case2(page: Page) {
  await hardStartOver(page);
  await walkBuyPrimary(page);
  await writePrice(page, "500000");
  await waitAsk(page, /down payment or loan amount/i);
  await typeSend(page, "1000000");
  await waitAsk(page, /loan is larger than the purchase price/i);
  const conflict = await currentChips(page);
  assertCopyChips(await currentText(page), conflict);
  await clickChip(page, "Down payment");
  await waitAsk(page, /down payment/i);
  if (/loan is larger/.test(await currentText(page))) {
    throw new BeatFail("Down payment did not leave the conflict ask");
  }
  const afterDown = await structureMap(page);
  if (moneyOf(afterDown, "Loan amount") === "$1,000,000") {
    throw new BeatFail("write did not kill the old number — Loan amount still $1,000,000 after Down payment");
  }
  assertCopyChips(await currentText(page), await currentChips(page));
  await typeSend(page, "20");
  await acceptFundsTwenty(page);
  if (/loan is larger/.test(await currentText(page))) {
    throw new BeatFail("second conflict after Use this");
  }
  await assertFundsWrite(page);
}

async function case3(page: Page) {
  await hardStartOver(page);
  await walkBuyPrimary(page);
  const priceAsk = await currentText(page);
  const priceChips = await currentChips(page);
  assertCopyChips(priceAsk, priceChips);
  if (hasChip(priceChips, "Not sure") || hasChip(priceChips, "Skip for now")) {
    throw new BeatFail(`Not sure on price — chips: ${priceChips.join(" · ")}`);
  }
  await typeSend(page, "I don't know");
  const idkPrice = await waitAsk(page, /purchase price/i);
  if (!/purchase price/i.test(idkPrice.text)) {
    throw new BeatFail(`I don’t know did not restore the price ask — ${idkPrice.text}`);
  }
  assertCopyChips(idkPrice.text, idkPrice.chips);
  if (hasChip(idkPrice.chips, "Not sure") || hasChip(idkPrice.chips, "Skip for now")) {
    throw new BeatFail(`Not sure on restored price — chips: ${idkPrice.chips.join(" · ")}`);
  }
  await typeSend(page, "500000");
  const funds = await waitAsk(page, /down payment or loan amount/i);
  assertCopyChips(funds.text, funds.chips);
  if (hasChip(funds.chips, "Not sure") || hasChip(funds.chips, "Skip for now")) {
    throw new BeatFail(`Not sure on down/loan — chips: ${funds.chips.join(" · ")}`);
  }
  await typeSend(page, "I don't know");
  const idkFunds = await waitAsk(page, /down payment or loan amount/i);
  if (!/down payment or loan amount/i.test(idkFunds.text)) {
    throw new BeatFail(`I don’t know did not restore the funds ask — ${idkFunds.text}`);
  }
  assertCopyChips(idkFunds.text, idkFunds.chips);
  if (hasChip(idkFunds.chips, "Not sure") || hasChip(idkFunds.chips, "Skip for now")) {
    throw new BeatFail(`Not sure on restored funds — chips: ${idkFunds.chips.join(" · ")}`);
  }
}

async function case4(page: Page) {
  await hardStartOver(page);
  await walkBuyPrimary(page);
  await writePrice(page, "850000");
  await waitAsk(page, /down payment or loan amount/i);
  await typeSend(page, "20");
  await acceptOfferedFunds(page);
  await walkHouseCredit(page);
  await waitAsk(page, /address or ZIP/i);
  await sendZip(page, "97535", "geo");
  const geo = await currentText(page);
  if (!/ONYX is California only/i.test(geo)) {
    throw new BeatFail(`97535 did not stop on California only — ${geo}`);
  }
  await sendZip(page, "94123", "price");
  await settleQuoteToIncome(page, false, "94123");
  const next = await currentText(page);
  if (/address or ZIP|California only|What ZIP is the property/i.test(next)) {
    throw new BeatFail(`after 94123 next was ZIP — ${next}`);
  }
  if (!/How is income earned/i.test(next)) {
    throw new BeatFail(`after 94123 next was not income — ${next}`);
  }
  const map = await structureMap(page);
  const zipLine = Object.entries(map).find(([label]) => /zip|address/i.test(label));
  if (zipLine && /97535/.test(zipLine[1]) && !/94123/.test(zipLine[1])) {
    throw new BeatFail(`write did not kill the old ZIP — ${zipLine[0]} ${zipLine[1]}`);
  }
}

async function case5(page: Page) {
  await hardStartOver(page);
  await walkToDebts(page);
  await skipWageAndIdToBank(page);
  await composerDrop(page, "05-bank-statement-pacific-coast-jul-2026.pdf");
  await waitCurrent(
    page,
    (text, chips) =>
      hasChip(chips, "Use this") ||
      /Pacific Coast|4419|84,220|could not read|unread/i.test(text),
    90_000,
  );
  const confirm = await currentText(page);
  if (/could not read|unread/i.test(confirm)) {
    throw new BeatFail(`first statement did not extract — ${confirm}`);
  }
  if (!/Pacific Coast|4419|84,220/i.test(confirm) || !hasChip(await currentChips(page), "Use this")) {
    throw new BeatFail(`first statement confirm missing — ${confirm} | ${(await currentChips(page)).join(" · ")}`);
  }
  assertCopyChips(confirm, await currentChips(page));
  await clickChip(page, "Use this");
  const second = await waitAsk(page, /second recent statement/i, 20_000);
  if (!hasChip(second.chips, "Skip") || !hasChip(second.chips, "Upload this")) {
    throw new BeatFail(`second statement chips ${second.chips.join(" · ") || "(none)"} — ${second.text}`);
  }
  assertCopyChips(second.text, second.chips);
  await clickChip(page, "Skip");
  const contract = await waitAsk(page, /purchase contract/i, 20_000);
  if (!/purchase contract/i.test(contract.text)) {
    throw new BeatFail(`Skip second did not open contract — ${contract.text}`);
  }
  assertCopyChips(contract.text, contract.chips);
}

async function case6(page: Page) {
  await hardStartOver(page);
  await walkToDebts(page);
  const debts = await currentText(page);
  const debtChips = await currentChips(page);
  if (!hasChip(debtChips, "Skip")) {
    throw new BeatFail(`debts ask missing Skip — ${debts} | ${debtChips.join(" · ")}`);
  }
  assertCopyChips(debts, debtChips);
  await clickChip(page, "Skip");
  await waitCurrent(page, (text) => !/other monthly debts/i.test(text), 15_000);
  if (/other monthly debts/i.test(await currentText(page))) {
    throw new BeatFail("Skip debts did not move the file");
  }
  const started = Date.now();
  let skippedId = false;
  while (Date.now() - started < 40_000) {
    const text = await currentText(page);
    const chips = await currentChips(page);
    if (/government ID/i.test(text) && hasChip(chips, "Skip")) {
      await clickChip(page, "Skip");
      skippedId = true;
      await waitCurrent(page, (next) => !/government ID/i.test(next), 15_000);
      break;
    }
    if (/Drop last year.?s W-2|Box 5|pay frequency|monthly from the stub/i.test(text) && hasChip(chips, "Skip")) {
      await clickChip(page, "Skip");
      await page.waitForTimeout(250);
      continue;
    }
    await page.waitForTimeout(200);
  }
  if (!skippedId) {
    throw new BeatFail(`never reached ID Skip — ${await currentText(page)}`);
  }
  const after = await currentText(page);
  if (/government ID/i.test(after)) {
    throw new BeatFail(`Skip ID did not move the file — ${after}`);
  }
  if (!/statement|purchase contract|Looks right|W-2|paystub/i.test(after)) {
    throw new BeatFail(`Skip ID left an unknown stall — ${after}`);
  }
}

async function case7(page: Page) {
  await hardStartOver(page);
  await walkBuyPrimary(page);
  await writePrice(page, "500000");
  await waitAsk(page, /down payment or loan amount/i);
  await typeSend(page, "20");
  await acceptFundsTwenty(page);
  await waitAsk(page, /kind of home|House, condo, or 2–4/i);
  await clickChip(page, "2–4");
  const rent = await waitAsk(page, /lease or rent/i);
  if (!/Skip is fine/i.test(rent.text) && !hasChip(rent.chips, "Skip")) {
    throw new BeatFail(`2–4 did not ask rent with Skip — ${rent.text} | ${rent.chips.join(" · ")}`);
  }
  assertCopyChips(rent.text, rent.chips);
  await clickChip(page, "Skip");
  const next = await waitCurrent(page, (text) => !/lease or rent/i.test(text), 15_000);
  if (/lease or rent/i.test(next.text)) {
    throw new BeatFail("Skip rent did not move the file");
  }
  if (!/estimated FICO|credit/i.test(next.text)) {
    throw new BeatFail(`after Skip rent expected FICO — ${next.text}`);
  }
}

async function case8(page: Page) {
  await hardStartOver(page);
  await clickChip(page, "Buy");
  const occ = await waitAsk(page, /How will the property be used/i);
  const before = occ.chips.slice();
  if (!hasChip(before, "Primary")) {
    throw new BeatFail(`occupancy chips missing Primary — ${before.join(" · ")}`);
  }
  await typeSend(page, "What happens after Proceed?");
  const restored = await waitCurrent(
    page,
    (text, chips) => /How will the property be used/i.test(text) && hasChip(chips, "Primary"),
    15_000,
  );
  if (!/After Proceed|licensed originator|queue/i.test(restored.text)) {
    throw new BeatFail(`sideways question had no answer — ${restored.text}`);
  }
  if (!hasChip(restored.chips, "Primary") || !hasChip(restored.chips, "Second home") || !hasChip(restored.chips, "Investment")) {
    throw new BeatFail(`same next chip missing after the answer — ${restored.chips.join(" · ") || "(none)"}`);
  }
  assertCopyChips(restored.text, restored.chips);
}

async function stillUsefulLabels(page: Page): Promise<string[]> {
  const loc = page.locator(".fox-still-useful .file-preview__label");
  if ((await loc.count()) === 0) return [];
  return loc.allTextContents().then((items) =>
    items.map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean),
  );
}

async function looksRightVisible(page: Page): Promise<boolean> {
  const buttons = page.getByRole("button", { name: /^Looks right$/i });
  const n = await buttons.count();
  for (let i = 0; i < n; i += 1) {
    if (await buttons.nth(i).isVisible().catch(() => false)) return true;
  }
  return false;
}

async function assertLooksRightHiddenWhileUseThis(page: Page) {
  const chips = await currentChips(page);
  const useOpen =
    hasChip(chips, "Use this") ||
    hasChip(chips, "Use document") ||
    hasChip(chips, /^Change$/);
  if (!useOpen) return;
  if (hasChip(chips, "Looks right") || (await looksRightVisible(page))) {
    throw new BeatFail(
      `Looks right visible while Use this is open — ${await currentText(page)} | ${chips.join(" · ")}`,
    );
  }
}

async function composerDrop(page: Page, name: string) {
  lastDroppedSample = name;
  const attach = page.locator("[data-composer-attach='true'], [data-docs-handoff='true']").first();
  await attach.waitFor({ state: "attached", timeout: 15_000 });
  await attach.setInputFiles([]).catch(() => null);
  await attach.setInputFiles(join(SAMPLE_DOCS, name));
}

async function skipHarborSideAsk(page: Page): Promise<boolean> {
  const text = await currentText(page);
  const chips = await currentChips(page);
  if (hasChip(chips, "Same job")) {
    await clickChip(page, "Same job");
    return true;
  }
  if (
    /Who did you work for before|Where did you live before/i.test(text) &&
    hasChip(chips, "Skip")
  ) {
    await clickChip(page, "Skip");
    return true;
  }
  if (hasChip(chips, "This one") && /Getting a live line|Not a lock|This one/i.test(text)) {
    await clickChip(page, "This one");
    return true;
  }
  if (
    hasChip(chips, "Skip") &&
    (hasChip(chips, "Second job") || hasChip(chips, "Raise") || hasChip(chips, "OT")) &&
    /differ|monthly|why/i.test(text)
  ) {
    await clickChip(page, "Skip");
    return true;
  }
  return false;
}

async function settleHarborSideAsks(page: Page, budget = 8_000) {
  const started = Date.now();
  while (Date.now() - started < budget) {
    if (!(await skipHarborSideAsk(page))) return;
    await page.waitForTimeout(200);
  }
}

async function dropHarborDoc(page: Page, name: string, kind: "confirm" | "cover" | "income") {
  const before = await currentText(page);
  await composerDrop(page, name);
  const started = Date.now();
  while (Date.now() - started < 90_000) {
    const text = await currentText(page);
    const chips = await currentChips(page);
    if (/could not read|unreadable/i.test(text)) {
      throw new BeatFail(`${name} unread — ${text}`);
    }
    if (await skipHarborSideAsk(page)) {
      await page.waitForTimeout(200);
      continue;
    }
    if (kind === "cover") {
      const useful = await stillUsefulLabels(page);
      const usefulText = useful.join(" · ");
      const blob = `${text} ${usefulText}`;
      const mapped = /K-1|1065|Schedule E|Sch E/i.test(usefulText) || /^Got the cover/i.test(text);
      if (/Schedule C/i.test(usefulText)) {
        throw new BeatFail(`cover still useful named another C — ${blob}`);
      }
      if (/Two recent statements/i.test(text) && !mapped) {
        throw new BeatFail(`bank-first after a cover — ${text}`);
      }
      if (mapped) {
        if (hasChip(chips, "Use this") || hasChip(chips, "Use document")) {
          await assertLooksRightHiddenWhileUseThis(page);
          await clickChip(page, hasChip(chips, "Use this") ? "Use this" : "Use document");
        }
        await settleHarborSideAsks(page);
        return;
      }
      await page.waitForTimeout(250);
      continue;
    }
    if (text !== before && (hasChip(chips, "Use this") || hasChip(chips, "Use document"))) {
      await assertLooksRightHiddenWhileUseThis(page);
      if (kind === "income") {
        if (!/I’m suggesting/i.test(text) || !/a month/i.test(text)) {
          throw new BeatFail(`Schedule C Use this was not a monthly suggest — ${text}`);
        }
        if (!/wages and the Schedule C/i.test(text)) {
          throw new BeatFail(`combined income story not named — ${text}`);
        }
        if (/ordinary \/ 12|rents minus cash|8825 rental|biweekly period|Box 1 monthly plus/i.test(text)) {
          throw new BeatFail(`formula in chat — ${text}`);
        }
      }
      assertCopyChips(text, chips);
      await clickChip(page, hasChip(chips, "Use this") ? "Use this" : "Use document");
      await settleHarborSideAsks(page);
      return;
    }
    await page.waitForTimeout(250);
  }
  throw new BeatFail(`${name} never settled — ${await currentText(page)} | ${(await currentChips(page)).join(" · ")}`);
}

async function walkHarborFileAnswers(page: Page) {
  await walkBuyPrimary(page);
  await writePrice(page, "1000000");
  await waitAsk(page, /down payment or loan amount/i);
  await typeSend(page, "20");
  await acceptOfferedFunds(page);
  await walkHouseCredit(page);
  await waitAsk(page, /address or ZIP/i);
  await sendZip(page, "94123", "price");
  await settleQuoteToIncome(page, true, "94123");
  await clickChip(page, "Both");
  await waitCurrent(
    page,
    (text, chips) =>
      /How long have you had|years in business|other monthly debts/i.test(text) || hasChip(chips, "Skip"),
    20_000,
  );
  if (/How long have you had|years in business/i.test(await currentText(page))) {
    await typeSend(page, "2");
  }
  await waitAsk(page, /other monthly debts/i, 20_000);
  assertCopyChips(await currentText(page), await currentChips(page));
  await clickChip(page, "Skip");
  await waitCurrent(page, (text) => !/other monthly debts/i.test(text), 15_000);
}

async function assertHarborFileAfterContract(page: Page) {
  const rows = await structureRows(page);
  const blob = rows.map((row) => `${row.label}: ${row.value}`).join(" | ");
  const employment = rows.filter((row) => row.label === "Employment");
  const harbor = employment.filter((row) => /Harbor/i.test(row.value));
  if (harbor.length !== 1) {
    throw new BeatFail(`expected one Harbor Employment row — ${blob}`);
  }
  if (!/Box 5/i.test(harbor[0].value) || !/month/i.test(harbor[0].value)) {
    throw new BeatFail(`Harbor row missing Box 5 + stub monthly — ${harbor[0].value}`);
  }
  if (employment.some((row) => row.value && !/Harbor/i.test(row.value))) {
    throw new BeatFail(`second job on File — ${blob}`);
  }
  const qualifying = rows.find((row) => row.label === "Qualifying income");
  if (!qualifying?.value || qualifying.value === "—") {
    throw new BeatFail(`qualifying income missing — ${blob}`);
  }
  const property = rows.find((row) => row.label === "Property address");
  if (!/88 Clipper Street/i.test(property?.value ?? "") || !/San Francisco/i.test(property?.value ?? "")) {
    throw new BeatFail(`property was not 88 Clipper Street, San Francisco — ${property?.value ?? blob}`);
  }
  if (!/94114/.test(property?.value ?? "") || /Filbert|94123/i.test(property?.value ?? "")) {
    throw new BeatFail(`property ZIP/residence wrong — ${property?.value ?? blob}`);
  }
  const zip = rows.find((row) => row.label === "ZIP");
  if ((zip?.value ?? "").replace(/\s+/g, "") !== "94114") {
    throw new BeatFail(`ZIP line was not 94114 — ${zip?.value ?? blob}`);
  }
  const residence = rows.some((row) => /Filbert/i.test(row.value) && !/Clipper/i.test(row.value));
  if (!residence) {
    throw new BeatFail(`Filbert did not stay residence — ${blob}`);
  }
}

async function case9(page: Page) {
  if (!existsSync(HARBOR_CONTRACT_PDF)) {
    throw new BeatFail("missing alias 09-purchase-contract-88-clipper.pdf");
  }
  await hardStartOver(page);
  await walkHarborFileAnswers(page);
  await dropHarborDoc(page, HARBOR_DROPS[0], "confirm");
  await dropHarborDoc(page, HARBOR_DROPS[1], "confirm");
  await dropHarborDoc(page, HARBOR_DROPS[2], "confirm");
  await dropHarborDoc(page, HARBOR_DROPS[3], "income");
  const incomeAfterC = (await structureRows(page)).find((row) => row.label === "Qualifying income")?.value ?? "";
  if (!incomeAfterC || incomeAfterC === "—") {
    throw new BeatFail("combined qualifying income missing after Schedule C Use this");
  }
  await dropHarborDoc(page, HARBOR_DROPS[4], "cover");
  const incomeAfterCover = (await structureRows(page)).find((row) => row.label === "Qualifying income")?.value ?? "";
  if (incomeAfterCover !== incomeAfterC) {
    throw new BeatFail(`cover changed combined income — ${incomeAfterC} → ${incomeAfterCover}`);
  }
  await dropHarborDoc(page, HARBOR_DROPS[5], "confirm");
  await dropHarborDoc(page, HARBOR_DROPS[6], "confirm");
  await settleHarborSideAsks(page, 12_000);
  const keepLoan = (await currentChips(page)).find((chip) => /^Keep /i.test(chip) && /loan/i.test(chip));
  if (keepLoan) {
    await clickChip(page, keepLoan);
    await settleHarborSideAsks(page);
  }
  const incomeAfterContract = (await structureRows(page)).find((row) => row.label === "Qualifying income")?.value ?? "";
  if (incomeAfterContract !== incomeAfterC) {
    throw new BeatFail(`contract walk changed combined income — ${incomeAfterC} → ${incomeAfterContract}`);
  }
  await assertHarborFileAfterContract(page);
  const untilLooks = Date.now();
  while (Date.now() - untilLooks < 20_000) {
    const text = await currentText(page);
    const chips = await currentChips(page);
    if (hasChip(chips, "Looks right") || hasChip(chips, "Use this") || hasChip(chips, "Use document")) break;
    const keep = chips.find((chip) => /^Keep /i.test(chip) && /loan/i.test(chip));
    if (keep) {
      await clickChip(page, keep);
      await settleHarborSideAsks(page);
      continue;
    }
    if (
      hasChip(chips, "Skip") &&
      (/I need the \d{4} return — Form 1040, all pages/i.test(text) || /second recent statement/i.test(text))
    ) {
      await clickChip(page, "Skip");
      await settleHarborSideAsks(page);
      continue;
    }
    await page.waitForTimeout(200);
  }
  if (hasChip(await currentChips(page), "Use this") || hasChip(await currentChips(page), "Use document")) {
    await assertLooksRightHiddenWhileUseThis(page);
    await clickChip(page, hasChip(await currentChips(page), "Use this") ? "Use this" : "Use document");
    await settleHarborSideAsks(page);
    await assertHarborFileAfterContract(page);
  }
  if (!hasChip(await currentChips(page), "Looks right")) {
    await waitCurrent(page, (_text, chips) => hasChip(chips, "Looks right"), 20_000);
  }
  await clickChip(page, "Looks right");
  const after = await waitCurrent(page, (text) => !/Looks right, or change a line/i.test(text), 15_000).catch(
    async () => ({ text: await currentText(page), chips: await currentChips(page) }),
  );
  if (/citizen|permanent resident/i.test(after.text) || after.chips.some((chip) => /citizen|permanent resident/i.test(chip))) {
    throw new BeatFail(`citizenship after Looks right — ${after.text} | ${after.chips.join(" · ")}`);
  }
}

async function foxTexts(page: Page): Promise<string[]> {
  const loc = page.locator(".fox-bubble--fox");
  const n = await loc.count();
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(((await loc.nth(i).innerText()) ?? "").replace(/\s+/g, " ").trim());
  }
  return out;
}

function contractConfirmCount(texts: string[]) {
  return texts.filter((text) => /The contract shows /i.test(text)).length;
}

async function walk09AtPriceToFunds(page: Page) {
  if (!existsSync(HARBOR_CONTRACT_PDF)) {
    throw new BeatFail("missing alias 09-purchase-contract-88-clipper.pdf");
  }
  await hardStartOver(page);
  await walkBuyPrimary(page);
  await waitAsk(page, /purchase price/i);
  await composerDrop(page, "09-purchase-contract-88-clipper.pdf");
  const extractStarted = Date.now();
  let retriedUnread = false;
  while (Date.now() - extractStarted < 90_000) {
    const text = await currentText(page);
    const chips = await currentChips(page);
    if (/The contract shows /i.test(text) && hasChip(chips, "Use this")) break;
    if (
      !retriedUnread &&
      (hasChip(chips, "Upload again") || /could not read|unread/i.test(text))
    ) {
      retriedUnread = true;
      if (hasChip(chips, "Upload again")) {
        await clickChip(page, "Upload again").catch(() => null);
        await page.waitForTimeout(300);
      }
      await composerDrop(page, "09-purchase-contract-88-clipper.pdf");
    }
    await page.waitForTimeout(250);
  }
  await waitCurrent(page, (text, chips) => /The contract shows /i.test(text) && hasChip(chips, "Use this"), 15_000);
  const confirm = await currentText(page);
  if (/On the file/i.test(confirm)) {
    throw new BeatFail(`09 confirm said On the file — ${confirm}`);
  }
  if (contractConfirmCount(await foxTexts(page)) !== 1) {
    throw new BeatFail(`09 confirm printed more than once — ${confirm}`);
  }
  await clickChip(page, "Use this");
  const after = await waitCurrent(
    page,
    (text) => !/The contract shows /i.test(text) || /down payment or loan amount/i.test(text),
    20_000,
  );
  if (contractConfirmCount(await foxTexts(page)) !== 1) {
    throw new BeatFail("09 confirm reprinted after Use this");
  }
  if (/On the file|Try again/i.test(after.text)) {
    throw new BeatFail(`after 09 Use this — ${after.text}`);
  }
  if (/purchase price/i.test(after.text) && !/down payment or loan amount/i.test(after.text)) {
    throw new BeatFail(`second purchase-price ask after 09 — ${after.text}`);
  }
  if (/estimated FICO/i.test(after.text)) {
    throw new BeatFail(`FICO re-ask after 09 — ${after.text}`);
  }
  if (!/down payment or loan amount/i.test(after.text)) {
    throw new BeatFail(`after 09 expected funds ask — ${after.text}`);
  }
  const map = await structureMap(page);
  const blob = Object.entries(map)
    .map(([label, value]) => `${label}: ${value}`)
    .join(" | ");
  if (!/88 Clipper/i.test(map["Property address"] ?? blob) || !/94114/.test(map["Property address"] ?? blob)) {
    throw new BeatFail(`09 did not write Clipper — ${blob}`);
  }
  if (!/\$850,000/.test(map["Purchase price"] ?? "")) {
    throw new BeatFail(`09 did not write $850,000 — ${blob}`);
  }
  if (!/October 15, 2026|10\/15\/2026/.test(map["Close"] ?? blob)) {
    throw new BeatFail(`09 did not write close — ${blob}`);
  }
  if (map["Seller credit"] && !/\$5,000/.test(map["Seller credit"])) {
    throw new BeatFail(`09 seller credit wrong — ${blob}`);
  }
}

async function typeCreditBand(page: Page, typed: string) {
  const input = page.locator(INPUT);
  await input.waitFor({ state: "visible", timeout: 10_000 });
  await input.click();
  await input.fill("");
  await input.pressSequentially(typed, { delay: 15 });
  const send = page.locator(SEND);
  if (await send.isDisabled()) await input.press("Enter");
  else await send.click();
}

async function walk09ThenHouseCreditBand(page: Page, typed: string, creditNeedle: RegExp) {
  await walk09AtPriceToFunds(page);
  await typeSend(page, "20");
  await acceptOfferedFunds(page);
  await waitCurrent(
    page,
    (text, chips) =>
      /House, condo, or 2–4|What kind of home|estimated FICO/i.test(text) || hasChip(chips, "House") || hasChip(chips, "760+"),
    20_000,
  );
  if (hasChip(await currentChips(page), "House")) {
    await clickChip(page, "House");
    await page.waitForTimeout(250);
  }
  await typeCreditBand(page, typed);
  const started = Date.now();
  let credit = "";
  while (Date.now() - started < 20_000) {
    const map = await structureMap(page);
    credit = map["Credit"] ?? "";
    if (creditNeedle.test(credit)) break;
    await page.waitForTimeout(200);
  }
  if (!creditNeedle.test(credit)) {
    throw new BeatFail(`Credit not written after 09 + House-turn ${typed} — ${credit || "(missing)"}`);
  }
  await waitCurrent(
    page,
    (text, chips) =>
      /How is income earned|Getting a live line|This one|Pricing when the file is ready|Not a lock/i.test(text) ||
      hasChip(chips, "This one"),
    45_000,
  ).catch(() => null);
  const next = await currentText(page);
  if (/estimated FICO|What is your estimated FICO/i.test(next)) {
    throw new BeatFail(`09 + House-turn ${typed} then FICO ask — ${next}`);
  }
}

async function case10(page: Page) {
  await walk09ThenHouseCreditBand(page, "760+", /760/);
}

async function case11(page: Page) {
  await walk09ThenHouseCreditBand(page, "740–759", /740/);
}

async function case12(page: Page) {
  await hardStartOver(page);
  await walkToQuotedIncome(page, "94123", true);
  await waitAsk(page, /How is income earned/i);
  await dropHarborDoc(page, "03-w2-2025-jordan-hale.pdf", "confirm");
  await dropHarborDoc(page, "07-paystub-biweekly-loud.pdf", "confirm");
  if (hasChip(await currentChips(page), "Use this") || hasChip(await currentChips(page), "Use document")) {
    await clickChip(page, hasChip(await currentChips(page), "Use this") ? "Use this" : "Use document");
    await page.waitForTimeout(300);
  }
  const quiz = async () => {
    const text = await currentText(page);
    const chips = await currentChips(page);
    return /How is income earned/i.test(text) && chips.some((chip) => /W-2|Self-employed|Both|Other/i.test(chip));
  };
  if (await quiz()) {
    throw new BeatFail(`empty income quiz after 03+07 — ${await currentText(page)} | ${(await currentChips(page)).join(" · ")}`);
  }
  const started = Date.now();
  let employment = "";
  let blob = "";
  while (Date.now() - started < 20_000) {
    const map = await structureMap(page);
    employment = map["Employment"] ?? "";
    blob = `${map["Income"] ?? ""} ${employment} ${map["Qualifying income"] ?? ""}`;
    if (/Harbor/i.test(employment)) break;
    await page.waitForTimeout(200);
  }
  if (await quiz()) {
    throw new BeatFail(`empty income quiz after 03+07 — ${await currentText(page)} | ${(await currentChips(page)).join(" · ")}`);
  }
  if (!/Harbor/i.test(employment)) {
    throw new BeatFail(
      `03+07 did not write Harbor Employment — ${blob || "(empty)"} | ${await currentText(page)} | ${(await currentChips(page)).join(" · ")}`,
    );
  }
}

async function walkSeToIncomeDocs(page: Page) {
  await walkToQuotedIncome(page, "94123", true);
  await waitAsk(page, /How is income earned/i);
  await clickChip(page, "Self-employed");
  await waitCurrent(
    page,
    (text, chips) =>
      /How long have you had|years in business|other monthly debts|government ID|1040|Schedule C|I’m suggesting/i.test(
        text,
      ) || hasChip(chips, "Skip") || hasChip(chips, "Use this"),
    20_000,
  );
  if (/How long have you had|years in business/i.test(await currentText(page))) {
    await typeSend(page, "2");
    await waitCurrent(
      page,
      (text) => !/How long have you had|years in business/i.test(text),
      15_000,
    );
  }
  await waitCurrent(
    page,
    (text, chips) =>
      /other monthly debts|government ID|1040|Schedule C|I’m suggesting/i.test(text) ||
      hasChip(chips, "Skip") ||
      hasChip(chips, "Use this"),
    20_000,
  );
  if (/other monthly debts/i.test(await currentText(page))) {
    await clickChip(page, "Skip");
    await waitCurrent(page, (text) => !/other monthly debts/i.test(text), 15_000);
  }
}

async function dropSeCoverOrC(page: Page, name: string, kind: "cover-card" | "upgrade" | "second-cover") {
  const before = await currentText(page);
  await composerDrop(page, name);
  const started = Date.now();
  while (Date.now() - started < 90_000) {
    const text = await currentText(page);
    const chips = await currentChips(page);
    if (/could not read|unreadable/i.test(text)) {
      throw new BeatFail(`${name} unread — ${text}`);
    }
    if (await skipHarborSideAsk(page)) {
      await page.waitForTimeout(200);
      continue;
    }
    if (kind === "cover-card") {
      if (/I’m suggesting \$9,000 a month/i.test(text) && /Cover line/i.test(text) && hasChip(chips, "Use this")) {
        return;
      }
    }
    if (kind === "upgrade") {
      if (/\$9,958/i.test(text) && hasChip(chips, "Use this")) {
        return;
      }
    }
    if (kind === "second-cover") {
      if (/I’m suggesting \$9,000 a month/i.test(text) && hasChip(chips, "Use this")) {
        return;
      }
      if (/2024 Schedule C/i.test(text) && !/I need the 2025 return — Form 1040, all pages/i.test(text)) {
        return;
      }
      if (hasChip(chips, "Looks right") && !/I need the 2025 return — Form 1040, all pages/i.test(text)) {
        return;
      }
      if (text !== before && /I’m suggesting/i.test(text) && hasChip(chips, "Use this")) {
        return;
      }
    }
    await page.waitForTimeout(250);
  }
  throw new BeatFail(`${name} ${kind} never settled — ${await currentText(page)} | ${(await currentChips(page)).join(" · ")}`);
}

async function case14(page: Page) {
  await hardStartOver(page);
  await walkSeToIncomeDocs(page);
  await dropSeCoverOrC(page, "20-1040-cover-2025-jordan-hale.pdf", "cover-card");
  const text = await currentText(page);
  const chips = await currentChips(page);
  if (!/I’m suggesting \$9,000 a month/i.test(text) || !/Cover line/i.test(text)) {
    throw new BeatFail(`20 did not paint $9,000 Cover line card — ${text}`);
  }
  if (!hasChip(chips, "Use this")) {
    throw new BeatFail(`20 card missing Use this — ${text} | ${chips.join(" · ")}`);
  }
  await clickChip(page, "Use this");
  const started = Date.now();
  let map: Record<string, string> = {};
  let after = "";
  while (Date.now() - started < 20_000) {
    after = await currentText(page);
    if (/How long have you had|years in business/i.test(after)) {
      throw new BeatFail(`20 Use this reprinted years — ${after}`);
    }
    map = await structureMap(page);
    const blob = `${map["Income"] ?? ""} ${map["Qualifying income"] ?? ""} ${map["Employment"] ?? ""}`;
    if (/\$9,000/.test(blob)) break;
    await page.waitForTimeout(200);
  }
  const written = `${map["Income"] ?? ""} ${map["Qualifying income"] ?? ""} ${map["Employment"] ?? ""}`;
  if (!/\$9,000/.test(written)) {
    throw new BeatFail(
      `20 Use this did not write $9,000 on Structure — Income=${map["Income"] ?? "(none)"} Qualifying=${map["Qualifying income"] ?? "(none)"}`,
    );
  }
  if (!/Income/.test(Object.keys(map).join(" ")) && !/Qualifying income/.test(Object.keys(map).join(" "))) {
    throw new BeatFail(`20 Use this left notepad type-only — ${written}`);
  }
  const useful = await stillUsefulLabels(page);
  if (!useful.some((label) => /Schedule C/i.test(label))) {
    throw new BeatFail(`20 Still useful missing Schedule C — ${useful.join(" · ") || "(none)"}`);
  }
}

async function case15(page: Page) {
  await hardStartOver(page);
  await walkSeToIncomeDocs(page);
  await dropSeCoverOrC(page, "20-1040-cover-2025-jordan-hale.pdf", "cover-card");
  await clickChip(page, "Use this");
  await waitCurrent(page, (next) => !/I’m suggesting \$9,000 a month/i.test(next) || /Schedule C/i.test(next), 20_000);
  await dropSeCoverOrC(page, "11-1040-schedule-c-2025-hale-design.pdf", "upgrade");
  const text = await currentText(page);
  if (!/\$9,958/i.test(text) || !hasChip(await currentChips(page), "Use this")) {
    throw new BeatFail(`20 then 11 did not upgrade — ${text} | ${(await currentChips(page)).join(" · ")}`);
  }
}

async function case16(page: Page) {
  await hardStartOver(page);
  await walkSeToIncomeDocs(page);
  await dropSeCoverOrC(page, "20-1040-cover-2025-jordan-hale.pdf", "cover-card");
  await dropSeCoverOrC(page, "19-1040-cover-2024-jordan-hale.pdf", "second-cover");
  const text = await currentText(page);
  const chips = await currentChips(page);
  if (!text.trim()) {
    throw new BeatFail("20 then 19 hung — empty Fox line");
  }
  if (/I need the 2025 return — Form 1040, all pages/i.test(text)) {
    throw new BeatFail(`20 then 19 stole the 2025 ask — ${text}`);
  }
  const moving =
    hasChip(chips, "Use this") ||
    hasChip(chips, "Looks right") ||
    /2024 Schedule C|I’m suggesting \$9,000 a month/i.test(text);
  if (!moving) {
    throw new BeatFail(`20 then 19 did not hang-or-move — ${text} | ${chips.join(" · ")}`);
  }
}

async function case13(page: Page) {
  await hardStartOver(page);
  await walkToQuotedIncome(page, "94123", true);
  await clickChip(page, "W-2");
  await waitCurrent(page, (text) => !/How is income earned/i.test(text), 15_000);
  await composerDrop(page, "03-w2-2025-jordan-hale.pdf");
  await waitCurrent(
    page,
    (text, chips) =>
      hasChip(chips, "Use this") || hasChip(chips, "Use document") || /Harbor|Box 5/i.test(text),
    90_000,
  );
  if (hasChip(await currentChips(page), "Use this") || hasChip(await currentChips(page), "Use document")) {
    await clickChip(page, hasChip(await currentChips(page), "Use this") ? "Use this" : "Use document");
  }
  await startOverButton(page).click();
  await page.locator(".fox-bubble--fox.is-current").getByRole("button", { name: "Buy", exact: true }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
  const map = await structureMap(page);
  const income = map["Income"] ?? map["Qualifying income"] ?? "";
  if (income && income !== "—") {
    throw new BeatFail(`Start over left income — ${income}`);
  }
  if (map["Docs"] && map["Docs"] !== "—") {
    throw new BeatFail(`Start over left Docs — ${map["Docs"]}`);
  }
  if (map["Note"] && map["Note"] !== "—") {
    throw new BeatFail(`Start over left Note — ${map["Note"]}`);
  }
  const useful = await stillUsefulLabels(page);
  if (useful.length) {
    throw new BeatFail(`Start over left Still useful — ${useful.join(" · ")}`);
  }
}

const CASES: { n: number; title: string; run: (page: Page) => Promise<void> }[] = [
  { n: 1, title: "20 on a known price → down and loan write, Use this once", run: case1 },
  { n: 2, title: "Price 500000 then 1000000 → conflict → Down payment → 20 → Use this → 100000 / 400000, no second conflict", run: case2 },
  { n: 3, title: "No Not sure on price, down, or loan. I don’t know restores the same ask", run: case3 },
  { n: 4, title: "97535 → California only → 94123 writes and prices → next is income, not ZIP", run: case4 },
  { n: 5, title: "First statement Use this → second offered → Skip → contract", run: case5 },
  { n: 6, title: "Skip ID. Skip stated debts. File still moves", run: case6 },
  { n: 7, title: "2–4 asks rent. Skip rent allowed", run: case7 },
  { n: 8, title: "Mid-ask sideways question. Answer, then the same next chip", run: case8 },
  { n: 9, title: "harbor-both-cover-contract", run: case9 },
  { n: 10, title: "09 at price then House-turn 760+ writes Credit, next is not FICO", run: case10 },
  { n: 11, title: "09 at price then House-turn 740–759 writes Credit, next is not FICO", run: case11 },
  { n: 12, title: "03+07 before income type → no empty income quiz", run: case12 },
  { n: 13, title: "Start over clears income, Docs, Note, Still useful", run: case13 },
  { n: 14, title: "20 → $9,000 cover-line writes Structure Income", run: case14 },
  { n: 15, title: "20 then 11 upgrades Hale Design to 1084", run: case15 },
  { n: 16, title: "20 then 19 does not hang", run: case16 },
];

async function openBrowser() {
  return chromium.launch({ headless: true });
}

async function newPreviewContext(browser: Browser): Promise<BrowserContext> {
  const headers = protectionHeaders();
  return browser.newContext({
    viewport: { width: 1400, height: 900 },
    extraHTTPHeaders: headers,
  });
}

function sampleOnDisk(name: string | null) {
  if (!name) return null;
  const path = join(SAMPLE_DOCS, name);
  return existsSync(path) ? { name, path } : null;
}

const deadVision = {
  async classify(): Promise<never> {
    throw new Error("vision should not run on walker sample text");
  },
  async extract(): Promise<never> {
    throw new Error("vision should not run on walker sample text");
  },
};

function extractHint(name: string): ExtractClass | null {
  if (/purchase-contract|clipper/i.test(name)) return "purchase_contract";
  if (/\bw2\b|w-2/i.test(name)) return "w2";
  if (/paystub/i.test(name)) return "paystub";
  if (/bank-statement|statement/i.test(name)) return "bank_statement";
  if (/ca-id|government-id|\bid-/i.test(name)) return "government_id";
  if (/1040-cover|schedule-c|schedule.?c/i.test(name)) return "tax_return";
  return null;
}

async function localExtractBody(name: string) {
  const sample = sampleOnDisk(name);
  if (!sample) return null;
  const extracted = await classifyAndExtract(
    new Uint8Array(readFileSync(sample.path)),
    "application/pdf",
    deadVision,
    extractHint(name),
    name,
  );
  const failed = Boolean(extracted.failed || extracted.warnings.includes("failed"));
  return {
    class: extracted.extractClass,
    confidence: extracted.confidence,
    fields: extracted.fields,
    warnings: extracted.warnings,
    source: "file",
    textLayerChars: extracted.textLayerChars ?? 0,
    note: failed
      ? extracted.warnings.includes("no-text-layer")
        ? "This file has no text layer. Type a note or Skip."
        : "Fox could not read this file. Type a note or skip. No dollar amounts were invented."
      : extracted.extractClass === "other" || !Object.keys(extracted.fields ?? {}).length
        ? "Document received"
        : undefined,
    failed,
  };
}

async function proxyApiThroughPlaywright(page: Page) {
  const oidc = protectionHeaders();
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = req.url();
    try {
      if (req.method() === "POST" && /\/api\/docs\/extract(?:\?|$)/.test(url) && lastDroppedSample) {
        const local = await localExtractBody(lastDroppedSample);
        if (local && !local.failed) {
          const keys = Object.keys(local.fields ?? {}).join(",");
          console.error(`spine-walker: extract-local ${local.class} ${lastDroppedSample} ${keys}`);
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(local),
          });
          return;
        }
        console.error(
          `spine-walker: extract-local miss ${lastDroppedSample} failed=${String(local?.failed)}`,
        );
      }
      if (!Object.keys(oidc).length) {
        await route.fallback();
        return;
      }
      const hdrs = { ...req.headers(), ...oidc };
      delete hdrs["content-length"];
      delete hdrs["Content-Length"];
      const response = await page.request.fetch(url, {
        method: req.method(),
        headers: hdrs,
        data: req.postDataBuffer() ?? undefined,
        timeout: 60_000,
        failOnStatusCode: false,
      });
      console.error(`spine-walker: proxy ${req.method()} ${response.status()} ${url.split("?")[0]}`);
      await route.fulfill({ response });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`spine-walker: proxy fail ${url.split("?")[0]} — ${reason.slice(0, 180)}`);
      await route.fallback();
    }
  });
}

async function patchPageFetch(page: Page) {
  const oidc = process.env.VERCEL_OIDC_TOKEN?.trim() ?? "";
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ?? "";
  if (!oidc && !bypass) return;
  await page.evaluate(
    ({ oidc: token, bypass: secret }) => {
      const box = window as Window & { __onyxWalkerFetchPatched?: boolean };
      if (box.__onyxWalkerFetchPatched) return;
      box.__onyxWalkerFetchPatched = true;
      const orig = window.fetch.bind(window);
      window.fetch = (input, init = {}) => {
        const headers = new Headers(init.headers);
        if (token) headers.set("x-vercel-trusted-oidc-idp-token", token);
        if (secret) {
          headers.set("x-vercel-protection-bypass", secret);
          headers.set("x-vercel-set-bypass-cookie", "true");
        }
        return orig(input, { ...init, headers });
      };
    },
    { oidc, bypass },
  );
}

function oneLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

async function runCase(page: Page, spec: (typeof CASES)[number]): Promise<CaseResult> {
  try {
    await spec.run(page);
    return { n: spec.n, title: spec.title, ok: true };
  } catch (error) {
    let beat = error instanceof BeatFail ? error.beat : error instanceof Error ? error.message : String(error);
    if (!(error instanceof BeatFail)) {
      const fox = await currentText(page).catch(() => "");
      if (fox) beat = `${beat} — ${fox}`;
    }
    return { n: spec.n, title: spec.title, ok: false, beat: oneLine(beat) };
  }
}

function printRow(row: CaseResult) {
  const line = row.ok ? `${row.n} PASS ${row.title}` : `${row.n} FAIL ${row.title} — ${row.beat}`;
  console.error(line);
  process.stdout.write(`${line}\n`);
}

async function main() {
  const browser = await openBrowser();
  const results: CaseResult[] = [];
  try {
    const kind = previewAuthKind();
    if (kind === "oidc") console.error("spine-walker: sending x-vercel-trusted-oidc-idp-token");
    else if (kind === "bypass") console.error("spine-walker: sending x-vercel-protection-bypass");
    else console.error("spine-walker: no OIDC or automation-bypass token — preview will SSO");
    const context = await newPreviewContext(browser);
    const page = await context.newPage();
    await proxyApiThroughPlaywright(page);
    page.on("response", (response) => {
      const url = response.url();
      if (!/\/api\/(rateflow-quote|docs\/extract)\b/.test(url)) return;
      const status = response.status();
      void response
        .json()
        .then((data: { failed?: boolean; code?: string; error?: string }) => {
          const extra =
            data?.failed || data?.code || data?.error
              ? ` failed=${String(data.failed ?? "")} code=${data.code ?? ""} error=${String(data.error ?? "").slice(0, 80)}`
              : "";
          if (status >= 400 || extra) {
            console.error(`spine-walker: ${status} ${url.split("?")[0]}${extra}`);
          }
        })
        .catch(() => {
          if (status >= 400) console.error(`spine-walker: ${status} ${url.split("?")[0]}`);
        });
    });
    try {
      await probeAccess(page);
      await patchPageFetch(page);
      const cookieNames = (await context.cookies()).map((item) => item.name).join(",");
      console.error(`spine-walker: page fetch patched; cookies ${cookieNames || "(none)"}`);
      try {
        const quoteProbe = await page.request.post(new URL("/api/rateflow-quote", startUrl()).href, {
          data: {},
          timeout: 20_000,
          failOnStatusCode: false,
        });
        console.error(`spine-walker: node quote probe ${quoteProbe.status()}`);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.error(`spine-walker: node quote probe fail ${reason.slice(0, 160)}`);
      }
    } catch (error) {
      const beat =
        error instanceof BeatFail ? error.beat : error instanceof Error ? oneLine(error.message) : String(error);
      for (const spec of CASES) {
        const row = { n: spec.n, title: spec.title, ok: false, beat };
        results.push(row);
        printRow(row);
      }
      process.exitCode = 1;
      return;
    }
    const only = new Set(
      (process.env.SPINE_WALKER_ONLY ?? "")
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((n) => Number.isFinite(n) && n > 0),
    );
    for (const spec of CASES) {
      if (only.size && !only.has(spec.n)) continue;
      const row = await runCase(page, spec);
      results.push(row);
      printRow(row);
    }
  } finally {
    await browser.close();
  }
  if (results.some((row) => !row.ok)) process.exitCode = 1;
}

await main();
