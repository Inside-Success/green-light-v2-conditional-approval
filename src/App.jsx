import { useMemo, useState } from "react";
import { validateClientPayload } from "./validation.js";

const V2_WEBHOOK_URL =
  import.meta.env.VITE_V2_N8N_WEBHOOK_URL ||
  "https://insidesuccess.app.n8n.cloud/webhook/green-light-v2-conditional-approval";

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
        : status === "loading"
          ? "Generating"
          : "Ready";

  return <span className={`status-pill ${status || "idle"}`}>{label}</span>;
}

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [showType, setShowType] = useState("normal");
  const [deadlineText, setDeadlineText] = useState(DEFAULT_DEADLINE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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
    setError("");

    if (!clientValidation.ok) {
      setError(clientValidation.errors[0]);
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(V2_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: transcript,
          transcript,
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

      setResult(payload);
    } catch (caughtError) {
      setError(caughtError.message || "V2 generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const preview = result?.preview || result?.letter_text || "";
  const warnings = [
    ...(clientValidation.warnings || []),
    ...(variantWarning ? [variantWarning] : []),
    ...((result?.warnings || []).filter(Boolean)),
  ];

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
          status={isGenerating ? "loading" : error ? "error" : result ? "success" : "idle"}
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
              <p>Review content and open the generated Google Doc from the V2 workflow.</p>
            </div>
          </div>

          {result?.document_url && (
            <a className="doc-link" href={result.document_url} target="_blank" rel="noreferrer">
              Open V2 Google Doc
            </a>
          )}

          {result?.doc_title && (
            <div className="metadata-row">
              <span>Document</span>
              <strong>{result.doc_title}</strong>
            </div>
          )}

          {result?.validation_status && (
            <div className="metadata-row">
              <span>Validation</span>
              <strong>{result.validation_status}</strong>
            </div>
          )}

          <pre className="preview-pane">
            {preview || "Generated V2 letter preview will appear here."}
          </pre>
        </section>
      </form>
    </main>
  );
}
