// Web widget embed.js — bot egasi sayti'ga 1 qator script qo'shadi:
//
//   <script src="https://botforge-beige.vercel.app/widget/<BOT_ID>/embed.js" async></script>
//
// Skript sahifa yuklangach pastki o'ng burchakda chat tugmasi (FAB) ko'rsatadi,
// bosilsa chat oynasi (iframe) ochiladi.

import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // Bot va design kit'ni o'qib, primary_color olamiz
  const sb = db();
  const { data: bot } = await sb
    .from("bots")
    .select("id, name, business_name, status")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  const { data: kit } = await sb
    .from("design_kits")
    .select("primary_color, gradient_from, gradient_to, logo_emoji")
    .eq("bot_id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!bot || (bot as { status: string }).status !== "active") {
    return new NextResponse("/* bot not found or inactive */", {
      status: 404,
      headers: { "Content-Type": "application/javascript" },
    });
  }

  const primary = (kit as { primary_color?: string } | null)?.primary_color ?? "#0EA5E9";
  const gradFrom = (kit as { gradient_from?: string } | null)?.gradient_from ?? primary;
  const gradTo = (kit as { gradient_to?: string } | null)?.gradient_to ?? primary;
  const logo = (kit as { logo_emoji?: string } | null)?.logo_emoji ?? "💬";
  const businessName = (bot as { business_name?: string; name?: string }).business_name ?? (bot as { name?: string }).name ?? "Chat";

  const iframeSrc = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/widget/${id}/iframe`;

  const js = `
(function(){
  if (window.__BOTFORGE_LOADED__) return;
  window.__BOTFORGE_LOADED__ = true;

  var FAB_ID = "botforge-fab", IFRAME_ID = "botforge-iframe", PANEL_ID = "botforge-panel";
  var STATE = { open: false };

  function el(tag, props, style){
    var e = document.createElement(tag);
    Object.assign(e, props || {});
    if (style) Object.assign(e.style, style);
    return e;
  }

  // FAB tugmasi
  var fab = el("button", { id: FAB_ID, "aria-label": "Chat ochish", innerHTML: ${JSON.stringify(logo)} }, {
    position: "fixed", right: "24px", bottom: "24px", zIndex: 2147483646,
    width: "60px", height: "60px", borderRadius: "50%",
    background: "linear-gradient(135deg, ${gradFrom}, ${gradTo})",
    border: "none", color: "#fff", fontSize: "26px", cursor: "pointer",
    boxShadow: "0 12px 32px rgba(0,0,0,0.18), 0 4px 8px rgba(0,0,0,0.1)",
    transition: "transform .15s ease",
    fontFamily: "system-ui,sans-serif",
  });
  fab.addEventListener("mouseenter", function(){ fab.style.transform = "scale(1.06)"; });
  fab.addEventListener("mouseleave", function(){ fab.style.transform = "scale(1)"; });

  // Panel
  var panel = el("div", { id: PANEL_ID }, {
    position: "fixed", right: "24px", bottom: "100px", zIndex: 2147483646,
    width: "380px", height: "560px", maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 140px)",
    borderRadius: "16px", overflow: "hidden",
    boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 8px 16px rgba(0,0,0,0.08)",
    background: "#fff", display: "none",
  });

  var iframe = el("iframe", {
    id: IFRAME_ID,
    src: ${JSON.stringify(iframeSrc)},
    title: ${JSON.stringify(businessName + " chat")},
    allow: "clipboard-write",
  }, {
    width: "100%", height: "100%", border: "none",
  });
  panel.appendChild(iframe);

  fab.addEventListener("click", function(){
    STATE.open = !STATE.open;
    panel.style.display = STATE.open ? "block" : "none";
    fab.innerHTML = STATE.open ? "&times;" : ${JSON.stringify(logo)};
  });

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  // Mobile responsive
  function applyMobile(){
    if (window.innerWidth < 480 && STATE.open) {
      panel.style.right = "12px";
      panel.style.left = "12px";
      panel.style.bottom = "92px";
      panel.style.width = "auto";
    } else {
      panel.style.left = "auto";
      panel.style.right = "24px";
      panel.style.width = "380px";
    }
  }
  window.addEventListener("resize", applyMobile);
  applyMobile();
})();
`.trim();

  return new NextResponse(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
