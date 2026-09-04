/**
 * Spine walker — eight locked preview cases. Hard Start over each case.
 * Assert only. Does not invent product behavior.
 *
 * Run: bash scripts/assert-spine-walker.sh
 */
import { chromium, type Browser, type Page } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PREVIEW_URL =
  process.env.SPINE_WALKER_URL ??
  "https://onyx-backend-git-cursor-live-rateflow-preview-bc93-onyx-direct.vercel.app/start?path=acr";

const BANK_PDF = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "sample-docs",
  "05-bank-statement-pacific-coast-jul-2026.pdf",
);

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

function protectionHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  const oidc = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (bypass) {
    headers["x-vercel-protection-bypass"] = bypass;
    headers["x-vercel-set-bypass-cookie"] = "samesitenone";
  }
  if (oidc) {
    headers["x-vercel-trusted-oidc-idp-token"] = oidc;
  }
  return headers;
}

function startUrl(): string {
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (!bypass) return PREVIEW_URL;
  const url = new URL(PREVIEW_URL);
  if (!url.searchParams.has("x-vercel-protection-bypass")) {
    url.searchParams.set("x-vercel-protection-bypass", bypass);
  }
  return url.toString();
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

async function typeSend(page: Page, value: string) {
  const before = await currentText(page);
  const input = page.locator(INPUT);
  await input.waitFor({ state: "visible", timeout: 10_000 });
  await input.click();
  await input.fill("");
  await input.pressSequentially(value, { delay: 15 });
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

async function structureMap(page: Page): Promise<Record<string, string>> {
  const desktop = page.locator(".file-preview__desktop .file-preview__row");
  const sheet = page.locator(".file-sheet .file-preview__row");
  let rows = desktop;
  if ((await desktop.count()) === 0) {
    const fileChip = page.locator("button.fox-file-chip");
    if ((await fileChip.count()) > 0) {
      await fileChip.first().click();
      await page.locator(".file-sheet").waitFor({ state: "visible", timeout: 5_000 });
    }
    rows = sheet;
  }
  const n = await rows.count();
  const out: Record<string, string> = {};
  for (let i = 0; i < n; i++) {
    const row = rows.nth(i);
    const label = ((await row.locator(".file-preview__label").innerText()) ?? "").trim();
    const value = ((await row.locator(".file-preview__value > span").first().innerText()) ?? "").trim();
    if (label) out[label] = value;
  }
  const close = page.locator(".file-sheet__close");
  if ((await close.count()) > 0 && (await close.isVisible().catch(() => false))) {
    await close.click();
  }
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
  if (!(await page.locator(START_OVER).count())) {
    throw new BeatFail(`Start over missing after load — url ${url}`);
  }
}

async function probeAccess(page: Page) {
  await page.goto(startUrl(), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(800);
  await assertGate(page);
  await page.locator(START_OVER).waitFor({ state: "visible", timeout: 20_000 });
}

async function hardStartOver(page: Page) {
  await page.goto(startUrl(), { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.locator(START_OVER).waitFor({ state: "visible", timeout: 30_000 });
  await page.locator(".fox-bubble--fox.is-current").waitFor({ state: "visible", timeout: 15_000 });
  await assertGate(page);
  await page.locator(START_OVER).click();
  await page.waitForTimeout(500);
  await page.locator(".fox-bubble--fox.is-current").getByRole("button", { name: "Buy", exact: true }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
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
  await settleQuoteToIncome(page, allowPricingSkip);
}

async function settleQuoteToIncome(page: Page, allowPricingSkip = false) {
  await waitCurrent(
    page,
    (text, chips) =>
      /How is income earned|Getting a live line|This one|Pricing when the file is ready|Not a lock/i.test(text) ||
      hasChip(chips, "This one"),
    45_000,
  );
  let leftZip = false;
  const started = Date.now();
  while (Date.now() - started < 90_000) {
    const text = await currentText(page);
    const chips = await currentChips(page);
    const onZip =
      /(?:California only|address or ZIP of the home|What ZIP is the property)/i.test(text) &&
      !/How is income earned|Getting a live line|Not a lock/i.test(text);
    if (!onZip) leftZip = true;
    if (leftZip && onZip) {
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
      if (!allowPricingSkip) {
        throw new BeatFail(`94123 did not price — ${text} | ${chips.join(" · ")}`);
      }
      if (hasChip(chips, "Skip")) {
        await clickChip(page, "Skip");
        await waitAsk(page, /How is income earned/i, 20_000);
        return;
      }
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
  await settleQuoteToIncome(page);
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
  const attach = page.locator("[data-composer-attach='true'], [data-docs-handoff='true']").first();
  await attach.setInputFiles(BANK_PDF);
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

const CASES: { n: number; title: string; run: (page: Page) => Promise<void> }[] = [
  { n: 1, title: "20 on a known price → down and loan write, Use this once", run: case1 },
  { n: 2, title: "Price 500000 then 1000000 → conflict → Down payment → 20 → Use this → 100000 / 400000, no second conflict", run: case2 },
  { n: 3, title: "No Not sure on price, down, or loan. I don’t know restores the same ask", run: case3 },
  { n: 4, title: "97535 → California only → 94123 writes and prices → next is income, not ZIP", run: case4 },
  { n: 5, title: "First statement Use this → second offered → Skip → contract", run: case5 },
  { n: 6, title: "Skip ID. Skip stated debts. File still moves", run: case6 },
  { n: 7, title: "2–4 asks rent. Skip rent allowed", run: case7 },
  { n: 8, title: "Mid-ask sideways question. Answer, then the same next chip", run: case8 },
];

async function openBrowser() {
  return chromium.launch({ headless: true });
}

function oneLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

async function runCase(
  browser: Browser,
  spec: (typeof CASES)[number],
): Promise<CaseResult> {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    extraHTTPHeaders: protectionHeaders(),
  });
  const page = await context.newPage();
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
  } finally {
    await context.close();
  }
}

function printRow(row: CaseResult) {
  if (row.ok) console.log(`${row.n} PASS ${row.title}`);
  else console.log(`${row.n} FAIL ${row.title} — ${row.beat}`);
}

async function main() {
  const browser = await openBrowser();
  const results: CaseResult[] = [];
  try {
    const probeContext = await browser.newContext({
      viewport: { width: 1400, height: 900 },
      extraHTTPHeaders: protectionHeaders(),
    });
    const probe = await probeContext.newPage();
    try {
      await probeAccess(probe);
    } catch (error) {
      const beat =
        error instanceof BeatFail ? error.beat : error instanceof Error ? oneLine(error.message) : String(error);
      await probeContext.close();
      for (const spec of CASES) {
        const row = { n: spec.n, title: spec.title, ok: false, beat };
        results.push(row);
        printRow(row);
      }
      process.exitCode = 1;
      return;
    }
    await probeContext.close();
    const only = new Set(
      (process.env.SPINE_WALKER_ONLY ?? "")
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((n) => Number.isFinite(n) && n > 0),
    );
    for (const spec of CASES) {
      if (only.size && !only.has(spec.n)) continue;
      const row = await runCase(browser, spec);
      results.push(row);
      printRow(row);
    }
  } finally {
    await browser.close();
  }
  if (results.some((row) => !row.ok)) process.exitCode = 1;
}

await main();
