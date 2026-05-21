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

    // Calculate character offset for this chunk
    const charStart = words.slice(0, i).join(" ").length;
    const charEnd = charStart + chunkText.length;

    // Resolve page number from map, null if not determinable
    const pageNum = resolvePageNumber(charStart, charEnd, pageMap);

    chunks.push({
      id: `${docId}_chunk_${chunkIndex}`,
      text: chunkText,
      metadata: {
        docId,
        chunkIndex,
        pageNum,                        // null if page detection failed
        pageLabel: pageNum ? `Page ${pageNum}` : `Chunk ${chunkIndex + 1}`,
        wordStart: i,
        wordEnd: i + slice.length,
        totalWords: words.length,
      },
    });

    chunkIndex++;
    i += chunkSize - chunkOverlap;
  }

  return chunks;
}

/**
 * Find which page a character offset belongs to.
 * Returns null if pageMap is empty or offset doesn't match any page.
 * Returning null lets the UI fall back to showing chunk number
 * instead of showing a wrong page number.
 */
function resolvePageNumber(charStart, charEnd, pageMap) {
  if (!pageMap.length) return null;

  // Find the page where the MIDDLE of the chunk falls
  // More accurate than using just the start character
  const charMid = Math.floor((charStart + charEnd) / 2);

  for (const page of pageMap) {
    if (charMid >= page.startChar && charMid < page.endChar) {
      return page.pageNum;
    }
  }

  // No match found — return null so UI shows chunk number instead
  return null;
}