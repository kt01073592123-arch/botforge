// /admin/revenue — daromad va MRR oylik tahlili.

import { getRevenueDaily, getPlanStats } from "@/lib/admin_api";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const [daily, plans] = await Promise.all([getRevenueDaily(30), getPlanStats()]);

  const totalRevenue = daily.reduce((s, d) => s + d.paid_amount_uzs, 0);
  const totalPayments = daily.reduce((s, d) => s + d.payment_count, 0);
  const avgPaymentDay = daily.length > 0 ? totalRevenue / daily.length : 0;

  const totalMrr = plans.reduce((s, p) => s + p.mrr_uzs, 0);
  const totalActive = plans.reduce((s, p) => s + p.active_count, 0);

  // Mini bar chart
  const maxAmount = Math.max(...daily.map((d) => d.paid_amount_uzs), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">💰 Daromad</h1>
        <p className="text-sm text-gray-500 mt-1">Oxirgi 30 kun</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="30 kunlik daromad" value={`${totalRevenue.toLocaleString("uz")} so'm`} accent="green" />
        <Stat label="To'lovlar soni" value={totalPayments.toString()} />
        <Stat label="Kunlik o'rtacha" value={`${Math.round(avgPaymentDay).toLocaleString("uz")} so'm`} />
        <Stat label="MRR (recurring)" value={`${totalMrr.toLocaleString("uz")} so'm`} accent="blue" />
      </div>

      {/* Bar chart */}
      <div className="border rounded-lg p-4 bg-white">
        <h2 className="font-bold mb-4">Kunlik to'lovlar</h2>
        {daily.length === 0 ? (
          <div className="text-center text-gray-400 py-12">Hali to'lov yo'q</div>
        ) : (
          <div className="space-y-1">
            {daily.map((d) => (
              <div key={d.date} className="flex items-center gap-3 text-xs">
                <div className="w-20 text-gray-500">{d.date.slice(5)}</div>
                <div className="flex-1 bg-gray-100 rounded h-6 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                    style={{ width: `${(d.paid_amount_uzs / maxAmount) * 100}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-gray-800">
                    {d.paid_amount_uzs.toLocaleString("uz")} so'm
                  </div>
                </div>
                <div className="w-16 text-right text-gray-400">{d.payment_count} ta</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plans breakdown */}
      <div className="border rounded-lg p-4 bg-white">
        <h2 className="font-bold mb-4">Tariflar bo'yicha aktiv obunalar</h2>
        <div className="space-y-2">
          {plans.map((p) => (
            <div key={p.plan_id} className="flex items-center gap-3 text-sm border-b py-2 last:border-0">
              <div className="w-24 font-semibold">{p.plan_name}</div>
              <div className="flex-1 bg-gray-100 rounded h-6 relative overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${totalActive > 0 ? (p.active_count / totalActive) * 100 : 0}%` }}
                />
              </div>
              <div className="w-20 text-right">{p.active_count} ta</div>
              <div className="w-32 text-right text-gray-600">
                {p.mrr_uzs.toLocaleString("uz")} so'm/oy
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "green" | "blue" }) {
  const colors: Record<string, string> = {
    green: "bg-emerald-50 border-emerald-200 text-emerald-900",
    blue: "bg-blue-50 border-blue-200 text-blue-900",
  };
  return (
    <div className={`border rounded-lg p-4 ${accent ? colors[accent] : "bg-white"}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
