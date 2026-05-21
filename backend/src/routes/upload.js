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

/**
 * Extract text per page from a PDF buffer.
 * Returns { text, pageMap }
 * - text: full document text (pages joined by space)
 * - pageMap: [{pageNum, startChar, endChar}]
 */
async function extractPdfContent(buffer) {
  const pageTexts = [];

  // Collect each page's text via pagerender
  await new Promise((resolve, reject) => {
    pdfParse(buffer, {
      pagerender: function (pageData) {
        return pageData
          .getTextContent()
          .then(function (textContent) {
            const pageText = textContent.items
              .map((item) => item.str)
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();
            pageTexts.push(pageText);
          });
      },
    }).then(resolve).catch(reject);
  });

  if (pageTexts.length === 0) {
    // pagerender failed — fall back to raw text, no page map
    const parsed = await pdfParse(buffer);
    return { text: parsed.text, pageMap: [] };
  }

  // Build full text and accurate pageMap from the SAME source
  const pageMap = [];
  let charOffset = 0;

  for (let i = 0; i < pageTexts.length; i++) {
    const pageText = pageTexts[i];
    pageMap.push({
      pageNum: i + 1,
      startChar: charOffset,
      endChar: charOffset + pageText.length,
    });
    charOffset += pageText.length + 1; // +1 for the space between pages
  }

  const fullText = pageTexts.join(" ");

  console.log(`✓ Extracted ${pageTexts.length} pages, ${fullText.length} chars`);
  pageMap.forEach((p) =>
    console.log(`  Page ${p.pageNum}: chars ${p.startChar}–${p.endChar}`)
  );

  return { text: fullText, pageMap };
}

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
      const result = await extractPdfContent(buffer);
      text = result.text;
      pageMap = result.pageMap;
    } else {
      text = await fs.readFile(filePath, "utf-8");
    }

    if (!text.trim()) {
      return res.status(422).json({
        error: "Could not extract text. Is the PDF scanned/image-based?",
      });
    }

    // Chunk
    const chunks = chunkDocument(text, docId, pageMap);
    console.log(`✓ Chunked into ${chunks.length} pieces`);
    chunks.slice(0, 3).forEach((c) =>
      console.log(`  Chunk ${c.metadata.chunkIndex}: ${c.metadata.pageLabel}`)
    );

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
    return "Ollama not running. Run: ollama serve";
  if (msg.includes("ECONNREFUSED") && msg.includes("6333"))
    return "Qdrant not running.";
  if (msg.includes("model") && msg.includes("not found"))
    return "Run: ollama pull nomic-embed-text";
  return null;
}

export default router;