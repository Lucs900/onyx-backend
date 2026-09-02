/**
 * Bank last4 only when the page prints the statement's own account as last 4 or a mask.
 * Never slice a full account number. Never take last4 from a date, dollar amount,
 * routing number, or a transfer-to / counterparty mask on the same statement.
 */

export type BankAssetAccount = {
  institution?: string;
  last4?: string;
  balance?: string;
  type?: string;
};

const DATE_LIKE = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/;
const MONEY_LIKE = /^\$?[\d,]+(?:\.\d{2})$/;
const TRANSFER_COUNTERPARTY =
  /(?:transfer|sent|wired?|ach|payment|deposit)\s+(?:to|from)|to\s+(?:account|\*{2,}|x{4,}|ending)|from\s+(?:account|\*{2,}|x{4,})|counterparty|beneficiary|destination/i;

export function isTransferCounterpartyLine(line: string): boolean {
  return TRANSFER_COUNTERPARTY.test(String(line ?? ""));
}

function maskedLast4(value: string): string {
  const match = value.match(/(?:\*{2,}|x{2,}|\u2022{2,}|•{2,})\s*-?\s*(\d{4})\b/i);
  return match?.[1] ?? "";
}

export function safeAccountLast4(raw: string): string {
  const value = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  if (isTransferCounterpartyLine(value)) return "";
  const compact = value.replace(/\s/g, "");
  if (DATE_LIKE.test(compact)) return "";
  if (MONEY_LIKE.test(compact) || /^\$/.test(value)) return "";
  if (/routing/i.test(value)) return "";

  const labeled = value.match(
    /(?:account\s+(?:number|no\.?|num|#)?\s*)?(?:last\s*4|ending\s+in|ending\s*#|account\s+ending)\s*[:#]?\s*(\d{4})\b/i,
  );
  if (labeled?.[1]) return labeled[1];

  const masked = maskedLast4(value);
  if (masked) return masked;

  const afterAccountLabel = value
    .replace(/^(?:account(?:\s+(?:number|no\.?|num|#))?|acct(?:ount)?\s*#?)\s*[:#]?\s*/i, "")
    .trim();
  if (afterAccountLabel !== value && /^\d{4}$/.test(afterAccountLabel)) return afterAccountLabel;

  if (/^\d{4}$/.test(value)) return value;
  return "";
}

/** The statement's own account last4. One statement = one last4. Transfer masks are not accounts. */
export function statementAccountLast4(text: string): string {
  const lines = String(text ?? "").split(/\n/);
  for (const line of lines) {
    if (isTransferCounterpartyLine(line)) continue;
    if (/account(?:\s+(?:number|no\.?|#|last\s*4))?|checking|savings/i.test(line)) {
      const last4 = safeAccountLast4(line) || maskedLast4(line);
      if (last4) return last4;
    }
  }
  for (const line of lines) {
    if (isTransferCounterpartyLine(line)) continue;
    const last4 = safeAccountLast4(line);
    if (last4) return last4;
  }
  return "";
}

export function collectAccountLast4s(text: string): string[] {
  const one = statementAccountLast4(text);
  return one ? [one] : [];
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
