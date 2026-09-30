const FROM = "ONYX Direct <lucas@onyxdirect.com>";
const TO = "lucas@onyxdirect.com";
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const hits = new Map();

function clientIp(req) {
  const raw = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "");
  return raw.split(",")[0].trim() || "unknown";
}

function allow(ip) {
  const now = Date.now();
  const prior = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (prior.length >= MAX_PER_WINDOW) {
    hits.set(ip, prior);
    return false;
  }
  prior.push(now);
  hits.set(ip, prior);
  return true;
}

function pacificStamp(now = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(now);
}

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2048) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end();
    return;
  }
  if (!allow(clientIp(req))) {
    res.statusCode = 429;
    res.end();
    return;
  }
  const body = await readBody(req);
  const email = String(body.email || "").trim();
  if (!EMAIL_OK.test(email) || email.length > 254) {
    res.statusCode = 400;
    res.end();
    return;
  }
  const key = String(process.env.RESEND_API_KEY || "").trim();
  if (!key) {
    res.statusCode = 503;
    res.end();
    return;
  }
  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      subject: "Request access",
      text: `${email}\n${pacificStamp()}\n`,
    }),
  });
  if (!sent.ok) {
    res.statusCode = 502;
    res.end();
    return;
  }
  res.statusCode = 204;
  res.end();
};
