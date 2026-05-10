// Product Image Generator — mahsulot uchun rasm yaratadi yoki topadi.
//
// Tartib (config'ga qarab):
//   1) Unsplash API search — mahsulot nomi + vertical bo'yicha (bepul, real photo)
//   2) Replicate Flux Schnell — agar UNSPLASH_ACCESS_KEY yo'q bo'lsa AI yaratadi
//   3) Picsum seed — deterministic placeholder (oxirgi fallback)
//
// Rasm Vercel Blob'ga yuklanadi.

import { put } from "@vercel/blob";

export type ProductImageInput = {
  productName: string;
  vertical?: string;
  description?: string;
};

export type ProductImageOutput = {
  url: string;
  provider: "unsplash" | "replicate" | "picsum";
  cost_usd: number;
};

async function searchUnsplash(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=squarish`,
      { headers: { Authorization: `Client-ID ${key}` } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: Array<{ urls?: { regular?: string } }> };
    const list = data.results ?? [];
    if (list.length === 0) return null;
    // Random pick from top 5 (har xil mahsulotlar uchun har xil rasm)
    const pick = list[Math.floor(Math.random() * Math.min(list.length, 5))];
    return pick?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

async function generateReplicate(prompt: string): Promise<string | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait=30",
        },
        body: JSON.stringify({
          input: {
            prompt,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 85,
            num_outputs: 1,
          },
        }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { output?: string[] | string };
    return Array.isArray(data.output) ? data.output[0] : data.output ?? null;
  } catch {
    return null;
  }
}

async function persistToBlob(sourceUrl: string, botId: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return sourceUrl;
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) return sourceUrl;
    const buffer = await res.arrayBuffer();
    const filename = `bots/${botId}/products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
    });
    return blob.url;
  } catch {
    return sourceUrl;
  }
}

export async function generateProductImage(
  input: ProductImageInput,
  botId: string,
): Promise<ProductImageOutput> {
  // 1) Unsplash
  const query = `${input.productName} ${input.vertical ?? ""}`.trim();
  const unsplashUrl = await searchUnsplash(query);
  if (unsplashUrl) {
    const permanent = await persistToBlob(unsplashUrl, botId);
    return { url: permanent, provider: "unsplash", cost_usd: 0 };
  }

  // 2) Replicate
  const prompt = `${input.productName}${input.description ? ` — ${input.description}` : ""}, professional product photography, white background, soft lighting, e-commerce, photorealistic, 1:1 square, centered`;
  const replicateUrl = await generateReplicate(prompt);
  if (replicateUrl) {
    const permanent = await persistToBlob(replicateUrl, botId);
    return { url: permanent, provider: "replicate", cost_usd: 0.003 };
  }

  // 3) Picsum (fallback — random but deterministic)
  const seed = input.productName.replace(/\s+/g, "-").toLowerCase().slice(0, 32);
  return {
    url: `https://picsum.photos/seed/${seed}/512/512`,
    provider: "picsum",
    cost_usd: 0,
  };
}
