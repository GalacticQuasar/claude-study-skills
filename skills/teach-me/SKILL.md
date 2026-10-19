---
name: teach-me
description: Build a study-guide web page (a hand-written HTML artifact) that teaches one course topic from the lecture slides and transcripts, in lecture order, with the important slides embedded next to the explanation, verified worked examples, key takeaways, and a self-check quiz. Use when the user says "/teach-me <topic>", or asks to be taught, walked through, or caught up on a lecture topic ("I missed the KMP lecture", "explain dynamic programming like I wasn't in class", "make me a study page for edit distance"), in a course folder set up by course-ingest (an INDEX.md plus a text mirror of the slides). Not for exam reference or cheat sheets; that's the reference-sheet skill.
---

# Teach me a topic

Turn one topic from a course's slides and lecture transcripts into a page that teaches it to someone who missed class: the lecture's order, a plain explanation of each idea, the slides that carry it shown full-width beside that explanation, then takeaways and a quiz.

The argument is the topic, e.g. `/teach-me algorithms on strings`. If none is given, ask which topic.

## Before you start

This skill expects a course folder prepared by `course-ingest`:
- an `INDEX.md` mapping decks, transcripts, and exam hints;
- a text mirror of the lecture folder, named after it (`lectures/` → `lectures-text/`, `slides/` → `slides-text/`; `INDEX.md` and `CLAUDE.md` say which), with `===== Page N =====` markers;
- a `CLAUDE.md` with reading rules.

Read `CLAUDE.md` and `INDEX.md` first. The project's rules win over this skill where they conflict, for example on exam scope, garbled symbols in extracted text, or what kinds of study material are allowed. If there is no `INDEX.md` or text mirror, say so and offer to run `course-ingest` first; guessing at slide ranges without them produces a page that skips or misorders material.

One exception, on purpose: course-ingest's `CLAUDE.md` says to read the PDFs directly when only a few decks are needed. For this skill, use the contact sheets in step 3 instead. They still show you every page of the deck, but as a handful of images rather than one per page, which matters when a single topic spans 40–50 slides and the conversation has an image cap.

Tools: poppler-utils (already needed by course-ingest) and ImageMagick for the slide images. If ImageMagick is missing, `slides.sh` says so; give the user the install command (`sudo apt install imagemagick` · `brew install imagemagick`). If they'd rather not install it, view the topic's pages directly with Read in batches of at most 20, and embed full-size PNGs from `pdftoppm -r 110 -f N -l N`.

**Where things go.** Keep the page's source in the project, so a later session can fix or extend it:

```
study-guides/<topic-slug>/
  index.html       the page
  slides/sNN.png   the embedded slides
  check.py         the verification script from step 4
  ARTIFACT.md      the published link, plus the date and the deck/lecture range covered
```

Scratch work (the rendered pages and contact sheets) goes in the session's scratchpad. If `study-guides/<topic-slug>/` already exists, this is a revision: read `ARTIFACT.md` and the existing page, and update that page rather than starting a new one.

## 1. Locate the topic

