# V2 Workflow Changelog

## 2026-11-06 - Branded letters follow the updated design docs; dashboard mismatch warning only on clear contradictions

Production workflow `TfpAYWYtDpOLWo2M`. Backup before change: `n8n/backups/TfpAYWYtDpOLWo2M-before-branded-design-refresh-2026-11-06T17-55-02Z.json`. Normal, NLCEO and Reality untouched and proven byte-identical by the harness (100 checks).

Source: Boris's updated Mansion / Island design docs (re-exported 2026-11-06) and Adedokun's Loom about the variant warning (Slack DM).

Workflow changes (nodes `Build V2 Letter`, `Prepare V2 Google Doc Body`, `Refine V2 Draft JSON` prompt; mansion/island branches only):

- Headlines page removed (heading, page break and composite image), so a branded letter is 8 pages instead of 9.
- Opening sentence now ends "a strong fit for an upcoming reality show."; approval line now "continue through the casting process." (both dropped the "Inside Success TV" mention per the docs).
- NEXT STEP resources: the two-item list (Rudy episode + Inside Success media pack) is replaced by "Before your second call, please review the media kit:" and one link line "🔗 View the Mansion of Money Media Pack" / "🔗 View the Entrepreneurs Island Media Pack" (13pt, bold, underlined, brand colour, like the docs). The link opens the show's media kit hosted with the other assets (`.../workflow-assets/<show>/media-kit.jpg`, downloaded from Rudy's Dropbox links so nothing depends on Dropbox).
- Assets refreshed from the updated docs: new Island header and one-story graphic, two swapped media-pack tiles per show plus the new fifth row (Podcast Reel, BTS Reel) so the grid matches the docs; `headlines.jpg` deleted.
- Refine prompt: the fixed-copy list no longer mentions the headlines heading. Condense step, thresholds and the last-resort cap are unchanged.

Dashboard (`src/App.jsx`): the "Transcript appears to mention X, but the selected variant is Y" warning fired on correct selections because most calls mention several shows (it warned on 80 of 90 real Reality selections and 10 of 49 real Mansion/Island selections). New rule `getVariantWarning`: Mansion/Island warn only when the transcript never mentions the selected show in any form (even just "the mansion" / "the island") and does name another show or Next Level CEO; Reality accepts any reality-show mention and warns only on a Next Level CEO transcript; Normal and NLCEO keep the old behaviour. Replayed over 233 unique real transcripts: 0 warnings for correct branded/reality selections, Normal/NLCEO unchanged, and wrong selections still flagged wherever the transcript names another show.

Verification: harness (byte-identity for the three live variants; branded structure, 3 images, 4 page breaks, new sentences, single media-kit link with exact UTF-16 range); Vercel assets checked live before the n8n deploy; live Mansion and Island generate + save + refine from real transcripts compared page by page with the design docs; MCP validation 0 errors / 0 warnings.

## 2026-11-05 - Mansion of Money and Entrepreneurs Island variants

Production workflow: `Green Light V2 - Conditional Casting Approval` (`TfpAYWYtDpOLWo2M`). Two new show types `mansion` and `island`; Normal, NLCEO and Reality untouched and proven byte-identical (harness: Clean, Build, Save, Formatter, Refine payload, Guardrails, old live code vs new).

Backup before change: `n8n/backups/TfpAYWYtDpOLWo2M-before-mansion-island-2026-11-05T17-32-47Z.json`

Source of truth: Rudy's Loom (2026-11-05) and Boris/Pankaj's design docs (Mansion `1w7HSMsVKYPPI2sTtHFsF0ikeONnAWrx6dIbHvZ8JNeg`, Island `12TgstBKhHdjPEPZ3i2dhwaoTMfI_AERYTZhiXGVpTGA`). Syed's decisions: reproduce the docs exactly (ISTV body mentions and resource links included), gold NEXT STEP heading on Mansion, blue MEDIA PACK heading on Island, header banner paired with the footer on Island, 12-tile media pack grid, file names `<Show> TV x Name`, ~50-word paragraphs.

Workflow changes:

