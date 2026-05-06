"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";

export default function ConnectPage() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
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
      r.replace(`/app/bots/${id}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Topbar title="Bot tokenini ulang" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <div className="panel p-5">
          <div className="font-semibold mb-2">Token qanday olinadi?</div>
          <ol className="text-sm text-muted space-y-1.5 list-decimal pl-5">
            <li>
              Telegram’da{" "}
              <a className="text-accent" href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">
                @BotFather
              </a>{" "}
              ni oching
            </li>
            <li>
              <code className="px-1.5 py-0.5 bg-border rounded">/newbot</code> deb yozing
            </li>
            <li>Bot nomi va username kiriting (username <code>_bot</code> bilan tugashi shart)</li>
            <li>BotFather sizga tokenni beradi — uni quyiga joylang</li>
          </ol>
        </div>

        <form onSubmit={submit} className="space-y-4">
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
              Token AES-256-GCM bilan shifrlanadi va ochiq saqlanmaydi.
            </div>
          </div>
          {err && <div className="text-danger text-sm">{err}</div>}
          <button className="btn-primary w-full" disabled={busy || !token.trim()}>
            {busy ? "Tekshirilmoqda…" : "Ulash"}
          </button>
        </form>
      </div>
    </div>
  );
}
