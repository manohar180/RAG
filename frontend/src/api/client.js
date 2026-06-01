const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Wake up Render's free tier server before uploading
async function wakeUpServer() {
  try {
    await fetch(`${BASE}/api/health`, {
      signal: AbortSignal.timeout(60000), // wait up to 60s for cold start
    });
  } catch {
    // ignore — just a best-effort ping
  }
}

export async function uploadDocument(file, onProgress) {
  // Ping health endpoint first so Render wakes up before the real request
  await wakeUpServer();

  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/api/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(JSON.parse(xhr.responseText)?.error || "Upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

/**
 * Send a question and stream the response via SSE.
 * @param {object} params
 * @param {function} onSource - called with source chunks
 * @param {function} onToken  - called with each streamed token
 * @param {function} onDone   - called when stream ends
 * @param {function} onError  - called on error
 */
export function streamChat({ question, collectionName, fileName, history }, { onSource, onToken, onDone, onError }) {
  const controller = new AbortController();

  fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, collectionName, fileName, history }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json();
      onError(err.error || "Chat request failed");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      let currentEvent = null;
      for (const line of lines) {
        if (line.startsWith("event: ")) currentEvent = line.slice(7).trim();
        else if (line.startsWith("data: ")) {
          try {
            const payload = JSON.parse(line.slice(6));
            if (currentEvent === "sources") onSource?.(payload.sources);
            else if (currentEvent === "token") onToken?.(payload.token);
            else if (currentEvent === "done") onDone?.();
            else if (currentEvent === "error") onError?.(payload.error);
          } catch {}
        }
      }
    }
  }).catch((err) => {
    if (err.name !== "AbortError") onError?.(err.message);
  });

  return () => controller.abort();
}