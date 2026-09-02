#!/usr/bin/env python3
"""
Annergy Solar static build.

Reads src/pages/*.html (front matter + body), wraps each in src/partials/base.html,
writes plain HTML to the project root plus sitemap.xml. No dependencies.

    python3 build.py
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent
PAGES = ROOT / "src" / "pages"
BASE = (ROOT / "src" / "partials" / "base.html").read_text()
SITE = "https://annergy.com.au"

NAV_KEYS = ["home", "services", "pricing", "work", "faq"]


def parse(path):
    raw = path.read_text()
    m = re.match(r"^---\n(.*?)\n---\n", raw, re.S)
    if not m:
        sys.exit(f"{path.name}: missing front matter")
    meta = json.loads(m.group(1))
    return meta, raw[m.end():]


def url_path(slug):
    """Canonical path for a slug. The home page lives at / , not /index."""
    return "" if slug == "index" else slug


def render(meta, body):
    out = BASE
    schema = meta.get("schema")
    replacements = {
        "{{TITLE}}": meta["title"],
        "{{DESCRIPTION}}": meta["description"],
        "{{SLUG}}": url_path(meta["slug"]),
        "{{ROBOTS}}": meta.get("robots", "index, follow"),
        "{{HEAD_EXTRA}}": meta.get("head", ""),
        "{{HEADER_FLOAT}}": "true" if meta.get("headerFloat") else "false",
        "{{SCHEMA}}": json.dumps(schema, separators=(",", ":")) if schema else "{}",
        "{{BODY}}": body.strip(),
    }
    for key in NAV_KEYS:
        replacements["{{NAV_%s}}" % key.upper()] = (
            ' aria-current="page"' if meta.get("nav") == key else ""
        )
    for k, v in replacements.items():
        out = out.replace(k, v)
    return out


def main():
    pages = sorted(PAGES.glob("*.html"))
    if not pages:
        sys.exit("no pages found in src/pages")

    urls = []
    for path in pages:
        meta, body = parse(path)
        target = ROOT / (meta["slug"] + ".html")
        target.write_text(render(meta, body))
        print(f"  built {target.name:<16} {len(target.read_text()) // 1024} KB")
        if meta.get("robots", "index").startswith("index"):
            urls.append((url_path(meta["slug"]), meta.get("priority", "0.7"), meta.get("changefreq", "monthly")))

    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for slug, priority, freq in sorted(urls, key=lambda u: (-float(u[1]), u[0])):
        sitemap.append(
            f"  <url><loc>{SITE}/{slug}</loc>"
            f"<changefreq>{freq}</changefreq><priority>{priority}</priority></url>"
        )
    sitemap.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(sitemap) + "\n")
    print(f"  built sitemap.xml    {len(urls)} urls")


if __name__ == "__main__":
    main()
