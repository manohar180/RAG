import { config } from "../config/index.js";
import { getVectorDimension } from "./embedder.js";

const BASE = config.qdrant.url.replace(/\/$/, ""); // remove trailing slash
const HEADERS = {
  "Content-Type": "application/json",
  ...(config.qdrant.apiKey ? { "api-key": config.qdrant.apiKey } : {}),
};

async function qdrantFetch(path, method = "GET", body = null) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Qdrant ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.json();
}

export async function ensureCollection(collectionName) {
  // Check if exists
  const exists = await fetch(`${BASE}/collections/${collectionName}`, {
    headers: HEADERS,
  }).then((r) => r.ok).catch(() => false);

  if (!exists) {
    await qdrantFetch(`/collections/${collectionName}`, "PUT", {
      vectors: {
        size: getVectorDimension(),
        distance: "Cosine",
      },
    });
    console.log(`✓ Created Qdrant collection: ${collectionName}`);
  }
}

export async function upsertChunks(collectionName, chunks, embeddings) {
  const points = chunks.map((chunk, idx) => ({
    id: idx,
    vector: embeddings[idx],
    payload: {
      text: chunk.text,
      ...chunk.metadata,
    },
  }));

  await qdrantFetch(`/collections/${collectionName}/points?wait=true`, "PUT", {
    points,
  });
}

export async function searchChunks(collectionName, queryEmbedding, topK) {
  const data = await qdrantFetch(
    `/collections/${collectionName}/points/search`,
    "POST",
    {
      vector: queryEmbedding,
      limit: topK,
      with_payload: true,
    }
  );

  return data.result.map((r) => ({
    text: r.payload.text,
    score: r.score,
    metadata: {
      pageNum: r.payload.pageNum,
      pageLabel: r.payload.pageLabel,
      chunkIndex: r.payload.chunkIndex,
    },
  }));
}

export async function deleteCollection(collectionName) {
  await qdrantFetch(`/collections/${collectionName}`, "DELETE");
}

export async function listCollections() {
  const data = await qdrantFetch("/collections");
  return data.result.collections.map((c) => c.name);
}