const MIN_TRANSCRIPT_LENGTH = 120;

export function validateClientPayload({
  transcript,
  showType,
  deadlineText,
  multiClientEnabled,
  multiClientLetterCount,
  targetClientName,
}) {
  const errors = [];
  const warnings = [];
  const cleanTranscript = String(transcript || "").trim();

  if (!cleanTranscript) {
    errors.push("Paste a transcript before generating the V2 letter.");
  } else if (cleanTranscript.length < MIN_TRANSCRIPT_LENGTH) {
    errors.push("Transcript is too short for reliable V2 extraction.");
  }

  if (!["normal", "nlceo"].includes(showType)) {
    errors.push("Choose either Normal or Next Level CEO.");
  }

  if (showType === "normal" && !String(deadlineText || "").trim()) {
    errors.push("Normal shows require deadline text.");
  }

  if (multiClientEnabled && ![1, 2].includes(Number(multiClientLetterCount))) {
    errors.push("Choose either 1 or 2 letters for the multi-client transcript.");
  }

  if (
    multiClientEnabled &&
    Number(multiClientLetterCount) === 1 &&
    !String(targetClientName || "").trim()
  ) {
    errors.push("Enter the target client name when generating one letter from a multi-client transcript.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
