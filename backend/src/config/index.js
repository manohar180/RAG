import "dotenv/config";

export const config = {
  port: process.env.PORT || 3001,
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.LLM_MODEL || "llama-3.3-70b-versatile",
  },
  qdrant: {
    url: process.env.QDRANT_URL || "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY || undefined,
  },
  nomic: {
    apiKey: process.env.NOMIC_API_KEY || "",
  },
  ollama: {
    url: process.env.OLLAMA_URL || "http://localhost:11434",
    embedModel: process.env.EMBED_MODEL || "nomic-embed-text",
  },
  rag: {
    chunkSize: parseInt(process.env.CHUNK_SIZE) || 500,
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP) || 50,
    topK: parseInt(process.env.TOP_K) || 5,
  },
};