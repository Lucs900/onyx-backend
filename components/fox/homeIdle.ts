import { startPathToken } from "@/components/products/startPath";
import type { IntakePath } from "./types";
import type { FoxAction } from "./types";

export const HOME_IDLE_TEXT =
  "I can prepare a file for a purchase, refinance, or equity. You can start a relationship or just get the loan.";

export const HOME_PRODUCT_TEXT = "Buy, refinance, or use equity.";

export function homePathActions(): FoxAction[] {
  return [
    { id: "start", label: "Start your relationship", event: "bubble" },
    { id: "loan", label: "Just need a mortgage", event: "bubble" },
  ];
}

export function homeProductActions(path: IntakePath): FoxAction[] {
  const token = startPathToken(path);
  return [
    {
      id: "buy",
      label: "Buy",
      href: `/products/scenario?path=${token}&product=conventional-purchase`,
    },
    {
      id: "refi",
      label: "Refinance",
      href: `/products/scenario?path=${token}&product=conventional-rate-term-refinance`,
    },
    {
      id: "equity",
      label: "Use equity",
      href: `/products/scenario?path=${token}&product=heloc-heloan`,
    },
  ];
}

export function pathFromHomeChoice(text: string): IntakePath | null {
  const lower = text.trim().toLowerCase();
  if (lower === "start" || lower.includes("start your relationship") || lower.includes("start a relationship")) {
    return "acr";
  }
  if (
    lower === "loan" ||
    lower.includes("just need a mortgage") ||
    lower.includes("loan only") ||
    lower.includes("mortgage only")
  ) {
    return "loan-only";
  }
  return null;
}
