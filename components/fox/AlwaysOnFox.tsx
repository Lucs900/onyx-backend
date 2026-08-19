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
import { readScenario, scenarioFromQuery } from "@/components/products/scenario";
import { pathFromQuery, readStartPath, writeStartPath } from "@/components/products/startPath";
import {
  currentPrompt,
  foxStageFromPath,
  greeting,
  intakeHref,
  intakePathContext,
  promptCopy,
  replyToMessage,
} from "./script";
import {
  applyCapture,
  applyWorkspaceEntry,
  emptyDraft,
  getFoxDraft,
  getServerDraft,
  hydrateFoxDraft,
  seedPreviewSample,
  setDraftPath,
  setDraftProductIntent,
  setDraftScenario,
  subscribeFoxDraft,
} from "./store";
import {
  caretAfterMoneyFormat,
  confirmedMoneyText,
  formatLiveMoneyInput,
  productIntentFromQuery,
  productIntentFromSlug,
  editPromptFromCapture,
  workspaceGreeting,
  workspacePrompt,
  workspacePromptCopy,
  workspaceUpdateCopy,
} from "./workspace";
import {
  HOME_PRODUCT_TEXT,
  homeProductActions,
  pathFromHomeChoice,
} from "./homeIdle";
import {
  FOX_PANEL_KEY,
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
  const live = applyWorkspaceEntry(path ?? null, intent ?? null);
  return [foxAskMessage(workspaceGreeting(live))];
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

export function requestFoxOpen() {
  window.dispatchEvent(new Event("onyx:fox-open"));
}

export function requestFoxAsk(text: string) {
  window.dispatchEvent(new CustomEvent("onyx:fox-ask", { detail: { text } }));
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
                    <span>{fact.value}</span>
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
}: {
  className: string;
  messages: FoxMessage[];
  listRef: { current: HTMLDivElement | null };
  onClose: () => void;
  onAction: (action: FoxAction) => void;
  composer?: ReactNode;
  hideClose?: boolean;
}) {
  return (
    <div id="fox-panel" className={className}>
      <div className="fox-bar__head">
        <span className="fox-bar__title">ONYX Fox</span>
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
      {composer}
    </div>
  );
}

