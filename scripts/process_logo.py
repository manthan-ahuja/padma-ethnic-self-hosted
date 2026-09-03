from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SOURCE = Path(r"C:\Users\Manthan\padma-ethnic\assets\padma.png")
OUT = Path(r"C:\Users\Manthan\padma-ethnic\public\brand")
OUT.mkdir(parents=True, exist_ok=True)


def make_transparent(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    alpha = Image.new("L", rgb.size)
    source = rgb.load()
    mask = alpha.load()

    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = source[x, y]
            high, low = max(r, g, b), min(r, g, b)
            chroma = high - low
            average = (r + g + b) / 3

            # The paper texture is warm but nearly neutral. The artwork is
            # intentionally chromatic (rose, gold-brown and teal), including
            # its anti-aliased edges, so chroma cleanly separates the two.
            value = max(0, min(255, int((chroma - 17) * 13)))
            if chroma < 18:
                value = 0
            mask[x, y] = value

    alpha = alpha.filter(ImageFilter.GaussianBlur(0.35))
    result = rgb.convert("RGBA")
    result.putalpha(alpha)
    return result


def crop_to_content(image: Image.Image, padding: int = 18) -> Image.Image:
    box = image.getchannel("A").getbbox()
    if not box:
        raise RuntimeError("Logo extraction produced an empty image")
    left, top, right, bottom = box
    return image.crop((
        max(0, left - padding),
        max(0, top - padding),
        min(image.width, right + padding),
        min(image.height, bottom + padding),
    ))


original = Image.open(SOURCE)
original.save(OUT / "padma-logo-original.png", optimize=True)

content_source = original.crop((420, 45, 1120, 730))
transparent = crop_to_content(make_transparent(content_source), 16)

# Update only the derived web lockup; the supplied 2024 source remains intact.
year_clear = Image.new("L", transparent.size, 255)
ImageDraw.Draw(year_clear).rectangle((205, 625, 385, 682), fill=0)
transparent.putalpha(Image.composite(transparent.getchannel("A"), Image.new("L", transparent.size, 0), year_clear))
year_font_path = Path(r"C:\Windows\Fonts\georgia.ttf")
year_font = ImageFont.truetype(str(year_font_path), 23) if year_font_path.exists() else ImageFont.load_default()
year_draw = ImageDraw.Draw(transparent)
year_draw.text((295, 650), "Est. 2026", font=year_font, fill=(118, 77, 38, 255), anchor="mm")
transparent.save(OUT / "padma-logo-transparent.png", optimize=True)

# The lotus is the compact brand device used where the full bilingual lockup
# would become too small: navigation, app icon, and browser favicon.
lotus_source = original.crop((545, 48, 865, 278))
lotus = make_transparent(lotus_source)
lotus_alpha = lotus.getchannel("A")
lotus_mask = lotus_alpha.load()
for y in range(lotus.height):
    for x in range(lotus.width):
        if y > 158:
            inset = min(105, int((y - 158) * 1.35))
            if x < inset or x >= lotus.width - inset:
                lotus_mask[x, y] = 0
lotus.putalpha(lotus_alpha)
lotus = crop_to_content(lotus, 10)
lotus.save(OUT / "padma-lotus.png", optimize=True)

canvas = Image.new("RGBA", (512, 512), (247, 242, 232, 255))
lotus_copy = lotus.copy()
lotus_copy.thumbnail((390, 390), Image.Resampling.LANCZOS)
canvas.alpha_composite(lotus_copy, ((512 - lotus_copy.width) // 2, (512 - lotus_copy.height) // 2))
canvas.save(OUT / "icon.png", optimize=True)

print("full", transparent.size, "alpha", transparent.getchannel("A").getextrema())
print("lotus", lotus.size, "alpha", lotus.getchannel("A").getextrema())
print("icon", canvas.size)
