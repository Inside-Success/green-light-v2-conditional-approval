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
- `reality` - Reality Show Conditional Casting Approval (added 2026-09-11). Uses Tom's reality template: no Story Formula/Thing/Mission sections; instead a Competitive Profile with four AI-filled paragraphs (Business Experience, Competitive Edge, Personality, The Wildcard). Since 2026-09-17 it has no deadline box and uses the banner-free header (the same treatment NLCEO gets), but keeps the default Inside Success branding. No customer journey page until one is provided.

Current behavior:

- Normal shows include the `IMPORTANT` deadline section.
- Next Level CEO/NLCEO shows omit deadline and expiry language.
- Reality shows omit the `IMPORTANT` deadline section and the header banner (like NLCEO), keep the NEXT STEP box unchanged, and have no final customer journey page.
- Reality compliance is lenient by design: the claim scanner runs only on the AI-filled paragraphs, never on the fixed template copy, and only outright promises block a save (for example `guarantee you`, `will get you clients`). Ranking or deliverable words in a reality paragraph produce editor warnings instead of blocks.
- The AI fills only content slots from the fixed Conditional Casting Approval template.
- AI refine can update only editable story/name sections; fixed template text is preserved and editor warnings are returned when a requested change touches locked copy.
- Generated files use `Inside Success TV x {Client Name}`.

Reference copies of the deployed Code node scripts and prompts live in `n8n/nodes/`. Reality extraction uses its own agent node and prompt (`Green_Light_V2_Reality_Profile_System_Prompt_PRODUCTION.md`); the original extraction prompt (`Green_Light_V2_Extract_System_Prompt_PRODUCTION.md`) is unchanged. `n8n/backups/` holds a pre-change export of the workflow (async job cache omitted). `n8n/templates/` holds the reality template document from marketing.