export function AlwaysOnFox({
  startPath = null,
  startIntent = null,
}: {
  startPath?: IntakePath | null;
  startIntent?: ProductIntent | null;
} = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const stage = foxStageFromPath(pathname);
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const [open, setOpen] = useState(() => stage === "intake" || stage === "start");
  const [ready, setReady] = useState(() => stage === "start");
  const [search, setSearch] = useState(() =>
    stage === "start" ? startSearchFromProps(startPath, startIntent) : "",
  );
  const [input, setInput] = useState("");
  const startSeeded = useRef(stage === "start");
  const [messages, setMessages] = useState<FoxMessage[]>(() =>
    stage === "start" ? seedStartMessages(startPath, startIntent) : [],
  );
  const [homeStage, setHomeStage] = useState<HTMLElement | null>(null);
  const greeted = useRef<string>(
    stage === "start" ? `${pathname}${startSearchFromProps(startPath, startIntent)}` : "",
  );
  const pendingAsk = useRef<string | null>(null);
  const skipPromptSync = useRef(stage === "start");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const fieldId = useId();
  const greetKey = `${pathname}${search}`;
  const isHome = stage === "home";
  const isStart = stage === "start";
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
    const sample = new URLSearchParams(query).get("sample");
    if (pathname.startsWith("/intake") && sample === "loop") {
      seedPreviewSample("intake");
    } else {
      hydrateFoxDraft();
    }
    if (pathname.startsWith("/intake") && sample !== "loop") {
      const params = new URLSearchParams(query);
      const fromQuery = scenarioFromQuery(params);
      if (fromQuery) setDraftScenario(fromQuery);
      const path = pathFromQuery(params.get("path")) ?? readStartPath();
      if (path) setDraftPath(path);
    }
    if (stage === "start") {
      const params = new URLSearchParams(query);
      applyWorkspaceEntry(
        startPath ?? pathFromQuery(params.get("path")) ?? readStartPath(),
        startIntent ??
          productIntentFromQuery(params.get("intent")) ??
          productIntentFromSlug(params.get("product")),
      );
    }
    const stored = sessionStorage.getItem(FOX_PANEL_KEY);
    const live = getFoxDraft();
    const asking = stage === "intake" && live.phase !== "confirmed";
    if (stage === "start") {
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
  }, [pathname, stage]);

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
          edit: stage === "start" ? editPromptFromCapture(reply.capture) : undefined,
        },
        foxAskMessage(reply),
      ]);
    };
    window.addEventListener("onyx:fox-open", onOpen);
    window.addEventListener("onyx:fox-ask", onAsk);
    return () => {
      window.removeEventListener("onyx:fox-open", onOpen);
      window.removeEventListener("onyx:fox-ask", onAsk);
    };
  }, [pathname, ready, search, stage]);

  useEffect(() => {
    if (!ready || !stage) return;
    sessionStorage.setItem(FOX_PANEL_KEY, open ? "1" : "0");
  }, [open, ready, stage]);

  useLayoutEffect(() => {
    if (!ready || !stage) return;
    if (stage === "start" && startSeeded.current && messages.length > 0) {
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
  }, [greetKey, pathname, ready, stage]);

  useEffect(() => {
    if (!ready || (stage !== "intake" && stage !== "start")) return;
    if (skipPromptSync.current) {
      skipPromptSync.current = false;
      return;
    }
    const live = getFoxDraft();
    const ask =
      stage === "start"
        ? workspacePromptCopy(workspacePrompt(live), live)
        : promptCopy(currentPrompt(live), live);
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "fox" && sameFoxAsk(last, ask)) return prev;
      return [...prev, foxAskMessage(ask)];
    });
  }, [draft.updatedAt, ready, stage]);

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

  if (!stage) return null;

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

  const chooseHomePath = (label: string, path: ReturnType<typeof pathFromHomeChoice>) => {
    if (!path) return false;
    writeStartPath(path);
    setDraftPath(path);
    appendReply(label, {
      text: HOME_PRODUCT_TEXT,
      actions: homeProductActions(path),
    });
    return true;
  };

  const runAction = (action: FoxAction) => {
    if (isHome && !action.href) {
      const path = pathFromHomeChoice(action.id) ?? pathFromHomeChoice(action.label);
      if (chooseHomePath(action.label, path)) return;
    }
    if (action.href) {
      persistPathFromHref(action.href);
      router.push(action.href);
      return;
    }
    if (action.event === "prepare-draft") {
      router.push(intakeHref(scenario));
      return;
    }
    if (action.capture?.field === "open-docs" || action.event === "open-docs") {
      applyCapture({ field: "open-docs" });
      document.getElementById("fox-documents")?.scrollIntoView({ behavior: "smooth" });
      appendReply(action.label, {
        text: isStart ? "Add a file in the preview, or skip." : "Add a file in the slots below.",
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
        const next = workspacePromptCopy(workspacePrompt(live), live);
        const confirm = workspaceUpdateCopy(action.capture, live);
        appendReply(
          action.label,
          {
            text: confirm,
            followUp: next.followUp ?? (next.text !== confirm ? next.text : undefined),
            facts: next.facts,
            actions: next.actions,
          },
          editPromptFromCapture(action.capture),
        );
        return;
      }
      const next =
        stage === "start"
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
    if (!text) return;
    setOpen(true);
    setInput("");
    const reply = replyToMessage(text, stage, draft, scenario);
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
    if (reply.capture) {
      applyCapture(reply.capture);
      skipPromptSync.current = true;
    }
    if (reply.capture?.field === "open-docs") {
      document.getElementById("fox-documents")?.scrollIntoView({ behavior: "smooth" });
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
    <form className="fox-bar__desk" onSubmit={onSubmit}>
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
      composer={useHomeStage || isStart ? desk : undefined}
      hideClose={isStart}
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
