# EZPZ question import JSON: guide and prompt

This is the kit for anyone turning exam papers into question JSON, whether by
hand or with an AI. It has three parts:

1. The rules and the shape (this file). Give it to the person, or paste the
   "Prompt" section at the end into the AI.
2. The checker: `node check.cjs yourfile.json`. Run it before
   sending a file. Errors block the file. Warnings are things a reviewer will
   look at.
3. Two samples in `samples/`: `good.json` passes,
   `bad.json` shows what the checker rejects.

One file holds up to 500 questions. One question is one item. The file is
checked, reviewed, then imported. Nothing is imported silently.

## The shape of one item

```json
{
  "clientId": "dhaka-2024-phy1-p4-q17",
  "curriculum": { "path": "hsc/physics/1st/chapter-2" },
  "questionNumber": "17",
  "formatCode": "mcq_single",
  "translations": {
    "en": { "questionText": "...", "solutionText": "..." },
    "bn": { "questionText": "...", "solutionText": null }
  },
  "choices": [
    { "ordinal": 1, "key": "ক", "isCorrect": false, "body": { "en": "...", "bn": "..." } },
    { "ordinal": 2, "key": "খ", "isCorrect": true,  "body": { "en": "...", "bn": "..." } }
  ],
  "parts": [],
  "assets": [
    { "sha256": "<64 hex chars>", "role": "stem", "page": 4, "bbox": [72, 310, 288, 470] }
  ],
  "provenance": {
    "sourceDocumentSha256": "<64 hex chars>",
    "page": 4,
    "bbox": [60, 280, 540, 520],
    "extractorModel": "human",
    "promptVersion": "import-json-guide-2026-09",
    "confidence": 1
  },
  "sources": [
    {
      "source_type": "board_exam",
      "exam_category_code": "board",
      "organization": "Dhaka",
      "exam_name": "HSC Physics 1st Paper",
      "year": 2024,
      "session": null,
      "paper": "1st",
      "unit_name": null,
      "set_name": null,
      "source_reference": null,
      "source_item_reference": "17"
    }
  ]
}
```

The whole file is `{ "schemaVersion": "ezpz-content-import-v2", "items": [ ... ] }`.
See `samples/good.json` for a complete MCQ, a CQ and a
numeric question.

## Field by field

**clientId.** Unique inside the file. Use `<board-or-org>-<year>-<subject><paper>-p<page>-q<number>`.

**curriculum.path.** One of the paths in the list at the end. Never a name.

**questionNumber.** The number printed on the paper, as a string.

**formatCode.** One of:

| formatCode | Use for | Needs |
|---|---|---|
| `mcq_single` | one correct option | `choices`, exactly one `isCorrect: true` |
| `mcq_multiple` | more than one correct option | `choices`, at least one `isCorrect: true` |
| `cq` | সৃজনশীল, the stem plus lettered parts | `parts` |
| `short_answer` | one line answer in words | answer in `solutionText` |
| `numeric` | a number is the answer | answer in `solutionText` |
| `matching` | match column A to column B | `parts`, one per pair |

**translations.** Include a language only when the paper has it. A Bengali-only
paper has only `bn`. Do not translate. Inside a language, `questionText` is
required and `solutionText` is the worked solution, or `null` when the paper
gives none.

**choices.** MCQ only. `ordinal` is the position, 1 upward. `key` is the label
printed on the paper: `ক খ গ ঘ ঙ`, or `A B C D`, or `i ii iii`. Any number of
choices. `body` has the same languages as `translations`.

**parts.** CQ only. `ordinal` 1 upward, `key` as printed (`ক খ গ ঘ`), `label`
as printed (জ্ঞান, অনুধাবন, প্রয়োগ, উচ্চতর দক্ষতা), `prompt` per language,
`solution` per language. Leave the `solution` key out of a part when the paper
gives no solution.

**assets.** Figures. Each figure is a separate PNG or JPG file, cropped to the
figure only. Name the file by its sha256, for example `3b1f0c9d....png`, and put
the sha256 in the JSON. Get the hash with
`node check.cjs --hash figure.png`. `role` is `stem` for a
figure in the question, `choice` for a figure inside an option, `part` for a
figure in one part, `solution` for a figure in the solution. `page` and `bbox`
say where on the source page it was cut from, so it can be re-cut. Empty list
`[]` when there is no figure.

**provenance.** Where this item came from. Always present.
`sourceDocumentSha256` is the hash of the PDF or image file the question was
read from. `page` is the page number. `bbox` is the question's box on the
page, or `null`. `extractorModel` is `human` or the model name.
`promptVersion` is `import-json-guide-2026-09`. `confidence` is 1 for a human
who checked the answer against the key, lower when unsure. Anything under 0.8
goes to review.

