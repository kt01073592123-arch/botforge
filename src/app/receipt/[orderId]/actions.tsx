"use client";

export default function ReceiptActions({ botUsername }: { botUsername: string }) {
  return (
    <div
      className="receipt-actions"
      style={{
        maxWidth: 480,
        margin: "16px auto 0",
        display: "flex",
        gap: 8,
        justifyContent: "center",
      }}
    >
      <button
        onClick={() => window.print()}
        style={{
          padding: "10px 20px",
          borderRadius: 999,
          border: "none",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          color: "#1A1B2E",
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        📄 PDF saqlash
      </button>
      {botUsername && (
        <a
          href={`/c/${botUsername}`}
          style={{
            padding: "10px 20px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            color: "#1A1B2E",
            background: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          ← Mini App
        </a>
      )}
    </div>
  );
}
