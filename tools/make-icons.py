#!/usr/bin/env python3
"""
Build the favicon set from the Annergy logo mark.

Crops the swoosh out of assets/img/annergy-logo.png, scales it, and centres it
on a rounded ink tile. Re-run after replacing the logo.

    python3 tools/make-icons.py
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import pngkit

SRC = "assets/img/annergy-logo.png"
INK = (18, 24, 28)
SIZES = {"assets/img/favicon-32.png": 32,
         "assets/img/favicon-192.png": 192,
         "assets/img/apple-touch-icon.png": 180}


def bbox(w, h, n, px, x0, x1):
    top, bot = h, 0
    for y in range(h):
        for x in range(x0, x1):
            if px[(y * w + x) * n + 3] > 24:
                top = min(top, y)
                bot = max(bot, y + 1)
                break
    return top, bot


def sample(w, h, n, px, fx, fy):
    """Bilinear sample, returning RGBA floats."""
    x0, y0 = int(fx), int(fy)
    x1, y1 = min(x0 + 1, w - 1), min(y0 + 1, h - 1)
    dx, dy = fx - x0, fy - y0
    out = []
    for c in range(4):
        def at(x, y):
            o = (y * w + x) * n
            return px[o + c] if c < n else 255
        top = at(x0, y0) * (1 - dx) + at(x1, y0) * dx
        bottom = at(x0, y1) * (1 - dx) + at(x1, y1) * dx
        out.append(top * (1 - dy) + bottom * dy)
    return out


def build(size, mark, pad_ratio=0.17, radius_ratio=0.22):
    mw, mh, mn, mpx = mark
    canvas = bytearray(size * size * 4)
    inner = size * (1 - pad_ratio * 2)
    scale = min(inner / mw, inner / mh)
    dw, dh = mw * scale, mh * scale
    ox, oy = (size - dw) / 2, (size - dh) / 2
    r = size * radius_ratio

    for y in range(size):
        for x in range(size):
            # rounded-rect mask with 1px antialiasing
            cx = min(max(x + .5, r), size - r)
            cy = min(max(y + .5, r), size - r)
            d = ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2) ** .5
            tile_a = max(0.0, min(1.0, (r - d) + .5)) if d > r - 1 else 1.0
            if tile_a <= 0:
                continue

            rr, gg, bb = INK
            aa = tile_a
            if ox <= x < ox + dw and oy <= y < oy + dh:
                s = sample(mw, mh, mn, mpx, (x - ox) / scale, (y - oy) / scale)
                sa = s[3] / 255
                if sa > 0:
                    rr = s[0] * sa + rr * (1 - sa)
                    gg = s[1] * sa + gg * (1 - sa)
                    bb = s[2] * sa + bb * (1 - sa)
            o = (y * size + x) * 4
            canvas[o:o + 4] = bytes((int(rr), int(gg), int(bb), int(aa * 255)))
    return canvas


def main():
    w, h, n, px = pngkit.read(SRC)
    x0, x1 = 5, 106                       # swoosh mark, before the wordmark
    top, bot = bbox(w, h, n, px, x0, x1)
    mw, mh = x1 - x0, bot - top
    mark_px = bytearray()
    for y in range(top, bot):
        o = (y * w + x0) * n
        mark_px += px[o:o + mw * n]
    print(f"mark cropped: {mw}x{mh} (rows {top}-{bot})")

    for path, size in SIZES.items():
        pngkit.write(path, size, size, build(size, (mw, mh, n, mark_px)))
        print(f"  wrote {path} ({size}px)")


if __name__ == "__main__":
    main()
