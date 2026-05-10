import Script from "next/script";
import type { Metadata } from "next";

export async function generateMetadata(props: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await props.params;
  // PWA manifest + apple-touch-icon — bot-specific (dinamik)
  return {
    manifest: `/api/public/${username}/manifest`,
    icons: {
      icon: [
        { url: `/api/public/${username}/icon?size=192`, sizes: "192x192", type: "image/svg+xml" },
        { url: `/api/public/${username}/icon?size=512`, sizes: "512x512", type: "image/svg+xml" },
      ],
      apple: [{ url: `/api/public/${username}/icon?size=180`, sizes: "180x180" }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: username,
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export default function CustomerWebAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}
