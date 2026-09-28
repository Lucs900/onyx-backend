/**
 * 64 — Ask Fox reads this File.
 * Still useful + last staff foxLine + File writes. Borrower voice.
 * Never the Proceed / in_queue mantra. Never "I pushed this."
 * Derive papers from the File. Do not string-match founder questions.
 * Never write File fields.
 */

import { hasLinkedAccount } from "./account";
import {
  LAST_YEAR_RETURN_STILL_USEFUL,
  LAST_YEAR_W2_STILL_USEFUL,
  labelListCopy,
  receivedClassCount,
  stillUsefulSpokenItems,
  type StillUsefulItem,
} from "./fileWrite";
import { isStaffDeskMessage } from "@/lib/account/core";
import type { ExtractClass, FoxIntakeDraft, FoxMessage } from "./types";

export const ASK_FOX_W2_OPEN_LINE = "Yes. Last year's W-2 is still open.";
export const ASK_FOX_UNKNOWN_LINE = "That isn't known yet on this File.";
export const ASK_FOX_NO_CLOSE_LINE = "No close date yet. That isn't known on this File.";
export const ASK_FOX_NO_APPROVAL_LINE = "Approval isn't known yet on this File.";
export const ASK_FOX_NO_QUALIFY_LINE = "Whether you qualify isn't known yet on this File.";
export const ASK_FOX_NO_LOCK_LINE = "No rate lock on this File.";

const MANTRA_BANNED =
  /I pushed this|ONYX has this for review|ONYX still has it|review after Proceed|Sketch now, documents next/i;

export type AskFoxFactLog = {
  fileId: string;
  question: string;
  factsUsed: string[];
  openPapers: string[];
  staffFoxLine: string | null;
  wroteFile: false;
};

export type AskFoxFileAnswer = {
  text: string;
  log: AskFoxFactLog;
};

let lastAskFoxFactLog: AskFoxFactLog | null = null;

export function getLastAskFoxFactLog() {
  return lastAskFoxFactLog;
}

export function isAskFoxLiveFile(draft?: FoxIntakeDraft | null) {
  if (!draft?.fileId?.trim()) return false;
  if (hasLinkedAccount(draft)) return true;
  if (draft.sampleAccepted) return true;
  if (draft.motion === "in_queue" || draft.motion === "escalated" || draft.motion === "waiting_out") {
    return true;
  }
  return false;
}

export function askFoxAnswerIsClean(text: string) {
  if (!text.trim()) return false;
  return !MANTRA_BANNED.test(text);
}

const ASK_FOX_OWNED_LINES = [
  ASK_FOX_W2_OPEN_LINE,
  ASK_FOX_UNKNOWN_LINE,
  ASK_FOX_NO_CLOSE_LINE,
  ASK_FOX_NO_APPROVAL_LINE,
  ASK_FOX_NO_QUALIFY_LINE,
  ASK_FOX_NO_LOCK_LINE,
  "I can only answer from this File.",
  "Nothing else is listed as needed on this File.",
];

/** File-read Ask Fox speech. Prompt-sync must not reprint extract over it. */
export function isAskFoxFileSpokenLine(text: string) {
  const spoken = text.replace(/\s+/g, " ").trim();
  if (!spoken || !askFoxAnswerIsClean(spoken)) return false;
  if (ASK_FOX_OWNED_LINES.includes(spoken)) return true;
  if (/^Yes\. .+\s+is still open\.$/.test(spoken)) return true;
  if (/^No\. .+\s+is already on this File\.$/.test(spoken)) return true;
  if (/ isn't listed as needed on this File\.$/.test(spoken)) return true;
  if (/^Interest-only is /.test(spoken) && /Not a lock\.$/.test(spoken)) return true;
  if (/^The line on this File is /.test(spoken)) return true;
  if (
    /Got the|I'm suggesting|I still need|Use this|Period \$|still helps? this file|Drop a /i.test(
      spoken,
    )
  ) {
    return false;
  }
  if (
    /^Next is |^First I need |^Drop |current income on paper|Still useful:/i.test(spoken)
  ) {
    return false;
  }
  if (
    /Government ID|Last year's W-2|Last year's tax return|Form 1040|Latest paystub/i.test(spoken)
  ) {
    return true;
  }
  return /on this File\.$/.test(spoken);
}

