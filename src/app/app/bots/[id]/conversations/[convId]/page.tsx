"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import type { ConversationRow, MessageRow } from "@/lib/supabase/types";
import clsx from "clsx";

export default function ConvDetailPage() {
  const { id, convId } = useParams<{ id: string; convId: string }>();
  const [conv, setConv] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [resumeAi, setResumeAi] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [id, convId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function load() {
    const d = await fetch(`/api/bots/${id}/conversations/${convId}`).then((r) => r.json());
    if (d.conversation) {
      setConv(d.conversation);
      setMessages(d.messages);
    }
  }

  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bots/${id}/conversations/${convId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), resume_ai: resumeAi }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error);
      } else {
        setText("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: "open" | "waiting_human" | "closed") {
    await fetch(`/api/bots/${id}/conversations/${convId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <div className="flex flex-col h-screen">
      <Topbar
        title={conv?.customer_name ?? "Suhbat"}
        back="back"
        right={
          conv && (
            <span
              className={clsx(
                "badge",
                conv.status === "waiting_human"
                  ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                  : conv.status === "closed"
                  ? "border-muted/40 text-muted"
                  : "border-success/40 text-success bg-success/10"
              )}
            >
              {conv.status === "open"
                ? "AI"
                : conv.status === "waiting_human"
                ? "Operator"
                : "Yopildi"}
            </span>
          )
        }
      />
      <div className="flex-1 overflow-y-auto px-4 py-3 max-w-3xl mx-auto w-full">
        {conv && (
          <div className="text-xs text-muted mb-3 text-center">
            @{conv.customer_username ?? "—"}
            {conv.customer_phone && ` · ${conv.customer_phone}`}
          </div>
        )}
        <div className="flex flex-col gap-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={clsx(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                m.role === "user"
                  ? "bg-border self-start"
                  : (m.metadata as Record<string, unknown>)?.from === "operator"
                  ? "bg-amber-500/15 border border-amber-500/30 self-end ml-auto"
                  : "bg-accent/15 border border-accent/30 self-end ml-auto"
              )}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              <div className="text-[10px] text-muted mt-1">
                {(m.metadata as Record<string, unknown>)?.from === "operator" && "👤 "}
                {new Date(m.created_at).toLocaleTimeString("uz")}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-border bg-bg sticky bottom-0">
        <div className="max-w-3xl mx-auto px-3 py-2 space-y-2">
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setStatus("waiting_human")}
              className={clsx(
                "btn-ghost !py-1 !px-2 !text-xs",
                conv?.status === "waiting_human" && "!border-amber-500"
              )}
            >
              ✋ AI’ni to‘xtatish
            </button>
            <button
              onClick={() => setStatus("open")}
              className={clsx(
                "btn-ghost !py-1 !px-2 !text-xs",
                conv?.status === "open" && "!border-success"
              )}
            >
              🤖 AI ga qaytarish
            </button>
            <button
              onClick={() => setStatus("closed")}
              className="btn-ghost !py-1 !px-2 !text-xs"
            >
              Yopish
            </button>
          </div>
          <div className="flex gap-2">
            <textarea
              className="input min-h-[40px] max-h-[120px]"
              placeholder="Operator sifatida javob yozing..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button onClick={send} disabled={busy || !text.trim()} className="btn-primary">
              ➤
            </button>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={resumeAi}
              onChange={(e) => setResumeAi(e.target.checked)}
            />
            Yuborgandan keyin AI ga qaytar
          </label>
        </div>
      </div>
    </div>
  );
}
