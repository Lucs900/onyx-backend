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

export function workspacePrompt(draft: FoxIntakeDraft): FoxPrompt {
  if (!draft.path) return "intent";
  if (!draft.productIntent) return "product";
  if (!draft.occupancyAsked && !draft.occupancyChoice.value) return "occupancy";
  if (!draft.timelineAsked && !draft.timelineChoice.value) return "timeline";
  if (draft.loanAmountValue == null && draft.scenario?.loanAmount == null) {
    return "amount";
  }
  if (draft.propertyValueAmount == null && draft.scenario?.propertyValue == null) {
    return "value";
  }
  if (draft.path === "acr" && !draft.creditBand && !draft.scenario?.creditRange) {
    return "credit";
  }
  if (!draft.termAsked && draft.termYears == null) return "term";
  return "basics-done";
}

export function workspacePromptCopy(
  prompt: FoxPrompt,
  draft: FoxIntakeDraft,
): { text: string; actions?: FoxAction[] } {
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
    };
  }
  if (prompt === "value") {
    return {
      text:
        draft.productIntent === "use-equity"
          ? "What’s a rough home value?"
          : "And a rough property value?",
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
      actions: bubbles([...TERM_BUBBLES], "termYears"),
    };
  }
  return {
    text: "I have the basics. I’ll keep this file current as we go.",
  };
}

export function workspaceGreeting(draft: FoxIntakeDraft): {
  text: string;
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
  if (prompt === "basics-done") return next;
  return {
    text: `${starterText(draft.path)} ${next.text}`,
    actions: next.actions,
  };
}

function collectAmounts(text: string): number[] {
  const pattern = /(\d+(?:\.\d+)?)\s*(m|mm|million|k|thousand)?/gi;
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

function amountFromParts(raw: string, unit?: string): number | null {
  const n = Number(raw);
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
    const pair = parseAmountPair(q);
    const amount = pair.loan ?? parseLooseAmount(q);
    if (amount == null) {
      return {
        text:
          draft.productIntent === "use-equity"
            ? "Give me a rough dollar amount for the line or cash."
            : "Give me a rough dollar amount for the loan.",
      };
    }
    const nextDraft = { ...draft, loanAmountValue: amount };
    if (pair.value && pair.value !== amount) {
      nextDraft.propertyValueAmount = pair.value;
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
    const amount = parseAmountPair(q).value ?? parseLooseAmount(q);
    if (amount == null) {
      return { text: "Give me a rough property value in dollars." };
    }
    const nextDraft = { ...draft, propertyValueAmount: amount };
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
        ...workspacePromptCopy("basics-done", draft),
        capture: { field: "skip-term" },
      };
    }
    return {
      ...workspacePromptCopy("basics-done", draft),
      capture: { field: "termYears", value: String(term) },
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

  if (prompt === "basics-done") {
    const intent = productIntentFromText(q);
    if (intent) {
      return {
        text: `Updated to ${productIntentLabel(intent)}.`,
        capture: { field: "productIntent", value: intent },
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

  const loan = draft.loanAmountValue ?? draft.scenario?.loanAmount;
  if (loan != null && loan > 0) {
    facts.push({
      id: "amount",
      label: intent === "use-equity" ? "Line / cash" : "Loan amount",
      value: `$${formatDollars(loan)}`,
      note: "Rough · estimated",
    });
  }

  const value = draft.propertyValueAmount ?? draft.scenario?.propertyValue;
  if (value != null && value > 0) {
    facts.push({
      id: "value",
      label: "Property value",
      value: `$${formatDollars(value)}`,
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
  }

  if (draft.status) {
    facts.push({ id: "draft", label: "Draft", value: draft.status });
  } else if (workspacePrompt(draft) === "basics-done") {
    facts.push({ id: "draft", label: "Draft", value: "Basics in file" });
  }

  return facts;
}
