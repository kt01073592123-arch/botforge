import Script from "next/script";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BotForge — Sotuvchi paneli",
  robots: "noindex",
  appleWebApp: { capable: true, statusBarStyle: "default" },
  other: { "mobile-web-app-capable": "yes" },
};

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <Script id="seller-tg-init" strategy="afterInteractive">
        {`
          if (window.Telegram && window.Telegram.WebApp) {
            try {
              window.Telegram.WebApp.ready();
              window.Telegram.WebApp.expand();
            } catch(e) {}
          }
        `}
      </Script>
      {children}
    </>
  );
}
