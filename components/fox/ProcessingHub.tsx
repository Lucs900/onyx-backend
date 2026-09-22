"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ensureCurrentFileId,
  getFoxDraft,
  getFoxMessages,
  getServerDraft,
  hydrateFoxDraft,
  sendStaffDeskLine,
  subscribeFoxDraft,
} from "./store";
import {
  processingHubView,
  SILENT_DESK_ERROR,
  STAFF_HUB_PATH,
  staffHubPath,
} from "./processingHub";
import { FOX_DISCLOSURE, TRUST_LINE } from "./types";

export function ProcessingHub() {
  const searchParams = useSearchParams();
  const draft = useSyncExternalStore(subscribeFoxDraft, getFoxDraft, getServerDraft);
  const [ready, setReady] = useState(false);
  const [foxLine, setFoxLine] = useState("");
  const [condition, setCondition] = useState("");
  const [silentNote, setSilentNote] = useState("");
  const [sentLine, setSentLine] = useState("");
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    hydrateFoxDraft();
    ensureCurrentFileId();
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="intake page-pad">
        <div className="page-inner intake__inner">
          <p className="type-legal">Loading hub…</p>
        </div>
      </div>
    );
  }

  const wanted = (searchParams.get("file") ?? "").trim();
  const hasDraft =
    Boolean(draft.fileId) ||
    Boolean(draft.productIntent) ||
    Boolean(draft.motion) ||
    Boolean(draft.sampleAccepted) ||
    draft.loanAmountValue != null ||
    draft.propertyValueAmount != null;
  const hub = processingHubView(draft);
  const thread = getFoxMessages();
  const fileMismatch = Boolean(wanted && draft.fileId && wanted !== draft.fileId);

  return (
    <div className="intake page-pad">
      <div className="page-inner intake__inner">
        <p className="type-eyebrow">Internal preview — processing hub</p>
        <h1 className="type-h2">File 1008</h1>
        <p className="type-body">
          Same File as /start. Same file_id. Not a second File. Borrower thread
          is a drawer, closed. Completeness is a signal.
        </p>
        {hub.fileId ? (
          <p className="type-legal">
            file_id {hub.fileId} ·{" "}
            <Link href={staffHubPath(hub.fileId)} className="btn btn--text">
              {staffHubPath(hub.fileId)}
            </Link>
          </p>
        ) : (
          <p className="type-legal">
            Open a File on <Link href="/start?path=acr">/start</Link> first. Hub
            path {STAFF_HUB_PATH}.
          </p>
        )}

        {!hasDraft ? (
          <section className="intake-card">
            <p className="type-body">No File on this device yet.</p>
            <Link href="/start?path=acr" className="btn btn--text">
              Open the desk
            </Link>
          </section>
        ) : fileMismatch ? (
          <section className="intake-card">
            <p className="type-body">
              This device File is {draft.fileId}. The URL asked for {wanted}.
            </p>
            <Link href={staffHubPath(draft.fileId)} className="btn btn--text">
              Open this File
            </Link>
          </section>
        ) : (
          <>
            <section className="intake-card staff-hub-loud">
              <h2 className="type-card-title">Loud</h2>
              {hub.loud.length ? (
                <dl className="scenario-echo">
                  {hub.loud.map((row) => (
                    <FragmentRow
                      key={row.id}
                      label={row.label}
                      value={row.note ? `${row.value} · ${row.note}` : row.value}
                    />
                  ))}
                </dl>
              ) : (
                <p className="type-body">No loud facts on this File yet.</p>
              )}
            </section>

            <section className="intake-card">
              <h2 className="type-card-title">Pay</h2>
              {hub.pay.length ? (
                <dl className="scenario-echo">
                  {hub.pay.map((row) => (
                    <FragmentRow
                      key={row.id}
                      label={row.label}
                      value={row.note ? `${row.value} · ${row.note}` : row.value}
                    />
                  ))}
                </dl>
              ) : (
                <p className="type-body">No pay facts on this File yet.</p>
              )}
            </section>

            <section className="intake-card">
              <h2 className="type-card-title">State</h2>
              <dl className="scenario-echo">
                <dt>Status</dt>
                <dd>{hub.state.status}</dd>
                <dt>Next</dt>
                <dd>{hub.state.next}</dd>
                <dt>Waiting on</dt>
                <dd>{hub.state.waitingOn}</dd>
                <dt>Completeness</dt>
                <dd>{hub.state.completeness}</dd>
              </dl>
              {hub.state.stillUseful.length ? (
                <ul className="intake-note-list">
                  {hub.state.stillUseful.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="type-legal">Still useful is empty.</p>
              )}
              {hub.state.docs.length ? (
                <ul className="intake-note-list">
                  {hub.state.docs.map((doc) => (
                    <li key={doc.name}>
                      {doc.name}
                      {doc.status ? ` · ${doc.status}` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="type-legal">
                  {draft.documentsSkipped ? "Papers skipped." : "No docs received."}
                </p>
              )}
              {hub.state.quietFlags.length ? (
                <ul className="intake-note-list">
                  {hub.state.quietFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              ) : null}
            </section>

            <details className="intake-card staff-hub-drawer">
              <summary className="type-card-title">Borrower thread</summary>
              {thread.length ? (
                <ul className="intake-note-list">
                  {thread.map((message) => (
                    <li key={message.id}>
                      {message.role}: {message.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="type-body">No borrower lines yet.</p>
              )}
              <Link href="/start?path=acr" className="btn btn--text">
                Open /start
              </Link>
            </details>

            <section className="intake-card">
              <h2 className="type-card-title">Desk</h2>
              <p className="type-body">
                condition is staff. foxLine is the next borrower line. Silent
                notes stay off the thread.
              </p>
              <label className="intake-field">
                <span className="type-legal">condition (staff)</span>
                <input
                  className="intake-input"
                  value={condition}
                  onChange={(event) => setCondition(event.target.value)}
                  placeholder="Staff short name"
                />
              </label>
              <label className="intake-field">
                <span className="type-legal">foxLine (borrower)</span>
                <textarea
                  className="intake-input"
                  rows={3}
                  value={foxLine}
                  onChange={(event) => setFoxLine(event.target.value)}
                  placeholder="One sentence the borrower can hear"
                />
              </label>
              <label className="intake-field">
                <span className="type-legal">Silent note</span>
                <textarea
                  className="intake-input"
                  rows={2}
                  value={silentNote}
                  onChange={(event) => setSilentNote(event.target.value)}
                  placeholder="Stays off the borrower thread"
                />
              </label>
              <div className="intake-section__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    const result = sendStaffDeskLine({
                      foxLine,
                      condition,
                      silentNote,
                    });
                    if (result.error || !result.threadLine) {
                      setSendError(result.error || SILENT_DESK_ERROR);
                      setSentLine("");
                      return;
                    }
                    setSendError("");
                    setSentLine(result.threadLine);
                    setFoxLine("");
                    setSilentNote("");
                  }}
                >
                  Send
                </button>
              </div>
              {sendError ? <p className="type-legal">{sendError}</p> : null}
              {sentLine ? (
                <p className="type-legal">Wrote foxLine to /start: {sentLine}</p>
              ) : null}
            </section>
          </>
        )}

        <p className="type-legal">{FOX_DISCLOSURE}</p>
        <p className="type-legal">{TRUST_LINE}</p>
        <Link href="/start?path=acr" className="btn btn--text">
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
