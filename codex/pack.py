"""Build a downloadable, size-checked ZIP for each standalone game."""

from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parent
ZIP_LIMIT = 524_288


def pack_game(html):
    buffer = BytesIO()
    # Fixed metadata keeps an unchanged game byte-identical between builds.
    entry = ZipInfo("index.html", date_time=(1980, 1, 1, 0, 0, 0))
    entry.create_system = 3
    entry.external_attr = 0o100644 << 16
    with ZipFile(buffer, "w") as archive:
        archive.writestr(entry, html.read_bytes(), ZIP_DEFLATED, compresslevel=9)
    data = buffer.getvalue()
    name = html.parent.name
    if len(data) > ZIP_LIMIT:
        raise ValueError(f"{name}: {len(data):,} bytes exceeds {ZIP_LIMIT:,}")
    return name, data


if __name__ == "__main__":
    games = sorted((ROOT / "games").glob("*/index.html"))
    if not games:
        raise SystemExit("No games found in games/*/index.html")
    archives = [pack_game(html) for html in games]
    output = ROOT / "dist"
    output.mkdir(exist_ok=True)
    for name, data in archives:
        (output / f"{name}.zip").write_bytes(data)
        print(f"{name}.zip  {len(data):,} / {ZIP_LIMIT:,} bytes")
