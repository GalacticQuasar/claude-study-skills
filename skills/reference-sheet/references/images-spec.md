# Images spec (template)

Two uses:
- **New sheet with images on (the usual case):** append everything below the `---` line to `<version-dir>/src/SPEC.md`, filling in the `[brackets]`. The section writers then add images while writing.
- **Adding images to an existing text-only sheet:** copy everything below the `---` line into `<version-dir>/src/IMAGES.md`, fill in the `[brackets]`, and add this line at the top: "Your task: add images to ONE existing section (named in your prompt). Follow the source rules in `[version-dir]/src/SPEC.md`. The section's text has been checked; don't change its formulas or numbers." Then launch one subagent per section.

---

## Images: add a few cropped slide images to your section

The student uses this sheet ([N] columns, Letter, about 7.4pt) during the [course] exam. Walls of text are hard to decode under pressure, especially worked examples and "how do I do this problem" procedures. Add a **few** well-chosen, tightly cropped slide images, so the images carry examples and figures while the text supports them.

**Use the pages you already view.** While writing, you view flagged slide pages to read formulas, tables, and figures. Pick your images from those pages. Don't view extra pages just to hunt for images, beyond any candidates your task prompt names. Your conversation has a cap on images, and every page you view costs tokens.

### What to pick (aim for 2–5 images; quality over quantity)
- **Good:** worked-example tables, step-by-step calculations, diagrams (trees, graphs, plots, matrices, state machines, circuit or architecture figures), and formulas that read more clearly typeset than rewritten.
- **Skip:** title slides, bullet-only slides, and anything the text already shows just as clearly.

### Rules
1. **No contradictions with your text.** Before adding an image, compare every number and label visible in the crop with what you wrote (you've recomputed your numbers). If a slide has an error, crop the wrong part out or skip the slide.
2. **Crop tightly** to only what matters: no logos, header bars, page numbers, or empty space, and no slide title unless it's the only label.
   `[version-dir]/src/shot.sh "<pdf>" <page> <x0> <y0> <x1> <y1> [version-dir]/img/KEY-name.png`
   (coordinates are fractions 0–1 of page width and height, from the top-left; white space is trimmed automatically). Prefix file names with your section key. **View every PNG you make** to confirm the crop.
3. **Placement:** put each image right next to the text it illustrates:
   ```html
   <figure class="shot"><img src="img/KEY-name.png" alt="short description"><figcaption>What it shows / how to read it</figcaption></figure>
   ```
   Size each image so its text prints at about the sheet's text size: a full-slide-width table spans the column, and small crops get `class="shot w75"` or `"shot w50"`. To put two small related images side by side, wrap them in `<div class="pair">…</div>`.
   Captions describe the content ("Interpolated P–R curve: step graph per query"). Never cite slides or lectures.
4. **Don't repeat the image in text.** Where an image shows what text would spell out laboriously (a text-drawn tree, a long prose description of a table), keep the text short. Keep formulas, procedures, and corrected numbers as text. Keep an edge list or data table as text too if a calculation needs it and the image is small or hard to read.
5. With images, `img` and `figure`/`figcaption` are allowed in your section, in addition to the classes listed under Output format.

### Check your images
Build an `--only KEY` preview (see Check your work), render its pages at low resolution (`pdftoppm -r 70 -png …`), and view them to confirm the images are readable and sensibly sized. Delete the renders when done.

In your reply, also list the images you added (file → what it shows → where you placed it) and any slides you skipped because of errors.
