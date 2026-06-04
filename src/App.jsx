import { useEffect, useMemo, useState } from "react";
import { validateClientPayload } from "./validation.js";

const V2_WEBHOOK_URL =
  import.meta.env.VITE_V2_N8N_WEBHOOK_URL ||
  "https://insidesuccess.app.n8n.cloud/webhook/green-light-v2-conditional-approval";

const V2_SAVE_WEBHOOK_URL =
  import.meta.env.VITE_V2_N8N_SAVE_WEBHOOK_URL ||
  "https://insidesuccess.app.n8n.cloud/webhook/green-light-v2-conditional-approval-save";

const DEFAULT_DEADLINE = "Sunday 11.59pm EST";
const SESSION_STORAGE_KEY = "green-light-v2-dashboard-session-v1";

function readSessionState() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

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
  const [savedState] = useState(readSessionState);
  const [transcript, setTranscript] = useState(savedState.transcript || "");
  const [clientName, setClientName] = useState(savedState.clientName || "");
  const [showType, setShowType] = useState(savedState.showType || "normal");
  const [deadlineText, setDeadlineText] = useState(
    savedState.deadlineText || DEFAULT_DEADLINE,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState(savedState.result || null);
  const [draftText, setDraftText] = useState(savedState.draftText || "");
  const [savedDoc, setSavedDoc] = useState(savedState.savedDoc || null);
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

  useEffect(() => {
    const titleName =
      savedDoc?.guest_name || result?.guest_name || clientName.trim() || "Ready";
    document.title = `V2 Green Light - ${titleName}`;
  }, [clientName, result, savedDoc]);

  useEffect(() => {
    const nextState = {
      transcript,
      clientName,
      showType,
      deadlineText,
      result,
      draftText,
      savedDoc,
    };
    try {
      window.sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(nextState),
      );
    } catch {
      // Session restore is a convenience only; generation must keep working.
    }
  }, [clientName, deadlineText, draftText, result, savedDoc, showType, transcript]);

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

  const handleStartNew = () => {
    setTranscript("");
    setClientName("");
    setShowType("normal");
    setDeadlineText(DEFAULT_DEADLINE);
    setResult(null);
    setDraftText("");
    setSavedDoc(null);
    setError("");
    setSaveError("");
  };

  const warnings = [
    ...(clientValidation.warnings || []),
    ...(variantWarning ? [variantWarning] : []),
    ...((result?.warnings || []).filter(Boolean)),
  ];
  const hasDraft = draftText.trim().length > 0;
  const activeDoc = savedDoc || result;
  const showOutputPanel = hasDraft || Boolean(savedDoc) || Boolean(saveError);

  return (
    <main className="app-shell">
      <section className="top-bar" aria-label="Green Light V2 status">
        <div>
          <p className="eyebrow">Inside Success TV</p>
          <h1>Green Light Letter Generator</h1>
          <p className="subcopy">
            V2 conditional approval letter. Paste, generate, edit, and send to Drive.
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
          <div className="mode-card" aria-label="Selected document type">
            <div className="mode-icon" aria-hidden="true">GL</div>
            <div>
              <h2>Greenlight Letter</h2>
              <p>Creates the editable V2 approval draft from the fixed Rudy template.</p>
            </div>
          </div>

          <div className="section-header">
            <div>
              <h2>Generate Draft</h2>
              <p>Use one browser tab per client. Your tab state is kept if you refresh.</p>
            </div>
          </div>

          <div className="controls-grid">
            <div>
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
            </div>

            <div>
              <label className="field-label" htmlFor="client-name">
                Client name <span className="optional-label">optional</span>
              </label>
              <input
                id="client-name"
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="AI detects it if blank"
              />
            </div>
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

          <div className="action-row">
            <button
              className="primary-action"
              type="submit"
              disabled={isGenerating || !clientValidation.ok}
            >
              {isGenerating ? "Generating V2 Letter..." : "Generate V2 Letter"}
            </button>
            <button className="secondary-action" type="button" onClick={handleStartNew}>
              Start New
            </button>
          </div>

          {(error || warnings.length > 0) && (
            <div className={error ? "notice error" : "notice warning"}>
              {error && <p>{error}</p>}
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}
        </section>

        {showOutputPanel && <section className="panel output-panel">
          <div className="section-header">
            <div>
              <h2>Editable V2 Letter</h2>
              <p>Review the draft, make edits, then send the approved version to Drive.</p>
            </div>
          </div>

          <div className="output-actions">
            <button
              className="primary-action"
              type="button"
              disabled={isGenerating || isSaving || !hasDraft}
              onClick={handleSaveToDrive}
            >
              {isSaving ? "Sending to Google Drive..." : "Send Edited Doc to Google Drive"}
            </button>

            {savedDoc?.document_url && (
              <a className="doc-link" href={savedDoc.document_url} target="_blank" rel="noreferrer">
                Open V2 Google Doc
              </a>
            )}
          </div>

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
        </section>}
      </form>
    </main>
  );
}