- Find the deck(s) and slide range in `INDEX.md`, and which transcripts cover them. If the index gives transcript line numbers, use them. If it only says which lecture covers which slides, grep that transcript for the topic's slide titles and key terms to find where the discussion starts and ends. Grep the text mirror to confirm the slide range and catch anything the index misses.
- Collect the exam hints `INDEX.md` lists for this topic (past exam questions, "won't ask this", what's in scope). They go on the page.
- Tell the user in one line where the topic lives ("deck 11, slides 2–49, lectures 8–11"), especially if their guess was off.
- One topic per page. If it spans more than about two decks or ~60 slides, propose splitting into several pages and ask before going on. A page that tries to cover a whole unit stops teaching and turns into a summary.

## 2. Read everything for the topic, as text

- Read the deck's text-mirror pages for the whole range. This gives you the wording and page number of every slide.
- If there are transcripts, read their ranges in full, not just skim them. The slides give definitions; the transcripts give what the slides can't: the lecturer's intuition and analogies, which parts they called hard or important, questions asked in class and their answers, and exam hints. Transcripts are speech-to-text, so names and terms come out garbled; take terminology from the slides.
- If the course has no transcripts, teach from the slides alone. Leave out the in-class callouts rather than inventing lecturer remarks, and say in the final report that the page is slides-only.
- Note off-slide asides. If the project scope is "what's on the slides", leave them out or mark them as out of scope.

## 3. Look at the slides cheaply

Conversations cap the number of images, and past the cap earlier images silently disappear. Don't view slides one by one. Make contact sheets instead:

```bash
<skill-dir>/scripts/slides.sh sheets <deck.pdf> <scratchpad>/<deck-name>
```

This renders every page and tiles them 9 per image, each labelled with its page number, and prints which pages each sheet holds. View only the sheets that cover your range. Write down any formula, number, or table you take from an image as soon as you see it.

From the sheets, pick the slides to embed:
- **Embed** diagrams, figures, charts, formulas, worked examples, tables, pseudocode, and the slides behind in-class questions.
- **Skip** title slides, near-duplicates (successive build-up slides: keep the most complete one), and plain-text slides whose content your prose already covers.

If a detail is too small to read on a sheet, view that one page at full size.

## 4. Verify the examples by recomputing them

Slides have typos, extraction mangles numbers, and a wrong worked example on a study page does real damage. Before any number goes on the page:

- For algorithmic topics, write a short script, `study-guides/<topic-slug>/check.py`, that implements the algorithm, and run it on the slides' own examples. Compare its output with the slide.
- Use the same script to produce anything you add yourself: a fully filled table the slide only shows in part, a step-by-step trace, quiz answers.
- For non-algorithmic topics, recompute every numeric example or derivation you can (arithmetic, formulas, small proofs).
- Keep a list of slide typos and discrepancies you find. They get flagged on the page where the slide appears.

If you can't verify something, say so on the page rather than presenting it as fact.

## 5. Prepare the images

```bash
<skill-dir>/scripts/slides.sh compress <scratchpad>/<deck-name> study-guides/<topic-slug>/slides 4 7 8 12 ...
```

This writes `slides/sNN.png` as 48-colour PNGs (about 35 KB each and still sharp), which keeps a 30-plus-slide page small. Page numbers are zero-padded to the deck's page-count width, so a deck of 100+ pages gives `s007.png`; use the names the script prints. For a topic spanning two decks, run `sheets` for each deck into its own scratch folder and `compress` into separate subfolders (`slides/deck9/`, `slides/deck10/`) so the numbers don't collide. Publish the images as supporting files next to the page rather than inlining them as data URIs.

## 6. Write the page

The output is always a **hand-written HTML page published with the Artifact tool**, not a Docs document, a Slides deck, or any other artifact type, even though "study guide" sounds like a document. The user chose this format. It is the only one that gives full control over the parts that make the page teach: full-width slide images beside the prose, colour-coded tables and traces, and quiz answers hidden behind `<details>` toggles.

Before you write, call the Artifact tool's `quickstart` with `intent: "other"`, and follow the plain-page rules it returns (page skeleton, title, allowed sources, theming, phone width). If it suggests starting from a listed type, don't: this skill's format choice overrides that suggestion. Write the page to `study-guides/<topic-slug>/index.html`.

**Structure**
- Header: topic name, deck and lecture numbers, a one-sentence summary, and a small table of contents linking each part.
- One section per idea, in the order the lecture covered them. Each section follows the same pattern: explain the idea plainly (as if to someone who missed class), embed the slide full-width, then a caption that says what to notice on it ("Slide 18 · Horizontal step = insert, diagonal = substitute"). A caption that just repeats the slide title adds nothing.
- Callout boxes for: in-class moments (questions asked and their answers, analogies), exam hints, and the tables or traces you computed yourself.
- End with **key takeaways** (a short list per part) and a **self-check quiz**: around 10–12 questions mixing recall, "run the algorithm on this input" traces, and one or two variations in the lecturer's style. Hide each answer behind a `<details>` toggle so the user tries first.

**Labelling**
- Mark anything you made that isn't on the slides ("computed for this guide").
- Mark answers to homework or past-exam questions as your own, not official solutions, unless an official solution exists in the project.
- Flag slide typos in that slide's caption.

**Design**
- Borrow the deck's own conventions where they carry meaning, for example if the slides colour-code cases (insert blue, delete green, substitute red), reuse those colours in your prose and tables so page and slides read as one.
- Slide images are white; give them a border so they sit cleanly in dark mode.

## 7. Check, then publish

Errors slip in when you retype things from slides into captions and prose. Before publishing:
- Reread every caption, formula and example on the page against the slide and your script's output.
- Take one preview of the page if the session offers a way, fix what it shows, and then publish.

Publish with the Artifact tool: `file_path` is `study-guides/<topic-slug>/index.html`, `root` is that folder, `files` lists the slide paths relative to it, plus a one-word `icon` (e.g. `book`) and a one-sentence `description`. Use the topic as the page `<title>` ("Algorithms on Strings"). Then write the link into `ARTIFACT.md`.

Record the page in `INDEX.md` too, since that's what every later session reads first. Keep a "Study guides" section with one row per page: topic, folder, the deck/slide/lecture range it covers, and the link. Create the section, and a one-line `study-guides/` entry in the index's layout list, the first time. On a revision, update the existing row instead of adding one.

To revise the page later, republish the same `file_path`. From a different session, also pass the link from `ARTIFACT.md` as `url` (after reading the artifact once, as the tool requires), so the link stays the same instead of a new artifact being created.

Then tell the user, briefly:
- where the topic lives and what the page covers, part by part
- which content you computed or verified yourself, and any slide typos you flagged
- anything you couldn't verify or chose to leave out (out-of-scope asides, skipped slides, no transcripts)
