const savePayload = $("Prepare Edited V2 Save Payload").first().json || {};
function readOptionalNodeJson(nodeName) {
  try {
    return $(nodeName).first().json || {};
  } catch {
    return {};
  }
}
const createdFolderData = readOptionalNodeJson("Use Created V2 Editor Folder");
const selectedFolderData = readOptionalNodeJson("Select V2 Editor Folder");
const folderRoutingData = createdFolderData.editor_folder_id ? createdFolderData : selectedFolderData;
const built = { ...savePayload, ...folderRoutingData };
const docData = $("Create V2 Google Doc").first().json || {};
const headerData = $("Create V2 Header").first().json || {};
const footerData = $("Create V2 Footer").first().json || {};

const documentId = docData.documentId || docData.id || $json.documentId || $json.id;
if (!documentId) throw new Error("Missing Google document ID.");

const headerId =
  headerData.headerId ||
  headerData.replies?.[0]?.createHeader?.headerId ||
  $json.headerId;

const footerId =
  footerData.footerId ||
  footerData.replies?.[0]?.createFooter?.footerId ||
  $json.footerId;

const rawShowType = String(built.show_type || "normal").toLowerCase();
const showType = rawShowType.includes("mansion")
  ? "mansion"
  : rawShowType.includes("island")
  ? "island"
  : rawShowType.includes("reality")
  ? "reality"
  : rawShowType.includes("nl")
  ? "nlceo"
  : "normal";
const isNextLevelCeo = showType === "nlceo";
const isReality = showType === "reality";
const guestName = String(built.guest_name || built.client_name || "Guest")
  .replace(/\s+/g, " ")
  .trim();
const deadlineText = "Sunday 11.59pm EST";

const ASSET_BASE_URL = "https://green-light-v2-conditional-approval.vercel.app/workflow-assets";
const DEFAULT_HEADER_IMAGE_URL = `${ASSET_BASE_URL}/inside-success-original-header.png`;
const NLCEO_HEADER_IMAGE_URL = `${ASSET_BASE_URL}/next-level-ceo-header.png`;
const DEFAULT_CUSTOMER_JOURNEY_IMAGE_URL = `${ASSET_BASE_URL}/customer-journey-300dpi.png`;
const NLCEO_CUSTOMER_JOURNEY_IMAGE_URL = `${ASSET_BASE_URL}/next-level-ceo-customer-journey.jpg`;

const RUDY_EPISODE_URL = "https://insidesuccess.tv/programs/legacy-makers-rudy-mawer";
const MEDIA_PACK_URL = "https://drive.google.com/file/d/1xtwWhQ96s3q7PRrK0e8nm-zFT5bubkRG/view";
const RUDY_EPISODE_LINK_TEXT = "Watch Rudy Mawer's Inside Success episode";
const MEDIA_PACK_LINK_TEXT = "View the Inside Success Media Pack";

const FONT_MAIN_TITLE = "Staatliches";
const FONT_TITLE = "New Amsterdam";
const FONT_BODY = "Montserrat";

const FONT_TITLE_MAIN = 40;
const FONT_TITLE_SUB = 24;
const FONT_MAJOR_HEAD = 24;
const FONT_ACT_HEAD = 13;
const FONT_BODY_SIZE = 12;
const FONT_SMALL = 10;

const MARGIN_LEFT_RIGHT = 72;
const BULLET_INDENT_START = MARGIN_LEFT_RIGHT + 36;
const BULLET_INDENT_FIRST = MARGIN_LEFT_RIGHT + 18;
const LINE_SPACING = 115;

const COLOR_BLACK = { color: { rgbColor: { red: 0, green: 0, blue: 0 } } };
const COLOR_WHITE = { color: { rgbColor: { red: 1, green: 1, blue: 1 } } };
const COLOR_GREY = { color: { rgbColor: { red: 0.6, green: 0.6, blue: 0.6 } } };
const COLOR_YELLOW = { color: { rgbColor: { red: 1, green: 0.85, blue: 0 } } };

