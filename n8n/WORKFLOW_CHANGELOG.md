# V2 Workflow Changelog

## 2026-09-17 - Reality Show: remove cohort deadline (match NLCEO)

Production workflow: `Green Light V2 - Conditional Casting Approval` (`TfpAYWYtDpOLWo2M`). Reality variant only; Normal and NLCEO untouched. Requested by Adedokun in Slack; confirmed as "just the cohort deadline like NLCEO, contents stay different".

Backup before change: `n8n/backups/TfpAYWYtDpOLWo2M-before-reality-deadline-removal-2026-09-17T18-34-08Z.json`

- `Build V2 Letter` (reality branch only): removed the `IMPORTANT` / `Conditional approval expires on:` / deadline / `After this deadline...` lines. The letter now goes straight from the NEXT STEP box to the footer, exactly like NLCEO. NEXT STEP wording, including the attendance lines, is unchanged.
- `Prepare V2 Google Doc Body`: `normalizeApprovalSections` now takes the NLCEO strip path for reality too (previously it re-inserted the `CONDITIONAL APPROVAL EXPIRES SUNDAY 11.59PM` box for any non-NLCEO letter). Reality also switches to the banner-free header image (`next-level-ceo-header.png`, 650x111), which is the plain Inside Success film-strip logo without the "THIS CONDITIONAL APPROVAL ENDS AT 11.59PM ON SUNDAY" banner. Because the strip runs at save time, reality drafts generated before this change also save without the box.
- `Refine V2 Draft JSON` system prompt: the reality section no longer lists an IMPORTANT deadline block as fixed copy and now says reality letters have no deadline block; the show-specific rule line now names NLCEO and reality together. Guardrail code unchanged.
- No dashboard change. The dashboard still sends `deadline_text` for reality; the builder ignores it.
- Deliberately not added: the NLCEO-only deadline-language guards (builder warning, save error, refine error). Reality compliance stays lenient and the deadline content is removed deterministically.

Verification: offline harness (24 checks) shows Normal and NLCEO `Build V2 Letter` and Google Doc formatter outputs byte-identical old vs new; reality new letter equals old letter minus exactly the IMPORTANT block; a pre-change reality draft containing the block is stripped on save; reality and NLCEO doc text identical from NEXT STEP onward. Live: one reality, one NLCEO and one Normal letter generated and saved to Syed's folder after deploy (all successful, Normal still has banner and box, NLCEO and reality have neither).

## 2026-09-11 - Reality Show: no em/en dashes in AI text

Production workflow: `Green Light V2 - Conditional Casting Approval` (`TfpAYWYtDpOLWo2M`). Reality variant only; Normal and NLCEO untouched.

- `Extract V2 Reality Profile JSON` system prompt: added a punctuation rule (no em dash or en dash in any field; hyphens inside words and number ranges are fine) plus a matching final-verification bullet.
- `Refine V2 Draft JSON` system prompt: same rule in the reality section.
- `Build V2 Letter` (reality branch only): `normalizeRealityDashes` runs on the four AI paragraphs before the softener. Digit-dash-digit becomes a hyphen (50-60), a dash next to existing punctuation is dropped, any other em/en dash becomes a comma. Ordinary hyphens are a different character and are never touched.
- `Apply V2 Refine Guardrails`: the same cleanup is applied to a replaced slot only when `show_type` is `reality`.

Verification: harness shows Normal and NLCEO builds and refines are byte-identical to the previous version even when their AI text contains dashes; reality dash cases (spaced, unspaced, after a colon, number range, hyphenated words) all pass; live reality drafts and a reality refine returned zero em/en dashes in the AI paragraphs.

## 2026-09-11 - Reality Show variant

Production workflow: `Green Light V2 - Conditional Casting Approval` (`TfpAYWYtDpOLWo2M`)

Backup before change: `n8n/backups/TfpAYWYtDpOLWo2M-before-reality-show-2026-09-11T19-57-04Z.json`

Structure:

- New IF node `V2 Reality Show?` sits directly after `Clean V2 Transcript`. It sends `show_type === 'reality'` to a new dedicated agent and everything else to the existing `Extract V2 Conditional Approval JSON` agent, whose prompt text is byte-identical to before this change.
- New agent `Extract V2 Reality Profile JSON` (clone of the existing extractor: same Sonnet 4.6 primary and Haiku 4.5 fallback wiring, same user-prompt expression, same name/multi-client handling) with its own reality system prompt: `n8n/Green_Light_V2_Reality_Profile_System_Prompt_PRODUCTION.md`. Its output feeds the same `Build V2 Letter` node.
- A first attempt gated the reality rules inside the shared extraction prompt. A live regression showed Sonnet ignoring the gate on a reality-heavy transcript and returning the reality shape for a Normal request, so that approach was reverted within minutes and replaced by the separate agent. No editor generation was affected (execution log checked).

Changed Code nodes (everything else untouched):

- `Clean V2 Transcript` - `show_type` now resolves to `normal`, `nlceo`, or `reality`.
- `Build V2 Letter` - reality branch builds Tom's reality template with `Cast Name`, the four profile paragraphs, the deadline block, and the standard footer. Existing softener and name-resolution chain reused. Claim scan runs on the four paragraphs only and produces warnings, not errors.
- `Prepare Edited V2 Save Payload` - reality saves scan only the Cast Name line and the four paragraphs, and block only outright promises.
- `Prepare V2 Google Doc Body` - reality headings added to the major-heading set, four sub-headings styled like ACT headings, customer journey page skipped, default Inside Success header used.
- `Prepare V2 Refine Payload` / `Apply V2 Refine Guardrails` / `Refine V2 Draft JSON` - reality editable slots are the Cast Name line and the four paragraphs; all other reality copy is locked.

Verification:

- Offline harness ran the old and new scripts side by side on identical Normal and NLCEO inputs for Clean, Build, Save, Doc Body, Refine Payload, and Refine Guardrails: outputs byte-identical.
- Reality harness cases: letter structure, deadline block, softener, name override, missing-paragraph failure, lenient save, promise block, refine slot replacement with fixed-copy protection.
- Live workflow re-fetched after each update: active, 41 nodes, all 39 pre-existing nodes byte-identical except the six Code-node fields listed above, connections identical apart from the new IF routing and the two model links to the new agent.
- Live webhook tests after the final change: Normal and NLCEO drafts on a reality-heavy transcript produced the standard letter (5 Acts, Thing, mission, Why bullets); reality drafts on the real Business Race transcript and on a synthetic roofing-company transcript produced grounded four-paragraph profiles with no overlap between them.

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
