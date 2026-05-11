// Mahsulot rasm qidirish — indekslash va qidirish funksiyalari.
// Indekslash: name+description → OpenAI embed → product_image_embeddings
// Qidirish: Claude Vision (rasm → tavsif) → embed → cosine similarity

import { db } from "./supabase/server";
import { embed, embedOne, isEmbeddingAvailable } from "./ai/embeddings";
import { anthropic } from "./ai/anthropic";

export interface ServiceForIndex {
  name: string;
  description?: string;
  photo_url?: string;
}

export interface ImageSearchResult {
  product_idx: number;
  product_name: string;
  description: string | null;
  photo_url: string | null;
  similarity: number;
}

// Botning barcha xizmatlarini qayta indekslash (services o'zgarganda chaqiriladi)
export async function indexBotProducts(
  botId: string,
  services: ServiceForIndex[],
): Promise<void> {
  if (!services.length || !isEmbeddingAvailable()) return;

  const texts = services.map((s) =>
    [s.name, s.description].filter(Boolean).join(" — "),
  );

  let embeddings: number[][];
  try {
    embeddings = await embed(texts);
  } catch {
    return; // Embedding xato bo'lsa indekslashni o'tkazib yuboramiz
  }

  const rows = services.map((s, i) => ({
    bot_id: botId,
    product_idx: i,
    product_name: s.name,
    description: s.description ?? null,
    photo_url: s.photo_url ?? null,
    embedding: embeddings[i]?.length ? JSON.stringify(embeddings[i]) : null,
    updated_at: new Date().toISOString(),
  }));

  const sb = db();
  // Mavjud yozuvlarni yangilash, yo'q bo'lsa qo'shish
  await sb
    .from("product_image_embeddings")
    .upsert(rows, { onConflict: "bot_id,product_idx" });

  // Eski indeks yozuvlarini (services qisqargan bo'lsa) o'chirish
  if (services.length > 0) {
    await sb
      .from("product_image_embeddings")
      .delete()
      .eq("bot_id", botId)
      .gte("product_idx", services.length);
  }
}

// Rasm → Claude Vision → matn tavsif
export async function describeImageWithVision(
  imageBase64: string,
  mimeType: string,
): Promise<string> {
  const msg = await anthropic().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: "Describe this product image in 1-2 sentences for semantic search. Focus on: product type, color, material, key features. Be concise.",
          },
        ],
      },
    ],
  });
  return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
}

// Rasm → Vision → embed → cosine search
export async function searchProductsByImage(
  botId: string,
  imageBase64: string,
  mimeType: string,
  limit = 5,
): Promise<ImageSearchResult[]> {
  if (!isEmbeddingAvailable()) return [];

  // 1. Vision: rasmni matn sifatida tasvirlash
  let description: string;
  try {
    description = await describeImageWithVision(imageBase64, mimeType);
  } catch {
    return [];
  }
  if (!description) return [];

  // 2. Tavsifni embed qilish
  let qEmb: number[];
  try {
    qEmb = await embedOne(description);
  } catch {
    return [];
  }
  if (!qEmb.length) return [];

  // 3. Cosine similarity qidirish
  const sb = db();
  const { data, error } = await sb.rpc("search_products_by_embedding", {
    p_bot_id: botId,
    p_embedding: JSON.stringify(qEmb),
    p_limit: limit,
    p_min_sim: 0.25,
  });
  if (error) return [];
  return (data ?? []) as ImageSearchResult[];
}
