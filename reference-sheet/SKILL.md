---
name: reference-sheet
description: Build a printable exam reference sheet (HTML + PDF, multi-column, KaTeX math, optional cropped slide images) from a course's lecture materials, using parallel subagents (one per module) to write, verify, and illustrate sections. Use whenever the user wants a reference sheet, cheat sheet, crib sheet, formula sheet, reference card, or "something to print for my open-note exam", or asks to revise, shorten, re-layout, or add images to an existing one, even if they don't say "reference sheet".
---

# Reference sheet

Build a dense, self-contained, printable reference sheet from lecture materials. You orchestrate: plan the sections, write a spec, fan out one subagent per section, check the assembled build, and deliver a PDF. Each pass runs one subagent per section so every subagent's context stays focused on one module's lectures. One agent reading a whole course runs out of room, especially for images.

Bundled files (in this skill's directory):
- `assets/template.html`: print layout (Letter, N columns, KaTeX, styled formula, example, tip, table, and figure blocks; auto-shrinks oversized formulas and tables)
- `scripts/build.js`: assembles the sections and prints to PDF with Playwright, then reports page count, KaTeX errors, missing images, overflowing elements, and shrunk formulas
- `scripts/shot.sh`: crops a region of a PDF page to a trimmed PNG
- `references/write-spec.md`, `verify-spec.md`, `shots-spec.md`: templates for the per-pass subagent specs

## Versioning: never overwrite a delivered version

The user may print, compare, or prefer an older version. Requests like "make it two-column", "remove the slide references", or "add pictures" each produce a **new** version folder, under `reference-sheet/` in the project folder:

```
reference-sheet/
  v1/  src/{template.html, sections/, build.js, shot.sh, SPEC.md, …}  img/  <course>-reference-sheet-v1.{html,pdf}
  v2/  …
```

- To start a version, find the highest existing `vN` and create `v(N+1)`. Copy the previous version's `src/` and `img/` when revising, or start from the skill's assets for a fresh build.
- While building a version, edit its files freely. Once it's delivered, it's frozen. If the user asks for changes, make a new version, even small ones, unless they explicitly say to edit in place.
- If you're unsure whether a change should be a new version, make one. Copying a folder is cheap, and losing a version the user liked isn't.
- Each version's `src/` holds its own copies of the template, scripts, and specs, so it can be rebuilt exactly later.

## 1. Gather inputs

Work inside the project folder (the one this session runs in, e.g. `midterm-prep/`), not its parent course folder. Prefer the project's `INDEX.md` and `CLAUDE.md` (from the course-ingest skill) for the contents map and reading rules. If they don't exist, suggest running course-ingest first. A text mirror makes per-module subagents much cheaper and safer with the image cap.

Work out, and ask only about what isn't clear from the files or conversation:
- **Exam rules:** is there a page limit (e.g. "one double-sided sheet" = 2 PDF pages)? What else may the student bring? A page limit changes everything about density and selection.
- **Layout:** default to 2 columns. It reads far better than 3 at this font size, and display formulas get room. Use 3 only if the page limit forces it.
- **Images:** default to including a few cropped slide images per section. Worked examples and diagrams are much easier to read than prose under exam pressure. Skip this pass if the user wants text only or space is very tight.
- **Exam scope and excluded topics,** and the practice exams, solutions, and in-class question decks. These decide what the sheet must equip the student to answer.

## 2. Plan sections and set up the version

1. Split the course into sections, usually one per module or major topic from `INDEX.md`. Merge tiny modules and split huge ones, so each subagent has a manageable amount to read.
2. Give each section a short key, a file name (`NN-key.html`, where `NN` sets print order), and a **length target in printed columns**. Weight by exam importance: calculation-heavy topics and practice-exam topics get more. With a page limit, the total is pages × columns. Leave about 10% slack.
3. Create `reference-sheet/vN/src/sections/` and `reference-sheet/vN/img/`. Copy `assets/template.html` to `src/template.html` and fill in `{{TITLE}}` and `{{SUBTITLE}}` (e.g. scope and exclusions). Set `--cols` there. Copy `scripts/build.js` and `scripts/shot.sh` into `src/`.
4. Write `src/SPEC.md` from `references/write-spec.md`, filling in every bracket: course, paths, scope, exclusions, columns, and what the student may bring.

## 3. Write: one subagent per section, in parallel

Launch all section writers in one message. Each prompt names: the spec path ("read it first and follow it exactly"), the section's topic and source files, its output file and section id, its length target, and a **must-cover list**. Build that list from the practice exam, in-class questions, and any lecturer "this will be on the exam" remarks for that topic (see the "Exam hints & spoken questions" section of `INDEX.md`, if it has one), and include known traps or slide errors from `INDEX.md`. The must-cover list is where your course-wide view adds the most value, since each subagent sees only its own module.

Example prompt:
> Write one section of a printable exam reference sheet. First read the spec at `<vdir>/src/SPEC.md` and follow it exactly.
> Section: **Evaluation** (sources: `lectures-text/module-2/*`). Output: `<vdir>/src/sections/02-eval.html` (id `m-eval`). Length target: ~1.5 columns.
> Must cover: P/R/F1, ranked P/R at each rank, AP and MAP (state which denominator the course uses), 11-point interpolation, P@K, reciprocal rank, DCG/NDCG with a tiny worked example. Practice exam Q5 asks for precision and recall when some documents are discarded.

## 4. Assemble and check

Run `node <vdir>/src/build.js <vdir> <course>-reference-sheet-vN`, then:
- Fix KaTeX errors, missing images, and overflow. Check that shrunk formulas are still readable; if not, break them into lines.
- **Page count vs. limit:** if over, cut lowest-value content first (redundant examples, verbose prose) before shrinking `--font`. Don't go below about 6.8pt.
- View a few rendered pages (`pdftoppm -r 70 -png -f N -l N`), not every page, to check density, column breaks, and that nothing looks broken.
- Look across sections for contradictions or duplicated material, since subagents can't see each other's work.

## 5. Verify: one subagent per section, in parallel

Write `src/VERIFY.md` from `references/verify-spec.md` and launch one verifier per section. They recompute every worked-example number, check formulas against the sources, fill coverage gaps against the practice questions, and remove any leftover references to slides or lectures. Rebuild afterwards. Skip this pass only if the user wants a quick draft.

## 6. Images (default on): one subagent per section, in parallel

Write `src/SHOTS.md` from `references/shots-spec.md` and launch one subagent per section. In each prompt, add likely good candidates you know of (worked-example tables, key diagrams) and known slide errors to crop around. Rebuild, recheck the page count, and view a couple of pages with images to confirm their size and legibility.

Needs ImageMagick and poppler-utils. If ImageMagick is missing, tell the user the install command or skip this pass.

## 7. Deliver

Tell the user the PDF path, its page count, what each section covers in one line, any images added, and anything left out on purpose (excluded topics, cut for space, unverifiable claims). Mention that earlier versions are untouched, and where they are.

## Revisions

For any change request: create `v(N+1)` by copying `vN/src` and `vN/img`, then make the change there.
- **Changes across all sections** (tone, self-containment, density, a new kind of content): write a short spec for the change and fan out one subagent per section, as above.
- **Local changes** (one section, one formula, layout or columns): do them yourself.
- **Layout-only changes** (columns, font size): edit `src/template.html` and rebuild. The content doesn't need to change.

Then rebuild, check, and deliver as in steps 4 and 7.

## Dependencies

`build.js` needs Node and Playwright with Chromium. It finds a global or local `playwright`, `@playwright/test`, or `@playwright/cli` and a cached Chromium on its own; set `PLAYWRIGHT_MODULE` or `CHROME_PATH` to override. If neither is available, tell the user how to install them (`npm i -g playwright && npx playwright install chromium`). The template loads KaTeX from a CDN, so building needs network access.
