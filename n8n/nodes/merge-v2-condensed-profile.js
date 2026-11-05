// Merge V2 Condensed Profile - takes the Condense agent's four rewritten paragraphs and places them
// into the original extraction JSON (names, warnings and every other field untouched), then hands the
// result back to Check V2 Branded Length (which re-measures and may run one more pass) in the same shape the extractor produces. Any problem with the condensed
// output means that paragraph keeps its original text. Never blocks.
const check = $('Check V2 Branded Length').first().json || {};
const condensedItem = $input.first().json || {};

function parseJsonFromAi(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('AI returned an empty response.');
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) return JSON.parse(raw.slice(start, end + 1));
  throw new Error('AI response was not valid JSON.');
}
const countWords = (value) => String(value || '').split(/\s+/).filter(Boolean).length;
const FIELDS = {
  business_experience: ['business_experience', 'businessExperience'],
  competitive_edge: ['competitive_edge', 'competitiveEdge'],
  personality: ['personality', 'personality_profile'],
  wildcard: ['wildcard', 'the_wildcard', 'wild_card', 'wildCard'],
};
const MIN_WORDS = 15;
const MAX_WORDS = 75; // absolute ceiling; a condensed paragraph must also be shorter than the original

const originalRaw = check.output || check.text || check.response || check.message || '';
let merged = null;
let replaced = [];
try {
  const original = typeof originalRaw === 'object' ? originalRaw : parseJsonFromAi(originalRaw);
  const condensedRaw = condensedItem.output || condensedItem.text || condensedItem.response || condensedItem.message || '';
  const condensed = typeof condensedRaw === 'object' ? condensedRaw : parseJsonFromAi(condensedRaw);
  merged = { ...original };
  for (const [field, keys] of Object.entries(FIELDS)) {
    const originalKey = keys.find((k) => typeof original[k] === 'string' && original[k].trim()) || field;
    const candidate = keys.map((k) => condensed[k]).find((v) => typeof v === 'string' && v.trim());
    if (!candidate) continue;
    const text = candidate.replace(/\s+/g, ' ').trim();
    const words = countWords(text);
    const originalWords = countWords(original[originalKey]);
    if (words < MIN_WORDS || words > MAX_WORDS) continue;
    if (words >= originalWords) continue;
    if (/\[[^\]]+\]/.test(text)) continue;
    merged[originalKey] = text;
    replaced.push(field);
  }
} catch (error) {
  merged = null;
}

if (!merged) {
  return [{ json: { output: typeof originalRaw === 'object' ? JSON.stringify(originalRaw) : String(originalRaw), branded_condensed: false, branded_condense_passes: Number(check.branded_condense_passes || 0) + 1 } }];
}
return [{ json: { output: JSON.stringify(merged), branded_condensed: replaced.length > 0, branded_condensed_fields: replaced, branded_condense_passes: Number(check.branded_condense_passes || 0) + 1 } }];