- New IF `V2 Branded Reality?` (show_type mansion or island) between `Clean V2 Transcript` and `V2 Reality Show?`; true branch feeds new agent `Extract V2 Branded Profile JSON` (clone of the reality agent, same Sonnet 4.6 primary / Haiku 4.5 fallback models, prompt with a 35-55 word, 60 max, per-paragraph rule). Node definitions in `n8n/nodes/branded-reality-nodes.json`.
- `Clean V2 Transcript`, `Prepare Edited V2 Save Payload`, `Prepare V2 Refine Payload`: show_type mapping gains mansion/island (checked before reality/nl). Save and guardrails treat mansion/island as the reality family (lenient claim rules, four editable slots, dash normalisation) and build `<Show> TV x Name` titles.
- `Build V2 Letter`: new branded branch (placed before the reality branch) producing the trimmed letter; paragraphs over 70 words add a review warning, never a block.
- `Prepare V2 Google Doc Body`: self-contained branded branch that returns early: full-width show header, footer with the show website, brand fonts/colours, 5 page breaks, 4 inline graphics (one-story diagram, media pack grid, co-production table, headlines) inserted after all styling in descending index order, resource links, grey centred disclaimer, no NEXT STEP black box. Blank spacer lines before page-break headings are dropped so no empty pages appear.
- `Refine V2 Draft JSON` prompt: one paragraph describing the branded letters (same four slots, everything else fixed).
- Dashboard: five variant buttons on a full-width row (three columns under 900px, stacked on phones), transcript signals for Mansion/Island, no deadline for the branded shows.

One-page fit, final design (after Syed rejected deterministic cutting as a quality risk): the branded route now has an AI condense step. `Check V2 Branded Length` (Code) measures the four paragraphs after extraction; if any exceeds 50 words or the four exceed 195, `V2 Branded Needs Condense?` routes to `Condense V2 Branded Profile JSON` (agent, same Sonnet/Haiku models, prompt `n8n/nodes/condense-v2-branded-profile-system-prompt.txt`) which rewrites them to 30-45 words each keeping every fact, then `Merge V2 Condensed Profile` (Code) places only the four rewritten paragraphs back into the original extraction JSON (names, warnings untouched) with sanity checks (15-60 words, no placeholders; otherwise the original paragraph is kept) before `Build V2 Letter`. Otherwise the item goes straight to Build. The Merge node loops back to the Check node, which allows at most two condense passes (a first pass that lands over the budget gets one more), then proceeds to Build regardless. Any parse problem passes the item through untouched; nothing blocks. Condense target 30-42 words per paragraph (hard 45). Node definitions: `n8n/nodes/branded-condense-nodes.json`. Tested on real transcripts with the extractor deliberately set to long output: 53-66 word paragraphs became 43-47 words with all names, numbers and places preserved; condense adds 3-4 s. The builder's deterministic cut (below) remains only as a last-resort safety net and did not fire on any real letter.

One-page fit, first version (same night, superseded as the primary mechanism by the condense step above): real calls produced paragraphs of 47-81 words and one Competitive Profile spilled onto a second page. The branded prompt now targets 35-50 words (55 max) and `Build V2 Letter` enforces it deterministically: each paragraph is capped at 60 words and the four together at 200 (measured ceiling for both brands), choosing the combination of whole-sentence or clause-boundary cuts that keeps the most words. Clause cuts are only taken on sentences that open with a subject (You/Your/This/...), so no fragments. A "Review note" warning tells the editor what was shortened; nothing blocks. `Apply V2 Refine Guardrails` applies the same per-paragraph cap to refined branded paragraphs.

Verification: harness 95 checks (byte-identity for the three live variants; structure, fonts, images, page breaks, ordering, titles, refine slot isolation and word-cap warning for the new ones); live Mansion and Island generate (17 s, paragraphs 35-48 words), save and refine; live Normal/NLCEO/Reality generate and save; rendered docs reviewed page by page against the design docs; dashboard screenshots at desktop and phone width. First render showed the one-story graphic pushing its three closing lines onto their own page and an empty page after the co-production table; fixed (page-break ordering and spacer removal) and re-verified.

## 2026-10-01 - Editor change: Sheena replaces Daniel

Dashboard only (`src/App.jsx`): `EDITOR_OPTIONS` now lists Adedokun Adedoyin (default), Syed, Sheena. No n8n change: folder routing is by editor name against subfolders of `Client's PDFs Green Light Letter`. A `Sheena` subfolder was created in Drive before deploying so saves use the proven lookup path. Daniel's folder (200+ letters, in active use until 2026-10-01) was intentionally left untouched; letters were not moved. Browsers that remembered "Daniel" fall back to the default editor (Adedokun) on next load and must select Sheena once.

