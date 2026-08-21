import { ACR_START_HREF, LOAN_START_HREF, startPathToken } from "@/components/products/startPath";
import type { IntakePath } from "./types";
import type { FoxAction } from "./types";

export const HOME_IDLE_TEXT = "Ask ONYX Fox";

export const HOME_PRODUCT_TEXT = "Buy, refinance, HELOC, jumbo, or other.";

export function homePathActions(): FoxAction[] {
  return [
    { id: "start", label: "Start your relationship", href: ACR_START_HREF },
    { id: "loan", label: "Just need a mortgage", href: LOAN_START_HREF },
  ];
}

export function homeProductActions(path: IntakePath): FoxAction[] {
  const token = startPathToken(path);
  return [
    {
      id: "buy",
      label: "Buy",
      href: `/start?path=${token}&intent=buy`,
    },
    {
      id: "refi",
      label: "Refinance",
      href: `/start?path=${token}&intent=refinance`,
    },
    {
      id: "heloc",
      label: "HELOC",
      href: `/start?path=${token}&intent=heloc`,
    },
    {
      id: "jumbo",
      label: "Jumbo",
      href: `/start?path=${token}&intent=jumbo`,
    },
    {
      id: "other",
      label: "Other",
      href: `/start?path=${token}&intent=other`,
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
