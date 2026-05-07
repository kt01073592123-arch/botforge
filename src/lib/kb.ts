// Knowledge base helpers — document yaratish va chunklash + embedding.
// OpenAI key bo‘lmasa hujjatlar saqlanadi, lekin embedding va qidiruv ishlamaydi.

import { db } from "./supabase/server";
import { embed, embedOne, chunkText, isEmbeddingAvailable } from "./ai/embeddings";

export async function createKbDocument(opts: {
  botId: string;
  title: string;
  content: string;
  source?: string;
}) {
  const sb = db();

  const { data: doc, error } = await sb
    .from("kb_documents")
    .insert({
      bot_id: opts.botId,
      title: opts.title,
      content: opts.content,
      source: opts.source ?? "manual",
      status: "pending",
    })
    .select("*")
    .single();
  if (error || !doc) throw new Error(error?.message ?? "kb insert failed");

  try {
    const chunks = chunkText(opts.content);
    if (chunks.length === 0) {
      await sb.from("kb_documents").update({ status: "ready" }).eq("id", doc.id);
      return doc;
    }

    if (!isEmbeddingAvailable()) {
      // Embedding xizmati ulanmagan — chunklarni embeddingsiz saqlaymiz, qidiruv ishlamaydi
      const rows = chunks.map((content, ord) => ({
        bot_id: opts.botId,
        document_id: doc.id,
        ord,
        content,
        embedding: null,
      }));
      await sb.from("kb_chunks").insert(rows);
      await sb
        .from("kb_documents")
        .update({
          status: "ready",
          error: "Embedding xizmati ulanmagan — qidiruv ishlamaydi",
        })
        .eq("id", doc.id);
      return { ...doc, chunks: chunks.length };
    }

    // Batchda embed qilamiz
    const embeddings: number[][] = [];
    const BATCH = 50;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const vectors = await embed(batch);
      embeddings.push(...vectors);
    }

    const rows = chunks.map((content, ord) => ({
      bot_id: opts.botId,
      document_id: doc.id,
      ord,
      content,
      embedding: `[${embeddings[ord].join(",")}]`,
    }));

    const { error: insErr } = await sb.from("kb_chunks").insert(rows);
    if (insErr) throw new Error(insErr.message);

    await sb.from("kb_documents").update({ status: "ready" }).eq("id", doc.id);
    return { ...doc, chunks: chunks.length };
  } catch (e) {
    await sb
      .from("kb_documents")
      .update({ status: "error", error: (e as Error).message })
      .eq("id", doc.id);
    throw e;
  }
}

export async function deleteKbDocument(opts: { botId: string; documentId: string }) {
  await db()
    .from("kb_documents")
    .delete()
    .eq("id", opts.documentId)
    .eq("bot_id", opts.botId);
}

export async function listKbDocuments(botId: string) {
  const { data } = await db()
    .from("kb_documents")
    .select("id, title, source, status, error, created_at")
    .eq("bot_id", botId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// AI engine RAG uchun chaqiradi
export async function searchKnowledge(opts: {
  botId: string;
  query: string;
  limit?: number;
  minSimilarity?: number;
}): Promise<{ content: string; similarity: number }[]> {
  if (!opts.query.trim()) return [];
  if (!isEmbeddingAvailable()) return [];
  let v: number[];
  try {
    v = await embedOne(opts.query);
  } catch {
    return [];
  }
  if (!v.length) return [];
  const { data, error } = await db().rpc("kb_match", {
    p_bot_id: opts.botId,
    p_query: `[${v.join(",")}]`,
    p_match_count: opts.limit ?? 3,
    p_min_similarity: opts.minSimilarity ?? 0.4,
  });
  if (error) {
    console.error("[searchKnowledge]", error.message);
    return [];
  }
  return (data ?? []) as { content: string; similarity: number }[];
}
