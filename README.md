# Claude study skills

Two [Claude Code](https://docs.claude.com/en/docs/claude-code) skills for studying from a course's lecture materials:

| Skill | What it does |
|---|---|
| [`course-ingest`](course-ingest/SKILL.md) | Turns a folder of slide PDFs, transcripts, and practice exams into something Claude can work from cheaply: a searchable per-page text mirror (flagging pages whose formulas/figures are images), an `INDEX.md` contents map, and `CLAUDE.md` reading rules for future sessions. |
| [`reference-sheet`](reference-sheet/SKILL.md) | Builds a printable, multi-column exam reference sheet (HTML + PDF, KaTeX math, optional cropped slide images) using parallel subagents, one per module, to write, verify, and illustrate each section. Every revision is saved as a new version. |

They work best together: run `course-ingest` once per course, then ask for a reference sheet.

## Install

Clone the repo and copy (or symlink) the skill folders into a `skills/` directory Claude Code reads:

```bash
git clone https://github.com/GalacticQuasar/claude-study-skills
cd claude-study-skills

# Available in every project:
mkdir -p ~/.claude/skills
cp -r course-ingest reference-sheet ~/.claude/skills/

# ...or only in one class folder:
mkdir -p /path/to/class/.claude/skills
cp -r course-ingest reference-sheet /path/to/class/.claude/skills/
```

Use `ln -s "$PWD/course-ingest" ~/.claude/skills/` instead of `cp -r` if you want `git pull` to update them.

## Usage

1. Make a prep folder for the exam and put the lecture materials in it, e.g.
   ```
   cs101/midterm-prep/
     lectures/          # slide PDFs + transcripts, any subfolder layout
     practice-exams/
   ```
2. Start `claude` in that folder and say something like *"I downloaded the lectures for this class, set them up so we can study."* That runs `course-ingest`, which writes `lectures-text/`, `INDEX.md`, `CLAUDE.md`, and `tools/make_text_mirror.py`.
3. Ask for a reference sheet, e.g. *"Make me a reference sheet for the midterm, one double-sided page."* Output goes to `reference-sheet/v1/<course>-reference-sheet-v1.pdf`. Asking for changes ("make it 3 columns", "add pictures") creates `v2`, `v3`, … and leaves earlier versions untouched.

Both skills can also be invoked directly with `/course-ingest` and `/reference-sheet`.

## Requirements

| Needed for | Dependency | Install (Debian/Ubuntu · macOS) |
|---|---|---|
| Both | Python 3 | usually preinstalled |
| Both | poppler-utils (`pdftotext`, `pdfimages`, `pdfinfo`, `pdftoppm`) | `sudo apt install poppler-utils` · `brew install poppler` |
| `reference-sheet` build | Node.js + Playwright with Chromium | `npm i -g playwright && npx playwright install chromium` |
| `reference-sheet` images | ImageMagick | `sudo apt install imagemagick` · `brew install imagemagick` |
| `.pptx`/`.docx` slides (optional) | LibreOffice, to convert to PDF | `sudo apt install libreoffice` · `brew install --cask libreoffice` |

The reference sheet template loads KaTeX from a CDN, so building needs network access. The image pass is optional; without ImageMagick, the skill skips it.

## Layout

```
course-ingest/
  SKILL.md
  scripts/make_text_mirror.py   # copied into each project's tools/ folder
reference-sheet/
  SKILL.md
  assets/template.html          # print layout (Letter, N columns, KaTeX)
  scripts/build.js              # assemble sections → HTML + PDF, report layout problems
  scripts/shot.sh               # crop a region of a PDF page to PNG
  references/                   # specs for the write / verify / image subagents
```
