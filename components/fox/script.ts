import { PRODUCTS } from "@/components/products/catalog";
import {
  CREDIT_OPTIONS,
  OCCUPANCY_OPTIONS,
  PURPOSE_OPTIONS,
  formatDollars,
  labelFor,
  scenarioToQuery,
  type ExplorerScenario,
} from "@/components/products/scenario";
import { contactComplete } from "./store";
import type {
  FoxAction,
  FoxIntakeDraft,
  FoxPrompt,
  FoxStage,
} from "./types";

export function foxStageFromPath(pathname: string): FoxStage | null {
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
  if (!draft.contact.fullName.value) return "name";
  if (!draft.contact.email.value) return "email";
  if (!draft.contact.phone.value) return "phone";
  if (!draft.preferredAsked) return "preferred";
  if (!draft.documents.length && !draft.documentsSkipped) return "documents";
  if (draft.phase !== "confirmed") return "review";
  return "done";
}

export function greeting(
  stage: FoxStage,
  scenario: ExplorerScenario | null,
  draft: FoxIntakeDraft,
): { text: string; actions?: FoxAction[] } {
  const known = scenarioSummary(scenario);

  if (stage === "explore") {
    return {
      text: "I'm Fox. This explorer is California only. Ask about a product, or start a scenario. I can't quote a rate or approve a loan.",
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

  const prompt = currentPrompt(draft);
  if (prompt === "done") {
    return {
      text: "Your draft is confirmed. A licensed originator will review this. You can come back here to see status. I still can't approve or lock a loan.",
    };
  }

  return {
    text: known
      ? `I already have ${known}. This is California only. I'll ask only for what's missing — starting with how to reach you.`
      : "Let's prepare a draft. This explorer is California only. I'll ask a few short questions. I can't approve or lock a loan.",
  };
}

export function promptCopy(prompt: FoxPrompt): { text: string; actions?: FoxAction[] } {
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
      text: "Preferred contact — email, phone, or either? You can skip this.",
      actions: [{ id: "skip-pref", label: "Skip", event: "skip-preferred" }],
    };
  }
  if (prompt === "documents") {
    return {
      text: "You can drop paystubs, a W-2, bank statements, or ID on the page. Or skip if you don't have them yet. Files stay in this preview session only — not a vault.",
      actions: [
        { id: "skip-docs", label: "I don't have these yet", event: "skip-docs" },
        { id: "open-docs", label: "Go to document drop", event: "open-docs" },
      ],
    };
  }
  if (prompt === "review") {
    return {
      text: "I've prepared a draft from what you and the scenario already gave me. Confirm or edit each section on the page. Nothing is final until you confirm.",
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
  capture?: { field: keyof FoxIntakeDraft["contact"] | "note" | "skip-docs" | "preferred-asked"; value: string };
} {
  const q = text.trim();
  const lower = q.toLowerCase();

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
    const captured = captureForPrompt(prompt, q);
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
      text: "I'll keep that with the draft as something you typed. Confirm it on the page when you review.",
      capture: { field: "note", value: q },
    };
  }

  return nextSteps(stage, scenario, draft);
}

function captureForPrompt(
  prompt: FoxPrompt,
  raw: string,
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
      text: "Preferred contact — email, phone, or either? You can skip this.",
      capture: { field: "phone", value },
    };
  }
  if (prompt === "preferred") {
    if (/skip|later|either|no preference/i.test(raw)) {
      return {
        text: "You can drop documents on the page, or skip if you don't have them yet.",
        capture: { field: "preferred-asked", value: /either/i.test(raw) ? "either" : "" },
        actions: [
          { id: "skip-docs", label: "I don't have these yet", event: "skip-docs" },
          { id: "open-docs", label: "Go to document drop", event: "open-docs" },
        ],
      };
    }
    const value = /email/i.test(raw) ? "email" : /phone/i.test(raw) ? "phone" : "";
    if (!value) {
      return { text: "Say email, phone, either, or skip." };
    }
    return {
      text: "You can drop documents on the page, or skip if you don't have them yet.",
      capture: { field: "preferredContact", value },
      actions: [
        { id: "skip-docs", label: "I don't have these yet", event: "skip-docs" },
        { id: "open-docs", label: "Go to document drop", event: "open-docs" },
      ],
    };
  }
  if (prompt === "documents" && /(don'?t have|skip|later|not yet)/i.test(raw)) {
    return {
      text: "That's fine. I'll mark documents as not in yet and prepare the draft for you to confirm.",
      capture: { field: "skip-docs", value: "1" },
    };
  }
  return null;
}

function nextSteps(
  stage: FoxStage,
  scenario: ExplorerScenario | null,
  draft: FoxIntakeDraft,
): ReturnType<typeof replyToMessage> {
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
  if (!contactComplete(draft)) {
    return { text: promptCopy(currentPrompt(draft)).text };
  }
  if (!draft.documents.length && !draft.documentsSkipped) {
    return promptCopy("documents");
  }
  if (draft.phase !== "confirmed") {
    return promptCopy("review");
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
      ? ["Timeline", scenario.timeline === "ready-now" ? "Ready now" : scenario.timeline === "30-90" ? "30–90 days" : "Exploring"]
      : null,
    scenario.productName ? ["Product", scenario.productName] : null,
  ].filter((row): row is [string, string] => Boolean(row));
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
