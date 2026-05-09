"use client";

// Iframe sahifa — embed.js ochadigan chat oynasi.
// Ovoz/voice yo'q (faqat matn), lekin bot egasining brand ranglari bilan.

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function WidgetIframePage({ params }: { params: { id: string } }) {
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [kit, setKit] = useState<{
    primary_color: string;
    gradient_from: string;
    gradient_to: string;
    logo_emoji: string;
    business_name: string;
    welcome: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef<string>(getOrCreateSessionId());

  // Init: kit + welcome
  useEffect(() => {
    fetch(`/api/widget/${params.id}/info`)
      .then((r) => r.json())
      .then((d) => {
        setKit(d.info ?? null);
        if (d.info?.welcome) {
          setHistory([{ role: "assistant", content: d.info.welcome }]);
        }
      })
      .catch(() => {});
  }, [params.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [history, sending]);

  async function send() {
    if (!input.trim() || sending) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const next = [...history, userMsg];
    setHistory(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`/api/widget/${params.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId.current,
          message: userMsg.content,
          history: next.slice(-10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "xato");
      const replies: Msg[] = (data.messages ?? []).map((c: string) => ({
        role: "assistant" as const,
        content: c,
      }));
      setHistory([...next, ...replies]);
    } catch (e) {
      setHistory([
        ...next,
        { role: "assistant", content: "❌ Hozir javob bera olmadim. Birozdan keyin urinib ko'ring." },
      ]);
    } finally {
      setSending(false);
    }
  }

  const primary = kit?.primary_color ?? "#0EA5E9";
  const gradFrom = kit?.gradient_from ?? primary;
  const gradTo = kit?.gradient_to ?? primary;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div
        className="px-4 py-3 text-white flex items-center gap-3"
        style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
      >
        <div className="text-2xl">{kit?.logo_emoji ?? "💬"}</div>
        <div>
          <div className="font-bold text-sm">{kit?.business_name ?? "Chat"}</div>
          <div className="text-xs opacity-90">Onlayn — odatda 1 daqiqada javob beradi</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {history.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "text-white" : "bg-white border text-gray-900"
              }`}
              style={m.role === "user" ? { backgroundColor: primary } : undefined}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl px-3 py-2 text-sm text-gray-500">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-2 flex gap-2 bg-white">
        <input
          type="text"
          className="flex-1 border rounded-full px-4 py-2 text-sm"
          placeholder="Xabar yozing..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={sending}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="px-4 py-2 rounded-full text-white text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: primary }}
        >
          ↑
        </button>
      </div>
      <div className="text-center text-[10px] py-1 text-gray-400">
        Powered by <span style={{ color: primary }}>BotForge</span>
      </div>
    </div>
  );
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  const KEY = "bf_session_id";
  try {
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2);
  }
}
