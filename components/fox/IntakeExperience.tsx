"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  formatDollars,
  readScenario,
  scenarioFromQuery,
  writeScenario,
} from "@/components/products/scenario";
import { requestFoxOpen } from "./AlwaysOnFox";
import {
  currentPrompt,
  incomeLabel,
  occupancyLabel,
  promptCopy,
  scenarioLines,
  sourceLabel,
  timelineLabel,
} from "./script";
import { SamplePathCard } from "./SamplePathCard";
import {
  applyCapture,
  canConfirmDraft,
  contactComplete,
  documentForSlot,
  getFoxDraft,
  getServerDraft,
  hydrateFoxDraft,
  questionsComplete,
  receiveDocument,
  seedPreviewSample,
  setContactField,
  setDocumentStatus,
  setDraftScenario,
  subscribeFoxDraft,
} from "./store";
import {
  DOC_SLOTS,
  DRAFT_NOTE,
  ESTIMATE_NOTE,
  FOX_DISCLOSURE,
  ORIGINATOR_REQUEST,
  ORIGINATOR_REVIEW,
  TRUST_LINE,
  type DocSlot,
  type FoxAction,
  type FoxIntakeDraft,
} from "./types";

function useDocumentReads(draft: FoxIntakeDraft) {
  const seen = useRef(new Set<string>());

  useEffect(() => {
    draft.documents.forEach((doc) => {
      const key = `${doc.slot}:${doc.receivedAt}`;
      if (doc.status !== "received" || seen.current.has(key)) return;
      seen.current.add(key);
      window.setTimeout(() => {
        const live = getFoxDraft().documents.find((item) => item.slot === doc.slot);
        if (!live || live.receivedAt !== doc.receivedAt) return;
        setDocumentStatus(doc.slot, "reading");
        window.setTimeout(() => {
          const again = getFoxDraft().documents.find((item) => item.slot === doc.slot);
          if (!again || again.receivedAt !== doc.receivedAt) return;
          if (again.size < 32) {
            setDocumentStatus(
              doc.slot,
              "needs better copy",
              "Fox could not read this file. Type a note or skip. No dollar amounts were invented.",
            );
            return;
          }
          setDocumentStatus(
            doc.slot,
            "extracted",
            "File recorded. Dollar amounts were not extracted in this preview.",
          );
        }, 1100);
      }, 400);
    });
  }, [draft.documents]);
}

function checklist(draft: FoxIntakeDraft) {
  const have: string[] = [];
  const need: string[] = [];
  if (draft.scenario) have.push("California scenario");
  else need.push("A California scenario");
  if (draft.contact.fullName.value) have.push("Name");
  else need.push("Full name");
  if (draft.contact.email.value) have.push("Email");
  else need.push("Email");
  if (draft.contact.phone.value) have.push("Phone");
  else need.push("Phone");
  if (draft.incomeType.value) have.push(`Income type: ${incomeLabel(draft.incomeType.value)}`);
  else need.push("Income type");
  if (draft.occupancyAsked && draft.occupancyChoice.value) {
    have.push(`Occupancy: ${occupancyLabel(draft.occupancyChoice.value)}`);
  } else {
    need.push("Occupancy");
  }
  if (draft.timelineAsked && draft.timelineChoice.value) {
    have.push(`Timeline: ${timelineLabel(draft.timelineChoice.value)}`);
  } else {
    need.push("Timeline");
  }
  if (draft.documents.length) {
    have.push(
      draft.documents
        .map((doc) => `${doc.name} (${doc.status})`)
        .join(", "),
    );
  } else if (draft.documentsSkipped) {
    have.push("Documents skipped for now");
  } else {
    need.push("Documents, or skip for now");
  }
  if (draft.phase !== "confirmed" && questionsComplete(draft) && (draft.documents.length || draft.documentsSkipped)) {
    need.push("Confirm the draft");
  }
  let next = "Answer Fox — tap a bubble or type.";
  if (draft.phase === "confirmed") next = ORIGINATOR_REVIEW;
  else if (!contactComplete(draft)) next = "Name, email, then phone.";
  else if (!draft.incomeType.value) next = "Tap an income type.";
  else if (!draft.occupancyAsked) next = "Confirm occupancy.";
  else if (!draft.timelineAsked) next = "Confirm timeline.";
  else if (!draft.documents.length && !draft.documentsSkipped) next = "Upload now, or skip for now.";
  else next = "Looks right, or needs a correction.";
  return { have, need, next };
}

