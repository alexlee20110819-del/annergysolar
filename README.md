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

## Deploying to HostPapa (cPanel), plain Apache hosting

This is the version currently in use: no Vercel, no Node — `.htaccess` does the
clean URLs and headers that `vercel.json` did on Vercel, and `api/quote.php`
replaces the Node serverless function. Both were tested against a real local
Apache 2.4 instance (mod_rewrite, mod_headers, mod_expires, mod_deflate) before
shipping, not just eyeballed.

**Upload, via cPanel → File Manager:**

1. Run `python3 build.py` locally first, so the root-level `.html` files are
   current.
2. Select every file and folder in the project root **except** `src/`,
   `serve.py`, `build.py`, `tools/`, `README.md`, `.git/`, `.gitignore` —
   those are build-time/dev only and don't need to go on the server.
   That leaves: all the `.html` files, `.htaccess`, `robots.txt`,
   `sitemap.xml`, `site.webmanifest`, `assets/`, `api/`.
3. Zip them, upload the zip into `public_html` via File Manager, then use
   File Manager's **Extract** so the files land directly in `public_html`
   (not inside a subfolder).
4. Visit the domain — it should serve the real site immediately, no DNS
   change needed, since this is the same server your domain already
   resolves to.

**The contact form needs one thing confirmed:** `api/quote.php` sends via
PHP's `mail()` to `info@annergy.com.au` from `website@annergy.com.au`. Check
that `website@annergy.com.au` is a real mailbox or alias on this hosting
account — some mail setups reject a `From:` address that doesn't exist,
routing it to spam or rejecting the send outright. If leads stop arriving,
check the inbox's spam folder first, then the PHP error log (cPanel → Errors,
or `~/logs/`) — every lead is written there before a send is attempted, so
nothing is silently lost even if delivery fails.

## Deploying to Vercel (alternative — not the current path)

Push to Vercel — `vercel.json` sets clean URLs, immutable caching on `/assets`,
a CSP and the other security headers. `404.html` is served automatically.

```bash
npx vercel --prod
```

### The quote form — READ THIS BEFORE LAUNCH

The form asks for four things: name, phone and postcode (required) plus an
optional email. Everything else is asked on the call.

`api/quote.js` validates server-side, drops honeypot spam, and emails the lead.
**It needs two environment variables in the Vercel project or it will not send:**

    RESEND_API_KEY   an API key from resend.com
    QUOTE_INBOX      where leads land, e.g. info@annergy.com.au

You also need to verify `annergy.com.au` as a sending domain in Resend, because
the function sends `from: website@annergy.com.au`.

Until both variables are set, the handler returns **503** and tells the visitor
to phone instead. That is deliberate. It would be easy to return a cheerful
"thanks, we got it" and quietly drop the lead into a log file, and that is the
single worst thing a quote form on a trades site can do — nobody notices for
weeks. Every lead is also written to the error log, so if delivery ever breaks
the enquiry is still recoverable from the Vercel function logs.

Using a different provider? Replace the `deliver()` function; nothing else
changes.

Behaviour verified end to end:

| Situation | Visitor sees |
|---|---|
| Not configured (no env vars) | 503 — "call 0416 085 122 instead" |
| Provider rejects the send | 502 — same message, lead written to the log |
| Missing or invalid fields | 400 — the specific fields highlighted |
| Wrong method / honeypot filled | 405 / silent 200 |
| Configured and sending | "Thanks — your request is in", form clears |

## Live details

Confirmed and in place: **0416 085 122** (`tel:+61416085122`) and
**info@annergy.com.au**.

Two things I inferred rather than were told — check them:

- [ ] **Domain** — set to `www.annergy.com.au` throughout (canonicals, OG tags,
      `sitemap.xml`, `robots.txt`), inferred from the email address.
- [ ] **Name** — page titles and schema say "Annergy Solar" (better for search);
      the logo and body copy say "Annergy". Change the titles if you'd rather be
      "Annergy" everywhere.

### Confirmed business details

Supplied and now reflected throughout the site:

- **Panels** — Jinko Solar, HT-SAAE, ET Solar, Akcome, Seraphim
- **Inverters** — SMA, Fronius, Sungrow, Growatt, Huawei
- **Battery storage** — offered, deliberately brand-neutral in the copy (no battery
  supplier was specified, so nothing names a battery manufacturer anywhere)
- **Scope** — residential plus small commercial to about 30 kW. The site previously
  claimed 30–500 kW and a 99 kW warehouse case study; both are gone.
- **Service area** — Brisbane and South East Queensland. Energex is named as the
  distributor throughout, which is correct for SEQ only — if you ever work outside
  that footprint, those references need generalising.

Named equipment lives in one place, `src/pages/services.html` under `#equipment`,
plus shorter mentions on the home and pricing pages. Add or drop a brand there first.

### Still placeholder, and must be replaced

- [ ] Address `Unit 4, 120 Kingsford Smith Drive, Hamilton QLD 4007`
- [ ] `ABN 00 000 000 000` and `QLD Electrical Contractor Licence 00000`
- [ ] Trading hours (Mon–Fri 7–5, Sat 8–1) in the footer and schema
- [ ] Stats: 2,400+ installs, 18.4 MW, 4.9/5 from 384 reviews, 22 staff, since 2013
- [ ] Prices: $5,290 / $7,890 / $9,690 and the $8,600 battery
- [ ] Three case studies and three testimonials — written to be realistic, but invented
- [ ] Accreditation claims (CEC Approved Retailer, Master Electricians, Energex)
- [ ] Panel wattage (440 W) and the exact inverter model per package on the pricing page
- [ ] Privacy policy and terms — templates, need a lawyer's eye
- [ ] Analytics snippet — a marked comment slot is in `base.html`, nothing loads by default

The savings estimator's assumptions (4.2 kWh/kW/day, 33c import, 5c feed-in,
$1.15/day supply) are set at the top of `site.js` and are printed on the page
next to the result. If you change one, change it in both places and in
`terms.html`, which documents the model.
