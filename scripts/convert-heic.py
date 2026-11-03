"""Convert HEIC photos in public/images to high-quality JPEG files."""

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


def main():
    if not IMAGE_DIR.is_dir():
        print(f"No image directory at {IMAGE_DIR}", file=sys.stderr)
        return 1
    files = list(heic_files())
    if not files:
        print("No HEIC images to convert")
        return 0
    for source in files:
        convert(source)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
