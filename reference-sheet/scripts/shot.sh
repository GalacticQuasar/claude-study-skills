#!/usr/bin/env bash
# Crop a region of a PDF page into a PNG for the reference sheet.
# Usage: shot.sh <pdf> <page> <x0> <y0> <x1> <y1> <out.png>
#   x0,y0,x1,y1 are FRACTIONS of page width/height (0..1), top-left origin.
#   Renders at 200 dpi, crops, trims surrounding white space, adds a small border.
#   Prints the output path and its pixel size.
# Needs poppler-utils (pdftoppm) and ImageMagick (convert/magick, identify).
set -euo pipefail
pdf=$1; page=$2; x0=$3; y0=$4; x1=$5; y1=$6; out=$7
im=$(command -v magick || command -v convert)
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
pdftoppm -r 200 -f "$page" -l "$page" -png "$pdf" "$tmp/p" >/dev/null
src=$(ls "$tmp"/p*.png | head -1)
read -r W H <<< "$(identify -format "%w %h" "$src")"
geom=$(python3 -c "print(f'{int(($x1-$x0)*$W)}x{int(($y1-$y0)*$H)}+{int($x0*$W)}+{int($y0*$H)}')")
mkdir -p "$(dirname "$out")"
"$im" "$src" -crop "$geom" +repage -fuzz 8% -trim +repage -bordercolor white -border 6 -strip "$out"
echo "$out $(identify -format '%wx%h' "$out")"
