"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { AlwaysOnFox, FoxLauncher } from "./AlwaysOnFox";

function DockFallback() {
  return (
    <div className="fox-bar" aria-hidden="true">
      <FoxLauncher />
    </div>
  );
}

export function FoxShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const home = pathname === "/";

  return (
    <div className={home ? "fox-shell fox-shell--home" : "fox-shell"}>
      {children}
      <Suspense fallback={home ? null : <DockFallback />}>
        <AlwaysOnFox />
      </Suspense>
    </div>
  );
}