function normalizeText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\*\*/g, "")
    .replace(/^[\t ]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripV2TitleAndFooter(value) {
  const lines = normalizeText(value).split("\n");
  const congratsIndex = lines.findIndex((line) => /^CONGRATULATIONS$/i.test(line.trim()));
  const bodyLines = congratsIndex >= 0 ? lines.slice(congratsIndex) : lines.slice(4);
  let body = bodyLines.join("\n").trim();

  body = body
    .replace(/\n*Inside Success TV\s*\nSTREAM SUCCESS\s*\nwww\.InsideSuccess\.TV/gi, "\n")
    .replace(/\n*www\.InsideSuccess\.TV\s*\nSTREAM SUCCESS\s*\nInside Success TV/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return body;
}

function ensureNextStepResources(text) {
  const nextStepResourceLines = [
    " ",
    "Before your second call, please review these two resources:",
    " ",
    `1. Watch one episode: ${RUDY_EPISODE_LINK_TEXT}`,
    " ",
    `2. Review the media kit: ${MEDIA_PACK_LINK_TEXT}`,
  ].join("\n");

  if (text.includes(RUDY_EPISODE_LINK_TEXT) || text.includes(MEDIA_PACK_LINK_TEXT)) {
    return text;
  }

  if (/^NEXT STEP\s*$/im.test(text)) {
    return text.replace(
      /(^NEXT STEP\s*\n[\s\S]*?)(?=\n\s*(IMPORTANT|CONDITIONAL APPROVAL EXPIRES|Inside Success TV|Results vary\.|$))/im,
      (match) => match.trimEnd() + "\n" + nextStepResourceLines,
    );
  }

  return [text, "NEXT STEP", nextStepResourceLines].filter(Boolean).join("\n\n");
}

function normalizeApprovalBody(value) {
  const body = normalizeText(value)
    .replace(/^Conditional approval expires on:\s*$/gim, "")
    .replace(/^Sunday 11\.59pm EST\s*$/gim, "")
    .trim();
  return body || "After this deadline your application may need to be re-reviewed by casting before being reconsidered for a future season.";
}

function normalizeApprovalSections(text) {
  if (isNextLevelCeo || isReality) {
    return text
      .replace(
        /\n*\s*^IMPORTANT\s*$\s*\n\s*Conditional approval expires(?:\s+on)?:\s*\n[^\n]*\n[\s\S]*?(?=\n\s*(Inside Success TV|Results vary\.|$))/im,
        "",
      )
      .replace(/\n*\s*^CONDITIONAL APPROVAL EXPIRES[^\n]*$[\s\S]*?(?=\n\s*(Inside Success TV|Results vary\.|$))/im, "")
      .trim();
  }

  const approvalHeading = "CONDITIONAL APPROVAL EXPIRES SUNDAY 11.59PM";
  const fallbackApprovalBody =
    "After this deadline your application may need to be re-reviewed by casting before being reconsidered for a future season.";

  if (/^\s*IMPORTANT\s*$/im.test(text) && /Conditional approval expires/i.test(text)) {
    return text.replace(
      /\n*\s*^IMPORTANT\s*$\s*\n\s*Conditional approval expires(?:\s+on)?:\s*\n[^\n]*\n([\s\S]*?)(?=\n\s*(Inside Success TV|Results vary\.|$))/im,
      (_match, approvalBody) => "\n" + approvalHeading + "\n" + normalizeApprovalBody(approvalBody) + "\n",
    );
  }

  if (/^CONDITIONAL APPROVAL EXPIRES/im.test(text)) {
    return text.replace(
      /^CONDITIONAL APPROVAL EXPIRES[^\n]*/im,
      approvalHeading,
    );
  }

  return [text, approvalHeading, fallbackApprovalBody].filter(Boolean).join("\n\n");
}

if (showType === "mansion" || showType === "island") {
  // Branded reality letters (Mansion of Money, Entrepreneurs Island), added 2026-11-05.
  // Self-contained so the Normal / NLCEO / Reality path below stays byte-identical.
  const rgb = (hex) => ({ color: { rgbColor: { red: parseInt(hex.slice(0, 2), 16) / 255, green: parseInt(hex.slice(2, 4), 16) / 255, blue: parseInt(hex.slice(4, 6), 16) / 255 } } });
  const BRANDS = {
    mansion: {
      title: "MANSION OF MONEY TV", site: "www.mansionofmoneytv.com", assets: "mansion",
      headFont: "Cinzel", bodyFont: "Open Sans", headColor: rgb("CE973D"), subColor: rgb("CE973D"),
      subFont: "Open Sans", subSize: 13, subBold: true, titleSize: 26, subtitleColor: rgb("0A0A0A"),
      images: { fame: [1400, 954], mediaPack: [2105, 2092], coprod: [1500, 1261] },
      mediaKitLink: "View the Mansion of Money Media Pack",
    },
    island: {
      title: "ENTREPRENEURS ISLAND TV", site: "www.entrepreneursislandtv.com", assets: "island",
      headFont: "Fjalla One", bodyFont: "Plus Jakarta Sans", headColor: rgb("015FBC"), subColor: rgb("068EB0"),
      subFont: "Fjalla One", subSize: 16, subBold: false, titleSize: 32, subtitleColor: rgb("068EB0"),
      images: { fame: [1400, 920], mediaPack: [2105, 2092], coprod: [1500, 1261] },
      mediaKitLink: "View the Entrepreneurs Island Media Pack",
    },
  };
  const brand = BRANDS[showType];
  const GREY = rgb("999999");
  const assetBase = `${ASSET_BASE_URL}/${brand.assets}`;
  const imageSpec = (key, file, widthPt) => {
    const [w, h] = brand.images[key];
    return { uri: `${assetBase}/${file}`, width: widthPt, height: Math.round((widthPt * h) / w) };
  };
  const IMAGES = {
    fame: imageSpec("fame", "content-production.jpg", 540),
    mediaPack: imageSpec("mediaPack", "media-pack.jpg", 540),
    coprod: imageSpec("coprod", "co-production-model.png", 520),
  };
  const MAJOR = new Set([
    "CONGRATULATIONS!", "YOUR COMPETITIVE PROFILE", "DONE-FOR-YOU CONTENT PRODUCTION", "MEDIA & CONTENT OPPORTUNITIES",
    "MEDIA PACK", "OUR UNIQUE CO-PRODUCTION MODEL", "NEXT STEP ➡️",
  ]);
  const PAGE_BREAK_BEFORE = new Set([
    "MEDIA & CONTENT OPPORTUNITIES", "MEDIA PACK", "OUR UNIQUE CO-PRODUCTION MODEL", "NEXT STEP ➡️",
  ]);
  const SUB = new Set(["BUSINESS EXPERIENCE", "COMPETITIVE EDGE", "PERSONALITY", "THE WILDCARD"]);
  const BOLD_CHECKS = new Set([
    "✅ A meaningful story", "✅ Genuine expertise", "✅ A clear mission", "✅ A competitive personality",
    "✅ The ability to make decisions under pressure", "✅ An interesting background or perspective",
    "✅ The potential to create memorable television and inspire others",
  ]);
  const IMAGE_AFTER = {
    "✅ A legacy asset": "fame",
    "MEDIA PACK": "mediaPack",
    "See how our streamlined co-production model compares to traditional television casting and production.": "coprod",
  };
  const DISCLAIMER = "Results vary. Participation does not guarantee specific business outcomes, revenue, publicity, media placements or future opportunities.";

  const rawLines = normalizeText(built.letter_text || built.preview || "").split("\n").map((line) => line.replace(/[ \t]+$/g, ""));
  const congratsAt = rawLines.findIndex((line) => /^CONGRATULATIONS!?$/i.test(line.trim()));
  let brandedLines = (congratsAt >= 0 ? rawLines.slice(congratsAt) : rawLines.slice(4)).map((line) => line.trim());
  while (brandedLines.length && (brandedLines[brandedLines.length - 1] === "" || brandedLines[brandedLines.length - 1].toLowerCase() === brand.site || /^Results vary\./i.test(brandedLines[brandedLines.length - 1]))) {
    brandedLines.pop();
  }
  const brandedEntries = [];
  for (const rawLine of brandedLines) {
    const entryText = rawLine === "CONGRATULATIONS" ? "CONGRATULATIONS!" : rawLine === "NEXT STEP" ? "NEXT STEP ➡️" : rawLine;
    brandedEntries.push({ text: entryText, kind: "text" });
    const imageKey = IMAGE_AFTER[entryText];
    if (imageKey) brandedEntries.push({ text: "", kind: "image", image: imageKey });
  }
  // Drop blank spacer lines that sit right before a page-break heading: they add nothing and, after a
  // full-page image, they can spill onto a fresh page and leave it empty.
  for (let i = brandedEntries.length - 2; i >= 0; i -= 1) {
    if (brandedEntries[i].kind === "text" && brandedEntries[i].text === "" && PAGE_BREAK_BEFORE.has(brandedEntries[i + 1].text)) brandedEntries.splice(i, 1);
  }
  brandedEntries.push({ text: "", kind: "text" });
  brandedEntries.push({ text: DISCLAIMER, kind: "disclaimer" });
  const bodyContent = brandedEntries.map((entry) => entry.text).join("\n");
  if (bodyContent.length < 500) throw new Error("Edited V2 letter body is too short.");

  const brandedLine1 = brand.title;
  const brandedLine2 = "CONDITIONAL CASTING APPROVAL";
  const brandedLine3 = `Cast Name: ${guestName}`;
  const titleText = `${brandedLine1}\n${brandedLine2}\n${brandedLine3}\n`;
  const allText = titleText + " \n" + "\n" + bodyContent;

  const brandedRequests = [];
  brandedRequests.push({
    updateDocumentStyle: {
      documentStyle: {
        pageSize: { width: { magnitude: 612, unit: "PT" }, height: { magnitude: 792, unit: "PT" } },
        marginHeader: { magnitude: 0, unit: "PT" },
        marginTop: { magnitude: 130, unit: "PT" },
        marginBottom: { magnitude: 54, unit: "PT" },
        marginLeft: { magnitude: 0, unit: "PT" },
        marginRight: { magnitude: 0, unit: "PT" },
        marginFooter: { magnitude: 0, unit: "PT" },
      },
      fields: "pageSize,marginTop,marginBottom,marginLeft,marginRight,marginHeader,marginFooter",
    },
  });
  const headerUri = `${assetBase}/header.jpg`;
  if (headerId) {
    brandedRequests.push({
      insertInlineImage: {
        location: { segmentId: headerId, index: 0 },
        uri: headerUri,
        objectSize: { width: { magnitude: 612, unit: "PT" }, height: { magnitude: 122, unit: "PT" } },
      },
    });
    brandedRequests.push({
      updateParagraphStyle: {
        range: { segmentId: headerId, startIndex: 0, endIndex: 1 },
        paragraphStyle: { alignment: "CENTER", spaceAbove: { magnitude: 0, unit: "PT" }, spaceBelow: { magnitude: 0, unit: "PT" }, lineSpacing: 100 },
        fields: "alignment,spaceAbove,spaceBelow,lineSpacing",
      },
    });
  }
  if (footerId) {
    const footerText = `${brand.site}\n`;
    brandedRequests.push({ insertText: { location: { segmentId: footerId, index: 0 }, text: footerText } });
    brandedRequests.push({
      updateTextStyle: {
        range: { segmentId: footerId, startIndex: 0, endIndex: footerText.length },
        textStyle: { bold: false, fontSize: { magnitude: 10, unit: "PT" }, weightedFontFamily: { fontFamily: brand.bodyFont, weight: 400 }, foregroundColor: rgb("555555") },
        fields: "bold,fontSize,weightedFontFamily,foregroundColor",
      },
    });
    brandedRequests.push({
      updateParagraphStyle: {
        range: { segmentId: footerId, startIndex: 0, endIndex: footerText.length },
        paragraphStyle: { alignment: "CENTER", lineSpacing: 100, spaceAbove: { magnitude: 0, unit: "PT" }, spaceBelow: { magnitude: 6, unit: "PT" } },
        fields: "alignment,lineSpacing,spaceAbove,spaceBelow",
      },
    });
  }

  brandedRequests.push({ insertText: { location: { index: 1 }, text: allText } });

  const styleText = (s, e, style, fields) => { if (e > s) brandedRequests.push({ updateTextStyle: { range: { startIndex: s, endIndex: e }, textStyle: style, fields } }); };
  const stylePara = (s, e, style, fields) => { if (e > s) brandedRequests.push({ updateParagraphStyle: { range: { startIndex: s, endIndex: e }, paragraphStyle: style, fields } }); };
  const styleFont = (s, e, family, size, weight, extra = {}) => styleText(s, e, { bold: weight >= 700, fontSize: { magnitude: size, unit: "PT" }, weightedFontFamily: { fontFamily: family, weight }, ...extra }, "bold,fontSize,weightedFontFamily" + Object.keys(extra).map((k) => "," + k).join(""));
  const BRAND_INDENT = { indentStart: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" }, indentFirstLine: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" }, indentEnd: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" } };
  const BRAND_BULLET = { indentStart: { magnitude: BULLET_INDENT_START, unit: "PT" }, indentFirstLine: { magnitude: BULLET_INDENT_FIRST, unit: "PT" }, indentEnd: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" } };
  const pt = (n) => ({ magnitude: n, unit: "PT" });

  const bt1Start = 1, bt1End = bt1Start + brandedLine1.length + 1;
  const bt2Start = bt1End, bt2End = bt2Start + brandedLine2.length + 1;
  const bt3Start = bt2End, bt3End = bt3Start + brandedLine3.length + 1;
  const brandedDividerStart = bt3End, brandedDividerEnd = brandedDividerStart + 2;
  const bContentStart = brandedDividerEnd + 1;
  const bContentEnd = bContentStart + bodyContent.length;

  styleFont(bt1Start, bt1Start + brandedLine1.length, brand.headFont, brand.titleSize, 400, { foregroundColor: brand.headColor });
  stylePara(bt1Start, bt1End, { alignment: "CENTER", spaceAbove: pt(6), spaceBelow: pt(2), ...BRAND_INDENT }, "alignment,spaceAbove,spaceBelow,indentStart,indentFirstLine,indentEnd");
  styleFont(bt2Start, bt2Start + brandedLine2.length, brand.bodyFont, 14, 700, { underline: true, foregroundColor: brand.subtitleColor });
  stylePara(bt2Start, bt2End, { alignment: "CENTER", spaceAbove: pt(0), spaceBelow: pt(16), ...BRAND_INDENT }, "alignment,spaceAbove,spaceBelow,indentStart,indentFirstLine,indentEnd");
  styleFont(bt3Start, bt3Start + brandedLine3.length, brand.bodyFont, 14, 400);
  styleFont(bt3Start, bt3Start + "Cast Name:".length, brand.bodyFont, 14, 700);
  stylePara(bt3Start, bt3End, { alignment: "START", spaceAbove: pt(0), spaceBelow: pt(14), ...BRAND_INDENT }, "alignment,spaceAbove,spaceBelow,indentStart,indentFirstLine,indentEnd");
  stylePara(brandedDividerStart, brandedDividerEnd, { ...BRAND_INDENT, spaceAbove: pt(0), spaceBelow: pt(8), borderBottom: { color: rgb("1A1A1A"), width: pt(1), padding: pt(0), dashStyle: "SOLID" } }, "indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow,borderBottom");
  styleText(brandedDividerStart, brandedDividerEnd, { fontSize: pt(1) }, "fontSize");

  if (bContentEnd > bContentStart) {
    styleText(bContentStart, bContentEnd, { fontSize: pt(FONT_BODY_SIZE), weightedFontFamily: { fontFamily: brand.bodyFont, weight: 400 }, foregroundColor: rgb("0A0A0A") }, "fontSize,weightedFontFamily,foregroundColor");
    stylePara(bContentStart, bContentEnd, { alignment: "START", ...BRAND_INDENT, lineSpacing: LINE_SPACING, spaceAbove: pt(0), spaceBelow: pt(6) }, "alignment,indentStart,indentFirstLine,indentEnd,lineSpacing,spaceAbove,spaceBelow");
  }

  const brandedInserts = [];
  let cursor = bContentStart;
  for (const entry of brandedEntries) {
    const bLine = entry.text;
    const bLen = bLine.length;
    const bParaEnd = cursor + bLen + 1;
    if (entry.kind === "image") {
      stylePara(cursor, bParaEnd, { alignment: "CENTER", indentStart: pt(0), indentFirstLine: pt(0), indentEnd: pt(0), spaceAbove: pt(10), spaceBelow: pt(10) }, "alignment,indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow");
      brandedInserts.push({ index: cursor, kind: "image", image: IMAGES[entry.image] });
    } else if (entry.kind === "disclaimer") {
      styleFont(cursor, cursor + bLen, brand.bodyFont, 9, 400, { foregroundColor: GREY });
      stylePara(cursor, bParaEnd, { alignment: "CENTER", indentStart: pt(96), indentFirstLine: pt(96), indentEnd: pt(96), spaceAbove: pt(18), spaceBelow: pt(10), lineSpacing: 105 }, "alignment,indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow,lineSpacing");
    } else if (bLen === 0) {
      // blank spacer bLine
    } else if (MAJOR.has(bLine)) {
      styleFont(cursor, cursor + bLen, brand.headFont, 22, 400, { foregroundColor: brand.headColor });
      stylePara(cursor, bParaEnd, { alignment: "START", ...BRAND_INDENT, spaceAbove: pt(16), spaceBelow: pt(8), keepWithNext: true }, "alignment,indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow,keepWithNext");
      if (PAGE_BREAK_BEFORE.has(bLine)) brandedInserts.push({ index: cursor, kind: "pageBreak" });
    } else if (SUB.has(bLine)) {
      styleFont(cursor, cursor + bLen, brand.subFont, brand.subSize, brand.subBold ? 700 : 400, { foregroundColor: brand.subColor });
      stylePara(cursor, bParaEnd, { ...BRAND_INDENT, spaceAbove: pt(12), spaceBelow: pt(4), keepWithNext: true }, "indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow,keepWithNext");
    } else if (/^✅/.test(bLine)) {
      if (BOLD_CHECKS.has(bLine)) styleFont(cursor, cursor + bLen, brand.bodyFont, FONT_BODY_SIZE, 700);
      stylePara(cursor, bParaEnd, { ...BRAND_BULLET, spaceAbove: pt(0), spaceBelow: pt(4) }, "indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow");
    } else if (/^•/.test(bLine)) {
      stylePara(cursor, bParaEnd, { ...BRAND_BULLET, spaceAbove: pt(0), spaceBelow: pt(3) }, "indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow");
    } else if (bLine.endsWith(brand.mediaKitLink)) {
      // "🔗 View the <Show> Media Pack": the link text opens the show's media kit hosted next to the other assets.
      const linkStart = cursor + bLine.indexOf(brand.mediaKitLink);
      styleFont(cursor, cursor + bLen, brand.bodyFont, 13, 400);
      styleText(linkStart, cursor + bLen, { link: { url: `${assetBase}/media-kit.jpg` }, underline: true, bold: true, foregroundColor: brand.subColor }, "link,underline,bold,foregroundColor");
      stylePara(cursor, bParaEnd, { ...BRAND_INDENT, spaceAbove: pt(6), spaceBelow: pt(6) }, "indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow");
    } else if (/^Before your second call/.test(bLine) || /^(It has the potential to become:|These may include:|During your next call we will discuss:)$/.test(bLine)) {
      styleFont(cursor, cursor + bLen, brand.bodyFont, FONT_BODY_SIZE, 700);
      stylePara(cursor, bParaEnd, { ...BRAND_INDENT, spaceAbove: pt(8), spaceBelow: pt(4) }, "indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow");
    } else if (/^These are some of the qualities/.test(bLine)) {
      styleFont(cursor, cursor + bLen, brand.bodyFont, FONT_BODY_SIZE, 700);
    }
    cursor += bLen + 1;
  }

  // Descending index so earlier indices stay valid; on a shared index the image goes in first so the
  // page break lands before the image paragraph rather than inside it.
  brandedInserts.sort((a, b) => b.index - a.index || (a.kind === "image" ? -1 : 1));
  for (const op of brandedInserts) {
    if (op.kind === "image") {
      brandedRequests.push({ insertInlineImage: { location: { index: op.index }, uri: op.image.uri, objectSize: { width: pt(op.image.width), height: pt(op.image.height) } } });
    } else {
      brandedRequests.push({ insertPageBreak: { location: { index: op.index } } });
    }
  }

  return [{
    json: {
      ...built,
      documentId,
      document_url: `https://docs.google.com/document/d/${documentId}/edit`,
      requests: brandedRequests,
      design_assets: { header_url: headerUri, customer_journey_url: null },
    },
  }];
}

let finalBodyContent = stripV2TitleAndFooter(built.letter_text || built.preview || "");
if (finalBodyContent.length < 500) throw new Error("Edited V2 letter body is too short.");

finalBodyContent = ensureNextStepResources(finalBodyContent);
finalBodyContent = normalizeApprovalSections(finalBodyContent);
finalBodyContent = finalBodyContent
  .replace(/\bthis\s+weeks\s+cohort\b/gi, "this week's cohort")
  .replace(/^(NEXT STEP)\s*\n+/gim, "$1\n")
  .replace(/^(CONDITIONAL APPROVAL EXPIRES[^\n]*)\s*\n+/gim, "$1\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const titleLine1 = "INSIDE SUCCESS TV";
const titleLine2 = "CONDITIONAL CASTING APPROVAL";
const castLine = `Cast Name: ${guestName}`;
const formattedTitleText = `${titleLine1}\n${titleLine2}\n${castLine}\n`;
const dividerParagraph = " \n";
const spacerAfterDivider = "\n";
const allBodyText = formattedTitleText + dividerParagraph + spacerAfterDivider + finalBodyContent;

const useBannerFreeHeader = isNextLevelCeo || isReality;
const logoUrl = useBannerFreeHeader ? NLCEO_HEADER_IMAGE_URL : DEFAULT_HEADER_IMAGE_URL;
const logoWidth = 650;
const logoHeight = useBannerFreeHeader ? 111 : 150;
const customerJourneyUrl = isNextLevelCeo
  ? NLCEO_CUSTOMER_JOURNEY_IMAGE_URL
  : DEFAULT_CUSTOMER_JOURNEY_IMAGE_URL;

const requests = [];

requests.push({
  updateDocumentStyle: {
    documentStyle: {
      pageSize: { width: { magnitude: 612, unit: "PT" }, height: { magnitude: 792, unit: "PT" } },
      marginHeader: { magnitude: 0, unit: "PT" },
      marginTop: { magnitude: 130, unit: "PT" },
      marginBottom: { magnitude: 54, unit: "PT" },
      marginLeft: { magnitude: 0, unit: "PT" },
      marginRight: { magnitude: 0, unit: "PT" },
      marginFooter: { magnitude: 0, unit: "PT" },
    },
    fields: "pageSize,marginTop,marginBottom,marginLeft,marginRight,marginHeader,marginFooter",
  },
});

if (headerId) {
  requests.push({
    insertInlineImage: {
      location: { segmentId: headerId, index: 0 },
      uri: logoUrl,
      objectSize: {
        width: { magnitude: logoWidth, unit: "PT" },
        height: { magnitude: logoHeight, unit: "PT" },
      },
    },
  });
  requests.push({
    updateParagraphStyle: {
      range: { segmentId: headerId, startIndex: 0, endIndex: 1 },
      paragraphStyle: {
        alignment: "CENTER",
        spaceAbove: { magnitude: 0, unit: "PT" },
        spaceBelow: { magnitude: 0, unit: "PT" },
        lineSpacing: 100,
      },
      fields: "alignment,spaceAbove,spaceBelow,lineSpacing",
    },
  });
}

if (footerId) {
  const fText1 = "www.";
  const fText2 = "InsideSuccess";
  const fText3 = ".TV\n";
  const fText4 = "STREAM SUCCESS\n";
  const allFooter = fText1 + fText2 + fText3 + fText4;
  const f1End = fText1.length;
  const f2End = f1End + fText2.length;
  const f3End = f2End + fText3.length;
  const f4End = f3End + fText4.length;

  requests.push({ insertText: { location: { segmentId: footerId, index: 0 }, text: allFooter } });
  requests.push({
    updateTextStyle: {
      range: { segmentId: footerId, startIndex: 0, endIndex: f1End },
      textStyle: {
        bold: false,
        fontSize: { magnitude: 11, unit: "PT" },
        weightedFontFamily: { fontFamily: FONT_BODY, weight: 400 },
      },
      fields: "bold,fontSize,weightedFontFamily",
    },
  });
  requests.push({
    updateTextStyle: {
      range: { segmentId: footerId, startIndex: f1End, endIndex: f2End },
      textStyle: {
        bold: true,
        fontSize: { magnitude: 11, unit: "PT" },
        weightedFontFamily: { fontFamily: FONT_BODY, weight: 700 },
      },
      fields: "bold,fontSize,weightedFontFamily",
    },
  });
  requests.push({
    updateTextStyle: {
      range: { segmentId: footerId, startIndex: f2End, endIndex: f3End },
      textStyle: {
        bold: false,
        fontSize: { magnitude: 11, unit: "PT" },
        weightedFontFamily: { fontFamily: FONT_BODY, weight: 400 },
      },
      fields: "bold,fontSize,weightedFontFamily",
    },
  });
  requests.push({
    updateTextStyle: {
      range: { segmentId: footerId, startIndex: f3End, endIndex: f4End },
      textStyle: {
        bold: false,
        italic: true,
        fontSize: { magnitude: 22, unit: "PT" },
        weightedFontFamily: { fontFamily: FONT_TITLE, weight: 400 },
        foregroundColor: { color: { rgbColor: { red: 0.5, green: 0.5, blue: 0.5 } } },
      },
      fields: "bold,italic,fontSize,weightedFontFamily,foregroundColor",
    },
  });
  requests.push({
    updateParagraphStyle: {
      range: { segmentId: footerId, startIndex: 0, endIndex: f4End },
      paragraphStyle: {
        alignment: "CENTER",
        lineSpacing: 100,
        spaceAbove: { magnitude: 0, unit: "PT" },
        spaceBelow: { magnitude: 0, unit: "PT" },
      },
      fields: "alignment,lineSpacing,spaceAbove,spaceBelow",
    },
  });
}

requests.push({ insertText: { location: { index: 1 }, text: allBodyText } });

const titleStart = 1;
const t0Len = titleLine1.length;
const t0ParaEnd = titleStart + t0Len + 1;
const t1Start = t0ParaEnd;
const t1Len = titleLine2.length;
const t1ParaEnd = t1Start + t1Len + 1;
const t2Start = t1ParaEnd;
const t2Len = castLine.length;
const t2ParaEnd = t2Start + t2Len + 1;
const dividerStart = t2ParaEnd;
const dividerEndExclusive = dividerStart + 2;
const contentStartIndex = dividerEndExclusive + 1;
const contentEndIndex = contentStartIndex + finalBodyContent.length;

function addTextStyle(startIndex, endIndex, textStyle, fields) {
  if (endIndex <= startIndex) return;
  requests.push({ updateTextStyle: { range: { startIndex, endIndex }, textStyle, fields } });
}

function addParagraphStyle(startIndex, endIndex, paragraphStyle, fields) {
  if (endIndex <= startIndex) return;
  requests.push({ updateParagraphStyle: { range: { startIndex, endIndex }, paragraphStyle, fields } });
}

function applyFont(startIndex, endIndex, bold, fontSize, fontFamily, weight, extraStyle = {}) {
  addTextStyle(
    startIndex,
    endIndex,
    {
      bold,
      fontSize: { magnitude: fontSize, unit: "PT" },
      weightedFontFamily: { fontFamily, weight: weight || (bold ? 700 : 400) },
      ...extraStyle,
    },
    ["bold", "fontSize", "weightedFontFamily", ...Object.keys(extraStyle)].join(","),
  );
}

function stylePara(start, end, spaceAbove, spaceBelow, keepNext = false) {
  addParagraphStyle(
    start,
    end,
    {
      alignment: "START",
      indentStart: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
      indentFirstLine: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
      indentEnd: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
      spaceAbove: { magnitude: spaceAbove, unit: "PT" },
      spaceBelow: { magnitude: spaceBelow, unit: "PT" },
      keepWithNext: keepNext,
    },
    "alignment,indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow,keepWithNext",
  );
}

requests.push({
  updateTextStyle: {
    range: { startIndex: titleStart, endIndex: titleStart + t0Len },
    textStyle: {
      bold: false,
      italic: false,
      fontSize: { magnitude: FONT_TITLE_MAIN, unit: "PT" },
      weightedFontFamily: { fontFamily: FONT_MAIN_TITLE, weight: 400 },
    },
    fields: "bold,italic,fontSize,weightedFontFamily",
  },
});
addParagraphStyle(
  titleStart,
  t0ParaEnd,
  {
    alignment: "CENTER",
    spaceAbove: { magnitude: 0, unit: "PT" },
    spaceBelow: { magnitude: 4, unit: "PT" },
  },
  "alignment,spaceAbove,spaceBelow",
);

requests.push({
  updateTextStyle: {
    range: { startIndex: t1Start, endIndex: t1Start + t1Len },
    textStyle: {
      bold: false,
      italic: false,
      fontSize: { magnitude: FONT_TITLE_SUB, unit: "PT" },
      weightedFontFamily: { fontFamily: FONT_MAIN_TITLE, weight: 400 },
    },
    fields: "bold,italic,fontSize,weightedFontFamily",
  },
});
addParagraphStyle(
  t1Start,
  t1ParaEnd,
  {
    alignment: "CENTER",
    spaceAbove: { magnitude: 0, unit: "PT" },
    spaceBelow: { magnitude: 18, unit: "PT" },
  },
  "alignment,spaceAbove,spaceBelow",
);

applyFont(t2Start, t2Start + t2Len, false, 14, FONT_BODY, 400);
const castPrefixLength = "Cast Name:".length;
applyFont(t2Start, t2Start + castPrefixLength, true, 14, FONT_BODY, 700);
addParagraphStyle(
  t2Start,
  t2ParaEnd,
  {
    alignment: "START",
    indentStart: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
    indentFirstLine: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
    indentEnd: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
    spaceAbove: { magnitude: 0, unit: "PT" },
    spaceBelow: { magnitude: 18, unit: "PT" },
  },
  "alignment,indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow",
);

requests.push({
  updateParagraphStyle: {
    range: { startIndex: dividerStart, endIndex: dividerEndExclusive },
    paragraphStyle: {
      indentStart: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
      indentFirstLine: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
      indentEnd: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
      spaceAbove: { magnitude: 0, unit: "PT" },
      spaceBelow: { magnitude: 8, unit: "PT" },
      borderBottom: {
        color: COLOR_GREY,
        width: { magnitude: 1, unit: "PT" },
        padding: { magnitude: 0, unit: "PT" },
        dashStyle: "SOLID",
      },
    },
    fields: "indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow,borderBottom",
  },
});
addTextStyle(dividerStart, dividerEndExclusive, { fontSize: { magnitude: 1, unit: "PT" } }, "fontSize");

if (contentEndIndex > contentStartIndex) {
  addTextStyle(
    contentStartIndex,
    contentEndIndex,
    {
      fontSize: { magnitude: FONT_BODY_SIZE, unit: "PT" },
      weightedFontFamily: { fontFamily: FONT_BODY, weight: 400 },
    },
    "fontSize,weightedFontFamily",
  );
  addParagraphStyle(
    contentStartIndex,
    contentEndIndex,
    {
      alignment: "START",
      indentStart: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
      indentFirstLine: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
      indentEnd: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
      lineSpacing: LINE_SPACING,
    },
    "alignment,indentStart,indentFirstLine,indentEnd,lineSpacing",
  );
}

function applyNextStepResourceLinks(startIndex, line) {
  for (const link of [
    { label: RUDY_EPISODE_LINK_TEXT, url: RUDY_EPISODE_URL },
    { label: MEDIA_PACK_LINK_TEXT, url: MEDIA_PACK_URL },
  ]) {
    const offset = line.indexOf(link.label);
    if (offset === -1) continue;
    requests.push({
      updateTextStyle: {
        range: {
          startIndex: startIndex + offset,
          endIndex: startIndex + offset + link.label.length,
        },
        textStyle: {
          link: { url: link.url },
          underline: true,
          bold: true,
          foregroundColor: COLOR_WHITE,
        },
        fields: "link,underline,bold,foregroundColor",
      },
    });
  }
}

const nextStepParagraphRestyles = [];
const approvalParagraphRestyles = [];

function addRestyle(store, start, paraEnd, paragraphStyle, fields) {
  store.push({
    updateParagraphStyle: {
      range: { startIndex: start, endIndex: Math.min(paraEnd, contentEndIndex + 1) },
      paragraphStyle,
      fields,
    },
  });
}

function styleNextStepBox(start, paraEnd, position, glueToNext = false) {
  const borderPad = {
    color: COLOR_BLACK,
    width: { magnitude: 20, unit: "PT" },
    padding: { magnitude: 0, unit: "PT" },
    dashStyle: "SOLID",
  };
  const noBorder = {
    color: COLOR_BLACK,
    width: { magnitude: 0, unit: "PT" },
    padding: { magnitude: 0, unit: "PT" },
    dashStyle: "SOLID",
  };
  const isFirst = position === "first";
  const isLast = position === "last";
  const paragraphStyle = {
    alignment: "START",
    indentStart: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
    indentFirstLine: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
    indentEnd: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
    spaceAbove: { magnitude: isFirst ? 20 : 0, unit: "PT" },
    spaceBelow: { magnitude: isLast && !glueToNext ? 20 : 0, unit: "PT" },
    shading: { backgroundColor: COLOR_BLACK },
    borderTop: isFirst ? borderPad : noBorder,
    borderBottom: isLast ? borderPad : noBorder,
    borderLeft: borderPad,
    borderRight: borderPad,
    keepWithNext: !isLast || glueToNext,
    keepLinesTogether: true,
  };
  const fields =
    "alignment,indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow,shading,borderTop,borderBottom,borderLeft,borderRight,keepWithNext,keepLinesTogether";
  addParagraphStyle(start, paraEnd, paragraphStyle, fields);
  addRestyle(nextStepParagraphRestyles, start, paraEnd, paragraphStyle, fields);
}

function styleApprovalBox(start, paraEnd, position) {
  const borderYellow = {
    color: COLOR_YELLOW,
    width: { magnitude: 3, unit: "PT" },
    padding: { magnitude: 17, unit: "PT" },
    dashStyle: "SOLID",
  };
  const noBorder = {
    color: COLOR_BLACK,
    width: { magnitude: 0, unit: "PT" },
    padding: { magnitude: 0, unit: "PT" },
    dashStyle: "SOLID",
  };
  const isFirst = position === "first";
  const isLast = position === "last";
  const paragraphStyle = {
    alignment: "START",
    indentStart: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
    indentFirstLine: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
    indentEnd: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
    spaceAbove: { magnitude: 0, unit: "PT" },
    spaceBelow: { magnitude: isLast ? 20 : 0, unit: "PT" },
    shading: { backgroundColor: COLOR_BLACK },
    borderTop: isFirst ? borderYellow : noBorder,
    borderBottom: isLast ? borderYellow : noBorder,
    borderLeft: borderYellow,
    borderRight: borderYellow,
    keepWithNext: !isLast,
    keepLinesTogether: true,
  };
  const fields =
    "alignment,indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow,shading,borderTop,borderBottom,borderLeft,borderRight,keepWithNext,keepLinesTogether";
  addParagraphStyle(start, paraEnd, paragraphStyle, fields);
  addRestyle(approvalParagraphRestyles, start, paraEnd, paragraphStyle, fields);
}

const majorHeadings = new Set([
  "CONGRATULATIONS",
  "WHY YOUR STORY STANDS OUT",
  "YOUR HOLLYWOOD STORY FORMULA",
  "YOUR THING",
  "THE MISSION YOU ARE BUILDING",
  "WHY THIS STORY MATTERS NOW",
  "YOUR AUTHORITY ASSET",
  "YOUR FAME STACK",
  "WHY WE BELIEVE YOU ARE A FIT",
  "WHY YOU STOOD OUT",
  "WHY OUR REALITY SHOWS ARE DIFFERENT",
  "YOUR COMPETITIVE PROFILE",
  "THE REAL QUESTION",
  "WHAT PRODUCTION WILL BE LOOKING FOR",
  "MEDIA & CONTENT OPPORTUNITIES",
]);

let idx = contentStartIndex;
let inNextStepBox = false;
let inApprovalBox = false;
const bodyLinesArr = finalBodyContent.split("\n");

for (let i = 0; i < bodyLinesArr.length; i += 1) {
  const line = bodyLinesArr[i];
  const len = line.length;
  const paraEnd = idx + len + 1;
  const trimmed = line.trim();

  function nextNonEmptyLine() {
    for (let k = i + 1; k < bodyLinesArr.length; k += 1) {
      if (bodyLinesArr[k].trim()) return bodyLinesArr[k].trim();
    }
    return "";
  }

  if (len === 0) {
    const next = nextNonEmptyLine();
    const glueToApproval = /^CONDITIONAL APPROVAL/i.test(next);
    if (glueToApproval) {
      addTextStyle(idx, paraEnd, { fontSize: { magnitude: 6, unit: "PT" } }, "fontSize");
      addParagraphStyle(
        idx,
        paraEnd,
        {
          spaceAbove: { magnitude: 0, unit: "PT" },
          spaceBelow: { magnitude: 0, unit: "PT" },
          keepWithNext: true,
        },
        "spaceAbove,spaceBelow,keepWithNext",
      );
    }
    inNextStepBox = false;
    inApprovalBox = false;
    idx += 1;
    continue;
  }

  if (/^NEXT STEP/i.test(trimmed)) {
    inNextStepBox = true;
    applyFont(idx, idx + len, false, 20, FONT_TITLE, 400, { foregroundColor: COLOR_WHITE });
    const next = nextNonEmptyLine();
    styleNextStepBox(idx, paraEnd, "first", /^CONDITIONAL APPROVAL/i.test(next));
  } else if (inNextStepBox) {
    applyFont(idx, idx + len, false, FONT_BODY_SIZE, FONT_BODY, 400, { foregroundColor: COLOR_WHITE });
    applyNextStepResourceLinks(idx, line);
    const next = nextNonEmptyLine();
    const boxEndsAfterThis =
      next === "" ||
      majorHeadings.has(next.toUpperCase()) ||
      /^CONDITIONAL APPROVAL/i.test(next) ||
      /^Results vary\./i.test(next);
    styleNextStepBox(idx, paraEnd, boxEndsAfterThis ? "last" : "middle", /^CONDITIONAL APPROVAL/i.test(next));
    if (boxEndsAfterThis) inNextStepBox = false;
  } else if (/^CONDITIONAL APPROVAL EXPIRES/i.test(trimmed)) {
    inApprovalBox = true;
    applyFont(idx, idx + len, false, 20, FONT_TITLE, 400, { foregroundColor: COLOR_WHITE });
    styleApprovalBox(idx, paraEnd, "first");
  } else if (inApprovalBox) {
    applyFont(idx, idx + len, false, FONT_BODY_SIZE, FONT_BODY, 400, { foregroundColor: COLOR_WHITE });
    const next = nextNonEmptyLine();
    const boxEndsAfterThis = next === "" || majorHeadings.has(next.toUpperCase()) || /^Results vary\./i.test(next);
    styleApprovalBox(idx, paraEnd, boxEndsAfterThis ? "last" : "middle");
    if (boxEndsAfterThis) inApprovalBox = false;
  } else if (majorHeadings.has(trimmed.toUpperCase())) {
    applyFont(idx, idx + len, false, FONT_MAJOR_HEAD, FONT_TITLE, 400);
    stylePara(idx, paraEnd, 14, 6, true);
  } else if (isReality && /^(BUSINESS EXPERIENCE|COMPETITIVE EDGE|PERSONALITY|THE WILDCARD)$/.test(trimmed)) {
    applyFont(idx, idx + len, true, FONT_ACT_HEAD, FONT_BODY, 700);
    stylePara(idx, paraEnd, 16, 4, true);
  } else if (/^ACT [1-5]:/i.test(trimmed)) {
    applyFont(idx, idx + len, true, FONT_ACT_HEAD, FONT_BODY, 700);
    stylePara(idx, paraEnd, 16, 4, true);
  } else if (/^Results vary\./i.test(trimmed)) {
    applyFont(idx, idx + len, false, 9, FONT_BODY, 400, { foregroundColor: COLOR_GREY });
    addParagraphStyle(
      idx,
      paraEnd,
      {
        alignment: "CENTER",
        indentStart: { magnitude: 96, unit: "PT" },
        indentFirstLine: { magnitude: 96, unit: "PT" },
        indentEnd: { magnitude: 96, unit: "PT" },
        spaceAbove: { magnitude: 18, unit: "PT" },
        spaceBelow: { magnitude: 10, unit: "PT" },
        lineSpacing: 105,
      },
      "alignment,indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow,lineSpacing",
    );
  } else if (/^\s*[\u2713\u2022\u2794]/.test(line)) {
    addParagraphStyle(
      idx,
      paraEnd,
      {
        alignment: "START",
        indentStart: { magnitude: BULLET_INDENT_START, unit: "PT" },
        indentFirstLine: { magnitude: BULLET_INDENT_FIRST, unit: "PT" },
        indentEnd: { magnitude: MARGIN_LEFT_RIGHT, unit: "PT" },
        spaceAbove: { magnitude: 0, unit: "PT" },
        spaceBelow: { magnitude: 6, unit: "PT" },
      },
      "alignment,indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow",
    );
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1 && colonIndex < 100) {
      applyFont(idx, idx + colonIndex + 1, true, FONT_BODY_SIZE, FONT_BODY, 700);
    }
  } else {
    stylePara(idx, paraEnd, 0, 12);
  }

  idx += len + 1;
}

if (contentEndIndex > contentStartIndex) {
  addParagraphStyle(
    contentStartIndex,
    contentEndIndex,
    { lineSpacing: LINE_SPACING },
    "lineSpacing",
  );
}

if (!isReality) {
const customerJourneyStartIndex = contentEndIndex;
const customerJourneySectionStart = customerJourneyStartIndex + 1;
const customerJourneySectionEnd = customerJourneyStartIndex + 2;
const customerJourneyParagraphStart = customerJourneySectionStart + 1;
const customerJourneyParagraphEnd = customerJourneyParagraphStart + 2;
const customerJourneyImageHeight = 744;
const customerJourneyImageWidth = isNextLevelCeo ? 505 : 500;

requests.push({
  insertSectionBreak: {
    sectionType: "NEXT_PAGE",
    location: { index: customerJourneyStartIndex },
  },
});

requests.push({
  createHeader: {
    type: "DEFAULT",
    sectionBreakLocation: { index: customerJourneySectionStart },
  },
});

requests.push({
  createFooter: {
    type: "DEFAULT",
    sectionBreakLocation: { index: customerJourneySectionStart },
  },
});

requests.push(...approvalParagraphRestyles);
requests.push(...nextStepParagraphRestyles);

const clearCustomerJourneyParagraphBorder = {
  color: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } },
  width: { magnitude: 0, unit: "PT" },
  padding: { magnitude: 0, unit: "PT" },
  dashStyle: "SOLID",
};

requests.push({
  updateSectionStyle: {
    range: { startIndex: customerJourneySectionStart, endIndex: customerJourneySectionEnd },
    sectionStyle: {
      marginTop: { magnitude: 0, unit: "PT" },
      marginBottom: { magnitude: 0, unit: "PT" },
      marginLeft: { magnitude: 0, unit: "PT" },
      marginRight: { magnitude: 0, unit: "PT" },
      marginHeader: { magnitude: 0, unit: "PT" },
      marginFooter: { magnitude: 0, unit: "PT" },
      useFirstPageHeaderFooter: false,
    },
    fields: "marginTop,marginBottom,marginLeft,marginRight,marginHeader,marginFooter,useFirstPageHeaderFooter",
  },
});

requests.push({
  insertInlineImage: {
    location: { index: customerJourneyParagraphStart },
    uri: customerJourneyUrl,
    objectSize: {
      width: { magnitude: customerJourneyImageWidth, unit: "PT" },
      height: { magnitude: customerJourneyImageHeight, unit: "PT" },
    },
  },
});

requests.push({
  updateParagraphStyle: {
    range: { startIndex: customerJourneyParagraphStart, endIndex: customerJourneyParagraphEnd },
    paragraphStyle: {
      alignment: "CENTER",
      indentStart: { magnitude: 0, unit: "PT" },
      indentFirstLine: { magnitude: 0, unit: "PT" },
      indentEnd: { magnitude: 0, unit: "PT" },
      spaceAbove: { magnitude: 0, unit: "PT" },
      spaceBelow: { magnitude: 0, unit: "PT" },
      lineSpacing: 100,
      shading: { backgroundColor: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } } },
      borderTop: clearCustomerJourneyParagraphBorder,
      borderBottom: clearCustomerJourneyParagraphBorder,
      borderLeft: clearCustomerJourneyParagraphBorder,
      borderRight: clearCustomerJourneyParagraphBorder,
      keepWithNext: false,
      keepLinesTogether: false,
    },
    fields:
      "alignment,indentStart,indentFirstLine,indentEnd,spaceAbove,spaceBelow,lineSpacing,shading,borderTop,borderBottom,borderLeft,borderRight,keepWithNext,keepLinesTogether",
  },
});

} else {
  requests.push(...approvalParagraphRestyles);
  requests.push(...nextStepParagraphRestyles);
}

return [{
  json: {
    ...built,
    documentId,
    document_url: `https://docs.google.com/document/d/${documentId}/edit`,
    requests,
    design_assets: {
      header_url: logoUrl,
      customer_journey_url: isReality ? null : customerJourneyUrl,
    },
  },
}];
