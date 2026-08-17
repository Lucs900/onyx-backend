import { PRODUCTS } from "@/components/products/catalog";
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
} from "./types";

export function foxStageFromPath(pathname: string): FoxStage | null {
  if (pathname === "/") return "home";
  if (pathname === "/products") return "explore";
  if (pathname === "/products/scenario") return "scenario";
  if (pathname === "/products/results") return "results";
  if (pathname === "/intake" || pathname.startsWith("/intake/")) return "intake";
  return null;
}

export function intakeHref(scenario: ExplorerScenario | null) {
  return scenario ? `/intake?${scenarioToQuery(scenario)}` : "/intake";
}

export function currentPrompt(draft: FoxIntakeDraft): FoxPrompt {
  if (draft.phase === "confirmed" && !draft.correcting) return "done";
  if (draft.correcting && draft.correcting !== "correct") return draft.correcting;
  if (draft.correcting === "correct") return "correct";
  if (!draft.contact.fullName.value) return "name";
  if (!draft.contact.email.value) return "email";
  if (!draft.contact.phone.value) return "phone";
  if (!draft.preferredAsked) return "preferred";
  if (!draft.incomeType.value) return "income";
  if (!draft.occupancyAsked) return "occupancy";
  if (!draft.timelineAsked) return "timeline";
  if (!draft.documents.length && !draft.documentsSkipped) return "documents";
  return "review";
}

