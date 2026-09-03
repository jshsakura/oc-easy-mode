#!/usr/bin/env python3
"""Draws the mark and cuts the shipped images from it.

  public/icons/icon{16,48,128}.png   the toolbar
  site/icon-180.png                  apple-touch icon
  site/og.png                        the link card, with the title laid over it

**The mark is drawn here, not generated.** Three attempts at having an image
model make one produced things that were fine on their own and wrong as a
family member. The sibling extension (oc-ad-bye-pass) builds its icon in three
layers — a purple tile, a dark shape inside it, a peach glyph inside that —
and its exact colours are sampled below. Easy Mode uses the same three layers
with a circle where the sibling has a shield, and a play triangle where it has
a sparkle. Same family, different product.

Drawn at 8x and downsampled, because Pillow's shapes are aliased and a 16px
icon has no pixels to spare on a jagged edge.

The type on the link card is laid on with a real font. An image model cannot
be trusted with Hangul: it produces letterforms that are almost right, which
is worse than wrong.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
ICONS = ROOT / "public" / "icons"

FONT = Path.home() / ".local/share/fonts/NotoSansKR.ttf"

# Sampled from oc-ad-bye-pass/public/icons/icon128.png.
PURPLE = (126, 77, 197, 255)
DARK = (24, 24, 37, 255)
PEACH = (250, 179, 135, 255)

FOREGROUND = (250, 250, 250, 255)
MUTED = (161, 161, 161, 255)

SIZES = (16, 48, 128)
S = 512
UP = 8


def mark() -> Image.Image:
    """The three layers, drawn large and brought down."""
    n = S * UP
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 1. The tile. 22% radius, the same corner the sibling uses.
    d.rounded_rectangle((0, 0, n - 1, n - 1), radius=int(n * 0.22), fill=PURPLE)

    # 2. The dark shape. A circle, where the sibling has a shield.
    pad = n * 0.17
    d.ellipse((pad, pad, n - pad, n - pad), fill=DARK)

    # 3. The glyph. A play triangle, nudged right of centre because a triangle
    #    centred by its bounding box reads as sitting too far left.
    c = n / 2
    r = n * 0.165
    nudge = r * 0.16
    d.polygon(
        [
            (c - r * 0.72 + nudge, c - r),
            (c - r * 0.72 + nudge, c + r),
            (c + r * 0.95 + nudge, c),
        ],
        fill=PEACH,
    )

    return img.resize((S, S), Image.LANCZOS)


def font(size: int, weight: str) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(FONT), size)
    f.set_variation_by_name(weight)
    return f


def icons(src: Image.Image) -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        src.resize((size, size), Image.LANCZOS).save(ICONS / f"icon{size}.png")
        print(f"icons/icon{size}.png")
    src.save(SITE / "icon-source.png")
    src.resize((128, 128), Image.LANCZOS).save(SITE / "icon-128.png")
    # Apple wants 180 and no transparency: a touch icon is composited onto
    # white if it has any.
    big = src.resize((180, 180), Image.LANCZOS)
    touch = Image.new("RGB", (180, 180), DARK[:3])
    touch.paste(big, (0, 0), big)
    touch.save(SITE / "icon-180.png")
    print("site/icon-180.png, site/icon-128.png, site/icon-source.png")


def og(src: Image.Image) -> None:
    plate = Image.open(SITE / "og-plate.png").convert("RGBA")
    draw = ImageDraw.Draw(plate)

    small = src.resize((84, 84), Image.LANCZOS)
    x = 76
    plate.paste(small, (x, 150), small)

    draw.text((x, 268), "Easy Mode", font=font(80, "Bold"), fill=FOREGROUND)
    body = font(27, "Regular")
    draw.text((x, 372), "유튜브를 음악과 영상", font=body, fill=MUTED)
    draw.text((x, 410), "플레이어로 사용하는 확장", font=body, fill=MUTED)

    plate.convert("RGB").save(SITE / "og.png")
    print("site/og.png")


if __name__ == "__main__":
    m = mark()
    icons(m)
    og(m)
