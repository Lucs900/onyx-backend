import { PRODUCTS } from "@/components/products/catalog";
import {
  estimateRewardRange,
  formatRewardRange,
} from "@/components/products/rewardEstimate";
import {
  CREDIT_OPTIONS,
  OCCUPANCY_OPTIONS,
  PURPOSE_OPTIONS,
  TIMELINE_OPTIONS,
  formatDollars,
  labelFor,
  scenarioToQuery,
  type ExplorerScenario,
} from "@/components/products/scenario";
import { ACR_START_HREF, LOAN_START_HREF, pathFromQuery } from "@/components/products/startPath";
import { HOME_IDLE_TEXT } from "./homeIdle";
import { workspaceGreeting, workspacePrompt, workspacePromptCopy, workspaceReply } from "./workspace";
import { questionsComplete } from "./store";
import {
  INCOME_BUBBLES,
  OCCUPANCY_BUBBLES,
  TIMELINE_BUBBLES,
  type Capture,
  type FoxAction,
  type FoxIntakeDraft,
  type FoxPrompt,
  type FoxStage,
  type IntakePath,
} from "./types";

export function foxStageFromPath(pathname: string): FoxStage | null {
  if (pathname === "/") return "home";
  if (pathname === "/start" || pathname.startsWith("/start/")) return "start";
  if (pathname === "/acr") return "acr";
  if (pathname === "/products") return "explore";
  if (pathname === "/products/scenario") return "scenario";
  if (pathname === "/products/results") return "results";
  if (pathname === "/intake" || pathname.startsWith("/intake/")) return "intake";
  return null;
}

export { pathFromQuery };

export function pathLabel(path?: IntakePath) {
  if (path === "acr") return "ACR";
  if (path === "loan-only") return "Loan only";
  return "";
}

export function intakeHref(
  _scenario: ExplorerScenario | null,
  path?: IntakePath | "loan",
) {
  const token = path === "acr" ? "acr" : path ? "loan" : "";
  if (token) return `/start?path=${token}`;
  return "/start";
}

export function resultsPathActions(scenario: ExplorerScenario): FoxAction[] {
  return [
    { id: "acr", label: "Start with ACR", href: intakeHref(scenario, "acr") },
    {
      id: "loan",
      label: "Continue loan only",
      href: intakeHref(scenario, "loan-only"),
    },
  ];
}

export function intakePathContext(
  draft: FoxIntakeDraft,
  scenario: ExplorerScenario | null,
): string | null {
  if (draft.path === "acr") {
    const range = scenario ? estimateRewardRange(scenario) : null;
    if (range) {
      return `I have your scenario. ACR estimated membership reward is ${formatRewardRange(range)}. Sample, not live. Final amount is confirmed when you join and close.`;
    }
    return scenario
      ? "I have your scenario. This draft is on the ACR path. Final amount is confirmed when you join and close."
      : "This draft is on the ACR path.";
  }
  if (draft.path === "loan-only") {
    return scenario
      ? "I have your scenario. This is a mortgage draft only."
      : "This is a mortgage draft only.";
  }
  return null;
}

export function currentPrompt(draft: FoxIntakeDraft): FoxPrompt {
  if (draft.phase === "confirmed" && !draft.correcting) return "done";
  if (draft.correcting && draft.correcting !== "correct") return draft.correcting;
  if (draft.correcting === "correct") return "correct";
  if (!draft.occupancyAsked) return "occupancy";
  if (!draft.documents.length && !draft.documentsSkipped) return "documents";
  return "review";
}

export function taskContext(stage: FoxStage, draft: FoxIntakeDraft) {
  if (stage === "home") return "Home";
  if (stage === "start") return "Workspace";
  if (stage === "acr") return "ACR";
  if (stage === "explore") return "Explore";
  if (stage === "scenario") return "Scenario";
  if (stage === "results") return "Results";
  const labels: Record<FoxPrompt, string> = {
    intent: "Asking: path",
    product: "Asking: product",
    amount: "Asking: amount",
    value: "Asking: value",
    credit: "Asking: credit",
    term: "Asking: term",
    preparing: "Preparing file",
    "basics-done": "Basics in file",
    name: "Asking: name",
    email: "Asking: email",
    phone: "Asking: phone",
    preferred: "Asking: preferred contact",
    income: "Asking: income type",
    occupancy: "Asking: occupancy",
    timeline: "Asking: timeline",
    documents: "Documents",
    review: "Confirm draft",
    correct: "Correction",
    "path-switch": "Confirm path",
    "jumbo-purpose": "Asking: jumbo purpose",
    "offer-jumbo": "Offer Jumbo",
    "offer-heloc": "Offer HELOC",
    "geo-stop": "California only",
    "confirm-proposal": "Confirm suggestion",
    done: "Draft confirmed",
  };
  return labels[currentPrompt(draft)];
}

