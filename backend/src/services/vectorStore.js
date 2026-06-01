import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "../config/index.js";
import { getVectorDimension } from "./embedder.js";

// Pass host separately — using `url` param causes client to append :6333
const qdrantUrl = new URL(config.qdrant.url);
const isCloud = qdrantUrl.protocol === "https:";

const client = new QdrantClient({
  host: qdrantUrl.hostname,
  port: isCloud ? 443 : 6333,
  https: isCloud,
  apiKey: config.qdrant.apiKey,
  checkCompatibility: false,
});

console.log(`Qdrant connecting to: ${qdrantUrl.hostname}:${isCloud ? 443 : 6333}`);

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
    });
    console.log(`✓ Created collection: ${collectionName}`);
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

  await client.upsert(collectionName, { wait: true, points });
}

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
      pageLabel: r.payload.pageLabel,
      chunkIndex: r.payload.chunkIndex,
    },
  }));
}

export async function deleteCollection(collectionName) {
  await client.deleteCollection(collectionName);
}

export async function listCollections() {
  const res = await client.getCollections();
  return res.collections.map((c) => c.name);
}