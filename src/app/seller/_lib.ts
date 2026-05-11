"use client";

// Seller Mini App uchun shared helperlar (auth, fetch wrapper, Telegram WebApp).

export function getInitData(): string {
  if (typeof window === "undefined") return "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = (window as any).Telegram?.WebApp;
  return tg?.initData ?? "";
}

// Telegram WebApp obyektini qaytaradi (mavjud bo'lsa).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tgWebApp(): any {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).Telegram?.WebApp ?? null;
}

// Hozirgi til (Mini App'dagi i18n bilan bir xil)
export function getLang(): "uz" | "ru" | "en" {
  if (typeof window === "undefined") return "uz";
  const stored = localStorage.getItem("bf_lang");
  if (stored === "uz" || stored === "ru" || stored === "en") return stored;
  const tg = tgWebApp();
  const code = tg?.initDataUnsafe?.user?.language_code as string | undefined;
  if (code === "ru") return "ru";
  if (code === "en") return "en";
  return "uz";
}

// initData header bilan fetch
export async function sellerFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  headers.set("X-Init-Data", getInitData());
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}
