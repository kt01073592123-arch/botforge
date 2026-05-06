"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import type { ConversationRow, MessageRow } from "@/lib/supabase/types";
import clsx from "clsx";

export default function ConvDetailPage() {
  const { id, convId } = useParams<{ id: string; convId: string }>();
  const [conv, setConv] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);

  useEffect(() => {
    fetch(`/api/bots/${id}/conversations/${convId}`)
      .then((r) => r.json())
      .then((d) => {
        setConv(d.conversation);
        setMessages(d.messages);
      });
  }, [id, convId]);

  return (
    <div>
      <Topbar title={conv?.customer_name ?? "Suhbat"} back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-2">
        {conv && (
          <div className="text-xs text-muted">
            @{conv.customer_username ?? "—"} · {conv.customer_phone ?? ""}
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={clsx(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
              m.role === "user"
                ? "bg-border self-start"
                : "bg-accent/15 border border-accent/30 self-end ml-auto"
            )}
          >
            <div className="whitespace-pre-wrap">{m.content}</div>
            <div className="text-[10px] text-muted mt-1">
              {new Date(m.created_at).toLocaleTimeString("uz")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
