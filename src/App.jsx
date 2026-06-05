import { useEffect, useMemo, useState } from "react";
import { validateClientPayload } from "./validation.js";

const V2_WEBHOOK_URL =
  import.meta.env.VITE_V2_N8N_WEBHOOK_URL ||
  "https://insidesuccess.app.n8n.cloud/webhook/green-light-v2-conditional-approval";

const V2_ASYNC_WEBHOOK_URL =
  import.meta.env.VITE_V2_N8N_ASYNC_WEBHOOK_URL ||
  "https://insidesuccess.app.n8n.cloud/webhook/green-light-v2-conditional-approval-start";

const V2_STATUS_WEBHOOK_URL =
  import.meta.env.VITE_V2_N8N_STATUS_WEBHOOK_URL ||
  "https://insidesuccess.app.n8n.cloud/webhook/green-light-v2-conditional-approval-status";

const V2_SAVE_WEBHOOK_URL =
  import.meta.env.VITE_V2_N8N_SAVE_WEBHOOK_URL ||
  "https://insidesuccess.app.n8n.cloud/webhook/green-light-v2-conditional-approval-save";

const DEFAULT_DEADLINE = "Sunday 11.59pm EST";
const SESSION_STORAGE_KEY = "green-light-v2-dashboard-session-v1";
const EDITOR_STORAGE_KEY = "green-light-v2-editor-settings-v1";
const DEFAULT_EDITOR_NAME = "Adedokun Adedoyin";
const EDITOR_OPTIONS = [DEFAULT_EDITOR_NAME, "Syed", "Daniel"];
const POLL_INTERVAL_MS = 2500;
const MAX_GENERATION_WAIT_MS = 10 * 60 * 1000;

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function readSessionState() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function normalizeEditorName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function readEditorSettings() {
  if (typeof window === "undefined") {
    return { selectedEditorName: DEFAULT_EDITOR_NAME };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(EDITOR_STORAGE_KEY) || "{}");
    const selectedEditorName = normalizeEditorName(parsed.selectedEditorName);
    const allowedName = EDITOR_OPTIONS.find(
      (name) => name.toLowerCase() === selectedEditorName.toLowerCase(),
    );

    return {
      selectedEditorName: allowedName || DEFAULT_EDITOR_NAME,
    };
  } catch {
    return { selectedEditorName: DEFAULT_EDITOR_NAME };
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

function createRestoredDraft(savedState) {
  if (!savedState?.draftText) return [];
  return [
    {
      id: "restored-draft",
      label: savedState.result?.guest_name || savedState.clientName || "Draft",
      payload: savedState.result || null,
      draftText: savedState.draftText || "",
      savedDoc: savedState.savedDoc || null,
      saveError: "",
      multiClient: false,
      targetClientName: savedState.clientName || "",
      targetClientPosition: 1,
      letterCount: 1,
      clientNames: savedState.clientName ? [savedState.clientName] : [],
    },
  ];
}

export default function App() {
  const [savedState] = useState(readSessionState);
  const [savedEditorSettings] = useState(readEditorSettings);
  const [selectedEditorName, setSelectedEditorName] = useState(
    savedEditorSettings.selectedEditorName,
  );
  const [transcript, setTranscript] = useState(savedState.transcript || "");
  const [clientName, setClientName] = useState(savedState.clientName || "");
  const [showType, setShowType] = useState(savedState.showType || "normal");
  const [multiClientEnabled, setMultiClientEnabled] = useState(
    Boolean(savedState.multiClientEnabled),
  );
  const [multiClientLetterCount, setMultiClientLetterCount] = useState(
    savedState.multiClientLetterCount || 2,
  );
  const [targetClientName, setTargetClientName] = useState(savedState.targetClientName || "");
  const [clientOneName, setClientOneName] = useState(savedState.clientOneName || "");
  const [clientTwoName, setClientTwoName] = useState(savedState.clientTwoName || "");
  const deadlineText = DEFAULT_DEADLINE;
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [drafts, setDrafts] = useState(
    Array.isArray(savedState.drafts) && savedState.drafts.length
      ? savedState.drafts
      : createRestoredDraft(savedState),
  );
  const [activeDraftIndex, setActiveDraftIndex] = useState(savedState.activeDraftIndex || 0);
  const [error, setError] = useState("");
  const [generationStatus, setGenerationStatus] = useState("");
  const [saveNotice, setSaveNotice] = useState(null);

  const clientValidation = useMemo(
    () =>
      validateClientPayload({
        transcript,
        showType,
        deadlineText,
        multiClientEnabled,
        multiClientLetterCount,
        targetClientName,
      }),
    [deadlineText, multiClientEnabled, multiClientLetterCount, showType, targetClientName, transcript],
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
    const activeDraft = drafts[activeDraftIndex] || null;
    const titleName =
      activeDraft?.savedDoc?.guest_name ||
      activeDraft?.payload?.guest_name ||
      activeDraft?.targetClientName ||
      clientName.trim() ||
      "Ready";
    document.title = `V2 Green Light - ${titleName}`;
  }, [activeDraftIndex, clientName, drafts]);

  useEffect(() => {
    const nextState = {
      transcript,
      clientName,
      showType,
      multiClientEnabled,
      multiClientLetterCount,
      targetClientName,
      clientOneName,
      clientTwoName,
      drafts,
      activeDraftIndex,
    };
    try {
      window.sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(nextState),
      );
    } catch {
      // Session restore is a convenience only; generation must keep working.
    }
  }, [
    activeDraftIndex,
    clientName,
    clientOneName,
    clientTwoName,
    drafts,
    multiClientEnabled,
    multiClientLetterCount,
    showType,
    targetClientName,
    transcript,
  ]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        EDITOR_STORAGE_KEY,
        JSON.stringify({ selectedEditorName }),
      );
    } catch {
      // Editor persistence is a convenience only; saving still defaults safely.
    }
  }, [selectedEditorName]);

  const activeDraft = drafts[activeDraftIndex] || null;
  const draftText = activeDraft?.draftText || "";
  const savedDoc = activeDraft?.savedDoc || null;
  const saveError = activeDraft?.saveError || "";

  const updateActiveDraft = (patch) => {
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) =>
        index === activeDraftIndex ? { ...draft, ...patch } : draft,
      ),
    );
  };

  const handleEditorChange = (event) => {
    const nextValue = normalizeEditorName(event.target.value);
    const allowedName = EDITOR_OPTIONS.find(
      (name) => name.toLowerCase() === nextValue.toLowerCase(),
    );
    setSelectedEditorName(allowedName || DEFAULT_EDITOR_NAME);
  };

  const buildGenerationRequests = () => {
    if (!multiClientEnabled) {
      const cleanClientName = clientName.trim();
      return [
        {
          label: cleanClientName || "Draft",
          clientName: cleanClientName,
          targetClientName: cleanClientName,
          targetClientPosition: 1,
          multiClient: false,
          letterCount: 1,
          clientNames: cleanClientName ? [cleanClientName] : [],
        },
      ];
    }

    if (Number(multiClientLetterCount) === 1) {
      const targetName = targetClientName.trim();
      return [
        {
          label: targetName,
          clientName: targetName,
          targetClientName: targetName,
          targetClientPosition: 1,
          multiClient: true,
          letterCount: 1,
          clientNames: [targetName],
        },
      ];
    }

    const clientNames = [clientOneName.trim(), clientTwoName.trim()];
    return [0, 1].map((index) => ({
      label: clientNames[index] || `Client ${index + 1}`,
      clientName: clientNames[index],
      targetClientName: clientNames[index],
      targetClientPosition: index + 1,
      multiClient: true,
      letterCount: 2,
      clientNames: clientNames.filter(Boolean),
    }));
  };

  const pollGenerationJob = async (jobId, label) => {
    const startedAt = Date.now();
    let transientFailures = 0;

    while (Date.now() - startedAt < MAX_GENERATION_WAIT_MS) {
      await wait(POLL_INTERVAL_MS);

      let response;
      let payload;
      try {
        const statusUrl = new URL(V2_STATUS_WEBHOOK_URL);
        statusUrl.searchParams.set("job_id", jobId);
        statusUrl.searchParams.set("_", String(Date.now()));

        response = await fetch(statusUrl.toString(), {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        payload = await readJsonResponse(response);
      } catch (caughtError) {
        transientFailures += 1;
        if (transientFailures >= 8) {
          throw new Error(
            caughtError.message ||
              "V2 generation is still running, but the dashboard could not reconnect to the status endpoint.",
          );
        }
        setGenerationStatus(`${label}: still generating, reconnecting to status...`);
        continue;
      }

      transientFailures = 0;

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            payload?.message ||
            `V2 status check failed with status ${response.status}`,
        );
      }

      if (payload?.status === "complete" || payload?.mode === "draft") {
        return payload;
      }

      if (payload?.status === "failed" || payload?.ok === false) {
        throw new Error(
          payload?.error ||
            payload?.message ||
            "V2 generation failed before a draft was ready.",
        );
      }

      setGenerationStatus(
        `${label}: ${payload?.progress || "Still generating with Sonnet 4.6..."}`,
      );
    }

    throw new Error("V2 generation timed out before the draft was ready.");
  };

  const requestDraftPayload = async (requestBody, label) => {
    if (V2_ASYNC_WEBHOOK_URL && V2_STATUS_WEBHOOK_URL) {
      let startResponse;
      let startPayload;
      try {
        setGenerationStatus(`${label}: starting background generation...`);
        startResponse = await fetch(V2_ASYNC_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        startPayload = await readJsonResponse(startResponse);
      } catch (caughtError) {
        throw new Error(
          caughtError.message ||
            "The dashboard could not start V2 generation. Please try again.",
        );
      }

      if (!startResponse.ok || !startPayload?.job_id) {
        throw new Error(
          startPayload?.error ||
            startPayload?.message ||
            `V2 async start failed with status ${startResponse.status}`,
        );
      }

      setGenerationStatus(`${label}: generating with Sonnet 4.6...`);
      return await pollGenerationJob(startPayload.job_id, label);
    }

    const response = await fetch(V2_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const payload = await readJsonResponse(response);

    if (!response.ok || payload?.ok === false) {
      const message =
        payload?.error ||
        payload?.message ||
        `V2 workflow failed with status ${response.status}`;
      throw new Error(message);
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setDrafts([]);
    setActiveDraftIndex(0);
    setError("");
    setGenerationStatus("");
    setSaveNotice(null);

    if (!clientValidation.ok) {
      setError(clientValidation.errors[0]);
      return;
    }

    setIsGenerating(true);
    try {
      const generationRequests = buildGenerationRequests();
      const generatedDrafts = [];

      for (const [index, generationRequest] of generationRequests.entries()) {
        const label =
          generationRequests.length > 1
            ? `Draft ${index + 1} of ${generationRequests.length}`
            : "Draft";
        const payload = await requestDraftPayload(
          {
            content: transcript,
            transcript,
            client_name: generationRequest.clientName,
            show_type: showType,
            deadline_text: showType === "normal" ? deadlineText.trim() : "",
            requested_output: "v2_conditional_casting_approval",
            multi_client: generationRequest.multiClient,
            multi_client_letter_count: generationRequest.letterCount,
            target_client_name: generationRequest.targetClientName,
            target_client_position: generationRequest.targetClientPosition,
            client_names: generationRequest.clientNames,
            timestamp: new Date().toISOString(),
          },
          label,
        );

        const generatedDraft =
          payload?.draft_text || payload?.preview || payload?.letter_text || "";

        generatedDrafts.push({
          id: `${Date.now()}-${index}`,
          label: payload?.guest_name || generationRequest.label,
          payload,
          draftText: generatedDraft,
          savedDoc: null,
          saveError: "",
          multiClient: generationRequest.multiClient,
          targetClientName: generationRequest.targetClientName,
          targetClientPosition: generationRequest.targetClientPosition,
          letterCount: generationRequest.letterCount,
          clientNames: generationRequest.clientNames,
        });
      }

      setGenerationStatus("Draft ready.");
      setDrafts(generatedDrafts);
      setActiveDraftIndex(0);
    } catch (caughtError) {
      const message = caughtError.message || "V2 generation failed.";
      setError(
        message === "Failed to fetch"
          ? "The dashboard could not reach n8n. Please check the connection and try again."
          : message,
      );
    } finally {
      setIsGenerating(false);
      window.setTimeout(() => setGenerationStatus(""), 1200);
    }
  };

  const handleSaveToDrive = async () => {
    if (!activeDraft) {
      setError("Generate a V2 letter before sending to Google Drive.");
      return;
    }

    updateActiveDraft({ saveError: "", savedDoc: null });

    const cleanDraft = draftText.trim();
    if (!cleanDraft) {
      updateActiveDraft({
        saveError: "Generate or paste an edited V2 letter before sending to Google Drive.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const cleanEditorName = normalizeEditorName(selectedEditorName) || DEFAULT_EDITOR_NAME;
      const response = await fetch(V2_SAVE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letter_text: cleanDraft,
          draft_text: cleanDraft,
          show_type: activeDraft.payload?.show_type || showType,
          guest_name: activeDraft.payload?.guest_name || "",
          client_name: activeDraft.targetClientName || clientName.trim(),
          doc_title: activeDraft.payload?.doc_title || "",
          warnings: activeDraft.payload?.warnings || [],
          multi_client: Boolean(activeDraft.multiClient),
          multi_client_letter_count: activeDraft.letterCount || 1,
          target_client_name: activeDraft.targetClientName || "",
          target_client_position: activeDraft.targetClientPosition || 1,
          editor_name: cleanEditorName,
          editorName: cleanEditorName,
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

      updateActiveDraft({ savedDoc: payload, saveError: "" });
      setSaveNotice({
        docTitle: payload?.doc_title || "Google Doc",
        documentUrl: payload?.document_url || "",
        editorName: payload?.editor_name || cleanEditorName,
      });
    } catch (caughtError) {
      setSaveNotice(null);
      updateActiveDraft({ saveError: caughtError.message || "V2 Google Drive save failed." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartNew = () => {
    setTranscript("");
    setClientName("");
    setShowType("normal");
    setMultiClientEnabled(false);
    setMultiClientLetterCount(2);
    setTargetClientName("");
    setClientOneName("");
    setClientTwoName("");
    setDrafts([]);
    setActiveDraftIndex(0);
    setError("");
    setGenerationStatus("");
    setSaveNotice(null);
  };

  const draftWarnings = (activeDraft?.payload?.warnings || []).filter(Boolean);
  const hasDraft = draftText.trim().length > 0;
  const activeDoc = savedDoc || activeDraft?.payload;
  const showOutputPanel = drafts.length > 0 || Boolean(saveError);
  const warnings = [
    ...(clientValidation.warnings || []),
    ...(variantWarning ? [variantWarning] : []),
    ...(showOutputPanel ? [] : draftWarnings),
  ];

  return (
    <main className="app-shell">
      <section className="top-bar" aria-label="Green Light V2 status">
        <div>
          <p className="eyebrow">Inside Success TV</p>
          <h1>Green Light V2</h1>
        </div>
        <div className="top-actions">
          <label className="editor-select-wrap" htmlFor="editor-select">
            <span>Editor</span>
            <select
              id="editor-select"
              value={selectedEditorName}
              onChange={handleEditorChange}
              disabled={isGenerating || isSaving}
            >
              {EDITOR_OPTIONS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-action top-start-button" type="button" onClick={handleStartNew}>
            Start New
          </button>
          <StatusPill
            status={
              isGenerating
                ? "loading"
                : isSaving
                  ? "saving"
                : error || saveError
                  ? "error"
                  : savedDoc || activeDraft?.payload
                    ? "success"
                    : "idle"
            }
          />
        </div>
      </section>

      {saveNotice && (
        <div className="top-notice success" role="status" aria-live="polite">
          <div>
            <strong>Google Doc sent successfully.</strong>
            <span>{saveNotice.docTitle}</span>
            {saveNotice.editorName && <span>Folder: {saveNotice.editorName}</span>}
          </div>
          <div className="top-notice-actions">
            {saveNotice.documentUrl && (
              <a href={saveNotice.documentUrl} target="_blank" rel="noreferrer">
                Open Doc
              </a>
            )}
            <button type="button" onClick={() => setSaveNotice(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="loading-overlay" role="status" aria-live="assertive">
          <div className="loading-dialog">
            <div className="loading-spinner" aria-hidden="true" />
            <p>Generating V2 Letter</p>
            <span>{generationStatus || "Preparing your draft..."}</span>
          </div>
        </div>
      )}

      <form className="generator-grid" onSubmit={handleSubmit}>
        {showOutputPanel && <section className="panel output-panel">
          <div className="output-header">
            <div>
              <h2>Review Letter</h2>
            </div>

            <div className="output-actions">
              <button
                className="primary-action"
                type="button"
                disabled={isGenerating || isSaving || !hasDraft}
                onClick={handleSaveToDrive}
              >
                {isSaving ? "Sending..." : "Send to Google Drive"}
              </button>

              {savedDoc?.document_url && (
                <a className="doc-link" href={savedDoc.document_url} target="_blank" rel="noreferrer">
                  Open Doc
                </a>
              )}
            </div>
          </div>

          {(activeDoc?.doc_title || activeDoc?.validation_status) && (
            <div className="metadata-strip">
              {activeDoc?.doc_title && <span>{activeDoc.doc_title}</span>}
              {activeDoc?.validation_status && <strong>{activeDoc.validation_status}</strong>}
            </div>
          )}

          {drafts.length > 1 && (
            <div className="draft-tabs" aria-label="Generated drafts">
              {drafts.map((draft, index) => (
                <button
                  key={draft.id}
                  type="button"
                  className={activeDraftIndex === index ? "selected" : ""}
                  onClick={() => setActiveDraftIndex(index)}
                >
                  {draft.label || `Client ${index + 1}`}
                </button>
              ))}
            </div>
          )}

          {draftWarnings.length > 0 && (
            <div className="notice warning output-warning" role="alert">
              {draftWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}

          <label className="field-label" htmlFor="draft-editor">
            Draft
          </label>
          <textarea
            id="draft-editor"
            className="draft-editor"
            value={draftText}
            onChange={(event) => {
              setSaveNotice(null);
              updateActiveDraft({
                draftText: event.target.value,
                savedDoc: null,
                saveError: "",
              });
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

        <section className={`panel input-panel ${showOutputPanel ? "input-panel-compact" : ""}`}>
          <div className="section-header">
            <div>
              <h2>{showOutputPanel ? "Regenerate" : "Generate Letter"}</h2>
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
                disabled={multiClientEnabled}
              />
            </div>

          </div>

          <div className="multi-client-box">
            <div className="toggle-row">
              <div>
                <p className="toggle-title">Multi-client transcript</p>
                <p className="toggle-copy">Use only when one transcript contains more than one client.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={multiClientEnabled}
                className={`switch-button ${multiClientEnabled ? "on" : ""}`}
                onClick={() => {
                  setMultiClientEnabled((enabled) => !enabled);
                  setDrafts([]);
                  setActiveDraftIndex(0);
                  setError("");
                }}
              >
                <span />
              </button>
            </div>

            {multiClientEnabled && (
              <div className="multi-client-fields">
                <label className="field-label" htmlFor="letter-count">
                  How many letters?
                </label>
                <div className="segmented-control compact" id="letter-count">
                  <button
                    type="button"
                    className={Number(multiClientLetterCount) === 1 ? "selected" : ""}
                    onClick={() => setMultiClientLetterCount(1)}
                  >
                    1 Letter
                  </button>
                  <button
                    type="button"
                    className={Number(multiClientLetterCount) === 2 ? "selected" : ""}
                    onClick={() => setMultiClientLetterCount(2)}
                  >
                    2 Letters
                  </button>
                </div>

                {Number(multiClientLetterCount) === 1 ? (
                  <div>
                    <label className="field-label" htmlFor="target-client-name">
                      Target client name
                    </label>
                    <input
                      id="target-client-name"
                      value={targetClientName}
                      onChange={(event) => setTargetClientName(event.target.value)}
                      placeholder="Required when generating one letter"
                    />
                  </div>
                ) : (
                  <div className="client-name-grid">
                    <div>
                      <label className="field-label" htmlFor="client-one-name">
                        Client 1 name <span className="optional-label">optional</span>
                      </label>
                      <input
                        id="client-one-name"
                        value={clientOneName}
                        onChange={(event) => setClientOneName(event.target.value)}
                        placeholder="Optional but recommended"
                      />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="client-two-name">
                        Client 2 name <span className="optional-label">optional</span>
                      </label>
                      <input
                        id="client-two-name"
                        value={clientTwoName}
                        onChange={(event) => setClientTwoName(event.target.value)}
                        placeholder="Optional but recommended"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <label className="field-label" htmlFor="transcript">
            Transcript
          </label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="Paste the full casting call transcript here..."
            spellCheck="false"
          />

          <div className="action-row single-action">
            <button
              className="primary-action"
              type="submit"
              disabled={isGenerating || !clientValidation.ok}
            >
              {isGenerating ? "Generating V2 Letter..." : "Generate V2 Letter"}
            </button>
          </div>

          {isGenerating && generationStatus && (
            <div className="generation-status" role="status" aria-live="polite">
              {generationStatus}
            </div>
          )}

          {(error || warnings.length > 0) && (
            <div className={error ? "notice error" : "notice warning"}>
              {error && <p>{error}</p>}
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}
        </section>
      </form>
    </main>
  );
}