## 2026-09-24 - Async job results moved to a Data Table (fixes lost completions under parallel use)

Production workflow: `Green Light V2 - Conditional Casting Approval` (`TfpAYWYtDpOLWo2M`). All variants share this path; letter content, prompts, builders, formatter, save and refine are untouched.

Backup before change: `n8n/backups/TfpAYWYtDpOLWo2M-before-async-datatable-2026-09-24T14-17-15Z.json`

Problem: job status lived only in `$getWorkflowStaticData('global').v2_async_jobs`. n8n persists that whole object at the end of every execution, so when two generations overlapped, the one finishing second wrote back a stale copy in which the first job was still `processing`, erasing its completion. The dashboard then polled until its 10-minute timeout even though the letter had been generated. Editors running 5-8 tabs in parallel hit this roughly 1 in 6 jobs on 2026-09-24. Reproduced on demand: 6 simultaneous generations -> 5 stuck.

Change:

- New Data Table `Green Light V2 - async jobs` (`VHryMbxgGIxi1Zur`, project Moonis Haider): columns `job_id`, `status`, `payload` (JSON of the finished job record, ~9-17 KB), `created_ms`.
- `Save V2 Job Row` (dataTable upsert on `job_id`) appended after `Store V2 Async Draft Result`; `Prune V2 Job Rows` (deleteRows where `created_ms` older than 24 h) after it. Both `continueRegularOutput`, so a Data Table failure can never fail a generation.
- `Get V2 Job Row` (dataTable get by `job_id`, `alwaysOutputData`, `continueRegularOutput`) inserted between `V2 Async Status Webhook` and `Read V2 Async Job`.
- `Read V2 Async Job` rewritten (`n8n/nodes/read-v2-async-job.js`): returns the Data Table row when it is `complete`/`failed`, otherwise falls back to the legacy static-data logic unchanged (queued/processing progress, "still starting", 10-minute failed marking). Static-data writes are kept as-is (belt and braces).
- Dashboard (`src/App.jsx`): after 90 s of polling the status line explains the wait; the 10-minute timeout error now tells the editor what to do. No polling timing change.

Verification: node configs validated (runtime profile); live workflow validated (0 errors, 0 warnings); live copy matches the patched JSON byte for byte; reader unit-tested against row hit, row miss, malformed row, Data Table error item, wrong job, missing id, stale static entry. Live: single generation -> row saved (17 KB payload), poll answered from the table, prune removed old rows; 6 simultaneous generations -> 0 stuck (baseline 5 of 6); status endpoint edge cases (unknown id, missing id) unchanged.

## 2026-09-22 - Reality Show: remove WHAT PRODUCTION WILL BE LOOKING FOR section

Production workflow: `Green Light V2 - Conditional Casting Approval` (`TfpAYWYtDpOLWo2M`). Reality variant only; Normal and NLCEO untouched (they never contained this section). Requested by Rudy in Slack on 2026-09-22 after Celia (Sales) asked why an already-approved applicant is told the team will still be evaluating a checklist.

Backup before change: `n8n/backups/TfpAYWYtDpOLWo2M-before-reality-production-section-removal-2026-09-22T16-33-50Z.json`

- `Build V2 Letter` (reality branch only): removed the whole section: the heading, "During the next stage of casting, our team will be evaluating:", the eight tick items, "Receiving conditional approval means our team sees enough potential to advance your application." and "Final casting decisions remain subject to further review, production requirements, background review, scheduling, agreements, and final approval from the production team." THE REAL QUESTION now flows directly into YOUR AUTHORITY ASSET. No other line changed.
- `Refine V2 Draft JSON` system prompt: the heading is no longer listed among the fixed reality sections. Guardrail code unchanged.
- Formatter left untouched: it still recognises the heading for styling, which is harmless and keeps pre-change drafts formatting correctly.
- No dashboard change.

Verification: offline harness (20 checks) shows Normal and NLCEO `Build V2 Letter` and formatter outputs byte-identical old vs new; reality new letter equals old letter minus exactly the removed section; formatter doc text likewise; deadline, header and journey-page behaviour from 2026-09-17 unchanged; the competitive-profile closing marker line used by save/refine is intact. Live after deploy: reality generate + save + refine, NLCEO and Normal generate + save, all successful (test docs in Syed's folder).

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
