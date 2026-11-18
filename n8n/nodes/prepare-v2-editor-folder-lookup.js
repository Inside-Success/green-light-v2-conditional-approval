const payload = $input.first().json || {};
const DEFAULT_EDITOR_NAME = "Adedokun Adedoyin";
const PARENT_FOLDER_ID = "1p5OoD3QlqhhHA0V0Eg02ZI4fkUQ13HwN";
// "Reps" subfolder of the parent folder. Letters saved from the rep self-serve page (Magic Mike)
// go into Reps/<rep name>; the rep's folder is created on first save like an editor folder.
const REPS_FOLDER_ID = "1X_CY7Rx2CW0XYF9xk1i98cQkCi6qHcYq";

function cleanName(value) {
  return String(value || '')
    .replace(/[\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function keyName(value) {
  return cleanName(value).toLowerCase();
}

const editorName = cleanName(payload.editor_name || payload.editorName || DEFAULT_EDITOR_NAME) || DEFAULT_EDITOR_NAME;

return [{
  json: {
    ...payload,
    editor_name: editorName,
    editor_folder_name: editorName,
    editor_folder_key: keyName(editorName),
    parent_folder_id: payload.folder_group === 'reps' ? REPS_FOLDER_ID : PARENT_FOLDER_ID,
  },
}];
