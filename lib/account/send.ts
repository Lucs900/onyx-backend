/**
 * Preview magic-link / phone-code send. Resend or Twilio when env is set.
 * Never put the token, URL, or code in the borrower thread — Fox only says check email / enter the code.
 */
import { magicLinkFor } from "./core";

export type AccountSendResult = {
  sent: boolean;
  provider?: "resend" | "twilio";
  reason?:
    | "no_provider"
    | "no_resend"
    | "no_twilio"
    | "bad_from"
    | "resend_failed"
    | "twilio_failed"
    | "missing_dest";
};

function cleanOrigin(value: string) {
  return value.trim().replace(/\/$/, "");
}

function originFromHost(host: string, proto = "https") {
  const first = host.split(",")[0]?.trim();
  if (!first) return "";
  if (/^https?:\/\//i.test(first)) return cleanOrigin(first);
  return `${proto}://${first.replace(/\/$/, "")}`;
}

/**
 * Magic-link host is the host that handled create — request Origin / Host.
 * Never prefer NEXT_PUBLIC_APP_URL, VERCEL_PROJECT_PRODUCTION_URL, or a
 * hardcoded production alias (onyx-backend-ten) over that request.
 */
export function accountOrigin(request?: Request) {
  if (request) {
    const headerOrigin = request.headers.get("origin")?.trim();
    if (headerOrigin && /^https?:\/\//i.test(headerOrigin) && headerOrigin.toLowerCase() !== "null") {
      return cleanOrigin(headerOrigin);
    }
    const forwarded = request.headers.get("x-forwarded-host")?.trim();
    const host = forwarded || request.headers.get("host")?.trim();
    const proto = request.headers.get("x-forwarded-proto")?.trim() || "https";
    if (host) {
      const fromHost = originFromHost(host, proto);
      if (fromHost) return fromHost;
    }
    try {
      const urlOrigin = new URL(request.url).origin;
      if (urlOrigin && urlOrigin !== "null") return cleanOrigin(urlOrigin);
    } catch {
      // Request.url can be relative in leftover stubs.
    }
  }
  return "";
}

export function absoluteMagicLink(token: string, origin: string) {
  const path = magicLinkFor(token);
  if (!origin) return path;
  return `${origin}${path}`;
}

export const PROTECTION_BYPASS_QUERY = "x-vercel-protection-bypass";

export function protectionBypassSecret() {
  return (
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ||
    process.env.VERCEL_PROTECTION_BYPASS_SECRET?.trim() ||
    ""
  );
}

/** Letter URL only. Never speak this in the borrower thread. */
export function letterMagicLink(token: string, origin: string) {
  const base = absoluteMagicLink(token, origin);
  const secret = protectionBypassSecret();
  if (!secret || !/^https?:\/\//i.test(base)) return base;
  const url = new URL(base);
  url.searchParams.set(PROTECTION_BYPASS_QUERY, secret);
  return url.toString();
}

export function letterHasProtectionBypass(link: string) {
  try {
    return Boolean(new URL(link).searchParams.get(PROTECTION_BYPASS_QUERY));
  } catch {
    return /[?&]x-vercel-protection-bypass=/i.test(link);
  }
}

export const ONYX_MAIL_FROM = "ONYX <james.b@example.com>";

export function onyxMailFrom(value: string) {
  return /@(?:onyxlending|onyxdirect)\.com\b/i.test(value);
}

export function accountMailEnv() {
  const resendFrom = process.env.RESEND_FROM?.trim() || ONYX_MAIL_FROM;
  return {
    resendKey: process.env.RESEND_API_KEY?.trim() || "",
    resendFrom,
    fromOk: onyxMailFrom(resendFrom),
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
  return sendResendEmail(email, letterMagicLink(input.token, input.origin || ""));
}

async function sendResendEmail(to: string, link: string): Promise<AccountSendResult> {
  const { resendKey, resendFrom, fromOk } = accountMailEnv();
  if (!resendKey) return { sent: false, reason: "no_resend" };
  if (!fromOk) return { sent: false, reason: "bad_from" };
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
