import express from "express";
import { embedText } from "../services/embedder.js";
import { searchChunks } from "../services/vectorStore.js";
import { generateAnswer } from "../services/llm.js";
import { config } from "../config/index.js";

const router = express.Router();

/**
 * POST /api/chat
 * Body: { question, collectionName, fileName, history }
 * Streams the LLM response back as SSE (Server-Sent Events).
 */
router.post("/", async (req, res) => {
  const { question, collectionName, fileName, history = [] } = req.body;

  if (!question?.trim()) return res.status(400).json({ error: "Question is required" });
  if (!collectionName) return res.status(400).json({ error: "collectionName is required" });

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // 1. Embed the query
    const queryEmbedding = await embedText(question);

    // 2. Retrieve relevant chunks
    const chunks = await searchChunks(collectionName, queryEmbedding, config.rag.topK);

    // Send sources to client first
    send("sources", {
      sources: chunks.map((c) => ({
        pageNum: c.metadata.pageNum,
        chunkIndex: c.metadata.chunkIndex,
        score: Math.round(c.score * 100),
        preview: c.text.slice(0, 120) + "…",
      })),
    });

    // 3. Stream LLM response
    for await (const token of generateAnswer(question, chunks, fileName, history)) {
      send("token", { token });
    }

    send("done", { done: true });
  } catch (err) {
    console.error("Chat error:", err);
    send("error", { error: err.message || "Something went wrong" });
  } finally {
    res.end();
  }
});

export default router;