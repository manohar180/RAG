/**
 * Embedding Service — Nomic Embed API (free, works on any server)
 * Same model as local Ollama: nomic-embed-text
 * Swap EMBED_PROVIDER=ollama in .env to use local Ollama during dev
 */

import { config } from "../config/index.js";

const NOMIC_API_URL = "https://api-atlas.nomic.ai/v1/embedding/text";

async function embedWithNomic(texts) {
  const response = await fetch(NOMIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.nomic.apiKey}`,
    },
    body: JSON.stringify({
      model: "nomic-embed-text-v1.5",
      texts,
      task_type: "search_document",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Nomic API error: ${err}`);
  }

  const data = await response.json();
  return data.embeddings;
}

async function embedWithOllama(texts) {
  const { Ollama } = await import("ollama");
  const ollama = new Ollama({ host: config.ollama.url });

  const results = [];
  for (const text of texts) {
    const res = await ollama.embeddings({
      model: config.ollama.embedModel,
      prompt: text,
    });
    results.push(res.embedding);
  }
  return results;
}

export async function embedText(text) {
  const embeddings = await embedBatch([text]);
  return embeddings[0];
}

export async function embedBatch(texts, batchSize = 32) {
  // Use Nomic API in production, Ollama locally
  if (config.nomic.apiKey) {
    const results = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const embeddings = await embedWithNomic(batch);
      results.push(...embeddings);
    }
    return results;
  }
  return embedWithOllama(texts);
}

export function getVectorDimension() {
  return 768;
}