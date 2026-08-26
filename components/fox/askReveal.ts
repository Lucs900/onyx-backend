/** Scroll delta so the live Fox ask stays readable above the composer dock. */
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

/** Pack the live question + chips against the composer so they stay together at the bottom. */
export function scrollDeltaToFollowLastLine(
  ask: { top: number; bottom: number },
  dockTop: number,
  topSafe = 12,
): number {
  if (ask.top < topSafe) return ask.top - topSafe;
  const covered = ask.bottom + 8 - dockTop;
  if (covered > 0) return Math.min(covered, Math.max(0, ask.top - topSafe));
  const slack = ask.top - topSafe;
  if (slack <= 0) return 0;
  return Math.min(dockTop - (ask.bottom + 8), slack);
}

export const FOX_KEYBOARD_EVENT = "onyx:fox-keyboard";
