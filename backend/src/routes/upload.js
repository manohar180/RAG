import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { createRequire } from "module";
import { v4 as uuidv4 } from "uuid";
import { chunkDocument } from "../services/chunker.js";
import { embedBatch } from "../services/embedder.js";
import { ensureCollection, upsertChunks } from "../services/vectorStore.js";

// pdf-parse 1.1.1 is CJS — must use createRequire in ESM project
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only PDF and TXT files are supported"));
  },
});

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const docId = uuidv4();
  const filePath = req.file.path;
  const fileName = req.file.originalname;
  const ext = path.extname(fileName).toLowerCase();

  try {
    // 1. Extract text
    let text = "";
    let pageMap = [];

    if (ext === ".pdf") {
      const buffer = await fs.readFile(filePath);
      const parsed = await pdfParse(buffer);
      text = parsed.text;

      // Build page map
      let charOffset = 0;
      const pages = parsed.text.split("\f");
      pages.forEach((pageText, idx) => {
        pageMap.push({
          pageNum: idx + 1,
          startChar: charOffset,
          endChar: charOffset + pageText.length,
        });
        charOffset += pageText.length + 1;
      });
    } else {
      text = await fs.readFile(filePath, "utf-8");
    }

    if (!text.trim()) {
      return res.status(422).json({ error: "Could not extract text from file. Is the PDF scanned/image-based?" });
    }

    // 2. Chunk
    const chunks = chunkDocument(text, docId, pageMap);
    console.log(`✓ Chunked into ${chunks.length} pieces`);

    // 3. Embed
    console.log("Embedding chunks (this may take a moment)...");
    const texts = chunks.map((c) => c.text);
    const embeddings = await embedBatch(texts);
    console.log(`✓ Embedded ${embeddings.length} chunks`);

    // 4. Store
    const collectionName = `doc_${docId.replace(/-/g, "_")}`;
    await ensureCollection(collectionName);
    await upsertChunks(collectionName, chunks, embeddings);
    console.log(`✓ Stored in Qdrant collection: ${collectionName}`);

    res.json({
      docId,
      collectionName,
      fileName,
      chunkCount: chunks.length,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    });
  } catch (err) {
    // Log the FULL error so you can see exactly what failed
    console.error("Upload pipeline error:", err);
    res.status(500).json({
      error: err.message || "Ingestion failed",
      hint: getHint(err.message),
    });
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
});

// Give helpful hints based on common errors
function getHint(msg = "") {
  if (msg.includes("ECONNREFUSED") && msg.includes("11434"))
    return "Ollama is not running. Start it with: ollama serve";
  if (msg.includes("ECONNREFUSED") && msg.includes("6333"))
    return "Qdrant is not running. Start it with: docker run -p 6333:6333 qdrant/qdrant";
  if (msg.includes("model") && msg.includes("not found"))
    return "Run: ollama pull nomic-embed-text";
  return null;
}

export default router;