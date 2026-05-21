"""Generate PWA icons for BalansPLN."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = "/app/frontend/public"

# Brand colors
BG_PRIMARY = (30, 58, 47)        # forest green #1E3A2F
BG_MASKABLE = (244, 241, 237)    # bone white #F4F1ED
ACCENT = (224, 122, 95)          # terracotta #E07A5F
WHITE = (255, 255, 255)


def make_icon(size: int, path: str, maskable: bool = False) -> None:
    bg = BG_MASKABLE if maskable else BG_PRIMARY
    img = Image.new("RGBA", (size, size), bg)
    draw = ImageDraw.Draw(img)

    # Safe zone for maskable: keep glyph within 80% center
    safe_margin = int(size * 0.1) if maskable else 0

    # Rounded background tile (only for non-maskable, since maskable needs full fill)
    if not maskable:
        radius = int(size * 0.22)
        # Already full color background, draw subtle inner ring
        pass

    # Draw a stylized "B" mark — forest green tile with terracotta dot
    # Use simple geometric shapes for clean rendering at any size.

    cx, cy = size // 2, size // 2
    glyph_color = WHITE if not maskable else BG_PRIMARY
    accent_color = ACCENT

    # Draw a piggy bank–inspired shape using rectangles + circles:
    # A rounded body + small coin slot. Simple, recognizable at small sizes.
    body_w = int(size * 0.50)
    body_h = int(size * 0.36)
    body_x0 = cx - body_w // 2
    body_y0 = cy - body_h // 2 + int(size * 0.02)
    body_x1 = cx + body_w // 2
    body_y1 = cy + body_h // 2 + int(size * 0.02)
    body_radius = int(size * 0.10)

    draw.rounded_rectangle(
        [body_x0, body_y0, body_x1, body_y1],
        radius=body_radius,
        fill=glyph_color,
    )

    # Coin slot
    slot_w = int(size * 0.14)
    slot_h = int(size * 0.025)
    slot_x0 = cx - slot_w // 2
    slot_y0 = body_y0 + int(size * 0.04)
    draw.rounded_rectangle(
        [slot_x0, slot_y0, slot_x0 + slot_w, slot_y0 + slot_h],
        radius=int(slot_h / 2),
        fill=bg,
    )

    # Eye
    eye_r = int(size * 0.02)
    eye_cx = body_x1 - int(size * 0.10)
    eye_cy = body_y0 + int(size * 0.10)
    draw.ellipse(
        [eye_cx - eye_r, eye_cy - eye_r, eye_cx + eye_r, eye_cy + eye_r],
        fill=bg,
    )

    # Coin (terracotta accent)
    coin_r = int(size * 0.07)
    coin_cx = cx
    coin_cy = body_y0 - int(size * 0.04)
    draw.ellipse(
        [coin_cx - coin_r, coin_cy - coin_r, coin_cx + coin_r, coin_cy + coin_r],
        fill=accent_color,
    )

    img.save(path, "PNG", optimize=True)
    print(f"wrote {path}")


def make_favicon():
    src = Image.open(os.path.join(OUT_DIR, "icon-192.png")).convert("RGBA")
    src.resize((64, 64), Image.LANCZOS).save(
        os.path.join(OUT_DIR, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    print("wrote favicon.ico")


if __name__ == "__main__":
    make_icon(192, os.path.join(OUT_DIR, "icon-192.png"))
    make_icon(512, os.path.join(OUT_DIR, "icon-512.png"))
    make_icon(512, os.path.join(OUT_DIR, "icon-maskable.png"), maskable=True)
    # Apple touch icon (180x180 standard)
    make_icon(180, os.path.join(OUT_DIR, "apple-touch-icon.png"))
    make_favicon()
