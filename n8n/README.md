# V2 n8n Workflow

Workflow name: `Green Light V2 - Conditional Casting Approval`

Workflow ID: `TfpAYWYtDpOLWo2M`

Webhook path:

```text
green-light-v2-conditional-approval
```

Production webhook URL used by the dashboard:

```text
https://insidesuccess.app.n8n.cloud/webhook/green-light-v2-conditional-approval
```

AI refine webhook URL used by the dashboard:

```text
https://insidesuccess.app.n8n.cloud/webhook/green-light-v2-conditional-approval-refine
```

Drive folder target:

```text
https://drive.google.com/drive/folders/1p5OoD3QlqhhHA0V0Eg02ZI4fkUQ13HwN
```

Verification docs created during implementation:

```text
Green Light - Jordan Ellis x Inside Success TV
https://docs.google.com/document/d/1tZhHaCs02mfhzP4M-sX9ySKLL9IcfPD3292L9ulQueI/edit

Green Light - Morgan Patel x Next Level CEO
https://docs.google.com/document/d/1ledo0ZPVBJSWRxLbxT0DiQ81F37GdTrkPRSNb0F94ss/edit
```

Show variants (`show_type` sent by the dashboard):

- `normal` - Rudy Conditional Casting Approval letter with the Hollywood Story Formula, deadline box, and the default customer journey page.
- `nlceo` - Next Level CEO variant: same story letter, no deadline/expiry language, Next Level CEO header and journey page.
- `mansion` / `island` - Mansion of Money and Entrepreneurs Island branded reality letters (added 2026-11-05, Rudy's request). Same four AI paragraphs as `reality` (prompt targets 30-45 words; if the extraction comes back longer than 50 words per paragraph or 195 in total, an AI condense step rewrites the four paragraphs to length while keeping every fact, so the Competitive Profile fits one page without editor trimming; a deterministic cap of 60/200 in the builder is the last-resort safety net and adds a review note if it ever fires) via their own agent node `Extract V2 Branded Profile JSON` (prompt `n8n/nodes/extract-v2-branded-reality-profile-system-prompt.txt`), routed by IF node `V2 Branded Reality?` ahead of `V2 Reality Show?`. Fixed copy follows Boris's design docs: show title instead of Inside Success TV, CONGRATULATIONS!, YOUR COMPETITIVE PROFILE, DONE-FOR-YOU CONTENT PRODUCTION (with the one-story graphic), MEDIA & CONTENT OPPORTUNITIES, MEDIA PACK (14-tile grid: 3x4 plus Podcast Reel and BTS Reel), OUR UNIQUE CO-PRODUCTION MODEL, NEXT STEP (its only resource link is the show's own media kit, "🔗 View the <Show> Media Pack", served from `public/workflow-assets/<show>/media-kit.jpg`, followed by the cohort deadline box added 2026-11-15: "CONDITIONAL APPROVAL EXPIRES SUNDAY 11:59 PM" plus one fixed sentence, black/gold on Mansion and blue/yellow on Island; the formatter always draws the box, also for drafts written before it existed), disclaimer; a yellow deadline banner (`deadline-banner.png`) above the show header on every page; no IMPORTANT block and no editor-entered deadline (the wording is fixed), no customer journey page, no headlines page (removed 2026-11-06 with the updated design docs); the show website in the footer. Per-show fonts, sizes and colours follow the design docs exactly (Mansion: Cinzel bold gold #CE973D / Open Sans; Island: Fjalla One bold #015FBC and #068EB0 / Plus Jakarta Sans; MEDIA PACK and CO-PRODUCTION pages centred; image paragraphs use 100% line spacing; graphic widths are 580/530/570pt and the page-break characters are set to 1pt so they do not hold a heading-sized line under a full-page graphic, see WORKFLOW_CHANGELOG 2026-11-06 and 2026-11-15). Assets live in `public/workflow-assets/mansion/` and `.../island/` (extracted from the design docs' DOCX export; the media kits were downloaded from Rudy's Dropbox links so the letters never depend on Dropbox). Saved docs are named `Mansion of Money TV x Name` / `Entrepreneurs Island TV x Name`. Save, refine and compliance reuse the reality (lenient) path.
- `reality` - Reality Show Conditional Casting Approval (added 2026-09-11). Uses Tom's reality template: no Story Formula/Thing/Mission sections; instead a Competitive Profile with four AI-filled paragraphs (Business Experience, Competitive Edge, Personality, The Wildcard). Since 2026-09-17 it has no deadline box and uses the banner-free header (the same treatment NLCEO gets), but keeps the default Inside Success branding. Since 2026-09-22 the WHAT PRODUCTION WILL BE LOOKING FOR section is gone (Rudy's request); THE REAL QUESTION flows straight into YOUR AUTHORITY ASSET. No customer journey page until one is provided.

Current behavior:

- Normal shows include the `IMPORTANT` deadline section.
- Next Level CEO/NLCEO shows omit deadline and expiry language.
- Reality shows omit the `IMPORTANT` deadline section and the header banner (like NLCEO), omit the WHAT PRODUCTION WILL BE LOOKING FOR section, keep the NEXT STEP box unchanged, and have no final customer journey page.
- Reality compliance is lenient by design: the claim scanner runs only on the AI-filled paragraphs, never on the fixed template copy, and only outright promises block a save (for example `guarantee you`, `will get you clients`). Ranking or deliverable words in a reality paragraph produce editor warnings instead of blocks.
- The AI fills only content slots from the fixed Conditional Casting Approval template.
- AI refine can update only editable story/name sections; fixed template text is preserved and editor warnings are returned when a requested change touches locked copy.
- Generated files use `Inside Success TV x {Client Name}`.

Editors and Drive folders: the dashboard offers a fixed editor list (`EDITOR_OPTIONS` in `src/App.jsx`: Adedokun Adedoyin (default), Syed, Sheena). n8n does not hard-code editor names: on save, `Prepare V2 Editor Folder Lookup` / `Find V2 Editor Folder` / `Select V2 Editor Folder` match the selected name against subfolders of the parent Drive folder `Client's PDFs Green Light Letter` (`1p5OoD3QlqhhHA0V0Eg02ZI4fkUQ13HwN`) and `Create V2 Editor Folder` creates one if missing. To add or replace an editor: change the dashboard list and create the matching subfolder (exact name, case-insensitive match). 2026-10-01: Daniel replaced by Sheena; Daniel's folder and its letters were left in place.

Rep self-serve page (since 2026-11-18): sales reps create their own letters on the Magic Mike dashboard (`/green-light` in `Inside-Success/sales-performance-dashboard`), which calls this workflow's `-start`, `-status`, `-refine` and `-save` webhooks from its server. It sends three optional fields the editors' dashboard never sends: `request_source: "rep"` (the AI is told the selected show and must not name a different one), `focus_points` (up to 5 points from the rep, treated as trusted facts to emphasise, never as promises) and on save `folder_group: "reps"` (the doc goes to `Reps/<rep name>` inside the parent Drive folder; `Reps` is `1X_CY7Rx2CW0XYF9xk1i98cQkCi6qHcYq`). Since 2026-11-19 it can also send `transcript_mode: "none"` with an empty transcript: `Clean V2 Transcript` then uses the rep's Focus points text (their own notes and/or a pasted qualifying survey) as the only source and adds a `NO_TRANSCRIPT_RULES` block to the AI input (same grounding rules, interpretation allowed, no invented facts, never budget or investment answers, no form or season names); only for `request_source: "rep"`, one prospect, and at least 8 words (15 for the story letters). Focus points longer than five short lines are no longer cut: they are passed whole as `CASTING_MANAGER_CONTEXT`. Without those fields the workflow behaves exactly as before. Rep activity is logged by the separate workflow `Green Light V2 - rep activity log` (`BsxB8UWoGcK8onbg`) into the data table `Green Light V2 - rep activity` (`3UmQlavuJVIXqKSI`). On that page the Normal variant is labelled "Feature Documentary". See WORKFLOW_CHANGELOG 2026-11-18.

Async job tracking (since 2026-09-24): each generation's finished result is written to the n8n Data Table `Green Light V2 - async jobs` (id `VHryMbxgGIxi1Zur`, one row per job, pruned after 24 hours) by `Save V2 Job Row` / `Prune V2 Job Rows`, and the status webhook reads that row first via `Get V2 Job Row` before falling back to the legacy workflow static-data store. This replaced the shared static-data blob as the source of truth because concurrent generations overwrote each other's completion (last writer wins), leaving the dashboard polling until timeout. Node definitions: `n8n/nodes/async-datatable-nodes.json`; status reader: `n8n/nodes/read-v2-async-job.js`.

Reference copies of the deployed Code node scripts and prompts live in `n8n/nodes/`. Reality extraction uses its own agent node and prompt (`Green_Light_V2_Reality_Profile_System_Prompt_PRODUCTION.md`); the original extraction prompt (`Green_Light_V2_Extract_System_Prompt_PRODUCTION.md`) is unchanged. `n8n/backups/` holds a pre-change export of the workflow (async job cache omitted). `n8n/templates/` holds the reality template document from marketing.
