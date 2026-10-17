---
name: course-ingest
description: Set up a course's lecture materials (slide PDFs, transcripts, practice exams) so Claude can study from them efficiently. Builds a searchable per-page text mirror that flags pages whose formulas and figures are images, writes an INDEX.md contents map, and writes CLAUDE.md reading rules for future sessions. Use whenever the user has downloaded lecture slides or transcripts for a class and wants to study, prep for an exam, or have Claude work from them.
---

# Course ingest

Turn a folder of course materials into something any future Claude session can navigate cheaply and correctly.

**The project** is the folder this session is working in, usually a dedicated prep folder like `<course>/midterm-prep/`. Everything you read and write stays inside it. Don't go up into the parent course folder: it may hold other exams' materials, assignments, or unrelated files. If the lecture materials seem to live outside the project, ask the user rather than reaching for them.

You produce three things at the top level of the project:

1. **A text mirror** (`<lectures>-text/`): every PDF as per-page text, with pages that contain images flagged.
2. **`INDEX.md`**: a contents map of what's where.
3. **`CLAUDE.md`**: the reading rules, loaded automatically in every later session.

Why this matters: slide decks hide much of their content in images (formulas, tables, worked examples), so text extraction silently loses it. But viewing PDFs visually is costly, and a conversation can only hold so many images. Past that cap, earlier images are silently replaced with `[media removed: request limit]`. The mirror and index let sessions search everything as text and spend visual reads only where they matter.

**Already ingested?** If the project already has `INDEX.md` and a text mirror, don't start over. Rebuild the mirror (`python3 tools/make_text_mirror.py <lecture-folder>`), then update `INDEX.md` for whatever was added or changed, and update `CLAUDE.md` only if something new needs a rule.

## 1. Find the materials

Look around the project and identify:
- the **lecture folder** (slides and transcripts, often organized by module or week)
- **practice exams** and solutions, homework, in-class question decks

Ask only about things you can't work out from the files. Make sure poppler-utils is installed (`pdftotext`, `pdfimages`, `pdfinfo`). If it's missing, tell the user the install command (e.g. `sudo apt install poppler-utils`, `brew install poppler`).

Slides in `.pptx` or `.docx` get no text version. If there are any, offer to convert them to PDF (`libreoffice --headless --convert-to pdf`) next to the originals before building the mirror.

## 2. Build the text mirror

Copy the script into the project's `tools/` folder, so rebuilding never depends on this skill's location. Then run it from the project folder:

```bash
mkdir -p tools && cp <this-skill-dir>/scripts/make_text_mirror.py tools/
python3 tools/make_text_mirror.py <lecture-folder>        # writes <lecture-folder>-text/
```

What the output looks like:
- Each PDF becomes `<name>.txt`. The header lists its flagged pages, and every page starts with `===== Page N =====`. Pages with content images get `[IMAGES: n — text may be incomplete]`. Logos and backgrounds repeated across most pages are ignored, so flags point to real content.
- Transcripts and other text files are symlinked in, so one folder holds everything searchable.
- **Vector-drawn diagrams aren't flagged** (charts and trees drawn as shapes, not embedded images). Their labels may extract as scattered words, so a page full of loose short tokens is a sign of a diagram.
- The script won't delete an existing folder it didn't create, and it lists files it couldn't convert.

Run the mirror on the materials that will be read (lectures, plus practice exams if they're PDFs; pass a second folder as needed).

## 3. Write INDEX.md

Read through the mirror (text only, which is cheap) and write `INDEX.md` at the top level of the project. With many modules, you can split this across parallel subagents, one per module, each returning its section of the map. Contents:

- **Layout**: what each top-level folder is, and which one to read from.
- **Exam** (optional; include only if the files or the user give exam info): date, format (open-note? allowed materials?), scope, and excluded topics.
- **Contents map**, per module, in teaching order (say so if it differs from the folder numbering):
  - each slide deck: path, page count, and a one-line list of the topics it covers, with rough page ranges for the major ones
  - each transcript: which deck and slide range it covers, in lecture order
  - question decks, practice exams, and solutions: which topics they test
- **Exam hints & spoken questions** (optional; include if the transcripts have any): the times the lecturer said something like "this is the kind of question I ask on the exam", and in-class questions that were asked out loud with no slide or question deck. For each, give the transcript path, an approximate line number, a one-line gist, and the answer if one was given. Search the transcripts for words like "exam", "test", "quiz", "question", and "important" to find candidates, then read the surrounding lines to confirm. Later work, such as building reference sheets or quizzes, relies on this.
- **Image-heavy content**: the topics whose key formulas or figures are images (from the flagged pages), so a reader knows the text alone won't do for those.
- **Quirks** you notice: printed slide numbers that don't match PDF pages (check a few decks: compare the numbers printed on slides with the `===== Page N =====` markers), practice exams that cite another semester's slide numbers, duplicate or mislabeled files, obvious slide typos.

Keep it factual and scannable. It's a map, not a summary of the course. Write all paths relative to the project folder.

## 4. Write CLAUDE.md

Create `CLAUDE.md` at the top level of the project, so it loads in every session started there. If one already exists, add a section rather than overwriting it. Adapt this template (fill in the bracketed parts and remove lines that don't apply):

```markdown
# [Course] [exam, if known] prep

Study materials for [course]. **Read `INDEX.md` first.** It maps every slide deck, transcript, and practice exam[, and gives the exam scope — if INDEX.md has an Exam section].

## Reading lecture material
- `[lectures]-text/` mirrors `[lectures]/`: each PDF is replaced by its per-page extracted text (`===== Page N =====` markers), and transcripts are symlinked in. Use it to search, and to find which slides cover a topic.
- Extracted text is missing formulas, tables, and figures embedded as images. Those pages are marked `[IMAGES: n — text may be incomplete]`, and each file's header lists them, so when you work from text you know exactly where you're missing content. Vector-drawn diagrams are not flagged.
- **Only a few decks needed** (explaining one lecture, a topic covered in one or two decks): read the PDFs directly with Read (`pages`, at most 20 per call). That shows you every formula, table, and figure.
- **Context from many lectures needed** (course-wide summaries, quizzes, reference sheets, "where was X covered?"): work from the text mirror, and view visually only the flagged pages whose content you actually need.
- The conversation has a cap on total images. Once it's exceeded, earlier images are silently replaced with `[media removed: request limit]`. Write down any formula or number you take from an image right away. If you see `[media removed: request limit]`, you didn't see that page: don't cite it.
- Rebuild the mirror after adding or changing lecture files: `python3 tools/make_text_mirror.py [lectures]`.

## Other rules
- [Optional, only if exam scope is known: excluded topics.]
- [Quirks worth a reminder, e.g. slide-number offsets.]
```

Leave out the optional lines, or the whole "Other rules" section, when there's nothing to put there. Don't ask the user for exam details just to fill them in.

The "few decks vs. many lectures" split is the core of the rules: visual reads give complete information but use up the image budget. For one or two decks that's a good trade. Across a whole course it isn't, and the flags show where text-only reading has gaps.

## 5. Check and report

Ask yourself: if a brand-new session got "explain lecture 5", "make a formula sheet for the exam", or "did we cover X?", could it get started from CLAUDE.md and INDEX.md alone? Fix any gaps.

Then tell the user what you built, how many pages were flagged, which topics depend most on images, any files that couldn't be converted, and any quirks you found.
