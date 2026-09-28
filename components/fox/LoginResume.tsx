"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { looksLikeAccountCode, looksLikeAccountEmail, looksLikeAccountPhone } from "@/lib/account/core";
import { resumeAccountFromQuery } from "./store";

export function LoginResume() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="intake page-pad">
      <div className="page-inner intake__inner">
        <p className="type-eyebrow">Same desk</p>
        <h1 className="type-h2">Open your File</h1>
        <p className="type-body">
          Email link or phone code. Same file_id. Not Google. Not a second desk.
        </p>
        <label className="intake-field">
          <span className="type-legal">Magic link token, email code, or 6-digit phone code</span>
          <input
            className="intake-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="/start?account=… or 6 digits"
          />
        </label>
        <div className="intake-section__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              const raw = value.trim();
              const token = raw.includes("account=")
                ? new URL(raw, "https://onyx.local").searchParams.get("account") || raw
                : looksLikeAccountEmail(raw) || looksLikeAccountPhone(raw)
                  ? ""
                  : raw;
              const code = looksLikeAccountCode(raw) ? raw : "";
              void resumeAccountFromQuery({
                token: code ? undefined : token || undefined,
                code: code || undefined,
              }).then((snapshot) => {
                if (!snapshot) {
                  setError("That link or code did not open a File.");
                  return;
                }
                router.push("/start?path=acr");
              });
            }}
          >
            Open File
          </button>
        </div>
        {error ? <p className="type-legal">{error}</p> : null}
        <Link href="/start?path=acr" className="btn btn--text">
          Back to the desk
        </Link>
      </div>
    </div>
  );
}
