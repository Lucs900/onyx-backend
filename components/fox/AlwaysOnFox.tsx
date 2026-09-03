"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type FocusEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AdvisorMark } from "@/components/AdvisorMark";
import { FOX_KEYBOARD_EVENT, scrollDeltaToFollowLastLine } from "./askReveal";
import { readScenario } from "@/components/products/scenario";
import {
  ACR_START_HREF,
  DESK_START_HREF,
  LOAN_START_HREF,
  deskHrefFromLeftover,
  isHomepageFreshQuery,
  isLeftoverConversionHref,
  pathFromQuery,
  writeStartPath,
} from "@/components/products/startPath";
import {
  currentPrompt,
  foxStageFromPath,
  greeting,
  intakePathContext,
  promptCopy,
  replyToMessage,
} from "./script";
import { addressConfirmPending, searchedKeyFor } from "@/lib/rateflow/fromDraft";
import {
  applyIdExtractAsk,
  dropAbandonedAddressConfirm,
  dropOnFileAddressLines,
  dropResolvedAddressConfirmChips,
  freezeUsedFoxTurns,
  isIdExtractAskText,
  isIdExtractPath,
  isOnFileAddressLine,
  isStreetSuggestChipLabel,
  paintedFoxActions,
  paintThreadActions,
  shouldDeferNextAskForLiveCoupon,
} from "./liveCoupon";
import { requestRateflowIfNeeded } from "./rateflowClient";
import {
  dropStreetSuggestChips,
  parseSafePlaceAddress,
  requestAddressSuggestions,
  requestPlaceAddress,
} from "./addressSuggest";
import {
  encodePlaceAddress,
  looksLikePlaceId,
  shouldSuggestStreets,
  type PlaceSuggestion,
} from "@/lib/places/address";
import {
  type LookupWait,
  isLookupWaitLine,
  withWaitLine,
  withoutWaitLines,
} from "./lookupWait";
import { shouldKeepStoredFoxThread, withoutTrailingSealedFoxLines } from "./persistThread";
import {
  fileAddressLine,
  isSkipPropertyAddressText,
  isSubjectAddressConfirmPending,
  parseVolunteeredAddress,
} from "./propertyType";
import {
  applyCapture,
  applyPreviewMotionControls,
  beginWorkspaceFromHero,
  continueWorkspaceFromEntry,
  emptyDraft,
  FOX_THREAD_LINE_EVENT,
  getFoxDraft,
  getFoxMessages,
  getServerDraft,
  hydrateFoxDraft,
  markMissingAsked,
  nudgeReview,
  setDraftPath,
  setDraftScenario,
  setFoxMessages,
  setLiveQuoteResult,
  shouldResumeWorkspaceEntry,
  startOverWorkspace,
  subscribeFoxDraft,
} from "./store";
import {
  caretAfterMoneyFormat,
  confirmedMoneyText,
  formatLiveMoneyInput,
  editLineFromCapture,
  editPromptFromCapture,
  editPromptFromPendingField,
  ensureIncomeConfirmChips,
  inertSupersededIncomeConfirms,
  lastFoxTurn,
  messagesWithLiveQuoteSpeech,
  messagesWithRateOrReadySpeech,
  withoutLiveQuoteSpeech,
  docReactionAsk,
  nextDocInvite,
  incomeAskOpen,
  nextFoxAsk,
  shouldHoldAskForLiveLine,
  isBankUnreadAsk,
  RECEIVED_UNREAD_ASK,
  unreadRestoreActions,
  retainWageDocsLine,
  isGovernmentIdInviteLine,
  holdDocsAskFox,
  productIntentFromAction,
  shouldDeferStillUsefulAsk,
  structureExplainCopy,
  structureFixPrompt,
  withWorkspaceGuide,
  workspaceGreeting,
  workspacePrompt,
  workspacePromptCopy,
  workspaceUpdateCopy,
  threadThroughEditedTurn,
  findClientEditMessageId,
  replaceClientTurn,
} from "./workspace";
import {
  ComposerAttach,
  filesFromClipboard,
  filesFromDataTransfer,
  ingestDroppedFiles,
  requestFoxPickFile,
} from "./DocumentDrop";
import { unreadDropBytesCopy } from "@/lib/docs/accept";
import { WorkspaceFileDock } from "./FilePreview";
import {
  DOC_INTAKE_EVENT,
  conflictActions,
  conflictAskCopy,
  hasPurchaseContractDoc,
  needsPurchaseSplitAsk,
  missingAskActions,
  missingAskCopy,
  isDeadFileWriteLine,
  stillUsefulAskCopy,
  stillUsefulRefreshKey,
  layer2AskActions,
  type DocIntakeDetail,
} from "./fileWrite";
import { DECLINING_INCOME_CAUTION, WAGE_DOCS_ASK, WAGE_STUB_DROP_ASK } from "./qualifyingIncome";
import { governmentIdSkipped, ID_UNREAD_ASK, isBorrowerNameConfirmPending } from "./borrowerName";
import { isUnreadNote } from "@/lib/docs/accept";
import { fileExists, finishLineActions, inQueueEnding, reviewIsSitting } from "./motion";
import { pathFromHomeChoice } from "./homeIdle";
import {
  FOX_DISCLOSURE,
  FOX_PANEL_KEY,
  type Capture,
  type FoxAction,
  type FoxIntakeDraft,
  type FoxMessage,
  type FoxPrompt,
  type IntakePath,
  type ProductIntent,
} from "./types";

function seedWorkspaceMessages(
  path?: IntakePath | null,
  intent?: ProductIntent | null,
  surface: "home" | "start" = "start",
): FoxMessage[] {
  if (surface === "home") {
    return [];
  }
  if (typeof window === "undefined") {
    return [
      foxAskMessage(
        workspaceGreeting({
          ...emptyDraft(),
          workspaceFlow: true,
          path: path ?? undefined,
          productIntent: intent ?? undefined,
        }),
      ),
    ];
  }
  hydrateFoxDraft();
  const stored = getFoxMessages();
  const live = getFoxDraft();
  if (shouldResumeWorkspaceEntry(live, stored)) {
    if (stored.length) {
      const last = stored[stored.length - 1];
      if (last?.role === "client") {
        const ask = foxAskMessage(workspacePromptCopy(workspacePrompt(live), live));
        const next = dropResolvedAddressConfirmChips([...stored, ask], live);
        setFoxMessages(next);
        return next;
      }
      return dropResolvedAddressConfirmChips(stored, live);
    }
    if (fileExists(live)) {
      const ask = [foxAskMessage(workspacePromptCopy(workspacePrompt(live), live))];
      setFoxMessages(ask);
      return ask;
    }
  }
  const draft = continueWorkspaceFromEntry(path ?? null, intent ?? null, {
    fresh: typeof window !== "undefined" && isHomepageFreshQuery(window.location.search),
  });
  const greet = [foxAskMessage(workspaceGreeting(draft))];
  setFoxMessages(greet);
  return greet;
}

function deskHrefFromSession(
  path?: IntakePath | null,
  intent?: ProductIntent | null,
) {
  if (!path) return intent ? `/start?intent=${intent}` : "/start";
  const token = path === "loan-only" ? "loan" : "acr";
  return intent ? `/start?path=${token}&intent=${intent}` : `/start?path=${token}`;
}

function persistHomeComposerTurn(text: string) {
  const path = pathFromHomeChoice(text);
  if (path) {
    beginWorkspaceFromHero(path);
    writeStartPath(path);
    return path === "loan-only" ? LOAN_START_HREF : ACR_START_HREF;
  }
  const live = getFoxDraft();
  const scenario = live.scenario ?? readScenario();
  const reply = replyToMessage(text, "start", live, scenario);
  if (reply.capture?.field === "path") {
    writeStartPath(reply.capture.value);
  }
  if (reply.capture) applyCapture(reply.capture);
  const stored = getFoxMessages();
  setFoxMessages([
    ...stored,
    {
      id: newId(),
      role: "client",
      text: clientMoneyText(text, reply.capture),
      edit: editPromptFromCapture(reply.capture),
      editLine: editLineFromCapture(reply.capture),
    },
  ]);
  const after = getFoxDraft();
  return deskHrefFromSession(after.path ?? null, after.productIntent ?? null);
}

