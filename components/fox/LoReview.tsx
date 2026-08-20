"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { incomeLabel, occupancyLabel, scenarioLines, timelineLabel } from "./script";
import {
  getFoxDraft,
  getServerDraft,
  hydrateFoxDraft,
  setLoStatus,
  subscribeFoxDraft,
} from "./store";
import { FOX_DISCLOSURE, TRUST_LINE, type LoMark } from "./types";

const MARKS: LoMark[] = ["needs items", "in review", "contacting client"];

export function LoReview() {
  const searchParams = useSearchParams();
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrateFoxDraft();
    setReady(true);
  }, [searchParams]);

  if (!ready) {
    return (
      <div className="intake page-pad">
        <div className="page-inner intake__inner">
          <p className="type-legal">Loading review…</p>
        </div>
      </div>
    );
  }

  const hasDraft =
    Boolean(draft.scenario) ||
    Boolean(draft.contact.fullName.value) ||
    draft.documents.length > 0 ||
    draft.phase === "confirmed";

  return (
    <div className="intake page-pad">
      <div className="page-inner intake__inner">
        <p className="type-eyebrow">Internal preview — licensed review</p>
        <h1 className="type-h2">Review queue</h1>
        <p className="type-body">
          Same device draft as intake. No login on this preview. This is not a
          production pipeline.
        </p>
        {!hasDraft ? (
          <section className="intake-card">
            <p className="type-body">No draft on this device yet.</p>
            <Link href="/start" className="btn btn--text">
              Open the desk
            </Link>
          </section>
        ) : (
          <>
            <section className="intake-card">
              <h2 className="type-card-title">Status</h2>
              <p className="type-body">
                {draft.status ?? "Not yet confirmed by the client."}
              </p>
              {draft.loStatus ? (
                <p className="type-legal">Queue mark: {draft.loStatus}.</p>
              ) : null}
            </section>

            <section className="intake-card">
              <h2 className="type-card-title">Client</h2>
              <dl className="scenario-echo">
                <dt>Name</dt>
                <dd>{draft.contact.fullName.value || "—"}</dd>
                <dt>Email</dt>
                <dd>{draft.contact.email.value || "—"}</dd>
                <dt>Phone</dt>
                <dd>{draft.contact.phone.value || "—"}</dd>
                <dt>Preferred</dt>
                <dd>{draft.contact.preferredContact.value || "—"}</dd>
              </dl>
            </section>

            <section className="intake-card">
              <h2 className="type-card-title">Scenario</h2>
              {draft.scenario ? (
                <dl className="scenario-echo">
                  {draft.path ? (
                    <FragmentRow
                      label="Path"
                      value={draft.path === "acr" ? "ACR" : "Loan only"}
                    />
                  ) : null}
                  {scenarioLines(draft.scenario).map(([label, value]) => (
                    <FragmentRow key={label} label={label} value={value} />
                  ))}
                </dl>
              ) : (
                <p className="type-body">No scenario attached.</p>
              )}
            </section>

            <section className="intake-card">
              <h2 className="type-card-title">Confirmed draft summary</h2>
              <dl className="scenario-echo">
                <dt>Income type</dt>
                <dd>
                  {draft.incomeType.value ? incomeLabel(draft.incomeType.value) : "—"}
                </dd>
                <dt>Income amount</dt>
                <dd>
                  {draft.facts?.ytd_gross?.value ||
                    draft.facts?.gross_period?.value ||
                    draft.facts?.wages?.value ||
                    draft.facts?.agi?.value ||
                    "—"}
                </dd>
                <dt>Employer</dt>
                <dd>{draft.facts?.employer_name?.value || "—"}</dd>
                <dt>Occupancy</dt>
                <dd>
                  {draft.occupancyChoice.value
                    ? occupancyLabel(draft.occupancyChoice.value)
                    : "—"}
                </dd>
                <dt>Timeline</dt>
                <dd>
                  {draft.timelineChoice.value
                    ? timelineLabel(draft.timelineChoice.value)
                    : "—"}
                </dd>
              </dl>
              <ul className="intake-note-list">
                <li>Contact: {draft.sections.contact ? "confirmed" : "open"}</li>
                <li>Scenario: {draft.sections.scenario ? "confirmed" : "open"}</li>
                <li>Occupancy: {draft.sections.occupancy ? "confirmed" : "open"}</li>
                <li>Income: {draft.sections.income ? "confirmed" : "open"}</li>
                <li>Documents: {draft.sections.documents ? "confirmed" : "open"}</li>
              </ul>
              {draft.notes.length ? (
                <p className="type-legal">Client notes: {draft.notes.join(" · ")}</p>
              ) : null}
              {draft.facts && Object.keys(draft.facts).length ? (
                <dl className="scenario-echo">
                  {Object.values(draft.facts).map((field) => (
                    <FragmentRow
                      key={field.field}
                      label={field.field}
                      value={`${field.value}${field.confirmed ? "" : " (unconfirmed)"}`}
                    />
                  ))}
                </dl>
              ) : null}
            </section>

            <section className="intake-card">
              <h2 className="type-card-title">Documents received</h2>
              {draft.documents.length ? (
                <ul className="intake-note-list">
                  {draft.documents.map((doc) => (
                    <li key={`${doc.receivedAt}:${doc.name}`}>
                      {doc.slot}: {doc.name} — {doc.status}
                      {doc.extractClass ? ` · ${doc.extractClass}` : ""}
                      {doc.bytesRef ? " · stored" : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="type-body">
                  {draft.documentsSkipped ? "Skipped for now." : "None received."}
                </p>
              )}
            </section>

            <section className="intake-card">
              <h2 className="type-card-title">Mark</h2>
              <div className="intake-section__actions">
                {MARKS.map((mark) => (
                  <button
                    key={mark}
                    type="button"
                    className={
                      draft.loStatus === mark ? "btn btn--primary" : "btn btn--secondary"
                    }
                    onClick={() => setLoStatus(mark)}
                  >
                    {mark}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        <p className="type-legal">{FOX_DISCLOSURE}</p>
        <p className="type-legal">{TRUST_LINE}</p>
        <Link href="/start" className="btn btn--text">
          Back to the desk
        </Link>
      </div>
    </div>
  );
}

function FragmentRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
