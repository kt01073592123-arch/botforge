"use client";

// Sandbox — bot egasi prompt + tools'ni real Telegramga ulanishdan oldin sinashi uchun.
// Real bot tokensiz, conversations DB'da saqlanmaydi. Tool effects preview ko'rinadi.

import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function SandboxPage({ params }: { params: { id: string } }) {
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [effects, setEffects] = useState<unknown[]>([]);
  const [usage, setUsage] = useState<{ prompt: number; completion: number; cost_usd: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [history, busy]);

  async function send() {
    if (!input.trim() || busy) return;
    const next: Msg[] = [...history, { role: "user" as const, content: input.trim() }];
    setHistory(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(`/api/bots/${params.id}/sandbox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xato");

      const replies: Msg[] = (data.messages as string[]).map((c) => ({
        role: "assistant" as const,
        content: c,
      }));
      setHistory([...next, ...replies]);
      setEffects(data.effects ?? []);
      setUsage({
        prompt: data.usage.prompt,
        completion: data.usage.completion,
        cost_usd: data.cost_usd,
      });
    } catch (e) {
      setHistory([
        ...next,
        { role: "assistant", content: `❌ Xato: ${(e as Error).message}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🧪 Sandbox — botni sinash</h1>
        <button
          onClick={() => {
            setHistory([]);
            setEffects([]);
            setUsage(null);
          }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          🔄 Tozalash
        </button>
      </div>

      <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-2">
        Bu sandbox — real Telegramga ulanmaysiz. Prompt, tools va knowledge base
        joriy sozlamalar bilan ishlaydi. Tool effects (booking, order, payment link)
        preview sifatida ko'rsatiladi, real DB'ga yozilmaydi (booking/order tashqari).
      </div>

      <div
        ref={scrollRef}
        className="h-[400px] border rounded p-3 overflow-y-auto bg-white space-y-3"
      >
        {history.length === 0 && (
          <div className="text-center text-gray-400 mt-32">
            Salom yozing yoki test savolingizni kiriting…
          </div>
        )}
        {history.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500">
              ✏️ yozyapti…
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded px-3 py-2"
          placeholder="Xabar yozing..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={busy}
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Yuborish
        </button>
      </div>

      {effects.length > 0 && (
        <div className="border rounded p-3 bg-yellow-50">
          <div className="text-xs font-semibold text-gray-700 mb-2">
            🔧 Tool effects (preview)
          </div>
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(effects, null, 2)}
          </pre>
        </div>
      )}

      {usage && (
        <div className="text-xs text-gray-500 flex gap-4">
          <span>📥 {usage.prompt} input tokens</span>
          <span>📤 {usage.completion} output tokens</span>
          <span>💵 ${usage.cost_usd.toFixed(5)}</span>
        </div>
      )}
    </div>
  );
}
