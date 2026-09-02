/**
 * Bank last4 only when the page prints it as last 4 or a mask.
 * Never slice a full account number. Never take last4 from a date or dollar amount.
 */

export type BankAssetAccount = {
  institution?: string;
  last4?: string;
  balance?: string;
  type?: string;
};

const DATE_LIKE = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/;
const MONEY_LIKE = /^\$?[\d,]+(?:\.\d{2})$/;

export function safeAccountLast4(raw: string): string {
  const value = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  const compact = value.replace(/\s/g, "");
  if (DATE_LIKE.test(compact)) return "";
  if (MONEY_LIKE.test(compact) || /^\$/.test(value)) return "";

  const labeled = value.match(
    /(?:account\s+(?:number|no\.?|num|#)?\s*)?(?:last\s*4|ending\s+in|ending\s*#|account\s+ending)\s*[:#]?\s*(\d{4})\b/i,
  );
  if (labeled?.[1]) return labeled[1];

  const masked = value.match(/(?:\*{2,}|x{2,}|\u2022{2,}|•{2,})\s*-?\s*(\d{4})\b/i);
  if (masked?.[1]) return masked[1];

  const afterAccountLabel = value
    .replace(/^(?:account(?:\s+(?:number|no\.?|num|#))?|acct(?:ount)?\s*#?)\s*[:#]?\s*/i, "")
    .trim();
  if (afterAccountLabel !== value && /^\d{4}$/.test(afterAccountLabel)) return afterAccountLabel;

  if (/^\d{4}$/.test(value)) return value;
  return "";
}

export function collectAccountLast4s(text: string): string[] {
  const found: string[] = [];
  const add = (value: string) => {
    if (value && !found.includes(value)) found.push(value);
  };
  for (const line of String(text ?? "").split(/\n/)) {
    const one = safeAccountLast4(line);
    if (one) add(one);
    const maskedRe = /(?:\*{2,}|x{2,}|\u2022{2,}|•{2,})\s*-?\s*(\d{4})\b/gi;
    let match: RegExpExecArray | null;
    while ((match = maskedRe.exec(line))) add(match[1] ?? "");
    const labeledRe =
      /(?:last\s*4|ending\s+in|ending\s*#|account\s+ending)\s*[:#]?\s*(\d{4})\b/gi;
    while ((match = labeledRe.exec(line))) add(match[1] ?? "");
  }
  return found.filter(Boolean);
}

export function parseAssetAccounts(raw: string): BankAssetAccount[] {
  try {
    const parsed = JSON.parse(String(raw ?? ""));
    if (!Array.isArray(parsed)) return [];
    const rows: BankAssetAccount[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const last4 = row.last4 ? safeAccountLast4(String(row.last4)) : "";
      const institution = String(row.institution ?? "").trim();
      const balance = String(row.balance ?? "").trim();
      const type = String(row.type ?? "").trim();
      if (!last4 && !institution && !balance) continue;
      rows.push({
        ...(institution ? { institution } : {}),
        ...(last4 ? { last4 } : {}),
        ...(balance ? { balance } : {}),
        ...(type ? { type } : {}),
      });
    }
    return rows;
  } catch {
    return [];
  }
}
