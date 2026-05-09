// AI Image Generator — hero, OG, va boshqa rasmlarni yaratadi.
//
// Quyidagi tartibda urinadi (config'ga qarab):
//   1) Replicate Flux Schnell — agar REPLICATE_API_TOKEN bor bo'lsa (~4¢/rasm, 8s)
//   2) OpenAI DALL-E 3 — agar OPENAI_API_KEY bor bo'lsa (4¢/rasm, ~12s)
//   3) Unsplash API — keyword'lardan stock photo (bepul, fallback)
//
// Yaratilgan rasm Vercel Blob storage'ga yuklanadi, public URL qaytariladi.

import { put } from "@vercel/blob";

export type ImagePromptInput = {
  businessName: string;
  vertical: string;
  brandVoice: string;
  moodKeywords: string[];
  primaryColor: string;
  description?: string;
};

export type ImageOutput = {
  url: string;
  alt_text: string;
  width: number;
  height: number;
  provider: "replicate" | "dalle3" | "unsplash" | "placeholder";
  prompt: string;
  cost_usd: number;
  duration_ms: number;
};

// ════════════════════════════════════════════════════════════
// Image prompt builder — high-quality hero rasm uchun
// ════════════════════════════════════════════════════════════
function buildHeroPrompt(input: ImagePromptInput): string {
  const moodStr = input.moodKeywords.join(", ");
  return `A high-quality, photorealistic hero banner image for a ${input.vertical} business named "${input.businessName}". Style: ${input.brandVoice}, ${moodStr}. Professional photography, soft natural lighting, premium feel, ${input.primaryColor} accent tones, no text overlay, 16:9 aspect ratio, centered composition with negative space for text overlay on left side. Modern, trustworthy, inviting atmosphere.`;
}

// ════════════════════════════════════════════════════════════
// REPLICATE — Flux Schnell (eng tez va arzon)
// ════════════════════════════════════════════════════════════
async function generateWithReplicate(prompt: string): Promise<{ url: string; cost: number } | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return null;

  // Predict yaratish (sync wait_time bilan)
  const res = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=30",
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: "16:9",
        output_format: "webp",
        output_quality: 85,
        num_outputs: 1,
      },
    }),
  });

  if (!res.ok) {
    console.error("[replicate]", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { output?: string[] | string; status?: string };
  const url = Array.isArray(data.output) ? data.output[0] : data.output;
  if (!url) return null;
  return { url, cost: 0.003 }; // Flux Schnell ~$0.003/image
}

// ════════════════════════════════════════════════════════════
// DALL-E 3 — fallback agar Replicate yo'q
// ════════════════════════════════════════════════════════════
async function generateWithDalle3(prompt: string): Promise<{ url: string; cost: number } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1792x1024",
      quality: "standard",
      response_format: "url",
    }),
  });

  if (!res.ok) {
    console.error("[dalle3]", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { data?: Array<{ url: string }> };
  const url = data.data?.[0]?.url;
  if (!url) return null;
  return { url, cost: 0.04 }; // $0.040 standard 1792x1024
}

// ════════════════════════════════════════════════════════════
// UNSPLASH — bepul stock photo fallback
// ════════════════════════════════════════════════════════════
async function generateWithUnsplash(input: ImagePromptInput): Promise<{ url: string; cost: number } | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  // Unsplash ham ixtiyoriy — agar yo'q bo'lsa picsum'ga o'tamiz
  const query = `${input.vertical} ${input.moodKeywords[0] ?? ""}`.trim();

  if (key) {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${key}` },
      }
    );
    if (res.ok) {
      const data = (await res.json()) as { urls?: { regular?: string } };
      if (data.urls?.regular) return { url: data.urls.regular, cost: 0 };
    }
  }

  // Picsum — to'liq bepul, deterministic
  const seed = input.businessName.replace(/\s+/g, "-").toLowerCase().slice(0, 32);
  return { url: `https://picsum.photos/seed/${seed}/1792/1024`, cost: 0 };
}

// ════════════════════════════════════════════════════════════
// PIPELINE: download → upload to Vercel Blob → return permanent URL
// ════════════════════════════════════════════════════════════
async function persistToBlob(sourceUrl: string, botId: string, kind: string): Promise<string> {
  // Vercel Blob token kerak — bo'lmasa source URL'ni bevosita qaytaramiz
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return sourceUrl;
  }
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) return sourceUrl;
    const buffer = await res.arrayBuffer();
    const filename = `bots/${botId}/${kind}-${Date.now()}.webp`;
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
    });
    return blob.url;
  } catch (e) {
    console.error("[persistToBlob]", (e as Error).message);
    return sourceUrl;
  }
}

// ════════════════════════════════════════════════════════════
// Asosiy entrypoint — tartib bo'yicha urinadi va birinchi ishlaganini qaytaradi
// ════════════════════════════════════════════════════════════
export async function generateHeroImage(
  input: ImagePromptInput,
  botId: string
): Promise<ImageOutput> {
  const start = Date.now();
  const prompt = buildHeroPrompt(input);

  // 1) Replicate Flux
  let provider: ImageOutput["provider"] = "replicate";
  let result = await generateWithReplicate(prompt);

  // 2) DALL-E 3 fallback
  if (!result) {
    provider = "dalle3";
    result = await generateWithDalle3(prompt);
  }

  // 3) Unsplash / Picsum fallback
  if (!result) {
    provider = "unsplash";
    result = await generateWithUnsplash(input);
  }

  if (!result) {
    // Eng oxirgi fallback — placeholder gradient SVG
    return {
      url: `data:image/svg+xml;utf8,${encodeURIComponent(buildPlaceholderSvg(input))}`,
      alt_text: `${input.businessName} hero rasm`,
      width: 1792,
      height: 1024,
      provider: "placeholder",
      prompt,
      cost_usd: 0,
      duration_ms: Date.now() - start,
    };
  }

  // Permanent storage'ga yuklash
  const permanentUrl = await persistToBlob(result.url, botId, "hero");

  return {
    url: permanentUrl,
    alt_text: `${input.businessName} — ${input.moodKeywords.join(", ")}`,
    width: 1792,
    height: 1024,
    provider,
    prompt,
    cost_usd: result.cost,
    duration_ms: Date.now() - start,
  };
}

function buildPlaceholderSvg(input: ImagePromptInput): string {
  const c1 = input.primaryColor || "#3B82F6";
  const c2 = "#8B5CF6";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1792 1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="1792" height="1024" fill="url(#g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="64" fill="white" text-anchor="middle" opacity="0.7">${input.businessName.slice(0, 40)}</text></svg>`;
}
