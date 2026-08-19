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
  type FocusEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AdvisorMark } from "@/components/AdvisorMark";
import { readScenario } from "@/components/products/scenario";
import {
  ACR_START_HREF,
  DESK_START_HREF,
  LOAN_START_HREF,
  deskHrefFromLeftover,
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
import {
  applyCapture,
  beginWorkspaceFromHero,
  emptyDraft,
  getFoxDraft,
  getServerDraft,
  hydrateFoxDraft,
  resetWorkspaceForEntry,
  setDraftPath,
  setDraftScenario,
  subscribeFoxDraft,
} from "./store";
import {
  caretAfterMoneyFormat,
  confirmedMoneyText,
  formatLiveMoneyInput,
  editPromptFromCapture,
  structureExplainCopy,
  structureFixPrompt,
  workspaceGreeting,
  workspacePrompt,
  workspacePromptCopy,
  workspaceUpdateCopy,
} from "./workspace";
import { DocumentDrop } from "./DocumentDrop";
import { WorkspaceFileDock } from "./FilePreview";
import { pathFromHomeChoice } from "./homeIdle";
import {
  FOX_DISCLOSURE,
  FOX_PANEL_KEY,
  type Capture,
  type FoxAction,
  type FoxMessage,
  type IntakePath,
  type ProductIntent,
} from "./types";

function seedStartMessages(
  path?: IntakePath | null,
  intent?: ProductIntent | null,
): FoxMessage[] {
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
  const live = getFoxDraft();
  const closed =
    live.sampleAccepted ||
    live.phase === "confirmed" ||
    live.workspaceDraftStatus === "with-originator";
  const draft =
    live.workspaceFlow && live.path === (path ?? live.path) && !closed
      ? intent && live.productIntent !== intent
        ? { ...live, productIntent: intent }
        : live
      : resetWorkspaceForEntry(path ?? null, intent ?? null);
  return [foxAskMessage(workspaceGreeting(draft))];
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
  return {
    id: newId(),
    role: "fox",
    text: ask.text,
    followUp: ask.followUp,
    facts: ask.facts,
    actions: ask.actions,
  };
}

function sameFoxAsk(
  last: FoxMessage,
  ask: {
    text: string;
    followUp?: string;
    facts?: FoxMessage["facts"];
  },
) {
  if (last.text !== ask.text) return false;
  if ((last.followUp ?? "") !== (ask.followUp ?? "")) return false;
  const left = (last.facts ?? []).map((fact) => `${fact.id}:${fact.value}`).join("\n");
  const right = (ask.facts ?? []).map((fact) => `${fact.id}:${fact.value}`).join("\n");
  return left === right;
}

function hasReviewAsk(messages: FoxMessage[]) {
  return messages.some(
    (message) =>
      message.role === "fox" &&
      (message.followUp === "Does this look right?" ||
        message.text.includes("Here’s a sample structure.")),
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
  if (capture?.field !== "loanAmount" && capture?.field !== "propertyValue") {
    return text;
  }
  return confirmedMoneyText(text) ?? text;
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
  if (window.matchMedia("(min-width: 1024px)").matches) return null;
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

function FoxThread({
  messages,
  listRef,
  onAction,
}: {
  messages: FoxMessage[];
  listRef: { current: HTMLDivElement | null };
  onAction: (action: FoxAction) => void;
}) {
  const currentFox = messages.reduce((index, message, i) => (message.role === "fox" ? i : index), -1);

  return (
    <div className="fox-panel__thread" ref={listRef} aria-live="polite">
      {messages.map((message, index) => {
        if (message.role === "system") {
          return (
            <p key={message.id} className="fox-bubble fox-bubble--system">
              {message.text}
            </p>
          );
        }
        const current = message.role === "fox" && index === currentFox;
        const tone = current ? " is-current" : " is-prior";
        return (
          <article
            key={message.id}
            className={
              message.role === "fox"
                ? `fox-bubble fox-bubble--fox${tone}`
                : "fox-bubble fox-bubble--client"
            }
            aria-current={current ? "step" : undefined}
          >
            <p>{message.text}</p>
            {message.facts?.length ? (
              <ul className="fox-bubble__facts">
                {message.facts.map((fact) => (
                  <li key={fact.id}>
                    <span className="fox-bubble__fact-label">{fact.label}</span>
                    <span>
                      {fact.value}
                      {fact.note ? <small> · {fact.note}</small> : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {message.followUp ? <p>{message.followUp}</p> : null}
            {message.role === "client" && message.edit ? (
              <button
                type="button"
                className="fox-bubble__edit"
                onClick={() =>
                  onAction({
                    id: `edit-${message.id}`,
                    label: "Edit",
                    event: "bubble",
                    capture: { field: "correct", value: message.edit as string },
                  })
                }
              >
                Edit
              </button>
            ) : null}
            {current && message.actions?.length ? (
              <div className="fox-bubble__actions">
                {message.actions.map((action) =>
                  action.href ? (
                    <Link
                      key={action.id}
                      href={action.href}
                      className="btn btn--secondary fox-chip"
                      onClick={() => persistPathFromHref(action.href as string)}
                    >
                      {action.label}
                    </Link>
                  ) : (
                    <button
                      key={action.id}
                      type="button"
                      className="btn btn--secondary fox-chip"
                      onClick={() => onAction(action)}
                    >
                      {action.label}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function FoxWorkspace({
  className,
  messages,
  listRef,
  onClose,
  onAction,
  composer,
  hideClose,
  stickyDisclosure,
  docsDrop,
}: {
  className: string;
  messages: FoxMessage[];
  listRef: { current: HTMLDivElement | null };
  onClose: () => void;
  onAction: (action: FoxAction) => void;
  composer?: ReactNode;
  hideClose?: boolean;
  stickyDisclosure?: boolean;
  docsDrop?: ReactNode;
}) {
  return (
    <div id="fox-panel" className={className}>
      <div className="fox-bar__head">
        <div className="fox-bar__head-copy">
          <span className="fox-bar__title">ONYX Fox</span>
          {stickyDisclosure ? <p className="fox-bar__disclosure">{FOX_DISCLOSURE}</p> : null}
        </div>
        {hideClose ? null : (
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
      <FoxThread messages={messages} listRef={listRef} onAction={onAction} />
      {docsDrop}
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
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const [open, setOpen] = useState(() => isStart || stage === "intake");
  const [ready, setReady] = useState(() => isStart);
  const [search, setSearch] = useState(() =>
    isStart ? startSearchFromProps(startPath, startIntent) : "",
  );
  const [input, setInput] = useState("");
  const startSeeded = useRef(isStart);
  const [messages, setMessages] = useState<FoxMessage[]>(() =>
    isStart ? seedStartMessages(startPath, startIntent) : [],
  );
  const [homeStage, setHomeStage] = useState<HTMLElement | null>(null);
  const greeted = useRef<string>(
    isStart ? `${pathname}${startSearchFromProps(startPath, startIntent)}` : "",
  );
  const pendingAsk = useRef<string | null>(null);
  const skipPromptSync = useRef(isStart);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const fieldId = useId();
  const greetKey = `${pathname}${search}`;
  const isHome = stage === "home";
  const useHomeStage = Boolean(homeStage);

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
    if (isStart) {
      setOpen(true);
    } else if (stage === "home") {
      setOpen(visibleHomeStage() ? stored !== "0" : stored === "1");
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
    const stored = sessionStorage.getItem(FOX_PANEL_KEY);
    setOpen(homeStage ? stored !== "0" : stored === "1");
  }, [homeStage, ready, stage]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onAsk = (event: Event) => {
      const text = String((event as CustomEvent<{ text?: string }>).detail?.text ?? "").trim();
      setOpen(true);
      if (!text) return;
      if (!ready || greeted.current !== `${pathname}${search}`) {
        pendingAsk.current = text;
        return;
      }
      const live = getFoxDraft();
      const scenario = live.scenario ?? readScenario();
      if (!stage) return;
      const reply = replyToMessage(text, stage, live, scenario);
      if (stage === "home") {
        const path = pathFromHomeChoice(text);
        if (path) {
          writeStartPath(path);
          setDraftPath(path);
        }
      }
      if (reply.capture?.field === "path") {
        writeStartPath(reply.capture.value);
      }
      if (reply.capture) applyCapture(reply.capture);
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "client",
          text: clientMoneyText(text, reply.capture),
          edit: isStart ? editPromptFromCapture(reply.capture) : undefined,
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
      applyCapture({ field: "correct", value: prompt });
      skipPromptSync.current = true;
      const live = getFoxDraft();
      const ask = workspacePromptCopy(prompt, live);
      setMessages((prev) => [...prev, foxAskMessage(ask)]);
    };
    const onExplain = (event: Event) => {
      const field = String((event as CustomEvent<{ field?: string }>).detail?.field ?? "").trim();
      if (!field || !isStart) return;
      setOpen(true);
      const live = getFoxDraft();
      const explain = structureExplainCopy(field, live);
      if (!explain) return;
      skipPromptSync.current = true;
      setMessages((prev) => [...prev, foxAskMessage(explain)]);
    };
    window.addEventListener("onyx:fox-open", onOpen);
    window.addEventListener("onyx:fox-ask", onAsk);
    window.addEventListener("onyx:fox-fix", onFix);
    window.addEventListener("onyx:fox-explain", onExplain);
    return () => {
      window.removeEventListener("onyx:fox-open", onOpen);
      window.removeEventListener("onyx:fox-ask", onAsk);
      window.removeEventListener("onyx:fox-fix", onFix);
      window.removeEventListener("onyx:fox-explain", onExplain);
    };
  }, [isStart, pathname, ready, search, stage]);

  useEffect(() => {
    if (!ready || !stage) return;
    sessionStorage.setItem(FOX_PANEL_KEY, open ? "1" : "0");
  }, [open, ready, stage]);

  useLayoutEffect(() => {
    if (!ready || !stage) return;
    if (isStart && startSeeded.current && messages.length > 0) {
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
    setMessages(lines);
  }, [greetKey, isStart, pathname, ready, stage]);

  useEffect(() => {
    if (!ready || (stage !== "intake" && !isStart)) return;
    const live = getFoxDraft();
    const prompt = isStart ? workspacePrompt(live) : currentPrompt(live);
    const ask = isStart
      ? workspacePromptCopy(prompt, live)
      : promptCopy(prompt, live);
    const mustShowReview = isStart && prompt === "review";
    if (skipPromptSync.current) {
      skipPromptSync.current = false;
      if (!mustShowReview) return;
    }
    setMessages((prev) => {
      if (mustShowReview && hasReviewAsk(prev)) return prev;
      const last = prev[prev.length - 1];
      if (last?.role === "fox" && sameFoxAsk(last, ask)) return prev;
      return [...prev, foxAskMessage(ask)];
    });
  }, [draft.updatedAt, isStart, ready, stage]);

  useEffect(() => {
    if (!ready || !isStart) return;
    const live = getFoxDraft();
    if (workspacePrompt(live) !== "review") return;
    const ask = workspacePromptCopy("review", live);
    setMessages((prev) => (hasReviewAsk(prev) ? prev : [...prev, foxAskMessage(ask)]));
  }, [
    draft.amountAsked,
    draft.loanAmountValue,
    draft.productIntent,
    draft.propertyValueAmount,
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
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  const startAsk = isStart ? workspacePrompt(draft) : null;
  const moneyAsk = startAsk === "amount" || startAsk === "value";
  const needsTyping = moneyAsk || startAsk === "term";

  const focusComposer = () => {
    const node = inputRef.current;
    if (!node || !needsTyping) return;
    node.focus({ preventScroll: true });
  };

  useLayoutEffect(() => {
    if (!isStart || !open || !needsTyping || !ready) return;
    focusComposer();
    const frame = window.requestAnimationFrame(() => focusComposer());
    return () => window.cancelAnimationFrame(frame);
  }, [isStart, open, startAsk, needsTyping, ready, messages.length]);

  useLayoutEffect(() => {
    if (caretRef.current == null || !inputRef.current) return;
    inputRef.current.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
  }, [input]);

  useEffect(() => {
    setInput("");
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
  ) => {
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "client", text: clientText, edit },
      foxAskMessage(fox),
    ]);
  };

  const appendStructureFix = (clientText: string, capture: Capture) => {
    const live = getFoxDraft();
    const next = workspacePromptCopy(workspacePrompt(live), live);
    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: "client",
        text: clientText,
        edit: editPromptFromCapture(capture),
      },
      { id: newId(), role: "system", text: workspaceUpdateCopy(capture, live) },
      foxAskMessage(next),
    ]);
  };

  const chooseHomePath = (label: string, path: ReturnType<typeof pathFromHomeChoice>) => {
    if (!path) return false;
    writeStartPath(path);
    beginWorkspaceFromHero(path);
    router.push(path === "acr" ? ACR_START_HREF : LOAN_START_HREF);
    return true;
  };

  const runAction = (action: FoxAction) => {
    if (isHome && !action.href) {
      const path = pathFromHomeChoice(action.id) ?? pathFromHomeChoice(action.label);
      if (chooseHomePath(action.label, path)) return;
    }
    if (action.href) {
      if (isLeftoverConversionHref(action.href)) {
        persistPathFromHref(action.href);
        router.push(deskHrefFromLeftover(action.href));
        return;
      }
      persistPathFromHref(action.href);
      router.push(action.href);
      return;
    }
    if (action.event === "prepare-draft") {
      router.push(DESK_START_HREF);
      return;
    }
    if (action.capture?.field === "open-docs" || action.event === "open-docs") {
      applyCapture({ field: "open-docs" });
      document.getElementById("fox-documents")?.scrollIntoView({ behavior: "smooth" });
      const live = getFoxDraft();
      const docsAsk = workspacePromptCopy("documents", live);
      appendReply(action.label, {
        text: docsAsk.text,
        actions: (docsAsk.actions ?? []).filter((item) => item.capture?.field === "skip-docs"),
      });
      return;
    }
    if (action.capture) {
      if (action.capture.field === "path") {
        writeStartPath(action.capture.value);
      }
      const editing = Boolean(isStart && draft.correcting && action.capture.field !== "correct");
      applyCapture(action.capture);
      skipPromptSync.current = true;
      const live = getFoxDraft();
      if (editing) {
        appendStructureFix(action.label, action.capture);
        return;
      }
      const next =
        isStart
          ? workspacePromptCopy(workspacePrompt(live), live)
          : promptCopy(currentPrompt(live), live);
      appendReply(
        action.label,
        next,
        action.capture.field === "correct" ? undefined : editPromptFromCapture(action.capture),
      );
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    const replyStage = stage ?? (isStart ? "start" : null);
    if (!text || !replyStage) return;
    setOpen(true);
    setInput("");
    const reply = replyToMessage(text, replyStage, draft, scenario);
    if (isHome) {
      const path = pathFromHomeChoice(text);
      if (path) {
        writeStartPath(path);
        setDraftPath(path);
      }
    }
    if (reply.capture?.field === "path") {
      writeStartPath(reply.capture.value);
    }
    const editing = Boolean(
      isStart && draft.correcting && reply.capture && reply.capture.field !== "correct",
    );
    if (reply.capture) {
      applyCapture(reply.capture);
      skipPromptSync.current = true;
    }
    if (reply.capture?.field === "open-docs") {
      document.getElementById("fox-documents")?.scrollIntoView({ behavior: "smooth" });
    }
    if (editing && reply.capture) {
      appendStructureFix(clientMoneyText(text, reply.capture), reply.capture);
      return;
    }
    appendReply(
      clientMoneyText(text, reply.capture),
      reply,
      isStart ? editPromptFromCapture(reply.capture) : undefined,
    );
  };

  const hideDock = isHome && (useHomeStage ? open : true);
  const composerMode = moneyAsk ? "decimal" : startAsk === "term" ? "numeric" : "text";

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
    if (next instanceof HTMLElement && next.closest("button, a, .fox-chip, .fox-bar__send")) {
      return;
    }
    window.setTimeout(() => {
      if (!needsTyping || !inputRef.current) return;
      const active = document.activeElement;
      if (active === inputRef.current) return;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      focusComposer();
    }, 0);
  };

  const desk = (
    <form
      className={isStart ? "fox-bar__desk fox-bar__desk--plain" : "fox-bar__desk"}
      onSubmit={onSubmit}
    >
      <span className="fox-bar__mark">
        <AdvisorMark size={20} />
      </span>
      <label className="visually-hidden" htmlFor={fieldId}>
        Ask ONYX Fox
      </label>
      <input
        key={composerMode}
        ref={inputRef}
        id={fieldId}
        className="fox-bar__input"
        type="text"
        value={input}
        onChange={onComposerChange}
        onFocus={() => setOpen(true)}
        onBlur={onComposerBlur}
        placeholder={moneyAsk ? "Enter amount or say not sure" : "Ask ONYX Fox"}
        inputMode={composerMode}
        autoFocus={needsTyping}
        autoComplete="off"
      />
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
  );

  const workspace = open || isStart ? (
    <FoxWorkspace
      className={
        isStart
          ? "fox-stage fox-stage--workspace start-workspace__fox"
          : isHome
            ? "fox-stage"
            : "fox-bar__workspace"
      }
      messages={messages}
      listRef={listRef}
      onClose={() => setOpen(false)}
      onAction={runAction}
      composer={
        isStart ? (
          <WorkspaceFileDock>{desk}</WorkspaceFileDock>
        ) : useHomeStage ? (
          desk
        ) : undefined
      }
      hideClose={isStart}
      stickyDisclosure={isStart}
      docsDrop={
        isStart && (startAsk === "documents" || draft.docsOpen || draft.phase === "documents")
          ? <DocumentDrop draft={draft} compact />
          : null
      }
    />
  ) : null;

  if (isStart) {
    return workspace;
  }

  let stageNode: ReactNode = null;
  if (useHomeStage && homeStage) {
    stageNode = createPortal(
      open ? workspace : <span className="visually-hidden" data-fox-collapsed="true" />,
      homeStage,
    );
  }

  return (
    <>
      {stageNode}
      {hideDock ? null : (
        <div className={open ? "fox-bar is-open" : "fox-bar"}>
          {!useHomeStage && workspace}
          {desk}
        </div>
      )}
    </>
  );
}
