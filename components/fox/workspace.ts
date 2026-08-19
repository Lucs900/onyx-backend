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
  DOC_SLOTS,
  INCOME_BUBBLES,
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
  "I can prepare your relationship file. We’ll keep this desk open after close.";
export const START_LOAN_TEXT =
  "This is the loan. ACR is optional if you want the desk later.";

export function starterText(path?: IntakePath | null) {
  if (path === "loan-only") return START_LOAN_TEXT;
  return START_ACR_TEXT;
}

export function productIntentLabel(intent?: ProductIntent | null) {
  if (intent === "buy") return "Buy";
  if (intent === "refinance") return "Refinance";
  if (intent === "heloc") return "HELOC";
  if (intent === "jumbo") return "Jumbo";
  if (intent === "other") return "Other";
  return "";
}

export function purposeForIntent(intent: ProductIntent): LoanPurpose {
  if (intent === "refinance") return "rate-term-refi";
  if (intent === "heloc") return "heloc-heloan";
  return "purchase";
}

export function slugForIntent(intent: ProductIntent) {
  if (intent === "refinance") return "conventional-rate-term-refinance";
  if (intent === "heloc") return "heloc-heloan";
  if (intent === "jumbo") return "jumbo";
  if (intent === "other") return "other";
  return "conventional-purchase";
}

export function normalizeProductIntent(
  intent?: string | null,
): ProductIntent | undefined {
  if (intent === "use-equity" || intent === "heloc") return "heloc";
  if (
    intent === "buy" ||
    intent === "refinance" ||
    intent === "jumbo" ||
    intent === "other"
  ) {
    return intent;
  }
  return undefined;
}

export function productIntentFromSlug(slug?: string | null): ProductIntent | null {
  if (!slug) return null;
  if (
    slug === "heloc-heloan" ||
    slug === "use-equity" ||
    slug.includes("heloc") ||
    slug.includes("heloan")
  ) {
    return "heloc";
  }
  if (slug === "jumbo" || slug.includes("jumbo")) return "jumbo";
  if (slug === "other") return "other";
  if (slug.includes("refinance") || slug.includes("refi") || slug.includes("cash-out")) {
    return "refinance";
  }
  if (slug.includes("purchase") || slug === "fha" || slug === "va") {
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
    return "heloc";
  }
  if (token === "jumbo") return "jumbo";
  if (token === "other") return "other";
  return productIntentFromSlug(token);
}

export function productIntentFromText(text: string): ProductIntent | null {
  const lower = text.trim().toLowerCase();
  const fromQuery = productIntentFromQuery(lower);
  if (fromQuery) return fromQuery;
  if (/\bbuy\b|purchase|buying/.test(lower)) return "buy";
  if (/refinanc|rate.?term|cash.?out/.test(lower)) return "refinance";
  if (/\bjumbo\b/.test(lower)) return "jumbo";
  if (/use equity|heloc|heloan|home equity|equity line/.test(lower)) {
    return "heloc";
  }
  if (/\bother\b/.test(lower)) return "other";
  return PRODUCT_INTENT_BUBBLES.find(
    (item) => item.label.toLowerCase() === lower || item.value === lower,
  )?.value ?? null;
}

export function usesPurchasePrice(intent?: ProductIntent | null) {
  return intent === "buy" || intent === "jumbo";
}

export function slotFromFilename(name: string): import("./types").DocSlot {
  const lower = name.toLowerCase();
  if (/w-?2/.test(lower)) return "w2";
  if (/pay.?stub|payslip/.test(lower)) return "paystubs";
  if (/tax|1099|k-?1|schedule.?c|profit|business/.test(lower)) return "other";
  if (/bank|statement/.test(lower)) return "bank";
  if (/\bid\b|license|passport|driver/.test(lower)) return "id";
  return "other";
}

