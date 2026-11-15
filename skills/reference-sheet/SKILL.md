---
name: reference-sheet
description: Build a printable exam reference sheet (HTML + PDF, multi-column, KaTeX math, optional cropped slide images) from a course's lecture materials, using parallel subagents (one per module) to write and illustrate sections, then verify the calculation-heavy ones. Use whenever the user wants a reference sheet, cheat sheet, crib sheet, formula sheet, reference card, or "something to print for my open-note exam", or asks to revise, shorten, re-layout, or add images to an existing one, even if they don't say "reference sheet".
---

# Reference sheet

Build a dense, self-contained, printable reference sheet from lecture materials. You orchestrate: plan the sections, write a spec, fan out one subagent per section, check the assembled build, and deliver a PDF. Each pass runs one subagent per section so every subagent's context stays focused on one module's lectures. One agent reading a whole course runs out of room, especially for images.

**Cost.** Every subagent starts cold: it reads `CLAUDE.md`, `INDEX.md`, and the spec, then views slide pages (images are expensive input), and runs preview builds. A 9-section course costs one writer per section, plus one verifier per calculation-heavy section. That's why the user picks the subagent model and whether to include images (step 1), why writers crop images from pages they've already viewed instead of running a separate image pass, and why only calculation-heavy sections get verified.