function fold(text: string) {
  return text
    .normalize("NFKC")
    .replace(/['’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function speakLabel(label: string) {
  return label.replace(/['’`]/g, "'").replace(/\s+/g, " ").trim();
}

export function lastStaffFoxLine(
  draft?: FoxIntakeDraft | null,
  messages?: readonly FoxMessage[] | null,
) {
  const events = [...(draft?.events ?? [])].reverse();
  const fromEvent = events.find((event) => event.kind === "staff-desk");
  const eventLine = (fromEvent?.text || fromEvent?.summary || "").trim();
  if (eventLine) return eventLine;
  if (!messages?.length) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!message || !isStaffDeskMessage(message, draft)) continue;
    const line = message.text.trim();
    if (line) return line;
  }
  return "";
}

type FilePaper = {
  id: string;
  label: string;
  extractClass?: ExtractClass;
};

function paperExtractClass(item: StillUsefulItem): ExtractClass | undefined {
  if (item.id === "w2" || item.id === "government_id" || item.id === "paystub" || item.id === "tax_return") {
    return item.id;
  }
  if (item.id === "prior-year-return" || item.id === "prior_year_return") return "tax_return";
  const spoken = fold(item.label);
  if (/w-?2/.test(spoken)) return "w2";
  if (/government id/.test(spoken)) return "government_id";
  if (/1040|tax return/.test(spoken)) return "tax_return";
  if (/paystub/.test(spoken)) return "paystub";
  return undefined;
}

function paperReceived(draft: FoxIntakeDraft, paper: FilePaper) {
  if (paper.extractClass && receivedClassCount(draft, paper.extractClass) > 0) return true;
  return false;
}

function paperNeedles(paper: FilePaper) {
  const spoken = fold(paper.label);
  const needles = [spoken];
  if (paper.extractClass === "w2" || /w-?2/.test(spoken)) {
    needles.push("w-2", "w2", "last year's w-2", "last years w-2");
  }
  if (paper.extractClass === "government_id" || /government id/.test(spoken)) {
    needles.push("government id");
  }
  if (paper.extractClass === "tax_return" || /1040|tax return/.test(spoken)) {
    needles.push("1040", "form 1040", "tax return", "last year's tax return");
  }
  if (paper.extractClass === "paystub" || /paystub/.test(spoken)) {
    needles.push("paystub", "pay stub");
  }
  return needles.filter(Boolean);
}

function textNamesPaper(text: string, paper: FilePaper) {
  const hay = fold(text);
  if (paper.extractClass === "government_id") {
    if (/\bgovernment id\b/.test(hay) || /\bgovernment identification\b/.test(hay)) return true;
    if (/\bid\b/.test(hay) && !/\bfile\b/.test(hay)) return true;
  }
  return paperNeedles(paper).some((needle) => needle.length > 2 && hay.includes(needle));
}

export function openPapersOnFile(
  draft: FoxIntakeDraft,
  messages?: readonly FoxMessage[] | null,
): FilePaper[] {
  const spoken = stillUsefulSpokenItems(draft).map((item) => ({
    id: item.id,
    label: item.label,
    extractClass: paperExtractClass(item),
  }));
  const open = spoken.filter((paper) => !paperReceived(draft, paper));
  const staff = lastStaffFoxLine(draft, messages);
  if (!staff || !open.length) return open;
  const asked = open.find((paper) => textNamesPaper(staff, paper));
  if (!asked) return open;
  return [asked, ...open.filter((paper) => paper.id !== asked.id)];
}

function knownPapersOnFile(draft: FoxIntakeDraft): FilePaper[] {
  const open = openPapersOnFile(draft);
  const extras: FilePaper[] = [];
  const seed: FilePaper[] = [
    { id: "w2", label: LAST_YEAR_W2_STILL_USEFUL, extractClass: "w2" },
    { id: "government_id", label: "Government ID", extractClass: "government_id" },
    { id: "tax_return", label: LAST_YEAR_RETURN_STILL_USEFUL, extractClass: "tax_return" },
  ];
  for (const paper of [...open, ...seed]) {
    if (extras.some((item) => item.id === paper.id)) continue;
    extras.push(paper);
  }
  return extras;
}

function namedPapersInQuestion(text: string, draft: FoxIntakeDraft) {
  return knownPapersOnFile(draft).filter((paper) => textNamesPaper(text, paper));
}

function asksYesNoPaper(text: string) {
  const hay = fold(text);
  return /^(do you|does |is |are |still need)\b/.test(hay);
}

function asksNeedList(text: string) {
  if (asksYesNoPaper(text)) return false;
  const hay = fold(text);
  return (
    /\bwhat (do you |is |are )?(still )?(need|needed|missing|open)\b/.test(hay) ||
    /\bwhat('s| is) (still )?(needed|missing|open)\b/.test(hay) ||
    /\bwhich (papers?|docs?|documents?)\b/.test(hay) ||
    /\bstill need on this file\b/.test(hay) ||
    /\bopen papers?\b/.test(hay)
  );
}

function asksClose(text: string) {
  const hay = fold(text);
  return /\b(close date|closing date|when (will|do) (i|we) close|when (is|will) closing|how long (does|will) this take|timeline)\b/.test(
    hay,
  );
}

function asksApproval(text: string) {
  const hay = fold(text);
  return /\b(am i approved|approved\b|approval)\b/.test(hay) && !/\bnot approved\b/.test(hay);
}

function asksQualify(text: string) {
  const hay = fold(text);
  return /\b(will i qualify|do i qualify|can i qualify|qualif)/.test(hay);
}

function asksLock(text: string) {
  const hay = fold(text);
  return /\b(rate lock|lock (the |this |my )?rate|locked)\b/.test(hay);
}

function asksPayment(text: string) {
  const hay = fold(text);
  return /\b(payment|pay each month|monthly|interest-only|interest only|\bio\b)\b/.test(hay);
}

function money(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function ratePct(rate: number) {
  return `${(Math.round(rate * 100) / 100).toFixed(2)}%`;
}

function onePaperAnswer(paper: FilePaper, draft: FoxIntakeDraft, factsUsed: string[]) {
  const spoken = speakLabel(paper.label);
  if (paperReceived(draft, paper)) {
    factsUsed.push(`documents.${paper.extractClass ?? paper.id}.received`);
    return `No. ${spoken} is already on this File.`;
  }
  const open = openPapersOnFile(draft);
  if (!open.some((item) => item.id === paper.id)) {
    factsUsed.push("stillUseful.absent");
    return `${spoken} isn't listed as needed on this File.`;
  }
  factsUsed.push(`stillUseful.${paper.id}`);
  if (paper.extractClass === "w2" || /w-?2/.test(fold(paper.label))) {
    return ASK_FOX_W2_OPEN_LINE;
  }
  return `Yes. ${spoken} is still open.`;
}

function needListAnswer(draft: FoxIntakeDraft, messages: readonly FoxMessage[] | null | undefined, factsUsed: string[]) {
  const open = openPapersOnFile(draft, messages);
  if (!open.length) {
    factsUsed.push("stillUseful.empty");
    return "Nothing else is listed as needed on this File.";
  }
  for (const paper of open) factsUsed.push(`stillUseful.${paper.id}`);
  const staff = lastStaffFoxLine(draft, messages);
  if (staff) factsUsed.push("staff.foxLine");
  return speakLabel(labelListCopy(open.map((paper) => paper.label))).replace(/\.$/, ".");
}

function paymentAnswer(draft: FoxIntakeDraft, factsUsed: string[]) {
  const line = draft.loanAmountValue ?? 0;
  const io = draft.liveQuote?.interestOnly ?? 0;
  const rate = draft.liveQuote?.rate ?? 0;
  if (line > 0) factsUsed.push("file.loanAmountValue");
  if (io > 0) factsUsed.push("file.liveQuote.interestOnly");
  if (rate > 0) factsUsed.push("file.liveQuote.rate");
  if (line > 0 && io > 0 && rate > 0) {
    return `Interest-only is ${money(io)} a month on the ${money(line)} line at ${ratePct(rate)}. Not a lock.`;
  }
  if (io > 0) return `Interest-only is ${money(io)} a month. Not a lock.`;
  if (line > 0) return `The line on this File is ${money(line)}. The payment isn't written yet.`;
  return ASK_FOX_UNKNOWN_LINE;
}

function rememberLog(log: AskFoxFactLog) {
  lastAskFoxFactLog = log;
  if (typeof console !== "undefined") {
    console.info("ask-fox-file", log);
  }
  if (typeof window !== "undefined") {
    (window as Window & { __askFoxFactLog?: AskFoxFactLog }).__askFoxFactLog = log;
  }
}

function finishAnswer(text: string, log: AskFoxFactLog): AskFoxFileAnswer {
  const clean = askFoxAnswerIsClean(text) ? text.trim() : ASK_FOX_UNKNOWN_LINE;
  const next = { ...log, factsUsed: [...log.factsUsed] };
  if (clean !== text.trim()) next.factsUsed.push("banned.stripped");
  rememberLog(next);
  return { text: clean, log: next };
}

/** Owned-File answer. Never writes. Papers come from this File only. */
export function answerAskFoxFromFile(
  question: string,
  draft: FoxIntakeDraft,
  messages?: readonly FoxMessage[] | null,
): AskFoxFileAnswer {
  const fileId = draft.fileId?.trim() || "";
  const factsUsed: string[] = ["file.fileId"];
  const open = openPapersOnFile(draft, messages);
  const staffFoxLine = lastStaffFoxLine(draft, messages) || null;
  if (staffFoxLine) factsUsed.push("staff.foxLine");
  const log: AskFoxFactLog = {
    fileId,
    question: question.trim(),
    factsUsed,
    openPapers: open.map((paper) => speakLabel(paper.label)),
    staffFoxLine,
    wroteFile: false,
  };

  const named = namedPapersInQuestion(question, draft);
  if ((asksYesNoPaper(question) && named.length === 1) || (named.length === 1 && !asksNeedList(question))) {
    return finishAnswer(onePaperAnswer(named[0]!, draft, factsUsed), log);
  }
  if (asksNeedList(question) || (named.length === 0 && /\bneed\b/i.test(question))) {
    return finishAnswer(needListAnswer(draft, messages, factsUsed), log);
  }
  if (asksClose(question)) {
    factsUsed.push("file.closeDate.absent");
    return finishAnswer(ASK_FOX_NO_CLOSE_LINE, log);
  }
  if (asksApproval(question)) {
    factsUsed.push("file.approval.absent");
    return finishAnswer(ASK_FOX_NO_APPROVAL_LINE, log);
  }
  if (asksQualify(question)) {
    factsUsed.push("file.qualify.absent");
    return finishAnswer(ASK_FOX_NO_QUALIFY_LINE, log);
  }
  if (asksLock(question)) {
    factsUsed.push("file.lock.absent");
    return finishAnswer(ASK_FOX_NO_LOCK_LINE, log);
  }
  if (asksPayment(question)) {
    return finishAnswer(paymentAnswer(draft, factsUsed), log);
  }
  factsUsed.push("file.unanswered");
  return finishAnswer(ASK_FOX_UNKNOWN_LINE, log);
}

export function sessionOwnsFile(
  draft: FoxIntakeDraft,
  session?: { fileId?: string; token?: string } | null,
) {
  const fileId = draft.fileId?.trim();
  if (!fileId) return false;
  const sessionId = session?.fileId?.trim();
  if (sessionId && sessionId !== fileId) return false;
  if (session?.token) return true;
  return !sessionId;
}
