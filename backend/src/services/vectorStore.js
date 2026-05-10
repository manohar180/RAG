/**
 * Vector Store Service — Qdrant
 *
 * Manages:
 * - Collection creation per document (isolated namespace)
 * - Upserting embedded chunks
 * - Similarity search for retrieval
 */

import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "../config/index.js";
import { getVectorDimension } from "./embedder.js";

const client = new QdrantClient({
  url: config.qdrant.url,
  ...(config.qdrant.apiKey ? { apiKey: config.qdrant.apiKey } : {}),
});

/**
 * Create a Qdrant collection for a document (idempotent).
 * @param {string} collectionName
 */
export async function ensureCollection(collectionName) {
  const exists = await client
    .getCollection(collectionName)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    await client.createCollection(collectionName, {
      vectors: {
        size: getVectorDimension(),
        distance: "Cosine",
      },
      optimizers_config: {
        default_segment_number: 2,
      },
    });
  }
}

/**
 * Upsert chunks with their embeddings into Qdrant.
 * @param {string} collectionName
 * @param {Array<{id, text, metadata}>} chunks
 * @param {number[][]} embeddings
 */
export async function upsertChunks(collectionName, chunks, embeddings) {
  const points = chunks.map((chunk, idx) => ({
    id: idx, // Qdrant requires numeric or UUID ids
    vector: embeddings[idx],
    payload: {
      text: chunk.text,
      ...chunk.metadata,
    },
  }));

  await client.upsert(collectionName, {
    wait: true,
    points,
  });
}

/**
 * Retrieve top-k most relevant chunks for a query embedding.
 * @param {string} collectionName
 * @param {number[]} queryEmbedding
 * @param {number} topK
 * @returns {Promise<Array<{text, score, metadata}>>}
 */
export async function searchChunks(collectionName, queryEmbedding, topK) {
  const results = await client.search(collectionName, {
    vector: queryEmbedding,
    limit: topK,
    with_payload: true,
  });

  return results.map((r) => ({
    text: r.payload.text,
    score: r.score,
    metadata: {
      pageNum: r.payload.pageNum,
      chunkIndex: r.payload.chunkIndex,
    },
  }));
}

/**
 * Delete a collection (used when a document is removed).
 * @param {string} collectionName
 */
export async function deleteCollection(collectionName) {
  await client.deleteCollection(collectionName);
}

/**
 * List all existing collections.
 */
export async function listCollections() {
  const res = await client.getCollections();
  return res.collections.map((c) => c.name);
}