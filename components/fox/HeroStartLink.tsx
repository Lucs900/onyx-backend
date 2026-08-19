"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ACR_START_HREF, LOAN_START_HREF, writeStartPath } from "@/components/products/startPath";
import { beginWorkspaceFromHero } from "./store";
import type { IntakePath } from "./types";

export function HeroStartLink({
  path,
  className,
  children,
}: {
  path: IntakePath;
  className: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const href = path === "acr" ? ACR_START_HREF : LOAN_START_HREF;

  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        writeStartPath(path);
        beginWorkspaceFromHero(path);
        router.push(href);
      }}
    >
      {children}
    </Link>
  );
}
