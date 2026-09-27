/**
 * Bank statement ending-balance from printed text.
 * Prefers the labeled dollar amount over a date day/month fragment.
 */

function moneyDigits(raw: string) {
  const paren = /^\((.+)\)$/.exec(raw.trim());
  const text = paren ? `-${paren[1]}` : raw;
  const cleaned = text.replace(/[$,\s]/g, "");
  if (!cleaned || cleaned === "-") return "";
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return "";
  return cleaned.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

const DATE_IN_TEXT = /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b(?:19|20)\d{2}\b/g;

/** Day / month / year fragments — 07 from 07/31/2026 is not an ending balance. */
export function isDateFragmentAmount(raw?: string | null) {
  const digits = moneyDigits(String(raw ?? ""));
  if (!digits || !/^\d+$/.test(digits)) return false;
  const n = Number(digits);
  if (n >= 1 && n <= 31) return true;
  if (n >= 1900 && n <= 2100) return true;
  return false;
}

/**
 * Dollar ending balance from labeled statement text.
 * Prefers $84,220.15 over a date day/month such as 07.
 */
export function bankEndingBalanceAmount(raw?: string | null): string {
  const text = String(raw ?? "").replace(DATE_IN_TEXT, " ");
  const patterns: { re: RegExp; dollar?: boolean }[] = [
    { re: /\$\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?)/, dollar: true },
    { re: /\$\s*(\d+\.\d{2})/, dollar: true },
    { re: /\$\s*(\d+)/, dollar: true },
    { re: /(\d{1,3}(?:,\d{3})+(?:\.\d+)?)/ },
    { re: /(\d+\.\d{2})/ },
    { re: /\b(\d{3,})\b/ },
  ];
  for (const { re, dollar } of patterns) {
    const match = text.match(re);
    if (!match?.[1]) continue;
    const digits = moneyDigits(match[1]);
    if (!digits) continue;
    if (dollar || !isDateFragmentAmount(digits)) return digits;
  }
  return "";
}

/**
 * Ending balance after the printed "Ending balance" label.
 * Reads the following window so a date on the label line and $84,220.15
 * on the same or next line both resolve to 84220.15 — never 07 / $7.
 */
export function bankEndingBalanceFromStatementText(text?: string | null): string {
  const blob = String(text ?? "");
  const label = /(?:ending(?:\s+account)?\s+balance|ending\s+bal\.?)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = label.exec(blob))) {
    const amount = bankEndingBalanceAmount(
      blob.slice(match.index + match[0].length, match.index + match[0].length + 240),
    );
    if (amount) return amount;
  }
  return "";
}