export function IntakeExperience() {
  const searchParams = useSearchParams();
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const [ready, setReady] = useState(false);

  useDocumentReads(draft);

  useEffect(() => {
    if (searchParams.get("sample") === "loop") {
      seedPreviewSample("intake");
      setReady(true);
      return;
    }
    hydrateFoxDraft();
    const fromQuery = scenarioFromQuery(searchParams);
    const scenario = fromQuery ?? readScenario();
    if (fromQuery) writeScenario(fromQuery);
    if (scenario) setDraftScenario(scenario);
    setReady(true);
  }, [searchParams]);

  if (!ready) {
    return (
      <div className="intake page-pad">
        <div className="page-inner intake__inner">
          <p className="type-eyebrow">California only</p>
          <p className="type-body">Loading your draft…</p>
        </div>
      </div>
    );
  }

  const items = checklist(draft);
  const prompt = currentPrompt(draft);
  const ask = promptCopy(prompt, draft);
  const isSample = searchParams.get("sample") === "loop" || draft.previewSample;

  return (
    <div className="intake page-pad">
      <div className="page-inner intake__inner">
        <div className="product-explorer__rule" aria-hidden="true" />
        <p className="type-eyebrow">California only</p>
        <h1 className="type-h2">Prepare a draft</h1>
        <p className="type-body">
          Answer Fox, drop documents if you have them, then confirm. A licensed
          originator reviews the draft. This is not an approval.
        </p>
        <p className="type-legal">
          Returning ACR members will sign in here later. This preview keeps the
          draft on this device.
        </p>
        {isSample ? (
          <p className="type-legal">
            Sample · not live. Alex Rivera is a preview identity, not a real
            client. Scenario numbers are sample inputs, not a quote.
          </p>
        ) : (
          <SamplePathCard />
        )}

        {draft.phase === "confirmed" ? (
          <section className="intake-status" aria-labelledby="intake-status-title">
            <h2 id="intake-status-title" className="type-card-title">
              {draft.status}
            </h2>
            <p className="type-body">{ORIGINATOR_REVIEW}</p>
            <p className="type-legal">
              You can return to this page for status and the checklist.
            </p>
            <Link
              href={draft.previewSample ? "/lo/review?sample=loop" : "/lo/review"}
              className="btn btn--text"
            >
              Open review queue
            </Link>
          </section>
        ) : null}

        {draft.scenario ? (
          <section className="intake-card" aria-labelledby="known-title">
            <h2 id="known-title" className="type-card-title">
              What Fox already knows
            </h2>
            <p className="type-legal">
              {draft.previewSample ? "Sample · not live · " : ""}
              {sourceLabel("scenario")}
            </p>
            <dl className="scenario-echo">
              {scenarioLines(draft.scenario).map(([label, value]) => (
                <Fragment key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </Fragment>
              ))}
            </dl>
          </section>
        ) : (
          <section className="intake-card">
            <h2 className="type-card-title">No scenario yet</h2>
            <p className="type-body">
              Fox can still take answers and documents. A scenario helps the
              draft.
            </p>
            <Link href="/products/scenario" className="btn btn--secondary">
              Enter a scenario
            </Link>
          </section>
        )}

        <section className="intake-card" aria-labelledby="checklist-title">
          <h2 id="checklist-title" className="type-card-title">
            Checklist
          </h2>
          <div className="intake-check">
            <div>
              <h3 className="type-legal">What we have</h3>
              <ul>
                {items.have.length ? items.have.map((item) => <li key={item}>{item}</li>) : <li>Nothing stored yet</li>}
              </ul>
            </div>
            <div>
              <h3 className="type-legal">What’s still needed</h3>
              <ul>
                {items.need.length ? items.need.map((item) => <li key={item}>{item}</li>) : <li>Ready to confirm</li>}
              </ul>
            </div>
            <div>
              <h3 className="type-legal">What happens next</h3>
              <p className="type-body">{items.next}</p>
            </div>
          </div>
        </section>

        {draft.phase !== "confirmed" ? (
          <section className="intake-card" aria-labelledby="ask-title">
            <h2 id="ask-title" className="type-card-title">
              Fox is asking
            </h2>
            <p className="type-body">{ask.text}</p>
            <BubbleRow actions={ask.actions} />
            <ContactFields prompt={prompt} draft={draft} />
            <button type="button" className="btn btn--text" onClick={() => requestFoxOpen()}>
              Or answer in Fox
            </button>
          </section>
        ) : null}

        <DocumentDrop draft={draft} />
        <DraftSummary draft={draft} />

        <p className="type-legal">{FOX_DISCLOSURE}</p>
        <p className="type-legal">{DRAFT_NOTE}</p>
        <p className="type-legal">{ESTIMATE_NOTE}</p>
        <p className="type-legal">California only.</p>
        <p className="type-legal">{TRUST_LINE}</p>
        <p className="type-legal">
          <Link href="/advisor">{ORIGINATOR_REQUEST}</Link>
        </p>
      </div>
    </div>
  );
}

