# Screenshots spec (template)

Copy this into `<version-dir>/src/SHOTS.md` and fill in the `[brackets]`.

---

# Add slide screenshots to one reference sheet section

The student will use this printed reference sheet ([N] columns, Letter, about 7.4pt) during the [course] exam. Walls of text are hard to decode under pressure, especially worked examples and "how do I do this problem" procedures. Your job is to add a **few** well-chosen, tightly cropped slide images to ONE section, so the images carry examples and figures while the text supports them. Follow the source rules in `[version-dir]/src/SPEC.md`.

## What to pick (aim for 3–6 images; quality over quantity)
- **Good:** worked-example tables, step-by-step calculations, diagrams (trees, graphs, plots, matrices, state machines, circuit or architecture figures), and formulas that read more clearly typeset than rewritten.
- **Skip:** title slides, bullet-only slides, and anything the text already shows just as clearly.
- Use the text mirror to shortlist pages (flagged `[IMAGES]` pages are likely candidates, but so are vector diagrams, which aren't flagged). View only the shortlisted pages, 1–3 at a time, plus your crops. Your conversation has a cap on images.

## Rules
1. **No contradictions with the sheet.** The sheet's text has been checked and corrected. Before adding an image, compare every number and label visible in the crop with the sheet. If a slide has an error, crop the wrong part out or skip the slide.
2. **Crop tightly** to only what matters: no logos, header bars, page numbers, or empty space, and no slide title unless it's the only label.
   `[version-dir]/src/shot.sh "<pdf>" <page> <x0> <y0> <x1> <y1> [version-dir]/img/KEY-name.png`
   (coordinates are fractions 0–1 of page width and height, from the top-left; white space is trimmed automatically). Prefix file names with your section key. **View every PNG you make** to confirm the crop.
3. **Placement:** put each image right next to the text it illustrates:
   ```html
   <figure class="shot"><img src="img/KEY-name.png" alt="short description"><figcaption>What it shows / how to read it</figcaption></figure>
   ```
   Size each image so its text prints at about the sheet's text size: a full-slide-width table spans the column, and small crops get `class="shot w75"` or `"shot w50"`. To put two small related images side by side, wrap them in `<div class="pair">…</div>`.
   Captions describe the content ("Interpolated P–R curve: step graph per query"). Never cite slides or lectures.
4. **Remove redundancy.** Where an image now shows what the text spelled out laboriously (a text-drawn tree, a long prose description of a table), shorten that text. Never delete formulas, procedures, or corrected numbers.

## Check your work
Build a preview: `node [version-dir]/src/build.js [version-dir] _preview-KEY`. Find the pages with your section (`pdftotext -f N -l N … | grep`), render them at low resolution (`pdftoppm -r 70 -png -f N -l N …`), and view them to confirm the images are readable and sensibly sized. Delete `_preview-KEY.*` and the renders when done.

## Reply
List the images you added (file → what it shows → where you placed it), slides you deliberately skipped because of errors, and any text you shortened.
