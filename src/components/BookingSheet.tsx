"use client";

import { useEffect, useState } from "react";

type Service = {
  name: string;
  price: string;
  duration?: string;
};

type Slot = { start: string; end: string };

export default function BookingSheet({
  username,
  service,
  accent,
  gradient,
  onClose,
}: {
  username: string;
  service: Service;
  accent: string;
  gradient: string;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<"date" | "slot" | "form" | "done">("date");
  const [date, setDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [chosenSlot, setChosenSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;

  useEffect(() => {
    const u = tg?.initDataUnsafe?.user;
    if (u && !name) setName([u.first_name, u.last_name].filter(Boolean).join(" "));
  }, []);

  // Davomiyligi (daqiqa) — service.duration’dan
  function durationMin(): number {
    const d = service.duration ?? "60 daq";
    const t = d.toLowerCase().replace(",", ".");
    const h = t.match(/([\d.]+)\s*soat/);
    if (h) return Math.round(parseFloat(h[1]) * 60);
    const m = t.match(/(\d+)/);
    if (m) return parseInt(m[1], 10);
    return 60;
  }

  // Sana tanlangach slotlarni yuklash
  useEffect(() => {
    if (!date || stage !== "slot") return;
    setLoadingSlots(true);
    fetch(
      `/api/public/${username}/availability?date=${date}&duration_min=${durationMin()}`
    )
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [date, stage, username]);

  function pickDate(d: string) {
    setDate(d);
    setStage("slot");
  }

  function pickSlot(s: Slot) {
    setChosenSlot(s);
    setStage("form");
  }

  async function submit() {
    if (!chosenSlot || !phone.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/public/${username}/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          init_data: tg?.initData ?? "",
          customer_name: name || null,
          customer_phone: phone,
          slot_start: chosenSlot.start,
          slot_end: chosenSlot.end,
          service_name: service.name,
          service_price: service.price,
          service_duration: service.duration,
          notes: note || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setStage("done");
      tg?.HapticFeedback?.notificationOccurred?.("success");
      setTimeout(() => {
        onClose();
        tg?.close?.();
      }, 2500);
    } catch (e) {
      setErr((e as Error).message);
      tg?.HapticFeedback?.notificationOccurred?.("error");
    } finally {
      setBusy(false);
    }
  }

  // Keyingi 14 kunga kalendar
  const today = new Date();
  const days: { iso: string; label: string; weekday: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      iso,
      label: d.getDate().toString(),
      weekday: d.toLocaleDateString("uz-UZ", { weekday: "short" }),
    });
  }

  if (stage === "done") {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center px-4 bg-black/80">
        <div className="bg-panel rounded-2xl p-6 text-center max-w-sm">
          <div className="text-5xl mb-3">📅</div>
          <div className="font-bold mb-1">Bron yuborildi</div>
          <div className="text-sm text-muted">
            Admin tasdiqlasa, sizga Telegram’da xabar keladi.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/80">
      <div className="bg-bg w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sticky top-0 bg-bg border-b border-border flex justify-between items-center">
          <div>
            <div className="font-bold">📅 Bron qilish</div>
            <div className="text-xs text-muted">{service.name}</div>
          </div>
          <button onClick={onClose} className="text-muted text-xl px-2">×</button>
        </div>

        {/* Stage: Sana tanlash */}
        {stage === "date" && (
          <div className="p-4">
            <div className="text-sm text-muted mb-3">Kunni tanlang:</div>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d) => (
                <button
                  key={d.iso}
                  onClick={() => pickDate(d.iso)}
                  className="aspect-square rounded-xl border border-border bg-panel flex flex-col items-center justify-center text-xs hover:border-accent transition"
                >
                  <div className="text-[10px] text-muted uppercase">{d.weekday}</div>
                  <div className="font-bold text-base">{d.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stage: Slot tanlash */}
        {stage === "slot" && (
          <div className="p-4">
            <button
              onClick={() => setStage("date")}
              className="text-xs text-muted mb-2"
            >
              ← Boshqa kun
            </button>
            <div className="text-sm font-semibold mb-3">
              {new Date(date).toLocaleDateString("uz-UZ", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </div>
            {loadingSlots ? (
              <div className="text-center text-muted text-sm py-6">Yuklanmoqda…</div>
            ) : slots.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">😔</div>
                <div className="text-sm text-muted">
                  Bu kunda bo‘sh vaqt yo‘q. Boshqa kunni tanlang.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {slots.map((s) => {
                  const t = new Date(s.start);
                  const time = t.toLocaleTimeString("uz-UZ", {
                    timeZone: "Asia/Tashkent",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <button
                      key={s.start}
                      onClick={() => pickSlot(s)}
                      className="py-2 rounded-xl border border-border bg-panel text-sm font-medium hover:border-accent transition"
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Stage: Form */}
        {stage === "form" && chosenSlot && (
          <div className="p-4 space-y-3">
            <div className="panel p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Xizmat:</span>
                <span className="font-medium">{service.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Vaqt:</span>
                <span className="font-medium">
                  {new Date(chosenSlot.start).toLocaleString("uz-UZ", {
                    timeZone: "Asia/Tashkent",
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {service.price && (
                <div className="flex justify-between">
                  <span className="text-muted">Narx:</span>
                  <span className="font-bold" style={{ color: accent }}>
                    {service.price}
                  </span>
                </div>
              )}
            </div>

            <input
              className="input"
              placeholder="Ismingiz"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="input"
              type="tel"
              placeholder="Telefon +998..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <textarea
              className="input min-h-[60px]"
              placeholder="Izoh (ixtiyoriy)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {err && <div className="text-danger text-sm">{err}</div>}

            <button
              onClick={submit}
              disabled={busy || !phone.trim()}
              className="w-full py-3 rounded-2xl font-semibold text-sm"
              style={{ background: gradient, color: "#fff", opacity: busy ? 0.5 : 1 }}
            >
              {busy ? "Yuborilmoqda…" : "✓ Bron qilish"}
            </button>
            <div className="text-[11px] text-muted text-center">
              Admin tasdiqlagandan keyin Telegram’ga xabar keladi
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
