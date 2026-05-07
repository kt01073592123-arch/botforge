"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";

type KbDoc = {
  id: string;
  title: string;
  source: string;
  status: "pending" | "ready" | "error";
  error: string | null;
  created_at: string;
};

export default function KbPage() {
  const { id } = useParams<{ id: string }>();
  const [docs, setDocs] = useState<KbDoc[] | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const d = await fetch(`/api/bots/${id}/kb`).then((r) => r.json());
    setDocs(d.documents ?? []);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/bots/${id}/kb`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setTitle("");
      setContent("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(docId: string) {
    if (!confirm("O‘chirilsinmi?")) return;
    await fetch(`/api/bots/${id}/kb/${docId}`, { method: "DELETE" });
    await load();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 200_000) {
      setErr("Fayl 200 KB dan kichik bo‘lishi kerak. Katta hujjatlarni bo‘lib joylang.");
      return;
    }
    const text = await f.text();
    setTitle(f.name.replace(/\.[^.]+$/, ""));
    setContent(text);
  }

  return (
    <div>
      <Topbar title="Bilim bazasi" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-5">
        <div className="panel p-4 text-xs text-muted leading-relaxed">
          <div className="font-semibold text-text mb-1">💡 Nima bu?</div>
          AI bot mijoz savoliga javob berishdan oldin shu yerdagi matnlardan eng mosini topadi va shu
          asosda javob beradi. Mahsulot tavsifi, kompaniya tarixi, taklif sharti, ko‘p so‘raladigan
          savollar — barchasi shu yerda. To‘g‘ri ma'lumot, AI to‘g‘ri javob.
        </div>

        <form onSubmit={add} className="panel p-4 space-y-3">
          <div>
            <label className="label">Sarlavha</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mahsulot tavsifi, FAQ, va h.k."
              required
            />
          </div>
          <div>
            <label className="label">Matn yoki .txt/.md fayl yuklang</label>
            <input
              type="file"
              accept=".txt,.md"
              onChange={handleFile}
              className="input mb-2 !py-1"
            />
            <textarea
              className="input min-h-[140px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Matnni shu yerga yopishtiring..."
              required
              minLength={10}
            />
            <div className="text-xs text-muted mt-1">
              {content.length.toLocaleString()} belgi ·{" "}
              {Math.ceil(content.length / 500)} ta chunk bo‘ladi
            </div>
          </div>
          {err && <div className="text-danger text-sm">{err}</div>}
          <button className="btn-primary w-full" disabled={busy || !title || content.length < 10}>
            {busy ? "Yuklanmoqda…" : "Bilim bazasiga qo‘shish"}
          </button>
        </form>

        <section>
          <h2 className="text-sm font-semibold mb-2 text-muted uppercase tracking-wider">
            Hujjatlar
          </h2>
          {docs === null ? (
            <div className="text-center text-muted py-8 text-sm">Yuklanmoqda…</div>
          ) : docs.length === 0 ? (
            <div className="text-center text-muted py-8 text-sm">Hali hujjat yo‘q</div>
          ) : (
            <div className="grid gap-2">
              {docs.map((d) => (
                <div key={d.id} className="panel p-3 flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{d.title}</div>
                    <div className="text-xs text-muted">
                      {d.source} ·{" "}
                      {d.status === "ready" ? (
                        <span className="text-success">tayyor</span>
                      ) : d.status === "pending" ? (
                        <span className="text-amber-400">qayta ishlanmoqda</span>
                      ) : (
                        <span className="text-danger">xato: {d.error}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(d.id)}
                    className="btn-ghost !py-1 !px-2 !text-xs !text-danger"
                  >
                    O‘chirish
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
