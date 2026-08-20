import Link from "next/link";
import { ACR_START_HREF, LOAN_START_HREF } from "@/components/products/startPath";

export function SamplePathCard() {
  return (
    <aside className="intake-card" aria-labelledby="sample-path-title">
      <p className="type-eyebrow">Sample · not live</p>
      <h2 id="sample-path-title" className="type-card-title">
        Start with Fox
      </h2>
      <p className="type-body">Prepare a file on the desk. Fox stays.</p>
      <div className="intake-links">
        <Link href={ACR_START_HREF} className="btn btn--primary">
          Start your relationship
        </Link>
        <Link href={LOAN_START_HREF} className="btn btn--text">
          Just need a mortgage
        </Link>
      </div>
    </aside>
  );
}
