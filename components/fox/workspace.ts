import {
  estimateRewardRange,
  formatRewardRange,
} from "@/components/products/rewardEstimate";
import {
  formatDollars,
  type CreditRange,
  type ExplorerScenario,
  type LoanPurpose,
  type Occupancy,
  type Timeline,
} from "@/components/products/scenario";
import { pathFromHomeChoice } from "./homeIdle";
import {
  AMOUNT_HELPER_BUBBLES,
  CREDIT_WORKSPACE_BUBBLES,
  OCCUPANCY_BUBBLES,
  PRODUCT_INTENT_BUBBLES,
  TERM_BUBBLES,
  TIMELINE_BUBBLES,
  type Capture,
  type FoxAction,
  type FoxIntakeDraft,
  type FoxPrompt,
  type IntakePath,
  type ProductIntent,
} from "./types";

export const START_ACR_TEXT =
  "I can prepare your relationship file. Let’s get the basics.";
export const START_LOAN_TEXT =
  "Loan-only. ACR is optional. Let’s get the basics.";

export function starterText(path?: IntakePath | null) {
  if (path === "loan-only") return START_LOAN_TEXT;
  return START_ACR_TEXT;
}

export function productIntentLabel(intent?: ProductIntent | null) {
  if (intent === "buy") return "Buy";
  if (intent === "refinance") return "Refinance";
  if (intent === "use-equity") return "Use equity";
  return "";
}

export function purposeForIntent(intent: ProductIntent): LoanPurpose {
  if (intent === "refinance") return "rate-term-refi";
  if (intent === "use-equity") return "heloc-heloan";
  return "purchase";
}

export function slugForIntent(intent: ProductIntent) {
  if (intent === "refinance") return "conventional-rate-term-refinance";
  if (intent === "use-equity") return "heloc-heloan";
  return "conventional-purchase";
}

export function productIntentFromSlug(slug?: string | null): ProductIntent | null {
  if (!slug) return null;
  if (slug === "heloc-heloan" || slug.includes("heloc") || slug.includes("heloan")) {
    return "use-equity";
  }
  if (slug.includes("refinance") || slug.includes("refi") || slug.includes("cash-out")) {
    return "refinance";
  }
  if (slug.includes("purchase") || slug === "jumbo" || slug === "fha" || slug === "va") {
    return "buy";
  }
  return null;
}

export function productIntentFromQuery(
  raw?: string | null,
): ProductIntent | null {
  if (!raw) return null;
  const token = raw.trim().toLowerCase();
  if (token === "buy" || token === "purchase") return "buy";
  if (token === "refinance" || token === "refi") return "refinance";
  if (token === "equity" || token === "use-equity" || token === "use_equity" || token === "heloc") {
    return "use-equity";
  }
  return productIntentFromSlug(token);
}

export function productIntentFromText(text: string): ProductIntent | null {
  const lower = text.trim().toLowerCase();
  const fromQuery = productIntentFromQuery(lower);
  if (fromQuery) return fromQuery;
  if (/\bbuy\b|purchase|buying/.test(lower)) return "buy";
  if (/refinanc|rate.?term|cash.?out/.test(lower)) return "refinance";
  if (/use equity|heloc|heloan|home equity|equity line/.test(lower)) {
    return "use-equity";
  }
  return PRODUCT_INTENT_BUBBLES.find(
    (item) => item.label.toLowerCase() === lower || item.value === lower,
  )?.value ?? null;
}

function bubbles(
  items: { value: string; label: string }[],
  field: Capture["field"],
): FoxAction[] {
  return items.map((item) => ({
    id: `${field}-${item.value || "skip"}`,
    label: item.label,
    event: "bubble" as const,
    capture: { field, value: item.value } as Capture,
  }));
}

function amountHelperActions(field: "skip-amount" | "skip-value"): FoxAction[] {
  return AMOUNT_HELPER_BUBBLES.map((item) => ({
    id: `${field}-${item.id}`,
    label: item.label,
    event: "bubble" as const,
    capture: { field },
  }));
}