function bubbles(
  items: { value: string; label: string }[],
  field: Capture["field"],
): FoxAction[] {
  return items.map((item) => ({
    id: `${field}-${item.value}`,
    label: item.label,
    event: "bubble" as const,
    capture: { field, value: item.value } as Capture,
  }));
}

export function greeting(
  stage: FoxStage,
  scenario: ExplorerScenario | null,
  draft: FoxIntakeDraft,
): {
  text: string;
  followUp?: string;
  facts?: { id: string; label: string; value: string }[];
  actions?: FoxAction[];
} {
  const known = scenarioSummary(scenario);

  if (stage === "home") {
    return { text: HOME_IDLE_TEXT };
  }

  if (stage === "start") {
    return workspaceGreeting(draft);
  }

  if (stage === "acr") {
    return {
      text: "ACR is a relationship that stays open after close.",
      actions: [
        { id: "start", label: "Start your relationship", href: ACR_START_HREF },
        { id: "loan", label: "Just need a mortgage", href: LOAN_START_HREF },
      ],
    };
  }

  if (stage === "explore") {
    return {
      text: "Ask about a product, or start a scenario.",
      actions: [
        { id: "scenario", label: "Start a scenario", href: "/start" },
      ],
    };
  }

  if (stage === "scenario") {
    return {
      text: known ? `I still have ${known}. Change anything?` : "Enter your scenario.",
    };
  }

  if (stage === "results") {
    return {
      text: scenario ? "Start a relationship, or just the loan?" : "Enter a scenario first.",
      actions: scenario
        ? resultsPathActions(scenario)
        : [{ id: "scenario", label: "Enter a scenario", href: "/start" }],
    };
  }

  if (currentPrompt(draft) === "done") {
    return {
      text: "Draft confirmed. A licensed originator will review this.",
    };
  }

  return {
    text: known ? "A few questions to finish the draft." : "A few questions to start the draft.",
  };
}

