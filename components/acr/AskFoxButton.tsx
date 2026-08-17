"use client";

import { requestFoxAsk } from "@/components/fox/AlwaysOnFox";

export function AskFoxButton({ ask }: { ask: string }) {
  return (
    <button
      type="button"
      className="btn btn--text"
      onClick={() => requestFoxAsk(ask)}
    >
      Ask Fox
    </button>
  );
}
