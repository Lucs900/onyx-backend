"use client";

import { useEffect } from "react";

const SCROLLED = "home-scrolled";

export function HomeMobileCollapse() {
  useEffect(() => {
    const onScroll = () => {
      document.documentElement.classList.toggle(SCROLLED, window.scrollY > 32);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.documentElement.classList.remove(SCROLLED);
    };
  }, []);
  return null;
}
