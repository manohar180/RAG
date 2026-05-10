import React, { useState, useRef, useCallback } from "react";
import { uploadDocument } from "../api/client.js";

export default function UploadZone({ onDocumentReady }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "txt"].includes(ext)) {
      setError("Only PDF and TXT files are supported.");
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const doc = await uploadDocument(file, setProgress);
      onDocumentReady(doc);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }, [onDocumentReady]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: "24px", gap: "32px" }}>
      <div style={{ textAlign: "center", maxWidth: "520px" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 400, lineHeight: 1.15, marginBottom: "12px" }}>
          Chat with any <em style={{ fontStyle: "italic", color: "var(--accent)" }}>document</em>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.7 }}>
          Upload a PDF or text file. Ask questions. Get answers grounded in your document — not hallucinated from memory.
        </p>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          width: "100%", maxWidth: "480px",
          border: `1.5px dashed ${dragOver ? "var(--accent)" : "var(--border-strong)"}`,
          borderRadius: "var(--radius)", padding: "48px 32px", textAlign: "center",
          cursor: uploading ? "default" : "pointer",
          background: dragOver ? "var(--accent-dim)" : "var(--surface)",
          transition: "all 0.2s ease",
        }}
      >
        <input ref={inputRef} type="file" accept=".pdf,.txt" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />

        {uploading ? (
          <div>
            <ProcessingSpinner />
            <p style={{ color: "var(--text-muted)", marginTop: "16px", fontSize: "14px" }}>
              {progress < 100 ? `Uploading… ${progress}%` : "Chunking & embedding…"}
            </p>
            <div style={{ marginTop: "12px", height: "3px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent)", borderRadius: "99px", transition: "width 0.3s ease" }} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.5 }}>📄</div>
            <p style={{ fontWeight: 500, marginBottom: "6px" }}>Drop your file here</p>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>or click to browse · PDF & TXT up to 20MB</p>
          </>
        )}
      </div>

      {error && <p style={{ color: "var(--red)", fontSize: "13px", textAlign: "center" }}>{error}</p>}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        {["Sliding-window chunking", "nomic-embed-text", "Qdrant vector store", "Groq LLM streaming"].map((f) => (
          <span key={f} style={{ padding: "5px 13px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "99px", fontSize: "12px", color: "var(--text-muted)" }}>{f}</span>
        ))}
      </div>
    </div>
  );
}

function ProcessingSpinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "inline-block", width: "36px", height: "36px", borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
    </>
  );
}