/** Single /start conversation engine. Desktop and mobile share this order, copy, and path rules. */
export function workspacePrompt(draft: FoxIntakeDraft): FoxPrompt {
  if (!draft.path) return "intent";
  if (!draft.productIntent) return "product";
  if (!draft.occupancyAsked && !draft.occupancyChoice.value) return "occupancy";
  if (!draft.timelineAsked && !draft.timelineChoice.value) return "timeline";
  if (
    !draft.amountAsked &&
    draft.loanAmountValue == null &&
    draft.scenario?.loanAmount == null
  ) {
    return "amount";
  }
  if (
    !draft.valueAsked &&
    draft.propertyValueAmount == null &&
    draft.scenario?.propertyValue == null
  ) {
    return "value";
  }
  if (draft.path === "acr" && !draft.creditBand && !draft.scenario?.creditRange) {
    return "credit";
  }
  if (!draft.termAsked && draft.termYears == null) return "term";
  if (draft.phase === "confirmed" || draft.workspaceDraftStatus === "with-originator") {
    if (draft.correcting === "correct") return "correct";
    if (draft.correcting) return draft.correcting;
    return "done";
  }
  if (draft.correcting === "correct") return "correct";
  if (draft.correcting) return draft.correcting;
  if (!draft.documents.length && !draft.documentsSkipped) return "documents";
  if (draft.workspaceDraftStatus === "preparing") return "preparing";
  if (draft.workspaceDraftStatus === "ready") return "review";
  if (draft.documents.length || draft.documentsSkipped) return "preparing";
  return "documents";
}

export function workspacePromptCopy(
  prompt: FoxPrompt,
  draft: FoxIntakeDraft,
): {
  text: string;
  followUp?: string;
  facts?: PreviewFact[];
  actions?: FoxAction[];
} {
  if (prompt === "intent") {
    return {
      text: "Start a relationship, or just the loan?",
      actions: [
        { id: "start", label: "Start your relationship", event: "bubble", capture: { field: "path", value: "acr" } },
        { id: "loan", label: "Just need a mortgage", event: "bubble", capture: { field: "path", value: "loan-only" } },
      ],
    };
  }
  if (prompt === "product") {
    return {
      text: starterText(draft.path),
      actions: bubbles([...PRODUCT_INTENT_BUBBLES], "productIntent"),
    };
  }
  if (prompt === "occupancy") {
    const prior = draft.occupancyChoice.value
      ? OCCUPANCY_BUBBLES.find((item) => item.value === draft.occupancyChoice.value)?.label
      : "";
    return {
      text: prior
        ? `Occupancy in the file is ${prior}. Still right?`
        : "How will the property be used?",
      actions: bubbles([...OCCUPANCY_BUBBLES], "occupancy"),
    };
  }
  if (prompt === "timeline") {
    return {
      text: "What’s the timeline?",
      actions: bubbles([...TIMELINE_BUBBLES], "timeline"),
    };
  }
  if (prompt === "amount") {
    return {
      text:
        draft.productIntent === "use-equity"
          ? "What rough line or cash amount are you thinking about?"
          : "What’s a rough loan amount?",
      actions: amountHelperActions("skip-amount"),
    };
  }
  if (prompt === "value") {
    return {
      text:
        draft.productIntent === "use-equity"
          ? "What’s a rough home value?"
          : "And a rough property value?",
      actions: amountHelperActions("skip-value"),
    };
  }
  if (prompt === "credit") {
    return {
      text: "What credit range should I use for the estimate?",
      actions: bubbles([...CREDIT_WORKSPACE_BUBBLES], "creditRange"),
    };
  }
  if (prompt === "term") {
    return {
      text: "Any term in mind?",
      actions: [
        ...bubbles(TERM_BUBBLES.filter((item) => item.value), "termYears"),
        { id: "term-not-sure", label: "Not sure", event: "bubble", capture: { field: "skip-term" } },
        { id: "term-skip", label: "Skip for now", event: "bubble", capture: { field: "skip-term" } },
      ],
    };
  }
  if (prompt === "documents") {
    return {
      text: "Drop what you have. Skip is fine. I’ll work with what’s here.",
      actions: [
        { id: "open-docs", label: "Upload now", event: "open-docs", capture: { field: "open-docs" } },
        { id: "skip-docs", label: "Skip for now", event: "bubble", capture: { field: "skip-docs" } },
      ],
    };
  }
  if (prompt === "preparing") {
    return { text: "I’m preparing your file." };
  }
  if (prompt === "review") {
    return {
      text: "Here’s what I prepared:",
      facts: fileSummaryFacts(draft),
      followUp: "Does this look right?",
      actions: [
        { id: "looks-right", label: "Looks right", event: "bubble", capture: { field: "confirm-draft" } },
        { id: "needs-fix", label: "Needs a correction", event: "bubble", capture: { field: "needs-correction" } },
      ],
    };
  }
  if (prompt === "correct") {
    return {
      text: "Which part should Fox fix?",
      actions: bubbles(
        [
          { value: "product", label: "Product" },
          { value: "occupancy", label: "Occupancy" },
          { value: "timeline", label: "Timeline" },
          { value: "amount", label: "Amount" },
          { value: "documents", label: "Documents" },
        ],
        "correct",
      ),
    };
  }
  if (prompt === "done") {
    return {
      text: "A licensed originator will review the file. I cannot approve, lock, or commit to lend.",
    };
  }
  return {
    text: "I have the basics. I’ll keep this file current as we go.",
  };
}