export function taskContext(stage: FoxStage, draft: FoxIntakeDraft) {
  if (stage === "home") return "Home";
  if (stage === "explore") return "Explore";
  if (stage === "scenario") return "Scenario";
  if (stage === "results") return "Results";
  const labels: Record<FoxPrompt, string> = {
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
): { text: string; actions?: FoxAction[] } {
  const known = scenarioSummary(scenario);

  if (stage === "home") {
    return {
      text: "I'm ONYX Fox. This is California only. I can explain the Active Credit Relationship, or help you explore a loan without ACR. I can't approve, lock, or commit to lend.",
      actions: [
        { id: "acr", label: "Learn about ACR", href: "/acr" },
        { id: "products", label: "Explore products", href: "/products" },
      ],
    };
  }

  if (stage === "explore") {
    return {
      text: "I'm ONYX Fox. This explorer is California only. Ask about a product, or start a scenario. I can't quote a rate or approve a loan.",
      actions: [
        { id: "scenario", label: "Start a scenario", href: "/products/scenario" },
      ],
    };
  }

  if (stage === "scenario") {
    return {
      text: known
        ? `I still have ${known}. Confirm or change anything, then see your options. Nothing here is a quote.`
        : "Enter a California ZIP, purpose, value, amount, credit range, and occupancy. I'll carry that forward. This is not a quote.",
    };
  }

  if (stage === "results") {
    return {
      text: known
        ? `I have ${known}. These directions are placeholders — not a quote. I can prepare an application draft when you're ready.`
        : "I don't have a scenario yet. Enter one first so I can prepare a draft.",
      actions: known
        ? [{ id: "draft", label: "Let's prepare a draft", event: "prepare-draft" }]
        : [{ id: "scenario", label: "Enter a scenario", href: "/products/scenario" }],
    };
  }

  if (currentPrompt(draft) === "done") {
    return {
      text: "Your draft is confirmed. A licensed originator will review this. You can come back here to see status. I still can't approve or lock a loan.",
    };
  }

  return {
    text: known
      ? `I already have ${known}. This is California only. I'll ask only for what's missing — tap a bubble or type.`
      : "Let's prepare a draft. This explorer is California only. I'll ask a few short questions. I can't approve or lock a loan.",
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
      text: "You can drop paystubs, a W-2, bank statements, or ID. Files stay in this preview session only — not a vault. Fox will not invent dollar amounts from the files.",
      actions: [
        { id: "open-docs", label: "Upload now", event: "open-docs", capture: { field: "open-docs" } },
        { id: "skip-docs", label: "Skip for now", event: "bubble", capture: { field: "skip-docs" } },
      ],
    };
  }
  if (prompt === "review") {
    return {
      text: "I've prepared a draft from what you and the scenario already gave me. Nothing is final until you confirm. Dollar amounts were not extracted.",
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
          { value: "name", label: "Contact" },
          { value: "income", label: "Income" },
          { value: "occupancy", label: "Occupancy" },
          { value: "timeline", label: "Timeline" },
          { value: "documents", label: "Documents" },
        ],
        "correct",
      ),
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
  actions?: FoxAction[];
  capture?: Capture;
} {
  const q = text.trim();
  const lower = q.toLowerCase();

  if (stage === "home") {
    const home = homeReply(lower);
    if (home) return home;
  }

  if (/(licensed originator|talk to (a )?human|speak (to|with)|call me)/i.test(lower)) {
    return {
      text: "We'll have a licensed originator reach you. I can keep preparing the draft — I can't approve, lock, or commit to lend.",
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
      text: `${product.name}: ${product.description} Best for: ${product.bestFor} I can't quote a rate or say you're approved.`,
      actions: [
        {
          id: "explore",
          label: "Explore this option",
          href: `/products/scenario?product=${product.slug}`,
        },
      ],
    };
  }

  if (/(what('s| is) next|next step|what now|where do i)/i.test(lower)) {
    return nextSteps(stage, scenario, draft);
  }

  if (/(rate|apr|payment|quote|how much)/i.test(lower)) {
    return {
      text: "I don't have live rates, APRs, or payments. What you see in Product Explorer is discovery only — estimates later, never a commitment to lend.",
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
    return { ...promptCopy("timeline"), capture: { field: "occupancy", value: match.value } };
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
    if (!hit) return { text: "Tap Contact, Income, Occupancy, Timeline, or Documents." };
    return { ...promptCopy(hit.value as FoxPrompt, draft), capture: { field: "correct", value: hit.value } };
  }
  return null;
}

function homeReply(lower: string): ReturnType<typeof replyToMessage> | null {
  if (/(what('s| is) acr|active credit relationship)/i.test(lower)) {
    return {
      text: "ACR is the Active Credit Relationship — stay approved and keep optimizing over time. A loan without ACR is also available. I can't approve, lock, or commit to lend.",
      actions: [{ id: "acr", label: "Learn about ACR", href: "/acr" }],
    };
  }
  if (/(keep me approved|stay approved|always approved)/i.test(lower)) {
    return {
      text: "In the relationship, we keep watching credit and rate conditions after approval. That's ACR — not a one-time close. I can't approve a loan here.",
      actions: [{ id: "acr", label: "Learn about ACR", href: "/acr" }],
    };
  }
  if (/optimiz/i.test(lower)) {
    return {
      text: "Optimizing means reviewing your situation over time so credit and rate can keep working for you. I can't quote a rate or lock a loan.",
      actions: [{ id: "acr", label: "Learn about ACR", href: "/acr" }],
    };
  }
  if (/(buy a home|purchase|refinance|use equity|heloc|equity)/i.test(lower)) {
    return {
      text: "Product Explorer can show California directions for buying, refinancing, or equity. That's discovery — not a quote or an approval.",
      actions: [
        { id: "products", label: "Explore products", href: "/products" },
        { id: "scenario", label: "Start a scenario", href: "/products/scenario" },
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
  if (stage === "home") {
    return {
      text: "I can explain ACR, or help you explore a California loan without it. I can't approve, lock, or commit to lend.",
      actions: [
        { id: "acr", label: "Learn about ACR", href: "/acr" },
        { id: "products", label: "Explore products", href: "/products" },
      ],
    };
  }
  if (stage === "explore") {
    return {
      text: "Pick a product, or start a California scenario. I can explain options in plain English. I can't quote or approve.",
      actions: [
        { id: "scenario", label: "Start a scenario", href: "/products/scenario" },
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
        ? "Next: I can prepare a draft from this scenario."
        : "Enter a scenario first so I have something to carry into a draft.",
      actions: scenario
        ? [{ id: "draft", label: "Let's prepare a draft", event: "prepare-draft" }]
        : [{ id: "scenario", label: "Enter a scenario", href: "/products/scenario" }],
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
