import { useMemo, useState } from "react";
import { validateClientPayload } from "./validation.js";

const V2_WEBHOOK_URL =
  import.meta.env.VITE_V2_N8N_WEBHOOK_URL ||
  "https://insidesuccess.app.n8n.cloud/webhook/green-light-v2-conditional-approval";

const V2_SAVE_WEBHOOK_URL =
  import.meta.env.VITE_V2_N8N_SAVE_WEBHOOK_URL ||
  "https://insidesuccess.app.n8n.cloud/webhook/green-light-v2-conditional-approval-save";

const DEFAULT_DEADLINE = "Sunday 11.59pm EST";

function getTranscriptShowSignal(transcript) {
  const value = transcript.toLowerCase();
  if (/\bnext\s*level\s*ceo\b/.test(value) || /\bnlceo\b/.test(value)) {
    return "nlceo";
  }
  return "normal";
}

function StatusPill({ status }) {
  const label =
    status === "success"
      ? "Validated"
      : status === "error"
        ? "Blocked"
        : status === "saving"
          ? "Saving"
        : status === "loading"
          ? "Generating"
          : "Ready";

  return <span className={`status-pill ${status || "idle"}`}>{label}</span>;
}

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [clientName, setClientName] = useState("");
  const [showType, setShowType] = useState("normal");
  const [deadlineText, setDeadlineText] = useState(DEFAULT_DEADLINE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [savedDoc, setSavedDoc] = useState(null);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");

  const clientValidation = useMemo(
    () => validateClientPayload({ transcript, showType, deadlineText }),
    [transcript, showType, deadlineText],
  );

  const showSignal = useMemo(
    () => getTranscriptShowSignal(transcript),
    [transcript],
  );

  const variantWarning =
    transcript.trim() && showSignal !== showType
      ? `Transcript appears to mention ${showSignal === "nlceo" ? "Next Level CEO" : "a normal show"}, but the selected variant is ${showType === "nlceo" ? "Next Level CEO" : "Normal"}.`
      : "";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setResult(null);
    setDraftText("");
    setSavedDoc(null);
    setError("");
    setSaveError("");

    if (!clientValidation.ok) {
      setError(clientValidation.errors[0]);
      return;
    }

    setIsGenerating(true);
    const cleanClientName = clientName.trim();
    try {
      const response = await fetch(V2_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: transcript,
          transcript,
          client_name: cleanClientName,
          show_type: showType,
          deadline_text: showType === "normal" ? deadlineText.trim() : "",
          requested_output: "v2_conditional_casting_approval",
          timestamp: new Date().toISOString(),
        }),
      });

      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text };
      }

      if (!response.ok || payload?.ok === false) {
        const message =
          payload?.error ||
          payload?.message ||
          `V2 workflow failed with status ${response.status}`;
        throw new Error(message);
      }

      const generatedDraft =
        payload?.draft_text || payload?.preview || payload?.letter_text || "";
      setResult(payload);
      setDraftText(generatedDraft);
    } catch (caughtError) {
      setError(caughtError.message || "V2 generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToDrive = async () => {
    setSaveError("");
    setSavedDoc(null);

    const cleanDraft = draftText.trim();
    if (!cleanDraft) {
      setSaveError("Generate or paste an edited V2 letter before sending to Google Drive.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(V2_SAVE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letter_text: cleanDraft,
          draft_text: cleanDraft,
          show_type: result?.show_type || showType,
          guest_name: result?.guest_name || "",
          client_name: clientName.trim(),
          doc_title: result?.doc_title || "",
          warnings: result?.warnings || [],
          requested_output: "v2_conditional_casting_approval_save",
          timestamp: new Date().toISOString(),
        }),
      });

      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text };
      }

      if (!response.ok || payload?.ok === false) {
        const message =
          payload?.error ||
          payload?.message ||
          `V2 save workflow failed with status ${response.status}`;
        throw new Error(message);
      }

      setSavedDoc(payload);
    } catch (caughtError) {
      setSaveError(caughtError.message || "V2 Google Drive save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const warnings = [
    ...(clientValidation.warnings || []),
    ...(variantWarning ? [variantWarning] : []),
    ...((result?.warnings || []).filter(Boolean)),
  ];
  const hasDraft = draftText.trim().length > 0;
  const activeDoc = savedDoc || result;

  return (
    <main className="app-shell">
      <section className="top-bar" aria-label="Green Light V2 status">
        <div>
          <p className="eyebrow">Inside Success TV</p>
          <h1>Green Light V2 Conditional Approval</h1>
          <p className="subcopy">
            Content-first V2 generator using Rudy's Conditional Casting Approval template.
          </p>
        </div>
        <StatusPill
          status={
            isGenerating
              ? "loading"
              : isSaving
                ? "saving"
              : error || saveError
                ? "error"
                : savedDoc || result
                  ? "success"
                  : "idle"
          }
        />
      </section>

      <form className="generator-grid" onSubmit={handleSubmit}>
        <section className="panel input-panel">
          <div className="section-header">
            <div>
              <h2>Transcript</h2>
              <p>Paste the casting call transcript and choose the deterministic show variant.</p>
            </div>
          </div>

          <label className="field-label" htmlFor="show-type">
            Show variant
          </label>
          <div className="segmented-control" id="show-type">
            <button
              type="button"
              className={showType === "normal" ? "selected" : ""}
              onClick={() => setShowType("normal")}
            >
              Normal
            </button>
            <button
              type="button"
              className={showType === "nlceo" ? "selected" : ""}
              onClick={() => setShowType("nlceo")}
            >
              Next Level CEO
            </button>
          </div>

          {showType === "normal" && (
            <>
              <label className="field-label" htmlFor="deadline">
                Normal-show deadline text
              </label>
              <input
                id="deadline"
                value={deadlineText}
                onChange={(event) => setDeadlineText(event.target.value)}
                placeholder={DEFAULT_DEADLINE}
              />
            </>
          )}

          <label className="field-label" htmlFor="client-name">
            Client name <span className="optional-label">optional</span>
          </label>
          <input
            id="client-name"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            placeholder="Leave blank to let AI detect it from the transcript"
          />

          <label className="field-label" htmlFor="transcript">
            Casting transcript
          </label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="Paste the full casting call transcript here..."
            spellCheck="false"
          />

          <button
            className="primary-action"
            type="submit"
            disabled={isGenerating || !clientValidation.ok}
          >
            {isGenerating ? "Generating V2 Letter..." : "Generate V2 Letter"}
          </button>

          {(error || warnings.length > 0) && (
            <div className={error ? "notice error" : "notice warning"}>
              {error && <p>{error}</p>}
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}
        </section>

        <section className="panel output-panel">
          <div className="section-header">
            <div>
              <h2>V2 Output</h2>
              <p>Edit the draft here, then send the final version to Google Drive.</p>
            </div>
          </div>

          {savedDoc?.document_url && (
            <a className="doc-link" href={savedDoc.document_url} target="_blank" rel="noreferrer">
              Open V2 Google Doc
            </a>
          )}

          {activeDoc?.doc_title && (
            <div className="metadata-row">
              <span>Document</span>
              <strong>{activeDoc.doc_title}</strong>
            </div>
          )}

          {activeDoc?.validation_status && (
            <div className="metadata-row">
              <span>Validation</span>
              <strong>{activeDoc.validation_status}</strong>
            </div>
          )}

          <label className="field-label" htmlFor="draft-editor">
            Editable V2 letter
          </label>
          <textarea
            id="draft-editor"
            className="draft-editor"
            value={draftText}
            onChange={(event) => {
              setDraftText(event.target.value);
              setSavedDoc(null);
              setSaveError("");
            }}
            placeholder="Generated V2 letter draft will appear here. You can edit it before sending it to Google Drive."
            spellCheck="true"
          />

          <button
            className="primary-action"
            type="button"
            disabled={isGenerating || isSaving || !hasDraft}
            onClick={handleSaveToDrive}
          >
            {isSaving ? "Sending to Google Drive..." : "Send Edited Doc to Google Drive"}
          </button>

          {saveError && (
            <div className="notice error">
              <p>{saveError}</p>
            </div>
          )}

          {savedDoc?.document_url && (
            <div className="notice success">
              <p>V2 Google Doc created successfully.</p>
            </div>
          )}
        </section>
      </form>
    </main>
  );
}
