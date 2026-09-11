const body = $input.first().json.body || {};
const asyncJobId = String(body.async_job_id || body.asyncJobId || '').trim();
const asyncMode = body.async_mode === true || body.async_mode === 'true' || Boolean(asyncJobId);
if (asyncJobId) {
  const store = $getWorkflowStaticData('global');
  store.v2_async_jobs = store.v2_async_jobs || {};
  const existing = store.v2_async_jobs[asyncJobId] || {};
  store.v2_async_jobs[asyncJobId] = { ...existing, job_id: asyncJobId, status: 'processing', progress: 'Generating V2 letter', updated_at: new Date().toISOString() };
}
const raw = String(body.content || body.transcript || '').trim();
const rawShowType = String(body.show_type || body.showType || 'normal');
const showType = /reality/i.test(rawShowType)
  ? 'reality'
  : (rawShowType.toLowerCase().includes('nl') || /next\s*level\s*ceo/i.test(rawShowType) ? 'nlceo' : 'normal');
const deadlineText = String(body.deadline_text || body.deadlineText || 'Sunday 11.59pm EST').trim();
const multiClient = body.multi_client === true || body.multi_client === 'true';
const multiClientLetterCount = [1, 2].includes(Number(body.multi_client_letter_count)) ? Number(body.multi_client_letter_count) : 1;
const targetClientName = String(body.target_client_name || body.targetClientName || '').replace(/\s+/g, ' ').trim();
const targetClientPosition = [1, 2].includes(Number(body.target_client_position)) ? Number(body.target_client_position) : 1;
const clientNames = Array.isArray(body.client_names)
  ? body.client_names.map((name) => String(name || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 2)
  : [];
const manualClientName = String(
  body.client_name ||
  body.clientName ||
  body.guest_name_override ||
  body.guestNameOverride ||
  (multiClient ? targetClientName : '') ||
  ''
).replace(/\s+/g, ' ').trim();

if (!raw) throw new Error('No transcript found.');
if (raw.length < 120) throw new Error('Transcript is too short for reliable V2 extraction.');

let cleaned = raw
  .replace(/^WEBVTT.*$/gm, '')
  .replace(/^\d+\s*$/gm, '')
  .replace(/^[\d.]*\d+:\d{2}[:\d.]*\s*-->\s*[\d:. ]+$/gm, '')
  .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, '')
  .replace(/\(\d{1,2}:\d{2}(?::\d{2})?\)/g, '')
  .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\s*-?\s*/gm, '')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

return [{
  json: {
    cleaned_transcript: cleaned,
    show_type: showType,
    deadline_text: deadlineText,
    manual_client_name: manualClientName,
    multi_client: multiClient,
    multi_client_letter_count: multiClient ? multiClientLetterCount : 1,
    target_client_name: multiClient ? targetClientName : '',
    target_client_position: multiClient ? targetClientPosition : 1,
    client_names: multiClient ? clientNames : [],
    requested_at: body.timestamp || new Date().toISOString(),
    async_job_id: asyncJobId,
    async_mode: asyncMode
  }
}];