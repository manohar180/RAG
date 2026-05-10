/**
 * LLM Service — Groq
 *
 * Uses retrieved chunks as context.
 * System prompt enforces grounded answers ONLY from the document.
 * Supports streaming for real-time UI response.
 */

import Groq from "groq-sdk";
import { config } from "../config/index.js";

const groq = new Groq({ apiKey: config.groq.apiKey });

/**
 * Build the system prompt with retrieved context.
 * @param {Array<{text, score, metadata}>} chunks
 * @param {string} fileName
 */
function buildSystemPrompt(chunks, fileName) {
  const contextBlock = chunks
    .map((c, i) => {
      const page = c.metadata.pageNum ? `[Page ${c.metadata.pageNum}]` : `[Chunk ${c.metadata.chunkIndex + 1}]`;
      return `--- Context ${i + 1} ${page} ---\n${c.text}`;
    })
    .join("\n\n");

  return `You are a precise document assistant for "${fileName}". 
Your ONLY job is to answer questions using the document context provided below.

RULES:
1. Answer ONLY from the provided context. Never use outside knowledge.
2. If the answer is not in the context, say: "I couldn't find that in the document."
3. When referencing specific information, mention the page number if available.
4. Be concise, accurate, and helpful.
5. If asked to summarize, cover the main points present in the context.

DOCUMENT CONTEXT:
${contextBlock}`;
}

/**
 * Generate a streaming response from Groq.
 * @param {string} question
 * @param {Array} chunks  - Retrieved document chunks
 * @param {string} fileName
 * @param {Array} history - [{role, content}] conversation history
 * @returns {AsyncIterable<string>} - Token stream
 */
export async function* generateAnswer(question, chunks, fileName, history = []) {
  const systemPrompt = buildSystemPrompt(chunks, fileName);

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6), // keep last 3 turns for context
    { role: "user", content: question },
  ];

  const stream = await groq.chat.completions.create({
    model: config.groq.model,
    messages,
    stream: true,
    temperature: 0.2, // low temp = factual, grounded answers
    max_tokens: 1024,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}