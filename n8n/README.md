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

Current behavior:

- Normal shows include the `IMPORTANT` deadline section.
- Next Level CEO/NLCEO shows omit deadline and expiry language.
- The AI fills only content slots from the fixed Conditional Casting Approval template.
- Generated files use `Green Light - {Client Name} x {Show Name}`.
