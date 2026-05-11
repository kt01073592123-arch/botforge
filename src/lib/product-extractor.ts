// Matndan mahsulot katalogini ajratib olish — Claude Haiku bilan.
// PDF/DOCX import paytida "mahsulot sifatida import" tanlanganda chaqiriladi.

import { anthropic } from "./ai/anthropic";

export interface ExtractedProduct {
  name: string;
  price: number | null;
  description: string;
}

const SYSTEM = `Siz mahsulot katalogi tahlilchisisiz. Berilgan matndan barcha mahsulot/xizmatlarni topib,
qat'iy JSON massiv formatida qaytaring. Har bir element:
{"name": "...", "price": null_yoki_son, "description": "..."}
Narx faqat raqam (so'm/sum), belgi yoki harf emas. Topilmagan narx uchun null.
Faqat JSON massiv qaytaring, boshqa matn yo'q.`;

export async function extractProducts(
  text: string,
): Promise<ExtractedProduct[]> {
  // Matn juda uzun bo'lsa, faqat birinchi 8000 belgini olamiz
  const sample = text.slice(0, 8000);

  try {
    const msg = await anthropic().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{ role: "user", content: `Quyidagi matndan mahsulotlarni ajrat:\n\n${sample}` }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    // JSON blokini tozalaymiz (``` ... ``` bo'lishi mumkin)
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(jsonStr) as unknown[];

    return parsed
      .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
      .map((p) => ({
        name: String(p.name ?? "").trim(),
        price: typeof p.price === "number" ? p.price : null,
        description: String(p.description ?? "").trim(),
      }))
      .filter((p) => p.name.length > 0)
      .slice(0, 100); // maksimum 100 ta mahsulot
  } catch {
    // AI javob bermasa yoki JSON noto'g'ri bo'lsa — bo'sh massiv
    return [];
  }
}
