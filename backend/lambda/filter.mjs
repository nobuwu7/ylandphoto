// Screens a message before it can reach my inbox. Heuristics only: it catches the common phishing and spam
// patterns, it does not prove a message is safe. Blocked messages are kept in a quarantine table for review.

const SHORTENERS = /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|rebrand\.ly|cutt\.ly|shorturl\.at|t\.ly|rb\.gy|tiny\.cc|lnkd\.in)\b/i;
const BAD_TLDS = /\.(zip|mov|xyz|top|click|link|work|rest|country|gq|tk|ml|cf|ga|icu|cyou|monster|sbs|cfd|support|loan|win|bid)(\/|:|\?|#|\s|$)/i;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;
const BARE_DOMAIN = /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|me|ly|app|dev|info|biz|ru|cn)\b(?:\/\S*)?/gi;
const IP_URL = /https?:\/\/\d{1,3}(?:\.\d{1,3}){3}/i;

// Phrases that show up in phishing, scams and spam. Each hit adds to the score.
const PHRASES = [
  /verify your (account|identity|email|password)/i, /confirm your (account|password|identity|payment)/i,
  /(account|password) (has been|will be) (suspended|locked|disabled|expired)/i, /unusual (sign.?in|activity|login)/i,
  /click (here|the link|below)/i, /\b(login|log in|sign in) (here|now|to continue)\b/i,
  /gift ?cards?/i, /wire transfer|bank transfer|western union|moneygram/i, /\b(bitcoin|btc|ethereum|usdt|crypto(currency)?|airdrop)\b/i,
  /(you('ve| have)? (won|been selected)|lottery|inheritance|prize)/i, /urgent(ly)?|immediately|act now|within 24 hours/i,
  /\b(invoice|payment) (attached|overdue|pending)\b/i, /\b(seo|backlinks?|guest post|rank (your|on) google|followers)\b/i,
  /\b(viagra|casino|loan offer|investment opportunity|forex)\b/i, /(ssn|social security|credit card number|cvv|otp|one.?time (code|password))/i,
  /\b(download|open) (the )?(attachment|file|document)\b/i
];
const DISPOSABLE = /@(mailinator|guerrillamail|10minutemail|tempmail|temp-mail|yopmail|trashmail|sharklasers|getnada|dispostable|maildrop|throwawaymail|fakeinbox|moakt)\./i;

const MAX_LINKS = 1;

export function screen({ name, text, email }) {
  const reasons = [];
  let score = 0;
  const add = (pts, why) => { score += pts; reasons.push(why); };
  const body = name + "\n" + text;

  if (DISPOSABLE.test(email)) add(3, "disposable email domain");
  if (/<\s*(script|iframe|img|a|form|style|object|embed|svg)\b|javascript:|data:text\/html|on\w+\s*=/i.test(body)) add(3, "html or script");

  const links = body.match(URL_RE) || [];
  const bare = (body.replace(URL_RE, " ").match(BARE_DOMAIN) || []).filter(d => !/\.(jpg|png|gif)$/i.test(d));
  const all = links.concat(bare);
  if (all.length > MAX_LINKS) add(3, "more than " + MAX_LINKS + " link");
  if (all.some(l => SHORTENERS.test(l))) add(3, "shortened link");
  if (all.some(l => BAD_TLDS.test(l + " "))) add(3, "suspicious link ending");
  if (IP_URL.test(body)) add(3, "link to a raw IP address");
  if (/https?:\/\/[^\s/]*xn--/i.test(body) || /https?:\/\/[^\s/]*@/.test(body)) add(3, "disguised link");
  if (/[^\x00-\x7F]/.test(body) && all.length && /[Ѐ-ӿͰ-Ͽ]/.test(body.replace(/[^\x00-\x7F]+(?=[\s.,!?]|$)/g, ""))) add(1, "mixed alphabets near a link");

  const hits = PHRASES.filter(re => re.test(body)).length;
  if (hits) add(hits >= 2 ? 3 : 1, hits + " spam or phishing phrase" + (hits > 1 ? "s" : ""));
  if (hits && all.length) add(2, "scam wording together with a link");

  if (/(.)\1{9,}/.test(body)) add(2, "repeated characters");
  if (/\S{60,}/.test(text.replace(URL_RE, ""))) add(2, "unbroken long string");
  const caps = (text.match(/[A-Z]/g) || []).length, letters = (text.match(/[A-Za-z]/g) || []).length;
  if (letters > 40 && caps / letters > 0.6) add(2, "mostly capitals");
  if (/^[^\n]*$/.test(name) && /[0-9]{6,}|https?:|@/.test(name)) add(3, "name contains a link, email or long number");

  return { ok: score < 3, score, reasons, links: all };
}

// Makes any link in a message safe to read in an email client: no longer clickable until you choose to fix it.
export function defang(text) {
  return text.replace(URL_RE, u => u.replace(/^http/i, "hxxp").replace(/\./g, "[.]"))
             .replace(BARE_DOMAIN, d => d.replace(/\./g, "[.]"));
}
