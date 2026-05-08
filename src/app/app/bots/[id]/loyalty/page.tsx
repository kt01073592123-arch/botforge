"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Topbar from "@/components/Topbar";

type Config = {
  enabled: boolean;
  punch_threshold: number;
  punch_reward: string;
  referral_enabled: boolean;
  referral_bonus_uzs: number;
};

export default function LoyaltyPage() {
  const { id } = useParams<{ id: string }>();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/bots/${id}/loyalty`)
      .then((r) => r.json())
      .then((d) => setCfg(d.config));
  }, [id]);

  async function save() {
    if (!cfg) return;
    setBusy(true);
    setSaved(false);
    const res = await fetch(`/api/bots/${id}/loyalty`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (!cfg) return <div className="p-8 text-center text-muted text-sm">Yuklanmoqda…</div>;

  return (
    <div>
      <Topbar
        title="Sodiqlik dasturi"
        back="back"
        right={
          <button onClick={save} disabled={busy} className="btn-primary !py-1.5 !px-3 !text-xs">
            {saved ? "✓ Saqlandi" : busy ? "..." : "Saqlash"}
          </button>
        }
      />
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Punch card */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-sm">🎫 Punch karta</div>
              <div className="text-xs text-muted">N-buyurtmadan keyin bonus</div>
            </div>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={cfg.enabled}
                onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
              />
              Yoqilgan
            </label>
          </div>

          {cfg.enabled && (
            <>
              <div>
                <label className="label">Bonus uchun N ta buyurtma</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="input"
                  value={cfg.punch_threshold}
                  onChange={(e) =>
                    setCfg({ ...cfg, punch_threshold: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="label">Bonus tafsilotlari</label>
                <input
                  className="input"
                  placeholder="1 ta xizmat 50% chegirma"
                  value={cfg.punch_reward}
                  onChange={(e) => setCfg({ ...cfg, punch_reward: e.target.value })}
                />
              </div>
            </>
          )}
        </div>

        {/* Referral */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-sm">🤝 Referral</div>
              <div className="text-xs text-muted">Mijozni olib kelganga bonus</div>
            </div>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={cfg.referral_enabled}
                onChange={(e) =>
                  setCfg({ ...cfg, referral_enabled: e.target.checked })
                }
              />
              Yoqilgan
            </label>
          </div>

          {cfg.referral_enabled && (
            <div>
              <label className="label">Referrer’ga bonus (so‘m)</label>
              <input
                type="number"
                className="input"
                value={cfg.referral_bonus_uzs}
                onChange={(e) =>
                  setCfg({ ...cfg, referral_bonus_uzs: Number(e.target.value) })
                }
              />
              <div className="text-xs text-muted mt-1">
                Yangi mijoz birinchi buyurtmasini bajarsa, referrer’ga sertifikat
              </div>
            </div>
          )}
        </div>

        <div className="panel p-3 text-xs text-muted leading-relaxed">
          💡 <b>Hozir:</b> Bu tizim hozircha asosiy konfiguratsiya. Avtomatik xabarlar
          va checkout integratsiyasi keyingi bosqichda qo‘shiladi.
        </div>
      </div>
    </div>
  );
}
