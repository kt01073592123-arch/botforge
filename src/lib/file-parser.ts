// PDF, DOCX, TXT, MD fayllardan matn ajratib olish.
// pdf-parse'ning Next.js'dagi test-fayl muammosini chetlab o'tish uchun
// to'g'ridan-to'g'ri ichki modulni import qilamiz.

export interface ParseResult {
  text: string;
  pageCount?: number;
  wordCount: number;
}

export async function parseFileBuffer(
  buffer: Buffer,
  filename: string,
): Promise<ParseResult> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (
      buf: Buffer,
    ) => Promise<{ text: string; numpages: number }>;
    const data = await pdfParse(buffer);
    const text = cleanText(data.text);
    return { text, pageCount: data.numpages, wordCount: countWords(text) };
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    const text = cleanText(result.value);
    return { text, wordCount: countWords(text) };
  }

  // .txt, .md yoki boshqa — UTF-8 matn sifatida o'qiymiz
  const text = cleanText(buffer.toString("utf-8"));
  return { text, wordCount: countWords(text) };
}

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")   // ketma-ket bo'sh qatorlarni qisqartirish
    .replace(/[ \t]{3,}/g, "  ")     // ortiqcha bo'shliqlarni qisqartirish
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt", "md"];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
