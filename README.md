# Claude study skills

Three [Claude Code](https://docs.claude.com/en/docs/claude-code) skills for studying from a course's lecture materials:

| Skill | What it does |
|---|---|
| [`course-ingest`](skills/course-ingest/SKILL.md) | Turns a folder of slide PDFs, transcripts, and practice exams into something Claude can work from cheaply: a searchable per-page text mirror (flagging pages whose formulas/figures are images), an `INDEX.md` contents map, and `CLAUDE.md` reading rules for future sessions. |
| [`reference-sheet`](skills/reference-sheet/SKILL.md) | Builds a printable, multi-column exam reference sheet (HTML + PDF, KaTeX math, optional cropped slide images) using parallel subagents, one per module, to write, verify, and illustrate each section. Every revision is saved as a new version. |
| [`teach-me`](skills/teach-me/SKILL.md) | Builds a study-guide web page (a hand-written HTML artifact) that teaches one topic in lecture order, as if to someone who missed class: plain explanations with the key slides embedded beside them, worked examples checked by running code, lecturer's exam hints, key takeaways, and a self-check quiz. |

They work best together: run `course-ingest` once per course, then ask for a reference sheet or a topic study guide.

## Install

**As a Claude Code plugin** (installs all three skills, updates with `/plugin`):

```
/plugin marketplace add GalacticQuasar/claude-study-skills
/plugin install study-skills@claude-study-skills
```

**With the [`skills`](https://www.npmjs.com/package/skills) CLI:**

```bash
npx skills add GalacticQuasar/claude-study-skills
```

**Manually:** clone the repo and copy (or symlink) the skill folders into a `skills/` directory Claude Code reads:

```bash
git clone https://github.com/GalacticQuasar/claude-study-skills
cd claude-study-skills

# Available in every project:
mkdir -p ~/.claude/skills
cp -r skills/course-ingest skills/reference-sheet skills/teach-me ~/.claude/skills/

# ...or only in one class folder:
mkdir -p /path/to/class/.claude/skills
cp -r skills/course-ingest skills/reference-sheet skills/teach-me /path/to/class/.claude/skills/
```

Use `ln -s "$PWD/skills/course-ingest" ~/.claude/skills/` instead of `cp -r` if you want `git pull` to update them.

## Usage

1. Make a prep folder for the exam and put the lecture materials in it, e.g.
   ```
   cs101/midterm-prep/
     lectures/          # slide PDFs + transcripts, any subfolder layout
     practice-exams/
   ```
2. Start `claude` in that folder and say something like *"I downloaded the lectures for this class, set them up so we can study."* That runs `course-ingest`, which writes `lectures-text/`, `INDEX.md`, `CLAUDE.md`, and `tools/make_text_mirror.py`.
3. Ask for a reference sheet, e.g. *"Make me a reference sheet for the midterm, one double-sided page."* Output goes to `reference-sheet/v1/<course>-reference-sheet-v1.pdf`. Asking for changes ("make it 3 columns", "add pictures") creates `v2`, `v3`, … and leaves earlier versions untouched.

4. To learn a topic you missed or want explained, say *"/teach-me algorithms on strings"* or *"I missed the KMP lecture, teach it to me."* You get a link to a private study-guide page, and its source is saved in `study-guides/<topic>/` (with the link in `ARTIFACT.md`) so later sessions can revise the same page. Topics spanning more than about two decks get an offer to split into several pages. Courses without transcripts work too; the page is then built from the slides alone.

The skills can also be invoked directly with `/course-ingest`, `/reference-sheet`, and `/teach-me`.

## Requirements

| Needed for | Dependency | Install (Debian/Ubuntu · macOS) |
|---|---|---|
| All | Python 3 | usually preinstalled |
| All | poppler-utils (`pdftotext`, `pdfimages`, `pdfinfo`, `pdftoppm`) | `sudo apt install poppler-utils` · `brew install poppler` |
| `reference-sheet` build | Node.js + Playwright with Chromium | `npm i -g playwright && npx playwright install chromium` |
| `reference-sheet` images, `teach-me` | ImageMagick | `sudo apt install imagemagick` · `brew install imagemagick` |
| `teach-me` | The Artifact tool (publishes the page to claude.ai) | available when signed in to Claude Code with a claude.ai account |
| `.pptx`/`.docx` slides (optional) | LibreOffice, to convert to PDF | `sudo apt install libreoffice` · `brew install --cask libreoffice` |

The reference sheet template loads KaTeX from a CDN, so building needs network access. The image pass is optional; without ImageMagick, the skill skips it.

## Layout

```
.claude-plugin/marketplace.json   # plugin marketplace listing (all skills as one plugin)
skills/
  course-ingest/
    SKILL.md
    scripts/make_text_mirror.py   # copied into each project's tools/ folder
  reference-sheet/
    SKILL.md
    assets/template.html          # print layout (Letter, N columns, KaTeX)
    scripts/build.js              # assemble sections → HTML + PDF, report layout problems
    scripts/shot.sh               # crop a region of a PDF page to PNG
    references/                   # specs for the write / verify / image subagents
  teach-me/
    SKILL.md
    scripts/slides.sh             # slide contact sheets for picking, compressed PNGs for the page
```
