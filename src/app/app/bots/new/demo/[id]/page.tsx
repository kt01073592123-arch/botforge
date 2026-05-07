"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import clsx from "clsx";

type Pack = {
  id: string;
  name: string;
  icon: string;
  default_welcome: string;
  default_buttons: { text: string }[];
  brand_kit: {
    primary_color?: string;
    accent_color?: string;
    gradient?: string;
    text_on_primary?: string;
    emoji_set?: string[];
  };
};

type Msg = { role: "user" | "assistant"; content: string };

export default function DemoPage() {
  const { id } = useParams<{ id: string }>();
  const [pack, setPack] = useState<Pack | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.pack) {
          setPack(d.pack);
          setMessages([{ role: "assistant", content: d.pack.default_welcome }]);
        }
      });
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    setBusy(true);
    setError(null);

    const newMessages = [...messages, { role: "user" as const, content: msg }];
    setMessages(newMessages);

    try {
      const res = await fetch(`/api/templates/${id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: messages.filter((m) => m.role !== "assistant" || m !== messages[0]),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!pack) {
    return (
      <div>
        <Topbar title="Yuklanmoqda…" back="back" />
      </div>
    );
  }

  const bk = pack.brand_kit;
  const headerBg =
    bk.gradient ?? `linear-gradient(135deg, ${bk.primary_color} 0%, ${bk.accent_color} 100%)`;

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Sinab ko‘rish" back="back" />

      {/* Pack header */}
      <div
        className="px-4 py-3 flex items-center gap-3 border-b border-border"
        style={{ background: headerBg, color: bk.text_on_primary ?? "white" }}
      >
        <div className="text-3xl">{pack.icon}</div>
        <div className="flex-1">
          <div className="font-bold">{pack.name}</div>
          <div className="text-xs opacity-90">Demo rejimi · saqlanmaydi</div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          {messages.map((m, i) => (
            <Bubble key={i} message={m} accent={bk.accent_color} />
          ))}
          {busy && (
            <div className="self-start text-xs text-muted px-3 py-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted animate-pulse mr-1" />
              Bot yozmoqda…
            </div>
          )}
          {error && (
            <div className="self-center text-xs text-danger px-3 py-2">{error}</div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Quick buttons (faqat birinchi suhbat boshida) */}
      {messages.length === 1 && pack.default_buttons.length > 0 && (
        <div className="border-t border-border px-3 py-2">
          <div className="max-w-2xl mx-auto flex flex-wrap gap-1.5">
            {pack.default_buttons.slice(0, 5).map((b, i) => (
              <button
                key={i}
                onClick={() => send(b.text)}
                disabled={busy}
                className="px-3 py-1.5 rounded-full text-xs border border-border bg-panel hover:border-accent transition"
              >
                {b.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-bg">
        <div className="max-w-2xl mx-auto px-3 py-2 flex gap-2">
          <input
            type="text"
            className="input"
            placeholder="Mijoz bo‘lib savol bering..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={busy}
          />
          <button
            onClick={() => send()}
            disabled={busy || !input.trim()}
            className="btn-primary !px-4"
          >
            ➤
          </button>
        </div>
        <div className="max-w-2xl mx-auto px-3 pb-3 flex justify-between gap-2 text-xs">
          <div className="text-muted self-center">
            Yoqdimi? Bu yo‘qotmaslik uchun pack tanlang →
          </div>
          <Link
            href={`/app/bots/new/wizard/${pack.id}`}
            className="btn-primary !py-1.5 !text-xs"
          >
            🚀 Shu pack’ni tanlash
          </Link>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  message,
  accent,
}: {
  message: Msg;
  accent?: string;
}) {
  const isUser = message.role === "user";
  return (
    <div
      className={clsx(
        "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
        isUser ? "self-end ml-auto bg-border" : "self-start"
      )}
      style={{
        background: isUser ? undefined : `${accent ?? "#7c5cff"}15`,
        border: isUser ? undefined : `1px solid ${accent ?? "#7c5cff"}40`,
      }}
    >
      {message.content}
    </div>
  );
}
