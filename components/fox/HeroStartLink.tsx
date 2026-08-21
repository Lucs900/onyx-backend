"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ACR_START_HREF, LOAN_START_HREF, writeStartPath } from "@/components/products/startPath";
import { beginWorkspaceFromHero } from "./store";
import type { IntakePath } from "./types";

export function HeroStartLink({
  path,
  className,
  children,
  onClick,
  "aria-label": ariaLabel,
}: {
  path: IntakePath;
  className: string;
  children: ReactNode;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  const href = path === "acr" ? ACR_START_HREF : LOAN_START_HREF;

  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={() => {
        writeStartPath(path);
        beginWorkspaceFromHero(path);
        onClick?.();
      }}
    >
      {children}
    </Link>
  );
}
