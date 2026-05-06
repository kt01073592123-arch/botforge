"use client";

// Telegram WebApp ni initData ga mos auth qiladi va sessiya cookie o‘rnatadi.
// /app ostidagi har bir sahifada bir marta ishlaydi.

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
        colorScheme?: string;
        themeParams?: Record<string, string>;
        BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void };
        MainButton?: { show: () => void; hide: () => void; setText: (t: string) => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void; setParams: (p: Record<string, unknown>) => void };
        HapticFeedback?: { impactOccurred: (s: string) => void; notificationOccurred: (t: string) => void };
        showAlert?: (m: string) => void;
      };
    };
  }
}

type Status = "init" | "auth" | "ok" | "error";

export default function TgInit({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("init");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const w = window.Telegram?.WebApp;
    if (!w) {
      setStatus("error");
      setError(
        "Bu sahifa Telegram WebApp ichida ochilishi kerak. @" +
          (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "your_bot") +
          " botiga kirib menyudan oching."
      );
      return;
    }
    w.ready();
    w.expand();
    if (!w.initData) {
      setStatus("error");
      setError("initData bo‘sh — Telegram orqali qayta oching");
      return;
    }
    setStatus("auth");
    fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: w.initData }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "auth failed");
        setStatus("ok");
      })
      .catch((e) => {
        setStatus("error");
        setError(e.message);
      });
  }, []);

  if (status === "ok") return <>{children}</>;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {status === "error" ? (
        <>
          <div className="text-5xl mb-4">😔</div>
          <div className="text-lg font-semibold mb-2">Kirish muvaffaqiyatsiz</div>
          <div className="text-sm text-muted max-w-sm">{error}</div>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
          <div className="text-sm text-muted">Telegram orqali kirilmoqda…</div>
        </>
      )}
    </div>
  );
}
