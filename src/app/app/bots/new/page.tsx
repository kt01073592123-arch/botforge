"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import type { BotTemplateRow } from "@/lib/supabase/types";

export default function NewBotPage() {
  const r = useRouter();
  const [templates, setTemplates] = useState<BotTemplateRow[]>([]);
  const [tplId, setTplId] = useState<string>("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.templates ?? []);
        if (d.templates?.[0]) setTplId(d.templates[0].id);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: tplId,
          name,
          businessName: businessName || undefined,
          language: "uz",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      r.replace(`/app/bots/${data.bot.id}/connect`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Topbar title="Yangi bot" back="back" />
      <form onSubmit={submit} className="max-w-3xl mx-auto px-4 py-4 space-y-5">
        <div>
          <label className="label">Bot turini tanlang</label>
          <div className="grid gap-2">
            {templates.map((t) => (
              <label
                key={t.id}
                className={`panel p-4 flex gap-3 cursor-pointer transition ${
                  tplId === t.id ? "border-accent" : ""
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  className="hidden"
                  checked={tplId === t.id}
                  onChange={() => setTplId(t.id)}
                />
                <div className="text-2xl">{t.icon ?? "🤖"}</div>
                <div className="flex-1">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted leading-snug">{t.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Bot nomi (ichki)</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masalan: Beauty Manager"
            required
            minLength={2}
          />
        </div>

        <div>
          <label className="label">Biznes nomi</label>
          <input
            className="input"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Masalan: Lash Studio Tashkent"
          />
        </div>

        {err && <div className="text-danger text-sm">{err}</div>}

        <button className="btn-primary w-full" disabled={busy || !name || !tplId}>
          {busy ? "Yaratilmoqda…" : "Davom etish →"}
        </button>
      </form>
    </div>
  );
}
