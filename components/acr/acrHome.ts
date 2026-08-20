/**
 * Reserved later logged-in ACR home information architecture.
 *
 * Do not render this as a public dashboard or a fake wallet.
 * Public `/acr` may show concept labels only (see DeskPreview).
 *
 * Later home order:
 * 1. Reward status / balance
 * 2. Goals
 * 3. Property / equity
 * 4. Opportunities Scout
 */

export const ACR_HOME_ORDER = [
  "reward-status",
  "goals",
  "property-equity",
  "opportunities-scout",
] as const;

export type AcrHomeSection = (typeof ACR_HOME_ORDER)[number];

/**
 * Reward balance rules (locked):
 * - before unlock: progress only
 * - after unlock: current rewards balance
 * - public pages: no fake balance
 * - this pass: do not invent a live rewards wallet
 */
export type RewardBalancePhase = "before-unlock" | "after-unlock";

export type RewardStatusView =
  | { phase: "before-unlock" }
  | { phase: "after-unlock" };

export const OPPORTUNITY_KINDS = [
  "equity-available",
  "purchase-power",
  "portfolio-move",
] as const;

export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number];

/** Later logged-in card. Max 3. Each: title, one sentence, possible financing path, Ask Fox. */
export type LaterOpportunityCard = {
  kind: OpportunityKind;
  title: string;
  sentence: string;
  financingPath: string;
};

/** Public desk labels only. No dollars, listings, addresses, or returns. */
export const PUBLIC_SCOUT_EXAMPLES = [
  {
    kind: "equity-available",
    title: "Equity available",
    sentence: "Unused equity that could support a next move.",
  },
  {
    kind: "purchase-power",
    title: "Purchase power",
    sentence: "A later purchase sized from that posture.",
  },
  {
    kind: "portfolio-move",
    title: "Portfolio move",
    sentence: "Another property when the file is ready.",
  },
] as const;
