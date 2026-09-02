# Annergy Solar

Marketing site for a Brisbane solar and battery installer. Static HTML, no
framework, no build dependencies. the only tooling is Python 3 from the
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
    assets/img/photos/      photo slots (placeholders. see below)
    api/quote.js            Vercel serverless function for the quote form
    build.py                generator
    serve.py                local preview (mirrors Vercel's cleanUrls + 404)
    tools/                  icon and placeholder generators

**Edit `src/`, never the root `.html` files**. they are overwritten on every
build. Front matter drives the title, meta description, canonical URL, sitemap
priority and JSON-LD.

## Photography

Every photo on the site is a real `<img>` with `width`/`height` set and a
written `alt`. Most are still neutral placeholders. **to go live, replace the
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

**`hero.jpg` is the one exception**. a real, licensed photo, not a
placeholder: [Unsplash photo 1613665813446-82a78c468a1d](https://unsplash.com/photos/82a78c468a1d)
(commercial rooftop array at sunrise), used under the
[Unsplash License](https://unsplash.com/license) (free for commercial use, no
permission required). It is self-hosted at `assets/img/photos/hero.jpg`
(2000×1353, re-encoded to ~240 KB) rather than hotlinked, both so it survives if
Unsplash ever changes the URL and because the CSP in `vercel.json`
(`img-src 'self' data:`) would block an external image outright.

The hero veil is weighted to the bottom-left, where the copy sits, so that block
stays legible while the top-right of the photograph is left alone to be seen. If
you swap the hero for a photo with a *bright* bottom-left, check the headline
still reads. the `text-shadow` on `.hero h1` is a backstop, not a guarantee.

The hero is deliberately excluded from `tools/make-placeholders.py`'s manifest,
so re-running that script will never overwrite it. Swap it for a real photo of
your own work whenever you have one. same path, similar aspect ratio.

Update the `alt` text in `src/pages/` when a placeholder is replaced: describe
what is actually in the frame. Once every placeholder is real, delete
`tools/make-placeholders.py`.

Shoot notes for the remaining placeholders: real crews, real Brisbane roofs,
daylight, no stock-looking poses. Photos of your own completed jobs beat
anything licensed.

## Brand

Redesigned around a reference mockup the client supplied (editorial,
architectural, warm paper stock). a deliberate departure from generic
"AI-template" defaults, per the project brief.

The logo is the supplied artwork at `assets/img/annergy-logo.png` (260×59,
transparent, red). The header and footer use a **cropped icon-only version**,
`assets/img/mark.png` (the swoosh without the wordmark, transparent
background), paired with a fresh Syne-set "Annergy." text wordmark. the
literal logo file's own built-in wordmark uses a different, unrelated typeface
that would fight the site's type system. `tools/make-icons.py` builds both the
icon crop and the favicons from the same source PNG. re-run it if the logo is
ever replaced.

| | |
|---|---|
| Display typeface | Syne (700/800). **h1/h2 and numerals only** |
| Text typeface | Source Sans 3 (400/600/700). everything you read |
| Paper | `#f3efe6` |
| Limestone (alt surface) | `#e4dcce` |
| Charcoal (ink / dark sections) | `#241f1c` |
| Copper (accent) | `#b56b42`. decorative fills only, not text |

One accent, used with intention: copper for calls to action, kickers, and key
figures.

**Syne is deliberately restricted.** It reads well large, short and bold, and
turns to mush at paragraph-heading sizes. so it is confined to `h1`/`h2`, big
numerals (stats, prices, payback figures) and the wordmark. `h3`/`h4`, FAQ
questions and pull-quotes are set in Source Sans 3. If you add a component with
a heading that is a full sentence, it belongs in the text face.

Corners are softened to echo the logo's curves, on a four-step scale that every
component routes through. no component hardcodes a radius, so the whole feel is
four edits:

| Token | Value | Used for |
|---|---|---|
| `--radius-sm` | 10px | inputs, small controls, icon chips |
| `--radius` | 16px | cards, panels, figures |
| `--radius-lg` | 24px | large surfaces, feature photos |
| `--radius-pill` | 999px | buttons, tags, service-area chips |

The full-bleed hero photo is the one deliberate exception. it runs edge to edge,
so it stays square.

**No dark mode.** The reference mockup is a fixed light aesthetic with
intentionally-dark *sections* (the hero photo, the CTA bands) rather than an
OS-preference toggle. bolting on `prefers-color-scheme` support would fight
that look rather than serve it, so it was left out on purpose.

The raw copper value fails WCAG AA as text (it's a fill colour); text and focus
rings use the **semantic** tokens instead:

- `--copper-deep` (`#8b4a22`). copper as text on paper/limestone/white: 5.9–6.8:1
- `--copper-tint` (`#dc9569`). copper as text/accent on charcoal or the hero
  photo: 6.6:1
- `--border` (`#8f826d`). actual input/control borders, kept separate from the
  lighter `--line`, which is decorative-only and doesn't meet the 3:1 a real UI
  boundary needs

Every foreground/background pair was checked at WCAG AA. Text over the hero
photo is handled by the veil described above plus a `text-shadow`, rather than
by a contrast ratio that can be computed once. a photograph's local luminance
varies, so that pairing is verified by looking at it, not by arithmetic.

The OG card is generated from `assets/img/og.svg` (which embeds the logo):

    qlmanage -t -s 1200 -o /tmp assets/img/og.svg
    sips -c 630 1200 /tmp/og.svg.png --out /tmp/crop.png
    sips -s format jpeg -s formatOptions 84 /tmp/crop.png --out assets/img/og.jpg

## Deploying to Vercel

This is the live path. `vercel.json` handles clean URLs, the security headers
and the caching split; `api/quote.js` is the contact form handler.

```bash
npx vercel --prod
```

**Only one handler may live in `api/`.** Vercel routes by filename without the
extension, so `api/quote.js` and `api/quote.php` both map to `/api/quote` and
the deploy is rejected with a path-conflict error. The PHP handler and the
Apache `.htaccess` were removed when the site moved to Vercel; if you ever move
back to cPanel hosting, recover them from git history (they were last present
at commit `931fdc2`) rather than writing them again.

### The quote form needs two environment variables

`api/quote.js` validates server-side, drops honeypot spam, and emails the lead.
It will not send until both of these are set in the Vercel project:

    RESEND_API_KEY   an API key from resend.com
    QUOTE_INBOX      where leads land, e.g. info@annergy.com.au

You also need to verify `annergy.com.au` as a sending domain in Resend, since
the function sends `from: website@annergy.com.au`.

Until both are set the handler returns **503** and tells the visitor to phone.
That is deliberate. Returning a cheerful "thanks, we got it" and dropping the
lead is the worst thing a quote form on a trades site can do, because nobody
notices for weeks. Every lead is also written to the error log first, so a
failed send is still recoverable from the Vercel function logs.

Behaviour verified end to end:

| Situation | Visitor sees |
|---|---|
| Not configured (no env vars) | 503, "call 0416 085 122 instead" |
| Provider rejects the send | 502, same message, lead written to the log |
| Missing or invalid fields | 400, the specific fields highlighted |
| Wrong method / honeypot filled | 405 / silent 200 |
| Configured and sending | "Thanks, your request is in", form clears |

The form also carries the visitor's intent. Specific CTAs link to
`/contact?enquiry=commercial` (or `battery`, `ev`, `service`, `question`),
which pre-selects the matching option and puts it in the email subject, so
leads are triageable from the inbox list without opening them.

## Live details

Confirmed and in place: **0416 085 122** (`tel:+61416085122`) and
**info@annergy.com.au**, at the bare domain **annergy.com.au** (not `www`. that
subdomain currently points elsewhere; see the DNS note further down if that's
ever revisited).

- **Legal entity**. ANN International Pty Ltd, trading as Annergy.
  ABN 39 628 044 360 / ACN 628 044 360, GST registered since 6 November 2019.
  Page titles keep saying "Annergy Solar" (reads better for search); the logo,
  nav and body copy say "Annergy". that split is deliberate, not an
  inconsistency to fix.
- **Address**. 40 Mascar Street, Upper Mount Gravatt QLD 4122. Used in the
  footer, the Contact page, and the LocalBusiness schema on the home page.

### Confirmed business details

Supplied and now reflected throughout the site:

- **Panels**. Jinko Solar, HT-SAAE, ET Solar, Akcome, Seraphim
- **Inverters**. SMA, Fronius, Sungrow, Growatt, Huawei
- **Battery storage**. offered, deliberately brand-neutral in the copy (no battery
  supplier was specified, so nothing names a battery manufacturer anywhere)
- **Scope**. residential plus small commercial to about 30 kW. The site previously
  claimed 30–500 kW and a 99 kW warehouse case study; both are gone.
- **Service area**. Brisbane and South East Queensland. Energex is named as the
  distributor throughout, which is correct for SEQ only. if you ever work outside
  that footprint, those references need generalising.

Named equipment lives in one place, `src/pages/services.html` under `#equipment`,
plus shorter mentions on the home and pricing pages. Add or drop a brand there first.

### Claims removed as false. Do not put them back without evidence

The following were invented during the build and have been taken out. If any
turn out to be true, they can return, but each needs a source:

- **Electrical contractor licence.** Removed everywhere. The company hires
  electricians rather than holding a contractor licence itself, so the licence
  claim and the "no subcontracted crews" line were both wrong.
- **Review rating.** The `aggregateRating` schema claimed 4.9 from 384 reviews.
  That is a machine-readable claim to Google. Fake review markup breaches
  Google's structured data guidelines, and in Australia the ACCC actively
  pursues fabricated reviews. **Do not restore this without a real review
  count from a real platform.**
- **Install counts and capacity.** "2,400+ systems", "18.4 MW", "22 staff",
  "11 day median" all removed.
- **The About page.** Deleted outright at the client's instruction. Its
  content was fiction. The nav, footer and sitemap no longer reference it.

Confirmed real and now in use: founded **2019** (consistent with the GST
registration date), the Upper Mount Gravatt address, the ABN, the phone and
email, and the panel and inverter brands.

Still invented and still live, flagged for replacement:

- Three case studies on `/work` and three testimonials on the home page. These
  carry the same risk as the review rating if published as fact.
- The "10 year workmanship warranty" and "48 hour quote" commitments. These are
  policy choices rather than historical claims, so they are true the moment you
  decide to offer them, but they should be a deliberate decision.

### Still placeholder, and must be replaced

- [ ] Trading hours (Mon–Fri 7–5, Sat 8–1) in the footer and schema
- [ ] Stats: 2,400+ installs, 18.4 MW, 4.9/5 from 384 reviews, 22 staff, since 2013
- [ ] Prices: $5,290 / $7,890 / $9,690 and the $8,600 battery
- [ ] Three case studies and three testimonials. written to be realistic, but invented
- [ ] Accreditation claims (CEC Approved Retailer, Master Electricians, Energex)
- [ ] Panel wattage (440 W) and the exact inverter model per package on the pricing page
- [ ] Privacy policy and terms. templates, need a lawyer's eye
- [ ] Analytics snippet. a marked comment slot is in `base.html`, nothing loads by default

The savings estimator's assumptions (4.2 kWh/kW/day, 33c import, 5c feed-in,
$1.15/day supply) are set at the top of `site.js` and are printed on the page
next to the result. If you change one, change it in both places and in
`terms.html`, which documents the model.
