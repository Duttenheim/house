"""Convert HEIC photos to JPEG, and write small previews for the lightbox strip."""

import sys
from pathlib import Path

from PIL import Image, ImageOps

try:
    import pillow_heif
except ModuleNotFoundError:
    print(
        "HEIC conversion needs pillow-heif. Run: pip install -r requirements.txt",
        file=sys.stderr,
    )
    raise SystemExit(1)

pillow_heif.register_heif_opener()

ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / "public" / "images"
THUMB_DIR = IMAGE_DIR / "thumbs"
THUMB_EDGE = 480


def heic_files():
    seen = set()
    for pattern in ("*.heic", "*.HEIC"):
        for path in IMAGE_DIR.glob(pattern):
            key = path.resolve()
            if key in seen:
                continue
            seen.add(key)
            yield path


def needs_convert(source, destination):
    if not destination.exists():
        return True
    return source.stat().st_mtime > destination.stat().st_mtime


def convert(source):
    destination = source.with_suffix(".jpg")
    if not needs_convert(source, destination):
        print(f"up to date {destination.name}")
        return
    image = ImageOps.exif_transpose(Image.open(source))
    if image.mode != "RGB":
        image = image.convert("RGB")
    options = {
        "quality": 95,
        "subsampling": 0,
        "optimize": True,
        "progressive": True,
    }
    profile = image.info.get("icc_profile")
    if profile:
        options["icc_profile"] = profile
    image.save(destination, "JPEG", **options)
    print(f"converted {source.name} -> {destination.name} {image.size[0]}x{image.size[1]}")


def picture_files():
    seen = set()
    for pattern in ("*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG"):
        for path in IMAGE_DIR.glob(pattern):
            key = path.resolve()
            if key in seen or not path.is_file():
                continue
            seen.add(key)
            yield path


def thumb_destination(source):
    return THUMB_DIR / f"{source.stem}.jpg"


def make_thumb(source):
    destination = thumb_destination(source)
    if not needs_convert(source, destination):
        print(f"up to date thumbs/{destination.name}")
        return
    image = ImageOps.exif_transpose(Image.open(source))
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        image = image.convert("RGBA")
        flat = Image.new("RGB", image.size, (255, 255, 255))
        flat.paste(image, mask=image.getchannel("A"))
        image = flat
    elif image.mode != "RGB":
        image = image.convert("RGB")
    image.thumbnail((THUMB_EDGE, THUMB_EDGE), Image.Resampling.LANCZOS)
    THUMB_DIR.mkdir(exist_ok=True)
    image.save(destination, "JPEG", quality=75, optimize=True, progressive=True)
    print(f"thumb {source.name} -> thumbs/{destination.name} {image.size[0]}x{image.size[1]}")


def main():
    if not IMAGE_DIR.is_dir():
        print(f"No image directory at {IMAGE_DIR}", file=sys.stderr)
        return 1
    files = list(heic_files())
    if not files:
        print("No HEIC images to convert")
    for source in files:
        convert(source)
    for source in picture_files():
        make_thumb(source)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
