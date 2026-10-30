// Email-reveal logic. Storage and mail are injected so this runs in tests without AWS.
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const CODE_TTL = 600;        // a code lasts 10 minutes
const MAX_ATTEMPTS = 5;      // wrong guesses before the code is burned
const COOLDOWN = 60;         // seconds between codes to the same address
const PER_EMAIL_HOUR = 3;
const PER_IP_HOUR = 10;
const GLOBAL_DAY = 150;      // hard ceiling on emails per day, so cost can never run away
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export function createHandler({ store, sendMail, env, now = () => Math.floor(Date.now() / 1000) }) {
  const hash = (email, code) => createHmac("sha256", env.PEPPER).update(email + ":" + code).digest("hex");
  const same = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

  const reply = (status, body) => ({
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": env.ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  });

  async function send(body, ip) {
    if (body.website) return reply(200, { ok: true });            // honeypot: bots fill it, people can't see it
    const email = String(body.email || "").trim().toLowerCase();
    if (email.length > 254 || !EMAIL_RE.test(email)) return reply(400, { error: "That doesn't look like an email address." });

    const t = now();
    const hour = Math.floor(t / 3600);
    const day = Math.floor(t / 86400);
    if ((await store.incr("rate#global#" + day, 86400 * 2)) > GLOBAL_DAY ||
        (await store.incr("rate#ip#" + ip + "#" + hour, 7200)) > PER_IP_HOUR ||
        (await store.incr("rate#mail#" + email + "#" + hour, 7200)) > PER_EMAIL_HOUR) {
      return reply(429, { error: "Too many tries. Please wait a while and try again." });
    }

    const prior = await store.get("code#" + email);
    if (prior && t - prior.sentAt < COOLDOWN) return reply(429, { error: "Wait a minute before asking for another code." });

    const code = String(randomInt(0, 1000000)).padStart(6, "0");
    await store.put("code#" + email, { hash: hash(email, code), attempts: 0, sentAt: t, ttl: t + CODE_TTL });
    try {
      await sendMail(email, code);
    } catch (e) {
      await store.del("code#" + email);
      console.error("mail failed", e && e.name);
      return reply(502, { error: "Couldn't send the email. Try again later." });
    }
    return reply(200, { ok: true });
  }

  async function verify(body) {
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").replace(/\D/g, "");
    if (!EMAIL_RE.test(email) || code.length !== 6) return reply(400, { error: "That code didn't work." });

    const item = await store.get("code#" + email);
    if (!item || item.ttl < now()) return reply(400, { error: "That code expired. Ask for a new one." });
    if (item.attempts >= MAX_ATTEMPTS) {
      await store.del("code#" + email);
      return reply(400, { error: "Too many wrong tries. Ask for a new code." });
    }
    if (!same(item.hash, hash(email, code))) {
      await store.bump("code#" + email);
      return reply(400, { error: "That code didn't work." });
    }
    await store.del("code#" + email);                              // one use only
    return reply(200, { ok: true, contact: env.CONTACT });
  }

  return async function handler(event) {
    const http = (event.requestContext && event.requestContext.http) || {};
    if (http.method === "OPTIONS") return reply(204, {});
    if (http.method !== "POST") return reply(405, { error: "Not found." });
    const origin = event.headers && (event.headers.origin || event.headers.Origin);
    if (origin && origin !== env.ORIGIN) return reply(403, { error: "Not allowed." });
    let body;
    try { body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body || "{}"); }
    catch { return reply(400, { error: "Bad request." }); }
    const ip = http.sourceIp || "unknown";
    if (http.path === "/send") return send(body, ip);
    if (http.path === "/verify") return verify(body);
    return reply(404, { error: "Not found." });
  };
}
