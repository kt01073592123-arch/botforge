"use client";

// Web widget sahifa — bot egasi sayti'ga qo'yadigan kodni nusxalaydi.

import { useState } from "react";

export default function WidgetPage({ params }: { params: { id: string } }) {
  const [copied, setCopied] = useState(false);
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://botforge-beige.vercel.app";

  const snippet = `<script src="${appUrl}/widget/${params.id}/embed.js" async></script>`;

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🌐 Web widget</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bu kodni saytingizning HTML'iga qo'shing — pastki o'ng burchakda chat tugmasi paydo bo'ladi.
          Mijozlar AI bilan to'g'ridan-to'g'ri saytingizdan gaplashishadi.
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden bg-gray-900 text-gray-100">
        <div className="px-3 py-2 text-xs flex justify-between items-center bg-gray-800">
          <span>1 qator embed kod</span>
          <button
            onClick={copy}
            className="text-blue-300 hover:text-blue-100 text-xs font-semibold"
          >
            {copied ? "✓ Nusxalandi" : "📋 Nusxalash"}
          </button>
        </div>
        <pre className="p-4 text-sm overflow-x-auto"><code>{snippet}</code></pre>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold">Qanday qo'shish?</h2>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <Step n={1} title="HTML'ga yopishtiring">
            Yuqoridagi kodni saytingizning <code className="bg-gray-100 px-1 rounded">{`</body>`}</code>{" "}
            tegidan oldin qo'ying.
          </Step>
          <Step n={2} title="Saqlang va saytni yangilang">
            Saytingizni F5 bosib yangilang. Pastki o'ng burchakda chat tugmasi paydo bo'ladi.
          </Step>
          <Step n={3} title="Sinab ko'ring">
            Tugmani bosing va xabar yozib, AI javob berayotganini tekshiring.
          </Step>
        </div>
      </div>

      <div className="border-2 border-dashed rounded-lg p-5 bg-blue-50">
        <h3 className="font-bold text-sm">💡 Eslatmalar</h3>
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          <li>• Widget'ning rang sxemasi sizning <a href={`/app/bots/${params.id}/design`} className="text-blue-600 underline">Design Studio</a>'dan avtomatik oladi.</li>
          <li>• Mijozlar Telegramga o'tmasdan to'g'ridan-to'g'ri saytda gaplashadi.</li>
          <li>• Bir xil tools (booking, order, KB) ishlaydi.</li>
          <li>• Mobile responsive — telefonlarda ham yaxshi ko'rinadi.</li>
          <li>• <a href={`/widget/${params.id}/iframe`} target="_blank" className="text-blue-600 underline">Live ko'rish</a> uchun bosing.</li>
        </ul>
      </div>

      <div className="border rounded-lg p-5">
        <h3 className="font-bold text-sm">Statistika</h3>
        <p className="text-xs text-gray-500 mt-1">
          Web widget orqali kelgan suhbatlar oddiy <a href={`/app/bots/${params.id}/conversations`} className="text-blue-600 underline">Suhbatlar</a> bo'limida ko'rinadi (mijoz nomi: "Web visitor").
        </p>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="text-xs text-gray-400">Qadam {n}</div>
      <div className="font-semibold mt-1">{title}</div>
      <div className="mt-2 text-gray-600">{children}</div>
    </div>
  );
}
