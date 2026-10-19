#!/usr/bin/env bash
# Slide images for a study-guide page. Needs poppler-utils (pdfinfo, pdftoppm) and
# ImageMagick (6 or 7). Runs on bash 3.2, so it works with macOS's default bash.
#
#   slides.sh sheets   DECK.pdf WORKDIR         render every page to WORKDIR/pages/, then
#                                               tile them 9 per image (each labelled with
#                                               its page number) in WORKDIR/sheets/
#   slides.sh compress WORKDIR OUTDIR PAGE...   write OUTDIR/sNN.png for each page, as a
#                                               48-colour PNG (~35 KB, still sharp)
#
# Page numbers in file names are zero-padded to the width of the deck's page count
# (at least 2 digits), so a 120-page deck gives p-007.png and s007.png.
set -euo pipefail

usage() { sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }

# ImageMagick 7 has `magick`; 6 has `convert` and `montage`.
if command -v magick >/dev/null 2>&1; then
  IM_CONVERT=(magick); IM_MONTAGE=(magick montage)
elif command -v convert >/dev/null 2>&1 && command -v montage >/dev/null 2>&1; then
  IM_CONVERT=(convert); IM_MONTAGE=(montage)
else
  echo "ImageMagick not found. Install it (sudo apt install imagemagick · brew install imagemagick)." >&2
  exit 2
fi

case "${1:-}" in
  sheets)
    [ $# -eq 3 ] || usage
    pdf=$2; work=$3
    n=$(pdfinfo "$pdf" | awk '/^Pages:/ {print $2}')
    w=${#n}; [ "$w" -ge 2 ] || w=2
    rm -rf "$work/pages" "$work/sheets"
    mkdir -p "$work/pages" "$work/sheets"
    echo "$w" > "$work/pages/.width"
    pdftoppm -r 110 -png "$pdf" "$work/pages/raw"
    # pdftoppm pads to its own width; rename to ours
    for f in "$work"/pages/raw-*.png; do
      k=${f##*/raw-}; k=${k%.png}; k=$((10#$k))
      mv "$f" "$(printf "%s/pages/p-%0${w}d.png" "$work" "$k")"
    done
    sheet=0; first=1
    while [ "$first" -le "$n" ]; do
      last=$((first + 8)); [ "$last" -le "$n" ] || last=$n
      files=()
      for k in $(seq "$first" "$last"); do
        files+=("$(printf "%s/pages/p-%0${w}d.png" "$work" "$k")")
      done
      "${IM_MONTAGE[@]}" -label '%t' "${files[@]}" -tile 3x3 -geometry 600x450+6+6 \
        -pointsize 20 "$work/sheets/sheet$sheet.png"
      echo "$work/sheets/sheet$sheet.png: pages $first-$last"
      sheet=$((sheet + 1)); first=$((last + 1))
    done
    ;;
  compress)
    [ $# -ge 4 ] || usage
    work=$2; out=$3; shift 3
    [ -f "$work/pages/.width" ] || { echo "Run '$0 sheets' on the deck first." >&2; exit 1; }
    w=$(cat "$work/pages/.width")
    mkdir -p "$out"
    for p in "$@"; do
      k=$((10#$p))
      src=$(printf "%s/pages/p-%0${w}d.png" "$work" "$k")
      [ -f "$src" ] || { echo "No page $k in $work/pages" >&2; exit 1; }
      "${IM_CONVERT[@]}" "$src" -colors 48 PNG8:"$(printf "%s/s%0${w}d.png" "$out" "$k")"
    done
    du -sh "$out"
    ;;
  *)
    usage ;;
esac
