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
  DESK_START_HREF,
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
  applyPreviewMotionControls,
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
  subscribeFoxDraft,
  workspaceSessionStarted,
} from "./store";
import {
  caretAfterMoneyFormat,
  confirmedMoneyText,
  formatLiveMoneyInput,
  editPromptFromCapture,
  structureAmountLabel,
  structureExplainCopy,
  structureFixPrompt,
  workspaceGreeting,
  workspacePrompt,
  workspacePromptCopy,
  workspaceUpdateCopy,
} from "./workspace";
import { DocumentDrop } from "./DocumentDrop";
import { WorkspaceFileDock } from "./FilePreview";
import {
  DOC_INTAKE_EVENT,
  conflictActions,
  conflictAskCopy,
  missingAskActions,
  missingAskCopy,
  missingAskKey,
  missingExtractClasses,
  type DocIntakeDetail,
} from "./fileWrite";
import { fileExists, finishLineActions, motionAskText, reviewIsSitting } from "./motion";
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
  if (workspaceSessionStarted(live, stored) && stored.length) {
    const last = stored[stored.length - 1];
    if (last?.role === "client") {
      const ask = foxAskMessage(workspacePromptCopy(workspacePrompt(live), live));
      const next = [...stored, ask];
      setFoxMessages(next);
      return next;
    }
    return stored;
  }
  const draft = continueWorkspaceFromEntry(path ?? null, intent ?? null);
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
    writeStartPath(path);
    setDraftPath(path);
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

