# Fondly — mockup site

A front-end-only mockup for the AI-personalised prints concept. No backend, no
real AI — the "Try it" section runs a genuine duotone effect on whatever photo
you upload, right in the browser, so it's an honest working demo rather than a
static picture. "Fondly" is a placeholder name — swap it out in `index.html`
(search for `Fondly`) and update the `<title>`/meta tags.

## Run it locally
No build step. Either:
- Open `index.html` directly in a browser, or
- From this folder: `python3 -m http.server 8000` then visit `localhost:8000`
  (some browsers block canvas image processing on `file://` URLs, so the
  local server is the safer option for testing the upload demo).

## Push to GitHub
This is a plain static site — `git init`, add these files, commit, push. It'll
work as-is on GitHub Pages if you want a shareable link for your friend.

## Images to add
Drop these into an `images/` folder next to `index.html`. Until they're
added, each spot shows a warm gradient placeholder instead of a broken image,
so the page still looks finished.

| Filename | Used for | Suggested shape |
|---|---|---|
| `images/hero-before.jpg` | Hero, "before" photo | portrait, ~4:5 |
| `images/hero-after.jpg` | Hero, "after" styled print | portrait, ~4:5 |
| `images/gallery-1.jpg` | Gallery — pet portrait example | portrait, ~4:5 |
| `images/gallery-2.jpg` | Gallery — wedding photo example | portrait, ~4:5 |
| `images/gallery-3.jpg` | Gallery — family walk example | portrait, ~4:5 |
| `images/gallery-4.jpg` | Gallery — first home example | portrait, ~4:5 |
| `images/gallery-5.jpg` | Gallery — holiday view example | portrait, ~4:5 |
| `images/gallery-6.jpg` | Gallery — newborn example | portrait, ~4:5 |

Real before/after pairs (an ordinary photo next to its styled print) will
sell the idea far better than stock images — worth using actual output from
whatever AI model you land on, once you've picked one.

## Notes on the design
- Palette and type choices are in `css/styles.css` under `:root` — change
  `--berry`, `--mustard`, `--paper` etc. to retheme everything in one place.
- The credits demo in the "Try it" panel mirrors your actual model: 1 free
  preview, then a simulated "sign up" unlocks 4 more, then it prompts a
  top-up — copy only, no real accounts or payments wired up.
