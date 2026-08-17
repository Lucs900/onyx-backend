"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Fragment,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  formatDollars,
  readScenario,
  scenarioFromQuery,
  writeScenario,
} from "@/components/products/scenario";
import { requestFoxOpen } from "./AlwaysOnFox";
import { currentPrompt, promptCopy, scenarioLines } from "./script";
import {
  addDocument,
  advancePhase,
  confirmSection,
  contactComplete,
  documentForSlot,
  editSection,
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
  DOC_SLOTS,
  DRAFT_NOTE,
  ESTIMATE_NOTE,
  FOX_DISCLOSURE,
  ORIGINATOR_REQUEST,
  ORIGINATOR_REVIEW,
  TRUST_LINE,
  type DocSlot,
  type FoxIntakeDraft,
  type SectionId,
} from "./types";

function sourceLabel(source: "client" | "scenario" | "extracted-unconfirmed") {
  if (source === "scenario") return "From scenario";
  if (source === "extracted-unconfirmed") return "Suggested by Fox — unconfirmed";
  return "Entered by you";
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
  if (draft.documents.length) {
    have.push(
      `${draft.documents.length} document${draft.documents.length === 1 ? "" : "s"} received`,
    );
  } else if (draft.documentsSkipped) {
    have.push("Documents skipped for now");
  } else {
    need.push("Documents, or skip for now");
  }
  const unconfirmed = (Object.keys(draft.sections) as SectionId[]).filter(
    (key) => !draft.sections[key],
  );
  if (unconfirmed.length && contactComplete(draft)) {
    need.push("Confirm each draft section");
  }
  let next = "Answer Fox’s next question — name, email, then phone.";
  if (draft.phase === "confirmed") {
    next = ORIGINATOR_REVIEW;
  } else if (contactComplete(draft) && !draft.documents.length && !draft.documentsSkipped) {
    next = "Drop documents, or skip if you don’t have them yet.";
  } else if (contactComplete(draft)) {
    next = "Confirm or edit the draft sections. Nothing is final until you confirm.";
  }
  return { have, need, next };
}

