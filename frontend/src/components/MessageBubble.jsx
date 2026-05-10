import React from "react";
import ReactMarkdown from "react-markdown";
import SourceChips from "./SourceChips.jsx";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: "20px", gap: "10px", alignItems: "flex-end" }}>
      {!isUser && (
        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0 }}>✦</div>
      )}
      <div style={{ maxWidth: "75%", minWidth: "60px" }}>
        {!isUser && message.sources?.length > 0 && <SourceChips sources={message.sources} />}
        <div style={{ padding: isUser ? "10px 16px" : "14px 18px", background: isUser ? "var(--accent)" : "var(--surface)", border: isUser ? "none" : "1px solid var(--border)", borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px", color: isUser ? "#fff" : "var(--text)", fontSize: "14px", lineHeight: 1.7 }}>
          {isUser ? (
            <span>{message.content}</span>
          ) : message.error ? (
            <span style={{ color: "var(--red)" }}>{message.content}</span>
          ) : (
            <div>
              <ReactMarkdown>{message.content || " "}</ReactMarkdown>
              {message.streaming && <BlinkCursor />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BlinkCursor() {
  return (
    <>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      <span style={{ display: "inline-block", width: "2px", height: "14px", background: "var(--accent)", marginLeft: "2px", verticalAlign: "middle", animation: "blink 1s ease infinite" }} />
    </>
  );
}