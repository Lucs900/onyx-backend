"use client";

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
  return (
    <div className="fox-shell">
      {children}
      <Suspense fallback={<DockFallback />}>
        <AlwaysOnFox />
      </Suspense>
    </div>
  );
}
