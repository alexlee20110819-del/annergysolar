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

## Photography

Every photo on the site is a real `<img>` with `width`/`height` set and a
written `alt`. Most are still neutral placeholders — **to go live, replace the
file at the same path with a real photograph of the same aspect ratio, no code
changes needed:**

| File (in `assets/img/photos/`) | Size | Ratio | Shot needed |
|---|---|---|---|
| `residential.jpg` | 1200×900 | 4:3 | Crew on a tile roof, panels going down |
| `battery.jpg` | 1200×900 | 4:3 | Battery unit mounted in a garage |
| `commercial.jpg` | 1200×900 | 4:3 | Warehouse rooftop array, wide |
| `case-wavell-heights.jpg` | 1200×800 | 3:2 | Finished 13.2 kW array on a tile roof |
| `case-coorparoo.jpg` | 1200×800 | 3:2 | Queenslander rear pitch + battery |
| `case-geebung.jpg` | 1200×800 | 3:2 | 25 kW array on a childcare centre |
| `team.jpg` | 1400×880 | ~3:2 | The crew in front of a branded ute |

**`hero.jpg` is the one exception** — a real, licensed photo, not a
placeholder: [Unsplash photo 1600585154340-be6161a56a0c](https://unsplash.com/photos/be6161a56a0c),
used under the [Unsplash License](https://unsplash.com/license) (free for
commercial use, no permission required). It is self-hosted at
`assets/img/photos/hero.jpg` (2000×1333, re-encoded to ~380 KB) rather than
hotlinked, both so it survives if Unsplash ever changes the URL and because the
CSP in `.htaccess` (`img-src 'self' data:`) would block an external image
outright. It is deliberately excluded from `tools/make-placeholders.py`'s
manifest, so re-running that script will never overwrite it. Swap it for a real
photo of your own work whenever you have one — same path, similar aspect ratio.

Update the `alt` text in `src/pages/` when a placeholder is replaced: describe
what is actually in the frame. Once every placeholder is real, delete
`tools/make-placeholders.py`.

Shoot notes for the remaining placeholders: real crews, real Brisbane roofs,
daylight, no stock-looking poses. Photos of your own completed jobs beat
anything licensed.

## Brand

Redesigned around a reference mockup the client supplied (editorial,
architectural, warm paper stock) — a deliberate departure from generic
"AI-template" defaults, per the project brief.

The logo is the supplied artwork at `assets/img/annergy-logo.png` (260×59,
transparent, red). The header and footer use a **cropped icon-only version**,
`assets/img/mark.png` (the swoosh without the wordmark, transparent
background), paired with a fresh Syne-set "Annergy." text wordmark — the
literal logo file's own built-in wordmark uses a different, unrelated typeface
that would fight the site's type system. `tools/make-icons.py` builds both the
icon crop and the favicons from the same source PNG — re-run it if the logo is
ever replaced.

| | |
|---|---|
| Display typeface | Syne (700/800) |
| Text typeface | Source Sans 3 (400/600/700) |
| Paper | `#f3efe6` |
| Limestone (alt surface) | `#e4dcce` |
| Charcoal (ink / dark sections) | `#241f1c` |
| Copper (accent) | `#b56b42` — decorative fills only, not text |

One accent, used with intention: copper for calls to action, kickers, and key
figures. Sharp corners throughout (`--radius: 0`) — no rounded buttons, cards,
or inputs; that flat-edge quality is a deliberate part of this look, not a
placeholder for one that got missed.

**No dark mode.** The reference mockup is a fixed light aesthetic with
intentionally-dark *sections* (the hero photo, the CTA bands) rather than an
OS-preference toggle — bolting on `prefers-color-scheme` support would fight
that look rather than serve it, so it was left out on purpose.

The raw copper value fails WCAG AA as text (it's a fill colour); text and focus
rings use the **semantic** tokens instead:

- `--copper-deep` (`#8b4a22`) — copper as text on paper/limestone/white: 5.9–6.8:1
- `--copper-tint` (`#dc9569`) — copper as text/accent on charcoal or the hero
  photo: 6.6:1
- `--border` (`#8f826d`) — actual input/control borders, kept separate from the
  lighter `--line`, which is decorative-only and doesn't meet the 3:1 a real UI
  boundary needs

Every foreground/background pair was checked at WCAG AA, including text sitting
over the hero photo — the veil gradient there is intentionally strong and wide,
with a text-shadow as a second line of defence, so headline text stays legible
regardless of what's directly behind it in the photo.

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
**info@annergy.com.au**, at the bare domain **annergy.com.au** (not `www` — that
subdomain currently points elsewhere; see the DNS note further down if that's
ever revisited).

- **Legal entity** — ANN International Pty Ltd, trading as Annergy.
  ABN 39 628 044 360 / ACN 628 044 360, GST registered since 6 November 2019.
  Page titles keep saying "Annergy Solar" (reads better for search); the logo,
  nav and body copy say "Annergy" — that split is deliberate, not an
  inconsistency to fix.
- **Address** — 40 Mascar Street, Upper Mount Gravatt QLD 4122. Used in the
  footer, the Contact page, and the LocalBusiness schema on the home page.

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

- [ ] `QLD Electrical Contractor Licence 00000` — address and ABN are real now
      (see Live details above); this one is still a placeholder
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
