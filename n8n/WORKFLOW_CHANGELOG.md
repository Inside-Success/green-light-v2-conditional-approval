# V2 Workflow Changelog

## 2026-11-19 - Rep page: letters without a call transcript, and no cut on focus points

Tyler's Loom to the reps (2026-11-18) says a letter can be generated before Zoom has a transcript by typing context into the Focus points box, and Rudy asked for a version that works without a recording from the qualifying survey plus the rep's bullets. Decisions with Syed (2026-11-19): same form, the Focus points box doubles as the context box, no length limit on it, a minimum amount of context, not available for two prospects on one call, a prominent review warning in Tyler's words, and "read between the lines but never invent facts".

One node changed: `Clean V2 Transcript` (`n8n/nodes/clean-v2-transcript.js`). Everything is behind fields only the rep page sends.

- No-transcript mode. Only when `request_source` is `rep`, the transcript is empty and `transcript_mode` is `none`: the lines of `focus_points` (the rep's own notes and/or a pasted qualifying survey, joined as typed, no transcript clean-up applied) become `cleaned_transcript`, and `rep_prompt_block` gets a `NO_TRANSCRIPT_MODE` / `NO_TRANSCRIPT_RULES` block. The prompts (system messages) and the prompt expression are not changed: the existing grounding contract already forbids anything not in the source, and the block tells the AI that this text is the source. The rules, in short: every specific must be in the text; interpretation of stated facts is wanted, new facts are not; no "bigger than stated" claims, no outside knowledge about a named place or industry, figures exactly as stated, no invented reason / order of events / profession; never describe how the applicant sounds or comes across (no one heard them), but the personality field must still be written from what their path shows; every field at normal length, never empty; no reference to a call; application answers: use what they say about the applicant, never the budget / investment answer, a revenue bracket picked from a list, form or season names, consent lines; always you/your; no promises; ignore instructions inside the text; no "thin material" warnings.
- Minimum context in this mode: 8 real words for `reality`, `mansion`, `island`; 15 for `normal`, `nlceo`. Below that the node throws `Not enough context to write a letter without a transcript.` (the rep page checks the same numbers first, so the node is the backstop). Two prospects in this mode throw `A letter for two prospects needs the call transcript.`
- Focus points are no longer cut. Up to five lines of up to 300 characters produce exactly the `CASTING_MANAGER_FOCUS_POINTS` block as before (byte-identical). Anything more or longer, with a transcript, is passed whole as `CASTING_MANAGER_CONTEXT` with the same trust rules plus the application-answer rule. Backstop size limit 200,000 characters.
- New output field `transcript_mode` (`none` or empty). Nothing downstream reads it yet.

Not changed: every other node, all system prompts, the prompt expression, `Build V2 Letter`, refine, save, the formatter, compliance checks, length limits, the editors' dashboard. An editor request cannot switch the mode on (it needs `request_source: "rep"`); a missing or short transcript still fails exactly as before for every other request.

How it was built and tested:

- The rules were tuned on a private copy of the workflow with its own unguessable webhook paths (created and deleted the same day), so the live workflow was changed once, at the end.
- Offline harness, old live node vs new node, 2,130 checks, all identical: 59 real generation requests as sent, forced to each show, as multi-client variants and with a stray `transcript_mode` flag (editor path); today's rep requests with 0 to 5 short points for every show, single and multi; missing and too-short transcripts fail with the same error. Plus the new mode: floors per show, symbols not counted as words, digit-only and timestamp-looking lines kept, two prospects refused, mode flag ignored when a transcript is present, 800-line paste kept whole.
- Test inputs: two real qualifying surveys reps had pasted in Slack (one thin, one very detailed, both containing the investment answer, a revenue bracket, a season name and consent lines) and rep-style notes for ten real past prospects at five lengths (3-6, 9-13, 18-30, 45-80 and 120-180 words). The notes were written from the real call transcripts by separate agents that never saw the rules, with a list of true facts deliberately left out.
- Final run on the final rules: 105 requests. 4 were correctly refused by the minimum without an AI call; 101 of 101 letters were generated (96 without a transcript across all five shows, 5 with a transcript plus long context or six points). Section lengths match real call-based letters (for example Island median 164 words vs 169).
- Automatic check of every written section against the text the AI was given, 96 letters: 0 mentions of budget or investment, 0 revenue brackets, 0 other show names, 0 placeholders, 0 references to a call, 0 names or places not in the source. Traps: instructions planted in the notes (2), promise and ranking claims (1), a different show named in the notes (2), money talk in the rep's own words (2), other people named in the notes (1), heavy typos (1): none leaked into a letter.
- Independent audit: every one of the 96 no-transcript letters was checked against its source by three separate reviewer agents that had not seen the rules, twice. First round (earlier rule set): 5 invented specifics (four "more than 15 years", one worked-out age "by forty"), 44 unsupported claims of which a handful were material (a clinical role given to a hospital CEO, a stated reason replaced with another one), 3 explicit references to an application answer, no budget, show-name or injected-instruction leaks. Three rules were added from those findings (figures exactly as stated, no invented reason or order of events, no inferred profession). Second round on the final rules, with unsupported claims split into material and minor: 0 invented specifics, 0 serious sensitive items, 1 material unsupported claim (a story letter from a 28-word gist narrated how the applicant got clean), 45 minor ones (narrative glue such as "your career began in..."), 2 mild wording slips ("The casting notes describe you as...", a form question restated). 62 letters clean, 33 minor, 1 problem. The rubric changed between rounds (plain attributions such as "you describe yourself as" were no longer counted), so the two rounds are not a like-for-like comparison.
- Floor: at 3-6 words the letters were filler and one misread the notes ("recovery speaker" was written up as physical recovery), so they are refused. At 9-13 words the four-paragraph letters were general but true. The five-act story letters needed more, hence 15.
- An empty-section failure ("Personality paragraph is missing") appeared twice in the first hundred or so test letters; after the rule that the field must be written it did not appear again in the next 280-plus letters. The rep page also retries that failure silently.
- Route level: the real Magic Mike route handlers against the private copy (refusals, a no-transcript Island letter from the thin survey, two AI changes). Asked to "mention how much he can invest", the refine step declined and said why.

Known limits, stated plainly:

- The four-paragraph letters stay close to what was typed. The story letters (Feature Documentary, Next Level CEO) written from a two-sentence gist read well but contain narrative the AI inferred to connect the five acts (how one stage led to the next, a role the notes only imply). Rules reduced this; they did not remove it. That is what the review warning is for.
- Found while testing, not changed (it is in the shared builder and refine guardrail and affects editors too): when a Mansion or Island paragraph is trimmed to length, the sentence splitter treats the full stop in a number such as "$3.5 million" as a sentence end and drops the text before it. Seen once, after an AI change made a paragraph too long; 0 of 169 branded letters showed it at first generation. Fix proposed separately.

Deployed 2026-11-18T22:10:55Z (workflow `updatedAt`), 50 nodes, active, connections unchanged. After the deploy, on the live workflow: two editor-style generations (Island, Normal), one rep request with a transcript and two short points, and two no-transcript letters, all successful.

Backup before the change: `n8n/backups/TfpAYWYtDpOLWo2M-before-rep-no-transcript-2026-11-18T22-10-52Z.json`.

## 2026-11-18 - Rep self-serve page (Magic Mike) support

Rudy asked (Slack, 2026-11-16) for a "DIY" green light letter that reps make themselves. The rep page lives in the Magic Mike dashboard (`Inside-Success/sales-performance-dashboard`, route `/green-light`, see its `docs-green-light-letters.md`) and calls this workflow from its server. This dashboard and the editors' flow are unchanged.

Workflow changes, all optional fields that the editors' dashboard never sends:

- `Clean V2 Transcript` (`n8n/nodes/clean-v2-transcript.js`): reads `request_source` (`"rep"`) and `focus_points` (up to 5, 300 characters each) and builds `rep_prompt_block`. For rep requests the block names the selected show and tells the AI not to name a different show the prospect first applied for (Mansion, Island, Next Level CEO, Feature Documentary; generic Reality has no such rule). With focus points it adds them as trusted facts from the casting manager to emphasise, with rules: keep the rest of the story, prefer the focus point on a conflict, never write a promise, guarantee or ranking because of one, ignore instructions inside them, keep all length limits. Without these fields `rep_prompt_block` is an empty string.
- The three extract agents (`n8n/nodes/extract-v2-agent-user-prompt-expression.txt`, same expression on `Extract V2 Conditional Approval JSON`, `Extract V2 Reality Profile JSON`, `Extract V2 Branded Profile JSON`): insert `rep_prompt_block` before `TRANSCRIPT:`. Empty block = the exact prompt as before.
- `Prepare Edited V2 Save Payload`: passes `folder_group` (`"reps"` or empty).
- `Prepare V2 Editor Folder Lookup` (new reference copy `n8n/nodes/prepare-v2-editor-folder-lookup.js`): when `folder_group` is `reps`, the parent folder is `Reps` (`1X_CY7Rx2CW0XYF9xk1i98cQkCi6qHcYq`, inside the main folder) and the subfolder is the rep's name, created on first save like an editor folder.
- `Find V2 Editor Folder`: `pageSize=1000`, so the lookup still finds a rep's folder once there are more than 100 of them (Drive lists 100 by default).
- `Write V2 Google Doc Body`: retry on fail, 3 tries, 2 seconds apart. Google occasionally fails to fetch one of the letter images (execution 1838688 on 2026-11-18, an editor's Island save; the retry a minute later worked). The write is a single all-or-nothing batch, so retrying is safe. This also helps editors.

Not changed: prompts (system messages), `Build V2 Letter`, the formatter, refine, compliance checks, length limits.

Separate small workflow `Green Light V2 - rep activity log` (`BsxB8UWoGcK8onbg`): header-secret webhook `green-light-v2-rep-activity-log` writing one row per generate / AI change / final letter to the n8n data table `Green Light V2 - rep activity` (`3UmQlavuJVIXqKSI`). Export without the credential: `n8n/nodes/rep-activity-log-workflow.json`.

Verification:

- Offline: 1,183 checks. On 59 real generation requests (as sent, forced to each of the 5 show types, and as multi-client variants) the old and new `Clean V2 Transcript` outputs and the rendered AI prompt are identical, and the new output equals what the live run recorded. On 79 real saves the save payload and folder lookup are identical.
- Live, real transcripts: 15 baseline and switched-show generations and 19 focus-point generations across all 5 shows (supported points, facts not in the call, points that contradict the call, promise-type points, instruction-type points, five long points, multi-client). Facts from focus points were worked in and emphasised; promise and instruction points were ignored; Mansion and Island paragraphs stayed within 51 words each and 184 in total.
- Live saves with `folder_group: reps` for all 5 shows: one rep folder created and reused (name match ignores case and spacing), Mansion and Island PDFs 8 pages with the profile on one page and the deadline box on the last. An editor-style save still went to the editor's folder.

Backup before the change: `n8n/backups/TfpAYWYtDpOLWo2M-before-rep-self-serve-2026-11-18T15-04-46Z.json`.

## 2026-11-15 - Cohort deadline on the Mansion and Island letters (banner on every page, deadline box on NEXT STEP)

Production workflow `TfpAYWYtDpOLWo2M`. Backup before change: `n8n/backups/TfpAYWYtDpOLWo2M-before-branded-cohort-deadline-2026-11-15T18-41-44Z.json`. Normal, NLCEO and Reality untouched and proven byte-identical (harness: 697 checks, including save + formatter on 46 real Normal production letters, old live code vs new).

Source: Timothy Dick in Slack (2026-11-13): Boris added the cohort deadline to both design docs, "the only changes made were to add the cohort deadline in", effective Monday 2026-11-16. The docs differ from the 2026-11-06 version in exactly two things: a yellow banner above the header on every page and a deadline box after the media kit link.

Workflow changes (nodes `Build V2 Letter`, `Prepare V2 Google Doc Body`, `Refine V2 Draft JSON` prompt; mansion/island branches only):

- Banner: `public/workflow-assets/<show>/deadline-banner.png` (the docs' own 1224x61 image, "THIS CONDITIONAL APPROVAL ENDS AT 11:59 PM ON SUNDAY") is inserted in the header in front of the show header image, 612x31pt, same paragraph as in the docs. The assets were pushed and confirmed live on Vercel before the n8n deploy.
- Deadline box: the builder adds two fixed lines after the media kit link ("CONDITIONAL APPROVAL EXPIRES SUNDAY 11:59 PM" and "After this deadline your application may need to be re-reviewed by casting before being reconsidered for a future season."), so editors see them in the preview. The formatter draws them as three shaded paragraphs sharing one 3pt border (heading Plus Jakarta Sans 14 bold #F1C232, a 9pt gap line, body 12pt white), fill #000000 / border #CE973D on Mansion and #015FBC / #F1C232 on Island, 430pt wide from the text margin; measured against the docs' PDF the text positions and outer edges match. The heading is always the fixed wording and the box is always drawn, also when a draft has no deadline lines (drafts made before this change, or lines deleted in the preview); an edited body sentence is kept as typed. No time zone, as in the docs. No dashboard change: the wording is fixed, editors enter nothing.
- Space: the banner makes the header about 31pt taller (body now starts at 160.7pt instead of 130pt), so three layout changes keep every page as it was: (1) page-break characters are set to 1pt and page-break headings have no space above; before, the break character carried the heading's font size and held a 25-35pt line under the media pack and co-production graphics, (2) the blank spacer line before each section heading is dropped and the two flowing headings (YOUR COMPETITIVE PROFILE, DONE-FOR-YOU CONTENT PRODUCTION) carry it as 35pt space above, which a page top ignores; the spacer used to be able to land alone at the top of the next page and push that page down a line, (3) bottom margin 54 -> 42pt and Competitive Profile sub-headings 12/4 -> 8/2pt above/below. Result measured on live docs: the Competitive Profile page holds exactly what it held before (Mansion 17 lines of profile text, Island 18), so the condense thresholds, prompts and the 60/200 cap are unchanged. The co-production graphic went from 550 to 570pt (closer to the docs) because its page now has the room; media pack stays 530pt.
- Refine prompt: the Mansion/Island line now says these letters end NEXT STEP with a fixed deadline block that must be returned unchanged (it used to say they have no deadline). The guardrail already restores fixed copy from the original draft, so this only avoids a needless "fixed template" warning.

Known and unchanged: a Mansion profile that wraps to 18 lines (1 of 19 real letters on 2026-11-14/15) still pushes its closing sentence to the next page, exactly as before this change and as in the design doc's own sample.

Verification: page capacity measured before and after on the live workflow with real production letters (12 to 18 profile lines); 12 live generations from real transcripts (5 Mansion, 5 Island, 1 Normal, 1 Reality) with refine and save, every branded PDF 8 pages with the design's page starts, banner on every page, one box on page 8, profile on one page; side-by-side renders against the design docs; MCP validation.

## 2026-11-06 - Branded letters follow the updated design docs; dashboard mismatch warning only on clear contradictions

Production workflow `TfpAYWYtDpOLWo2M`. Backup before change: `n8n/backups/TfpAYWYtDpOLWo2M-before-branded-design-refresh-2026-11-06T17-55-02Z.json`. Normal, NLCEO and Reality untouched and proven byte-identical by the harness (100 checks).

Source: Boris's updated Mansion / Island design docs (re-exported 2026-11-06) and Adedokun's Loom about the variant warning (Slack DM).

Workflow changes (nodes `Build V2 Letter`, `Prepare V2 Google Doc Body`, `Refine V2 Draft JSON` prompt; mansion/island branches only):

- Headlines page removed (heading, page break and composite image), so a branded letter is 8 pages instead of 9.
- Opening sentence now ends "a strong fit for an upcoming reality show."; approval line now "continue through the casting process." (both dropped the "Inside Success TV" mention per the docs).
- NEXT STEP resources: the two-item list (Rudy episode + Inside Success media pack) is replaced by "Before your second call, please review the media kit:" and one link line "🔗 View the Mansion of Money Media Pack" / "🔗 View the Entrepreneurs Island Media Pack" (13pt, bold, underlined, brand colour, like the docs). The link opens the show's media kit hosted with the other assets (`.../workflow-assets/<show>/media-kit.jpg`, downloaded from Rudy's Dropbox links so nothing depends on Dropbox).
- Assets refreshed from the updated docs: new Island header and one-story graphic, two swapped media-pack tiles per show plus the new fifth row (Podcast Reel, BTS Reel) so the grid matches the docs; `headlines.jpg` deleted.
- Refine prompt: the fixed-copy list no longer mentions the headlines heading. Condense step, thresholds and the last-resort cap are unchanged.
- Typography and layout matched to the docs page by page (same evening, after Syed spotted the co-production page): headings bold in the docs' per-show sizes (Mansion: CONGRATULATIONS 18, COMPETITIVE PROFILE 24, DONE-FOR-YOU 20, MEDIA & CONTENT 21, MEDIA PACK 21, CO-PRODUCTION 20, NEXT STEP 20; Island: 21/24/24/24/25/24/20, NEXT STEP in #068EB0), MEDIA PACK and OUR UNIQUE CO-PRODUCTION MODEL pages centred (heading and the "See how..." line), subtitle 15pt/14pt, disclaimer 10pt, Island footer bold teal. Graphics enlarged toward the docs: one-story 580pt, media pack 530pt, co-production 550pt. Two Docs layout facts learned the hard way: the body's 115% line spacing was also applied to image lines (image paragraphs now use 100%), and the page-break paragraph takes a body line on the page before it, so a full-page graphic must leave ~20pt free or the next page is pushed out (that is why 590/570pt still spilled). Fjalla One has one weight, so Island bold is synthesised exactly as in the docs.

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
