# Email-reveal backend

Visitors enter their own email, get a 6-digit code, then write a message in a short draft form. The site's Lambda emails the message to you (Reply-To is their verified address). Your address is only shown on the "Sent" screen afterwards, and it lives only in a Lambda environment variable, never in this repo.

Flow: browser -> Lambda Function URL (`/send`, `/verify`, `/message`) -> DynamoDB (hashed codes, rate counters, auto-expiring) and SES (sends the code).

## Cost
Lambda (1M requests/month) and DynamoDB (25 GB, on-demand) are in the always-free tier. SES is about US$0.10 per 1,000 emails. The code caps sending at 150 emails/day, so the worst case is about US$0.015/day. Set an AWS Budget alert at US$1 anyway.

## Set up (AWS console, region of your choice, e.g. ap-southeast-1)
1. **SES**: Verified identities -> Create identity -> Email address -> use a sender address you own and click the link they send. Then request **production access** (Account dashboard). Until it is approved, SES only mails verified addresses, so the form works for you and nobody else.
2. **DynamoDB**: Create table `reveal`, partition key `pk` (String), on-demand. In the table's Additional settings turn on **TTL** with attribute `ttl`.
3. **Lambda**: Create function `reveal`, runtime Node.js 22.x. Upload `lambda/core.mjs` and `lambda/index.mjs` (zip those two files, no other files needed).
   - Configuration -> Environment variables: `TABLE=reveal`, `FROM=<verified sender>`, `CONTACT=<the email to reveal>`, `ORIGIN=<your site, e.g. https://main.xxxx.amplifyapp.com, no trailing slash>`, `PEPPER=<a long random string>`.
   - Configuration -> Concurrency: reserve **2**.
   - Permissions: add an inline policy allowing `dynamodb:GetItem, PutItem, DeleteItem, UpdateItem` on the `reveal` table and `ses:SendEmail` on your identity.
   - Configuration -> Function URL: Create, auth type **NONE**, and leave CORS off (the code sets its own headers).
4. Paste the Function URL into `config.js` as `revealApi`, commit, and push. Amplify redeploys.
5. When you add a custom domain later, change `ORIGIN` to match it.

## Spam and phishing filter
Before a message is emailed to you, `lambda/filter.mjs` scores it. It blocks more than one link, shortened or oddly-ended links, raw IP links, HTML or script, disposable email domains, and common phishing or scam wording (verify your account, gift cards, crypto, wire transfer, urgent, SEO offers and so on). Blocked messages are not emailed: they are saved for 30 days in the `reveal` table under keys starting `quarantine#`, with the reasons, so you can look for false alarms in the DynamoDB console (Explore items). Messages that pass arrive with `[Screened]` in the subject, and any link in them is defanged (`hxxps://example[.]com`) so it can't be clicked by accident. This is a heuristic filter, so still treat links and attachments from strangers with care.

## Test
`node --test lambda/core.test.mjs`

## Caveat
Mail sent "from" a Gmail or other free-mail address often lands in spam because it isn't signed for that domain. The dialog tells visitors to check spam. A sender on a domain you own fixes it.
