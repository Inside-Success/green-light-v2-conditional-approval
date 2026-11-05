// Check V2 Branded Length - runs after Extract V2 Branded Profile JSON (Mansion / Island only).
// Measures the four Competitive Profile paragraphs. If any is over CONDENSE_MAX_WORDS or the four
// together exceed CONDENSE_MAX_TOTAL, the item is routed to the Condense agent (an AI rewrite that
// keeps every fact); otherwise it goes straight to Build V2 Letter. Never blocks: on any parse problem
// the item passes through unchanged.
const CONDENSE_MAX_WORDS = 50;
const CONDENSE_MAX_TOTAL = 180;
const CONDENSE_TARGET = '30 to 45 words (2 to 3 short sentences) per paragraph, and no more than 170 words across the four';

const generated = $input.first().json || {};

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

let needsCondense = false;
const counts = {};
let total = 0;
let condensePrompt = '';
try {
  const aiRaw = generated.output || generated.text || generated.response || generated.message || '';
  const parsed = typeof aiRaw === 'object' ? aiRaw : parseJsonFromAi(aiRaw);
  const paragraphs = {};
  for (const [field, keys] of Object.entries(FIELDS)) {
    const key = keys.find((k) => typeof parsed[k] === 'string' && parsed[k].trim());
    paragraphs[field] = key ? parsed[key].trim() : '';
    counts[field] = countWords(paragraphs[field]);
    total += counts[field];
  }
  needsCondense = Object.values(counts).some((n) => n > CONDENSE_MAX_WORDS) || total > CONDENSE_MAX_TOTAL;
  if (needsCondense) {
    condensePrompt = [
      `TARGET: ${CONDENSE_TARGET}.`,
      '',
      `BUSINESS_EXPERIENCE (${counts.business_experience} words):`,
      paragraphs.business_experience,
      '',
      `COMPETITIVE_EDGE (${counts.competitive_edge} words):`,
      paragraphs.competitive_edge,
      '',
      `PERSONALITY (${counts.personality} words):`,
      paragraphs.personality,
      '',
      `WILDCARD (${counts.wildcard} words):`,
      paragraphs.wildcard,
    ].join('\n');
  }
} catch (error) {
  needsCondense = false;
}

return [{
  json: {
    ...generated,
    branded_word_counts: counts,
    branded_total_words: total,
    branded_needs_condense: needsCondense,
    condense_prompt: condensePrompt,
  },
}];