function BubbleRow({ actions }: { actions?: FoxAction[] }) {
  if (!actions?.length) return null;
  return (
    <div className="fox-bubble__actions">
      {actions.map((action) =>
        action.href ? (
          <Link key={action.id} href={action.href} className="btn btn--secondary fox-chip">
            {action.label}
          </Link>
        ) : (
          <button
            key={action.id}
            type="button"
            className="btn btn--secondary fox-chip"
            onClick={() => {
              if (action.capture) applyCapture(action.capture);
              if (action.capture?.field === "open-docs") {
                document.getElementById("fox-documents")?.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            {action.label}
          </button>
        ),
      )}
    </div>
  );
}

function ContactFields({
  prompt,
  draft,
}: {
  prompt: ReturnType<typeof currentPrompt>;
  draft: FoxIntakeDraft;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue("");
  }, [prompt]);

  if (prompt !== "name" && prompt !== "email" && prompt !== "phone") {
    return null;
  }

  return (
    <div className="intake-inline">
      <label className="scenario-field">
        <span className="scenario-field__label">
          {prompt === "name" ? "Full name" : prompt === "email" ? "Email" : "Phone"}
        </span>
        <input
          className="scenario-field__input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete={prompt === "email" ? "email" : prompt === "phone" ? "tel" : "name"}
          placeholder={
            draft.contact.fullName.value && prompt === "name"
              ? draft.contact.fullName.value
              : undefined
          }
        />
      </label>
      <button
        type="button"
        className="btn btn--primary"
        onClick={() => {
          const trimmed = value.trim();
          if (!trimmed) return;
          if (prompt === "name") setContactField("fullName", trimmed);
          if (prompt === "email") setContactField("email", trimmed);
          if (prompt === "phone") setContactField("phone", trimmed);
          setValue("");
        }}
      >
        Continue
      </button>
    </div>
  );
}

function DocumentDrop({ draft }: { draft: FoxIntakeDraft }) {
  const onFile = (slot: DocSlot, file: File | undefined) => {
    if (!file) return;
    receiveDocument({
      slot,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      receivedAt: new Date().toISOString(),
    });
  };

  return (
    <section className="intake-card" id="fox-documents" aria-labelledby="docs-title">
      <h2 id="docs-title" className="type-card-title">
        Documents
      </h2>
      <p className="type-legal">
        Documents stay with this preview session. They are not uploaded, not
        stored in a vault, and have no public URL. Only the filename and status
        are kept.
      </p>
      <ul className="intake-docs">
        {DOC_SLOTS.map((slot) => {
          const received = documentForSlot(draft, slot.id);
          return (
            <li key={slot.id} className="intake-doc">
              <div>
                <p className="type-card-title">{slot.label}</p>
                <p className="type-legal">
                  {received
                    ? `${received.status} · ${received.name} · ${Math.max(1, Math.round(received.size / 1024))} KB`
                    : "Waiting"}
                </p>
                {received?.note ? <p className="type-legal">{received.note}</p> : null}
              </div>
              <label className="btn btn--secondary fox-chip">
                {received ? "Replace" : "Add"}
                <input
                  className="visually-hidden"
                  type="file"
                  onChange={(event) => {
                    onFile(slot.id, event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DraftSummary({ draft }: { draft: FoxIntakeDraft }) {
  const occupancy =
    occupancyLabel(draft.occupancyChoice.value) ||
    (draft.scenario
      ? scenarioLines(draft.scenario).find((row) => row[0] === "Occupancy")?.[1]
      : "");

  return (
    <section className="intake-card" aria-labelledby="draft-title">
      <h2 id="draft-title" className="type-card-title">
        Application draft
      </h2>
      <p className="type-legal">
        Extracted by Fox stays unconfirmed until you tap Looks right. Fox did
        not invent income, SSN, or account numbers.
      </p>

      <article className="intake-section">
        <h3 className="type-card-title">Contact</h3>
        <dl className="scenario-echo">
          <dt>Name</dt>
          <dd>{draft.contact.fullName.value || "—"}</dd>
          <dt>Email</dt>
          <dd>{draft.contact.email.value || "—"}</dd>
          <dt>Phone</dt>
          <dd>{draft.contact.phone.value || "—"}</dd>
          <dt>Preferred</dt>
          <dd>{draft.contact.preferredContact.value || "—"}</dd>
          <dt>Source</dt>
          <dd className="is-quiet">
            {sourceLabel("client", draft.contact.fullName.confirmed)}
          </dd>
        </dl>
      </article>

      <article className="intake-section">
        <h3 className="type-card-title">Scenario / product</h3>
        {draft.scenario ? (
          <dl className="scenario-echo">
            <dt>Purpose</dt>
            <dd>{scenarioLines(draft.scenario).find((row) => row[0] === "Purpose")?.[1]}</dd>
            <dt>Value</dt>
            <dd>${formatDollars(draft.scenario.propertyValue)}</dd>
            <dt>Product</dt>
            <dd>{draft.scenario.productName || "—"}</dd>
            <dt>Source</dt>
            <dd className="is-quiet">{sourceLabel("scenario")}</dd>
          </dl>
        ) : (
          <p className="type-body">No scenario on this draft yet.</p>
        )}
      </article>

      <article className="intake-section">
        <h3 className="type-card-title">Income type</h3>
        <dl className="scenario-echo">
          <dt>Type</dt>
          <dd>{draft.incomeType.value ? incomeLabel(draft.incomeType.value) : "—"}</dd>
          <dt>Amount</dt>
          <dd>—</dd>
          <dt>Source</dt>
          <dd className="is-quiet">
            {draft.incomeType.value
              ? sourceLabel("client", draft.incomeType.confirmed)
              : "Empty — not extracted"}
          </dd>
        </dl>
        <p className="type-legal">
          Income dollars stay blank unless you type them. Fox will not invent a
          number.
        </p>
      </article>

      <article className="intake-section">
        <h3 className="type-card-title">Occupancy / timeline</h3>
        <dl className="scenario-echo">
          <dt>Occupancy</dt>
          <dd>{occupancy || "—"}</dd>
          <dt>Timeline</dt>
          <dd>
            {draft.timelineChoice.value
              ? timelineLabel(draft.timelineChoice.value)
              : "—"}
          </dd>
          <dt>Source</dt>
          <dd className="is-quiet">
            {sourceLabel(
              draft.occupancyChoice.source,
              draft.occupancyChoice.confirmed,
            )}
          </dd>
        </dl>
      </article>

      <article className="intake-section">
        <h3 className="type-card-title">Documents</h3>
        {draft.documents.length ? (
          <ul className="intake-note-list">
            {draft.documents.map((doc) => (
              <li key={doc.slot}>
                {doc.slot}: {doc.name} — {doc.status}
                {doc.note ? ` · ${doc.note}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body">
            {draft.documentsSkipped ? "Skipped for now." : "None received."}
          </p>
        )}
      </article>

      {draft.notes.length ? (
        <article className="intake-section">
          <h3 className="type-card-title">Anything you typed</h3>
          <ul className="intake-note-list">
            {draft.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </article>
      ) : null}

      {draft.phase === "confirmed" ? (
        <p className="type-legal">Confirmed by client.</p>
      ) : canConfirmDraft(draft) ? (
        <div className="fox-bubble__actions">
          <button
            type="button"
            className="btn btn--primary fox-chip"
            onClick={() => applyCapture({ field: "confirm-draft" })}
          >
            Looks right
          </button>
          <button
            type="button"
            className="btn btn--secondary fox-chip"
            onClick={() => applyCapture({ field: "needs-correction" })}
          >
            Needs a correction
          </button>
        </div>
      ) : (
        <p className="type-legal">
          Confirm appears after income, occupancy, timeline, and documents
          (or skip).
        </p>
      )}
    </section>
  );
}
