# Annergy Solar

Marketing site for a Brisbane solar and battery installer. Static HTML, no
framework, no build dependencies — the only tooling is Python 3 from the
standard library.

    python3 serve.py          # preview at http://localhost:4321 (clean URLs + 404)
    python3 build.py          # regenerate the .html files and sitemap.xml

## How it's put together

`build.py` wraps each file in `src/pages/` with the shared shell in
`src/partials/base.html` and writes plain HTML to the project root. Everything
deployed is static; the build step exists only so the header, footer, meta tags
and icon sprite can't drift between eleven pages.

    src/pages/*.html        page content, prefixed with a JSON front-matter block
    src/partials/base.html  <head>, header, footer, SVG icon sprite
    assets/css/site.css     design tokens + all components
    assets/js/site.js       nav, scroll reveal, savings estimator, form
    assets/img/photos/      photo slots (placeholders — see below)
    api/quote.js            Vercel serverless function for the quote form
    build.py                generator
    serve.py                local preview (mirrors Vercel's cleanUrls + 404)
    tools/                  icon and placeholder generators

**Edit `src/`, never the root `.html` files** — they are overwritten on every
build. Front matter drives the title, meta description, canonical URL, sitemap
priority and JSON-LD.

## Photography — the one thing still outstanding

Every photo on the site is a real `<img>` with `width`/`height` set and a
written `alt`, currently pointing at a neutral placeholder. **To go live,
replace the file at the same path with a real photograph of the same aspect
ratio — no code changes needed.**

| File (in `assets/img/photos/`) | Size | Ratio | Shot needed |
|---|---|---|---|
| `hero.jpg` | 1000×1250 | 4:5 portrait | Installer fitting panels on a Brisbane roof |
| `residential.jpg` | 1200×900 | 4:3 | Crew on a tile roof, panels going down |
| `battery.jpg` | 1200×900 | 4:3 | Battery unit mounted in a garage |
| `commercial.jpg` | 1200×900 | 4:3 | Warehouse rooftop array, wide |
| `case-wavell-heights.jpg` | 1200×800 | 3:2 | Finished 13.2 kW array on a tile roof |
| `case-coorparoo.jpg` | 1200×800 | 3:2 | Queenslander rear pitch + Powerwall |
| `case-rocklea.jpg` | 1200×800 | 3:2 | 99 kW warehouse array from above |
| `team.jpg` | 1400×880 | ~3:2 | The crew in front of a branded ute |

The hero is portrait on purpose — it sits beside the copy on desktop, so a
vertical shot of someone working on a roof fits far better than a landscape one.

Update the `alt` text in `src/pages/` when the real photos go in: describe what
is actually in the frame. After swapping every file, delete
`tools/make-placeholders.py`.

Shoot notes that will make the site look right: real crews, real Brisbane roofs,
daylight, no stock-looking poses. Photos of your own completed jobs beat
anything licensed — that is the whole point of this section.

## Brand

The logo is the supplied artwork at `assets/img/annergy-logo.png` (260×59,
transparent). The header uses it directly; the footer places it on a white plate
because the red mark loses contrast against the dark band. `tools/make-icons.py`
crops the swoosh out of that same file to build the favicons — re-run it if the
logo is ever replaced.

| | |
|---|---|
| Typeface | Archivo (400/500/600/700/800) |
| Ink | `#12181c` |
| Paper | `#fbf8f2` |
| Brand red | `#c2222b` — sampled from the logo |
| Neutrals | warm stone `#ece6da` / `#6b6252` |

One accent, used with intention: red is for calls to action, eyebrows, key
figures and active states. Everything else is ink and warm neutrals.

Text and focus rings use the **semantic** tokens (`--accent`, `--accent-deep`,
`--danger`, `--focus`, `--band-accent`), which flip between the light and dark
palettes. The raw ramp (`--red`, `--stone-100`) is for fills. `--band` /
`--band-text` are the deliberately-inverted dark sections; they lift above the
page in dark mode rather than flipping, so they never become light-on-light.
Every foreground/background pair was checked at WCAG AA in both themes.

The OG card is generated from `assets/img/og.svg` (which embeds the logo):

    qlmanage -t -s 1200 -o /tmp assets/img/og.svg
    sips -c 630 1200 /tmp/og.svg.png --out /tmp/crop.png
    sips -s format jpeg -s formatOptions 84 /tmp/crop.png --out assets/img/og.jpg

## Deploying

Push to Vercel — `vercel.json` sets clean URLs, immutable caching on `/assets`,
a CSP and the other security headers. `404.html` is served automatically.

```bash
npx vercel --prod
```

### Making the quote form deliver

`api/quote.js` validates server-side and drops honeypot spam, but **currently
only logs the lead**. To send it:

1. Set `RESEND_API_KEY` and `QUOTE_INBOX` in the Vercel project's environment
   variables.
2. Uncomment the delivery block in `api/quote.js`.

Any provider works — the block is a plain `fetch`. Until it's wired up the form
still validates and the front end still degrades to the phone number if the
request fails.

## Live details

Confirmed and in place: **0415 085 122** (`tel:+61415085122`) and
**info@annergy.com.au**.

Two things I inferred rather than were told — check them:

- [ ] **Domain** — set to `www.annergy.com.au` throughout (canonicals, OG tags,
      `sitemap.xml`, `robots.txt`), inferred from the email address.
- [ ] **Name** — page titles and schema say "Annergy Solar" (better for search);
      the logo and body copy say "Annergy". Change the titles if you'd rather be
      "Annergy" everywhere.

Still placeholder, and must be replaced:

- [ ] Address `Unit 4, 120 Kingsford Smith Drive, Hamilton QLD 4007`
- [ ] `ABN 00 000 000 000` and `QLD Electrical Contractor Licence 00000`
- [ ] Trading hours (Mon–Fri 7–5, Sat 8–1) in the footer and schema
- [ ] Stats: 2,400+ installs, 18.4 MW, 4.9/5 from 384 reviews, 22 staff, since 2013
- [ ] Prices: $5,290 / $7,890 / $9,690 and the $8,600 battery
- [ ] Three case studies and three testimonials — written to be realistic, but invented
- [ ] Accreditation claims (CEC Approved Retailer, Master Electricians, Energex)
- [ ] Privacy policy and terms — templates, need a lawyer's eye
- [ ] Analytics snippet — a marked comment slot is in `base.html`, nothing loads by default

The savings estimator's assumptions (4.2 kWh/kW/day, 33c import, 5c feed-in,
$1.15/day supply) are set at the top of `site.js` and are printed on the page
next to the result. If you change one, change it in both places and in
`terms.html`, which documents the model.
