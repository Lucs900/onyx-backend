"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { AlwaysOnFox, FoxDockBar } from "./AlwaysOnFox";

function DockFallback() {
  return (
    <div className="fox-dock" aria-hidden="true">
      <FoxDockBar open={false} />
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
