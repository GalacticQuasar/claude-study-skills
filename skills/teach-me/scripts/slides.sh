#!/usr/bin/env bash
# Slide images for a study-guide page. Needs poppler-utils (pdftoppm) and ImageMagick.
#
#   slides.sh sheets   DECK.pdf WORKDIR         render every page, then tile them 9 per
#                                               image (labelled p-NN) in WORKDIR/sheets/
#   slides.sh compress WORKDIR OUTDIR PAGE...   write OUTDIR/sNN.png for each page, as a
#                                               48-colour PNG (~35 KB, still sharp)
set -euo pipefail

case "${1:-}" in
  sheets)
    pdf=$2; work=$3
    mkdir -p "$work/pages" "$work/sheets"
    pdftoppm -r 110 -png "$pdf" "$work/pages/p"
    # pdftoppm pads page numbers to the width of the page count; normalise to 2+ digits
    for f in "$work"/pages/p-*.png; do
      n=$(basename "$f" .png); n=$((10#${n#p-}))
      dst=$(printf "%s/pages/p-%02d.png" "$work" "$n")
      [ "$f" = "$dst" ] || mv "$f" "$dst"
    done
    mapfile -t pages < <(ls "$work"/pages/p-*.png | sort -V)
    i=0
    while [ $((i * 9)) -lt ${#pages[@]} ]; do
      montage -label '%t' "${pages[@]:$((i * 9)):9}" -tile 3x3 -geometry 600x450+6+6 \
        -pointsize 20 "$work/sheets/sheet$i.png"
      echo "$work/sheets/sheet$i.png: pages $((i * 9 + 1))-$(( (i + 1) * 9 < ${#pages[@]} ? (i + 1) * 9 : ${#pages[@]} ))"
      i=$((i + 1))
    done
    ;;
  compress)
    work=$2; out=$3; shift 3
    mkdir -p "$out"
    for p in "$@"; do
      src=$(printf "%s/pages/p-%02d.png" "$work" "$((10#$p))")
      convert "$src" -colors 48 PNG8:"$(printf "%s/s%02d.png" "$out" "$((10#$p))")"
    done
    du -sh "$out"
    ;;
  *)
    sed -n '2,8p' "$0"; exit 1 ;;
esac
