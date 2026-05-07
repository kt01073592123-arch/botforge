// OpenAI embeddings — text-embedding-3-small (1536 o‘lchamli, arzon)

import { openai } from "./openai";

const MODEL = "text-embedding-3-small";

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await openai().embeddings.create({
    model: MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

export async function embedOne(text: string): Promise<number[]> {
  const [v] = await embed([text]);
  return v;
}

// Matnni overlap’li chunklarga bo‘ladi (~500 belgi, 60 belgi overlap)
export function chunkText(text: string, maxLen = 500, overlap = 60): string[] {
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (clean.length <= maxLen) return [clean];
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(clean.length, i + maxLen);
    let chunk = clean.slice(i, end);
    // Yaqin nuqta yoki yangi qator bo‘yicha kesamiz
    if (end < clean.length) {
      const lastDot = Math.max(chunk.lastIndexOf("."), chunk.lastIndexOf("\n"));
      if (lastDot > maxLen * 0.6) {
        chunk = chunk.slice(0, lastDot + 1);
      }
    }
    out.push(chunk.trim());
    i += chunk.length - overlap;
    if (chunk.length <= overlap) break;
  }
  return out.filter(Boolean);
}
