# Verify spec (template)

Copy this into `<version-dir>/src/VERIFY.md` and fill in the `[brackets]`. Only calculation-heavy sections get a verifier. Each one checks one section with fresh eyes. The writer can't easily catch its own mistakes, and an error on a reference sheet is worse than a gap, because the student will trust it under time pressure.

---

# Verify one reference sheet section

You're checking one section (an HTML fragment) of a printed exam reference sheet for [course]. Follow the rules in `[version-dir]/src/SPEC.md` (sources, scope, self-containment, format). Edit the section file in place.

## Check, and fix in place
1. **Correctness.** Compare each formula, definition, and claim against the lecture sources (text mirror first, then the specific flagged PDF pages for formulas that are images). Recompute every number in every worked example with `python3`. Fix anything wrong.
2. **Coverage.** Skim the practice exam questions and in-class questions on this section's topics. If the student couldn't answer one from the sheet, add the missing formula, procedure, or fact.
3. **Self-containment.** Run
   `grep -n -i -E '\bsl\.|slide|lecture|transcript|in-class|in class|prof|errata|practice|textbook|not on slides|HW[0-9]|week [0-9]' <file>`
   and rewrite every hit that points at course materials, following SPEC.md. Also read each worked example and make sure all its inputs are stated.
4. **Images** (if the section has any). Images were added while writing, before your fixes. For each `<figure>`, view the PNG and compare every visible number and label with the corrected text. If an image now contradicts the sheet (or shows a slide error), re-crop it with `[version-dir]/src/shot.sh` to cut the wrong part out, or remove it. Don't view the image if the section has none.
5. **Readability.** Each procedure should be followable step by step under exam pressure. Tighten wordy prose, but don't drop real content.
6. Preview your section (`node [version-dir]/src/build.js [version-dir] _preview-KEY --only KEY`), fix any KaTeX errors or overflow, keep its length ("section layout" line) near where it started unless you were asked to trim, then delete `_preview-KEY.*`.

## Reply
List what you fixed (especially any wrong numbers or formulas, with before → after), what you added, any **slide errors** you confirmed (slide page, what it says, the correct value; only wrong numbers, formulas, or facts, not differing notations or valid formula variants), and anything you're still unsure about.
