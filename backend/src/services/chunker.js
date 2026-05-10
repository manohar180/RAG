/**
 * Chunking Service
 *
 * Strategy: Sliding Window with Token Approximation
 * - Splits text into chunks of ~500 words with 50-word overlap
 * - Overlap preserves context across chunk boundaries
 * - Each chunk is tagged with its page number and position metadata
 *
 * Why sliding window?
 * - Simple and effective for most document types
 * - Overlap prevents losing context at chunk boundaries
 * - Predictable chunk sizes = predictable embedding costs
 */

import { config } from "../config/index.js";

/**
 * Split a raw text into overlapping chunks with metadata.
 * @param {string} text       - Full document text
 * @param {string} docId      - Document identifier
 * @param {Array}  pageMap    - [{pageNum, startChar, endChar}] from PDF parser
 * @returns {Array<{id, text, metadata}>}
 */
export function chunkDocument(text, docId, pageMap = []) {
  const words = text.split(/\s+/).filter(Boolean);
  const { chunkSize, chunkOverlap } = config.rag;
  const chunks = [];

  let i = 0;
  let chunkIndex = 0;

  while (i < words.length) {
    const slice = words.slice(i, i + chunkSize);
    const chunkText = slice.join(" ");
    const charStart = words.slice(0, i).join(" ").length;
    const pageNum = resolvePageNumber(charStart, pageMap);

    chunks.push({
      id: `${docId}_chunk_${chunkIndex}`,
      text: chunkText,
      metadata: {
        docId,
        chunkIndex,
        pageNum,
        wordStart: i,
        wordEnd: i + slice.length,
        totalWords: words.length,
      },
    });

    chunkIndex++;
    i += chunkSize - chunkOverlap; // slide forward with overlap
  }

  return chunks;
}

function resolvePageNumber(charOffset, pageMap) {
  if (!pageMap.length) return null;
  for (const page of pageMap) {
    if (charOffset >= page.startChar && charOffset < page.endChar) {
      return page.pageNum;
    }
  }
  return pageMap[pageMap.length - 1].pageNum;
}