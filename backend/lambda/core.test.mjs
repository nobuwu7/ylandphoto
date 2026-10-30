import test from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "./core.mjs";

function setup() {
  const mem = new Map(); let t = 1_000_000; const mails = [], sent = [];
  const store = {
    async get(k) { const v = mem.get(k); return v && v.ttl < t ? undefined : v; },
    async put(k, v) { mem.set(k, { ...v }); },
    async del(k) { mem.delete(k); },
    async bump(k) { mem.get(k).attempts++; },
    async incr(k, ttl) { const v = mem.get(k) || { n: 0, ttl: t + ttl }; v.n++; mem.set(k, v); return v.n; }
  };
  const env = { PEPPER: "p", ORIGIN: "https://site.test", CONTACT: "me@example.test" };
  const h = createHandler({ store, sendMail: async (to, code) => mails.push({ to, code }), sendMessage: async m => sent.push(m), env, now: () => t });
  const call = (path, body, extra = {}) => h({ requestContext: { http: { method: "POST", path, sourceIp: extra.ip || "1.1.1.1" } },
    headers: { origin: extra.origin || "https://site.test" }, body: JSON.stringify(body) }).then(r => ({ ...r, json: JSON.parse(r.body) }));
  return { call, mails, sent, tick: s => { t += s; } };
}

test("happy path reveals contact once", async () => {
  const s = setup();
  assert.equal((await s.call("/send", { email: "A@B.co" })).statusCode, 200);
  const { code, to } = s.mails[0];
  assert.equal(to, "a@b.co"); assert.match(code, /^\d{6}$/);
  const ok = await s.call("/verify", { email: "a@b.co", code });
  assert.equal(ok.json.contact, undefined);                     // verifying alone reveals nothing
  assert.equal((await s.call("/verify", { email: "a@b.co", code })).statusCode, 400);   // single use
  const m = await s.call("/message", { email: "a@b.co", token: ok.json.token, name: "Ann\nBcc: x", message: "Hi Aubs, love your work." });
  assert.equal(m.json.contact, "me@example.test");
  assert.equal(s.sent[0].replyTo, "a@b.co"); assert.equal(s.sent[0].name, "Ann Bcc: x");
});

test("wrong codes burn out after 5 tries", async () => {
  const s = setup(); await s.call("/send", { email: "a@b.co" });
  const real = s.mails[0].code; const bad = real === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++) assert.equal((await s.call("/verify", { email: "a@b.co", code: bad })).statusCode, 400);
  const r = await s.call("/verify", { email: "a@b.co", code: real });
  assert.equal(r.statusCode, 400); assert.equal(r.json.contact, undefined);
});

test("code expires after 10 minutes", async () => {
  const s = setup(); await s.call("/send", { email: "a@b.co" });
  s.tick(601);
  assert.equal((await s.call("/verify", { email: "a@b.co", code: s.mails[0].code })).statusCode, 400);
});

test("cooldown, honeypot, bad email, wrong origin", async () => {
  const s = setup();
  await s.call("/send", { email: "a@b.co" });
  assert.equal((await s.call("/send", { email: "a@b.co" })).statusCode, 429);
  await s.call("/send", { email: "x@y.co", website: "spam" }); assert.equal(s.mails.length, 1);
  assert.equal((await s.call("/send", { email: "nope" })).statusCode, 400);
  assert.equal((await s.call("/send", { email: "q@r.co" }, { origin: "https://evil.test" })).statusCode, 403);
  const noOrigin = await createHandler({ store: {}, sendMail() {}, env: { PEPPER: "p", ORIGIN: "https://site.test" } })(
    { requestContext: { http: { method: "POST", path: "/send" } }, headers: {}, body: '{"email":"a@b.co"}' });
  assert.equal(noOrigin.statusCode, 403);                          // curl with no Origin header
});

test("per-IP hourly limit", async () => {
  const s = setup(); let last;
  for (let i = 0; i < 11; i++) last = await s.call("/send", { email: `u${i}@b.co` });
  assert.equal(last.statusCode, 429);
});

test("message needs a valid, unexpired token for that address", async () => {
  const s = setup(); await s.call("/send", { email: "a@b.co" });
  const { json } = await s.call("/verify", { email: "a@b.co", code: s.mails[0].code });
  const msg = { name: "Ann", message: "Hello there, nice site." };
  assert.equal((await s.call("/message", { ...msg, email: "other@b.co", token: json.token })).statusCode, 403);
  assert.equal((await s.call("/message", { ...msg, email: "a@b.co", token: "1.deadbeef" })).statusCode, 403);
  s.tick(901);
  assert.equal((await s.call("/message", { ...msg, email: "a@b.co", token: json.token })).statusCode, 403);
  assert.equal(s.sent.length, 0);
});

test("verify attempts are limited per network", async () => {
  const s = setup(); let last;
  for (let i = 0; i < 31; i++) last = await s.call("/verify", { email: `u${i}@b.co`, code: "000000" });
  assert.equal(last.statusCode, 429);
});

async function viaMessage(s, name, message, email = "a@b.co") {
  await s.call("/send", { email }); const code = s.mails.at(-1).code;
  const v = await s.call("/verify", { email, code });
  return s.call("/message", { email, token: v.json.token, name, message });
}

test("a normal enquiry gets through", async () => {
  const s = setup();
  const r = await viaMessage(s, "Sam Lee", "Hi Aubs, I run a student society and we need a photographer for our dinner on 12 Dec. Are you free?");
  assert.equal(r.statusCode, 200); assert.equal(s.sent.length, 1);
});

test("one plain link is allowed but defanged", async () => {
  const s = setup();
  const r = await viaMessage(s, "Sam", "Our event page is https://example.com/dinner and we would love coverage.");
  assert.equal(r.statusCode, 200);
  assert.match(s.sent[0].text, /hxxps:\/\/example\[\.\]com/); assert.doesNotMatch(s.sent[0].text, /https:\/\//);
});

test("phishing and spam are held back, not emailed", async () => {
  const bad = [
    "URGENT: verify your account now at https://secure-login.top/verify or it will be suspended",
    "Click here http://bit.ly/3abc to claim your gift card prize",
    "Check https://a.com and https://b.com and https://c.com for our offer",
    "Hello <script>alert(1)</script> I need photos",
    "Send the bitcoin wire transfer immediately, act now, invoice attached",
    "Open http://192.168.4.7/pay for the invoice please"
  ];
  for (const [i, m] of bad.entries()) {
    const s = setup(); const r = await viaMessage(s, "Sam", m, `u${i}@b.co`);
    assert.equal(r.statusCode, 422, m); assert.equal(s.sent.length, 0, m);
  }
});

test("disposable addresses are blocked", async () => {
  const s = setup(); const r = await viaMessage(s, "Sam", "Hello, I would love to book you for an event.", "x@mailinator.com");
  assert.equal(r.statusCode, 422);
});

test("fields must be plain text", async () => {
  const s = setup();
  for (const body of [{ email: ["a@b.co"] }, { email: { x: 1 } }, { email: "a@b.co", code: 123456 }, [], "x"]) {
    const r = await s.call("/send", body); assert.equal(r.statusCode, 400, JSON.stringify(body));
  }
  assert.equal(s.mails.length, 0);
});
