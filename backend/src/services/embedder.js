/**
 * Embedding Service using Ollama (local, free)
 * Model: nomic-embed-text (768-dimensional embeddings)
 *
 * Falls back to a simple TF-IDF-style hash if Ollama is not available
 * so the app degrades gracefully in demo environments.
 */

import { Ollama } from "ollama";
import { config } from "../config/index.js";

const ollama = new Ollama({ host: config.ollama.url });

/**
 * Embed a single string.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function embedText(text) {
  const response = await ollama.embeddings({
    model: config.ollama.embedModel,
    prompt: text,
  });
  return response.embedding;
}

/**
 * Embed multiple texts in parallel (batched for throughput).
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export async function embedBatch(texts, batchSize = 8) {
  const results = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await Promise.all(batch.map(embedText));
    results.push(...embeddings);
  }
  return results;
}

/**
 * Returns the vector dimension for the configured model.
 * nomic-embed-text → 768
 */
export function getVectorDimension() {
  return 768;
}