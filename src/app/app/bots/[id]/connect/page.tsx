"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";

type Mode = "auto" | "manual";

type OnboardInfo = {
  bot_username: string;
  mini_app_url: string;
};

export default function ConnectPage() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const [mode, setMode] = useState<Mode>("auto");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [autoSent, setAutoSent] = useState(false);
  const [onboard, setOnboard] = useState<OnboardInfo | null>(null);

  async function startAuto() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/bots/${id}/managed-create`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAutoSent(true);
      // 2 sekunddan keyin WebApp’ni yopamiz — user Telegram chatga o‘tib tugmani ko‘radi
      setTimeout(() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).Telegram?.WebApp?.close?.();
        } catch {}
      }, 1500);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/bots/${id}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Onboarding ekrani: Mini App URL va keyingi qadamlarni ko'rsatamiz.
      // Bot aktivatsiyasini ham bu yerda ishga tushiramiz, polish (setChatMenuButton)
      // shu paytda qo'llanadi.
      const username = data?.bot?.tg_username;
      try {
        await fetch(`/api/bots/${id}/activate`, { method: "POST" });
      } catch {}
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      setOnboard({
        bot_username: username,
        mini_app_url: `${baseUrl}/c/${username}`,
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (onboard) {
    return (
      <div>
        <Topbar title="Bot ulandi" back="back" />
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <div className="text-center space-y-2">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold">Bot tayyor!</h2>
            <p className="text-sm text-muted">
              <code className="text-accent">@{onboard.bot_username}</code>{" "}
              ulandi va Mini App tugmasi avtomatik sozlandi.
            </p>
          </div>

          <div className="panel p-4 space-y-3">
            <div className="font-semibold text-sm">📱 Mini App URL</div>
            <div className="text-xs text-muted break-all bg-bg/50 p-2 rounded-md">
              {onboard.mini_app_url}
            </div>
            <div className="text-xs text-muted leading-relaxed">
              Telegram'da bot bilan suhbatda yuqoridagi <b>Menu</b> tugmasi (kirish maydoni
              yonida) bosilganda Mini App ochiladi. Bu sozlama avtomatik bajarildi —
              BotFather'da hech narsa qilish kerak emas.
            </div>
          </div>

          <div className="panel p-4 space-y-2">
            <div className="font-semibold text-sm">Keyingi qadamlar:</div>
            <ol className="text-sm space-y-1.5 list-decimal pl-5 text-muted">
              <li>
                Telegram'da{" "}
                <a
                  className="text-accent"
                  href={`https://t.me/${onboard.bot_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @{onboard.bot_username}
                </a>{" "}
                ga <code>/start</code> yuboring
              </li>
              <li>Bot menyusidagi tugmadan Mini App'ni oching</li>
              <li>Botingizga mahsulot/xizmat qo'shing — bo'sh sahifa to'ldiriladi</li>
            </ol>
          </div>

          <button
            onClick={() => r.replace(`/app/bots/${id}`)}
            className="btn-primary w-full !py-3"
          >
            Boshqaruv paneliga o'tish →
          </button>
        </div>
      </div>
    );
  }

  if (autoSent) {
    return (
      <div>
        <Topbar title="Telegramni oching" back="back" />
        <div className="max-w-3xl mx-auto px-4 py-10 text-center space-y-4">
          <div className="text-5xl">📲</div>
          <h2 className="text-xl font-bold">Telegram chatda tugma yubordik</h2>
          <p className="text-sm text-muted leading-relaxed">
            BotForge chatiga o‘ting va <b>“🤖 Botni avtomatik yaratish”</b> tugmasini
            bosing. Telegram’ning rasmiy oynasi ochiladi — bot yaratilgandan so‘ng
            avtomatik BotForge’ga ulanadi.
          </p>
          <div className="text-xs text-muted">Bu ekran avtomatik yopiladi…</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Botni ulash" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Tab tanlash */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("auto")}
            className={`panel p-3 text-center transition ${
              mode === "auto" ? "border-accent" : ""
            }`}
          >
            <div className="text-2xl mb-1">🤖</div>
            <div className="text-sm font-semibold">Avtomatik</div>
            <div className="text-[11px] text-muted">Tavsiya etiladi</div>
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`panel p-3 text-center transition ${
              mode === "manual" ? "border-accent" : ""
            }`}
          >
            <div className="text-2xl mb-1">🔑</div>
            <div className="text-sm font-semibold">Qo‘lda token</div>
            <div className="text-[11px] text-muted">BotFather orqali</div>
          </button>
        </div>

        {mode === "auto" ? (
          <>
            <div className="panel p-4 text-sm leading-relaxed space-y-2">
              <div className="font-semibold text-base">🚀 Bir bosishda bot yarating</div>
              <p className="text-muted">
                BotForge Telegram’ning rasmiy “Managed Bots” oynasini ochib beradi.
                Siz nomini va username’ni tasdiqlashingiz kifoya — token avtomatik
                bog‘lanadi.
              </p>
              <ul className="text-xs text-muted space-y-1 mt-2 list-disc pl-5">
                <li>BotFather’ga kirish kerak emas</li>
                <li>Token ko‘rinmaydi — to‘g‘ridan to‘g‘ri shifrlanib saqlanadi</li>
                <li>Webhook ham avtomatik o‘rnatiladi</li>
              </ul>
            </div>

            {err && (
              <div className="panel p-3 border-danger/40 text-sm text-danger">
                {err}
              </div>
            )}

            <button
              className="btn-primary w-full !py-3 !text-base"
              onClick={startAuto}
              disabled={busy}
            >
              {busy ? "Tayyorlanmoqda…" : "🤖 Botni avtomatik yaratish"}
            </button>

            <div className="text-xs text-muted text-center">
              Davom ettirish uchun avval{" "}
              <a
                href={`https://t.me/${
                  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "BotForgeBot"
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent"
              >
                platforma boti
              </a>
              ga <code>/start</code> yuborgan bo‘lishingiz kerak
            </div>
          </>
        ) : (
          <>
            <div className="panel p-4">
              <div className="font-semibold text-sm mb-2">BotFather orqali</div>
              <ol className="text-xs text-muted space-y-1 list-decimal pl-5">
                <li>
                  Telegramda{" "}
                  <a
                    className="text-accent"
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @BotFather
                  </a>
                  ni oching
                </li>
                <li>
                  <code className="px-1.5 py-0.5 bg-border rounded">/newbot</code>{" "}
                  yozing
                </li>
                <li>Bot nomi va username kiriting</li>
                <li>BotFather sizga tokenni beradi — uni quyiga joylang</li>
              </ol>
            </div>

            <form onSubmit={submitManual} className="space-y-3">
              <div>
                <label className="label">Bot tokeni</label>
                <input
                  className="input font-mono text-xs"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456:AAEr...xyz"
                  required
                />
                <div className="text-xs text-muted mt-1.5">
                  AES-256-GCM bilan shifrlanadi. Frontendga hech qachon qaytmaydi.
                </div>
              </div>
              {err && <div className="text-danger text-sm">{err}</div>}
              <button className="btn-primary w-full" disabled={busy || !token.trim()}>
                {busy ? "Tekshirilmoqda…" : "Ulash"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
