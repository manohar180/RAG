import React, { useState } from "react";

export default function SourceChips({ sources }) {
  const [expanded, setExpanded] = useState(null);
  if (!sources?.length) return null;

  return (
    <div style={{ marginBottom: "10px" }}>
      <p style={{ fontSize: "11px", color: "var(--text-faint)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Sources from document</p>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {sources.map((s, i) => (
          <div key={i} style={{ position: "relative" }}>
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              style={{ padding: "3px 10px", background: "var(--accent-dim)", border: "1px solid var(--accent-glow)", borderRadius: "99px", fontSize: "12px", color: "var(--accent)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              {s.pageLabel || (s.pageNum ? `p.${s.pageNum}` : `chunk ${s.chunkIndex + 1}`)} · {s.score}%
            </button>
            {expanded === i && (
              <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 10, width: "280px", background: "var(--surface2)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                {s.preview}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}