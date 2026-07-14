from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "assets"
SOURCE = ASSETS / "file-js.png"
FONT_PATH = Path("C:/Windows/Fonts/arialbd.ttf")
LABEL_BOX = (262, 962, 824, 1254)

ICONS = {
    "file-ts.png": ((112, 172, 255), "ts"),
    "file-py.png": ((197, 158, 255), "py"),
}


def recolor_background(image: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    result = image.convert("RGB")
    pixels = result.load()

    for y in range(result.height):
        for x in range(result.width):
            red, green, blue = pixels[x, y]
            if red > 145 and green > 120 and blue < 175:
                brightness = max(red, green, blue) / 255
                pixels[x, y] = tuple(min(255, round(channel * brightness)) for channel in color)

    return result


def write_icon(filename: str, color: tuple[int, int, int], label: str) -> None:
    with Image.open(SOURCE) as source:
        image = recolor_background(source, color)

    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(LABEL_BOX, radius=62, fill=(24, 24, 24))

    font = ImageFont.truetype(str(FONT_PATH), 214)
    bounds = draw.textbbox((0, 0), label, font=font)
    text_width = bounds[2] - bounds[0]
    text_height = bounds[3] - bounds[1]
    center_x = (LABEL_BOX[0] + LABEL_BOX[2]) / 2
    center_y = (LABEL_BOX[1] + LABEL_BOX[3]) / 2
    position = (center_x - text_width / 2, center_y - text_height / 2 - bounds[1])
    draw.text(position, label, font=font, fill=(250, 250, 250))

    image.save(ASSETS / filename, format="PNG", optimize=True)


for output_name, (background_color, extension_label) in ICONS.items():
    write_icon(output_name, background_color, extension_label)
