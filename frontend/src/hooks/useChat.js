import { useState, useCallback, useRef } from "react";
import { streamChat } from "../api/client.js";

export function useChat(document) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef(null);

  const sendMessage = useCallback(async (question) => {
    if (!document || isLoading) return;

    const userMsg = { role: "user", content: question, id: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const assistantId = Date.now() + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "", sources: [], id: assistantId, streaming: true }]);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    abortRef.current = streamChat(
      { question, collectionName: document.collectionName, fileName: document.fileName, history },
      {
        onSource: (sources) => setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, sources } : m)),
        onToken: (token) => setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + token } : m)),
        onDone: () => { setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m)); setIsLoading(false); },
        onError: (err) => { setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${err}`, streaming: false, error: true } : m)); setIsLoading(false); },
      }
    );
  }, [document, messages, isLoading]);

  const clearChat = useCallback(() => {
    abortRef.current?.();
    setMessages([]);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, sendMessage, clearChat };
}