export function workspaceGreeting(draft: FoxIntakeDraft): {
  text: string;
  followUp?: string;
  facts?: PreviewFact[];
  actions?: FoxAction[];
} {
  const prompt = workspacePrompt(draft);
  if (prompt === "product") {
    return workspacePromptCopy("product", draft);
  }
  if (prompt === "intent") {
    return workspacePromptCopy("intent", draft);
  }
  const next = workspacePromptCopy(prompt, draft);
  if (
    prompt === "basics-done" ||
    prompt === "documents" ||
    prompt === "preparing" ||
    prompt === "review" ||
    prompt === "correct" ||
    prompt === "done"
  ) {
    return next;
  }
  return {
    text: `${starterText(draft.path)} ${next.text}`,
    actions: next.actions,
  };
}

export function formatMoney(value: number) {
  return `$${formatDollars(value)}`;
}

/** Live composer commas. Returns null when the text is not a pure money number. */
export function formatLiveMoneyInput(raw: string): string | null {
  if (/[a-zA-Z]/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length > 12) return null;
  return Number(digits).toLocaleString("en-US");
}

export function caretAfterMoneyFormat(raw: string, caret: number, formatted: string) {
  const digitsBefore = raw.slice(0, Math.max(0, caret)).replace(/\D/g, "").length;
  if (digitsBefore === 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) {
      seen += 1;
      if (seen === digitsBefore) return i + 1;
    }
  }
  return formatted.length;
}

export function confirmedMoneyText(raw: string): string | null {
  const pair = parseAmountPair(raw);
  if (pair.loan != null && pair.value != null && pair.value !== pair.loan) {
    return `${formatMoney(pair.loan)} on ${formatMoney(pair.value)}`;
  }
  const amount = pair.loan ?? pair.value ?? parseLooseAmount(raw);
  return amount != null ? formatMoney(amount) : null;
}

function collectAmounts(text: string): number[] {
  const pattern =
    /\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(m|mm|million|k|thousand)?/gi;
  const amounts: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const value = amountFromParts(match[1], match[2]);
    if (value != null) amounts.push(value);
  }
  return amounts;
}

export function parseLooseAmount(text: string): number | null {
  return collectAmounts(text)[0] ?? null;
}

