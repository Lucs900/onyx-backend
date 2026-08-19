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
export const ACR_START_HREF = "/start?path=acr";
export const LOAN_START_HREF = "/start?path=loan";

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
