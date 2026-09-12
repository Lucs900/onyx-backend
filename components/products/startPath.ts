import type { IntakePath } from "@/components/fox/types";

export function pathFromQuery(raw: string | null | undefined): IntakePath | null {
  if (!raw) return null;
  const token = raw.trim().toLowerCase();
  if (token === "acr") return "acr";
  if (token === "loan" || token === "loan-only" || token === "loanonly") {
    return "loan-only";
  }
  return null;
}

export const START_PATH_KEY = "onyx.startPath";
export const HOMEPAGE_FRESH_PARAM = "fresh";
export const HOMEPAGE_FRESH_KEY = "onyx.homepageFresh";
export const ACR_START_HREF = "/start?path=acr";
export const LOAN_START_HREF = "/start?path=loan";
export const DESK_START_HREF = "/start";

export function isHomepageFreshQuery(search?: string | null) {
  if (!search) return false;
  try {
    const url = new URL(search, "https://onyx.local");
    return url.searchParams.get(HOMEPAGE_FRESH_PARAM) === "1";
  } catch {
    const q = search.startsWith("?") ? search.slice(1) : search;
    return new URLSearchParams(q).get(HOMEPAGE_FRESH_PARAM) === "1";
  }
}

export function markHomepageFreshStart() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HOMEPAGE_FRESH_KEY, "1");
  } catch {
    // Private mode / quota — ?fresh=1 still carries the CTA.
  }
}

export function homepageFreshEntryPending() {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(HOMEPAGE_FRESH_KEY) === "1") return true;
  } catch {
    // Fall through to the query string.
  }
  try {
    return new URLSearchParams(window.location.search).get(HOMEPAGE_FRESH_PARAM) === "1";
  } catch {
    return false;
  }
}

export function consumeHomepageFreshStart() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(HOMEPAGE_FRESH_KEY);
  } catch {
    // Private mode / quota.
  }
}

export function isLeftoverConversionHref(href?: string | null) {
  if (!href) return false;
  try {
    const path = new URL(href, "https://onyx.local").pathname;
    return (
      path === "/advisor" ||
      path === "/intake" ||
      path.startsWith("/intake/") ||
      path === "/products" ||
      path.startsWith("/products/")
    );
  } catch {
    return false;
  }
}

export function deskHrefFromLeftover(href: string) {
  try {
    const url = new URL(href, "https://onyx.local");
    const path = pathFromQuery(url.searchParams.get("path"));
    if (path === "loan-only") return LOAN_START_HREF;
    if (path === "acr") return ACR_START_HREF;
  } catch {
    // Fall through to the bare desk.
  }
  return DESK_START_HREF;
}

export function startPathToken(path: IntakePath) {
  return path === "acr" ? "acr" : "loan";
}

export function withStartPath(href: string, path?: IntakePath | null) {
  if (!path) return href;
  if (/[?&]path=/.test(href)) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}path=${startPathToken(path)}`;
}

export function writeStartPath(path: IntakePath) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(START_PATH_KEY, path);
    window.localStorage.setItem(START_PATH_KEY, path);
  } catch {
    // Private mode / quota — the query string still carries the path.
  }
}

export function readStartPath(): IntakePath | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      pathFromQuery(window.sessionStorage.getItem(START_PATH_KEY)) ??
      pathFromQuery(window.localStorage.getItem(START_PATH_KEY))
    );
  } catch {
    return null;
  }
}

export function rememberStartPath(raw?: string | null) {
  const fromQuery = pathFromQuery(raw);
  if (fromQuery) {
    writeStartPath(fromQuery);
    return fromQuery;
  }
  return readStartPath();
}
