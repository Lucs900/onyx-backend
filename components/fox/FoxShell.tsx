"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { AlwaysOnFox } from "./AlwaysOnFox";

export function FoxShell({ children }: { children: ReactNode }) {
  return (
    <div className="fox-shell">
      {children}
      <Suspense fallback={null}>
        <AlwaysOnFox />
      </Suspense>
    </div>
  );
}