export function parseAmountPair(text: string): { loan?: number; value?: number } {
  const amounts = collectAmounts(text);
  if (amounts.length >= 2) {
    const [first, second] = amounts;
    const loan = Math.min(first, second);
    const value = Math.max(first, second);
    return { loan, value };
  }
  if (amounts.length === 1) {
    const lower = text.toLowerCase();
    if (/value|worth|home|house|property/.test(lower) && !/loan|line|cash/.test(lower)) {
      return { value: amounts[0] };
    }
    return { loan: amounts[0] };
  }
  return {};
}

export function isUnknownAmount(text: string) {
  if (parseLooseAmount(text) != null) return false;
  const lower = text.trim().toLowerCase().replace(/['’]/g, "");
  return /dont know|do not know|not sure|unsure|unknown|no idea|\bidk\b|dunno|skip( for now)?|\blater\b|n\/a|\bnone\b/.test(
    lower,
  );
}

function amountFromParts(raw: string, unit?: string): number | null {
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const suffix = (unit ?? "").toLowerCase();
  if (suffix === "m" || suffix === "mm" || suffix === "million") {
    return Math.round(n * 1_000_000);
  }
  if (suffix === "k" || suffix === "thousand") {
    return Math.round(n * 1_000);
  }
  if (n < 1000) return null;
  return Math.round(n);
}

export function parseCreditRange(text: string): CreditRange | null {
  const lower = text.trim().toLowerCase();
  const match = CREDIT_WORKSPACE_BUBBLES.find(
    (item) => item.label.toLowerCase() === lower || item.value === lower,
  );
  if (match) return match.value as CreditRange;
  if (/760|excellent/.test(lower)) return "760+";
  if (/720|740/.test(lower)) return "720-759";
  if (/680|700/.test(lower)) return "680-719";
  if (/not sure|unsure|unknown/.test(lower)) return "not-sure";
  return null;
}

export function parseTermYears(text: string): number | null | "skip" {
  const lower = text.trim().toLowerCase();
  if (/skip|later|not sure|no|none/.test(lower)) return "skip";
  if (/\b30\b/.test(lower)) return 30;
  if (/\b15\b/.test(lower)) return 15;
  if (/\b10\b/.test(lower)) return 10;
  const years = lower.match(/(\d+)\s*-?\s*year/);
  if (years) {
    const n = Number(years[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function occupancyFromText(text: string) {
  const lower = text.trim().toLowerCase();
  return (
    OCCUPANCY_BUBBLES.find(
      (item) => item.label.toLowerCase() === lower || item.value === lower,
    ) ??
    (/primary|owner/.test(lower)
      ? OCCUPANCY_BUBBLES[0]
      : /second/.test(lower)
        ? OCCUPANCY_BUBBLES[1]
        : /invest/.test(lower)
          ? OCCUPANCY_BUBBLES[2]
          : undefined)
  );
}

function timelineFromText(text: string) {
  const lower = text.trim().toLowerCase();
  return TIMELINE_BUBBLES.find(
    (item) =>
      item.label.toLowerCase() === lower ||
      item.value === lower ||
      (lower.includes("explor") && item.value === "exploring") ||
      (lower.includes("ready") && item.value === "ready-now") ||
      (lower.includes("30") && item.value === "30-90"),
  );
}

export function workspaceReply(
  text: string,
  draft: FoxIntakeDraft,
): {
  text: string;
  followUp?: string;
  facts?: PreviewFact[];
  actions?: FoxAction[];
  capture?: Capture;
} | null {
  const q = text.trim();
  const lower = q.toLowerCase();
  const prompt = workspacePrompt(draft);

  if (/(approv|lock|commit to lend|am i approved)/i.test(lower)) {
    return {
      text: "I can prepare a file. I cannot approve, lock, or commit to lend.",
    };
  }

  if (prompt === "intent") {
    const path = pathFromHomeChoice(lower);
    if (!path) {
      return { text: "Tap Start your relationship or Just need a mortgage." };
    }
    return {
      ...workspacePromptCopy("product", { ...draft, path }),
      capture: { field: "path", value: path },
    };
  }

  if (prompt === "product") {
    const intent = productIntentFromText(q);
    if (!intent) {
      return { text: "Tap Buy, Refinance, or Use equity." };
    }
    return {
      ...workspacePromptCopy("occupancy", { ...draft, productIntent: intent }),
      capture: { field: "productIntent", value: intent },
    };
  }

  if (prompt === "occupancy") {
    const match = occupancyFromText(q);
    if (!match) return { text: "Tap Primary, Second home, or Investment." };
    return {
      ...workspacePromptCopy("timeline", draft),
      capture: { field: "occupancy", value: match.value },
    };
  }

  if (prompt === "timeline") {
    const match = timelineFromText(q);
    if (!match) return { text: "Tap Ready now, 30–90 days, or Just exploring." };
    return {
      ...workspacePromptCopy("amount", draft),
      capture: { field: "timeline", value: match.value },
    };
  }

  if (prompt === "amount") {
    if (isUnknownAmount(q)) {
      const nextDraft = { ...draft, amountAsked: true };
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-amount" },
      };
    }
    const pair = parseAmountPair(q);
    const amount = pair.loan ?? parseLooseAmount(q);
    if (amount == null) {
      return {
        text: "A rough number works, or tap Not sure.",
        actions: amountHelperActions("skip-amount"),
      };
    }
    const nextDraft = { ...draft, loanAmountValue: amount, amountAsked: true };
    if (pair.value && pair.value !== amount) {
      nextDraft.propertyValueAmount = pair.value;
      nextDraft.valueAsked = true;
    }
    const next = workspacePromptCopy(workspacePrompt(nextDraft), nextDraft);
    return {
      ...next,
      capture: {
        field: "loanAmount",
        value: pair.value && pair.value !== amount ? `${amount}:${pair.value}` : String(amount),
      },
    };
  }

  if (prompt === "value") {
    if (isUnknownAmount(q)) {
      const nextDraft = { ...draft, valueAsked: true };
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-value" },
      };
    }
    const amount = parseAmountPair(q).value ?? parseLooseAmount(q);
    if (amount == null) {
      return {
        text: "A rough number works, or tap Not sure.",
        actions: amountHelperActions("skip-value"),
      };
    }
    const nextDraft = { ...draft, propertyValueAmount: amount, valueAsked: true };
    const next = workspacePromptCopy(workspacePrompt(nextDraft), nextDraft);
    return {
      ...next,
      capture: { field: "propertyValue", value: String(amount) },
    };
  }

  if (prompt === "credit") {
    const range = parseCreditRange(q);
    if (!range) return { text: "Tap a credit range, or Not sure." };
    const nextDraft = { ...draft, creditBand: range };
    const next = workspacePromptCopy(workspacePrompt(nextDraft), nextDraft);
    return {
      ...next,
      capture: { field: "creditRange", value: range },
    };
  }

  if (prompt === "term") {
    const term = parseTermYears(q);
    if (term == null) return { text: "Tap 30 year, 15 year, or Skip." };
    if (term === "skip") {
      return {
        ...workspacePromptCopy("documents", { ...draft, termAsked: true }),
        capture: { field: "skip-term" },
      };
    }
    return {
      ...workspacePromptCopy("documents", { ...draft, termAsked: true }),
      capture: { field: "termYears", value: String(term) },
    };
  }

  if (prompt === "documents") {
    if (/(skip|later|not yet|don'?t have|fine)/i.test(lower)) {
      return {
        ...workspacePromptCopy("preparing", draft),
        capture: { field: "skip-docs" },
      };
    }
    if (/(upload|drop|now|add)/i.test(lower)) {
      return {
        text: "Add a file in the preview, or skip.",
        actions: workspacePromptCopy("documents", draft).actions,
        capture: { field: "open-docs" },
      };
    }
    return {
      text: "Tap Upload now, or Skip for now.",
      actions: workspacePromptCopy("documents", draft).actions,
    };
  }

  if (prompt === "preparing") {
    return { text: "I’m preparing your file." };
  }

  if (prompt === "review") {
    if (/(looks right|confirm|yes|correct|good)/i.test(lower)) {
      return { ...workspacePromptCopy("done", draft), capture: { field: "confirm-draft" } };
    }
    if (/(correction|fix|wrong|no|edit)/i.test(lower)) {
      return { ...workspacePromptCopy("correct", draft), capture: { field: "needs-correction" } };
    }
    return workspacePromptCopy("review", draft);
  }

  if (prompt === "correct") {
    const map: { test: RegExp; value: string }[] = [
      { test: /product|buy|refi|equity/, value: "product" },
      { test: /occupan/, value: "occupancy" },
      { test: /time/, value: "timeline" },
      { test: /amount|value|loan/, value: "amount" },
      { test: /doc/, value: "documents" },
    ];
    const hit = map.find((item) => item.test.test(lower));
    if (!hit) return { text: "Tap Product, Occupancy, Timeline, Amount, or Documents." };
    return {
      ...workspacePromptCopy(hit.value as FoxPrompt, draft),
      capture: { field: "correct", value: hit.value },
    };
  }

  if (/(reward|membership)/i.test(lower)) {
    if (draft.path === "loan-only") {
      return { text: "This file is loan only. It does not include a membership reward." };
    }
    const range = estimateFromDraft(draft);
    return {
      text: range
        ? `Estimated ACR reward is ${formatRewardRange(range)}. Sample, not live.`
        : "I’ll estimate a reward range once the scenario is complete enough.",
    };
  }

  if (prompt === "basics-done" || prompt === "done") {
    const intent = productIntentFromText(q);
    if (intent && prompt === "basics-done") {
      return {
        text: `Updated to ${productIntentLabel(intent)}.`,
        capture: { field: "productIntent", value: intent },
      };
    }
    if (prompt === "done") {
      if (/(approv|lock|commit to lend)/i.test(lower)) {
        return { text: "I can prepare a file. I cannot approve, lock, or commit to lend." };
      }
      if (/(next|what now|status|originator|review|who)/i.test(lower)) {
        return { text: "A licensed originator will review the file." };
      }
      return {
        text: "A licensed originator will review the file. Ask if you have a process question.",
      };
    }
    return {
      text: "The file has the basics. Ask if you want to change anything.",
    };
  }

  return null;
}

export function estimateFromDraft(draft: FoxIntakeDraft) {
  const scenario = scenarioForEstimate(draft);
  return scenario ? estimateRewardRange(scenario) : null;
}

export function scenarioForEstimate(
  draft: FoxIntakeDraft,
): ExplorerScenario | null {
  const intent = draft.productIntent ?? productIntentFromSlug(draft.scenario?.productSlug);
  const occupancy = (draft.occupancyChoice.value ||
    draft.scenario?.occupancy) as Occupancy | undefined;
  const credit = draft.creditBand ?? draft.scenario?.creditRange;
  const loanAmount = draft.loanAmountValue ?? draft.scenario?.loanAmount;
  const propertyValue = draft.propertyValueAmount ?? draft.scenario?.propertyValue;
  if (!intent || !occupancy || !credit) return null;
  if (loanAmount == null && propertyValue == null) return null;

  return {
    zip: draft.scenario?.zip ?? "90001",
    purpose: purposeForIntent(intent),
    propertyValue: propertyValue ?? loanAmount ?? 0,
    amountMode: "loan",
    loanAmount,
    downPayment: draft.scenario?.downPayment,
    creditRange: credit,
    occupancy,
    timeline: (draft.timelineChoice.value || draft.scenario?.timeline) as Timeline | undefined,
    productSlug: slugForIntent(intent),
    productName: productIntentLabel(intent),
  };
}

export type PreviewFact = {
  id: string;
  label: string;
  value: string;
  note?: string;
};

export function previewFacts(draft: FoxIntakeDraft): PreviewFact[] {
  const facts: PreviewFact[] = [];
  if (draft.path === "acr") {
    facts.push({ id: "path", label: "Path", value: "ACR" });
  } else if (draft.path === "loan-only") {
    facts.push({ id: "path", label: "Path", value: "Loan only" });
  }

  const intent = draft.productIntent ?? productIntentFromSlug(draft.scenario?.productSlug);
  if (intent) {
    facts.push({
      id: "product",
      label: "Product",
      value: productIntentLabel(intent),
    });
  }

  const occupancy =
    draft.occupancyChoice.value || draft.scenario?.occupancy || "";
  const occupancyLabel = OCCUPANCY_BUBBLES.find((item) => item.value === occupancy)?.label;
  if (occupancyLabel) {
    facts.push({ id: "occupancy", label: "Occupancy", value: occupancyLabel });
  }

  const timeline =
    draft.timelineChoice.value || draft.scenario?.timeline || "";
  const timelineLabel = TIMELINE_BUBBLES.find((item) => item.value === timeline)?.label;
  if (timelineLabel) {
    facts.push({ id: "timeline", label: "Timeline", value: timelineLabel });
  }

  const loan =
    draft.loanAmountValue ??
    (!draft.amountAsked ? draft.scenario?.loanAmount : undefined);
  if (loan != null && loan > 0) {
    facts.push({
      id: "amount",
      label: intent === "use-equity" ? "Line / cash" : "Loan amount",
      value: formatMoney(loan),
      note: "Rough · estimated",
    });
  }

  const value =
    draft.propertyValueAmount ??
    (!draft.valueAsked ? draft.scenario?.propertyValue : undefined);
  if (value != null && value > 0) {
    facts.push({
      id: "value",
      label: "Property value",
      value: formatMoney(value),
      note: "Rough · estimated",
    });
  }

  if (draft.termYears) {
    facts.push({
      id: "term",
      label: "Term",
      value: `${draft.termYears} year`,
    });
  }

  const range = draft.path === "acr" ? estimateFromDraft(draft) : null;
  if (range) {
    facts.push({
      id: "reward",
      label: "Estimated ACR reward",
      value: formatRewardRange(range),
      note: "Sample · indicative · not live",
    });
  }

  if (draft.documents.length) {
    facts.push({
      id: "docs",
      label: "Docs",
      value: `${draft.documents.length} received`,
    });
  } else if (draft.documentsSkipped) {
    facts.push({ id: "docs", label: "Docs", value: "Skipped for now" });
  } else if (draft.termAsked || draft.workspaceDraftStatus) {
    facts.push({ id: "docs", label: "Docs", value: "Waiting" });
  }

  if (draft.workspaceDraftStatus === "preparing") {
    facts.push({ id: "draft", label: "Draft", value: "Preparing" });
  } else if (draft.workspaceDraftStatus === "ready") {
    facts.push({ id: "draft", label: "Draft", value: "Ready for you" });
  } else if (draft.workspaceDraftStatus === "with-originator") {
    facts.push({ id: "draft", label: "Draft", value: "With originator" });
  } else if (draft.status) {
    facts.push({ id: "draft", label: "Draft", value: draft.status });
  }

  return facts;
}

const CHAT_SUMMARY_IDS = new Set([
  "path",
  "product",
  "occupancy",
  "timeline",
  "amount",
  "value",
  "term",
  "reward",
  "docs",
]);

export function fileSummaryFacts(draft: FoxIntakeDraft): PreviewFact[] {
  return previewFacts(draft).filter((fact) => CHAT_SUMMARY_IDS.has(fact.id));
}