export function sampleRateApplies(intent?: ProductIntent | null) {
  return intent === "buy" || intent === "refinance";
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

export function incomeSettled(draft: FoxIntakeDraft) {
  return Boolean(draft.incomeAsked || draft.incomeType.value);
}

export function docsRequestForIncome(income?: string | null): {
  text: string;
  labels: string[];
} {
  if (income === "w2") {
    return {
      labels: ["Paystubs", "W-2"],
      text: "Paystubs or a W-2 help. Drop what you have. Skip is fine.",
    };
  }
  if (income === "self-employed") {
    return {
      labels: ["Tax returns", "Business docs"],
      text: "Tax returns or business docs help. Drop what you have. Skip is fine.",
    };
  }
  if (income === "both") {
    return {
      labels: ["Paystubs", "W-2", "Tax returns", "Business docs"],
      text: "Paystubs or a W-2, plus tax returns or business docs. Drop what you have. Skip is fine.",
    };
  }
  return {
    labels: [],
    text: "Drop what you have. Skip is fine. I’ll work with what’s here.",
  };
}

function incomeFromText(text: string) {
  const lower = text.trim().toLowerCase();
  return (
    INCOME_BUBBLES.find(
      (item) => item.label.toLowerCase() === lower || item.value === lower,
    ) ??
    (/\bboth\b/.test(lower)
      ? INCOME_BUBBLES.find((item) => item.value === "both")
      : /\bself/.test(lower) || /\b1099\b/.test(lower)
        ? INCOME_BUBBLES.find((item) => item.value === "self-employed")
        : /\bw-?2\b/.test(lower) || /\bwages?\b/.test(lower)
          ? INCOME_BUBBLES.find((item) => item.value === "w2")
          : /\bother\b/.test(lower)
            ? INCOME_BUBBLES.find((item) => item.value === "other")
            : undefined)
  );
}

function documentsAskText(draft: FoxIntakeDraft): string {
  return docsRequestForIncome(draft.incomeType.value).text;
}

function docsSettled(draft: FoxIntakeDraft) {
  return draft.documents.length > 0 || draft.documentsSkipped;
}

function sketchNumberReady(draft: FoxIntakeDraft) {
  if (usesPurchasePrice(draft.productIntent)) {
    return (
      Boolean(draft.valueAsked) ||
      draft.propertyValueAmount != null
    );
  }
  return Boolean(draft.amountAsked) || draft.loanAmountValue != null;
}

function withIncomeType(draft: FoxIntakeDraft, value: string): FoxIntakeDraft {
  return {
    ...draft,
    incomeType: { ...draft.incomeType, value },
    incomeAsked: true,
  };
}

function amountHelperActions(field: "skip-amount" | "skip-value"): FoxAction[] {
  return AMOUNT_HELPER_BUBBLES.map((item) => ({
    id: `${field}-${item.id}`,
    label: item.label,
    event: "bubble" as const,
    capture: { field },
  }));
}

export const SAMPLE_NOTE = "Sample · indicative · not live";
export const SAMPLE_RATE = 0.0675;
export const SAMPLE_RATE_LABEL = "6.750%";
export const SAMPLE_TERM_MONTHS = 360;
export const SAMPLE_STRUCTURE = "Conventional 30-year";
const SAMPLE_SAFE_CREDIT: CreditRange = "680-719";

export function loanAmountFromDraft(draft: FoxIntakeDraft): number | undefined {
  return (
    draft.loanAmountValue ??
    (!draft.amountAsked ? draft.scenario?.loanAmount : undefined)
  );
}

export function sampleMonthlyPayment(loanAmount?: number | null): number | null {
  if (loanAmount == null || loanAmount <= 0) return null;
  const monthlyRate = SAMPLE_RATE / 12;
  const growth = (1 + monthlyRate) ** SAMPLE_TERM_MONTHS;
  const payment = (loanAmount * monthlyRate * growth) / (growth - 1);
  if (!Number.isFinite(payment) || payment <= 0) return null;
  return payment;
}

export function formatSamplePayment(loanAmount?: number | null): string {
  const payment = sampleMonthlyPayment(loanAmount);
  if (payment == null) return "Loan amount not set";
  return `$${Math.round(payment).toLocaleString("en-US")}/mo`;
}

function creditSettled(draft: FoxIntakeDraft) {
  return Boolean(draft.creditAsked || draft.creditBand);
}

export function sampleReady(draft: FoxIntakeDraft): boolean {
  if (!draft.path || !draft.productIntent) return false;
  if (!draft.occupancyAsked && !draft.occupancyChoice.value) return false;
  if (!draft.timelineAsked && !draft.timelineChoice.value) return false;
  if (!sketchNumberReady(draft)) return false;
  if (!creditSettled(draft)) return false;
  return incomeSettled(draft);
}

/** Single /start conversation engine. Desktop and mobile share this order, copy, and path rules. */
export function workspacePrompt(draft: FoxIntakeDraft): FoxPrompt {
  if (!draft.path) return "intent";
  if (draft.correcting === "path-switch") return "path-switch";
  if (draft.correcting === "correct") return "correct";
  if (draft.correcting === "credit") return "credit";
  if (draft.correcting === "term" && (draft.termAsked || draft.termYears != null)) {
    return "term";
  }
  if (draft.correcting === "income" && draft.incomeType.value) {
    return "income";
  }
  if (draft.correcting) return draft.correcting;
  if (!draft.productIntent) return "product";
  if (!draft.occupancyAsked && !draft.occupancyChoice.value) return "occupancy";
  if (!draft.timelineAsked && !draft.timelineChoice.value) return "timeline";
  if (!sketchNumberReady(draft)) {
    return usesPurchasePrice(draft.productIntent) ? "value" : "amount";
  }
  if (!creditSettled(draft)) return "credit";
  if (!incomeSettled(draft)) return "income";
  if (!draft.sampleAccepted) return "review";
  return "done";
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
        draft.productIntent === "heloc"
          ? "What rough line or cash amount are you thinking about?"
          : draft.productIntent === "other"
            ? "What’s a rough amount?"
            : "What’s a rough payoff or cash amount?",
      actions: amountHelperActions("skip-amount"),
    };
  }
  if (prompt === "value") {
    return {
      text:
        draft.productIntent === "jumbo"
          ? "What’s a rough purchase price?"
          : "What’s a rough purchase price?",
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
  if (prompt === "income") {
    return {
      text: "How is income earned?",
      actions: bubbles([...INCOME_BUBBLES], "incomeType"),
    };
  }
  if (prompt === "documents") {
    return {
      text: documentsAskText(draft),
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
      text: "Here’s a sample structure.",
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
      text: "Tap any line on the structure.",
    };
  }
  if (prompt === "path-switch") {
    if (draft.path === "loan-only") {
      return {
        text: "Switch to the desk?",
        actions: [
          { id: "switch-acr", label: "Switch to the desk", event: "bubble", capture: { field: "path", value: "acr" } },
          { id: "keep-path", label: "Keep this path", event: "bubble", capture: { field: "keep-path" } },
        ],
      };
    }
    return {
      text: "Switch to loan only?",
      actions: [
        { id: "switch-loan", label: "Switch to loan only", event: "bubble", capture: { field: "path", value: "loan-only" } },
        { id: "keep-path", label: "Keep this path", event: "bubble", capture: { field: "keep-path" } },
      ],
    };
  }
  if (prompt === "done") {
    const fileActions: FoxAction[] = [
      { id: "open-docs", label: "Upload docs", event: "open-docs", capture: { field: "open-docs" } },
    ];
    if (!draft.originatorRequested) {
      fileActions.push({
        id: "request-human",
        label: "Request human",
        event: "bubble",
        capture: { field: "talk-originator" },
      });
    }
    if (draft.path === "loan-only") {
      fileActions.push({
        id: "what-acr",
        label: "What is ACR?",
        event: "bubble",
        capture: { field: "what-acr" },
      });
    }
    if (draft.originatorRequested) {
      return {
        text: "I’m still on this desk. Upload a doc, tap a Structure line, or ask about the file.",
        actions: fileActions,
      };
    }
    return {
      text:
        draft.path === "loan-only"
          ? "This loan file is prepared. A licensed originator is assigned. Fox stays."
          : "This desk file is prepared. A licensed originator is assigned. Fox stays.",
      actions: fileActions,
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
  if (prompt === "product" || prompt === "intent") {
    return workspacePromptCopy(prompt, draft);
  }
  const next = workspacePromptCopy(prompt, draft);
  if (
    prompt === "basics-done" ||
    prompt === "documents" ||
    prompt === "preparing" ||
    prompt === "review" ||
    prompt === "correct" ||
    prompt === "path-switch" ||
    prompt === "done"
  ) {
    return next;
  }
  return {
    text: `${starterText(draft.path)} ${next.text}`,
    followUp: next.followUp,
    facts: next.facts,
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
  if (/not sure|unsure|unknown|skip( for now)?/.test(lower)) return "not-sure";
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

function occupancySpokenLabel(value?: string | null) {
  return OCCUPANCY_BUBBLES.find((item) => item.value === value)?.label ?? "";
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

export function editPromptFromCapture(capture?: Capture): FoxPrompt | undefined {
  if (!capture) return undefined;
  if (capture.field === "path") return "path-switch";
  if (capture.field === "productIntent") return "product";
  if (capture.field === "occupancy") return "occupancy";
  if (capture.field === "timeline") return "timeline";
  if (capture.field === "loanAmount" || capture.field === "skip-amount") return "amount";
  if (capture.field === "propertyValue" || capture.field === "skip-value") return "value";
  if (capture.field === "creditRange") return "credit";
  if (capture.field === "termYears" || capture.field === "skip-term") return "term";
  if (capture.field === "incomeType") return "income";
  if (capture.field === "skip-docs" || capture.field === "open-docs") return "documents";
  return undefined;
}

export function workspaceUpdateCopy(capture: Capture, draft: FoxIntakeDraft) {
  if (capture.field === "path") {
    return capture.value === "loan-only"
      ? "Updated path to loan only."
      : "Updated path to the desk.";
  }
  if (capture.field === "keep-path") {
    return "Kept this path.";
  }
  if (capture.field === "what-acr") {
    return "ACR is the desk that stays open after close — letter, scout, and reward. This file is still the loan.";
  }
  if (capture.field === "talk-originator") {
    return "A licensed originator is already assigned to this file. Fox stays. Upload a doc, tap a line to edit, or ask about the desk.";
  }
  if (capture.field === "productIntent") {
    return `Updated product to ${productIntentLabel(capture.value)}.`;
  }
  if (capture.field === "occupancy") {
    const label = occupancySpokenLabel(capture.value);
    return label ? `Updated occupancy to ${label}.` : "Updated occupancy.";
  }
  if (capture.field === "timeline") {
    const label = TIMELINE_BUBBLES.find((item) => item.value === capture.value)?.label;
    return label ? `Updated timeline to ${label}.` : "Updated timeline.";
  }
  if (capture.field === "loanAmount") {
    const n = Number(capture.value.split(":")[0].replace(/,/g, ""));
    return Number.isFinite(n) && n > 0
      ? `Updated loan amount to ${formatMoney(n)}.`
      : "Updated loan amount.";
  }
  if (capture.field === "propertyValue") {
    const n = Number(capture.value.replace(/,/g, ""));
    return Number.isFinite(n) && n > 0
      ? `Updated property value to ${formatMoney(n)}.`
      : "Updated property value.";
  }
  if (capture.field === "creditRange") {
    const label =
      CREDIT_WORKSPACE_BUBBLES.find((item) => item.value === capture.value)?.label ?? capture.value;
    return `Updated credit range to ${label}.`;
  }
  if (capture.field === "termYears") {
    return `Updated term to ${capture.value} year.`;
  }
  if (capture.field === "skip-amount") return "Updated. Loan amount left blank.";
  if (capture.field === "skip-value") return "Updated. Property value left blank.";
  if (capture.field === "skip-term") return "Updated. Term left blank.";
  if (capture.field === "incomeType") {
    const label = INCOME_BUBBLES.find((item) => item.value === capture.value)?.label;
    return label ? `Updated income to ${label}.` : "Updated income.";
  }
  if (capture.field === "skip-docs") return "Updated. Docs skipped.";
  return "Updated the file.";
}

export function parseWorkspaceEdit(
  text: string,
): {
  capture?: Capture;
  correct?: FoxPrompt;
  confirm: string;
} | null {
  const q = text.trim();
  const lower = q.toLowerCase();
  if (!/\b(change|edit|update|set|switch)\b/.test(lower)) return null;
  if (/^(needs a correction|looks right)$/i.test(lower)) return null;

  const wantsPath = /\b(path|relationship|acr|loan only|loan-only)\b/.test(lower);
  if (wantsPath && !/\b(amount|value|occupan|timeline|credit|fico|term|product|buy|refi)\b/.test(lower)) {
    return { correct: "path-switch", confirm: "Tap Path on the structure to switch." };
  }

  if (/\b(product|buy|refinance|refi|heloc|jumbo|other)\b/.test(lower) && /\b(change|edit|update|set|switch)\b/.test(lower)) {
    const intent = productIntentFromText(q);
    if (intent) {
      return {
        capture: { field: "productIntent", value: intent },
        confirm: `Updated product to ${productIntentLabel(intent)}.`,
      };
    }
    if (/\bproduct\b/.test(lower)) {
      return { correct: "product", confirm: "Which product should I use?" };
    }
  }

  if (/\boccupan/.test(lower)) {
    const match = occupancyFromText(q);
    if (match) {
      return {
        capture: { field: "occupancy", value: match.value },
        confirm: `Updated occupancy to ${occupancySpokenLabel(match.value)}.`,
      };
    }
    return { correct: "occupancy", confirm: "How will the property be used?" };
  }

  if (/\b(timeline|ready now|exploring|30)/.test(lower) && /\b(change|edit|update|set|timeline)\b/.test(lower)) {
    const match = timelineFromText(q);
    if (match) {
      return {
        capture: { field: "timeline", value: match.value },
        confirm: `Updated timeline to ${match.label}.`,
      };
    }
    if (/\btimeline\b/.test(lower)) {
      return { correct: "timeline", confirm: "What’s the timeline?" };
    }
  }

  if (/\b(fico|credit)\b/.test(lower)) {
    const range = parseCreditRange(q);
    if (range) {
      const label =
        CREDIT_WORKSPACE_BUBBLES.find((item) => item.value === range)?.label ?? range;
      return {
        capture: { field: "creditRange", value: range },
        confirm: `Updated credit range to ${label}.`,
      };
    }
    return { correct: "credit", confirm: "What credit range should I use for the estimate?" };
  }

  if (/\bterm\b/.test(lower)) {
    const term = parseTermYears(q);
    if (term === "skip") {
      return { capture: { field: "skip-term" }, confirm: "Updated. Term left blank." };
    }
    if (term != null) {
      return { capture: { field: "termYears", value: String(term) }, confirm: `Updated term to ${term} year.` };
    }
    return { correct: "term", confirm: "Any term in mind?" };
  }

  if (/\b(property value|home value|house value|worth)\b/.test(lower) || (/\bvalue\b/.test(lower) && !/\bloan\b/.test(lower))) {
    if (isUnknownAmount(q)) {
      return { capture: { field: "skip-value" }, confirm: "Updated. Property value left blank." };
    }
    const amount = parseAmountPair(q).value ?? parseLooseAmount(q);
    if (amount != null) {
      return {
        capture: { field: "propertyValue", value: String(amount) },
        confirm: `Updated property value to ${formatMoney(amount)}.`,
      };
    }
    return { correct: "value", confirm: "What’s a rough property value?" };
  }

  if (/\b(loan amount|loan|amount|line|cash)\b/.test(lower)) {
    if (isUnknownAmount(q)) {
      return { capture: { field: "skip-amount" }, confirm: "Updated. Loan amount left blank." };
    }
    const amount = parseAmountPair(q).loan ?? parseLooseAmount(q);
    if (amount != null) {
      return {
        capture: { field: "loanAmount", value: String(amount) },
        confirm: `Updated loan amount to ${formatMoney(amount)}.`,
      };
    }
    return { correct: "amount", confirm: "What’s a rough loan amount?" };
  }

  if (/\bincome\b/.test(lower)) {
    const match = incomeFromText(q);
    if (match) {
      return {
        capture: { field: "incomeType", value: match.value },
        confirm: `Updated income to ${match.label}.`,
      };
    }
    return { correct: "income", confirm: "How is income earned?" };
  }

  if (/\bdoc/.test(lower)) {
    return { correct: "documents", confirm: "Drop what you have. Skip is fine. I’ll work with what’s here." };
  }

  return null;
}

function draftAfterCapture(draft: FoxIntakeDraft, capture: Capture): FoxIntakeDraft {
  const next = { ...draft, correcting: null };
  if (capture.field === "path") return { ...next, path: capture.value };
  if (capture.field === "productIntent") return { ...next, productIntent: capture.value };
  if (capture.field === "occupancy") {
    return { ...next, occupancyChoice: { ...draft.occupancyChoice, value: capture.value }, occupancyAsked: true };
  }
  if (capture.field === "timeline") {
    return { ...next, timelineChoice: { ...draft.timelineChoice, value: capture.value }, timelineAsked: true };
  }
  if (capture.field === "loanAmount") {
    const n = Number(capture.value.split(":")[0].replace(/,/g, ""));
    return { ...next, amountAsked: true, loanAmountValue: Number.isFinite(n) && n > 0 ? n : draft.loanAmountValue };
  }
  if (capture.field === "propertyValue") {
    const n = Number(capture.value.replace(/,/g, ""));
    return { ...next, valueAsked: true, propertyValueAmount: Number.isFinite(n) && n > 0 ? n : draft.propertyValueAmount };
  }
  if (capture.field === "creditRange") {
    return {
      ...next,
      creditBand: capture.value as FoxIntakeDraft["creditBand"],
      creditAsked: true,
    };
  }
  if (capture.field === "termYears") {
    const n = Number(capture.value);
    return { ...next, termAsked: true, termYears: Number.isFinite(n) && n > 0 ? n : draft.termYears };
  }
  if (capture.field === "skip-amount") return { ...next, amountAsked: true, loanAmountValue: undefined };
  if (capture.field === "skip-value") return { ...next, valueAsked: true, propertyValueAmount: undefined };
  if (capture.field === "skip-term") return { ...next, termAsked: true, termYears: undefined };
  if (capture.field === "incomeType") return withIncomeType(next, capture.value);
  return next;
}

function withCurrentPrompt(
  confirm: string,
  draft: FoxIntakeDraft,
): {
  text: string;
  followUp?: string;
  facts?: PreviewFact[];
  actions?: FoxAction[];
} {
  const next = workspacePromptCopy(workspacePrompt({ ...draft, correcting: null }), draft);
  if (next.text === confirm) return next;
  return {
    text: confirm,
    followUp: next.followUp ?? next.text,
    facts: next.facts,
    actions: next.actions,
  };
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

  const edit = parseWorkspaceEdit(q);
  if (edit?.capture && draft.path) {
    const nextDraft = draftAfterCapture(draft, edit.capture);
    return {
      ...withCurrentPrompt(edit.confirm, nextDraft),
      capture: edit.capture,
    };
  }
  if (edit && !edit.capture && !edit.correct) {
    return { text: edit.confirm };
  }
  if (edit?.correct && draft.path) {
    return {
      ...workspacePromptCopy(edit.correct, draft),
      capture: { field: "correct", value: edit.correct },
    };
  }

  if (/(what is acr|what.?s acr|active credit relationship)/i.test(lower)) {
    return {
      text:
        draft.path === "loan-only"
          ? "ACR is the desk that stays open after close — letter, scout, and reward. This file is still the loan."
          : "ACR is the desk that stays open after close. Letter is originator-issued, not Fox. Scout and reward stay on the desk.",
      capture: { field: "what-acr" },
    };
  }

  if (/(talk to (a )?licensed originator|need (a )?licensed originator|request (a )?human|talk to (an )?originator|speak to (an? )?(lo|originator|human))/i.test(lower)) {
    return {
      text: "A licensed originator is already assigned to this file. Fox stays. Upload a doc, tap a line to edit, or ask about the desk.",
      capture: { field: "talk-originator" },
    };
  }

  if (prompt === "intent") {
    const path = pathFromHomeChoice(lower);
    if (path) {
      const nextDraft = { ...draft, path };
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "path", value: path },
      };
    }
    const intent = productIntentFromText(q);
    if (intent) {
      return {
        ...workspacePromptCopy("intent", { ...draft, productIntent: intent }),
        capture: { field: "productIntent", value: intent },
      };
    }
    return { text: "Tap Start your relationship or Just need a mortgage." };
  }

  if (prompt === "path-switch") {
    if (/keep|stay|no|cancel/.test(lower) && !/switch/.test(lower)) {
      return {
        ...withCurrentPrompt("Kept this path.", { ...draft, correcting: null }),
        capture: { field: "keep-path" },
      };
    }
    if (draft.path === "acr" && /loan|mortgage/.test(lower)) {
      return {
        ...withCurrentPrompt("Updated path to loan only.", { ...draft, path: "loan-only", correcting: null }),
        capture: { field: "path", value: "loan-only" },
      };
    }
    if (draft.path === "loan-only" && /desk|acr|relationship/.test(lower)) {
      return {
        ...withCurrentPrompt("Updated path to the desk.", { ...draft, path: "acr", correcting: null }),
        capture: { field: "path", value: "acr" },
      };
    }
    return workspacePromptCopy("path-switch", draft);
  }

  if (prompt === "product") {
    const intent = productIntentFromText(q);
    if (!intent) {
      return { text: "Tap Buy, Refinance, HELOC, Jumbo, or Other." };
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
    const nextAsk = usesPurchasePrice(draft.productIntent) ? "value" : "amount";
    return {
      ...workspacePromptCopy(nextAsk, draft),
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
    const nextDraft = { ...draft, creditBand: range, creditAsked: true, correcting: null };
    const next = workspacePromptCopy(workspacePrompt(nextDraft), nextDraft);
    return {
      ...next,
      capture: { field: "creditRange", value: range },
    };
  }

  if (prompt === "term") {
    const term = parseTermYears(q);
    if (term == null) return { text: "Tap 30 year, 15 year, or Skip." };
    const nextDraft =
      term === "skip"
        ? { ...draft, termAsked: true, termYears: undefined }
        : { ...draft, termAsked: true, termYears: term };
    return {
      ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
      capture:
        term === "skip" ? { field: "skip-term" } : { field: "termYears", value: String(term) },
    };
  }

  if (prompt === "income") {
    const match = incomeFromText(q);
    if (!match) return { text: "Tap W-2, Self-employed, Both, or Other." };
    const nextDraft = withIncomeType(draft, match.value);
    return {
      ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
      capture: { field: "incomeType", value: match.value },
    };
  }

  if (prompt === "documents") {
    if (/(skip|later|not yet|don'?t have|fine)/i.test(lower)) {
      const nextDraft = { ...draft, documentsSkipped: true, correcting: null, docsOpen: false };
      return {
        ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
        capture: { field: "skip-docs" },
      };
    }
    if (/(upload|drop|now|add)/i.test(lower)) {
      return {
        text: "Add a file on the structure, or skip.",
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
      const nextDraft = {
        ...draft,
        sampleAccepted: true,
        workspaceDraftStatus:
          draft.workspaceDraftStatus === "with-originator" ? draft.workspaceDraftStatus : "ready",
      } as FoxIntakeDraft;
      const nextPrompt = workspacePrompt(nextDraft);
      return {
        ...workspacePromptCopy(nextPrompt === "review" ? "done" : nextPrompt, nextDraft),
        capture: { field: "confirm-draft" },
      };
    }
    if (/(correction|fix|wrong|no|edit)/i.test(lower)) {
      return { ...workspacePromptCopy("correct", draft), capture: { field: "needs-correction" } };
    }
    return workspacePromptCopy("review", draft);
  }

  if (prompt === "correct") {
    return workspacePromptCopy("correct", draft);
  }

  if (/(reward|membership)/i.test(lower)) {
    if (draft.path === "loan-only") {
      return { text: "This file is the loan. ACR is optional if you want the desk later." };
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
        return {
          ...workspacePromptCopy("done", draft),
          text: "I can prepare a file. I cannot approve, lock, or commit to lend.",
        };
      }
      if (/(skip|later|not yet|don'?t have)/i.test(lower) && /doc/.test(lower)) {
        const nextDraft = { ...draft, documentsSkipped: true, docsOpen: false, correcting: null };
        return {
          ...workspacePromptCopy("done", nextDraft),
          capture: { field: "skip-docs" },
        };
      }
      return workspacePromptCopy("done", draft);
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
  const credit = draft.creditBand ?? draft.scenario?.creditRange ?? SAMPLE_SAFE_CREDIT;
  const loanAmount = draft.loanAmountValue ?? draft.scenario?.loanAmount;
  const propertyValue = draft.propertyValueAmount ?? draft.scenario?.propertyValue;
  if (!intent || !occupancy) return null;
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

function amountLineLabel(intent?: ProductIntent | null) {
  if (intent === "heloc") return "Line / cash";
  if (intent === "other") return "Amount";
  if (intent === "refinance") return "Payoff / cash";
  return "Loan amount";
}

function numbersFact(draft: FoxIntakeDraft): PreviewFact | null {
  const intent = draft.productIntent ?? productIntentFromSlug(draft.scenario?.productSlug);
  const loan = draft.loanAmountValue;
  const value = draft.propertyValueAmount;
  const hasLoan = loan != null && loan > 0;
  const hasValue = value != null && value > 0;
  if (!hasLoan && !hasValue) return null;
  if (hasLoan && hasValue) {
    return {
      id: "numbers",
      label: usesPurchasePrice(intent) ? "Price / loan" : amountLineLabel(intent),
      value: `${formatMoney(loan)} on ${formatMoney(value)}`,
    };
  }
  if (hasLoan) {
    return {
      id: "numbers",
      label: amountLineLabel(intent),
      value: formatMoney(loan),
    };
  }
  return {
    id: "numbers",
    label: usesPurchasePrice(intent) ? "Purchase price" : "Property value",
    value: formatMoney(value as number),
  };
}

function docsFact(draft: FoxIntakeDraft): PreviewFact | null {
  if (draft.documents.length) {
    const slots = Array.from(new Set(draft.documents.map((doc) => doc.slot)));
    return {
      id: "docs",
      label: "Docs",
      value: slots
        .map((slot) => {
          const label = DOC_SLOTS.find((item) => item.id === slot)?.label ?? "Other";
          return `${label} in`;
        })
        .join(" · "),
    };
  }
  if (draft.documentsSkipped) {
    return { id: "docs", label: "Docs", value: "Skipped" };
  }
  return null;
}

export function statusCopy(draft: FoxIntakeDraft) {
  if (
    draft.sampleAccepted ||
    draft.workspaceDraftStatus === "with-originator" ||
    draft.phase === "confirmed"
  ) {
    return "Assigned / reviewing";
  }
  if (draft.workspaceDraftStatus === "ready") return "Ready for you";
  return "Preparing";
}

export function previewFacts(draft: FoxIntakeDraft): PreviewFact[] {
  const facts: PreviewFact[] = [];
  if (draft.path === "acr") {
    facts.push({ id: "path", label: "Path", value: "Relationship desk" });
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

  const occupancy = draft.occupancyChoice.value || "";
  const occupancyLabel = OCCUPANCY_BUBBLES.find((item) => item.value === occupancy)?.label;
  if (occupancyLabel) {
    facts.push({ id: "occupancy", label: "Occupancy", value: occupancyLabel });
  }

  const timeline = draft.timelineChoice.value || "";
  const timelineLabel = TIMELINE_BUBBLES.find((item) => item.value === timeline)?.label;
  if (timelineLabel) {
    facts.push({ id: "timeline", label: "Timeline", value: timelineLabel });
  }

  const numbers = numbersFact(draft);
  if (numbers) facts.push(numbers);

  if (draft.creditAsked || draft.creditBand) {
    const creditLabel =
      CREDIT_WORKSPACE_BUBBLES.find((item) => item.value === draft.creditBand)?.label ??
      "Not sure";
    facts.push({ id: "credit", label: "Credit", value: creditLabel });
  }

  if (incomeSettled(draft)) {
    const incomeLabel =
      INCOME_BUBBLES.find((item) => item.value === draft.incomeType.value)?.label ?? "Other";
    facts.push({ id: "income", label: "Income", value: incomeLabel });
  }

  if (sampleRateApplies(intent) && sampleReady(draft)) {
    facts.push({
      id: "rate",
      label: "Rate",
      value: `${SAMPLE_STRUCTURE} ${SAMPLE_RATE_LABEL}`,
      note: SAMPLE_NOTE,
    });
  } else if (intent && !sampleRateApplies(intent) && sampleReady(draft)) {
    facts.push({
      id: "rate",
      label: "Rate",
      value: "Pricing when the file is ready",
    });
  }

  if (draft.path === "acr" && sampleReady(draft)) {
    const range = estimateFromDraft(draft);
    facts.push({
      id: "reward",
      label: "Reward",
      value: range ? formatRewardRange(range) : "Prepared when you join",
      note: SAMPLE_NOTE,
    });
  }

  const deskOpen =
    draft.path === "acr" &&
    (Boolean(draft.sampleAccepted) ||
      draft.workspaceDraftStatus === "with-originator" ||
      draft.phase === "confirmed");
  if (deskOpen) {
    facts.push({
      id: "letter",
      label: "Letter",
      value: "Not issued yet",
      note: "Originator-issued, not Fox",
    });
    facts.push({
      id: "scout",
      label: "Scout",
      value: "Do nothing for now.",
    });
  }

  if (
    draft.sampleAccepted ||
    draft.workspaceDraftStatus === "with-originator" ||
    draft.phase === "confirmed"
  ) {
    facts.push({
      id: "originator",
      label: "Originator",
      value: "Licensed originator assigned",
    });
  }

  const docs = docsFact(draft);
  if (docs) facts.push(docs);

  if (facts.length) {
    facts.push({
      id: "status",
      label: "Status",
      value: statusCopy(draft),
    });
  }

  return facts;
}

export function structureFixPrompt(
  id: string,
  draft?: FoxIntakeDraft,
): FoxPrompt | null {
  if (id === "path") return "path-switch";
  if (id === "product") return "product";
  if (id === "occupancy") return "occupancy";
  if (id === "timeline") return "timeline";
  if (id === "numbers") {
    return usesPurchasePrice(draft?.productIntent) ? "value" : "amount";
  }
  if (id === "amount") return "amount";
  if (id === "value") return "value";
  if (id === "credit") return "credit";
  if (id === "income") return "income";
  if (id === "docs") return "documents";
  return null;
}

export function structureExplainCopy(
  id: string,
  draft: FoxIntakeDraft,
): { text: string } | null {
  if (id === "rate") {
    const intent = draft.productIntent ?? productIntentFromSlug(draft.scenario?.productSlug);
    if (sampleRateApplies(intent) && sampleReady(draft)) {
      return {
        text: `${SAMPLE_STRUCTURE} ${SAMPLE_RATE_LABEL}. ${SAMPLE_NOTE}. I cannot set, lock, or invent a live rate.`,
      };
    }
    return {
      text: "Pricing when the file is ready. I cannot set, lock, or invent a live rate.",
    };
  }
  if (id === "reward") {
    return {
      text: "Reward is calculated for the relationship. Sample · indicative · not live. A licensed originator confirms it. I cannot edit it into a live amount.",
    };
  }
  if (id === "letter") {
    return {
      text: "The letter is originator-issued, not Fox. I cannot approve, lock, or commit to lend.",
    };
  }
  if (id === "scout") {
    return {
      text: "Scout watches after close. Do nothing for now.",
    };
  }
  if (id === "status") {
    return {
      text: "This is desk state. I cannot approve, lock, or commit to lend.",
    };
  }
  if (id === "originator") {
    return {
      text: "A licensed originator is assigned to this file. I cannot approve, lock, or commit to lend.",
    };
  }
  return null;
}

const CHAT_SUMMARY_IDS = new Set([
  "path",
  "product",
  "occupancy",
  "timeline",
  "numbers",
  "credit",
  "income",
  "rate",
  "reward",
  "docs",
]);

export function fileSummaryFacts(draft: FoxIntakeDraft): PreviewFact[] {
  return previewFacts(draft)
    .filter((fact) => CHAT_SUMMARY_IDS.has(fact.id))
    .map((fact) =>
      fact.id === "rate" && fact.note && !fact.value.includes(fact.note)
        ? { ...fact, value: `${fact.value} · ${fact.note}`, note: undefined }
        : fact,
    );
}
