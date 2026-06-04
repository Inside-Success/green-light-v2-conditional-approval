# Green Light V2 Conditional Approval

Separate content-first dashboard for the V2 Inside Success TV Conditional Casting Approval letter.

## Boundaries

- This app is separate from the current production Green Light dashboard.
- It calls only the V2 n8n webhook configured in `VITE_V2_N8N_WEBHOOK_URL`.
- Generated documents are named with `V2`.
- The V2 workflow uses Rudy's Conditional Casting Approval template and Rudy Framework Brief for content slot filling.

## Local Commands

```bash
npm install
npm run build
npm run lint
```

Do not use a local dev server for this project unless explicitly approved.
