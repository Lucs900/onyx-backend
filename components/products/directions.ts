import { getProduct, type Product } from "./catalog";
import type { ExplorerScenario, LoanPurpose } from "./scenario";

const DIRECTIONS_BY_PURPOSE: Record<LoanPurpose, string[]> = {
  purchase: ["conventional-purchase", "fha", "jumbo"],
  "rate-term-refi": ["conventional-rate-term-refinance", "fha", "va"],
  "cash-out": ["conventional-cash-out-refinance", "heloc-heloan"],
  "heloc-heloan": ["heloc-heloan", "conventional-cash-out-refinance"],
  investment: ["investment-second-home", "non-qm"],
  construction: ["construction", "private-hard-money"],
  other: ["conventional-purchase", "non-qm", "heloc-heloan"],
};

const FIT_NOTES: Record<string, string> = {
  "conventional-purchase": "A standard purchase path for a primary home.",
  fha: "A more flexible purchase or refinance path with lower down-payment options.",
  jumbo: "Financing above conforming loan limits.",
  "conventional-rate-term-refinance":
    "A path to replace a first mortgage to change rate or term.",
  va: "Special financing benefits for eligible veterans and service members.",
  "conventional-cash-out-refinance":
    "A path to refinance and take equity out in one loan.",
  "heloc-heloan": "A way to use equity without replacing the first mortgage.",
  "investment-second-home":
    "Financing structured for rental or second-home use.",
  "non-qm": "A path outside standard agency guidelines.",
  construction: "Financing for new builds or major construction.",
  "private-hard-money":
    "Short-term or specialty capital when speed matters more than agency pricing.",
};

export type DirectionCard = {
  product: Product;
  fitNote: string;
};

export function directionsForScenario(
  scenario: ExplorerScenario,
): DirectionCard[] {
  const mapped = DIRECTIONS_BY_PURPOSE[scenario.purpose] ?? [];
  const slugs = [...mapped];

  if (
    scenario.productSlug &&
    mapped.includes(scenario.productSlug) &&
    slugs[0] !== scenario.productSlug
  ) {
    slugs.splice(slugs.indexOf(scenario.productSlug), 1);
    slugs.unshift(scenario.productSlug);
  }

  return slugs
    .slice(0, 3)
    .map((slug) => getProduct(slug))
    .filter((product): product is Product => Boolean(product))
    .map((product) => ({
      product,
      fitNote: FIT_NOTES[product.slug] ?? product.description,
    }));
}
