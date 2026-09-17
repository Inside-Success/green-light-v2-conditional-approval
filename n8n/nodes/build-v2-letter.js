try {
const generated = $input.first().json || {};
const cleanNode = $('Clean V2 Transcript').first().json || {};
const showType = cleanNode.show_type || 'normal';
const deadlineText = cleanNode.deadline_text || 'Sunday 11.59pm EST';
const manualClientNameRaw = cleanNode.manual_client_name || '';
const transcriptForChecks = String(cleanNode.cleaned_transcript || '');

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
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(raw.slice(start, end + 1));
  }
  throw new Error('AI response was not valid JSON.');
}

function cleanText(value) {
  return String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitleName(value) {
  return cleanText(value)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s*&\s*/g, ' & ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanParagraph(value) {
  return cleanText(value)
    .replace(/^[-•✓➔]+\s*/, '')
    .replace(/\[(?:insert|guest|mission|date|book|link)[^\]]*\]/gi, '')
    .trim();
}

function cleanHeading(value) {
  return cleanText(value)
    .replace(/^[-•✓➔]+\s*/, '')
    .replace(/^\*+|\*+$/g, '')
    .replace(/:$/g, '')
    .trim();
}

function isBadName(value) {
  const name = cleanText(value).toLowerCase();
  return !name || /^(guest name|guest|client|unknown|iphone|phone|caller|document|n\/a|na)$/.test(name) || name.includes('[') || name.includes(']');
}

function hasPlaceholder(value) {
  const text = String(value || '');
  return /\[[^\]]+\]/.test(text) || /INSERT (THING|BOOK|LINK|MISSION|DATE)/i.test(text);
}

function sentenceContext(value, startIndex) {
  const text = String(value || '');
  let start = Math.max(text.lastIndexOf('.', startIndex), text.lastIndexOf('\n', startIndex), text.lastIndexOf('!', startIndex), text.lastIndexOf('?', startIndex));
  let endCandidates = ['.', '\n', '!', '?']
    .map((char) => text.indexOf(char, startIndex + 1))
    .filter((index) => index !== -1);
  let end = endCandidates.length ? Math.min(...endCandidates) : text.length;
  const context = cleanText(text.slice(start + 1, end + 1));
  return context.length > 280 ? `${context.slice(0, 277)}...` : context;
}

function lineContext(value, startIndex) {
  const text = String(value || '');
  const start = text.lastIndexOf('\n', startIndex) + 1;
  const nextBreak = text.indexOf('\n', startIndex);
  const end = nextBreak === -1 ? text.length : nextBreak;
  const line = cleanText(text.slice(start, end));
  return line.length > 280 ? `${line.slice(0, 277)}...` : line;
}

function findClaimContexts(value, regex) {
  const text = String(value || '');
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const matcher = new RegExp(regex.source, flags);
  const results = [];
  let match;
  while ((match = matcher.exec(text)) !== null) {
    results.push({ phrase: match[0], context: sentenceContext(text, match.index), line: lineContext(text, match.index) });
    if (match.index === matcher.lastIndex) matcher.lastIndex += 1;
  }
  return results;
}

