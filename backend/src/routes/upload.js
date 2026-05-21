import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { createRequire } from "module";
import { v4 as uuidv4 } from "uuid";
import { chunkDocument } from "../services/chunker.js";
import { embedBatch } from "../services/embedder.js";
import { ensureCollection, upsertChunks } from "../services/vectorStore.js";

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
    let text = "";
    let pageMap = [];

    if (ext === ".pdf") {
      const buffer = await fs.readFile(filePath);

      // Step 1: capture per-page text using pagerender callback
      const pageTexts = [];
      await pdfParse(buffer, {
        pagerender: function (pageData) {
          return pageData.getTextContent().then(function (textContent) {
            const pageText = textContent.items.map((i) => i.str).join(" ");
            pageTexts.push(pageText.trim());
          });
        },
      });

      // Step 2: parse again normally to get the full combined text
      const parsed = await pdfParse(buffer);
      text = parsed.text;

      // Step 3: build accurate pageMap from per-page texts
      if (pageTexts.length > 0) {
        let charOffset = 0;
        pageTexts.forEach((pageText, idx) => {
          pageMap.push({
            pageNum: idx + 1,
            startChar: charOffset,
            endChar: charOffset + pageText.length,
          });
          charOffset += pageText.length + 1;
        });
        console.log(`✓ Page map built: ${pageTexts.length} pages detected`);
      } else {
        console.warn("⚠ Could not detect pages, chunk numbers will be used instead");
      }

    } else {
      text = await fs.readFile(filePath, "utf-8");
    }

    if (!text.trim()) {
      return res.status(422).json({ error: "Could not extract text. Is the PDF scanned/image-based?" });
    }

    // Chunk
    const chunks = chunkDocument(text, docId, pageMap);
    console.log(`✓ Chunked into ${chunks.length} pieces`);

    // Embed
    console.log("Embedding chunks...");
    const texts = chunks.map((c) => c.text);
    const embeddings = await embedBatch(texts);
    console.log(`✓ Embedded ${embeddings.length} chunks`);

    // Store
    const collectionName = `doc_${docId.replace(/-/g, "_")}`;
    await ensureCollection(collectionName);
    await upsertChunks(collectionName, chunks, embeddings);
    console.log(`✓ Stored in Qdrant: ${collectionName}`);

    res.json({
      docId,
      collectionName,
      fileName,
      chunkCount: chunks.length,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({
      error: err.message || "Ingestion failed",
      hint: getHint(err.message),
    });
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
});

function getHint(msg = "") {
  if (msg.includes("ECONNREFUSED") && msg.includes("11434"))
    return "Ollama is not running. Run: ollama serve";
  if (msg.includes("ECONNREFUSED") && msg.includes("6333"))
    return "Qdrant is not running.";
  if (msg.includes("model") && msg.includes("not found"))
    return "Run: ollama pull nomic-embed-text";
  return null;
}

export default router;