/** Scroll delta so the live Fox ask stays readable above the Structure dock. */
export function scrollDeltaToClearAsk(
  ask: { top: number; bottom: number },
  dockTop: number,
  topSafe = 12,
): number {
  if (ask.top < topSafe) return ask.top - topSafe;
  const covered = ask.bottom + 8 - dockTop;
  if (covered <= 0) return 0;
  return Math.min(covered, Math.max(0, ask.top - topSafe));
}
