try {
const prep = $('Prepare V2 Refine Payload').first().json || {};
const generated = $input.first().json || {};

function normalize(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanTitleName(value) {
  return cleanText(value)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s*&\s*/g, ' & ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueWarnings(values) {
  const seen = new Set();
  return values
    .map(cleanText)
    .filter(Boolean)
    .filter((warning) => {
      const key = warning.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function parseJsonFromAi(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('AI refine returned an empty response.');
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(raw.slice(start, end + 1));
  }
  throw new Error('AI refine response was not valid JSON.');
}

function extractBetween(text, startMarker, endMarker) {
  const source = normalize(text);
  const start = source.indexOf(startMarker);
  if (start === -1) return null;
  const bodyStart = start + startMarker.length;
  const end = source.indexOf(endMarker, bodyStart);
  if (end === -1) return null;
  return source.slice(bodyStart, end).trim();
}

function replaceBetween(text, startMarker, endMarker, replacement) {
  const source = normalize(text);
  const start = source.indexOf(startMarker);
  if (start === -1) return source;
  const bodyStart = start + startMarker.length;
  const end = source.indexOf(endMarker, bodyStart);
  if (end === -1) return source;
  const cleanReplacement = normalize(replacement);
  if (!cleanReplacement) return source;
  return `${source.slice(0, bodyStart).replace(/\s*$/g, '')}\n${cleanReplacement}\n${source.slice(end).replace(/^\s*/g, '')}`.trim();
}

function extractGuestName(text) {
  const lines = normalize(text).split('\n').map((line) => cleanText(line)).filter(Boolean);
  const castLine = lines.find((line) => /^Cast Name\s*:/i.test(line));
  if (castLine) return castLine.replace(/^Cast Name\s*:/i, '').trim();
  const titleIndex = lines.findIndex((line) => /^CONDITIONAL CASTING APPROVAL$/i.test(line));
  if (titleIndex !== -1) {
    const candidate = lines[titleIndex + 1] || '';
    if (candidate && !/^Potential Feature/i.test(candidate)) return candidate;
  }
  const potentialIndex = lines.findIndex((line) => /^Potential Feature/i.test(line));
  if (potentialIndex > 0) {
    const candidate = lines[potentialIndex - 1] || '';
    if (candidate && !/^CONDITIONAL CASTING APPROVAL$/i.test(candidate)) return candidate;
  }
  return '';
}

function replaceGuestName(text, nextName) {
  const name = cleanTitleName(nextName);
  if (!name) return text;
  const lines = normalize(text).split('\n');
  const castIndex = lines.findIndex((line) => /^\s*Cast Name\s*:/i.test(line));
  if (castIndex !== -1) {
    lines[castIndex] = lines[castIndex].replace(/^\s*Cast Name\s*:.*/i, `Cast Name: ${name}`);
    return lines.join('\n').trim();
  }
  const titleIndex = lines.findIndex((line) => /^\s*CONDITIONAL CASTING APPROVAL\s*$/i.test(line));
  if (titleIndex !== -1 && lines[titleIndex + 1] && !/^\s*Potential Feature/i.test(lines[titleIndex + 1])) {
    lines[titleIndex + 1] = name;
    return lines.join('\n').trim();
  }
  const potentialIndex = lines.findIndex((line) => /^\s*Potential Feature/i.test(line));
  if (potentialIndex > 0) {
    lines[potentialIndex - 1] = name;
    return lines.join('\n').trim();
  }
  return text;
}

function maskEditableSlots(text) {
  let masked = normalize(text);
  const name = extractGuestName(masked);
  if (name) masked = replaceGuestName(masked, '__GUEST_NAME__');
  for (const slot of editableSlots) {
    masked = replaceBetween(masked, slot.start, slot.end, `__EDITABLE_${slot.key}__`);
  }
  return cleanText(masked).toLowerCase();
}


function sentenceContext(value, startIndex) {
  const text = String(value || '');
  let start = Math.max(text.lastIndexOf('.', startIndex), text.lastIndexOf('\n', startIndex), text.lastIndexOf('!', startIndex), text.lastIndexOf('?', startIndex));
  let endCandidates = ['.', '\n', '!', '?']
    .map((char) => text.indexOf(char, startIndex + 1))
    .filter((index) => index !== -1);
  let end = endCandidates.length ? Math.min(...endCandidates) : text.length;
  return cleanText(text.slice(start + 1, end + 1));
}

function findClaimContexts(value, regex) {
  const text = String(value || '');
  const flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
  const matcher = new RegExp(regex.source, flags);
  const results = [];
  let match;
  while ((match = matcher.exec(text)) !== null) {
    results.push({ phrase: match[0], context: sentenceContext(text, match.index) });
    if (match.index === matcher.lastIndex) matcher.lastIndex += 1;
  }
  return results;
}

function hasSafeGuaranteeContext(value) {
  const context = cleanText(value);
  if (!context || !/\bguarantee(?:d|s)?\b/i.test(context)) return false;
  if (/\bresults\s+vary\b/i.test(context)) return true;
  if (/\b(?:never|not|no|without|does\s+not|doesn't|do\s+not|don't|cannot|can't|will\s+not|won't|is\s+not|isn't|are\s+not|aren't|was\s+not|wasn't|were\s+not|weren't)\b[^.\n]{0,110}\bguarantee(?:d|s)?\b/i.test(context)) return true;
  if (/\bguarantee(?:d|s)?\s+(?:nothing|no\s+specific\s+outcomes?|no\s+business\s+outcomes?|no\s+results?)\b/i.test(context)) return true;
  return false;
}

function hasForbiddenGuaranteeContext(value) {
  const context = cleanText(value);
  if (!context || !/\bguarantee(?:d|s)?\b/i.test(context)) return false;
  if (hasSafeGuaranteeContext(context)) return false;
  if (/\bguarantee\s+you\b/i.test(context)) return true;
  if (/\b(?:we|our\s+team|inside\s+success|the\s+program|this\s+program|the\s+show|this\s+show|the\s+episode|this\s+episode|the\s+feature|this\s+feature|participation)\b[^.\n]{0,80}\bguarantee(?:d|s)?\b/i.test(context)) return true;
  if (/\byou(?:'re|\s+are|\s+will\s+be)?\s+guaranteed\b/i.test(context)) return true;
  return /\bguarantee(?:d|s)?\b[^.\n]{0,140}\b(?:media\s+exposure|publicity|visibility|press|placement|placements|clients?|customers?|leads?|revenue|sales|income|business\s+outcomes?|specific\s+business\s+outcomes?|results?|roi|growth|success|fame|famous|authority|distribution|broadcast|airtime|views?|viewers?|opportunit(?:y|ies))\b/i.test(context)
    || /\b(?:media\s+exposure|publicity|visibility|press|placement|placements|clients?|customers?|leads?|revenue|sales|income|business\s+outcomes?|specific\s+business\s+outcomes?|results?|roi|growth|success|fame|famous|authority|distribution|broadcast|airtime|views?|viewers?|opportunit(?:y|ies))\b[^.\n]{0,140}\bguarantee(?:d|s)?\b/i.test(context);
}

function claimHits(value) {
  const text = String(value || '');
  const hits = [];
  for (const item of findClaimContexts(text, /\b(guaranteed|guarantees|guarantee you)\b/gi)) {
    if (hasForbiddenGuaranteeContext(item.context)) hits.push(cleanText(item.phrase).toLowerCase());
  }
  const patterns = [
    /\b(will make you famous|will make you an authority|will go viral|will get you clients|will increase revenue)\b/gi,
    /(?:#1|\bnumber one\b)/gi,
    /\b(tier 1 outlets?|100\+ national|millions of viewers|commercial broadcast reuse|15[–-]25-minute|12-month marketing|what this opportunity provides)\b/gi,
    /\b(imdb|yahoo finance|marketwatch|business insider|roku|apple tv|amazon fire tv)\b/gi,
    /\b(red-?carpet|premium photoshoot)\b/gi,
  ];
  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      hits.push(cleanText(match[0]).toLowerCase());
      if (match.index === regex.lastIndex) regex.lastIndex += 1;
    }
  }
  return [...new Set(hits)];
}

function buildDocTitle(name) {
  const titleName = cleanTitleName(name || 'Edited Draft');
  return `Inside Success TV x ${titleName}`
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 180)
    .trim();
}

const standardEditableSlots = [
  { key: 'act_1', start: 'ACT 1: THE ORDINARY WORLD', end: 'Before the business existed...' },
  { key: 'act_2', start: 'ACT 2: THE CHALLENGE', end: 'This was the turning point.' },
  { key: 'act_3', start: 'ACT 3: THE JOURNEY', end: 'This is where your expertise was earned.' },
  { key: 'act_4', start: 'ACT 4: THE BREAKTHROUGH', end: 'This is the proof.' },
  { key: 'act_5', start: 'ACT 5: THE LEGACY', end: 'This is where your story becomes bigger than you.' },
  { key: 'thing', start: 'After reviewing your application, we believe the territory your brand has the opportunity to own is:', end: 'This becomes the foundation of authority.' },
  { key: 'mission', start: 'Based on our review, we believe your mission includes:', end: 'This is bigger than marketing.' },
  { key: 'why_now', start: 'For you, specifically, that can look like:', end: 'We do not guarantee exact outcomes - results may vary!' },
];
const realityEditableSlots = [
  { key: 'business_experience', start: '\nBUSINESS EXPERIENCE\n', end: '\nCOMPETITIVE EDGE\n' },
  { key: 'competitive_edge', start: '\nCOMPETITIVE EDGE\n', end: '\nPERSONALITY\n' },
  { key: 'personality', start: '\nPERSONALITY\n', end: '\nTHE WILDCARD\n' },
  { key: 'wildcard', start: '\nTHE WILDCARD\n', end: '\nThese are some of the qualities our production team will explore' },
];
const editableSlots = prep.show_type === 'reality' ? realityEditableSlots : standardEditableSlots;

const originalDraft = normalize(prep.draft_text || '');
const aiRaw = generated.output || generated.text || generated.response || generated.message || generated;
const extracted = typeof aiRaw === 'object' ? aiRaw : parseJsonFromAi(aiRaw);
const aiDraft = normalize(extracted.revised_draft_text || extracted.draft_text || extracted.letter_text || extracted.preview || '');
if (!aiDraft) throw new Error('AI refine returned no revised draft text.');

let warnings = uniqueWarnings([
  ...(Array.isArray(prep.warnings) ? prep.warnings : []),
  ...(Array.isArray(extracted.editor_warnings) ? extracted.editor_warnings : []),
  ...(Array.isArray(extracted.warnings) ? extracted.warnings : []),
]);

if (/\b(next step|deadline|deadline box|conditional approval|approval expires|media pack|rudy|episode link|customer journey|footer|header|logo|disclaimer|results vary|template copy|fixed text|fixed section|link)\b/i.test(prep.instructions || '')) {
  warnings.push('Fixed template warning: the requested edit may touch locked V2 template copy. The dashboard preserved the fixed template and only applied editable story/name changes.');
}

let finalDraft = originalDraft;
const aiGuestName = cleanText(extracted.guest_name || extractGuestName(aiDraft));
const originalGuestName = extractGuestName(originalDraft);
if (aiGuestName && aiGuestName !== originalGuestName) {
  finalDraft = replaceGuestName(finalDraft, aiGuestName);
}

for (const slot of editableSlots) {
  const replacement = extractBetween(aiDraft, slot.start, slot.end);
  if (replacement) {
    finalDraft = replaceBetween(finalDraft, slot.start, slot.end, replacement);
  }
}

if (maskEditableSlots(originalDraft) !== maskEditableSlots(aiDraft)) {
  warnings.push('Fixed template warning: AI attempted to alter locked V2 template text. Those fixed parts were preserved; only editable story/name sections were applied.');
}

if (prep.show_type === 'nlceo' && /deadline|expires|expiry|conditional approval expires/i.test(finalDraft)) {
  return [{ json: { ok: false, validation_status: 'failed', error: 'Refined NLCEO draft contains deadline or expiry language. The original draft was not changed.', warnings: uniqueWarnings(warnings) } }];
}

const originalClaims = new Set(claimHits(originalDraft));
const newClaims = claimHits(finalDraft).filter((claim) => !originalClaims.has(claim));
if (newClaims.length) {
  return [{ json: { ok: false, validation_status: 'failed', error: `AI refine introduced a compliance-sensitive claim (${newClaims.join(', ')}). The original draft was not changed. Try a safer instruction or regenerate.`, warnings: uniqueWarnings(warnings) } }];
}

const finalGuestName = extractGuestName(finalDraft) || prep.guest_name || originalGuestName;
return [{
  json: {
    ok: true,
    mode: 'refine',
    validation_status: 'passed',
    show_type: prep.show_type || 'normal',
    guest_name: finalGuestName,
    doc_title: buildDocTitle(finalGuestName),
    draft_text: finalDraft,
    preview: finalDraft,
    warnings: uniqueWarnings(warnings),
  }
}];
} catch (error) {
  return [{ json: { ok: false, mode: 'refine_error', validation_status: 'failed', error: error.message || 'V2 AI refine failed.', warnings: [] } }];
}