function hasPreparedAsk(messages: FoxMessage[]) {
  return messages.some(
    (message) =>
      message.role === "fox" &&
      (/still useful:|this file can move|onyx has this for review|holding\. i.?ll keep|licensed originator is on this exception|i need .+ from you|what.?s a good email|file is prepared/i.test(
        message.text,
      )),
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
  const isHome = stage === "home" || pathname === "/";
  const workspaceSurface = isStart || isHome;
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const [open, setOpen] = useState(() => isStart || isHome || stage === "intake");
  const [ready, setReady] = useState(() => workspaceSurface);
  const [search, setSearch] = useState(() =>
    isStart ? startSearchFromProps(startPath, startIntent) : "",
  );
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
  const previewControls = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const fieldId = useId();
  const greetKey = `${pathname}${search}`;
  const useHomeStage = Boolean(homeStage);

  const persistThread = (
    prev: FoxMessage[],
    next: FoxMessage[] | ((prev: FoxMessage[]) => FoxMessage[]),
  ) => {
    const resolved = typeof next === "function" ? next(prev) : next;
    setFoxMessages(resolved);
    return resolved;
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
          edit: workspaceSurface ? editPromptFromCapture(reply.capture) : undefined,
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
      commitMessages((prev) => [...prev, foxAskMessage(ask)]);
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
          next.push({ id: newId(), role: "system", text: line });
        }
        if (detail.conflict) {
          next.push(
            foxAskMessage({
              text: conflictAskCopy(detail.conflict),
              actions: conflictActions(),
            }),
          );
        } else if (detail.missing?.length) {
          const live = getFoxDraft();
          next.push(
            fileExists(live)
              ? foxAskMessage({
                  text: motionAskText(live),
                  actions: finishLineActions(live),
                })
              : foxAskMessage({
                  text: missingAskCopy(detail.missing),
                  actions: missingAskActions(),
                }),
          );
        } else if (fileExists(getFoxDraft())) {
          const live = getFoxDraft();
          next.push(
            foxAskMessage({
              text: motionAskText(live),
              actions: finishLineActions(live),
            }),
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
    const prompt = isStart ? workspacePrompt(live) : currentPrompt(live);
    const ask = isStart
      ? workspacePromptCopy(prompt, live)
      : promptCopy(prompt, live);
    const mustShowReview = isStart && prompt === "review";
    if (skipPromptSync.current) {
      skipPromptSync.current = false;
      if (!mustShowReview) return;
    }
    commitMessages((prev) => {
      if (mustShowReview && hasReviewAsk(prev)) return prev;
      if (isStart && prompt === "done" && hasPreparedAsk(prev)) return prev;
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
    commitMessages((prev) => (hasReviewAsk(prev) ? prev : [...prev, foxAskMessage(ask)]));
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
    if (!ready || !isStart) return;
    if (!previewControls.current) {
      previewControls.current = true;
      const params = new URLSearchParams(window.location.search);
      applyPreviewMotionControls({
        nudge: params.get("nudge"),
        sla: params.get("sla"),
      });
    }
    const tick = () => {
      if (reviewIsSitting(getFoxDraft())) nudgeReview();
    };
    tick();
    const id = window.setInterval(tick, 4000);
    return () => window.clearInterval(id);
  }, [draft.motion, draft.reviewSlaMs, draft.updatedAt, isStart, ready]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  const startAsk = isStart ? workspacePrompt(draft) : null;
  const askingAmountPurpose =
    startAsk === "amount" && draft.productIntent === "other" && !draft.amountPurposeLabel;
  const moneyAsk = (startAsk === "amount" && !askingAmountPurpose) || startAsk === "value";
  const needsTyping = moneyAsk || startAsk === "term" || askingAmountPurpose;

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
    commitMessagesNow((prev) => [
      ...prev,
      { id: newId(), role: "client", text: clientText, edit },
      foxAskMessage(fox),
    ]);
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

  const runAction = (action: FoxAction) => {
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
    if (
      action.capture?.field === "open-docs" ||
      action.capture?.field === "upload-more" ||
      action.event === "open-docs"
    ) {
      applyCapture(action.capture ?? { field: "open-docs" });
      document.getElementById("fox-documents")?.scrollIntoView({ behavior: "smooth" });
      const live = getFoxDraft();
      if (fileExists(live)) {
        appendReply(action.label, workspacePromptCopy("done", live));
        return;
      }
      const docsAsk = workspacePromptCopy("documents", live);
      appendReply(action.label, {
        text: docsAsk.text,
        actions: (docsAsk.actions ?? []).filter((item) => item.capture?.field === "skip-docs"),
      });
      return;
    }
    if (action.capture?.field === "keep-file-fact" || action.capture?.field === "use-document-fact") {
      applyCapture(action.capture);
      skipPromptSync.current = true;
      const live = getFoxDraft();
      const missing = missingExtractClasses(live);
      const key = missingAskKey(missing);
      const lines: FoxMessage[] = [
        {
          id: newId(),
          role: "client",
          text: action.label,
        },
        { id: newId(), role: "system", text: workspaceUpdateCopy(action.capture, live) },
      ];
      if (missing.length && live.missingAskKey !== key) {
        markMissingAsked(key);
        lines.push(
          foxAskMessage({
            text: missingAskCopy(missing),
            actions: missingAskActions(),
          }),
        );
      }
      commitMessagesNow((prev) => [...prev, ...lines]);
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
        workspaceSurface
          ? workspacePromptCopy(workspacePrompt(live), live)
          : promptCopy(currentPrompt(live), live);
      appendReply(
        action.label,
        next,
        action.capture.field === "correct" ? undefined : editPromptFromCapture(action.capture),
      );
      continueHomeToDesk();
    }
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
    setOpen(true);
    setInput("");
    const reply = replyToMessage(text, replyStage, draft, scenario);
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
      workspaceSurface ? editPromptFromCapture(reply.capture) : undefined,
    );
    continueHomeToDesk();
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
        placeholder={
          moneyAsk
            ? `Enter ${ (structureAmountLabel(draft) || "the number").toLowerCase() } or say not sure`
            : askingAmountPurpose
              ? "Purchase price, loan amount, or HELOC line"
              : "Ask ONYX Fox"
        }
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
      hideClose={isStart || isHome}
      stickyDisclosure={isStart}
      docsDrop={
        isStart && (startAsk === "documents" || draft.docsOpen || draft.phase === "documents")
          ? <DocumentDrop draft={draft} compact />
          : null
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
