#!/usr/bin/env python3
"""Generates the extension icons: an eighth note on a teal tile.

Drawn at 4x and downsampled, because Pillow's shapes are aliased and a 16px
icon has no pixels to spare on a jagged edge. Two tones only: at sixteen
pixels a third one turns into mud.
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "icons"
SIZES = (16, 48, 128)

TILE = (148, 226, 213, 255)   # teal
INK = (17, 17, 27, 255)       # crust


def draw(size: int) -> Image.Image:
    s = size * 4
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, s - 1, s - 1), radius=s * 0.22, fill=TILE)
    # Eighth note: head, stem, flag.
    u = s / 32
    d.ellipse((8 * u, 19 * u, 16 * u, 25 * u), fill=INK)
    d.rectangle((14.4 * u, 6 * u, 16.4 * u, 22 * u), fill=INK)
    d.polygon(
        [(16.4 * u, 6 * u), (23 * u, 10.5 * u), (23 * u, 16 * u),
         (20.5 * u, 12.5 * u), (16.4 * u, 10.5 * u)],
        fill=INK,
    )
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        draw(size).save(OUT / f"icon{size}.png")
        print(f"icons/icon{size}.png")


if __name__ == "__main__":
    main()
