/** @type {import('next').NextConfig} */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://botforge-beige.vercel.app";

// Telegram WebApp ichida ochilishi kerak — telegram domenlari va o'z domeningizni
// allowlist qilamiz, qolgan hammasi taqiqlangan (clickjacking himoyasi).
const FRAME_ANCESTORS = [
  "'self'",
  APP_URL,
  "https://web.telegram.org",
  "https://*.telegram.org",
  "https://*.t.me",
].join(" ");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Production'da aniq domenlar — wildcard CSRF risk
    serverActions: { allowedOrigins: [APP_URL.replace(/^https?:\/\//, "")] },
  },
  async headers() {
    return [
      // Asosiy security headers — barcha sahifalarga
      {
        source: "/:path*",
        headers: [
          // Faqat Telegram + o'z domeniga embed qilishga ruxsat
          { key: "Content-Security-Policy", value: `frame-ancestors ${FRAME_ANCESTORS}` },
          // X-Frame-Options yo'q — frame-ancestors zamonaviy, X-Frame-Options ni override qiladi
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          // HSTS — HTTPS majbur (Vercel allaqachon HTTPS, lekin browser cache uchun)
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      // Web widget embed.js — har domenga ochiq, lekin Cache 1 soat
      {
        source: "/widget/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
