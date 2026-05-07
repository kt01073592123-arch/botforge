"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import type { BotRow } from "@/lib/supabase/types";

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [bot, setBot] = useState<BotRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/bots/${id}`).then((r) => r.json()).then((d) => setBot(d.bot));
  }, [id]);

  async function save() {
    if (!bot) return;
    setBusy(true);
    setSaved(false);
    const res = await fetch(`/api/bots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: bot.name,
        business_name: bot.business_name,
        language: bot.language,
        ai_model: bot.ai_model,
        system_prompt: bot.system_prompt,
        welcome_message: bot.welcome_message,
        admin_chat_id: bot.admin_chat_id,
        monthly_message_limit: bot.monthly_message_limit,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (!bot) return <div className="p-8 text-center text-muted text-sm">Yuklanmoqda…</div>;

  return (
    <div>
      <Topbar
        title="Sozlamalar"
        back="back"
        right={
          <button onClick={save} disabled={busy} className="btn-primary !py-1.5 !px-3 !text-xs">
            {saved ? "✓ Saqlandi" : busy ? "..." : "Saqlash"}
          </button>
        }
      />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <Field label="Bot nomi">
          <input
            className="input"
            value={bot.name}
            onChange={(e) => setBot({ ...bot, name: e.target.value })}
          />
        </Field>

        <Field label="Biznes nomi">
          <input
            className="input"
            value={bot.business_name ?? ""}
            onChange={(e) => setBot({ ...bot, business_name: e.target.value })}
          />
        </Field>

        <Field label="Salom xabari">
          <textarea
            className="input min-h-[80px]"
            value={bot.welcome_message ?? ""}
            onChange={(e) => setBot({ ...bot, welcome_message: e.target.value })}
          />
        </Field>

        <Field label="AI System Prompt">
          <textarea
            className="input min-h-[200px] font-mono text-xs"
            value={bot.system_prompt ?? ""}
            onChange={(e) => setBot({ ...bot, system_prompt: e.target.value })}
          />
          <div className="text-xs text-muted mt-1">
            Bot xulqi shu yerda. Aniq qoidalar qo‘ying — narx, xizmat, operatorga uzatish va h.k.
          </div>
        </Field>

        <Field label="Admin Telegram chat_id (xabar yuborish uchun)">
          <input
            type="number"
            className="input"
            value={bot.admin_chat_id ?? ""}
            onChange={(e) =>
              setBot({
                ...bot,
                admin_chat_id: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="Masalan: 123456789"
          />
          <div className="text-xs text-muted mt-1">
            <a className="text-accent" href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer">
              @userinfobot
            </a>
            ’dan o‘z chat_id ni oling.
          </div>
        </Field>

        <Field label="AI modeli">
          <select
            className="input"
            value={bot.ai_model}
            onChange={(e) => setBot({ ...bot, ai_model: e.target.value })}
          >
            <option value="claude-haiku-4-5">Claude Haiku 4.5 (arzon, tez)</option>
            <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (yaxshi balans)</option>
            <option value="claude-opus-4-7">Claude Opus 4.7 (eng kuchli)</option>
          </select>
        </Field>

        <Field label="Oylik xabar limiti">
          <input
            type="number"
            className="input"
            value={bot.monthly_message_limit}
            onChange={(e) =>
              setBot({ ...bot, monthly_message_limit: Number(e.target.value) })
            }
          />
          <div className="text-xs text-muted mt-1">
            Hozir ishlatilgan: {bot.monthly_messages_used}
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