export function promptCopy(prompt: FoxPrompt, draft?: FoxIntakeDraft): { text: string; actions?: FoxAction[] } {
  if (prompt === "name") {
    return { text: "What full name should we use on this draft?" };
  }
  if (prompt === "email") {
    return { text: "What's the best email for this draft?" };
  }
  if (prompt === "phone") {
    return { text: "And a phone number?" };
  }
  if (prompt === "preferred") {
    return {
      text: "Preferred contact?",
      actions: [
        ...bubbles(
          [
            { value: "email", label: "Email" },
            { value: "phone", label: "Phone" },
            { value: "either", label: "Either" },
          ],
          "preferred-asked",
        ),
        { id: "skip-pref", label: "Skip", event: "bubble", capture: { field: "preferred-asked", value: "" } },
      ],
    };
  }
  if (prompt === "income") {
    return {
      text: "How is income earned?",
      actions: bubbles(INCOME_BUBBLES, "incomeType"),
    };
  }
  if (prompt === "occupancy") {
    const prior = draft?.occupancyChoice.value
      ? OCCUPANCY_BUBBLES.find((item) => item.value === draft.occupancyChoice.value)?.label
      : "";
    return {
      text: prior
        ? `Occupancy in the scenario is ${prior}. Still right?`
        : "How will the property be used?",
      actions: bubbles([...OCCUPANCY_BUBBLES], "occupancy"),
    };
  }
  if (prompt === "timeline") {
    return {
      text: "What's the timeline?",
      actions: bubbles([...TIMELINE_BUBBLES], "timeline"),
    };
  }
  if (prompt === "documents") {
    return {
      text: "Drop documents, or skip for now.",
      actions: [
        { id: "open-docs", label: "Upload now", event: "open-docs", capture: { field: "open-docs" } },
        { id: "skip-docs", label: "Skip for now", event: "bubble", capture: { field: "skip-docs" } },
      ],
    };
  }
  if (prompt === "review") {
    return {
      text: "Does this look right?",
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
  return {
    text: "A licensed originator will review this. You can return to this page for status.",
  };
}

export function replyToMessage(
  text: string,
  stage: FoxStage,
  draft: FoxIntakeDraft,
  scenario: ExplorerScenario | null,
): {
  text: string;
  followUp?: string;
  facts?: { id: string; label: string; value: string }[];
  actions?: FoxAction[];
  capture?: Capture;
} {
  const q = text.trim();
  const lower = q.toLowerCase();

  if (stage === "home" || stage === "start") {
    return (
      workspaceReply(q, draft) ?? workspacePromptCopy(workspacePrompt(draft), draft)
    );
  }

  if (stage === "acr") {
    const acr = acrReply(lower);
    if (acr) return acr;
  }

  if (stage === "results") {
    const results = resultsReply(lower, scenario);
    if (results) return results;
  }

  if (stage === "intake") {
    const intake = intakeReply(lower, draft, scenario);
    if (intake) return intake;
  }

  if (/(licensed originator|talk to (a )?human|speak (to|with)|call me)/i.test(lower)) {
    return {
      text: "A licensed originator can reach you from here.",
    };
  }

  if (/(prepare a draft|start (an )?application|let'?s prepare)/i.test(lower)) {
    return {
      text: "I'll take you into intake and use the scenario we already have.",
      actions: [{ id: "draft", label: "Let's prepare a draft", event: "prepare-draft" }],
    };
  }

  if (stage === "intake") {
    const prompt = currentPrompt(draft);
    const captured = captureForPrompt(prompt, q, draft);
    if (captured) return captured;
  }

  const product = matchProduct(lower);
  if (product) {
    return {
      text: `${product.name}: ${product.description} Best for: ${product.bestFor}`,
      actions: [
        {
          id: "explore",
          label: "Explore this option",
          href: `/start`,
        },
      ],
    };
  }

  if (/(what('s| is) next|next step|what now|where do i)/i.test(lower)) {
    return nextSteps(stage, scenario, draft);
  }

  if (/(rate|apr|payment|quote|how much)/i.test(lower)) {
    return {
      text: "I don't have live rates here.",
    };
  }

  if (stage === "intake" && q.length > 12) {
    return {
      text: "I'll keep that with the draft as something you typed. Confirm it when you review.",
      capture: { field: "note", value: q },
    };
  }

  return nextSteps(stage, scenario, draft);
}

function captureForPrompt(
  prompt: FoxPrompt,
  raw: string,
  draft: FoxIntakeDraft,
): ReturnType<typeof replyToMessage> | null {
  if (prompt === "name") {
    const value = raw.replace(/^(my name is|i am|i'm)\s+/i, "").trim();
    if (value.length < 2) return { text: "I need a full name for the draft." };
    return {
      text: `Thanks, ${value}. What's the best email for this draft?`,
      capture: { field: "fullName", value },
    };
  }
  if (prompt === "email") {
    const value = extractEmail(raw);
    if (!value) return { text: "I need an email that looks like name@example.com." };
    return {
      text: "And a phone number?",
      capture: { field: "email", value },
    };
  }
  if (prompt === "phone") {
    const value = extractPhone(raw);
    if (!value) return { text: "I need a phone number with at least 10 digits." };
    return {
      ...promptCopy("preferred"),
      capture: { field: "phone", value },
    };
  }
  if (prompt === "preferred") {
    if (/skip|later|no preference/i.test(raw)) {
      return { ...promptCopy("income"), capture: { field: "preferred-asked", value: "" } };
    }
    const value = /email/i.test(raw) ? "email" : /phone/i.test(raw) ? "phone" : /either/i.test(raw) ? "either" : "";
    if (!value) return { text: "Tap Email, Phone, Either, or Skip." };
    return { ...promptCopy("income"), capture: { field: "preferred-asked", value } };
  }
  if (prompt === "income") {
    const match = INCOME_BUBBLES.find(
      (item) => item.label.toLowerCase() === raw.toLowerCase() || item.value === raw.toLowerCase(),
    );
    if (!match) return { text: "Tap W-2, Self-employed, Both, or Other." };
    return { ...promptCopy("occupancy", { ...draft, incomeType: { ...draft.incomeType, value: match.value } }), capture: { field: "incomeType", value: match.value } };
  }
  if (prompt === "occupancy") {
    const match = OCCUPANCY_BUBBLES.find(
      (item) => item.label.toLowerCase() === raw.toLowerCase() || item.value === raw.toLowerCase(),
    );
    if (!match) return { text: "Tap Primary, Second home, or Investment." };
    const nextDraft = {
      ...draft,
      occupancyChoice: { ...draft.occupancyChoice, value: match.value },
      occupancyAsked: true,
    };
    return {
      ...workspacePromptCopy(workspacePrompt(nextDraft), nextDraft),
      capture: { field: "occupancy", value: match.value },
    };
  }
  if (prompt === "timeline") {
    const match = TIMELINE_BUBBLES.find(
      (item) =>
        item.label.toLowerCase() === raw.toLowerCase() ||
        item.value === raw ||
        (raw.toLowerCase().includes("explor") && item.value === "exploring") ||
        (raw.toLowerCase().includes("ready") && item.value === "ready-now"),
    );
    if (!match) return { text: "Tap Ready now, 30–90 days, or Just exploring." };
    return { ...promptCopy("documents"), capture: { field: "timeline", value: match.value } };
  }
  if (prompt === "documents") {
    if (/(skip|later|not yet|don'?t have)/i.test(raw)) {
      return {
        ...promptCopy("review"),
        capture: { field: "skip-docs" },
      };
    }
    if (/(upload|drop|now|add)/i.test(raw)) {
      return { ...promptCopy("documents"), capture: { field: "open-docs" } };
    }
  }
  if (prompt === "review") {
    if (/(looks right|confirm|yes|correct|good)/i.test(raw)) {
      return { ...promptCopy("done"), capture: { field: "confirm-draft" } };
    }
    if (/(correction|fix|wrong|no|edit)/i.test(raw)) {
      return { ...promptCopy("correct"), capture: { field: "needs-correction" } };
    }
  }
  if (prompt === "correct") {
    const map: { test: RegExp; value: string }[] = [
      { test: /contact|name|email|phone/, value: "name" },
      { test: /income/, value: "income" },
      { test: /occupan/, value: "occupancy" },
      { test: /time/, value: "timeline" },
      { test: /doc/, value: "documents" },
    ];
    const hit = map.find((item) => item.test.test(raw.toLowerCase()));
    if (!hit) return { text: "Tap any line on the structure." };
    return { ...promptCopy(hit.value as FoxPrompt, draft), capture: { field: "correct", value: hit.value } };
  }
  return null;
}

function intakeReply(
  lower: string,
  draft: FoxIntakeDraft,
  scenario: ExplorerScenario | null,
): ReturnType<typeof replyToMessage> | null {
  if (!/(reward|membership|unlock|how much|amount)/i.test(lower)) return null;
  if (draft.path === "loan-only") {
    return {
      text: "This draft is loan only. It does not include a membership reward.",
    };
  }
  if (draft.path === "acr") {
    const range = scenario ? estimateRewardRange(scenario) : null;
    return {
      text: range
        ? `ACR estimated membership reward is ${formatRewardRange(range)}. Sample, not live. Final amount is confirmed when you join and close.`
        : "The reward is prepared when you join. Final amount is confirmed when you join and close.",
    };
  }
  return null;
}

function resultsReply(
  lower: string,
  scenario: ExplorerScenario | null,
): ReturnType<typeof replyToMessage> | null {
  const actions = scenario ? resultsPathActions(scenario) : undefined;
  if (/(reward|membership|unlock|how much|amount)/i.test(lower)) {
    return {
      text: "The estimated range is on the page. Final amount is confirmed when you join and close.",
      actions: actions?.filter((action) => action.id === "acr"),
    };
  }
  if (/(acr|relationship)/i.test(lower)) {
    return {
      text: "ACR keeps the desk open after close. Start there, or continue loan only.",
      actions,
    };
  }
  if (/(loan only|just the (loan|mortgage)|mortgage only)/i.test(lower)) {
    return {
      text: "I can prepare a loan draft from this scenario.",
      actions: actions?.filter((action) => action.id === "loan"),
    };
  }
  return null;
}

function acrReply(lower: string): ReturnType<typeof replyToMessage> | null {
  if (/(reward|unlock|how much|amount|percent|%|payment count)/i.test(lower)) {
    return {
      text: "The reward is prepared when you join. I don't post a public amount.",
      actions: [{ id: "start", label: "Start your relationship", href: ACR_START_HREF }],
    };
  }
  if (/(desk|rate desk|credit path|member desk)/i.test(lower)) {
    return {
      text: "Three desks stay with the relationship: Rate, Credit, and Member.",
    };
  }
  if (/(opportunit|scout|equity available|purchase power|portfolio move)/i.test(lower)) {
    return {
      text: "When the timing is wrong, Fox waits. Scout names a move only when the numbers are strong. I don't list properties or post values.",
    };
  }
  if (/(just need a mortgage|loan only|mortgage only|only (a )?loan)/i.test(lower)) {
    return {
      text: "A mortgage is available without ACR.",
      actions: [{ id: "loan", label: "Just need a mortgage", href: LOAN_START_HREF }],
    };
  }
  if (/(start|join|relationship|how do i)/i.test(lower)) {
    return {
      text: "Start the relationship, or take a loan on its own.",
      actions: [
        { id: "start", label: "Start your relationship", href: ACR_START_HREF },
        { id: "loan", label: "Just need a mortgage", href: LOAN_START_HREF },
      ],
    };
  }
  return null;
}

function nextSteps(
  stage: FoxStage,
  scenario: ExplorerScenario | null,
  draft: FoxIntakeDraft,
): ReturnType<typeof replyToMessage> {
  if (stage === "home" || stage === "start") {
    return workspacePromptCopy(workspacePrompt(draft), draft);
  }
  if (stage === "acr") {
    return {
      text: "Start the relationship, or take a loan on its own.",
      actions: [
        { id: "start", label: "Start your relationship", href: ACR_START_HREF },
        { id: "loan", label: "Just need a mortgage", href: LOAN_START_HREF },
      ],
    };
  }
  if (stage === "explore") {
    return {
      text: "Pick a product, or start a scenario.",
      actions: [
        { id: "scenario", label: "Start a scenario", href: "/start" },
      ],
    };
  }
  if (stage === "scenario") {
    return {
      text: "Finish the scenario, then see possible directions. After that I can prepare a draft.",
    };
  }
  if (stage === "results") {
    return {
      text: scenario
        ? "Start a relationship, or just the loan?"
        : "Enter a scenario first so I have something to carry into a draft.",
      actions: scenario
        ? resultsPathActions(scenario)
        : [{ id: "scenario", label: "Enter a scenario", href: "/start" }],
    };
  }
  if (!questionsComplete(draft) || (!draft.documents.length && !draft.documentsSkipped)) {
    return promptCopy(currentPrompt(draft), draft);
  }
  if (draft.phase !== "confirmed") {
    return promptCopy("review", draft);
  }
  return promptCopy("done");
}

function matchProduct(lower: string) {
  return PRODUCTS.find((product) => {
    const name = product.name.toLowerCase();
    const slug = product.slug.replace(/-/g, " ");
    return (
      lower.includes(name) ||
      lower.includes(slug) ||
      (lower.includes("heloc") && product.slug === "heloc-heloan") ||
      (lower.includes("jumbo") && product.slug === "jumbo") ||
      (lower.includes("fha") && product.slug === "fha") ||
      (/\bva\b/.test(lower) && product.slug === "va") ||
      (lower.includes("non-qm") && product.slug === "non-qm") ||
      (lower.includes("construction") && product.slug === "construction")
    );
  });
}

export function scenarioSummary(scenario: ExplorerScenario | null) {
  if (!scenario) return "";
  const purpose = labelFor(PURPOSE_OPTIONS, scenario.purpose).toLowerCase();
  const bits = [`a ${purpose} in ${scenario.zip}`];
  if (scenario.productName) bits.push(`looking at ${scenario.productName}`);
  return bits.join(", ");
}

export function scenarioLines(scenario: ExplorerScenario) {
  return [
    ["ZIP", scenario.zip],
    ["Purpose", labelFor(PURPOSE_OPTIONS, scenario.purpose)],
    ["Property value", `$${formatDollars(scenario.propertyValue)}`],
    scenario.loanAmount != null
      ? ["Loan amount", `$${formatDollars(scenario.loanAmount)}`]
      : null,
    scenario.downPayment != null
      ? ["Down payment", `$${formatDollars(scenario.downPayment)}`]
      : null,
    ["Credit range", labelFor(CREDIT_OPTIONS, scenario.creditRange)],
    ["Occupancy", labelFor(OCCUPANCY_OPTIONS, scenario.occupancy)],
    scenario.timeline
      ? ["Timeline", labelFor(TIMELINE_OPTIONS, scenario.timeline)]
      : null,
    scenario.productName ? ["Product", scenario.productName] : null,
  ].filter((row): row is [string, string] => Boolean(row));
}

export function incomeLabel(value: string) {
  return INCOME_BUBBLES.find((item) => item.value === value)?.label ?? value;
}

export function occupancyLabel(value: string) {
  return OCCUPANCY_BUBBLES.find((item) => item.value === value)?.label ?? value;
}

export function timelineLabel(value: string) {
  return TIMELINE_BUBBLES.find((item) => item.value === value)?.label ?? value;
}

export function sourceLabel(
  source: "client" | "scenario" | "extracted-unconfirmed",
  confirmed?: boolean,
) {
  if (source === "scenario") return "From scenario";
  if (source === "extracted-unconfirmed") return "Extracted by Fox — unconfirmed";
  return confirmed ? "Confirmed by client" : "Entered by you";
}

function extractEmail(raw: string) {
  const match = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : "";
}

function extractPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return "";
  return raw.trim();
}
