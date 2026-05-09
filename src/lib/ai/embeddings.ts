// Embeddings — OpenAI text-embedding-3-small (KB RAG uchun).
// Anthropic embedding API bermaydi. OPENAI_API_KEY o‘rnatilmagan bo‘lsa,
// barchasi graceful no-op qaytaradi (KB matn sifatida saqlanadi, qidiruv ishlamaydi).

const MODEL = "text-embedding-3-small";

function hasOpenAI(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

async function callOpenAI(input: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, input }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data.map((d) => d.embedding);
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (!hasOpenAI()) {
    // Embedding service o‘rnatilmagan — bo‘sh vektor qaytaramiz, KB qidiruv ishlamaydi
    return texts.map(() => []);
  }
  return callOpenAI(texts);
}

export async function embedOne(text: string): Promise<number[]> {
  const [v] = await embed([text]);
  return v ?? [];
}

// Matnni overlap’li chunklarga bo‘ladi (~500 belgi, 60 belgi overlap)
export function chunkText(text: string, maxLen = 500, overlap = 60): string[] {
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(clean.length, i + maxLen);
    let chunk = clean.slice(i, end);
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

export const isEmbeddingAvailable = hasOpenAI;
