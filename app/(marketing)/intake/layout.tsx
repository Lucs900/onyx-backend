import { FoxShell } from "@/components/fox/FoxShell";
import type { ReactNode } from "react";

export default function IntakeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <FoxShell>{children}</FoxShell>;
}
