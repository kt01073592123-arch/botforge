// Multimodal — voice (Whisper STT) va photo (Claude Vision) qabul qilish.
//
// Telegram'dan kelgan voice/photo'ni to'g'ridan-to'g'ri matnga aylantiramiz —
// keyin AI engine matn sifatida qayta ishlaydi.
//
// Voice → Whisper API (OpenAI). Agar OPENAI_API_KEY yo'q bo'lsa, no-op.
// Photo → Claude Vision (Anthropic). Bot egasining business kontekstida nimalar
//         borligini tushuntiradi.

import { anthropic } from "./anthropic";
import { env } from "../env";

const TG_API = "https://api.telegram.org";

// Telegram fayl pathini olish (kichik faylar uchun, ≤20 MB)
async function getTelegramFileUrl(token: string, fileId: string): Promise<string> {
  const res = await fetch(`${TG_API}/bot${token}/getFile?file_id=${fileId}`);
  const data = await res.json();
  if (!data.ok) throw new Error(`getFile: ${data.description ?? "xato"}`);
  return `${TG_API}/file/bot${token}/${data.result.file_path}`;
}

// ════════════════════════════════════════════════════════════
// VOICE → TEXT (Whisper)
// ════════════════════════════════════════════════════════════
export async function transcribeVoice(
  botToken: string,
  fileId: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "[Ovoz: OpenAI API key sozlanmagan, transcription yo'q]";
  }

  const fileUrl = await getTelegramFileUrl(botToken, fileId);
  const audioRes = await fetch(fileUrl);
  if (!audioRes.ok) throw new Error(`fileFetch: ${audioRes.status}`);
  const audioBlob = await audioRes.blob();

  // Whisper API multipart/form-data
  const form = new FormData();
  form.append("file", audioBlob, "voice.ogg");
  form.append("model", "whisper-1");
  form.append("response_format", "text");
  // Til: avto, lekin uz/ru/en hint berishimiz mumkin (latency tezlashtirish)
  // form.append("language", "uz");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`whisper ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  return text.trim();
}

// ════════════════════════════════════════════════════════════
// PHOTO → DESCRIPTION (Claude Vision)
// Foydalanuvchi rasm yuborsa, AI rasmda nima borligini tushuntiradi.
// Bu matn keyingi turda (engine.ts) "user" xabar sifatida ishlatiladi.
// ════════════════════════════════════════════════════════════
export async function describePhoto(
  botToken: string,
  fileId: string,
  caption?: string
): Promise<string> {
  const fileUrl = await getTelegramFileUrl(botToken, fileId);
  const imgRes = await fetch(fileUrl);
  if (!imgRes.ok) throw new Error(`fileFetch: ${imgRes.status}`);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const b64 = buf.toString("base64");
  const mime = imgRes.headers.get("content-type") || "image/jpeg";
  const validMime = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mime)
    ? (mime as "image/jpeg" | "image/png" | "image/gif" | "image/webp")
    : "image/jpeg";

  const userText = caption
    ? `Foydalanuvchi rasm yubordi va izoh berdi: "${caption}". Rasmni qisqacha tasvirla.`
    : "Foydalanuvchi rasm yubordi. Unda nima borligini 1-2 jumlada tasvirla. Agar mahsulot, hujjat yoki belgi bo'lsa, alohida ta'kidla.";

  const response = await anthropic().messages.create({
    model: env().AI_MODEL,
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: validMime,
              data: b64,
            },
          },
          { type: "text", text: userText },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // AI engine'ga "user" xabar sifatida o'tadi — bot egasining context'ida tushuniladi
  const prefix = caption ? `[Mijoz rasm + "${caption}"]` : "[Mijoz rasm yubordi]";
  return `${prefix}: ${text.trim() || "(rasm tushunilmadi)"}`;
}
