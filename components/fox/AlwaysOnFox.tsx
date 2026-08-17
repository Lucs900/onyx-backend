"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { AdvisorMark } from "@/components/AdvisorMark";
import { readScenario } from "@/components/products/scenario";
import {
  currentPrompt,
  foxStageFromPath,
  greeting,
  intakeHref,
  promptCopy,
  replyToMessage,
} from "./script";
import {
  applyCapture,
  getFoxDraft,
  getServerDraft,
  hydrateFoxDraft,
  seedPreviewSample,
  setDraftScenario,
  subscribeFoxDraft,
} from "./store";
import { FOX_PANEL_KEY, type FoxAction, type FoxMessage } from "./types";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function requestFoxOpen() {
  window.dispatchEvent(new Event("onyx:fox-open"));
}

export function requestFoxAsk(text: string) {
  window.dispatchEvent(new CustomEvent("onyx:fox-ask", { detail: { text } }));
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

export function AlwaysOnFox() {
  const pathname = usePathname();
  const router = useRouter();
  const stage = foxStageFromPath(pathname);
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const [open, setOpen] = useState(() => stage === "intake");
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<FoxMessage[]>([]);
  const greeted = useRef<string>("");
  const pendingAsk = useRef<string | null>(null);
  const skipPromptSync = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fieldId = useId();
  const greetKey = `${pathname}${search}`;

  useEffect(() => {
    const query = window.location.search;
    const sample = new URLSearchParams(query).get("sample");
    if (pathname.startsWith("/intake") && sample === "loop") {
      seedPreviewSample("intake");
    } else {
      hydrateFoxDraft();
    }
    const stored = sessionStorage.getItem(FOX_PANEL_KEY);
    const live = getFoxDraft();
    const asking = stage === "intake" && live.phase !== "confirmed";
    if (stage === "home") {
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
      if (reply.capture) applyCapture(reply.capture);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "client", text },
        { id: newId(), role: "fox", text: reply.text, actions: reply.actions },
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

  useEffect(() => {
    if (!ready || !stage) return;
    const live = getFoxDraft();
    const scenario = live.scenario ?? readScenario();
    if (scenario && !live.scenario) setDraftScenario(scenario);
    if (greeted.current === greetKey) return;
    greeted.current = greetKey;
    const ask =
      stage === "intake" && live.phase !== "confirmed"
        ? promptCopy(currentPrompt(live), live)
        : greeting(stage, scenario, live);
    const lines: FoxMessage[] = [
      { id: newId(), role: "fox", text: ask.text, actions: ask.actions },
    ];
    const queued = pendingAsk.current;
    pendingAsk.current = null;
    if (queued) {
      const reply = replyToMessage(queued, stage, live, scenario);
      if (reply.capture) applyCapture(reply.capture);
      lines.push(
        { id: newId(), role: "client", text: queued },
        { id: newId(), role: "fox", text: reply.text, actions: reply.actions },
      );
    }
    skipPromptSync.current = true;
    setMessages(lines);
  }, [greetKey, pathname, ready, stage]);

  useEffect(() => {
    if (!ready || stage !== "intake") return;
    if (skipPromptSync.current) {
      skipPromptSync.current = false;
      return;
    }
    const live = getFoxDraft();
    const ask = promptCopy(currentPrompt(live), live);
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "fox" && last.text === ask.text) return prev;
      return [...prev, { id: newId(), role: "fox", text: ask.text, actions: ask.actions }];
    });
  }, [draft.updatedAt, ready, stage]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  if (!stage) return null;

  const scenario = draft.scenario ?? readScenario();

  const appendReply = (clientText: string, fox: { text: string; actions?: FoxAction[] }) => {
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "client", text: clientText },
      { id: newId(), role: "fox", text: fox.text, actions: fox.actions },
    ]);
  };

  const runAction = (action: FoxAction) => {
    if (action.href) {
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
        text: "Add a file in the slots below.",
      });
      return;
    }
    if (action.capture) {
      applyCapture(action.capture);
      const live = getFoxDraft();
      const next = promptCopy(currentPrompt(live), live);
      appendReply(action.label, next);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setOpen(true);
    setInput("");
    const reply = replyToMessage(text, stage, draft, scenario);
    if (reply.capture) applyCapture(reply.capture);
    if (reply.capture?.field === "open-docs") {
      document.getElementById("fox-documents")?.scrollIntoView({ behavior: "smooth" });
    }
    appendReply(text, reply);
  };

  return (
    <div className={open ? "fox-bar is-open" : "fox-bar"}>
      {open ? (
        <div id="fox-panel" className="fox-bar__workspace">
          <div className="fox-bar__head">
            <span className="fox-bar__title">ONYX Fox</span>
            <button
              type="button"
              className="fox-bar__close"
              aria-expanded={true}
              aria-controls="fox-panel"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="fox-panel__thread" ref={listRef} aria-live="polite">
            {messages.map((message) => (
              <article
                key={message.id}
                className={
                  message.role === "fox" ? "fox-bubble fox-bubble--fox" : "fox-bubble fox-bubble--client"
                }
              >
                <p>{message.text}</p>
                {message.actions?.length ? (
                  <div className="fox-bubble__actions">
                    {message.actions.map((action) =>
                      action.href ? (
                        <Link key={action.id} href={action.href} className="btn btn--secondary fox-chip">
                          {action.label}
                        </Link>
                      ) : (
                        <button
                          key={action.id}
                          type="button"
                          className="btn btn--secondary fox-chip"
                          onClick={() => runAction(action)}
                        >
                          {action.label}
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <form className="fox-bar__desk" onSubmit={onSubmit}>
        <span className="fox-bar__mark">
          <AdvisorMark size={20} />
        </span>
        <label className="visually-hidden" htmlFor={fieldId}>
          Ask ONYX Fox
        </label>
        <input
          id={fieldId}
          className="fox-bar__input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Ask ONYX Fox"
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
    </div>
  );
}