**sources.** Every exam this question appeared in. At least one. Each entry
has all of these keys:

| key | value |
|---|---|
| `source_type` | `board_exam` or `admission_exam` |
| `exam_category_code` | `board` for a board exam. For admission: `university`, `engineering`, `medical`, `dental`, or `admission` when the track is not known |
| `organization` | the board or institution name from the list at the end |
| `exam_name` | as printed, for example `HSC Physics 1st Paper` or `Medical Admission Test`, or `null` |
| `year` | four digit year |
| `session` | `23-24` style when printed, else `null` |
| `paper` | `1st` or `2nd` for board exams, else `null` |
| `unit_name` | `Science Unit`, `Ka Unit`, or `null` |
| `set_name` | set letter or code when printed, else `null` |
| `source_reference` | book or page reference when the paper is from a compilation, else `null` |
| `source_item_reference` | the question number in that exam, as a string, or `null` |

If the same question appeared in two exams, one item with two entries in
`sources`. Never two items.

## The null rules

- Every key listed above is present on every item. A key is never left out to
  mean "none".
- `null` means the paper does not have it. An empty string `""` is never used.
- Two exceptions where a key is left out instead of null: a language that the
  paper does not have is left out of `translations` and of every `body`,
  `prompt` and `solution`; and the `solution` key of a part is left out when
  there is no solution.
- Never invent. If the answer key is missing, `solutionText` is `null` and
  `isCorrect` is `false` on every choice, with `confidence` under 0.8 so the
  item goes to review.
- Never guess a chapter. If the chapter is unclear, use the best match and set
  `confidence` under 0.8.

## Text rules

- Copy the paper exactly. Every word, every step. Do not summarise, do not
  correct, do not translate.
- Every mathematical expression is inside `$...$` on a line, or `$$...$$` on
  its own line. Never bare LaTeX.
- Never put Bengali words inside `$...$`. Move them outside the math.
- A closing `$` is never glued to a unit: `$10^{-3}$ M`, not `$10^{-3}$M`.
- Subscripts in plain text use Unicode: `R₁`, `Iₑ`. Inside math use LaTeX:
  `$R_1$`.
- Solutions: `**Given:**` list, `**Formula:**`, one `$$...$$` block per step,
  final answer in bold, conclusion in bold. Skip trivial arithmetic.

## Running the checker

```bash
node check.cjs questions.json
node check.cjs questions.json --assets figures/
node check.cjs --hash figures/diagram.png
```

Output is one line per item: `OK`, or the count of errors and warnings, then
each issue with its JSON path. The file is ready when there are zero errors.
Warnings are fine to send; the reviewer sees them.

The checker validates against `import-json/reference.json`, which lists
the curriculum paths, formats, categories and organizations the database knows.
If a chapter or institution is genuinely missing from that list, say so rather
than inventing a path.

## Curriculum paths

Physics 1st: `hsc/physics/1st/chapter-1` Physical World and Measurement,
`chapter-2` Vectors, `chapter-3` Kinematics, `chapter-4` Newton's Laws of
Motion, `chapter-5` Work, Energy and Power, `chapter-6` Gravitation,
`chapter-7` Properties of Matter, `chapter-8` Periodic Motion, `chapter-9`
Waves, `chapter-10` Ideal Gas and Kinetic Theory.

Physics 2nd: `hsc/physics/2nd/chapter-1` Thermodynamics, `chapter-2` Static
Electricity, `chapter-3` Current Electricity, `chapter-4` Magnetic Effect of
Current, `chapter-5` Electromagnetic Induction and Alternating Current,
`chapter-6` Geometric Optics, `chapter-7` Physical Optics, `chapter-8` Modern
Physics, `chapter-9` Atomic Model and Nuclear Physics, `chapter-10`
Semiconductors and Electronics, `chapter-11` Astrophysics.

Chemistry 1st: `hsc/chemistry/1st/chapter-1` Safe Use of Laboratory,
`chapter-2` Qualitative Chemistry, `chapter-3` Periodic Properties and
Chemical Bonding, `chapter-4` Chemical Changes, `chapter-5` Applied Chemistry.

Chemistry 2nd: `hsc/chemistry/2nd/chapter-1` Environmental Chemistry,
`chapter-2` Organic Chemistry, `chapter-3` Quantitative Chemistry, `chapter-4`
Electrochemistry, `chapter-5` Economic Chemistry.

Math 1st: `hsc/math/1st/chapter-1` Matrices and Determinants, `chapter-2`
Vectors, `chapter-3` Straight Lines, `chapter-4` Circles, `chapter-5`
Permutations and Combinations, `chapter-6` Trigonometric Ratios, `chapter-7`
Trigonometric Ratios of Associated Angles, `chapter-8` Functions and Graphs,
`chapter-9` Differentiation, `chapter-10` Integration.

