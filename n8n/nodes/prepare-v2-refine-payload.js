const body = $input.first().json.body || {};

function normalize(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function cleanLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeWarnings(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map(cleanLine)
    .filter(Boolean)
    .filter((warning) => {
      const key = warning.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

const draftText = normalize(body.draft_text || body.letter_text || body.preview || '');
const instructions = cleanLine(body.instructions || body.instruction || body.query || body.refine_instruction || '');
const transcript = normalize(body.transcript || body.content || body.original_transcript || '');
const rawShowType = String(body.show_type || body.showType || 'normal');
const showType = /reality/i.test(rawShowType) ? 'reality' : (rawShowType.toLowerCase().includes('nl') ? 'nlceo' : 'normal');
const guestName = cleanLine(body.guest_name || body.client_name || body.clientName || '');
const docTitle = cleanLine(body.doc_title || body.title || '');
const warnings = normalizeWarnings(body.warnings || []);

const errors = [];
if (!draftText) errors.push('Current draft text is required before using AI refine.');
if (draftText && draftText.length < 500) errors.push('Current draft is too short for safe AI refinement.');
if (!instructions) errors.push('Please enter an AI refine instruction first.');

if (errors.length) {
  return [{ json: { ok: false, validation_status: 'failed', error: errors.join(' '), warnings } }];
}

const aiPrompt = [
  'EDITOR_INSTRUCTIONS:',
  instructions,
  '',
  'SHOW_TYPE:',
  showType,
  '',
  'CURRENT_GUEST_NAME:',
  guestName || '[not provided]',
  '',
  'CURRENT_DOC_TITLE:',
  docTitle || '[not provided]',
  '',
  'CURRENT_DRAFT:',
  draftText,
  '',
  'ORIGINAL_TRANSCRIPT_FOR_FACT_CHECKING:',
  transcript || '[not provided]'
].join('\n');

return [{
  json: {
    ok: true,
    validation_status: 'ready',
    draft_text: draftText,
    instructions,
    transcript,
    show_type: showType,
    guest_name: guestName,
    doc_title: docTitle,
    warnings,
    ai_prompt: aiPrompt,
  }
}];