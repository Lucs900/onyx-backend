/**
 * One file_id per browser File. Homepage resumes. Start over is the only wipe.
 * Do not paint file_id in the Fox thread. Rate chips stay untouched.
 */
import assert from "node:assert/strict";
import { homePathActions } from "../components/fox/homeIdle";
import {
  beginWorkspaceFromHero,
  continueWorkspaceFromEntry,
  emptyDraft,
  getFoxDraft,
  getFoxMessages,
  loadIntakeDraft,
  resetWorkspaceForEntry,
  setFoxMessages,
  startOverWorkspace,
} from "../components/fox/store";
import {
  ACR_START_HREF,
  LOAN_START_HREF,
} from "../components/products/startPath";
import { previewFacts, workspaceGreeting } from "../components/fox/workspace";
import { liveCouponActions } from "../components/fox/liveCoupon";

assert.equal(emptyDraft().fileId, undefined);
assert.equal(ACR_START_HREF, "/start?path=acr");
assert.equal(LOAN_START_HREF, "/start?path=loan");
assert.ok(!ACR_START_HREF.includes("fresh="));
assert.ok(!LOAN_START_HREF.includes("fresh="));
assert.deepEqual(
  homePathActions().map((item) => item.href),
  ["/start?path=acr", "/start?path=loan"],
);

const first = resetWorkspaceForEntry("acr");
assert.ok(first.fileId);
assert.equal(first.path, "acr");
const firstId = first.fileId!;

const sketched = loadIntakeDraft({
  ...getFoxDraft(),
  productIntent: "buy",
  occupancyAsked: true,
  occupancyChoice: { ...emptyDraft().occupancyChoice, value: "primary" },
});
assert.equal(sketched.fileId, firstId);
assert.equal(sketched.productIntent, "buy");
assert.equal(sketched.occupancyChoice.value, "primary");

const thread = [
  { id: "fox-1", role: "fox" as const, text: "Buy, refinance, HELOC, jumbo, or other?" },
  { id: "client-1", role: "client" as const, text: "Buy" },
  { id: "fox-2", role: "fox" as const, text: "Will you live there?" },
];
setFoxMessages(thread);

const refresh = continueWorkspaceFromEntry("acr", null, { fresh: true });
assert.equal(refresh.fileId, firstId);
assert.equal(refresh.productIntent, "buy");
assert.equal(refresh.occupancyChoice.value, "primary");
assert.deepEqual(
  getFoxMessages().map((item) => item.text),
  thread.map((item) => item.text),
);

const homeAcr = beginWorkspaceFromHero("acr");
assert.equal(homeAcr.fileId, firstId);
assert.equal(homeAcr.path, "acr");
assert.equal(homeAcr.productIntent, "buy");
assert.equal(getFoxMessages().length, thread.length);

const homeLoan = beginWorkspaceFromHero("loan-only");
assert.equal(homeLoan.fileId, firstId);
assert.equal(homeLoan.path, "acr");
assert.equal(homeLoan.productIntent, "buy");
assert.equal(getFoxMessages().length, thread.length);

const greet = workspaceGreeting(getFoxDraft());
assert.doesNotMatch(greet.text, /file[_\s-]?id/i);
assert.ok(!(greet.facts ?? []).some((fact) => /file[_\s-]?id/i.test(`${fact.id} ${fact.label} ${fact.value}`)));
assert.ok(!previewFacts(getFoxDraft()).some((fact) => fact.id === "file-id" || /file id/i.test(fact.label)));
assert.ok(!getFoxMessages().some((item) => /file[_\s-]?id/i.test(item.text)));

const wiped = startOverWorkspace("acr");
assert.ok(wiped.fileId);
assert.notEqual(wiped.fileId, firstId);
assert.equal(wiped.productIntent, undefined);
assert.equal(wiped.occupancyChoice.value, "");
assert.equal(getFoxMessages().length, 0);
assert.ok(!previewFacts(wiped).some((fact) => fact.id === "product" || fact.id === "occupancy"));

const afterWipeId = wiped.fileId!;
const afterWipeHome = beginWorkspaceFromHero("acr");
assert.equal(afterWipeHome.fileId, afterWipeId);
assert.equal(afterWipeHome.path, "acr");

loadIntakeDraft(emptyDraft());
setFoxMessages([]);
const emptyBrowserLoan = beginWorkspaceFromHero("loan-only");
assert.ok(emptyBrowserLoan.fileId);
assert.notEqual(emptyBrowserLoan.fileId, afterWipeId);
assert.equal(emptyBrowserLoan.path, "loan-only");

assert.deepEqual(
  liveCouponActions().map((item) => item.label),
  ["This one", "Lower payment"],
);

console.log("file-identity PASS");
