#!/usr/bin/env python3
"""Cuts the shipped images from the two committed source artworks.

  site/icon-source.png  →  public/icons/icon{16,48,128}.png, site/icon-180.png
  site/og-plate.png     →  site/og.png   (the plate, with the title laid over it)

Neither source is drawn here. `icon-source.png` is the mark — a mint tile with
an eighth note, simple enough to survive sixteen pixels — and `og-plate.png` is
the link card's backdrop, deliberately empty down its left half. Both were
generated once and committed, because an image that changes every time the
script runs is an image nobody can review.

**The type is laid on here, never generated.** An image model cannot be trusted
with Hangul: it produces letterforms that are almost right, which is worse than
wrong. The plate carries no text at all and the title is drawn below with a real
font.

Needs Noto Sans KR. On this machine that is a user font, so this runs locally
rather than in CI; the outputs are committed.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
ICONS = ROOT / "public" / "icons"

FONT = Path.home() / ".local/share/fonts/NotoSansKR.ttf"

# shadcn/ui dark, the same values the extension and the page use.
FOREGROUND = (250, 250, 250, 255)
MUTED = (161, 161, 161, 255)

SIZES = (16, 48, 128)


def font(size: int, weight: str) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(FONT), size)
    f.set_variation_by_name(weight)
    return f


def icons() -> None:
    src = Image.open(SITE / "icon-source.png").convert("RGBA")
    ICONS.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        src.resize((size, size), Image.LANCZOS).save(ICONS / f"icon{size}.png")
        print(f"icons/icon{size}.png")
    # Apple wants 180 and no transparency; a touch icon on a home screen is
    # composited onto white if it has any.
    touch = Image.new("RGB", (180, 180), (10, 10, 10))
    touch.paste(src.resize((180, 180), Image.LANCZOS), (0, 0), src.resize((180, 180), Image.LANCZOS))
    touch.save(SITE / "icon-180.png")
    print("site/icon-180.png")


def og() -> None:
    plate = Image.open(SITE / "og-plate.png").convert("RGBA")
    draw = ImageDraw.Draw(plate)

    mark = Image.open(SITE / "icon-source.png").convert("RGBA").resize((84, 84), Image.LANCZOS)
    x = 76
    plate.paste(mark, (x, 150), mark)

    draw.text((x, 268), "Easy Mode", font=font(80, "Bold"), fill=FOREGROUND)
    body = font(27, "Regular")
    draw.text((x, 372), "유튜브를 음악과 영상", font=body, fill=MUTED)
    draw.text((x, 410), "플레이어로 사용하는 확장", font=body, fill=MUTED)

    plate.convert("RGB").save(SITE / "og.png")
    print("site/og.png")


if __name__ == "__main__":
    icons()
    og()
