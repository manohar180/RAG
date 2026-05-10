import React, { useState } from "react";
import UploadZone from "./components/UploadZone.jsx";
import ChatWindow from "./components/ChatWindow.jsx";

export default function App() {
  const [document, setDocument] = useState(null);

  return (
    <main style={{ minHeight: "100dvh" }}>
      {document ? (
        <ChatWindow document={document} onReset={() => setDocument(null)} />
      ) : (
        <UploadZone onDocumentReady={setDocument} />
      )}
    </main>
  );
}