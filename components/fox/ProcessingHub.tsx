"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ensureCurrentFileId,
  getFoxDraft,
  getFoxMessages,
  getResumedAccountEmail,
  getServerDraft,
  hydrateFoxDraft,
  resumeAccountFromQuery,
  sendStaffDeskLine,
  subscribeFoxDraft,
} from "./store";
import {
  HUB_EMPTY,
  HUB_SQUARES,
  hubEmailRow,
  hubEmailWrapParts,
  hubNeedRow,
  hubStreetRow,
  hubStreetWrapParts,
  processingHubView,
  SILENT_DESK_ERROR,
  STAFF_HUB_PATH,
  staffDeskKeepsFinishChips,
  staffHubPath,
  type HubRow,
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
    const wanted = (searchParams.get("file") ?? "").trim();
    void (async () => {
      if (wanted) {
        const loaded = await resumeAccountFromQuery({ fileId: wanted });
        if (!loaded) ensureCurrentFileId();
      } else {
        ensureCurrentFileId();
      }
      setReady(true);
    })();
  }, [searchParams]);

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

        {fileMismatch ? (
          <section className="intake-card">
            <p className="type-body">
              This device File is {draft.fileId}. The URL asked for {wanted}.
            </p>
            <Link href={staffHubPath(draft.fileId)} className="btn btn--text">
              Open this File
            </Link>
          </section>
        ) : null}

        {!hasDraft ? (
          <p className="type-legal">
            No File on this device yet. Shells stay.{" "}
            <Link href="/start?path=acr" className="btn btn--text">
              Open the desk
            </Link>
          </p>
        ) : null}

        <>
            <section className="intake-card staff-hub-processing">
              <div className="staff-hub-squares">
                {HUB_SQUARES.map((square) => (
                  <div key={square.id} className="staff-hub-square">
                    <p className="staff-hub-square__label">{square.label}</p>
                    <div
                      className={`staff-hub-square__facts staff-hub-square__facts--${square.ids.length}`}
                    >
                      {square.ids.map((id) => {
                        const row =
                          id === "need"
                            ? hubNeedRow(draft)
                            : id === "email"
                              ? hubEmailRow(draft, getResumedAccountEmail())
                              : id === "street"
                                ? hubStreetRow(draft)
                                : hub.grid.find((item) => item.id === id);
                        return row ? <HubCell key={row.id} row={row} /> : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <details className="intake-card staff-hub-drawer" open>
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
              {staffDeskKeepsFinishChips(draft) ? (
                <p className="type-legal">Ask Fox · Upload more · Request human</p>
              ) : null}
            </section>
        </>

        <p className="type-legal">{FOX_DISCLOSURE}</p>
        <p className="type-legal">{TRUST_LINE}</p>
        <Link href="/start?path=acr" className="btn btn--text">
          Back to the desk
        </Link>
      </div>
    </div>
  );
}

function HubCell({ row }: { row: HubRow }) {
  const empty = row.value === HUB_EMPTY;
  const email = row.id === "email" && !empty;
  const street = row.id === "street" && !empty;
  const emailParts = email ? hubEmailWrapParts(row.value) : [];
  const streetParts = street ? hubStreetWrapParts(row.value) : [];
  return (
    <div
      className={
        email
          ? "staff-hub-cell staff-hub-cell--email"
          : street
            ? "staff-hub-cell staff-hub-cell--street"
            : "staff-hub-cell"
      }
    >
      <p className="staff-hub-cell__label">{row.label}</p>
      {email ? (
        <p className="staff-hub-cell__value staff-hub-cell__value--email">
          {emailParts.map((part, index) => (
            <span key={`${part}-${index}`} data-email-part={part}>
              {part}
              {index < emailParts.length - 1 ? <wbr /> : null}
            </span>
          ))}
        </p>
      ) : street ? (
        <p className="staff-hub-cell__value staff-hub-cell__value--street">
          {streetParts.map((part, index) => (
            <span key={`${part}-${index}`} data-street-part={part}>
              {part}
              {index < streetParts.length - 1 ? <wbr /> : null}
            </span>
          ))}
        </p>
      ) : (
        <p className={empty ? "staff-hub-cell__value is-empty" : "staff-hub-cell__value"}>
          {row.value}
        </p>
      )}
      {row.note ? <p className="staff-hub-cell__note">{row.note}</p> : null}
    </div>
  );
}
