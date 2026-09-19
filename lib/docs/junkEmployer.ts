/** Disclaimer / PIN / 8879 / “express or implied” is never an employer. */
export function junkEmployerName(name: string) {
  const raw = String(name ?? "").trim();
  if (!raw) return true;
  if (
    /express or implied|including but not limited|without warranty|warranty of|pin\b|form\s*8879|signature authorization|irs e-?file|under penalties of perjury|does not constitute|for disclosure|privacy act|paperwork reduction/i.test(
      raw,
    )
  ) {
    return true;
  }
  return /^(?:use|only|name|address|ein|control|dept|corp|employer|tax statement|including|express|implied|limited|warranty|disclaimer|pin)\b/i.test(
    raw,
  );
}
