import { HEADER_LOGIN_HREF } from "@/components/fox/account";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Log in — ONYX",
  description: "Welcome back. Email or phone for a code. Same File. Not a second desk.",
};

export default function LoginPage() {
  redirect(HEADER_LOGIN_HREF);
}
