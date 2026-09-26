/**
 * Preview magic-link / phone-code send. Resend or Twilio when env is set.
 * Never put the token, URL, or code in the borrower thread — Fox only says check email / enter the code.
 */
import { ACCOUNT_QUERY, magicLinkFor } from "./core";

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

function hostOf(origin: string) {
  const raw = origin.trim();
  if (!raw) return "";
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Create-host is the host that handled Create account — request Origin / Host.
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

/** Founder pick — one cookie-less resume host. Do not invent a second. */
export const ACCOUNT_RESUME_ORIGIN_LOCKED = "https://start.onyxdirect.com";

/** Cookie-less resume host. Not VERCEL_PROJECT_PRODUCTION_URL / onyx-backend-ten. */
export function configuredResumeOrigin() {
  const raw =
    process.env.ACCOUNT_RESUME_ORIGIN?.trim() ||
    process.env.ONYX_RESUME_ORIGIN?.trim() ||
    ACCOUNT_RESUME_ORIGIN_LOCKED;
  const cleaned = cleanOrigin(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (hostOf(cleaned) === "start.onyxdirect.com") return ACCOUNT_RESUME_ORIGIN_LOCKED;
  return ACCOUNT_RESUME_ORIGIN_LOCKED;
}

export function isUniquePreviewOrigin(origin: string) {
  const host = hostOf(origin);
  return /^onyx-backend-[a-z0-9]+-onyx-direct\.vercel\.app$/.test(host) && !host.includes("-git-");
}

/**
 * Vercel Authentication preview (unique, branch alias, team preview alias).
 * A configured ACCOUNT_RESUME_ORIGIN is treated as cookie-less even if it
 * looks like a preview host — that env is the public desk they unprotect.
 */
export function isProtectedPreviewOrigin(origin: string) {
  const host = hostOf(origin);
  if (!host) return false;
  const configured = configuredResumeOrigin();
  if (configured && hostOf(configured) === host) return false;
  if (host.endsWith(".vercel.app") && host.includes("onyx-direct")) return true;
  if (host.endsWith(".vercel.app") && host.includes("-git-")) return true;
  if (/^onyx-backend-[a-z0-9]{6,}-/.test(host) && host.endsWith(".vercel.app")) return true;
  return false;
}

/**
 * Letter host for the borrower tap. Prefer a public cookie-less resume host
 * when configured. Never auto-prefer production / onyx-backend-ten (2346d7e).
 * Protected create-host falls through so 575fee8 can still cookie the preview.
 */
export function letterResumeOrigin(createOrigin = "") {
  const configured = configuredResumeOrigin();
  if (configured && !isProtectedPreviewOrigin(configured)) return configured;
  const create = cleanOrigin(createOrigin);
  if (create && !isProtectedPreviewOrigin(create)) return create;
  return create;
}

export function absoluteMagicLink(token: string, origin: string) {
  const path = magicLinkFor(token);
  if (!origin) return path;
  return `${origin}${path}`;
}

export const PROTECTION_BYPASS_QUERY = "x-vercel-protection-bypass";
export const SET_BYPASS_COOKIE_QUERY = "x-vercel-set-bypass-cookie";
export const SET_BYPASS_COOKIE_VALUE = "true";

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
  // Public / cookie-less host: borrower tap must not carry protection-bypass.
  if (!isProtectedPreviewOrigin(origin)) return base;
  const url = new URL(base);
  url.searchParams.set(PROTECTION_BYPASS_QUERY, secret);
  // Query, not an agent header. Vercel then cookies follow-up CSS/JS/API so
  // InPrivate can mount Fox. Bypass alone only lets the first HTML through.
  url.searchParams.set(SET_BYPASS_COOKIE_QUERY, SET_BYPASS_COOKIE_VALUE);
  url.hash = `${ACCOUNT_QUERY}=${encodeURIComponent(token)}`;
  return url.toString();
}

export function letterHasProtectionBypass(link: string) {
  try {
    const url = new URL(link);
    return (
      Boolean(url.searchParams.get(PROTECTION_BYPASS_QUERY)) &&
      url.searchParams.get(SET_BYPASS_COOKIE_QUERY) === SET_BYPASS_COOKIE_VALUE
    );
  } catch {
    return (
      /[?&]x-vercel-protection-bypass=/i.test(link) &&
      /[?&]x-vercel-set-bypass-cookie=true(?:&|#|$)/i.test(link)
    );
  }
}

/** account= from search or hash. Extra bypass query must not hide the token. */
export function accountTokenFromLocation(search: string, hash = "") {
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const fromQuery = (query.get(ACCOUNT_QUERY) ?? "").trim();
  if (fromQuery) return fromQuery;
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return "";
  return (new URLSearchParams(raw).get(ACCOUNT_QUERY) ?? "").trim();
}

export const ONYX_MAIL_FROM = "ONYX Direct <lucas@onyxdirect.com>";

export function onyxMailFrom(value: string) {
  return /@(?:onyxlending|onyxdirect)\.com\b/i.test(value);
}

/** Locked sender for this SHA. Old ONYX james.b@example.com does not win. */
export function resolveMailFrom(value = "") {
  const trimmed = value.trim();
  if (/lucas@onyxdirect\.com\b/i.test(trimmed)) {
    return /ONYX Direct/i.test(trimmed) ? trimmed : ONYX_MAIL_FROM;
  }
  return ONYX_MAIL_FROM;
}

export function accountMailEnv() {
  const resendFrom = resolveMailFrom(process.env.RESEND_FROM || "");
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