function hasPromiseContext(value) {
  const context = String(value || '');
  if (hasSafeGuaranteeContext(context)) return false;
  return /\b(will|guarantee|guaranteed|guarantees|includes?|provides?|receive|get|secure|placed?|placement|featured?|published?|appear|aired|broadcast|stream(?:ed|ing)?|distributed?|available on|reach|viewers?|outlets?|package|deliverable|asset|opportunit(?:y|ies))\b/i.test(context);
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

function hasUnapprovedDeliverableContext(value) {
  const context = String(value || '');
  if (/\b(?:not|no|without|does not|do not|isn't|is not|are not|aren't)\b[^.\n]{0,80}\b(?:asset|deliverable|footage|photoshoot|content|package|included|includes|receive|get|provides?)\b/i.test(context)) return false;
  return /\b(asset|deliverable|footage|photoshoot|content|package|included|includes|receive|get|provides?)\b/i.test(context);
}

function hardBlockMessage(kind, item) {
  return `${kind}: "${item.phrase}" in line "${item.line || item.context}". Please try regenerating the letter; this may resolve the issue. If it repeats, edit the wording before saving.`;
}

function analyzeClaimSafety(value) {
  const hardBlocks = [];
  const warnings = [];
  const text = String(value || '');

  for (const item of findClaimContexts(text, /\b(guaranteed|guarantees|guarantee you)\b/i)) {
    if (hasForbiddenGuaranteeContext(item.context)) {
      hardBlocks.push(hardBlockMessage('Forbidden guarantee/outcome claim', item));
    } else if (!hasSafeGuaranteeContext(item.context)) {
      warnings.push(`Compliance review: guarantee-related wording "${item.phrase}" appears in an ambiguous line. Line: "${item.line || item.context}". Please verify it is not promising a specific outcome.`);
    }
  }

  for (const item of findClaimContexts(text, /\b(will make you famous|will make you an authority|will go viral|will get you clients|will increase revenue)\b/i)) {
    hardBlocks.push(hardBlockMessage('Forbidden guarantee/outcome claim', item));
  }

  for (const item of findClaimContexts(text, /(?:#1|\bnumber one\b)/i)) {
    if (/\b(?:#1|number one)\s+(goal|priority|focus|reason|objective|mission)\b/i.test(item.context)) {
      warnings.push(`Compliance review: possible ranking phrase "${item.phrase}" appears in a likely safe line. Line: "${item.line || item.context}". Please verify this is not a #1 market claim.`);
    } else {
      hardBlocks.push(hardBlockMessage('Forbidden ranking/superiority claim', item));
    }
  }

  for (const item of findClaimContexts(text, /\b(tier 1 outlets?|100\+ national|millions of viewers|commercial broadcast reuse|15[–-]25-minute|12-month marketing|what this opportunity provides)\b/i)) {
    hardBlocks.push(hardBlockMessage('Forbidden unapproved offer claim', item));
  }

  for (const item of findClaimContexts(text, /\b(red-?carpet|premium photoshoot)\b/i)) {
    if (hasPromiseContext(item.context)) {
      hardBlocks.push(hardBlockMessage('Forbidden unapproved production deliverable claim', item));
    } else {
      warnings.push(`Compliance review: production-related phrase "${item.phrase}" appears. Line: "${item.line || item.context}". Please verify it is not being presented as an included deliverable.`);
    }
  }

  for (const item of findClaimContexts(text, /\b(behind-the-scenes)\b/i)) {
    if (hasUnapprovedDeliverableContext(item.context)) {
      hardBlocks.push(hardBlockMessage('Forbidden unapproved deliverable claim', item));
    } else {
      warnings.push(`Compliance review: storytelling phrase "${item.phrase}" appears. Line: "${item.line || item.context}". Please verify it is not being presented as an included deliverable.`);
    }
  }

  for (const item of findClaimContexts(text, /\b(imdb|yahoo finance|marketwatch|business insider|roku|apple tv|amazon fire tv)\b/i)) {
    if (hasPromiseContext(item.context)) {
      hardBlocks.push(hardBlockMessage('Forbidden media/distribution promise', item));
    } else {
      warnings.push(`Compliance review: media/distribution term "${item.phrase}" appears. Line: "${item.line || item.context}". Please verify it is not being presented as placement or distribution promise.`);
    }
  }

  return { hardBlocks, warnings };
}

function warningLine(value) {
  const text = cleanText(value);
  return text.length > 260 ? `${text.slice(0, 257)}...` : text;
}

function addSofteningWarning(warnings, label, original, replacement) {
  const before = warningLine(original);
  const after = warningLine(replacement);
  if (!before || !after || before === after) return;
  warnings.push(`Wording softened for compliance in ${label}. Line now reads: "${after}". Original wording included: "${before}". Please review before saving.`);
}

function softenPersonalizedText(value, label, warnings) {
  let text = cleanText(value);
  if (!text) return text;
  const originalText = text;

  text = text.replace(/\b(?:the\s+)?(?:#1|number one)\s+(?:sales\s+rep|rep|representative|salesperson|performer|agent)\s+out\s+of\s+(\d+)\s+([^.,;\n]+)/gi, (_match, count, group) => {
    return `one of the top performers among ${count} ${cleanText(group)}`;
  });

  text = text.replace(/\b(?:the\s+)?(?:#1|number one)\s+([a-z][a-z '&-]{2,70}?)(\s+(?:in|for|within|across)\s+[^.,;\n]+)?(?=\.|,|;|$)/gi, (match, claim, scope = '') => {
    if (/^(goal|priority|focus|reason|objective|mission)\b/i.test(claim)) return match;
    return `a recognized ${cleanText(`${claim}${scope}`)}`;
  });

  text = text.replace(/\b(?:the\s+)?(?:best|top-rated)\s+([a-z][a-z '&-]{2,70}?)(\s+(?:in|for|within|across)\s+[^.,;\n]+)?(?=\.|,|;|$)/gi, (match, claim, scope = '') => {
    const fullClaim = cleanText(`${claim}${scope}`);
    const context = cleanText(match);
    const protectedStoryContext = /\b(best\s+(?:possible|case|thing|effort|shot|way|life|friend|interest|outcome|outcomes|option|options|result|results|version)|doctor|doctors|hospital|diagnos|tumou?r|wheelchair|surviv|parents?|prognosis|surgery|health|medical|illness|disease|treatment)\b/i;
    const promotionalContext = /\b(business|company|brand|product|service|solution|provider|agency|firm|practice|expert|authority|leader|lawyer|coach|consultant|realtor|agent|rep|representative|clinic|advisor|mentor|team|contractor|entrepreneur|category|market|industry|sales|performance|performer)\b/i;
    if (protectedStoryContext.test(context) || protectedStoryContext.test(fullClaim)) return match;
    if (!scope && !promotionalContext.test(fullClaim)) return match;
    return `a well-regarded ${fullClaim}`;
  });

  text = text.replace(/\b(?:the\s+leading|most trusted)\s+([a-z][a-z '&-]{2,70}?)(\s+(?:in|for|within|across)\s+[^.,;\n]+)?(?=\.|,|;|$)/gi, (match, claim, scope = '') => {
    if (/^(it|you|them|him|her|us|we|they|your|their)\b/i.test(cleanText(claim))) return match;
    return `a trusted ${cleanText(`${claim}${scope}`)}`;
  });

  text = text.replace(/\bindustry leader\b/gi, 'strong voice in the industry');
  text = text.replace(/\bthe go-to leader\b/gi, 'a trusted voice');
  text = text.replace(/\bthe leading expert\b/gi, 'an experienced voice');
  text = text.replace(/\bthe expert\b/gi, 'an experienced voice');
  text = text.replace(/\bthe authority\b/gi, 'a credible voice');
  text = text.replace(/\bthe face of\b/gi, 'a visible voice in');

  text = text.replace(/\bwill increase (?:your\s+)?(?:revenue|sales|income)\b/gi, 'can support stronger visibility and positioning');
  text = text.replace(/\bwill get you (clients|customers|leads)\b/gi, (_match, audience) => `can help build trust with potential ${audience}`);
  text = text.replace(/\bguaranteed (?:media exposure|publicity|visibility|press|placement|placements|clients|customers|leads|revenue|sales|income)\b/gi, 'potential visibility and credibility');
  text = text.replace(/\bguarantees? (?:media exposure|publicity|visibility|press|placement|placements|clients|customers|leads|revenue|sales|income)\b/gi, 'may support visibility and credibility');

  if (text !== originalText) addSofteningWarning(warnings, label, originalText, text);
  return text;
}

function softenWhyBullets(items, warnings) {
  return items.map((item, index) => ({
    heading: softenPersonalizedText(item.heading, `Why This Story Matters bullet ${index + 1} heading`, warnings),
    body: softenPersonalizedText(item.body, `Why This Story Matters bullet ${index + 1} body`, warnings),
  }));
}

function cleanNameArray(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map(cleanText)
    .filter((name) => !isBadName(name))
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function toConfidence(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : null;
}

function hasCallTransferSignal(value) {
  return /\b(call\s+(?:was\s+)?transferred|transferring\s+(?:the\s+)?call|transferred\s+(?:the\s+)?call|taking over\s+(?:the\s+)?call|jumping on\s+(?:the\s+)?call|another rep|another representative|my colleague|colleague.*take over|emergency)\b/i.test(String(value || '')); 
}

function buildNameWarning(name, possibleGuests, possibleReps) {
  const detected = [...possibleGuests, ...possibleReps].filter(Boolean);
  const unique = [...new Set(detected.map((item) => item.trim()).filter(Boolean))].slice(0, 6);
  const selected = name ? ` (${name})` : '';
  const details = unique.length ? ` Names detected: ${unique.join(', ')}.` : '';
  return `Possible client name issue: transcript includes multiple people or a call transfer. Please verify the guest name${selected} before saving.${details}`;
}

function isUsefulWarning(value) {
  const text = cleanText(value);
  if (!text) return false;
  return /\b(name|guest|client|candidate|rep|representative|speaker|transfer|handoff|ambiguous|multiple|verify|review|compliance|claim|ranking|media|distribution|placement|deliverable|unsupported|unverified|placeholder|deadline|expires|expiry|google drive|too thin|conflicting|conflict|unclear)\b/i.test(text);
}

function uniqueCleanWarnings(values) {
  const seen = new Set();
  return values
    .map(cleanText)
    .filter(isUsefulWarning)
    .filter((warning) => {
      const key = warning.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function normalizeWhyBullets(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === 'string') {
      const clean = cleanParagraph(item).replace(/^➔\s*/, '');
      const [headingPart, ...bodyParts] = clean.split(':');
      return {
        heading: cleanHeading(bodyParts.length ? headingPart : 'Being Remembered'),
        body: cleanParagraph(bodyParts.length ? bodyParts.join(':') : clean),
      };
    }
    return {
      heading: cleanHeading(item.heading || item.subheading || item.title),
      body: cleanParagraph(item.body || item.explanation || item.text),
    };
  }).filter((item) => item.heading && item.body).slice(0, 5);
}

const aiRaw = generated.output || generated.text || generated.response || generated.message || generated;
const extracted = typeof aiRaw === 'object' ? aiRaw : parseJsonFromAi(aiRaw);
const manualClientName = cleanText(manualClientNameRaw);
const aiGuestName = cleanText(extracted.guest_name);
const possibleGuestNames = cleanNameArray(extracted.possible_guest_names || extracted.possible_client_names || []);
const possibleRepNames = cleanNameArray(extracted.possible_rep_names || extracted.possible_representative_names || []);
const guestNameConfidence = toConfidence(extracted.guest_name_confidence ?? extracted.client_name_confidence ?? extracted.name_confidence);
const aiWarnings = Array.isArray(extracted.warnings) ? extracted.warnings.map(cleanText).filter(Boolean) : [];
const nameWarnings = [];
const finalGuestName = manualClientName || aiGuestName;

if (!manualClientName) {
  const selectedName = aiGuestName.toLowerCase();
  const nameCouldBeRep = selectedName && possibleRepNames.some((name) => name.toLowerCase() === selectedName);
  const multiplePossibleGuests = possibleGuestNames.length > 1;
  const lowConfidence = guestNameConfidence !== null && guestNameConfidence < 0.75;
  const partialNameDuringTransfer = hasCallTransferSignal(transcriptForChecks) && !/\s/.test(aiGuestName.trim());
  const transferAmbiguity = hasCallTransferSignal(transcriptForChecks) && (guestNameConfidence === null || guestNameConfidence < 0.9 || multiplePossibleGuests || nameCouldBeRep || partialNameDuringTransfer);
  if (!isBadName(aiGuestName) && (lowConfidence || multiplePossibleGuests || nameCouldBeRep || transferAmbiguity)) {
    nameWarnings.push(buildNameWarning(aiGuestName, possibleGuestNames, possibleRepNames));
  }
}

const baseWarnings = uniqueCleanWarnings(
  manualClientName
    ? aiWarnings.filter((warning) => !/\b(name|guest|client|rep|representative|speaker|transfer|handoff)\b/i.test(warning))
    : [...aiWarnings, ...nameWarnings]
);

if (showType === 'reality') {
  const realityWarnings = [];
  function normalizeRealityDashes(value) {
    let text = String(value || '');
    if (!/[–—]/.test(text)) return text;
    text = text.replace(/(\d)\s*[–—]+\s*(\d)/g, '$1-$2');
    text = text.replace(/^\s*[–—]+\s*/, '');
    text = text.replace(/\s*[–—]+\s*$/, '.');
    text = text.replace(/([,;:])\s*[–—]+\s*/g, '$1 ');
    text = text.replace(/\s*[–—]+\s*([,;:.!?])/g, '$1');
    text = text.replace(/\s*[–—]+\s*/g, ', ');
    return text.replace(/\s+/g, ' ').trim();
  }
  function pickRealityField(...keys) {
    for (const key of keys) {
      const value = extracted[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    return '';
  }
  const realityRaw = {
    business_experience: cleanParagraph(normalizeRealityDashes(pickRealityField('business_experience', 'businessExperience'))),
    competitive_edge: cleanParagraph(normalizeRealityDashes(pickRealityField('competitive_edge', 'competitiveEdge'))),
    personality: cleanParagraph(normalizeRealityDashes(pickRealityField('personality', 'personality_profile'))),
    wildcard: cleanParagraph(normalizeRealityDashes(pickRealityField('wildcard', 'the_wildcard', 'wild_card', 'wildCard'))),
  };
  const realityData = {
    guest_name: finalGuestName,
    business_experience: softenPersonalizedText(realityRaw.business_experience, 'Business Experience', realityWarnings),
    competitive_edge: softenPersonalizedText(realityRaw.competitive_edge, 'Competitive Edge', realityWarnings),
    personality: softenPersonalizedText(realityRaw.personality, 'Personality', realityWarnings),
    wildcard: softenPersonalizedText(realityRaw.wildcard, 'The Wildcard', realityWarnings),
  };
  const realityErrors = [];
  if (isBadName(realityData.guest_name)) realityErrors.push('Guest name is missing or invalid.');
  for (const [field, label] of [['business_experience', 'Business Experience'], ['competitive_edge', 'Competitive Edge'], ['personality', 'Personality'], ['wildcard', 'The Wildcard']]) {
    if (!realityData[field]) realityErrors.push(`${label} paragraph is missing.`);
  }
  if (realityErrors.length) throw new Error(`V2 reality validation failed: ${realityErrors.join(' ')}`);

  const realityLetterText = [
    'INSIDE SUCCESS TV',
    'CONDITIONAL CASTING APPROVAL',
    `Cast Name: ${realityData.guest_name}`,
    '',
    'CONGRATULATIONS',
    'After reviewing your application, business background, accomplishments, personality, and overall fit, our casting team believes you could be a strong fit for an upcoming reality show on Inside Success TV.',
    'Our reality shows feature successful entrepreneurs, business owners, founders, and high-performing personalities who are willing to put their experience, decision-making, leadership, and business skills to the test.',
    '✓ A meaningful story',
    '✓ Genuine expertise',
    '✓ A clear mission',
    '✓ A competitive personality',
    '✓ The ability to make decisions under pressure',
    '✓ An interesting background or perspective',
    '✓ The potential to create memorable television and inspire others',
    'Based on our initial review, we believe you have several of the qualities our production team is looking for.',
    'As a result, you have received conditional approval to continue through the Inside Success TV casting process.',
    '',
    'WHY YOU STOOD OUT',
    'Building a successful business takes a certain type of person.',
    'Reality television adds another layer.',
    'We are looking for entrepreneurs who have already proven themselves in the real world and are willing to see how their skills perform when the environment changes, the pressure increases, and cameras are capturing the experience.',
    'Your application stood out because of the combination of your:',
    '✓ Business experience',
    '✓ Track record',
    '✓ Personality',
    '✓ Decision-making style',
    '✓ Competitive potential',
    '✓ Unique life and business experience',
    'Our team believes these qualities could translate into a compelling presence on an Inside Success TV reality show.',
    '',
    'WHY OUR REALITY SHOWS ARE DIFFERENT',
    'Inside Success TV develops reality concepts built around entrepreneurship, competition, strategy, relationships, leadership, and real-world business ability.',
    'Depending on the show, contestants may be asked to:',
    '✓ Build businesses',
    '✓ Generate revenue',
    '✓ Sell or market products',
    '✓ Complete entrepreneurial challenges',
    '✓ Lead teams',
    '✓ Compete against other successful entrepreneurs',
    '✓ Make decisions with limited time or resources',
    '✓ Adapt to unfamiliar environments',
    '✓ Work with unexpected partners',
    '✓ Put their business instincts to the test',
    'The exact format varies by production, but the goal remains consistent:',
    'Put successful people into situations where their skills, personalities, and decision-making are tested in ways they may never have experienced before.',
    'Experience matters.',
    'Strategy matters.',
    'Personality matters.',
    'Execution matters.',
    '',
    'YOUR COMPETITIVE PROFILE',
    'Based on what we learned during the application process, our casting team currently sees several qualities that could make you an interesting addition to an upcoming production.',
    'BUSINESS EXPERIENCE',
    realityData.business_experience,
    'COMPETITIVE EDGE',
    realityData.competitive_edge,
    'PERSONALITY',
    realityData.personality,
    'THE WILDCARD',
    realityData.wildcard,
    'These are some of the qualities our production team will explore further during the next stage of casting.',
    '',
    'THE REAL QUESTION',
    'Building a successful company proves that you know how to perform in your current environment.',
    'Reality television asks what happens when that environment suddenly changes.',
    'Can you still sell?',
    'Can you still lead?',
    'Can you still make money?',
    'Can you still make strong decisions?',
    'Can you adapt when your original plan falls apart?',
    'Can you work with people who think completely differently from you?',
    'Can you compete against other successful entrepreneurs?',
    'Can you handle being pushed outside your normal routine?',
    'And can you do it while cameras capture the experience?',
    'Those are the moments that Hollywood loves and can make great television.',
    '',
    'WHAT PRODUCTION WILL BE LOOKING FOR',
    'During the next stage of casting, our team will be evaluating:',
    '✓ Your business accomplishments and experience',
    '✓ Your ability to communicate clearly on camera',
    '✓ Your personality and competitive nature',
    '✓ Your willingness to participate fully in the format',
    '✓ Your ability to handle pressure and unexpected situations',
    '✓ Your availability for production',
    '✓ Your ability to work with or compete against other cast members',
    '✓ Your overall entertainment and storytelling potential',
    'Receiving conditional approval means our team sees enough potential to advance your application.',
    'Final casting decisions remain subject to further review, production requirements, background review, scheduling, agreements, and final approval from the production team.',
    '',
    'YOUR AUTHORITY ASSET',
    'In addition to your participation in the reality show, you will also receive a professionally produced documentary-style feature focused on your business, story, expertise, and journey.',
    'Most businesses create content.',
    'Very few create true authority assets.',
    'Your documentary is designed to become a long-term piece of media you can continue using well beyond the show itself.',
    'It has the potential to become:',
    '✓ A trust-building asset',
    '✓ A credibility asset',
    '✓ A sales asset',
    '✓ A speaking asset',
    '✓ A recruitment asset',
    '✓ A referral asset',
    '✓ A PR asset',
    '✓ A social media asset',
    '✓ A personal brand asset',
    '✓ A legacy asset',
    'The reality show gives audiences the chance to see you perform.',
    'The documentary gives them the chance to understand who you are, what you have built, and why your story matters.',
    'Together, they create a powerful foundation for building visibility, credibility, and authority around your brand.',
    '',
    'YOUR FAME STACK',
    'One story can become hundreds of authority-building opportunities.',
    'From a single episode we can create:',
    '✓ Social media content',
    '✓ Podcast content',
    '✓ PR opportunities',
    '✓ Blog content',
    '✓ Speaking opportunities',
    '✓ Website content',
    '✓ Sales assets',
    '✓ Recruitment assets',
    '✓ Thought leadership content',
    '✓ Future media opportunities',
    'The episode is not the destination.',
    'It is the beginning.',
    'One story.',
    'Distributed everywhere.',
    'Repeated consistently.',
    'This is how authority is built.',
    'This is how industry fame is built.',
    '',
    'MEDIA & CONTENT OPPORTUNITIES',
    'Selected cast members may also receive promotional and media assets associated with their participation, depending on the production package and series.',
    'These may include:',
    '✓ Television appearance footage',
    '✓ Social media clips',
    '✓ Cast announcement graphics',
    '✓ Behind-the-scenes content',
    '✓ Promotional photography',
    '✓ PR and media opportunities',
    '✓ Website content',
    '✓ Personal brand content',
    '✓ Promotional assets connected to the show',
    'Specific deliverables, licensing rights, promotional opportunities, and participation requirements will be outlined during the casting and contracting process.',
    '',
    'NEXT STEP',
    'Your application has now advanced to the next stage of casting.',
    'During your next call we will discuss:',
    '• The reality show concept you are being considered for',
    '• Why our casting team selected your application',
    '• Your potential role within the cast',
    '• Filming and production expectations',
    '• Participation requirements',
    '• Potential positioning opportunities',
    '• Distribution strategy',
    '• Authority-building opportunities',
    '• Whether this is the right fit for both parties',
    'Please ensure you attend your next scheduled call.',
    'Failure to attend may result in your application being withdrawn from the current casting cycle.',
    '',
    'Inside Success TV',
    'STREAM SUCCESS',
    'www.InsideSuccess.TV',
    'Results vary. Participation does not guarantee specific business outcomes, revenue, publicity, media placements or future opportunities.',
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim();

  const realitySlotText = [realityData.business_experience, realityData.competitive_edge, realityData.personality, realityData.wildcard].join('\n');
  const realityClaimReview = analyzeClaimSafety(realitySlotText);
  const realityReviewWarnings = [];
  if (hasPlaceholder(realityLetterText)) {
    realityReviewWarnings.push('Draft review needed: final reality letter still contains a bracket placeholder. Edit it in the preview before sending to Google Drive.');
  }
  for (const claimError of realityClaimReview.hardBlocks) {
    realityReviewWarnings.push(`Draft compliance review needed: ${claimError}`);
  }
  const realityFinalWarnings = uniqueCleanWarnings([...realityWarnings, ...baseWarnings, ...realityClaimReview.warnings, ...realityReviewWarnings]);
  const realitySafeName = cleanTitleName(realityData.guest_name);
  const realityDocTitle = `Inside Success TV x ${realitySafeName || 'Edited Draft'}`
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 180)
    .trim();
  return [{ json: { ok: true, validation_status: 'passed', show_type: showType, doc_title: realityDocTitle, guest_name: realityData.guest_name, guest_name_source: manualClientName ? 'manual' : 'ai', guest_name_confidence: manualClientName ? 1 : guestNameConfidence, possible_guest_names: possibleGuestNames, possible_rep_names: possibleRepNames, letter_text: realityLetterText, preview: realityLetterText, warnings: realityFinalWarnings } }];
}

const claimSofteningWarnings = [];
const rawData = {
  guest_name: finalGuestName,
  business_name: cleanText(extracted.business_name),
  industry: cleanText(extracted.industry),
  act_1_ordinary_world: cleanParagraph(extracted.act_1_ordinary_world),
  act_2_challenge: cleanParagraph(extracted.act_2_challenge),
  act_3_journey: cleanParagraph(extracted.act_3_journey),
  act_4_breakthrough: cleanParagraph(extracted.act_4_breakthrough),
  act_5_legacy: cleanParagraph(extracted.act_5_legacy),
  client_thing: cleanText(extracted.client_thing).replace(/^['\"“”]+|['\"“”]+$/g, ''),
  mission_points: Array.isArray(extracted.mission_points)
    ? extracted.mission_points.map(cleanParagraph).filter(Boolean).slice(0, 5)
    : [],
  why_this_story_matters_bullets: normalizeWhyBullets(extracted.why_this_story_matters_bullets),
};

const data = {
  ...rawData,
  act_1_ordinary_world: softenPersonalizedText(rawData.act_1_ordinary_world, 'Act 1: The Ordinary World', claimSofteningWarnings),
  act_2_challenge: softenPersonalizedText(rawData.act_2_challenge, 'Act 2: The Challenge', claimSofteningWarnings),
  act_3_journey: softenPersonalizedText(rawData.act_3_journey, 'Act 3: The Journey', claimSofteningWarnings),
  act_4_breakthrough: softenPersonalizedText(rawData.act_4_breakthrough, 'Act 4: The Breakthrough', claimSofteningWarnings),
  act_5_legacy: softenPersonalizedText(rawData.act_5_legacy, 'Act 5: The Legacy', claimSofteningWarnings),
  client_thing: softenPersonalizedText(rawData.client_thing, 'Your Thing', claimSofteningWarnings),
  mission_points: rawData.mission_points.map((point, index) => softenPersonalizedText(point, `Mission point ${index + 1}`, claimSofteningWarnings)),
  why_this_story_matters_bullets: softenWhyBullets(rawData.why_this_story_matters_bullets, claimSofteningWarnings),
};

const validationErrors = [];
if (isBadName(data.guest_name)) validationErrors.push('Guest name is missing or invalid.');
for (const field of ['act_1_ordinary_world','act_2_challenge','act_3_journey','act_4_breakthrough','act_5_legacy']) {
  if (!data[field]) validationErrors.push(`${field} is missing.`);
}
if (!data.client_thing) validationErrors.push('Client Thing is missing.');
if (data.mission_points.length < 5) validationErrors.push('Five mission points are required.');
if (data.why_this_story_matters_bullets.length < 3) validationErrors.push('At least three Why This Story Matters Now bullets are required.');
if (showType === 'normal' && !deadlineText) validationErrors.push('Normal show deadline text is missing.');

const missionBlock = data.mission_points.map((point) => `✓ ${point}`).join('\n');
const whyThisStoryBulletsBlock = data.why_this_story_matters_bullets
  .map((item) => `➔ ${item.heading}: ${item.body}`)
  .join('\n\n');
const whyThisStoryPersonalizedBlock = `\nFor you, specifically, that can look like:\n\n${whyThisStoryBulletsBlock}\n\nWe do not guarantee exact outcomes - results may vary!`;
const importantBlock = showType === 'nlceo' ? '' : `\nIMPORTANT\nConditional approval expires on:\n${deadlineText}\nAfter this deadline your application may need to be re-reviewed by casting before being reconsidered for a future season.\n`;

const letterText = `INSIDE SUCCESS TV\nCONDITIONAL CASTING APPROVAL\n${data.guest_name}\nPotential Feature for Inside Success TV\n\nCONGRATULATIONS\nAfter reviewing your application, story, business, and vision, our casting team believes you may be an exceptional fit for an upcoming season of Inside Success TV.\nWe do not select guests simply because they own a business.\nWe look for founders, experts, entrepreneurs, professionals and industry leaders who have:\n✓ A meaningful story\n✓ Genuine expertise\n✓ A clear mission\n✓ Real-world impact\n✓ The potential to inspire others\nBased on our review, we believe your story contains the key ingredients of a compelling Inside Success TV episode.\nAs a result, you have received conditional approval to continue through the casting process.\n\nWHY YOUR STORY STANDS OUT\nMost businesses have products.\nThe most successful brands have stories.\nYour story is not simply about what you do.\nIt is about why you do it.\nThe strongest episodes are never about a company.\nThey are about a mission.\nAfter reviewing your application, we believe your story has the potential to educate, inspire and position you as a trusted authority within your industry.\n\nYOUR HOLLYWOOD STORY FORMULA\nEvery great documentary follows a proven storytelling structure.\nHollywood has used this formula for decades because people remember stories far more than facts.\nHere's how we currently see your story unfolding.\n\nACT 1: THE ORDINARY WORLD\n${data.act_1_ordinary_world}\nBefore the business existed...\nBefore the recognition...\nBefore the growth...\nThere was a person trying to solve a problem that mattered.\n\nACT 2: THE CHALLENGE\n${data.act_2_challenge}\nThis was the turning point.\nThe moment where staying the same was no longer an option.\nThe challenge became the catalyst.\n\nACT 3: THE JOURNEY\n${data.act_3_journey}\nThis is where your expertise was earned.\nNot through theory.\nThrough experience.\nThrough years of learning what actually works.\n\nACT 4: THE BREAKTHROUGH\n${data.act_4_breakthrough}\nThis is the proof.\nThe moment your philosophy, method or vision began producing real-world results.\nThe evidence that your mission matters.\n\nACT 5: THE LEGACY\n${data.act_5_legacy}\nThis is where your story becomes bigger than you.\nNot just what you've built.\nBut what you're trying to change.\nThe lives you want to impact.\nThe movement you want to create.\n\nYOUR THING\nThe most memorable brands become known for one thing.\nOne clear idea.\nOne clear promise.\nOne clear mission.\nAfter reviewing your application, we believe the territory your brand has the opportunity to own is:\n\"${data.client_thing}\"\nThis becomes the foundation of authority.\nThe thing people remember.\nThe thing they repeat.\nThe thing that eventually becomes synonymous with your name.\n\nTHE MISSION YOU ARE BUILDING\nThe strongest brands don't simply sell services.\nThey stand for something.\nThey fight against something.\nThey create movements.\nBased on our review, we believe your mission includes:\n${missionBlock}\nThis is bigger than marketing.\nThis is bigger than business.\nThis is legacy.\n\nWHY THIS STORY MATTERS NOW\nWe live in a world where consumers have more choices than ever before.\nThe challenge isn't having the best product.\nThe challenge is being remembered.\nPeople buy from brands they trust.\nPeople trust brands they remember.\nPeople remember stories.\nThis is why your story matters.\nNot because it is interesting.\nBecause it has the potential to build trust at scale.\n${whyThisStoryPersonalizedBlock}\n\nYOUR AUTHORITY ASSET\nMost businesses create content.\nVery few create authority assets.\nA documentary is not simply content.\nIt becomes an asset that can be used for years.\nYour episode has the potential to become:\n✓ A trust-building asset\n✓ A credibility asset\n✓ A speaking asset\n✓ A sales asset\n✓ A recruitment asset\n✓ A referral asset\n✓ A PR asset\n✓ A social media asset\n✓ A personal brand asset\n✓ A legacy asset\nThe documentary becomes the foundation.\nEverything else is built around it.\n\nYOUR FAME STACK\nOne story can become hundreds of authority-building opportunities.\nFrom a single episode we can create:\n✓ Social media content\n✓ Podcast content\n✓ PR opportunities\n✓ Blog content\n✓ Speaking opportunities\n✓ Website content\n✓ Sales assets\n✓ Recruitment assets\n✓ Thought leadership content\n✓ Future media opportunities\nThe episode is not the destination.\nIt is the beginning.\nOne story.\nDistributed everywhere.\nRepeated consistently.\nThis is how authority is built.\nThis is how industry fame is built.\n\nWHY WE BELIEVE YOU ARE A FIT\nWe believe your story has the potential to:\n✓ Educate others\n✓ Inspire others\n✓ Build trust\n✓ Strengthen your authority\n✓ Increase your visibility\n✓ Position you as a leader within your category\nMost importantly...\nWe believe your story deserves to be told.\n\nNEXT STEP\nYour application has now advanced to the next stage of casting.\nDuring your next call we will discuss:\n• Your story in greater detail\n• The vision for your episode\n• Potential positioning opportunities\n• Distribution strategy\n• Authority-building opportunities\n• Whether this is the right fit for both parties\nPlease ensure you attend your next scheduled call.\nFailure to attend may result in your application being withdrawn from the current casting cycle.\n${importantBlock}\nInside Success TV\nSTREAM SUCCESS\nwww.InsideSuccess.TV\nResults vary. Participation does not guarantee specific business outcomes, revenue, publicity, media placements or future opportunities.`.replace(/\n{3,}/g, '\n\n').trim();

const draftReviewWarnings = [];
if (hasPlaceholder(letterText)) {
  draftReviewWarnings.push('Draft review needed: final V2 letter still contains a bracket placeholder. Edit it in the preview before sending to Google Drive.');
}
const claimReview = analyzeClaimSafety(letterText);
for (const claimError of claimReview.hardBlocks) {
  draftReviewWarnings.push(`Draft compliance review needed: ${claimError}`);
}
if (showType === 'nlceo' && /deadline|expires|expiry|\[DATE/i.test(letterText)) {
  draftReviewWarnings.push('Draft review needed: NLCEO output contains deadline or expiry language. Remove it before sending to Google Drive.');
}
const warnings = uniqueCleanWarnings([...claimSofteningWarnings, ...baseWarnings, ...claimReview.warnings, ...draftReviewWarnings]);

if (validationErrors.length) {
  throw new Error(`V2 validation failed: ${validationErrors.join(' ')}`);
}

const safeName = cleanTitleName(data.guest_name);
const docTitle = `Inside Success TV x ${safeName || 'Edited Draft'}`
  .replace(/[\\/:*?"<>|]/g, ' ')
  .replace(/\s+/g, ' ')
  .slice(0, 180)
  .trim();
return [{ json: { ok: true, validation_status: 'passed', show_type: showType, doc_title: docTitle, guest_name: data.guest_name, guest_name_source: manualClientName ? 'manual' : 'ai', guest_name_confidence: manualClientName ? 1 : guestNameConfidence, possible_guest_names: possibleGuestNames, possible_rep_names: possibleRepNames, letter_text: letterText, preview: letterText, warnings } }];
} catch (error) {
  return [{ json: { ok: false, validation_status: 'failed', error: error.message || 'V2 draft generation failed.', warnings: [] } }];
}
