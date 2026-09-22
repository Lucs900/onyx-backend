/**
 * Preview magic-link / phone-code send. Resend or Twilio when env is set.
 * Never put the token, URL, or code in the borrower thread — Fox only says check email / enter the code.
 */
import { magicLinkFor } from "./core";

export type AccountSendResult = {
  sent: boolean;
  provider?: "resend" | "twilio";
  reason?: "no_provider" | "no_resend" | "no_twilio" | "resend_failed" | "twilio_failed" | "missing_dest";
};

export function accountOrigin(request?: Request) {
  const env =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (env) return env.replace(/\/$/, "");
  if (!request) return "";
  const origin = request.headers.get("origin")?.trim();
  if (origin) return origin.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host")?.trim() || request.headers.get("host")?.trim();
  if (!host) return "";
  const proto = request.headers.get("x-forwarded-proto")?.trim() || "https";
  return `${proto}://${host.replace(/\/$/, "")}`;
}

export function absoluteMagicLink(token: string, origin: string) {
  const path = magicLinkFor(token);
  if (!origin) return path;
  return `${origin}${path}`;
}

export function accountMailEnv() {
  return {
    resendKey: process.env.RESEND_API_KEY?.trim() || "",
    resendFrom: process.env.RESEND_FROM?.trim() || "ONYX <beth.t@example.com>",
    twilioSid: process.env.TWILIO_ACCOUNT_SID?.trim() || "",
    twilioToken: process.env.TWILIO_AUTH_TOKEN?.trim() || "",
    twilioFrom: process.env.TWILIO_FROM?.trim() || "",
  };
}

export async function sendAccountChannel(input: {
  channel: "email" | "phone";
  email?: string;
  phone?: string;
  token: string;
  code?: string;
  origin?: string;
}): Promise<AccountSendResult> {
  if (input.channel === "phone") {
    const phone = (input.phone || "").replace(/\D/g, "");
    if (!phone || !input.code) return { sent: false, reason: "missing_dest" };
    return sendTwilioCode(phone, input.code);
  }
  const email = input.email?.trim();
  if (!email) return { sent: false, reason: "missing_dest" };
  return sendResendEmail(email, absoluteMagicLink(input.token, input.origin || ""));
}

async function sendResendEmail(to: string, link: string): Promise<AccountSendResult> {
  const { resendKey, resendFrom } = accountMailEnv();
  if (!resendKey) return { sent: false, reason: "no_resend" };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to,
        subject: "Your ONYX File",
        text: `Open this link on any browser to return to the same File.\n\n${link}\n`,
      }),
    });
    if (!response.ok) return { sent: false, provider: "resend", reason: "resend_failed" };
    return { sent: true, provider: "resend" };
  } catch {
    return { sent: false, provider: "resend", reason: "resend_failed" };
  }
}

async function sendTwilioCode(phone: string, code: string): Promise<AccountSendResult> {
  const { twilioSid, twilioToken, twilioFrom } = accountMailEnv();
  if (!twilioSid || !twilioToken || !twilioFrom) return { sent: false, reason: "no_twilio" };
  const to = phone.startsWith("+") ? phone : `+1${phone}`;
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: twilioFrom,
          Body: `Your ONYX File code is ${code}. Enter it on the desk.`,
        }),
      },
    );
    if (!response.ok) return { sent: false, provider: "twilio", reason: "twilio_failed" };
    return { sent: true, provider: "twilio" };
  } catch {
    return { sent: false, provider: "twilio", reason: "twilio_failed" };
  }
}

export function previewNeedsMailEnv() {
  const env = accountMailEnv();
  return {
    email: Boolean(env.resendKey),
    phone: Boolean(env.twilioSid && env.twilioToken && env.twilioFrom),
    needed: ["RESEND_API_KEY", "RESEND_FROM", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM"],
  };
}
