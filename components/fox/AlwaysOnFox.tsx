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
  addNote,
  advancePhase,
  getFoxDraft,
  getServerDraft,
  hydrateFoxDraft,
  markPreferredAsked,
  setContactField,
  setDraftScenario,
  skipDocuments,
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

export function AlwaysOnFox() {
  const pathname = usePathname();
  const router = useRouter();
  const stage = foxStageFromPath(pathname);
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<FoxMessage[]>([]);
  const greeted = useRef<string>("");
  const listRef = useRef<HTMLDivElement>(null);
  const fieldId = useId();

  useEffect(() => {
    hydrateFoxDraft();
    const stored = sessionStorage.getItem(FOX_PANEL_KEY);
    const shouldOpen = stored === "1" || pathname.startsWith("/intake");
    setOpen(shouldOpen);
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
    if (greeted.current === pathname) return;
    greeted.current = pathname;
    const hello = greeting(stage, scenario, live);
    const lines: FoxMessage[] = [
      { id: newId(), role: "fox", text: hello.text, actions: hello.actions },
    ];
    if (stage === "intake" && live.phase !== "confirmed") {
      const ask = promptCopy(currentPrompt(live));
      if (ask.text !== hello.text) {
        lines.push({ id: newId(), role: "fox", text: ask.text, actions: ask.actions });
      }
    }
    setMessages(lines);
  }, [pathname, ready, stage]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  if (!stage || !ready) return null;

  const scenario = draft.scenario ?? readScenario();

  const runAction = (action: FoxAction) => {
    if (action.href) {
      router.push(action.href);
      return;
    }
    if (action.event === "prepare-draft") {
      router.push(intakeHref(scenario));
      return;
    }
    if (action.event === "skip-docs") {
      skipDocuments();
      advancePhase();
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "fox",
          text: "That's fine. Confirm each section on the page. Nothing is final until you do.",
        },
      ]);
      return;
    }
    if (action.event === "open-docs") {
      document.getElementById("fox-documents")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (action.event === "skip-preferred") {
      markPreferredAsked();
      advancePhase();
      const ask = promptCopy("documents");
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "fox", text: ask.text, actions: ask.actions },
      ]);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    const reply = replyToMessage(text, stage, draft, scenario);
    if (reply.capture?.field === "fullName" || reply.capture?.field === "email" || reply.capture?.field === "phone" || reply.capture?.field === "preferredContact") {
      setContactField(reply.capture.field, reply.capture.value);
      if (reply.capture.field === "preferredContact") markPreferredAsked();
      advancePhase();
    } else if (reply.capture?.field === "preferred-asked") {
      if (reply.capture.value) setContactField("preferredContact", reply.capture.value);
      markPreferredAsked();
      advancePhase();
    } else if (reply.capture?.field === "skip-docs") {
      skipDocuments();
      advancePhase();
    } else if (reply.capture?.field === "note") {
      addNote(reply.capture.value);
    }
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "client", text },
      { id: newId(), role: "fox", text: reply.text, actions: reply.actions },
    ]);
  };

  return (
    <>
      <button
        type="button"
        className="fox-ask"
        aria-expanded={open}
        aria-controls="fox-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <AdvisorMark size="sm" />
        <span>{open ? "Close Fox" : "Ask Fox"}</span>
      </button>

      <div
        id="fox-panel"
        className={open ? "fox-panel is-open" : "fox-panel"}
        role="dialog"
        aria-modal="false"
        aria-labelledby="fox-panel-title"
        hidden={!open}
      >
        <header className="fox-panel__head">
          <AdvisorMark size="sm" />
          <div>
            <h2 id="fox-panel-title" className="type-card-title">
              ONYX Fox
            </h2>
            <p className="type-legal">
              {stage === "explore"
                ? "Explore"
                : stage === "scenario"
                  ? "Scenario"
                  : stage === "results"
                    ? "Results"
                    : "Intake"}
              {scenario?.productName ? ` · ${scenario.productName}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--text fox-panel__close"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </header>

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
            placeholder="Ask Fox"
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
    </>
  );
}
