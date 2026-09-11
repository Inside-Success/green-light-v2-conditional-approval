try {
  const body = $input.first().json.body || {};
  const letterText = String(body.letter_text || body.draft_text || body.preview || '').trim();
  const rawShowType = String(body.show_type || body.showType || 'normal');
  const showType = /reality/i.test(rawShowType) ? 'reality' : (rawShowType.toLowerCase().includes('nl') ? 'nlceo' : 'normal');
  const requestGuestName = String(body.guest_name || body.client_name || body.clientName || '').replace(/\s+/g, ' ').trim();
  let docTitle = String(body.doc_title || body.title || '').replace(/\s+/g, ' ').trim();
  const editorName = String(body.editor_name || body.editorName || 'Adedokun Adedoyin').replace(/\s+/g, ' ').trim() || 'Adedokun Adedoyin';

  function hasPlaceholder(value) {
    return /\[[^\]]+\]/.test(String(value || '')) || /INSERT (THING|BOOK|LINK|MISSION|DATE)/i.test(String(value || ''));
  }

  function cleanText(value) {
    return String(value || '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
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
    return `${kind}: "${item.phrase}" in line "${item.line || item.context}".`;
  }

  function analyzeClaimSafety(value) {
    const hardBlocks = [];
    const text = String(value || '');

    for (const item of findClaimContexts(text, /\b(guaranteed|guarantees|guarantee you)\b/i)) {
      if (hasForbiddenGuaranteeContext(item.context)) {
        hardBlocks.push(hardBlockMessage('Forbidden guarantee/outcome claim', item));
      }
    }

    for (const item of findClaimContexts(text, /\b(will make you famous|will make you an authority|will go viral|will get you clients|will increase revenue)\b/i)) {
      hardBlocks.push(hardBlockMessage('Forbidden guarantee/outcome claim', item));
    }

    for (const item of findClaimContexts(text, /(?:#1|\bnumber one\b)/i)) {
      if (!/\b(?:#1|number one)\s+(goal|priority|focus|reason|objective|mission)\b/i.test(item.context)) {
        hardBlocks.push(hardBlockMessage('Forbidden ranking/superiority claim', item));
      }
    }

    for (const item of findClaimContexts(text, /\b(tier 1 outlets?|100\+ national|millions of viewers|commercial broadcast reuse|15[–-]25-minute|12-month marketing|what this opportunity provides)\b/i)) {
      hardBlocks.push(hardBlockMessage('Forbidden unapproved offer claim', item));
    }

    for (const item of findClaimContexts(text, /\b(red-?carpet|premium photoshoot|behind-the-scenes)\b/i)) {
      if (hasUnapprovedDeliverableContext(item.context)) {
        hardBlocks.push(hardBlockMessage('Forbidden unapproved production deliverable claim', item));
      }
    }

    for (const item of findClaimContexts(text, /\b(imdb|yahoo finance|marketwatch|business insider|roku|apple tv|amazon fire tv)\b/i)) {
      if (hasPromiseContext(item.context)) {
        hardBlocks.push(hardBlockMessage('Forbidden media/distribution promise', item));
      }
    }

    return { hardBlocks };
  }

  function extractRealityEditableText(value) {
    const text = String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const parts = [];
    const castLine = text.split('\n').find((line) => /^\s*Cast Name\s*:/i.test(line));
    if (castLine) parts.push(castLine.replace(/^\s*Cast Name\s*:/i, ''));
    const slots = [
      ['BUSINESS EXPERIENCE', 'COMPETITIVE EDGE'],
      ['COMPETITIVE EDGE', 'PERSONALITY'],
      ['PERSONALITY', 'THE WILDCARD'],
      ['THE WILDCARD', 'These are some of the qualities our production team will explore'],
    ];
    let foundAnySlot = false;
    for (const [startMarker, endMarker] of slots) {
      const start = text.indexOf(`\n${startMarker}\n`);
      if (start === -1) continue;
      foundAnySlot = true;
      const bodyStart = start + startMarker.length + 2;
      const end = text.indexOf(`\n${endMarker}`, bodyStart);
      parts.push(end === -1 ? text.slice(bodyStart) : text.slice(bodyStart, end));
    }
    return foundAnySlot ? parts.join('\n') : text;
  }

  function findSevereRealityClaims(value) {
    const hits = [];
    const text = String(value || '');
    for (const item of findClaimContexts(text, /\b(guaranteed|guarantees|guarantee you)\b/i)) {
      if (hasForbiddenGuaranteeContext(item.context)) hits.push(hardBlockMessage('Forbidden guarantee/outcome claim', item));
    }
    for (const item of findClaimContexts(text, /\b(will make you famous|will make you an authority|will go viral|will get you clients|will increase (?:your )?revenue|guaranteed to win|will win the (?:show|competition|prize))\b/i)) {
      hits.push(hardBlockMessage('Forbidden guarantee/outcome claim', item));
    }
    return hits;
  }

  function cleanTitleName(value) {
    return String(value || '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .replace(/[\\/:*?"<>|]/g, ' ')
      .replace(/\s*&\s*/g, ' & ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const errors = [];
  if (!letterText) errors.push('Edited V2 letter text is required before sending to Google Drive.');
  if (letterText && letterText.length < 500) errors.push('Edited V2 letter is too short to save as a final document.');
  if (hasPlaceholder(letterText)) errors.push('Edited V2 letter still contains a bracket placeholder.');
  if (showType === 'reality') {
    const realitySevereHits = findSevereRealityClaims(extractRealityEditableText(letterText));
    if (realitySevereHits.length) errors.push(`Edited reality letter contains a forbidden promise: ${realitySevereHits.join(' ')}`);
  } else {
    const claimReview = analyzeClaimSafety(letterText);
    if (claimReview.hardBlocks.length) errors.push(`Edited V2 letter contains a forbidden or unapproved claim: ${claimReview.hardBlocks.join(' ')}`);
  }
  if (showType === 'nlceo' && /deadline|expires|expiry|\[DATE/i.test(letterText)) errors.push('NLCEO edited letter contains deadline or expiry language.');

  function extractNameFromTitle(value) {
    const title = String(value || '').replace(/\s+/g, ' ').trim();
    const productionMatch = title.match(/^Inside Success TV\s*x\s*(.+)$/i);
    if (productionMatch) return productionMatch[1].trim();
    const greenLightMatch = title.match(/^Green Light\s*-\s*(.*?)\s*x\s*(Inside Success TV|Next Level CEO)$/i);
    if (greenLightMatch) return greenLightMatch[1].trim();
    const oldV2Match = title.match(/^(?:V2\s+)?Conditional Casting Approval\s*-\s*(.+)$/i);
    if (oldV2Match) return oldV2Match[1].trim();
    return '';
  }

  function extractNameFromEditedLetter(value) {
    const lines = String(value || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

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

  const editedGuestName = extractNameFromEditedLetter(letterText);
  const guestName = editedGuestName || requestGuestName || extractNameFromTitle(docTitle);
  const titleName = cleanTitleName(guestName || 'Edited Draft');
  docTitle = `Inside Success TV x ${titleName}`
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 180)
    .trim();

  if (errors.length) {
    return [{ json: { ok: false, validation_status: 'failed', error: `V2 save validation failed: ${errors.join(' ')}` } }];
  }

  return [{ json: { ok: true, validation_status: 'passed', show_type: showType, guest_name: guestName, doc_title: docTitle, letter_text: letterText, preview: letterText, warnings: Array.isArray(body.warnings) ? body.warnings.filter(Boolean) : [], editor_name: editorName } }];
} catch (error) {
  return [{ json: { ok: false, validation_status: 'failed', error: error.message || 'V2 save validation failed.' } }];
}
