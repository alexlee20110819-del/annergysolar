#!/usr/bin/env python3
"""
Generate neutral placeholder images for every photo slot on the site.

Each one is written at the exact dimensions the layout expects, so replacing a
placeholder with a real photograph of the same name needs no code changes —
just keep the aspect ratio. Delete this script once every slot is real.

    python3 tools/make-placeholders.py

Requires macOS (qlmanage + sips) to rasterise. The manifest below is the single
source of truth for what photo goes where; it is mirrored in README.md.
"""
import pathlib
import subprocess
import tempfile

OUT = pathlib.Path("assets/img/photos")

# slug, width, height, subject brief, where it appears
MANIFEST = [
    ("residential",         1200, 900, "Crew on a tile roof, panels going down",      "Services — residential"),
    ("battery",             1200, 900, "Battery unit mounted in a garage",            "Services — battery"),
    ("commercial",          1200, 900, "Warehouse rooftop array, wide shot",          "Services — commercial"),
    ("case-wavell-heights", 1200, 800, "Finished 13.2 kW array on a tile roof",       "Our Work — case 1"),
    ("case-coorparoo",      1200, 800, "Queenslander rear pitch + Powerwall",         "Our Work — case 2"),
    ("case-geebung",        1200, 800, "99 kW warehouse array from above",            "Our Work — case 3"),
    ("install-day",         1600, 900, "Crew and van on site, install day",          "Home. how it works"),
    ("switchboard",         1200, 900, "Switchboard and inverter, neatly finished",  "Services. quality of finish"),
    ("roof-survey",         1200, 900, "Measuring up a roof at the assessment",      "Pricing. what drives cost"),
    ("panels-detail",       1600, 900, "Close detail of panels and rail on tin",     "FAQ. section break"),
]

SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">
  <rect width="{S}" height="{S}" fill="#e6e0d5"/>
  <g transform="translate(0,{oy})">
    <rect width="{W}" height="{H}" fill="#e6e0d5"/>
    <rect x="1" y="1" width="{W2}" height="{H2}" fill="none" stroke="#cdc4b4" stroke-width="2"/>
    <g transform="translate({cx},{cy})" fill="none" stroke="#b3a893" stroke-width="{sw}"
       stroke-linecap="round" stroke-linejoin="round">
      <rect x="{gx}" y="{gy}" width="{gw}" height="{gh}" rx="{gr}"/>
      <path d="M{lx} {ly}h{lw}l{lh} -{lh}"/>
      <circle cx="{ccx}" cy="{ccy}" r="{cr}"/>
    </g>
    <text x="{tx}" y="{ty}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
          font-size="{fs}" font-weight="600" fill="#8a7f6b">{subject}</text>
    <text x="{tx}" y="{ty2}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
          font-size="{fs2}" fill="#a89c86">{W} x {H}  ·  photos/{slug}.jpg</text>
  </g>
</svg>"""


def build(slug, w, h, subject, label_y=0.62):
    s = max(w, h)
    oy = (s - h) // 2
    scale = w / 1200
    gw, gh = int(150 * scale), int(108 * scale)
    icon_y = max(label_y - 0.28, 0.12)
    svg = SVG.format(
        S=s, W=w, H=h, W2=w - 2, H2=h - 2, oy=oy,
        cx=w // 2 - gw // 2, cy=int(h * icon_y),
        sw=max(2, int(4 * scale)),
        gx=0, gy=0, gw=gw, gh=gh, gr=int(10 * scale),
        lx=int(18 * scale), ly=int(88 * scale), lw=int(52 * scale), lh=int(34 * scale),
        ccx=int(gw * 0.68), ccy=int(gh * 0.38), cr=int(20 * scale),
        tx=w // 2, ty=int(h * label_y), ty2=int(h * label_y) + int(38 * scale),
        fs=int(34 * scale), fs2=int(24 * scale),
        subject=subject, slug=slug)

    with tempfile.TemporaryDirectory() as tmp:
        t = pathlib.Path(tmp)
        (t / "p.svg").write_text(svg)
        subprocess.run(["qlmanage", "-t", "-s", str(s), "-o", str(t), str(t / "p.svg")],
                       capture_output=True, check=True)
        png = t / "p.svg.png"
        if not png.exists():
            raise SystemExit(f"qlmanage produced nothing for {slug}")
        crop = t / "c.png"
        subprocess.run(["sips", "-c", str(h), str(w), str(png), "--out", str(crop)],
                       capture_output=True, check=True)
        subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "70",
                        str(crop), "--out", str(OUT / f"{slug}.jpg")],
                       capture_output=True, check=True)


# Full-bleed heroes carry real overlaid copy at the BOTTOM of the frame
# (see the .hero component) — keep the placeholder's own caption near the
# top so the two don't collide.
LABEL_Y = {}  # per-slug overrides, if a future placeholder needs one


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, w, h, subject, where in MANIFEST:
        build(slug, w, h, subject, LABEL_Y.get(slug, 0.62))
        size = (OUT / f"{slug}.jpg").stat().st_size // 1024
        print(f"  {slug + '.jpg':<28} {w}x{h:<5} {size:>3} KB   {where}")


if __name__ == "__main__":
    main()
