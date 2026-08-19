"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { requestFoxAsk } from "./fox/AlwaysOnFox";
import { setDraftPath } from "./fox/store";
import type { IntakePath } from "./fox/types";
import { ACR_START_HREF, LOAN_START_HREF, writeStartPath } from "./products/startPath";

const DESKTOP_HERO = "(min-width: 1024px)";

function openDesktopFox(event: MouseEvent<HTMLAnchorElement>, label: string, path: IntakePath) {
  if (typeof window === "undefined" || !window.matchMedia(DESKTOP_HERO).matches) {
    writeStartPath(path);
    setDraftPath(path);
    return;
  }
  event.preventDefault();
  writeStartPath(path);
  setDraftPath(path);
  requestFoxAsk(label);
}

export function HeroStartButtons() {
  return (
    <div className="membership-hero__actions">
      <Link
        href={ACR_START_HREF}
        className="btn btn--primary btn--hero-primary"
        onClick={(event) => openDesktopFox(event, "Start your relationship", "acr")}
      >
        Start your relationship
      </Link>
      <Link
        href={LOAN_START_HREF}
        className="btn btn--secondary btn--hero-secondary"
        onClick={(event) => openDesktopFox(event, "Just need a mortgage", "loan-only")}
      >
        Just need a mortgage
      </Link>
    </div>
  );
}
