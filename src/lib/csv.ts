// Sodda CSV yozuvchi — Excel'da to'g'ri ochilishi uchun BOM + CRLF.
// Hech qanday kutubxona kerak emas.

export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // Hozircha tab/newline'larni bo'shliqqa almashtiramiz
  s = s.replace(/[\r\n\t]+/g, " ");
  if (/[",]/.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const head = headers.map(csvCell).join(",");
  const body = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  // BOM (Excel'da kirill/o'zbek to'g'ri ko'rinishi uchun)
  return "﻿" + head + "\r\n" + body;
}

export function csvResponse(filename: string, content: string): Response {
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
