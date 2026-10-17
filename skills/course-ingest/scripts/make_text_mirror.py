#!/usr/bin/env python3
"""Build a text mirror of a lecture folder: each PDF becomes <name>.txt with its
per-page extracted text, and plain-text files (transcripts, etc.) are symlinked in.

pdftotext drops formulas, tables, and figures that are embedded as images, so every
page with a non-template image is flagged `[IMAGES: n — text may be incomplete]`,
and each file's header lists the flagged pages. Readers then know exactly where the
text is incomplete and which pages to view visually.

Usage: python3 make_text_mirror.py [SRC] [DST]
  SRC defaults to ./lectures, DST to <SRC>-text. Run from the project folder.
Requires poppler-utils (pdftotext, pdfimages, pdfinfo).
"""
import os
import shutil
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

MIN_AREA = 5000       # ignore tiny icons/bullets (pixels)
TEMPLATE_SHARE = 0.5  # an image size on more than this share of pages is template (logo, etc.)
MARKER = ".text-mirror"  # marks DST as generated, so a rebuild may safely delete it
TEXT_SUFFIXES = {".txt", ".md", ".vtt", ".srt", ".csv", ".tex", ".rst", ".html", ".json",
                 ".py", ".java", ".c", ".cpp", ".h", ".js", ".ts", ".r", ".m", ".sql", ".ipynb"}


def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def page_count(pdf):
    for line in run("pdfinfo", str(pdf)).splitlines():
        if line.startswith("Pages:"):
            return int(line.split()[1])
    raise ValueError(f"no page count for {pdf}")


def content_images(pdf, pages):
    """Return {page: count of non-template, non-trivial images}."""
    per_page = defaultdict(list)
    for line in run("pdfimages", "-list", str(pdf)).splitlines()[2:]:
        f = line.split()
        if f[2] != "image":  # skip smask/stencil entries
            continue
        page, w, h = int(f[0]), int(f[3]), int(f[4])
        per_page[page].append((w, h))
    pages_with_size = Counter()
    for sizes in per_page.values():
        for s in set(sizes):
            pages_with_size[s] += 1
    template = {s for s, c in pages_with_size.items() if pages > 2 and c / pages > TEMPLATE_SHARE}
    return {p: sum(1 for (w, h) in sizes if (w, h) not in template and w * h >= MIN_AREA)
            for p, sizes in per_page.items()}


def convert(pdf, out, label):
    n = page_count(pdf)
    imgs = content_images(pdf, n)
    flagged = [p for p in range(1, n + 1) if imgs.get(p, 0)]
    parts = [
        f"# Extracted text of {label} ({n} pages)\n",
        "# Text only. Formulas, tables, and figures embedded as images are MISSING.\n",
        f"# Pages with content images (view these with Read + pages=N when they matter): "
        f"{', '.join(map(str, flagged)) or 'none'}\n",
    ]
    for p in range(1, n + 1):
        text = run("pdftotext", "-layout", "-f", str(p), "-l", str(p), str(pdf), "-").rstrip()
        flag = f"  [IMAGES: {imgs[p]} — text may be incomplete]" if imgs.get(p) else ""
        parts.append(f"\n===== Page {p}{flag} =====\n{text}\n")
    out.write_text("".join(parts))
    return n, len(flagged)


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "lectures").resolve()
    dst = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else src.with_name(src.name + "-text")
    if not src.is_dir():
        sys.exit(f"source folder not found: {src}")
    if dst.exists():
        if not (dst / MARKER).exists():
            sys.exit(f"{dst} exists and wasn't made by this script; refusing to delete it")
        shutil.rmtree(dst)
    dst.mkdir(parents=True)
    (dst / MARKER).write_text(f"Generated from {src}. Rebuild instead of editing.\n")

    skipped = []
    for f in sorted(src.rglob("*")):
        if f.is_dir() or f.name.startswith("."):
            continue
        rel = f.relative_to(src)
        out = dst / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        if f.suffix.lower() == ".pdf":
            n, k = convert(f, out.with_suffix(".txt"), rel)
            print(f"{rel}: {n} pages, {k} flagged")
        elif f.suffix.lower() in TEXT_SUFFIXES:
            os.symlink(os.path.relpath(f, out.parent), out)
        else:
            skipped.append(rel)
    if skipped:
        print("\nNo text version made (convert to PDF and rebuild if they matter):")
        for rel in skipped:
            print(f"  {rel}")


if __name__ == "__main__":
    main()
