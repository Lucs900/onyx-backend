"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useState, useSyncExternalStore } from "react";
import {
  formatDollars,
  readScenario,
  scenarioFromQuery,
  writeScenario,
} from "@/components/products/scenario";
import { readStartPath } from "@/components/products/startPath";
import {
  incomeLabel,
  occupancyLabel,
  pathFromQuery,
  pathLabel,
  scenarioLines,
} from "./script";
import { SamplePathCard } from "./SamplePathCard";
import { DocumentDrop, useDocumentReads } from "./DocumentDrop";
import {
  applyCapture,
  canConfirmDraft,
  getFoxDraft,
  getServerDraft,
  hydrateFoxDraft,
  seedPreviewSample,
  setDraftPath,
  setDraftScenario,
  subscribeFoxDraft,
} from "./store";
import {
  DRAFT_NOTE,
  ESTIMATE_NOTE,
  FOX_DISCLOSURE,
  ORIGINATOR_REQUEST,
  ORIGINATOR_REVIEW,
  TRUST_LINE,
  type FoxIntakeDraft,
} from "./types";

function documentLine(draft: FoxIntakeDraft) {
  if (draft.documents.length) {
    return draft.documents.map((doc) => doc.name).join(", ");
  }
  if (draft.documentsSkipped) return "Skipped for now";
  return "";
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
    const path = pathFromQuery(searchParams.get("path")) ?? readStartPath();
    if (path) setDraftPath(path);
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
          </section>
        ) : null}

        {!draft.scenario ? (
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

function DraftSummary({ draft }: { draft: FoxIntakeDraft }) {
  const occupancy =
    occupancyLabel(draft.occupancyChoice.value) ||
    (draft.scenario
      ? scenarioLines(draft.scenario).find((row) => row[0] === "Occupancy")?.[1]
      : "");
  const purpose = draft.scenario
    ? [scenarioLines(draft.scenario).find((row) => row[0] === "Purpose")?.[1], draft.scenario.productName]
        .filter(Boolean)
        .join(" · ")
    : "";
  const docs = documentLine(draft);
  const rows: [string, string][] = [
    ["Name", draft.contact.fullName.value],
    ["Email", draft.contact.email.value],
    ["Phone", draft.contact.phone.value],
    ["Path", pathLabel(draft.path)],
    ["Purpose", purpose],
    [
      "Property value",
      draft.scenario ? `$${formatDollars(draft.scenario.propertyValue)}` : "",
    ],
    [
      "Loan amount",
      draft.scenario?.loanAmount != null
        ? `$${formatDollars(draft.scenario.loanAmount)}`
        : "",
    ],
    ["Occupancy", occupancy],
    ["Income type", draft.incomeType.value ? incomeLabel(draft.incomeType.value) : ""],
    ["Documents", docs],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <section className="intake-card" aria-labelledby="draft-title">
      <h2 id="draft-title" className="type-card-title">
        Does this look right?
      </h2>
      <p className="type-body">
        Fox prepared this from what you already shared. Confirm only if it
        matches your situation.
      </p>
      {draft.previewSample ? (
        <p className="type-legal">Sample, not live</p>
      ) : null}
      {rows.length ? (
        <dl className="scenario-echo">
          {rows.map(([label, value]) => (
            <Fragment key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </Fragment>
          ))}
        </dl>
      ) : (
        <p className="type-legal">Fox will fill this in as you answer.</p>
      )}

      {draft.phase === "confirmed" ? null : canConfirmDraft(draft) ? (
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
          Answer Fox, then drop or skip documents, to confirm.
        </p>
      )}
    </section>
  );
}
