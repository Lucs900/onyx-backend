import { FoxShell } from "@/components/fox/FoxShell";
import type { ReactNode } from "react";

export default function ProductsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <FoxShell>{children}</FoxShell>;
}
