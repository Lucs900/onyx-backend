import { LoginResume } from "@/components/fox/LoginResume";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Log in — ONYX",
  description: "Email link or phone code. Same File. Not a second desk.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="intake page-pad">
          <div className="page-inner intake__inner">
            <p className="type-legal">Loading…</p>
          </div>
        </div>
      }
    >
      <LoginResume />
    </Suspense>
  );
}
