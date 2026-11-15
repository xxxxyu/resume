"""Refresh bundled CJK/symbol coverage from the authored resume and paper data.

Requires fonttools[woff]. Pass the original Noto Sans/Serif SC variable TTFs;
the normal build uses the committed WOFF2 files and needs no Python tooling.
"""

import argparse
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "public/fonts"


def codepoints(path):
    with TTFont(path) as font:
        return set(font.getBestCmap())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sans", type=Path, required=True)
    parser.add_argument("--serif", type=Path, required=True)
    args = parser.parse_args()

    sources = sorted((ROOT / "content").rglob("*.json")) + [ROOT / "src/generated/homepage.json"]
    required = {ord(char) for path in sources for char in path.read_text() if char.isprintable()}
    latin = codepoints(FONT_DIR / "SourceSans3VF-Upright.ttf.woff2") & codepoints(FONT_DIR / "SourceSerif4Variable-Roman.ttf.woff2")
    required -= latin

    for source, name in [(args.sans, "NotoSansSC-SiteSubset.woff2"), (args.serif, "NotoSerifSC-SiteSubset.woff2")]:
        output = FONT_DIR / name
        # Preserve previous coverage as well as all current non-Latin characters.
        points = codepoints(output) | required
        with TTFont(source, recalcTimestamp=False) as font:
            missing = points - set(font.getBestCmap())
            if missing:
                raise ValueError(f"{source} is missing: {''.join(map(chr, sorted(missing)))}")
            options = subset.Options()
            options.layout_features = ["*"]
            subsetter = subset.Subsetter(options=options)
            subsetter.populate(unicodes=points)
            subsetter.subset(font)
            font.flavor = "woff2"
            font.save(output)
        print(f"Updated {name}: {len(points)} codepoints")


if __name__ == "__main__":
    main()