function startSearchFromProps(
  path?: IntakePath | null,
  intent?: ProductIntent | null,
) {
  if (!path) return "";
  const token = path === "loan-only" ? "loan" : "acr";
  return intent ? `?path=${token}&intent=${intent}` : `?path=${token}`;
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function foxAskMessage(ask: {
  text: string;
  followUp?: string;
  facts?: FoxMessage["facts"];
  actions?: FoxAction[];
}): FoxMessage {
  const onFile = /\bon the file\.?\s*$/i.test((ask.text ?? "").trim());
  return {
    id: newId(),
    role: "fox",
    text: ask.text,
    followUp: onFile ? undefined : ask.followUp,
    facts: ask.facts,
    actions: onFile ? undefined : ask.actions,
  };
}

function dropFoxActions(messages: FoxMessage[]) {
  return messages.map((message) =>
    message.role === "fox" && message.actions?.length
      ? { ...message, actions: undefined }
      : message,
  );
}

function actionKey(action: FoxAction) {
  return `${action.id}:${action.label}:${action.capture?.field ?? ""}`;
}

function sameFoxAsk(
  last: FoxMessage,
  ask: {
    text: string;
    followUp?: string;
    facts?: FoxMessage["facts"];
    actions?: FoxAction[];
  },
) {
  if (last.text !== ask.text) return false;
  if ((last.followUp ?? "") !== (ask.followUp ?? "")) return false;
  const left = (last.facts ?? []).map((fact) => `${fact.id}:${fact.value}`).join("\n");
  const right = (ask.facts ?? []).map((fact) => `${fact.id}:${fact.value}`).join("\n");
  if (left !== right) return false;
  const leftActions = (last.actions ?? []).map(actionKey).join("|");
  const rightActions = (ask.actions ?? []).map(actionKey).join("|");
  return leftActions === rightActions;
}

function applyFoxAsk(
  messages: FoxMessage[],
  ask: {
    text: string;
    followUp?: string;
    facts?: FoxMessage["facts"];
    actions?: FoxAction[];
  },
): FoxMessage[] {
  const last = lastFoxTurn(messages);
  const freezeOthers = (keepId: string, replacement: FoxMessage) =>
    freezeUsedFoxTurns(
      messages.map((message) => (message.id === keepId ? replacement : message)),
    );
  if (last && retainWageDocsLine(last.text, ask.text)) {
    return freezeOthers(last.id, {
      ...last,
      followUp: ask.followUp,
      facts: ask.facts,
      actions: ask.actions,
    });
  }
  if (last && last.text === WAGE_DOCS_ASK && ask.text !== WAGE_DOCS_ASK) {
    return freezeOthers(last.id, foxAskMessage(ask));
  }
  if (
    last &&
    (last.text === WAGE_STUB_DROP_ASK || /^Drop a recent paystub\b/i.test(last.text)) &&
    ask.text !== last.text &&
    ask.text !== WAGE_STUB_DROP_ASK
  ) {
    return freezeOthers(last.id, foxAskMessage(ask));
  }
  if (isIdExtractAskText(ask.text)) {
    return applyIdExtractAsk(messages, foxAskMessage(ask));
  }
  if (isOnFileAddressLine({ id: last?.id ?? "on-file", role: "fox", text: ask.text })) {
    return freezeUsedFoxTurns(dropOnFileAddressLines(messages));
  }
  if (last && isGovernmentIdInviteLine(last.text) && ask.text !== last.text) {
    return freezeOthers(last.id, foxAskMessage(ask));
  }
  if (last && /The ID shows /i.test(last.text) && !/The ID shows /i.test(ask.text)) {
    return freezeOthers(last.id, foxAskMessage(ask));
  }
  if (
    last &&
    /\ba month\. Use this\?$/.test(last.text) &&
    ask.text !== last.text
  ) {
    return freezeOthers(last.id, foxAskMessage(ask));
  }
  if (last && sameFoxAsk(last, ask)) return freezeUsedFoxTurns(messages);
  if (last && isLookupWaitLine(last.text) && ask.text === "How is income earned?") {
    return freezeUsedFoxTurns(messages);
  }
  return [...freezeUsedFoxTurns(messages), foxAskMessage(ask)];
}

function hasReviewAsk(messages: FoxMessage[]) {
  return messages.some(
    (message) =>
      message.role === "fox" &&
      (message.followUp === "Does this look right?" ||
        message.text.includes("Here’s a sample structure.") ||
        /here.?s the file/i.test(message.text) ||
        /notepad looks complete/i.test(message.text) ||
        /the file looks like this/i.test(message.text) ||
        /looks right, or change a line/i.test(message.text) ||
        /does it look right/i.test(message.text)),
  );
}

function hasPreparedAsk(messages: FoxMessage[]) {
  return messages.some(
    (message) =>
      message.role === "fox" &&
      (/these docs help next|upload what you have|still useful:|this file can move|i can send this to review|onyx has this for review|holding\. i.?ll keep|licensed originator is on this exception|i need .+ from you|what.?s a good email|file is prepared/i.test(
        message.text,
      )),
  );
}

function withUpdatedStillUsefulAsk(messages: FoxMessage[], live: FoxIntakeDraft): FoxMessage[] {
  if (shouldDeferStillUsefulAsk(live)) return messages;
  const ask = foxAskMessage(workspacePromptCopy("done", live));
  const index = [...messages]
    .reverse()
    .findIndex(
      (message) =>
        message.role === "fox" &&
        /these docs help next|upload what you have|government ID|still useful:/i.test(message.text),
    );
  if (index < 0) return [...messages, ask];
  const at = messages.length - 1 - index;
  return messages.map((message, idx) =>
    idx === at ? { ...message, text: ask.text, actions: ask.actions } : message,
  );
}

export function requestFoxOpen() {
  window.dispatchEvent(new Event("onyx:fox-open"));
}

export function requestFoxAsk(text: string) {
  window.dispatchEvent(new CustomEvent("onyx:fox-ask", { detail: { text } }));
}

export function requestFoxFix(field: string) {
  window.dispatchEvent(new CustomEvent("onyx:fox-fix", { detail: { field } }));
}

export function requestFoxExplain(field: string) {
  window.dispatchEvent(new CustomEvent("onyx:fox-explain", { detail: { field } }));
}

function clientMoneyText(text: string, capture?: { field: string }) {
  if (capture?.field === "propose-funds" || capture?.field === "downPayment") {
    return text;
  }
  if (capture?.field !== "loanAmount" && capture?.field !== "propertyValue") {
    return text;
  }
  return confirmedMoneyText(text) ?? text;
}

function structureWriteCapture(field?: string) {
  return (
    field != null &&
    field !== "correct" &&
    field !== "propertyValue" &&
    field !== "downPayment" &&
    field !== "loanAmount" &&
    field !== "skip-value" &&
    field !== "skip-amount" &&
    field !== "skip-down" &&
    field !== "propose-funds" &&
    field !== "accept-proposal" &&
    field !== "change-proposal" &&
    field !== "decline-proposal"
  );
}

function persistPathFromHref(href: string) {
  try {
    const path = pathFromQuery(new URL(href, window.location.origin).searchParams.get("path"));
    if (!path) return;
    writeStartPath(path);
    setDraftPath(path);
  } catch {
    // Ignore malformed hrefs; navigation still proceeds.
  }
}

function visibleHomeStage() {
  const el = document.getElementById("fox-home-stage");
  const wrap = el?.closest(".membership-hero__fox-wrap");
  if (!el || !(wrap instanceof HTMLElement)) return null;
  return window.getComputedStyle(wrap).display === "none" ? null : el;
}

export function FoxLauncher() {
  return (
    <div className="fox-bar__desk">
      <span className="fox-bar__mark">
        <AdvisorMark size={20} />
      </span>
      <span className="fox-bar__prompt">Ask ONYX Fox</span>
    </div>
  );
}

function foxTurnAlreadyUsed(thread: FoxMessage[], index: number) {
  for (let i = index + 1; i < thread.length; i += 1) {
    const item = thread[i];
    if (item.role === "fox") return true;
    if (
      item.role === "client" &&
      /^(This one|Use this|Looks right|Skip)$/i.test(item.text.trim())
    ) {
      return true;
    }
  }
  return false;
}

function FoxThread({
  messages,
  draft,
  listRef,
  onAction,
  onEdit,
}: {
  messages: FoxMessage[];
  draft: FoxIntakeDraft;
  listRef: { current: HTMLDivElement | null };
  onAction: (action: FoxAction) => void;
  onEdit?: (prompt: FoxPrompt, line?: string, messageId?: string) => void;
}) {
  const [editOpenId, setEditOpenId] = useState<string | null>(null);
  const thread = dropStreetSuggestChips(
    dropAbandonedAddressConfirm(dropResolvedAddressConfirmChips(messages, draft), draft),
  );
  const currentFox = thread.reduce((index, message, i) => (message.role === "fox" ? i : index), -1);

  return (
    <div className="fox-panel__thread" ref={listRef} aria-live="polite">
      {thread.map((message, index) => {
        if (message.role === "system") {
          return (
            <p key={message.id} className="fox-bubble fox-bubble--system">
              {message.text}
            </p>
          );
        }
        const current =
          message.role === "fox" && index === currentFox && !foxTurnAlreadyUsed(thread, index);
        const tone = current ? " is-current" : " is-prior";
        const rawActions = current
          ? (paintedFoxActions(message, draft, true) ?? []).filter(
              (action) =>
                action.capture?.field !== "propose-place-address" &&
                !isStreetSuggestChipLabel(action.label),
            )
          : [];
        const paintActions = paintThreadActions(rawActions);
        const canEdit = message.role === "client" && Boolean(message.edit) && Boolean(onEdit);
        return (
          <article
            key={`${message.id}:${current ? "live" : "text"}`}
            className={
              message.role === "fox"
                ? `fox-bubble fox-bubble--fox${tone}`
                : `fox-bubble fox-bubble--client is-used${editOpenId === message.id ? " is-edit-open" : ""}`
            }
            aria-current={current ? "step" : undefined}
            onClick={
              canEdit
                ? () => {
                    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
                    setEditOpenId((id) => (id === message.id ? null : message.id));
                  }
                : undefined
            }
          >
            <p>{message.text}</p>
            {message.followUp ? <p>{message.followUp}</p> : null}
            {paintActions.length > 0 &&
            (message.text.trim() || (message.followUp ?? "").trim()) ? (
              <div className="fox-bubble__actions">
                {paintActions.map((action) =>
                  action.href ? (
                    <Link
                      key={action.id}
                      href={action.href}
                      className={
                        action.quiet
                          ? "btn btn--secondary fox-chip is-quiet"
                          : "btn btn--secondary fox-chip"
                      }
                      onClick={() => persistPathFromHref(action.href as string)}
                    >
                      {action.label}
                    </Link>
                  ) : (
                    <button
                      key={action.id}
                      type="button"
                      className={
                        action.quiet
                          ? "btn btn--secondary fox-chip is-quiet"
                          : "btn btn--secondary fox-chip"
                      }
                      onClick={() => onAction(action)}
                    >
                      {action.label}
                    </button>
                  ),
                )}
              </div>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                className="fox-bubble__edit"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit?.(message.edit as FoxPrompt, message.editLine, message.id);
                }}
              >
                Edit
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function transferHasFiles(data: DataTransfer | null | undefined) {
  if (!data) return false;
  return Array.from(data.types ?? []).includes("Files") || Boolean(data.files?.length);
}

function onComposerFileDrag(event: DragEvent<HTMLElement>) {
  if (!transferHasFiles(event.dataTransfer)) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
}

function onComposerFileDrop(event: DragEvent<HTMLElement>) {
  const files = filesFromDataTransfer(event.dataTransfer);
  if (!files.length) return;
  event.preventDefault();
  event.stopPropagation();
  void ingestDroppedFiles(files);
}

function onComposerFilePaste(event: ClipboardEvent<HTMLElement>) {
  const files = filesFromClipboard(event.clipboardData);
  if (!files.length) return;
  event.preventDefault();
  void ingestDroppedFiles(files);
}

function FoxWorkspace({
  className,
  messages,
  draft,
  listRef,
  onClose,
  onAction,
  onEdit,
  composer,
  hideClose,
  stickyDisclosure,
  onStartOver,
}: {
  className: string;
  messages: FoxMessage[];
  draft: FoxIntakeDraft;
  listRef: { current: HTMLDivElement | null };
  onClose: () => void;
  onAction: (action: FoxAction) => void;
  onEdit?: (prompt: FoxPrompt, line?: string, messageId?: string) => void;
  composer?: ReactNode;
  hideClose?: boolean;
  stickyDisclosure?: boolean;
  onStartOver?: () => void;
}) {
  return (
    <div
      id="fox-panel"
      className={className}
      data-composer-drop="true"
      onDragEnter={onComposerFileDrag}
      onDragOver={onComposerFileDrag}
      onDrop={onComposerFileDrop}
      onPaste={onComposerFilePaste}
    >
      <div className="fox-bar__head">
        <div className="fox-bar__head-copy">
          <span className="fox-bar__title">ONYX Fox</span>
          {stickyDisclosure ? <p className="fox-bar__disclosure">{FOX_DISCLOSURE}</p> : null}
        </div>
        {onStartOver ? (
          <button type="button" className="fox-bar__start-over" onClick={onStartOver}>
            Start over
          </button>
        ) : hideClose ? null : (
          <button
            type="button"
            className="fox-bar__close"
            aria-expanded={true}
            aria-controls="fox-panel"
            onClick={onClose}
          >
            Close
          </button>
        )}
      </div>
      <FoxThread messages={messages} draft={draft} listRef={listRef} onAction={onAction} onEdit={onEdit} />
      {composer}
    </div>
  );
}

export function AlwaysOnFox({
  startPath = null,
  startIntent = null,
  inWorkspace = false,
}: {
  startPath?: IntakePath | null;
  startIntent?: ProductIntent | null;
  inWorkspace?: boolean;
} = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const stage = foxStageFromPath(pathname);
  const isStart =
    inWorkspace ||
    stage === "start" ||
    pathname === "/start" ||
    pathname.startsWith("/start/");
  const isHome = stage === "home" || pathname === "/";
  const workspaceSurface = isStart || isHome;
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const rateflowKey = searchedKeyFor(draft) ?? "";
  const [open, setOpen] = useState(() => isStart || isHome || stage === "intake");
  const [ready, setReady] = useState(() => workspaceSurface);
  const [search, setSearch] = useState(() => {
    if (typeof window !== "undefined") return window.location.search;
    return isStart ? startSearchFromProps(startPath, startIntent) : "";
  });
  const [input, setInput] = useState("");
  const startSeeded = useRef(workspaceSurface);
  const [messages, setMessages] = useState<FoxMessage[]>(() =>
    workspaceSurface ? seedWorkspaceMessages(startPath, startIntent, isStart ? "start" : "home") : [],
  );
  const [homeStage, setHomeStage] = useState<HTMLElement | null>(null);
  const greeted = useRef<string>(
    workspaceSurface
      ? `${pathname}${isStart ? startSearchFromProps(startPath, startIntent) : ""}`
      : "",
  );
  const pendingAsk = useRef<string | null>(null);
  const skipPromptSync = useRef(workspaceSurface);
  const previewControlKey = useRef("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const [lookupWait, setLookupWait] = useState<LookupWait | null>(null);
  const [streetSuggestions, setStreetSuggestions] = useState<PlaceSuggestion[]>([]);
  const placesWaitGen = useRef(0);
  const placesSuggestFrozen = useRef(false);
  const fieldId = useId();
  const suggestId = useId();
  const greetKey = `${pathname}${search}`;
  const useHomeStage = Boolean(homeStage);

  const persistThread = (
    prev: FoxMessage[],
    next: FoxMessage[] | ((prev: FoxMessage[]) => FoxMessage[]),
  ) => {
    const resolved = ensureIncomeConfirmChips(
      inertSupersededIncomeConfirms(typeof next === "function" ? next(prev) : next),
      getFoxDraft(),
    );
    const live = getFoxDraft();
    const stored = getFoxMessages();
    if (
      shouldKeepStoredFoxThread(stored, resolved, {
        fileExists: fileExists(live),
        isIdExtractPath: isIdExtractPath(live),
        idExtractAsk: resolved.some((message) => isIdExtractAskText(message.text)),
      })
    ) {
      return dropStreetSuggestChips(
        dropAbandonedAddressConfirm(
          dropResolvedAddressConfirmChips(
            ensureIncomeConfirmChips(inertSupersededIncomeConfirms(stored), live),
            live,
          ),
          live,
        ),
      );
    }
    const held = dropStreetSuggestChips(
      dropAbandonedAddressConfirm(dropResolvedAddressConfirmChips(resolved, live), live),
    );
    setFoxMessages(held);
    return held;
  };

  const commitMessages = (
    next: FoxMessage[] | ((prev: FoxMessage[]) => FoxMessage[]),
  ) => {
    setMessages((prev) => persistThread(prev, next));
  };

  const commitMessagesNow = (
    next: FoxMessage[] | ((prev: FoxMessage[]) => FoxMessage[]),
  ) => {
    const resolved = persistThread(messages, next);
    setMessages(resolved);
    return resolved;
  };

  useLayoutEffect(() => {
    if (!isStart) return;
    hydrateFoxDraft();
    const stored = getFoxMessages();
    const live = getFoxDraft();
    if (!shouldResumeWorkspaceEntry(live, stored) || !stored.length) return;
    if (isIdExtractPath(live)) return;
    if (live.documents.some((doc) => doc.status === "reading")) return;
    setMessages(dropResolvedAddressConfirmChips(stored, live));
  }, [isStart, draft.motion, draft.updatedAt]);

  useEffect(() => {
    if (!isStart) return;
    const onDrag = (event: globalThis.DragEvent) => {
      if (!transferHasFiles(event.dataTransfer)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const onDrop = (event: globalThis.DragEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-composer-drop], .fox-bar__desk")) {
        return;
      }
      const files = filesFromDataTransfer(event.dataTransfer);
      if (!files.length) return;
      event.preventDefault();
      void ingestDroppedFiles(files);
    };
    const onPaste = (event: globalThis.ClipboardEvent) => {
      const files = filesFromClipboard(event.clipboardData);
      if (!files.length) return;
      event.preventDefault();
      void ingestDroppedFiles(files);
    };
    document.addEventListener("dragenter", onDrag);
    document.addEventListener("dragover", onDrag);
    document.addEventListener("drop", onDrop);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("dragenter", onDrag);
      document.removeEventListener("dragover", onDrag);
      document.removeEventListener("drop", onDrop);
      document.removeEventListener("paste", onPaste);
    };
  }, [isStart]);

  useLayoutEffect(() => {
    const syncStage = () => {
      setHomeStage(isHome ? visibleHomeStage() : null);
    };
    syncStage();
    const media = window.matchMedia("(min-width: 1024px)");
    media.addEventListener("change", syncStage);
    window.addEventListener("resize", syncStage);
    return () => {
      media.removeEventListener("change", syncStage);
      window.removeEventListener("resize", syncStage);
    };
  }, [isHome, open]);

  useEffect(() => {
    const query = window.location.search;
    if (!isStart) {
      hydrateFoxDraft();
    }
    const stored = sessionStorage.getItem(FOX_PANEL_KEY);
    const live = getFoxDraft();
    const asking = stage === "intake" && live.phase !== "confirmed";
    if (isStart || stage === "home") {
      setOpen(true);
    } else if (stage === "acr") {
      setOpen(false);
    } else if (asking && stored !== "0") {
      setOpen(true);
    } else if (stored === "1") {
      setOpen(true);
    } else if (stored === "0") {
      setOpen(false);
    }
    setSearch(query);
    setReady(true);
  }, [isStart, pathname, stage, startIntent, startPath]);

  useEffect(() => {
    if (!ready || stage !== "home") return;
    setOpen(true);
  }, [homeStage, ready, stage]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onAsk = (event: Event) => {
      const text = String((event as CustomEvent<{ text?: string }>).detail?.text ?? "").trim();
      setOpen(true);
      if (!text) return;
      if (isHome) {
        router.push(persistHomeComposerTurn(text));
        return;
      }
      if (!ready || greeted.current !== `${pathname}${search}`) {
        pendingAsk.current = text;
        return;
      }
      const live = getFoxDraft();
      const scenario = live.scenario ?? readScenario();
      if (!stage) return;
      const reply = replyToMessage(text, stage, live, scenario);
      if (reply.capture?.field === "path") {
        writeStartPath(reply.capture.value);
      }
      if (reply.capture) applyCapture(reply.capture);
      commitMessagesNow((prev) => [
        ...prev,
        {
          id: newId(),
          role: "client",
          text: clientMoneyText(text, reply.capture),
          edit: workspaceSurface
            ? editPromptFromCapture(reply.capture) ??
              (workspacePrompt(live) === "amount" || workspacePrompt(live) === "value"
                ? workspacePrompt(live)
                : undefined)
            : undefined,
          editLine: workspaceSurface ? editLineFromCapture(reply.capture) : undefined,
        },
        foxAskMessage(reply),
      ]);
    };
    const onFix = (event: Event) => {
      const field = String((event as CustomEvent<{ field?: string }>).detail?.field ?? "").trim();
      if (!field || !isStart) return;
      setOpen(true);
      const prompt = structureFixPrompt(field, getFoxDraft());
      if (!prompt) return;
      skipPromptSync.current = true;
      applyCapture({ field: "correct", value: prompt, line: field });
      const live = getFoxDraft();
      const ask = workspacePromptCopy(prompt, live);
      commitMessages((prev) => {
        const priceEdit = prompt === "value" || field === "price";
        const editedId = priceEdit ? findClientEditMessageId(prev, prompt, field) : undefined;
        const kept = editedId ? threadThroughEditedTurn(prev, editedId) : prev;
        const stripped = dropFoxActions(kept);
        if (priceEdit) return stripped;
        return [...stripped, foxAskMessage(ask)];
      });
    };
    const onExplain = (event: Event) => {
      const field = String((event as CustomEvent<{ field?: string }>).detail?.field ?? "").trim();
      if (!field || !isStart) return;
      setOpen(true);
      const live = getFoxDraft();
      const explain = structureExplainCopy(field, live);
      if (!explain) return;
      skipPromptSync.current = true;
      commitMessages((prev) => [...prev, foxAskMessage(explain)]);
    };
    const onIntake = (event: Event) => {
      if (!isStart) return;
      const detail = (event as CustomEvent<DocIntakeDetail>).detail ?? {};
      skipPromptSync.current = true;
      commitMessages((prev) => {
        const next = [...prev];
        if (detail.reject) {
          next.push({ id: newId(), role: "system", text: detail.reject });
        }
        for (const line of detail.quietLines ?? []) {
          if (line === DECLINING_INCOME_CAUTION) continue;
          if (isDeadFileWriteLine(line)) continue;
          next.push({ id: newId(), role: "system", text: line });
        }
        const intakeDraft = getFoxDraft();
        const idDrop =
          detail.extractClass === "government_id" ||
          isBorrowerNameConfirmPending(intakeDraft) ||
          intakeDraft.documents.some(
            (doc) =>
              (doc.extractClass === "government_id" || doc.slot === "id") &&
              (doc.status === "extracted" ||
                doc.status === "received" ||
                doc.status === "reading" ||
                /could not read|no text layer/i.test(doc.note ?? "")),
          );
        if (idDrop) {
          const unreadId =
            Boolean(detail.emptyRead) ||
            (detail.quietLines ?? []).some((line) => isUnreadNote(line)) ||
            (!intakeDraft.pendingProposal && !intakeDraft.pendingConflict);
          if (
            unreadId &&
            !isBorrowerNameConfirmPending(intakeDraft) &&
            !(governmentIdSkipped(intakeDraft) && !detail.emptyRead)
          ) {
            return applyFoxAsk(next, {
              text: ID_UNREAD_ASK,
              actions: unreadRestoreActions(intakeDraft),
            });
          }
          const reaction = docReactionAsk(intakeDraft, "government_id");
          const ask = intakeDraft.pendingConflict
            ? {
                text: conflictAskCopy(intakeDraft.pendingConflict),
                actions: conflictActions(intakeDraft.pendingConflict),
              }
            : reaction ?? workspacePromptCopy("confirm-proposal", intakeDraft);
          return applyFoxAsk(next, ask);
        }
        if (detail.emptyRead) {
          const live = getFoxDraft();
          return applyFoxAsk(next, {
            text: isBankUnreadAsk(live)
              ? RECEIVED_UNREAD_ASK
              : unreadDropBytesCopy(detail.emptyRead.name, detail.emptyRead.size),
            actions: unreadRestoreActions(live),
          });
        }
        if (
          (detail.quietLines ?? []).some((line) => isUnreadNote(line)) &&
          !detail.conflict &&
          !getFoxDraft().pendingProposal &&
          !getFoxDraft().pendingConflict &&
          !getFoxDraft().awaitingPayFrequency &&
          !getFoxDraft().awaitingBothMonthlyReason &&
          !getFoxDraft().awaitingRaiseWhen &&
          !getFoxDraft().awaitingRaiseYtdFar
        ) {
          const live = getFoxDraft();
          const ask = workspacePromptCopy(workspacePrompt(live), live);
          return applyFoxAsk(next, {
            text: ask.text,
            followUp: ask.followUp,
            actions: unreadRestoreActions(live),
          });
        }
        if (detail.conflict) {
          next.push(
            foxAskMessage({
              text: conflictAskCopy(detail.conflict),
              actions: conflictActions(detail.conflict),
            }),
          );
        } else if (
          getFoxDraft().pendingProposal ||
          getFoxDraft().pendingConflict ||
          getFoxDraft().awaitingPayFrequency ||
          getFoxDraft().awaitingBothMonthlyReason ||
          getFoxDraft().awaitingRaiseWhen ||
          getFoxDraft().awaitingRaiseYtdFar
        ) {
          const live = getFoxDraft();
          const reaction = docReactionAsk(live, detail.extractClass);
          const ask = live.pendingConflict
            ? {
                text: conflictAskCopy(live.pendingConflict),
                actions: conflictActions(live.pendingConflict),
              }
            : reaction ?? workspacePromptCopy("confirm-proposal", live);
          const painted = applyFoxAsk(next, ask);
          if (
            detail.refreshStillUseful &&
            live.sampleAccepted &&
            !shouldDeferStillUsefulAsk(live)
          ) {
            return withUpdatedStillUsefulAsk(painted, getFoxDraft());
          }
          return painted;
        } else if (getFoxDraft().workspaceFlow && !getFoxDraft().sampleAccepted) {
          const live = getFoxDraft();
          const reaction = docReactionAsk(live, detail.extractClass);
          const ask = reaction ?? workspacePromptCopy(workspacePrompt(live), live);
          return applyFoxAsk(next, ask);
        } else if (detail.refreshStillUseful) {
          return withUpdatedStillUsefulAsk(next, getFoxDraft());
        } else if (detail.missing?.length) {
          const live = getFoxDraft();
          next.push(
            fileExists(live)
              ? foxAskMessage(workspacePromptCopy("done", live))
              : foxAskMessage({
                  text: missingAskCopy(detail.missing),
                  actions: missingAskActions(),
                }),
          );
        } else if (fileExists(getFoxDraft())) {
          const live = getFoxDraft();
          next.push(
            foxAskMessage(workspacePromptCopy("done", live)),
          );
        }
        return next;
      });
    };
    const onThreadLine = (event: Event) => {
      const message = (event as CustomEvent<FoxMessage>).detail;
      if (!message?.text) return;
      skipPromptSync.current = true;
      commitMessages((prev) =>
        prev.some((item) => item.id === message.id) ? prev : [...prev, message],
      );
    };
    window.addEventListener("onyx:fox-open", onOpen);
    window.addEventListener("onyx:fox-ask", onAsk);
    window.addEventListener("onyx:fox-fix", onFix);
    window.addEventListener("onyx:fox-explain", onExplain);
    window.addEventListener(DOC_INTAKE_EVENT, onIntake);
    window.addEventListener(FOX_THREAD_LINE_EVENT, onThreadLine);
    return () => {
      window.removeEventListener("onyx:fox-open", onOpen);
      window.removeEventListener("onyx:fox-ask", onAsk);
      window.removeEventListener("onyx:fox-fix", onFix);
      window.removeEventListener("onyx:fox-explain", onExplain);
      window.removeEventListener(DOC_INTAKE_EVENT, onIntake);
      window.removeEventListener(FOX_THREAD_LINE_EVENT, onThreadLine);
    };
  }, [isHome, isStart, pathname, ready, search, stage, workspaceSurface]);

  useEffect(() => {
    if (!ready || !stage) return;
    sessionStorage.setItem(FOX_PANEL_KEY, open ? "1" : "0");
  }, [open, ready, stage]);

  useLayoutEffect(() => {
    if (!ready || !stage) return;
    if (isHome) {
      greeted.current = greetKey;
      skipPromptSync.current = true;
      return;
    }
    if (workspaceSurface && startSeeded.current && messages.length > 0) {
      greeted.current = greetKey;
      skipPromptSync.current = true;
      return;
    }
    const live = getFoxDraft();
    const scenario = live.scenario ?? readScenario();
    if (scenario && !live.scenario) setDraftScenario(scenario);
    if (greeted.current === greetKey) return;
    greeted.current = greetKey;
    const ask =
      stage === "intake" && live.phase !== "confirmed"
        ? promptCopy(currentPrompt(live), live)
        : greeting(stage, scenario, live);
    const context =
      stage === "intake" && live.phase !== "confirmed"
        ? intakePathContext(live, scenario)
        : null;
    const lines: FoxMessage[] = context
      ? [
          { id: newId(), role: "fox", text: context },
          foxAskMessage(ask),
        ]
      : [foxAskMessage(ask)];
    const queued = pendingAsk.current;
    pendingAsk.current = null;
    if (queued) {
      const reply = replyToMessage(queued, stage, live, scenario);
      if (reply.capture) applyCapture(reply.capture);
      lines.push(
        { id: newId(), role: "client", text: clientMoneyText(queued, reply.capture) },
        foxAskMessage(reply),
      );
    }
    skipPromptSync.current = true;
    commitMessages(lines);
  }, [greetKey, isHome, isStart, pathname, ready, stage, workspaceSurface]);

  useEffect(() => {
    if (!ready || (stage !== "intake" && !isStart)) return;
    const live = getFoxDraft();
    if (isStart && shouldHoldAskForLiveLine(live)) return;
    if (isStart && shouldDeferNextAskForLiveCoupon(live)) return;
    if (isStart && live.documents.some((doc) => doc.status === "reading" && (doc.extractClass === "government_id" || doc.slot === "id"))) {
      return;
    }
    const prompt = isStart ? workspacePrompt(live) : currentPrompt(live);
    const ask = isStart
      ? isBorrowerNameConfirmPending(live)
        ? docReactionAsk(live, "government_id") ?? workspacePromptCopy("confirm-proposal", live)
        : workspacePromptCopy(prompt, live)
      : promptCopy(prompt, live);
    const mustShowReview =
      isStart && prompt === "review" && !live.docsHeld && !live.looksRightHold && !nextDocInvite(live);
    if (skipPromptSync.current) {
      skipPromptSync.current = false;
      if (!mustShowReview) return;
    }
    commitMessages((prev) => {
      if (mustShowReview && hasReviewAsk(prev)) return prev;
      if (
        isStart &&
        shouldDeferStillUsefulAsk(live) &&
        prompt !== "confirm-proposal" &&
        prompt !== "pay-frequency" &&
        prompt !== "wage-docs" &&
        prompt !== "w2-box5" &&
        prompt !== "w2-pay-frequency" &&
        prompt !== "paystub-monthly" &&
        prompt !== "both-monthly-reason" &&
        prompt !== "raise-when" &&
        prompt !== "raise-ytd-far"
      ) {
        return prev;
      }
      if (isStart && shouldHoldAskForLiveLine(live)) {
        return prev;
      }
      if (isStart && shouldDeferNextAskForLiveCoupon(live) && prompt !== "confirm-proposal") {
        return prev;
      }
      if (isStart && prompt === "done") {
        if (hasPreparedAsk(prev)) return prev;
        if (fileExists(getFoxDraft()) && prev[prev.length - 1]?.role === "fox") return prev;
      }
      if (
        isStart &&
        prompt === "amount" &&
        lastFoxTurn(prev) &&
        isOnFileAddressLine(lastFoxTurn(prev)!)
      ) {
        return [...dropFoxActions(withoutTrailingSealedFoxLines(prev)), foxAskMessage(ask)];
      }
      const lastFox = lastFoxTurn(prev);
      if (lastFox && sameFoxAsk(lastFox, ask)) return prev;
      if (isOnFileAddressLine({ id: lastFox?.id ?? "on-file", role: "fox", text: ask.text })) {
        return isIdExtractPath(live) ? dropOnFileAddressLines(prev) : prev;
      }
      const held = addressConfirmPending(live)
        ? withoutLiveQuoteSpeech(prev)
        : dropResolvedAddressConfirmChips(prev, live);
      return applyFoxAsk(held, ask);
    });
  }, [draft.updatedAt, isStart, ready, stage]);

  useEffect(() => {
    if (!ready || !isStart) return;
    const live = getFoxDraft();
    if (live.docsHeld || workspacePrompt(live) !== "review") return;
    const ask = workspacePromptCopy("review", live);
    commitMessages((prev) => (hasReviewAsk(prev) ? prev : [...prev, foxAskMessage(ask)]));
  }, [
    draft.amountAsked,
    draft.loanAmountValue,
    draft.productIntent,
    draft.propertyValueAmount,
    draft.downPaymentAmount,
    draft.updatedAt,
    draft.valueAsked,
    draft.creditAsked,
    draft.creditBand,
    draft.incomeAsked,
    draft.incomeType,
    isStart,
    ready,
  ]);

  useEffect(() => {
    if (!ready || !isStart || !rateflowKey) return;
    const already = getFoxDraft();
    if (already.liveQuote?.key === rateflowKey && already.liveQuoteStatus === "ready") {
      commitMessages((prev) => {
        skipPromptSync.current = true;
        return messagesWithRateOrReadySpeech(withoutWaitLines(prev), already);
      });
      return;
    }
    let cancelled = false;
    skipPromptSync.current = true;
    setLookupWait("rateflow");
    commitMessages((prev) => withWaitLine(prev, "rateflow"));
    void (async () => {
      while (!cancelled) {
        const result = await requestRateflowIfNeeded(getFoxDraft());
        if (cancelled) return;
        const liveNow = getFoxDraft();
        const key = searchedKeyFor(liveNow) || rateflowKey;
        if (result && result !== "unavailable") {
          setLookupWait(null);
          const { rows, ...quote } = result;
          setLiveQuoteResult(key, quote, rows);
          const live = getFoxDraft();
          skipPromptSync.current = Boolean(live.liveQuote && live.liveQuoteStatus === "ready");
          commitMessages((prev) =>
            messagesWithRateOrReadySpeech(withoutWaitLines(prev), live),
          );
          return;
        }
        if (result === "unavailable") {
          setLookupWait(null);
          if (key) setLiveQuoteResult(key, null);
          const live = getFoxDraft();
          skipPromptSync.current = false;
          commitMessages((prev) =>
            messagesWithRateOrReadySpeech(withoutWaitLines(prev), live),
          );
          return;
        }
        commitMessages((prev) => withWaitLine(prev, "rateflow"));
        await new Promise((resolve) => window.setTimeout(resolve, 400));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isStart, rateflowKey, ready]);

  useEffect(() => {
    if (!ready || !isStart) {
      setStreetSuggestions([]);
      return;
    }
    if (placesSuggestFrozen.current) {
      setStreetSuggestions([]);
      return;
    }
    if (workspacePrompt(draft) !== "property-address" || draft.pendingProposal || draft.pendingAddress) {
      setStreetSuggestions([]);
      return;
    }
    const q = input.trim();
    if (!shouldSuggestStreets(q)) {
      setStreetSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void requestAddressSuggestions(q).then((rows) => {
        if (cancelled) return;
        if (placesSuggestFrozen.current) {
          setStreetSuggestions([]);
          return;
        }
        const live = getFoxDraft();
        if (workspacePrompt(live) !== "property-address") {
          setStreetSuggestions([]);
          return;
        }
        if (live.pendingProposal || live.pendingAddress) {
          setStreetSuggestions([]);
          return;
        }
        setStreetSuggestions(rows);
      });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [draft.pendingAddress, draft.pendingProposal, draft.updatedAt, input, isStart, ready]);

  useEffect(() => {
    if (!ready || !isStart) return;
    const params = new URLSearchParams(
      (typeof window !== "undefined" && window.location.search) || search,
    );
    const nudge = params.get("nudge");
    const sla = params.get("sla");
    const suggest = params.get("suggest");
    const key = `${nudge ?? ""}|${sla ?? ""}|${suggest ?? ""}`;
    if (previewControlKey.current !== key) {
      previewControlKey.current = key;
      applyPreviewMotionControls({
        nudge,
        sla,
        suggest,
      });
    }
    const tick = () => {
      if (reviewIsSitting(getFoxDraft())) nudgeReview();
    };
    tick();
    const id = window.setInterval(tick, 4000);
    return () => window.clearInterval(id);
  }, [draft.motion, draft.reviewSlaMs, draft.updatedAt, isStart, ready, search]);

  useLayoutEffect(() => {
    const thread = listRef.current;
    if (!thread || !open) return;
    const reveal = () => {
      const current = thread.querySelector("[aria-current='step']");
      if (!(current instanceof HTMLElement)) return;
      const dock = document.querySelector(".fox-workspace-dock");
      const viewportBottom = window.visualViewport?.height ?? window.innerHeight;
      const dockTop =
        dock instanceof HTMLElement ? dock.getBoundingClientRect().top : viewportBottom;
      current.style.scrollMarginTop = "12px";
      current.style.scrollMarginBottom = `${Math.max(16, viewportBottom - dockTop + 12)}px`;
      current.scrollIntoView({ block: "end", inline: "nearest" });
      const box = current.getBoundingClientRect();
      const nextDockTop =
        dock instanceof HTMLElement ? dock.getBoundingClientRect().top : viewportBottom;
      const delta = scrollDeltaToFollowLastLine(box, nextDockTop);
      if (delta !== 0) window.scrollBy({ top: delta, left: 0 });
    };
    reveal();
    const frame = window.requestAnimationFrame(() => {
      reveal();
      window.requestAnimationFrame(reveal);
    });
    const vv = window.visualViewport;
    const onViewport = () => {
      if (window.innerHeight - (vv?.height ?? window.innerHeight) > 80) {
        window.dispatchEvent(new Event(FOX_KEYBOARD_EVENT));
      }
      reveal();
    };
    vv?.addEventListener("resize", onViewport);
    return () => {
      window.cancelAnimationFrame(frame);
      vv?.removeEventListener("resize", onViewport);
    };
  }, [messages, open]);

  const startAsk = isStart ? workspacePrompt(draft) : null;
  const askingAmountPurpose =
    startAsk === "amount" && draft.productIntent === "other" && !draft.amountPurposeLabel;
  const moneyAsk =
    (startAsk === "amount" && !askingAmountPurpose) ||
    startAsk === "value" ||
    startAsk === "debts" ||
    (startAsk === "assets" && (draft.sampleAccepted || draft.correcting === "assets")) ||
    startAsk === "current-housing" ||
    startAsk === "subject-lease" ||
    startAsk === "w2-box5" ||
    startAsk === "paystub-monthly";
  const numberAsk =
    startAsk === "credit" ||
    startAsk === "term" ||
    startAsk === "time-on-job" ||
    startAsk === "years-in-business";
  const needsTyping =
    moneyAsk ||
    numberAsk ||
    askingAmountPurpose ||
    startAsk === "property-address" ||
    Boolean(draft.awaitingUnreadNote);

  const focusComposer = (force = false) => {
    const node = inputRef.current;
    if (!node || (!force && !isStart && !needsTyping)) return;
    node.focus({ preventScroll: true });
  };

  useLayoutEffect(() => {
    if (!isStart || !open || !ready || !needsTyping) return;
    focusComposer(true);
    const frame = window.requestAnimationFrame(() => focusComposer(true));
    return () => window.cancelAnimationFrame(frame);
  }, [isStart, open, startAsk, ready, messages.length, needsTyping]);

  useLayoutEffect(() => {
    if (caretRef.current == null || !inputRef.current) return;
    inputRef.current.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
  }, [input]);

  useEffect(() => {
    setInput("");
    setStreetSuggestions([]);
  }, [startAsk]);

  if (!stage && !isStart) return null;

  const scenario = draft.scenario ?? readScenario();

  const appendReply = (
    clientText: string,
    fox: {
      text: string;
      followUp?: string;
      facts?: FoxMessage["facts"];
      actions?: FoxAction[];
    },
    edit?: FoxMessage["edit"],
    editLine?: string,
  ) => {
    commitMessagesNow((prev) => {
      const live = getFoxDraft();
      const held = addressConfirmPending(live)
        ? withoutLiveQuoteSpeech(prev)
        : dropResolvedAddressConfirmChips(prev, live);
      const next: FoxMessage[] = [
        ...held,
        { id: newId(), role: "client", text: clientText, edit, editLine },
      ];
      if (!fox.text.trim() && !(fox.followUp ?? "").trim()) return next;
      return [...next, foxAskMessage(fox)];
    });
  };

  const skipPropertyAddressFromComposer = (spoken: string) => {
    placesWaitGen.current += 1;
    placesSuggestFrozen.current = false;
    setLookupWait(null);
    setStreetSuggestions([]);
    applyCapture({ field: "skip-property-address" });
    skipPromptSync.current = true;
    appendReply(spoken, nextFoxAsk(getFoxDraft()));
  };

  const appendStructureFix = (clientText: string, capture: Capture) => {
    const live = getFoxDraft();
    const next = workspacePromptCopy(workspacePrompt(live), live);
    commitMessagesNow((prev) => [
      ...prev,
      {
        id: newId(),
        role: "client",
        text: clientText,
        edit: editPromptFromCapture(capture),
        editLine: editLineFromCapture(capture),
      },
      { id: newId(), role: "system", text: workspaceUpdateCopy(capture, live) },
      foxAskMessage(next),
    ]);
  };

  const continueHomeToDesk = () => {
    if (!isHome) return;
    const live = getFoxDraft();
    router.push(deskHrefFromSession(live.path ?? null, live.productIntent ?? null));
  };

  const editThreadTurn = (prompt: FoxPrompt, line?: string, messageId?: string) => {
    if (!isStart) return;
    skipPromptSync.current = true;
    applyCapture({ field: "correct", value: prompt, line });
    const live = getFoxDraft();
    commitMessages((prev) => {
      const priceEdit = prompt === "value" || line === "price";
      const editedId = messageId ?? findClientEditMessageId(prev, prompt, line);
      const kept = editedId ? threadThroughEditedTurn(prev, editedId) : prev;
      const stripped = dropFoxActions(kept);
      if (priceEdit) return stripped;
      return [...stripped, foxAskMessage(workspacePromptCopy(prompt, live))];
    });
  };

  const runAction = (action: FoxAction) => {
    if (action.capture?.field === "skip-property-address") {
      skipPropertyAddressFromComposer(action.label);
      return;
    }
    if (action.capture?.field === "change-proposal") {
      placesSuggestFrozen.current = false;
      setStreetSuggestions([]);
      setInput("");
    }
    if (action.capture?.field === "couponChoice" && action.capture.value === "skip") {
      setLookupWait((current) => (current === "rateflow" ? null : current));
      commitMessages((prev) => withoutWaitLines(prev));
    }
    const productIntent = productIntentFromAction(action);
    const productCapture = productIntent
      ? ({ field: "productIntent" as const, value: productIntent } satisfies Capture)
      : undefined;
    if (action.href) {
      if (isLeftoverConversionHref(action.href)) {
        persistPathFromHref(action.href);
        router.push(deskHrefFromLeftover(action.href));
        return;
      }
      const hrefPath = pathFromQuery(
        new URL(action.href, window.location.origin).searchParams.get("path"),
      );
      if (isHomepageFreshQuery(action.href) && hrefPath) {
        beginWorkspaceFromHero(hrefPath);
        writeStartPath(hrefPath);
      } else {
        persistPathFromHref(action.href);
        if (productCapture) {
          applyCapture(productCapture);
          skipPromptSync.current = true;
        }
      }
      router.push(action.href);
      return;
    }
    if (action.event === "prepare-draft") {
      router.push(DESK_START_HREF);
      return;
    }
    if (action.capture?.field === "what-happens-next" || action.capture?.field === "ask-fox") {
      applyCapture(action.capture);
      skipPromptSync.current = true;
      const live = getFoxDraft();
      if (action.capture.field === "ask-fox" && live.docsHeld && !live.sampleAccepted) {
        appendReply(action.label, holdDocsAskFox());
        window.requestAnimationFrame(() => focusComposer(true));
        return;
      }
      appendReply(action.label, {
        text: workspaceUpdateCopy(action.capture, live),
        actions: inQueueEnding(live)
          ? finishLineActions(live)
          : (layer2AskActions(live) ?? finishLineActions(live)),
      });
      if (action.capture.field === "ask-fox") {
        window.requestAnimationFrame(() => focusComposer(true));
      }
      return;
    }
    if (action.capture?.field === "retry-unread-doc") {
      applyCapture(action.capture);
      skipPromptSync.current = true;
      requestFoxPickFile();
      const live = getFoxDraft();
      appendReply(action.label, workspacePromptCopy(workspacePrompt(live), live));
      return;
    }
    if (action.capture?.field === "note-unread-doc") {
      applyCapture(action.capture);
      skipPromptSync.current = true;
      const live = getFoxDraft();
      appendReply(action.label, workspacePromptCopy(workspacePrompt(live), live));
      window.requestAnimationFrame(() => focusComposer(true));
      return;
    }
    if (action.capture?.field === "open-docs" || action.event === "open-docs") {
      if (!getFoxDraft().sampleAccepted) {
        applyCapture({ field: "start-docs" });
      }
      skipPromptSync.current = true;
      requestFoxPickFile();
      return;
    }
    if (action.capture?.field === "upload-more") {
      applyCapture(action.capture);
      skipPromptSync.current = true;
      appendReply(action.label, { text: "" });
      window.requestAnimationFrame(() => {
        document.getElementById("fox-documents")?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
      });
      return;
    }
    if (
      action.capture?.field === "keep-file-fact" ||
      action.capture?.field === "use-document-fact" ||
      action.capture?.field === "keep-both-facts"
    ) {
      applyCapture(action.capture);
      skipPromptSync.current = true;
      const live = getFoxDraft();
      if (hasPurchaseContractDoc(live)) {
        const ask =
          live.pendingConflict || live.pendingProposal
            ? (docReactionAsk(live) ?? nextFoxAsk(live))
            : nextFoxAsk(live);
        appendReply(action.label, ask);
        return;
      }
      const key = stillUsefulRefreshKey(live);
      const lines: FoxMessage[] = [
        {
          id: newId(),
          role: "client",
          text: action.label,
        },
        { id: newId(), role: "system", text: workspaceUpdateCopy(action.capture, live) },
      ];
      if (key && live.missingAskKey !== key) {
        markMissingAsked(key);
        lines.push(
          fileExists(live)
            ? foxAskMessage(workspacePromptCopy("done", live))
            : foxAskMessage({
                text: stillUsefulAskCopy(live),
                actions: missingAskActions(),
              }),
        );
      }
      commitMessagesNow((prev) => [...prev, ...lines]);
      return;
    }
    const placeCapture = action.capture;
    if (placeCapture?.field === "propose-place-address") {
      const gen = ++placesWaitGen.current;
      placesSuggestFrozen.current = true;
      skipPromptSync.current = true;
      setStreetSuggestions([]);
      setInput("");
      if (lookupWait === "places") {
        setLookupWait(null);
        commitMessages((prev) => withoutWaitLines(dropStreetSuggestChips(prev)));
      } else {
        commitMessages((prev) => dropStreetSuggestChips(prev));
      }
      void (async () => {
        const place = looksLikePlaceId(placeCapture.value)
          ? await requestPlaceAddress(placeCapture.value)
          : parseSafePlaceAddress(placeCapture.value);
        if (gen !== placesWaitGen.current) return;
        const capture = place
          ? {
              field: "propose-place-address" as const,
              value: encodePlaceAddress(place),
            }
          : {
              field: "propose-subject-address" as const,
              value: action.label,
            };
        applyCapture(capture);
        skipPromptSync.current = true;
        const live = getFoxDraft();
        const next = workspacePromptCopy("confirm-proposal", live);
        appendReply(action.label, next, editPromptFromCapture(capture), editLineFromCapture(capture));
      })();
      return;
    }
    if (action.capture || productCapture) {
      const capture = productCapture ?? action.capture;
      if (!capture) return;
      if (capture.field === "path") {
        writeStartPath(capture.value);
      }
      const editing = Boolean(isStart && draft.correcting && structureWriteCapture(capture.field));
      const pendingEdit = editPromptFromPendingField(draft.pendingProposal?.field);
      const addressPending =
        isSubjectAddressConfirmPending(draft) || Boolean(draft.pendingAddress?.line);
      applyCapture(capture);
      skipPromptSync.current = true;
      const live = getFoxDraft();
      if (editing) {
        appendStructureFix(action.label, capture);
        return;
      }
      if (capture.field === "accept-proposal" && addressPending && fileAddressLine(live)) {
        if (needsPurchaseSplitAsk(live)) {
          appendReply(action.label, nextFoxAsk(live));
          return;
        }
        const waitingForLive =
          Boolean(searchedKeyFor(live)) &&
          live.liveQuoteStatus !== "unavailable" &&
          !(live.liveQuoteStatus === "ready" && live.liveQuote);
        if (!waitingForLive) {
          commitMessagesNow((prev) => {
            const held = dropResolvedAddressConfirmChips(prev, live);
            const next: FoxMessage[] = [
              ...held,
              { id: newId(), role: "client", text: action.label },
            ];
            return messagesWithRateOrReadySpeech(next, live);
          });
          return;
        }
        appendReply(action.label, { text: "" });
        return;
      }
      const couponResolved =
        (capture.field === "couponChoice" &&
          (capture.value === "this" || capture.value === "skip")) ||
        capture.field === "accept-live-coupon" ||
        capture.field === "keep-live-coupon";
      const afterCoupon =
        couponResolved && incomeAskOpen(live)
          ? workspacePromptCopy("income", live)
          : nextFoxAsk(live);
      const next =
        workspaceSurface
          ? withWorkspaceGuide(
              { ...afterCoupon, capture },
              live,
            )
          : promptCopy(currentPrompt(live), live);
      const edit =
        capture.field === "correct"
          ? undefined
          : capture.field === "accept-proposal" ||
              capture.field === "change-proposal" ||
              capture.field === "decline-proposal"
            ? pendingEdit
            : editPromptFromCapture(capture);
      appendReply(
        action.label,
        next,
        edit,
        capture.field === "correct" ? undefined : editLineFromCapture(capture),
      );
      if (capture.field === "change-proposal" && addressPending) {
        window.requestAnimationFrame(() => focusComposer(true));
      }
      continueHomeToDesk();
    }
  };

  const pickStreetSuggestion = (place: PlaceSuggestion) => {
    runAction({
      id: `place-${place.id}`,
      label: place.line,
      event: "bubble",
      capture: { field: "propose-place-address", value: place.id },
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (isHome) {
      if (!text) return;
      setInput("");
      router.push(persistHomeComposerTurn(text));
      return;
    }
    const replyStage = stage ?? (isStart ? "start" : null);
    if (!text || !replyStage) return;
    const moneyDigits = text.replace(/[$,\s]/g, "").replace(/%$/, "");
    if (
      isStart &&
      startAsk === "amount" &&
      draft.correcting !== "value" &&
      draft.correctingLine !== "price" &&
      draft.propertyValueAmount != null &&
      Number(moneyDigits) === draft.propertyValueAmount
    ) {
      setOpen(true);
      setInput("");
      appendReply(text, {
        text: "Purchase price is in the file. What’s the down payment or loan amount?",
      }, "amount");
      return;
    }
    setOpen(true);
    setInput("");
    if (
      isStart &&
      (lookupWait === "places" ||
        startAsk === "property-address" ||
        isSubjectAddressConfirmPending(draft)) &&
      isSkipPropertyAddressText(text)
    ) {
      skipPropertyAddressFromComposer(text);
      return;
    }
    if (
      isStart &&
      (startAsk === "property-address" || lookupWait === "places") &&
      parseVolunteeredAddress(text) &&
      !isSkipPropertyAddressText(text)
    ) {
      const spoken = text;
      const gen = ++placesWaitGen.current;
      skipPromptSync.current = true;
      setLookupWait("places");
      commitMessages((prev) => withWaitLine(prev, "places"));
      void (async () => {
        const rows = await requestAddressSuggestions(spoken);
        const needle = spoken.replace(/\s+/g, " ").trim().toLowerCase();
        const match =
          rows.find((item) => item.line.replace(/\s+/g, " ").trim().toLowerCase() === needle) ??
          rows.find((item) => item.line.replace(/\s+/g, " ").toLowerCase().startsWith(needle)) ??
          (rows.length === 1 ? rows[0] : undefined);
        const place = match ? await requestPlaceAddress(match.id) : null;
        if (gen !== placesWaitGen.current) return;
        setLookupWait(null);
        commitMessages((prev) => withoutWaitLines(prev));
        const capture = place
          ? {
              field: "propose-place-address" as const,
              value: encodePlaceAddress(place),
            }
          : {
              field: "propose-subject-address" as const,
              value: spoken,
            };
        applyCapture(capture);
        skipPromptSync.current = true;
        const live = getFoxDraft();
        const next = workspacePromptCopy("confirm-proposal", live);
        appendReply(spoken, next, editPromptFromCapture(capture), editLineFromCapture(capture));
      })();
      return;
    }
    const reply = replyToMessage(text, replyStage, draft, scenario);
    if (reply.capture?.field === "path") {
      writeStartPath(reply.capture.value);
    }
    const editing = Boolean(
      isStart && draft.correcting && reply.capture && structureWriteCapture(reply.capture.field),
    );
    if (reply.capture) {
      const invitePick = reply.capture.field === "open-docs" && !draft.sampleAccepted;
      if (!invitePick) applyCapture(reply.capture);
      skipPromptSync.current = true;
      if (
        reply.capture.field === "change-proposal" ||
        reply.capture.field === "skip-property-address"
      ) {
        placesSuggestFrozen.current = false;
        setStreetSuggestions([]);
      }
    }
    if (reply.capture?.field === "open-docs") {
      requestFoxPickFile();
    } else if (reply.capture?.field === "upload-more") {
      window.requestAnimationFrame(() => {
        document.getElementById("fox-documents")?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
      });
    }
    if (reply.capture?.field === "ask-fox") {
      window.requestAnimationFrame(() => focusComposer(true));
    }
    if (editing && reply.capture) {
      appendStructureFix(clientMoneyText(text, reply.capture), reply.capture);
      return;
    }
    const rewritePrice = Boolean(
      isStart &&
        (draft.correcting === "value" || draft.correctingLine === "price") &&
        draft.correctingLine !== "home" &&
        reply.capture?.field === "propertyValue",
    );
    if (rewritePrice) {
      const spoken = clientMoneyText(text, reply.capture);
      const liveAfterPrice = getFoxDraft();
      const fundsAsk = workspacePromptCopy("amount", liveAfterPrice);
      commitMessagesNow((prev) => {
        const editedId = findClientEditMessageId(prev, "value", "price");
        const cut = editedId ? threadThroughEditedTurn(prev, editedId) : prev;
        const next = editedId
          ? replaceClientTurn(cut, editedId, spoken)
          : [
              ...cut,
              {
                id: newId(),
                role: "client" as const,
                text: spoken,
                edit: "value" as const,
                editLine: "price",
              },
            ];
        return [
          ...dropFoxActions(withoutTrailingSealedFoxLines(next)),
          foxAskMessage(fundsAsk),
        ];
      });
      continueHomeToDesk();
      return;
    }
    appendReply(
      clientMoneyText(text, reply.capture),
      reply,
      workspaceSurface
        ? editPromptFromCapture(reply.capture) ??
          (startAsk === "amount" || startAsk === "value" ? startAsk : undefined)
        : undefined,
      workspaceSurface ? editLineFromCapture(reply.capture) : undefined,
    );
    if (reply.capture?.field === "change-proposal") {
      window.requestAnimationFrame(() => focusComposer(true));
    }
    continueHomeToDesk();
  };

  const hideDock = isHome && (useHomeStage ? open : true);
  const composerMode = moneyAsk ? "decimal" : numberAsk ? "numeric" : "text";

  const onComposerChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (!moneyAsk) {
      setInput(raw);
      return;
    }
    const formatted = formatLiveMoneyInput(raw);
    if (formatted == null) {
      caretRef.current = null;
      setInput(raw);
      return;
    }
    caretRef.current = caretAfterMoneyFormat(
      raw,
      event.target.selectionStart ?? raw.length,
      formatted,
    );
    setInput(formatted);
  };

  const onComposerBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (!needsTyping) return;
    const next = event.relatedTarget;
    if (
      next instanceof HTMLElement &&
      next.closest("button, a, .fox-chip, .fox-bar__send, .fox-bar__suggest")
    ) {
      return;
    }
    window.setTimeout(() => {
      if (!needsTyping || !inputRef.current) return;
      const active = document.activeElement;
      if (active === inputRef.current) return;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      focusComposer(true);
    }, 0);
  };

  const desk = (
    <div className={streetSuggestions.length ? "fox-bar__compose is-suggesting" : "fox-bar__compose"}>
      {streetSuggestions.length > 0 ? (
        <ul id={suggestId} className="fox-bar__suggest" role="listbox">
          {streetSuggestions.map((item) => (
            <li key={item.id} role="presentation">
              <button
                type="button"
                role="option"
                className="fox-bar__suggest-row"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pickStreetSuggestion(item)}
              >
                {item.line}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className={isStart ? "fox-bar__desk fox-bar__desk--plain" : "fox-bar__desk"}
        onSubmit={onSubmit}
        onDragEnter={onComposerFileDrag}
        onDragOver={onComposerFileDrag}
        onDrop={onComposerFileDrop}
        onPaste={onComposerFilePaste}
      >
        <span className={lookupWait ? "fox-bar__mark is-waiting" : "fox-bar__mark"}>
          <AdvisorMark size={20} />
        </span>
        <label className="visually-hidden" htmlFor={fieldId}>
          Message Fox
        </label>
        <input
          key={composerMode}
          ref={inputRef}
          id={fieldId}
          className="fox-bar__input"
          type="text"
          value={input}
          onChange={onComposerChange}
          onFocus={() => {
            setOpen(true);
            window.dispatchEvent(new Event(FOX_KEYBOARD_EVENT));
          }}
          onBlur={onComposerBlur}
          placeholder=""
          inputMode={composerMode}
          autoFocus={needsTyping}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={streetSuggestions.length > 0}
          aria-controls={streetSuggestions.length > 0 ? suggestId : undefined}
        />
        {isStart ? <ComposerAttach /> : null}
        <button
          type="submit"
          className="fox-bar__send"
          disabled={!input.trim()}
          aria-label="Send"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 8h9M8.5 3.5 13 8l-4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );

  const workspace = isHome || !(open || isStart) ? null : (
    <FoxWorkspace
      className={
        isStart
          ? "fox-stage fox-stage--workspace start-workspace__fox"
          : isHome
            ? "fox-stage"
            : "fox-bar__workspace"
      }
      messages={messages}
      draft={draft}
      listRef={listRef}
      onClose={() => setOpen(false)}
      onAction={runAction}
      onEdit={isStart ? editThreadTurn : undefined}
      composer={
        isStart ? (
          <WorkspaceFileDock>{desk}</WorkspaceFileDock>
        ) : useHomeStage ? (
          desk
        ) : undefined
      }
      hideClose={isStart || isHome}
      stickyDisclosure={isStart}
      onStartOver={
        isStart
          ? () => {
              const path = startPath ?? getFoxDraft().path ?? "acr";
              const fresh = startOverWorkspace(path);
              skipPromptSync.current = true;
              placesSuggestFrozen.current = false;
              setStreetSuggestions([]);
              setInput("");
              const greet = [foxAskMessage(workspaceGreeting(fresh))];
              setFoxMessages(greet);
              setMessages(greet);
            }
          : undefined
      }
    />
  );

  if (isStart) {
    return workspace;
  }

  let stageNode: ReactNode = null;
  if (useHomeStage && homeStage) {
    stageNode = createPortal(desk, homeStage);
  }

  return (
    <>
      {stageNode}
      {hideDock ? null : (
        <div className={open ? "fox-bar is-open" : "fox-bar"}>
          {!useHomeStage && !isHome && workspace}
          {desk}
        </div>
      )}
    </>
  );
}
