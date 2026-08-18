import { ACR_START_HREF, LOAN_START_HREF } from "@/components/products/startPath";
import type { FoxAction } from "./types";

export const HOME_IDLE_TEXT =
  "I can prepare a file for a purchase, refinance, or equity. You can start a relationship or just get the loan.";

export const HOME_BUY_HREF = `${ACR_START_HREF}&product=conventional-purchase`;
export const HOME_REFI_HREF = `${ACR_START_HREF}&product=conventional-rate-term-refinance`;
export const HOME_EQUITY_HREF = `${ACR_START_HREF}&product=heloc-heloan`;

export function homeIdleActions(): FoxAction[] {
  return [
    { id: "start", label: "Start your relationship", href: ACR_START_HREF },
    { id: "loan", label: "Just need a mortgage", href: LOAN_START_HREF },
    { id: "buy", label: "Buy", href: HOME_BUY_HREF },
    { id: "refi", label: "Refinance", href: HOME_REFI_HREF },
    { id: "equity", label: "Use equity", href: HOME_EQUITY_HREF },
  ];
}