export function IntakeExperience() {
  const searchParams = useSearchParams();
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState<SectionId | null>(null);

  useEffect(() => {
    hydrateFoxDraft();
    const fromQuery = scenarioFromQuery(searchParams);
    const scenario = fromQuery ?? readScenario();
    if (fromQuery) writeScenario(fromQuery);
    if (scenario) setDraftScenario(scenario);
    advancePhase();
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
  const ask = promptCopy(prompt);
  const showDocs = contactComplete(draft) || draft.phase !== "context";
  const showDraft = draft.phase === "draft" || draft.phase === "confirmed";

  return (
    <div className="intake page-pad">
      <div className="page-inner intake__inner">
        <div className="product-explorer__rule" aria-hidden="true" />
        <p className="type-eyebrow">California only</p>
        <h1 className="type-h2">Prepare a draft</h1>
        <p className="type-body">
          Fox already uses your scenario. You confirm the draft. A licensed
          originator reviews it. This is not an approval.
        </p>
        <p className="type-legal">
          Returning ACR members will sign in here later. This preview keeps the
          draft on this device.
        </p>

        {draft.phase === "confirmed" ? (
          <section className="intake-status" aria-labelledby="intake-status-title">
            <h2 id="intake-status-title" className="type-card-title">
              {draft.status}
            </h2>
            <p className="type-body">{ORIGINATOR_REVIEW}</p>
            <p className="type-legal">
              You can return to this page for status and the checklist.
            </p>
          </section>
        ) : null}

        {draft.scenario ? (
          <section className="intake-card" aria-labelledby="known-title">
            <h2 id="known-title" className="type-card-title">
              What Fox already knows
            </h2>
            <p className="type-legal">{sourceLabel("scenario")}</p>
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
              Fox can still take your name and documents. A scenario helps the
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

        {!contactComplete(draft) ? (
          <section className="intake-card" aria-labelledby="ask-title">
            <h2 id="ask-title" className="type-card-title">
              Fox is asking
            </h2>
            <p className="type-body">{ask.text}</p>
            <ContactFields prompt={prompt} draft={draft} />
            <button type="button" className="btn btn--text" onClick={() => requestFoxOpen()}>
              Or answer in Fox
            </button>
          </section>
        ) : null}

        {showDocs ? (
          <DocumentDrop draft={draft} />
        ) : null}

        {showDraft ? (
          <DraftSections
            draft={draft}
            editing={editing}
            setEditing={setEditing}
          />
        ) : null}

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

  const onSave = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (prompt === "name") setContactField("fullName", trimmed);
    if (prompt === "email") setContactField("email", trimmed);
    if (prompt === "phone") setContactField("phone", trimmed);
    if (prompt === "preferred") {
      setContactField("preferredContact", trimmed);
      markPreferredAsked();
    }
    advancePhase();
    setValue("");
  };

  if (prompt !== "name" && prompt !== "email" && prompt !== "phone" && prompt !== "preferred") {
    return null;
  }

  return (
    <div className="intake-inline">
      <label className="scenario-field">
        <span className="scenario-field__label">
          {prompt === "name"
            ? "Full name"
            : prompt === "email"
              ? "Email"
              : prompt === "phone"
                ? "Phone"
                : "Preferred contact"}
        </span>
        <input
          className="scenario-field__input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete={
            prompt === "email" ? "email" : prompt === "phone" ? "tel" : "name"
          }
          placeholder={
            draft.contact.fullName.value && prompt === "name"
              ? draft.contact.fullName.value
              : undefined
          }
        />
      </label>
      <button type="button" className="btn btn--primary" onClick={onSave}>
        Save
      </button>
      {prompt === "preferred" ? (
        <button
          type="button"
          className="btn btn--text"
          onClick={() => {
            markPreferredAsked();
            advancePhase();
          }}
        >
          Skip
        </button>
      ) : null}
    </div>
  );
}

function DocumentDrop({ draft }: { draft: FoxIntakeDraft }) {
  const onFile = (slot: DocSlot, file: File | undefined) => {
    if (!file) return;
    addDocument({
      slot,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      receivedAt: new Date().toISOString(),
    });
    advancePhase();
  };

  return (
    <section className="intake-card" id="fox-documents" aria-labelledby="docs-title">
      <h2 id="docs-title" className="type-card-title">
        Documents
      </h2>
      <p className="type-legal">
        Documents stay with this preview session. They are not uploaded, not
        stored in a vault, and have no public URL. Only the filename is kept.
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
                    ? `Received · ${received.name} · ${Math.max(1, Math.round(received.size / 1024))} KB`
                    : "Waiting"}
                </p>
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
      {!draft.documents.length ? (
        <button
          type="button"
          className="btn btn--text"
          onClick={() => {
            skipDocuments();
            advancePhase();
          }}
        >
          I don’t have these yet
        </button>
      ) : null}
    </section>
  );
}

function DraftSections({
  draft,
  editing,
  setEditing,
}: {
  draft: FoxIntakeDraft;
  editing: SectionId | null;
  setEditing: (id: SectionId | null) => void;
}) {
  return (
    <section className="intake-card" aria-labelledby="draft-title">
      <h2 id="draft-title" className="type-card-title">
        Application draft
      </h2>
      <p className="type-legal">
        Fox did not invent income, SSN, or account numbers. Empty fields stay
        empty until you enter them.
      </p>

      <DraftBlock
        id="contact"
        title="Contact"
        confirmed={draft.sections.contact}
        editing={editing === "contact"}
        onEdit={() => {
          editSection("contact");
          setEditing("contact");
        }}
        onConfirm={() => {
          if (!contactComplete(draft)) return;
          confirmSection("contact");
          setEditing(null);
        }}
      >
        {editing === "contact" ? (
          <div className="intake-edit-grid">
            <FieldEdit
              label="Full name"
              value={draft.contact.fullName.value}
              onChange={(value) => setContactField("fullName", value)}
            />
            <FieldEdit
              label="Email"
              value={draft.contact.email.value}
              onChange={(value) => setContactField("email", value)}
            />
            <FieldEdit
              label="Phone"
              value={draft.contact.phone.value}
              onChange={(value) => setContactField("phone", value)}
            />
            <FieldEdit
              label="Preferred contact"
              value={draft.contact.preferredContact.value}
              onChange={(value) => setContactField("preferredContact", value)}
            />
          </div>
        ) : (
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
            <dd className="is-quiet">{sourceLabel("client")}</dd>
          </dl>
        )}
      </DraftBlock>

      <DraftBlock
        id="scenario"
        title="Scenario / loan intent"
        confirmed={draft.sections.scenario}
        editing={false}
        onEdit={() => editSection("scenario")}
        onConfirm={() => draft.scenario && confirmSection("scenario")}
        confirmDisabled={!draft.scenario}
      >
        {draft.scenario ? (
          <dl className="scenario-echo">
            <dt>Purpose</dt>
            <dd>{scenarioLines(draft.scenario).find((row) => row[0] === "Purpose")?.[1]}</dd>
            <dt>Value</dt>
            <dd>${formatDollars(draft.scenario.propertyValue)}</dd>
            <dt>Source</dt>
            <dd className="is-quiet">{sourceLabel("scenario")}</dd>
          </dl>
        ) : (
          <p className="type-body">No scenario on this draft yet.</p>
        )}
        <Link href="/products/scenario" className="btn btn--text">
          Edit scenario
        </Link>
      </DraftBlock>

      <DraftBlock
        id="occupancy"
        title="Occupancy / property"
        confirmed={draft.sections.occupancy}
        editing={false}
        onEdit={() => editSection("occupancy")}
        onConfirm={() => draft.scenario && confirmSection("occupancy")}
        confirmDisabled={!draft.scenario}
      >
        {draft.scenario ? (
          <dl className="scenario-echo">
            <dt>ZIP</dt>
            <dd>{draft.scenario.zip}</dd>
            <dt>Occupancy</dt>
            <dd>
              {scenarioLines(draft.scenario).find((row) => row[0] === "Occupancy")?.[1]}
            </dd>
            <dt>Source</dt>
            <dd className="is-quiet">{sourceLabel("scenario")}</dd>
          </dl>
        ) : (
          <p className="type-body">Occupancy comes from the scenario.</p>
        )}
      </DraftBlock>

      <DraftBlock
        id="documents"
        title="Documents received"
        confirmed={draft.sections.documents}
        editing={false}
        onEdit={() => editSection("documents")}
        onConfirm={() => confirmSection("documents")}
      >
        {draft.documents.length ? (
          <ul className="intake-note-list">
            {draft.documents.map((doc) => (
              <li key={doc.slot}>
                {doc.slot}: {doc.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body">
            {draft.documentsSkipped
              ? "Client skipped documents for now."
              : "No documents received."}
          </p>
        )}
        <p className="type-legal">{sourceLabel("client")}</p>
      </DraftBlock>

      <DraftBlock
        id="notes"
        title="Anything you typed"
        confirmed={draft.sections.notes}
        editing={false}
        onEdit={() => editSection("notes")}
        onConfirm={() => confirmSection("notes")}
      >
        {draft.notes.length ? (
          <ul className="intake-note-list">
            {draft.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : (
          <p className="type-body">Nothing extra yet.</p>
        )}
        <p className="type-legal">{sourceLabel("client")}</p>
      </DraftBlock>
    </section>
  );
}

function DraftBlock({
  id,
  title,
  confirmed,
  editing,
  onEdit,
  onConfirm,
  confirmDisabled,
  children,
}: {
  id: SectionId;
  title: string;
  confirmed: boolean;
  editing: boolean;
  onEdit: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <article className="intake-section" aria-labelledby={`section-${id}`}>
      <div className="intake-section__head">
        <h3 id={`section-${id}`} className="type-card-title">
          {title}
        </h3>
        <p className="type-legal">{confirmed ? "Confirmed" : editing ? "Editing" : "Needs confirmation"}</p>
      </div>
      {children}
      <div className="intake-section__actions">
        <button type="button" className="btn btn--primary" onClick={onConfirm} disabled={confirmDisabled}>
          Confirm
        </button>
        <button type="button" className="btn btn--secondary" onClick={onEdit}>
          Edit
        </button>
      </div>
    </article>
  );
}

function FieldEdit({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="scenario-field">
      <span className="scenario-field__label">{label}</span>
      <input
        className="scenario-field__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
