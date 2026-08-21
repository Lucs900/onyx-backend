"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  motionOf,
  nextActorOf,
  openReviewWorkItem,
  REVIEW_SLA_MS,
  reviewIsSitting,
  reviewSlaMsOf,
} from "./motion";
import { incomeLabel, occupancyLabel, timelineLabel } from "./script";
import {
  applyPreviewMotionControls,
  getFoxDraft,
  getServerDraft,
  hydrateFoxDraft,
  nudgeReview,
  returnToFox,
  setLoStatus,
  sitExpireReview,
  subscribeFoxDraft,
} from "./store";
import { FOX_DISCLOSURE, TRUST_LINE, type LoMark } from "./types";
import { fileScenarioRows } from "./workspace";

const MARKS: LoMark[] = ["needs items", "in review", "contacting client"];

export function LoReview() {
  const searchParams = useSearchParams();
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState("");
  const [needsDoc, setNeedsDoc] = useState(false);
  const [returnedLine, setReturnedLine] = useState("");

  useEffect(() => {
    hydrateFoxDraft();
    applyPreviewMotionControls({
      nudge: searchParams.get("nudge"),
      sla: searchParams.get("sla"),
    });
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
    draft.phase === "confirmed" ||
    Boolean(draft.motion) ||
    Boolean(draft.sampleAccepted) ||
    Boolean(draft.productIntent) ||
    draft.loanAmountValue != null ||
    draft.propertyValueAmount != null;
  const scenarioRows = fileScenarioRows(draft);
  const motion = motionOf(draft);
  const next = nextActorOf(draft);
  const review = openReviewWorkItem(draft);
  const slaMs = reviewSlaMsOf(draft);

  return (
    <div className="intake page-pad">
      <div className="page-inner intake__inner">
        <p className="type-eyebrow">Internal preview — licensed review</p>
        <h1 className="type-h2">Review queue</h1>
        <p className="type-body">
          Same device File as /start. One draft. No login on this preview. This is
          not a production pipeline.
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
              <h2 className="type-card-title">File motion</h2>
              <dl className="scenario-echo">
                <dt>Status</dt>
                <dd>{motion ?? "—"}</dd>
                <dt>Next</dt>
                <dd>{next}</dd>
                <dt>Originator</dt>
                <dd>
                  {draft.sampleAccepted || draft.phase === "confirmed"
                    ? "Licensed originator assigned"
                    : "—"}
                </dd>
              </dl>
              {review ? (
                <p className="type-legal">
                  WorkItem {review.kind} · {review.state} · opened {review.openedAt}
                  {review.nudgedAt ? ` · nudged ${review.nudgedAt}` : ""}
                </p>
              ) : (
                <p className="type-legal">No open review WorkItem on this File.</p>
              )}
              {draft.loStatus ? (
                <p className="type-legal">Queue mark: {draft.loStatus}.</p>
              ) : null}
            </section>

            <section className="intake-card">
              <h2 className="type-card-title">Return to Fox</h2>
              <p className="type-body">
                Writes an event on this File. The borrower thread gets one line.
                Structure restripes.
              </p>
              <label className="intake-field">
                <span className="type-legal">Result note</span>
                <textarea
                  className="intake-input"
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What should Fox put in the thread?"
                />
              </label>
              <label className="intake-check-line">
                <input
                  type="checkbox"
                  checked={needsDoc}
                  onChange={(event) => setNeedsDoc(event.target.checked)}
                />
                needs a doc
              </label>
              <div className="intake-section__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    const result = returnToFox({ note, needsDoc });
                    setReturnedLine(result.threadLine);
                  }}
                >
                  Return to Fox
                </button>
              </div>
              {returnedLine ? (
                <p className="type-legal">Wrote to the File: {returnedLine}</p>
              ) : null}
              <Link href="/start" className="btn btn--text">
                Open borrower thread
              </Link>
            </section>

            <section className="intake-card">
              <h2 className="type-card-title">Sit / nudge (preview)</h2>
              <p className="type-body">
                Default SLA is 4 hours. Preview can expire the clock or force a
                nudge so Manager can walk it.
              </p>
              <p className="type-legal">
                SLA now: {slaMs === REVIEW_SLA_MS ? "4 hours" : `${Math.round(slaMs / 1000)}s`}
                {reviewIsSitting(draft) ? " · sitting" : ""}
              </p>
              <div className="intake-section__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    sitExpireReview();
                    nudgeReview();
                  }}
                >
                  Sit expired
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => nudgeReview({ force: true })}
                >
                  Nudge now
                </button>
              </div>
              <p className="type-legal">
                Or open <Link href="/lo/review?nudge=now">/lo/review?nudge=now</Link>
                {" · "}
                <Link href="/start?nudge=now">/start?nudge=now</Link>
                {" · "}
                <Link href="/start?sla=30">/start?sla=30</Link>
              </p>
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
              {scenarioRows.length ? (
                <dl className="scenario-echo">
                  {scenarioRows.map(([label, value]) => (
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

            {(draft.events ?? []).length ? (
              <section className="intake-card">
                <h2 className="type-card-title">File events</h2>
                <ul className="intake-note-list">
                  {draft.events?.map((event) => (
                    <li key={event.id}>
                      {event.kind}: {event.text}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

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