Math 2nd: `hsc/math/2nd/chapter-1` Real Numbers and Inequalities, `chapter-2`
Linear Programming, `chapter-3` Complex Numbers, `chapter-4` Polynomials,
`chapter-5` Binomial Expansion, `chapter-6` Conic Sections, `chapter-7`
Inverse Trig Functions and Equations, `chapter-8` Statics, `chapter-9`
Dynamics of a Particle in a Plane, `chapter-10` Dispersion and Probability.

Biology 1st: `hsc/biology/1st/chapter-1` Cell and Its Structure, `chapter-2`
Cell Division, `chapter-3` Cell Chemistry, `chapter-4` Microbes, `chapter-5`
Algae and Fungi, `chapter-6` Bryophyta and Pteridophyta, `chapter-7`
Gymnosperms and Angiosperms, `chapter-8` Tissue and Tissue System, `chapter-9`
Plant Physiology, `chapter-10` Plant Reproduction, `chapter-11` Biotechnology,
`chapter-12` Environment, Distribution and Conservation.

Biology 2nd: `hsc/biology/2nd/chapter-1` Animal Diversity and Classification,
`chapter-2` Animal Identity, `chapter-3` Digestion and Absorption, `chapter-4`
Blood and Circulation, `chapter-5` Respiratory Process and Respiration,
`chapter-6` Excretory Products and Excretion, `chapter-7` Locomotion and
Movement, `chapter-8` Coordination and Control, `chapter-9` Continuance of
Human Life, `chapter-10` Immunity of the Human Body, `chapter-11` Genetics
and Evolution, `chapter-12` Animal Behavior.

## Organization names

Boards: `Dhaka`, `Rajshahi`, `Comilla`, `Jessore`, `Chittagong`, `Barisal`,
`Sylhet`, `Dinajpur`, `Mymensingh`, `Combined`, `Bangladesh Madrasah Education
Board`, `Bangladesh Technical Education Board`. Spell Barisal with an s.

Medical and dental: `Centralized Medical and Dental Admission Authority` for
both MAT and DAT. Put `Medical Admission Test` or `Dental Admission Test` in
`exam_name` and `medical` or `dental` in `exam_category_code`.

Engineering: `BUET`, `CUET`, `KUET`, `RUET`, `AUST`, `BUTEX`, `IUT`, `MIST`,
`CUET-KUET-RUET Combined Admission Committee`.

Universities and clusters: `University of Dhaka`, `University of Rajshahi`,
`University of Chittagong`, `Jahangirnagar University`, `Jagannath University`,
`Khulna University`, `Shahjalal University of Science and Technology`,
`Bangladesh Agricultural University`, `Bangladesh University of Professionals`,
`GST Universities Integrated Admission System`, `Agriculture Cluster Admission
System`, and the rest of the names in `import-json/reference.json`.

## Prompt

Paste everything below into the AI, followed by the page images. Attach or
paste the "Field by field", "The null rules", "Text rules", "Curriculum paths"
and "Organization names" sections above when the model cannot read this file.

```text
You convert Bangladesh HSC board exam papers and university, engineering,
medical and dental admission papers into EZPZ import JSON.

Output one JSON object: {"schemaVersion":"ezpz-content-import-v2","items":[...]}.
One item per question. Follow the field list, the null rules, the text rules,
the curriculum paths and the organization names exactly as given to you.

Rules that matter most:
- Copy the paper verbatim. Never translate, summarise, correct or add.
- Only include a language the paper actually has.
- Every key is present on every item. null means the paper does not have it.
  Never write an empty string. Never leave a key out, except a missing
  language, and the solution key of a part with no solution.
- Choices keep the printed labels (ক খ গ ঘ ঙ or A B C D) in key, and their
  printed order in ordinal. Any number of choices.
- Exactly one isCorrect true for mcq_single. If there is no answer key, all
  false, solutionText null, confidence below 0.8.
- Math inside $...$ or $$...$$. No Bengali inside math. No bare LaTeX.
- A figure becomes an assets entry with role, page and bbox. Do not describe
  the figure in the question text. Do not draw it.
- provenance on every item: sourceDocumentSha256 (given to you), page, bbox,
  extractorModel (your model name), promptVersion "import-json-guide-2026-09",
  confidence between 0 and 1. Use below 0.8 whenever you are unsure of the
  chapter, the answer, or a word.
- One question that appeared in several exams is one item with several
  sources entries.
- If the chapter is not in the curriculum list or the institution is not in
  the organization list, use the closest match and set confidence below 0.8.

Return only the JSON.
```
