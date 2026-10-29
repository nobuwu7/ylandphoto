# ylandphoto plan

Written by Archie for Enzo's sprint. Project lives in `~/Documents/repo/ylandphoto`; ystack is the toolkit that builds it.

## 1. Goal and done means

**Goal:** one public portfolio site that does two jobs: (a) enters the AWS Student Builder Challenge (due Nov 6, 2026, 11:59 pm PT), and (b) shows event-photography clients Aubs's work.

**Done means** (each one is a check):

- `index.html` has working nav to About Me, Skills, Projects/Achievements, and Gallery.
- The creative feature (the **Shutter**) has a visible hint, works on click, tap and the `S` key, and never blocks the nav.
- Layout has no horizontal scroll at 375 px and at 1280 px.
- Site is plain static files, so AWS Amplify Hosting can serve it with no build step.
- Repo is ready to push to GitHub. (Push and deploy are approval items and are NOT part of this sprint.)

## 2. Data shape

- `photos.js` sets `window.PHOTOS`, an array of `{ src, title, event, alt }`. `src` is empty while photos are placeholders; the page draws a gradient frame instead.
- `FACTS` in `app.js`: short strings about Aubs, shown in the developed print. Placeholders until Aubs writes real ones.
- Shutter state: `exposure` (0 to 36). No other state. Reset on page load.

## 3. Structure and boundaries

```
index.html     content: hero, About, Skills, Projects, Gallery, footer
styles.css     "darkroom" look: warm black, safelight red, grain
photos.js      photo list (the only file Aubs edits to add photos)
app.js         Shutter feature + gallery render
photos/        web-sized copies (about 2000 px, compressed). Originals stay in Google Drive.
```

Outside data enters in one place: `photos.js`. `app.js` treats a missing `src` as a placeholder and never crashes on it.

## 4. Approach chosen

**Plain HTML, CSS and JS, no framework, no build.** Amplify Hosting serves it as is, it loads fast, and a reviewer can read the whole thing.

Alternatives that lost: React/Vite (a build step and node_modules add failure points a 9-day deadline does not need); a Drive-embedded gallery (slow, and Drive links are not meant for hot-linking).

**Look: Mosaic (chosen by Aubs, Oct 29).** Three full designs were built and compared: Darkroom, Editorial (light) and Mosaic. Mosaic won: black and white, huge type, italic serif accents, a tight photo wall. The other two were archived outside the project.

**Creative feature: the Shutter.** A floating camera button reads "Press the shutter". Pressing it flashes, plays a synthesized click, and develops a print from dark to full image in the corner with a fact about Aubs. A film-roll counter runs 1 of 36, and "roll finished" shows at 36. Ties directly to who she is (an event photographer) and is easy to remember.

## 5. Failure cases

- No `src` for a photo: gradient placeholder, no broken-image icon.
- Audio blocked or unsupported: silent, the flash still works.
- `prefers-reduced-motion`: no flash, no developing animation; the print just appears.
- JS disabled: all core sections still read. Only the Shutter is lost.
- Print panel is non-modal and dismissible with a close button or `Esc`, so it can never trap navigation.

## 6. Build steps

1. Static skeleton with all four sections and nav. Check: open in browser, all anchors scroll.
2. Darkroom styling, responsive. Check: no horizontal scroll at 375 px and 1280 px.
3. Gallery render from `photos.js` with placeholders. Check: 12 frames appear.
4. Shutter feature. Check: click, tap and `S` each add one exposure; counter reaches 36; `Esc` closes.
5. Reduced-motion and no-audio paths. Check: emulate reduced motion; nothing breaks.
6. Real photos: export about 12 curated shots from Drive at web size into `photos/`, fill `photos.js`. Needs Aubs's picks and a check that clients are OK with public use (Rae's area: attendee privacy).
7. Real About/Skills/Projects text from Aubs. Needs her input.
8. **Approval items (later):** GitHub push, AWS Amplify deploy. Go through Gage's ship gate and the approval queue. Vercel is out; the challenge requires Amplify.

## 7. Open questions for Aubs

- Name and school to show (the challenge needs verified student status; the site does not have to show the school).
- Which pilates shots to feature, and are the clients OK with them being public?
- Real facts for the Shutter prints.
- Does she want the `joshua-jenna` shoot in the portfolio? (Left out for now; it looks like a private client shoot.)
