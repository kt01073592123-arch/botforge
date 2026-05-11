"use client";

import { useEffect, useRef, useState } from "react";
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

type ExtractedProduct = {
  name: string;
  price: number | null;
  description: string;
};

type UploadMeta = {
  pageCount?: number;
  wordCount: number;
  ext: string;
  size: number;
};

export default function KbPage() {
  const { id } = useParams<{ id: string }>();
  const [docs, setDocs] = useState<KbDoc[] | null>(null);

  // Manual form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // File upload state
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [productMode, setProductMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [uploadMeta, setUploadMeta] = useState<UploadMeta | null>(null);
  const [products, setProducts] = useState<ExtractedProduct[] | null>(null);

  useEffect(() => { load(); }, [id]);

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
    if (!confirm("O'chirilsinmi?")) return;
    await fetch(`/api/bots/${id}/kb/${docId}`, { method: "DELETE" });
    await load();
  }

  // Eski TXT/MD fayl yordamchi (manual forma uchun)
  async function handleTextFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "txt" && ext !== "md") return;
    if (f.size > 200_000) {
      setErr("Fayl 200 KB dan kichik bo'lishi kerak.");
      return;
    }
    setTitle(f.name.replace(/\.[^.]+$/, ""));
    setContent(await f.text());
  }

  // PDF/DOCX fayl yuklash
  async function handleUpload() {
    if (!uploadFile) return;
    setUploadErr(null);
    setUploadMeta(null);
    setProducts(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("mode", productMode ? "products" : "kb");

      const res = await fetch(`/api/bots/${id}/kb/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUploadMeta(data.meta as UploadMeta);
      if (data.products) setProducts(data.products as ExtractedProduct[]);
      setUploadFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e) {
      setUploadErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const uploadFileExt = uploadFile?.name.split(".").pop()?.toLowerCase() ?? "";
  const uploadFileSizeMB = uploadFile ? (uploadFile.size / 1024 / 1024).toFixed(1) : "";

  return (
    <div>
      <Topbar title="Bilim bazasi" back="back" />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-5">

        {/* Info */}
        <div className="panel p-4 text-xs text-muted leading-relaxed">
          <div className="font-semibold text-text mb-1">💡 Nima bu?</div>
          AI bot mijoz savoliga javob berishdan oldin shu yerdagi matnlardan eng mosini topadi va shu
          asosda javob beradi. Mahsulot tavsifi, kompaniya tarixi, taklif sharti, ko'p so'raladigan
          savollar — barchasi shu yerda.
        </div>

        {/* ─── Fayl yuklash paneli ─── */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📁</span>
            <span className="font-semibold text-sm">Fayl yuklash</span>
            <span className="text-xs text-muted ml-1">PDF, DOCX, TXT, MD · maks 10 MB</span>
          </div>

          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition"
            onClick={() => fileRef.current?.click()}
          >
            {uploadFile ? (
              <div className="space-y-1">
                <div className="text-sm font-semibold">{uploadFile.name}</div>
                <div className="text-xs text-muted">
                  {uploadFileExt.toUpperCase()} · {uploadFileSizeMB} MB
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setUploadFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-xs text-danger mt-1"
                >
                  ✕ Bekor qilish
                </button>
              </div>
            ) : (
              <div className="text-muted text-sm">
                Faylni shu yerga tashlang yoki <span className="text-primary underline">tanlang</span>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setUploadFile(f); setUploadErr(null); setUploadMeta(null); setProducts(null); }
            }}
          />

          {/* Mahsulot rejimi toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={productMode}
              onChange={(e) => setProductMode(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span>🛍 Mahsulot katalogi sifatida import — AI narx va tavsiflarni ajratadi</span>
          </label>

          {uploadErr && <div className="text-danger text-sm">{uploadErr}</div>}

          <button
            type="button"
            onClick={handleUpload}
            disabled={!uploadFile || uploading}
            className="btn-primary w-full"
          >
            {uploading
              ? productMode
                ? "Fayl o'qilmoqda va mahsulotlar ajratilmoqda…"
                : "Fayl o'qilmoqda…"
              : "📤 Yuklash va qo'shish"}
          </button>

          {/* Yuklash natijalari */}
          {uploadMeta && (
            <div className="text-xs text-muted bg-success/10 border border-success/30 rounded p-2 space-y-0.5">
              <div className="text-success font-semibold">✓ Muvaffaqiyatli yuklandi</div>
              <div>
                {uploadMeta.wordCount.toLocaleString()} so'z
                {uploadMeta.pageCount ? ` · ${uploadMeta.pageCount} sahifa` : ""}
                {" · "}
                {Math.ceil(uploadMeta.wordCount / 75)} ta chunk yaratiladi
              </div>
            </div>
          )}

          {/* Ajratilgan mahsulotlar */}
          {products !== null && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted uppercase tracking-wider">
                {products.length > 0
                  ? `🛍 ${products.length} ta mahsulot topildi`
                  : "Mahsulot topilmadi"}
              </div>
              {products.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {products.map((p, i) => (
                    <div key={i} className="panel !rounded p-2 text-xs flex justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{p.name}</div>
                        {p.description && (
                          <div className="text-muted truncate">{p.description}</div>
                        )}
                      </div>
                      {p.price !== null && (
                        <div className="font-bold whitespace-nowrap text-success">
                          {p.price.toLocaleString()} so'm
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="text-xs text-muted">
                💡 Mahsulotlar KB ga qo'shildi. Xizmatlar sahifasida to'liq tahrirlash mumkin.
              </div>
            </div>
          )}
        </div>

        {/* ─── Qo'lda kiritish ─── */}
        <form onSubmit={add} className="panel p-4 space-y-3">
          <div className="font-semibold text-sm">✏️ Qo'lda kiritish</div>
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
            <label className="label">Matn yoki .txt/.md fayl</label>
            <input
              type="file"
              accept=".txt,.md"
              onChange={handleTextFile}
              className="input mb-2 !py-1"
            />
            <textarea
              className="input min-h-[120px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Matnni shu yerga yopishtiring…"
              required
              minLength={10}
            />
            <div className="text-xs text-muted mt-1">
              {content.length.toLocaleString()} belgi · {Math.ceil(content.length / 500)} ta chunk
            </div>
          </div>
          {err && <div className="text-danger text-sm">{err}</div>}
          <button
            className="btn-primary w-full"
            disabled={busy || !title || content.length < 10}
          >
            {busy ? "Yuklanmoqda…" : "Bilim bazasiga qo'shish"}
          </button>
        </form>

        {/* ─── Hujjatlar ro'yxati ─── */}
        <section>
          <h2 className="text-sm font-semibold mb-2 text-muted uppercase tracking-wider">
            Hujjatlar
          </h2>
          {docs === null ? (
            <div className="text-center text-muted py-8 text-sm">Yuklanmoqda…</div>
          ) : docs.length === 0 ? (
            <div className="text-center text-muted py-8 text-sm">Hali hujjat yo'q</div>
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
                    O'chirish
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
