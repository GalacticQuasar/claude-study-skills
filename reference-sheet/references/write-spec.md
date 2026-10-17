# Reference sheet section spec (template)

Copy this into `<version-dir>/src/SPEC.md` and fill in every `[bracket]`. Section-writer subagents read only this file and their task prompt, so put all course-specific rules here.

---

# Reference sheet section spec

**Goal:** one section of a dense, printable reference sheet for the [course] [exam]. It's printed on Letter paper, [N] columns, at about 7.4pt. The student uses it **during the exam** to answer questions, and will have only this sheet [plus anything else the exam allows] — **no slides, no transcripts, no practice exam**. Every line has to make sense to someone holding nothing else.

**Prioritize:** exact formulas with every symbol defined; step-by-step procedures for each type of calculation; small worked examples with verified numbers; comparisons ("when to use which", pros/cons); answers to in-class questions, stated as facts; common traps. No introductions, no filler.

## Sources
- Project folder: `[path]`. Stay inside it. Read `CLAUDE.md` and `INDEX.md` there first for the reading rules and the contents map.
- Lecture text: `[lectures]-text/`. For a formula, table, or figure that exists only as an image (pages flagged `[IMAGES: …]`), view **just that page** of the PDF in `[lectures]/` with Read and `pages`, a few pages at a time. Your conversation has a cap on images, so don't page through whole decks. Write down each formula as soon as you see it.
- Practice exams and solutions: `[paths]`. Use them to see what kinds of questions get asked, and make sure the sheet equips the student to answer each kind.
- Exam scope: [scope]. **Excluded, so leave them out:** [excluded topics].
- Use the course's own notation and conventions (the exact formula variants, log bases, constants, and definitions the lectures use). Where slides and transcripts disagree, follow the slides unless the lecturer explicitly corrected them. Apply any corrections listed in `INDEX.md`.

## Self-contained content
- **No pointers to course materials:** no "slide 19", "lecture 4", "in class", "the professor said", "practice Q3", "HW2", "week 8". Keep the content and drop the pointer. A hint about what matters can stay as "Exam focus: …", with no attribution.
- **No errata commentary.** Don't write "the slide says X, but it should be Y". Just state the correct fact.
- **Worked examples must include all their inputs** (documents, counts, tables, rankings), so they can be followed without the source. If an example depends on a figure you can't reproduce compactly, cut it.
- **In-class questions:** turn each into a plain fact, or a "Q: … → A: …" line that states the full question and the actual answer text, never "option B". Drop questions that need context you can't state, or that have no real answer.
- **Practice-exam material:** present it as a question type ("Typical question: given an inverted index, …") with the full data if you show a solution.
- **No provenance notes** ("not on slides", "textbook", "my own"). If a fact is correct and useful, state it plainly. If it's doubtful, drop it.
- **Recompute every number** in a worked example (use `python3`). A wrong number on a reference sheet costs points.

## Output format
Write ONE HTML fragment (no `<html>`, `<head>`, or `<body>`) to the path given in your task:

```html
<section class="mod" id="m-KEY">
  <h2>Section title</h2>
  <div class="box">
    <h3>Topic</h3>
    <p>…</p> <ul><li>…</li></ul>
    <div class="formula">\[ display math \]</div>
    <div class="ex"><b>Ex:</b> worked example …</div>
    <div class="tip">Trap / exam focus …</div>
    <table class="tbl">…</table>
    <pre>code or pseudocode</pre>
  </div>
</section>
```

- Math is KaTeX: inline `\( … \)`, display `\[ … \]`. In HTML text, escape `<`, `>`, `&` as `&lt;`, `&gt;`, `&amp;`. Inside math, use `\lt` and `\gt`.
- Use only these classes: `mod`, `box`, `formula`, `ex`, `tip`, `tbl`, `small`. No inline styles, no scripts, no images (images are added in a later pass).
- Keep display formulas narrow, about [55 for 2 columns / 40 for 3 columns] characters of rendered width per line. Break long ones with `\begin{aligned} … \\ … \end{aligned}`. Wider formulas get shrunk automatically and become hard to read.
- Be terse: fragments, bullets, symbols. Define each symbol once. Use `<b>` for key terms.
- **Length target:** given in your task, in printed columns. One column holds about 75 lines of 7.4pt text, roughly 600–700 words or the equivalent in formulas and tables.

## Check your work
Run the build to preview your section (it writes only the files named here):
`node [version-dir]/src/build.js [version-dir] _preview-KEY`
Fix any KaTeX errors or overflow it reports in your section, then delete `_preview-KEY.*`.

## Reply
Reply with the file path, a 3–6 line summary of what the section covers, and any doubts: ambiguities you resolved, and anything you couldn't verify.
