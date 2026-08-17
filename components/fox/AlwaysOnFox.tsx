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
  taskContext,
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
import {
  FOX_DISCLOSURE,
  FOX_PANEL_KEY,
  ORIGINATOR_REQUEST,
  TRUST_LINE,
  type FoxAction,
  type FoxMessage,
} from "./types";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function requestFoxOpen() {
  window.dispatchEvent(new Event("onyx:fox-open"));
}

export function FoxDockBar({
  open,
  task,
  onToggle,
}: {
  open: boolean;
  task?: string;
  onToggle?: () => void;
}) {
  const inner = (
    <>
      <AdvisorMark size="sm" />
      <span className="fox-dock__label">{open ? "ONYX Fox" : "Ask ONYX Fox"}</span>
      {open && task ? (
        <span className="type-legal fox-dock__task">{task}</span>
      ) : null}
      <span className="fox-ask__catch" aria-hidden="true" />
    </>
  );

  if (!onToggle) {
    return <div className="fox-dock__bar">{inner}</div>;
  }

  return (
    <button
      type="button"
      className="fox-dock__bar"
      aria-expanded={open}
      aria-controls="fox-panel"
      onClick={onToggle}
    >
      {inner}
    </button>
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
    if (stored === "1") setOpen(true);
    else if (stored === "0") setOpen(false);
    setSearch(query);
    setReady(true);
  }, [pathname]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("onyx:fox-open", onOpen);
    return () => window.removeEventListener("onyx:fox-open", onOpen);
  }, []);

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
    const hello = greeting(stage, scenario, live);
    const lines: FoxMessage[] = [
      { id: newId(), role: "fox", text: hello.text, actions: hello.actions },
    ];
    if (stage === "intake" && live.phase !== "confirmed") {
      const ask = promptCopy(currentPrompt(live), live);
      if (ask.text !== hello.text) {
        lines.push({ id: newId(), role: "fox", text: ask.text, actions: ask.actions });
      }
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
  const task = `${taskContext(stage, draft)}${
    scenario?.productName ? ` · ${scenario.productName}` : ""
  }`;

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
        text: "Add a file in the document slots. Fox will mark received, then reading. Dollar amounts will not be invented.",
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
    setInput("");
    const reply = replyToMessage(text, stage, draft, scenario);
    if (reply.capture) applyCapture(reply.capture);
    if (reply.capture?.field === "open-docs") {
      document.getElementById("fox-documents")?.scrollIntoView({ behavior: "smooth" });
    }
    appendReply(text, reply);
  };

  return (
    <div className={open ? "fox-dock is-open" : "fox-dock"}>
      <FoxDockBar open={open} task={task} onToggle={() => setOpen((value) => !value)} />

      <div id="fox-panel" className="fox-dock__body" hidden={!open}>
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

        <form className="fox-panel__composer" onSubmit={onSubmit}>
          <label className="visually-hidden" htmlFor={fieldId}>
            Message Fox
          </label>
          <input
            id={fieldId}
            className="fox-panel__input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Or type to Fox"
            autoComplete="off"
          />
          <button type="submit" className="btn btn--primary fox-panel__send" disabled={!input.trim()}>
            Send
          </button>
        </form>

        <p className="type-legal fox-panel__disclosure">{FOX_DISCLOSURE}</p>
        <p className="type-legal fox-panel__disclosure">{TRUST_LINE}</p>
        <p className="type-legal fox-panel__human">
          <Link href="/advisor">{ORIGINATOR_REQUEST}</Link>
        </p>
      </div>
    </div>
  );
}
