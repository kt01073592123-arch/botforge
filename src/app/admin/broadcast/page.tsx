"use client";

// /admin/broadcast — admin hamma sellerlarga (yoki tarif bo'yicha) marketing
// xabar yuboradi. Telegram orqali platforma boti yetkazadi.

import { useEffect, useState } from "react";
import { useT } from "@/hooks/useT";

type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: string;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  status: string;
  created_at: string;
  finished_at: string | null;
};

export default function BroadcastPage() {
  const { t } = useT();
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "free" | "paid" | "pro" | "max">("all");
  const [sending, setSending] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/broadcast");
    const data = await res.json();
    setList(data.announcements ?? []);
    setLoading(false);
  }

  async function send() {
    if (!title.trim() || !body.trim() || sending) return;
    const audienceLabel = audience === "all" ? t("adm_audience_all").toUpperCase() : audience.toUpperCase();
    if (!confirm(`${audienceLabel} ${t("adm_broadcast_confirm")}`)) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), audience }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message ?? t("status_error"));
        return;
      }
      setTitle("");
      setBody("");
      await load();
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📢 {t("adm_nav_broadcast")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("adm_broadcast_sub")}</p>
      </div>

      <div className="border rounded-lg p-5 bg-white space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">{t("adm_broadcast_title_lbl")}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("adm_broadcast_title_lbl") + "..."}
            className="w-full border rounded px-3 py-2"
            maxLength={120}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">{t("adm_broadcast_body_lbl")}</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Markdown qo'llab-quvvatlanadi (bold, italic, links)..."
            className="w-full border rounded px-3 py-2 font-mono text-sm"
            rows={6}
            maxLength={2000}
          />
          <div className="text-xs text-gray-400 mt-1">{body.length}/2000</div>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">{t("adm_audience_lbl")}</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as typeof audience)}
              className="border rounded px-3 py-2"
            >
              <option value="all">{t("adm_audience_all")}</option>
              <option value="free">{t("adm_audience_free")}</option>
              <option value="paid">{t("adm_audience_paid")}</option>
              <option value="pro">{t("adm_audience_pro")}</option>
              <option value="max">{t("adm_audience_max")}</option>
            </select>
          </div>
          <button
            onClick={send}
            disabled={sending || !title.trim() || !body.trim()}
            className="px-5 py-2 bg-purple-600 text-white rounded font-semibold disabled:opacity-50 hover:bg-purple-700"
          >
            {sending ? t("adm_broadcast_sending") : t("adm_broadcast_send")}
          </button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="px-4 py-3 border-b font-bold">{t("adm_broadcast_history")}</div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">{t("loading")}</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t("adm_broadcast_empty")}</div>
        ) : (
          <div className="divide-y">
            {list.map((a) => (
              <div key={a.id} className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(a.created_at).toLocaleString("uz")} · audience: {a.audience}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      a.status === "done"
                        ? "bg-emerald-100 text-emerald-700"
                        : a.status === "sending"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{a.body}</p>
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span>📨 {a.total_sent}/{a.total_recipients}</span>
                  {a.total_failed > 0 && (
                    <span className="text-red-500">❌ {a.total_failed}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
