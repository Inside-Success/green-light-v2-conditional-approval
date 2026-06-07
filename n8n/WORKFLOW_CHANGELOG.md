# V2 Workflow Changelog

## 2026-06-08 - Softener and document title punctuation fix

Production workflow: `Green Light V2 - Conditional Casting Approval` (`TfpAYWYtDpOLWo2M`)

Changed Code nodes:

- `Build V2 Letter`
- `Prepare Edited V2 Save Payload`
- `Apply V2 Refine Guardrails`

What changed:

- Preserved story/medical uses of phrases like `best possible outcome` so they are not softened into awkward wording.
- Kept compliance softening for promotional ranking/superiority claims such as `best lawyer` or `number one sales rep`.
- Preserved normal client-name punctuation in generated document titles, including `&`, `.`, `,`, apostrophes, and hyphens.
- Still strips unsafe path/title characters such as `/`, `:`, `*`, `?`, `"`, `<`, `>`, and `|`.

Verification:

- Syntax-checked all three changed Code node scripts with `node --check`.
- Locally confirmed `best possible outcome was a wheelchair` stays unchanged.
- Locally confirmed `best lawyer in Texas` and `number one sales rep out of 66` are still softened.
- Live non-saving generation test confirmed `Inside Success TV x Chris & John, Dr. Sarah Smith` is preserved as the document title.
- No Google Drive save test was run for this patch, to avoid creating an unnecessary production document.
