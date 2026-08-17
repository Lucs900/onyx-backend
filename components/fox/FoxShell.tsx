"use client";

import type { ReactNode } from "react";
import { AlwaysOnFox } from "./AlwaysOnFox";

export function FoxShell({ children }: { children: ReactNode }) {
  return (
    <div className="fox-shell">
      {children}
      <AlwaysOnFox />
    </div>
  );
}
