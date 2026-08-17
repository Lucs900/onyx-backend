import Link from "next/link";

export function SamplePathCard() {
  return (
    <aside className="intake-card" aria-labelledby="sample-path-title">
      <p className="type-eyebrow">Sample · not live</p>
      <h2 id="sample-path-title" className="type-card-title">
        Walk the sample path
      </h2>
      <ol className="intake-note-list">
        <li>Open sample intake</li>
        <li>Tap bubbles</li>
        <li>Drop or skip docs</li>
        <li>Confirm</li>
        <li>Open review queue</li>
      </ol>
      <div className="intake-links">
        <Link href="/intake?sample=loop" className="btn btn--primary">
          Open sample intake
        </Link>
        <Link href="/lo/review?sample=loop" className="btn btn--text">
          Open sample review queue
        </Link>
      </div>
    </aside>
  );
}