Bundled files (in this skill's directory):
- `assets/template.html`: print layout (Letter, N columns, KaTeX, styled formula, example, tip, table, and figure blocks; auto-shrinks oversized formulas and tables)
- `scripts/build.js`: assembles the sections and prints to PDF with Playwright, then reports page count, KaTeX errors, missing images, overflowing elements, shrunk formulas, and each section's pages and length in printed columns. `--only KEY` builds a single section in the same layout, for cheap per-section previews.
- `scripts/shot.sh`: crops a region of a PDF page to a trimmed PNG
- `references/write-spec.md`: template for the section writers' spec
- `references/images-spec.md`: the images rules, appended to the writers' spec when images are on (also usable on its own to add images to an existing sheet)
- `references/verify-spec.md`: template for the verifiers' spec

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

Work out from the files and conversation, and ask only about what isn't clear:
- **What else the student may bring** to the exam (other notes, a calculator, the textbook). It decides how self-contained the sheet must be.
- **Exam scope and excluded topics,** and the practice exams, solutions, and in-class question decks. These decide what the sheet must equip the student to answer.

**Always ask these four, in one AskUserQuestion call, before launching any subagent** (even if the files seem to answer them). Read the exam rules first, and mark the option that matches them "(Recommended)", so the user just confirms:
1. **Page limit.** Options: "No limit", "One double-sided sheet (2 pages)", "One single-sided page"; the user can type another limit under Other. A page limit changes everything about density and selection.
2. **Columns.** Options: "2 columns (Recommended)": reads far better at this font size, and display formulas get room; "3 columns": denser, fits more on a tight page limit, but formulas get cramped. Recommend 3 only if the page limit is tight.
3. **Subagent model.** Options: "Sonnet (Recommended)": much cheaper, and good at following a detailed spec and recomputing numbers; "Same as this session": highest quality, highest cost; "Haiku": cheapest, but more likely to misread slides or miss subtle errors. Pass the choice as `model` on every Agent call in this run (omit `model` for "Same as this session"). Mention the number of subagents you plan to launch (writers + verifiers) so the user can judge the cost.
4. **Images.** Options: "Yes, a few per section (Recommended)": worked examples and diagrams are much easier to read than prose under exam pressure; writers crop them from pages they already view, so the extra cost is modest; "No, text only": cheaper, and denser when there's a tight page limit. If ImageMagick or poppler-utils is missing, say so in the question (with the install command) or recommend "No".

## 2. Plan sections and set up the version

1. Split the course into sections, one per module or major topic from `INDEX.md`. Merge a tiny module into a related one (e.g. a one-lecture follow-up into its parent topic), but keep sizeable modules in their own sections, and don't merge unrelated topics: the point of one subagent per section is that each one focuses on one topic. Split a module too big for one subagent to read.
2. Give each section a short key, a file name (`NN-key.html`, where `NN` sets print order), and a **length target in printed columns**. Weight by exam importance: calculation-heavy topics and practice-exam topics get more. With a page limit, the total is pages × columns. Leave about 10% slack.
3. **Mark each section calculation-heavy or not.** Calculation-heavy means the exam asks the student to compute or trace something by hand in that topic (algorithm traces, numeric worked examples, proofs, pseudocode), as seen in the practice exams, homework, and exam hints. Only these get a verifier in step 5. Tell the user which ones you marked.
4. Create `reference-sheet/vN/src/sections/` and `reference-sheet/vN/img/`. Copy `assets/template.html` to `src/template.html` and fill in `{{TITLE}}` and `{{SUBTITLE}}` (e.g. scope and exclusions). Set `--cols` there. Copy `scripts/build.js` and `scripts/shot.sh` into `src/`.
5. Write `src/SPEC.md` from `references/write-spec.md`, filling in every bracket: course, paths, scope, exclusions, columns, and what the student may bring. **If images are on,** append `references/images-spec.md` (from its `---` line down) to `SPEC.md`, filling in its brackets too.

## 3. Write: one subagent per section, in parallel

Launch all section writers in one message, each with the `model` the user chose. Each prompt names: the spec path ("read it first and follow it exactly"), the section's topic and source files, its output file and section id, its length target, and a **must-cover list**. Build that list from the practice exam, in-class questions, and any lecturer "this will be on the exam" remarks for that topic (see the "Exam hints & spoken questions" section of `INDEX.md`, if it has one), and include known traps or slide errors from `INDEX.md`. The must-cover list is where your course-wide view adds the most value, since each subagent sees only its own module. **Put only things the course covers on it.** Don't add standard textbook material the lectures never mention, however natural it seems (in one run, must-cover items like a textbook queue design and a general-case formula cost a verifier pass to cut or correct). If you think something outside the lectures would help, ask the writer to flag it as such.

If images are on, the writer also crops and places the section's images (rules in the images part of `SPEC.md`), from the pages it views while writing. Add to the prompt the likely good image candidates you know of (worked-example tables, key diagrams, practice-exam figures) and any known slide errors to crop around.

Example prompt:
> Write one section of a printable exam reference sheet. First read the spec at `<vdir>/src/SPEC.md` and follow it exactly.
> Section: **Evaluation** (sources: `lectures-text/module-2/*`). Output: `<vdir>/src/sections/02-eval.html` (id `m-eval`). Length target: ~1.5 columns.
> Must cover: P/R/F1, ranked P/R at each rank, AP and MAP (state which denominator the course uses), 11-point interpolation, P@K, reciprocal rank, DCG/NDCG with a tiny worked example. Practice exam Q5 asks for precision and recall when some documents are discarded.
> Image candidates: the interpolated P–R curve (p.14), the NDCG worked-example table (p.22). Known slide error: p.19 gives AP = 0.62; the correct value is 0.58, so crop that number out or skip the slide.

## 4. Assemble and check

Run `node <vdir>/src/build.js <vdir> <course>-reference-sheet-vN`, then:
- Fix KaTeX errors, missing images, and overflow. Check that shrunk formulas are still readable; if not, break them into lines.
- Compare the **section layout** report (each section's pages and length in columns) with the length targets. Ask for trims, or make them yourself, where a section ran well over.
- **Page count vs. limit:** if over, cut lowest-value content first (redundant examples, verbose prose) before shrinking `--font`. Don't go below about 6.8pt.
- View a few rendered pages (`pdftoppm -r 70 -png -f N -l N`), not every page, to check density, column breaks, and that nothing looks broken. If images are on, include a couple of pages with images to confirm their size and legibility (e.g. a graph that replaced a typed edge list must still be readable).
- Look across sections for contradictions or duplicated material, since subagents can't see each other's work.
- Read each writer's reply for doubts (numbers that disagree with a slide, material not from the sources). Pass them to that section's verifier, or settle them yourself for unverified sections.

## 5. Verify the calculation-heavy sections, in parallel

Write `src/VERIFY.md` from `references/verify-spec.md` and launch one verifier per **calculation-heavy** section (as marked in step 2), each with the user's chosen `model`. Verifiers recompute every worked-example number, check formulas against the sources, fill coverage gaps against the practice questions, check that images agree with the corrected text, and remove any leftover references to slides or lectures. In each prompt, list that writer's open doubts. Rebuild afterwards.

Other sections get no verifier: their writers already recomputed their numbers, and errors there are less likely to cost points. Skip the whole pass only if the user wants a quick draft. If the user asks for every section to be verified, do that.

## 6. Record slide errors

Collect the slide errors the writers and verifiers confirmed (slide page, what it says, the correct value). Add them to a **Slide errors** list in the project's `INDEX.md` (under Quirks, or a new heading), skipping ones already there. Later runs and other skills (teach-me, quizzes) then get them without rediscovering them, and step 3 passes them to writers as known errors. Only record errors that were recomputed or checked against another source, not mere doubts.

## 7. Deliver

Tell the user the PDF path, its page count, what each section covers in one line, any images added, which sections were verified, the slide errors you recorded in `INDEX.md`, and anything left out on purpose (excluded topics, cut for space, unverifiable claims). Mention that earlier versions are untouched, and where they are.

## Revisions

For any change request: create `v(N+1)` by copying `vN/src` and `vN/img`, then make the change there.
- **Changes across all sections** (tone, self-containment, density, a new kind of content): write a short spec for the change and fan out one subagent per section, as above. Ask about the subagent model again, unless the user already chose one in this conversation.
- **Adding images to a text-only sheet:** fill in `references/images-spec.md` as a standalone `src/IMAGES.md` (it says how) and launch one subagent per section. Ask about the model first.
- **Local changes** (one section, one formula, layout or columns): do them yourself.
- **Layout-only changes** (columns, font size): edit `src/template.html` and rebuild. The content doesn't need to change.

Then rebuild, check, and deliver as in steps 4, 6, and 7.

## Dependencies

`build.js` needs Node and Playwright with Chromium. It finds a global or local `playwright`, `@playwright/test`, or `@playwright/cli` and a cached Chromium on its own; set `PLAYWRIGHT_MODULE` or `CHROME_PATH` to override. If neither is available, tell the user how to install them (`npm i -g playwright && npx playwright install chromium`). The template loads KaTeX from a CDN, so building needs network access.
