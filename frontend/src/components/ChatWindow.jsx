import React, { useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat.js";
import MessageBubble from "./MessageBubble.jsx";

const STARTERS = [
  "Summarize this document",
  "What are the key takeaways?",
  "Explain the main concepts",
  "What problems does this solve?",
];

export default function ChatWindow({ document, onReset }) {
  const { messages, isLoading, sendMessage, clearChat } = useChat(document);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || isLoading) return;
    setInput("");
    sendMessage(q);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", maxWidth: "780px", margin: "0 auto", padding: "0 16px" }}>
      {/* Header */}
      <div style={{ padding: "16px 0", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--accent-dim)", border: "1px solid var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>📄</div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <p style={{ fontWeight: 500, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{document.fileName}</p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{document.chunkCount} chunks · {document.wordCount?.toLocaleString()} words</p>
        </div>
        <button onClick={() => { clearChat(); onReset(); }} style={{ padding: "6px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          New doc
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
        {messages.length === 0 ? (
          <EmptyState onStarter={sendMessage} starters={STARTERS} fileName={document.fileName} />
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "16px 0 24px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "10px", background: "var(--surface)", border: `1px solid ${isLoading ? "var(--accent-glow)" : "var(--border-strong)"}`, borderRadius: "var(--radius)", padding: "10px 12px", transition: "border-color 0.2s" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about your document…"
            rows={1}
            disabled={isLoading}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: "14px", lineHeight: 1.6, minHeight: "24px", maxHeight: "120px", overflowY: "auto" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{ width: "34px", height: "34px", borderRadius: "var(--radius-sm)", background: input.trim() && !isLoading ? "var(--accent)" : "var(--border)", border: "none", cursor: input.trim() && !isLoading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s", alignSelf: "flex-end" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-faint)", marginTop: "10px" }}>
          Answers grounded in your document only · Powered by Groq + Qdrant
        </p>
      </div>
    </div>
  );
}

function EmptyState({ onStarter, starters, fileName }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60%", textAlign: "center", gap: "24px" }}>
      <div>
        <div style={{ fontSize: "42px", marginBottom: "14px" }}>✦</div>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", fontWeight: 400, marginBottom: "8px" }}>Ready to explore</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Ask anything about <strong style={{ color: "var(--text)" }}>{fileName}</strong></p>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", maxWidth: "500px" }}>
        {starters.map((s) => (
          <button key={s} onClick={() => onStarter(s)} style={{ padding: "8px 16px", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "99px", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}