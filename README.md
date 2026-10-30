# ylandphoto

Event photography portfolio and personal site for Aubrey ("Aubs"). Hosted on AWS Amplify Hosting.

**Creative feature: the Shutter.** Press the camera button in the bottom-right corner (or hit `S`) and a print develops with the name of a camera shot type. A roll holds 36 exposures.

## What is in here

| File | What it does |
|---|---|
| `index.html` | All the content: About, Skills, Projects, Gallery |
| `styles.css` | The look: black and white, huge type, a tight photo wall |
| `app.js` | The gallery and the Shutter |
| `photos.js` | The photo list. Add photos here |
| `docs/ystack/plan.md` | The build plan and the decisions behind it |

Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Run it locally

```bash
python3 -m http.server 8780
```

Then open http://localhost:8780/.

## Add photos

Put web-sized copies (about 2000 px wide) in a `photos/` folder, then set each `src` in `photos.js`, for example `src: "photos/frame-01.jpg"`. Originals stay in Google Drive. A blank `src` shows a placeholder frame.

## Credits

- Shutter click sounds (`sounds/`): @1cho.mejia ("SFX for Grid").
- Photos: Aubrey Yee, except where a photo's caption names another photographer.

## Hosting

To be hosted on AWS Amplify Hosting (not deployed yet).
