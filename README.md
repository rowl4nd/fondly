# Fondly

Personalised AI print site. The four-step design flow (upload/describe →
style → colour → text) now calls a real AI image-editing model through a
small serverless function — it's no longer a fake filter. "Fondly" is a
placeholder name — swap it out in `index.html`/`terms.html` (search for
`Fondly`) and update the `<title>`/meta tags.

## What's real vs simulated
- **Real**: the actual print image (`/api/generate` calls FLUX.1 Kontext
  [pro] on fal.ai — an image-editing model chosen specifically because it's
  built to keep a face/pet's identity intact across edits, rather than
  regenerating the scene from scratch).
- **Real**: the print text — drawn onto the canvas in the browser after the
  AI image comes back, not left to the AI to render (AI models are
  unreliable at exact typography; this way it's exact, and free).
- **Still simulated**: the credits/sign-up/payment flow (copy only, nothing
  wired to real accounts or Stripe yet), and the style/colour example
  thumbnails in steps 2–3 (a cheap local duotone filter, not a real AI call
  — deliberately, so browsing options doesn't cost you money per click).

## Set up the AI backend
1. Create a [fal.ai](https://fal.ai) account and grab an API key from
   [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys).
2. Copy `.env.example` to `.env` and paste your key in as `FAL_KEY=...` for
   local testing. **Never commit `.env`** — it's already git-ignored.
3. For production, add the same `FAL_KEY` variable in your Vercel project's
   Settings → Environment Variables instead (don't rely on `.env` in
   production).

Cost is pay-per-use, no monthly minimum — roughly 4p per generated image at
today's pricing, against your £25–£80 print prices.

## Run it locally
The site now needs a backend for the real "Generate image" step, so a plain
static server (`python3 -m http.server`) will load the pages but the
generate button will fail — that's expected without the function running.
To test the whole thing locally:
```
npm install -g vercel   # one-time
vercel dev
```
This serves the static site *and* runs `/api/generate.js` together, reading
`FAL_KEY` from your `.env`.

## Deploy
Push this folder to GitHub, then import it into Vercel (or run `vercel` from
this folder). Set `FAL_KEY` in the project's environment variables before
your first real order — without it, `/api/generate` returns a clear "not
configured yet" error rather than failing silently.

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

Real before/after pairs (an ordinary photo next to its actual AI-styled
result) will sell the idea far better than stock images, now that the real
generation is wired in.

## Notes on the design
- Palette and type choices are in `css/styles.css` under `:root` — change
  `--berry`, `--mustard`, `--paper` etc. to retheme everything in one place.
- The credits demo in the "Try it" panel mirrors your actual model: 1 free
  preview, then a simulated "sign up" unlocks 4 more, then it prompts a
  top-up. A credit is only spent once a generation actually succeeds — a
  failed AI call doesn't cost the customer anything.
- The generated image currently comes straight from fal.ai's hosted URL.
  Before taking real orders, add a step that downloads and re-uploads it to
  your own storage (S3/R2) — you'll want your own permanent copy for the
  actual print job, and fal's URL isn't guaranteed to stay valid forever.
